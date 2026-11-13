// @ts-check
/** OP-CUSTO-4C-2: composição histórica pura, sem I/O ou conclusão causal. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';
import { analyzeOpInvestigation } from './op-investigation-engine.js';

/** @typedef {Record<string, any>} RecordData */
const FONTES_COMPLETAS = new Set(['completa', 'completa_vazia']);
const SINAIS_DESFAVORAVEIS = new Set(['paradas_operacionais', 'desperdicio_operacional', 'gargalo_produtividade', 'baixa_producao']);

function erro(code, message) {
  return Object.assign(new Error(message), { code });
}

function diasNoMes(ano, mes) {
  return [31, ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}

function competenciaDaData(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [ano, mes, dia] = value.split('-').map(Number);
  return ano > 0 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes) ? value.slice(0, 7) : null;
}

/** Preserva microssegundos e não usa data_referencia como substituto. */
function instanteImportacao(value) {
  if (typeof value !== 'string' || !competenciaDaData(value.slice(0, 10))) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const epoch = Date.parse(`${match[1]}${match[3]}`);
  return Number.isFinite(epoch) ? BigInt(epoch) * 1000000n + BigInt((match[2] || '').padEnd(9, '0')) : null;
}

function assinaturaFinanceira(row) {
  return JSON.stringify(['custo_variavel', 'custo_direto_fixo', 'custo_total'].map(campo =>
    Object.hasOwn(row, campo) ? ['presente', row[campo]] : ['ausente']));
}

function estadoDaFonte(meta) {
  return FONTES_COMPLETAS.has(meta?.estado) ? meta.estado : 'erro';
}

function metadadoPorCompetencia(contexto, competencia, fonte, quantidade) {
  const original = contexto.competencias?.find(item => item?.competencia === competencia)?.[fonte];
  if (original && typeof original.estado === 'string') return { ...original };
  return { estado: quantidade ? 'completa' : 'completa_vazia', contagem: quantidade };
}

function evidência(tipo, competencia, fonte, ids, limitacoes) {
  return { tipo, competencia, fonte, idsFontes: ids, limitacoes };
}

function distribuir(eventos, campo) {
  const distribuicao = Object.create(null);
  for (const evento of eventos) {
    const classificacao = evento.resultadoOriginal?.classificacaoInvestigativa;
    const chave = campo === 'chave' ? classificacao?.key : classificacao?.[campo]?.key;
    const chaveNormalizada = chave || 'ausente';
    distribuicao[chaveNormalizada] = (distribuicao[chaveNormalizada] || 0) + 1;
  }
  return distribuicao;
}

function comporEventosOp(rows) {
  const eventos = rows.map(fatoOriginal => ({
    idFonte: fatoOriginal.id,
    fatoOriginal,
    resultadoOriginal: analyzeOpInvestigation(fatoOriginal)
  }));
  const motivos = distribuir(eventos, 'chave');
  const decisoes = distribuir(eventos, 'decisao');
  const chaves = eventos.map(evento => evento.resultadoOriginal.classificacaoInvestigativa?.key);
  return {
    eventos,
    contagens: { eventos: eventos.length },
    distribuicaoMotivos: motivos,
    distribuicaoDecisoes: decisoes,
    sinais: {
      favoraveis: chaves.includes('alta_eficiencia'),
      desfavoraveis: chaves.some(chave => SINAIS_DESFAVORAVEIS.has(chave)),
      mistos: chaves.includes('sinal_misto'),
      semBaseComparativa: chaves.includes('sem_base_comparativa')
    },
    consolidacao: { estado: 'nao_disponivel', valores: null }
  };
}

