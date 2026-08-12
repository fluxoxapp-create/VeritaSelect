-- =========================================================
-- 0023 — Certificação de produto (Fase 3 do roadmap)
--
-- A 0021 criou `campanhas.exige_certificacao` e `adesoes.certificacao`, mas
-- não o caminho entre 'pendente' e 'aprovada'. Hoje isso é uma armadilha: a
-- campanha que exige certificação põe a adesão em 'pendente' e o parceiro
-- nunca consegue indicar, porque não existe questionário para concluir.
--
-- ⚖️ ENQUADRAMENTO — linha vermelha nº 1 (o parceiro é autônomo)
--
-- Isto é CERTIFICAÇÃO DE PRODUTO, não treinamento obrigatório. A distinção
-- não é de vocabulário, é de prova em audiência: exigência de treinamento,
-- com nota e reprovação, é indício clássico de subordinação (CLT art. 3º).
-- O desenho abaixo remove os elementos que produziriam esse indício:
--
--   · TENTATIVAS ILIMITADAS. Nenhum bloqueio por erro, nenhuma espera
--     punitiva. Errar não gera consequência — só a chance de tentar de novo.
--   · SEM PRAZO para concluir. Prazo para "se capacitar" é jornada disfarçada.
--   · SEM NOTA PERSISTENTE E SEM RANKING. Guardamos acertos da tentativa para
--     o parceiro se situar, nunca para comparar parceiros entre si. Nota
--     comparável vira avaliação de desempenho.
--   · O estado 'reprovada' de `certificacao_status` NÃO é usado por este
--     fluxo. Tentativa sem acerto total mantém a adesão em 'pendente'. Um
--     estado terminal de reprovação seria sanção disciplinar.
--   · A exigência é sobre CONHECER O PRODUTO que o parceiro vai apresentar a
--     terceiros — interesse de qualidade da informação ao cliente final, não
--     controle sobre a pessoa do parceiro.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Questões e alternativas — pertencem à CAMPANHA
-- ---------------------------------------------------------
create table public.certificacao_questoes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  enunciado text not null check (length(btrim(enunciado)) >= 10),
  ordem integer not null default 0,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create index certificacao_questoes_campanha_idx
  on public.certificacao_questoes (campanha_id, ordem) where ativa;

create table public.certificacao_alternativas (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references public.certificacao_questoes(id) on delete cascade,
  texto text not null check (length(btrim(texto)) >= 1),
  -- ⛔ NUNCA exposta ao parceiro. Ver os grants de coluna na seção 4.
  correta boolean not null default false,
  ordem integer not null default 0
);

create index certificacao_alternativas_questao_idx
  on public.certificacao_alternativas (questao_id, ordem);

-- ---------------------------------------------------------
-- 2. Tentativas e respostas
--
-- `parceiro_id` é desnormalizado da adesão de propósito: é a chave de
-- isolamento avaliada em toda policy, e não pode depender de join.
-- ---------------------------------------------------------
create table public.certificacao_tentativas (
  id uuid primary key default gen_random_uuid(),
  adesao_id uuid not null references public.adesoes(id) on delete cascade,
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  acertos integer check (acertos is null or acertos >= 0),
  total integer check (total is null or total >= 0),
  aprovada boolean
);

create index certificacao_tentativas_adesao_idx
  on public.certificacao_tentativas (adesao_id, iniciada_em desc);

create table public.certificacao_respostas (
  id bigint generated always as identity primary key,
  tentativa_id uuid not null references public.certificacao_tentativas(id) on delete cascade,
  questao_id uuid not null references public.certificacao_questoes(id) on delete cascade,
  alternativa_id uuid not null references public.certificacao_alternativas(id) on delete cascade,
  constraint resposta_unica_por_questao unique (tentativa_id, questao_id)
);

-- ---------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------
alter table public.certificacao_questoes enable row level security;
alter table public.certificacao_alternativas enable row level security;
alter table public.certificacao_tentativas enable row level security;
alter table public.certificacao_respostas enable row level security;

-- O parceiro só vê o questionário de campanha em que ADERIU. Sem isso, o
-- banco de questões de uma empresa ficaria legível por qualquer concorrente
-- com uma conta de parceiro.
create policy "parceiro aderente le questoes" on public.certificacao_questoes
  for select using (
    ativa and campanha_id in (select campanha_id from public.adesoes where parceiro_id = auth.uid())
  );
