# LOG-02 — proveniência persistida: preparação local e validação

**Estado posterior de 29/10:** em nova janela com writers pausados, a migration foi aplicada e duas importações reais de um chunk foram validadas (lotes 30/31, 349 linhas cada). LOG-02 permanece PARCIAL: múltiplos chunks em produção pendentes por decisão humana. [Provas da ativação](custos-lote-ativacao-validacao.md). O relatório abaixo preserva a fase anterior de preparação, em que o usuário não autorizara aplicação. **Correção de diagnóstico:** custo_total remoto é NUMERIC(15,2), componentes NUMERIC sem escala fixa; a inferência anterior a partir de data_type=NUMERIC era incorreta. Nenhuma precisão foi alterada.

Data: **29/10/2026**. **Status final do item: PARCIAL.** Implementação/migration/testes preparados no checkout; **migration NÃO aplicada ao Supabase**. O usuário escolheu a conexão **Supabase** e havia confirmado pausa em 26/10; em 29/10, ao retomar, informou **“Não; concluir somente a preparação local”**. Essa decisão limita a execução atual: nenhuma aplicação remota, importação real, ativação ou publicação.

Não usar o writer novo contra o schema antigo. Não existe fallback silencioso para NULL. A próxima janela exige controle dos writers, revalidação do catálogo/backup, aplicação autorizada e ativação de clientes compatíveis. Não encerrar LOG-02 somente por testes locais.

## 1. Diagnóstico e catálogo confirmado

O fluxo anterior já confirmava `log_importacao.id` e mantinha `batchId` nos controles dos chunks, mas a whitelist do upsert não enviava lote: schema sem coluna/FK. A API legada `upsertHistoricoCustos` ainda fazia escrita direta sem contexto. Portanto controle de execução não provava pertencimento persistido.

Consultas de catálogo somente leitura no projeto **Custos-Germani / umpebdovrazzrdndhigc**, reconfirmadas em **29/10/2026, 16:36:50 UTC**:

- `log_importacao.id`: BIGINT GENERATED ALWAYS AS IDENTITY, PK. Tabela de logs existente reutilizada, sem nova identidade/tabela.
- `historico_custos.id`: BIGINT GENERATED ALWAYS AS IDENTITY, PK; `unique_produto_data` = UNIQUE(codigo_produto,data_referencia), confirmada e preservada.
- Não há `log_importacao_id` ou relação equivalente nos fatos. `criado_por` referencia Auth e não identifica execução.
- `codigo_produto` e `criado_em` são nullable no remoto; custos são NUMERIC sem precisão/escala fixadas. A documentação antiga descrevia NOT NULL/NUMERIC(18,4); fixture histórica usa IDENTITY BY DEFAULT. Diferenças registradas e preservadas, sem saneamento. Teste novo cobre os tipos/nulabilidades e ALWAYS reais.
- RLS existente e 21 policies; importação/edição operacional dos dois UUIDs indicados continuam sob SEC-03. Nenhuma mudança de RLS/Auth/grants.
- Função `inserir_custo(text,text,numeric,date)` invoker, EXECUTE apenas postgres/service_role, sem acesso PUBLIC/anon/authenticated. Corpo histórico ainda menciona coluna antiga; não foi executado, corrigido ou reexposto.

Contagens exatas: Custos **2.481**, log de Custos **29**, OP **1.469**, log OP **8**, operacional **6.113**, mapa **299**, Master ERP **860**, famílias-base **21**, origens **50**, famílias **103**, agrupamentos **34**, log Master **5**. Não confundir estimativas de `list_tables` com COUNT exato.

## 2. Preservação e backup

Backup histórico local verificado, fora do repositório: `C:\Users\aprendizcustos\.codex\backups\custos-germani\log02-2026-10-26T18-55-58.610Z\antes.json.gz`.

- 76.466 bytes; SHA-256 `dbfa8fd7b1a21b04139d5d6d16955e59f18914e89e1997ccda866ceafe57d80e`.
- Contém registros integrais de Custos/log e catálogo/provas das 12 tabelas, não apenas contagens. Gzip relido/decodificado localmente.
- Em 29/10, COUNT e SHA-256 ordenado de todas as **12 tabelas** coincidiram com o backup de 26/10. Provas calculadas sobre `to_jsonb` canônico ordenado, sem DML.
- Hash Custos: `13aff03e949326fed756335ba7519c03c80dcc79d1d17103e03ee4e512f3bf14`; hash log: `441716043a5e6dafb9bb0f3860c464f3bf1810814cf77c96b9cf6cd3f2f83301`.

