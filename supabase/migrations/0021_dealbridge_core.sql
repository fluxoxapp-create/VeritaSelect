-- Verita Select · DealBridge — esquema núcleo
--
-- Esta migration faz a virada de produto: derruba o domínio de sorteios
-- (migrations 0001–0020) e cria o marketplace B2B de indicações.
--
-- O QUE SOBREVIVE, e por quê:
--   profiles            — 1:1 com auth.users; muda só o significado dos papéis
--   audit_log           — append-only, exigência do Marco Civil art. 15
--   rate_limit_buckets  — proteção de força bruta nas rotas de auth
--   is_admin() / set_updated_at() / forbid_audit_mutation() / check_rate_limit()
--
-- As seis linhas vermelhas do AGENTS.md aparecem aqui como estrutura, não como
-- comentário decorativo. Em especial:
--   • não existe tabela de carteira, saldo, escrow ou repasse (linha 4);
--   • não existe coluna de jornada, meta individual ou avaliação disciplinar
--     do parceiro (linha 1);
--   • não existe campo para registro no CORE (linha 2 / política 07 §4);
--   • não existe comissão sobre produção de terceiro — `indicacoes` referencia
--     um único parceiro e não há hierarquia entre parceiros (linha 5).

-- =========================================================
-- 1. DERRUBA O DOMÍNIO DE SORTEIOS
-- =========================================================
drop view if exists public.raffles_public;
drop view if exists public.organizers_public;
drop view if exists public.ganhadores_public;

drop table if exists public.ganhadores cascade;
drop table if exists public.raffle_prizes cascade;
drop table if exists public.pagamentos cascade;
drop table if exists public.raffle_numbers cascade;
drop table if exists public.compras cascade;
drop table if exists public.raffles cascade;
drop table if exists public.categories cascade;
drop table if exists public.organizers cascade;
drop table if exists public.webhook_events cascade;

drop function if exists public.check_prize_winners() cascade;
drop function if exists public.confirm_purchase_payment cascade;
drop function if exists public.get_buyer_emails cascade;
drop function if exists public.populate_raffle_numbers cascade;
drop function if exists public.protect_organizer_fields() cascade;
drop function if exists public.protect_raffle_status() cascade;
drop function if exists public.register_draw_result cascade;
drop function if exists public.release_expired_reservations cascade;
drop function if exists public.reserve_raffle_numbers cascade;
drop function if exists public.reveal_prizes_for_raffle cascade;
drop function if exists public.trigger_populate_raffle_numbers() cascade;

drop type if exists kyc_status cascade;
drop type if exists payment_method cascade;
drop type if exists payment_status cascade;
drop type if exists purchase_status cascade;
drop type if exists raffle_status cascade;

-- =========================================================
-- 2. PAPÉIS
-- Renomear os valores do enum preserva as linhas existentes sem reescrever a
-- coluna. Quem era comprador vira parceiro; quem era organizador vira empresa.
-- =========================================================
alter type user_role rename value 'buyer' to 'parceiro';
alter type user_role rename value 'organizer' to 'empresa';

alter table public.profiles alter column role set default 'parceiro';

comment on column public.profiles.cpf_hash is
  'CPF da pessoa natural dona da conta — o parceiro, ou o representante legal da empresa. Hash com pepper de ambiente; o número nunca é gravado.';

-- =========================================================
-- 3. TIPOS DO DOMÍNIO
-- =========================================================
create type verificacao_status as enum ('nao_enviada', 'pendente', 'aprovada', 'reprovada');

create type campanha_status as enum ('rascunho', 'em_revisao', 'publicada', 'pausada', 'encerrada');

create type adesao_status as enum ('ativa', 'encerrada');

create type certificacao_status as enum ('nao_exigida', 'pendente', 'aprovada', 'reprovada');

-- Ciclo de vida da indicação — política 06 §2.
create type indicacao_status as enum (
  'registrada', 'em_analise', 'aprovada', 'paga',
  'recusada', 'em_disputa', 'estornada', 'expirada'
);

-- Lista FECHADA de motivos de recusa — política 06 §4.1. Recusa fora desta
-- lista é inválida e devolve a indicação para análise (§4.3).
create type motivo_recusa as enum (
  'lead_preexistente',
  'contato_invalido',
  'fora_do_publico_alvo',
  'resultado_util_nao_configurado',
  'indicacao_duplicada',
  'suspeita_de_fraude'
);

-- O que o PARCEIRO faz na campanha — não o setor do cliente. Política 07 §1.
create type atividade_parceiro as enum (
  'indicacao_software',
  'indicacao_servico_b2b',
  'indicacao_produto_b2b',
  'intermediacao_seguros',
  'intermediacao_imobiliaria',
  'intermediacao_investimentos',
  'intermediacao_planos_saude',
  'credito_emprestimo',
  'consorcio'
);

create type conselho_profissional as enum ('susep', 'creci', 'cvm');

