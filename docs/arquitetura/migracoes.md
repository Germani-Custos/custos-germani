# Capítulo 15 — Migrações

## CAD-COM-01 / CAD-COM-PROD-01 — migration aditiva aplicada (19/10/2026)

[`20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql`](../../sql/20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql), criada pelo Supabase CLI em diretório temporário e preservada no diretório SQL do projeto. Adiciona somente duas colunas TEXT NULL sem default no Master: `agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao`. Sem backfill/DML, constraint de obrigatoriedade, FK, tabela nova, índice, ponte Kustos ou alteração operacional/fatos. Validada previamente em PGlite e aplicada com autorização no Supabase **Custos-Germani / umpebdovrazzrdndhigc**, versão remota **20261019173633 / cadastro_mestre_agrupamento_comercial_erp**. O arquivo local conserva o timestamp original 20261019163220; o MCP registrou a versão remota ao aplicar somente esse SQL. Backup estrutural/dados foi salvo e verificado localmente antes da aplicação. Os 860 registros mantêm os valores anteriores e recebem NULL nos dois novos campos; operacional 6.113, Custos 1.370, OP 704 e mapa 292, com contagens e fingerprints SHA-256 idênticos antes/depois. Constraints/índices/RLS/policies/grants/triggers anteriores preservados nas 12 tabelas públicas. Sem carga XLS, DML de negócio, publicação ou outras migrations. [Provas da etapa de produção](../auditoria/cadastro-mestre-comercial-producao-etapa1.md). Remover colunas futuramente exige preservar seus dados e revisão própria, sem rollback destrutivo automático. UI/função V3 e novo Preview/aprovação são necessários após a migration. `data_referencia` e `criado_em` dos fatos continuam competência/importação. [Contrato](cadastro-mestre-agrupamento-comercial-erp.md).

## CAD-FAM-SCHEMA-01 — descrição de família não é identidade (15/10/2026)

Aplicada, mediante solicitação humana, **20261015182351 / categorias_familia_descricao_nao_unica**. [Migration isolada](../../sql/20261015182351_categorias_familia_descricao_nao_unica.sql): transação com limites de espera/execução, removendo exclusivamente `categorias_familia_descricao_key` com `RESTRICT`, sem `CASCADE` ou DML. O índice pertencente à constraint também é removido pelo PostgreSQL; os demais objetos permanecem intactos. `codigo` continua sendo a identidade de negócio; códigos diferentes podem compartilhar um rótulo.

Backup prévio dos 38 registros completos e metadados estruturais preservado localmente fora do repositório. Conferência antes/depois por SELECT:

- Registros: **38 → 38**; códigos distintos não nulos: **35 → 35**; descrições distintas: **38 → 38**. Os três códigos nulos legados permanecem intactos.
- `PRIMARY KEY (id)` / `categorias_familia_pkey`: preservada.
- Unicidade de `codigo` / índice `ux_categorias_familia_codigo`: preservada, com definição idêntica.
- `NOT NULL (descricao)`: preservado; todas as colunas, tipos e defaults idênticos.
- Somente `UNIQUE (descricao)` e seu índice de suporte foram removidos. Nenhuma outra constraint, índice ou relação mudou.
- Os 38 registros completos são idênticos, inclusive IDs e `criado_em`; fingerprint MD5 ordenado por `id`: **04b3645662df0f79ac18e9880d832592**, antes e depois.
- Contagens e fingerprints integrais idênticos nas cinco tabelas protegidas: Master ERP **860**, operacional **6.113**, Custos **1.370**, OP **704**, mapa **292**.

[Rollback manual preparado](../../sql/rollback_categorias_familia_descricao_nao_unica.sql), **não executado**: recria a constraint original, em transação, sem mudar registros. Se futuras inclusões gerarem descrições repetidas, o PostgreSQL recusará sua recriação; interromper e revisar, sem apagar ou renomear categorias para forçar a reversão. Não há rollback automático.

Validação local adicional com PostgreSQL em memória e tabela vazia conferiu apenas a migration de ida e preservação das guardas, sem INSERT/UPDATE/DELETE; rollback não foi executado nem localmente. A conferência real comparou registros completos, colunas, constraints, índices, relações e fingerprints das tabelas protegidas. Nenhum cadastro automático de famílias, alteração no executor, reconstrução, importação, sync, env ou commit nesta etapa. `data_referencia` (competência) e `criado_em` (importação) dos fatos permanecem intactos.

## Fase 3.4 — carga pontual versionada (08/10/2026)

Aplicada pelo Supabase MCP a migration **20261008184501 / fase3_4_execucao_cadastro_mestre**, preservada em [`sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql`](../../sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql). Somente DML no Master/log; sem DDL ou alteração de RLS. Lote 1 concluído, 103 inserções e 312 produtos atualizados, Master final 5.706. Guardas exigem o estado pré-carga e impedem repetição. **Não reexecutar**. Rollback futuro exige nova autorização/migration; imagens anteriores dos 312 atualizados estão no log. [Contrato e validações](cadastro-mestre-execucao-fase3-4.md).

Scripts SQL versionados no repositório:
- `sql/ajustar_precisao_historico_custos.sql`
- `sql/dicionario_master_produtos.sql`
- `sql/mapa_produtos.sql`
- `sql/inserir_custo.sql`
- `sql/variacao_percentual_produto.sql`
- `sql/2026-07-23_create_apontamentos_op.sql`
- `sql/2026-07-23_log_importacao_op_status.sql`
- `sql/2026-10-01_fase2a_estrutura_cadastro_mestre.sql`
- `sql/2026-10-05_fase2c2_estrutura_agrupamento_erp_proveniencia.sql`

Observação: o código frontend em produção usa `dicionario_produtos` como fonte da hierarquia de filtros.

`2026-10-01_fase2a_estrutura_cadastro_mestre.sql` é aditiva: cria `log_importacao_cadastro_mestre`, ativa RLS sem policy de escrita e adiciona a FK nula de proveniência ao mestre. Não importa dados, não modifica os 5.603 registros existentes e não reconcilia a dimensão operacional.

`2026-10-05_fase2c2_estrutura_agrupamento_erp_proveniencia.sql` é aditiva: adiciona proveniência bruta de agrupamento ao Master e suporte nulo a override/origem de classificação no operacional. Não atualiza registros existentes, não cria ponte ERP → Kustos e não altera fatos, mapa ou runtime.

## Auditoria de OP

Aplicar as duas migrações de OP em ordem cronológica. `apontamentos_op.op` permanece `INTEGER NOT NULL`; o parser do MCAP105 normaliza o ponto de milhar do valor de origem antes de enviá-lo ao banco.
