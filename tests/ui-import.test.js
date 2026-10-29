import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): não exporta internos nem toca no runtime.
// O módulo api é mockado (cliente Supabase real do CDN nunca é carregado).
vi.mock('../src/services/api.js', () => ({
  api: { importarHistoricoCustosComLog: vi.fn(), getProductMaster: vi.fn() }
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
  const onViewProducts = vi.fn(async () => {});
  const executeOperationalBoundary = async (_op, action) => action();

  const { bindUpload } = createImportController({ dom, state, executeOperationalBoundary, fetchMetadata, onViewProducts });
  bindUpload();
  return { dom, state, fetchMetadata, fileInput, onViewProducts };
}

describe('createImportController — fluxo de importação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProductMaster.mockResolvedValue({ data: { produtos: [] }, error: null });
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

  it('exibe a identidade confirmada do log e o limite explícito de associação dos fatos', async () => {
    api.importarHistoricoCustosComLog.mockResolvedValue({ error: null, data: {
      batchId: '41', log_id: 41, rastreabilidade: { persistencia_fatos: false },
      resumo: { total_linhas: 1, linhas_importadas: 1, linhas_erro: 0 }
    } });
    const { dom } = setup({ refDate: '2026-03-01' });
    await dom.fileInput.emit('change');
    const result = global.Swal.fire.mock.calls.find(([opts]) => opts.title === '1 itens importados com sucesso')[0];
    expect(result.html).toContain('Execução no log:</b> 41');
    expect(result.html).toContain('associação individual dos registros ao lote ainda não está disponível');
  });

  it('resposta sem lote não inventa identidade a partir da competência', async () => {
    const { dom } = setup({ refDate: '2026-03-01' });
    await dom.fileInput.emit('change');
    const result = global.Swal.fire.mock.calls.find(([opts]) => opts.title === '1 itens importados com sucesso')[0];
    expect(result.html).toContain('Identidade de lote não disponível');
    expect(result.html).not.toContain('Execução no log:</b> 2026-03-01');
  });

  it.each(['confirmada', 'parcial_ou_nao_confirmada'])('exibe a confirmação de proveniência %s sem inventar associação', async confirmacao => {
    api.importarHistoricoCustosComLog.mockResolvedValue({ error: null, data: {
      batchId: '41', rastreabilidade: { persistencia_fatos: true, confirmacao_fatos: confirmacao },
      resumo: { total_linhas: 1, linhas_importadas: 1, linhas_erro: 0 }
    } });
    const { dom } = setup();
    await dom.fileInput.emit('change');
    const result = global.Swal.fire.mock.calls.find(([opts]) => opts.title === '1 itens importados com sucesso')[0];
    expect(result.html).toContain(confirmacao === 'confirmada' ? 'confirmado nos chunks gravados' : 'confirmação parcial ou pendente');
    expect(result.html).not.toContain('associação individual dos registros ao lote ainda não está disponível');
  });

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

  it('zero pendências: cadastro completo prevalece sobre a lista de produtos com Custos do state', async () => {
    api.getProductMaster.mockResolvedValue({ data: { produtos: [{ codigo_produto: '150', descricao: 'Cadastro', familia_id: null }] }, error: null });
    const { dom, onViewProducts } = setup();
    await dom.fileInput.emit('change');
    const preview = global.Swal.fire.mock.calls.map(([opts]) => opts).find(opts => opts.title === 'Preview da importação');
    const result = global.Swal.fire.mock.calls.map(([opts]) => opts).find(opts => opts.title === '1 itens importados com sucesso');
    expect(preview.html).not.toContain('sem cadastro');
    expect(result.html).not.toContain('sem cadastro');
    expect(result.confirmButtonText).toBe('OK');
    expect(onViewProducts).not.toHaveBeenCalled();
    expect(api.getProductMaster).toHaveBeenCalledOnce();
  });

  it('um pendente: conserva código normalizado e descrição do arquivo no preview e resultado', async () => {
    const { dom } = setup();
    await dom.fileInput.emit('change');
    const calls = global.Swal.fire.mock.calls.map(([opts]) => opts);
    const preview = calls.find(opts => opts.title === 'Preview da importação');
    const result = calls.find(opts => opts.title === '1 itens importados com sucesso');
    for (const modal of [preview, result]) {
      expect(modal.html).toContain('1 produto sem cadastro');
      expect(modal.html).toContain('<td>150</td><td>Item A</td>');
      expect(modal.html).toContain('Identificados antes do envio');
    }
    expect(result.confirmButtonText).toBe('Ver produtos no Cadastro');
  });

  it('lista única é exatamente o conjunto sinalizado nas linhas, inclui ausência de descrição e não usa rótulo do cadastro', async () => {
    global.XLSX.utils.sheet_to_json = () => [WORKBOOK_MATRIX[0],
      ['150', 'Cadastrado no arquivo', 1, 2, 3], ['200', '  Descrição original  ', 1, 2, 3],
      ['200', 'Segunda ocorrência', 1, 2, 3], ['300', '', 1, 2, 3], ['400', '<img src=x onerror=alert(1)>', 1, 2, 3]
    ];
    api.getProductMaster.mockResolvedValue({ data: { produtos: [{ codigo_produto: '150', descricao: 'Rótulo diferente' }] }, error: null });
    const { dom, onViewProducts } = setup();
    const fire = global.Swal.fire;
    fire.mockImplementation(async opts => {
      if (opts.title === 'Confirmar mapeamento de colunas') return { isConfirmed: true, value: MAPPING };
      return { isConfirmed: true };
    });
    await dom.fileInput.emit('change');
    const calls = fire.mock.calls.map(([opts]) => opts);
    const preview = calls.find(opts => opts.title === 'Preview da importação');
    const result = calls.find(opts => opts.confirmButtonText === 'Ver produtos no Cadastro');
    const pending = onViewProducts.mock.calls[0][0];
    expect(pending).toEqual([
      { codigo_produto: '200', descricao: '  Descrição original  ' },
      { codigo_produto: '300', descricao: null },
      { codigo_produto: '400', descricao: '<img src=x onerror=alert(1)>' }
    ]);
    const warningCodes = [...preview.html.matchAll(/<tr>\s*<td>\d+<\/td>\s*<td>([^<]+)<\/td>[\s\S]*?<\/tr>/g)]
      .filter(([html]) => html.includes('Produto não encontrado no cadastro')).map(([, code]) => code);
    expect([...new Set(warningCodes)]).toEqual(pending.map(p => p.codigo_produto));
    for (const modal of [preview, result]) {
      const section = modal.html.match(/<section aria-label="Produtos sem cadastro[\s\S]*?<\/section>/)[0];
      expect(section).toContain('3 produtos sem cadastro');
      expect(section.match(/<td>200<\/td>/g)).toHaveLength(1);
      expect(section).not.toContain('<td>150</td>');
      expect(section).toContain('Descrição não informada no arquivo');
      expect(section).toContain('  Descrição original  ');
      expect(section).not.toContain('<img');
      expect(section).toContain('&lt;img');
      expect([...section.matchAll(/<tr><td>([^<]+)<\/td>/g)].map(([, code]) => code)).toEqual(pending.map(p => p.codigo_produto));
    }
    // Descrição vazia continua sendo erro de linha: não muda o contrato de persistência.
    expect(api.importarHistoricoCustosComLog.mock.calls[0][0].some(p => p.codigo_produto === '300')).toBe(false);
    expect(api.getProductMaster).toHaveBeenCalledOnce();
  });

  it('fechar resumo não navega e erro de leitura do cadastro impede validação falsa/importação', async () => {
    const { dom, onViewProducts } = setup();
    await dom.fileInput.emit('change');
    expect(onViewProducts).not.toHaveBeenCalled();
    api.importarHistoricoCustosComLog.mockClear();
    api.getProductMaster.mockResolvedValue({ data: null, error: new Error('Cadastro indisponível') });
    await expect(dom.fileInput.emit('change')).rejects.toThrow('Cadastro indisponível');
    expect(api.importarHistoricoCustosComLog).not.toHaveBeenCalled();
    expect(dom.dropZone.classList.contains('processing')).toBe(false);
  });
});
