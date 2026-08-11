# Plano de Ataque — construção do Verita Select

Como construir, com o quê, e cabendo em **R$ 100/mês**. Este documento decide a stack e o layout; a ordem de execução mora no `ROADMAP.md`.

> Preços verificados em agosto/2026. Câmbio de referência: US$ 1 ≈ R$ 5,60 · € 1 ≈ R$ 6,20. Todo serviço aqui ainda passa pelo `certificador-stack` antes de entrar de fato.

---

## 1. A restrição que decide tudo: o teto de R$ 100

Dois serviços que os documentos antigos assumiam **não cabem**:

| Serviço | Preço real | Problema |
|---|---|---|
| Vercel Pro | US$ 20/mês (~R$ 112) | O plano Hobby (grátis) **proíbe uso comercial**. Um SaaS que fatura precisa do Pro — que já estoura o teto sozinho |
| Supabase Pro | US$ 25/mês (~R$ 140) | Sozinho passa de R$ 100 |

Conclusão: **não dá para pagar plano gerenciado premium de dois fornecedores.** A saída é usar camada gratuita onde ela é comercialmente honesta, e um VPS barato quando o volume crescer. Duas fases:

### Fase Validação — enquanto não há receita (Fases 0 a 4 do roadmap)
**Custo: ~R$ 5/mês** (só o domínio amortizado)

| Camada | Escolha | Custo | Por quê |
|---|---|---|---|
| Framework | Next.js 15 (App Router) | — | ver §2 |
| Hospedagem | **Cloudflare Workers + OpenNext** | Grátis | A camada gratuita **permite uso comercial** (ao contrário da Vercel Hobby). OpenNext 1.0 é GA e é o caminho recomendado pelo time do Next para Cloudflare |
| Banco + Auth + Storage | **Supabase, região São Paulo** | Grátis | Dado **no Brasil** — ponto de LGPD a favor. 500 MB de banco, 1 GB de arquivos, 50 mil usuários/mês |
| E-mail | Resend | Grátis | 3.000 e-mails/mês, 100/dia |
| Domínio | Registro.br `.com.br` | ~R$ 40/ano | — |

> ⚠️ **A pausa do Supabase free** (após 7 dias sem atividade) não morde um site com uso diário real. Durante o desenvolvimento puro, se pausar, você reativa no painel em segundos. O limite que morde primeiro é **1 GB de storage** — e é exatamente onde entram os documentos de habilitação (imagens de certidões). Enquanto você **não** ligar segmentos regulados, isso não é problema.

### Fase Operação — quando ligar segmentos regulados ou passar dos limites grátis
**Custo: ~R$ 30 a R$ 60/mês**

O gatilho é concreto: storage de habilitação estourando 1 GB, banco passando de 500 MB, ou volume de tráfego real. Aí o Supabase Pro (R$ 140) quebraria o teto — então a jogada é **auto-hospedar Postgres + storage num único VPS**:

| Camada | Escolha | Custo |
|---|---|---|
| VPS | Hetzner CX22 (2 vCPU, 4 GB, 40 GB NVMe) via **Coolify** | ~R$ 28/mês |
| Nesse box | Postgres + MinIO (storage S3-compatível) + a app Next | incluído |
| Front | Cloudflare na frente (CDN + cache) | grátis |
| E-mail | Resend | grátis |

> 🇧🇷 **Ressalva de LGPD:** o Hetzner fica na Europa — isso é **transferência internacional** (LGPD art. 33), coberta pelas cláusulas padrão que o DPA já prevê. Se você preferir manter o dado **em solo brasileiro**, troque por um VPS nacional (ex.: Magalu Cloud) ou permaneça no Supabase São Paulo pagando o Pro só quando o faturamento justificar. É uma decisão de trade-off entre custo e residência do dado — leve ao `auditor-lgpd` e ao advogado antes de escalar.

**Resumo do orçamento:** você passa **meses** na Fase Validação a ~R$ 5/mês. Quando escalar, o VPS mantém tudo abaixo de R$ 60. O teto de R$ 100 nunca é ameaçado — desde que você **não** caia na armadilha do Supabase Pro + Vercel Pro.

### Escada de upgrade — subir só quando o cliente pagar por isso

Essa é exatamente a estratégia certa: **tudo grátis no começo, cada degrau destravado por um gatilho concreto de negócio**, não por ansiedade. Nunca pague adiantado por capacidade que você ainda não usa.

| Degrau | Gatilho — só suba quando… | O que muda | Custo/mês |
|---|---|---|---|
| **0 · Tudo grátis** | início | Cloudflare free + Supabase free (SP) + Resend free | ~R$ 5 |
| **1 · E-mail** | passar de 3.000 e-mails/mês (≈ dezenas de empresas ativas) | Resend pago | ~R$ 110? → avaliar; provável só perto de escala |
| **2 · Banco/Storage** | banco perto de 500 MB **ou** storage de habilitação perto de 1 GB | migra Postgres + storage para **VPS** (Coolify) — **não** para Supabase Pro, que estoura o teto | ~R$ 28 |
| **3 · Tráfego** | Cloudflare free não dar conta (raro antes de milhares de usuários) | Cloudflare Workers Paid | ~R$ 28 |
| **4 · Receita saudável** | faturamento recorrente cobrindo folga | pode voltar ao gerenciado (Supabase Pro) pela conveniência, se quiser | R$ 140+ |

