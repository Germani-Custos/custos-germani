# LOG-02 — vínculo entre fato de Custos e execução

## Estado vigente — preparação local de 29/10/2026

**LOG-02 PARCIAL.** Proposta aprovada e implementada no checkout; migration gerada por `supabase migration new custos_proveniencia_lote` em 26/10: [`20261026185939_custos_proveniencia_lote.sql`](../../sql/20261026185939_custos_proveniencia_lote.sql). Ensaio PostgreSQL isolado aprovado. **Não aplicada remotamente:** em 29/10 o usuário informou writers não pausados e pediu concluir somente preparação local. Não executar writer novo contra schema antigo nem declarar garantia ativa em produção.

Catálogo Supabase Custos-Germani (`umpebdovrazzrdndhigc`), conexão **Supabase** escolhida pelo usuário, reconfirmado por SELECT em 29/10 às 16:36 UTC: PK `log_importacao.id` BIGINT IDENTITY ALWAYS; PK dos fatos; UNIQUE `unique_produto_data(codigo_produto,data_referencia)`; nenhuma coluna equivalente de lote nos fatos; 2.481 fatos/29 logs; 21 policies existentes. Código e `criado_em` são nullable no catálogo, contrariando NOT NULL em descrições antigas; numerics não têm a precisão fixa descrita no manual antigo. Essas diferenças ficam preservadas, sem saneamento. Fixture histórica IDENTITY BY DEFAULT não é cópia exata do catálogo: ensaio novo cobre ALWAYS.

### Migration preparada

- Transação com limites de lock 5s/execução 30s, locks de log/fatos e guardas de PK/tipo/UNIQUE/coluna ainda ausente. Drift/reexecução recusa, sem mascarar estrutura divergente.
- `historico_custos.log_importacao_id BIGINT NULL`, sem default/backfill. FK validada para `log_importacao(id)`, DELETE/UPDATE RESTRICT, não diferível.
- Índice parcial não único `idx_historico_log_importacao_id WHERE log_importacao_id IS NOT NULL`: referências presentes e manutenção referencial, sem indexar legado NULL ou mudar chave funcional. Índices anteriores preservados.
- Nenhum INSERT/UPDATE/DELETE de negócio; nenhuma alteração de log/chaves/`data_referencia`/`criado_em`/RLS/Auth/grants/funções/triggers anteriores. Testes demonstram preservação/FK/recusa de drift, não aplicação produtiva.

