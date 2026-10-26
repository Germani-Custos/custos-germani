# Proposta separada — persistir o vínculo entre fato de Custos e execução

**Somente proposta documental — 26/10/2026. Não é migration executável nem autorização para DDL/DML.** Nenhum arquivo de migration foi criado. Não aplicada localmente ao projeto nem no Supabase. [Contrato parcial LOG-02](identidade-lote-custos.md).

**LOG-02 = PARCIAL. Pendência: vínculo persistido dos fatos ao lote de importação.** Retenção histórica de snapshots é dívida separada.

**Revisão arquitetural de 26/10/2026: REJEITADA / REPROJETAR antes da implementação.** O desenho mínimo de FK continua recomendado, mas há decisões relevantes pendentes: semântica no upsert, convivência de escritores e garantia esperada da proveniência. O catálogo remoto não foi confirmado; a consulta de metadados pelo conector falhou por ausência de `link_id`, sem executar SQL. Não classificar esta proposta como aprovada com ajustes enquanto essas questões persistirem. [Relatório completo, alternativas e testes futuros](../auditoria/custos-vinculo-lote-auditoria-arquitetural.md).

## Necessidade demonstrada

O schema versionado e a fotografia `tests/fixtures/acesso-operacional-schema.sql` têm `log_importacao.id` BIGINT/IDENTITY/PK, mas nenhum `log_importacao_id`, `batch_id` ou equivalente em `historico_custos`. As colunas de negócio/timestamps/autoria não armazenam esse vínculo. O log tem status, contagens, horários, usuário e competência, sem manifesto de fatos/chunks. Não há mecanismo equivalente de Custos a reutilizar além da própria PK do log.

Logo, sem coluna ou relação nova não é possível responder por leitura posterior quais fatos sobreviventes pertencem à execução. Gerar UUID no browser, aproximar horários, anexar ID apenas ao retorno ou escrever um texto em status não resolve essa persistência. Esta etapa entrega somente o que cabe no schema atual.

## Alteração mínima proposta para etapa futura

1. Conferir catálogo remoto, PK/tipos, FKs, colunas equivalentes, volume e contratos de acesso. Se existir vínculo equivalente posteriormente criado, reutilizá-lo após auditoria; não criar segunda fonte de verdade.
2. Adicionar **somente se confirmada a necessidade** uma coluna nullable `historico_custos.log_importacao_id BIGINT`, sem default. Reutilizar `log_importacao.id`; não criar tabela de lotes, UUID ou duplicar identidade no log.
3. FK recomendada para `log_importacao(id)`, com `ON DELETE RESTRICT`, `ON UPDATE RESTRICT`, não diferível. A tabela dona do vínculo é `historico_custos`: fato → zero/um log; log → zero/muitos fatos atuais. Preservar PKs, valores, timestamps e `unique_produto_data`; o FK não integra a chave de negócio. Nenhuma policy/grant é modificada por esta proposta.
4. Índice **não único** no FK para leitura por lote e manutenção referencial; considerar forma parcial `IS NOT NULL` após conferir planos/volume. A FK não cria automaticamente índice no lado do fato. Escolha e implantação dependem do catálogo/locks reais; nenhum índice criado nesta tarefa.
5. Legado permanece **NULL = vínculo não comprovado**. “Legado/não rastreado” é rótulo derivado, sem estado persistido adicional; NULL também pode representar uma escrita não rastreada, portanto não prova idade do registro. Não fazer backfill por proximidade de `criado_em`, competência, arquivo presumido ou usuário. Ausência não deve virar um lote sintético.
6. **Upsert depende de decisão humana.** A redação anterior já assumia a alternativa A; essa suposição foi retirada como decisão aprovada. Recomenda-se A: vínculo da última gravação bem-sucedida da versão sobrevivente, inclusive quando valores não mudam. B (origem) preservaria o primeiro lote conhecido e não explicaria os valores sobrescritos; C (histórico de versões) está fora do escopo. O [relatório](../auditoria/custos-vinculo-lote-auditoria-arquitetural.md) analisa as alternativas. Nenhuma delas foi implementada ou aprovada silenciosamente.
7. Se A for aprovada, o ID confirmado entra no mesmo payload/upsert dos custos, em todos os chunks, nunca num UPDATE posterior separado. Erro PostgreSQL com rollback confirmado do chunk conserva valores/vínculos anteriores; perda de resposta após possível COMMIT é indeterminada e exige reconciliação, sem afirmar rollback ou refazer automaticamente.

