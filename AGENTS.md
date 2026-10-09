Você está trabalhando no projeto **Kustos Germani**, um motor de investigação operacional de custos.

- Atualização 2026-10-09 (CAD-ENV-01): build-web publica apenas dist por allowlist; nunca publicar api/scripts/executor/.env/dependências/SQL. Diagnóstico GET verificar=1 autentica getUser/UUID allowlist e valida bucket privado, contexto/guardas centrais/privilégios/policies em READ ONLY/ROLLBACK, mesmo com flag false, sem executor/lote/upload. Allowlist inicial somente usuário indicado e confirmado por SELECT no Auth; não inferir outros admins. Deploy/env/bucket reais ainda pendentes; endpoint público 404 na verificação. Não habilitar/reconstruir como teste. Nenhuma escrita de produção/migration/snapshot/commit; fatos mantêm data_referencia como competência e criado_em como importação. Ver docs/arquitetura/cadastro-mestre-preparacao-ambiente.md.

- Atualização 2026-10-09 (CAD-EXEC-WEB-01): execução explícita de reconstrução pela UI usa função Node Vercel autenticada por Supabase Auth, allowlist server-side/origem exata e gate desabilitado por padrão. Reutilizar plano/executor centrais; nunca importar pg/conexão administrativa no browser. Aprovação/download permanecem locais; POST exige aprovação integral, hash e segunda confirmação. Snapshot web em bucket privado existente, sem sobrescrita, conferido por download/hash antes do DML; CLI mantém wx/fsync. Lote/provas/rollback preservados, GET de resultado somente SELECT, sem retry automático. Nenhuma carga real/deploy/schema/fatos/operacional/mapa nesta entrega; data_referencia é competência e criado_em importação, intactos. Ver docs/arquitetura/cadastro-mestre-execucao-web.md.

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

- Atualizacao 2026-08-10 (MNT-OP-04): `view/ui-op.js` usa uma carga local unica de `apontamentos_op`; filtros e periodo devem recalcular fila e dossie nela, e `view/ui-import-op.js` deve solicitar recarga apos importacao bem-sucedida. Nao usar periodo fixo nem consulta nova por mudanca pequena. `data_referencia` e competencia; `criado_em` e evento de importacao.

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
| `view/ui-controller.js` | Eventos de UI, bootstrap e orquestração de fluxos |
| `view/ui-table.js` | Fila investigativa da aba Custos, detalhes por linha e presenter operacional compartilhado com exportação |
| `view/ui-charts.js` | Gráficos investigativos (comparação de importações, TOP variações, análise temporal) e layout condicional do relatório |
| `view/ui-drill-through.js` | Drill-through: histórico completo de importações de um produto (competência × importação, deltas por registro) |
| `view/ui-import.js` | Fluxo de importação: upload, mapeamento de colunas, preview validado linha a linha e gravação via API com log |
| `view/ui-import-op.js` | Upload, preview e persistência do CSV de apontamentos da Auditoria de OP |
| `view/ui-op.js` | Fila investigativa e dossiê da Auditoria de OP: filtros, motivo e provável causa |
| `core/spreadsheet-engine.js` | Parsing de planilhas, detecção de colunas, normalização numérica |
| `core/op-investigation-engine.js` | Indicadores e interpretação investigativa de OP; preserva fatos do ERP e não acessa UI/API |
| `core/report-engine.js` | Cálculos analíticos, cascata, detecção de regime |
| `src/services/api.js` | Camada única de acesso Supabase (I/O) |
| `services/api.js` | Shim de compatibilidade de import (re-exporta de src/services/api.js) |
| `core/heuristic-engine.js` | Somente documentação: guardrail da regra central "categorização vem do dicionario_produtos, nunca de heurística por texto". Não exporta lógica (funções de sugestão foram removidas); serve de aviso no local onde alguém tentaria adicioná-la. Ver MNT-04. |

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


