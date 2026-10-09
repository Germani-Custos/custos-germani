# Manual de Uso Técnico — Kustos Germani

## CAD-REBUILD-01 — contrato vigente (09/10/2026)

O adapter existente passa `modo:RECONSTRUCAO_UNIVERSO` ao motor de aprovação. O motor de filtros permanece intacto; `core/cadastro-mestre-reconstruction-engine.js` valida aprovação integral e consolida o plano puro. Master é lido com `supabase.from().select('*')` paginado para vincular a imagem inteira. Manifesto `RECONSTRUCAO_UNIVERSO_V1` inclui remoções revisáveis e universo esperado, mantendo download com execução desabilitada.

O executor `scripts/lib/cadastro-mestre-reconstruction.mjs`, chamado apenas pelo comando administrativo `scripts/reconstruir-cadastro-mestre.mjs`, usa cliente PostgreSQL dedicado, BEGIN/locks/validação completa, snapshot durável, SAVEPOINT, bulk INSERT/UPDATE e DELETE explícito somente no Master, prova final e COMMIT. Falha de DML reverte integralmente e registra lote falhou; confirmação de COMMIT perdida exige consulta e nunca retry automático. Não há SQL/RPC/DELETE no frontend.

Snapshot completo, hashes, decisões e remoções ficam no JSONB existente do log e em arquivo independente antes do DML do Master. Proveniência é preenchida apenas nas escritas efetivas. Não muda schema/RLS nem cria migration. `pg` 8.16.3 é exclusivo do comando Node; PGlite 0.3.14 é exclusivo de testes locais, ambos devDependencies, sem alteração do CDN/runtime frontend. Nenhum fato, mapa, categoria ou operacional recebe DML; `data_referencia` continua competência e `criado_em` importação. [Contrato e testes transacionais](../arquitetura/cadastro-mestre-reconstrucao.md). Os limites de preservação/execução descritos nas entregas abaixo são históricos.

## CAD-XLS-01 — Preview na tela (08/10/2026)

`view/ui-product-master.js` delega o seletor a `createCadastroMestrePreviewController({dom,executeOperationalBoundary})` em `view/ui-cadastro-mestre-preview.js`. Fluxo: arquivo → `api.getCadastroMestrePreviewContext()` (SELECT paginado do Master ERP/categorias) → `prepararAprovacaoArquivoCadastroMestre(arquivo,contexto,globalThis.XLSX)` → manifesto/revisão pendente → modal → helpers canônicos de decisão → download JSON opcional. A fonte do Preview é `dicionario_master_produtos`, nunca `getProductMaster()`.

O `xlsx.full` 0.20.3 existente lê BIFF/XLS e XLSX/XLSM via `arrayBuffer`, sem conversão, parser ou dependência nova. Adapter/motores permanecem intactos. A UI escapa valores ERP, impede seleção concorrente e usa a fronteira ERR-01 para falhas. O seletor não chama mais `importProductMasterXlsm`; o método legado na API permanece inalterado. Tabela/edição manual continuam na dimensão operacional. Sem executor, escrita de log/proveniência, schema, migration ou política. Aprovação/download mantêm `execucao_permitida:false`; `data_referencia` (competência) e `criado_em` (importação) dos fatos permanecem intactos.