Writer local já envia lote no mesmo upsert, confere retorno e bloqueia API legada. [Contrato vigente](identidade-lote-custos.md#contrato-vigente--persistência-preparada-em-29102026); [inventário/provas/pendências](../auditoria/custos-lote-persistencia-validacao.md).

### Aplicação futura

Nova janela com todos os writers pausados/controlados; reler catálogo, contagens/provas e backup antes de aplicar. Não reutilizar pausa de 26/10 como evidência atual. Conferir depois: NULL em todo legado, dados anteriores idênticos, somente coluna/FK/índice adicionais, constraints/RLS/policies/grants preservados. Ativar/publicar apenas clientes compatíveis sob autorização própria e impedir gravação de abas/builds antigos. Não retomar cliente antigo como rollback mantendo alegação de última escrita rastreada. Não apagar coluna/FK automaticamente após uso: preservar vínculos antes de reversão aprovada. Sem controle integral, LOG-02 permanece PARCIAL.

## Registro histórico — fechamento documental de 26/10/2026

O restante preserva a decisão original anterior à implementação. Limites “somente documental/sem migration/schema não confirmado” descrevem aquela fase e foram sucedidos pela preparação local acima; não são o estado atual do checkout.

**Somente proposta documental — 26/10/2026. Não é migration executável nem autorização para DDL/DML.** Nenhum arquivo de migration foi criado. Não aplicada localmente ao projeto nem no Supabase. [Contrato parcial LOG-02](identidade-lote-custos.md).

**LOG-02 = PARCIAL. Pendência: vínculo persistido dos fatos ao lote de importação.** Retenção histórica de snapshots é dívida separada.

**Implementação da identidade de execução concluída; persistência da identidade nos fatos depende de migration e atualização integral dos writers.**

**Fechamento contratual de 26/10/2026:** o usuário confirmou a alternativa A — última execução que efetivamente gravou a versão atual. O inventário de escritores, seu tratamento e o alcance da garantia de aplicação estão definidos na [continuação da auditoria](../auditoria/custos-vinculo-lote-auditoria-arquitetural.md#10-fechamento-do-contrato-de-proveniência-por-lote). Esse fechamento substitui a pendência de escolha A/B da revisão anterior. **Não autoriza implementação/migration:** o catálogo remoto continua não confirmado, e a atualização/bloqueio integral dos escritores ainda não foi implementada nem validada em produção. Modelo estrutural recomendado, com ativação condicionada às pré-condições abaixo.

## Necessidade demonstrada

O schema versionado e a fotografia `tests/fixtures/acesso-operacional-schema.sql` têm `log_importacao.id` BIGINT/IDENTITY/PK, mas nenhum `log_importacao_id`, `batch_id` ou equivalente em `historico_custos`. As colunas de negócio/timestamps/autoria não armazenam esse vínculo. O log tem status, contagens, horários, usuário e competência, sem manifesto de fatos/chunks. Não há mecanismo equivalente de Custos a reutilizar além da própria PK do log.

Logo, sem coluna ou relação nova não é possível responder por leitura posterior quais fatos sobreviventes pertencem à execução. Gerar UUID no browser, aproximar horários, anexar ID apenas ao retorno ou escrever um texto em status não resolve essa persistência. A implementação parcial existente cobre somente a identidade de execução; este fechamento é documental, sem alteração de runtime.

## Alteração mínima proposta para etapa futura

1. Conferir catálogo remoto, PK/tipos, FKs, colunas equivalentes, volume e contratos de acesso. Se existir vínculo equivalente posteriormente criado, reutilizá-lo após auditoria; não criar segunda fonte de verdade.
2. Adicionar **somente se confirmada a necessidade** uma coluna nullable `historico_custos.log_importacao_id BIGINT`, sem default. Reutilizar `log_importacao.id`; não criar tabela de lotes, UUID ou duplicar identidade no log.
3. FK recomendada para `log_importacao(id)`, com `ON DELETE RESTRICT`, `ON UPDATE RESTRICT`, não diferível. A tabela dona do vínculo é `historico_custos`: fato → zero/um log; log → zero/muitos fatos atuais. Preservar PKs, valores, timestamps e `unique_produto_data`; o FK não integra a chave de negócio. Nenhuma policy/grant é modificada por esta proposta.
4. Índice **não único** no FK para leitura por lote e manutenção referencial; considerar forma parcial `IS NOT NULL` após conferir planos/volume. A FK não cria automaticamente índice no lado do fato. Escolha e implantação dependem do catálogo/locks reais; nenhum índice criado nesta tarefa.
5. Legado permanece **NULL = vínculo não comprovado**. “Legado/não rastreado” é rótulo derivado, sem estado persistido adicional; NULL também pode representar uma escrita não rastreada, portanto não prova idade do registro. Não fazer backfill por proximidade de `criado_em`, competência, arquivo presumido ou usuário. Ausência não deve virar um lote sintético.
6. **Upsert: alternativa A confirmada explicitamente pelo usuário.** O vínculo identifica a última execução que efetivamente gravou a versão atual, inclusive quando os valores não mudam. Exemplo: A/101 grava produto 123 + data; B/102 faz upsert nessa mesma chave; a versão sobrevivente fica vinculada a 102. Se execuções se intercalarem, vale a última escrita efetiva, não maior ID, horário ou ordem de início. B (origem) não é o significado escolhido; C (histórico de versões) permanece fora deste LOG-02.
7. O ID confirmado deve entrar no mesmo payload/upsert dos custos, em todos os chunks, nunca num UPDATE posterior separado. A futura implementação deve forçar `log_importacao_id` a partir do contexto local da execução, sem aceitar lote da planilha/chamador. Erro PostgreSQL com rollback confirmado do chunk conserva valores/vínculos anteriores; perda de resposta após possível COMMIT é indeterminada e exige reconciliação, sem afirmar rollback ou refazer automaticamente.

`ON DELETE RESTRICT` é a recomendação baseada no fluxo observado: o importador cria e fecha o log por UPDATE, não o exclui; SEC-03 não concede DELETE operacional ao cliente; não há necessidade observada de adiar integridade para apagar/renumerar um log referenciado. `NO ACTION` não diferível também pode rejeitar a operação, mas não há requisito de diferimento/remanejamento que justifique essa flexibilidade. Não usar CASCADE nem SET NULL; um log sem fatos sobreviventes continua sendo uma execução válida. Não alterar políticas para adaptar esse comportamento.

## Ordem e condições de ativação

Backup/provas integrais e revisão de locks/constraints antes da migration aprovada. Schema nullable primeiro, cliente escritor compatível depois, sem habilitar código que envie coluna inexistente. Sem escrita real de teste como parte desta proposta. Ensaiar em PostgreSQL isolado e com os contratos RLS existentes; não ampliar grants, usar service-role no frontend ou criar RPC/função SQL.

**Tratamento definido dos escritores antigos:** o importador principal deve ser atualizado integralmente; `upsertHistoricoCustos` sem contexto de lote deve ser bloqueado com erro explícito antes de DML, não receber compatibilidade silenciosa. Abas/builds antigos não podem escrever após ativação. Função SQL legada, scripts de transformação/sondas e acesso administrativo avulso não são caminhos oficiais habilitados: permanecem sem autorização de execução produtiva até adaptação/revisão próprias. Seeds/testes isolados podem representar legado NULL deliberadamente; isso não é exceção de produção. O inventário completo e a decisão por writer estão na seção 10 do relatório.

A janela de escrita controlada deve começar antes da futura migration e permanecer até comprovar somente escritores compatíveis ativos. A coluna nullable não bloqueia um cliente antigo por si só, e recarregar uma aba não prova o bloqueio. **Se não houver controle efetivo dos escritores, não ativar a garantia em produção.** O mecanismo operacional/técnico de implantação deve ser comprovado na etapa de implementação, sem mudar RLS/Auth ou criar novo backend/trigger silenciosamente. Voltar ao cliente antigo e retomar gravações deixando o FK apresentado como última escrita é inseguro.

A garantia recomendada é **consistência de proveniência no fluxo oficial dos administradores autorizados**, não prova criptográfica contra escritor autorizado malicioso. O banco gera a PK; a fachada JS confirma esse ID e o mantém em contexto imutável/local por chamada. Cada payload copia o ID desse contexto e grava custo/vínculo atomicamente no upsert, sem estado global ou patch posterior. Isso impede troca acidental entre execuções no fluxo correto e deve ser comprovado por testes de concorrência. Hoje só o controle tem esse ID; o elo com o fato ainda não existe.

RLS do SEC-03 restringe quem escreve, a FK comprova referência existente, e o código/testes de contrato evidenciam qual contexto produziu o payload. São garantias distintas: uma FK válida sozinha não autentica a origem do dado. DML administrativo fora do fluxo pode escapar das garantias de aplicação, e não se afirma que foi bloqueado pelo banco. Não introduzir backend, credencial privilegiada, RPC ou trigger como solução silenciosa; exigir prova contra esse outro modelo de ameaça seria novo contrato, fora desta etapa.

Qualquer futura mudança de comparadores para consumir lotes em vez de timestamps tem escopo/autorização próprios. LOG-03/A360-CUS-04 e os engines existentes não devem ser alterados incidentalmente para ativar o FK.

## Validação e reversão propostas

Validar uma execução com vários chunks, duas execuções com mesmo timestamp/competência, falha de chunk, ID inválido, falha de log, referências órfãs, legado NULL, leitura integral e upsert de versão sobrevivente. Provar preservação dos dados/custos/timestamps/chave/RLS e que não foram criados snapshots. Comparações não devem passar a usar FK sem contrato próprio aprovado.

Antes da ativação e com todos os vínculos NULL, a reversão de schema pode retirar apenas os objetos novos após conferência. Depois da ativação: suspender escritores, preservar backup das novas associações, desativar o contrato novo com segurança e somente então avaliar remoção dos objetos. Não retomar escritor antigo deixando FK obsoleto apresentado como última gravação. Rollback de schema não desfaz custos já sobrescritos nem recupera versões anteriores. Nunca usar essa reversão para limpar/recriar fatos.

Nome descritivo sugerido para uma migration futura: **`vinculo_lote_historico_custos`**, sem arquivo/timestamp reservado. A regra A já está confirmada. Continuam pré-condições: catálogo remoto verificado, writers atualizados/bloqueados integralmente, backup e testes de SEC-03/concorrência aprovados. O [plano original](../auditoria/custos-vinculo-lote-auditoria-arquitetural.md#6-plano-de-migration-futura-somente-descritivo) deve ser lido com o fechamento contratual da seção 10 e seus critérios de ativação. Criar a migration somente em tarefa autorizada; nenhum código SQL de migration é entregue agora.

## Contrato final do fluxo oficial e da validação futura

Schema conceitual: `historico_custos.log_importacao_id BIGINT NULL`, FK para `log_importacao(id)`; legado → NULL, sem reconstrução. A chave continua `codigo_produto + data_referencia`, com `normalizeCodigoProduto()`.

Execução → PK confirmada do log → contexto/batchId → todos os chunks → campo `log_importacao_id` em cada fato → upsert atômico de custo e vínculo. **Depois da ativação, o writer oficial não pode criar nem substituir fato sem lote confirmado.** Não usar default, timestamp ou lote falso para suprir ausência. Essa exigência é de aplicação/caminhos oficiais; a coluna continua nullable para preservar legado.

`data_referencia` permanece competência completa; `criado_em` conserva seu comportamento atual de timestamp/default, inclusive o valor anterior preservado pelo upsert. Não convertê-lo em horário do novo lote. O FK representa a execução da versão atual, não retenção de todas as versões ou todas as linhas do arquivo original. A seleção de A360-CUS-04 e OP × CUSTO não muda.

Os 20 cenários de contrato exigidos e regressões adicionais estão na seção 10 do relatório. São especificação para a implementação futura, sem novos testes dependentes de migration ainda não aprovada. Nesta etapa são executados os testes existentes e os comandos de qualidade do projeto; nenhum runtime/schema foi alterado.

## O que esta proposta não entrega

Não retém múltiplos snapshots do mesmo produto/data. O upsert continuará substituindo a versão anterior; um FK identifica a execução da versão sobrevivente. Reter todas as versões ou associação imutável de cada tentativa/arquivo com cada fato histórico é outro contrato, com persistência e aprovação próprias. Também não resolve recuperação transacional/idempotência de retries após resposta de rede incerta, fechamento de log ou importação interrompida.
