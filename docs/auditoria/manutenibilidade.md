# Auditoria — Manutenibilidade

Ver legenda e formato em [`README.md`](./README.md). Objetivo: reduzir o custo de mudança e o risco de regressão para o **próximo agente**.

---

## MNT-01 · 🟠 Médio · `view/ui-controller.js` é um "god module" (1.144 linhas)

- **Local:** `view/ui-controller.js` inteiro.
- **Evidência:** um único arquivo concentra: bootstrap (`init`), navegação, upload/preview/mapeamento de importação, busca direta, filtros em cascata, relatório, tabela investigativa, chips de filtro, drill-through, exportação XLSX e dois gráficos Chart.js. Há ~40 funções de nível de módulo.
- **Impacto:** difícil de navegar e revisar; alta chance de efeito colateral ao mudar qualquer fluxo; impossível testar unidades isoladas.
- **Correção recomendada:** dividir por responsabilidade, mantendo o estilo ES Modules atual (sem bundler). Sugestão de fatiamento (nomes ilustrativos):
  - `view/import-controller.js` — `bindUpload`, `handleImport`, `buildImportPreview`, `confirm*`.
  - `view/report-controller.js` — `runReport`, `applyTableView`, `renderTable`, chips, ordenação.
  - `view/drill-controller.js` — `renderDrillThrough`.
  - `view/charts.js` — `renderImportComparisonChart`, `renderTemporalAnalysis`, `buildTemporalSeries`, tema a11y.
  - `view/export-controller.js` — `exportReport`, `buildExportFilename`.
  - `ui-controller.js` vira o **orquestrador** que importa e liga os bindings no `init`.
  Fazer **um fluxo por commit** (extração mecânica, sem mudar comportamento), validando manualmente entre cada um.
- **Critério de aceite:** nenhum arquivo de `view/` acima de ~300 linhas; importação, auditoria, drill, export e gráficos funcionam idênticos ao comportamento atual.
- **Progresso (em andamento):**
  - [x] **Gráficos** (2026-07-17) — `view/ui-charts.js` (`createChartsController({ dom, state })`) reúne `renderImportComparisonChart`, `renderTopVariationsPanel`, `renderTemporalAnalysis`, `applyReportLayout`, `buildTemporalSeries`, `getTrendStatus`, `getReadableChartOptions` e o tema a11y. `ui-controller.js` só orquestra via `charts.*` em `runReport()`. Extração mecânica, sem mudança de comportamento; instâncias Chart.js seguem em `state.chart`/`state.trendChart` e o contrato temporal (`data_referencia` × `criado_em`) foi preservado. `ui-controller.js` caiu de ~1.333 para ~1.084 linhas.
  - [x] **Drill-through** (2026-07-17) — `view/ui-drill-through.js` (`createDrillThroughController({ dom })`) contém `renderDrillThrough`. Escolhido como 2ª fatia por ser folha de acoplamento zero (não chama nenhuma outra função do controller), maximizando baixo risco e coesão; `ui-controller.js` só chama `drillThrough.renderDrillThrough(codigo)` no clique da linha, sob a fronteira ERR-01. Extração verbatim, sem mudança de comportamento; contrato temporal preservado (rotula competência × importação por registro). `ui-controller.js` caiu de ~1.084 para ~1.020 linhas.
  - [x] **Importação** (2026-07-17) — `view/ui-import.js` (`createImportController({ dom, state, executeOperationalBoundary, fetchMetadata })`) reúne `bindUpload`, `handleImport`, `buildImportPreview`, `confirmImportPreview`, `confirmColumnMapping`, `buildMappingSelect`, `getFieldLabel` e a constante `IMPORT_PREVIEW_DISPLAY_LIMIT`. `ui-controller.js` só chama `importer.bindUpload()` no `init()`; a fronteira ERR-01 e `fetchMetadata` são injetadas para preservar comportamento idêntico. Extração verbatim; contratos VAL-01 (`normalizeCodigoProduto`) e temporal (`data_referencia` no payload × `criado_em` atribuído pela API) preservados. Maior fatia até aqui: `ui-controller.js` caiu de ~1.022 para ~754 linhas.
  - **Convenção firmada:** todo novo módulo de fluxo expõe `create<Fluxo>Controller(deps)` (ex.: `createChartsController`, `createDrillThroughController`, `createImportController`), mantendo identidade arquitetural única.
  - [ ] Filtros/relatório · [ ] Fila/tabela · [ ] Exportação.

---

## MNT-02 · 🟠 Médio · `src/services/api.js` mistura I/O, validação e regra (795 linhas)

