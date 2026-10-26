# LOG-02 — resultado da identidade de execução de Custos

**Status: PARCIAL — implementação local em 26/10/2026.** Checkout inicialmente limpo no HEAD `7eeafee`. Sem commit, push, deploy, carga ou alteração de produção; sem migration criada/aplicada. Não encerra o item: falta vínculo persistido nos fatos. [Contrato](../arquitetura/identidade-lote-custos.md); [proposta documental separada](../arquitetura/proposta-vinculo-lote-custos.md).

## Auditoria antes de alterar

O fluxo foi inspecionado integralmente antes da edição:

1. `view/ui-import.js`: arquivo → parser/mapeamento → consulta do Cadastro Operacional → Preview → confirmação humana → payload de produto/descrição/custos/data de referência. Só então chama `importarHistoricoCustosComLog`. Preview cancelado não inicia execução.
2. `src/services/api.js`: método cria `log_importacao` com status processando, volumes, início/fim/competência; recebe `createdLog.id`; valida/normaliza linhas; prepara operacional em lote; faz upserts em chunks de 400; atualiza o mesmo log no final.
3. Os fatos enviados têm código, descrição, três custos e `data_referencia`; não contêm lote nem `criado_em` atribuído pelo cliente. O conflito é `codigo_produto,data_referencia`. `criado_em` permanece default/valor existente do banco.
4. Leituras posteriores (`getHistorico`, comparação/TOP, drill-through, contexto OP × CUSTO) não tinham vínculo de Custos com log para consumir. Comparação LOG-03 continua por timestamps elegíveis, conforme contrato anterior.

**Mecanismo equivalente encontrado:** `log_importacao.id` já é BIGINT/IDENTITY/PK, criado uma vez antes dos chunks. Não era necessário gerar UUID, contador global ou uma segunda tabela/identidade. A criação falha ou retorna sem ID, porém o método antigo continuava a preparação/gravação; isso permitia execução sem identidade confirmada.

**Limitação de schema encontrada:** a fotografia versionada `tests/fixtures/acesso-operacional-schema.sql` e os contratos atuais não têm FK/batch equivalente em `historico_custos`; `criado_por` identifica autoria, não execução. `log_importacao` tem ID/status/contagens/horários/usuário/competência, sem manifesto genérico de pertencimento dos fatos. OP tem campo próprio de log, e Master possui outro domínio/log; nenhum deles deve ser reutilizado para fatos de Custos. Nenhuma coluna equivalente foi encontrada nas alterações versionadas posteriores. O catálogo remoto não foi consultado/revalidado nesta tarefa; a proposta exige conferi-lo antes de qualquer futuro DDL autorizado.

Documentos consultados: AGENTS.md, README.md, VISION.md, ROADMAP.md, docs/regras-gerais.md, manuais técnico/operacional e seção de importação do manual de usuário; docs/arquitetura/banco-de-dados.md, matriz-contratos-operacionais.md, comparacao-temporal-custos.md; backlog-priorizado.md, reconciliação (LOG-02) e robustez-erros-validacao.md (LOG-01/LOG-02). Também foram lidos os testes, a fotografia do schema e o saneamento SQL versionado. Skill Supabase/changelog/documentação oficial de INSERT foram consultados; nenhuma dependência/API nova foi introduzida.

## Identidade: onde nasce, onde passa e onde persiste

O método faz um único INSERT no log e exige retorno sem erro com ID positivo válido. Número impreciso é rejeitado; BIGINT textual é mantido integralmente. Falha de leitura/retorno/transportes sem identidade confirmada retorna `{data:null,error}` antes de dimensão/fatos, sem inferir ID por competência ou relógio.

O contexto por chamada é imutável: `batchId:String(logId)` e o ID original do log. Cada objeto de controle de chunk recebe esse `batchId` e seu índice; todos os chunks e o fechamento usam a mesma identidade. ID sugerido pelo chamador não substitui a PK gerada pelo banco. Duas execuções, ainda que tenham mesmo `iniciado_em`, mesma competência ou mesmo arquivo, têm IDs distintos.

