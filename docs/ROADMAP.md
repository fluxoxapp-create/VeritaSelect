# Roadmap — Verita Select

Estado atual: **Fase 0 — Fundação jurídica**

Regra: nenhuma fase começa antes da anterior estar funcionando ponta a ponta.

---

## Fase 0 — Fundação jurídica ⬅️ **AQUI**

Antes de escrever código de produção.

- [x] Rascunhos dos contratos e políticas (`juridico/`)
- [x] Agentes de acompanhamento configurados
- [ ] **Constituir a PJ** (LTDA ou SLU), CNAE de desenvolvimento de software + intermediação
- [ ] **Revisão dos 6 documentos por advogado** — levar `juridico/00-BRIEFING-ADVOGADO.md` junto
- [ ] Responder as 6 perguntas abertas do briefing
- [ ] **Indicar o Encarregado (DPO)** e publicar o e-mail
- [ ] **Definir as 4 faixas de taxa** por indicação aprovada e os valores de cada uma
- [ ] Contratar emissor de fatura/NF para cobrar a empresa — certificar com `certificador-stack`
- [ ] Busca de anterioridade das marcas "Verita Select" (nominativa) e do slogan "DealBridge" no INPI
- [ ] ~~Registrar o domínio no Registro.br~~ — `veritaselect.com.br` já registrado
- [ ] Definir os placeholders: `[RAZÃO SOCIAL]`, `[CNPJ]`, `[COMARCA]`, `[E-MAIL DPO]`, faixas de taxa, multa de desintermediação `[X]%`, dia de emissão e prazo da fatura

**Custo estimado:** R$ 5.000 a R$ 15.000 (advogado) + ~R$ 1.200 (abertura) + R$ 355/classe (INPI) + R$ 40/ano (domínio).

---

## Fase 1 — Esqueleto

- [ ] Projeto Next.js + Supabase + Prisma
- [ ] Autenticação (empresa, parceiro, admin) — MFA obrigatório para admin
- [ ] Schema base com **Row Level Security desde o início**
- [ ] Motor de aceite eletrônico: renderiza → congela → hash SHA-256 → grava IP, timestamp, versão
- [ ] Log de auditoria imutável
- [ ] Aceite dos Termos de Uso no cadastro

**Gate:** `revisor-codigo` aprova a segregação de dados antes de seguir.

---

## Fase 2 — Oferta

- [ ] CRUD de campanha
- [ ] **Validação de segmento** (bloqueio dos regulados) — no servidor
- [ ] **Validação de prazos** dentro dos limites do doc 06 §10
- [ ] Marketplace com filtros (segmento, comissão, ticket, recorrência)
- [ ] Página pública da empresa
- [ ] Adesão à campanha → gera Contrato de Campanha (doc 03) com aceite hasheado

**Gate:** `guardiao-juridico` revisa todos os textos de interface (vocabulário).

---

## Fase 3 — Confiança e habilitação

- [ ] Certificação de produto: material (YouTube não listado + PDF) + questionário
- [ ] Liberação da campanha após certificação
- [ ] **Envio de credencial profissional**: número + documento + nome + UF + validade
- [ ] **Storage privado** para o documento, com log de todo acesso
- [ ] Painel de verificação manual (aprovar/reprovar em 3 dias úteis, com fonte consultada)
- [ ] Trava de servidor: adesão a campanha regulada exige habilitação APROVADA e vigente
- [ ] Cruzamento UF do CRECI × território da campanha
- [ ] **Job diário de vencimento**: avisos D-30 e D-7, bloqueio prospectivo no vencimento
- [ ] Canal de denúncia visível em toda campanha
- [ ] Painel de moderação + suspensão de campanha (prazo de 48h)
- [ ] Agendamento por link externo (Calendly / Meet / Zoom) — **não construir agenda própria**

**Gate:** `guardiao-juridico` confirma que não existe campo de CORE e que a classificação é pela atividade do parceiro.

---

## Fase 4 — Núcleo do negócio

