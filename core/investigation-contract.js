// @ts-check
/**
 * Camada de adaptação do motor investigativo de OP.
 *
 * Responsabilidade: expor um contrato de domínio estável e documentado
 * (InvestigationResult) a partir da saída interna de
 * `analyzeOpInvestigation` / `buildOpInvestigationQueue`
 * (core/op-investigation-engine.js), sem alterar a lógica já validada
 * daquele motor e sem alterar o comportamento de view/ui-op.js, que
 * continua consumindo o formato interno diretamente.
 *
 * Este módulo é o ponto de extensão para consumidores futuros — Motor
 * Evolutivo, análise por agrupamentos e tags investigativas — que devem
 * depender apenas de InvestigationResult, nunca da forma interna retornada
 * pelo motor. Isso permite o motor evoluir por dentro (novos motivos, novas
 * métricas) sem quebrar quem consome o contrato.
 */

import { buildOpInvestigationQueue } from './op-investigation-engine.js';

/**
 * @typedef {import('./op-investigation-engine.js').OpErpRow} OpErpRow
 */

/**
 * Forma interna retornada por `analyzeOpInvestigation`/`buildOpInvestigationQueue`.
 * Declarada aqui apenas para tipar o parâmetro deste adaptador, sem importar
 * a função em si (este módulo não a chama diretamente).
 * @typedef {OpErpRow & {
 *   indicadoresKustos: Record<string, number|null>,
 *   conferenciaErp: Record<string, unknown>,
 *   classificacaoInvestigativa: Record<string, unknown>
 * }} AnalyzedOpRow
 */

/**
 * @typedef {Object} InvestigationFacts
 * @property {string|number|undefined} op
 * @property {string|undefined} codProduto
 * @property {string|undefined} descricao
 * @property {string|undefined} dataReferencia competência do apontamento
 * @property {string|undefined} criadoEm data de upload/importação
 * @property {number|string|null|undefined} qtdPrevista
 * @property {number|string|null|undefined} qtdProduzida
 * @property {number|string|null|undefined} tempoPrevisto
 * @property {number|string|null|undefined} tempoReal
 * @property {number|string|null|undefined} kgHoraPrevisto
 * @property {number|string|null|undefined} kgHoraReal
 * @property {number|string|null|undefined} tempoParada
 */

/**
 * @typedef {Object} InvestigationIndicators
 * @property {number|null} atendimentoProducaoPct
 * @property {number|null} desvioTempoPct
 * @property {number|null} desvioProdutividadePct
 * @property {number|null} indiceParadasPct
 */

/**
 * @typedef {Object} InvestigationClassification
 * @property {string} [chave]
 * @property {string} [rotulo]
 * @property {string} [tom]
 * @property {number} [rank]
 */

/**
 * @typedef {Object} InvestigationDecision
 * @property {string} [chave]
 * @property {string} [rotulo]
 * @property {string} [tom]
 * @property {number} [rank]
 * @property {boolean} requerInvestigacao
 * @property {string} [acao]
 */

/**
 * @typedef {Object} ErpReconciliation
 * @property {number|null} [percentTempoErp]
 * @property {number|null} [diferencaVsDesvioProdutividadePct]
 * @property {'confirmado'|'divergente'|'indisponivel'} [status]
 */

/**
 * Contrato de domínio estável da investigação de uma OP. Qualquer
 * consumidor fora deste módulo deve depender apenas destes campos — nunca
 * da forma interna retornada por `analyzeOpInvestigation`.
 *
 * @typedef {Object} InvestigationResult
 * @property {string} chave identificador estável da linha (op + produto + competência)
 * @property {InvestigationFacts} fatos fatos imutáveis do ERP, sem inferência
 * @property {InvestigationIndicators} indicadores métricas calculadas pelo Kustos
 * @property {InvestigationClassification} classificacao motivo investigativo
 * @property {InvestigationDecision} decisao prioridade e ação recomendada
 * @property {string[]} evidencias evidências que sustentam a classificação, em ordem de relevância
 * @property {string} [resumo] texto explicativo da classificação
 * @property {string} [causaProvavel] hipótese de causa raiz
 * @property {number} [magnitude] maior desvio observado, usado para ordenação
 * @property {ErpReconciliation} conferenciaErp conferência do % Tempo do ERP contra a produtividade calculada
 */

