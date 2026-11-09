# OP × CUSTO — Fase 4C-1: leitura histórica multi-competência

**Estado:** implementada localmente em 09/11/2026; sem publicação, escrita remota ou avanço automático à Fase 4C-2.

## Entrega

`api.getOpCustoHistorico({ produto, inicioCompetencia, fimCompetencia })` consulta apenas `apontamentos_op` e `historico_custos`. A entrada exige produto canônico e intervalo explícito `AAAA-MM`. A resposta preserva eventos OP, snapshots de Custo, `data_referencia`, `criado_em`, valores nulos/zero, código original e `codigo_normalizado`; não chama engines, não enriquece classificação, não agrega e não calcula cobertura A/B/C.

O leitor reutiliza `lerCompleto`: `supabase.from()`, `select(..., { count: 'exact' })`, páginas de 500, filtros de produto/intervalo repetidos em cada página e ordem determinística. Cada fonte retorna `completa`, `completa_vazia` ou `erro`. Erro de página, contagem ou identidade técnica impede `qualidade.completa`; fatos concluídos da outra fonte permanecem identificados como contexto incompleto, sem classificação de ausência.

## Validação local

`tests/api-op-custo-historico.test.js` cobre entrada inválida sem I/O, uma e várias competências, fontes vazias, preservação integral de eventos/snapshots/datas/zeros/nulos, paginação acima de 500, falha de fonte, página curta, contagem divergente, IDs repetidos e diagnósticos de código inválido. Os contratos mensais OP × Custo e os leitores paginados legados são executados em conjunto.

## Limites

Não há UI histórica, motor de composição, A/B/C/D, comparação intercompetência, recorrência, agregação de OP, ponto representativo de custo, score conjunto, causalidade, exportação ou mudança em schema/RLS/Auth. A leitura é não transacional entre fontes. Dados e limites observados na Fase 4A são contexto histórico, não medições repetidas nesta implementação.
