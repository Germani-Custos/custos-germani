# Auditoria — Robustez, Tratamento de Erros e Correção

> **Leitura atual — 22/10/2026:** este documento conserva diagnósticos e entregas de suas datas. Estados/prioridades vigentes estão no [backlog único](backlog-priorizado.md); a [reconciliação](backlog-reconciliacao-2026-10-22.md) avalia cada ID e registra o que foi resolvido, continua parcial ou perdeu validade. Checkboxes e recomendações históricas abaixo não autorizam repetir correções ou operações.


## A360-OP-02 / VAL-03 — Validação antes do INSERT (29/10/2026)

**Implementação local; sem publicação ou importação real.** Alias A360-OP-02 = VAL-03. Corrige entrada/validação/persistência de OP e somente o alcance OP de ERR-03. Não encerra ERR-03 no restante do sistema. MNT-OP-01/02/03/05 não foram reabertos nem reimplementados.

### Diagnóstico confirmado

`parseMCAP105` convertia ABC/vazio em `op:null` sem erro; removia qualquer ponto (`2..081` → 2081; `1.2.3` → 123) e aceitava overflow de INTEGER. A API enviava a linha no mesmo INSERT dos válidos. Um NOT NULL rejeita atomicamente o chunk; o diagnóstico posterior identificava a causa sem recuperar os demais. Erros já reconhecidos pelo parser não chegavam à API/log. O fechamento usava concluido mesmo com falha total/parcial; falha de fechamento aparecia somente no debug.

Catálogo remoto consultado na etapa de auditoria: op/origem/cod_estagio INTEGER NOT NULL; produto/descrição/estágio/unidade TEXT NOT NULL; fato com PK e FK nullable para log_importacao_op. Sem chave natural única de OP. Log tem contagens/status TEXT/timestamps, sem coluna de motivos ou chunks. Esta implementação não consultou nem escreveu dados de produção.

### Fluxo corrigido e validação

CSV MCAP105 lido em ISO-8859-1 → parser puro → normalização/validação → rows/errors/origens → preview/competência → API com defesa compartilhada → ID de log confirmado → payload válido → chunks de 400 → INSERT existente → reconciliação/log → recarga existente → motor investigativo inalterado.

OP aceita inteiro sem pontos ou grupos de milhar de três dígitos, com sinal negativo opcional conforme domínio anterior. Validar sintaxe antes de remover separadores. `2.081` → 2081; `2.081.000` → 2081000; zeros à esquerda seguem a conversão INTEGER existente. Vazio/null/texto, frações, exponencial, pontuação malformada e valores fora de −2147483648…2147483647 são rejeitados, nunca substituídos por zero. Zero e negativos continuam permitidos pelo contrato atual. A normalização de produto não é substituída por conversão numérica.

`validateApontamentoOpRow` no módulo puro existente valida OP/origem/estágio/inteiros, obrigatórios e tipos finitos presentes do payload, sem inventar obrigatoriedade de bases previstas nem recalcular indicadores. Parser e API a compartilham. Cada rejeição contém linha física/campo/código/valor original/motivos; vários motivos contam uma linha. `origens` é paralelo aos aprovados; cabeçalhos/brancos e rejeições anteriores não deslocam a linha original. Sem origem fornecida pela chamada direta, retornar linha null e posição do registro, sem chamar isso de linha física. Contexto inválido/repetido/sobreposto é recusado antes do I/O. Metadados não entram no fato.

O preview mostra total de registros de dados reconhecidos, válidos, rejeitados e todos os motivos; antes da execução, persistência/falhas operacionais são explicitamente não executadas. Amostra de cinco válidos não limita processamento. Arquivo vazio/integralmente rejeitado não oferece importação nem cria log/fatos remotos. Chamada direta da API com rejeições pode registrar somente log. Não há tentativa de corrigir/salvar automaticamente um inválido.

### Chunks, resultado e log