Erros de chunk, inclusive rejeição de transporte, são registrados no controle da mesma execução; o método continua com os chunks seguintes sem gerar outro lote ou fazer retry automático. O fechamento usa o mesmo ID. Erro/rejeição no fechamento mantém a identidade e retorna `log_error`/`fechamento_log:'nao_confirmado'`.

Retorno mantém `log_id`, resumo, erros e log_error, acrescentando `batchId`, lista diagnóstica de chunks e rastreabilidade explícita. A UI mostra “Execução no log” e informa que a associação individual dos registros ao lote ainda não está disponível. Se uma resposta legada não tem ID, mostra ausência; não inventa ID por data/timestamp.

**Persistido:** somente a identidade e o ciclo de vida no `log_importacao` já existente. **Não persistido:** associação individual dos fatos e diagnóstico de cada chunk. A requisição de upsert envia somente colunas atuais, sem batchId fictício. O controle em memória e o retorno da execução não são apresentados como FK ou histórico durável.

Portanto, é possível distinguir e acompanhar a execução pelo log; **não é possível reler um fato e provar seu pertencimento ao lote no schema atual**. Por isso o resultado é parcial, mantendo LOG-02 ativo.

## Schema e proposta separada

Reutilizar a PK do log não exige migration. Persistir a identidade no fato exige mudança de schema caso a ausência seja confirmada no catálogo remoto. A [proposta](../arquitetura/proposta-vinculo-lote-custos.md) especifica `historico_custos.log_importacao_id BIGINT NULL` → `log_importacao.id`, sem default, sem backfill por inferência, sem cascata destrutiva e sem alterar a chave de produto/data. Nenhum arquivo SQL de migration foi criado, nenhum DDL foi executado no projeto/Supabase e nenhuma coluna futura foi antecipada no payload.

Legado deve permanecer sem associação comprovada. O FK futuro identificará apenas a execução da versão sobrevivente; não produzirá snapshots anteriores nem histórico de valores substituídos. Não remover upsert, copiar linhas antigas ou unificar `criado_em` para simular lote. Migrar comparadores para lote é outra etapa autorizada: A360-CUS-04 não foi alterado aqui.

## Testes

`tests/api-custos-lote.test.js`: **18 testes novos** com PostgreSQL local/PGlite. O teste extrai as definições das duas tabelas da fotografia versionada, aplica PK/uniquidade no banco efêmero e exercita INSERT/UPDATE/UPSERT reais por um transporte de teste que implementa `from()`. Esse SQL existe somente no teste, sem acesso remoto ou SQL no frontend. A sequência de chamadas de produção continua por chunk, não por linha; os loops SQL do adapter são locais ao teste.

Casos críticos comprovados:

- **801 linhas / três chunks (400/400/1):** uma PK persistida, um INSERT e um fechamento; todos os controles têm o mesmo batchId. Sete chamadas no transporte incluindo preparo do operacional, sem N+1 novo.
- Duas execuções com mesma competência e relógio JS congelado têm o mesmo horário de início, mas IDs distintos. Um ID passado pelo chamador não é reutilizado.
- Execuções de competências diferentes também são distintas; fatos com datas diferentes dentro da mesma execução mantêm uma única identidade, sem forçar datas.
- Segundo chunk com erro retornado ou rejeição: mesmo ID nos três controles, primeiro/último chunks prosseguem; 401 importadas/400 falhas e um log, sem retry ou novo lote.
- Validação de linha continua tolerante; linha inválida não cria identidade extra.
- Criação do log com erro, rejeição ou sem ID bloqueia dimensão/fatos; zero, string vazia, ID negativo/fracionário ou número inseguro não autorizam escrita de fatos.
- BIGINT textual `9007199254740993` é persistido, retornado e usado no fechamento sem perda de precisão.
- Falha/rejeição do fechamento preserva o lote e indica confirmação pendente, sem inserir novo log.
- Reimportação conserva um só fato do mesmo produto/data, ID e `criado_em` anterior; atualiza custo conforme upsert existente. Nenhuma versão artificial ou coluna batch foi criada. A ausência de vínculo permanece explícita, inclusive para legado com timestamp coincidente.