- [ ] Registro de indicação com carimbo de tempo
- [ ] **Deduplicação**: CNPJ → e-mail → telefone → nome normalizado
- [ ] Regra do primeiro registro válido
- [ ] Fluxo de aprovação/recusa com justificativa de lista fechada + prova
- [ ] **Aprovação tácita** por decurso de prazo
- [ ] Janela de atribuição

**Gate:** `engenheiro-pagamentos` valida a máquina de estados.

---

## Fase 5 — Apuração e cobrança

> Encolheu muito com a decisão de faturamento mensal: **não há integração de pagamento no caminho da comissão**. O único fluxo financeiro do sistema é a nossa cobrança contra a empresa.

- [ ] Congelamento de comissão **e faixa de taxa** no registro da indicação
- [ ] Apuração da taxa por indicação aprovada (inclusive por aprovação tácita)
- [ ] Estorno espelhado — comissão estornada devolve a taxa como crédito
- [ ] Registro de liquidação pela empresa (2 dias úteis) + notificação ao parceiro
- [ ] Exibição do líquido estimado para parceiro PF antes da adesão
- [ ] **Fatura mensal com extrato item a item** e fluxo de contestação parcial
- [ ] Conciliação: fatura = soma do extrato − estornos
- [ ] Painel de comissões (empresa e parceiro)
- [ ] Alertas de padrão de desintermediação — sinalização humana, nunca sanção automática

**Gate:** os 12 testes obrigatórios do `engenheiro-pagamentos` passando.

---

## Fase 6 — Operação

- [x] Fluxo de disputa (contestação → resposta → decisão) — prazos carimbados pelo banco (trigger `disputas_calcula_prazos`); silêncio da empresa força procedência no servidor
- [ ] Escala automática de sanção por inadimplência
- [ ] Métricas públicas por empresa (taxa de aprovação, prazo de pagamento)
- [ ] Exportação de dados (LGPD art. 18)
- [ ] Runbook de incidente de segurança (48h para avisar a controladora)

---

## Fase 2+ — Só depois de tração real

Reconsiderar apenas com gatilho concreto:

| Feature | Gatilho para reconsiderar |
|---|---|
| Destaque pago | 50+ empresas ativas — **e** KYB reforçado, porque destaque = endosso = responsabilidade |
| Avaliação mútua | 200+ indicações aprovadas — atenção ao art. 20 LGPD se afetar acesso |
| Distribuição de leads pela empresa | pedido recorrente de 10+ empresas |
| API pública | 3+ empresas com volume que justifique |
| App mobile | uso mobile > 60% do tráfego |
| Papel de "Closer" | **exige decisão consciente** — ativa a Lei 4.886/65 inteira |
| IA de prospecção | receita recorrente cobrindo o custo de inferência |

---

## Gates de segurança por fase

Além dos gates funcionais de cada fase:

| Fase | Gate de segurança |
|---|---|
| 1 | `especialista-banco` prova o isolamento entre 2 tenants; `guardiao-seguranca` valida auth e sessão |
| 2–4 | `qa-testes` cobre os invariantes da fase; `guardiao-seguranca` revisa cada upload e permissão nova |
| 5 | `qa-testes` com os 12 testes financeiros verdes |
| Pré-lançamento | **`pentester-interno`** roda o ataque completo; nenhuma crítica em aberto |

---

## Checklist de lançamento

Antes da primeira campanha real no ar:

- [ ] Fase 0 completa
- [ ] Contratos revisados publicados e com aceite funcionando
- [ ] Política de Privacidade publicada, DPO acessível
- [ ] Segmentos regulados bloqueados no servidor
- [ ] Canal de denúncia funcionando com prazo de resposta
- [ ] Fatura mensal gerada e conferida contra o extrato em um ciclo de teste
- [ ] Backup com restauração testada
- [ ] `docs/MAPA-DE-DADOS.md` completo
- [ ] `docs/STACK-CERTIFICADA.md` com tudo certificado
- [ ] Contador orientado sobre LC 214/2025 (obrigações de plataforma digital)
- [ ] **`pentester-interno` sem achado crítico ou alto em aberto**
- [ ] Isolamento entre tenants com teste automatizado passando
- [ ] `npm audit` sem vulnerabilidade crítica/alta sem mitigação
