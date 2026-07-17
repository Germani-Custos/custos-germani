Você está trabalhando no projeto **Kustos Germani**, um motor de investigação operacional de custos.

O sistema NÃO é:

* ERP genérico
* CRUD administrativo
* dashboard decorativo
* réplica de Power BI ou Metabase

O sistema É:

* ferramenta de investigação operacional de custos
* camada analítica sobre dados ERP/SAP
* cockpit de auditoria investigativa
* motor de detecção de anomalias operacionais

---

# PRINCÍPIO MAIS IMPORTANTE

## Velocidade de investigação acima de tudo.

Toda mudança deve responder:

> "isso ajuda a encontrar problemas mais rápido?"

Se não ajudar: não implemente, simplifique ou remova.

---

# ARQUITETURA DE DADOS (NÃO VIOLAR)

## Separação FATO × DIMENSÃO é obrigatória

### Tabela fato:
* `historico_custos`

### Dimensões:
* `dicionario_produtos`
* `categorias_origem`
* `categorias_familia`
* `categorias_agrupamento`

NUNCA misturar lógica temporal com categorização.

---

# SEMÂNTICA TEMPORAL (CRÍTICO)

O sistema tem dois eixos de tempo. Nunca confundir:

| Campo | Significado | Uso |
|---|---|---|
| `data_referencia` | Competência operacional | Quando o custo é válido (mês de referência ERP) |
| `criado_em` | Evento de importação | Quando o dado entrou no sistema |

### Regras:
- `data_referencia` é usado para análise de período e drill-through temporal
- `criado_em` é usado para identificar "última importação" e "penúltima importação"
- A UI deve sempre rotular explicitamente qual eixo está sendo exibido
- Nunca exibir "Última Atualização" sem especificar se é competência ou importação

---

# REGRAS TÉCNICAS OBRIGATÓRIAS

* NÃO usar RPC
* NÃO executar SQL bruto no frontend
* Usar apenas `supabase.from()`
* Frontend exibe `descricao` (nunca UUID como semântica de negócio)
* Backend usa `codigo`/FK
* UUID é chave técnica, nunca semântica de negócio
* NÃO usar descrição textual para lógica de categorização
* NÃO armazenar credenciais em código-fonte

---

# IMPORTAÇÃO

A importação deve ser:

* resiliente
* tolerante a erros linha a linha
* tolerante a colunas extras
* validada antes de gravar
* registrada em `log_importacao`

Falha de linha NÃO deve derrubar lote inteiro.

Produto novo importado sem categoria deve ser sinalizado no banner de órfãos — não silenciado.

---

# UX INVESTIGATIVA

## Busca direta é prioridade

O investigador deve poder digitar um código de produto e chegar à análise sem navegar pela hierarquia Origem → Família → Agrupamento.

## Drill-through é obrigatório

Clicar em qualquer produto deve abrir o histórico completo de eventos de custo:
- competência de cada registro
- data de importação de cada registro
- delta monetário e percentual vs. registro anterior
- destaque visual para variações relevantes (≥5%)

## Detecção de mudança de regime

Produto que era ESTÁVEL e ficou instável = anomalia operacional prioritária.
Deve aparecer como KPI e como coluna na tabela.

## Filtros

Filtros devem:
* ser rápidos
* ser em cascata
* mostrar apenas dados reais existentes
* nunca mostrar null/undefined
* auto-atualizar o relatório ao mudar (sem necessidade de clicar "Analisar" após primeiro run)

---

# PERFORMANCE

Preferir:
* processamento local quando o dataset couber em memória razoavelmente
* datasets já carregados (evitar re-fetch do que já está em state)
* debounce em listeners de real-time (evitar loops de reload durante imports em lote)

Evitar:
* loops com múltiplas chamadas Supabase sequenciais por linha
* recálculo desnecessário em dados já processados
* renderizações excessivas de Chart.js (destruir e recriar apenas quando necessário)

---

# MÓDULOS DO SISTEMA

| Arquivo | Responsabilidade |
|---|---|
| `view/ui-controller.js` | Eventos de UI, orquestração de fluxos |
| `view/ui-charts.js` | Gráficos investigativos (comparação de importações, TOP variações, análise temporal) e layout condicional do relatório |
| `view/ui-drill-through.js` | Drill-through: histórico completo de importações de um produto (competência × importação, deltas por registro) |
| `view/ui-import.js` | Fluxo de importação: upload, mapeamento de colunas, preview validado linha a linha e gravação via API com log |
| `core/spreadsheet-engine.js` | Parsing de planilhas, detecção de colunas, normalização numérica |
| `core/report-engine.js` | Cálculos analíticos, cascata, detecção de regime |
| `src/services/api.js` | Camada única de acesso Supabase (I/O) |
| `services/api.js` | Shim de compatibilidade de import (re-exporta de src/services/api.js) |
| `core/heuristic-engine.js` | Módulo de sugestão de categoria (não conectado ao fluxo principal ainda) |

