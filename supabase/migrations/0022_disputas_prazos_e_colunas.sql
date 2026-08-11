-- =========================================================
-- 0022 — Fluxo de disputa: prazos calculados no banco e escrita
--        restringida por coluna.
--
-- A 0021 criou a tabela `disputas` e as policies de linha, mas RLS não
-- restringe COLUNA. Como o cliente `authenticated` usa a chave anon — que é
-- pública por definição — qualquer usuário de empresa poderia, do próprio
-- navegador, escrever `disputas.decisao = 'improcedente'` na disputa que ele
-- mesmo responde, ou alterar `indicacoes.comissao_cents` depois do registro.
-- A policy de linha aprova as duas escritas: são da empresa dele.
--
-- O mecanismo certo para isso no Postgres é GRANT por coluna. É o que esta
-- migration faz, junto de mover o cálculo dos prazos da disputa para dentro
-- do banco, para que a parte interessada não escolha o próprio prazo.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Dias úteis — o prazo de decisão da plataforma é contado assim
--    (política 06 §7). `stable`, não `immutable`: o dia da semana de um
--    timestamptz depende do TimeZone da sessão.
-- ---------------------------------------------------------
create or replace function public.mais_dias_uteis(base timestamptz, dias integer)
returns timestamptz language plpgsql stable set search_path = public as $$
declare
  restantes integer := dias;
  atual timestamptz := base;
begin
  while restantes > 0 loop
    atual := atual + interval '1 day';
    -- isodow: 1=segunda … 6=sábado, 7=domingo
    if extract(isodow from atual) < 6 then
      restantes := restantes - 1;
    end if;
  end loop;
  return atual;
end;
$$;

-- ---------------------------------------------------------
-- 2. Prazos da disputa são do sistema, não de quem a abre
--
-- Quem insere a disputa é o PARCEIRO, pela policy
-- "parceiro abre disputa da propria indicacao". Sem este trigger ele
-- escolheria `prazo_resposta_em` — isto é, quanto tempo a outra parte tem
-- para responder antes do silêncio virar procedência. Aqui os três carimbos
-- são sobrescritos com o relógio do servidor.
-- ---------------------------------------------------------
create or replace function public.disputas_calcula_prazos()
returns trigger language plpgsql set search_path = public as $$
begin
  new.aberta_em := now();
  -- §7: a empresa tem 5 dias corridos para responder.
  new.prazo_resposta_em := now() + interval '5 days';
  -- §7: a plataforma decide em até 10 dias úteis contados do fim do prazo
  -- de resposta. É o limite externo: responder antes não o encurta.
  new.prazo_decisao_em := public.mais_dias_uteis(new.prazo_resposta_em, 10);
  -- A decisão nunca nasce preenchida, venha o que vier do cliente.
  new.decisao := null;
  new.decisao_fundamentacao := null;
  new.decidida_por := null;
  new.decidida_em := null;
  new.respondida_em := null;
  new.respondida_por := null;
  new.resposta_empresa := null;
  return new;
end;
$$;

create trigger disputas_calcula_prazos
  before insert on public.disputas
  for each row execute function public.disputas_calcula_prazos();

-- ---------------------------------------------------------
-- 3. disputas — a empresa só escreve a própria resposta
--
-- A policy "empresa responde disputa recebida" continua decidindo QUAIS
-- LINHAS ela alcança. O grant abaixo decide QUAIS COLUNAS. Sem ele, a parte
-- interessada julga a própria causa.
-- ---------------------------------------------------------
revoke update on public.disputas from anon, authenticated;
grant update (resposta_empresa, resposta_evidencias, respondida_em, respondida_por)
  on public.disputas to authenticated;

-- A decisão é ato da plataforma: escrita só por service-role.
-- (`admin total disputas` cobre a leitura no painel; a escrita entra pelo
--  cliente admin, que não passa por estes grants.)

-- ---------------------------------------------------------
-- 4. indicacoes — a empresa analisa, não reescreve o registro
--
-- Fora desta lista ficam, deliberadamente:
--   · comissao_cents, faixa_taxa_id, taxa_cents — CONGELADOS no registro
--     (convenção técnica 2). Se a empresa pudesse baixá-los depois, a prova
--     do valor combinado morria junto.
--   · parceiro_id, empresa_id, campanha_id, adesao_id — atribuição.
--   · lead_*, origem_do_dado — o que o parceiro registrou, e o carimbo que
--     decide a atribuição em caso de indicação duplicada (§3.1).
--   · registrada_em, registrada_ip, prazo_analise_em, janela_atribuicao_ate —
--     o relógio que gera a aprovação tácita. Adiável pela parte que perde
--     com ela seria o mesmo que não existir.
--   · aviso_prazo_enviado_em — carimbo do job de aviso.
-- ---------------------------------------------------------
revoke update on public.indicacoes from anon, authenticated;
grant update (
  status,
  analisada_por,
  analisada_em,
  aprovacao_tacita,
  prazo_pagamento_em,
  janela_estorno_ate,
  motivo_recusa,
  motivo_recusa_detalhe,
  prova_recusa_path,
  paga_em,
  liquidacao_registrada_em,
  liquidacao_registrada_por,
  estornada_em,
  estorno_motivo
) on public.indicacoes to authenticated;

-- ---------------------------------------------------------
-- 5. empresas — a empresa edita a própria vitrine, não o próprio veredito
--
-- A policy "membro edita a propria empresa" concede update na linha inteira.
-- Sem recorte de coluna, um usuário de empresa escreve do navegador, com a
-- chave anon:
--   · kyb_status = 'aprovada'          → publica campanha sem verificação
--   · selo_pendencia_pagamento = false → apaga a sanção de §5.5
--   · suspensa_ate = null              → levanta a própria suspensão
--   · assinatura_ativa = true          → usa a plataforma sem assinar
-- Todas são decisões DA PLATAFORMA sobre a empresa. Quem é julgado não
-- assina o julgamento.
--
-- Também ficam de fora razao_social, cnpj, representante_legal_* e slug: são
-- a identidade conferida no KYB. Editáveis depois da aprovação, separariam a
-- empresa verificada da empresa exibida. Alteração ali passa por novo KYB.
-- ---------------------------------------------------------
revoke update on public.empresas from anon, authenticated;
grant update (nome_fantasia, email_contato, site, descricao)
  on public.empresas to authenticated;