create type fatura_status as enum ('aberta', 'emitida', 'contestada', 'paga', 'vencida');

create type fatura_item_tipo as enum ('assinatura', 'taxa_indicacao', 'estorno_credito');

create type disputa_decisao as enum ('procedente', 'improcedente');

-- =========================================================
-- 4. REGIME REGULATÓRIO DA ATIVIDADE
-- Uma função IMMUTABLE para poder ser usada em CHECK constraint: o portão
-- vive no banco, não só na camada de aplicação.
-- =========================================================
create or replace function public.regime_atividade(a atividade_parceiro)
returns text language sql immutable as $$
  select case a
    -- Abrem por credencial individual verificável (política 07 §2)
    when 'intermediacao_seguros'       then 'habilitacao'
    when 'intermediacao_imobiliaria'   then 'habilitacao'
    when 'intermediacao_investimentos' then 'habilitacao'
    when 'intermediacao_planos_saude'  then 'habilitacao'
    -- Fechados: não existe registro individual apresentável (política 07 §3)
    when 'credito_emprestimo' then 'fechado'
    when 'consorcio'          then 'fechado'
    else 'livre'
  end;
$$;

comment on function public.regime_atividade is
  'livre | habilitacao | fechado. Crédito e consórcio são fechados porque correspondente bancário é contrato entre PJ e instituição financeira (Res. CMN 4.935/2021) e consórcio é privativo de administradora autorizada pelo BACEN (Lei 11.795/2008) — em nenhum dos dois existe credencial individual que o parceiro possa apresentar.';

create or replace function public.conselho_da_atividade(a atividade_parceiro)
returns conselho_profissional language sql immutable as $$
  select case a
    when 'intermediacao_seguros'       then 'susep'::conselho_profissional
    when 'intermediacao_planos_saude'  then 'susep'::conselho_profissional
    when 'intermediacao_imobiliaria'   then 'creci'::conselho_profissional
    when 'intermediacao_investimentos' then 'cvm'::conselho_profissional
    else null
  end;
$$;

-- =========================================================
-- 5. EMPRESAS (tenant)
-- =========================================================
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  razao_social text not null,
  nome_fantasia text not null,
  -- CNPJ é dado de pessoa jurídica, público na Receita: gravado em claro para
  -- permitir conferência e exibição. Difere do CPF, que só existe em hash.
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  representante_legal_nome text not null,
  representante_legal_cpf_hash text not null,
  email_contato text not null,
  site text,
  descricao text not null default '',
  kyb_status verificacao_status not null default 'nao_enviada',
  kyb_revisado_por uuid references public.profiles(id),
  kyb_revisado_em timestamptz,
  kyb_motivo_reprovacao text,
  -- Sanções de plataforma — política 06 §5.5 e §9.2.
  selo_pendencia_pagamento boolean not null default false,
  suspensa_ate timestamptz,
  assinatura_ativa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index empresas_kyb_idx on public.empresas (kyb_status);

-- Uma empresa pode ter mais de um usuário. O tenant NUNCA vem do cliente:
-- é resolvido a partir de auth.uid() por esta tabela (convenção técnica 6).
create table public.empresa_usuarios (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  responsavel_pela_campanha boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (empresa_id, profile_id)
);

-- Um usuário pertence a uma única empresa: sem isto, minha_empresa_id() seria
-- ambígua e o isolamento entre tenants dependeria de ordenação arbitrária.
create unique index empresa_usuarios_profile_unico on public.empresa_usuarios (profile_id);

