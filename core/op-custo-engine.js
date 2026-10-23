// @ts-check
/** OP-CUSTO-01: composição pura. Não recalcula decisões dos motores originais. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';

/** @typedef {Record<string, any>} RecordData */
const COMPLETAS = new Set(['completa', 'completa_vazia']);
const DESFAVORAVEIS = new Set(['paradas_operacionais', 'desperdicio_operacional', 'gargalo_produtividade', 'baixa_producao']);
const NAO_PRIORIZADOS = new Set(['tempo_justificado_volume', 'parada_sem_impacto']);
const OP_METRICAS = ['qtd_prevista', 'qtd_produzida', 'tempo_previsto', 'tempo_real', 'tempo_parada', 'kg_hora_previsto', 'kg_hora_real'];

function erro(code, message) {
  return Object.assign(new Error(message), { code });
}

function diasNoMes(ano, mes) {
  return [31, ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

/** Limites civis inclusivos; não modifica as datas dos fatos. */
export function getOpCustoPeriod(competencia) {
  if (Array.isArray(competencia)) throw erro('MULTICOMPETENCIA_NAO_SUPORTADA_V1', 'Selecione uma única competência.');
  if (typeof competencia !== 'string' || !/^\d{4}-\d{2}$/.test(competencia)) {
    throw erro('COMPETENCIA_INVALIDA', 'Competência deve ter formato AAAA-MM.');
  }
  const [ano, mes] = competencia.split('-').map(Number);
  if (ano < 1 || mes < 1 || mes > 12) throw erro('COMPETENCIA_INVALIDA', 'Competência inválida.');
  return { inicio: `${competencia}-01`, fimInclusivo: `${competencia}-${diasNoMes(ano, mes)}` };
}

function mesDaData(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [ano, mes, dia] = value.split('-').map(Number);
  return ano > 0 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes) ? value.slice(0, 7) : null;
}

function numero(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function instante(value) {
  if (typeof value !== 'string' || !mesDaData(value.slice(0, 10))) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const parsed = Date.parse(`${match[1]}${match[3]}`);
  // TIMESTAMPTZ tem microssegundos: Date.parse sozinho fabricaria empates.
  return Number.isFinite(parsed) ? BigInt(parsed) * 1000000n + BigInt((match[2] || '').padEnd(9, '0')) : null;
}

function compararImportacao(a, b) {
  const ta = instante(a.criado_em);
  const tb = instante(b.criado_em);
  return ta === tb ? 0 : ta === null ? 1 : tb === null ? -1 : ta > tb ? -1 : 1;
}

const idKey = id => String(id);
const ordenarCodigo = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const valoresCusto = row => ({ variavel: numero(row.custo_variavel), fixoDireto: numero(row.custo_direto_fixo), total: numero(row.custo_total) });

/** Checagem de IDs não é deduplicação de negócio; falha antes de usar as linhas. */
export function assertOpCustoIds(rows) {
  const seen = new Set();
  for (const row of rows) {
    if (!row || !['number', 'string'].includes(typeof row.id) || !String(row.id).trim() || (typeof row.id === 'number' && !Number.isFinite(row.id))) {
      throw erro('IDENTIDADE_INVALIDA', 'Leitura contém registro sem ID técnico válido.');
    }
    const key = idKey(row.id);
    if (seen.has(key)) throw erro('IDENTIDADE_REPETIDA', 'Leitura contém ID técnico repetido.');
    seen.add(key);
  }
}

/**
 * Inspeção estrutural compartilhável pela API, sem classificação relacional.
 * Mantém fatos inválidos em diagnóstico e só calcula cobertura de fontes completas.
 * @param {RecordData} contexto
 * @param {unknown} [produtoSolicitado]
 */
export function inspectOpCustoContext(contexto, produtoSolicitado) {
  getOpCustoPeriod(contexto.competencia);
  const grupos = new Map();
  const diagnosticos = { opNaoVinculavel: [], custoNaoVinculavel: [], foraCompetencia: [], inconsistencias: [] };
  for (const [fonte, campo] of [['op', 'opEventos'], ['custos', 'custoSnapshots']]) {
    const rows = contexto[campo];
    const meta = contexto.fontes?.[fonte];
    if (contexto.qualidade?.completa === false || !meta || !COMPLETAS.has(meta.estado) || !Array.isArray(rows) || meta.contagem !== rows.length ||
        (meta.estado === 'completa_vazia') !== (rows.length === 0)) {
      return { estado: 'indisponivel', cobertura: null, grupos, diagnosticos,
        motivos: [`Fonte ${fonte} indisponível ou incompleta.`] };
    }
    assertOpCustoIds(rows);
  }
  for (const [fonte, campo, codigoCampo, diagnostico] of [
    ['op', 'opEventos', 'cod_produto', 'opNaoVinculavel'],
    ['custos', 'custoSnapshots', 'codigo_produto', 'custoNaoVinculavel']
  ]) {
    for (const row of contexto[campo]) {
      const codigo = normalizeCodigoProduto(row[codigoCampo]);
      const mes = mesDaData(row.data_referencia);
      if (!codigo || !mes) {
        diagnosticos[diagnostico].push({ fonte, idFonte: row.id, fatoOriginal: row, motivo: !codigo ? 'codigo_invalido' : 'data_invalida' });
        continue;
      }
      if (mes !== contexto.competencia) {
        diagnosticos.foraCompetencia.push({ fonte, idFonte: row.id, fatoOriginal: row, motivo: 'fora_da_competencia' });
        continue;
      }
      if (!grupos.has(codigo)) grupos.set(codigo, { codigo, op: [], custos: [] });
      grupos.get(codigo)[fonte].push(row);
    }
  }
  const cobertura = { ambos: 0, somenteOp: 0, somenteCusto: 0 };
  for (const grupo of grupos.values()) {
    cobertura[grupo.op.length ? (grupo.custos.length ? 'ambos' : 'somenteOp') : 'somenteCusto']++;
  }
  if (produtoSolicitado !== undefined && produtoSolicitado !== null) {
    const codigo = normalizeCodigoProduto(produtoSolicitado);
    if (!codigo) throw erro('PRODUTO_INVALIDO', 'Produto consultado inválido.');
    if (!grupos.has(codigo)) grupos.set(codigo, { codigo, op: [], custos: [] });
  }
  return { estado: 'completo', cobertura, grupos, diagnosticos, motivos: [] };
}

function indexarAnalises(analises, key) {
  const index = new Map();
  for (const analise of analises || []) {
    const id = key(analise);
    if (!id || index.has(id)) throw erro('ADAPTACAO_INVALIDA', 'Identidade ausente ou repetida na adaptação.');
    index.set(id, analise);
  }
  return index;
}

function resumoOp(rows, analises) {
  if (!rows.length) return null;
  const eventos = rows.map(fatoOriginal => {
    const analise = analises.get(idKey(fatoOriginal.id));
    if (!analise?.resultadoOriginal) throw erro('ADAPTACAO_INVALIDA', 'Evento OP sem análise correspondente por ID.');
    const fatos = analise.resultadoOriginal.fatos;
    if (!fatos || normalizeCodigoProduto(fatos.codProduto) !== normalizeCodigoProduto(fatoOriginal.cod_produto) || fatos.dataReferencia !== fatoOriginal.data_referencia || String(fatos.op) !== String(fatoOriginal.op)) {
      throw erro('ADAPTACAO_INVALIDA', 'Análise OP não corresponde ao fato original.');
    }
    return { idFonte: fatoOriginal.id, fatoOriginal, resultadoOriginal: analise.resultadoOriginal,
      posicaoOriginal: analise.posicaoOriginal ?? null };
  });
  const distribuicao = Object.create(null);
  const distribuicaoDecisoes = Object.create(null);
  const conteudos = new Map();
  for (const evento of eventos) {
    const r = evento.fatoOriginal;
    const fingerprint = JSON.stringify([r.cod_produto, r.data_referencia, r.op, r.cod_estagio, r.estagio, r.origem, r.unidade,
      ...OP_METRICAS.map(campo => r[campo] ?? null), r.qtd_apontamentos ?? null, r.perc_tempo ?? null]);
    if (!conteudos.has(fingerprint)) conteudos.set(fingerprint, []);
    conteudos.get(fingerprint).push(evento.idFonte);
  }
  const possiveisReimports = [...conteudos.values()].filter(ids => ids.length > 1)
    .map(ids => ({ ids, motivo: 'Conteúdo equivalente em eventos distintos; possível reimport, sem comprovação de duplicidade de negócio.' }));
  let favoraveis = false;
  let desfavoraveis = false;
  let semBase = false;
  let mistos = false;
  const motivosQualidade = [];
  for (const evento of eventos) {
    const motivo = evento.resultadoOriginal.classificacao?.chave;
    distribuicao[motivo || 'ausente'] = (distribuicao[motivo || 'ausente'] || 0) + 1;
    const decisao = evento.resultadoOriginal.decisao?.chave || 'ausente';
    distribuicaoDecisoes[decisao] = (distribuicaoDecisoes[decisao] || 0) + 1;
    favoraveis ||= motivo === 'alta_eficiencia';
    desfavoraveis ||= DESFAVORAVEIS.has(motivo);
    semBase ||= motivo === 'sem_base_comparativa';
    mistos ||= motivo === 'sinal_misto';
    if (motivo === 'sem_base_comparativa') motivosQualidade.push(`Evento ${evento.idFonte}: motor OP sem base comparativa.`);
    if (motivo === 'sinal_misto') motivosQualidade.push(`Evento ${evento.idFonte}: motor OP identificou sinal misto.`);
    if (!DESFAVORAVEIS.has(motivo) && !NAO_PRIORIZADOS.has(motivo) && motivo !== 'alta_eficiencia' && motivo !== 'sinal_misto') semBase = true;
    if (OP_METRICAS.some(campo => numero(evento.fatoOriginal[campo]) === null)) {
      semBase = true;
      motivosQualidade.push(`Métrica OP ausente/inválida no evento ${evento.idFonte}.`);
    }
  }
  if (favoraveis && desfavoraveis) motivosQualidade.push('Há eventos OP favoráveis e desfavoráveis no mesmo produto/competência.');
  const sinalRelacional = semBase ? 'insuficiente' : mistos || (favoraveis && desfavoraveis) ? 'heterogeneo'
    : desfavoraveis ? 'desfavoravel' : favoraveis ? 'favoravel' : 'sem_desvio_priorizado';
  const ordenados = eventos.filter(e => Number.isSafeInteger(e.posicaoOriginal) && e.posicaoOriginal >= 0)
    .sort((a, b) => a.posicaoOriginal - b.posicaoOriginal || ordenarCodigo(idKey(a.idFonte), idKey(b.idFonte)));
  const observado = ordenados[0];
  return { eventos, distribuicao, distribuicaoDecisoes, possiveisReimports, presenca: { favoraveis, desfavoraveis, semBase, mistos }, sinalRelacional,
    motivosQualidade,
    contagens: { eventos: eventos.length, numerosOpDistintosObservados: new Set(rows.filter(r => r.op !== null && r.op !== undefined && String(r.op).trim()).map(r => String(r.op))).size },
    consolidacao: { estado: 'nao_disponivel', valores: null, motivos: ['Granularidade, unidades e aditividade ERP não comprovadas.'] },
    prioridadeOriginalObservada: observado ? { rotulo: 'Maior prioridade OP observada', decisao: observado.resultadoOriginal.decisao,
      classificacao: observado.resultadoOriginal.classificacao, posicaoOriginal: observado.posicaoOriginal } : null,
    eventosDaPrioridade: observado ? [observado.idFonte] : [] };
}

function resumoCusto(rows, analise) {
  if (!rows.length) return null;
  if (!analise?.resultadoOriginal) throw erro('ADAPTACAO_INVALIDA', 'Produto com custo sem resultado original adaptado.');
  const resultadoOriginal = analise.resultadoOriginal;
  if (normalizeCodigoProduto(resultadoOriginal.codigo) !== normalizeCodigoProduto(rows[0].codigo_produto)) {
    throw erro('ADAPTACAO_INVALIDA', 'Resultado de custo pertence a outro produto.');
  }
  const snapshots = [...rows].sort((a, b) => compararImportacao(a, b) || ordenarCodigo(idKey(a.id), idKey(b.id)))
    .map(fatoOriginal => ({ idFonte: fatoOriginal.id, fatoOriginal }));
  const referencia = { estado: 'invalida', idsCandidatos: [], valores: null };
  const comparacao = { estado: 'invalida', idsReferencia: [], idsBase: [], deltaMonetario: null, deltaPercentual: null, motivos: [] };
  const custo = { snapshots, referencia, comparacao, resultadoOriginal, sinalRelacional: 'sem_base_utilizavel',
    prioridadeOriginal: analise.prioridadeOriginal ?? null,
    qualidadeCampos: rows.flatMap(row => ['custo_variavel', 'custo_direto_fixo', 'custo_total']
      .filter(campo => numero(row[campo]) === null).map(campo => ({ idFonte: row.id, campo, motivo: 'Valor ausente ou inválido; não convertido em zero.' }))) };
  if (rows.some(r => instante(r.criado_em) === null)) {
    comparacao.motivos.push('Timestamp de importação ausente/inválido impede seleção segura.');
    return custo;
  }
  const ordered = snapshots.map(s => s.fatoOriginal);
  const top = ordered.filter(r => instante(r.criado_em) === instante(ordered[0].criado_em));
  referencia.idsCandidatos = top.map(r => r.id);
  comparacao.idsReferencia = [...referencia.idsCandidatos];
  const valores = valoresCusto(top[0]);
  const conflito = top.some(r => JSON.stringify(valoresCusto(r)) !== JSON.stringify(valores));
  referencia.estado = conflito ? 'ambigua' : top.length > 1 ? 'valor_comum_empatado' : 'disponivel';
  referencia.valores = conflito ? null : valores;
  const base = ordered[1];
  comparacao.idsBase = base ? ordered.filter(r => instante(r.criado_em) === instante(base.criado_em)).map(r => r.id) : [];
  if (conflito || top.length > 1 || (base && ordered.filter(r => instante(r.criado_em) === instante(base.criado_em)).length > 1)) {
    comparacao.estado = 'ambigua';
    comparacao.motivos.push('Empate de timestamp na referência/base; ID não comprova recência.');
    return custo;
  }
  if (!base) {
    comparacao.estado = 'sem_base';
    comparacao.motivos.push('Apenas um snapshot disponível na competência.');
    return custo;
  }
  const anterior = numero(base.custo_total);
  if (valores.total === null || anterior === null) {
    comparacao.motivos.push('Custo total ausente/inválido na referência ou base.');
    return custo;
  }
  comparacao.deltaMonetario = valores.total - anterior;
  if (anterior <= 0) {
    comparacao.estado = 'denominador_invalido';
    comparacao.motivos.push('Base não positiva; percentual indisponível.');
    return custo;
  }
  const percentual = resultadoOriginal.variacaoTemporal;
  // Apenas valida a correspondência da saída legada; não cria outro classificador de custo.
  if (!Number.isFinite(percentual) || resultadoOriginal.ultimoCusto !== valores.total || resultadoOriginal.penultimoCusto !== anterior ||
      (resultadoOriginal.dataCompetencia && resultadoOriginal.dataCompetencia !== top[0].data_referencia) ||
      (resultadoOriginal.ultimaAtualizacao && instante(resultadoOriginal.ultimaAtualizacao) !== instante(top[0].criado_em)) ||
      Math.abs(percentual - comparacao.deltaMonetario / anterior * 100) > 1e-9 ||
      typeof analise.alerta?.isAlert !== 'boolean' || analise.alerta.percentual !== percentual) {
    comparacao.deltaMonetario = null;
    comparacao.motivos.push('Resultado/flag de custo não corresponde aos snapshots da competência.');
    return custo;
  }
  comparacao.estado = 'disponivel';
  comparacao.deltaPercentual = percentual;
  custo.sinalRelacional = !analise.alerta.isAlert ? 'sem_variacao_relevante'
    : percentual > 0 ? 'aumento_relevante' : percentual < 0 ? 'queda_relevante' : 'sem_base_utilizavel';
  return custo;
}

/** Colisões semânticas são avisos, nunca escolha de vencedor/deduplicação. */
function conflitosNormalizacao(grupo) {
  const conflitos = [];
  for (const [fonte, codigoCampo] of [['op', 'cod_produto'], ['custos', 'codigo_produto']]) {
    const identidades = new Map();
    for (const row of grupo[fonte]) {
      const granularidade = fonte === 'op'
        ? [row.data_referencia, row.op, row.cod_estagio, row.estagio, row.origem, row.unidade]
        : [row.data_referencia];
      const chave = JSON.stringify(granularidade);
      const medidas = fonte === 'op' ? [...OP_METRICAS, 'qtd_apontamentos', 'perc_tempo'].map(campo => row[campo] ?? null) : valoresCusto(row);
      const registro = { codigoOriginal: String(row[codigoCampo]), medidas: JSON.stringify(medidas), id: row.id };
      const anteriores = identidades.get(chave) || [];
      for (const anterior of anteriores) {
        if (anterior.codigoOriginal !== registro.codigoOriginal && anterior.medidas !== registro.medidas) {
          conflitos.push({ fonte, codigoNormalizado: grupo.codigo, ids: [anterior.id, row.id], motivo: 'Codificações distintas convergem com fatos conflitantes na mesma granularidade observada.' });
        }
      }
      anteriores.push(registro);
      identidades.set(chave, anteriores);
    }
  }
  return conflitos;
}

function relacao(op, custo, inconsistente) {
  let codigo = 'inconclusivo';
  let tipo = 'inconclusivo';
  let rotulo = 'Inconclusivo';
  let motivo = 'Dados insuficientes ou heterogêneos; conferir eventos e bases antes de concluir.';
  if (!op || !custo) return { codigo: 'nao_aplicavel', tipo: 'nao_aplicavel', rotulo: 'Não aplicável',
    motivos: [!op && !custo ? 'OP e Custo ausentes.' : !op ? 'OP ausente.' : 'Custo ausente.'], evidencias: [] };
  const o = op.sinalRelacional;
  const c = custo.sinalRelacional;
  if (!inconsistente && !['insuficiente', 'heterogeneo'].includes(o) && c !== 'sem_base_utilizavel') {
    if (o === 'desfavoravel' && c === 'aumento_relevante') {
      codigo = 'evidencia_temporal_compativel'; tipo = 'temporalmente_compativel'; rotulo = 'Evidência temporal compatível';
      motivo = 'Foram observados eventos operacionais desfavoráveis e aumento de custo na mesma competência. Há evidência temporal compatível; a relação exige investigação.';
    } else if (o === 'desfavoravel' && c === 'sem_variacao_relevante') {
      codigo = 'sem_confirmacao_pelo_custo'; tipo = 'sem_confirmacao_por_custo'; rotulo = 'Sem confirmação pelo custo';
      motivo = 'Há eventos OP desfavoráveis sem variação relevante de custo na competência; isso não prova ausência de impacto.';
    } else if (o === 'sem_desvio_priorizado' && c === 'aumento_relevante') {
      codigo = 'sinal_custo_sem_correspondencia_operacional'; tipo = 'sinal_de_custo_sem_correspondencia_operacional'; rotulo = 'Sinal de custo sem correspondência operacional';
      motivo = 'Há aumento relevante de custo sem desvio operacional priorizado nos eventos disponíveis.';
    } else if ((o === 'favoravel' && c === 'aumento_relevante') || (o === 'desfavoravel' && c === 'queda_relevante')) {
      codigo = 'sinais_divergentes'; tipo = codigo; rotulo = 'Sinais divergentes';
      motivo = 'Os sinais OP e Custo têm sentidos divergentes na competência; a relação exige investigação.';
    } else if (o === 'favoravel' && c === 'queda_relevante') {
      codigo = 'evidencia_temporal_compativel_favoravel'; tipo = 'evidencia_temporalmente_compativel_favoravel'; rotulo = 'Evidências temporalmente compatíveis, em sentido favorável';
      motivo = 'Há eventos OP favoráveis e queda relevante de custo na mesma competência; coincidência temporal não comprova causa.';
    } else {
      codigo = 'sem_relacao_definida_v1'; tipo = codigo; rotulo = 'Sem relação definida na V1';
      motivo = 'Combinação de sinais sem relação definida na matriz aprovada da V1.';
    }
  }
  return { codigo, tipo, rotulo, motivos: [motivo,
    ...(inconsistente ? ['Inconsistência de normalização impede síntese segura.'] : []),
    ...op.motivosQualidade, ...custo.comparacao.motivos], evidencias: [] };
}

/**
 * @param {{contexto: RecordData, analisesOp?: RecordData[], analisesCusto?: RecordData[], produtoSolicitado?: unknown}} entrada
 * @returns {RecordData}
 */
export function analyzeOpCustoContext({ contexto, analisesOp = [], analisesCusto = [], produtoSolicitado }) {
  const inspecao = inspectOpCustoContext(contexto, produtoSolicitado);
  const base = { versao: 'OP_CUSTO_V1', competencia: contexto.competencia, leitura: contexto.leitura ?? null,
    fontes: contexto.fontes, estado: inspecao.estado, cobertura: inspecao.cobertura, diagnosticos: inspecao.diagnosticos,
    qualidade: { completa: inspecao.estado === 'completo', motivos: inspecao.motivos }, produtos: [] };
  if (inspecao.estado !== 'completo') return base;
  const opIndex = indexarAnalises(analisesOp, a => a.idFonte === undefined ? null : idKey(a.idFonte));
  const custoIndex = indexarAnalises(analisesCusto, a => normalizeCodigoProduto(a.codigoNormalizado));
  const grupos = [...inspecao.grupos.values()].sort((a, b) => ordenarCodigo(a.codigo, b.codigo));
  base.produtos = grupos.map(grupo => {
    const op = resumoOp(grupo.op, opIndex);
    const custo = resumoCusto(grupo.custos, custoIndex.get(grupo.codigo));
    const conflitos = conflitosNormalizacao(grupo);
    base.diagnosticos.inconsistencias.push(...conflitos);
    const evidencia = relacao(op, custo, conflitos.length > 0);
    const chave = { codigoNormalizado: grupo.codigo, competencia: contexto.competencia };
    if (op && custo) evidencia.evidencias.push({ id: JSON.stringify([grupo.codigo, contexto.competencia, evidencia.codigo]),
      chave, tipo: 'relacional_temporal', idsOp: op.eventos.map(e => e.idFonte),
      idsReferenciaCusto: custo.comparacao.idsReferencia, idsBaseCusto: custo.comparacao.idsBase,
      sinais: { op: op.sinalRelacional, custo: custo.sinalRelacional },
      deltaMonetario: custo.comparacao.deltaMonetario, deltaPercentual: custo.comparacao.deltaPercentual,
      texto: evidencia.motivos[0], limitacoes: ['Competência comum não comprova causalidade nem ordem dos acontecimentos.'] });
    return { chave, cobertura: op ? custo ? 'A' : 'B' : custo ? 'C' : 'D', op, custo, relacao: evidencia,
      qualidade: { avisos: conflitos, limitacoes: ['Sem consolidação numérica mensal de OP.', 'Série de custos limitada aos snapshots persistidos disponíveis.'] } };
  });
  return base;
}
