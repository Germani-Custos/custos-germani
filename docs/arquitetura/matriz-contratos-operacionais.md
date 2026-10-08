# Matriz de Contratos Operacionais (UI ↔ API ↔ Banco ↔ Engines)

Atualizado em: **2026-10-08**.

## Contrato adicional — Cadastro Mestre / Fase 3.1

`api.getCadastroMestrePreviewContext()` → SELECT paginado de `dicionario_master_produtos` (código, descrição, origem/família ERP e agrupamento ERP bruto), `categorias_origem` e `categorias_familia` (códigos exatos). Retorno `{data,error}`, sem fallback para contexto vazio em falha. Não há chamada nova UI→API nesta fase.

`previewArquivoCadastroMestre(arquivo,contexto,XLSX)` → adaptador de arquivo → `criarPreviewCadastroMestre(linhas,contexto)` puro → resumo/produtos/ausentes/excluídos/erros, sem escrita ou projeção operacional. [Contrato completo](./cadastro-mestre-preview.md).

Os métodos legados `getProductMaster`/`upsertProductMaster` continuam ligados a `dicionario_produtos`; não devem ser usados como fonte do novo Preview. A dimensão operacional segue necessária para Custos/OP; não substitui o Mestre ERP no novo contrato.

**CAD-UX-01 (2026-10-08):** `upsertProductMaster(payload)` interpreta `agrupamento_cod: ''`/`null` explicitamente informado como remoção e envia `NULL` via `buildManualProductMasterPayload`. Campo omitido preserva o atual. `importProductMasterXlsm` continua usando `buildProductMasterPayload`/reconciliação ERP, preservando vazios e agrupamento investigativo. Sem alteração de schema, Master ERP, mapa ou fatos; `data_referencia` e `criado_em` mantêm seus eixos. [Contrato de UX](../ux/cadastro-mestre.md).

## Objetivo

### Contrato adicional — Fase 3.3

`prepararAprovacaoArquivoCadastroMestre(arquivo,contexto,XLSX)` → leitura dos mesmos bytes + hashes → `criarManifestoCadastroMestre` puro → manifesto e revisão PENDENTE. `Agrup. Prod.` é o alias oficial para valor ERP, sem ponte Kustos. Decisões individuais/em lote e extração de aprovadas são exclusivamente locais. Não há nova chamada UI→API, escrita, executor ou alteração das telas do runtime. [Contrato](./cadastro-mestre-aprovacao.md).

Eliminar desalinhamentos entre camadas para preservar velocidade investigativa, rastreabilidade e previsibilidade operacional.

## Convenções

- `✅`: contrato atendido e validado.
- `⚠️`: contrato atendido com ressalva operacional/documental.
- `❌`: desalinhamento crítico (corrigido nesta auditoria).

## 1) Matriz UI → API

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| UI → API | `api.getMasters()` | Retornar `{origens,familias,agrupamentos,produtos,dicionario,hierarquia,diagnostico_sem_mapa,error}` | Sim | ✅ |
| UI → API | `api.importarHistoricoCustosComLog(payload,{dataReferencia})` | Import resiliente + `log_importacao` + erros linha a linha + `codigo_produto` normalizado por `normalizeCodigoProduto()` | Sim | ✅ |
| UI → API | `api.getHistorico(filters)` | Retornar histórico por intervalo ou duas competências explícitas, com `data_referencia` + `criado_em` + dimensões para cascata | Sim | ✅ |
| UI → API | `api.getProductHistory(codigoProduto, temporalFilters)` | Drill-through no mesmo intervalo ou competências explícitas do relatório, com delta e delta% apenas entre elas | Sim | ✅ (fail-fast para código vazio; sem meses intermediários em comparação) |
| UI → API | `api.getLatestImportComparison(filters)` | Comparar últimas 2 importações (`criado_em`) respeitando filtros cascata | Sim | ✅ (enriquecimento de dimensão corrigido) |
| UI → API | `api.getTopVariacoesImportacao(filters)` | Top aumentos/reduções entre últimas 2 importações com cascata válida | Sim | ✅ (enriquecimento de dimensão corrigido) |
| UI → API | `api.importarApontamentosOp({rows,dataReferencia,arquivoNome})` | Registrar lote e inserir apontamentos de OP; `op` já normalizada para inteiro pelo parser | Sim | ✅ (MNT-OP-01) |
| UI → API | `api.getApontamentosOp(filters)` | Consultar fatos da Auditoria de OP por competência, estágio, origem, OP e produto; a interpretação é local | Sim | ✅ (MNT-OP-02) |
| UI → API | `api.getProductMaster()` / `api.upsertProductMaster(payload)` | Consultar e manter `dicionario_produtos` como fonte única de Origem/Família | Sim | ✅ (TAREFA-3) |