`tests/ui-import.test.js`: **2 testes novos**, além das seis regressões existentes. Resultado mostra ID confirmado/limite de associação; resposta sem ID não transforma competência em lote. Os fluxos de Preview/payload/cancelamento/cadastro pendente permanecem cobertos.

## Validação final

- Suíte completa: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` — **851 testes / 50 arquivos**, sem pulados; **20 testes novos**.
- Lint: `node node_modules/eslint/bin/eslint.js .` — aprovado.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — aprovado.
- Build: `node scripts/build-web.mjs`, com configuração sintética somente no processo — aprovado. Não usa credenciais reais nem certifica conexão/publicação.
- `git diff --check` — aprovado. Arquivos novos também conferidos quanto a whitespace.
- Inspeção de diff: alterações funcionais restritas ao método de importação auditada de Custos e ao texto de resultado em `view/ui-import.js`. Nenhum engine, parser, leitor/comparador, fila, estado, controlador principal, CSS ou migration alterado. Sem DML de produção ou acesso remoto nesta tarefa.

Não houve validação visual em navegador real, importação de produção ou ensaio de RLS remoto. PostgreSQL efêmero exercita identidade/uniquidade/upsert; não equivale a validar permissões da sessão real de produção.

## Arquivos e documentação alterados

Funcionais: `src/services/api.js` (somente `importarHistoricoCustosComLog` e seu comentário), `view/ui-import.js` (resultado).

Testes: `tests/api-custos-lote.test.js` (novo), `tests/ui-import.test.js`.

Documentos: README.md, ROADMAP.md, AGENTS.md; docs/manuais/manual-tecnico.md, manual-operacao.md, manual-usuario.md; docs/arquitetura/banco-de-dados.md, matriz-contratos-operacionais.md, identidade-lote-custos.md (novo), proposta-vinculo-lote-custos.md (novo); docs/auditoria/README.md, backlog-priorizado.md e este relatório (novo). VISION e regras gerais preservados; filosofia/processo não mudam.

## Garantia de não regressão e pendências

A360-CUS-01/02/03/04, LOG-01, OP, OP × CUSTO, fila/TOP-200/exportação/drill-through mantêm seus arquivos/métodos e passaram na suíte integral. `data_referencia` continua competência e `criado_em` o timestamp existente. O ID da execução é um terceiro conceito explícito. Normalização de códigos, custos, chunk de 400 e conflito produto/data permanecem iguais.

LOG-02 continua **PARCIALMENTE RESOLVIDO**, com **22 itens ativos**: P0=1/P1=5/P2=10/P3=6; oito parciais e 14 confirmados. Pendências: conferir catálogo remoto e aprovar vínculo persistido se necessário; ativação futura do escritor/leitores compatíveis; eventual contrato de comparação por lote em tarefa própria. Retenção histórica de snapshots é dívida separada e não foi resolvida. Nenhum outro item foi encerrado, incluindo ERR-03: seus demais problemas de resultado/log permanecem.

Em falha de resposta após COMMIT de um chunk, a confirmação pode ser incerta; contagens atuais seguem as respostas recebidas, sem garantia transacional do envio inteiro. Perda da resposta inicial pode deixar log processando sem ID conhecido pelo cliente; fechamento pode permanecer não confirmado. Não há retomada automática, remapeamento de legado ou associação por proximidade. A identidade do log não deve ser confundida com prova de quais fatos ainda sobrevivem após novas importações. Essas limitações não foram ocultadas como conclusão integral de LOG-02.
