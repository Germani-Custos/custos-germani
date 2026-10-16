# Manual Técnico — Kustos Germani

Guia de desenvolvimento e contratos implementados no checkout, revisado em **16/10/2026**. Antes de mudar, leia [AGENTS.md](../../AGENTS.md), [Regras Gerais](../regras-gerais.md) e [auditoria/backlog](../auditoria/README.md). Evidências de entregas e contagens de testes ficam nos documentos especializados e na [História](../HISTORIA_DO_PROJETO_KUSTOS.md), sem funcionar como instruções atuais.

## 1. Stack e fronteiras

Frontend HTML/CSS/JavaScript ES Modules nativo, sem bundler de aplicação. Bibliotecas CDN são declaradas em `index.html`; Supabase fornece PostgreSQL, Auth e Realtime. O frontend estático é publicado em `dist`; funções Node Vercel em `api/` são empacotadas separadamente.

Node >=22 é necessário para ferramentas/funções. `package.json` tem scripts de qualidade/build, devDependencies e dependencies de servidor: `pg` 8.16.3, `@supabase/supabase-js` 2.117.3 e SheetJS 0.20.3. PGlite 0.3.14 é exclusivo dos testes locais. Essas dependências não introduzem bundler nem cliente administrativo no browser.

## 2. Módulos e responsabilidades

- `index.html`, `assets/style.css`: shell, navegação, dependências CDN e estilos.
- `view/ui-controller.js`: bootstrap, sessão e orquestração.
- `view/ui-charts.js`: comparação/TOP variações/temporal e layout, instâncias em `state.chart`/`state.trendChart`.
- `view/ui-import.js`: upload, mapeamento, preview e importação de Custos.
- `view/ui-filters.js`: cascata, KPIs, chips, ordenação e realtime com debounce.
- `view/ui-table.js`: fila, detalhe e presenter compartilhado com exportação.
- `view/ui-drill-through.js`: histórico do produto no recorte ativo.
- `view/ui-export.js`: seleção de colunas, contexto XLSX, ordenação e sanitização anti-fórmula.
- `view/ui-op.js` / `view/ui-import-op.js`: carga/fila/dossiê de OP e importação MCAP105.
- `view/ui-product-master.js` / `view/ui-cadastro-mestre-erp.js` / `view/ui-cadastro-mestre-preview.js`: operacional, consulta ERP e Preview/aprovação/execução explícita.
- `view/ui-state.js`, `view/ui-dom.js`, `view/ui-utils.js`: estado, referências DOM, formatadores, debounce, escape e `fillSelect` seguro por DOM.
- `view/documentation-controller.js`: leitura/edição dos documentos permitidos.
- `core/spreadsheet-engine.js`: parsing, detecção de colunas e normalização canônica.
- `core/report-engine.js`: cálculos de Custos, cascata, alerta, instabilidade e regime.
- `core/op-investigation-engine.js`: indicadores e decisão combinada de OP.
- `core/product-master-engine.js`: normalização/reconciliação operacional e payload manual.
- `core/cadastro-mestre-*.js`: consulta ERP, Preview, catálogo de famílias, manifesto/revisão, transporte e plano de reconstrução; motores sem I/O.
- `core/heuristic-engine.js`: guardrail somente documental, sem funções exportadas ou sugestão por texto.
- `src/services/api.js`: fachada única Supabase; `services/api.js` reexporta por compatibilidade.
- `src/services/cadastro-mestre-preview.js`: adapter único de arquivo; `cadastro-mestre-execution.js`: HTTP autenticado.
- `api/reconstruir-cadastro-mestre.js`, `scripts/lib/cadastro-mestre-web.mjs` e `scripts/lib/cadastro-mestre-reconstruction.mjs`: handler, autorização e executor administrativo central compartilhado com CLI.
- `scripts/build-web.mjs` / `scripts/generate-runtime-config.mjs`: artefato público por allowlist e configuração pública gerada.
- `sql/`, `tests/`, `types/`, `docs/`: migrations/evidências estruturais, regressões, tipos e documentação.

Novos fluxos UI seguem `create<Fluxo>Controller(deps)`. Manter `ui-controller.js` como orquestrador; a injeção do presenter de exportação permanece o contrato atual (MNT-08 aberto).

## 3. Dados, identidade e temporalidade

