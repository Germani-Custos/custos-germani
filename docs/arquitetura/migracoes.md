# Capítulo 15 — Migrações

Scripts SQL versionados no repositório:
- `sql/ajustar_precisao_historico_custos.sql`
- `sql/dicionario_master_produtos.sql`
- `sql/mapa_produtos.sql`
- `sql/inserir_custo.sql`
- `sql/variacao_percentual_produto.sql`
- `sql/2026-07-23_create_apontamentos_op.sql`
- `sql/2026-07-23_log_importacao_op_status.sql`
- `sql/2026-10-01_fase2a_estrutura_cadastro_mestre.sql`

Observação: o código frontend em produção usa `dicionario_produtos` como fonte da hierarquia de filtros.

`2026-10-01_fase2a_estrutura_cadastro_mestre.sql` é aditiva: cria `log_importacao_cadastro_mestre`, ativa RLS sem policy de escrita e adiciona a FK nula de proveniência ao mestre. Não importa dados, não modifica os 5.603 registros existentes e não reconcilia a dimensão operacional.

## Auditoria de OP

Aplicar as duas migrações de OP em ordem cronológica. `apontamentos_op.op` permanece `INTEGER NOT NULL`; o parser do MCAP105 normaliza o ponto de milhar do valor de origem antes de enviá-lo ao banco.