- Atualização 2026-07-20 (registro retroativo de PRs recentes): revisão documental dos PRs #121–#124 sem alteração de código. Registrado que o MNT-01 avançou com filtros (`view/ui-filters.js`) e exportação (`view/ui-export.js`), mas permanece aberto porque a fila/tabela e o presenter investigativo (`renderTable`, `getOperationalPriority`, `buildInvestigativeSummary`) ainda ficam em `view/ui-controller.js`. Registrado também que o PR #124 reduziu parcialmente o MNT-03 ao mover `fillSelect` para `view/ui-utils.js`, sem concluir a centralização completa da cascata.

- Atualização 2026-07-27 (Engineering Freeze v1.0 — MNT-01 encerrado): fila/tabela e presenter investigativo extraídos de `view/ui-controller.js` para `view/ui-table.js` (`createTableController({ dom, executeOperationalBoundary, renderDrillThrough, rerunReportForProduct })`). `ui-controller.js` fica predominantemente como orquestrador, preservando comportamento, fronteiras ERR-01 e semântica temporal (`data_referencia` na competência exibida; `criado_em` na importação exibida). `MNT-01` pode ser considerado encerrado.

- Atualização 2026-07-27 (MNT-OP-01 — persistência da Auditoria de OP): o CSV MCAP105 real formata números de OP com ponto de milhar (por exemplo, `2.081`). O parser deve remover esse separador exclusivamente ao converter o campo `op` para inteiro, preservando `apontamentos_op.op` como `INTEGER NOT NULL`; não criar ou aplicar migração de schema. `importarApontamentosOp` deve registrar falhas de chunk sob o cabeçalho `IMPORTAÇÃO OP` com chunk, quantidade, primeiro registro, resposta completa do Supabase (`code`, `message`, `details`, `hint`) e registros/campo quando a resposta indicar violação `NOT NULL`. `data_referencia` permanece competência e `criado_em` evento de importação.

- Atualização 2026-07-30 (MNT-OP-02 — motor investigativo da Auditoria de OP): os campos importados do MCAP105 são fatos imutáveis do ERP; `core/op-investigation-engine.js` é a fonte única de indicadores calculados pelo Kustos (`desvioTempoPct`, `desvioProdutividadePct`, `atendimentoProducaoPct`, `indiceParadasPct`), conferência do `% Tempo (ERP)` e classificação por motivo/provável causa. Nenhum indicador isolado define a fila: parada só é causa principal com atraso e produtividade normal/baixa; tempo alto + produtividade baixa sem parada material indica gargalo. Não duplicar o `% Tempo (ERP)` como sinal de criticidade. A UI deve separar “Dados do ERP (imutáveis)” de “Indicadores calculados pelo Kustos”, rotulando `data_referencia` como competência e `criado_em` como importação.