Isso é evidência datada de leitura, **não** backup futuro suficiente nem ensaio remoto da FK. Antes de aplicação em outra janela, renovar/revalidar backup e provas. Nenhum dado foi inserido/atualizado/excluído no Supabase nesta tarefa; não houve DDL remoto ou migration executada.

## 3. Migration criada e ensaiada

[`sql/20261026185939_custos_proveniencia_lote.sql`](../../sql/20261026185939_custos_proveniencia_lote.sql), nome gerado por **Supabase CLI 2.121.0 / migration new custos_proveniencia_lote**, em 26/10. Timestamp local conservado; **sem versão remota aplicada** nesta tarefa.

Cria somente:

- `historico_custos.log_importacao_id BIGINT NULL`, sem default/backfill;
- FK `historico_custos_log_importacao_id_fkey` → `log_importacao(id)`, DELETE/UPDATE RESTRICT, validada e não diferível;
- índice não único parcial `idx_historico_log_importacao_id` nas referências IS NOT NULL.

Transação, locks explícitos de log/fatos, espera de lock 5s/execução 30s. Guardas recusam PK/tipo/UNIQUE divergentes ou reaplicação/coluna já existente. Não tenta descobrir schema modificando-o. Não altera chave funcional, custos, datas, log, defaults anteriores, funções, triggers, RLS ou Auth. Reversão não foi executada; eventual remoção futura exige preservar vínculos e revisão aprovada.

**FK funcionando somente comprovada no PostgreSQL isolado.** Produção continua sem essa coluna/FK. O teste de migration prova preservação integral dos fatos legados/NULL, ausência de default, IDENTITY ALWAYS, UNIQUE, índice e recusa de drift. FK inexistente/referência quebrada e DELETE/UPDATE do log referenciado são rejeitados localmente.

## 4. Fluxo do lote e garantia de aplicação

`log_importacao.id confirmado → contexto imutável por chamada → batchId textual → todos os chunks de 400 → log_importacao_id no payload → mesmo upsert dos custos → retorno ID/chave/FK conferido`.

O ID nasce no banco uma vez por chamada, antes de dimensão/fatos. Sem ID válido/erro na criação, nada disso começa. ID é textual (`select('id::text')`), sem perda de precisão BIGINT; número inseguro é recusado. Campo de lote vindo de linha/opção é ignorado. Sem estado global mutável ou lote por timestamp/chunk/falha.

