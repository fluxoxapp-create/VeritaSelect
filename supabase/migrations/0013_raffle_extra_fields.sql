-- Extra fields for raffle setup wizard
alter table public.raffles
  add column if not exists prize_market_value_cents integer,
  add column if not exists min_cotas_goal integer,
  add column if not exists delivery_city text,
  add column if not exists delivery_uf text,
  add column if not exists draw_method text not null default 'loteria_federal',
  add constraint delivery_uf_len check (delivery_uf is null or length(delivery_uf) = 2),
  add constraint draw_method_values check (draw_method in ('loteria_federal', 'live'));
