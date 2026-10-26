# LOG-02 — auditoria arquitetural do vínculo persistido de lote

**26/10/2026 — etapa exclusivamente documental.** Checkout inicialmente limpo, HEAD `761f5e2`. **LOG-02 = PARCIAL.** A pendência é **vínculo persistido dos fatos ao lote de importação**; **retenção histórica de snapshots é dívida separada**.

**Decisão: REJEITADA / REPROJETAR antes da implementação.** A proposta de coluna/FK é uma base proporcional, mas não está aprovada para implementação: há decisão humana relevante no upsert, contratos incompletos de escritores/ativação e schema remoto não confirmado. Esta classificação não pede uma nova arquitetura nem rejeita reutilizar a PK existente; impede tratar as lacunas como decisões já aprovadas.

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

1. **Upsert escolhido implicitamente:** a redação anterior dizia que nova execução troca o vínculo, já adotando A sem registrar aprovação humana. Isso é recomendação plausível, não decisão estabelecida. A proposta foi corrigida para tornar a decisão explícita e pendente.
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

**A — última execução que gravou a versão atual. Recomendada, pendente de decisão humana.** INSERT novo recebe o lote da execução. Upsert bem-sucedido envia custos e esse FK no **mesmo comando/chunk**; troca o lote mesmo com valores idênticos, pois houve gravação. O significado é última gravação bem-sucedida da versão sobrevivente, não maior ID, execução iniciada mais tarde, timestamp mais próximo ou último arquivo recebido. Em concorrência, vale a escrita efetivamente aplicada pelo banco; custo e FK precisam permanecer atômicos. Um lote iniciado antes pode ser o último a escrever.

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

1. **Pré-condições bloqueantes:** confirmar catálogo real sem inferência do snapshot; decidir A/B; definir confiança/garantia de associação; inventariar escritores e leitores; aprovar estratégia concreta para escritores antigos e concorrência. Se existir coluna/FK equivalente, reavaliar/reutilizar, sem criar segunda fonte.
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
6. Reimportação: comportamento conforme A/B explicitamente aprovado, inclusive valores idênticos, sem criar versões.
7. Upsert de produto/data existente: custo e FK mudam atomicamente sob A ou origem preservada sob B; PK/UNIQUE permanecem.
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

## 8. Decisão final e próximos passos

**REJEITADA / REPROJETAR para implementação no estado atual.** A coluna nullable/FK é recomendação técnica mínima, não proposta descartada. Permanecem bloqueantes: catálogo real não confirmado, escolha humana A/B, garantia de confiança da associação e estratégia de escritores/rollback não fechadas. “Aprovada com ajustes” não seria adequada com essas ambiguidades.

Próximos passos: obter metadados atuais por acesso permitido; confirmar a semântica recomendada A ou optar explicitamente por B; fechar os contratos de confiança e escritores; revisar a proposta e só então pedir autorização de implementação/migration. Não implementar retenção histórica nem mudar comparadores/fila/OP incidentalmente.

## 9. Arquivos analisados, alterações e validação desta etapa

Analisados: proposta-vinculo-lote-custos.md integral; identidade-lote-custos.md; banco-de-dados.md; matriz-contratos-operacionais.md; modelo-acesso-rls.md; AGENTS.md, regras-gerais.md e referências de README/ROADMAP/manuais; relatórios de identidade/recorte e backlog LOG-02. Código: src/services/api.js, view/ui-import.js, core/report-engine.js, core/custos-classification-engine.js, core/op-custo-engine.js, view/ui-op-custo.js; fotografia tests/fixtures/acesso-operacional-schema.sql, tests/api-custos-lote.test.js; saneamento e hardening SEC-03 versionados, sql/inserir_custo.sql e implementação de upsert do SDK instalado. Leitura direcionada aos contratos citados, sem executar esses scripts.

Alterados **somente**:

- `docs/arquitetura/proposta-vinculo-lote-custos.md`: retira aprovação implícita de A, explicita decisão pendente, limites/ativação/rollback/FK e aponta para esta auditoria.
- `docs/auditoria/custos-vinculo-lote-auditoria-arquitetural.md`: este relatório, novo.

Validação: consistência textual, referências locais/âncoras, diff limitado aos dois Markdown e `git diff --check`. Não foram criados testes, arquivos SQL ou migrations. Não foram executados suíte/lint/typecheck/build, SQL no Supabase, importações ou ensaios de escrita nesta etapa documental. Nenhuma modificação de runtime, dados, schema, RLS/Auth ou produção; nenhum commit/push/deploy. **LOG-02 permanece PARCIAL; backlog não foi marcado como concluído.**