-- =========================================================
-- 6. PARCEIROS
-- ⛔ Proibido nesta tabela: jornada, escala, ponto, disponibilidade
-- obrigatória, meta individual, nota disciplinar. Linha vermelha nº 1.
-- =========================================================
create table public.parceiros (
  id uuid primary key references public.profiles(id) on delete cascade,
  tipo_pessoa text not null check (tipo_pessoa in ('pf', 'pj')),
  documento_hash text not null unique,
  documento_last4 text not null,
  -- Chave Pix do parceiro. Fica visível para a empresa que precisa PAGAR
  -- diretamente. A plataforma não movimenta valor nenhum (linha vermelha 4).
  chave_pix text,
  cidade text,
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7. HABILITAÇÃO PROFISSIONAL — política 07
-- ⛔ Não existe coluna para CORE. É regra deliberada (§4): coletar o registro
-- de representante comercial produziria prova de que os parceiros exercem
-- representação comercial, atraindo a Lei 4.886/65 inteira.
-- =========================================================
create table public.habilitacoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  conselho conselho_profissional not null,
  numero text not null,
  -- Deve coincidir com profiles.full_name; divergência reprova (§5.1).
  nome_no_registro text not null,
  uf text not null check (uf ~ '^[A-Z]{2}$'),
  validade date not null,
  situacao_declarada text not null check (situacao_declarada in ('ativo', 'suspenso', 'cancelado')),
  -- Caminho no bucket PRIVADO. Todo acesso é logado (mapa de dados §6).
  documento_path text not null,
  status verificacao_status not null default 'pendente',
  verificada_por uuid references public.profiles(id),
  verificada_em timestamptz,
  fonte_consultada text,
  motivo_reprovacao text,
  -- Avisos de vencimento D-30 / D-7 (§7.1), marcados para não reenviar.
  aviso_d30_em timestamptz,
  aviso_d7_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habilitacoes_parceiro_idx on public.habilitacoes (parceiro_id);
create index habilitacoes_status_idx on public.habilitacoes (status);
create index habilitacoes_validade_idx on public.habilitacoes (validade) where status = 'aprovada';

-- Uma credencial aprovada e vigente por conselho/UF. Reenvios reprovados não
-- colidem, então o parceiro pode corrigir e reenviar (§6.5).
create unique index habilitacoes_aprovada_unica
  on public.habilitacoes (parceiro_id, conselho, uf)
  where status = 'aprovada';

-- Vigente = aprovada E dentro da validade. O bloqueio no vencimento é
-- prospectivo: indicações já registradas continuam valendo (§7.2).
create or replace function public.parceiro_habilitado(
  p_parceiro_id uuid,
  p_conselho conselho_profissional,
  p_ufs text[]
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.habilitacoes h
    where h.parceiro_id = p_parceiro_id
      and h.conselho = p_conselho
      and h.status = 'aprovada'
      and h.validade >= current_date
      -- CRECI é estadual: a UF do registro precisa cobrir o território da
      -- campanha. SUSEP e CVM são nacionais, então p_ufs vem nulo.
      and (p_ufs is null or h.uf = any (p_ufs))
  );
$$;

-- =========================================================
-- 8. FAIXAS DE TAXA — política 06 §5-A.3
-- Sem seed: os valores são placeholder [ ] da Fase 0 e serão inseridos
-- quando o advogado e o sócio fecharem a tabela. Inventar número aqui
-- viraria cobrança errada em produção.
-- =========================================================
create table public.faixas_taxa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  comissao_min_cents integer not null check (comissao_min_cents >= 0),
  -- null = sem teto (última faixa)
  comissao_max_cents integer check (comissao_max_cents is null or comissao_max_cents > comissao_min_cents),
  taxa_cents integer not null check (taxa_cents >= 0),
  vigente_desde date not null default current_date,
  vigente_ate date,
  created_at timestamptz not null default now()
);

create index faixas_taxa_vigencia_idx on public.faixas_taxa (vigente_desde, vigente_ate);

create or replace function public.faixa_para_comissao(p_comissao_cents integer)
returns uuid language sql stable as $$
  select f.id from public.faixas_taxa f
  where p_comissao_cents >= f.comissao_min_cents
    and (f.comissao_max_cents is null or p_comissao_cents <= f.comissao_max_cents)
    and f.vigente_desde <= current_date
    and (f.vigente_ate is null or f.vigente_ate >= current_date)
  order by f.comissao_min_cents desc
  limit 1;
$$;

-- =========================================================
-- 9. CAMPANHAS
-- =========================================================
create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  slug text not null unique,
  titulo text not null,
  produto text not null,
  descricao text not null default '',
  segmento_mercado text not null,
  -- O que o PARCEIRO faz. É sobre esta coluna que o portão regulado valida.
  atividade_parceiro atividade_parceiro not null,
  -- Território de atuação; usado no cruzamento com a UF do CRECI.
  territorio_ufs text[],

  comissao_cents integer not null check (comissao_cents > 0),
  comissao_recorrente boolean not null default false,
  comissao_observacao text,
  ticket_cents integer check (ticket_cents is null or ticket_cents > 0),

  publico_alvo text not null,
  -- O que a empresa reconhece como resultado que gera comissão.
  resultado_util text not null,

  -- Prazos — limites da política 06 §10. A campanha não pode ser publicada
  -- fora deles, e a validação mora aqui além da camada de aplicação.
  prazo_analise_dias integer not null default 15 check (prazo_analise_dias between 3 and 30),
  prazo_pagamento_dias integer not null default 15 check (prazo_pagamento_dias between 1 and 30),
  janela_atribuicao_dias integer not null default 90 check (janela_atribuicao_dias between 30 and 180),
  janela_estorno_dias integer not null default 30 check (janela_estorno_dias between 7 and 60),

  exige_certificacao boolean not null default false,
  certificacao_material_url text,
  certificacao_material_path text,

  status campanha_status not null default 'rascunho',
  revisada_por uuid references public.profiles(id),
  revisada_em timestamptz,
  motivo_reprovacao text,
  publicada_em timestamptz,
  encerrada_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- O portão de segmento fechado, no próprio schema: crédito e consórcio
  -- nunca chegam ao ar, nem por bug de aplicação, nem por escrita direta.
  constraint campanha_segmento_fechado_nunca_publica
    check (status = 'rascunho' or public.regime_atividade(atividade_parceiro) <> 'fechado'),

  -- Campanha regulada precisa dizer em que UFs atua, senão não há como
  -- cruzar com o CRECI do parceiro.
  constraint campanha_regulada_exige_territorio
    check (
      public.regime_atividade(atividade_parceiro) <> 'habilitacao'
      or public.conselho_da_atividade(atividade_parceiro) <> 'creci'
      or (territorio_ufs is not null and array_length(territorio_ufs, 1) > 0)
    )
);

