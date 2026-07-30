import { describe, expect, it } from 'vitest';
import { analyzeOpInvestigation, buildOpInvestigationQueue } from '../core/op-investigation-engine.js';

const OP_738 = Object.freeze({
  op: 738,
  cod_produto: '1001051',
  qtd_prevista: 2800,
  qtd_produzida: 2992,
  tempo_previsto: 1197.01,
  tempo_real: 749,
  kg_hora_previsto: 899.84,
  kg_hora_real: 1438.08,
  perc_tempo: 59.81,
  tempo_parada: 105
});

const OP_752 = Object.freeze({
  op: 752,
  cod_produto: '1001058',
  qtd_prevista: 1000,
  qtd_produzida: 1229,
  tempo_previsto: 368.7,
  tempo_real: 912,
  kg_hora_previsto: 1600,
  kg_hora_real: 646.84,
  perc_tempo: -59.57,
  tempo_parada: 14
});

describe('motor investigativo de OP', () => {
  it('interpreta a OP 738 como alta eficiência, sem penalizar a parada isolada', () => {
    const result = analyzeOpInvestigation(OP_738);

    expect(result.classificacaoInvestigativa).toMatchObject({
      key: 'alta_eficiencia',
      motivo: '🟩 Alta eficiência'
    });
    expect(result.indicadoresKustos.atendimentoProducaoPct).toBeCloseTo(106.8571, 3);
    expect(result.indicadoresKustos.desvioTempoPct).toBeCloseTo(-37.4274, 3);
    expect(result.indicadoresKustos.desvioProdutividadePct).toBeCloseTo(59.8151, 3);
    expect(result.indicadoresKustos.indiceParadasPct).toBeCloseTo(14.0187, 3);
    expect(result.conferenciaErp).toMatchObject({ status: 'confirmado', percentTempoErp: 59.81 });
    expect(result.classificacaoInvestigativa.resumo).toContain('Paradas sem impacto operacional aparente');
    expect(OP_738.tempo_parada).toBe(105);
  });

  it('interpreta a OP 752 como gargalo de produtividade, sem inventar déficit de produção', () => {
    const result = analyzeOpInvestigation(OP_752);

    expect(result.classificacaoInvestigativa).toMatchObject({
      key: 'gargalo_produtividade',
      motivo: '🟥 Gargalo de produtividade'
    });
    expect(result.indicadoresKustos.atendimentoProducaoPct).toBeCloseTo(122.9, 3);
    expect(result.indicadoresKustos.desvioTempoPct).toBeCloseTo(147.3556, 3);
    expect(result.indicadoresKustos.desvioProdutividadePct).toBeCloseTo(-59.5725, 3);
    expect(result.indicadoresKustos.indiceParadasPct).toBeCloseTo(1.5351, 3);
    expect(result.classificacaoInvestigativa.resumo).toContain('Atendimento de 122,9%');
    expect(result.classificacaoInvestigativa.resumo).toContain('não explica o desvio');
  });

  it('atribui paradas como causa provável somente quando acompanham atraso e produtividade normal ou baixa', () => {
    const result = analyzeOpInvestigation({
      qtd_prevista: 100,
      qtd_produzida: 90,
      tempo_previsto: 100,
      tempo_real: 160,
      kg_hora_previsto: 100,
      kg_hora_real: 92,
      tempo_parada: 48,
      perc_tempo: -8
    });

    expect(result.classificacaoInvestigativa).toMatchObject({
      key: 'paradas_operacionais',
      motivo: '🟦 Paradas operacionais'
    });
    expect(result.indicadoresKustos.indiceParadasPct).toBe(30);
  });

  it('separa baixa produção de gargalo quando tempo e produtividade permanecem normais', () => {
    const result = analyzeOpInvestigation({
      qtd_prevista: 100,
      qtd_produzida: 90,
      tempo_previsto: 100,
      tempo_real: 104,
      kg_hora_previsto: 100,
      kg_hora_real: 97,
      tempo_parada: 2,
      perc_tempo: -3
    });

    expect(result.classificacaoInvestigativa.key).toBe('baixa_producao');
  });

  it('não infere eficiência quando não há base prevista válida', () => {
    const result = analyzeOpInvestigation({
      qtd_prevista: 0,
      qtd_produzida: 100,
      tempo_previsto: 0,
      tempo_real: 50,
      kg_hora_previsto: 0,
      kg_hora_real: 200,
      tempo_parada: 0,
      perc_tempo: 0
    });

    expect(result.classificacaoInvestigativa.key).toBe('sem_base_comparativa');
    expect(result.indicadoresKustos.desvioTempoPct).toBeNull();
    expect(result.indicadoresKustos.desvioProdutividadePct).toBeNull();
  });

  it('ordena a fila pelo motivo investigativo e não pelo valor bruto da parada', () => {
    const queue = buildOpInvestigationQueue([OP_738, OP_752]);

    expect(queue.map(item => item.op)).toEqual([752, 738]);
  });
});
