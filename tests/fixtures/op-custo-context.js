// Dados sintéticos compartilhados pela UI: interpretações dos motores reais,
// sem acesso remoto e sem regra investigativa paralela na fixture.
import { buildOpInvestigationQueue } from '../../core/op-investigation-engine.js';
import { toInvestigationResult } from '../../core/investigation-contract.js';
import { buildReportRows, classifyAlert } from '../../core/report-engine.js';
import { getOpCustoPeriod } from '../../core/op-custo-engine.js';

export function makeOpEvent(patch = {}) {
  return { id: 'op-1', op: 738, cod_produto: '001', descricao: 'Produto OP 001',
    data_referencia: '2026-10-05', criado_em: '2026-11-01T10:00:00Z',
    cod_estagio: '01', estagio: 'MASSA', origem: 10, unidade: 'CX', log_importacao_op_id: 7,
    qtd_prevista: 100, qtd_produzida: 80, qtd_apontamentos: 2, tempo_previsto: 10,
    tempo_real: 30, tempo_parada: 20, kg_hora_previsto: 100, kg_hora_real: 50,
    perc_tempo: 200, ...patch };
}

export function makeCostSnapshots(codigo = '001', anterior = 100, atual = 110) {
  return [{ id: `${codigo}-c1`, codigo_produto: codigo, descricao: `Produto Custo ${codigo}`,
    data_referencia: '2026-10-05', criado_em: '2026-10-10T10:00:00Z',
    custo_variavel: 70, custo_direto_fixo: 30, custo_total: anterior },
  { id: `${codigo}-c2`, codigo_produto: codigo, descricao: `Outra descrição ${codigo}`,
    data_referencia: '2026-10-14', criado_em: '2026-11-10T10:00:00Z',
    custo_variavel: 80, custo_direto_fixo: 30, custo_total: atual }];
}

export function makeOpCustoContext({
  opEventos = [makeOpEvent(), makeOpEvent({ id: 'op-2', cod_estagio: '02', estagio: 'FORNO' }),
    makeOpEvent({ id: 'op-3', op: 739, cod_produto: '002', descricao: 'Somente OP' })],
  custoSnapshots = [...makeCostSnapshots(), ...makeCostSnapshots('003')], competencia = '2026-10'
} = {}) {
  const meta = rows => ({ estado: rows.length ? 'completa' : 'completa_vazia', contagem: rows.length,
    paginas: Math.ceil(rows.length / 500), ordem: [['id', true]], lidoEm: '2026-10-23T12:00:00Z' });
  return { versao: 'OP_CUSTO_V1', competencia,
    periodo: getOpCustoPeriod(competencia), qualidade: { completa: true, motivos: [] },
    opEventos, custoSnapshots, fontes: { op: meta(opEventos), custos: meta(custoSnapshots) },
    leitura: { idLocal: 'contexto-ui-sintetico', consistencia: 'nao_transacional' },
    analisesOp: buildOpInvestigationQueue(opEventos).map((row, posicaoOriginal) => ({
      idFonte: row.id, posicaoOriginal, resultadoOriginal: toInvestigationResult(row)
    })),
    analisesCusto: buildReportRows(custoSnapshots).map(resultadoOriginal => ({
      codigoNormalizado: resultadoOriginal.codigo, resultadoOriginal,
      alerta: classifyAlert(resultadoOriginal), prioridadeOriginal: null,
      qualidadePrioridade: 'aguarda_presenter_existente'
    })) };
}
