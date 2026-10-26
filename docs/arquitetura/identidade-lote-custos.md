# LOG-02 — identidade da execução de importação de Custos

Contrato local de **26/10/2026**. **Implementação parcial:** identidade da execução confirmada no log e propagada no controle dos chunks; associação persistida lote → fato ainda indisponível no schema versionado. Não encerra LOG-02 nem altera a comparação temporal. [Provas](../auditoria/custos-identidade-lote-validacao.md); [proposta de vínculo persistido](proposta-vinculo-lote-custos.md).

## Três conceitos independentes

- `data_referencia`: competência operacional do fato. Não identifica execução; duas execuções da mesma competência são distintas.
- `criado_em`: timestamp de persistência do fato. Mantém seu default/valor existente; não recebe um timestamp comum para simular lote.
- `batchId`: representação textual exata da PK existente `log_importacao.id`, no contexto desta tabela/projeto. Não é UUID novo, timestamp, nome/hash de arquivo ou contador global do frontend.

## Onde a execução começa e a identidade nasce

Upload/mapeamento/Preview/consulta do operacional continuam em `view/ui-import.js`. Cancelar essas etapas não inicia lote. Após confirmação, a UI monta o payload existente e chama uma vez `api.importarHistoricoCustosComLog`.

A primeira operação desse método é o INSERT em `log_importacao`, status `processando`, com volumes, início/fim e competência selecionada. O banco atribui uma PK BIGINT única, retornada por `.insert(...).select('*').single()`. Somente após confirmação de ID positivo e sem erro começa qualquer leitura/preparação de dimensão ou gravação de fatos. ID numérico fora de precisão segura é rejeitado; BIGINT textual é preservado sem conversão para Number. Não há identidade provisória apresentada como persistida.

Falha de criação, rejeição de transporte, resposta sem ID ou ID inválido retornam `{data:null,error}` e bloqueiam operações seguintes. Se o INSERT tiver sido confirmado no servidor mas sua resposta se perder, pode existir um log `processando` sem fatos desta chamada; não se adivinha seu ID nem se tenta recriar automaticamente. Eventual nova chamada explícita é nova execução, com novo ID.

## Propagação e resultado

Contexto imutável por chamada: `{batchId:String(logId),logId}`. Cada chunk de até 400 registros carrega esse `batchId` no objeto de controle, junto a índice e registros. Não se cria identidade por chunk, competência, erro ou fechamento. IDs fornecidos pelo chamador não são reutilizados como identidade da execução.

**Importante:** a requisição `.upsert()` envia somente os registros com as colunas atuais. `batchId` no controle do chunk **não é uma coluna persistida nos fatos**. Não há campo genérico no log para armazenar associação arbitrária, e não se reutilizam status/timestamp/categoria como manifesto de pertencimento.

Chunks com erro retornado ou rejeição de transporte conservam o ID, contam suas linhas como falhas e permitem os próximos chunks da mesma execução, sem retry automático. Normalização, validação por linha, preparação operacional em lote e conflito `codigo_produto,data_referencia` são preservados. Fechamento atualiza o mesmo `log_importacao.id` uma única vez; falha/rejeição de fechamento conserva o ID e informa `log_error`/confirmação pendente, sem inserir outro log.

Retorno compatível mantém `log_id`, `resumo`, `erros`, `log_error` e acrescenta:

- `batchId`: string da PK confirmada.
- `chunks`: `{batchId,indice,total_linhas,status}` por tentativa; índice inicia em 1; status `gravado` ou `erro`.
- `rastreabilidade.identidade:'log_importacao.id'`.
- `rastreabilidade.persistencia_log:true`.
- `rastreabilidade.persistencia_fatos:false`.
- `rastreabilidade.motivo:'SCHEMA_SEM_VINCULO_LOTE_NO_FATO'`.
- `rastreabilidade.fechamento_log:'confirmado'|'nao_confirmado'`.

A UI mostra “Execução no log” e informa que a associação individual dos registros ao lote ainda não está disponível. Resposta sem identidade mostra ausência explícita, sem fallback por competência, horário ou proximidade. O detalhe de chunks é diagnóstico em memória do retorno; não é um histórico persistente nem prova futura de pertencimento de cada fato.

## Persistência atual e limites

`log_importacao.id` é uma PK BIGINT/IDENTITY já existente. Reutilizá-la não exige migration. `historico_custos` no schema versionado não possui FK para esse log, nem campo equivalente de batch; `criado_por` é autoria, não execução. O vínculo próprio de OP não é reutilizado para Custos. O cadastro Mestre possui outro log/domínio e permanece intacto.

Sem a [migration futura proposta](proposta-vinculo-lote-custos.md), não é possível reler um fato e provar a qual lote ele pertence. Um retorno da API pode correlacionar tentativas de chunks com a execução naquele momento; não cria a relação persistente posterior. Nenhuma associação legada é reconstruída por timestamp/competência/código coincidente. Schema remoto não foi reinspecionado nesta tarefa: a proposta exige conferir seu catálogo antes de eventual DDL aprovado.

O upsert atual continua podendo substituir valores do mesmo produto/data, preservando sua chave. Não são criadas versões, cópias de registros ou histórico artificial. Um futuro FK no fato identificará somente a execução que gravou sua versão sobrevivente; não reterá as versões anteriores.

## Escopo preservado

Nenhuma alteração em `getLatestImportComparison`, `getTopVariacoesImportacao`, LOG-01, A360-CUS-01/02/03/04, motores, parser, fila/prioridade/TOP-200, exportação, drill-through, OP ou OP × CUSTO. As comparações existentes continuam por timestamps elegíveis, com a limitação de chunks documentada. Migrá-las para identidade de lote exige etapa própria autorizada.

Sem RPC, SQL no frontend, acesso paralelo ao banco, estado global novo, função SQL ou N+1. Mesmas operações de log e chunks pela fachada `supabase.from()`. RLS/Auth/grants, dados e schema de produção não foram alterados. Sem commit, push ou deploy. A retenção histórica de snapshots é dívida separada, fora deste contrato.