Fato `historico_custos`: código, descrição snapshot, custos NUMERIC(18,4), competência DATE e importação TIMESTAMPTZ; chave `codigo_produto + data_referencia` (`unique_produto_data`). `dicionario_produtos` e `categorias_*` fornecem classificação atual. `apontamentos_op` preserva fatos MCAP105 e `log_importacao_op` rastreia lotes. Master ERP e `log_importacao_cadastro_mestre` são separados do operacional. [Modelo detalhado](../arquitetura/banco-de-dados.md).

`data_referencia` filtra competência e sustenta a série temporal. `criado_em` identifica proveniência e os timestamps usados em comparações de importação. Em Intervalo usar faixa; em Comparação passar conjunto explícito, sem preencher meses intermediários. `getProductHistory(codigo, temporalFilters)` recebe o mesmo recorte do relatório; calcula deltas após leitura completa. Série temporal escolhe o registro mais recente por produto/competência e não soma importações da mesma competência.

**LOG-02 permanece:** upserts em chunks de 400 podem produzir vários `criado_em` para um mesmo lote; dois timestamps distintos não garantem dois lotes reais. Não mudar esse contrato por reorganização documental. [Dívida e opções](../auditoria/robustez-erros-validacao.md).

Descrição é exibição, código/FK define relacionamento e UUID é chave técnica. A regra de agrupamento está no modelo especializado; o diagnóstico tolera chave `codigo`/`id`/`cod`. Nunca deduzir categoria pelo texto.

## 4. Contratos da fachada e leituras completas

`getMasters()` tem retorno próprio de dimensões/hierarquia/diagnóstico e `error`; os métodos de dados documentados na [matriz operacional](../arquitetura/matriz-contratos-operacionais.md) usam seus contratos explícitos, em geral `{data,error}`. Não presumir um único formato para todos os métodos.

- `getHistorico(filters)`: fatos com recorte temporal, enriquecidos antes da cascata.
- `getLatestImportComparison(filters)` / `getTopVariacoesImportacao(filters)`: dois timestamps de importação, filtros e dimensão, sujeitos a LOG-02.
- `getProductHistory(codigo, temporalFilters)`: bloqueia código vazio e aplica o recorte recebido da UI; sem recorte fornecido, o método permite histórico integral. A UI passa o mesmo intervalo/competências do relatório.
- `importarHistoricoCustosComLog(payload,{dataReferencia})`: validação por linha, garantia de dicionário em lote, chunking e log.
- `importarApontamentosOp({rows,dataReferencia,arquivoNome})` / `getApontamentosOp(filters)`: gravação com log e consulta de fatos OP; interpretação local.
- `getProductMaster()` / `upsertProductMaster(payload)`: cadastro operacional e edição explícita.
- `getCadastroMestreErp()` / `getCadastroMestrePreviewContext()`: leitura integral ERP/catálogos, sem operacional/fatos/mapa nesses métodos.
- `getCadastroMestreExecutionAvailability()`, `verificarAmbienteReconstrucaoCadastroMestre()`, `executarReconstrucaoCadastroMestre(...)`, `consultarReconstrucaoCadastroMestre(lote)`: HTTP administrativo; diagnósticos e consulta são GET, execução é POST explícito.

`lerCompleto` usa páginas de 500, count exact e ordem determinística; total alterado, página curta, count ausente ou erro bloqueiam resultado parcial. Cadastro operacional compara códigos somente depois de ler integralmente operacional/Custos/OP. Custos pagina hierarquia, catálogos, diagnóstico, histórico, descoberta dos timestamps, comparações e drill-through. Blocos IN de dimensão percorrem todos os códigos; enriquecer antes da cascata. Falha de fonte da hierarquia é erro explícito; diagnóstico isolado continua `indisponivel`. Não é snapshot transacional entre páginas; mutações com mesma contagem podem não ser detectadas. [CUSTOS-PAGE-01](../arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026).

`getTrendsByProduct()` não é usado pela UI atual; a série usa dados já carregados. Paginação de Custos não altera `getApontamentosOp()` nem os motores puros.

## 5. Contratos de cálculo, validação e erro

`normalizeCodigoProduto()` é a única normalização canônica; não substituir por `Number`, `parseFloat` ou trim isolado. Trata notação científica, espaços invisíveis e zeros preserváveis; identidade inválida/ambígua bloqueia a linha.