**Regra de ouro:** cada degrau tem que ser pago pela receita que ele ajuda a atender. Se o upgrade não corresponde a cliente entrando, você está gastando cedo demais. O `arquiteto-mvp` e o `certificador-stack` guardam essa disciplina.

---

## 2. O framework: Next.js 15 (App Router)

Mantido, e é uma boa escolha de verdade — não só inércia.

**Por que serve a este projeto:**
- **Server Actions + React Server Components** encaixam no requisito de "validação e autorização no servidor" das linhas vermelhas. O tenant vem da sessão no servidor, nunca do cliente — o framework empurra você para o lado certo.
- **Um só projeto** para front e back reduz superfície e custo — crucial com orçamento apertado e um dev.
- **Ecossistema maduro** com Prisma, Supabase e Zod, que já estão na stack.
- **Portátil:** roda na Vercel, na Cloudflare (OpenNext) ou num VPS. Não te prende a um fornecedor — e essa portabilidade é o que permite a estratégia de duas fases acima.

**Alternativas consideradas e por que não agora:**
- **React Router 7 / Remix** — excelente, mais simples em pontos, mas ecossistema de deploy e exemplos menor para o caso Supabase. Empate técnico que não justifica sair do que já está documentado.
- **SvelteKit** — ótimo e leve, mas menos gente no mercado brasileiro para contratar depois, e menos material. Custo de aprendizado sem ganho decisivo aqui.

**Stack completa:**
```
Next.js 15 (App Router, Server Actions)
  ├─ TypeScript strict
  ├─ Prisma           → ORM, migrations
  ├─ Supabase         → Postgres + Auth + Storage (região São Paulo)
  ├─ Zod              → validação no servidor
  ├─ Tailwind CSS     → estilo (design system do §4)
  ├─ shadcn/ui        → componentes acessíveis, copiados para o repo (sem lock-in)
  ├─ Resend + React Email → transacional
  └─ Vitest + Playwright  → testes (qa-testes)
```

> Cada item novo aqui ainda passa pelo `certificador-stack`. shadcn/ui é copiado para dentro do repo (não é dependência), o que agrada o `revisor-codigo` e evita surpresa de licença.

---

## 3. Mapa do site (sitemap)

Derivado das features do roadmap. Três áreas + admin.

```
PÚBLICO (sem login)
├─ /                        landing — o que é, para empresa, para parceiro
├─ /campanhas               marketplace com filtros
├─ /campanhas/[id]          página pública da campanha
├─ /empresas/[id]           página pública da empresa
├─ /entrar                  login
└─ /cadastro                cadastro (escolhe empresa ou parceiro)

PARCEIRO (/app)
├─ /app                     dashboard: campanhas ativas, indicações, comissões
├─ /app/campanhas           explorar e aderir
├─ /app/campanhas/[id]      detalhe + certificação + aderir
├─ /app/indicacoes          registrar e acompanhar status
├─ /app/comissoes           extrato (recebe integral — sem taxa)
├─ /app/habilitacao         upload de credencial (SUSEP/CRECI/CVM)
└─ /app/perfil              dados, dados bancários

EMPRESA (/empresa)
├─ /empresa                 dashboard: aprovações pendentes, fatura, métricas
├─ /empresa/campanhas       lista + CRUD
├─ /empresa/campanhas/nova  criar (com validação de segmento e prazos)
├─ /empresa/certificacao    montar trilha (vídeo + PDF + questionário)
├─ /empresa/indicacoes      fila de aprovação
├─ /empresa/parceiros       credenciados
└─ /empresa/fatura          fatura mensal + extrato item a item

ADMIN (/admin)
├─ /admin/empresas          KYB — aprovar cadastro
├─ /admin/habilitacoes      verificar credenciais (3 dias úteis)
├─ /admin/denuncias         moderação + suspender campanha
└─ /admin/disputas          contestações de comissão
```

**Estrutura de rota (Next App Router):**
```
app/
├─ (public)/          layout público, sem sidebar
├─ (parceiro)/app/    layout com sidebar de parceiro + guarda de sessão
├─ (empresa)/empresa/ layout com sidebar de empresa + guarda de sessão
└─ (admin)/admin/     layout admin + guarda de papel admin + MFA
```
Cada grupo tem seu `layout.tsx` que resolve a sessão **no servidor** e injeta o tenant. Rota fora do grupo do seu papel → 404, não 403.

---

## 4. Sistema de layout e design

O app é **operado, não lido** — a régua é design de informação, não tipografia de revista. Reaproveita a identidade do projeto (a mesma do mapa do modelo), para os dois entregáveis parecerem a mesma marca.