function candidatoCusto(snapshots) {
  const comTimestamp = snapshots.map(snapshot => ({ snapshot, instante: instanteImportacao(snapshot.criado_em) }))
    .filter(item => item.instante !== null);
  if (!comTimestamp.length) {
    return { estado: 'indisponivel', motivo: 'timestamp_importacao_invalido', idsCandidatos: [], snapshotsCandidatos: [] };
  }
  const maior = comTimestamp.reduce((atual, item) => item.instante > atual ? item.instante : atual, comTimestamp[0].instante);
  const candidatos = comTimestamp.filter(item => item.instante === maior).map(item => item.snapshot);
  if (candidatos.length === 1) {
    return { estado: 'selecionado', motivo: 'maior_criado_em_valido', idsCandidatos: [candidatos[0].id], snapshotsCandidatos: candidatos };
  }
  const valoresIguais = new Set(candidatos.map(assinaturaFinanceira)).size === 1;
  return {
    estado: valoresIguais ? 'empate_equivalente' : 'ambiguo',
    motivo: valoresIguais ? 'mesmo_timestamp_e_valores_financeiros' : 'mesmo_timestamp_com_valores_financeiros_distintos',
    idsCandidatos: candidatos.map(snapshot => snapshot.id),
    snapshotsCandidatos: candidatos
  };
}

function validarContexto(contexto) {
  const codigo = normalizeCodigoProduto(contexto?.produto?.codigoNormalizado);
  const competencias = contexto?.periodo?.competencias;
  if (!codigo) throw erro('PRODUTO_INVALIDO', 'Contexto histórico sem produto canônico válido.');
  if (!Array.isArray(competencias) || !competencias.length || competencias.some(competencia => !/^\d{4}-\d{2}$/.test(competencia))) {
    throw erro('PERIODO_INVALIDO', 'Contexto histórico sem competências explícitas válidas.');
  }
  if (new Set(competencias).size !== competencias.length || competencias.some((competencia, index) => index && competencia <= competencias[index - 1])) {
    throw erro('PERIODO_INVALIDO', 'Competências devem ser únicas e cronológicas.');
  }
  if (!Array.isArray(contexto?.opEventos) || !Array.isArray(contexto?.custoSnapshots)) {
    throw erro('CONTEXTO_INVALIDO', 'Contexto histórico sem coleções factuais.');
  }
  return { codigo, competencias };
}

/**
 * Compõe a investigação histórica de um único produto a partir da leitura factual 4C-1.
 * Não altera fatos, não lê fontes e não calcula comparação financeira, causalidade ou recorrência.
 * @param {RecordData} contexto
 */