## 2) Matriz API → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| API → DB | `historico_custos`: `codigo_produto, descricao, custo_variavel, custo_direto_fixo, custo_total, data_referencia, criado_em` | Fato temporal completo com `codigo_produto` canônico | Sim | ✅ |
| API → DB | `dicionario_produtos`: `codigo_produto, descricao, origem_id, familia_id, agrupamento_cod` | Dimensão de categorização | Sim | ✅ |
| API → DB | `log_importacao`: `status,total_linhas,linhas_importadas,linhas_erro,iniciado_em,finalizado_em,data_referencia` | Rastrear execução de import | Sim | ✅ |
| API → DB | `upsert` em `historico_custos` com `onConflict(codigo_produto,data_referencia)` | Deduplicação por competência | Sim | ✅ |
| API → DB | Consultas por importação com `ORDER BY criado_em` explícito | Temporalidade de import garantida | Sim | ✅ |
| API → DB | `apontamentos_op`: `origem,op,cod_produto,descricao,cod_estagio,estagio,unidade,...` | Eventos operacionais; `op` é inteiro obrigatório, `data_referencia` é competência e `criado_em` é importação | Sim | ✅ (MNT-OP-01) |
| API → DB | `log_importacao_op` | Rastrear total, linhas importadas/em erro e fechamento do lote de OP | Sim | ✅ |

## 3) Matriz report-engine → API/dados

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| report-engine | `origem_id/familia_id/agrupamento_cod` em memória | Filtro cascata correto | Sim | ✅ |
| report-engine | `criado_em` para `ultimaAtualizacao` | Distinção competência x importação | Sim | ✅ |
| report-engine | `data_referencia` para série temporal | Semântica temporal correta | Sim | ✅ |
| op-investigation-engine | `analyzeOpInvestigation(row)` | Derivar indicadores, decisão, motivo, provável causa e evidências sem alterar fatos do ERP | Sim | ✅ (MNT-OP-02 / MNT-OP-03) |

## 4) Matriz Importação → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| importação | validação por linha (`validateHistoricoRow`) | Falha parcial não derruba lote; código inválido é bloqueado sem persistência ambígua | Sim | ✅ |
| importação | chunking (400) no upsert | Escala operacional | Sim | ✅ |
| importação | tolerância a colunas extras (normalização) | Não quebrar lote por excesso de coluna | Sim | ✅ |
| importação | produtos sem dicionário → criação/órfão visível | Sem silenciamento; criação usa o mesmo código normalizado do histórico | Sim | ✅ |
| importação OP | erro de `.insert()` por chunk | Log obrigatório de chunk, primeiro registro e resposta Supabase; violação `NOT NULL` identifica registros/campo | Sim | ✅ (MNT-OP-01) |

### Normalização de código de produto (`VAL-01`)

- Função canônica: `normalizeCodigoProduto()` em `core/spreadsheet-engine.js`.
- Pontos cobertos: leitura XLSX com `raw:true`, preview, payload, API de importação, garantia de dicionário, filtros/cascata, relatório, drill-through, comparação entre importações e exportação derivada da fila investigativa.
- Fail-fast: código vazio, decimal ambíguo ou não inteiro em identificador numérico gera erro de linha; o lote segue com as demais linhas válidas.
- Temporalidade preservada: a normalização altera apenas a chave de negócio `codigo_produto`; `data_referencia` e `criado_em` mantêm seus significados separados.


### Regra canônica de alerta (`LOG-01`)

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| report-engine | `classifyAlert()` / `isAlertaCritico()` | Fonte única para alerta `abs(percentual) >= 5` sem arredondamento prévio | Sim | ✅ |
| report-engine/UI | `filterAlertRows()` | KPI **Alertas (>5%)**, filtro rápido e exportação retornam o mesmo conjunto lógico | Sim | ✅ |
| UI drill-through | `deltaPerc` via `isAlertaCritico({deltaPerc})` | Destaque visual usa o mesmo threshold absoluto, inclusive quedas | Sim | ✅ |
| exportação | fila `alerts` | Exporta exatamente as linhas do filtro rápido ativo | Sim | ✅ |

Temporalidade: a seleção do relatório continua por `data_referencia`; o alerta compara última vs. penúltima importação no eixo `criado_em`. `null` é ausência legítima de comparativo e não alerta; `undefined`/`NaN` falha rápido.

## 5) Matriz Exportação → report-engine/UI

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| exportação | abas `Contexto` + `Fila Investigativa` | Handoff operacional; popup seleciona colunas da fila a partir do estado já carregado, sem nova consulta | Sim | ✅ |
| exportação | ordenação automática por criticidade (quando sem ordenação manual) | Priorização investigativa | Sim | ✅ |
| exportação | metadados de período e temporalidade (`data_referencia` x `criado_em`) | Rastreabilidade | Sim | ✅ |

