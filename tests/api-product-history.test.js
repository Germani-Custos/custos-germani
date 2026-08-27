import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  in: vi.fn()
}));

vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({
  createClient: () => ({ from: supabaseMock.from })
}));

vi.mock('../src/config/app-config.js', () => ({
  appConfig: {
    supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' },
    enableVerboseLogs: false
  },
  debugLog: vi.fn()
}));

import { api } from '../src/services/api.js';

function configureSupabase(rows) {
  const orderByImportacao = vi.fn().mockResolvedValue({ data: rows, error: null });
  const orderByCompetencia = vi.fn(() => ({ order: orderByImportacao }));
  const query = {
    in: supabaseMock.in.mockReturnValue({ order: orderByCompetencia }),
    order: orderByCompetencia
  };

  supabaseMock.from.mockReturnValue({
    select: () => ({
      eq: () => query
    })
  });
}

function configureHistoricoSupabase(rows) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const historicoQuery = {
    in: vi.fn(() => historicoQuery),
    gte: vi.fn(() => historicoQuery),
    lte: vi.fn(() => historicoQuery),
    order
  };
  supabaseMock.from.mockImplementation(table => {
    if (table === 'historico_custos') return { select: () => historicoQuery };
    if (table === 'dicionario_produtos') return {
      select: () => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })
    };
    throw new Error(`Tabela inesperada: ${table}`);
  });
  return historicoQuery;
}

describe('api.getProductHistory — recorte explícito de competências', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta somente Junho e Agosto, sem incluir a competência intermediária', async () => {
    configureSupabase([
      { codigo_produto: '001', descricao: 'Item', custo_total: 100, data_referencia: '2026-06-01', criado_em: '2026-06-10T10:00:00Z' },
      { codigo_produto: '001', descricao: 'Item', custo_total: 120, data_referencia: '2026-08-01', criado_em: '2026-08-10T10:00:00Z' }
    ]);

    const { data, error } = await api.getProductHistory('001', {
      mode: 'comparison', start: '2026-06-01', end: '2026-08-01',
      competencias: ['2026-06-01', '2026-08-01']
    });

    expect(error).toBeNull();
    expect(supabaseMock.in).toHaveBeenCalledWith('data_referencia', ['2026-06-01', '2026-08-01']);
    expect(data.map(row => row.data_referencia)).toEqual(['2026-06-01', '2026-08-01']);
    expect(data[1]).toMatchObject({ delta: 20, deltaPerc: 20 });
  });
});

describe('api.getHistorico — modos temporais', () => {
  const historico = [
    { codigo_produto: '001', descricao: 'Item', custo_total: 100, data_referencia: '2026-06-01' },
    { codigo_produto: '001', descricao: 'Item', custo_total: 110, data_referencia: '2026-07-01' },
    { codigo_produto: '001', descricao: 'Item', custo_total: 120, data_referencia: '2026-08-01' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('comparação consulta somente as duas competências selecionadas', async () => {
    const query = configureHistoricoSupabase([historico[0], historico[2]]);

    const { data, error } = await api.getHistorico({
      start: '2026-06-01', end: '2026-08-01',
      competencias: ['2026-06-01', '2026-08-01']
    });

    expect(error).toBeNull();
    expect(query.in).toHaveBeenCalledWith('data_referencia', ['2026-06-01', '2026-08-01']);
    expect(data.map(row => row.data_referencia)).toEqual(['2026-06-01', '2026-08-01']);
  });

  it('intervalo preserva a consulta entre início e fim', async () => {
    const query = configureHistoricoSupabase(historico);

    const { data, error } = await api.getHistorico({ start: '2026-06-01', end: '2026-08-01' });

    expect(error).toBeNull();
    expect(query.gte).toHaveBeenCalledWith('data_referencia', '2026-06-01');
    expect(query.lte).toHaveBeenCalledWith('data_referencia', '2026-08-01');
    expect(data.map(row => row.data_referencia)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01']);
  });
});