Filtrar antes de dividir: 399 válidos + 1 inválido → [399]; 400 + 1 → [400]; 401 + 1 → [400,1]. O exemplo do pedido que dizia simultaneamente “802 válidos + 3 inválidos” e “799 válidos” foi tratado aritmeticamente: **802 registros totais, 3 inválidos → 799 válidos → [400,399]**. Também há prova de **802 válidos + 3 inválidos → total 805 → [400,400,2]**. Nenhum dado é subtraído silenciosamente.

API mantém `{data,error}`, inseridos/erros/logId; acrescenta estado/resumo/chunks/logFinalizado/logError. `tipo:validacao` identifica rejeições; `tipo:operacional` identifica persistência/log. Falha operacional de um chunk válido não vira erro de validação e não tenta INSERT individual/retry. Fontes de cada chunk e diagnósticos residuais completos MNT-OP-01 são preservados. Retorno de erro definitivo permite prosseguir nos chunks seguintes; transporte/resposta incerta interrompe o restante sem presumir rollback.

N = recebidas; V = válidas; R = rejeitadas; I = importadas confirmadas; F = falhas de fatos comprovadas; U = persistência indeterminada; P = não enviadas. Invariantes: **N=V+R; V=I+F+U+P; linhas_erro=R+F**. No caso determinado, P=U=0 e N=I+linhas_erro. `total_linhas=N`, `linhas_importadas=I`, `linhas_erro=R+F`; erro de fechamento não transforma um fato confirmado em rejeição/falha. Cabeçalhos/brancos ignorados não são registros de dados.

Status persistidos no TEXT existente: processando; concluido (integral sem rejeições/falhas); parcial (alguma persistência e rejeições/falhas); rejeitado (nenhum válido); erro (falha operacional sem persistência confirmada); indeterminado (resposta não confiável). Indeterminado mantém finalizado_em NULL, U/P explícitos no retorno e nenhum falso balanço fechado. Sem ID confirmado ou com falha de criação do log, não enviar fatos. Fechamento exige retorno do mesmo ID por select/single; erro/ausência é mostrado sem ocultar os fatos confirmados.

Contagens/status persistem nas colunas existentes. **Motivos por linha, fontes e controle de chunks permanecem transitórios no retorno/UI. Não há trilha detalhada durável no schema atual.** Arquivo rejeitado no preview não cria tentativa remota automaticamente. Esses limites não são resolvidos por migration nesta entrega.

### Concorrência, retry e preservação

Uma trava do controller cobre desde leitura/preview até resultado para upload/change/drop. Após confirmação, conteúdo + competência identificam a tentativa somente na memória desse controller. Nova seleção idêntica reapresenta resultado ou alerta de tentativa sem resposta, sem chamar de novo a API. Cancelar não reserva tentativa e não grava nada. Falha da consulta após persistência orienta repetir só leitura; não reimporta. As mensagens distinguem gravação e confirmação do log.

Isso **não é idempotência persistida**: outras abas/controllers/reloads continuam podendo duplicar fatos, conforme INSERT simples existente. Não há mudança de chave de conflito, sincronização entre usuários ou retry automático. Uma resposta indeterminada exige conferência do lote antes de nova execução; não é correto alegar que o banco necessariamente rejeitou o chunk.

Fatos aprovados, competência/data_referencia, criado_em/default, produto, OP, origem, estágio, unidade, lote e métricas são preservados. A UI continua escolhendo competência mensal no fluxo já existente; não se alterou a identidade temporal. Nenhum indicador ERP é recalculado na importação; core/op-investigation-engine.js, OP×CUSTO, paginação de leitura MNT-OP-05 e parser/fluxos de Custos não foram alterados.

### Testes e verificação

Testes de entrada em tests/spreadsheet-engine.test.js, tests/api-op-import.test.js e tests/ui-import-op.test.js. Cobrem OP válida/texto/ausência/null/espaços, milhar válido/malformado/múltiplos grupos, limites/overflow/fração/exponencial/zero/negativo/zeros iniciais; latin-1/acentos/CRLF/aspas/dialeto existente; linha física; várias causas sem contagem dupla; inválido no começo/meio/fim; todos inválidos; limites 399/400/401 e múltiplos chunks; igualdade dos fatos aprovados; parser real ligado à API; contexto inconsistente; criação/ausência de ID/fechamento de log; falha de um/vários/todos chunks; resposta incerta sem retry; preview/resultado/escape; cancelamento/vazio/concorrência/reapresentação e falha da consulta posterior.

