# CONTRATO DE MEDIAÇÃO DE NEGÓCIOS — CAMPANHA

**Gerado automaticamente pela plataforma Verita Select no momento da adesão**

Versão do modelo: 1.0

> 🚧 **RASCUNHO NÃO REVISADO POR ADVOGADO.** Não publicar nem coletar aceite antes de revisão profissional.
>
> 🔧 **Nota técnica:** os campos entre `{{chaves}}` são preenchidos automaticamente pelo sistema a partir dos dados da campanha e das partes. O documento renderizado é congelado, hasheado e armazenado no momento do aceite.

---

## QUALIFICAÇÃO DAS PARTES

**CONTRATANTE:** `{{empresa.razao_social}}`, CNPJ `{{empresa.cnpj}}`, com sede em `{{empresa.endereco}}`, neste ato representada na forma de seus atos constitutivos.

**MEDIADOR:** `{{parceiro.nome}}`, `{{parceiro.tipo_pessoa}}`, inscrito no `{{parceiro.documento_tipo}}` sob nº `{{parceiro.documento}}`, com endereço em `{{parceiro.endereco}}`.

**INTERVENIENTE TECNOLÓGICA (não parte contratante):** `{{plataforma.razao_social}}`, CNPJ `{{plataforma.cnpj}}`, que atua exclusivamente como provedora do ambiente digital em que este contrato é celebrado, registrado e executado.

---

## CLÁUSULA 1 — DO OBJETO

**1.1.** O presente contrato tem por objeto a **mediação de negócios**, nos termos dos arts. 722 a 729 do Código Civil, pela qual o MEDIADOR se obriga a aproximar da CONTRATANTE potenciais clientes interessados no produto ou serviço objeto da campanha abaixo identificada.

**1.2. IDENTIFICAÇÃO DA CAMPANHA**

| Campo | Conteúdo |
|---|---|
| Nome da campanha | `{{campanha.nome}}` |
| Produto ou serviço | `{{campanha.produto}}` |
| Segmento | `{{campanha.segmento}}` |
| Público-alvo | `{{campanha.publico_alvo}}` |
| Ticket médio informado | `{{campanha.ticket_medio}}` |
| Território | `{{campanha.territorio}}` |
| Data de início | `{{campanha.data_inicio}}` |
| Vigência | `{{campanha.vigencia}}` |

**1.3.** A atividade do MEDIADOR **limita-se à aproximação**. Não compreende: celebrar contratos em nome da CONTRATANTE, emitir propostas vinculantes, conceder descontos, receber valores de clientes ou representar a CONTRATANTE perante terceiros.

**1.4.** A decisão de contratar com o cliente indicado é **exclusiva e discricionária da CONTRATANTE**.

---

## CLÁUSULA 2 — DA NATUREZA DA RELAÇÃO

**2.1.** O MEDIADOR é **profissional autônomo**, sem subordinação, pessoalidade ou habitualidade em relação à CONTRATANTE, na forma do **art. 442-B da CLT**.

**2.2.** As partes declaram expressamente que este contrato **não gera vínculo empregatício**, societário, de representação comercial exclusiva ou de agência.

**2.3.** A CONTRATANTE **não poderá**, sob pena de infração contratual: exigir jornada, horário ou local de trabalho; impor meta individual com sanção; exigir exclusividade; aplicar penalidade disciplinar; ou apresentar o MEDIADOR como integrante de seu quadro de pessoal.

**2.4.** O MEDIADOR **não está sujeito a exclusividade** e pode manter contratos idênticos com outras empresas, inclusive concorrentes, observado o dever de sigilo da Cláusula 7.

**2.5.** Sendo o MEDIADOR pessoa jurídica, fica-lhe facultado executar a atividade por meio de seus sócios, empregados ou subcontratados, sem necessidade de anuência da CONTRATANTE.

---

## CLÁUSULA 3 — DO RESULTADO ÚTIL

**3.1.** Considera-se **resultado útil**, gerador do direito à remuneração:

> `{{campanha.definicao_resultado_util}}`
>
> *(Exemplos de preenchimento: "reunião realizada com decisor do lead indicado, com duração mínima de 20 minutos"; "cliente indicado que contrata plano pago e permanece ativo por 30 dias"; "proposta comercial aceita e assinada pelo cliente indicado")*

**3.2. REGISTRO E ATRIBUIÇÃO.** A indicação deve ser registrada na plataforma **antes** do primeiro contato do cliente com a CONTRATANTE. O registro gera comprovante com data, hora e identificação, que constitui prova da anterioridade.

**3.3. JANELA DE ATRIBUIÇÃO.** O MEDIADOR terá direito à comissão se o negócio for concluído em até **`{{campanha.janela_atribuicao}}` dias** contados do registro da indicação.

