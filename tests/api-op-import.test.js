import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  insertApontamentos: vi.fn()
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

const OP_COM_NUMERO = {
  origem: 200,
  op: 2081,
  cod_produto: 'MB001',
  descricao: 'MISTURA BISCOITO MARIA',
  cod_estagio: 12,
  estagio: 'BISCOITO',
  unidade: 'KG',
  qtd_prevista: 34532,
  qtd_produzida: 29876,
  qtd_apontamentos: 57,
  tempo_real: 1232,
  tempo_previsto: 1188.22,
  tempo_parada: 0,
  kg_hora_real: 1455,
  kg_hora_previsto: 1508.61,
  perc_tempo: -3.55
};

function configureSupabase(insertError = null) {
  supabaseMock.insertApontamentos.mockResolvedValue({ error: insertError });
  supabaseMock.from.mockImplementation(table => {
    if (table === 'log_importacao_op') {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 41 }, error: null })
          })
        }),
        update: () => ({
          eq: async () => ({ error: null })
        })
      };
    }

    if (table === 'apontamentos_op') {
      return { insert: supabaseMock.insertApontamentos };
    }

    throw new Error(`Tabela inesperada no teste: ${table}`);
  });
}

describe('api.importarApontamentosOp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureSupabase();
  });

  it('persiste o lote de 296 apontamentos com numero de OP normalizado', async () => {
    const rows = Array.from({ length: 296 }, (_, index) => ({
      ...OP_COM_NUMERO,
      op: 2000 + index
    }));
    const { data, error } = await api.importarApontamentosOp({
      rows,
      dataReferencia: '2026-07-01',
      arquivoNome: 'MCAP105.CSV'
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({ inseridos: 296, erros: [], logId: 41 });
    const payload = supabaseMock.insertApontamentos.mock.calls[0][0];
    expect(payload).toHaveLength(296);
    expect(payload.every(row => Number.isInteger(row.op))).toBe(true);
    expect(payload[0]).toMatchObject({
      data_referencia: '2026-07-01',
      log_importacao_op_id: 41,
      cod_produto: 'MB001'
    });
  });

  it('registra resposta completa e o campo que violou NOT NULL', async () => {
    const responseError = {
      code: '23502',
      message: 'null value in column "op" of relation "apontamentos_op" violates not-null constraint',
      details: 'Failing row contains (1, null, ...).',
      hint: null
    };
    configureSupabase(responseError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { data, error } = await api.importarApontamentosOp({
      rows: [{ ...OP_COM_NUMERO, op: null }],
      dataReferencia: '2026-07-01',
      arquivoNome: 'MCAP105.CSV'
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({ inseridos: 0, logId: 41 });
    expect(data.erros[0]).toMatchObject({
      chunk: 1,
      code: '23502',
      details: responseError.details,
      hint: null,
      errosValidacaoPorRegistro: [{ registro: 1, campo: 'op' }]
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('IMPORTA'),
      expect.objectContaining({
        primeiroRegistroEnviado: expect.objectContaining({ op: null }),
        respostaCompletaSupabase: responseError,
        code: '23502',
        message: responseError.message,
        details: responseError.details,
        hint: null,
        errosValidacaoPorRegistro: [{ registro: 1, campo: 'op', motivo: expect.any(String) }]
      }),
      '=================================='
    );
    errorSpy.mockRestore();
  });
});
