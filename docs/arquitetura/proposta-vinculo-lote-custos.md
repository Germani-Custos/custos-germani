# Proposta separada — persistir o vínculo entre fato de Custos e execução

**Somente proposta documental — 26/10/2026. Não é migration executável nem autorização para DDL/DML.** Nenhum arquivo de migration foi criado. Não aplicada localmente ao projeto nem no Supabase. [Contrato parcial LOG-02](identidade-lote-custos.md).

## Necessidade demonstrada

O schema versionado e a fotografia `tests/fixtures/acesso-operacional-schema.sql` têm `log_importacao.id` BIGINT/IDENTITY/PK, mas nenhum `log_importacao_id`, `batch_id` ou equivalente em `historico_custos`. As colunas de negócio/timestamps/autoria não armazenam esse vínculo. O log tem status, contagens, horários, usuário e competência, sem manifesto de fatos/chunks. Não há mecanismo equivalente de Custos a reutilizar além da própria PK do log.

Logo, sem coluna ou relação nova não é possível responder por leitura posterior quais fatos sobreviventes pertencem à execução. Gerar UUID no browser, aproximar horários, anexar ID apenas ao retorno ou escrever um texto em status não resolve essa persistência. Esta etapa entrega somente o que cabe no schema atual.

## Alteração mínima proposta para etapa futura

1. Conferir catálogo remoto, PK/tipos, FKs, colunas equivalentes, volume e contratos de acesso. Se existir vínculo equivalente posteriormente criado, reutilizá-lo após auditoria; não criar segunda fonte de verdade.
2. Adicionar **somente se confirmada a necessidade** uma coluna nullable `historico_custos.log_importacao_id BIGINT`, sem default. Reutilizar `log_importacao.id`; não criar tabela de lotes, UUID ou duplicar identidade no log.
3. FK para `log_importacao(id)`, sem exclusão em cascata nem reatribuição automática de lote. Preservar todos os IDs, valores e timestamps existentes. Não alterar `unique_produto_data`, chave produto/data, upsert, Auth ou RLS.
4. Índice de leitura no FK, se necessário ao acesso posterior por lote, com plano de implantação próprio conforme volume/locks. Nenhum índice criado nesta tarefa.
5. Legado permanece **NULL = lote não rastreável**. Não fazer backfill por proximidade de `criado_em`, competência, arquivo presumido ou usuário. Ausência não deve virar um lote sintético.
6. Em implementação posterior compatível com o schema, enviar o mesmo `log_importacao_id` confirmado em todos os upserts daquela execução, preservando o ID técnico em toda a leitura que precise desse rastreio. Nova execução troca o vínculo da versão sobrevivente apenas quando seu upsert ocorrer com sucesso; chunk rejeitado mantém o estado anterior.

## Ordem e condições de ativação

Backup/provas integrais e revisão de locks/constraints antes da migration aprovada. Schema nullable primeiro, cliente escritor compatível depois, sem habilitar código que envie coluna inexistente. Sem escrita real de teste como parte desta proposta. Ensaiar em PostgreSQL isolado e com os contratos RLS existentes; não ampliar grants, usar service-role no frontend ou criar RPC/função SQL.

Qualquer futura mudança de comparadores para consumir lotes em vez de timestamps tem escopo/autorização próprios. LOG-03/A360-CUS-04 e os engines existentes não devem ser alterados incidentalmente para ativar o FK.

## Validação e reversão propostas

Validar uma execução com vários chunks, duas execuções com mesmo timestamp/competência, falha de chunk, ID inválido, falha de log, referências órfãs, legado NULL, leitura integral e upsert de versão sobrevivente. Provar preservação dos dados/custos/timestamps/chave/RLS e que não foram criados snapshots. Comparações não devem passar a usar FK sem contrato próprio aprovado.

Reversão de cliente deve preceder eventual remoção da coluna/FK/índice; avaliar perda da nova proveniência e salvar backup antes de qualquer remoção. Nunca usar essa reversão para limpar/recriar fatos. Criar a migration pelo fluxo oficial somente quando autorizada; não há nome/versão de migration reservado por este documento.

## O que esta proposta não entrega

Não retém múltiplos snapshots do mesmo produto/data. O upsert continuará substituindo a versão anterior; um FK identifica a execução da versão sobrevivente. Reter todas as versões ou associação imutável de cada tentativa/arquivo com cada fato histórico é outro contrato, com persistência e aprovação próprias. Também não resolve recuperação transacional/idempotência de retries após resposta de rede incerta, fechamento de log ou importação interrompida.
