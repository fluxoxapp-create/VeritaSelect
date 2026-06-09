"use client";

import { useActionState, useState, useMemo } from "react";
import { createRaffleDraft } from "./actions";

// Categories are loaded from DB and passed as props (see page.tsx)

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

// Quantities compatible with Loteria Federal: each is a power of 10 so
// the winning number maps directly to the last N digits of the lottery result.
// 100 → last 2 digits | 1.000 → last 3 | 10.000 → last 4 | 100.000 → last 5
const LOTTERY_COMPATIBLE = [100, 1_000, 10_000, 100_000] as const;
const LOTTERY_DIGITS: Record<number, number> = { 100: 2, 1000: 3, 10000: 4, 100000: 5 };

function getLotteryDigits(qty: number): number | null {
  return LOTTERY_DIGITS[qty] ?? null;
}

function parseBrl(value: string): number | null {
  const n = Number(value.replace(/\./g, "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function centsToReais(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function suggestPriceCents(targetRevenueCents: number, qty: number): number {
  if (qty <= 0) return 0;
  const raw = Math.ceil(targetRevenueCents / qty);
  const mod = raw % 100;
  // Round up to the nearest X.90 endpoint
  if (mod <= 90) return raw - mod + 90;
  return raw - mod + 190;
}

type Suggestion = { qty: number; priceCents: number; revenueCents: number; marginPct: number };

function buildSuggestions(prizeValueCents: number): Suggestion[] {
  const target = prizeValueCents * 1.20;
  return LOTTERY_COMPATIBLE.map((qty) => {
    const priceCents = suggestPriceCents(target, qty);
    const revenueCents = priceCents * qty;
    const marginPct = Math.round(((revenueCents - prizeValueCents) / prizeValueCents) * 100);
    return { qty, priceCents, revenueCents, marginPct };
  });
}

type FormState = { error?: string } | undefined;

export function NewRaffleForm({ categories }: { categories: { name: string; icon: string }[] }) {
  const [state, formAction, pending] = useActionState(createRaffleDraft, undefined as FormState);

  // --- form state for calculator + checklist ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [prizeValueRaw, setPrizeValueRaw] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryUf, setDeliveryUf] = useState("");
  const [totalCotasRaw, setTotalCotasRaw] = useState("");
  const [cotaPriceRaw, setCotaPriceRaw] = useState("");
  const [minGoalPct, setMinGoalPct] = useState(70);
  const [drawDate, setDrawDate] = useState("");
  const [drawMethod, setDrawMethod] = useState("loteria_federal");

  const prizeValueCents = useMemo(() => {
    const v = parseBrl(prizeValueRaw);
    return v ? Math.round(v * 100) : 0;
  }, [prizeValueRaw]);

  const totalCotas = useMemo(() => {
    const n = Number.parseInt(totalCotasRaw, 10);
    return Number.isInteger(n) && n > 0 ? n : 0;
  }, [totalCotasRaw]);

  const cotaPriceCents = useMemo(() => {
    const v = parseBrl(cotaPriceRaw);
    return v ? Math.round(v * 100) : 0;
  }, [cotaPriceRaw]);

  const expectedRevenueCents = totalCotas * cotaPriceCents;
  const marginCents = prizeValueCents > 0 ? expectedRevenueCents - prizeValueCents : null;
  const marginPct = marginCents !== null && prizeValueCents > 0
    ? Math.round((marginCents / prizeValueCents) * 100)
    : null;
  const minGoalCotas = Math.ceil(totalCotas * (minGoalPct / 100));

  const lotteryDigits = totalCotas > 0 ? getLotteryDigits(totalCotas) : null;
  const isLotteryCompatible = lotteryDigits !== null;

  const suggestions = useMemo(() => prizeValueCents > 0 ? buildSuggestions(prizeValueCents) : [], [prizeValueCents]);

  function applySuggestion(s: Suggestion) {
    setTotalCotasRaw(String(s.qty));
    setCotaPriceRaw((s.priceCents / 100).toFixed(2).replace(".", ","));
  }

  // --- checklist ---
  const checks = [
    { label: "Título da seleção", ok: title.trim().length >= 5 },
    { label: "Categoria", ok: category !== "" },
    { label: "Descrição do prêmio", ok: description.trim().length >= 30 },
    { label: "Valor de mercado do prêmio", ok: prizeValueCents > 0 },
    { label: "Cidade e UF de entrega", ok: deliveryCity.trim().length > 0 && deliveryUf !== "" },
    { label: "Quantidade de acessos", ok: totalCotas > 0 },
    {
      label: drawMethod === "loteria_federal"
        ? `Qtd. compatível com Loteria Federal${lotteryDigits ? ` (${lotteryDigits} dígitos)` : ""}`
        : "Quantidade de acessos definida",
      ok: drawMethod !== "loteria_federal" || isLotteryCompatible,
      warn: drawMethod === "loteria_federal" && totalCotas > 0 && !isLotteryCompatible,
    },
    { label: "Valor da cota", ok: cotaPriceCents > 0 },
    { label: "Receita cobre o valor do prêmio", ok: marginCents !== null && marginCents >= 0, warn: marginCents !== null && marginCents < 0 },
    { label: "Data de apuração", ok: drawDate !== "" },
    { label: "Fotos do prêmio", ok: false, pending: true },
    { label: "Documentação (NF / laudo)", ok: false, pending: true },
  ];
  const doneCount = checks.filter((c) => c.ok && !c.pending).length;
  const totalRequired = checks.filter((c) => !c.pending).length;

  const inputClass = "w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60 transition-colors";
  const labelClass = "text-sm text-muted block mb-1.5";
  const sectionClass = "border-t border-border/60 pt-7 space-y-5";
  const sectionTitle = "text-sm font-semibold uppercase tracking-widest text-muted mb-5";

  return (
    <div className="grid lg:grid-cols-3 gap-10 items-start">
      {/* ─── Form ─── */}
      <form action={formAction} className="lg:col-span-2 space-y-7">

        {/* hidden fields */}
        <input type="hidden" name="prizeValueCents" value={prizeValueCents} />
        <input type="hidden" name="minCotasGoal" value={minGoalCotas} />
        <input type="hidden" name="deliveryCity" value={deliveryCity} />
        <input type="hidden" name="deliveryUf" value={deliveryUf} />
        <input type="hidden" name="drawMethod" value={drawMethod} />

        {/* ── Seção 1: O prêmio ── */}
        <div className="space-y-5">
          <p className={sectionTitle}>1 · O prêmio</p>

          <div>
            <label className={labelClass}>Título da seleção</label>
            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: RAM 2500 Limited 0km"
              className={inputClass}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Categoria</label>
              <select
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>Selecione</option>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Valor de mercado do prêmio (R$)</label>
              <input
                type="text"
                name="prizeValueDisplay"
                inputMode="decimal"
                value={prizeValueRaw}
                onChange={(e) => setPrizeValueRaw(e.target.value)}
                placeholder="Ex.: 250.000,00"
                className={inputClass}
              />
              <p className="text-xs text-muted mt-1">Usado pela calculadora para sugerir o valor da cota</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrição do prêmio</label>
            <textarea
              name="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ano, condição, itens inclusos, procedência, documentação disponível..."
              className={inputClass + " resize-y"}
            />
            <p className="text-xs text-muted mt-1">{description.trim().length}/30 caracteres mínimos</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cidade de entrega do prêmio</label>
              <input
                type="text"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                placeholder="Ex.: São Paulo"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <select
                value={deliveryUf}
                onChange={(e) => setDeliveryUf(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Seção 2: Calculadora ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>2 · Acessos e precificação</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Quantidade de acessos</label>
              {/* Quick-select: only lottery-compatible quantities */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {LOTTERY_COMPATIBLE.map((qty) => {
                  const digits = LOTTERY_DIGITS[qty];
                  return (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setTotalCotasRaw(String(qty))}
                      className={`flex flex-col items-center py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                        totalCotas === qty
                          ? "border-gold bg-gold/10 text-gold-soft"
                          : "border-border text-muted hover:border-gold/40 hover:text-foreground"
                      }`}
                    >
                      <span className="font-medium">{qty >= 1000 ? `${qty / 1000}K` : qty}</span>
                      <span className="text-[10px] opacity-70">{digits} dígitos</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                name="totalCotas"
                required
                min={1}
                value={totalCotasRaw}
                onChange={(e) => setTotalCotasRaw(e.target.value)}
                placeholder="Ou digite outro valor"
                className={inputClass}
              />
              {totalCotas > 0 && !isLotteryCompatible && drawMethod === "loteria_federal" && (
                <p className="text-xs text-amber-400 mt-1.5">
                  ⚠ {totalCotas.toLocaleString("pt-BR")} não é compatível com a Loteria Federal. Use 100, 1.000, 10.000 ou 100.000.
                </p>
              )}
              {totalCotas > 0 && isLotteryCompatible && drawMethod === "loteria_federal" && (
                <p className="text-xs text-emerald-400 mt-1.5">
                  ✓ Compatível — usa os últimos {lotteryDigits} dígitos do resultado da Loteria Federal.
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Valor de cada acesso (R$)</label>
              <input
                type="text"
                name="cotaPrice"
                required
                inputMode="decimal"
                value={cotaPriceRaw}
                onChange={(e) => setCotaPriceRaw(e.target.value)}
                placeholder="Ex.: 29,90"
                className={inputClass}
              />
            </div>
          </div>

          {/* Calculator card */}
          {(totalCotas > 0 && cotaPriceCents > 0 || suggestions.length > 0) && (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
              {totalCotas > 0 && cotaPriceCents > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Receita esperada</span>
                    <span className="font-semibold">{centsToReais(expectedRevenueCents)}</span>
                  </div>
                  {prizeValueCents > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Cobre o prêmio?</span>
                        <span className={marginCents !== null && marginCents >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {marginCents !== null && marginCents >= 0 ? "✓ Sim" : "✗ Não"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Margem</span>
                        <span className={marginPct !== null && marginPct >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {marginCents !== null ? centsToReais(marginCents) : "—"}
                          {marginPct !== null && <span className="text-xs ml-1">({marginPct}%)</span>}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Sugestões compatíveis com a Loteria Federal — ~20% de margem</p>
                  <div className="space-y-2">
                    {suggestions.map((s) => {
                      const digits = LOTTERY_DIGITS[s.qty];
                      return (
                      <button
                        key={s.qty}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="w-full flex items-center justify-between rounded-md border border-border bg-surface-2 hover:border-gold/40 hover:bg-gold/5 px-4 py-2.5 text-sm transition-colors cursor-pointer group"
                      >
                        <span>
                          <span className="font-medium">{s.qty.toLocaleString("pt-BR")}</span>
                          <span className="text-muted"> acessos × </span>
                          <span className="font-medium text-gold-soft">{centsToReais(s.priceCents)}</span>
                          {digits && <span className="text-muted text-xs ml-2">({digits} dígitos)</span>}
                        </span>
                        <span className="text-muted text-xs">
                          = {centsToReais(s.revenueCents)} · <span className="text-emerald-400">+{s.marginPct}%</span>
                        </span>
                      </button>
                    );
                    })}
                  </div>
                  <p className="text-xs text-muted mt-2">Clique em uma sugestão para aplicar automaticamente</p>
                </div>
              )}
            </div>
          )}

          {/* Min goal slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + " mb-0"}>Meta mínima de vendas</label>
              <span className="text-sm font-medium text-gold-soft">{minGoalPct}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={minGoalPct}
              onChange={(e) => setMinGoalPct(Number(e.target.value))}
              className="w-full accent-[#c9a84c]"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>50% mínimo</span>
              {totalCotas > 0 && (
                <span>= <span className="text-foreground">{minGoalCotas.toLocaleString("pt-BR")}</span> acessos vendidos</span>
              )}
              <span>100%</span>
            </div>
            <p className="text-xs text-muted mt-1">Se a meta não for atingida na data de apuração, a seleção será cancelada e os compradores reembolsados</p>
          </div>
        </div>

        {/* ── Seção 3: Apuração ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>3 · Apuração</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data de apuração</label>
              <input
                type="date"
                name="drawDate"
                required
                value={drawDate}
                onChange={(e) => setDrawDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Método de apuração</label>
              <select
                value={drawMethod}
                onChange={(e) => setDrawMethod(e.target.value)}
                className={inputClass}
              >
                <option value="loteria_federal">Loteria Federal (Caixa)</option>
                <option value="live">Sorteio ao vivo</option>
              </select>
            </div>
          </div>

          {drawMethod === "loteria_federal" && (
            <div className="rounded-lg border border-border bg-surface-2 px-4 py-4 text-sm text-muted space-y-2">
              <p className="font-medium text-foreground">Como funciona a Loteria Federal</p>
              <p>O resultado da Loteria Federal tem 5 dígitos (ex: <span className="font-mono text-foreground">04821</span>). O número ganhador é formado pelos <strong className="text-foreground">últimos N dígitos</strong> conforme a quantidade de acessos:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {LOTTERY_COMPATIBLE.map((qty) => {
                  const d = LOTTERY_DIGITS[qty];
                  const example = "04821".slice(-d);
                  return (
                    <div key={qty} className={`rounded-md border px-3 py-2 text-center text-xs ${totalCotas === qty ? "border-gold/40 bg-gold/5 text-gold-soft" : "border-border"}`}>
                      <p className="font-medium text-foreground">{qty >= 1000 ? `${qty/1000}K` : qty} cotas</p>
                      <p className="text-muted mt-0.5">últimos {d} dígitos</p>
                      <p className="font-mono text-foreground mt-1">→ nº {example}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs">Se o número sorteado não tiver sido vendido, avança para o número imediatamente acima com compra confirmada.</p>
            </div>
          )}
          {drawMethod === "live" && (
            <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
              <p className="font-medium text-foreground">Sorteio ao vivo</p>
              <p>O sorteio é realizado ao vivo via transmissão gravada, com número sorteado aleatoriamente pelo sistema VeritaSelect na data e hora marcadas.</p>
            </div>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-400 border border-red-400/30 bg-red-400/5 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-8 py-3 rounded-md bg-gold text-background font-semibold hover:bg-gold-soft transition-colors disabled:opacity-60 cursor-pointer"
          >
            {pending ? "Salvando..." : "Salvar rascunho"}
          </button>
          <p className="text-xs text-muted mt-3">
            A seleção é salva como rascunho. Para publicar, envie para análise em &quot;Minhas seleções&quot; — nossa equipe revisará em até 24h.
          </p>
        </div>
      </form>

      {/* ─── Checklist sidebar ─── */}
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Checklist</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-2 border border-border">
              {doneCount}/{totalRequired}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-soft to-gold rounded-full transition-all duration-300"
              style={{ width: `${Math.round((doneCount / totalRequired) * 100)}%` }}
            />
          </div>

          <ul className="space-y-2.5">
            {checks.map((item) => (
              <li key={item.label} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`mt-0.5 shrink-0 text-base leading-none ${
                    item.pending
                      ? "text-muted"
                      : item.warn
                        ? "text-red-400"
                        : item.ok
                          ? "text-emerald-400"
                          : "text-muted"
                  }`}
                >
                  {item.pending ? "○" : item.warn ? "✗" : item.ok ? "✓" : "○"}
                </span>
                <span className={item.ok && !item.pending ? "text-foreground" : "text-muted"}>
                  {item.label}
                  {item.pending && <span className="ml-1 text-xs">(após salvar)</span>}
                  {item.warn && <span className="ml-1 text-xs text-red-400"> — receita insuficiente</span>}
                </span>
              </li>
            ))}
          </ul>

          {doneCount === totalRequired && (
            <div className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-400">
              Pronto para enviar para análise! Salve o rascunho e acesse &quot;Minhas seleções&quot;.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
