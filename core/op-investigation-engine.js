// @ts-check
/* Responsabilidade: transformar fatos imutáveis do ERP (MCAP105) em
   indicadores e motivos investigativos de OP. Não acessa DOM, API ou banco. */

/**
 * Limiar de interpretação do motor de OP. São deliberadamente independentes
 * dos limiares da Auditoria de Custos: medem execução operacional, não custo.
 * Um desvio de 5% é contexto; a fila só prioriza combinações relevantes.
 */
export const OP_INVESTIGATION_CONFIG = Object.freeze({
  desvioRelevantePct: 10,
  desvioTempoGravePct: 20,
  deficitProducaoRelevantePct: 5,
  indiceParadasMaterialPct: 20,
  eficienciaMinimaPct: 10,
  produtividadeEstavelPct: 5,
  toleranciaVolumeJustificadoPct: 10,
  toleranciaConferenciaErpPct: 0.2
});

const OP_INVESTIGATION_REASONS = Object.freeze([
  { key: 'paradas_operacionais', label: '🟦 Paradas operacionais', tone: 'parada', rank: 500 },
  { key: 'desperdicio_operacional', label: '🟧 Desperdício operacional', tone: 'desperdicio', rank: 450 },
  { key: 'gargalo_produtividade', label: '🟥 Gargalo de produtividade', tone: 'gargalo', rank: 400 },
  { key: 'baixa_producao', label: '🟨 Baixa produção', tone: 'baixa-producao', rank: 300 },
  { key: 'sinal_misto', label: '⚪ Sinal misto', tone: 'misto', rank: 100 },
  { key: 'sem_base_comparativa', label: '⚪ Sem base comparativa', tone: 'sem-base', rank: 90 },
  { key: 'tempo_justificado_volume', label: '🟢 Tempo justificado pelo volume', tone: 'tempo-justificado', rank: 0 },
  { key: 'parada_sem_impacto', label: '🔵 Parada sem impacto relevante', tone: 'parada-sem-impacto', rank: 0 },
  { key: 'alta_eficiencia', label: '🟩 Alta eficiência', tone: 'alta-eficiencia', rank: 0 }
]);

const OP_INVESTIGATION_DECISIONS = Object.freeze({
  maxima: Object.freeze({ key: 'maxima', label: '🔴 Prioridade máxima', tone: 'maxima', rank: 500, requerInvestigacao: true, acao: 'Investigar imediatamente.' }),
  alta: Object.freeze({ key: 'alta', label: '🟠 Prioridade alta', tone: 'alta', rank: 400, requerInvestigacao: true, acao: 'Investigar a causa operacional.' }),
  monitorar: Object.freeze({ key: 'monitorar', label: '🟡 Monitorar contexto', tone: 'monitorar', rank: 100, requerInvestigacao: true, acao: 'Validar o contexto antes de priorizar.' }),
  registrar: Object.freeze({ key: 'registrar', label: '🔵 Registrar, sem priorizar', tone: 'registrar', rank: 10, requerInvestigacao: false, acao: 'Registrar a ocorrência; não priorizar investigação.' }),
  nenhuma: Object.freeze({ key: 'nenhuma', label: '🟢 Nenhuma investigação necessária', tone: 'nenhuma', rank: 0, requerInvestigacao: false, acao: 'Manter como referência operacional.' }),
  semBase: Object.freeze({ key: 'sem_base', label: '⚪ Validar base de comparação', tone: 'sem-base', rank: 20, requerInvestigacao: false, acao: 'Completar os valores previstos antes de concluir.' })
});

/**
 * @typedef {Object} OpErpRow
 * @property {string|number} [op]
 * @property {string} [cod_produto]
 * @property {string} [descricao]
 * @property {string} [data_referencia]
 * @property {string} [criado_em]
 * @property {number|string|null} [qtd_prevista]
 * @property {number|string|null} [qtd_produzida]
 * @property {number|string|null} [tempo_previsto]
 * @property {number|string|null} [tempo_real]
 * @property {number|string|null} [kg_hora_previsto]
 * @property {number|string|null} [kg_hora_real]
 * @property {number|string|null} [perc_tempo]
 * @property {number|string|null} [tempo_parada]
 */

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function calculateDeviation(actual, expected) {
  if (actual === null || expected === null || expected <= 0) return null;
  return ((actual - expected) / expected) * 100;
}

