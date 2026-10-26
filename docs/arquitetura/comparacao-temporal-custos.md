# Comparação temporal de Custos — LOG-03 / A360-CUS-04

Contrato local de **26/10/2026**. Implementado, sem publicação. Não altera LOG-01, prioridade, fila/TOP-200, exportação, drill-through, OP ou OP × CUSTO. LOG-02 (identidade de lote versus timestamp de chunk) continua pendente.

## Eixos e elegibilidade

`data_referencia` é competência operacional; `criado_em` é evento de importação/persistência. O recorte é aplicado por `data_referencia` **antes de escolher eventos**. Intervalo usa limites civis inclusivos; `competencias` conserva o conjunto explícito de datas selecionadas, com precedência sobre intervalo. Não preencher meses intermediários, não converter datas em dia 01 e não inferir mês anterior/seguinte.

`normalizeTemporalFilters` continua a normalização existente. `applyTemporalFilterToQuery` aplica o mesmo recorte na leitura paginada de `getHistorico` e no contexto privado `lerContextoComparacao`. Sem filtro temporal, a API mantém o universo integral; a UI fornece o recorte ativo.

Fluxo: `supabase.from(historico_custos).select(...,{count:'exact'})` → recorte em cada página → leitura integral ordenada por `criado_em DESC, id ASC` → enriquecimento analítico existente → cascata/produto → dois `criado_em` distintos mais recentes **desse universo**. A cascata também antecede a escolha, evitando selecionar um evento sem itens para o produto/família filtrados. Não se buscam timestamps globais para depois zerar seus dados no período.

A ordenação TIMESTAMPTZ é feita pelo banco, conservando microssegundos. ID desempata somente a paginação; não transforma dois fatos do mesmo timestamp em dois eventos. Datas originais são preservadas. Timestamps iguais formam um evento, inclusive com vários produtos/datas. Não se afirma que cada timestamp equivale a um lote lógico independente: essa é a limitação LOG-02.

## Leitura e integridade

Páginas de 500, count exact, ordem total; `lerCompleto` rejeita erro/rejeição, contagem ausente/divergente e página incompleta. O contexto de comparação também rejeita ID ausente/repetido e custo total ausente/não numérico. Falha de dimensão/catálogo é erro, sem fallback para conjunto vazio. Nenhum resultado parcialmente lido é liberado.

Uma leitura integral de fatos por método, sem consulta por produto. Depois dela, seleção e cálculos operam em memória. Enriquecimento reutiliza IN em blocos e catálogos paginados existentes. Não há RPC, SQL no frontend, novo acesso paralelo, writes ou alterações de schema/RLS/Auth. Não há snapshot transacional entre páginas; mutações concorrentes de mesma contagem que não repitam IDs continuam uma limitação do leitor existente.

## `getLatestImportComparison(filters)`

Envelope `{data,error}` preservado. Sucesso tem:

- `estadoComparacao`: `disponivel` com dois eventos; `insuficiente` com zero/um.
- `motivo`: null, `sem_eventos_no_recorte` ou `apenas_um_evento`.
- `totalEventosElegiveis`: quantidade de timestamps distintos no universo completo filtrado.
- `imports`: até dois eventos reais, mais recente primeiro, cada um com `criado_em`, `quantidade > 0` e `media` do custo total dos fatos daquele evento.
- `resumo`: null sem dois eventos; caso contrário, `delta_media`, `variacao_percentual_media` e `motivoPercentual`.

Sem evento: imports vazio/resumo null. Com um evento: o fato permanece em imports, resumo null; não fabricar um segundo evento. Ausência nunca vira média zero ou variação 0%.

Zero observado é válido. Se a média anterior é zero, o delta monetário continua calculável, mas o percentual é null, com `motivoPercentual:'base_anterior_zero'`. Nas demais bases, mantém-se a fórmula existente e o arredondamento de quatro casas. Médias representam a composição real de cada evento; não são uma cesta fixa de produtos nem prova causal de mudança de preço.

## `getTopVariacoesImportacao(filters)`

Mesmos eventos elegíveis e mesmo envelope. **Decisão humana nesta tarefa:** comparar cada **produto canônico + `data_referencia` completa** separadamente, alterando a granularidade anterior do TOP. Não agrupar pelo mês, somar custos ou escolher uma data vencedora.

Cada par exige um fato para essa mesma chave em cada um dos dois eventos selecionados. Mantém `novo`, `antigo`, código, descrição e percentual; acrescenta `data_referencia`, `id_atual` e `id_anterior`. Cada lado usa o `custo_total` do seu fato inteiro; não combinar componentes de snapshots diferentes. Duas linhas da mesma chave no mesmo evento são erro de ambiguidade, sem desempate arbitrário por ID.

Saída adicional: `paresComparaveis`, `semComparativo`, `totalEventosElegiveis`, `estadoComparacao` e `motivo`. Casos com um lado ausente ou base anterior zero ficam em `semComparativo` com valores/IDs ausentes null e motivos `par_ausente`/`base_anterior_zero`. Não recebem percentual zero. Sem dois eventos, motivo temporal correspondente; com dois eventos e nenhum par, `insuficiente/sem_pares_comparaveis`.

Pares válidos mantêm a fórmula percentual existente. Percentual zero real conta como par comparável, sem entrar em aumentos/reduções. Preserva cinco aumentos/cinco reduções; empates usam código e data completos para ordem determinística. Esses TOPs de cinco não são a fila investigativa TOP-200, que não foi alterada.

### Limitação de retenção atual

`historico_custos` tem `UNIQUE(codigo_produto,data_referencia)` e importação por upsert. Versões anteriores do mesmo par são sobrescritas. Sob essa restrição, normalmente não existem dois snapshots persistidos da mesma chave exata para compor o novo TOP; o resultado pode ser `sem_pares_comparaveis` mesmo com comparação agregada disponível. Datas distintas do mesmo mês não resolvem essa falta de par. Nenhum histórico foi fabricado, nenhuma persistência foi criada e nenhum schema foi alterado para contornar essa limitação. Reter versões requer decisão e tarefa próprias.

## Consumidores e apresentação

`view/ui-charts.js` exige disponibilidade explícita e dois eventos com quantidade positiva/média válida. Limpa o gráfico anterior antes da consulta; falha ou insuficiência não deixam números antigos apresentados como comparação atual. Zero real permanece no gráfico; percentual indefinido é descrito como indisponível no tooltip, sem `||0`.

TOP mostra código/descrição e a data completa de referência (DD/MM/AAAA), permitindo distinguir as chaves aprovadas; sem pares, o painel permanece oculto. Não altera estrutura de layout/CSS. O fallback já existente da série temporal passa a dizer “Base temporal insuficiente”, em vez de exibir estabilidade verde sem base. Cálculos da série por competência e seleção do snapshot mais recente continuam intactos.

KPIs/fila vêm de `buildReportRows`/`calculateKpis`, não destes retornos. `variacaoTemporal`, alerta ≥5%, ordenação investigativa, TOP-200, XLSX e drill-through preservam contratos anteriores. A alteração não cria comparação automática mês a mês nem score novo.

[Provas e limitações de validação](../auditoria/custos-comparacao-recorte-validacao.md). Referências do transporte: [filtros Supabase](https://supabase.com/docs/reference/javascript/filter) e [paginação range](https://supabase.com/docs/reference/javascript/range).