O upsert devolve ID/FK textuais, código e data no próprio comando. A API confere quantidade, IDs únicos, chaves únicas esperadas e igualdade com o contexto antes de confirmar linhas. Sem consulta adicional por registro/N+1, sem update posterior do vínculo. A notação `::text` é seleção/cast da Data API, não SQL bruto no frontend ([contrato PostgREST](https://docs.postgrest.org/en/v14/references/api/tables_views.html#casting-columns)).

Retorno preserva `log_id`, `batchId`, `chunks`, `resumo`, `erros`, `log_error`; `persistencia_fatos:true` declara capacidade do writer novo e não sucesso integral. `confirmacao_fatos`: `confirmada`, `parcial_ou_nao_confirmada` ou `sem_fatos`. UI apresenta essa distinção. Dados ausentes/erros nunca recebem lote falso ou NULL de compatibilidade.

## 5. Upsert, legado, falha e retry

Conflito continua **codigo_produto + data_referencia completa**. Uma segunda execução atualiza custo e FK da versão sobrevivente juntos, inclusive valor igual; não cria linha artificial, snapshot ou retenção. `data_referencia` permanece competência; `criado_em` conserva default/timestamp anterior em conflito, não é reatribuído ao horário do novo lote. ID técnico do fato permanece.

Última escrita efetiva vence: teste intercala duas execuções do mesmo produto/data e libera a execução com ID menor por último; a versão final fica com seu custo e seu lote, sem escolher maior ID/horário. Outros produtos/datas conservam o contexto correto. Legado não tocado permanece NULL; reimportação observada vincula somente a versão atual, sem reconstruir origem histórica.

Erro de chunk conserva contexto e permite próximos chunks. Rollback SQL real no teste conserva custo/FK anteriores juntos. Retorno ausente/divergente não confirma sucesso nem prova rollback: COMMIT pode ter ocorrido. Contagens não confirmadas são conservadoras, não prova de quantas linhas fisicamente sobreviveram a uma resposta perdida. Falha de fechamento conserva lote e informa `log_error`, sem segundo log.

**Não foi criada política de retry automático.** O transporte isolado ensaia reenvio do mesmo payload/lote após rollback conhecido, sem nova chamada de criação de log. Não há botão/API de retomada nem garantia de retry após COMMIT incerto; isso continua fora do escopo. Nova chamada explícita é outra execução, mesmo com timestamp/competência iguais. Não repetir automaticamente em produção após resposta incerta.

## 6. Writers: inventário e tratamento

1. `src/services/api.js#importarHistoricoCustosComLog`: atualizado localmente, vínculo no upsert/retorno e contexto único; ativação remota pendente.
2. `view/ui-import.js`: caller oficial; não gera lote, apresenta confirmação/pendência. Publicação não realizada.
3. `src/services/api.js#upsertHistoricoCustos`: bloqueado antes de I/O, erro `CONTEXTO_LOTE_OBRIGATORIO`, inclusive lote arbitrário no payload. Nenhum consumidor ativo localizado na UI.
4. `services/api.js`: reexport, herda os mesmos comportamentos, sem writer paralelo.
5. `sql/inserir_custo.sql` e definição histórica na fixture: mesmo writer antigo, fora do fluxo oficial, EXECUTE cliente remoto já revogado por SEC-03; não chamar/reexpor/RPC. Uso administrativo futuro exige revisão própria; privilégio owner/service_role não é bloqueado pela aplicação.
6. `sql/ajustar_precisao_historico_custos.sql`: transforma valores sem contexto; não executar como intervenção avulsa após ativação. Arquivo histórico preservado, não adaptado nem aplicado.
7. `sql/2026-05-25_saneamento_operacional_schema.sql`: artefato histórico, sem reexecução autorizada.
8. `sql/validar_acesso_operacional_rls.sql`: sonda histórica com rollback; não executada remotamente. Ensaios locais de autorização permanecem isolados; não são writer oficial liberado.
9. Testes `api-custos-lote`, `custos-proveniencia-schema`, `acesso-operacional-rls`: schema real da migration em PGlite; fluxo oficial usa log real, legado NULL deliberado. Nenhum write remoto.
10. `api-comparacao-recorte`: seeds de leitura declaram NULL explicitamente, preservando seleção temporal antiga. Mocks de leituras com projeções parciais não passam a fabricar lotes.
11. `cadastro-mestre-reconstruction` e `cadastro-mestre-comercial-executor`: sentinelas protegidas locais de Custos declaram NULL; comparação integral confere também esse campo. Executors produtivos continuam sem escrever Custos.
12. Demais mocks/fixtures/CI: não são importadores produtivos. Parser, OP, OP×CUSTO, Master e funções de classificação não recebem identidade artificial.
13. Abas/builds antigos, dashboard/owner/service_role e clientes externos: **não controlados na janela atual**, conforme resposta humana. Coluna nullable/FK não impediriam write sem lote, nem provariam que um FK válido é o lote correto. Não houve trigger, policy/grant novo, bloqueio remoto ou detecção inventada de escritores externos.

Inventário original completo e fronteira de garantia permanecem na [auditoria arquitetural, seção 10](custos-vinculo-lote-auditoria-arquitetural.md#10-fechamento-do-contrato-de-proveniência-por-lote). Bloqueios locais/operacionais não equivalem a revogar privilégios administrativos. Todos os writers produtivos controlados é um aceite ainda pendente.

## 7. Testes e regressões

Os testes específicos usam PostgreSQL PGlite real e adapter de transporte controlado, sem banco remoto. Cobrem um/múltiplos chunks, ID comum, execuções independentes com relógios iguais, lote externo ignorado, BIGINT textual, ausência/erro de log, produto/data diferentes, concorrência inclusive mesma chave/ordem inversa, upsert conservando ID/timestamp/chave, legado NULL, FK inválida, restrições de deleção/atualização, rollback de chunk, falha parcial/rejeição, reenvio controlado, fechamento incerto, retorno ausente/divergente/duplicado e API legada bloqueada.

SEC-03 é executado localmente com a migration aditiva e as policies anteriores: ambos os admins conseguem inserir/atualizar/ler vínculo; FK inválida falha, leitor/anon continuam sem escrita. UI usa harness DOM/mocks de interação para mostrar lote/limites; não se alega validação visual manual ou importação real.

A primeira inclusão do campo NULL nas sentinelas do Master expôs 15 expectativas antigas de formato; elas foram atualizadas para comparar integralmente o NULL adicional, sem mudar executor ou relaxar a proteção. Nenhuma falha foi ocultada por alteração de regra funcional/timeout.

Resultados finais em 29/10:

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **870/870 testes, 51/51 arquivos**, sem pulados; rodada final 37,50s. Inclui a regressão das sentinelas corrigida.
- Rodada focada `api-custos-lote`, `custos-proveniencia-schema`, `ui-import`, `api-comparacao-recorte`, `acesso-operacional-rls`: **91/91**, 5 arquivos. Importador 29, schema 4, UI 10, recorte 19, acesso 29.
- `node node_modules/eslint/bin/eslint.js .`: aprovado, exit 0.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: aprovado, exit 0.
- `node scripts/build-web.mjs`: aprovado, exit 0, URL/chave **sintéticas somente no processo**. Dist local gerado por allowlist, sem publicar, sem usar credencial administrativa/conexão real.
- `git diff --check`: aprovado; também conferidos whitespace dos arquivos novos e referências locais dos **26 arquivos alterados/novos**, sem destino inexistente ou espaço final.
- Regressões incluídas: fila/prioridade/ordem/TOP-200, exportação, A360-CUS-01/02/03/04 pelos contratos/fixtures existentes, leitura paginada, drill-through, Master protegido, OP/OP×CUSTO/engines e importação OP. Nenhuma modificação desses motores/consumidores no diff; evidência é automatizada/estática, sem repetir validação visual manual.

Limitação: teste de transporte usa adapter controlado com SQL real local; não houve teste REST de escrita contra o Supabase nem importação real com o novo schema. A FK produtiva, cache de schema e uso do cliente publicado precisam de validação na ativação autorizada. Nenhuma conclusão visual ou produtiva é inferida do build.

## 8. Documentação e arquivos

Runtime alterado somente em `src/services/api.js` e `view/ui-import.js`. SQL novo: migration listada acima. Testes alterados: `tests/api-custos-lote.test.js`, `tests/ui-import.test.js`, `tests/acesso-operacional-rls.test.js`, `tests/api-comparacao-recorte.test.js`, `tests/cadastro-mestre-reconstruction.test.js`, `tests/cadastro-mestre-comercial-executor.test.js`; novo `tests/custos-proveniencia-schema.test.js`.

Documentos atualizados: `README.md`, `ROADMAP.md`, `AGENTS.md`; os três manuais; `docs/arquitetura/identidade-lote-custos.md`, `proposta-vinculo-lote-custos.md`, `matriz-contratos-operacionais.md`, `banco-de-dados.md`, `migracoes.md`, `indice-documentacao-kustos.md`; `docs/auditoria/README.md`, `backlog-priorizado.md`, `custos-vinculo-lote-auditoria-arquitetural.md` e este relatório. VISION/regras gerais lidas, preservadas por ausência de mudança de princípio/processo. Notas anteriores mantidas como história delimitada, sem apagar decisão ou atribuir aplicação remota.

## 9. Pendências e limites finais

- Migration não aplicada; FK/legado NULL produtivos ainda não foram ensaiados após DDL. Não existe versão remota desta entrega.
- Falta janela atual com writers pausados e clientes antigos/admin controlados. Antes de aplicar, reler catálogo/constraints/volume/permissões e renovar/verificar backup; pausa histórica não basta.
- Aplicação e ativação/publicação compatível dependem de nova autorização operacional; esta tarefa não publica nem retoma importações. Não usar novo writer com schema antigo.
- Não houve importação real, escrita de teste remota, RLS/Auth, RPC, SQL bruto no frontend, backfill, reconstrução histórica, snapshots ou mudança de comparadores/fila/prioridade/alerta/TOP-200/exportação/OP/OP×CUSTO/parser/Cadastro.
- LOG-02 continua PARCIAL no backlog; oito parciais/14 confirmados, mesmos 22 itens ativos. Nenhum outro item foi encerrado.
- Advisors de segurança somente leitura mostraram avisos já existentes: search_path de funções ([orientação](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)), proteção de senha vazada desabilitada ([orientação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)) e INFO de duas tabelas administrativas com RLS sem policies ([orientação](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)); sem correção fora do escopo. Não são achados criados pela migration local.

**Sem commit, push ou deploy. Preparação local concluída; LOG-02 não encerrado.**
