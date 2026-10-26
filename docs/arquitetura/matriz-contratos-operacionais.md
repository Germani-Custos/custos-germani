# Matriz de Contratos Operacionais (UI ↔ API ↔ Banco ↔ Engines)

## LOG-03 — eventos de importação pertinentes ao recorte (26/10/2026)

`getLatestImportComparison`/`getTopVariacoesImportacao` → leitura completa com `data_referencia` filtrado em cada página → enriquecimento/cascata/produto → dois timestamps elegíveis por `criado_em DESC/id ASC` → comparação disponível ou insuficiência explícita. Não selecionar eventos globais antes de recortar; zero/um evento não gera resumo nem 0%. Percentual com base anterior zero é null. Erro/incompletude/IDs repetidos não viram dataset vazio. Mesma aplicação temporal por `normalizeTemporalFilters`/`applyTemporalFilterToQuery`, com conjunto explícito de competências preservado.

Por decisão humana, TOP passa a produto canônico + data completa, preservando ID/custo de cada lado e casos sem comparativo, sem sobrescrever outra data. A unicidade produto/data e o upsert limitam a retenção de versões: normalmente não há par exato em dois eventos, e isso deve permanecer ausência, sem inventar histórico. LOG-02 não foi encerrado; timestamp distinto não certifica lote lógico. Fila/prioridade/TOP-200/exportação/drill-through/OP/OP×CUSTO/alerta intactos. Gráfico rejeita disponibilidade falsa e limpa resultado anterior; série sem base não recebe badge Estável. Sem layout novo, schema, writes ou publicação. [Contrato completo](comparacao-temporal-custos.md); [provas](../auditoria/custos-comparacao-recorte-validacao.md).

## OP-CUSTO-F2 — apresentação mensal e integração local (23/10/2026)

`createOpCustoController` → `api.getOpCustoContext({competencia})` → contexto completo/analises originais → prioridade Custo pelo presenter `getOperationalPriority` existente → `analyzeOpCustoContext` → overview/qualidade/escolha de inclusão/fila/dossiê. De e Até devem indicar explicitamente o mesmo mês válido; nenhum mês é inferido. O fluxo mantém OP montado como origem e não usa sua fila filtrada nem TOP-200 para compor o cruzamento.

Cobertura A/B/C é a do engine após ambas as fontes completas. B/C exigem decisão explícita antes da fila, sem preencher ausência com zero; excluir conserva contagens e informa a escolha. A fila oferece modos independentes de prioridade OP/Custo, filtros locais explícitos e páginas visuais de 50 sobre o conjunto completo. Consulta de código e D reutilizam o engine localmente; dossiê não chama API por produto. Erro/integridade/incompletude bloqueia relatório parcial e não vira fonte vazia. Nova leitura renova a escolha; geração invalida resposta obsoleta. Retorno restaura DOM/estado, foco e rolagem OP. Datas integrais e eventos/snapshots preservados; hipóteses OP e relação sem causalidade permanecem distintas.

