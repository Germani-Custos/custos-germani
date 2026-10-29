# Manual Técnico — Kustos Germani

Guia de desenvolvimento e contratos implementados no checkout, revisado quanto ao acesso em **23/10/2026**. Antes de mudar, leia [AGENTS.md](../../AGENTS.md), [Regras Gerais](../regras-gerais.md) e [auditoria/backlog](../auditoria/README.md). Evidências de entregas e contagens de testes ficam nos documentos especializados e na [História](../HISTORIA_DO_PROJETO_KUSTOS.md), sem funcionar como instruções atuais.

## 1. Stack e fronteiras

O [modelo de acesso vigente](../arquitetura/modelo-acesso-rls.md) exige sessão permanente para ler dados; somente os dois administradores indicados podem importar Custos/OP e criar/editar produtos operacionais. Demais autenticados têm leitura. Não há exclusão operacional, escrita direta de catálogos/Master ou acesso anônimo às tabelas. Reconstrução ERP continua com allowlist/flag e procedimento separados. A autorização é aplicada no banco, mesmo se controles de edição/importação estiverem visíveis na UI de um leitor. Erro de permissão exige conferir sessão/identidade/operação; não conceder ALL, usar service_role no browser ou desabilitar RLS. [Provas e limites](../auditoria/seguranca-rls-validacao.md).


Frontend HTML/CSS/JavaScript ES Modules nativo, sem bundler de aplicação. Bibliotecas CDN são declaradas em `index.html`; Supabase fornece PostgreSQL, Auth e Realtime. O frontend estático é publicado em `dist`; funções Node Vercel em `api/` são empacotadas separadamente.

Node >=22 é necessário para ferramentas/funções. `package.json` tem scripts de qualidade/build, devDependencies e dependencies de servidor: `pg` 8.16.3, `@supabase/supabase-js` 2.117.3 e SheetJS 0.20.3. PGlite 0.3.14 é exclusivo dos testes locais. Essas dependências não introduzem bundler nem cliente administrativo no browser.

## 2. Módulos e responsabilidades