create index campanhas_empresa_idx on public.campanhas (empresa_id);
create index campanhas_status_idx on public.campanhas (status);
create index campanhas_atividade_idx on public.campanhas (atividade_parceiro);

-- =========================================================
-- 10. ACEITES ELETRÔNICOS — convenção técnica 3
-- O documento é congelado e hasheado no aceite. Nunca se aponta para URL
-- viva: em audiência, o que vale é o texto que a pessoa realmente leu.
-- =========================================================
create table public.aceites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  documento_tipo text not null check (documento_tipo in (
    'termos_empresa', 'termos_parceiro', 'contrato_campanha', 'privacidade', 'dpa'
  )),
  documento_versao text not null,
  campanha_id uuid references public.campanhas(id),
  conteudo_congelado text not null,
  conteudo_sha256 text not null check (conteudo_sha256 ~ '^[0-9a-f]{64}$'),
  ip inet,
  user_agent text,
  aceito_em timestamptz not null default now()
);

create index aceites_profile_idx on public.aceites (profile_id);
create index aceites_campanha_idx on public.aceites (campanha_id);

-- Prova não se edita.
create or replace function public.forbid_aceite_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'aceites é imutável — a prova do aceite não pode ser alterada';
end;
$$;

create trigger aceites_no_update before update on public.aceites
  for each row execute function public.forbid_aceite_mutation();
create trigger aceites_no_delete before delete on public.aceites
  for each row execute function public.forbid_aceite_mutation();

-- =========================================================
-- 11. ADESÕES (parceiro ↔ campanha)
-- =========================================================
create table public.adesoes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  status adesao_status not null default 'ativa',
  certificacao certificacao_status not null default 'nao_exigida',
  aceite_id uuid references public.aceites(id),
  aderida_em timestamptz not null default now(),
  encerrada_em timestamptz,
  encerrada_motivo text,

  constraint adesao_unica unique (campanha_id, parceiro_id)
);

create index adesoes_parceiro_idx on public.adesoes (parceiro_id);
create index adesoes_campanha_idx on public.adesoes (campanha_id);

-- =========================================================
-- 12. INDICAÇÕES — o núcleo do negócio
-- =========================================================
create table public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas(id) on delete restrict,
  parceiro_id uuid not null references public.parceiros(id) on delete restrict,
  -- Desnormalizado de propósito: é a chave de isolamento entre tenants usada
  -- em toda policy de RLS, e não pode depender de join para ser avaliada.
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  adesao_id uuid not null references public.adesoes(id) on delete restrict,

  -- ----- Lead: dado pessoal sob controle da EMPRESA. Somos operadores. -----
  lead_empresa_nome text not null,
  lead_cnpj text check (lead_cnpj is null or lead_cnpj ~ '^[0-9]{14}$'),
  lead_contato_nome text not null,
  lead_contato_cargo text,
  lead_contato_email text,
  lead_contato_telefone text,
  -- Obrigatório para sustentar o legítimo interesse do art. 10 (mapa de dados).
  origem_do_dado text not null,
  -- A interface avisa: não inserir dado sensível aqui.
  observacoes text,

  -- Chaves de deduplicação na ordem da política 06 §3.2:
  -- CNPJ → e-mail → telefone → nome normalizado.
  lead_email_norm text generated always as (lower(btrim(lead_contato_email))) stored,
  lead_telefone_norm text generated always as (regexp_replace(coalesce(lead_contato_telefone, ''), '\D', '', 'g')) stored,
  lead_nome_norm text generated always as (lower(btrim(lead_empresa_nome))) stored,

  status indicacao_status not null default 'registrada',

  -- ----- Valores congelados no registro (convenção técnica 2) -----
  comissao_cents integer not null check (comissao_cents > 0),
  faixa_taxa_id uuid references public.faixas_taxa(id),
  -- null enquanto as faixas da Fase 0 não estiverem definidas; a fatura
  -- mostra o lançamento como pendente de precificação em vez de cobrar errado.
  taxa_cents integer check (taxa_cents is null or taxa_cents >= 0),

  -- ----- Prazos calculados no registro -----
  registrada_em timestamptz not null default now(),
  registrada_ip inet,
  prazo_analise_em timestamptz not null,
  janela_atribuicao_ate timestamptz not null,
  prazo_pagamento_em timestamptz,
  janela_estorno_ate timestamptz,

  -- ----- Análise -----
  analisada_por uuid references public.profiles(id),
  analisada_em timestamptz,
  aprovacao_tacita boolean not null default false,
  aviso_prazo_enviado_em timestamptz,
  motivo_recusa motivo_recusa,
  motivo_recusa_detalhe text,
  prova_recusa_path text,

  -- ----- Liquidação: registrada PELA EMPRESA. Nenhum valor passa por nós. -----
  paga_em timestamptz,
  liquidacao_registrada_em timestamptz,
  liquidacao_registrada_por uuid references public.profiles(id),

  -- ----- Estorno -----
  estornada_em timestamptz,
  estorno_motivo text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Recusa exige motivo da lista fechada (§4.1); recusa genérica é inválida.
  constraint recusa_exige_motivo
    check (status <> 'recusada' or motivo_recusa is not null)
);