As cinco colunas de Custos são Produto, Descrição, Custo Variável, Custo Direto Fixo e Custo Total. Aliases incluem produto/codigo/cod/item/cod produto, descrição/desc, custo variavel/custo var/variavel, fixo/direto fixo/custo fixo, total/custo total/vl total/valor total. Parsing remove milhar/R$, converte vírgula e mantém até quatro casas. Preview visual de 20 linhas não limita validação/importação. Colunas extras são toleradas.

`classifyAlert()`/`isAlertaCritico()` e `filterAlertRows()` são canônicos: `abs(variacaoTemporal) >= 5` sem arredondamento prévio, incluindo quedas; `null` é ausência legítima de comparação, `undefined`/NaN falham. Recorte é competência; comparação usa importação. Não calcular delta monetário sem penúltimo registro.

`runDiagnosticoSemAgrupamento()` distingue `{status:'ok',rows:[]}` de `{status:'indisponivel',rows:[],error}`. `categorias_agrupamento` usa SELECT `*` e resolução de chave existente. Falha não significa zero órfãos.

`normalizeOperationalError` e `executeOperationalBoundary` mantêm fronteiras ERR-01 em bootstrap/relatório/handlers de I/O. Erro estruturado: `{message,technical,timestamp,operation}`; detalhes apenas via `debugLog` com flag verbose. Não registrar payloads completos ou credenciais. `fillSelect` permanece na UI, com construção DOM segura. [Auditoria](../auditoria/README.md).

`MAX_VISIBLE_INVESTIGATION_ROWS = 200` limita a renderização da fila já ordenada; listener único delegado no `tbody` resolve detalhe/drill-through. Não recalcular prioridade nesse corte. Exportação usa `state.reportRows`, seleção de `EXPORT_COLUMNS` em ordem canônica e sanitização anti-fórmula; nenhuma consulta extra é necessária.

## 6. Auditoria de OP

`op` é INTEGER NOT NULL. `parseMCAP105` remove ponto de milhar somente desse campo antes de converter. Em erro de insert, `logOpImportFailure()` registra chunk/quantidade/primeiro registro/resposta Supabase (`code,message,details,hint`), com registros/campo associados quando houver violação NOT NULL. Não mudar schema para tolerar formato do CSV.

`analyzeOpInvestigation()` deriva atendimento de produção, desvio de tempo, desvio de produtividade e índice de paradas sem alterar fatos ERP. `% Tempo (ERP)` é conferência do desvio de produtividade com tolerância de 0,2 p.p., sem peso duplicado. `buildOpInvestigationQueue()` ordena por decisão/motivo/magnitude.

`classificacaoInvestigativa` fornece `mereceInvestigacao`, `decisao` (`maxima`, `alta`, `monitorar`, `registrar`, `nenhuma`, `sem_base`) e evidências. Produção entregue + tempo alto + KG/Hora baixo + parada material indica desperdício; déficit de produção na mesma combinação indica impacto máximo. Tempo adicional só se justifica com produção compatível e produtividade praticamente estável. Parada sem impacto é registro. Previsto ausente/zero não autoriza inventar eficiência.

`createOpController` deriva fila/histórico de carga local e filtros/competência; callback de importação renova a carga. Não há período fixo nem refetch por filtro. `data_referencia` é recorte, `criado_em` é rastreabilidade; ambos ficam fora das fórmulas.

## 7. Cadastro Operacional e Master ERP

`dicionario_produtos` segue classificação efetiva de Custos/OP. Edição manual usa `buildManualProductMasterPayload`: agrupamento explicitamente vazio/null grava NULL; omitido preserva. O legado `buildProductMasterPayload`/`reconcileProductMasterImport` preserva vazios e ausentes; o seletor atual não chama `importProductMasterXlsm`.

Consulta ERP reutiliza `lerContextoCadastroMestrePreview`, código exato por `resolverCodigoExato` e normalização existentes; busca/filtros/páginas de 50 são locais, com datasets/estado independentes. Somente `agrupamento_erp_valor` alimenta agrupamento ERP; não executar filtros do arquivo para consultar o universo persistido. [Contrato UX](../ux/cadastro-mestre.md).