Implementação local, sem publicação. API/engines/parser/TOP-200/ranking/RLS/Auth/dados/schema permanecem intactos. `data_referencia` é competência; `criado_em` é importação/proveniência. [Contrato Fase 2](op-custo.md#17-fase-2--apresentação-e-integração-local); [validação e limites](../auditoria/op-custo-fase2-validacao.md). A seção F1 abaixo registra o núcleo no escopo anterior sem consumidor UI.

## OP-CUSTO-F1 — contexto mensal e composição sem UI (23/10/2026)

`api.getOpCustoContext({competencia, periodo?, produto?})` → `lerCompleto` nas duas fontes com limites civis inclusivos → validação de IDs por fonte → dimensão operacional compartilhada/catálogos/Master ERP → adaptação das saídas dos motores originais por identidade → contexto completo. Não há chamada de UI nem análise relacional na API. A composição é chamada separadamente por `analyzeOpCustoContext({contexto, analisesOp, analisesCusto, produtoSolicitado})`, sem I/O/configuração/DOM/views.

OP ordena competência DESC/estágio/origem/OP/ID ASC; Custo competência/ID ASC. Páginas de 500/count exact; erro, contagem ausente/alterada, página curta ou ID ausente/repetido bloqueiam o contexto inteiro. Produto opcional é metadado para D, não filtro dos fatos. A/B/C derivam das fontes completas e válidas para vínculo; inválidos ficam em diagnóstico. Fonte indisponível não vira vazia. Enriquecimento compartilha dimensões por blocos IN, sem N+1 e sem misturar a autoridade operacional de OP com a ERP de Custos.

Resultados OP mantêm envelope por ID com prioridade original/posição da fila. Resultados Custo reutilizam `buildReportRows`/`classifyAlert`, sem ranking da UI: `prioridadeOriginal:null` e `qualidadePrioridade:'aguarda_presenter_existente'` até o futuro orquestrador fornecer o presenter já existente. O engine preserva prioridades fornecidas, snapshots, datas e evidências, sem soma numérica de OP, score conjunto ou causalidade. Empates reais de importação ficam ambíguos; comparação por instante conserva microssegundos. `data_referencia` é competência e `criado_em` importação/proveniência. [Contrato e extensão Fase 1](op-custo.md#16-fase-1--núcleo-local-implementado); [provas](../auditoria/op-custo-fase1-validacao.md).

## LOG-05 — prioridade global antes do TOP-200 (23/10/2026)

`getHistorico` integral/recorte/classificação → `buildReportRows` sobre todos os fatos → `calculateKpis`/`state.reportRows` completos → filtro rápido → ordem global ativa → `renderTable` → `slice(0,200)`. Sem chave manual (`sortKey:null`), usar `compareByInvestigativePriority` existente; criticidade > regime > magnitude absoluta > flag de alerta > instabilidade > código. Comparador transferido sem alterar corpo de `ui-export.js` para `ui-table.js` e reexportado pela entrada anterior. Não fazer o corte no motor, API, candidatos ou exportação.

Cabeçalho define chave/direção explícitas e mantém `compareRowsBySort`; aviso visual passa a “ordenação escolhida”. Essa ordem pode deixar alertas negativos fora da janela por escolha do usuário. Desde LOG-04/06, UI e XLSX consomem `getOrderedInvestigationRows` sobre o conjunto completo; toda chave explícita é manual, inclusive variação, e `investigationSortBtn` restaura a prioridade sem mudar o recorte. Só a apresentação corta em 200. XLSX registra a ordem aplicada e nomeia `Alerta atual (≥5%)` com SIM/NÃO/SEM COMPARATIVO. O campo legado interno `reincidencia` do ranking continua indicador canônico de alerta atual por compatibilidade, sem cálculo histórico novo.

Contexto da fila não deduz recorrência, segunda alta/queda ou duração de estabilidade de `variacao` e `variacaoTemporal`. Usa sinais existentes, sem alterar classificação/prioridade; o motivo de Monitorar passa a mencionar variação de menor magnitude, sem alegação de recorrência. ReportRow não prova quantidade/proveniência de transições; até haver contrato próprio, nem séries suficientes autorizam o presenter agregado a anunciar recorrência. [Provas LOG-04/06 — 26/10/2026](../auditoria/custos-fila-validacao.md). Engine/API/OP/OP×CUSTO e limiares intactos; publicação depende de autorização.

Não alterar fórmulas, alertas, prioridades, instabilidade, regime, recortes, consultas, KPIs, dados ou limite 200. `data_referencia` permanece competência e `criado_em` importação/proveniência. Validação real local com 558 fatos/349 candidatos e os cinco alertas em 1–5, sem escrita remota/publicação. [Diagnóstico, comparação e regressões](../auditoria/custos-top200-validacao.md).

## MNT-OP-05 — leitura integral da Auditoria de OP (23/10/2026)

`createOpController.reloadData()` → `api.getApontamentosOp({})` → `lerCompleto(apontamentos_op)` → enriquecimento operacional integral → `allRows` → filtros locais/competência → `buildOpInvestigationQueue` → KPIs/filtro de motivo/fila/dossiê. O callback existente após importação renova a mesma carga; mudar filtro não consulta novamente. Não há exportação de OP neste checkout; a exportação de Custos usa outro fluxo.

O leitor compartilhado usa páginas de 500/count exact. Filtros de `dataReferencia`, estágio, origem, OP e produto são reaplicados antes de cada range. Preservar `data_referencia DESC, estagio ASC, origem ASC, op ASC`; acrescentar `id ASC` para ordem total. Página incompleta, erro, contagem ausente/alterada ou ID repetido retornam erro sem dataset parcial. Dimensão por IN em blocos pelo helper existente; origem/família paginadas por id. Não deduplicar silenciosamente fatos nem criar fonte ERP para a OP.

`core/op-investigation-engine.js`, classificação, fórmulas, decisões e critérios investigativos permanecem intactos. `data_referencia` continua competência; `criado_em` continua importação/proveniência. Paginação não equivale a snapshot transacional: mutações de mesma contagem sem repetição de IDs podem escapar. Implementação e validação local com dados reais, sem publicação/escrita remota. [Provas e aceite](../auditoria/op-paginacao-validacao.md).

## Importação de Custos — pendências identificáveis

Arquivo/mapeamento → `api.getProductMaster()` existente (operacional integral paginado) → helper puro `listarProdutosSemCadastro` → conjunto único de códigos normalizados ausentes → warnings das linhas, quantidade e lista completas no Preview/resultado. Descrição vem do arquivo; primeira não vazia por código, sem inventar ou resolver por texto. Contagem deriva do tamanho da mesma lista; não limitar à amostra de 20 linhas nem usar o universo analítico de Custos como cadastro. Erro de consulta bloqueia validação/envio, sem representar zero.

Por decisão humana, a lista é fotografia **anterior ao envio**, incluindo códigos válidos de linhas com outros erros. Descrição vazia continua invalidando a linha; a lista explicita sua ausência. A API atual `importarHistoricoCustosComLog()` já chama `garantirProdutosNoDicionarioEmLote()`; esse comportamento não foi adicionado, removido ou alterado. O resultado não afirma ausência atual após importar.

**Ver produtos no Cadastro** → callback aciona a navegação `products` existente → `showImportPendingProducts()` relê o operacional e mostra lista contextual independente dos filtros. Ação por código abre editor com dados atuais se existir; caso contrário, prepara código/descrição recebidos, sem categorias inventadas. Preparar/cancelar/limpar não salvam; somente o submit manual existente pode persistir. Sem filtro múltiplo, nova API de escrita, RPC, schema ou alteração de Master/OP/classificações. `data_referencia` continua competência e `criado_em` importação. [Provas IMP-PEND-01](../auditoria/robustez-erros-validacao.md#imp-pend-01--produtos-sem-cadastro-identificáveis-22102026).

## CUSTOS-DATA-01 — apresentação da data no histórico do produto (22/10/2026)

Clique na fila → `renderDrillThrough(codigo, temporalFilters)` → `getProductHistory()` → SELECT paginado de `historico_custos`, incluindo `data_referencia` e `criado_em` → enriquecimento e deltas existentes → uma linha da tabela por registro retornado. Não há agrupamento/deduplicação mensal neste fluxo. Competência permanece mês/ano; a segunda coluna Data exibe o mesmo `data_referencia` completo (DD/MM/AAAA, sem horário ou deslocamento UTC). Datas distintas no mesmo mês permanecem em linhas separadas quando incluídas pelo recorte existente. Ausente/inválida exibe `-`, sem derivar dia ou usar importação como fallback. `criado_em` continua proveniência/ordenação na API; só sua exibição nesta coluna foi substituída. API, paginação, recorte temporal, ordem, deltas, classificação e fatos intactos; sem SQL/RPC no frontend, schema ou migration. [Provas de leitura real e regressões](../auditoria/robustez-erros-validacao.md#custos-data-01--data-de-referência-no-histórico-do-produto-22102026).

## CAD-COM-01 — campos comerciais opcionais do Master ERP (19/10/2026)

`prepararAprovacaoArquivoCadastroMestre` → adapter Agrup. Com./Descrição (Agrup. Com.) → Preview e manifesto RECONSTRUCAO_UNIVERSO_V2 → transporte CADASTRO_MESTRE_DADOS_V3 de onze posições → revalidação servidor/locks → executor central → duas colunas TEXT NULL no Master, cobertas pelo snapshot integral e provas finais. Valores vazios comerciais limpam o existente para NULL; ausente preserva. Versões antigas exigem novo Preview/aprovação; GET de lotes V1 permanece compatível. `getCadastroMestreErp()` continua SELECT integral `*`; consulta e Preview exibem os novos campos separadamente de Agrup. Prod. Sem alteração em UI/API/dimensões de Custos/OP, RLS, agrupamentos operacionais ou fatos. `data_referencia`/`criado_em` preservados. Migration aplicada isoladamente em CAD-COM-PROD-01 (20261019173633), sem carga XLS ou publicação; ambos os campos NULL nos 860 produtos. [Contrato completo](cadastro-mestre-agrupamento-comercial-erp.md).

Leitura vigente em 16/10/2026: CUSTOS-ERP-01 governa a classificação analítica de Custos; CUSTOS-PAGE-01 governa completude de Custos; CAD-ERP-VIEW-01 separa consulta ERP; [CAD-FAM-01](cadastro-mestre-familias-erp.md) estende executor/web com transporte V2, decisões de famílias e DML aprovado de catálogo na mesma transação. Menções a “somente Master/log” abaixo preservam o alcance anterior. Evidências numéricas são datadas; a nova validação somente GET de CUSTOS-ERP-01 está no registro de auditoria vinculado ao seu contrato.

## CUSTOS-PAGE-01 — leituras integrais da Auditoria de Custos (16/10/2026)

O leitor paginado já existente no Cadastro foi movido para `lerCompleto` na mesma API, sem novo módulo ou fonte de verdade. As consultas continuam exclusivamente em `supabase.from()`, sem RPC/SQL no browser. Páginas de 500 usam `count:'exact'`; tamanho esperado, total invariável e erros são conferidos antes de liberar o conjunto. Não existe teto total nem retorno parcial de uma leitura com falha. A paginação não é snapshot transacional; mutações concorrentes que mantenham a mesma contagem não são necessariamente detectadas.

- `getMasters()`: pagina histórico (código+id), operacional (código) e catálogos (descrição+id). Mesma interseção por código, resolução de IDs e construção da hierarquia. Fonte com falha retorna `error`, sem degradação silenciosa para catálogo vazio.
- `getHistorico()`: pagina fatos no mesmo intervalo `gte/lte` ou conjunto explícito `in(data_referencia)`, ordenando competência+id. Busca dimensão em blocos paginados por código, enriquece antes de aplicar a cascata. Nenhuma alteração em fórmulas ou classificação.
- `runDiagnosticoSemAgrupamento()`: pagina as três fontes; erro isolado retorna `indisponivel`, nunca zero válido por truncamento. Grupo continua resolvido pelo helper existente (`id`/`codigo`/`cod`).
- Comparações/gráficos: pagina descoberta de timestamps (importação descendente+id) e fatos das duas importações. Remove apenas a janela fixa de 1.000 linhas; escolha dos dois `criado_em` distintos, recorte temporal, enriquecimento e cálculos permanecem. LOG-02 não foi corrigido nesta etapa.
- `getProductHistory()`: pagina o mesmo recorte do drill-through, preservando ordem por competência/importação e acrescentando id como desempate. Deltas permanecem calculados após a leitura completa.

`getApontamentosOp()`, importadores, Master ERP/reconstrução, classificações e cálculos puros não foram alterados. `getProductMaster()` reutiliza o mesmo leitor extraído, mantendo seu contrato. `getTrendsByProduct()` não é chamado pela UI atual e fica fora do escopo. `data_referencia` continua competência e `criado_em` evento de importação; nenhum valor é escrito.

### Validação

25 testes novos em `tests/api-custos-pagination.test.js`: volumes acima de 1.000, zero/múltiplos exatos/última página, ordenação com empate, famílias/códigos após a primeira página, diagnóstico completo, erros/rejeições/contagem ausente ou alterada/página curta, intervalo e competências explícitas, enriquecimento antes dos filtros, gráficos e drill-through completos, sem classificação ou escrita. Mocks temporais existentes foram adaptados para páginas/count, mantendo as mesmas expectativas.

Sonda local do código alterado contra Supabase real, com transporte restrito a GET em allowlist de cinco tabelas: **72 GETs, zero erros HTTP**. Não carrega credencial administrativa ou sessão e não consulta OP/Master ERP. Resultado: **6.113 produtos operacionais, 1.370 fatos, 437 códigos distintos, 437 encontrados, zero ausentes, 437 com origem, 151 com família, zero com agrupamento**. API retornou hierarquia com 437 vínculos, 12 origens, 18 famílias, histórico de 1.370 fatos e diagnóstico `ok` com 437 pendências. Comparação SHA-256 em memória das leituras integrais de operacional/fatos antes/depois foi idêntica. Nenhum valor de classificação foi preenchido; sem escrita/migration/deploy/env/commit.

Suíte local: **523 testes/37 arquivos passaram** com dois workers; **lint, typecheck, build e `git diff --check` passaram**. Build executado com configuração pública sintética, sem alterar ambiente real. Após publicação futura autorizada, é necessário recarregar a aplicação; esta validação usa o módulo local, não modifica o deploy atual. Worktree contém somente API, testes e documentação desta tarefa; sem commit.

## Consulta separada ERP — CAD-ERP-VIEW-01 (15/10/2026)

Cadastro → seleção Operacional/ERP → `createCadastroMestreErpController` → `api.getCadastroMestreErp()` → leitor integral existente via `supabase.from()` (`dicionario_master_produtos`, `categorias_origem`, `categorias_familia`, páginas de 500/count exact/ORDER BY) → núcleo puro de consulta → busca/filtros/páginas locais de 50/total encontrado. Sem operacional, fatos ou mapa nessa API. Origem/família resolvem por código exato; agrupamento é `agrupamento_erp_valor`. Estados independentes; cadastro/edição operacional e Preview existentes mantidos. Nenhum acesso de escrita, reconstrução, SQL/RPC ou alteração de eixos temporais. [Contrato UX](../ux/cadastro-mestre.md#cad-erp-view-01--duas-visões-no-cadastro-15102026).

## Cadastro operacional — CAD-OP-PAGE-01 (15/10/2026)

UI `createProductMasterController.reload` → `getProductMaster()` → SELECTs paginados de `dicionario_produtos`, códigos de `historico_custos` e de `apontamentos_op`, 500 linhas/count exact/ORDER BY código → normalização/deduplicação existentes → tabela operacional e contador global. Catálogos de origem/família/agrupamento continuam auxiliares. Falha/truncamento/contagem alterada retorna erro, não total parcial. Aviso nomeia cadastro operacional. Contrato de retorno e edição operacional mantidos; não consultar/sincronizar Master ERP nesta carga, nem alterar fatos, classificação ou `data_referencia`/`criado_em`. [Contrato e regressões](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026).

## Diagnóstico — CAD-ENV-01 (09/10/2026)

Administrador → `api.verificarAmbienteReconstrucaoCadastroMestre()` → cliente HTTP GET `/api/reconstruir-cadastro-mestre?verificar=1` com sessão → getUser/allowlist → Storage getBucket e PostgreSQL BEGIN READ ONLY/contexto/guardas/privilégios/policies/ROLLBACK. Nenhum executor/lote/upload/DML. Disponível com flag false; POST verificar é recusado. Frontend estático limitado a dist, administrativo só na função. [Contrato de preparação](./cadastro-mestre-preparacao-ambiente.md).

## CUSTOS-ERP-01 — classificação analítica em memória (16/10/2026)

`getMasters()` lê integralmente fatos, operacional, Master ERP e catálogos. `classificarCustos()` projeta todos os códigos com Custos, inclusive sem linha operacional, antes das opções e cascata. A presença do código normalizado no Master decide a fonte de origem/família: presente usa `origem_cod`/`familia_cod` resolvidos exclusivamente por `categorias_*.codigo` exato → FK `id`; ausente usa `origem_id`/`familia_id` operacional. A UI usa as descrições oficiais dessas FKs. Vazio, código sem correspondência ou ambíguo no Master produz null, nunca fallback por campo, texto ou ID. Identidade duplicada/inválida do Master bloqueia a projeção.

`getHistorico`, `getLatestImportComparison`, `getTopVariacoesImportacao` e `getProductHistory` usam o mesmo núcleo. O enriquecimento ocorre antes da cascata; `buildReportRows` e os gráficos temporais consomem o histórico enriquecido, e XLSX consome `state.reportRows` com o filtro rápido/ordenação existentes. Drill-through mantém o código clicado na fila e o recorte temporal, acrescentando a classificação efetiva ao retorno.

`masters.dicionario`/`hierarquia` representam a projeção analítica, sem substituir registros persistidos. `agrupamento_cod` continua operacional; descrição preserva a regra de cada fluxo (snapshot do fato no drill-through); a consulta Master seleciona somente código/origem/família. Não consulta agrupamento ERP nem sincroniza dimensões. Diagnóstico de agrupamento continua operacional. OP, Cadastro, Preview, reconstrução e escritas não mudam. Nenhum schema, migration, tabela, RPC ou SQL no frontend.

Todas as fontes usam o leitor integral existente: páginas de 500/count exact, ordem total, IN operacional em blocos sem teto total. Erro/incompletude/contagem alterada impedem sucesso parcial; falha do Master não vira fallback. Leituras independentes não são snapshot transacional; ausência de cache mantém as consultas completas a cada chamada. A classificação reflete o cadastro atual, sem histórico de categorias. `data_referencia` permanece competência; `criado_em` permanece importação; recortes e cálculos não mudam.

Este contrato sucede, apenas para origem/família analíticas de Custos, a exclusividade operacional dos contratos anteriores. Evidências, testes, limitações e arquivos em [auditoria CUSTOS-ERP-01](../auditoria/custos-classificacao-erp.md).

## Contrato vigente — CAD-PAYLOAD-01 / CAD-EXEC-WEB-01 (09/10/2026)

Preview/decisões/download permanecem locais. `getCadastroMestreExecutionAvailability()` faz GET autenticado à função, sem conexão PostgreSQL/lote. O adapter retorna `dadosExecucao` junto de manifesto/revisão. Após aprovação integral e confirmação digitada, `executarReconstrucaoCadastroMestre({dadosExecucao,manifesto,revisao,lote})` envia dados ERP compactos/decisões/hash/confirmacao/lote via POST à função Node Vercel, sem original/manifesto/contexto duplicados. Hash dos dados integra o manifesto antes da aprovação; servidor autentica/autoriza, valida dados, relê contexto e recalcula filtros/manifesto antes de chamar o executor central. Executor repete a validação sob locks. DML somente Master/log, snapshot independente privado conferido, transação/rollback/provas centrais. `consultarReconstrucaoCadastroMestre(lote)` faz GET com SELECT administrativo do resultado, sem retry; CAD_UI local não comprova lote persistido. Não há SQL/RPC/segredo administrativo no frontend ou carga de produção nesta entrega. [Payload e limites de confiança](./cadastro-mestre-execucao-web.md#cad-payload-01--transporte-sem-o-xls-bruto). Sucede transporte bruto e a limitação de CLI das entregas abaixo, preservando `data_referencia` (competência) e `criado_em` (importação) dos fatos.

## Contrato vigente — CAD-REBUILD-01 (09/10/2026)

UI → `getCadastroMestrePreviewContext()` (SELECT `*` paginado do Master e catálogos via `supabase.from()`) → adapter existente → manifesto `RECONSTRUCAO_UNIVERSO_V1` com universo, alterações e remoções → decisões/download locais. Sem escrita, DELETE, RPC ou SQL no frontend. Produtos fora do universo não são preservados no Master; vazios preservam campos de pertencentes.

Comando administrativo → mesmo adapter/contexto sob locks → revisão integral idêntica → snapshot em arquivo e JSONB do log → transação PostgreSQL dedicada → INSERT/UPDATE/DELETE somente Master e DML de auditoria no log → provas finais/COMMIT. Erro reverte Master inteiro; lote falhou mantém snapshot, resposta de COMMIT incerta não é repetida automaticamente. [Contrato completo](./cadastro-mestre-reconstrucao.md). Sem schema/migration/RLS, alteração operacional ou mudança nos eixos `data_referencia` (competência) e `criado_em` (importação).

Os contratos de fases abaixo são históricos nos pontos explicitamente sucedidos. A antiga ausência de executor/conexão ao navegador refere-se às primeiras entregas; a execução atual da UI usa função Node autorizada e o mesmo executor central, conforme CAD-EXEC-WEB-01/CAD-FAM-01. O executor não é importado no browser.

Matrizes-base e relatos de fases abaixo: origem em maio/outubro, com atualizações contratuais indicadas no topo. Revisão de organização: **2026-10-16**, sem alteração do contrato de runtime.

## Contrato atual — CAD-XLS-01 / seletor do Cadastro

`createProductMasterController.bind()` → `createCadastroMestrePreviewController.bind()` → arquivo XLSM/XLSX/XLS → `api.getCadastroMestrePreviewContext()` (SELECT integral de Master ERP/categorias) → `prepararAprovacaoArquivoCadastroMestre` → modal de Preview/aprovação local. Decisões usam `decidirOperacoesCadastroMestre`; download usa `obterOperacoesAprovadasCadastroMestre`, mantendo `execucao_permitida:false`, sem escrita. Falha de SELECT bloqueia Preview.

Esta integração sucede as entregas 3.1/3.3 descritas abaixo. O seletor deixa de chamar `importProductMasterXlsm`; API/reconciliação legadas permanecem intactas. `getProductMaster`/`upsertProductMaster` continuam na tabela/edição manual operacional, fora do Preview ERP. Sem executor, schema, migration ou mudança temporal. [Contrato da tela](../ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

## Contrato adicional — Cadastro Mestre / Fase 3.1

`api.getCadastroMestrePreviewContext()` → SELECT paginado de `dicionario_master_produtos` (código, descrição, origem/família ERP e agrupamento ERP bruto), `categorias_origem` e `categorias_familia` (códigos exatos). Retorno `{data,error}`, sem fallback para contexto vazio em falha. Não há chamada nova UI→API nesta fase.

`previewArquivoCadastroMestre(arquivo,contexto,XLSX)` → adaptador de arquivo → `criarPreviewCadastroMestre(linhas,contexto)` puro → resumo/produtos/ausentes/excluídos/erros, sem escrita ou projeção operacional. [Contrato completo](./cadastro-mestre-preview.md).

Os métodos legados `getProductMaster`/`upsertProductMaster` continuam ligados a `dicionario_produtos`; não devem ser usados como fonte do novo Preview. A dimensão operacional segue necessária para Custos/OP; não substitui o Mestre ERP no novo contrato.

**CAD-UX-01 (2026-10-08):** `upsertProductMaster(payload)` interpreta `agrupamento_cod: ''`/`null` explicitamente informado como remoção e envia `NULL` via `buildManualProductMasterPayload`. Campo omitido preserva o atual. `importProductMasterXlsm` continua usando `buildProductMasterPayload`/reconciliação ERP, preservando vazios e agrupamento investigativo. Sem alteração de schema, Master ERP, mapa ou fatos; `data_referencia` e `criado_em` mantêm seus eixos. [Contrato de UX](../ux/cadastro-mestre.md).

## Objetivo

### Contrato adicional — Fase 3.3

`prepararAprovacaoArquivoCadastroMestre(arquivo,contexto,XLSX)` → leitura dos mesmos bytes + hashes → `criarManifestoCadastroMestre` puro → manifesto e revisão PENDENTE. `Agrup. Prod.` é o alias oficial para valor ERP, sem ponte Kustos. Decisões individuais/em lote e extração de aprovadas são exclusivamente locais. Não há nova chamada UI→API, escrita, executor ou alteração das telas do runtime. [Contrato](./cadastro-mestre-aprovacao.md).

Eliminar desalinhamentos entre camadas para preservar velocidade investigativa, rastreabilidade e previsibilidade operacional.

## Convenções

- `✅`: contrato atendido e validado.
- `⚠️`: contrato atendido com ressalva operacional/documental.
- `❌`: desalinhamento crítico (corrigido nesta auditoria).

## 1) Matriz UI → API

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| UI → API | `api.getMasters()` | Retornar `{origens,familias,agrupamentos,produtos,dicionario,hierarquia,diagnostico_sem_mapa,error}` | Sim | ✅ |
| UI → API | `api.importarHistoricoCustosComLog(payload,{dataReferencia})` | Import resiliente + `log_importacao` + erros linha a linha + `codigo_produto` normalizado por `normalizeCodigoProduto()` | Sim | ✅ |
| UI → API | `api.getHistorico(filters)` | Retornar histórico por intervalo ou duas competências explícitas, com `data_referencia` + `criado_em` + dimensões para cascata | Sim | ✅ |
| UI → API | `api.getProductHistory(codigoProduto, temporalFilters)` | Drill-through no mesmo intervalo ou competências explícitas do relatório, com delta e delta% apenas entre elas | Sim | ✅ (fail-fast para código vazio; sem meses intermediários em comparação) |
| UI → API | `api.getLatestImportComparison(filters)` | Selecionar eventos após recorte de competência/cascata; média/delta com disponibilidade explícita | Sim | ✅ local (LOG-03; LOG-02 continua aberto) |
| UI → API | `api.getTopVariacoesImportacao(filters)` | Pares produto + data completa entre eventos elegíveis; ausência/base zero explícitas | Sim | ✅ local (LOG-03; retenção de snapshots limitada) |
| UI → API | `api.importarApontamentosOp({rows,dataReferencia,arquivoNome})` | Registrar lote e inserir apontamentos de OP; `op` já normalizada para inteiro pelo parser | Sim | ✅ (MNT-OP-01) |
| UI → API | `api.getApontamentosOp(filters)` | Consultar fatos da Auditoria de OP por competência, estágio, origem, OP e produto; a interpretação é local | Sim | ✅ (MNT-OP-02) |
| UI → API | `api.getOpCustoContext({competencia})` | Ler mês completo de OP/Custo, com paginação/integridade; UI apresenta o resultado do engine sem N+1 ou writes | Sim | Implementado localmente (OP-CUSTO-F2), sem publicação |
| UI → API | `api.getProductMaster()` / `api.upsertProductMaster(payload)` | Consultar e manter `dicionario_produtos` operacional; Custos usa a projeção CUSTOS-ERP-01 | Sim | ✅ (TAREFA-3) |
| UI → API | `api.getCadastroMestrePreviewContext()` | SELECT integral/paginado do Master ERP/categorias para XLSM/XLSX/XLS, sem escrita ou fallback vazio | Sim | ✅ (CAD-XLS-01) |
| UI → API | `api.getCadastroMestreErp()` | Consulta integral Master/origens/famílias, sem operacional/fatos/mapa; estado ERP independente | Sim | ✅ (CAD-ERP-VIEW-01) |
| UI → HTTP | `api.getCadastroMestreExecutionAvailability()` / `api.verificarAmbienteReconstrucaoCadastroMestre()` | GET autorizado; disponibilidade sem conectar ao PostgreSQL e diagnóstico somente leitura | Sim | Contratos web/diagnóstico acima |
| UI → HTTP | `api.executarReconstrucaoCadastroMestre(...)` / `api.consultarReconstrucaoCadastroMestre(lote)` | POST explícito V2 após aprovação/confirmação; GET de resultado, sem retry | Sim | CAD-EXEC-WEB-01 / CAD-FAM-01 |

## 2) Matriz API → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| API → DB | `historico_custos`: `codigo_produto, descricao, custo_variavel, custo_direto_fixo, custo_total, data_referencia, criado_em` | Fato temporal completo com `codigo_produto` canônico | Sim | ✅ |
| API → DB | `dicionario_produtos`: `codigo_produto, descricao, origem_id, familia_id, agrupamento_cod` | Dimensão de categorização | Sim | ✅ |
| API → DB | `log_importacao`: `status,total_linhas,linhas_importadas,linhas_erro,iniciado_em,finalizado_em,data_referencia` | Rastrear execução de import | Sim | ✅ |
| API → DB | `upsert` em `historico_custos` com `onConflict(codigo_produto,data_referencia)` | Deduplicação por competência | Sim | ✅ |
| API → DB | Consultas por importação com `ORDER BY criado_em` explícito | Temporalidade de import garantida | Sim | ✅ |
| API → DB | `apontamentos_op`: `origem,op,cod_produto,descricao,cod_estagio,estagio,unidade,...` | Eventos operacionais; `op` é inteiro obrigatório, `data_referencia` é competência e `criado_em` é importação | Sim | ✅ (MNT-OP-01) |
| API → DB | `log_importacao_op` | Rastrear total, linhas importadas/em erro e fechamento do lote de OP | Sim | ✅ |

## 3) Matriz report-engine → API/dados

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| report-engine | `origem_id/familia_id/agrupamento_cod` em memória | Filtro cascata correto | Sim | ✅ |
| report-engine | `criado_em` para `ultimaAtualizacao` | Distinção competência x importação | Sim | ✅ |
| report-engine | `data_referencia` para série temporal | Semântica temporal correta | Sim | ✅ |
| op-investigation-engine | `analyzeOpInvestigation(row)` | Derivar indicadores, decisão, motivo, provável causa e evidências sem alterar fatos do ERP | Sim | ✅ (MNT-OP-02 / MNT-OP-03) |

## 4) Matriz Importação → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| importação | validação por linha (`validateHistoricoRow`) | Falha parcial não derruba lote; código inválido é bloqueado sem persistência ambígua | Sim | ✅ |
| importação | chunking (400) no upsert | Escala operacional | Sim | ✅ |
| importação | tolerância a colunas extras (normalização) | Não quebrar lote por excesso de coluna | Sim | ✅ |
| importação | produtos sem dicionário → criação/órfão visível | Sem silenciamento; criação usa o mesmo código normalizado do histórico | Sim | ✅ |
| importação OP | erro de `.insert()` por chunk | Log obrigatório de chunk, primeiro registro e resposta Supabase; violação `NOT NULL` identifica registros/campo | Sim | ✅ (MNT-OP-01) |

### Normalização de código de produto (`VAL-01`)

- Função canônica: `normalizeCodigoProduto()` em `core/spreadsheet-engine.js`.
- Pontos cobertos: leitura XLSX com `raw:true`, preview, payload, API de importação, garantia de dicionário, filtros/cascata, relatório, drill-through, comparação entre importações e exportação derivada da fila investigativa.
- Fail-fast: código vazio, decimal ambíguo ou não inteiro em identificador numérico gera erro de linha; o lote segue com as demais linhas válidas.
- Temporalidade preservada: a normalização altera apenas a chave de negócio `codigo_produto`; `data_referencia` e `criado_em` mantêm seus significados separados.


### Regra canônica de alerta (`LOG-01`)

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| report-engine | `classifyAlert()` / `isAlertaCritico()` | Fonte única para alerta `abs(percentual) >= 5` sem arredondamento prévio | Sim | ✅ |
| report-engine/UI | `filterAlertRows()` | KPI **Alertas (>5%)**, filtro rápido e exportação retornam o mesmo conjunto lógico | Sim | ✅ |
| UI drill-through | `deltaPerc` via `isAlertaCritico({deltaPerc})` | Destaque visual usa o mesmo threshold absoluto, inclusive quedas | Sim | ✅ |
| exportação | fila `alerts` | Exporta exatamente as linhas do filtro rápido ativo | Sim | ✅ |

Temporalidade: a seleção do relatório continua por `data_referencia`; o alerta compara última vs. penúltima importação no eixo `criado_em`. `null` é ausência legítima de comparativo e não alerta; `undefined`/`NaN` falha rápido.

## 5) Matriz Exportação → report-engine/UI

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| exportação | abas `Contexto` + `Fila Investigativa` | Handoff operacional; popup seleciona colunas da fila a partir do estado já carregado, sem nova consulta | Sim | ✅ |
| exportação | ordenação automática por criticidade (quando sem ordenação manual) | Priorização investigativa | Sim | ✅ |
| exportação | metadados de período e temporalidade (`data_referencia` x `criado_em`) | Rastreabilidade | Sim | ✅ |

## Desalinhamentos encontrados e correções aplicadas

1. **Filtro cascata inconsistente** em `getLatestImportComparison` e `getTopVariacoesImportacao`.
   - Causa: query em `historico_custos` sem `origem_id/familia_id/agrupamento_cod` (campos da dimensão).
   - Correção: enriquecimento via `dicionario_produtos` antes de aplicar cascata.

2. **Ausência de fail-fast no drill-through** (`getProductHistory`).
   - Causa: `codigoProduto` vazio gerava consulta ambígua.
   - Correção: validação explícita + erro operacional padronizado.

3. **Inconsistência de retorno e erro contextual** em métodos críticos da API.
   - Causa: respostas heterogêneas e propagação direta de erros sem contexto operacional.
   - Correção: padronização de retorno `{ data, error }` + `OperationalContractError` com `details` e causa em `getHistorico`, `upsertHistoricoCustos`, `getLatestImportComparison`, `getTopVariacoesImportacao` e `getProductHistory`.


4. **Divergência do KPI/filtro de alertas (LOG-01)**.
   - Causa: KPI contava `row.alert` por `variacaoTemporal`, enquanto filtro rápido/exportação usavam `row.variacao > 5` do período.
   - Correção: helper canônico `classifyAlert()`/`isAlertaCritico()` e `filterAlertRows()` aplicados a KPI, filtro, tabela, drill-through, ranking e exportação.

## Contrato padronizado de erro (operacional)

Formato mínimo esperado em todos os métodos API:

```js
{ data: null, error: Error }
```

- Erros de contrato interno usam `name = "OperationalContractError"` e `details` para diagnóstico.
- Sem fallback mágico silencioso quando parâmetro obrigatório faltar.
- Diagnóstico de órfãos deve distinguir `{ status: 'ok', rows: [] }` (nenhum órfão encontrado) de `{ status: 'indisponivel', rows: [], error }` (não foi possível validar produtos sem agrupamento).

## Checklist de prevenção contínua

- [ ] Toda query com filtro cascata deve operar em dataset com campos de dimensão resolvidos.
- [ ] Toda query temporal deve explicitar eixo (`data_referencia` vs `criado_em`).
- [ ] Todo método UI→API deve estar listado e testado após mudança de assinatura.
- [ ] Todo payload de escrita deve ser validado por whitelist de colunas da tabela alvo.
- [ ] Todo novo fluxo com `codigo_produto` deve chamar `normalizeCodigoProduto()` e falhar explicitamente se o retorno for vazio.
- [ ] Toda mudança de contrato deve revisar `README.md`, `VISION.md`, `ROADMAP.md` e esta matriz, atualizando cada documento afetado conforme sua função, sem repetir changelog. Ver [governança](../regras-gerais.md).


## 6) Saneamento de schema Supabase (2026-05-25)

- `historico_custos` alinhada com payload/API: `custo_variavel`, `custo_direto_fixo`, `custo_total`, `data_referencia`, `criado_em`.
- `unique_produto_data` garantido para deduplicação por competência.
- Órfãos de agrupamento tratados com fallback explícito `SEM_AGRUPAMENTO` (sem mascaramento).
- Índices críticos de investigação e drill-through reforçados.
- View `vw_produtos_orfaos_agrupamento` adicionada para auditoria contínua.

## 7) Contrato investigativo da Auditoria de OP (MNT-OP-02 / MNT-OP-03)

- **ERP:** `apontamentos_op` é a fonte imutável de quantidades, tempos, produtividade, parada e `% Tempo`; não há migration nem escrita de indicadores calculados.
- **Kustos:** `core/op-investigation-engine.js` calcula `atendimentoProducaoPct`, `desvioTempoPct`, `desvioProdutividadePct` e `indiceParadasPct`; acrescenta `mereceInvestigacao`, `decisao` e `evidencias`; `view/ui-op.js` consome somente esse contrato para fila, filtro e dossiê.
- **Regra central:** nenhum indicador isolado decide o motivo ou a prioridade. Produção entregue + tempo alto + KG/Hora baixo + parada material indica desperdício; com déficit de produção, indica paradas com impacto e prioridade máxima. Tempo alto com KG/Hora praticamente estável só não alerta se a produção adicional explicar o tempo; parada material sem impacto em produção, tempo e produtividade é registro sem prioridade.
- **Conferência:** `% Tempo (ERP)` é comparado ao desvio de produtividade com tolerância de 0,2 p.p., sem adicionar uma segunda penalidade. Divergência pede conferência do apontamento na origem.
- **Temporalidade:** `data_referencia` continua sendo competência do recorte e `criado_em` é mostrado no dossiê como evento de importação; ambos ficam fora das fórmulas de execução da OP.

## SEC-03 — contrato transversal de acesso

Leituras de dados exigem usuário permanente autenticado e compartilham o universo existente. Escritas atuais de Custos/OP e Cadastro Operacional exigem um dos dois UUIDs administrativos indicados; não há exclusão de cliente. UPSERT de Custos/operacional conserva INSERT+UPDATE; OP conserva INSERT e logs INSERT+UPDATE. O trigger invoker continua autorizado a escrever no mapa somente em contexto de trigger e admin, sem abrir edição direta. Reconstrução ERP mantém seu mecanismo administrativo independente. [Matriz tabela × operação × role](modelo-acesso-rls.md); [provas](../auditoria/seguranca-rls-validacao.md). data_referencia é competência e criado_em importação/proveniência, preservados.
