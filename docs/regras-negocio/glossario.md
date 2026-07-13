# Capítulo 18 — Glossário

- **Código de negócio**: identificador lógico (`codigo`) de categoria.
- **UUID técnico**: identificador interno (`id`) para FK.
- **Dicionário de produtos**: fonte operacional da hierarquia de filtros.
- **Histórico de custos**: fato temporal de custos por produto/data.
- **Cascata de filtros**: Origem → Família → Agrupamento → Produto.
- **Data de referência**: competência aplicada ao lote importado.

## Limiares e tetos (MNT-07)

- **Alerta crítico (>5%)** — `ALERTA_CRITICO_CONFIG.thresholdPercent` em `core/report-engine.js`: variação percentual mínima entre a última e a penúltima importação (`variacaoTemporal`, eixo `criado_em`) para marcar uma linha como alerta. Critério único de alerta no sistema (LOG-01).
- **Regime ESTÁVEL / OSCILANDO / MUITO INSTÁVEL** — `LIMIAR_ESTAVEL` (3) e `LIMIAR_OSCILANDO` (8) em `core/report-engine.js`: classificam a média histórica de variação percentual de um produto (`calcInstabilityScore`). Independentes do alerta crítico acima — um mede variação pontual entre 2 importações, o outro a média histórica.
- **Mínimo de pontos para mudança de regime** — `MIN_PONTOS_REGIME` (4) em `core/report-engine.js`: quantidade mínima de importações de um produto para comparar a 1ª metade do histórico com a 2ª e sinalizar `mudouRegime`.
- **Tamanho de lote de importação** — `IMPORT_CHUNK_SIZE` (400) em `src/services/api.js`: valor operacional (não regra de negócio) para o upsert em `historico_custos` em lotes.
- **Teto de comparação entre importações** — `IMPORT_COMPARISON_LOOKBACK_LIMIT` (1000) em `src/services/api.js`: quantidade de linhas (só `criado_em`) lidas para achar as 2 últimas importações distintas. Risco conhecido de truncamento se a tabela crescer muito com poucas importações recentes; ver comentário no código.
- **Limite de exibição do preview de importação** — `IMPORT_PREVIEW_DISPLAY_LIMIT` (20) em `view/ui-controller.js`: só limita quantas linhas aparecem na tabela do modal de preview; não afeta o que é validado/importado.
