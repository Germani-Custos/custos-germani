# Matriz de Contratos Operacionais (UI ↔ API ↔ Banco ↔ Engines)

Atualizado em: **2026-05-25**.

## Objetivo

Eliminar desalinhamentos entre camadas para preservar velocidade investigativa, rastreabilidade e previsibilidade operacional.

## Convenções

- `✅`: contrato atendido e validado.
- `⚠️`: contrato atendido com ressalva operacional/documental.
- `❌`: desalinhamento crítico (corrigido nesta auditoria).

## 1) Matriz UI → API

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| UI → API | `api.getMasters()` | Retornar `{origens,familias,agrupamentos,produtos,dicionario,hierarquia,diagnostico_sem_mapa,error}` | Sim | ✅ |
| UI → API | `api.importarHistoricoCustosComLog(payload,{dataReferencia})` | Import resiliente + `log_importacao` + erros linha a linha | Sim | ✅ |
| UI → API | `api.getHistorico(filters)` | Retornar histórico com `data_referencia` + `criado_em` + dimensões para cascata | Sim | ✅ |
| UI → API | `api.getProductHistory(codigoProduto)` | Drill-through completo com delta e delta% | Sim | ✅ (fail-fast adicionado p/ código vazio) |
| UI → API | `api.getLatestImportComparison(filters)` | Comparar últimas 2 importações (`criado_em`) respeitando filtros cascata | Sim | ✅ (enriquecimento de dimensão corrigido) |
| UI → API | `api.getTopVariacoesImportacao(filters)` | Top aumentos/reduções entre últimas 2 importações com cascata válida | Sim | ✅ (enriquecimento de dimensão corrigido) |

## 2) Matriz API → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| API → DB | `historico_custos`: `codigo_produto, descricao, custo_variavel, custo_direto_fixo, custo_total, data_referencia, criado_em` | Fato temporal completo | Sim | ✅ |
| API → DB | `dicionario_produtos`: `codigo_produto, descricao, origem_id, familia_id, agrupamento_cod` | Dimensão de categorização | Sim | ✅ |
| API → DB | `log_importacao`: `status,total_linhas,linhas_importadas,linhas_erro,iniciado_em,finalizado_em,data_referencia` | Rastrear execução de import | Sim | ✅ |
| API → DB | `upsert` em `historico_custos` com `onConflict(codigo_produto,data_referencia)` | Deduplicação por competência | Sim | ✅ |
| API → DB | Consultas por importação com `ORDER BY criado_em` explícito | Temporalidade de import garantida | Sim | ✅ |

## 3) Matriz report-engine → API/dados

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| report-engine | `origem_id/familia_id/agrupamento_cod` em memória | Filtro cascata correto | Sim | ✅ |
| report-engine | `criado_em` para `ultimaAtualizacao` | Distinção competência x importação | Sim | ✅ |
| report-engine | `data_referencia` para série temporal | Semântica temporal correta | Sim | ✅ |

## 4) Matriz Importação → Banco

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| importação | validação por linha (`validateHistoricoRow`) | Falha parcial não derruba lote | Sim | ✅ |
| importação | chunking (400) no upsert | Escala operacional | Sim | ✅ |
| importação | tolerância a colunas extras (normalização) | Não quebrar lote por excesso de coluna | Sim | ✅ |
| importação | produtos sem dicionário → criação/órfão visível | Sem silenciamento | Sim | ✅ |

## 5) Matriz Exportação → report-engine/UI

| Camada | Método/Campo | Esperado | Existe? | Status |
|---|---|---|---|---|
| exportação | abas `Contexto` + `Fila Investigativa` | Handoff operacional | Sim | ✅ |
| exportação | ordenação automática por criticidade (quando sem ordenação manual) | Priorização investigativa | Sim | ✅ |
| exportação | metadados de período e temporalidade (`data_referencia` x `criado_em`) | Rastreabilidade | Sim | ✅ |

## Desalinhamentos encontrados e correções aplicadas

1. **Filtro cascata inconsistente** em `getLatestImportComparison` e `getTopVariacoesImportacao`.
   - Causa: query em `historico_custos` sem `origem_id/familia_id/agrupamento_cod` (campos da dimensão).
   - Correção: enriquecimento via `dicionario_produtos` antes de aplicar cascata.

2. **Ausência de fail-fast no drill-through** (`getProductHistory`).
   - Causa: `codigoProduto` vazio gerava consulta ambígua.
   - Correção: validação explícita + erro operacional padronizado.

## Contrato padronizado de erro (operacional)

Formato mínimo esperado em todos os métodos API:

```js
{ data: null, error: Error }
```

- Erros de contrato interno usam `name = "OperationalContractError"` e `details` para diagnóstico.
- Sem fallback mágico silencioso quando parâmetro obrigatório faltar.

## Checklist de prevenção contínua

- [ ] Toda query com filtro cascata deve operar em dataset com campos de dimensão resolvidos.
- [ ] Toda query temporal deve explicitar eixo (`data_referencia` vs `criado_em`).
- [ ] Todo método UI→API deve estar listado e testado após mudança de assinatura.
- [ ] Todo payload de escrita deve ser validado por whitelist de colunas da tabela alvo.
- [ ] Toda mudança de contrato deve atualizar `README.md`, `VISION.md`, `ROADMAP.md` e esta matriz.
