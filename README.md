# Verita Select · DealBridge

Marketplace B2B que conecta empresas que querem vender a parceiros comerciais autônomos que indicam clientes.

A empresa publica uma campanha com a comissão que paga. O parceiro escolhe onde atuar, prospecta e registra a indicação. A empresa aprova. A comissão é paga **direto ao parceiro** — a plataforma não toca no dinheiro e cobra apenas da empresa, em fatura mensal.

> **veritaselect.com.br**

---

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

`http://localhost:3000`

| Script | O quê |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Banco

Migrations em `supabase/migrations/`, aplicadas em ordem. A `0021_dealbridge_core.sql` derruba o domínio anterior (sorteios) e cria o esquema do DealBridge; da `0022` em diante é histórico normal.

## Antes de escrever código

1. `AGENTS.md` — as seis linhas vermelhas jurídicas e as convenções técnicas que saem delas. Não são preferência de estilo.
2. `node_modules/next/dist/docs/` — este projeto roda Next.js 16, que quebra APIs que você provavelmente tem na memória.
3. `juridico/` e `docs/ROADMAP.md` — o que a plataforma pode e não pode fazer, e em que ordem.

## Status

**Fase 1 — Esqueleto.** A Fase 0 (CNPJ, revisão dos contratos por advogado, DPO indicado, faixas de taxa) segue aberta; os placeholders jurídicos aparecem marcados na interface de propósito.
