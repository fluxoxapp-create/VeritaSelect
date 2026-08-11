# Mapa de Dados — Verita Select

**Registro das operações de tratamento — Lei nº 13.709/2018, art. 37**

Mantido pelo agente `auditor-lgpd`. Atualizar a cada campo, tabela, endpoint ou integração nova.

Última atualização: [DATA] · Responsável: [DPO]

---

## Como preencher

Toda linha precisa de: campo → categoria → **controlador** → **base legal** → **retenção**. Sem os três últimos, o campo não pode existir.

---

## 1. Dados sob controle da Verita Select

### 1.1. Parceiro comercial

| Campo | Dado pessoal? | Base legal (art. 7º) | Finalidade | Retenção |
|---|---|---|---|---|
| `nome` | ✅ | V — execução de contrato | Identificação | Conta + 30 dias |
| `cpf_cnpj` | ✅ | V — execução de contrato | Identificação e antifraude | 5 anos (fiscal) |
| `email` | ✅ | V — execução de contrato | Autenticação e comunicação | Conta + 30 dias |
| `telefone` | ✅ | V — execução de contrato | Contato e verificação | Conta + 30 dias |
| `chave_pix` / dados bancários | ✅ | V — execução de contrato | Recebimento de comissão | 5 anos (fiscal) |
| `habilitacao.numero` / `uf` / `validade` | ✅ | II — obrigação legal | Habilitação em segmento regulado | Conta + **5 anos** (defesa da liberação concedida) |
| `habilitacao.nome_no_registro` | ✅ | II — obrigação legal | Conferência de titularidade | Conta + 5 anos |
| `habilitacao.documento_url` | ✅ **sensível na prática** | II — obrigação legal | Verificação da credencial | Conta + 5 anos |
| `historico_indicacoes` | ✅ | V — execução de contrato | Operação e prestação de contas | 5 anos |

> ⛔ **Campos proibidos nesta tabela:** qualquer coisa relacionada a jornada, horário, disponibilidade obrigatória, meta individual ou avaliação disciplinar. Ver linha vermelha nº 1 do `CLAUDE.md`.

### 1.2. Empresa anunciante

| Campo | Dado pessoal? | Base legal | Finalidade | Retenção |
|---|---|---|---|---|
| `razao_social`, `cnpj` | ❌ (dado de PJ) | V | Cadastro e KYB | 5 anos |
| `representante_legal_nome`, `cpf` | ✅ | II — obrigação legal | Validação de poderes | 5 anos |
| `email_contato` | ✅ se nominal | V | Comunicação | Conta + 30 dias |

### 1.3. Registros técnicos

| Dado | Base legal | Retenção | Norma |
|---|---|---|---|
| Registro de acesso a aplicação (IP, data/hora) | II — obrigação legal | **6 meses** | Marco Civil art. 15 |
| Log de auditoria (transições de status) | V + defesa em processo | 5 anos | — |
| Aceite eletrônico (IP, timestamp, versão, hash) | V + defesa em processo | 5 anos após término | MP 2.200-2/2001 |

---

## 2. Dados sob controle da EMPRESA (somos operadores)

> ⚠️ Requisições de titular destes dados vão para a **empresa anunciante**. Nós apenas encaminhamos e fornecemos a ferramenta. Ver `juridico/05-anexo-dpa.md`.

### 2.1. Lead indicado

| Campo | Dado pessoal? | Base legal | Definida por | Retenção |
|---|---|---|---|---|
| `empresa_nome`, `cnpj` | ❌ | — | — | Definida pela controladora |
| `contato_nome` | ✅ | IX — legítimo interesse | **Empresa** (LIA do art. 10) | Definida pela controladora |
| `contato_cargo` | ✅ | IX | Empresa | — |
| `contato_email` | ✅ | IX | Empresa | — |
| `contato_telefone` | ✅ | IX | Empresa | — |
| `origem_do_dado` | — | — | — | Obrigatório para sustentar o legítimo interesse |
| `observacoes` | ⚠️ risco | IX | Empresa | **Exige aviso na interface: não inserir dado sensível** |