export function analyzeOpCustoHistorico(contexto) {
  const { codigo, competencias } = validarContexto(contexto);
  const diagnosticos = {
    leitura: contexto.diagnosticos || {},
    composicao: { opNaoVinculavel: [], custoNaoVinculavel: [], codigoDivergente: [] }
  };
  const porCompetencia = new Map(competencias.map(competencia => [competencia, { op: [], custos: [] }]));
  const organizar = (rows, fonte, campo, diagnostico) => {
    for (const row of rows) {
      const codigoLinha = normalizeCodigoProduto(row?.[campo]);
      const competencia = competenciaDaData(row?.data_referencia);
      if (!codigoLinha || !competencia) {
        diagnosticos.composicao[diagnostico].push({ fonte, idFonte: row?.id ?? null, fatoOriginal: row,
          motivo: !codigoLinha ? 'codigo_invalido' : 'data_invalida' });
      } else if (codigoLinha !== codigo) {
        diagnosticos.composicao.codigoDivergente.push({ fonte, idFonte: row?.id ?? null, fatoOriginal: row, motivo: 'produto_divergente' });
      } else if (!porCompetencia.has(competencia)) {
        diagnosticos.composicao[diagnostico].push({ fonte, idFonte: row?.id ?? null, fatoOriginal: row, motivo: 'fora_do_intervalo' });
      } else {
        porCompetencia.get(competencia)[fonte].push(row);
      }
    }
  };
  organizar(contexto.opEventos, 'op', 'cod_produto', 'opNaoVinculavel');
  organizar(contexto.custoSnapshots, 'custos', 'codigo_produto', 'custoNaoVinculavel');

  const opCompleta = estadoDaFonte(contexto.fontes?.op);
  const custosCompletos = estadoDaFonte(contexto.fontes?.custos);
  const competenciasCompletas = competencias.every(competencia => {
    const fatos = porCompetencia.get(competencia);
    return FONTES_COMPLETAS.has(metadadoPorCompetencia(contexto, competencia, 'op', fatos.op.length).estado)
      && FONTES_COMPLETAS.has(metadadoPorCompetencia(contexto, competencia, 'custos', fatos.custos.length).estado);
  });
  const completa = contexto?.estado !== 'incompleto' && contexto?.qualidade?.completa !== false
    && opCompleta !== 'erro' && custosCompletos !== 'erro' && competenciasCompletas;
  const evidencias = [];
  const competenciasCompostas = competencias.map(competencia => {
    const fatos = porCompetencia.get(competencia);
    const op = comporEventosOp(fatos.op);
    const custos = { snapshots: fatos.custos, candidatoRepresentativo: candidatoCusto(fatos.custos) };
    const fontesCompetencia = {
      op: metadadoPorCompetencia(contexto, competencia, 'op', fatos.op.length),
      custos: metadadoPorCompetencia(contexto, competencia, 'custos', fatos.custos.length)
    };
    const cobertura = completa ? fatos.op.length ? fatos.custos.length ? 'A' : 'B' : fatos.custos.length ? 'C' : 'D' : null;
    const idsOp = fatos.op.map(row => row.id);
    const idsCustos = fatos.custos.map(row => row.id);
    if (cobertura) {
      const tipoCobertura = { A: 'cobertura_ambas_fontes', B: 'cobertura_sem_custo', C: 'cobertura_sem_op', D: 'cobertura_sem_fatos' }[cobertura];
      evidencias.push(evidência(tipoCobertura, competencia, cobertura === 'A' ? 'op_e_custos' : cobertura === 'B' ? 'op' : cobertura === 'C' ? 'custos' : 'nenhuma',
        [...idsOp, ...idsCustos], ['Cobertura descreve disponibilidade factual, não qualidade operacional nem causalidade.']));
    }
    if (fatos.custos.length > 1) evidencias.push(evidência('multiplos_snapshots_custo', competencia, 'custos', idsCustos,
      ['A série original permanece íntegra; múltiplos snapshots não são deduplicados.']));
    if (custos.candidatoRepresentativo.estado === 'ambiguo') evidencias.push(evidência('candidato_custo_ambiguo', competencia, 'custos', custos.candidatoRepresentativo.idsCandidatos,
      ['Empate de criado_em com valores financeiros distintos não autoriza escolher um vencedor.']));
    if (op.sinais.favoraveis && op.sinais.desfavoraveis) evidencias.push(evidência('sinais_op_favoraveis_e_desfavoraveis', competencia, 'op', idsOp,
      ['Sinais coexistentes não se anulam e não definem causalidade com Custos.']));
    if (op.sinais.desfavoraveis) evidencias.push(evidência('sinal_op_desfavoravel_observado', competencia, 'op', idsOp,
      ['É observação descritiva; não define recorrência, prioridade histórica ou score.']));
    return {
      competencia,
      fontes: fontesCompetencia,
      cobertura,
      op,
      custos,
      comparacaoHistorica: { estado: 'nao_disponivel', motivo: 'comparacao_intercompetencia_nao_autorizada' }
    };
  });
  const cobertura = completa ? competenciasCompostas.reduce((total, item) => {
    total[item.cobertura]++;
    return total;
  }, { A: 0, B: 0, C: 0, D: 0 }) : null;
  const contagensDescritivas = {
    competenciasComEventosOp: competenciasCompostas.filter(item => item.op.eventos.length > 0).length,
    competenciasComSnapshotsCusto: competenciasCompostas.filter(item => item.custos.snapshots.length > 0).length,
    competenciasComSinaisOpDesfavoraveis: competenciasCompostas.filter(item => item.op.sinais.desfavoraveis).length
  };
  return {
    versao: 'OP_CUSTO_HISTORICO_V1',
    estado: completa ? 'completo' : 'incompleto',
    produto: { codigoNormalizado: codigo },
    periodo: contexto.periodo,
    fontes: { op: contexto.fontes?.op || { estado: 'erro' }, custos: contexto.fontes?.custos || { estado: 'erro' } },
    qualidade: { completa, coberturaPronta: completa },
    cobertura,
    competencias: competenciasCompostas,
    diagnosticos,
    evidencias,
    contagensDescritivas,
    limitacoes: [
      'Leitura factual pode ser não transacional entre páginas e fontes.',
      'Cobertura não prova qualidade operacional, relação causal ou estabilidade.',
      'Não há comparação monetária intercompetência, agregação de OP, recorrência, score ou prioridade histórica.'
    ]
  };
}