Regressões: `tests/cadastro-mestre-formatos.test.js`, `tests/ui-cadastro-mestre-preview.test.js` e fixture sintética em `tests/fixtures/cadastro-mestre-arquivo.js`. Bytes BIFF reais, filtros, códigos/acentos/zeros, vazios/ausentes, equivalência, seletor, aprovação/bloqueios, cancelamento, falhas, concorrência e escape; API/rede mockadas, nenhuma carga real. [Contrato atual](../ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

## Fase 3.4 — carga pontual autorizada (08/10/2026)

Migration 20261008184501, lote 1 concluído: Master 5.706, 103 novos e 312 existentes atualizados (11 descrições + 309 agrupamentos ERP). A gravação foi precedida por manifesto/contexto/arquivo integralmente idênticos e usa guardas contra repetição/concorrência, EXCEPT integral e log com imagens anteriores. Proveniência vincula somente 415 escritas e 342 agrupamentos recebidos. Sem schema/RLS, importer/UI, ponte ou escrita operacional. [Contrato e testes](../arquitetura/cadastro-mestre-execucao-fase3-4.md). `data_referencia` continua competência e `criado_em` evento de importação nos fatos, que não foram alterados.

## Fase 3.3 — manifesto e decisões sem executor (08/10/2026)

`prepararAprovacaoArquivoCadastroMestre` reutiliza o adaptador, reconhece explicitamente `Agrup. Prod.` e calcula hashes SHA-256 de arquivo/contexto com Web Crypto. `core/cadastro-mestre-approval-engine.js` calcula propostas determinísticas e decisões individuais/em lote sem I/O. Revisão começa pendente e se vincula ao manifesto completo; mudança de conteúdo invalida decisões anteriores. Exportar aprovadas não é executar.

Destino único das propostas: `dicionario_master_produtos`; nenhum Pxxx vira agrupamento Kustos. Origem/família são códigos ERP brutos com resolução exata separada. Proveniência BIGINT é requisito da execução futura, não valor já preenchido. Sem alteração de `data_referencia` (competência), `criado_em` (importação), runtime ou RLS. [Contrato completo](../arquitetura/cadastro-mestre-aprovacao.md).

Guia para **desenvolvedores e agentes de IA** que vão evoluir o sistema. Antes de qualquer mudança, leia o `AGENTS.md` (contratos inegociáveis) e as [Regras Gerais](../regras-gerais.md). Para encontrar fragilidades e o backlog, veja [`docs/auditoria/`](../auditoria/README.md).

> Este manual é uma **porta de entrada**. Documentação aprofundada já existe em `docs/arquitetura/`, `docs/ux/` e `docs/regras-negocio/` — esses são linkados, não duplicados.

---

## Atualizacao 2026-08-10 — ciclo do contexto de OP

`createOpController` carrega `apontamentos_op` e deriva fila e historico pelos filtros e por `data_referencia`; `createImportOpController` recebe um callback que renova essa carga depois de importar. Nao ha periodo fixo ou nova consulta por filtro. `criado_em` permanece apenas evento de entrada.

## 1. Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **JavaScript puro (ES Modules)** | Sem framework, **sem bundler**, sem `package.json` no runtime. |
| Estilo | CSS3 (`assets/style.css`), tema escuro/glass | Variáveis CSS. |
| Dados/Backend | **Supabase** (PostgreSQL + Auth + Realtime) | Acesso só via `supabase.from()`. Sem servidor próprio. |
| Bibliotecas (CDN) | SheetJS/`xlsx`, `chart.js`, `sweetalert2`, `@supabase/supabase-js@2`, `remixicon` | Carregadas no `index.html`. ⚠️ versões não fixadas — ver `SEC-05`. |
| Deploy | **Vercel** (estático) | `runtime-config.js` gerado no build. |

Detalhes: [`docs/arquitetura/stack-tecnologico.md`](../arquitetura/stack-tecnologico.md).

---

## 2. Arquitetura de pastas

```
index.html               # Shell único: sidebar + <section class="view"> por tela. Carrega CDNs e o controller.
runtime-config.js        # Gerado no build (window.__ENV__). NÃO editar à mão.
vercel.json              # buildCommand + outputDirectory "."
assets/style.css         # Estilos globais
view/                    # Camada de UI (orquestração, DOM, estado, utils)
  ui-controller.js       # Bootstrap + orquestração dos fluxos de UI (MNT-01 concluído)
  ui-charts.js           # createChartsController(): gráficos (comparação/TOP variações/temporal) + layout
  ui-drill-through.js    # createDrillThroughController(): histórico completo de importações do produto
  ui-import.js           # createImportController(): upload, mapeamento, preview validado e gravação com log
  ui-import-op.js        # createImportOpController(): upload CSV latin-1, preview e gravação de apontamentos de OP
  ui-op.js               # createOpController(): filtros, fila por motivo e dossiê da Auditoria de OP
  ui-table.js            # createTableController(): fila investigativa, detalhes e presenter operacional
  ui-export.js           # createExportController(): seleção de colunas, XLSX e sanitização anti-fórmula
  ui-dom.js              # getDomRefs(): mapeia todos os elementos por id
  ui-state.js            # createInitialState(): estado central
  ui-utils.js            # escapeHtml, debounce, fillSelect seguro por DOM, showToast, formatadores
core/                    # Regra de negócio pura (sem DOM, sem Supabase)
  spreadsheet-engine.js  # Parsing XLSX, fuzzy match de colunas, normalização numérica e normalizeCodigoProduto
  op-investigation-engine.js # Motor puro de indicadores e classificação investigativa por OP
  report-engine.js       # Cascata, variação, score de instabilidade, regime, KPIs (sem DOM)
  heuristic-engine.js    # Sugestão de categoria (NÃO integrado — ver MNT-04)
src/
  config/app-config.js   # Resolução/validação de env (VITE_*) com fallback em cascata
  services/api.js        # Camada única Supabase (queries, validação, enrichment, realtime)
services/api.js          # Shim: re-exporta src/services/api.js (compat de import)
scripts/
  generate-runtime-config.mjs  # Build: gera runtime-config.js a partir do env
  create-master-user.mjs       # Cria usuário no Supabase Auth (admin)
sql/                     # Migrações e índices (aplicar manualmente no Supabase)
docs/                    # Esta documentação
```

Mapa de telas/fluxos: [`docs/ux/frontend.md`](../ux/frontend.md) e [`docs/ux/rotas-navegacao.md`](../ux/rotas-navegacao.md).

---

## 3. Modelo de dados (NÃO violar)

### Separação FATO × DIMENSÃO

- **FATO:** `historico_custos` — série temporal de custos. Chave de negócio: `codigo_produto` + `data_referencia` (constraint `unique_produto_data`). Colunas: `custo_variavel`, `custo_direto_fixo`, `custo_total` (NUMERIC 18,4), `data_referencia` (DATE), `criado_em` (TIMESTAMPTZ).
- **DIMENSÕES:** `dicionario_produtos` (produto → `origem_id`/`familia_id`/`agrupamento_cod`), `categorias_origem`, `categorias_familia`, `categorias_agrupamento`.
- **AUDITORIA:** `log_importacao` (status, totais, timestamps, competência).
- **APONTAMENTOS DE OP:** `apontamentos_op` (linhas do relatório MCAP105) e `log_importacao_op` (ciclo do lote). `op` é `INTEGER NOT NULL`; o parser normaliza somente o ponto de milhar da OP no relatório (por exemplo, `2.081` → `2081`) antes da persistência.

### Semântica temporal (crítico)

| Campo | Significado | Uso no código |
|---|---|---|
| `data_referencia` | Competência (mês ERP) | Filtro de período, série temporal (`buildTemporalSeries`). |
| `criado_em` | Evento de importação | Identificar "última/penúltima importação" (`getLatestImportComparison`, `getTopVariacoesImportacao`). |

A UI **sempre rotula** qual eixo está mostrando. Regra detalhada no `AGENTS.md` e em [`docs/arquitetura/banco-de-dados.md`](../arquitetura/banco-de-dados.md).

> **Dívida conhecida (LOG-02):** a premissa "1 importação = 1 `criado_em`" **não** é garantida pelo pipeline atual. O upsert grava em chunks de 400 (`IMPORT_CHUNK_SIZE`) e cada chunk recebe um `criado_em` próprio, então um lote com mais de 400 linhas gera vários `criado_em`. Assim, `getLatestImportComparison`/`getTopVariacoesImportacao` podem comparar dois chunks do mesmo lote em vez de duas importações reais (erro silencioso). Detalhe e opções de correção em [`docs/auditoria/robustez-erros-validacao.md`](../auditoria/robustez-erros-validacao.md) (LOG-02) e no backlog.

### Regras de acesso a dados (do `AGENTS.md`)
- **Só** `supabase.from()`. **Sem** RPC, **sem** SQL bruto no frontend.
- Frontend exibe `descricao`; UUID/`codigo` são chave técnica, nunca semântica de negócio.
- Credenciais só por env/runtime — nunca hardcoded.

Schema, constraints e índices: [`docs/arquitetura/banco-de-dados.md`](../arquitetura/banco-de-dados.md) · views: [`docs/arquitetura/views-banco.md`](../arquitetura/views-banco.md) · migrações: [`docs/arquitetura/migracoes.md`](../arquitetura/migracoes.md) · cascata: [`docs/regras-negocio/relacionamentos-cascata.md`](../regras-negocio/relacionamentos-cascata.md).

---

## 4. Camada de serviço (`src/services/api.js`)

Fachada `api` com os métodos consumidos pela UI. Todos retornam o padrão `{ data, error }` (helpers `ok()`/`fail()`):

| Método | Uso |
|---|---|
| `getMasters()` | Carrega dimensões + produtos com custo + diagnóstico de órfãos (`diagnostico_sem_mapa.status`: `ok` ou `indisponivel`). |
| `getHistorico(filters)` | Histórico por intervalo ou por lista explícita de competências + cascata (enriquece dimensão antes de filtrar). |
| `getProductHistory(codigo, temporalFilters)` | Drill-through: recebe o mesmo intervalo ou competências explícitas do relatório e calcula Δ/Δ% apenas nesse recorte. |
| `getLatestImportComparison(filters)` | Comparação entre as 2 últimas importações (por `criado_em`). |
| `getTopVariacoesImportacao(filters)` | TOP aumentos/reduções entre as 2 últimas importações. |
| `importarHistoricoCustosComLog(payload, {dataReferencia})` | Importação resiliente: normaliza `codigo_produto` com `normalizeCodigoProduto`, valida linha-a-linha, garante produtos no dicionário, upsert em chunks de 400, grava `log_importacao`. |
| `importarApontamentosOp({rows, dataReferencia, arquivoNome})` | Insere apontamentos de OP em chunks e registra `log_importacao_op`. Recebe `op` já normalizada pelo parser como inteiro. Em erro, registra resposta completa do Supabase e isola registros ligados a uma violação `NOT NULL`. |
| `getApontamentosOp(filters)` | Consulta apontamentos de OP por competência, estágio, origem, OP e produto, com ordenação explícita. |
| `subscribeFiltrosRealtime(cb)` | Assina mudanças em `historico_custos`/`dicionario_produtos`. |
| `signIn/signOut/getCurrentUser` | Supabase Auth (hoje não usados no bootstrap — ver `SEC-03`). |

Matriz de contratos UI→API→Banco: [`docs/arquitetura/matriz-contratos-operacionais.md`](../arquitetura/matriz-contratos-operacionais.md) · camada de serviço: [`docs/arquitetura/services-frontend.md`](../arquitetura/services-frontend.md) · endpoints: [`docs/arquitetura/mapa-endpoints.md`](../arquitetura/mapa-endpoints.md).

> ⚠️ O método `importarHistoricoCustosComLog` segue grande e há caminho legado de payload — ver `MNT-06` antes de refatorar. O item `VAL-01` foi resolvido centralizando `codigo_produto` em `normalizeCodigoProduto()` no preview, payload, API, relatório e drill-through.

### Diagnóstico de persistência da Auditoria de OP (MNT-OP-01)

O schema declara `apontamentos_op.op` como `NOT NULL`. No CSV real, algumas OPs usam ponto de milhar e o conversor inteiro estrito as recebia como `null`. O parser corrige exclusivamente esse campo antes da conversão, sem migration e sem alteração de semântica temporal. Quando uma chamada `.insert()` falhar, `logOpImportFailure()` registra o número do chunk, sua quantidade, primeiro registro, resposta completa do Supabase (`code`, `message`, `details`, `hint`) e, quando o PostgreSQL identificar uma coluna `NOT NULL`, os registros e o campo envolvidos.

### Motor investigativo da Auditoria de OP (MNT-OP-02 / MNT-OP-03)

`core/op-investigation-engine.js` é puro e não altera `apontamentos_op`: recebe uma linha do MCAP105 e acrescenta `indicadoresKustos`, `conferenciaErp` e `classificacaoInvestigativa`. A fonte de verdade é `analyzeOpInvestigation()`; `buildOpInvestigationQueue()` ordena por decisão, motivo e magnitude.

- **Fatos ERP:** `qtd_*`, `tempo_*`, `kg_hora_*`, `tempo_parada`, `% Tempo` e metadados continuam inalterados.
- **Indicadores Kustos:** `atendimentoProducaoPct = produzido / previsto`, `desvioTempoPct = (real - previsto) / previsto`, `desvioProdutividadePct = (kg/h real - previsto) / previsto` e `indiceParadasPct = parada / tempo_real`.
- **% Tempo ERP:** apenas conferência contra `desvioProdutividadePct`, tolerância de 0,2 p.p.; nunca entra como segundo peso de criticidade.
- **Classificação:** usa combinação de sinais: gargalo de produtividade, desperdício operacional, paradas operacionais, baixa produção, tempo justificado pelo volume, parada sem impacto, alta eficiência, sinal misto ou sem base comparativa. Não expor “status crítico” genérico; a UI apresenta motivo e provável causa.
- **Decisão (MNT-OP-03):** `classificacaoInvestigativa` inclui `mereceInvestigacao`, `decisao` (`maxima`, `alta`, `monitorar`, `registrar`, `nenhuma` ou `sem_base`) e `evidencias`. A UI apenas apresenta este contrato; não recalcula prioridade ou sinais inline.
- **Guardrails das combinações:** produção entregue + tempo alto + KG/Hora baixo + parada material = desperdício (alta); os mesmos sinais com déficit de produção = paradas com impacto (máxima). Tempo alto não alerta se KG/Hora estiver praticamente estável e a produção explicar o tempo adicional. Parada material sem efeito em produção, tempo e KG/Hora fica registrada sem prioridade.
- Planejado/previsão igual a zero ou ausente gera `sem_base_comparativa`; o motor não inventa eficiência. `data_referencia` filtra competência; `criado_em` é exibido no dossiê como evento de importação e não participa das fórmulas de execução.


### Contrato de alerta investigativo (LOG-01)

- `classifyAlert()`/`isAlertaCritico()` em `core/report-engine.js` é a única fonte de verdade para o KPI **Alertas (>5%)** e derivados.
- Base temporal: `variacaoTemporal`, calculada entre última e penúltima importação pelo eixo `criado_em`; `data_referencia` continua sendo apenas o recorte de competência do relatório.
- Critério: `Math.abs(percentual) >= 5`, sem arredondamento antes da comparação; variação negativa (queda) alerta com a mesma prioridade operacional que alta.
- `null` representa ausência legítima de comparativo e retorna não alerta; `undefined`, `NaN` ou payload sem percentual canônico deve lançar erro para impedir contagem silenciosa divergente.
- UI, tabela, drill-through, ranking/reincidência e exportação devem chamar o helper ou `filterAlertRows()`, nunca comparar `> 5` inline.

### Contrato do diagnóstico de órfãos

- `runDiagnosticoSemAgrupamento()` não retorna mais `[]` para falha operacional; retorna `{ status: 'indisponivel', rows: [], error }`.
- `{ status: 'ok', rows: [] }` é o único estado que significa “nenhum órfão encontrado”.
- A consulta de `categorias_agrupamento` usa `supabase.from().select('*')` e resolve a chave por `codigo`/`id`/`cod` para tolerar divergência de schema sem usar RPC ou SQL bruto no frontend.
- A UI deve exibir “Não foi possível validar produtos sem agrupamento.” quando o diagnóstico estiver indisponível, preservando ERR-01 e sem quebrar o bootstrap.

### Contrato de código de produto

- `normalizeCodigoProduto()` em `core/spreadsheet-engine.js` é a única normalização canônica de identificadores de produto.
- Não usar `Number()`, `parseFloat()` ou `String(...).trim()` isolado para chaves de produto em novos fluxos.
- O contrato cobre células numéricas/string, notação científica, espaços, caracteres invisíveis, separadores de milhar e zeros à esquerda preserváveis quando a origem vem como texto.
- Código inválido deve falhar por linha (preview/API) e nunca gerar persistência parcial em `historico_custos` ou `dicionario_produtos`.

---

## 5. Rodar localmente

Não há servidor: é estático. Sirva a pasta raiz.

```bash
# 1. Configurar env (uma das fontes que app-config.js entende)
cp .env.example .env   # e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 2a. Servir como em produção (gera runtime-config.js a partir do env e serve estático):
node scripts/generate-runtime-config.mjs   # gera runtime-config.js (window.__ENV__)
python3 -m http.server 8000                # http://localhost:8000

# 2b. Alternativa: definir as variáveis via <meta name="VITE_*"> no index.html (apenas dev).
```

Se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` faltarem, `src/config/app-config.js` **lança no import** e o `index.html` mostra a tela "Configuração do ambiente não encontrada" (com diagnóstico das fontes avaliadas). Setup completo: `README_SETUP.md`.

### Resolução de env (ordem em `app-config.js`)
`window.__ENV__`/`window.__RUNTIME_CONFIG__` → `import.meta.env` → `<meta name="VITE_*">`. Flags: `VITE_ENABLE_VERBOSE_LOGS` ativa `debugLog`.

---

## 6. Build e deploy (Vercel)

- `vercel.json`: `buildCommand = node scripts/generate-runtime-config.mjs`, `outputDirectory = "."`.
- O script lê o env da Vercel e gera `runtime-config.js` com `window.__ENV__`. **Falha o build** se faltar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (fail-fast).
- Variáveis ficam em **Vercel → Project Settings → Environment Variables** (não versionar `.env`).

Detalhes e checklist: [`docs/arquitetura/deploy.md`](../arquitetura/deploy.md).

---

## 7. Como adicionar uma nova tela (padrão do projeto)

A "rota" é uma `<section class="view">` mostrada/escondida por classe. Para criar uma tela nova:

1. **HTML** (`index.html`): um botão na `<nav>` com `data-view-trigger="minhaTela"` e uma `<section id="view-minhaTela" class="view hidden">`.
2. **DOM** (`view/ui-dom.js`): adicione `minhaTela: document.getElementById('view-minhaTela')` ao objeto `views` (e refs dos elementos internos).
3. **Navegação**: `bindNavigation()` (`view/ui-controller.js:95-106`) já alterna qualquer item com `data-view-trigger` — não precisa mexer.
4. **Lógica**: crie um controller (ex.: `view/minha-tela-controller.js`) e chame seu `bind...()` no `init()`.

Componentes/classes reutilizáveis (`.panel`, `.btn-primary`, `.btn-outline`, `.kpi`, `.badge`): [`docs/ux/componentes.md`](../ux/componentes.md). Utils prontos em `view/ui-utils.js` (`escapeHtml`, `debounce`, `showToast`, formatadores) — **sempre** escape entrada de usuário antes de `innerHTML` (ver `SEC-01`).

### Tela de Documentação editável (`view/documentation-controller.js`)
Implementada (Fase 2). Permite **consultar e editar** os manuais (`docs/manuais/*.md`), as regras gerais (`docs/regras-gerais.md`) e a **auditoria técnica** (`docs/auditoria/*.md`) pela própria UI, com o seletor agrupado por categoria:
- **Render**: `marked` + `DOMPurify` (CDN fixados no `index.html`); o markdown é **sempre sanitizado** antes de ir ao DOM.
- **Leitura**: `fetch` dos `.md` servidos estaticamente (ex.: `docs/manuais/manual-usuario.md`).
- **Gravação**: POST para a Serverless Function `api/save-doc.js`, que comita via **GitHub Contents API** (GET sha → PUT) na branch publicada. Após o commit, a Vercel redeploya e o `.md` atualizado passa a ser servido (latência ~30-60s).
- **Env da Function** (Vercel): `GITHUB_TOKEN` (PAT fine-grained, Contents: write só neste repo — **secreto**), `GITHUB_REPO` (`owner/repo`), `GITHUB_BRANCH` (default `main`).
- **Segurança**: endpoint público (decisão de produto); mitigações no servidor — **allowlist de caminho** (`docs/manuais/*.md`, `docs/auditoria/*.md`, `docs/regras-gerais.md`), **limite de 200 KB**, e o token vive só no servidor. Para tornar outro documento editável, inclua-o no array `DOCS` do controller **e** na allowlist (`ALLOWED_PATHS`) da Function.
- **Vercel**: a função vive em `api/save-doc.js`; confirme que a pasta `api/` está sendo publicada como Serverless Function (o roteamento `/api/*` tem precedência sobre o estático).

---

## 8. Convenções

- Arquivos: kebab-case (`ui-controller.js`). Funções: camelCase. Constantes: SCREAMING_SNAKE_CASE. IDs/classes: kebab-case.
- Imports relativos com extensão `.js` (ES Modules nativos do browser).
- Regra de ouro: **velocidade de investigação acima de tudo** — ver `AGENTS.md`. Padrões de código: [`docs/regras-negocio/padroes-codigo.md`](../regras-negocio/padroes-codigo.md) · glossário: [`docs/regras-negocio/glossario.md`](../regras-negocio/glossario.md).

---

## 9. Documentos relacionados

- Visão/produto: `VISION.md` · `README.md` · roadmap: `ROADMAP.md`.
- Índice da documentação de arquitetura: [`docs/arquitetura/indice-documentacao-kustos.md`](../arquitetura/indice-documentacao-kustos.md).
- Operação e troubleshooting: [Manual de Operação](./manual-operacao.md) · [`docs/troubleshooting/playbook-operacional.md`](../troubleshooting/playbook-operacional.md) · [`docs/troubleshooting/guia-integracao.md`](../troubleshooting/guia-integracao.md).
- Auditoria técnica e backlog: [`docs/auditoria/`](../auditoria/README.md).

## Atualização 2026-05-28 — ERR-01 / fronteiras assíncronas da UI

`view/ui-controller.js` passou a centralizar erros operacionais em `normalizeOperationalError(error, operation)` e `executeOperationalBoundary(operation, action, options)`. Use esse padrão em novos handlers assíncronos de fronteira (rede, Supabase, XLSX, Chart), preservando contexto de tela e usando `debugLog` para detalhes técnicos somente quando `VITE_ENABLE_VERBOSE_LOGS=true`. Não registrar payloads completos nem dados sensíveis.

## Tooling de desenvolvimento — Onda 2 (25/06/2026)

A partir desta entrega, a validação técnica local passa a usar Node apenas como ferramenta de desenvolvimento. O runtime do Kustos Germani permanece estático via CDN.

Comandos recomendados antes de abrir PR:

```bash
npm install
npm run lint
npm run typecheck
npm test
```

Contratos cobertos inicialmente:

- VAL-01: `normalizeCodigoProduto()` preserva códigos textuais, converte notação científica inteira e bloqueia valores ambíguos.
- LOG-01: `classifyAlert()`/`filterAlertRows()`/KPIs usam `abs(variacaoTemporal) >= 5` no eixo de importação (`criado_em`).
- Semântica temporal: relatórios continuam separando competência (`data_referencia`) de evento de importação (`criado_em`).

Warnings de lint não devem ser silenciados sem análise; trate-os em refatorações dedicadas ou documente a exceção quando existir contrato operacional envolvido.

### Nota de CI — ESLint local vs runner limpo (29/06/2026)

Para validar tooling, não confie em binários globais instalados na máquina. A reprodução correta da GitHub Actions é:

```bash
rm -rf node_modules
npm ci
npm run lint
npm run typecheck
npm test
```

O pacote `eslint` precisa permanecer declarado em `devDependencies`; `@eslint/js` fornece presets/regras, mas não substitui o executável `eslint` usado pelo script `npm run lint`.


## Atualização 2026-07-27 — fechamento do fatiamento MNT-01

`view/ui-table.js` passou a concentrar a fila investigativa da aba Custos, os detalhes por linha e o presenter operacional (`getOperationalPriority`/`buildInvestigativeSummary`). `view/ui-controller.js` permanece como orquestrador dos fluxos (`ui-charts`, `ui-drill-through`, `ui-import`, `ui-filters`, `ui-export`, `ui-table`) e só injeta dependências necessárias para preservar as fronteiras ERR-01 e o re-run silencioso após drill-through. Não houve mudança funcional ou temporal; os rótulos de competência (`data_referencia`) e importação (`criado_em`) continuam na tabela.

## Atualização 2026-07-30 — contrato OP: ERP x Kustos

O contrato da OP separa fatos de interpretação. Qualquer regra futura deve ampliar `core/op-investigation-engine.js`, com regressão para a combinação de sinais correspondente; não colocar fórmula ou classificação inline em `ui-op.js`.
## Atualização 2026-08-13 — Cadastro mestre

`dicionario_produtos` é a dimensão mestre ativa. `core/product-master-engine.js` reconcilia XLSM por `normalizeCodigoProduto()`: ERP não vazio atualiza descrição/origem/família, vazio preserva dados e `agrupamento_cod` permanece manual. A OP é enriquecida em leitura, sem regravar fatos.

## Atualização 2026-09-28 — PERF-01 na tabela de Custos

`view/ui-table.js` define `MAX_VISIBLE_INVESTIGATION_ROWS = 200` e faz `slice(0, 200)` sobre as linhas já ordenadas recebidas da fila; não deve recalcular prioridade localmente. O controlador registra um único `click` no `tbody` e resolve, por delegação, a alternância de detalhes e o drill-through. A mudança não toca API, estado, KPIs, exportação nem `data_referencia`/`criado_em`.

## Atualização 2026-10-08 — CAD-UX-01

O Cadastro permanece ligado a `dicionario_produtos`. `.master-table-scroll` é um único contêiner com `overflow: auto`, `max-height: 60dvh` (fallback `60vh`) e padding zero, mantendo a barra horizontal na área visível e os `th` sticky existentes, sem JS de sincronização ou alteração de filtros/ordem/paginação.

`upsertProductMaster` passa pelo helper puro `buildManualProductMasterPayload`: agrupamento explicitamente vazio/null entra como `NULL`; campo omitido preserva o atual na API. O importador continua chamando `buildProductMasterPayload`, com a preservação ERP intacta. Sem mudança no Master ERP, schema, RLS, mapa, proveniência ou fatos; `data_referencia` é competência e `criado_em` é importação. [Causas, testes e limitação CRLF preexistente](../ux/cadastro-mestre.md).

## Atualização 2026-10-01 — Fase 2A do Cadastro Mestre

`dicionario_master_produtos` preserva os dados básicos ERP e agora pode apontar opcionalmente para `log_importacao_cadastro_mestre` por `ultima_importacao_cadastro_mestre_id`. O log guarda a evidência de arquivo/lote e resultado da futura carga; RLS está ativo e não existe policy de escrita ou importer nesta fase. O runtime, `dicionario_produtos`, fatos e classificações continuam inalterados.

## Atualização 2026-10-05 — Fase 2C.2: agrupamento ERP

O Master recebeu `agrupamento_erp_valor` (valor bruto, sem normalização) e `agrupamento_erp_importacao_id` (lote de origem). A dimensão operacional recebeu `agrupamento_override_manual_cod`, com FK para `categorias_agrupamento.id`, e `agrupamento_classificacao_origem`, restrita a `MASTER`, `MANUAL` ou `LEGADO_NAO_RASTREAVEL`. Nenhuma linha existente foi preenchida; `agrupamento_cod` permanece a classificação efetiva do runtime e não existe ponte ERP → Kustos nesta etapa.

## Atualização 2026-10-08 — Fase 3.1: Preview puro do Mestre ERP

O novo fluxo XLSM/XLSX/XLS existe como módulo, sem integração à tela: adaptador de arquivo → normalização → filtros ordenados (P/C, Produzido/Revenda, excluir inativo/EXLUIR) → comparação por `codigo_produto` no Master → Preview. Campos vazios/colunas opcionais ausentes preservam o atual; produtos ausentes não são excluídos. Origem/família resolvem exclusivamente `categorias_*.codigo`; agrupamento ERP não gera categoria Kustos.

`api.getCadastroMestrePreviewContext()` fornece SELECTs paginados do Master e dos códigos de categoria, falhando explicitamente em contexto incompleto. Não há gravação, log, migration, aprovação ou execução. `data_referencia` permanece competência e `criado_em` evento de importação; nenhum é alterado no Preview. Veja [contrato, contagens e exemplo de chamada](../arquitetura/cadastro-mestre-preview.md). SheetJS 0.20.3 foi acrescentado somente como devDependency para testes de bytes reais, mantendo o CDN de produção.
