# Capítulo 6 — Banco de Dados

Escopo vigente: [CAD-FAM-01](cadastro-mestre-familias-erp.md) permite somente famílias aprovadas na transação do Master, com proteção integral de catálogo; rótulos podem repetir entre códigos após [CAD-FAM-SCHEMA-01](migracoes.md). Relatos estruturais abaixo preservam o que foi criado em cada etapa, sem afirmar ausência atual de lotes. Reconstrução posterior já consta nas [evidências de 15/10](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026); não houve consulta de banco nesta revisão documental.

## Atualização 09/10/2026 — universo mestre e snapshot

`dicionario_master_produtos` passa a refletir exatamente o arquivo ERP filtrado após execução integral aprovada. Somente Master recebe remoções. Snapshot anterior completo, SHA256, remoções, decisões e contagens ficam em `log_importacao_cadastro_mestre.metadados_origem` (JSONB existente), além de cópia durável independente. Novas escritas mantêm as FKs de lote existentes; linhas removidas ficam rastreáveis pelo log/snapshot. Nenhum schema, migration, política, fato ou dimensão operacional é alterado. A transação usa conexão administrativa separada; frontend continua `supabase.from()` somente leitura neste fluxo. [Contrato](./cadastro-mestre-reconstrucao.md). `data_referencia` permanece competência e `criado_em` evento de importação nos fatos.

## Saneamento operacional (2026-05-25)

Migração aplicada em `sql/2026-05-25_saneamento_operacional_schema.sql` para alinhar schema real com API/UI/engines, com foco em velocidade investigativa e previsibilidade temporal.

## Tabelas centrais e contratos

### `historico_custos` (FATO)

**Catálogo e migration conferidos em 29/10/2026:** o remoto tem `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `codigo_produto TEXT NULL`, `criado_em TIMESTAMPTZ NULL DEFAULT now()`, `custo_total NUMERIC(15,2) NOT NULL` e componentes de custo NUMERIC sem escala fixa. `data_referencia` é DATE NOT NULL; `unique_produto_data` preservada. A descrição anterior inferiu erroneamente ausência de escala a partir de data_type=NUMERIC; numeric_precision/numeric_scale confirmam 15/2 para o total. Nada foi saneado/alterado nessas colunas. LOG-02 aplicado como 20261029165515: `log_importacao_id BIGINT NULL` sem default, FK RESTRICT não diferível e índice parcial não único. Após DDL, 2.481 legados NULL; duas reimportações reais das mesmas 349 chaves agora apontam ao lote 31, sem mudar valores/IDs/datas/timestamps ou criar linhas; 2.132 legados não tocados seguem NULL. Sem backfill/snapshots. Um chunk por execução; multichunk produtivo pendente. [Contrato](proposta-vinculo-lote-custos.md) e [provas](../auditoria/custos-lote-ativacao-validacao.md). A lista abaixo é estrutura histórica, não o catálogo atual.

Estrutura descrita no saneamento histórico:
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
- `agrupamento_cod` TEXT FK → `categorias_agrupamento.id` (classificação efetiva Kustos)
- `agrupamento_override_manual_cod` TEXT NULL FK → `categorias_agrupamento.id`
- `agrupamento_classificacao_origem` TEXT NULL (`MASTER`, `MANUAL`, `LEGADO_NAO_RASTREAVEL`)

É a dimensão operacional e fonte da OP. Em Custos, CUSTOS-ERP-01 usa origem/família do Master ERP em memória para códigos presentes nele; somente códigos fora do Master usam origem/família operacional. Agrupamento permanece sempre operacional. A classificação é atual, não reescreve `historico_custos` nem `apontamentos_op`.

### `dicionario_master_produtos` (CADASTRO MESTRE ERP)
- `codigo_produto` TEXT PK
- `descricao`, `familia_cod`, `origem_cod` TEXT (dados básicos do ERP)
- `ultima_importacao_cadastro_mestre_id` BIGINT NULL FK → `log_importacao_cadastro_mestre.id`
- `agrupamento_erp_valor` TEXT NULL (Agrup. Prod. bruto recebido do ERP)
- `agrupamento_comercial_erp_cod` TEXT NULL e `agrupamento_comercial_erp_descricao` TEXT NULL (Agrup. Com. e seu rótulo, opcionais; migration CAD-COM-01 aplicada em produção como 20261019173633 na etapa CAD-COM-PROD-01; ainda sem carga comercial)
- `agrupamento_erp_importacao_id` BIGINT NULL FK → `log_importacao_cadastro_mestre.id`

É a fonte ERP consultada pelo painel Cadastro Mestre ERP, separada da classificação operacional. As colunas de agrupamento ERP preservam o valor bruto e seu lote, mas não o convertem para categoria Kustos: a ponte ERP → Kustos ainda não existe. `dicionario_produtos` continua sendo a dimensão operacional do runtime. A projeção CUSTOS-ERP-01 enriquece exclusivamente a análise de Custos com origem/família ERP, sem reconciliação ou escrita; presença no Master determina autoridade inclusive quando o campo é vazio. Nenhuma família ERP sem ponte determinística deve ser categorizada por descrição.

### `log_importacao_cadastro_mestre`
- registra arquivo/lote, tipo de arquivo (`XLSM`, `XLSX`, `XLS`), hash ou identificador, execução, contagens, resultado, erros e metadados de origem;
- RLS ativo, sem policy de escrita antes da implementação aprovada do importer;
- o registro de ausência de importações pertence à etapa estrutural original; a primeira carga e reconstrução posteriores estão documentadas nos contratos/evidências, sem nova leitura nesta revisão.

### `categorias_origem`
- `id` UUID (chave técnica)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_familia`
- `id` UUID (chave técnica)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_agrupamento`
- `id` TEXT (chave de negócio e destino das FKs de agrupamento)
- `descricao` TEXT
- Registro operacional obrigatório: `SEM_AGRUPAMENTO`

### `log_importacao`
- `id` BIGINT/IDENTITY/PK existente: identidade reutilizada da execução de Custos (`batchId` textual no retorno).
- rastreabilidade de execução de import (`status`, volumes, `iniciado_em`, `finalizado_em`, `data_referencia`)
- LOG-02 parcial: o schema versionado não possui vínculo equivalente do fato `historico_custos` para esse log. O controle do chunk contém o ID, mas o payload do fato não recebe coluna inexistente. Legado não é associado por horário/competência. [Contrato](identidade-lote-custos.md) e [proposta documental separada](proposta-vinculo-lote-custos.md); nenhuma migration aplicada ou retenção de snapshots criada. Catálogo remoto precisa ser conferido antes de qualquer futura alteração autorizada.

### `apontamentos_op` e `log_importacao_op`
- `apontamentos_op` guarda cada evento do relatório de apontamentos de OP, associado opcionalmente a `log_importacao_op`.
- `data_referencia` DATE NOT NULL é a competência do relatório; `criado_em` TIMESTAMPTZ NOT NULL DEFAULT now() é o momento de persistência.
- `origem`, `cod_produto`, `descricao`, `cod_estagio`, `estagio` e `unidade` são obrigatórios.
- `op` INTEGER NOT NULL é o número de OP. O parser do MCAP105 remove o ponto usado como separador de milhar antes da conversão (por exemplo, `2.081` → `2081`).
- Migrações: `2026-07-23_create_apontamentos_op.sql` e `2026-07-23_log_importacao_op_status.sql`.
- MNT-OP-02 não cria colunas: os indicadores e a classificação investigativa são derivados localmente de cada fato pelo `core/op-investigation-engine.js`. Isso preserva o relatório ERP como evidência imutável.

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