function calculateAttendance(produced, planned) {
  if (produced === null || planned === null || planned <= 0) return null;
  return (produced / planned) * 100;
}

function calculateStopIndex(stopTime, realTime) {
  if (stopTime === null || realTime === null || realTime <= 0 || stopTime < 0) return null;
  return (stopTime / realTime) * 100;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function formatSignedPercent(value, favorableWhenNegative = false) {
  if (!Number.isFinite(value)) return '-';
  const prefix = value > 0 ? '+' : '';
  const direction = favorableWhenNegative
    ? (value < 0 ? ' menor' : value > 0 ? ' maior' : '')
    : (value < 0 ? ' menor' : value > 0 ? ' maior' : '');
  return `${prefix}${formatPercent(value)}${direction}`;
}

function getReason(key) {
  return OP_INVESTIGATION_REASONS.find(reason => reason.key === key)
    || OP_INVESTIGATION_REASONS.find(reason => reason.key === 'sinal_misto');
}

function getDecision(key) {
  return { ...(OP_INVESTIGATION_DECISIONS[key] || OP_INVESTIGATION_DECISIONS.monitorar) };
}

function buildSummary({ attendance, timeDeviation, productivityDeviation, stopIndex, reasonKey, erpReconciliation }) {
  if (reasonKey === 'desperdicio_operacional') {
    return `Volume entregue (${formatPercent(attendance)}), porém o tempo ficou ${formatSignedPercent(timeDeviation)} e a produtividade ${formatSignedPercent(productivityDeviation)}. Paradas de ${formatPercent(stopIndex)} reforçam desperdício operacional.`;
  }

  if (reasonKey === 'tempo_justificado_volume') {
    return `O tempo ficou ${formatSignedPercent(timeDeviation)}, mas a produtividade permaneceu praticamente estável e a produção atingiu ${formatPercent(attendance)}. O aumento de volume explica o tempo; não gerar alerta.`;
  }

  if (reasonKey === 'parada_sem_impacto') {
    return `Paradas de ${formatPercent(stopIndex)} foram registradas, mas a produção atingiu ${formatPercent(attendance)}, o tempo ficou ${formatSignedPercent(timeDeviation)} e a produtividade ${formatSignedPercent(productivityDeviation)}. Sem impacto relevante no resultado final.`;
  }

  if (reasonKey === 'alta_eficiencia') {
    const stopContext = Number.isFinite(stopIndex) && stopIndex > 0
      ? ' Paradas sem impacto operacional aparente.'
      : '';
    return `Excelente execução. Tempo ${formatSignedPercent(timeDeviation, true)}; produtividade ${formatSignedPercent(productivityDeviation)}; atendimento de ${formatPercent(attendance)}.${stopContext}`;
  }

  if (reasonKey === 'gargalo_produtividade') {
    const productionContext = Number.isFinite(attendance) ? ` Atendimento de ${formatPercent(attendance)}.` : '';
    const stopContext = Number.isFinite(stopIndex)
      ? ` Parada de ${formatPercent(stopIndex)} não explica o desvio.`
      : ' Sem índice de parada comparável.';
    return `Tempo ${formatSignedPercent(timeDeviation)}; produtividade ${formatSignedPercent(productivityDeviation)}.${productionContext}${stopContext}`;
  }

  if (reasonKey === 'paradas_operacionais') {
    return `Paradas representam ${formatPercent(stopIndex)} do tempo real, com tempo ${formatSignedPercent(timeDeviation)}, produtividade ${formatSignedPercent(productivityDeviation)} e atendimento de ${formatPercent(attendance)}. Há impacto direto na entrega.`;
  }

  if (reasonKey === 'baixa_producao') {
    return `Atendimento de ${formatPercent(attendance)} com tempo ${formatSignedPercent(timeDeviation)}. Investigar perdas, disponibilidade, programação, material ou encerramento da OP.`;
  }

  if (reasonKey === 'sem_base_comparativa') {
    return 'Sem valor previsto válido para comparar a execução. O Kustos preserva os fatos do ERP, mas não infere eficiência sem base.';
  }

  const reconciliationContext = erpReconciliation?.status === 'divergente'
    ? ' Conferir a divergência entre % Tempo do ERP e produtividade calculada.'
    : '';
  return `Indicadores sem combinação conclusiva para priorização automática.${reconciliationContext}`;
}

function buildProbableCause(reasonKey, attendance) {
  if (reasonKey === 'desperdicio_operacional') return 'Perda de produtividade mesmo com o volume entregue; validar paradas, processo, padrão e apontamento.';
  if (reasonKey === 'tempo_justificado_volume') return 'Aumento de produção compatível com o tempo consumido; não há indício de perda de produtividade.';
  if (reasonKey === 'parada_sem_impacto') return 'Parada registrada sem impacto relevante em volume, tempo ou produtividade.';
  if (reasonKey === 'gargalo_produtividade') {
    return Number.isFinite(attendance) && attendance < 100
      ? 'Problema de processo com déficit de produção; parada não proporcional ao impacto.'
      : 'Problema de processo, padrão, matéria-prima ou apontamento; parada não proporcional ao impacto.';
  }
  if (reasonKey === 'paradas_operacionais') return 'Paradas operacionais são a hipótese principal; validar motivo, frequência e duração.';
  if (reasonKey === 'baixa_producao') return 'Programação, disponibilidade, material ou encerramento da OP.';
  if (reasonKey === 'alta_eficiencia') return 'Operação acima do esperado; validar padrão, capacidade e apontamento antes de replicar a referência.';
  if (reasonKey === 'sem_base_comparativa') return 'Dados previstos ausentes ou zerados impedem comparação confiável.';
  return 'Sem causa dominante; acompanhar os próximos apontamentos e validar o contexto da OP.';
}

function buildEvidence({ attendance, timeDeviation, productivityDeviation, stopIndex, reasonKey }) {
  const production = Number.isFinite(attendance)
    ? `Produção: atendimento de ${formatPercent(attendance)}.`
    : 'Produção: sem base comparável.';
  const time = Number.isFinite(timeDeviation)
    ? `Tempo: ${formatSignedPercent(timeDeviation)} versus o previsto.`
    : 'Tempo: sem base comparável.';
  const productivity = Number.isFinite(productivityDeviation)
    ? `KG/Hora: ${formatSignedPercent(productivityDeviation)} versus o previsto.`
    : 'KG/Hora: sem base comparável.';
  const stops = Number.isFinite(stopIndex)
    ? `Paradas: ${formatPercent(stopIndex)} do tempo real.`
    : 'Paradas: sem índice comparável.';

  if (reasonKey === 'desperdicio_operacional' || reasonKey === 'paradas_operacionais') return [production, time, productivity, stops];
  if (reasonKey === 'gargalo_produtividade') return [time, productivity, stops, production];
  if (reasonKey === 'baixa_producao') return [production, time, productivity];
  if (reasonKey === 'tempo_justificado_volume') return [production, time, productivity];
  if (reasonKey === 'parada_sem_impacto') return [stops, production, time, productivity];
  if (reasonKey === 'alta_eficiencia') return [production, time, productivity, stops];
  return [production, time, productivity, stops];
}

function resolveDecisionKey(reasonKey, producaoAbaixoPlano) {
  if (reasonKey === 'paradas_operacionais') return 'maxima';
  if (reasonKey === 'gargalo_produtividade') return producaoAbaixoPlano ? 'maxima' : 'alta';
  if (reasonKey === 'desperdicio_operacional' || reasonKey === 'baixa_producao') return 'alta';
  if (reasonKey === 'sinal_misto') return 'monitorar';
  if (reasonKey === 'parada_sem_impacto') return 'registrar';
  if (reasonKey === 'sem_base_comparativa') return 'semBase';
  return 'nenhuma';
}

/**
 * Expõe as opções estáveis de filtro por motivo. A UI usa a chave, nunca o
 * texto, para não acoplar a regra à apresentação.
 * @returns {Array<{key:string,label:string,tone:string,rank:number}>}
 */
export function getOpInvestigationReasonOptions() {
  return OP_INVESTIGATION_REASONS.map(reason => ({ ...reason }));
}

/**
 * Analisa uma linha do MCAP105 sem alterar os fatos recebidos do ERP.
 *
 * % Tempo do ERP é mantido somente como conferência. A classificação usa
 * métricas calculadas por bases explícitas: tempo real vs. previsto,
 * produtividade real vs. prevista, produção realizada vs. prevista e a
 * proporção de parada no tempo real. A decisão resultante declara se a OP
 * merece investigação, sua prioridade e as evidências combinadas. Assim o
 * mesmo sinal não é contado duas vezes e uma parada isolada não define
 * criticidade.
 *
 * @param {OpErpRow} row
 * @returns {OpErpRow & {indicadoresKustos: Record<string, number|null>, conferenciaErp: Record<string, unknown>, classificacaoInvestigativa: Record<string, unknown>}}
 */
export function analyzeOpInvestigation(row) {
  const qtdPrevista = toFiniteNumber(row?.qtd_prevista);
  const qtdProduzida = toFiniteNumber(row?.qtd_produzida);
  const tempoPrevisto = toFiniteNumber(row?.tempo_previsto);
  const tempoReal = toFiniteNumber(row?.tempo_real);
  const produtividadePrevista = toFiniteNumber(row?.kg_hora_previsto);
  const produtividadeReal = toFiniteNumber(row?.kg_hora_real);
  const tempoParada = toFiniteNumber(row?.tempo_parada);
  const percentTempoErp = toFiniteNumber(row?.perc_tempo);

  const atendimentoProducaoPct = calculateAttendance(qtdProduzida, qtdPrevista);
  const desvioTempoPct = calculateDeviation(tempoReal, tempoPrevisto);
  const desvioProdutividadePct = calculateDeviation(produtividadeReal, produtividadePrevista);
  const indiceParadasPct = calculateStopIndex(tempoParada, tempoReal);

  const temBaseExecucao = desvioTempoPct !== null && desvioProdutividadePct !== null && atendimentoProducaoPct !== null;
  const conferenciaDisponivel = percentTempoErp !== null && desvioProdutividadePct !== null;
  const diferencaConferenciaPct = conferenciaDisponivel ? percentTempoErp - desvioProdutividadePct : null;
  const conferenciaErp = {
    percentTempoErp,
    diferencaVsDesvioProdutividadePct: diferencaConferenciaPct,
    status: !conferenciaDisponivel
      ? 'indisponivel'
      : Math.abs(diferencaConferenciaPct) <= OP_INVESTIGATION_CONFIG.toleranciaConferenciaErpPct
        ? 'confirmado'
        : 'divergente'
  };

  const produtividadeBaixa = desvioProdutividadePct !== null
    && desvioProdutividadePct <= -OP_INVESTIGATION_CONFIG.desvioRelevantePct;
  const tempoAlto = desvioTempoPct !== null
    && desvioTempoPct >= OP_INVESTIGATION_CONFIG.desvioTempoGravePct;
  const paradaMaterial = indiceParadasPct !== null
    && indiceParadasPct >= OP_INVESTIGATION_CONFIG.indiceParadasMaterialPct;
  const producaoAbaixoPlano = atendimentoProducaoPct !== null
    && atendimentoProducaoPct < (100 - OP_INVESTIGATION_CONFIG.deficitProducaoRelevantePct);
  const producaoEntregue = atendimentoProducaoPct !== null
    && atendimentoProducaoPct >= (100 - OP_INVESTIGATION_CONFIG.deficitProducaoRelevantePct);
  const tempoNormal = desvioTempoPct !== null
    && Math.abs(desvioTempoPct) < OP_INVESTIGATION_CONFIG.desvioTempoGravePct;
  const produtividadeNormal = desvioProdutividadePct !== null
    && Math.abs(desvioProdutividadePct) < OP_INVESTIGATION_CONFIG.desvioRelevantePct;
  const produtividadeEstavel = desvioProdutividadePct !== null
    && Math.abs(desvioProdutividadePct) <= OP_INVESTIGATION_CONFIG.produtividadeEstavelPct;
  const altaEficiencia = atendimentoProducaoPct !== null
    && desvioTempoPct !== null
    && desvioProdutividadePct !== null
    && atendimentoProducaoPct >= 100
    && desvioTempoPct <= -OP_INVESTIGATION_CONFIG.eficienciaMinimaPct
    && desvioProdutividadePct >= OP_INVESTIGATION_CONFIG.eficienciaMinimaPct;
  const volumeJustificaTempo = tempoAlto
    && produtividadeEstavel
    && atendimentoProducaoPct !== null
    && atendimentoProducaoPct >= (100 + desvioTempoPct - OP_INVESTIGATION_CONFIG.toleranciaVolumeJustificadoPct);
  const paradaSemImpacto = paradaMaterial
    && producaoEntregue
    && tempoNormal
    && produtividadeNormal;

  let reasonKey = 'sinal_misto';
  if (!temBaseExecucao) reasonKey = 'sem_base_comparativa';
  else if (producaoAbaixoPlano && paradaMaterial && tempoAlto && desvioProdutividadePct <= OP_INVESTIGATION_CONFIG.desvioRelevantePct) reasonKey = 'paradas_operacionais';
  else if (producaoEntregue && paradaMaterial && tempoAlto && produtividadeBaixa) reasonKey = 'desperdicio_operacional';
  else if (tempoAlto && produtividadeBaixa && !paradaMaterial) reasonKey = 'gargalo_produtividade';
  else if (producaoAbaixoPlano && tempoNormal) reasonKey = 'baixa_producao';
  else if (altaEficiencia) reasonKey = 'alta_eficiencia';
  else if (volumeJustificaTempo) reasonKey = 'tempo_justificado_volume';
  else if (paradaSemImpacto) reasonKey = 'parada_sem_impacto';

  const reason = getReason(reasonKey);
  const decision = getDecision(resolveDecisionKey(reasonKey, producaoAbaixoPlano));
  const indicadoresKustos = {
    atendimentoProducaoPct,
    desvioTempoPct,
    desvioProdutividadePct,
    indiceParadasPct
  };
  const magnitude = Math.max(
    Math.abs(desvioTempoPct || 0),
    Math.abs(desvioProdutividadePct || 0),
    Math.abs((atendimentoProducaoPct || 100) - 100),
    Math.abs(indiceParadasPct || 0)
  );

  return {
    ...row,
    indicadoresKustos,
    conferenciaErp,
    classificacaoInvestigativa: {
      ...reason,
      decisao: decision,
      mereceInvestigacao: decision.requerInvestigacao,
      evidencias: buildEvidence({
        attendance: atendimentoProducaoPct,
        timeDeviation: desvioTempoPct,
        productivityDeviation: desvioProdutividadePct,
        stopIndex: indiceParadasPct,
        reasonKey
      }),
      magnitude,
      motivo: reason.label,
      causaProvavel: buildProbableCause(reasonKey, atendimentoProducaoPct),
      resumo: buildSummary({
        attendance: atendimentoProducaoPct,
        timeDeviation: desvioTempoPct,
        productivityDeviation: desvioProdutividadePct,
        stopIndex: indiceParadasPct,
        reasonKey,
        erpReconciliation: conferenciaErp
      })
    }
  };
}

/**
 * Gera a fila investigativa em ordem de decisão, motivo e magnitude. O
 * motivo explica por que investigar; a decisão informa se deve priorizar.
 * @param {OpErpRow[]} rows
 * @returns {ReturnType<typeof analyzeOpInvestigation>[]}
 */
export function buildOpInvestigationQueue(rows) {
  return (rows || [])
    .map(row => analyzeOpInvestigation(row))
    .sort((a, b) => {
      const classA = /** @type {{ decisao?: { rank?: number }, rank?: number, magnitude?: number }} */ (a.classificacaoInvestigativa);
      const classB = /** @type {{ decisao?: { rank?: number }, rank?: number, magnitude?: number }} */ (b.classificacaoInvestigativa);
      const decisionDiff = Number(classB.decisao?.rank || 0) - Number(classA.decisao?.rank || 0);
      if (decisionDiff) return decisionDiff;
      const rankDiff = Number(classB.rank || 0) - Number(classA.rank || 0);
      if (rankDiff) return rankDiff;
      return Number(classB.magnitude || 0) - Number(classA.magnitude || 0);
    });
}