create index indicacoes_empresa_idx on public.indicacoes (empresa_id);
create index indicacoes_parceiro_idx on public.indicacoes (parceiro_id);
create index indicacoes_campanha_idx on public.indicacoes (campanha_id);
create index indicacoes_status_idx on public.indicacoes (status);
-- Varredura do job de aprovação tácita e do aviso de 3 dias (§4.2, §5-A.2).
create index indicacoes_prazo_analise_idx on public.indicacoes (prazo_analise_em)
  where status in ('registrada', 'em_analise');

-- ----- Deduplicação: primeiro registro válido vence (§3.1) -----
-- Só bloqueiam registros que ainda "seguram" o lead. Recusada, expirada ou
-- estornada libera o lead para outro parceiro tentar de novo.
create unique index indicacoes_dedup_cnpj on public.indicacoes (campanha_id, lead_cnpj)
  where lead_cnpj is not null and status in ('registrada','em_analise','aprovada','paga','em_disputa');
create unique index indicacoes_dedup_email on public.indicacoes (campanha_id, lead_email_norm)
  where lead_email_norm is not null and lead_email_norm <> ''
    and status in ('registrada','em_analise','aprovada','paga','em_disputa');
create unique index indicacoes_dedup_telefone on public.indicacoes (campanha_id, lead_telefone_norm)
  where lead_telefone_norm <> ''
    and status in ('registrada','em_analise','aprovada','paga','em_disputa');
create unique index indicacoes_dedup_nome on public.indicacoes (campanha_id, lead_nome_norm)
  where status in ('registrada','em_analise','aprovada','paga','em_disputa');

-- =========================================================
-- 13. LINHA DO TEMPO DA INDICAÇÃO
-- audit_log é admin-only por RLS; as duas partes da relação também precisam
-- ver a sequência de fatos da própria indicação. Append-only igualmente.
-- =========================================================
create table public.indicacao_eventos (
  id bigint generated always as identity primary key,
  indicacao_id uuid not null references public.indicacoes(id) on delete cascade,
  de_status indicacao_status,
  para_status indicacao_status not null,
  ator_id uuid references public.profiles(id),
  ator_papel user_role,
  automatico boolean not null default false,
  observacao text,
  created_at timestamptz not null default now()
);

create index indicacao_eventos_indicacao_idx on public.indicacao_eventos (indicacao_id, created_at);

create or replace function public.forbid_evento_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'indicacao_eventos é append-only';
end;
$$;

create trigger indicacao_eventos_no_update before update on public.indicacao_eventos
  for each row execute function public.forbid_evento_mutation();
create trigger indicacao_eventos_no_delete before delete on public.indicacao_eventos
  for each row execute function public.forbid_evento_mutation();

-- =========================================================
-- 14. DISPUTAS — política 06 §7
-- =========================================================
create table public.disputas (
  id uuid primary key default gen_random_uuid(),
  indicacao_id uuid not null references public.indicacoes(id) on delete cascade,
  aberta_por uuid not null references public.profiles(id),
  motivo text not null,
  evidencias jsonb not null default '[]'::jsonb,
  aberta_em timestamptz not null default now(),
  prazo_resposta_em timestamptz not null,

  resposta_empresa text,
  resposta_evidencias jsonb not null default '[]'::jsonb,
  respondida_em timestamptz,
  respondida_por uuid references public.profiles(id),

  prazo_decisao_em timestamptz,
  decisao disputa_decisao,
  decisao_fundamentacao text,
  decidida_por uuid references public.profiles(id),
  decidida_em timestamptz,

  constraint disputa_unica_por_indicacao unique (indicacao_id)
);

create index disputas_decisao_idx on public.disputas (decidida_em) where decidida_em is null;

-- =========================================================
-- 15. FATURAS — o ÚNICO fluxo financeiro do sistema.
-- Cobrança da plataforma contra a EMPRESA. O parceiro não aparece aqui,
-- porque o parceiro não paga nada (política 06 §5-A.7).
-- =========================================================
create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  competencia date not null,
  status fatura_status not null default 'aberta',
  assinatura_cents integer not null default 0 check (assinatura_cents >= 0),
  total_cents integer not null default 0,
  emitida_em timestamptz,
  vence_em date,
  paga_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fatura_unica_por_competencia unique (empresa_id, competencia)
);

