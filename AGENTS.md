# Verita Select · DealBridge

Marketplace B2B que conecta **empresas** que querem vender a **parceiros comerciais autônomos** que indicam clientes. A empresa publica uma campanha com a comissão que paga; o parceiro escolhe onde atuar, prospecta, registra a indicação; a empresa aprova; a comissão é liquidada.

**A plataforma não é parte da relação comercial.** Ela licencia o software, registra os fatos e cobra por isso.

- **Marca:** Verita Select · **Slogan:** DealBridge · **Domínio:** veritaselect.com.br

---

## ⚠️ Este NÃO é o Next.js que você conhece

O projeto roda **Next.js 16.2.7**. APIs, convenções e estrutura de arquivos divergem do que está na sua memória de treino. **Leia o guia relevante em `node_modules/next/dist/docs/` antes de escrever qualquer código.** Atenção aos avisos de depreciação.

Quebras que já mordem neste repositório:

| Mudança | O que fazer |
|---|---|
| `middleware.ts` foi renomeado para **`proxy.ts`** | O arquivo é `src/proxy.ts` e exporta `proxy()`, não `middleware()` |
| `cookies()`, `headers()`, `draftMode()` são **sempre assíncronos** | `const c = await cookies()` — acesso síncrono foi removido de vez |
| `params` e `searchParams` em `page`/`layout`/`route` são **Promises** | `const { slug } = await props.params`. Use `PageProps<'/rota/[slug]'>` |
| Turbopack é o padrão em `dev` e `build` | Não adicione config de webpack |
| `next lint` foi removido | O script `lint` chama o CLI do ESLint direto |

---

## ⛔ Linhas vermelhas — não negociáveis

Estas seis regras vêm de análise jurídica, não de preferência técnica. Violar qualquer uma cria passivo que se multiplica por usuário. Em dúvida, chame o agente `guardiao-juridico`.

### 1. O parceiro é autônomo — nunca empregado
Sem jornada, sem meta individual com sanção, sem exclusividade, sem punição disciplinar, sem exigência de execução pessoal. Base: **CLT art. 442-B**.
→ Não existe campo de horário, escala, ponto ou meta pessoal. Nem "para usar depois".

### 2. O parceiro indica — não fecha a venda
A atividade é **mediação** (CC arts. 722–729). Se o parceiro passar a fechar contratos de forma continuada, o modelo cai na **Lei 4.886/65** (registro CORE, indenização de rescisão de 1/20, aviso prévio).
→ Nada de "Closer" com poder de assinatura, proposta vinculante, desconto ou recebimento de valores.

### 3. Segmentos regulados passam por portão de habilitação
Não é banimento — é gate. Ver `juridico/07-politica-de-habilitacao.md`.

| Segmento | Regime |
|---|---|
| Seguros, imóveis, investimentos, planos de saúde | 🔓 abre por credencial verificada (SUSEP / CRECI / CVM) |
| Crédito e consórcio | 🔒 fechados — não existe credencial individual que os libere |

→ A campanha classifica **a atividade do parceiro**, não o setor do cliente. Software *para* corretoras não é campanha de seguros.
→ Validação **no servidor**. Credencial exige número + documento + UF + validade, com bloqueio automático no vencimento.
→ **Não existe campo para CORE.** Coletá-lo produziria prova de que os parceiros exercem representação comercial — exatamente a Zona 2 que a linha vermelha nº 2 evita.

### 4. A plataforma nunca toca no dinheiro
A empresa paga a comissão **diretamente ao parceiro**. A plataforma cobra **só da empresa**, em fatura mensal, valor fixo por indicação aprovada. Não há split, não há PSP no caminho da comissão.
→ **Não existe** entidade `Carteira`, campo `saldo`, escrow, saque interno nem integração de repasse. Custódia = atividade de instituição de pagamento (Lei 12.865/2013, Res. BCB 80/2021) + PLD/FT.
→ **O parceiro não paga nada à plataforma.** Nenhuma retenção, nenhuma taxa. Ele recebe a comissão integralmente. Essa é a defesa mais forte contra vínculo: não existe relação financeira entre plataforma e parceiro.

### 5. Remuneração é sempre por negócio real, em nível único
→ Sem comissão sobre produção de parceiro indicado, sem downline, sem bônus por recrutamento. Base: **Lei 1.521/51, art. 2º, IX**.

### 6. Vocabulário importa — vira prova em audiência

| ❌ Nunca | ✅ Sempre |
|---|---|
| vaga, contratar | campanha, adesão |
| meus SDRs, minha equipe | parceiros credenciados |
| demitir, desligar | encerrar adesão |
| funcionário, colaborador | parceiro comercial autônomo |
| salário | comissão por resultado |
| gestor, supervisor | responsável pela campanha |
| treinamento obrigatório | certificação de produto |

---

## 🤖 Agentes do projeto

Onze agentes em `.claude/agents/`, em duas famílias. Use antes de implementar, não depois.

**Decisão e conformidade** — validam antes de existir código:

| Agente | Quando chamar |
|---|---|
| **arquiteto-mvp** | Antes de decidir o que construir. Guarda o escopo |
| **guardiao-juridico** | Feature que toque parceiro, campanha, comissão, certificação, habilitação ou texto de interface |
| **auditor-lgpd** | Ao criar campo, tabela, formulário, log, endpoint ou integração |
| **certificador-stack** | Antes de instalar pacote ou contratar serviço |
| **engenheiro-pagamentos** | Qualquer coisa com valor, prazo, aprovação, estorno ou fatura |

**Construção e defesa** — produzem e endurecem o código:

