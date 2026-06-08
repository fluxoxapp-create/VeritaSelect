-- Verita — Phase 1: race-safe purchase transactions
--
-- Two privileged functions, callable only by service_role (the Next.js
-- server, never the browser):
--   1. reserve_raffle_numbers   — holds N free numbers for a pending purchase
--   2. confirm_purchase_payment — atomically marks payment+purchase paid AND
--      converts the reservation into a permanent claim, logging both to
--      audit_log. If claiming fails, the whole thing rolls back.
--
-- Both rely on `for update skip locked` so concurrent buyers never collide,
-- and the `unique (raffle_id, number)` constraint from 0001 is the
-- last-resort guarantee even if these functions ever have a bug.

-- =========================================================
-- 1. RESERVE NUMBERS (called when a buyer starts checkout)
-- =========================================================
create or replace function public.reserve_raffle_numbers(
  p_raffle_id uuid,
  p_compra_id uuid,
  p_quantity integer,
  p_hold_minutes integer default 10
)
returns setof public.raffle_numbers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed_count integer;
begin
  -- Release any of this purchase's stale reservations first (idempotent retry safety)
  update public.raffle_numbers
  set purchase_id = null, reserved_until = null
  where purchase_id = p_compra_id and reserved_until < now();

  with candidates as (
    select id from public.raffle_numbers
    where raffle_id = p_raffle_id
      and purchase_id is null
      and (reserved_until is null or reserved_until < now())
    order by number
    limit p_quantity
    for update skip locked
  )
  update public.raffle_numbers rn
  set purchase_id = p_compra_id,
      reserved_until = now() + make_interval(mins => p_hold_minutes)
  from candidates
  where rn.id = candidates.id;

  get diagnostics v_claimed_count = row_count;

  if v_claimed_count < p_quantity then
    -- Not enough free numbers right now — release whatever we grabbed and fail loudly.
    update public.raffle_numbers
    set purchase_id = null, reserved_until = null
    where purchase_id = p_compra_id and reserved_until is not null and reserved_until > now();

    raise exception 'insufficient_available_numbers'
      using errcode = 'P0001';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (
    (select buyer_id from public.compras where id = p_compra_id),
    'buyer',
    'raffle_number.reserve',
    'compras',
    p_compra_id,
    jsonb_build_object('raffle_id', p_raffle_id, 'quantity', p_quantity)
  );

  return query select * from public.raffle_numbers where purchase_id = p_compra_id;
end;
$$;

revoke all on function public.reserve_raffle_numbers from public, anon, authenticated;
grant execute on function public.reserve_raffle_numbers to service_role;

-- =========================================================
-- 2. CONFIRM PAYMENT (called from the webhook handler)
-- Marks pagamento + compra as paid and converts the reservation into a
-- permanent claim — all in one transaction. On any failure, everything
-- rolls back and the payment is left in a state that triggers manual review.
-- =========================================================
create or replace function public.confirm_purchase_payment(
  p_pagamento_id uuid,
  p_paid_at timestamptz default now()
)
returns public.compras
language plpgsql
security definer
set search_path = public
as $$
declare
  v_compra public.compras;
  v_claimed_count integer;
  v_quantity integer;
begin
  select c.* into v_compra
  from public.compras c
  join public.pagamentos p on p.compra_id = c.id
  where p.id = p_pagamento_id
  for update of c;

  if not found then
    raise exception 'purchase_not_found_for_payment' using errcode = 'P0002';
  end if;

  -- Idempotency: a retried/duplicate webhook must be a no-op, not a double-charge.
  if v_compra.status = 'paid' then
    return v_compra;
  end if;

  if v_compra.status not in ('pending_payment', 'fraud_review') then
    raise exception 'purchase_in_unexpected_state: %', v_compra.status using errcode = 'P0003';
  end if;

  v_quantity := v_compra.quantity;

  -- Convert the temporary reservation into a permanent claim.
  update public.raffle_numbers
  set reserved_until = null
  where purchase_id = v_compra.id;

  get diagnostics v_claimed_count = row_count;

  if v_claimed_count < v_quantity then
    -- Reservation lapsed or was never complete — money arrived but numbers
    -- aren't fully secured. Do NOT silently mark as paid: park for manual
    -- reconciliation/refund and audit it loudly.
    update public.compras set status = 'fraud_review' where id = v_compra.id;
    update public.pagamentos set status = 'paid', paid_at = p_paid_at where id = p_pagamento_id;

    insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
    values (
      null, 'admin', 'purchase.payment_number_mismatch', 'compras', v_compra.id,
      jsonb_build_object(
        'pagamento_id', p_pagamento_id,
        'expected_quantity', v_quantity,
        'claimed_count', v_claimed_count,
        'note', 'Payment received but numbers could not be fully secured — needs manual refund/reconciliation.'
      )
    );

    raise exception 'payment_received_numbers_unsecured: needs manual reconciliation for compra %', v_compra.id
      using errcode = 'P0004';
  end if;

  update public.pagamentos
  set status = 'paid', paid_at = p_paid_at
  where id = p_pagamento_id;

  update public.compras
  set status = 'paid'
  where id = v_compra.id
  returning * into v_compra;

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (
    null, 'admin', 'payment.confirmed', 'compras', v_compra.id,
    jsonb_build_object('pagamento_id', p_pagamento_id, 'quantity', v_quantity)
  );

  return v_compra;
end;
$$;

revoke all on function public.confirm_purchase_payment from public, anon, authenticated;
grant execute on function public.confirm_purchase_payment to service_role;

-- =========================================================
-- 3. RELEASE EXPIRED RESERVATIONS (run on a schedule — pg_cron / Edge cron)
-- =========================================================
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  with expired as (
    update public.raffle_numbers
    set purchase_id = null, reserved_until = null
    where reserved_until is not null
      and reserved_until < now()
      and purchase_id in (select id from public.compras where status = 'pending_payment')
    returning purchase_id
  )
  select count(*) into v_released from expired;

  if v_released > 0 then
    insert into public.audit_log (actor_id, actor_role, action, metadata)
    values (null, 'admin', 'raffle_number.release_expired', jsonb_build_object('released_count', v_released));
  end if;

  return v_released;
end;
$$;

revoke all on function public.release_expired_reservations from public, anon, authenticated;
grant execute on function public.release_expired_reservations to service_role;