create index faturas_empresa_idx on public.faturas (empresa_id, competencia desc);

-- Extrato item a item (§5-A.5). Cada taxa aponta para a indicação que a gerou:
-- sem isso não há como a empresa contestar um lançamento específico (§5-A.6).
create table public.fatura_itens (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references public.faturas(id) on delete cascade,
  tipo fatura_item_tipo not null,
  indicacao_id uuid references public.indicacoes(id),
  faixa_taxa_id uuid references public.faixas_taxa(id),
  descricao text not null,
  -- Estorno entra como valor negativo: a conciliação é uma soma simples
  -- (fatura = soma do extrato − estornos).
  valor_cents integer not null,
  contestado boolean not null default false,
  contestacao_motivo text,
  contestado_em timestamptz,
  created_at timestamptz not null default now(),

  constraint taxa_exige_indicacao
    check (tipo = 'assinatura' or indicacao_id is not null),
  constraint estorno_e_credito
    check (tipo <> 'estorno_credito' or valor_cents <= 0)
);

create index fatura_itens_fatura_idx on public.fatura_itens (fatura_id);
-- Uma indicação aprovada gera taxa uma única vez.
create unique index fatura_itens_taxa_unica on public.fatura_itens (indicacao_id)
  where tipo = 'taxa_indicacao';

-- =========================================================
-- 16. CANAL DE DENÚNCIA — visível em toda campanha
-- =========================================================
create table public.denuncias (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references public.campanhas(id) on delete set null,
  denunciante_id uuid references public.profiles(id) on delete set null,
  motivo text not null,
  descricao text not null,
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'procedente', 'improcedente')),
  analisada_por uuid references public.profiles(id),
  analisada_em timestamptz,
  resposta text,
  created_at timestamptz not null default now()
);

create index denuncias_status_idx on public.denuncias (status, created_at desc);

-- =========================================================
-- 17. updated_at
-- =========================================================
create trigger empresas_set_updated_at before update on public.empresas
  for each row execute function public.set_updated_at();
create trigger parceiros_set_updated_at before update on public.parceiros
  for each row execute function public.set_updated_at();
create trigger habilitacoes_set_updated_at before update on public.habilitacoes
  for each row execute function public.set_updated_at();
create trigger campanhas_set_updated_at before update on public.campanhas
  for each row execute function public.set_updated_at();
create trigger indicacoes_set_updated_at before update on public.indicacoes
  for each row execute function public.set_updated_at();
create trigger faturas_set_updated_at before update on public.faturas
  for each row execute function public.set_updated_at();

-- =========================================================
-- 18. RESOLUÇÃO DE TENANT — sempre a partir da sessão do servidor
-- =========================================================
create or replace function public.minha_empresa_id()
returns uuid language sql stable security definer set search_path = public as $$
  select empresa_id from public.empresa_usuarios where profile_id = auth.uid();
$$;

create or replace function public.sou_parceiro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parceiros where id = auth.uid());
$$;

-- =========================================================
-- 19. PORTÃO DE HABILITAÇÃO NO REGISTRO DA INDICAÇÃO
-- Trigger, não policy: precisa olhar a campanha para descobrir o regime, e a
-- mensagem de erro precisa dizer o que falta.
-- =========================================================
create or replace function public.validar_habilitacao_indicacao()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_atividade atividade_parceiro;
  v_ufs text[];
  v_regime text;
  v_conselho conselho_profissional;
begin
  select c.atividade_parceiro, c.territorio_ufs
    into v_atividade, v_ufs
  from public.campanhas c where c.id = new.campanha_id;

  v_regime := public.regime_atividade(v_atividade);

  if v_regime = 'fechado' then
    raise exception 'segmento fechado: campanhas de crédito ou consórcio não aceitam indicação';
  end if;

  if v_regime = 'habilitacao' then
    v_conselho := public.conselho_da_atividade(v_atividade);
    -- CRECI é estadual; SUSEP e CVM valem nacionalmente.
    if not public.parceiro_habilitado(
      new.parceiro_id,
      v_conselho,
      case when v_conselho = 'creci' then v_ufs else null end
    ) then
      raise exception 'habilitação % ausente, reprovada ou vencida para esta campanha', v_conselho;
    end if;
  end if;

  return new;
end;
$$;

create trigger indicacoes_valida_habilitacao
  before insert on public.indicacoes
  for each row execute function public.validar_habilitacao_indicacao();