Verificação final: suíte completa **967/967 em 51 arquivos**, com dois workers; **870 casos preexistentes e 97 novos** (26 parser, 58 API, 13 UI). Os três arquivos de entrada somam **128/128** (52/60/16), incluindo regressões. MCAP105/MNT-OP-01/02/03/05 e OP×CUSTO passaram. Lint e typecheck aprovados; build local aprovado com configuração pública de teste, sem publicação; git diff --check aprovado e escopo revisado. Comandos equivalentes aos scripts do package.json: `node node_modules/vitest/vitest.mjs run --maxWorkers=2`, `node node_modules/eslint/bin/eslint.js .`, `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`, `node scripts/build-web.mjs`, `git diff --check`.

Testes usam mocks e os ambientes locais isolados já existentes na suíte. Nenhuma importação produtiva foi usada para validar esta entrega; a prova de persistência remota não é alegada. UI foi verificada por harness automatizado; não houve validação visual em navegador real nesta tarefa. A inspeção de escopo também compara o parser Custos e os métodos API externos ao importador OP com HEAD; sem alteração funcional fora do item.

### Arquivos e limites de escopo

Runtime: somente core/spreadsheet-engine.js, src/services/api.js e view/ui-import-op.js. Testes: os três arquivos de entrada acima. Documentação: README/AGENTS, três manuais, backlog ativo, matriz operacional e este relatório. ROADMAP/VISION não precisaram mudar. Nenhuma alteração em engine investigativo, OP×CUSTO, controller da fila, estilos, parser Custos, banco/schema/RLS/Auth/migration. Sem carga real, commit, push ou deploy. VAL-03 encerrado localmente; ERR-03 continua parcial e a publicação requer autorização própria.

## IMP-PEND-01 — produtos sem cadastro identificáveis (22/10/2026)

- **Causa:** aviso antigo contava linhas, duplicava códigos e usava `state.masters.produtos` (universo analítico com fatos), não o operacional completo. Faltavam identidades e navegação no resultado. A API já tenta criar ausentes: decisão humana explícita manteve essa regra e definiu que o aviso representa o momento anterior ao envio.
- **Mudança:** leitura integral via `getProductMaster()` existente e helper puro por código exato normalizado. Uma lista define warnings, contagem e tabela no Preview/resultado, sem corte em 20/500/1.000. Primeira descrição não vazia do arquivo é preservada; ausência explícita não muda o erro de descrição vazia da linha. Texto escapado contra HTML.
- **Ação:** botão primário leva a mesma lista ao operacional. Painel contextual independente dos filtros abre editor por código sem redigitação. Cadastro atual prevalece se o registro já existir; ausente recebe apenas código/descrição no formulário, sem salvar. Limpar/cancelar/preparar não persistem. Classes existentes mantêm Black + Purple; nenhum CSS alterado.
- **Escopo:** `src/services/api.js`, persistência/garantia legadas, classificações, fatos, Master/OP e schema intactos. `data_referencia` continua competência e `criado_em` importação; payload temporal igual. Não executar importação para validar esse aviso.
- **Testes:** 34 testes relacionados em quatro arquivos passaram: zero/um/múltiplos, duplicidade/normalização, descrição presente/ausente, cadastrados excluídos, conjunto dos warnings = lista = contagem, mais de 1.000 pendentes, escape, erro de leitura, preparo sem salvar e consulta de cadastro já criado. Suíte integral: **599 testes/40 arquivos passaram**, dois workers. **Lint, typecheck, build e git diff --check passaram**. Build local com configuração pública sintética; não publica nem altera variáveis reais.
- **Prova real somente leitura:** harness local do Preview com snapshots reais de Custos (não os bytes do XLS original) e API local lendo Supabase: **6.113 produtos operacionais, 2.268 fatos, 447 códigos distintos, zero pendentes**. Preview sem alerta, cancelado antes do envio. **60 GETs**, zero erros HTTP, transporte bloqueando métodos/fontes fora da allowlist e guarda de persistência não acionada. Leituras integrais de operacional/fatos antes/depois comparadas por SHA-256 em memória foram idênticas. Casos positivos são sintéticos; não foi criado ausente real. Sem INSERT/UPDATE/DELETE/RPC/migration, commit, push ou deploy.

