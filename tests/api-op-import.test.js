import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  insertApontamentos: vi.fn(), createLog: vi.fn(), closeLog: vi.fn(), logInsert: vi.fn(), logUpdate: vi.fn()
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
import { parseMCAP105 } from '../core/spreadsheet-engine.js';

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
  supabaseMock.createLog.mockResolvedValue({ data: { id: 41 }, error: null });
  supabaseMock.closeLog.mockResolvedValue({ data: { id: 41 }, error: null });
  supabaseMock.logInsert.mockImplementation(() => ({ select: () => ({ single: supabaseMock.createLog }) }));
  supabaseMock.logUpdate.mockImplementation(() => ({ eq: () => ({ select: () => ({ single: supabaseMock.closeLog }) }) }));
  supabaseMock.from.mockImplementation(table => {
    if (table === 'log_importacao_op') {
      return {
        insert: supabaseMock.logInsert, update: supabaseMock.logUpdate
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
    vi.resetAllMocks();
    configureSupabase();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

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

  it('preserva diagnóstico completo MNT-OP-01 de falha remota residual, sem retry', async () => {
    const responseError = {
      code: '23502',
      message: 'null value in column "op" of relation "apontamentos_op" violates not-null constraint',
      details: 'Failing row contains (1, null, ...).',
      hint: null
    };
    configureSupabase(responseError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { data, error } = await api.importarApontamentosOp({
      rows: [OP_COM_NUMERO],
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
      tipo: 'operacional', errosValidacaoPorRegistro: []
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('IMPORTA'),
      expect.objectContaining({
        primeiroRegistroEnviado: expect.objectContaining({ op: 2081 }),
        respostaCompletaSupabase: responseError,
        code: '23502',
        message: responseError.message,
        details: responseError.details,
        hint: null,
        errosValidacaoPorRegistro: []
      }),
      '=================================='
    );
    errorSpy.mockRestore();
  });

  const params = rows => ({ rows, dataReferencia: '2026-07-01', arquivoNome: 'MCAP105.CSV' });
  const failure = { code: '42501', message: 'permission denied', details: 'diagnóstico', hint: null };
  function balance(data) {
    const r = data.resumo;
    expect(r.total_linhas).toBe(r.linhas_validas + r.linhas_rejeitadas);
    expect(r.linhas_validas).toBe(r.linhas_importadas + r.linhas_falha_operacional + r.linhas_indeterminadas + r.linhas_nao_enviadas);
    expect(r.linhas_erro).toBe(r.linhas_rejeitadas + r.linhas_falha_operacional);
  }

  it.each([100, 296])('preserva integralmente %i fatos e fecha sucesso total', async n => {
    const rows = Array.from({ length: n }, (_, op) => ({ ...OP_COM_NUMERO, op }));
    const { data, error } = await api.importarApontamentosOp(params(rows));
    expect(error).toBeNull();
    expect(data).toMatchObject({ inseridos: n, estado: 'concluido', logFinalizado: true });
    expect(supabaseMock.insertApontamentos.mock.calls.flatMap(([chunk]) => chunk)).toEqual(rows.map(row => ({ ...row, data_referencia: '2026-07-01', log_importacao_op_id: 41 })));
    expect(supabaseMock.logUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'concluido', linhas_importadas: n, linhas_erro: 0 }));
    balance(data);
  });

  it.each([undefined, null, '', '   ', 'ABC', '2.081', 2.5, NaN, Infinity, 2147483648, -2147483649])('não envia OP canônica inválida %s', async op => {
    const { data } = await api.importarApontamentosOp(params([{ ...OP_COM_NUMERO, op }]));
    expect(supabaseMock.insertApontamentos).not.toHaveBeenCalled();
    expect(data).toMatchObject({ estado: 'rejeitado', inseridos: 0, resumo: { total_linhas: 1, linhas_rejeitadas: 1 } });
    expect(data.erros[0]).toMatchObject({ tipo: 'validacao', etapa: 'api', registro: 1, linha: null, campo: 'op' });
    expect(supabaseMock.logUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejeitado', linhas_erro: 1 }));
    balance(data);
  });

  it.each([0, -1, -2147483648, 2147483647])('preserva OP permitida pelo INTEGER: %s', async op => {
    const { data } = await api.importarApontamentosOp(params([{ ...OP_COM_NUMERO, op }]));
    expect(data.inseridos).toBe(1);
    expect(supabaseMock.insertApontamentos.mock.calls[0][0][0].op).toBe(op);
  });

  it.each([0, 1, 2])('isola inválida na posição %i e conserva linha física', async index => {
    const rows = [OP_COM_NUMERO, { ...OP_COM_NUMERO, op: 2082 }, { ...OP_COM_NUMERO, op: 2083 }];
    rows[index] = { ...rows[index], op: null };
    const { data } = await api.importarApontamentosOp({ ...params(rows), origens: [4, 8, 11] });
    expect(supabaseMock.insertApontamentos.mock.calls[0][0]).toHaveLength(2);
    expect(data.erros[0]).toMatchObject({ tipo: 'validacao', linha: [4, 8, 11][index] });
    expect(data).toMatchObject({ inseridos: 2, estado: 'parcial', resumo: { total_linhas: 3, linhas_rejeitadas: 1 } });
    balance(data);
  });

  it.each([2, 3, 7])('conta %i rejeições uma vez por linha com vários problemas', async n => {
    const { data } = await api.importarApontamentosOp(params([OP_COM_NUMERO, ...Array(n).fill({ ...OP_COM_NUMERO, op: null, cod_estagio: null }), OP_COM_NUMERO]));
    expect(data.resumo.linhas_rejeitadas).toBe(n);
    expect(data.erros).toHaveLength(n);
    expect(data.erros[0].problemas).toHaveLength(2);
    expect(data.inseridos).toBe(2);
    balance(data);
  });

  it('três rejeitadas não criam chunk vazio', async () => {
    const { data } = await api.importarApontamentosOp(params(Array(3).fill({ ...OP_COM_NUMERO, op: null })));
    expect(data.resumo.linhas_rejeitadas).toBe(3);
    expect(data.chunks).toEqual([]);
    expect(supabaseMock.insertApontamentos).not.toHaveBeenCalled();
  });

  it.each([[399, [399]], [400, [400]], [401, [400, 1]], [799, [400, 399]], [802, [400, 400, 2]]])('chunks após filtragem de %i válidos', async (n, sizes) => {
    const rows = Array.from({ length: n }, (_, op) => ({ ...OP_COM_NUMERO, op }));
    rows.splice(0, 0, { ...OP_COM_NUMERO, op: null });
    rows.splice(400, 0, { ...OP_COM_NUMERO, op: null });
    rows.push({ ...OP_COM_NUMERO, op: null });
    const { data } = await api.importarApontamentosOp(params(rows));
    expect(supabaseMock.insertApontamentos.mock.calls.map(([chunk]) => chunk.length)).toEqual(sizes);
    expect(supabaseMock.insertApontamentos.mock.calls.flatMap(([chunk]) => chunk).map(r => r.op)).toEqual(Array.from({ length: n }, (_, i) => i));
    expect(data.resumo).toMatchObject({ total_linhas: n + 3, linhas_rejeitadas: 3, linhas_importadas: n });
    balance(data);
  });

  it('reconcilia parser real, linha física, payload e log', async () => {
    const line = op => `200,${op},MB001,DESCRIÇÃO,12,BISCOITO,100,90,KG,10,12,10,7,-30,2,3`;
    const parsed = parseMCAP105(['Título', line('2.081'), '', line('ABC'), 'Cabeçalho', line('2082')].join('\r\n'));
    const { data } = await api.importarApontamentosOp({ ...params(parsed.rows), origens: parsed.origens, errosLeitura: parsed.errors });
    expect(data.erros[0]).toMatchObject({ linha: 4, campo: 'op', valorOriginal: 'ABC', tipo: 'validacao', etapa: 'parser' });
    expect(data.chunks[0].fontes.map(f => f.linha)).toEqual([2, 6]);
    expect(supabaseMock.logInsert).toHaveBeenCalledWith(expect.objectContaining({ total_linhas: 3, linhas_erro: 1 }));
    expect(supabaseMock.insertApontamentos.mock.calls[0][0].every(r => !('linha' in r) && !('problemas' in r))).toBe(true);
    balance(data);
  });

  it.each([399, 400, 401])('%i válidos + exatamente uma inválida: fronteira calculada após exclusão', async n => {
    const rows = Array.from({ length: n }, (_, op) => ({ ...OP_COM_NUMERO, op }));
    rows.splice(399, 0, { ...OP_COM_NUMERO, op: null });
    const { data } = await api.importarApontamentosOp(params(rows));
    expect(supabaseMock.insertApontamentos.mock.calls.map(([chunk]) => chunk.length)).toEqual(n <= 400 ? [n] : [400, 1]);
    expect(data.resumo).toMatchObject({ total_linhas: n + 1, linhas_importadas: n, linhas_rejeitadas: 1 });
    balance(data);
  });

  it.each(['origem', 'cod_produto', 'descricao', 'cod_estagio', 'estagio', 'unidade'])('defende campo obrigatório %s', async field => {
    const { data } = await api.importarApontamentosOp(params([{ ...OP_COM_NUMERO, [field]: null }, OP_COM_NUMERO]));
    expect(data.inseridos).toBe(1); expect(data.erros[0].campo).toBe(field);
  });

  it.each([[[1], 'parcial'], [[0, 2], 'parcial'], [[0, 1, 2], 'erro']])('separa falhas operacionais nos chunks %j', async (failed, estado) => {
    let index = 0;
    supabaseMock.insertApontamentos.mockImplementation(async () => ({ error: failed.includes(index++) ? failure : null }));
    const { data } = await api.importarApontamentosOp(params(Array.from({ length: 805 }, (_, op) => ({ ...OP_COM_NUMERO, op }))));
    expect(data.estado).toBe(estado);
    expect(data.resumo.linhas_rejeitadas).toBe(0);
    expect(data.erros.every(e => e.tipo === 'operacional')).toBe(true);
    expect(supabaseMock.insertApontamentos).toHaveBeenCalledTimes(3);
    expect(supabaseMock.logUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: estado, linhas_importadas: data.inseridos, linhas_erro: data.resumo.linhas_falha_operacional }));
    balance(data);
  });

  it.each(['erro', 'throw', 'sem_id', 'id_inseguro'])('criação de log %s bloqueia fatos', async mode => {
    if (mode === 'throw') supabaseMock.createLog.mockRejectedValue(new Error('rede'));
    else supabaseMock.createLog.mockResolvedValue({ data: mode === 'id_inseguro' ? { id: 9007199254740992 } : null, error: mode === 'erro' ? failure : null });
    const { data, error } = await api.importarApontamentosOp(params([OP_COM_NUMERO]));
    expect(data).toBeNull(); expect(error).toBeTruthy();
    expect(supabaseMock.insertApontamentos).not.toHaveBeenCalled(); expect(supabaseMock.logUpdate).not.toHaveBeenCalled();
  });

  it.each(['erro', 'throw', 'sem_id'])('fechamento de log %s não apaga persistência confirmada', async mode => {
    if (mode === 'throw') supabaseMock.closeLog.mockRejectedValue(new Error('rede'));
    else supabaseMock.closeLog.mockResolvedValue({ data: null, error: mode === 'erro' ? failure : null });
    const { data } = await api.importarApontamentosOp(params([OP_COM_NUMERO]));
    expect(data).toMatchObject({ inseridos: 1, logFinalizado: false, logError: expect.any(String) });
    expect(data.erros[0]).toMatchObject({ tipo: 'operacional', etapa: 'log' });
    expect(supabaseMock.insertApontamentos).toHaveBeenCalledTimes(1);
  });

  it.each(['throw', 'fetch', 'sem_resposta'])('resposta incerta %s não fabrica rollback nem retry', async mode => {
    supabaseMock.insertApontamentos.mockResolvedValueOnce({ error: null });
    if (mode === 'throw') supabaseMock.insertApontamentos.mockRejectedValueOnce(new Error('rede'));
    else supabaseMock.insertApontamentos.mockResolvedValueOnce(mode === 'fetch' ? { error: { message: 'Failed to fetch', code: '' }, status: 0 } : undefined);
    const { data } = await api.importarApontamentosOp(params(Array(900).fill(OP_COM_NUMERO)));
    expect(data.estado).toBe('indeterminado');
    expect(data.resumo).toMatchObject({ linhas_importadas: 400, linhas_indeterminadas: 400, linhas_nao_enviadas: 100, linhas_falha_operacional: 0 });
    expect(supabaseMock.insertApontamentos).toHaveBeenCalledTimes(2);
    expect(supabaseMock.logUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'indeterminado', finalizado_em: null, linhas_erro: 0 }));
    balance(data);
  });

  it.each([{ origens: [2, 2] }, { origens: [1] }, { errosLeitura: null }, { errosLeitura: [{ linha: 1 }] }, { origens: [1, 2], errosLeitura: [{ linha: 2, campo: 'op', mensagem: 'inválida' }] }])('contexto inválido %j bloqueia I/O', async extra => {
    const { error } = await api.importarApontamentosOp({ ...params([OP_COM_NUMERO, OP_COM_NUMERO]), ...extra });
    expect(error).toBeTruthy(); expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('arquivo vazio não cria execução', async () => {
    const { data } = await api.importarApontamentosOp(params([]));
    expect(data.estado).toBe('vazio'); expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
