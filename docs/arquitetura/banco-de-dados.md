# Capítulo 6 — Banco de Dados

Escopo vigente: [CAD-FAM-01](cadastro-mestre-familias-erp.md) permite somente famílias aprovadas na transação do Master, com proteção integral de catálogo; rótulos podem repetir entre códigos após [CAD-FAM-SCHEMA-01](migracoes.md). Relatos estruturais abaixo preservam o que foi criado em cada etapa, sem afirmar ausência atual de lotes. Reconstrução posterior já consta nas [evidências de 15/10](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026); não houve consulta de banco nesta revisão documental.

## Atualização 09/10/2026 — universo mestre e snapshot

`dicionario_master_produtos` passa a refletir exatamente o arquivo ERP filtrado após execução integral aprovada. Somente Master recebe remoções. Snapshot anterior completo, SHA256, remoções, decisões e contagens ficam em `log_importacao_cadastro_mestre.metadados_origem` (JSONB existente), além de cópia durável independente. Novas escritas mantêm as FKs de lote existentes; linhas removidas ficam rastreáveis pelo log/snapshot. Nenhum schema, migration, política, fato ou dimensão operacional é alterado. A transação usa conexão administrativa separada; frontend continua `supabase.from()` somente leitura neste fluxo. [Contrato](./cadastro-mestre-reconstrucao.md). `data_referencia` permanece competência e `criado_em` evento de importação nos fatos.

## Saneamento operacional (2026-05-25)

Migração aplicada em `sql/2026-05-25_saneamento_operacional_schema.sql` para alinhar schema real com API/UI/engines, com foco em velocidade investigativa e previsibilidade temporal.

## Tabelas centrais e contratos

Conferência somente leitura de identidade/classificação em 30/10/2026: [Auditoria 3](../auditoria/cadastro-mestre-universo-canonico.md). Os tipos de referência abaixo refletem o catálogo real; os relatos de preparação e carga permanecem datados, sem autorizar nova execução.

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
- `origem_id` TEXT (referência ao ID da categoria de origem)
- `familia_id` TEXT (referência ao ID da categoria de família, atualmente em formato UUID)
- `agrupamento_cod` TEXT FK → `categorias_agrupamento.id` (classificação efetiva Kustos)
- `agrupamento_override_manual_cod` TEXT NULL FK → `categorias_agrupamento.id`
- `agrupamento_classificacao_origem` TEXT NULL (`MASTER`, `MANUAL`, `LEGADO_NAO_RASTREAVEL`)

É a dimensão operacional e fonte da OP. Em Custos, CUSTOS-ERP-01 usa origem/família do Master ERP em memória para códigos presentes nele; somente códigos fora do Master usam origem/família operacional. Agrupamento permanece sempre operacional. A classificação é atual, não reescreve `historico_custos` nem `apontamentos_op`.

### `dicionario_master_produtos` (CADASTRO MESTRE ERP)
- `codigo_produto` TEXT PK
- `descricao`, `familia_cod`, `origem_cod` TEXT (dados básicos do ERP)
- `ultima_importacao_cadastro_mestre_id` BIGINT NULL FK → `log_importacao_cadastro_mestre.id`
- `agrupamento_erp_valor` TEXT NULL (Agrup. Prod. bruto recebido do ERP)
- `agrupamento_comercial_erp_cod` TEXT NULL e `agrupamento_comercial_erp_descricao` TEXT NULL (Agrup. Com. e seu rótulo, opcionais; migration CAD-COM-01 aplicada em produção como 20261019173633 na etapa CAD-COM-PROD-01, que terminou sem carga comercial. A fotografia de 30/10 confirma 162 pares preenchidos e 698 vazios; isso não atribui a origem da carga nem autoriza repeti-la)
- `agrupamento_erp_importacao_id` BIGINT NULL FK → `log_importacao_cadastro_mestre.id`

É a fonte ERP consultada pelo painel Cadastro Mestre ERP, separada da classificação operacional. As colunas de agrupamento ERP preservam o valor bruto e seu lote, mas não o convertem para categoria Kustos: a ponte ERP → Kustos ainda não existe. `dicionario_produtos` continua sendo a dimensão operacional do runtime. A projeção CUSTOS-ERP-01 enriquece exclusivamente a análise de Custos com origem/família ERP, sem reconciliação ou escrita; presença no Master determina autoridade inclusive quando o campo é vazio. Nenhuma família ERP sem ponte determinística deve ser categorizada por descrição.