## CUSTOS-DATA-01 — data de referência no histórico do produto (22/10/2026)

- **Causa:** a tabela do drill-through em `view/ui-drill-through.js` formatava `row.criado_em` na segunda coluna, intitulada Importado em. `getProductHistory()` já seleciona `historico_custos.data_referencia`; nenhum campo ou consulta adicional é necessário no produto.
- **Granularidade conferida antes da conclusão:** `ui-controller.js` encaminha código e recorte ativo; a API lê fatos paginados em ordem `data_referencia`, `criado_em`, `id`, enriquece sem agrupar e calcula deltas registro a registro. A UI usa `history.map()`: não há consolidação por mês nem escolha de uma data vencedora. Competência é apenas o rótulo mês/ano.
- **Mudança:** segunda coluna Data com tooltip Data de referência da competência, formatação DD/MM/AAAA do DATE recebido, sem horário, deslocamento UTC ou dia fixo. Ausente/inválida exibe `-`, sem fallback de importação. Competência, uma linha por registro, ordem, custos/deltas, filtros, API e tokens Black + Purple preservados. `data_referencia` continua competência; `criado_em` continua importação/proveniência no payload/banco.
- **Leitura real:** três SELECTs pelo conector Supabase, projeto Custos-Germani (`umpebdovrazzrdndhigc`), sem escrita. Contagem por referência: 2026-04-01: 251; 2026-05-01: 350; 2026-06-01: 357; 2026-07-15: 340; 2026-08-15: 206; 2026-09-15: 206; 2026-10-05: 209; 2026-10-14: 349. Exemplos iniciais com dia 05 para todos os meses não representam os dados reais; o usuário confirmou preservar cada data existente.
- **Prova com registros reais:** produto `1001051` possui oito registros. Controlador local executado em harness Vitest temporário, com as oito linhas reais do SELECT como retorno da API, preservando o payload e sem data/hora de importação no HTML. Pares renderizados: abr. de 2026 → 01/04/2026; mai. → 01/05/2026; jun. → 01/06/2026; jul. → 15/07/2026; ago. → 15/08/2026; set. → 15/09/2026; out. → 05/10/2026; out. → 14/10/2026. O harness temporário foi removido; nenhuma publicação ou validação da UI remota é alegada.
- **Regressões permanentes:** cinco exemplos de dia 05 como fixtures sintéticas, dias reais 01/15/05/14, ano bissexto, referência ausente/inválida sem fallback, conservação das duas linhas de outubro, payload imutável, alertas e recorte ativo. Relacionados e harness real em `TZ=America/Sao_Paulo`: 53/53 (52 permanentes + 1 temporário).
- **Validação final:** `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 589/589 testes em 39 arquivos, sem mudança do timeout global/configuração; `node node_modules/eslint/bin/eslint.js .`, `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` e `git diff --check` passaram. Os 16 testes do controller também passaram com `TZ=UTC`. Build `node scripts/build-web.mjs` passou com URL/chave sintéticas iguais às dos testes, fornecidas somente ao processo (`https://example.supabase.co`, `test-anon-key`); a tentativa sem variáveis foi bloqueada corretamente pela configuração obrigatória. Não há `.env` nem configuração pública local preenchida. Build valida empacotamento local, sem comprovar conexão/publicação. README e três manuais atualizados; VISION/ROADMAP revisados, sem alteração de princípios ou prioridades.
- **Limites:** implementação local; sem mudança de API/DB, schema, migration, histórico persistido, cálculos, regras de competência ou filtros. Sem commit, push ou deploy.

**Leitura vigente:** achados com resolução mantêm evidências originais; LOG-02 e VAL-02 seguem abertos. O critério antigo ERR-02 de hierarquia parcialmente carregada foi sucedido por [CUSTOS-PAGE-01](../arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026): falha de fonte essencial é erro explícito; falha isolada do diagnóstico continua indisponível. Não mudar esse contrato por aplicar a recomendação histórica do corpo.