## Desalinhamentos encontrados e correções aplicadas

1. **Filtro cascata inconsistente** em `getLatestImportComparison` e `getTopVariacoesImportacao`.
   - Causa: query em `historico_custos` sem `origem_id/familia_id/agrupamento_cod` (campos da dimensão).
   - Correção: enriquecimento via `dicionario_produtos` antes de aplicar cascata.

2. **Ausência de fail-fast no drill-through** (`getProductHistory`).
   - Causa: `codigoProduto` vazio gerava consulta ambígua.
   - Correção: validação explícita + erro operacional padronizado.

3. **Inconsistência de retorno e erro contextual** em métodos críticos da API.
   - Causa: respostas heterogêneas e propagação direta de erros sem contexto operacional.
   - Correção: padronização de retorno `{ data, error }` + `OperationalContractError` com `details` e causa em `getHistorico`, `upsertHistoricoCustos`, `getLatestImportComparison`, `getTopVariacoesImportacao` e `getProductHistory`.


4. **Divergência do KPI/filtro de alertas (LOG-01)**.
   - Causa: KPI contava `row.alert` por `variacaoTemporal`, enquanto filtro rápido/exportação usavam `row.variacao > 5` do período.
   - Correção: helper canônico `classifyAlert()`/`isAlertaCritico()` e `filterAlertRows()` aplicados a KPI, filtro, tabela, drill-through, ranking e exportação.

## Contrato padronizado de erro (operacional)

Formato mínimo esperado em todos os métodos API:

```js
{ data: null, error: Error }
```

- Erros de contrato interno usam `name = "OperationalContractError"` e `details` para diagnóstico.
- Sem fallback mágico silencioso quando parâmetro obrigatório faltar.
- Diagnóstico de órfãos deve distinguir `{ status: 'ok', rows: [] }` (nenhum órfão encontrado) de `{ status: 'indisponivel', rows: [], error }` (não foi possível validar produtos sem agrupamento).

## Checklist de prevenção contínua

- [ ] Toda query com filtro cascata deve operar em dataset com campos de dimensão resolvidos.
- [ ] Toda query temporal deve explicitar eixo (`data_referencia` vs `criado_em`).
- [ ] Todo método UI→API deve estar listado e testado após mudança de assinatura.
- [ ] Todo payload de escrita deve ser validado por whitelist de colunas da tabela alvo.
- [ ] Todo novo fluxo com `codigo_produto` deve chamar `normalizeCodigoProduto()` e falhar explicitamente se o retorno for vazio.
- [ ] Toda mudança de contrato deve atualizar `README.md`, `VISION.md`, `ROADMAP.md` e esta matriz.


## 6) Saneamento de schema Supabase (2026-05-25)

- `historico_custos` alinhada com payload/API: `custo_variavel`, `custo_direto_fixo`, `custo_total`, `data_referencia`, `criado_em`.
- `unique_produto_data` garantido para deduplicação por competência.
- Órfãos de agrupamento tratados com fallback explícito `SEM_AGRUPAMENTO` (sem mascaramento).
- Índices críticos de investigação e drill-through reforçados.
- View `vw_produtos_orfaos_agrupamento` adicionada para auditoria contínua.

## 7) Contrato investigativo da Auditoria de OP (MNT-OP-02 / MNT-OP-03)

- **ERP:** `apontamentos_op` é a fonte imutável de quantidades, tempos, produtividade, parada e `% Tempo`; não há migration nem escrita de indicadores calculados.
- **Kustos:** `core/op-investigation-engine.js` calcula `atendimentoProducaoPct`, `desvioTempoPct`, `desvioProdutividadePct` e `indiceParadasPct`; acrescenta `mereceInvestigacao`, `decisao` e `evidencias`; `view/ui-op.js` consome somente esse contrato para fila, filtro e dossiê.
- **Regra central:** nenhum indicador isolado decide o motivo ou a prioridade. Produção entregue + tempo alto + KG/Hora baixo + parada material indica desperdício; com déficit de produção, indica paradas com impacto e prioridade máxima. Tempo alto com KG/Hora praticamente estável só não alerta se a produção adicional explicar o tempo; parada material sem impacto em produção, tempo e produtividade é registro sem prioridade.
- **Conferência:** `% Tempo (ERP)` é comparado ao desvio de produtividade com tolerância de 0,2 p.p., sem adicionar uma segunda penalidade. Divergência pede conferência do apontamento na origem.
- **Temporalidade:** `data_referencia` continua sendo competência do recorte e `criado_em` é mostrado no dossiê como evento de importação; ambos ficam fora das fórmulas de execução da OP.
