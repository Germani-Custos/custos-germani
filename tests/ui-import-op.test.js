import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): api e parser mockados — sem runtime real.
vi.mock('../src/services/api.js', () => ({
  api: { importarApontamentosOp: vi.fn() }
}));
vi.mock('../core/spreadsheet-engine.js', () => ({
  parseMCAP105: vi.fn(() => ({ rows: [], errors: [] }))
}));

import { createImportOpController } from '../view/ui-import-op.js';
import { api } from '../src/services/api.js';
import { parseMCAP105 } from '../core/spreadsheet-engine.js';

function fakeEl(extra = {}) {
  const listeners = {};
  return {
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    async emit(ev, arg) { for (const fn of (listeners[ev] || [])) await fn(arg); },
    classList: { add() {}, remove() {} },
    ...extra
  };
}

function setup(file) {
  const input = fakeEl({ files: [file], value: '', click: vi.fn() });
  const dom = { importOpInput: input, dropZoneOp: fakeEl() };
  const executeOperationalBoundary = async (_op, action) => action();
  const { bindUpload } = createImportOpController({ dom, executeOperationalBoundary });
  bindUpload();
  return { input };
}

describe('createImportOpController — validação de extensão (case-insensitive)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // FileReader mínimo: resolve o conteúdo lido para lerArquivoLatin1.
    global.FileReader = class {
      readAsText() { this.result = 'conteudo'; this.onload?.(); }
    };
    global.Swal = { fire: vi.fn().mockResolvedValue({ isConfirmed: false }) };
  });

  afterEach(() => { delete global.FileReader; delete global.Swal; });

  it('recusa arquivo sem extensão .csv sem tentar parsear', async () => {
    const { input } = setup({ name: 'relatorio.txt' });
    await input.emit('change');
    expect(parseMCAP105).not.toHaveBeenCalled();
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('warning', ...)
  });



  it('envia linhas válidas com a competência selecionada para a API', async () => {
    const rows = [{ origem: 425, op: 738, cod_produto: '1001056', descricao: 'Produto A', estagio: 'BISCOITO' }];
    parseMCAP105.mockReturnValue({ rows, errors: [] });
    api.importarApontamentosOp.mockResolvedValue({ data: { inseridos: 1, erros: [], logId: 10 }, error: null });
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });

    const { input } = setup({ name: 'MCAP105.CSV' });
    await input.emit('change');

    expect(api.importarApontamentosOp).toHaveBeenCalledWith({
      rows,
      dataReferencia: '2026-07-01',
      arquivoNome: 'MCAP105.CSV'
    });
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
  });

  it('aceita extensão em maiúsculas (.CSV) e segue para o parse', async () => {
    const { input } = setup({ name: 'RELATORIO.CSV' });
    await input.emit('change');
    // O gate de extensão passou: o parser foi chamado com o conteúdo lido.
    expect(parseMCAP105).toHaveBeenCalledWith('conteudo');
  });
});