Ver legenda e formato em [`README.md`](./README.md). Inclui **bugs de correção** (lógica), que costumam ser mais perigosos que os de estilo.

---

## MNT-OP-01 · ✅ Resolvido em 2026-07-27 · Chunk de OP rejeitado por formato de milhar

- **Local:** `core/spreadsheet-engine.js` (`parseMCAP105`) e `src/services/api.js` (`importarApontamentosOp`).
- **Evidência:** o CSV real `MCAP105.CSV` contém 296 linhas; 119 valores de OP chegam com ponto de milhar, como `2.081`, `2.104` e `2.133`. O conversor inteiro, corretamente estrito para valores não normalizados, retornava `null` nesses casos. O schema declara `op INTEGER NOT NULL`, por isso o PostgreSQL recusava o chunk inteiro com HTTP 400.
- **Causa raiz:** o campo `op` não passava pela mesma remoção do separador de milhar já usada pelos números brasileiros do relatório. Não havia ausência legítima de OP nem divergência de schema.
- **Correção aplicada:** exclusivamente no ramo do campo `op`, o parser remove pontos antes da conversão inteira (`2.081` → `2081`). O schema e o contrato API→banco permanecem inalterados; a API continua usando somente `supabase.from()`. Em falha, `logOpImportFailure()` registra chunk, quantidade, primeiro registro, resposta completa (`code`, `message`, `details`, `hint`) e os registros/campo afetados quando o Supabase reporta `NOT NULL`.
- **Critério de aceite:** o parser gera 296 registros sem erro e todos têm `op` inteiro; a importação persiste o mesmo total sem erro de chunk. `data_referencia` segue competência; `criado_em` segue evento de importação.

---

## ERR-01 · 🔴 Alto · `async/await` sem `try/catch` no caminho principal

- **Local:** `view/ui-controller.js` — `init()` (`16-24`), e os `await` encadeados de `runReport()` (`508`, `515`, `524`).
- **Evidência:** `init()` faz `await allowOpenAccess(); await loadMasters({force:true}); await fetchMetadata();` sem `try/catch`. O bootstrap é disparado por `import('./view/ui-controller.js').catch(showConfigErrorScreen)` (`index.html:38`), que só captura **falha de import/config**, não erros lançados depois. As funções da API retornam `{data, error}` (não lançam em erro de query), mas **falhas de rede, CORS ou parse lançam** e sobem sem tratamento.
- **Impacto:** uma instабilidade de rede no carregamento inicial deixa a UI **parcialmente renderizada e travada**, sem feedback ao usuário (os toasts de `loadMasters` só cobrem o `masters.error`, não a exceção).
- **Correção recomendada:** padronizar um wrapper de erro de fronteira. Ex.: envolver o corpo de `init()` em `try/catch` com `showToast('error', ...)` + estado de "falha ao iniciar"; e tratar os `await render*` de `runReport` (que já retornam `false` em erro, mas podem lançar). Não adicionar `try/catch` ornamental em código que não faz I/O — focar nas fronteiras (chamadas de rede, `XLSX.read`, `Chart`).
- **Critério de aceite:** simular falha de rede (DevTools offline) ao abrir o app e ao clicar "Analisar"; a UI mostra mensagem de erro clara e permanece utilizável, sem `Uncaught (in promise)` no console.
- **Status 2026-05-28:** resolvido em `view/ui-controller.js` com helper `normalizeOperationalError`, `executeOperationalBoundary`, fail-fast no carregamento de tabelas de apoio e degradação controlada dos painéis auxiliares do relatório.

---

## LOG-01 · ✅ Resolvido em 2026-05-28 · KPI "Alertas (>5%)" e filtro rápido alinhados

