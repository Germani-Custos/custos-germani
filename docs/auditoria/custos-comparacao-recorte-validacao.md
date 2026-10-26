# LOG-03 / A360-CUS-04 — comparação pertinente ao recorte

Correção local em **26/10/2026**, checkout inicialmente limpo, HEAD `3bd3a47`. Sem commit, push, deploy, migration ou escrita remota. Nenhuma mudança de banco/schema/RLS/Auth/importação. [Contrato final](../arquitetura/comparacao-temporal-custos.md).

## Causa raiz e comportamento anterior

A [Auditoria 360/reconciliação](backlog-reconciliacao-2026-10-22.md#evidências-e-limites) registrou abril–junho selecionando dois timestamps globais de 19/10. `getLatestImportComparison` e `getTopVariacoesImportacao` primeiro liam `criado_em` global, deduplicavam e cortavam em dois. Somente depois buscavam os fatos e aplicavam o recorte em memória. O agregado devolvia quantidade/média zero para eventos sem qualquer fato elegível; percentual também zero. `renderImportComparisonChart` aceitava dois elementos como comparação válida e convertia ausências com `||0`.

O defeito é confirmado no código atual de partida, sem exigir alteração de competência ou identidade de lote. LOG-01 define o alerta canônico entre registros por importação; não autoriza substituir `data_referencia` por `criado_em`. LOG-02 registra timestamps distintos de chunks do mesmo lote e continua pendente.

## Inspeção do fluxo e preservação

- `src/services/api.js`: `normalizeTemporalFilters`, aplicação do recorte, `getHistoricoWithClientFallback`/`getHistorico`, `lerCompleto`, enriquecimento ERP/cascata, ambos os métodos de comparação e `getProductHistory`.
- `core/report-engine.js`: `buildReportRows` calcula `variacaoTemporal` por dois registros ordenados por `criado_em`; `calculateKpis`, `classifyAlert` e `isAlertaCritico` continuam intactos.
- `view/ui-controller.js`: fila/KPIs derivam de `getHistorico` + motores, antes dos painéis auxiliares. Gráficos recebem o mesmo recorte/cascata. Falha dos gráficos não invalida a fila. Não há dependência dos KPIs no retorno de `getLatestImportComparison`.
- `view/ui-charts.js`: consumidores de comparação/TOP, série por competência e fallback temporal.
- Fila, prioridade, TOP-200, exportação e drill-through não usam o retorno desses painéis como fonte de seus cálculos; seus arquivos não foram alterados. OP/OP × CUSTO e seus motores/contratos também não foram alterados.

## Contrato aplicado e implementação

`applyTemporalFilterToQuery` usa `normalizeTemporalFilters` existente: conjunto explícito de competências tem precedência; intervalo é inclusivo. É reutilizado pelo histórico e pelo contexto privado de comparação, sem duplicar normalização ou converter datas em dia 01.

`lerContextoComparacao`: SELECT integral do recorte em páginas de 500/count exact, ordem TIMESTAMPTZ `criado_em DESC` e `id ASC`, integridade de leitura/IDs, enriquecimento analítico/cascata/produto e só então seleção dos dois timestamps distintos desse universo. O banco preserva microssegundos; ID não é vencedor semântico de snapshot. Não há segunda leitura de fatos por evento nem N+1 por produto. Contextos com falha, página incompleta, contagem divergente/ausente, ID repetido/ausente ou custo total inválido retornam `{data:null,error}`, sem resultado parcial.

Agregado: eventos reais têm quantidade positiva e média de seus próprios fatos. Zero/um evento retorna `estadoComparacao:'insuficiente'`, motivo explícito, imports reais disponíveis e `resumo:null`. Com dois, `disponivel`; base anterior zero mantém delta monetário, mas percentual null/motivo `base_anterior_zero`. Zero observado não é ausência. Não se compara automaticamente competência atual com mês anterior ou seguinte.

### Decisão humana de granularidade do TOP

Foi identificada uma lacuna: o mapa anterior tinha chave somente produto e sobrescrevia o custo de outra data dentro do mesmo timestamp. O usuário escolheu explicitamente **“Comparar cada produto + data_referencia separadamente, alterando a granularidade do TOP.”**

TOP agora mantém cada produto canônico + data completa como chave. Cada lado vem de um único fato original, com ID atual/anterior; não combina custos variável/fixo/total de registros distintos nem agrega datas. Datas diferentes não formam par. Lado ausente ou base zero vai para `semComparativo`, sem percentual inventado. Ausência de todos os pares é insuficiência, não estabilidade. Mesmo produto/data/evento com dois fatos é ambiguidade e erro, sem escolher maior ID. Cinco aumentos/cinco reduções permanecem; empates usam código e data como desempate determinístico. A fila TOP-200 não foi tocada.

**Limitação material:** `UNIQUE(codigo_produto,data_referencia)` e upsert não retêm versões do mesmo par exato. Com o estado atual da persistência, normalmente não há pares exatos do mesmo produto/data em dois eventos; TOP pode ficar sem comparativo mesmo com agregado disponível. A consequência foi comunicada após a escolha humana e registrada no contrato. Não foi criada retenção histórica, relaxada constraint, migration ou leitura de versões inexistentes. Evoluir essa capacidade requer decisão/tarefa próprias.

### Consumidores

Gráfico destrói o resultado anterior antes da leitura e exige disponibilidade explícita, dois eventos e quantidade positiva/média válida. Não renderiza números antigos ou a comparação falsa com duas contagens zero. Percentual sem denominador é descrito como indisponível no tooltip. TOP identifica a data completa do par no texto já existente e oculta resultado insuficiente. Sem novo layout/CSS/tela.

O fallback da série temporal, já existente para menos de dois pontos, passa de badge verde “Estável” para “Base temporal insuficiente”. Fórmulas, agrupamento por competência e seleção do snapshot mais recente dessa série não mudaram.

## Regressão abril–junho versus outubro e evidência não limitada a mocks

`tests/api-comparacao-recorte.test.js` executa a API com transporte de teste `from/select/order/range` sobre **PostgreSQL real local PGlite/WASM**. Filtros, TIMESTAMPTZ, DATE, count, ordenação e paginação são executados pelo PostgreSQL; não são apenas arrays pré-programados de resposta. SQL existe exclusivamente nesse teste local; não foi adicionado ao frontend/API de produção.

Fixture sintética declarada: fatos de abril/maio/junho e fatos de outubro, incluindo os timestamps históricos de outubro 19:58:24.900927 e 19:58:41.800652. Consulta SQL independente reproduz a seleção antiga: os dois últimos timestamps globais não possuem fatos no recorte abril–junho, total zero. A API corrigida seleciona os eventos elegíveis de setembro relativos a abril/maio, ignorando competências outubro; médias 100/80, delta 20, variação 25%. Junho possui evento de importação anterior aos de abril/maio, comprovando que **competência define elegibilidade e importação define ordem**, sem substituir um eixo por outro. Microssegundos .000002/.000001 permanecem distintos e ordenados.

Outro teste tem dois eventos em outubro para fatos com referências 05/06 e 14/06: são elegíveis no recorte junho porque a competência pertence a junho. O TOP não os cruza entre datas distintas. Janeiro–março sem fatos retorna ausência explícita; competência com um evento não fabrica o segundo. Conjunto explícito abril/junho exclui maio, mesmo com intervalo mais amplo fornecido.

A fixture PostgreSQL aplica a constraint real `unique_produto_data` e comprova que duas versões do mesmo produto/data não podem ser inseridas; isso impede afirmar retenção inexistente. Casos positivos de pares retidos e cálculo do TOP são ensaios **em memória** no teste de paginação, explicitamente fora da unicidade atual, para verificar o contrato caso snapshots estejam disponíveis, não para afirmar existência deles em produção.

Não havia cópia local integral dos fatos reais no checkout: o JSON de classificação contém provas/contagens, não o conjunto abril–junho. A tentativa de listar projetos pelo conector Supabase retornou exigência de `link_id` indisponível à chamada, antes de qualquer consulta de dados. **Nenhuma leitura real nova foi realizada nesta tarefa.** A sonda real da auditoria anterior permanece evidência datada; esta entrega não a apresenta como revalidação atual. Não houve obtenção de senha/token ou contorno da conexão.

## Testes e validação

- **19 testes novos** em `tests/api-comparacao-recorte.test.js`: PostgreSQL local, recorte versus global, datas explícitas, importação fora da competência, competência única, zero/um/dois eventos, microssegundos, timestamp empatado, cascata/produto antes da seleção, ausência de pares e unicidade real. Inclui 1.201 fatos em três páginas com filtros repetidos, sem N+1, além de erro/rejeição/página incompleta/count divergente/ID repetido bloqueando ambos os métodos.
- **9 testes novos** em `tests/ui-comparacao-recorte.test.js`: destruição do gráfico anterior, erro/ausência/um evento/resumo ausente/duas contagens zero recusados, zero real e percentual indisponível, data completa/escape no TOP, ocultação sem pares e fallback temporal sem estabilidade verde. DOM controlado e Chart substituído; não é inspeção visual real.
- **3 testes novos** em `tests/api-custos-pagination.test.js`: dois pares do mesmo produto em datas diferentes sem sobrescrita, IDs e valores de cada snapshot; zero atual válido/base anterior zero; ambiguidade dentro de uma mesma chave/evento. Ordem idêntica ao inverter o conjunto. Teste anterior ERP ajustado para não esperar cruzamento entre datas distintas, conforme decisão humana; classificação, fila, exportação e drill-through continuam verificados. Expectativa do resumo inclui o motivo percentual adicional.
- Suíte completa: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` — **831 testes / 49 arquivos**, sem pulados. Inclui LOG-01, fila recém-corrigida, TOP-200, XLSX, drill-through, OP, OP × CUSTO e seus engines. Nenhum limiar/peso/timeout foi alterado.
- Lint: `node node_modules/eslint/bin/eslint.js .` — aprovado.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — aprovado.
- Build: `node scripts/build-web.mjs` com URL/chave sintéticas somente no processo local — aprovado; comprova geração de dist/allowlist, não conexão ou deploy.
- `git diff --check` — aprovado; diff revisado quanto ao escopo.

A validação intermediária da UI detectou que o formatador mensal descartava o dia do TOP; a apresentação foi corrigida para DD/MM/AAAA e seu teste passou. Inspeção visual em navegador/Excel não realizada; não foi apresentada como realizada.

## Arquivos e documentação

Funcionais: `src/services/api.js`, `view/ui-charts.js`.

Testes: `tests/api-custos-pagination.test.js`, `tests/api-comparacao-recorte.test.js` (novo), `tests/ui-comparacao-recorte.test.js` (novo).

Documentação: `README.md`, `ROADMAP.md`, `AGENTS.md`, os três manuais em `docs/manuais/`, `docs/arquitetura/matriz-contratos-operacionais.md`, `docs/arquitetura/comparacao-temporal-custos.md` (novo), `docs/auditoria/README.md`, `docs/auditoria/backlog-priorizado.md` e este relatório (novo). VISION e regras gerais permanecem iguais: não há mudança da filosofia ou processo.

Documentos consultados: AGENTS, regras gerais, README, VISION, ROADMAP, backlog ativo/reconciliação, prova anterior da fila, manuais, matriz operacional, modelo de banco e robustez-erros-validacao (LOG-01/LOG-02). Código dos consumidores, motores e leitores citados acima foi inspecionado. A skill Supabase foi consultada; changelog e documentação oficial de filtros/range conferidos, sem introduzir API nova ou migrar dependências.

## Resultado e pendências

**LOG-03 tecnicamente concluído localmente.** Backlog passa a **22 itens ativos**, P0=1/P1=5/P2=10/P3=6. Não fecha LOG-02 nem qualquer outro item. Lotes lógicos, retenção de snapshots do mesmo par e mutações concorrentes de mesma contagem continuam limites explícitos. Sem nova decisão temporal silenciosa, nova prioridade, comparação automática entre meses ou mudança na fila recém-corrigida. Publicação depende de autorização própria.