### `log_importacao_cadastro_mestre`
- registra arquivo/lote, tipo de arquivo (`XLSM`, `XLSX`, `XLS`), hash ou identificador, execução, contagens, resultado, erros e metadados de origem;
- RLS ativo, sem policy de escrita antes da implementação aprovada do importer;
- o registro de ausência de importações pertence à etapa estrutural original; a primeira carga e reconstrução posteriores estão documentadas nos contratos/evidências, sem nova leitura nesta revisão.

### `categorias_origem`
- `id` TEXT (chave técnica; os 50 valores atuais coincidem com `codigo`)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_familia`
- `id` TEXT (chave técnica, valores em formato UUID distintos do código de negócio)
- `codigo` TEXT (chave de negócio)
- `descricao` TEXT

### `categorias_agrupamento`
- `id` TEXT (chave de negócio e destino das FKs de agrupamento)
- `descricao` TEXT
- Registro operacional obrigatório: `SEM_AGRUPAMENTO`

### `log_importacao`
- `id` BIGINT/IDENTITY/PK existente: identidade reutilizada da execução de Custos (`batchId` textual no retorno).
- rastreabilidade de execução de import (`status`, volumes, `iniciado_em`, `finalizado_em`, `data_referencia`)
- Na preparação inicial de LOG-02 o vínculo ainda não existia. Situação vigente após a ativação de 29/10: `historico_custos.log_importacao_id` referencia este log no mesmo upsert, conforme a descrição atual do fato acima. Permanecem 2.132 fatos legados NULL e 349 vinculados ao lote 31 na fotografia de 30/10; não associar legado por horário/competência. LOG-02 continua parcial pelo aceite multichunk, sem snapshots de versões. [Contrato](identidade-lote-custos.md) e [provas da ativação](../auditoria/custos-lote-ativacao-validacao.md).

### `apontamentos_op` e `log_importacao_op`
- `apontamentos_op` guarda cada evento do relatório de apontamentos de OP, associado opcionalmente a `log_importacao_op`.
- `data_referencia` DATE NOT NULL é a competência do relatório; `criado_em` TIMESTAMPTZ NOT NULL DEFAULT now() é o momento de persistência.
- `origem`, `cod_produto`, `descricao`, `cod_estagio`, `estagio` e `unidade` são obrigatórios.
- `op` INTEGER NOT NULL é o número de OP. O parser do MCAP105 remove o ponto usado como separador de milhar antes da conversão (por exemplo, `2.081` → `2081`).
- Migrações: `2026-07-23_create_apontamentos_op.sql` e `2026-07-23_log_importacao_op_status.sql`.
- MNT-OP-02 não cria colunas: os indicadores e a classificação investigativa são derivados localmente de cada fato pelo `core/op-investigation-engine.js`. Isso preserva o relatório ERP como evidência imutável.

## Estratégia para órfãos de agrupamento

- Ausência de `agrupamento_cod` permanece explícita, inclusive NULL; não há preenchimento automático comprovado com `SEM_AGRUPAMENTO`. A sentinela existente indica pendência, não grupo investigativo atribuído.
- A view legada `vw_produtos_orfaos_agrupamento` deriva do operacional: a sentinela retorna `PENDENTE_CATEGORIZACAO`; referência sem correspondência, inclusive NULL, retorna `AGRUPAMENTO_INVALIDO`; vínculo encontrado retorna `OK`. Ela não cria identidades nem é fonte da leitura atual de diagnóstico da API.
- O diagnóstico frontend usa apenas `supabase.from()` e não deve depender de uma coluna única de `categorias_agrupamento`; a chave válida é resolvida por `codigo`/`id`/`cod`. Falha de consulta retorna estado `indisponivel`, não `[]`.

## Índices operacionais críticos

- `idx_historico_codigo_produto`
- `idx_historico_data_referencia`
- `idx_historico_criado_em`
- `idx_historico_produto_data`
- `idx_dicionario_agrupamento_cod`

## Regra de identidade

- Frontend exibe `descricao`.
- Produto usa `normalizeCodigoProduto()` compartilhado por `codigo_produto` e `cod_produto` de OP; categorias usam seus códigos/IDs conforme o contrato de cada fonte. Descrição não define identidade nem equivalência entre códigos.
- UUID é chave técnica, nunca semântica de negócio.
