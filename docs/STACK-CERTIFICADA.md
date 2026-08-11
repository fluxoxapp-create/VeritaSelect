# Stack Certificada — Verita Select

Registro do que foi aprovado pelo agente `certificador-stack`. **Nada entra em produção sem estar aqui.**

Recertificar a cada 6 meses ou em mudança relevante de versão.

---

## Status

| Item | Camada | Status | Versão | Certificado em | Recertificar até |
|---|---|---|---|---|---|
| Next.js | Front + back | ⬜ pendente | — | — | — |
| PostgreSQL / Supabase | Banco | ⬜ pendente | — | — | — |
| Prisma | ORM | ⬜ pendente | — | — | — |
| Supabase Auth | Autenticação | ⬜ pendente | — | — | — |
| Supabase Storage | Arquivos | ⬜ pendente | — | — | — |
| Cloudflare Workers (OpenNext) | Deploy | ⬜ pendente | — | — | — |
| Resend | E-mail | ⬜ pendente | — | — | — |
| **Emissor de fatura/NF** | **Cobrança da empresa** | ⬜ pendente | — | — | — |

Legenda: ✅ aprovado · ⚠️ aprovado com ressalva · ❌ reprovado · ⬜ pendente

> ❌ **PSP com split saiu da stack.** O modelo mudou: a empresa paga a comissão diretamente ao parceiro, e a plataforma cobra só da empresa em fatura mensal. Não há integração de pagamento no caminho da comissão — o que elimina o item mais caro e mais arriscado do MVP.

---

## Certificação: emissor de fatura e nota fiscal

Único serviço financeiro do projeto, e ele cobra **a nossa própria receita** — não movimenta recurso de terceiro. Além da ficha padrão, verificar:

- [ ] Emite **NFS-e** no município da sede
- [ ] Gera boleto e/ou Pix de cobrança **em nome da Verita Select**
- [ ] Suporta **fatura com itens detalhados** (assinatura + N linhas de taxa + créditos de estorno)
- [ ] Permite **crédito/abatimento** na fatura seguinte (para o estorno espelhado)
- [ ] API para gerar a fatura a partir da nossa apuração
- [ ] Webhook de pagamento confirmado
- [ ] Régua de cobrança e notificação de inadimplência
- [ ] Custo por emissão e por boleto
- [ ] Fornece **DPA** (trata dado pessoal)

> ⚠️ Não confunda com PSP: aqui não há custódia de recurso de terceiro. O serviço apenas cobra e liquida **o que é nosso**. Se algum fornecedor propuser reter comissão de parceiro, **reprove** — viola a linha vermelha nº 4.

Candidatos a avaliar: Asaas, Cobre Fácil, eNotas, NFE.io, Vindi. Não presuma taxas nem recursos — **verifique na documentação oficial vigente**.

---

## Ficha de certificação (modelo)

Copie este bloco para cada item certificado.

```
═══════════════════════════════════════
ITEM:
VEREDITO:
DATA:

IDENTIFICAÇÃO
  Versão avaliada:
  Última release:
  Licença:
  Mantenedor:

MANUTENÇÃO
  Commits últimos 6 meses:
  Sinal de abandono:

CUSTO REAL
  Free tier — limites exatos:
  Ao estourar:
  Primeiro degrau pago:
  Estimativa no cenário Verita Select
  (100 empresas / 1.000 parceiros / 5.000 indicações mês):

DADOS PESSOAIS
  Trata dado pessoal:
  País dos dados:
  Transferência internacional:
  Salvaguarda art. 33:
  DPA disponível:
  Entra em juridico/05 §5.2:

SEGURANÇA
  CVEs conhecidas:
  Credencial privilegiada necessária:

LOCK-IN
  Dificuldade de sair (1-5):
  Alternativa compatível:

ALTERNATIVAS CONSIDERADAS
  1.
  2.

RESSALVAS

AÇÕES
  [ ] Adicionado a juridico/05-anexo-dpa.md §5.2
  [ ] Alerta de limite de uso configurado
═══════════════════════════════════════
```

---

## Reprovados

Registre aqui o que foi avaliado e rejeitado, com o motivo — evita reavaliar a mesma coisa daqui a seis meses.

| Item | Data | Motivo da reprovação |
|---|---|---|
| _(nenhum ainda)_ | | |

---

## Reprovação automática

- Licença AGPL ou copyleft forte
- Sem release há mais de 18 meses, sem alternativa
- CVE crítica aberta
- **Propõe custodiar ou repassar a comissão do parceiro** — viola a linha vermelha nº 4, qualquer que seja a autorização que o fornecedor alegue ter
- Trata dado pessoal **sem** DPA nem salvaguarda do art. 33
- Exige chave privada no cliente
