# LOG-02 — auditoria arquitetural do vínculo persistido de lote

**Estado posterior — ativação de 29/10:** migration preparada aplicada como 20261029165515, schema/legado/permissões preservados, lotes reais 30 e 31 validados no original autorizado de 349 linhas. Um chunk por execução; múltiplos chunks em produção seguem PENDENTES, conforme decisão humana. [Provas atuais](custos-lote-ativacao-validacao.md). LOG-02 PARCIAL; etapas documentais/preparatórias abaixo são históricas, sem atribuir seus limites ao estado remoto atual. Sem alteração funcional/commit/push/deploy nesta ativação.

**Atualização de 29/10/2026:** a tarefa posterior autorizou implementação; writer/FK/testes estão preparados localmente e o catálogo remoto foi confirmado por SELECT. **Migration não aplicada**: usuário informou writers não pausados na janela atual e pediu concluir somente preparação local. [Relatório de implementação/validação e pendências](custos-lote-persistencia-validacao.md); [contrato vigente](../arquitetura/identidade-lote-custos.md). LOG-02 permanece PARCIAL; não usar writer novo com schema antigo. A auditoria abaixo preserva as fases documentais anteriores: “sem migration/sem implementação/catálogo indisponível” descreve o escopo de cada fase, sucedido localmente pelo relatório atual. Nenhuma escrita remota/commit/push/deploy nesta implementação.

**26/10/2026 — etapa exclusivamente documental.** Checkout inicialmente limpo, HEAD `761f5e2`. **LOG-02 = PARCIAL.** A pendência é **vínculo persistido dos fatos ao lote de importação**; **retenção histórica de snapshots é dívida separada**.