- Atualização 2026-08-03 (MNT-OP-03 — decisão investigativa combinada): `analyzeOpInvestigation()` deve expor uma decisão auditável (`mereceInvestigacao`, prioridade, ação e evidências) derivada conjuntamente de produção, tempo, KG/Hora e paradas. Nunca priorizar por uma coluna isolada. Tempo alto com produtividade praticamente estável só é isento de alerta quando o atendimento de produção explica o tempo adicional; parada material sem impacto em entrega, tempo ou produtividade deve ser registrada, não priorizada; parada + atraso + queda/não melhoria de produtividade + déficit de produção é prioridade máxima. Preservar os fatos ERP, sem schema novo, e manter `data_referencia` como competência e `criado_em` como evento de importação.
- Atualização 2026-08-13 (CAD-01 — cadastro mestre): `dicionario_produtos` é a única base mestre ativa para Custos e OP. O XLSM atualiza descrição/origem/família somente quando há valor; vazios e produtos ausentes não apagam cadastro; `agrupamento_cod` é manual do Kustos, nunca inferido dos agrupamentos ERP. Produto sem resolução é "Produto sem classificação", sem inventar categoria nem reescrever fatos.
- Atualização 2026-08-24 (recorte temporal do drill-through de Custos): `getProductHistory(codigoProduto, competencias)` recebe as competências ativas do relatório e aplica filtro explícito em `data_referencia`; o painel calcula Δ/Δ% somente entre essas linhas. Assim, Junho + Agosto não inclui Julho. `criado_em` permanece apenas a proveniência de importação; não houve mudança de schema, importação, exportação ou regra investigativa.
- Atualização 2026-08-24 (seleção de campos na exportação XLSX): `view/ui-export.js` mantém `state.reportRows` como única fonte da Fila Investigativa e abre popup SweetAlert2 com todos os campos marcados. O arquivo exporta somente as colunas confirmadas na ordem canônica; cancelamento não grava arquivo, sem consulta Supabase, schema ou mudança nos indicadores.
- Atualização 2026-08-27 (modos temporais de Custos): `temporalMode=interval` mantém a consulta por faixa de `data_referencia`; `temporalMode=comparison` passa as duas competências explicitamente a `getHistorico`, gráficos e `getProductHistory`. Fila, KPIs, detalhamento e drill-through compartilham o mesmo recorte; `criado_em` continua apenas o eixo de importação. Sem schema, importação, exportação ou nova regra investigativa.
- Atualização 2026-09-28 (PERF-01 — fila investigativa): `view/ui-table.js` limita a renderização aos primeiros 200 itens já priorizados pelo relatório e informa o total excedente; não reordena nem altera KPIs, exportação ou recorte temporal. Clique de detalhe e drill-through usa um único listener delegado no `tbody`; itens fora da janela entram após refinar o recorte.
- Atualização 2026-10-01 (Fase 2A — estrutura do Cadastro Mestre): `dicionario_master_produtos` ganhou a FK opcional `ultima_importacao_cadastro_mestre_id` para `log_importacao_cadastro_mestre`. O log registra arquivo/lote, tipo (`XLSM`/`XLSX`/`XLS`), hash ou identificador, execução, contagens, erros e metadados de origem, com RLS ativo e sem policy de escrita. Nesta fase, não preencher a FK existente, não reconciliar com `dicionario_produtos` e não inferir família por descrição.
- Atualização 2026-10-05 (Fase 2C.2 — agrupamento ERP + proveniência): `dicionario_master_produtos.agrupamento_erp_valor` preserva o valor bruto do ERP e `agrupamento_erp_importacao_id` registra seu lote. `dicionario_produtos.agrupamento_cod` continua sendo a classificação efetiva; `agrupamento_override_manual_cod` e `agrupamento_classificacao_origem` distinguem override e proveniência quando uma etapa futura explícita os preencher. Não inferir agrupamento ERP a partir de mapa, família, origem, descrição ou códigos `Mxxx`; os dados existentes ficaram nulos nessas novas colunas.
- Atualização 2026-10-08 (CAD-PREVIEW-01 — Fase 3.1): `core/cadastro-mestre-preview-engine.js` calcula exclusivamente Preview contra `dicionario_master_produtos`; leitura de arquivo fica em `src/services/cadastro-mestre-preview.js`. Filtrar Tipo P/C, depois Descr(Origem) contendo Produzido/Revenda, depois excluir descrição com inativo/EXLUIR. Resolver origem/família somente por código exato, preservar vazios/ausentes e agrupamento ERP bruto sem ponte. `api.getCadastroMestrePreviewContext()` é somente SELECT paginado; não ligar ao importador legado, aprovar, executar, gravar log/proveniência ou projetar para a dimensão operacional nesta fase. Sem alteração de `data_referencia` (competência) ou `criado_em` (importação).
- Atualização 2026-10-08 (CAD-APPROVAL-01 — Fase 3.3): decisão de negócio define `Agrup. Prod.` (Q) como `agrupamento_erp_valor`; nunca converter Pxxx para Mxxx. `core/cadastro-mestre-approval-engine.js` gera propostas e revisão local pura, com decisões por operação vinculadas ao manifesto completo. Descrição e agrupamento são propostas independentes; INSERT é indivisível; vazios/ausentes não geram NULL/DELETE. IDs BIGINT de proveniência só serão definidos na execução futura. O lote real foi entregue com todas as propostas pendentes; testes de aprovação usam fixtures sintéticas. Não ligar este fluxo ao importador legado nem executar persistência nesta fase. Custos/OP e os eixos `data_referencia`/`criado_em` permanecem inalterados.
- Atualização 2026-10-08 (CAD-EXEC-01 — Fase 3.4): executada carga pontual autorizada após manifesto/contexto/arquivo integralmente idênticos à Fase 3.3. Migration `20261008184501_fase3_4_execucao_cadastro_mestre.sql`, lote 1 concluído, Master 5.706: 103 novos + 312 existentes (320 patches: 11 descrições e 309 agrupamentos). Proveniência somente nas 415 escritas efetivas; 342 agrupamentos ERP vinculados ao lote; 5.291 antigos integralmente preservados, incluindo 4.853 fora dos filtros. Guardas bloqueiam repetição/concorrência; EXCEPT integral bidirecional e fingerprints protegidos conferidos. Sem escrita operacional/mapa/fatos/categorias, ponte, mudança de RLS ou ativação de importer/UI. Fatos mantêm `data_referencia` como competência e `criado_em` como evento de importação. Não reexecutar esta migration nem tratar a carga pontual como importer genérico.
- Atualização 2026-10-08 (CAD-UX-01 — Cadastro): tabela em contêiner único overflow: auto limitado a 60dvh (fallback 60vh), preservando header sticky e acesso à barra horizontal em listas longas. upsertProductMaster usa buildManualProductMasterPayload: agrupamento explicitamente vazio/null grava agrupamento_cod = NULL; omitido preserva o atual. buildProductMasterPayload e o importador mantêm preservação ERP. A tela continua ligada a dicionario_produtos, sem mudança no Master ERP, schema, mapa, fatos, proveniência, RLS ou pipeline. data_referencia (competência) e criado_em (importação) permanecem intactos. Ver docs/ux/cadastro-mestre.md.
- Atualização 2026-10-08 (CAD-XLS-01 — Preview na tela): após esclarecimento humano da divergência entre tela legada e módulos de Preview, o seletor aceita XLSM/XLSX/XLS e chama `createCadastroMestrePreviewController` → `api.getCadastroMestrePreviewContext` (SELECT) → `prepararAprovacaoArquivoCadastroMestre`. Reutiliza filtros, normalização, Master ERP, Agrup. Prod., preservação e decisões existentes, sem parser paralelo ou executor. Revisão/download JSON são locais; seletor não chama `importProductMasterXlsm`. Sem escrita de log/proveniência, schema ou migration. Tabela/edição manual continuam em `dicionario_produtos`; `data_referencia` é competência e `criado_em` importação, intactos nos fatos. Testes usam XLS BIFF sintético/contexto em memória, sem carga real.
- Atualização 2026-10-09 (CAD-REBUILD-01 — reconstrução do universo): decisão humana substitui a preservação de ausentes/fora dos filtros somente no Master ERP. Adapter existente prepara `RECONSTRUCAO_UNIVERSO_V1` com novos, alterações e remoções somente de `dicionario_master_produtos`; preservar vazios de quem permanece e Agrup. Prod. bruto. Aprovação integral obrigatória, bloqueando erros/universo vazio. UI mantém SELECT/decisões/download, sem DELETE/SQL/RPC/execução automática. Comando administrativo separado usa PostgreSQL dedicado, locks/revalidação integral, snapshot durável e JSONB existente do log, SAVEPOINT, DML bulk e provas/COMMIT; falha reverte Master inteiro e registra falhou, COMMIT incerto não autoriza retry. Não mudar schema/migration/RLS nem fatos/operacional/mapa/categorias. Testes em PostgreSQL local em memória; nenhuma carga real. Contrato: `docs/arquitetura/cadastro-mestre-reconstrucao.md`. `data_referencia` permanece competência e `criado_em` evento de importação dos fatos, intactos.