### Tokens
```
Tinta      #1C1E2B   texto, bordas fortes
Papel      #F1EFEA   fundo (tema claro)
Superfície #FBFAF7   cartões, tabelas
Verdete    #0E5C50   ação primária, status positivo   ← o único acento
Régua      #D9D6CF   divisórias
```
Semântica de estado, **separada do acento** (não conta como cor da marca):
```
Aprovado/Pago  verde   ·  Pendente/Análise  âmbar
Recusado       tijolo  ·  Neutro/Rascunho   cinza
```

### Tipografia
- **Interface e dados:** system-ui (Segoe/San Francisco) — rápido, zero custo de fonte, legível em tabela.
- **Títulos de página:** uma serifada (Georgia) para dar autoridade documental, com parcimônia.
- **Rótulos e números:** mono, com `tabular-nums`, para valores e prazos alinharem em coluna.

### App shell
```
┌────────────────────────────────────────────────┐
│ topbar: logo · busca · notificações · conta     │
├──────────┬─────────────────────────────────────┤
│ sidebar  │  conteúdo                            │
│ (por     │  ┌── resumo (KPIs) ──────────────┐   │
│  papel)  │  │  cartões de estado             │   │
│          │  └───────────────────────────────┘   │
│          │  ┌── ação/tabela ────────────────┐   │
│          │  │  fila, lista, formulário       │   │
│          │  └───────────────────────────────┘   │
└──────────┴─────────────────────────────────────┘
```
- Estado sempre codificado em **forma + cor**: pill de status, faixa de severidade. O que precisa de atenção salta sem leitura.
- Resumo antes do detalhe: o dashboard abre com o que exige ação (aprovações pendentes, fatura a vencer), não com um gráfico bonito.
- Tabela é o componente central (filas de indicação, extrato). Trata com o mesmo cuidado da tipografia: zebra sutil, números à direita, cabeçalho fixo.

### Regras que vêm do jurídico (não são estéticas)
- **Vocabulário:** "parceiros credenciados", nunca "meus SDRs"; "encerrar adesão", nunca "demitir". O `guardiao-juridico` revisa todo texto de tela.
- **Sem** widget de jornada, meta individual ou ranking com sanção.
- Todo aceite (Termos, adesão) renderiza o documento e mostra o **hash + versão** — a tela reflete que há prova sendo gravada.

---

## 5. As 6 telas que carregam o produto

Prioridade de construção. Wireframes no desenho visual (artifact).

1. **Marketplace de campanhas** — o coração público. Grid de cartões + rail de filtros (segmento, comissão, ticket, recorrência, remoto). É o que atrai o parceiro.
2. **Detalhe da campanha + aderir** — comissão em destaque, resultado útil, certificação, botão de adesão que gera o contrato hasheado.
3. **Dashboard do parceiro** — campanhas ativas, indicações por status, comissões a receber, treinamentos pendentes.
4. **Registrar indicação** — o ato que gera dinheiro. Formulário curto com dedup em tempo real e carimbo de tempo visível.
5. **Fila de aprovação da empresa** — tabela com ação em lote, motivo de recusa de lista fechada, aviso de aprovação tácita se aproximando.
6. **Fatura da empresa** — extrato item a item, faixas, estornos, total. A prova que torna a cobrança incontestável.

---

## 6. Sequência de construção (casada com o roadmap)

```
Fase 0  Fundação jurídica              (sem código — em andamento)
Fase 1  Setup + auth + schema + RLS    esqueleto no Cloudflare + Supabase SP
        └ gate: especialista-banco prova isolamento entre 2 tenants
Fase 2  Campanha + marketplace + adesão
        └ gate: guardiao-juridico revisa vocabulário das telas
Fase 3  Certificação + habilitação + denúncia
        └ storage privado de credenciais + job de vencimento
Fase 4  Indicação + dedup + aprovação + aprovação tácita
        └ gate: engenheiro-pagamentos valida a máquina de estados
Fase 5  Apuração + fatura mensal + estorno espelhado
        └ gate: qa-testes com os 12 testes financeiros verdes
Fase 6  Disputas + sanções + métricas + exportação LGPD

Antes de abrir ao público:  pentester-interno sem achado crítico
```

---

## 7. Decisões que tomei aqui (e o que revisar)

| Decisão | Antes | Agora | Motivo |
|---|---|---|---|
| Hospedagem | Vercel | **Cloudflare Workers (OpenNext)** | Vercel Hobby proíbe comercial; Pro estoura o teto |
| Estratégia de custo | plano único | **duas fases** (free → VPS) | Supabase Pro sozinho passa de R$ 100 |
| Região do banco | não definida | **São Paulo** | dado no Brasil = LGPD mais simples |
| UI kit | não definido | **shadcn/ui + Tailwind** | acessível, sem lock-in, copiado ao repo |

**Aberto para você decidir depois:** na Fase Operação, VPS europeu barato (Hetzner, ~R$28, com transferência internacional) **ou** VPS/managed brasileiro (mais caro, dado em solo nacional). É trade-off de custo × residência do dado — não precisa resolver agora, mas o `auditor-lgpd` entra nessa quando chegar a hora.