## Ordem e condições de ativação

Backup/provas integrais e revisão de locks/constraints antes da migration aprovada. Schema nullable primeiro, cliente escritor compatível depois, sem habilitar código que envie coluna inexistente. Sem escrita real de teste como parte desta proposta. Ensaiar em PostgreSQL isolado e com os contratos RLS existentes; não ampliar grants, usar service-role no frontend ou criar RPC/função SQL.

Antes da ativação, inventariar e controlar **todos os escritores**, incluindo versões antigas de abas, `upsertHistoricoCustos`, chamadas administrativas/service-role e scripts eventualmente ativos. Escritor que omita o FK pode tornar a proveniência incompleta ou obsoleta; não assumir que omitido significa NULL. A estratégia de bloqueio/atualização desses escritores precisa ser definida e validada antes de declarar última execução rastreável. Reverter o cliente para um escritor antigo e retomar gravações sem esse cuidado é inseguro.

A fachada atual é JavaScript executado no browser com Supabase Auth: o banco gera a PK, mas `Object.freeze` e validação cliente não impõem confiança no servidor. RLS do SEC-03 restringe quem escreve; a FK restringe existência, sem provar origem, propriedade ou status do log. Aceitar rastreabilidade declarada por administradores de confiança ou exigir garantia adicional é decisão explícita pendente. Não alterar RLS ou introduzir backend/credencial/trigger como solução silenciosa nesta etapa.

Qualquer futura mudança de comparadores para consumir lotes em vez de timestamps tem escopo/autorização próprios. LOG-03/A360-CUS-04 e os engines existentes não devem ser alterados incidentalmente para ativar o FK.

## Validação e reversão propostas

Validar uma execução com vários chunks, duas execuções com mesmo timestamp/competência, falha de chunk, ID inválido, falha de log, referências órfãs, legado NULL, leitura integral e upsert de versão sobrevivente. Provar preservação dos dados/custos/timestamps/chave/RLS e que não foram criados snapshots. Comparações não devem passar a usar FK sem contrato próprio aprovado.

Antes da ativação e com todos os vínculos NULL, a reversão de schema pode retirar apenas os objetos novos após conferência. Depois da ativação: suspender escritores, preservar backup das novas associações, desativar o contrato novo com segurança e somente então avaliar remoção dos objetos. Não retomar escritor antigo deixando FK obsoleto apresentado como última gravação. Rollback de schema não desfaz custos já sobrescritos nem recupera versões anteriores. Nunca usar essa reversão para limpar/recriar fatos.

Nome descritivo sugerido para uma migration futura: **`vinculo_lote_historico_custos`**, sem arquivo/timestamp reservado. Pré-condições: catálogo remoto confirmado, alternativa de upsert aprovada, contratos dos escritores definidos, backup e testes de SEC-03/concorrência aprovados. Ordem e critérios detalhados estão no [plano do relatório](../auditoria/custos-vinculo-lote-auditoria-arquitetural.md#6-plano-de-migration-futura-somente-descritivo). Criar a migration pelo fluxo oficial somente em tarefa autorizada; nenhum código SQL de migration é entregue nesta revisão.

## O que esta proposta não entrega

Não retém múltiplos snapshots do mesmo produto/data. O upsert continuará substituindo a versão anterior; um FK identifica a execução da versão sobrevivente. Reter todas as versões ou associação imutável de cada tentativa/arquivo com cada fato histórico é outro contrato, com persistência e aprovação próprias. Também não resolve recuperação transacional/idempotência de retries após resposta de rede incerta, fechamento de log ou importação interrompida.