-- =========================================================
-- 20. ROW LEVEL SECURITY
-- Nenhuma query cruza dados de lead entre empresas (convenção técnica 4).
-- =========================================================
alter table public.empresas enable row level security;
alter table public.empresa_usuarios enable row level security;
alter table public.parceiros enable row level security;
alter table public.habilitacoes enable row level security;
alter table public.faixas_taxa enable row level security;
alter table public.campanhas enable row level security;
alter table public.aceites enable row level security;
alter table public.adesoes enable row level security;
alter table public.indicacoes enable row level security;
alter table public.indicacao_eventos enable row level security;
alter table public.disputas enable row level security;
alter table public.faturas enable row level security;
alter table public.fatura_itens enable row level security;
alter table public.denuncias enable row level security;

-- ----- empresas -----
-- Perfil público: só empresa aprovada no KYB aparece para quem não é dela.
create policy "publico ve empresa aprovada" on public.empresas
  for select using (kyb_status = 'aprovada');
create policy "membro le a propria empresa" on public.empresas
  for select using (id = public.minha_empresa_id());
create policy "membro edita a propria empresa" on public.empresas
  for update using (id = public.minha_empresa_id()) with check (id = public.minha_empresa_id());
create policy "admin total empresas" on public.empresas
  for all using (public.is_admin());

-- ----- empresa_usuarios -----
create policy "membro le o proprio vinculo" on public.empresa_usuarios
  for select using (profile_id = auth.uid() or empresa_id = public.minha_empresa_id());
create policy "admin total empresa_usuarios" on public.empresa_usuarios
  for all using (public.is_admin());

-- ----- parceiros -----
create policy "parceiro le o proprio cadastro" on public.parceiros
  for select using (id = auth.uid());
create policy "parceiro edita o proprio cadastro" on public.parceiros
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "parceiro cria o proprio cadastro" on public.parceiros
  for insert with check (id = auth.uid());
-- A empresa vê o parceiro que aderiu a uma campanha dela — inclusive a chave
-- Pix, porque é ela quem paga. Nunca vê parceiro de outra empresa.
create policy "empresa ve parceiro aderente" on public.parceiros
  for select using (
    exists (
      select 1 from public.adesoes a
      join public.campanhas c on c.id = a.campanha_id
      where a.parceiro_id = parceiros.id
        and c.empresa_id = public.minha_empresa_id()
    )
  );
create policy "admin total parceiros" on public.parceiros
  for all using (public.is_admin());

-- ----- habilitacoes -----
-- Documento de credencial é dado pessoal sensível na prática: só o dono e a
-- equipe de verificação. A empresa NÃO vê o documento.
create policy "parceiro gerencia a propria habilitacao" on public.habilitacoes
  for all using (parceiro_id = auth.uid()) with check (parceiro_id = auth.uid());
create policy "admin total habilitacoes" on public.habilitacoes
  for all using (public.is_admin());

-- ----- faixas_taxa — leitura pública (a empresa precisa saber o que paga) -----
create policy "todos leem faixas vigentes" on public.faixas_taxa
  for select using (true);
create policy "admin total faixas" on public.faixas_taxa
  for all using (public.is_admin());

-- ----- campanhas -----
create policy "publico le campanha publicada" on public.campanhas
  for select using (status in ('publicada', 'pausada'));
create policy "empresa gerencia as proprias campanhas" on public.campanhas
  for all using (empresa_id = public.minha_empresa_id())
  with check (empresa_id = public.minha_empresa_id());
create policy "admin total campanhas" on public.campanhas
  for all using (public.is_admin());

-- ----- aceites — o titular lê o próprio; ninguém edita (triggers acima) -----
create policy "titular le os proprios aceites" on public.aceites
  for select using (profile_id = auth.uid());
create policy "titular registra o proprio aceite" on public.aceites
  for insert with check (profile_id = auth.uid());
create policy "admin le aceites" on public.aceites
  for select using (public.is_admin());

-- ----- adesoes -----
create policy "parceiro gerencia as proprias adesoes" on public.adesoes
  for all using (parceiro_id = auth.uid()) with check (parceiro_id = auth.uid());
create policy "empresa ve adesoes das proprias campanhas" on public.adesoes
  for select using (
    campanha_id in (select id from public.campanhas where empresa_id = public.minha_empresa_id())
  );
create policy "admin total adesoes" on public.adesoes
  for all using (public.is_admin());

-- ----- indicacoes — a fronteira que mais importa -----
create policy "parceiro le as proprias indicacoes" on public.indicacoes
  for select using (parceiro_id = auth.uid());
create policy "parceiro registra indicacao em adesao ativa" on public.indicacoes
  for insert with check (
    parceiro_id = auth.uid()
    and status = 'registrada'
    and adesao_id in (
      select id from public.adesoes where parceiro_id = auth.uid() and status = 'ativa'
    )
  );
create policy "empresa le indicacoes recebidas" on public.indicacoes
  for select using (empresa_id = public.minha_empresa_id());
create policy "empresa analisa indicacoes recebidas" on public.indicacoes
  for update using (empresa_id = public.minha_empresa_id())
  with check (empresa_id = public.minha_empresa_id());
create policy "admin total indicacoes" on public.indicacoes
  for all using (public.is_admin());

