"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { criarCampanha } from "../actions";
import {
  ATIVIDADES,
  infoAtividade,
  MOTIVO_SEGMENTO_FECHADO,
  CONSELHO_LABEL,
  type Atividade,
} from "@/lib/domain/atividades";
import { PRAZOS } from "@/lib/domain/indicacoes";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export function CampanhaForm({ kybAprovado }: { kybAprovado: boolean }) {
  const router = useRouter();
  const [atividade, setAtividade] = useState<Atividade>("indicacao_software");
  const [state, formAction, pending] = useActionState(criarCampanha, undefined);

  useEffect(() => {
    if (state?.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const info = infoAtividade(atividade);
  const fechado = info.regime === "fechado";
  const exigeTerritorio = info.regime === "habilitacao" && info.conselho === "creci";

  return (
    <form action={formAction} className="space-y-8">
      <Secao titulo="O que é a campanha">
        <Texto id="titulo" label="Título" required placeholder="Sistema de pedidos para restaurantes" />
        <Texto id="produto" label="Produto ou serviço" required placeholder="PedidoX — SaaS de gestão de pedidos" />
        <Texto id="segmentoMercado" label="Segmento de mercado" required placeholder="SaaS, ERP, Contabilidade, Agência..." />
        <Area id="descricao" label="Descrição" opcional placeholder="O que o parceiro precisa saber para apresentar bem o produto." />
      </Secao>

      <Secao
        titulo="O que o parceiro faz"
        ajuda="Classifique a ATIVIDADE DO PARCEIRO, não o setor do seu cliente. Software para corretoras é indicação de software — não é campanha de seguros."
      >
        <div>
          <label className="text-sm text-muted block mb-1.5" htmlFor="atividadeParceiro">
            Atividade
          </label>
          <select
            id="atividadeParceiro"
            name="atividadeParceiro"
            value={atividade}
            onChange={(e) => setAtividade(e.target.value as Atividade)}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          >
            {ATIVIDADES.map((a) => (
              <option key={a} value={a}>
                {infoAtividade(a).label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1.5">{info.descricao}</p>
        </div>

        {fechado && (
          <div className="rounded-lg border border-erro/40 bg-erro/5 p-4">
            <p className="text-sm font-medium text-erro">Segmento fechado — não é possível publicar</p>
            <p className="text-sm text-muted mt-2">{MOTIVO_SEGMENTO_FECHADO[atividade]}</p>
          </div>
        )}

        {info.regime === "habilitacao" && (
          <div className="rounded-lg border border-espera/40 bg-espera/5 p-4">
            <p className="text-sm font-medium text-espera">
              Segmento regulado — abre por credencial {info.conselho ? CONSELHO_LABEL[info.conselho] : ""}
            </p>
            <p className="text-sm text-muted mt-2">
              Só parceiros com a credencial <strong>aprovada e dentro da validade</strong>{" "}
              conseguirão registrar indicação. O bloqueio é do servidor, não da interface.
            </p>
          </div>
        )}

        {exigeTerritorio && (
          <div>
            <label className="text-sm text-muted block mb-2">
              UFs de atuação <span className="text-xs">(obrigatório para CRECI)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {UFS.map((uf) => (
                <label
                  key={uf}
                  className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:border-gold/40 has-checked:border-gold/60 has-checked:text-gold-soft has-checked:bg-gold/10"
                >
                  <input type="checkbox" name="territorioUfs" value={uf} className="sr-only" />
                  {uf}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              A inscrição do parceiro é cruzada com estas UFs — o CRECI é estadual.
            </p>
          </div>
        )}
      </Secao>

      <Secao titulo="Comissão">
        <div className="grid sm:grid-cols-2 gap-5">
          <Texto id="comissao" label="Comissão por indicação aprovada" required placeholder="300,00" inputMode="decimal" />
          <Texto id="ticket" label="Ticket do produto" opcional placeholder="129,00" inputMode="decimal" />
        </div>
        <label className="flex gap-3 text-sm text-muted cursor-pointer">
          <input type="checkbox" name="comissaoRecorrente" className="mt-1 shrink-0" />
          <span>
            Comissão recorrente (mensal enquanto o cliente permanecer ativo). O cancelamento do
            cliente interrompe as parcelas futuras, mas não gera devolução das já pagas.
          </span>
        </label>
        <Texto id="comissaoObservacao" label="Observação sobre a comissão" opcional placeholder="Ex.: paga na confirmação do primeiro pagamento do cliente" />
        <p className="text-xs text-muted">
          O parceiro recebe este valor integralmente. A taxa da plataforma é cobrada de você, em
          fatura separada — ela não reduz o valor dele.
        </p>
      </Secao>

      <Secao
        titulo="Público e resultado"
        ajuda="O resultado útil é o critério que gera comissão. Você não poderá recusar uma indicação por critério diferente do que publicar aqui."
      >
        <Area id="publicoAlvo" label="Público-alvo" required placeholder="Restaurantes e lanchonetes com 2 a 20 funcionários" />
        <Area id="resultadoUtil" label="O que conta como resultado útil" required placeholder="Cliente contrata plano pago e permanece ativo por 30 dias." />
      </Secao>

      <Secao
        titulo="Prazos"
        ajuda="Limites da política de comissionamento. Vencido o prazo de análise sem sua manifestação, a indicação é aprovada automaticamente e gera comissão e taxa."
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <Prazo id="prazoAnaliseDias" chave="analise" />
          <Prazo id="prazoPagamentoDias" chave="pagamento" />
          <Prazo id="janelaAtribuicaoDias" chave="atribuicao" />
          <Prazo id="janelaEstornoDias" chave="estorno" />
        </div>
      </Secao>

      <div className="border-t border-border/60 pt-6 space-y-4">
        <label className="flex gap-3 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            name="publicar"
            disabled={fechado || !kybAprovado}
            className="mt-1 shrink-0"
          />
          <span>
            Publicar imediatamente
            {!kybAprovado && (
              <span className="block text-xs text-espera mt-0.5">
                Indisponível: a verificação da sua empresa ainda não foi aprovada. Você pode salvar
                como rascunho.
              </span>
            )}
          </span>
        </label>

        {state?.error && (
          <p className="text-sm text-erro border border-erro/30 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || fechado || !!state?.redirectTo}
          className="rounded-md bg-gold text-background font-medium px-5 py-2.5 hover:bg-gold-soft transition-colors disabled:opacity-50 cursor-pointer"
        >
          {pending || state?.redirectTo ? "Salvando..." : "Salvar campanha"}
        </button>
      </div>
    </form>
  );
}

function Secao({
  titulo,
  ajuda,
  children,
}: {
  titulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-medium">{titulo}</h2>
        {ajuda && <p className="text-sm text-muted mt-1">{ajuda}</p>}
      </div>
      {children}
    </section>
  );
}

function Texto({
  id,
  label,
  required,
  opcional,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  required?: boolean;
  opcional?: boolean;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <div>
      <label className="text-sm text-muted block mb-1.5" htmlFor={id}>
        {label}
        {opcional && <span className="text-xs"> (opcional)</span>}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
    </div>
  );
}

function Area({
  id,
  label,
  required,
  opcional,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  opcional?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-muted block mb-1.5" htmlFor={id}>
        {label}
        {opcional && <span className="text-xs"> (opcional)</span>}
      </label>
      <textarea
        id={id}
        name={id}
        rows={3}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
    </div>
  );
}

function Prazo({ id, chave }: { id: string; chave: keyof typeof PRAZOS }) {
  const p = PRAZOS[chave];
  return (
    <div>
      <label className="text-sm text-muted block mb-1.5" htmlFor={id}>
        {p.label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        defaultValue={p.padrao}
        min={p.min}
        max={p.max}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
      <p className="text-xs text-muted mt-1.5">
        entre {p.min} e {p.max} dias · padrão {p.padrao}
      </p>
    </div>
  );
}