**Estado vigente após o fechamento contratual:** a regra A foi confirmada explicitamente pelo usuário: última execução que efetivamente gravou a versão atual. O inventário completo dos writers e seu tratamento, o alcance da garantia e os testes de contrato estão na [seção 10](#10-fechamento-do-contrato-de-proveniência-por-lote). **Implementação da identidade de execução concluída; persistência da identidade nos fatos depende de migration e atualização integral dos writers.** LOG-02 continua PARCIAL, sem autorização para implementar/ativar migration.

**Decisão da auditoria anterior: REJEITADA / REPROJETAR antes da implementação.** As seções 1–9 preservam esse diagnóstico e sua validação documental. A escolha A/B não é mais pendência; a seção 10 atualiza as decisões e validações posteriores. Permanecem condições para implementar: schema remoto confirmado e atualização/bloqueio integral dos writers demonstrado. Não confundir fechamento do contrato com mudança de runtime ou liberação de produção.

## 1. Diagnóstico e força das evidências

### Schema versionado versus schema real atual

Foram conferidos a [proposta integral](../arquitetura/proposta-vinculo-lote-custos.md), o [modelo de dados](../arquitetura/banco-de-dados.md), o [contrato de identidade](../arquitetura/identidade-lote-custos.md), a fotografia `tests/fixtures/acesso-operacional-schema.sql`, constraints e migrations versionadas. Neles:

- `log_importacao.id` é BIGINT/IDENTITY e PK; o log guarda status/contagens/horários/usuário/competência.
- `historico_custos` tem PK técnica `id`, custos, produto, data de referência, timestamp e autoria; não foi localizado FK/batch equivalente para o log de Custos.
- `unique_produto_data` impõe produto + data de referência. O vínculo proposto não altera essa chave.
- OP tem `log_importacao_op_id` próprio; Master tem outro log e suas FKs. Não são mecanismos de lote de Custos intercambiáveis.

**Limite:** a tentativa de leitura de metadados por `supabase_list_tables`, projeto `umpebdovrazzrdndhigc`, schema public, verbose, retornou **“This app tool requires a non-empty string link_id argument”**. Nenhum catálogo remoto ou dado real foi obtido. Não se executou SQL no Supabase, não se buscou senha/token e não se contornou a conexão. Portanto, as afirmações acima são do checkout, **não certificação do schema real atual**. Revalidar colunas/FKs/tipos/índices/policies/grants/triggers é pré-condição ainda aberta.

Há divergência documental concreta a reconciliar nessa conferência: o modelo descreve `criado_em NOT NULL`, enquanto a definição da fixture versionada o apresenta com default now(), sem NOT NULL. A fixture também permite código nulo na definição, enquanto o modelo e o saneamento descrevem sua obrigatoriedade. Não corrigir nulabilidade por suposição nem incluir esse saneamento na migration de vínculo. Os valores e o schema real devem ser preservados fora da alteração aprovada.

### Código atual de importação

`view/ui-import.js`: upload → mapeamento → consulta operacional → Preview → confirmação → payload atual → uma chamada a `importarHistoricoCustosComLog`.

`src/services/api.js`: um INSERT em `log_importacao` → confirmação da PK positiva/precisa → contexto imutável da chamada → normalização/validação → preparação operacional → chunks de 400 → upsert por produto/data → fechamento do mesmo log. Sem ID confirmado, fatos não são gravados. Todos os controles de chunk recebem o mesmo batchId; o payload dos fatos ainda não contém vínculo persistido.

A identidade nasce **no banco**, não no browser: `batchId` é a representação textual da PK retornada. A fachada `api.js` é JavaScript do frontend usando o cliente autenticado; não é um backend que torne o payload confiável por si só. `Object.freeze` protege o contexto local, não autorização no servidor.

O [relatório anterior](custos-identidade-lote-validacao.md) registra 851 testes/50 arquivos e qualidade aprovados na entrega parcial. Esses resultados são evidência anterior; **não foram reexecutados nem apresentados como nova validação nesta revisão documental**.

### O que está correto na proposta

Reutilizar o log/PK, manter a relação no fato, escolher BIGINT compatível, permitir legado NULL, evitar lote retroativo e preservar produto/data/timestamps são escolhas coerentes. A proposta separa vínculo atual de snapshots, evita RPC/SQL no frontend e não duplica identidade em UUID/tabela paralela. Backup, implantação ordenada e preservação do SEC-03 são necessários e já estavam previstos.

## 2. Problemas e lacunas que impedem aprovação

1. **Upsert escolhido implicitamente na proposta original:** a primeira auditoria retirou essa escolha como aprovação. No fechamento posterior, o usuário confirmou A explicitamente; essa pendência foi encerrada apenas no contrato, sem implementação. Ver seção 10.
2. **Schema real não conferido:** fixture/migrations não bastam para afirmar ausência atual da coluna ou políticas remotas. As divergências de nulabilidade reforçam a necessidade da conferência, sem autorizar mudança adicional.
3. **Escritores não cobertos:** além do método auditado, `upsertHistoricoCustos` sanitiza/enviava apenas colunas atuais; não tem contexto de execução. `sql/inserir_custo.sql` demonstra outro caminho administrativo versionado sem vínculo. Sua presença não prova uso atual; a atividade remota/externalizada não foi conferida. A autorização de executar funções legadas foi restringida no SEC-03, e nenhuma foi chamada aqui.
4. **Cliente antigo e rollback:** adicionar coluna nullable e atualizar somente um escritor não garante “última execução”. Um escritor antigo que altere custos omitindo a nova coluna pode deixar proveniência ausente ou obsoleta. O SDK instalado monta a lista de colunas a partir do payload; omissão não é um contrato de limpeza segura. O comportamento de merge/omissão precisa ser ensaiado com o transporte real da versão usada, sem presumir que o FK vira NULL. [Contrato de upsert do PostgREST](https://docs.postgrest.org/en/stable/references/api/tables_views.html#upsert).
5. **FK não prova autoria da gravação:** ela comprova referência existente. Não exige que aquele log tenha sido criado pela chamada atual, que esteja em determinado status ou que pertença ao usuário. As policies atuais distinguem administradores de leitores, sem verificar essa relação. É preciso decidir se a proveniência declarada por escritores administrativos de confiança basta; não inserir um mecanismo de confiança novo silenciosamente.
6. **Nulabilidade tem alcance:** NULL preserva legado, mas permite também futuras escritas sem vínculo. Não se pode prometer que o banco exige lote em todo fato novo apenas com essa coluna/FK nullable. A API pode exigir em seu fluxo auditado; a garantia global depende de todos os escritores e do contrato de confiança.
7. **Falha de chunk descrita de forma absoluta:** erro do banco com transação abortada e perda de resposta após possível COMMIT são diferentes. “Chunk rejeitado conserva o anterior” só é garantido com rollback confirmado. No segundo caso o resultado é indeterminado, não zero fatos gravados.
8. **Reversão insuficiente:** simplesmente voltar o cliente antigo antes de remover o FK pode permitir valores novos com lote antigo. Também não desfaz custos já sobrescritos. A proposta foi ajustada para suspender/controlar escritores e preservar associações antes de qualquer reversão destrutiva.
9. **Leitura por lote sem contrato explícito:** um FK no fato identifica somente registros atuais sobreviventes. O total pode diminuir após reimportações; log com zero fatos atuais não é inválido. Não usar esse total como reconstrução integral do arquivo original ou snapshot histórico.

Esses pontos são limites da proposta futura e evidências do código/policies; não são alegação de que uma coluna ainda inexistente já corrompeu a produção.

## 3. Modelo recomendado, condicionado às decisões

### Estrutura

- Tabela dona: `historico_custos`.
- Coluna proposta: `log_importacao_id`, **BIGINT NULL**, sem default.
- Destino: PK `log_importacao.id`, sem tabela de lotes ou identificador duplicado.
- Cardinalidade: cada fato atual referencia **zero ou um** log; cada log pode ter **zero a muitos** fatos atuais.
- FK recomendada: `ON DELETE RESTRICT`, `ON UPDATE RESTRICT`, não diferível. Não usar CASCADE nem SET NULL automático para apagar proveniência ao remover/renumerar log.
- `historico_custos.id`, `normalizeCodigoProduto()`, `unique_produto_data` e o conflito produto/data permanecem iguais. O lote não entra no índice único de negócio.
- Índice proposto no lado do fato: **não único**, orientado a busca pelo FK; avaliar forma parcial para não nulos e estratégia de criação conforme volume/plano/locks. A PK do log já tem suporte de unicidade; a FK não cria automaticamente índice no lado referenciador. [Referência PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK).

### Alternativas de upsert — nenhuma aprovada silenciosamente

**A — última execução que gravou a versão atual. Confirmada pelo usuário no fechamento posterior.** INSERT novo recebe o lote da execução. Upsert bem-sucedido envia custos e esse FK no **mesmo comando/chunk**; troca o lote mesmo com valores idênticos, pois houve gravação. O significado é última gravação bem-sucedida da versão sobrevivente, não maior ID, execução iniciada mais tarde, timestamp mais próximo ou último arquivo recebido. Em concorrência, vale a escrita efetivamente aplicada pelo banco; custo e FK precisam permanecer atômicos. Um lote iniciado antes pode ser o último a escrever.

No caso de um fato legado reimportado, preencher o FK nesse upsert é proveniência de uma **nova escrita observada**, não reconstrução retroativa. `criado_em` conserva o valor anterior conforme o comportamento atual; não passa a registrar o horário desse novo lote. O FK e o timestamp podem apontar para momentos distintos por esse motivo. Não corrigir essa diferença alterando o eixo temporal.

Após outra execução substituir o registro, o lote anterior continua no log, mas perde aquela referência entre fatos sobreviventes. Não há versão anterior recuperável nem histórico de todos os pertencimentos.

**B — lote original de criação.** Seria preservado após upserts, descrevendo origem da linha, não quem produziu seus valores atuais. Exigiria rótulo/contrato próprios e regra para não sobrescrever o vínculo. Um legado NULL deve continuar sem origem comprovada: atribuir o lote da primeira reimportação como “origem” seria inventar a criação original. Não satisfaz sozinho a pergunta sobre a execução que escreveu o custo atual.

**C — histórico de versões/associações.** Permitiria guardar múltiplas escritas, mas requer persistência e política de retenção próprias. Fora deste LOG-02; não recomendar segunda tabela, cópia de fatos ou remoção da UNIQUE para resolver o vínculo mínimo.

**D — duas proveniências ou vínculo desconhecido em gravação não rastreada.** Separar origem/última escrita amplia o modelo sem resolver retenção; não é mínimo. Limpar um vínculo para NULL em uma escrita sem execução poderia evitar atribuição falsa, mas perde proveniência da versão anterior e exige decisão explícita para todos os escritores. Não é fallback automático aprovado. Bloquear/atualizar escritores incompatíveis antes da ativação é pré-condição recomendada.

### Chunks, falhas e rollback de dados

O ID continua sendo criado uma vez, antes da primeira escrita, por `log_importacao`. A futura FK entraria na montagem de cada registro normalizado de `payloadValido`, a partir do contexto confirmado; não seria aceita como identidade arbitrária vinda da planilha/options. O chunk envia os registros com esse mesmo FK no upsert existente. Não fazer UPDATE posterior só para anexar lote: poderia falhar ou concorrer com outra execução e separar valor de proveniência.

- Uma execução/3 sucessos: os três chunks gravam a mesma FK; um log, muitos fatos atuais.
- Sucesso/falha/sucesso: chunks 1 e 3 confirmados têm a mesma FK. Chunk 2 com rollback confirmado deixa seus fatos novos ausentes e antigos com seus valores/vínculos anteriores. Não é rollback do arquivo inteiro; os demais chunks continuam comprometidos.
- Duas execuções/mesma chave/mesmo horário: PKs dos logs são distintas. Sob A, o fato sobrevivente aponta para a última escrita aplicada, e ambos os logs sobrevivem. Sob B, permanece a origem conhecida; os significados não podem ser misturados.
- Sem ID confirmado: bloquear antes dos fatos, como hoje. Não usar NULL silencioso como sucesso do fluxo que promete rastreabilidade.
- FK inexistente/inválida: erro referencial; não criar lote substituto, remover FK ou refazer sem vínculo. Ensaio deve comprovar rollback do chunk.
- Perda de resposta: pode haver COMMIT com resposta perdida. Marcar confirmação incerta e reconciliar; não supor rollback nem repetir automaticamente.
- Fechamento do log falha após os fatos: o vínculo continua referenciando um log existente, possivelmente processando. Não trocar lote ou apagar fatos para “fechar” a execução.

## 4. Dados legados

Recomendação: todos os fatos pré-existentes começam com **NULL**, sem default/backfill. NULL significa **vínculo não comprovado**; uma UI futura pode mostrar “Sem lote rastreável”. Não criar coluna/enum adicional só para repetir esse estado e não esconder fatos NULL dos relatórios.

Não foi encontrada evidência suficiente para reconstruir o pertencimento individual: os logs atuais não mantêm manifesto durável por fato, e o upsert pode ter substituído versões. Contagens, proximidade de horários, competência, usuário e código coincidente não provam a relação. **Não reconstruir.** Eventual fonte documental externa, se aparecer, exige outra auditoria/autorização, sem associação automática nesta migration.

## 5. Impactos e segurança

### DB/schema e índices

Mudança apenas aditiva e proposta: coluna nullable, FK e índice avaliado. Nenhuma alteração temporal, de custo, chave, PK, UNIQUE ou retenção. Logs sem fatos são permitidos; apagar log referenciado passa a ser impedido pelo FK recomendado. Isso pode afetar rotinas administrativas de limpeza, que precisam ser inventariadas, sem liberar CASCADE como solução.

### API e importação

O método auditado ganharia FK em todos os upserts e deixaria de declarar persistência dos fatos como indisponível **somente após comprovar a gravação/leitura compatível**. `batchId` continua string exata da PK; não usar Number para produto ou perder precisão de BIGINT. Validar a serialização no SDK para IDs maiores que MAX_SAFE_INTEGER.

`upsertHistoricoCustos` e escritores antigos/administrativos precisam de contrato antes de ativar A. Não alterar esses caminhos nesta auditoria. Falta de mecanismo de bloqueio/compatibilidade é pendência de desenho, não autorização para refatorar a fachada ou criar backend/RPC.

### UI, relatórios e drill-through

Nenhuma UI é implementada agora. Uma apresentação futura deve distinguir “lote da versão atual” de importação temporal/origem e exibir NULL como ausência. Leitura por lote deve dizer que retorna **fatos atuais vinculados**, não todas as linhas de arquivo histórico. Retorno paginado e ordenado por ID deve evitar N+1 para resolver logs.

`getHistorico` lê `*`, e a projeção de classificação preserva campos originais; a futura coluna pode chegar como metadado sem participar de cálculos. Já `getProductHistory` usa lista explícita de campos e não passará a retornar o FK automaticamente. Expor rastreabilidade no drill-through exige seleção/contrato próprios posteriores, sem mudar deltas ou competência. Filas, KPIs e XLSX não devem passar a agrupar/reordenar por lote incidentalmente.

### OP e OP × CUSTO

OP mantém seu log/FK e contrato independentes. O contexto Custo de OP × CUSTO lê fatos com `*`, e o engine preserva `fatoOriginal`; isso não autoriza mudar sua seleção por `criado_em`, relação, prioridade, ausência ou referências. A UI atual do dossiê de Custos não exibe automaticamente esse novo FK. Não importar metadado de lote como nova regra investigativa e não transformar a coluna em snapshot adicional.

### RLS / SEC-03

No contrato/migration versionados: SELECT é compartilhado entre permanentes autenticados; anon não tem acesso; INSERT/UPDATE de fatos e log exigem UUID administrativo indicado, com USING/WITH CHECK nas atualizações. Grants são por tabela. A proposta não demonstra necessidade de ampliar grants, criar policies públicas ou habilitar service-role no browser. O papel que cria a FK é administrativo de migration; isso não justifica devolver REFERENCES ao cliente autenticado.

Uma FK normal verifica existência/integridade, não aprovação da relação pela aplicação. RLS e integridade referencial são controles distintos; verificações referenciais não devem ser usadas como autorização por usuário. Service-role/owner podem ultrapassar RLS, mantendo a necessidade de cumprir a integridade referencial em DML normal; não são escritores dispensados do contrato de proveniência. [Referência PostgreSQL sobre RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

As policies atuais não correlacionam o FK proposto com origem/status do log. O código de criação do log não envia `user_id`; defaults/triggers remotos não foram conferidos. Não usar esse campo como prova automática de autoria nem inventar isolamento por usuário num sistema de leitura compartilhada. Um admin pode ter permissão de escrita e ainda indicar um ID existente de outra execução; a FK, sozinha, não detecta isso. Se bastar associação declarada por administradores de confiança, registrar essa garantia limitada; se for necessária prova contra escritor autorizado malicioso, a proposta é insuficiente e requer desenho/autorização separados. Nenhuma policy foi alterada aqui.

### Testes e documentação

Propor testes abaixo, sem implementá-los agora. Nesta etapa foram alterados apenas este relatório e a proposta; README, AGENTS, backlog, contratos funcionais e manuais permanecem intactos por restrição explícita do pedido. LOG-02 não foi encerrado. Uma implementação futura aprovada deverá atualizar seus contratos/manuais, incluindo o significado escolhido para upsert e os limites dos fatos sobreviventes.

## 6. Plano de migration futura (somente descritivo)

**Nome descritivo sugerido:** `vinculo_lote_historico_custos`. Não é nome de arquivo, timestamp reservado ou migration criada. Não há código SQL de migration nesta entrega.

1. **Pré-condições bloqueantes:** confirmar catálogo real sem inferência do snapshot; respeitar a regra A já confirmada no fechamento e a garantia de aplicação delimitada na seção 10; implementar/validar o tratamento dos escritores inventariados e o controle efetivo de ativação/concorrência. Se existir coluna/FK equivalente, reavaliar/reutilizar, sem criar segunda fonte.
2. **Fotografia e backup:** obter backup consistente, restaurável e conferido de fatos/logs e metadados de schema/RLS/grants/índices/triggers; registrar contagens/PKs/custos/datas/timestamps/constraints. Não executar carga ou rollback de dados como teste de produção.
3. **Janela/controle de escritores:** impedir operações incompatíveis durante ativação/rollback conforme plano aprovado. Recarregar abas ou presumir que todos os administradores atualizaram o browser não prova exclusão de escritor antigo. Não declarar o sistema rastreável sem validar o mecanismo escolhido.
4. **Schema aditivo:** coluna BIGINT NULL sem default e FK recomendada, sem tocar na UNIQUE ou preencher legado. Validar tipo/PK/collation e estrutura existente antes de DDL. Planejar locks, duração e timeout conforme volume/versão reais. Se validação em fases ou índice concorrente forem necessários, definir transações/validações próprias antes de gerar a migration, não improvisar na aplicação.
5. **Índice:** avaliar índice não único no FK e cobertura de NULL/plano de leitura; evitar índice redundante. Preservar índices atuais e conferir custo em escrita. Não torná-lo parte da chave produto/data.
6. **Validação estrutural e de preservação:** somente objetos autorizados diferem; legado continua NULL; zero associação fabricada; custos/IDs/datas/timestamps/contagens anteriores iguais; PK/UNIQUE/grants/policies/RLS/triggers protegidos preservados. Conferir metadados/cache da Data API antes de o cliente enviar nova coluna.
7. **Cliente/escritores compatíveis:** depois do schema e sob controle aprovado, enviar FK no mesmo upsert; tratar ausências/erros sem fallback por timestamp. Validar leitores selecionados, precisão BIGINT e metadata de disponibilidade. Não migrar comparadores A360-CUS-04 para lote nesta tarefa.
8. **Ensaios e liberação separados:** testes isolados e regressões aprovados, depois autorização própria para implantação/qualquer importação real. Esta revisão não concede essa autorização.

**Rollback antes da ativação:** se nenhum vínculo foi escrito, restaurar compatibilidade e retirar somente os novos objetos conforme backup/plano, sem tocar em fatos/constraints antigas.

**Rollback após a ativação:** suspender/controlar escritores; preservar as associações novas em backup; garantir que cliente antigo não recomece alterando custos com FK obsoleto; só então desativar/remover objetos se aprovado. Remover coluna perde proveniência. Schema rollback não desfaz upserts de negócio nem recupera snapshots substituídos. Restaurar valores anteriores seria outra operação de dados, fora deste LOG-02. Não usar CASCADE, reconstrução automática ou exclusão de fatos para resolver rollback.

## 7. Testes obrigatórios a propor para a implementação

1. Uma execução/um chunk: um log confirmado, FK correta no mesmo upsert e leitura posterior correspondente.
2. Uma execução/muitos chunks: um ID em todos os fatos confirmados; sem N+1 ou identidade por chunk.
3. Duas execuções independentes, inclusive mesmo arquivo/dados: logs distintos, sem reaproveitar ID do chamador.
4. Timestamps iguais e microssegundos: lote continua independente do relógio.
5. Falha intermediária real de banco: chunks confirmados mantêm lote comum; rollback do chunk falho preserva anteriores; resposta perdida fica indeterminada.
6. Reimportação: comportamento A confirmado no fechamento, inclusive valores idênticos, sem criar versões.
7. Upsert de produto/data existente: custo e FK mudam atomicamente para o lote da escrita efetiva; PK/UNIQUE permanecem.
8. Legado sem batch: migration deixa NULL; não faz associação por timestamp; nova escrita sob A é nova evidência, não backfill.
9. Batch ausente antes da execução: API bloqueia fatos e não gera lote alternativo.
10. FK inválida/inexistente/tipo impróprio: rejeição e rollback sem fallback para NULL; caso de ID existente mas de outra execução identifica o limite da FK e valida o controle de confiança escolhido.
11. Leitura por lote: paginação completa/count/ID determinístico, legado explicitamente sem vínculo; lote pode ter zero fatos sobreviventes após reimportação.
12. `data_referencia`: dias completos, competência inalterada e fora da chave de execução.
13. `criado_em`: default/valor original preservado; reimportação não o converte em timestamp do novo lote.
14. A360-CUS-01/02/03/04 e LOG-01: prioridades/narrativas/ordem UI×XLSX/recorte/ausência e alerta canônico preservados.
15. OP: escrita/leitura/log/parser e decisões originais intactos.
16. OP × CUSTO: eventos/snapshots/IDs, cobertura, seleção temporal e prioridades separadas intactos; FK não vira snapshot ou causalidade.
17. RLS: anon negado; leitor permanente lê e não insere/atualiza; admin indicado escreve dentro das policies; nenhuma ampliação de grants ou service-role no frontend. Conferir FK sob contexto autenticado e administrativo, sem inferir autorização de sua existência.
18. Escritor antigo e `upsertHistoricoCustos`: provar que o mecanismo aprovado impede atribuição obsoleta ou lida explicitamente com escrita não rastreada. Incluir SDK/PostgREST reais da implantação, não só adapter em memória.
19. Concorrência: execuções intercaladas e ordem de COMMIT diferente da ordem dos IDs; fato e lote consistentes, sem regra artificial de maior ID.
20. Fechamento falho e retomada: não renomear lote, apagar fatos nem refazer silenciosamente; separar status do log de confirmação dos fatos.
21. Rollback antes/depois da ativação: sem escritor incompatível escrevendo com vínculo antigo e sem perda de dados de negócio.
22. Índices/cache/precisão: tipo BIGINT textual sem arredondar, FK/índice/plano presentes, schema cache compatível e nenhuma dependência em posição de coluna ou SELECT * como prova de exibição automática.

## 8. Decisão da auditoria anterior e continuidade

**Na revisão inicial: REJEITADA / REPROJETAR.** A coluna nullable/FK não foi descartada. O fechamento da seção 10 confirma A e define contratos dos escritores/garantia de aplicação; não implementa seu bloqueio nem confirma o catálogo real. Assim, o modelo funcional está definido, mas a migration continua condicionada à confirmação remota e à implementação/validação integral da transição. Não há liberação automática de produção.

Próximos passos remanescentes: obter metadados atuais por acesso permitido; implementar/validar os writers compatíveis e o bloqueio dos antigos em tarefa autorizada; aplicar apenas depois a sequência de implantação aprovada. Não implementar retenção histórica nem mudar comparadores/fila/OP incidentalmente. A regra A não precisa ser decidida novamente.

## 9. Arquivos analisados, alterações e validação desta etapa

Analisados: proposta-vinculo-lote-custos.md integral; identidade-lote-custos.md; banco-de-dados.md; matriz-contratos-operacionais.md; modelo-acesso-rls.md; AGENTS.md, regras-gerais.md e referências de README/ROADMAP/manuais; relatórios de identidade/recorte e backlog LOG-02. Código: src/services/api.js, view/ui-import.js, core/report-engine.js, core/custos-classification-engine.js, core/op-custo-engine.js, view/ui-op-custo.js; fotografia tests/fixtures/acesso-operacional-schema.sql, tests/api-custos-lote.test.js; saneamento e hardening SEC-03 versionados, sql/inserir_custo.sql e implementação de upsert do SDK instalado. Leitura direcionada aos contratos citados, sem executar esses scripts.

Alterados **somente**:

- `docs/arquitetura/proposta-vinculo-lote-custos.md`: retira aprovação implícita de A, explicita decisão pendente, limites/ativação/rollback/FK e aponta para esta auditoria.
- `docs/auditoria/custos-vinculo-lote-auditoria-arquitetural.md`: este relatório, novo.

Validação da auditoria inicial: consistência textual, referências locais/âncoras, diff limitado aos dois Markdown e `git diff --check`; sem suíte/lint/typecheck/build naquele passo. O fechamento posterior executa os comandos pedidos e registra os resultados na seção 10. Em ambas as etapas: nenhum teste novo, arquivo SQL/migration, SQL no Supabase, importação produtiva ou mudança de runtime/schema/RLS/Auth/produção; nenhum commit/push/deploy. **LOG-02 permanece PARCIAL.**

## 10. Fechamento do contrato de proveniência por lote

Continuidade documental em **26/10/2026**, checkout inicialmente limpo no HEAD `25d2fc3`. Esta seção atualiza as pendências contratuais da auditoria anterior; não implementa suas mudanças. **LOG-02 — PARCIAL.**

**Implementação da identidade de execução concluída; persistência da identidade nos fatos depende de migration e atualização integral dos writers.** Retenção histórica de snapshots continua dívida separada. O backlog permanece com **22 itens ativos**, oito parciais/14 confirmados, sem encerramento artificial.

### 10.1 Decisões confirmadas e modelo final

O usuário confirmou explicitamente **A: última execução que efetivamente gravou a versão atual**. Exemplo: execução 101 grava produto 123 + uma data de referência; execução 102 faz upsert na mesma chave; o fato sobrevivente deve conter `log_importacao_id=102`. A referência é a mesma **data completa**, não qualquer data do mesmo mês. Não transformar outubro em dia 01 nem unir 05/10 e 14/10.

Schema recomendado: `historico_custos.log_importacao_id BIGINT NULL`, FK para a PK `log_importacao.id`, sem default; coluna dona no fato. Um fato atual → zero/um log; um log → zero/muitos fatos atuais. A UNIQUE e `onConflict:'codigo_produto,data_referencia'` permanecem. `normalizeCodigoProduto()` continua a única normalização de identidade.

**Legado → NULL**, sem inferência de timestamp/competência/arquivo. Nova escrita observada sob o contrato passa a ter lote próprio, mesmo sobre uma linha antes NULL; isso não é backfill histórico. Não preservar o lote original como significado do FK atual e não criar tabela de versões.

**Writer oficial após ativação:** não pode criar **nem substituir** fato sem lote confirmado. Fluxo obrigatório: execução → INSERT do log/PK confirmada → contexto local/batchId → todos os chunks → `log_importacao_id` de cada registro → mesmo upsert dos custos. Não usar patch posterior, default sintético, lote fornecido pela planilha ou parâmetro arbitrário do chamador.

**Integridade recomendada: ON DELETE RESTRICT / ON UPDATE RESTRICT, não diferível.** O fluxo atual só cria e fecha logs por UPDATE, sem DELETE de log ou renumeração de PK; SEC-03 não dá DELETE operacional ao cliente. Não há necessidade identificada de adiar/remanejar a referência para excluir log. RESTRICT explicita essa proteção imediata. NO ACTION não diferível também pode rejeitar referências quebradas, mas diferimento não atende requisito atual; CASCADE/SET NULL apagariam fatos/proveniência e não são recomendados. Logs com zero fatos sobreviventes continuam válidos. Índice do FK deve ser não único, com estratégia/forma parcial avaliadas na implementação, sem mudar a chave funcional.

### 10.2 Inventário completo dos writers encontrados no checkout

Busca no código de aplicação, services, scripts, SQL, testes, fixtures e workflows: chamadas de `from(TABLES.historico)`, upserts, funções de importação, DML direto e SQL dinâmico/transformações sobre fatos. Dependências e `dist` não são entradas de negócio independentes; o SDK foi inspecionado quanto à transmissão de colunas. Os caminhos abaixo cobrem os escritores e candidatos localizados **no repositório**, não provam a inexistência de clientes externos ou rotinas remotas desconhecidas. Nenhum script SQL foi executado.

1. **Importador principal — `src/services/api.js#importarHistoricoCustosComLog`.** Já recebe do banco/contém batchId confirmado no contexto de execução, mas não no payload dos fatos. Precisa transmiti-lo em cada registro normalizado, no mesmo upsert; pode e deve continuar como escritor oficial. Atualização integral é pré-condição da ativação. Ausência de ID continua erro antes de DML; campo de lote de entrada externa não tem autoridade.

2. **Chamador oficial — `view/ui-import.js`.** Confirma Preview e chama uma vez o importador; recebe batchId somente no resultado. Não é writer direto nem deve gerar identidade. Pode continuar, consumindo a versão compatível da API; abas/builds antigos precisam estar impedidos de executar o caminho anterior antes de ativar persistência. Não criar lote no Preview nem converter data em lote.

3. **API legada — `src/services/api.js#upsertHistoricoCustos`.** Não recebe/cria batchId; sanitiza apenas colunas antigas e faz upsert direto. Nenhum chamador ativo na UI foi localizado. **Decisão de tratamento recomendada:** bloquear esse caminho com erro explícito de lote/contexto obrigatório antes de DML na implementação futura; o nome/export pode permanecer como recusa explícita. Para voltar a ser writer, precisaria de contexto interno válido e contrato próprio, sem aceitar lote arbitrário nem criar log silenciosamente. Não pode continuar gravando sem vínculo após ativação.

4. **Shim — `services/api.js`.** Só reexporta a mesma API; não tem client/writer/identidade independente. Pode continuar e deve herdar tanto o caminho oficial compatível quanto o bloqueio explícito do legado. Não duplicar a correção no shim.

5. **Função SQL legada — `sql/inserir_custo.sql` e sua definição histórica em `tests/fixtures/acesso-operacional-schema.sql`.** Ambas descrevem `public.inserir_custo(text,text,numeric,date)`, sem batch; são definições do mesmo escritor histórico, não dois endpoints novos. A fixture usa campos/retorno antigos e não deve ser tomada como definição remota atual sem conferência. Faz INSERT/ON CONFLICT sem FK de lote. Pode permanecer como artefato histórico/local; **não pode integrar o fluxo oficial nem ser reexposta por RPC**. SEC-03 versionado revoga EXECUTE de PUBLIC/anon/authenticated nessa assinatura. Qualquer uso administrativo real precisa estar suspenso antes da janela de migration/ativação ou passar por adaptação aprovada em tarefa própria. Não ampliar grants para mantê-la funcionando sem lote.

6. **Transformação administrativa de valores — `sql/ajustar_precisao_historico_custos.sql`.** Não é importer, mas ALTER COLUMN ... USING round transforma custos armazenados, portanto não é só leitura/índice. Não possui contexto de lote. Pode permanecer versionado; **não executar em produção após ativação como ajuste avulso**. Uma futura intervenção desse tipo exige escopo próprio de dados/proveniência, sem reutilizar ID antigo ou fabricar lote. Não é parte da migration de vínculo e não será adaptada silenciosamente por LOG-02.

7. **Saneamento histórico — `sql/2026-05-25_saneamento_operacional_schema.sql`.** Altera colunas/defaults/constraints do fato e pode preencher uma coluna recém-adicionada pelo default; não é writer oficial recorrente e não tem batch. Deve permanecer como história de schema, sem reexecução automática ou compatibilidade implícita. Sua reaplicação/uso administrativo fica fora da janela de ativação e requer revisão própria. A nova migration não altera custos, nulabilidade temporal ou chaves sob pretexto desse arquivo.

8. **Sonda administrativa — `sql/validar_acesso_operacional_rls.sql`.** Tem INSERT/UPDATE de teste, inclusive DML construído dinamicamente, com IDs explícitos e reversão forçada de subtransações. Não possui FK de batch nos fatos; os logs de ensaio não estabelecem a associação. Pode permanecer como prova histórica; não é importer nem writer durável aprovado. Não executar em produção nesta etapa; uma revisão futura da sonda deve usar isolamento/reversão e validar o novo schema sem introduzir exceção produtiva de escrita oficial sem lote.

9. **Teste do importador — `tests/api-custos-lote.test.js`.** Invoca o writer oficial com batchId no controle; seu adapter executa upserts locais PGlite e o teste também semeia legado/trunca tabelas locais. Não é writer remoto. Pode continuar; na implementação deverá aplicar o schema aprovado no banco isolado e conferir o FK transmitido, não apenas o controle. Seed legado NULL permanece deliberado. Nenhuma mudança desse teste é feita agora.

10. **Teste SQL do recorte — `tests/api-comparacao-recorte.test.js`.** Helper add e INSERTs de volume criam fatos locais sem batch. Pode continuar como fixture de legado/cenários de leitura em PGlite; não precisa inventar lote para cada seed. Os casos de escrita oficial futura devem passar pelo contrato completo. Nenhuma exceção dessas fixtures pode ser transportada à produção.

11. **Teste de SEC-03 — `tests/acesso-operacional-rls.test.js` e fixture de schema.** Seeds/sondas locais escrevem fatos com SQL direto e testam permissões/upsert. Não são fluxo oficial nem recebem batch de execução real. Podem continuar como testes isolados, preservando o estado legado intencional e aplicando a futura migration em ambiente de ensaio; devem ganhar cenários de FK/API oficiais sem enfraquecer a matriz de acesso. A fixture define a função histórica citada no item 5, não autoriza sua chamada remota.

12. **Seeds de proteção do Master — `tests/cadastro-mestre-reconstruction.test.js` e `tests/cadastro-mestre-comercial-executor.test.js`.** Criam/inserem dados sentinela em tabelas locais chamadas historico_custos, às vezes com estrutura simplificada, para provar que executores de outro domínio não as alteram. Não recebem batch nem são writers produtivos de Custos. Podem continuar como seeds de proteção; não atribuir lote fictício a sentinelas nem ampliar o executor para gravar fatos.

13. **Dados/mock sem persistência — `tests/api-custos-pagination.test.js`, `tests/api-product-master-pagination.test.js`, `tests/api-product-history.test.js`, `tests/api-op-custo-context.test.js`, `tests/ui-import.test.js`.** Montam/mutam arrays ou substituem chamadas; isso não é DML de produção. Nos testes do caller, o batch é resposta mockada, não identidade produzida pela UI. Podem permanecer; cenários novos de writer oficial exigirão FK, e os cenários antigos/ausência não devem receber backfill artificial. Não contá-los como importadores reais.

14. **Testes de SQL estático/CI — `tests/cadastro-mestre-execution-sql.test.js` e `.github/workflows/ci.yml`.** O teste lê/asserta SQL do Master, não executa DML de custos; o CI roda ferramentas/testes, sem importer ou carga produtiva localizada. Podem continuar, sem batch próprio. Ensaio futuro de migration não deve virar aplicação remota automática pelo CI.

**Candidatos conferidos e excluídos como writers de Custos:**

- `scripts/lib/cadastro-mestre-reconstruction.mjs` coloca historico_custos entre tabelas protegidas, lê fingerprints/locks e grava Master/log de Master/famílias; não escreve fatos. O CLI `scripts/reconstruir-cadastro-mestre.mjs` e `api/reconstruir-cadastro-mestre.js` delegam a esse domínio, sem novo writer de Custos.
- `scripts/lib/cadastro-mestre-comercial.mjs` só atualiza o par comercial do Master; `scripts/lib/cadastro-mestre-web.mjs` lê metadados/guardas de tabelas protegidas. Seus entrypoints/review/validação não recebem nem precisam de batch de Custos.
- `sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql` grava apenas Master/log administrativo e protege Custos; `sql/2026-09-28_fase1_preservacao_diagnostico.sql` e sua correção gravam preservação em audit_kustos, sem alterar fatos de domínio. Esses arquivos não autorizam reconstruir lote de Custos nem implantar snapshot retention nesta etapa.
- `sql/2026-05-11_indices_performance_operacional.sql`, `sql/variacao_percentual_produto.sql`, migrations de acesso/metadados e demais arquivos de schema/catálogos não são importadores de fatos. Triggers de categorização atualizam mapa/operacional, não regravam os custos com lote. Não adicionar batch onde não há escrita do fato.
- `api/save-doc.js` grava documentação no GitHub; `scripts/create-master-user.mjs` atua em Auth; build/config geram arquivos; OP grava em apontamentos_op. Não são writers de historico_custos e não devem ser alterados por LOG-02.

**Escritores externos/admin avulsos:** uma conexão owner/service-role, dashboard/SQL administrativo ou software não versionado pode escrever se tiver privilégios. Não foi possível inventariar sua atividade remota. Devem ser identificados pelo responsável e mantidos suspensos/fora do fluxo oficial até conformidade; não declarar inexistência desses clientes por ausência na busca do checkout.

### 10.3 Tratamento obrigatório na ativação

Antes da futura migration/ativação, abrir janela de escrita controlada para Custos. Atualizar integralmente o item 1; bloquear o item 3; impedir execução das versões antigas do item 2; manter função/scripts administrativos sem autorização produtiva até revisão própria. Shims não oferecem fallback; seeds de teste não são exceção de produção. Os artefatos históricos podem continuar no Git, sem que isso os habilite como escritores ativos.

**Nenhum writer oficial pode gravar sem lote após ativação**, incluindo upsert de existente. Não aceitar “coluna ausente → sucesso antigo”, não repetir sem FK após erro de schema/constraint e não criar um lote geral para compatibilidade. O código atual ainda não implementa esse bloqueio/propagação completa; trata-se de requisito fechado para a próxima etapa.

O banco continuará aceitando NULL por desenho de legado, logo a simples adição da FK não bloqueia um bundle antigo ou administrador privilegiado. Recarregar abas não demonstra exclusão de escritores antigos. A implantação precisa provar mecanismo efetivo de controle/compatibilidade antes de liberar escrita; se isso não puder ser demonstrado sem novas decisões fora do escopo, **não ativar** e documentar a dependência. Não inventar agora mudança de Auth/RLS, trigger ou backend para declarar o problema resolvido.

Rollback segue a mesma regra: suspender/controlar escritores, preservar associações e somente depois retirar/desativar componentes novos de modo aprovado. Não retomar writer antigo mantendo FK obsoleto apresentado como última execução. Retirar o FK/coluna não desfaz custos já sobrescritos nem cria versões recuperáveis.

### 10.4 Três garantias distintas e concorrência

**Identidade do lote:** é a PK gerada pelo INSERT daquela execução em log_importacao, já confirmada no início. Não é horário, arquivo, produto ou competência. Hoje isso já existe no controle local.

**Declaração de origem da versão atual:** será `historico_custos.log_importacao_id`. FK válida diz que o log existe; não prova sozinha que o writer correto o escolheu. Esse elo ainda não está persistido no runtime atual.

**Evidência do writer oficial correto:** invariantes de implementação + testes de transporte/banco. A fachada usa contexto imutável/local por chamada, sem variável global de “lote atual”; o normalizador deve construir cada registro com a FK desse contexto, depois de confirmar o ID, ignorando qualquer tentativa de lote vinda do arquivo/options. O chunk envia esses valores no mesmo upsert dos custos. Não há consulta posterior por horário, patch de FK separado ou reuso do batch de outra chamada.

Duas execuções concorrentes possuem contextos/arrays independentes. Intercalar seus awaits não troca os IDs locais. Para a mesma chave, o banco aplica cada escrita de custo+FK como unidade; a versão sobrevivente deve carregar o ID da execução que efetivamente a gravou, ainda que seja menor que o ID de outra execução iniciada depois. Para chaves diferentes, cada produto/data conserva o ID de sua própria chamada. Isso deve ser comprovado por testes antes de dizer que a persistência está garantida; hoje só a parte de contexto está implementada/testada.

Falha de chunk com rollback confirmado não muda os valores/FKs anteriores; o próximo chunk continua com o mesmo ID. Falha de resposta após COMMIT possível é indeterminada, sem retry que gere lote novo ou inferência de sucesso por contagem. Falha no fechamento mantém referências a um log existente, possivelmente processando; status finalizado não é pré-condição da FK porque os fatos são gravados antes do fechamento.

**Alcance da garantia recomendada:** consistência contra mistura acidental no fluxo oficial dos administradores autorizados, com writers conformes. Não é prova criptográfica/imutável contra um escritor autorizado que burle a API. RLS/SEC-03 restringe quem escreve; FK restringe existência; código/testes evidenciam a cadeia contexto → payload → fato. Não ampliar grants, reabrir RPCs ou usar service-role no browser. Uma garantia contra administração maliciosa ou gravadores externos arbitrários exigiria outro contrato, e não é prometida por esta coluna nullable.

Leitura por lote retorna fatos **atuais sobreviventes**. Reimportação pode reduzir o número de fatos de um lote anterior a zero, sem invalidar o log ou alterar seus totais históricos de execução. Não usar esse vínculo para fabricar um snapshot de todas as linhas anteriormente gravadas.

### 10.5 Schema remoto atualmente conhecido

- **Versionado:** fixture/PKs/UNIQUE e migrations do checkout não mostram log_importacao_id em historico_custos. Colunas temporais/autoria não equivalem a lote. Não criar outro campo se o catálogo real revelar equivalente.
- **Código:** importer tem batchId só em controle/resultado; payload e API legada omitem a FK. Não é evidência de que a coluna já exista remotamente ou de que ela já seja exigida.
- **Evidências remotas datadas:** a auditoria/reconciliação de 22/10 e o relatório SEC-03 de 23/10 registram leituras/migration RLS remota `20261022192657`; o arquivo local de hardening tem versão `20261022191744`. São registros históricos, não inspeção remota atual. A fotografia versionada é evidência de estrutura conhecida, não garantia contra drift posterior.
- **Tentativa nesta etapa:** `supabase_list_tables`, public/verbose, projeto conhecido, novamente recusou por ausência de `link_id`. Nenhuma consulta SQL, escrita, migration ou contorno de autenticação foi feito. Catálogo remoto **não confirmado**.
- **Divergências conhecidas:** modelo documental versus fixture divergem em obrigatoriedade de código/criado_em; isso é divergência entre fontes locais, não prova de qual definição vigora no remoto. Nenhuma divergência nova local × remoto pode ser afirmada sem acesso atual. Não sanear esses campos nesta migration.

Antes da implementação: conferir colunas equivalentes, tipos, PK/FK/UNIQUE, índices, defaults, triggers, grants/RLS e writers ativos por meios permitidos; não executar SQL no Supabase neste fechamento. A limitação de acesso permanece pendência concreta, sem assumir que a fonte mais conveniente está correta.

### 10.6 Testes de contrato para a futura implementação

Os itens abaixo são requisitos, **não novos testes implementados contra migration inexistente**:

1. Uma execução/um chunk: ID confirmado no payload e no fato lido do banco.
2. Uma execução/múltiplos chunks: um único log, mesmo FK em todos os fatos confirmados.
3. Dois chunks da mesma execução: igualdade exata do ID, sem geração entre chunks.
4. Duas execuções diferentes: IDs distintos, mesmo arquivo/dados/competência.
5. Duas execuções com timestamp igual: distinção por PK, não relógio.
6. Upsert: substitui a versão atual e seu batch para a última escrita; incluir valores de custos idênticos.
7. Chunk falho: mantém identidade da execução; rollback confirmado preserva fatos antigos e seus lotes; caso de resposta incerta não é tratado como rollback.
8. Produtos diferentes: FK de cada contexto correto, sem mistura por código/descrição.
9. Datas/competências diferentes: mesmo lote quando pertencem à mesma chamada, lotes independentes em chamadas distintas; sem converter data em dia 01.
10. Concorrência: intercalar A/B, inclusive mesma chave e ordem de conclusão diferente da geração dos IDs; custo e FK inseparáveis.
11. Legado: migration deixa NULL e leituras mostram ausência explícita.
12. Writer oficial: recusa criar/substituir sem batch; nenhuma tentativa de fallback sem FK.
13. FK: lote inexistente rejeitado; erro não cria log artificial ou remove vínculo para repetir.
14. Batch não confirmado: criação de log falha/rejeita/sem ID bloqueia fatos e preparação operacional.
15. `data_referencia`: competência original preservada, mesma UNIQUE/recorte.
16. `criado_em`: timestamp/default existente preservado, inclusive em reimportação; não é sobrescrito pelo início do lote.
17. Nenhum timestamp é usado para criar/recuperar identidade; incluir BIGINT textual preciso.
18. Nenhum vínculo/valor histórico é reconstruído por contagem, proximidade ou arquivo presumido.
19. Produto + data completa continuam sendo a chave, com normalização canônica.
20. Retenção não muda: mesmo número de versões sobreviventes; nenhuma tabela/linha de snapshot artificial.

Regressões adicionais: bloquear API legada/bundles incompatíveis conforme estratégia aprovada; RESTRICT impede apagar/renumerar log referenciado sem CASCADE; log sem referências continua válido; RLS anon/leitor/admin/owner conforme SEC-03; leitura por lote completa/paginada, sem N+1; A360-CUS-01/02/03/04, LOG-01, OP, OP × CUSTO, fila/TOP-200 e exportação intactos. Ensaio de omissão/merge deve usar a versão real do SDK/PostgREST alvo, não só adapter de teste.

### 10.7 Validação executada e arquivos alterados

Nesta etapa foram executados **os testes existentes**, sem novos testes de implementação/migration:

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **851 testes / 50 arquivos**, todos aprovados, sem pulados.
- `node node_modules/eslint/bin/eslint.js .`: aprovado.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: aprovado.
- `node scripts/build-web.mjs`: aprovado com URL/chave sintéticas somente no processo local, sem conexão/publicação.
- `git diff --check`, referências locais/âncoras e consistência do status: aprovados; diff restrito aos três Markdown autorizados.

Arquivos alterados: `docs/arquitetura/proposta-vinculo-lote-custos.md`, este relatório e `docs/auditoria/backlog-priorizado.md` somente no contrato/descrição de LOG-02. O número de itens ativos não mudou. Não se criaram arquivos SQL/migration, testes novos ou runtime. Nenhum SQL foi executado no Supabase; sem alteração de produção/RLS/Auth/OP/OP×CUSTO/fila/prioridade/exportação, commit/push/deploy.

**Resultado:** regra de upsert confirmada e contratos de writer/proveniência definidos; identidade de execução concluída localmente; persistência nos fatos continua pendente de migration e atualização integral dos writers. Próximas condições são operacionais/técnicas da implementação autorizada — catálogo real confirmado, controle efetivo dos escritores, payload compatível e testes futuros — não uma nova escolha A/B. Não declarar LOG-02 concluído nem habilitar produção somente por este documento.