-- ----- indicacao_eventos — leitura para as duas partes, escrita via service-role -----
create policy "partes leem a linha do tempo" on public.indicacao_eventos
  for select using (
    indicacao_id in (
      select id from public.indicacoes
      where parceiro_id = auth.uid() or empresa_id = public.minha_empresa_id()
    )
  );
create policy "admin le eventos" on public.indicacao_eventos
  for select using (public.is_admin());
revoke insert, update, delete on public.indicacao_eventos from anon, authenticated;

-- ----- disputas -----
create policy "partes leem a disputa" on public.disputas
  for select using (
    indicacao_id in (
      select id from public.indicacoes
      where parceiro_id = auth.uid() or empresa_id = public.minha_empresa_id()
    )
  );
create policy "parceiro abre disputa da propria indicacao" on public.disputas
  for insert with check (
    aberta_por = auth.uid()
    and indicacao_id in (select id from public.indicacoes where parceiro_id = auth.uid())
  );
create policy "empresa responde disputa recebida" on public.disputas
  for update using (
    indicacao_id in (select id from public.indicacoes where empresa_id = public.minha_empresa_id())
  );
create policy "admin total disputas" on public.disputas
  for all using (public.is_admin());

-- ----- faturas — cobrança nossa contra a empresa. Parceiro nunca vê. -----
create policy "empresa le as proprias faturas" on public.faturas
  for select using (empresa_id = public.minha_empresa_id());
create policy "admin total faturas" on public.faturas
  for all using (public.is_admin());

create policy "empresa le o proprio extrato" on public.fatura_itens
  for select using (
    fatura_id in (select id from public.faturas where empresa_id = public.minha_empresa_id())
  );
-- Contestar é a única escrita da empresa aqui (§5-A.6).
create policy "empresa contesta lancamento" on public.fatura_itens
  for update using (
    fatura_id in (select id from public.faturas where empresa_id = public.minha_empresa_id())
  );
create policy "admin total fatura_itens" on public.fatura_itens
  for all using (public.is_admin());

-- ----- denuncias — qualquer usuário autenticado denuncia; só admin lê -----
create policy "autenticado registra denuncia" on public.denuncias
  for insert with check (auth.uid() is not null);
create policy "denunciante le a propria denuncia" on public.denuncias
  for select using (denunciante_id = auth.uid());
create policy "admin total denuncias" on public.denuncias
  for all using (public.is_admin());

-- =========================================================
-- 21. TRIGGER DE SIGN-UP — reescrito para os novos papéis
-- Cria o profile; o vínculo com empresa/parceiro é feito pelo onboarding,
-- com auditoria, e nunca a partir de user_metadata (que é o que o cliente
-- mandou, não o que a plataforma verificou).
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, cpf_hash, cpf_last4)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'cpf_hash', 'pending:' || new.id::text),
    coalesce(new.raw_user_meta_data ->> 'cpf_last4', '')
  );

  insert into public.audit_log (actor_id, actor_role, action, target_table, target_id, metadata)
  values (new.id, 'parceiro', 'profile.created', 'profiles', new.id, '{}'::jsonb);

  return new;
end;
$$;

-- =========================================================
-- 22. VIEWS PÚBLICAS
-- security_invoker: a view não empresta privilégio de quem a criou; RLS da
-- tabela de baixo continua valendo para quem consulta (ver 0019/0020).
-- =========================================================
create view public.campanhas_public
with (security_invoker = true) as
  select
    c.id, c.slug, c.titulo, c.produto, c.descricao, c.segmento_mercado,
    c.atividade_parceiro, c.territorio_ufs,
    c.comissao_cents, c.comissao_recorrente, c.comissao_observacao, c.ticket_cents,
    c.publico_alvo, c.resultado_util,
    c.prazo_analise_dias, c.prazo_pagamento_dias,
    c.janela_atribuicao_dias, c.janela_estorno_dias,
    c.exige_certificacao, c.status, c.publicada_em,
    public.regime_atividade(c.atividade_parceiro) as regime,
    e.id as empresa_id, e.slug as empresa_slug, e.nome_fantasia as empresa_nome,
    e.selo_pendencia_pagamento
  from public.campanhas c
  join public.empresas e on e.id = c.empresa_id
  where c.status in ('publicada', 'pausada');

grant select on public.campanhas_public to anon, authenticated;

-- Indicadores públicos por empresa (política 06 §9.2). Agregado — nenhum dado
-- de lead ou de parceiro atravessa esta view.
create view public.empresas_public
with (security_invoker = true) as
  select
    e.id, e.slug, e.nome_fantasia, e.descricao, e.site,
    e.selo_pendencia_pagamento,
    (select count(*) from public.campanhas c where c.empresa_id = e.id and c.status = 'publicada') as campanhas_publicadas
  from public.empresas e
  where e.kyb_status = 'aprovada';

grant select on public.empresas_public to anon, authenticated;
