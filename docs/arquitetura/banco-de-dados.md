# Capítulo 6 — Banco de Dados

## Saneamento operacional (2026-05-25)

Migração aplicada em `sql/2026-05-25_saneamento_operacional_schema.sql` para alinhar schema real com API/UI/engines, com foco em velocidade investigativa e previsibilidade temporal.

## Tabelas centrais e contratos

### `historico_custos` (FATO)
- `codigo_produto` TEXT NOT NULL
- `descricao` TEXT
- `custo_variavel` NUMERIC(18,4)
- `custo_direto_fixo` NUMERIC(18,4)
- `custo_total` NUMERIC(18,4) NOT NULL
- `data_referencia` DATE NOT NULL (**competência operacional**)
- `criado_em` TIMESTAMPTZ NOT NULL DEFAULT now() (**evento de importação**)
- Constraint: `unique_produto_data` = UNIQUE(`codigo_produto`,`data_referencia`)

### `dicionario_produtos` (DIMENSÃO)
- `codigo_produto` TEXT NOT NULL
- `descricao` TEXT
- `origem_id` UUID
- `familia_id` UUID
- `agrupamento_cod` TEXT FK → `categorias_agrupamento.codigo`

### `categorias_origem`
- `id` UUID (chave técnica)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_familia`
- `id` UUID (chave técnica)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_agrupamento`
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT
- Registro operacional obrigatório: `SEM_AGRUPAMENTO`

### `log_importacao`
- rastreabilidade de execução de import (`status`, volumes, `iniciado_em`, `finalizado_em`, `data_referencia`)

### `apontamentos_op` e `log_importacao_op`
- `apontamentos_op` guarda cada evento do relatório de apontamentos de OP, associado opcionalmente a `log_importacao_op`.
- `data_referencia` DATE NOT NULL é a competência do relatório; `criado_em` TIMESTAMPTZ NOT NULL DEFAULT now() é o momento de persistência.
- `origem`, `cod_produto`, `descricao`, `cod_estagio`, `estagio` e `unidade` são obrigatórios.
- `op` INTEGER NOT NULL é o número de OP. O parser do MCAP105 remove o ponto usado como separador de milhar antes da conversão (por exemplo, `2.081` → `2081`).
- Migrações: `2026-07-23_create_apontamentos_op.sql` e `2026-07-23_log_importacao_op_status.sql`.

## Estratégia para órfãos de agrupamento

- Produto sem `agrupamento_cod` recebe fallback explícito `SEM_AGRUPAMENTO`.
- Inconsistência não é mascarada: usar a view `vw_produtos_orfaos_agrupamento` para triagem (`PENDENTE_CATEGORIZACAO`, `AGRUPAMENTO_INVALIDO`, `OK`).
- O diagnóstico frontend usa apenas `supabase.from()` e não deve depender de uma coluna única de `categorias_agrupamento`; a chave válida é resolvida por `codigo`/`id`/`cod`. Falha de consulta retorna estado `indisponivel`, não `[]`.

## Índices operacionais críticos

- `idx_historico_codigo_produto`
- `idx_historico_data_referencia`
- `idx_historico_criado_em`
- `idx_historico_produto_data`
- `idx_dicionario_agrupamento_cod`

## Regra de identidade

- Frontend exibe `descricao`.
- Backend usa `codigo`/FK.
- UUID é chave técnica, nunca semântica de negócio.
