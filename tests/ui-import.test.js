import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): não exporta internos nem toca no runtime.
// O módulo api é mockado (cliente Supabase real do CDN nunca é carregado).
vi.mock('../src/services/api.js', () => ({
  api: { importarHistoricoCustosComLog: vi.fn() }
}));

import { createImportController } from '../view/ui-import.js';
import { api } from '../src/services/api.js';

const MAPPING = {
  codigo_produto: 'codigo_produto',
  descricao: 'descricao',
  custo_variavel: 'custo_variavel',
  custo_direto_fixo: 'custo_direto_fixo',
  custo_total: 'custo_total'
};

function fakeClassList() {
  return { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } };
}

function fakeEl(extra = {}) {
  const listeners = {};
  return {
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    async emit(ev, arg) { for (const fn of (listeners[ev] || [])) await fn(arg); },
    classList: fakeClassList(),
    ...extra
  };
}

// Planilha simulada (matriz header:1): 1 linha válida + 1 com código inválido.
const WORKBOOK_MATRIX = [
  ['codigo_produto', 'descricao', 'custo_variavel', 'custo_direto_fixo', 'custo_total'],
  ['1.5e2', 'Item A', '1,50', '2,00', '3,50'],
  ['', 'Sem código', '9', '9', '9']
];

function setup({ refDate = '2026-03-01' } = {}) {
  const file = { arrayBuffer: async () => new ArrayBuffer(0) };
  const fileInput = fakeEl({ files: [file], click: vi.fn() });
  const dom = {
    dropZone: fakeEl(),
    fileInput,
    importDate: { value: refDate }
  };
  const state = { masters: { produtos: [] }, importMapping: null };
  const fetchMetadata = vi.fn(async () => {});
  const executeOperationalBoundary = async (_op, action) => action();

  const { bindUpload } = createImportController({ dom, state, executeOperationalBoundary, fetchMetadata });
  bindUpload();
  return { dom, state, fetchMetadata, fileInput };
}

describe('createImportController — fluxo de importação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.importarHistoricoCustosComLog.mockResolvedValue({
      data: { resumo: { total_linhas: 1, linhas_importadas: 1, linhas_erro: 0 } },
      error: null
    });
    global.XLSX = {
      read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
      utils: { sheet_to_json: () => WORKBOOK_MATRIX }
    };
    global.Swal = {
      fire: vi.fn(async (opts) => {
        if (opts.title === 'Confirmar mapeamento de colunas') return { isConfirmed: true, value: MAPPING };
        if (opts.title === 'Preview da importação') return { isConfirmed: true };
        return {};
      })
    };
  });

  afterEach(() => { delete global.XLSX; delete global.Swal; });

  it('normaliza o código (VAL-01), descarta linha inválida e envia payload com data_referencia', async () => {
    const { dom, state, fetchMetadata } = setup({ refDate: '2026-03-01' });

    await dom.fileInput.emit('change');

    expect(api.importarHistoricoCustosComLog).toHaveBeenCalledTimes(1);
    const [payload, options] = api.importarHistoricoCustosComLog.mock.calls[0];

    // Apenas a linha válida entra; código em notação científica é normalizado (1.5e2 → 150).
    expect(payload).toEqual([
      {
        codigo_produto: '150',
        descricao: 'Item A',
        custo_variavel: 1.5,
        custo_direto_fixo: 2,
        custo_total: 3.5,
        data_referencia: '2026-03-01'
      }
    ]);
    // Contrato temporal: a competência escolhida acompanha o payload e as options.
    expect(options).toEqual({ dataReferencia: '2026-03-01' });
    expect(state.importMapping).toEqual(MAPPING);
    // Após importar, os filtros são recarregados.
    expect(fetchMetadata).toHaveBeenCalledTimes(1);
  });

  it('bloqueia a importação sem data de referência (competência)', async () => {
    const { dom, fetchMetadata } = setup({ refDate: '' });

    await dom.fileInput.emit('change');

    expect(api.importarHistoricoCustosComLog).not.toHaveBeenCalled();
    expect(fetchMetadata).not.toHaveBeenCalled();
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('warning', ...)
  });
});