- `index.html`, `assets/style.css`: shell, navegação, dependências CDN e estilos.
- `view/ui-controller.js`: bootstrap, sessão e orquestração.
- `view/ui-charts.js`: comparação/TOP variações/temporal e layout, instâncias em `state.chart`/`state.trendChart`.
- `view/ui-import.js`: upload, mapeamento, preview e importação de Custos.
- Pendências: helper puro `listarProdutosSemCadastro` em `core/product-master-engine.js` cruza código normalizado do arquivo com o operacional integral de `getProductMaster()`. Não usar o universo analítico `state.masters.produtos`. A mesma lista fornece warnings/contagem/tabela do Preview/resultado; sem corte de 20 linhas na lista de pendências. Primeira descrição não vazia é rótulo, nunca identidade. Callback leva contexto a `showImportPendingProducts`, que relê o cadastro e prepara formulário sem salvar; API/payload/garantia legada intactos. [Contrato](../arquitetura/matriz-contratos-operacionais.md#importação-de-custos--pendências-identificáveis).
- `view/ui-filters.js`: cascata, KPIs, chips, ordenação e realtime com debounce.
- `view/ui-table.js`: fila, detalhe e presenter compartilhado com exportação.
- `view/ui-drill-through.js`: histórico do produto no recorte ativo.
- `view/ui-export.js`: seleção de colunas, contexto XLSX, ordenação e sanitização anti-fórmula.
- `view/ui-op.js` / `view/ui-import-op.js`: carga/fila/dossiê de OP e importação MCAP105.
- `view/ui-op-custo.js`: subpainel mensal de OP × CUSTO, adaptação do presenter de prioridade Custo, escolha de inclusão, fila/dossiê e preservação do contexto OP; consome somente a API existente e o engine da Fase 1.
- `view/ui-product-master.js` / `view/ui-cadastro-mestre-erp.js` / `view/ui-cadastro-mestre-preview.js`: operacional, consulta ERP e Preview/aprovação/execução explícita.
- `view/ui-state.js`, `view/ui-dom.js`, `view/ui-utils.js`: estado, referências DOM, formatadores, debounce, escape e `fillSelect` seguro por DOM.
- `view/documentation-controller.js`: leitura/edição dos documentos permitidos.
- `core/spreadsheet-engine.js`: parsing, detecção de colunas e normalização canônica.
- `core/report-engine.js`: cálculos de Custos, cascata, alerta, instabilidade e regime.
- `core/op-investigation-engine.js`: indicadores e decisão combinada de OP.
- `core/op-custo-engine.js`: composição pura OP × CUSTO por código + competência, cobertura e evidência relacional; consumido pela UI mensal, sem consolidação numérica mensal ou prioridade conjunta.
- `core/product-master-engine.js`: normalização/reconciliação operacional e payload manual.
- `core/cadastro-mestre-*.js`: consulta ERP, Preview, catálogo de famílias, manifesto/revisão, transporte e plano de reconstrução; motores sem I/O.
- `core/heuristic-engine.js`: guardrail somente documental, sem funções exportadas ou sugestão por texto.
- `src/services/api.js`: fachada única Supabase; `services/api.js` reexporta por compatibilidade.
- `src/services/cadastro-mestre-preview.js`: adapter único de arquivo; `cadastro-mestre-execution.js`: HTTP autenticado.
- `api/reconstruir-cadastro-mestre.js`, `scripts/lib/cadastro-mestre-web.mjs` e `scripts/lib/cadastro-mestre-reconstruction.mjs`: handler, autorização e executor administrativo central compartilhado com CLI.
- `scripts/build-web.mjs` / `scripts/generate-runtime-config.mjs`: artefato público por allowlist e configuração pública gerada.
- `sql/`, `tests/`, `types/`, `docs/`: migrations/evidências estruturais, regressões, tipos e documentação.

Novos fluxos UI seguem `create<Fluxo>Controller(deps)`. Manter `ui-controller.js` como orquestrador; a injeção do presenter de exportação permanece o contrato atual (MNT-08 aberto).

A apresentação compartilhada está em `assets/style.css`: tokens em `:root`, componentes globais e breakpoints. Login também usa essa folha. Chart.js lê esses tokens somente para cores, sem mudar séries ou cálculos. Cards reutilizam `data-view-trigger`, sem novo router, framework ou dependência. [Contrato visual e manutenção](../ux/componentes.md).

## 3. Dados, identidade e temporalidade

Fato `historico_custos`: código, descrição snapshot, componentes NUMERIC sem escala fixa e total NUMERIC(15,2), conforme catálogo de 29/10/2026, competência DATE e importação TIMESTAMPTZ; chave `codigo_produto + data_referencia` (`unique_produto_data`). `dicionario_produtos` fornece classificação operacional atual. Em Custos, origem/família do Master têm autoridade para códigos presentes nele, com resolução exata via `categorias_*.codigo`; somente códigos ausentes usam origem/família operacional. Agrupamento permanece operacional. `apontamentos_op` preserva fatos MCAP105 e `log_importacao_op` rastreia lotes. Master ERP e `log_importacao_cadastro_mestre` são separados do operacional. [Modelo detalhado](../arquitetura/banco-de-dados.md).

`data_referencia` filtra competência e sustenta a série temporal. `criado_em` identifica proveniência e os timestamps usados em comparações de importação. Em Intervalo usar faixa; em Comparação passar conjunto explícito, sem preencher meses intermediários. `getProductHistory(codigo, temporalFilters)` recebe o mesmo recorte do relatório; calcula deltas após leitura completa. Série temporal escolhe o registro mais recente por produto/competência e não soma importações da mesma competência.

**LOG-02: migration aplicada, ensaio controlado validado, aceite multichunk produtivo pendente.** `importarHistoricoCustosComLog` confirma `log_importacao.id` via `select('id::text')` antes de dimensão/fatos; contexto imutável por chamada. Cada registro do chunk de 400 recebe o FK desse contexto, ignorando lote externo, no mesmo upsert de custos. O retorno do comando confere quantidade/IDs/chaves/FK antes de confirmar linhas, sem N+1 ou patch posterior. API legada sem contexto recusa antes de I/O. `persistencia_fatos:true` é capacidade, não sucesso integral; consultar `confirmacao_fatos`/erros. Não há retry automático; fechamento incerto informa `log_error`. Schema remoto agora tem BIGINT NULL sem default, FK DELETE/UPDATE RESTRICT não diferível e índice parcial não único. Ensaio real validou duas execuções de 349 registros/um chunk cada; não prova multichunk em produção. `data_referencia` é competência; `criado_em` mantém comportamento anterior em conflito; FK é última execução da versão sobrevivente. Total remoto é NUMERIC(15,2), componentes NUMERIC sem escala fixa; data_type=NUMERIC sozinho não prova escala. Precisão/valores preservados. Comparadores e retenção histórica não mudam. [Contrato](../arquitetura/identidade-lote-custos.md), [migration](../arquitetura/proposta-vinculo-lote-custos.md) e [provas](../auditoria/custos-lote-ativacao-validacao.md).

No drill-through, `view/ui-drill-through.js` usa o `data_referencia` já retornado por `getProductHistory()` para Competência (mês/ano) e Data (DD/MM/AAAA). A formatação da segunda coluna interpreta DATE em horário local, sem deslocar o dia por UTC. Não agrupa/deduplica pelo mês: cada registro retornado vira uma linha, preservando 05/10 e 14/10 quando ambos pertencem ao recorte. `criado_em` continua no payload e na ordenação/proveniência; não é exibido nesta coluna nem usado como fallback de data ausente/inválida (`-`). API, filtros e deltas permanecem iguais. [Provas CUSTOS-DATA-01](../auditoria/robustez-erros-validacao.md#custos-data-01--data-de-referência-no-histórico-do-produto-22102026).

Descrição é exibição, código/FK define relacionamento e UUID é chave técnica. A regra de agrupamento está no modelo especializado; o diagnóstico tolera chave `codigo`/`id`/`cod`. Nunca deduzir categoria pelo texto.

## 4. Contratos da fachada e leituras completas

`getMasters()` tem retorno próprio de dimensões/hierarquia/diagnóstico e `error`; os métodos de dados documentados na [matriz operacional](../arquitetura/matriz-contratos-operacionais.md) usam seus contratos explícitos, em geral `{data,error}`. Não presumir um único formato para todos os métodos.

- `getHistorico(filters)`: fatos com recorte temporal, enriquecidos antes da cascata.
- `getOpCustoContext({competencia, periodo?, produto?})`: fontes mensais completas, resultados originais adaptados, cobertura e proveniência; somente SELECT. A UI chama com `{competencia}` e fornece a prioridade Custo pelo presenter existente fora da API/core. Produto não restringe cobertura. [Entrada/saída](../arquitetura/op-custo.md#16-fase-1--núcleo-local-implementado) e [integração UI](../arquitetura/op-custo.md#17-fase-2--apresentação-e-integração-local).
- `getLatestImportComparison(filters)` / `getTopVariacoesImportacao(filters)`: dois timestamps de importação, filtros e dimensão, sujeitos a LOG-02.
- `getProductHistory(codigo, temporalFilters)`: bloqueia código vazio e aplica o recorte recebido da UI; sem recorte fornecido, o método permite histórico integral. A UI passa o mesmo intervalo/competências do relatório.
- `importarHistoricoCustosComLog(payload,{dataReferencia})`: validação por linha, garantia de dicionário em lote, chunking e log.
- `importarApontamentosOp({rows,dataReferencia,arquivoNome})` / `getApontamentosOp(filters)`: gravação com log e consulta de fatos OP; interpretação local.
- `getProductMaster()` / `upsertProductMaster(payload)`: cadastro operacional e edição explícita.
- `getCadastroMestreErp()` / `getCadastroMestrePreviewContext()`: leitura integral ERP/catálogos, sem operacional/fatos/mapa nesses métodos.
- `getCadastroMestreExecutionAvailability()`, `verificarAmbienteReconstrucaoCadastroMestre()`, `executarReconstrucaoCadastroMestre(...)`, `consultarReconstrucaoCadastroMestre(lote)`: HTTP administrativo; diagnósticos e consulta são GET, execução é POST explícito.

`lerCompleto` usa páginas de 500, count exact e ordem determinística; total alterado, página curta, count ausente ou erro bloqueiam resultado parcial. Cadastro operacional compara códigos somente depois de ler integralmente operacional/Custos/OP. Custos pagina hierarquia, catálogos, diagnóstico, histórico, descoberta dos timestamps, comparações e drill-through. Blocos IN de dimensão percorrem todos os códigos; enriquecer antes da cascata. Falha de fonte da hierarquia é erro explícito; diagnóstico isolado continua `indisponivel`. Não é snapshot transacional entre páginas; mutações com mesma contagem podem não ser detectadas. [CUSTOS-PAGE-01](../arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026).

`getTrendsByProduct()` não é usado pela UI atual; a série usa dados já carregados. Paginação de Custos não altera `getApontamentosOp()` nem os motores puros.

LOG-03: `getLatestImportComparison` e `getTopVariacoesImportacao` usam `lerContextoComparacao`: recorte `data_referencia` aplicado em cada página, `criado_em DESC/id ASC`, integridade, enriquecimento/cascata/produto, só então seleção dos dois timestamps distintos elegíveis. Compartilham `normalizeTemporalFilters`/`applyTemporalFilterToQuery` com o histórico. Envelope `{data,error}` preservado, com disponibilidade explícita; zero/um evento não gera resumo, base anterior zero gera percentual null. TOP usa produto + data integral por decisão humana e informa pares ausentes; a unicidade produto/data limita snapshots retidos, sem fabricar comparação. Gráfico limpa resultado anterior e não aceita eventos vazios; fallback temporal sem base não diz Estável. [Contrato completo](../arquitetura/comparacao-temporal-custos.md) e [provas](../auditoria/custos-comparacao-recorte-validacao.md). LOG-02 continua pendente; `data_referencia` é competência e `criado_em` importação/proveniência. Fila, motores, KPIs, exportação e drill-through não dependem desses retornos e não mudaram.

## 5. Contratos de cálculo, validação e erro

`normalizeCodigoProduto()` é a única normalização canônica; não substituir por `Number`, `parseFloat` ou trim isolado. Trata notação científica, espaços invisíveis e zeros preserváveis; identidade inválida/ambígua bloqueia a linha.

As cinco colunas de Custos são Produto, Descrição, Custo Variável, Custo Direto Fixo e Custo Total. Aliases incluem produto/codigo/cod/item/cod produto, descrição/desc, custo variavel/custo var/variavel, fixo/direto fixo/custo fixo, total/custo total/vl total/valor total. Parsing remove milhar/R$, converte vírgula e mantém até quatro casas. Preview visual de 20 linhas não limita validação/importação. Colunas extras são toleradas.

`classifyAlert()`/`isAlertaCritico()` e `filterAlertRows()` são canônicos: `abs(variacaoTemporal) >= 5` sem arredondamento prévio, incluindo quedas; `null` é ausência legítima de comparação, `undefined`/NaN falham. Recorte é competência; comparação usa importação. Não calcular delta monetário sem penúltimo registro.

`runDiagnosticoSemAgrupamento()` distingue `{status:'ok',rows:[]}` de `{status:'indisponivel',rows:[],error}`. `categorias_agrupamento` usa SELECT `*` e resolução de chave existente. Falha não significa zero órfãos.

`normalizeOperationalError` e `executeOperationalBoundary` mantêm fronteiras ERR-01 em bootstrap/relatório/handlers de I/O. Erro estruturado: `{message,technical,timestamp,operation}`; detalhes apenas via `debugLog` com flag verbose. Não registrar payloads completos ou credenciais. `fillSelect` permanece na UI, com construção DOM segura. [Auditoria](../auditoria/README.md).

`MAX_VISIBLE_INVESTIGATION_ROWS = 200` limita a renderização da fila já ordenada; listener único delegado no `tbody` resolve detalhe/drill-through. Não recalcular prioridade nesse corte. Exportação usa `state.reportRows`, seleção de `EXPORT_COLUMNS` em ordem canônica e sanitização anti-fórmula; nenhuma consulta extra é necessária.

`reportView.sortKey = null` representa a ordem investigativa padrão. `getOrderedInvestigationRows` em `ui-filters.js` aplica filtro rápido e ordem ao conjunto completo, sem mutar entrada; é consumido por `applyTableView` e `ui-export.js`. Toda chave explícita é manual, inclusive `variacao`, em ambas as direções. O comparador e `getInvestigationRankScore` ficam em `ui-table.js` e são reexportados por `ui-export.js`. Corpos/pesos preservados: criticidade, regime, magnitude absoluta (`variacaoTemporal ?? variacao ?? 0`), flag canônica de alerta, instabilidade e código `pt-BR`. Zero temporal não usa fallback; null usa. O campo legado `reincidencia` é somente flag de alerta atual, mantido por compatibilidade; não é exposto como memória de eventos. Cabeçalho define chave/direção manual; `investigationSortBtn` restaura null/desc sem alterar filtros ou chamar API. Somente `renderTable` limita a janela a 200; XLSX mantém todas as linhas e registra a ordem aplicada. [Provas LOG-05](../auditoria/custos-top200-validacao.md) e [LOG-04/06](../auditoria/custos-fila-validacao.md). `data_referencia` continua competência e `criado_em` importação/proveniência; implementação local ainda não publicada.

`buildInvestigativeSummary` apresenta somente mudança de regime, direção do período, alerta atual canônico e classificação de instabilidade existentes. Não deduz segunda ocorrência, duração da estabilidade ou oscilação crescente a partir de agregados. O motivo de Monitorar também não afirma recorrência. ReportRow não transporta contagem/proveniência de transições de alerta; até um novo contrato fornecê-las, o presenter não anuncia recorrência, mesmo em séries que a comprovem. XLSX usa `Alerta atual (≥5%)`: SIM/NÃO por `isAlertaCritico`, SEM COMPARATIVO quando `variacaoTemporal:null`. Alerta canônico, cálculos do motor e prioridade permanecem iguais; nenhuma regra paralela ou score novo.

## 6. Auditoria de OP

`op` é INTEGER NOT NULL. `parseMCAP105` valida a sintaxe antes de remover o milhar (`2.081` → `2081`; `2..081` é inválido), mantém o domínio assinado de 32 bits e separa `rows/errors/origens`. `origens` contém a linha física de cada aprovado; cada rejeição tem linha/campo/código/valor original/motivos, contada uma vez. `validateApontamentoOpRow` puro é compartilhado com a API e valida a estrutura de persistência sem interpretar métricas. O dialeto MCAP105, a leitura latin-1 e os fatos aprovados permanecem iguais; não é um parser CSV genérico novo.

`importarApontamentosOp({rows,dataReferencia,arquivoNome,origens,errosLeitura})` valida o contexto e as linhas antes do payload, exige ID do log confirmado, mantém INSERT simples/chunks de 400 somente de válidos e retorna `{data,error}`. `data` conserva inseridos/erros/logId e acrescenta resumo/chunks/estado/logFinalizado/logError. Com total N, válidas V, rejeitadas R, importadas I, falhas comprovadas F, indeterminadas U e não enviadas P: N=V+R; V=I+F+U+P; linhas_erro=R+F. Status: concluido (integral), parcial, rejeitado (só validação), erro (nenhum persistido por falha operacional), indeterminado (resposta não confiável). Indeterminado interrompe os envios, deixa finalizado_em NULL e não chama U de zero/falha comprovada. Falha de fechamento é exposta separadamente, preservando I; fechamento exige retorno do mesmo ID. Detalhes de erros/chunks não são persistidos no schema atual. Em erro residual, `logOpImportFailure()` mantém o diagnóstico MNT-OP-01 (`code,message,details,hint`), sem retry. [Contrato e provas](../auditoria/robustez-erros-validacao.md#a360-op-02--val-03--validação-antes-do-insert-29102026).

A UI bloqueia upload/drop simultâneos e guarda a tentativa por conteúdo/competência no controller: reenvio idêntico reapresenta resultado, inclusive falha/incerteza, sem nova escrita. Não é idempotência persistida: reabrir/recarregar/outro controller pode reimportar e duplicar fatos pelo INSERT existente. Arquivo vazio ou integralmente rejeitado no preview não cria log/fatos; chamada direta com rejeições pode registrar log sem INSERT de fatos. Falha na recarga não autoriza repetir a gravação.

`analyzeOpInvestigation()` deriva atendimento de produção, desvio de tempo, desvio de produtividade e índice de paradas sem alterar fatos ERP. `% Tempo (ERP)` é conferência do desvio de produtividade com tolerância de 0,2 p.p., sem peso duplicado. `buildOpInvestigationQueue()` ordena por decisão/motivo/magnitude.

`classificacaoInvestigativa` fornece `mereceInvestigacao`, `decisao` (`maxima`, `alta`, `monitorar`, `registrar`, `nenhuma`, `sem_base`) e evidências. Produção entregue + tempo alto + KG/Hora baixo + parada material indica desperdício; déficit de produção na mesma combinação indica impacto máximo. Tempo adicional só se justifica com produção compatível e produtividade praticamente estável. Parada sem impacto é registro. Previsto ausente/zero não autoriza inventar eficiência.

`createOpController` deriva fila/histórico de carga local e filtros/competência; callback de importação renova a carga. Não há período fixo nem refetch por filtro. `data_referencia` é recorte, `criado_em` é rastreabilidade; ambos ficam fora das fórmulas.

`getApontamentosOp(filters)` reutiliza `lerCompleto` em páginas de 500/count exact. Repete os filtros existentes antes de cada range e preserva a ordem `data_referencia DESC, estagio ASC, origem ASC, op ASC`, com `id ASC` como desempate. Não libera resultado com página incompleta, erro, contagem ausente/alterada ou IDs repetidos. Enriquecimento usa `lerDicionarioDosCodigos` e catálogos paginados; classificação continua operacional. Não há teto total nem mudança no motor. A paginação não é snapshot transacional; alterações concorrentes com mesma contagem e sem repetição podem não ser detectadas. [Contrato e provas MNT-OP-05](../auditoria/op-paginacao-validacao.md). Implementação local; publicação ainda depende de autorização.

### OP × CUSTO mensal — apresentação local

`createOpCustoController` mantém o controller e o DOM OP montados, ocultando o painel de origem durante o cruzamento. `getOpCustoPeriod` valida De = Até; nenhum mês é inferido da carga, de `criado_em` ou do calendário. A API fornece o contexto mensal completo; o controller acrescenta `getOperationalPriority(resultadoOriginal)` a cada análise Custo e chama `analyzeOpCustoContext`. Não importa narrativa de recorrência, reclassifica sinais ou soma métricas.

Overview/qualidade vêm do contrato completo. B/C exigem escolha explícita antes da fila; filtros locais por texto/cobertura e modos de ordem OP/Custo operam depois, com páginas visuais de 50. Ordenação OP usa a posição original; Custo usa `compareByInvestigativePriority`, sem combinar escalas. Busca de código reutiliza `normalizeCodigoProduto` e chama o engine localmente com `produtoSolicitado`; não produz N+1 nem consulta nova para o dossiê/D.

Nova leitura limpa o resultado e renova a escolha; geração local invalida respostas atrasadas. Erro/incompletude não renderiza fila parcial ou cobertura zero. Retorno conserva os filtros, motivo, produto e dossiê OP no próprio DOM, restaurando foco/rolagem; voltar do dossiê cruzado conserva sua fila. Datas de referência são integrais; importação é proveniência, nunca seleção de mês. [Contrato Fase 2](../arquitetura/op-custo.md#17-fase-2--apresentação-e-integração-local); [validação e limites locais](../auditoria/op-custo-fase2-validacao.md). Publicação não realizada.

## 7. Cadastro Operacional e Master ERP

`dicionario_produtos` segue como cadastro operacional e fonte da OP. A classificação efetiva de Custos é uma projeção em memória, sem sincronização: `classificarCustos()` em `core/custos-classification-engine.js`, usada por `getMasters()` e pelo enriquecimento central do histórico, comparações e drill-through. `masters.dicionario`/`hierarquia` são projeções analíticas, não payloads de escrita. Campos vazios/ambíguos/sem catálogo no Master permanecem sem classificação, sem recuperar o campo operacional. Falhas de leitura bloqueiam a análise; não significam Master vazio. [Contrato CUSTOS-ERP-01](../arquitetura/matriz-contratos-operacionais.md#custos-erp-01--classificação-analítica-em-memória-16102026). Edição manual usa `buildManualProductMasterPayload`: agrupamento explicitamente vazio/null grava NULL; omitido preserva. O legado `buildProductMasterPayload`/`reconcileProductMasterImport` preserva vazios e ausentes; o seletor atual não chama `importProductMasterXlsm`.

Consulta ERP reutiliza `lerContextoCadastroMestrePreview`, código exato por `resolverCodigoExato` e normalização existentes; busca/filtros/páginas de 50 são locais, com datasets/estado independentes. `agrupamento_erp_valor` preserva Agrup. Prod. no modelo, sem coluna na tabela. O renderer reúne `agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao` na quinta coluna, **Agrupamento comercial**, usando ` — ` e escape HTML; campo parcial mostra somente o valor existente e ambos vazios mostram **Não informado**. Os dois campos permanecem independentes no contrato. Não executar filtros do arquivo para consultar o universo persistido. [Contrato UX](../ux/cadastro-mestre.md).

Preview atual usa adapter único → filtros ordenados → manifesto/revisão → plano puro. Família é código exato; rótulos iguais entre códigos diferentes são permitidos. CAD-FAM-01 foi estendido por CAD-COM-01: `CADASTRO_MESTRE_DADOS_V3`, tupla de onze posições incluindo `familia_descricao_erp` e os dois campos comerciais, e propostas/decisões de catálogo separadas das de produto. Conflitos são verificados em todas as ocorrências dos códigos do universo efetivo, sem ampliá-lo ou escolher vencedor. V1/V2 de transporte e revisões antigas exigem novo Preview.

POST web envia somente dados compactos de todas as linhas, decisões/hash/confirmacao/lote em JSON até 4 MiB. Servidor autentica `getUser`, valida UUID allowlist/origem/gate e regenera manifesto/contexto; executor revalida sob locks. Sem SQL/RPC ou cliente PostgreSQL no browser. Hash do arquivo é proveniência declarada no modo web, sem comprovação independente dos bytes ERP.

Agrupamentos ERP são opcionais e independentes da classificação investigativa do Kustos. `agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao` preservam Agrup. Com. e seu rótulo por produto, sem tabela de categoria, FK ou inferência. Coluna comercial presente vazia normaliza para NULL e propõe limpeza do existente; coluna ausente preserva. Campo parcial permanece parcial: código vazio não é reconstruído pelo rótulo, descrição vazia não é completada por outro produto. Demais campos mantêm a preservação de vazios. Manifesto atual: `RECONSTRUCAO_UNIVERSO_V2`; versão anterior é recusada para execução. GET de resultados antigos V1 permanece compatível. Snapshot integral inclui ambos os campos; verificador final e rollback cobrem inserção, atualização e limpeza. Migration aditiva deve existir antes da execução, conferida por SELECT antes de log/snapshot/DML. [Contrato completo](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md).

Executor único permite Master/log e somente INSERT/patch de descrição de famílias aprovados na mesma transação. Snapshot contém Master completo e imagens anteriores apenas de famílias afetadas; catálogo tem prova integral, preservando ID/código/criado_em existentes. Storage sem sobrescrita é conferido por download/hash antes do DML; CLI mantém `wx`/`fsync`. Falha exige rollback conjunto; resposta de COMMIT perdida exige consulta do lote, sem retry. [Contrato central](../arquitetura/cadastro-mestre-reconstrucao.md), [web](../arquitetura/cadastro-mestre-execucao-web.md) e [famílias](../arquitetura/cadastro-mestre-familias-erp.md) prevalecem sobre os relatos de fases anteriores nos seus escopos explicitamente sucedidos.

## 8. Ambiente, execução local e qualidade

Para a primeira carga exclusivamente comercial, `scripts/lib/cadastro-mestre-comercial.mjs#executarCargaComercial` exige manifesto/hash/fotografia/XLS revalidados e cliente dedicado, atualiza somente o par comercial e preserva integralmente timestamps/proveniência/logs. Não chama o executor geral nem altera seus consumidores. O CLI `scripts/validar-carga-comercial.mjs` somente valida, sem conexão ou opção de execução. Entrada/saída, limites 860/162/698/324, transação, locks, provas e rollback estão no [contrato isolado](../arquitetura/cadastro-mestre-comercial-executor-isolado.md). Escrita real ainda bloqueada; `data_referencia` continua competência e `criado_em` importação.

Veja [README_SETUP.md](../../README_SETUP.md). O gerador lê variáveis do processo; copiar `.env` sozinho não as carrega. Após configurar o ambiente, gere runtime-config e sirva a raiz por HTTP. Servidor puramente estático não executa `/api`.

Resolução de configuração: `window.__ENV__`/`window.__RUNTIME_CONFIG__` → `import.meta.env` → meta tags `VITE_*`. URL/chave pública são obrigatórias; verbose controla `debugLog`. Falha de configuração mostra diagnóstico de fontes no bootstrap.

```powershell
npm ci
npm run lint
npm run typecheck
npm test
```

Typecheck usa `tsc --noEmit -p jsconfig.json`. Ferramentas devem vir do lockfile, sem depender de binários globais. Instalação limpa de tooling deve reproduzir CI. Para mudança exclusivamente documental, validar links/referências e `git diff --check`; testes de aplicação não são necessários. Warnings não devem ser silenciados sem análise.

O teste de volume do transporte Master mantém 6.230 linhas, 860 produtos válidos, 4.853 remoções e 517 preservações, com preparação/revalidação reais e HTTP interceptado. Ele tem limite local de 10 s para acomodar a carga concorrente; o timeout global permanece 5 s. Em máquinas com recursos disputados, a suíte completa pode ser executada com `node node_modules/vitest/vitest.mjs run --maxWorkers=2`, sem configurar timeout global nem remover testes. [Investigação e medições CAD-VOL-01](../auditoria/cadastro-mestre-payload-validacao.md#cad-vol-01--timeout-local-do-teste-de-volume-19102026).

`npm run build` gera `dist` por allowlist e runtime-config público dentro dela; não publica. Segredos, API/executor/scripts/SQL/dependências ficam fora dos arquivos públicos. Funções `/api` são empacotadas separadamente. [Deploy](../arquitetura/deploy.md) e [diagnóstico administrativo](../arquitetura/cadastro-mestre-preparacao-ambiente.md) detalham configuração e recuperação.

## 9. Adicionar telas e editar documentação

Uma view é uma `<section class="view">` alternada por navegação `data-view-trigger`. Adicione HTML, refs em `ui-dom.js` e controller ligado no `init`, preservando o padrão de fábrica e as fronteiras de erro. Componentes: [guia](../ux/componentes.md). Imports relativos usam extensão `.js`; arquivos kebab-case, funções camelCase, constantes SCREAMING_SNAKE_CASE.

Documentação usa `marked`/DOMPurify para render sanitizado, fetch dos Markdown publicados e POST `api/save-doc.js` para GitHub Contents API. Função usa `GITHUB_TOKEN`, `GITHUB_REPO` e `GITHUB_BRANCH` somente no servidor. Allowlist: manuais, auditoria e regras gerais; limite 200 KB. **O handler não valida sessão**, independentemente do login do frontend; não confundir com autorização da reconstrução. Mudança de documentos editáveis exige controller e allowlist, fora desta revisão.

Manuais são procedimentos atuais; narrativa vai para [História](../HISTORIA_DO_PROJETO_KUSTOS.md), contratos detalhados para arquitetura e provas para auditoria. [Índice completo](../arquitetura/indice-documentacao-kustos.md).