**3.4. LEAD PREEXISTENTE.** Não gera comissão a indicação de pessoa que já seja cliente da CONTRATANTE ou que já conste de seu funil comercial na data do registro. A CONTRATANTE que alegar preexistência deverá **comprová-la documentalmente**, com evidência anterior à data do registro.

**3.5. CONFLITO DE ATRIBUIÇÃO.** Havendo registro do mesmo lead por mais de um MEDIADOR, prevalece o **primeiro registro válido**, aferido pelo log da plataforma.

---

## CLÁUSULA 4 — DA REMUNERAÇÃO

**4.1. VALOR DA COMISSÃO**

| Campo | Conteúdo |
|---|---|
| Modalidade | `{{campanha.tipo_comissao}}` *(fixa / percentual / recorrente)* |
| Valor da comissão | `{{campanha.valor_comissao}}` |
| Recorrência | `{{campanha.recorrencia}}` |
| Dedução pela plataforma | **nenhuma** |
| **Valor líquido estimado ao MEDIADOR** | **`{{campanha.valor_liquido_estimado}}`** *(após retenções legais, quando aplicáveis)* |

**4.1-A. AUSÊNCIA DE DEDUÇÃO PELA PLATAFORMA.** O MEDIADOR recebe a comissão **integralmente**. A plataforma **não retém, não desconta e não participa** da remuneração do MEDIADOR. A taxa de intermediação da plataforma é cobrada **exclusivamente da CONTRATANTE**, em relação contratual distinta desta, e não reduz o valor devido ao MEDIADOR.

**4.2. RETENÇÕES TRIBUTÁRIAS.** Sendo o MEDIADOR **pessoa física**, a CONTRATANTE, na qualidade de **fonte pagadora**, efetuará as retenções legais aplicáveis — notadamente contribuição previdenciária e imposto de renda —, reduzindo o valor líquido. Sendo **pessoa jurídica**, o pagamento fica condicionado à emissão de nota fiscal de serviços.

**4.3. PRAZO DE APROVAÇÃO.** A CONTRATANTE terá **`{{campanha.prazo_aprovacao}}` dias** contados do registro da indicação para aprová-la ou recusá-la, com **justificativa objetiva**. O silêncio no prazo implica **aprovação tácita**.

**4.4. PRAZO E FORMA DE PAGAMENTO.** Aprovada a indicação, a CONTRATANTE pagará a comissão **diretamente ao MEDIADOR**, por meio próprio, em até **`{{campanha.prazo_pagamento}}` dias**. A plataforma **não intermedia, não custodia e não repassa** esses recursos; ela apenas registra o ciclo e o prazo.

**4.4-A. REGISTRO DA LIQUIDAÇÃO.** A CONTRATANTE registrará o pagamento na plataforma em até **2 (dois) dias úteis** de sua realização. O não registro no prazo faz presumir o inadimplemento e aciona as sanções do documento 06, §5.5, salvo comprovação em contrário.

**4.5. AUSÊNCIA DE DEL CREDERE.** O MEDIADOR **não responde** pela solvência, pelo adimplemento ou pela permanência do cliente indicado, ressalvada exclusivamente a hipótese de estorno da Cláusula 4.6.

**4.6. ESTORNO.** A comissão poderá ser estornada, integral ou proporcionalmente, se dentro de **`{{campanha.janela_estorno}}` dias** do pagamento ficar comprovado que: (a) o negócio foi cancelado por arrependimento ou inadimplência inicial do cliente; ou (b) a indicação foi fraudulenta, duplicada ou baseada em dados falsos.

**4.7.** A CONTRATANTE **não poderá** alterar o valor da comissão de indicações já registradas. Alterações valem apenas para registros futuros e devem ser comunicadas com **7 dias** de antecedência.

---

## CLÁUSULA 5 — DAS OBRIGAÇÕES DA CONTRATANTE

**5.1.** Disponibilizar material de apoio **correto, atualizado e completo**.

**5.2.** Analisar as indicações no prazo pactuado, com **critério objetivo e justificativa escrita** em caso de recusa.

**5.3.** Manter meio de pagamento válido para a liquidação das comissões.

**5.4.** Comunicar com antecedência a pausa ou o encerramento da campanha.

**5.5.** Não contatar diretamente o MEDIADOR fora da plataforma com o objetivo de contornar o registro de indicações ou o pagamento de comissões.

**5.6.** Responder pelas obrigações legais e regulatórias do produto ofertado, incluindo licenças e autorizações.

---

## CLÁUSULA 6 — DAS OBRIGAÇÕES DO MEDIADOR