---

# DIREÇÃO DO PRODUTO

O sistema deve evoluir para:
* motor de investigação operacional
* detecção automática de anomalias
* priorização de risco por produto
* análise comportamental temporal

E NÃO para:
* ERP administrativo
* sistema burocrático
* CRUD complexo

---

# DOCUMENTAÇÃO

## SEMPRE consultar ANTES de mudar

Antes de qualquer alteração, leia a documentação relevante: este `AGENTS.md`, `docs/regras-gerais.md`, os manuais em `docs/manuais/` e a auditoria em `docs/auditoria/` (para saber se o ponto já tem fragilidade mapeada).

## SEMPRE atualizar DEPOIS de mudar (no mesmo PR/commit)

* `README.md`
* `VISION.md`
* `ROADMAP.md`
* `AGENTS.md` (este arquivo — registre entrada datada no log abaixo)
* `docs/manuais/` (usuário/técnico/operação) sempre que o comportamento visível ou operacional mudar
* `docs/auditoria/backlog-priorizado.md` — marque o item resolvido e referencie o ID no commit
* `docs/` conforme aplicável

Toda mudança de comportamento temporal, de filtro ou de modelo de dados DEVE ser documentada com a distinção `data_referencia` vs. `criado_em`.

Documentação desatualizada é tratada como defeito. Detalhes do processo: `docs/regras-gerais.md`.

- Atualização 2026-05-11: credenciais Supabase devem entrar via config de ambiente/runtime; `autoAuthenticate` está proibido.


- Atualização 2026-05-11: importações devem priorizar bulk upsert com chunking (faixa alvo 300-500) e consultas temporais sempre com ORDER BY explícito.

- Atualização 2026-05-14: a tabela principal da auditoria deve operar como fila investigativa (não planilha), com header sticky, chips removíveis de filtros ativos e contexto pré-interpretado por linha para reduzir carga cognitiva.

- Atualização 2026-05-14: frontend deve usar `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_VERBOSE_LOGS`) sem dependência de `globalThis`/`runtime-config.js`.


- Atualização 2026-05-14 (compatibilidade runtime): frontend deve priorizar `import.meta.env`, mas com fallback seguro para `window.__ENV__` quando o deploy não expuser `import.meta.env`; manter validação obrigatória de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.


- Atualização 2026-05-14 (diagnóstico runtime híbrido): bootstrap frontend deve testar `import.meta.env` → `window.__ENV__/window.__RUNTIME_CONFIG__` → `<meta name="VITE_*">` e expor diagnóstico de fonte avaliada ao falhar validação obrigatória.


- Atualização 2026-05-14 (runtime real de deploy estático): priorizar `runtime-config.js` (`window.__ENV__`) como fonte principal no browser; manter fallback de compatibilidade para `window.__RUNTIME_CONFIG__`, `import.meta.env` e `<meta name="VITE_*">`, com validação obrigatória de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.


- Atualização 2026-05-14 (geração de config em deploy): em Vercel, `runtime-config.js` deve ser gerado no build via `scripts/generate-runtime-config.mjs` (não editado manualmente), com falha obrigatória quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estiverem ausentes.


- Atualização 2026-05-21 (export investigativo): exportação XLSX deve gerar relatório operacional com duas abas (`Contexto` e `Fila Investigativa`), ordenação automática por criticidade/regime/magnitude/reincidência/instabilidade (quando não houver ordenação manual ativa), contexto automático por linha e nome de arquivo com período analisado.

- Atualização 2026-05-25 (auditoria de contratos): manter matriz viva em `docs/arquitetura/matriz-contratos-operacionais.md`; toda chamada UI→API deve estar listada, métodos de comparação de importação devem enriquecer dimensão antes da cascata, e métodos de drill-through devem falhar explicitamente quando parâmetros obrigatórios estiverem ausentes.

- Atualização 2026-05-25 (saneamento operacional de schema): migração base em `sql/2026-05-25_saneamento_operacional_schema.sql` para alinhar colunas de custo, garantir `unique_produto_data`, reforçar índices investigativos e tratar órfãos via fallback explícito `SEM_AGRUPAMENTO` + `vw_produtos_orfaos_agrupamento`.