- **Local:** `src/services/api.js`.
- **Evidência:** o arquivo contém acesso Supabase (`api.*`), normalização (`normalize*`, `roundTo4`), validação (`validateHistoricoRow`), enriquecimento de dimensão (`enrichRowsWithDicionario`), diagnóstico de órfãos e realtime.
- **Impacto:** a "camada única de acesso" virou camada de tudo; testar a validação exige carregar o cliente Supabase.
- **Correção recomendada:** separar em (mantendo `src/services/api.js` como fachada que reexporta, para não quebrar o shim `services/api.js`):
  - `src/services/supabase-client.js` — `createClient` + `TABLES`.
  - `src/services/validation.js` — `validateHistoricoRow`, `normalizeISODate`, `normalizeMoneyValue`, `roundTo4`.
  - `src/services/enrichment.js` — `enrichRowsWithDicionario`, `mapHierarchyRows`, cascata em memória.
  - `src/services/api.js` — só os métodos `api.*` orquestrando os acima.
- **Critério de aceite:** `validation.js` é importável e testável sem rede; `import { api } from '../src/services/api.js'` e o shim `services/api.js` continuam válidos.

---

## MNT-03 · 🟠 Médio · Duplicação de lógica de cascata e de `fillSelect`

- **Local:** filtros em memória duplicados — `applyCascadeFilterInMemory`/`normalizeCascadeFilters` em `src/services/api.js:43-60` versus `calculateCascadeOptions` em `core/report-engine.js:46-114`. Chamadas repetidas de `fillSelect` com a mesma estrutura em `view/ui-controller.js:59,72-89,378-385,449-460`.
- **Impacto:** mudança na regra de cascata precisa ser replicada em vários pontos; risco de divergência (já há leve divergência de nomenclatura `item` vs `produto`).
- **Correção recomendada:** uma única fonte de verdade para "dado o estado de filtros, quais opções/linhas valem". Extrair um helper `populateCascadeSelects(dom, state.masters, trigger)` que encapsule os `fillSelect` repetidos de `refreshCascade`/`fetchMetadata`/`jumpToProduct`.
- **Critério de aceite:** existe um único módulo de cascata; `refreshCascade`, `jumpToProduct` e `fetchMetadata` chamam o mesmo helper.

---

## MNT-06 · 🟠 Médio · Caminho de importação morto e divergente — ✅ Resolvido

**Resolução:** o fluxo vivo (`handleImport`/`buildImportPreview` em `view/ui-controller.js`) já normalizava `codigo_produto` via `normalizeCodigoProduto` (VAL-01) e já era o único caminho executado em produção — o caminho legado nunca foi incorporado a ele, apenas removido por ser órfão. `mapRowsToPayload`, `parseCurrency` e `normalizeReferenceDate` foram removidos de `core/spreadsheet-engine.js`; o teste correspondente em `tests/spreadsheet-engine.test.js` foi removido junto. Único gerador de payload de importação agora: `view/ui-controller.js`. `lint`/`typecheck`/`test` passam sem novos erros.


- **Local:** `core/spreadsheet-engine.js:224-311` — `mapRowsToPayload`, e suas dependências exclusivas `normalizeCodigoProduto` (137-147), `parseCurrency` (153-155) e `normalizeReferenceDate` (299-311).
- **Evidência:** `view/ui-controller.js:3` importa de `spreadsheet-engine` apenas `readWorkbook, scanHeaders, countValidMappedColumns, REQUIRED_FIELDS, parseBrazilianNumber, formatBrazilianFinancial`. **`mapRowsToPayload` não é importado em lugar nenhum** — a importação ativa monta o payload em `handleImport`/`buildImportPreview`. Ou seja, existem **dois** geradores de payload e o melhor deles (que trata notação científica, ver `VAL-01`) está morto.
- **Impacto:** confusão (qual é o caminho real?), e o caminho vivo é o **menos correto**.
- **Correção recomendada:** decidir e unificar. Recomendado: **incorporar a normalização de `mapRowsToPayload`** (especialmente `normalizeCodigoProduto`) ao fluxo ativo e então **remover** `mapRowsToPayload`/`parseCurrency`/`normalizeReferenceDate` se ficarem órfãos. Não manter os dois.
- **Critério de aceite:** existe um único caminho de geração de payload de importação; `VAL-01` resolvido como subproduto; sem exports não utilizados em `spreadsheet-engine.js`.

---

## MNT-04 · 🟡 Baixo · Código morto / não integrado

- **Locais:**
  - `core/heuristic-engine.js` — módulo de sugestão de categoria; o próprio `AGENTS.md:147` admite "não conectado ao fluxo principal ainda". `api.suggestCategory` (`src/services/api.js:612-635`) parece existir só para ele.
  - `api.getTrendsByProduct` (`src/services/api.js:694-706`) — janela fixa de 6 meses; a análise temporal usa o `data` já carregado em `renderTemporalAnalysis`, não este método. **Verificar** uso real antes de remover.
  - `api.upsertHistoricoCustos` (`src/services/api.js:419-442`) — a importação usa `importarHistoricoCustosComLog`. **Verificar** uso real.