Preview atual usa adapter único → filtros ordenados → manifesto/revisão → plano puro. Família é código exato; rótulos iguais entre códigos diferentes são permitidos. CAD-FAM-01 usa `CADASTRO_MESTRE_DADOS_V2`, tupla de nove posições incluindo `familia_descricao_erp`, e propostas/decisões de catálogo separadas das de produto. Conflitos são verificados em todas as ocorrências dos códigos do universo efetivo, sem ampliá-lo ou escolher vencedor. V1/revisões antigas exigem novo Preview.

POST web envia somente dados compactos de todas as linhas, decisões/hash/confirmacao/lote em JSON até 4 MiB. Servidor autentica `getUser`, valida UUID allowlist/origem/gate e regenera manifesto/contexto; executor revalida sob locks. Sem SQL/RPC ou cliente PostgreSQL no browser. Hash do arquivo é proveniência declarada no modo web, sem comprovação independente dos bytes ERP.

Executor único permite Master/log e somente INSERT/patch de descrição de famílias aprovados na mesma transação. Snapshot contém Master completo e imagens anteriores apenas de famílias afetadas; catálogo tem prova integral, preservando ID/código/criado_em existentes. Storage sem sobrescrita é conferido por download/hash antes do DML; CLI mantém `wx`/`fsync`. Falha exige rollback conjunto; resposta de COMMIT perdida exige consulta do lote, sem retry. [Contrato central](../arquitetura/cadastro-mestre-reconstrucao.md), [web](../arquitetura/cadastro-mestre-execucao-web.md) e [famílias](../arquitetura/cadastro-mestre-familias-erp.md) prevalecem sobre os relatos de fases anteriores nos seus escopos explicitamente sucedidos.

## 8. Ambiente, execução local e qualidade

Veja [README_SETUP.md](../../README_SETUP.md). O gerador lê variáveis do processo; copiar `.env` sozinho não as carrega. Após configurar o ambiente, gere runtime-config e sirva a raiz por HTTP. Servidor puramente estático não executa `/api`.

Resolução de configuração: `window.__ENV__`/`window.__RUNTIME_CONFIG__` → `import.meta.env` → meta tags `VITE_*`. URL/chave pública são obrigatórias; verbose controla `debugLog`. Falha de configuração mostra diagnóstico de fontes no bootstrap.

```powershell
npm ci
npm run lint
npm run typecheck
npm test
```

Typecheck usa `tsc --noEmit -p jsconfig.json`. Ferramentas devem vir do lockfile, sem depender de binários globais. Instalação limpa de tooling deve reproduzir CI. Para mudança exclusivamente documental, validar links/referências e `git diff --check`; testes de aplicação não são necessários. Warnings não devem ser silenciados sem análise.

`npm run build` gera `dist` por allowlist e runtime-config público dentro dela; não publica. Segredos, API/executor/scripts/SQL/dependências ficam fora dos arquivos públicos. Funções `/api` são empacotadas separadamente. [Deploy](../arquitetura/deploy.md) e [diagnóstico administrativo](../arquitetura/cadastro-mestre-preparacao-ambiente.md) detalham configuração e recuperação.

## 9. Adicionar telas e editar documentação

Uma view é uma `<section class="view">` alternada por navegação `data-view-trigger`. Adicione HTML, refs em `ui-dom.js` e controller ligado no `init`, preservando o padrão de fábrica e as fronteiras de erro. Componentes: [guia](../ux/componentes.md). Imports relativos usam extensão `.js`; arquivos kebab-case, funções camelCase, constantes SCREAMING_SNAKE_CASE.

Documentação usa `marked`/DOMPurify para render sanitizado, fetch dos Markdown publicados e POST `api/save-doc.js` para GitHub Contents API. Função usa `GITHUB_TOKEN`, `GITHUB_REPO` e `GITHUB_BRANCH` somente no servidor. Allowlist: manuais, auditoria e regras gerais; limite 200 KB. **O handler não valida sessão**, independentemente do login do frontend; não confundir com autorização da reconstrução. Mudança de documentos editáveis exige controller e allowlist, fora desta revisão.

Manuais são procedimentos atuais; narrativa vai para [História](../HISTORIA_DO_PROJETO_KUSTOS.md), contratos detalhados para arquitetura e provas para auditoria. [Índice completo](../arquitetura/indice-documentacao-kustos.md).