- Atualização 2026-05-25 (auditoria técnica + manuais): publicada auditoria técnica acionável em `docs/auditoria/` (segurança, robustez, manutenibilidade, performance, tooling + `backlog-priorizado.md`) para execução por agente de desenvolvimento; criados os manuais em `docs/manuais/` (usuário/técnico/operação) e as regras gerais em `docs/regras-gerais.md`. Achado crítico registrado: XSS real em `fillSelect` (`core/report-engine.js`) — ver `SEC-01`. A tela de Documentação editável (consulta/edição dos manuais com commit via Serverless Function) fica como Fase 2.

- Atualização 2026-05-25 (tela de documentação — Fase 2): nova view "Documentação" (`view/documentation-controller.js`, ligada no `init` de `ui-controller.js`, refs em `ui-dom.js`, markup em `index.html`) para consultar/editar `docs/manuais/*.md` e `docs/regras-gerais.md`. Render via `marked` + `DOMPurify` (sanitizado) e gravação por commit no GitHub via Serverless Function `api/save-doc.js` (env: `GITHUB_TOKEN`/`GITHUB_REPO`/`GITHUB_BRANCH`). Edição pública com allowlist de caminho + limite de 200 KB; o repositório segue sendo a fonte única. Render do markdown e fluxo de save exigem verificação em preview da Vercel (CDN/Function/token).

- Atualização 2026-05-25 (documentação na tela — auditoria): a view "Documentação" passou a incluir também os docs de `docs/auditoria/*.md` (seletor agrupado em Manuais / Regras / Auditoria técnica); allowlist da Function `api/save-doc.js` estendida para `docs/auditoria/*.md` (aceita `README.md`).

- Atualização 2026-05-28 (ERR-01): `view/ui-controller.js` deve manter fronteiras operacionais explícitas para `init()`, `runReport()` e handlers assíncronos críticos; erros devem ser normalizados com `{ message, technical, timestamp, operation }`, exibidos ao usuário sem quebrar o contexto atual e registrados apenas via `debugLog` quando `VITE_ENABLE_VERBOSE_LOGS=true`.

- Atualização 2026-05-28 (VAL-01): `normalizeCodigoProduto()` em `core/spreadsheet-engine.js` é a normalização canônica de `codigo_produto`; fluxos de preview, payload, API, dicionário, cascata, relatório, drill-through e exportação derivada devem reutilizá-la, bloquear linha inválida/ambígua e registrar apenas amostras via `debugLog` quando `VITE_ENABLE_VERBOSE_LOGS=true`.


- Atualização 2026-05-28 (LOG-01): `classifyAlert()`/`isAlertaCritico()` em `core/report-engine.js` é a fonte canônica do KPI **Alertas (>5%)**; UI, filtros rápidos, tabela, drill-through, ranking/reincidência e exportação devem reutilizar o helper/`filterAlertRows()`, considerando `abs(variacaoTemporal) >= 5` no eixo `criado_em` sem arredondamento prévio; `data_referencia` permanece como recorte de competência.

- Atualização 2026-06-15 (diagnóstico de órfãos): `runDiagnosticoSemAgrupamento` deve tolerar divergência de schema em `categorias_agrupamento` via `supabase.from().select('*')` + resolução canônica de chave (`codigo`/`id`/`cod`) e retornar estado explícito `indisponivel` em falha operacional; a UI deve mostrar "Não foi possível validar produtos sem agrupamento." e nunca tratar falha como zero órfãos.

- Atualização 2026-06-25 (Onda 2 — tooling): adicionada rede de segurança de desenvolvimento sem impacto em runtime/CDN: `package.json` apenas com devDependencies/scripts, ESLint flat config com bloqueio de `innerHTML` interpolado, `jsconfig.json` + `// @ts-check`/JSDoc inicial em `core/`, Vitest com regressões VAL-01/LOG-01 e CI GitHub Actions para lint/typecheck/test em PRs.

- Atualização 2026-06-29 (CI Onda 2): `eslint` deve permanecer explicitamente em `devDependencies`; `@eslint/js` não fornece o binário do CLI. Validações de tooling devem reproduzir a Actions com ambiente limpo (`rm -rf node_modules && npm ci`) para evitar falso positivo por binários globais no `PATH`.
- Atualização 2026-07-02 (reavaliação do backlog): `docs/auditoria/backlog-priorizado.md` foi reordenado arquiteturalmente após Onda 2/CI; `MNT-01` passa a ser fatiamento destravador antes de `PERF-01`, `MNT-03`, `SEC-02` e parte de `PERF-02`/`VAL-02`, com preparação prévia por `MNT-06`, `MNT-07` e `MNT-05`.