- **Local original:** contagem do KPI em `core/report-engine.js:181` (`totalAlertas = rows.filter(r => r.alert)`); filtro rápido do card em `view/ui-controller.js:539` e `803` (`row.variacao > 5`).
- **Evidência original:** o KPI **Alertas** conta `row.alert`, que é definido por `alertaImportacao` = variação **entre as duas últimas importações** (`variacaoTemporal`, `core/report-engine.js:140-142`). Já o filtro rápido acionado ao **clicar no card** (`data-kpi-filter="alerts"`) filtra por `row.variacao > 5`, que é a variação **do período inteiro** (`inicial → final`). São métricas distintas.
- **Impacto:** o número exibido no card e a quantidade de linhas que aparecem ao clicá-lo **não batem**, minando a confiança do investigador (contradiz o princípio "encontrar o problema em segundos"). Também há assimetria: `> 5` ignora quedas ≤ -5%, embora "alerta" semântico inclua variações relevantes em ambos os sentidos.
- **Correção aplicada (2026-05-28 / LOG-01):** `core/report-engine.js` centraliza a regra em `classifyAlert()`/`isAlertaCritico()` e expõe `filterAlertRows()`. O KPI, filtro rápido, tabela, drill-through, ranking/reincidência e exportação reutilizam essa fonte única.
- **Semântica padronizada:** alerta é `abs(variacaoTemporal) >= 5` entre as duas últimas importações (`criado_em`), sem arredondamento antes da comparação; altas e quedas são equivalentes. `null` significa sem comparativo e não alerta; `undefined`, `NaN` ou payload sem `variacaoTemporal`/`deltaPerc`/`variacaoPercentual` falham rápido com log apenas via `debugLog`.
- **Critério de aceite:** com dados reais, o número do card "Alertas (>5%)" é **igual** à contagem de linhas exibidas ao clicá-lo e ao total exportado quando o filtro rápido está ativo.

---

## LOG-02 · 🟠 Médio · Comparação entre importações pode comparar chunks da mesma importação (dívida conhecida)

- **Local:** `src/services/api.js` — `getLatestImportComparison` e `getTopVariacoesImportacao` (identificação das "2 últimas importações" por `criado_em` distinto); interação com o upsert em chunks de `importarHistoricoCustosComLog` (`IMPORT_CHUNK_SIZE = 400`).
- **Evidência:** ambos os métodos definem "as 2 últimas importações" como os **2 valores distintos de `criado_em` mais recentes** (`[...new Set(rows.map(r => r.criado_em))].slice(0, 2)`). A importação, porém, grava em **chunks de 400 linhas**, e **cada chunk é uma chamada `.upsert()` separada** — logo, uma transação distinta, com `criado_em` (default `now()`) próprio. Uma importação com **mais de 400 linhas** gera **múltiplos `criado_em`** para a mesma competência/lote lógico.
- **Impacto:** quando um único lote lógico ultrapassa 400 linhas, a "Comparação entre importações" e o "TOP variações" podem comparar **dois chunks da mesma importação** (conjuntos de produtos diferentes, mesmo lote) em vez de duas importações reais — produzindo variação média ~0 e listas de TOP incorretas. A base tinha ~601 linhas em 2026-07-13, então o cenário **já é possível hoje** num reimport completo.
- **Por que é silencioso:** não há exceção nem `error`; os painéis renderizam normalmente com números plausíveis, apenas **incorretos**. O investigador não tem sinal de que a comparação não é entre importações reais.
- **Relação com contratos:** toca diretamente a semântica **`criado_em` (evento de importação)** do `AGENTS.md`. A premissa implícita "1 importação = 1 `criado_em`" não é garantida pelo pipeline atual de chunking.
- **Correção recomendada (a decidir — implica mudança de comportamento/contrato, não fazer sem validação):**
  - **(a)** gravar um **`criado_em` único por lote** no payload de `importarHistoricoCustosComLog` (todas as linhas do lote compartilham o timestamp capturado no início da importação), tornando "1 importação = 1 `criado_em`". Atenção: em `onConflict` de reimport isso sobrescreveria o `criado_em` de linhas já existentes, alterando a noção de "penúltima importação".
  - **(b)** agrupar a comparação por **lote/`log_importacao`** (ex.: associar cada linha ao `log_id` da importação) em vez de por `criado_em` distinto, deixando o `criado_em` como está.