| Agente | Quando chamar |
|---|---|
| **nucleo-dev** | Implementar feature, rota, componente, server action |
| **especialista-banco** | Schema, migration, RLS, índice, query lenta |
| **guardiao-seguranca** | Auth, permissão, upload, segredos, deploy, dependências |
| **pentester-interno** | Tentar quebrar o app antes do lançamento e após feature sensível |
| **qa-testes** | Ao concluir feature, ao corrigir bug, antes de fechar uma fase |
| **revisor-codigo** | Antes do merge |

**Fluxo padrão de uma feature:**
```
arquiteto-mvp → guardiao-juridico → [auditor-lgpd] → [especialista-banco] → nucleo-dev
                                    [certificador-stack]                        │
                                    [engenheiro-pagamentos]                     ▼
                                                              qa-testes → guardiao-seguranca → revisor-codigo

Antes de lançar e após auth/pagamento/upload/habilitação:  pentester-interno
```

---

## 📁 Estrutura

```
src/app/           rotas (App Router)
src/components/    componentes compartilhados
src/lib/           domínio, acesso a dados, infra
src/proxy.ts       sessão Supabase + gate de /admin
supabase/          migrations SQL
juridico/          contratos e políticas (rascunhos p/ advogado revisar)
docs/              mapa de dados, stack certificada, roadmap
.claude/agents/    definição dos agentes
```

| Documento | Conteúdo |
|---|---|
| `juridico/00-BRIEFING-ADVOGADO.md` | decisões jurídicas + perguntas abertas |
| `juridico/01` | Termos de Uso — Empresa |
| `juridico/02` | Termos de Uso — Parceiro |
| `juridico/03` | Contrato de Campanha (gerado pelo sistema) |
| `juridico/04` | Política de Privacidade |
| `juridico/05` | Anexo DPA (art. 39 LGPD) |
| `juridico/06` | Política de Comissionamento e Disputas ← **regra de negócio financeira** |
| `juridico/07` | Política de Habilitação Profissional ← **regra do portão de segmentos regulados** |
| `docs/MAPA-DE-DADOS.md` | registro do art. 37 LGPD |
| `docs/STACK-CERTIFICADA.md` | o que foi aprovado e quando |
| `docs/ROADMAP.md` | fases e estado atual |
| `docs/PLANO-DE-ATAQUE.md` | stack, orçamento em duas fases, sitemap e layout |

---

## 💰 Modelo de receita

| Quem paga | O quê | Como |
|---|---|---|
| **Empresa** | Assinatura mensal + **valor fixo por indicação aprovada** (por faixa de comissão) | Fatura mensal com extrato item a item |
| **Parceiro** | Nada | — |

- **Fato gerador da taxa:** indicação *aprovada* — ato da própria empresa, registrado com data, hora e usuário. Não é "venda fechada" (não vemos) nem "indicação registrada" (cobraria por lixo).
- **Aprovação tácita gera taxa.** Precisa estar em destaque no contrato e avisar a empresa 3 dias antes do prazo.
- **Estorno espelhado.** Comissão estornada → taxa estornada junto, como crédito na fatura.
- **Anti-desintermediação:** taxa devida por 12 meses sobre negócio nascido de aproximação na plataforma, ainda que fechado fora. Base: **CC art. 727**.

---

## 🛠️ Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · PostgreSQL (Supabase, região São Paulo) · Supabase Auth + Storage · Resend · Vercel · emissor de fatura/NF para cobrar a assinatura e as taxas da empresa.

**Orçamento:** teto de R$ 100/mês. Começa tudo em camada gratuita; sobe por gatilho concreto, nunca antes. Ver `docs/PLANO-DE-ATAQUE.md`.

**Não há integração de pagamento no caminho da comissão.** O único fluxo financeiro do sistema é a nossa própria cobrança contra a empresa.

**Nada entra sem passar pelo `certificador-stack`.**

### Clientes Supabase — escolha o certo

| Arquivo | Quando usar |
|---|---|
| `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers. Roda como o usuário logado — **toda query passa por RLS** |
| `src/lib/supabase/client.ts` | Client Components |
| `src/lib/supabase/admin.ts` | Só onde precisa furar RLS: escrita de auditoria, rate limit, jobs, painel admin. Tem `server-only` — quebra o build se vazar para o cliente |

---

## ⚙️ Convenções técnicas herdadas do jurídico

1. **Valores monetários em centavos** (inteiro). Nunca float.
2. **Comissão e faixa de taxa congeladas** no momento do registro da indicação. Alteração da campanha só afeta registros futuros.
3. **Aceite eletrônico com prova**: contrato renderizado, congelado e hasheado (SHA-256) no aceite, com IP, timestamp e versão. Nunca apontar para URL viva.
4. **Row Level Security desde o primeiro dia.** Nenhuma query cruza dados de leads entre empresas.
5. **Log de auditoria imutável** para toda transição de status. É requisito legal (Marco Civil art. 15, 6 meses), não observabilidade opcional.
6. **Tenant vem da sessão do servidor**, nunca do cliente.
7. **Validação no servidor.** O formulário não é controle de segurança.

---

## 🚦 Estado atual

**Fase 1 — Esqueleto**, construído sobre a infraestrutura herdada do produto anterior (auth Supabase, RLS, auditoria imutável, rate limit, e-mail transacional, design system).

Os placeholders jurídicos — `[RAZÃO SOCIAL]`, `[CNPJ]`, `[COMARCA]`, `[E-MAIL DPO]`, faixas de taxa, multa de desintermediação — continuam **abertos e visíveis na interface**. Não invente valores para eles: renderize o marcador. A Fase 0 (CNPJ, revisão do advogado, DPO indicado) ainda não fechou.

Ver `docs/ROADMAP.md`.