- Atualização 2026-07-17 (MNT-01 — 1ª fatia: gráficos): fluxo de gráficos extraído de `view/ui-controller.js` para `view/ui-charts.js` (`createChartsController({ dom, state })`), sem alteração de comportamento. `ui-controller.js` segue como orquestrador e apenas chama `charts.renderImportComparisonChart`, `charts.renderTopVariationsPanel`, `charts.renderTemporalAnalysis` e `charts.applyReportLayout` dentro de `runReport()`, sob as mesmas fronteiras ERR-01. Instâncias Chart.js permanecem em `state.chart`/`state.trendChart`; contrato temporal preservado (série agrupa por `data_referencia` e desempata a última importação por `criado_em`). `MNT-01` permanece aberto (fatias restantes: importação, filtros/relatório, fila/tabela, drill-through, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (MNT-01 — 2ª fatia: drill-through): fluxo de drill-through extraído de `view/ui-controller.js` para `view/ui-drill-through.js` (`createDrillThroughController({ dom })`), seguindo o mesmo padrão de fábrica de `ui-charts.js`. `ui-controller.js` só chama `drillThrough.renderDrillThrough(codigo)` no clique da linha da fila investigativa, sob a fronteira ERR-01 existente. Escolhido por ser folha de acoplamento zero (não chama nenhuma outra função do controller). Contrato temporal preservado: o painel rotula competência (`data_referencia`) e importação (`criado_em`) por registro; regra de alerta segue via `isAlertaCritico`. Convenção arquitetural firmada: todo novo módulo de fluxo da UI expõe `create<Fluxo>Controller(deps)`. `MNT-01` permanece aberto (fatias restantes: importação, filtros/relatório, fila/tabela, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (MNT-01 — 3ª fatia: importação): fluxo de importação extraído de `view/ui-controller.js` para `view/ui-import.js` (`createImportController({ dom, state, executeOperationalBoundary, fetchMetadata })`). Move `bindUpload`, `handleImport`, `buildImportPreview`, `confirmImportPreview`, `confirmColumnMapping`, `buildMappingSelect`, `getFieldLabel` e a constante `IMPORT_PREVIEW_DISPLAY_LIMIT` (MNT-07). `ui-controller.js` só chama `importer.bindUpload()` no `init()`. A fronteira ERR-01 (`executeOperationalBoundary`) e o refresh de filtros (`fetchMetadata`) são injetados para preservar comportamento idêntico. Contratos preservados: `normalizeCodigoProduto` (VAL-01) como normalização canônica; `data_referencia` (competência) do seletor acompanha o payload e `criado_em` (importação) é atribuído pela API; importação tolerante linha a linha. `ui-controller.js` caiu de ~1.022 para ~754 linhas. `MNT-01` permanece aberto (fatias restantes: filtros/relatório, fila/tabela, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (correção de erro silencioso — delta monetário): `buildReportRows` (`core/report-engine.js`) passou a derivar `diferenca` (coluna "Δ vs anterior" e "Delta monetário última importação" na exportação) com gate em `penultimo`, não em `ultimo`. Antes, produto com uma única importação (existe em só uma competência do recorte) exibia o custo total inteiro como se fosse o delta, enquanto `variacaoTemporal` já era `null` — inconsistência silenciosa (sem erro) na fila investigativa e no XLSX. Agora ambos são `null` sem penúltima importação, preservando a distinção `data_referencia` × `criado_em` (o eixo comparado continua sendo `criado_em`). Regressão coberta em `tests/report-engine.test.js`.

- Atualização 2026-07-17 (dívida arquitetural conhecida — LOG-02): registrada, **sem alteração de comportamento**, a limitação de que a "comparação entre importações" (`getLatestImportComparison`/`getTopVariacoesImportacao` em `src/services/api.js`) pode comparar **dois chunks da mesma importação** em vez de duas importações reais. Causa: o upsert grava em chunks de `IMPORT_CHUNK_SIZE` (400) e cada chunk recebe um `criado_em` distinto, quebrando a premissa "1 importação = 1 `criado_em`". Erro silencioso (números plausíveis, sem `error`) quando um lote passa de 400 linhas — possível já hoje (~601 linhas na base). Documentada em `docs/auditoria/robustez-erros-validacao.md` (LOG-02), no backlog (`docs/auditoria/backlog-priorizado.md`, Onda 6) e no `docs/manuais/manual-tecnico.md` (semântica temporal). Correção pendente de decisão entre (a) `criado_em` único por lote no payload ou (b) agrupar por lote/`log_importacao`; ambas mexem no contrato temporal e não devem ser feitas sem validação.