function buildChave(row) {
  const op = row?.op ?? 'sem-op';
  const produto = row?.cod_produto ?? 'sem-produto';
  const competencia = row?.data_referencia ?? 'sem-competencia';
  return `${op}::${produto}::${competencia}`;
}

/**
 * Adapta a saída de `analyzeOpInvestigation` para o contrato estável
 * InvestigationResult. Não recalcula nada: apenas reorganiza o que o motor
 * já produziu, sem tocar na lógica de classificação.
 *
 * @param {AnalyzedOpRow} analyzedRow
 * @returns {InvestigationResult}
 */
export function toInvestigationResult(analyzedRow) {
  const classificacao = /** @type {{
    key?: string, label?: string, tone?: string, rank?: number,
    decisao?: { key?: string, label?: string, tone?: string, rank?: number, acao?: string },
    mereceInvestigacao?: boolean,
    evidencias?: string[],
    resumo?: string,
    causaProvavel?: string,
    magnitude?: number
  }} */ (analyzedRow?.classificacaoInvestigativa) ?? {};
  const decisaoOrigem = classificacao.decisao ?? {};
  const indicadores = /** @type {InvestigationIndicators} */ (analyzedRow?.indicadoresKustos ?? {});
  const conferenciaErp = /** @type {ErpReconciliation} */ (analyzedRow?.conferenciaErp ?? {});

  return {
    chave: buildChave(analyzedRow),
    fatos: {
      op: analyzedRow?.op,
      codProduto: analyzedRow?.cod_produto,
      descricao: analyzedRow?.descricao,
      dataReferencia: analyzedRow?.data_referencia,
      criadoEm: analyzedRow?.criado_em,
      qtdPrevista: analyzedRow?.qtd_prevista ?? null,
      qtdProduzida: analyzedRow?.qtd_produzida ?? null,
      tempoPrevisto: analyzedRow?.tempo_previsto ?? null,
      tempoReal: analyzedRow?.tempo_real ?? null,
      kgHoraPrevisto: analyzedRow?.kg_hora_previsto ?? null,
      kgHoraReal: analyzedRow?.kg_hora_real ?? null,
      tempoParada: analyzedRow?.tempo_parada ?? null
    },
    indicadores: { ...indicadores },
    classificacao: {
      chave: classificacao.key,
      rotulo: classificacao.label,
      tom: classificacao.tone,
      rank: classificacao.rank
    },
    decisao: {
      chave: decisaoOrigem.key,
      rotulo: decisaoOrigem.label,
      tom: decisaoOrigem.tone,
      rank: decisaoOrigem.rank,
      requerInvestigacao: Boolean(classificacao.mereceInvestigacao),
      acao: decisaoOrigem.acao
    },
    evidencias: [...(classificacao.evidencias ?? [])],
    resumo: classificacao.resumo,
    causaProvavel: classificacao.causaProvavel,
    magnitude: classificacao.magnitude,
    conferenciaErp: { ...conferenciaErp }
  };
}

/**
 * Analisa e ordena as linhas de OP, retornando-as já no contrato estável
 * InvestigationResult. Equivalente a `buildOpInvestigationQueue` seguido de
 * `toInvestigationResult` em cada item — a classificação e a ordenação
 * continuam sendo responsabilidade exclusiva do motor.
 *
 * @param {OpErpRow[]} rows
 * @returns {InvestigationResult[]}
 */
export function buildInvestigationResults(rows) {
  return buildOpInvestigationQueue(rows).map(row => toInvestigationResult(/** @type {AnalyzedOpRow} */ (row)));
}