> ⛔ **Proibido:** dado sensível (art. 5º, II), dado de menor de 18 anos, dado obtido de lista comprada ou base vazada.

### 2.2. Peças da disputa (`disputas`)

Contestação de recusa ou de estorno — política 06 §7. Os campos são texto livre escrito pelas partes e citam, por natureza, o histórico do lead ("falei com o contato em 04/08"). Herdam a titularidade do §2.1: quem responde a requisição do lead continua sendo a **empresa**.

| Campo | Dado pessoal? | Base legal | Escrito por | Retenção |
|---|---|---|---|---|
| `motivo` | ⚠️ risco (texto livre) | V — execução de contrato + defesa em processo | Parceiro | 5 anos após a decisão |
| `resposta_empresa` | ⚠️ risco (texto livre) | V + defesa em processo | Empresa | 5 anos após a decisão |
| `decisao_fundamentacao` | ⚠️ risco (texto livre) | V + defesa em processo | Plataforma | 5 anos após a decisão |
| `aberta_por`, `respondida_por`, `decidida_por` | ✅ (identifica a pessoa que agiu) | V + defesa em processo | Sistema | 5 anos |
| `aberta_em`, `prazo_*`, `respondida_em`, `decidida_em` | ❌ | — | Sistema (trigger) | 5 anos |

> A retenção é maior que a do lead de propósito: a peça é prova do contraditório. Anonimizar o texto ao fim da retenção do lead esvaziaria a defesa das duas partes.
>
> Os três campos de texto livre exibem o aviso de "não inserir dado sensível", como o `observacoes` do §2.1.

---

## 3. Suboperadores

Mantenha em sincronia com `juridico/05-anexo-dpa.md` §5.2. Cada item aqui exige certificação prévia pelo `certificador-stack`.

| Serviço | Função | País dos dados | DPA? | Transferência internacional? | Certificado em |
|---|---|---|---|---|---|
| _(preencher)_ | | | | | |

---

## 4. Fluxos de dados

```
Parceiro registra indicação
   └─► dado pessoal do lead entra no sistema
        ├─► armazenado (Supabase)          [operador]
        ├─► visível SÓ para a empresa dona da campanha   ← RLS
        └─► NUNCA visível para outras empresas nem para outros parceiros

Comissão aprovada
   └─► dados de pagamento do parceiro visíveis à empresa   [execução de contrato]
        (a plataforma NÃO envia esses dados a nenhum
         processador — quem paga é a empresa, por meio próprio)

Fatura mensal da plataforma
   └─► dados da EMPRESA ao emissor de nota fiscal          [obrigação legal]
        (nenhum dado de parceiro ou de lead vai junto)

Titular pede exclusão de lead
   └─► encaminhar à empresa controladora + bloquear recontato na plataforma
```

---

## 5. Direitos do titular — como são atendidos

| Direito (art. 18) | Implementado? | Onde |
|---|---|---|
| Confirmação e acesso | ⬜ | |
| Correção | ⬜ | |
| Anonimização / bloqueio / eliminação | ⬜ | |
| Portabilidade | ⬜ | |
| Informação sobre compartilhamento | ⬜ | |
| Revogação de consentimento | ⬜ | |
| Oposição (legítimo interesse) | ⬜ | |
| **Revisão de decisão automatizada** (art. 20) | ⬜ | obrigatório se houver score/ranking afetando acesso a campanha |

---

## 6. Medidas de segurança (art. 46)

| Medida | Status |
|---|---|
| TLS 1.2+ em trânsito | ⬜ |
| Criptografia em repouso | ⬜ |
| Row Level Security por empresa | ⬜ |
| MFA obrigatório para admin | ⬜ |
| Log de auditoria imutável | ⬜ |
| Backup com restauração testada | ⬜ |
| Princípio do menor privilégio | ⬜ |
| Mascaramento de dado pessoal em log | ⬜ |
| Runbook de incidente (48h para avisar controladora) | ⬜ |
| **Storage privado para documentos de habilitação**, com log de todo acesso | ⬜ |
| **Job diário de vencimento de credencial** (bloqueio prospectivo + avisos D-30/D-7) | ⬜ |