create policy "empresa gerencia questoes das proprias campanhas" on public.certificacao_questoes
  for all using (
    campanha_id in (select id from public.campanhas where empresa_id = public.minha_empresa_id())
  ) with check (
    campanha_id in (select id from public.campanhas where empresa_id = public.minha_empresa_id())
  );
create policy "admin total questoes" on public.certificacao_questoes
  for all using (public.is_admin());

create policy "parceiro aderente le alternativas" on public.certificacao_alternativas
  for select using (
    questao_id in (
      select q.id from public.certificacao_questoes q
      where q.ativa
        and q.campanha_id in (select campanha_id from public.adesoes where parceiro_id = auth.uid())
    )
  );
create policy "empresa gerencia alternativas das proprias campanhas" on public.certificacao_alternativas
  for all using (
    questao_id in (
      select q.id from public.certificacao_questoes q
      join public.campanhas c on c.id = q.campanha_id
      where c.empresa_id = public.minha_empresa_id()
    )
  ) with check (
    questao_id in (
      select q.id from public.certificacao_questoes q
      join public.campanhas c on c.id = q.campanha_id
      where c.empresa_id = public.minha_empresa_id()
    )
  );
create policy "admin total alternativas" on public.certificacao_alternativas
  for all using (public.is_admin());

-- Tentativa: SÓ o parceiro e o admin.
--
-- A empresa deliberadamente NÃO lê esta tabela. O que ela precisa saber é
-- binário — "está certificado nesta campanha?" — e isso já está em
-- `adesoes.certificacao`, que ela lê pela policy da 0021.
--
-- ⚖️ Expor quantas tentativas o parceiro levou entregaria à empresa
-- exatamente o artefato que a linha vermelha nº 1 evita: um histórico de
-- desempenho individual, comparável entre parceiros, produzido pela
-- plataforma. É o insumo de que uma alegação de subordinação precisa.
create policy "parceiro le as proprias tentativas" on public.certificacao_tentativas
  for select using (parceiro_id = auth.uid());
create policy "admin total tentativas" on public.certificacao_tentativas
  for all using (public.is_admin());

create policy "parceiro le as proprias respostas" on public.certificacao_respostas
  for select using (
    tentativa_id in (select id from public.certificacao_tentativas where parceiro_id = auth.uid())
  );
create policy "admin total respostas" on public.certificacao_respostas
  for all using (public.is_admin());

-- ---------------------------------------------------------
-- 4. O gabarito não sai do servidor
--
-- RLS libera a LINHA da alternativa para o parceiro — ele precisa ler o texto
-- para responder. Mas `correta` na mesma linha entregaria o gabarito a quem
-- abrisse o devtools, já que a chave anon é pública. Grant por coluna resolve:
-- o parceiro lê texto e ordem, nunca `correta`.
--
-- A empresa também não lê `correta` por aqui — a tela de gestão do
-- questionário usa o cliente service-role, escopado pela empresa da sessão.
-- A correção das respostas roda no servidor pelo mesmo caminho.
-- ---------------------------------------------------------
revoke select on public.certificacao_alternativas from anon, authenticated;
grant select (id, questao_id, texto, ordem) on public.certificacao_alternativas to authenticated;

-- Tentativa e resposta são escritas pelo servidor (correção + carimbo), nunca
-- pelo cliente: quem pode inserir a própria tentativa "aprovada" não precisa
-- responder ao questionário.
revoke insert, update, delete on public.certificacao_tentativas from anon, authenticated;
revoke insert, update, delete on public.certificacao_respostas from anon, authenticated;

-- ---------------------------------------------------------
-- 5. O parceiro não se auto-certifica
--
-- A policy "parceiro gerencia as proprias adesoes" da 0021 é `for all`, o que
-- inclui update de QUALQUER coluna da própria adesão — inclusive
-- `certificacao`. Do navegador, com a chave anon, o parceiro escreveria
-- `certificacao = 'aprovada'` e puliria o questionário inteiro; e escreveria
-- `aceite_id = null`, apagando o vínculo com o contrato que ele aceitou.
--
-- Encerrar a própria adesão continua liberado: é o direito de sair, e a
-- ausência de trava aqui é o que sustenta "sem exclusividade e sem multa".
-- ---------------------------------------------------------
revoke update on public.adesoes from anon, authenticated;
grant update (status, encerrada_em, encerrada_motivo) on public.adesoes to authenticated;