- **Critério de aceite:** importar um lote com mais de `IMPORT_CHUNK_SIZE` linhas e confirmar que a comparação entre importações e o TOP variações tratam esse lote como **uma única** importação (não como dois chunks distintos).
- **Status 2026-07-17:** registrada como **dívida arquitetural conhecida**, sem alteração de comportamento. Aguarda decisão entre (a) e (b) antes de implementar. Backlog: `docs/auditoria/backlog-priorizado.md` (Onda 6). Achado derivado da revisão de erros silenciosos que corrigiu o delta monetário (`fix: corrige delta monetário inventado...`, 2026-07-17).

---

## VAL-01 · ✅ Resolvido · Código de produto em notação científica normalizado no fluxo ativo

- **Local original:** fluxo ativo `view/ui-controller.js` (`buildImportPreview`) fazia `String(row[mapping.codigo_produto]).trim()`; a função `normalizeCodigoProduto` existia em `core/spreadsheet-engine.js`, mas não era usada em todos os caminhos ativos.
- **Evidência original:** o Excel podia converter códigos numéricos longos (ex.: `7891234560123`) para notação científica (`7.89123e+12`), e caminhos paralelos gravavam o código corrompido.
- **Impacto:** **integridade de dados** — o mesmo produto entra com códigos diferentes em competências diferentes, quebrando o drill-through, a deduplicação `unique_produto_data` e a análise temporal. Difícil de perceber (silencioso).
- **Correção aplicada (2026-05-28 / VAL-01):** `normalizeCodigoProduto()` foi promovida a função canônica exportada e reutilizada no preview, payload, API de importação, garantia de dicionário, filtros/cascata, relatório, drill-through e comparações/exportação derivadas. A leitura XLSX passou a usar `raw:true` para reduzir mutação por formatação visual do Excel.
- **Critério de aceite:** importar planilha com um código que o Excel exibe como `7,89123E+12`; o registro gravado tem o código inteiro original e o drill-through encontra todo o histórico sob um único código. Linhas com código ambíguo/inválido são bloqueadas por linha, sem derrubar o lote.

---

## VAL-02 · 🟡 Baixo · Ausência de validação por schema reutilizável

- **Local:** validação dispersa: `validateHistoricoRow` (`src/services/api.js:115-130`), checagens inline em `buildImportPreview` (`view/ui-controller.js:213-220`), `preConfirm` do mapeamento (`view/ui-controller.js:334-346`).
- **Impacto:** regras de validação duplicadas e fáceis de divergir (já divergem: o preview classifica "custo total zerado" como warning; a API não). Sem fonte única de verdade das regras de um registro válido.
- **Correção recomendada:** extrair um validador único de "registro de custo" (objeto de regras puro, sem dependência de DOM) usado pelo preview **e** pela API. Uma lib de schema (zod/valibot) é opcional e implica `package.json` (ver `CFG-04`); um validador caseiro centralizado já resolve a duplicação.
- **Critério de aceite:** existe uma única função/módulo que define "linha válida"; preview e gravação produzem o mesmo veredito para a mesma linha.

---

## ERR-02 · 🟡 Baixo · `Promise.all` sem degradação parcial

- **Local:** `src/services/api.js:319-332` (`getMasters`, 5 queries) e `:210-214` (`runDiagnosticoSemAgrupamento`, 3 queries).
- **Evidência:** `getMasters` já trata o caso de erro agregando (`error = a || b || ...`) e retornando estrutura vazia — **bom**. O ponto fino: se **uma** das 5 queries falhar, **tudo** vira vazio, derrubando filtros que poderiam funcionar com dados parciais.
- **Impacto:** indisponibilidade total dos filtros por falha de uma única dimensão. Baixo (geralmente todas falham ou nenhuma), mas degrada a resiliência.
- **Correção recomendada:** considerar `Promise.allSettled` e montar `masters` com o que veio, sinalizando dimensões ausentes (coerente com o banner de órfãos já existente). Opcional — só vale se houver evidência de falhas isoladas em produção.
- **Critério de aceite:** com uma dimensão indisponível, as demais ainda carregam e a UI sinaliza a parcial.