- **Impacto:** superfície de código maior que a funcional; leitor não sabe o que é caminho real.
- **Correção recomendada:** decidir por módulo: **integrar** (ex.: roadmap de sugestão de categoria) ou **remover**. Se for manter para roadmap, marcar com comentário curto `// roadmap: <fase>` e listar em `ROADMAP.md`. Confirmar ausência de referências com busca antes de apagar.
- **Critério de aceite:** todo export tem ou um consumidor, ou uma marcação explícita de roadmap; nada ambíguo.

---

## MNT-05 · 🟡 Baixo · Sem tipos nem contratos de função documentados — ✅ Resolvido

**Resolução:** `src/services/api.js` ganhou `// @ts-check`, entrou no `include` de `jsconfig.json` e passou a importar `Masters`/`HistoricoRow`/`ReportRow` de `core/report-engine.js` via `@typedef {import(...)}`. Funções públicas centrais (`getMasters`, `getHistorico`, `getProductHistory`, `importarHistoricoCustosComLog`) documentadas com esses tipos. `createApiError` ganhou o typedef `ApiError` (Error + `details`). Restaurada a declaração de módulo do CDN do supabase-js em `types/globals.d.ts` (necessária para o typecheck de `api.js`).

Colocar `api.js` sob typecheck expôs e permitiu corrigir 2 bugs reais, sem mudar comportamento esperado:
1. `enrichRowsWithDicionario` tinha um caminho que retornava o array de linhas puro em vez de `{data, error}` quando nenhuma linha tinha `codigo_produto` normalizável — os dois chamadores (`getLatestImportComparison`, `getTopVariacoesImportacao`) desestruturam `{data, error}`, então nesse caso silenciosamente perdiam as linhas.
2. `getMasters` retornava `diagnostico_sem_mapa: []` (array) no caminho de erro do histórico, mas a UI (`view/ui-controller.js`) sempre espera o formato `{status, rows, error}` — corrigido para manter o mesmo formato em todos os caminhos.


- **Local:** todo o projeto (JS puro, sem JSDoc).
- **Evidência:** funções como `renderTable(rows, options)` ou `buildReportRows(historico, masters)` não documentam o shape de `rows`/`historico`. O shape real existe e é estável (ver `buildReportRows` em `core/report-engine.js:156-176` e `createInitialState` em `view/ui-state.js`).
- **Impacto:** o próximo agente precisa reler a implementação para inferir contratos; erros de tipo (ex.: `row.variacao` às vezes ausente) passam silenciosos.
- **Correção recomendada:** adicionar **JSDoc** nos contratos públicos dos módulos `core/` e `src/services/`, e habilitar `// @ts-check` (ver `CFG-02`). Documentar pelo menos: o objeto `masters`, a linha de `historico_custos` e a linha de relatório (`buildReportRows`).
- **Critério de aceite:** `core/report-engine.js` e `src/services/api.js` têm `@typedef` para `Masters`, `HistoricoRow` e `ReportRow`, e as funções públicas os referenciam.

---

## MNT-07 · 🟡 Baixo · "Magic numbers" sem origem documentada — ✅ Resolvido

**Resolução:** todos os limiares/tetos citados abaixo ganharam comentário de origem/propósito no próprio código e uma entrada em `docs/regras-negocio/glossario.md` ("Limiares e tetos (MNT-07)"). O `.limit(1000)` (agora `IMPORT_COMPARISON_LOOKBACK_LIMIT`) foi mantido no mesmo valor, mas com o risco de truncamento documentado explicitamente — a tabela `historico_custos` tinha 601 linhas em 2026-07-13, então não há risco imediato; se crescer perto do teto, o comentário no código já aponta a solução (consultar `criado_em` distinto no banco em vez de paginar por linha).


- **Locais:** `IMPORT_CHUNK_SIZE = 400` (`src/services/api.js:16`); limiares `LIMIAR_ALERTA_VARIACAO_PERCENTUAL=5`, `LIMIAR_ESTAVEL=3`, `LIMIAR_OSCILANDO=8`, `MIN_PONTOS_REGIME=4` (`core/report-engine.js:3-6`); `.slice(0, 20)` no preview (`view/ui-controller.js:247`); `.limit(1000)` nas comparações de importação (`src/services/api.js:646,747`).
- **Impacto:** os limiares são **regra de negócio** (definem o que é "alerta"/"instável") e estão sem rastreabilidade; o `.limit(1000)` é um teto silencioso que pode truncar a base de comparação em datasets grandes.
- **Correção recomendada:** comentar a **razão** de cada limiar (de onde veio a regra dos 5%/3/8) e centralizá-los; documentá-los no `docs/regras-negocio/glossario.md`. Reavaliar `.limit(1000)` (paginar ou justificar o teto).
- **Critério de aceite:** limiares e tetos têm comentário do "porquê" e constam do glossário; o teto de comparação tem justificativa ou paginação.
