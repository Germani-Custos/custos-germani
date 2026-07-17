# Manual de Uso Técnico — Kustos Germani

Guia para **desenvolvedores e agentes de IA** que vão evoluir o sistema. Antes de qualquer mudança, leia o `AGENTS.md` (contratos inegociáveis) e as [Regras Gerais](../regras-gerais.md). Para encontrar fragilidades e o backlog, veja [`docs/auditoria/`](../auditoria/README.md).

> Este manual é uma **porta de entrada**. Documentação aprofundada já existe em `docs/arquitetura/`, `docs/ux/` e `docs/regras-negocio/` — esses são linkados, não duplicados.

---

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
  ui-controller.js       # Bootstrap + orquestração dos fluxos de UI (fatiamento em andamento — ver MNT-01)
  ui-charts.js           # createChartsController(): gráficos (comparação/TOP variações/temporal) + layout — fatiado de ui-controller (MNT-01)
  ui-dom.js              # getDomRefs(): mapeia todos os elementos por id
  ui-state.js            # createInitialState(): estado central
  ui-utils.js            # escapeHtml, debounce, showToast, formatadores
core/                    # Regra de negócio pura (sem DOM, sem Supabase)
  spreadsheet-engine.js  # Parsing XLSX, fuzzy match de colunas, normalização numérica e normalizeCodigoProduto
  report-engine.js       # Cascata, variação, score de instabilidade, regime, KPIs, fillSelect
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

### Semântica temporal (crítico)

| Campo | Significado | Uso no código |
|---|---|---|
| `data_referencia` | Competência (mês ERP) | Filtro de período, série temporal (`buildTemporalSeries`). |
| `criado_em` | Evento de importação | Identificar "última/penúltima importação" (`getLatestImportComparison`, `getTopVariacoesImportacao`). |

A UI **sempre rotula** qual eixo está mostrando. Regra detalhada no `AGENTS.md` e em [`docs/arquitetura/banco-de-dados.md`](../arquitetura/banco-de-dados.md).

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
| `getHistorico(filters)` | Histórico por período + cascata (enriquece dimensão antes de filtrar). |
| `getProductHistory(codigo)` | Drill-through: histórico completo do produto com Δ/Δ%. |
| `getLatestImportComparison(filters)` | Comparação entre as 2 últimas importações (por `criado_em`). |
| `getTopVariacoesImportacao(filters)` | TOP aumentos/reduções entre as 2 últimas importações. |
| `importarHistoricoCustosComLog(payload, {dataReferencia})` | Importação resiliente: normaliza `codigo_produto` com `normalizeCodigoProduto`, valida linha-a-linha, garante produtos no dicionário, upsert em chunks de 400, grava `log_importacao`. |
| `subscribeFiltrosRealtime(cb)` | Assina mudanças em `historico_custos`/`dicionario_produtos`. |
| `signIn/signOut/getCurrentUser` | Supabase Auth (hoje não usados no bootstrap — ver `SEC-03`). |

Matriz de contratos UI→API→Banco: [`docs/arquitetura/matriz-contratos-operacionais.md`](../arquitetura/matriz-contratos-operacionais.md) · camada de serviço: [`docs/arquitetura/services-frontend.md`](../arquitetura/services-frontend.md) · endpoints: [`docs/arquitetura/mapa-endpoints.md`](../arquitetura/mapa-endpoints.md).

> ⚠️ O método `importarHistoricoCustosComLog` segue grande e há caminho legado de payload — ver `MNT-06` antes de refatorar. O item `VAL-01` foi resolvido centralizando `codigo_produto` em `normalizeCodigoProduto()` no preview, payload, API, relatório e drill-through.


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