**6.1.** Prestar informações **verdadeiras**, limitadas ao material oficial da campanha.

**6.2.** Identificar-se sempre como **parceiro comercial independente**.

**6.3.** Não prometer condições, preços, prazos ou garantias não autorizados.

**6.4.** Obter dados de contato por meios **lícitos**, observando a Lei nº 13.709/2018 e a política anti-spam da plataforma.

**6.5.** Registrar indicações **reais e verificáveis**, respondendo civil e criminalmente por registro fraudulento.

**6.6.** Não utilizar a marca da CONTRATANTE em anúncios pagos, domínios ou perfis sem autorização escrita.

---

## CLÁUSULA 7 — DA CONFIDENCIALIDADE

**7.1.** O MEDIADOR obriga-se a manter sigilo sobre informações confidenciais a que tiver acesso: tabelas de preço não públicas, materiais internos, estratégias, base de clientes e dados técnicos.

**7.2.** Não são confidenciais as informações públicas, as já conhecidas pelo MEDIADOR antes da campanha ou as reveladas por ordem judicial.

**7.3.** A violação sujeita o infrator às sanções da **Lei nº 9.279/1996, art. 195, XI** (crime de concorrência desleal), além da responsabilidade civil.

**7.4.** O dever de sigilo vigora durante a campanha e por **2 (dois) anos** após seu término.

**7.5.** Esta cláusula **não impede** o MEDIADOR de atuar em campanhas concorrentes, vedada apenas a transferência de informação confidencial entre elas.

---

## CLÁUSULA 8 — DOS DADOS PESSOAIS

**8.1.** Quanto aos dados dos potenciais clientes indicados, a **CONTRATANTE é CONTROLADORA** e a plataforma é **OPERADORA**, nos termos da Lei nº 13.709/2018.

**8.2.** A CONTRATANTE é responsável por definir e documentar a **base legal** do tratamento e por atender às requisições dos titulares.

**8.3.** O MEDIADOR responde pela **licitude da coleta** dos dados que registra, declarando não utilizar listas compradas, bases vazadas ou coleta automatizada indevida.

**8.4.** Recebida solicitação de exclusão ou oposição pelo titular, ambas as partes obrigam-se a cessar o tratamento para fins de prospecção e a comunicar a plataforma.

---

## CLÁUSULA 9 — DA VIGÊNCIA E RESCISÃO

**9.1.** Este contrato vigora enquanto durar a adesão do MEDIADOR à campanha.

**9.2.** Qualquer das partes pode rescindir **a qualquer tempo, sem aviso prévio, sem multa e sem indenização**, dada a natureza não exclusiva e não continuada da mediação.

**9.3. EFEITO DA RESCISÃO SOBRE INDICAÇÕES PENDENTES.** As indicações registradas antes da rescisão permanecem válidas e geram comissão se o negócio se concretizar dentro da janela de atribuição da Cláusula 3.3.

**9.4.** A rescisão não afeta as comissões já aprovadas, que permanecem exigíveis.

**9.5.** Sobrevivem à rescisão as Cláusulas 4.6 (estorno), 7 (confidencialidade), 8 (dados) e 10 (disputas).

---

## CLÁUSULA 10 — DAS DISPUTAS

**10.1.** Divergências sobre atribuição de indicação, aprovação ou pagamento de comissão serão submetidas ao procedimento da **Política de Comissionamento e Disputas** (documento 06), que integra este contrato.

**10.2.** A decisão da plataforma no procedimento interno tem natureza **administrativa e não vinculante**, não impedindo o acesso ao Poder Judiciário.

**10.3.** A plataforma **não é parte** deste contrato e não responde pelo seu cumprimento, cabendo-lhe apenas o registro, a guarda de provas e a mediação administrativa.

**10.4.** Fica eleito o foro da comarca de **`{{campanha.foro}}`** para dirimir controvérsias, ressalvadas as hipóteses de competência legal diversa.

---

## ACEITE ELETRÔNICO

As partes declaram que este instrumento foi celebrado por meio eletrônico, reconhecendo sua validade nos termos do **art. 10, §2º, da MP nº 2.200-2/2001** e da **Lei nº 14.063/2020**.

| Registro | CONTRATANTE | MEDIADOR |
|---|---|---|
| Identificação | `{{empresa.usuario_aceite}}` | `{{parceiro.usuario_aceite}}` |
| Data e hora | `{{empresa.timestamp}}` | `{{parceiro.timestamp}}` |
| Endereço IP | `{{empresa.ip}}` | `{{parceiro.ip}}` |
| Versão do documento | `{{contrato.versao}}` | `{{contrato.versao}}` |
| Hash SHA-256 | `{{contrato.hash}}` | `{{contrato.hash}}` |
