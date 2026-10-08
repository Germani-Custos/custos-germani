# Capítulo 15 — Migrações

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
