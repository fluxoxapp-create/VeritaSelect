/**
 * Motivos do canal de denúncia. Lista fechada, compartilhada entre o
 * formulário e a validação de servidor — o formulário não é controle de
 * segurança, mas as duas pontas precisam falar da mesma lista.
 */
export const MOTIVOS_DENUNCIA = [
  "Campanha engana sobre a comissão ou o resultado útil",
  "Empresa tentou contato direto para burlar o registro",
  "Empresa exige jornada, meta ou exclusividade",
  "Recusa infundada reiterada",
  "Atraso ou não pagamento de comissão",
  "Suspeita de fraude",
  "Uso indevido de dados pessoais",
  "Outro",
] as const;

export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number];
