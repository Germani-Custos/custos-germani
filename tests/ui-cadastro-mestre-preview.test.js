import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arquivoCadastro, contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';

vi.mock('../src/services/api.js', () => ({ api: {
  getProductMaster: vi.fn(), getCadastroMestrePreviewContext: vi.fn(),
  importProductMasterXlsm: vi.fn(() => { throw new Error('Importador legado proibido'); }),
  upsertProductMaster: vi.fn(() => { throw new Error('Escrita proibida'); })
} }));
import { api } from '../src/services/api.js';
import { createProductMasterController } from '../view/ui-product-master.js';

function element(extra = {}) {
  const listeners = {};
  return { value: '', innerHTML: '', textContent: '', disabled: false,
    classList: { add: vi.fn(), remove: vi.fn() }, replaceChildren: vi.fn(), click: vi.fn(),
    addEventListener: (event, fn) => { listeners[event] = fn; },
    emit: async (event, target) => listeners[event]?.({ target }), ...extra };
}

function setup(file = arquivoCadastro()) {
  const dom = Object.fromEntries(['masterSearch', 'masterOrigemFilter', 'masterFamiliaFilter', 'masterNewBtn',
    'masterImportBtn', 'masterImportInput', 'masterMissingCount', 'masterCancelBtn', 'masterForm', 'masterTableBody']
    .map(key => [key, element()]));
  dom.masterImportInput.files = file ? [file] : [];
  const errors = [];
  const onChanged = vi.fn();
  const executeOperationalBoundary = vi.fn(async (_operation, action) => {
    try { await action(); } catch (error) { errors.push(error); }
  });
  const controller = createProductMasterController({ dom, executeOperationalBoundary, onChanged });
  return { dom, controller, errors, onChanged, executeOperationalBoundary };
}

let container;
let download;
function abrirModal(options) {
  const selects = [...options.html.matchAll(/data-master-operation="([^"]+)"/g)].map(m => ({ dataset: { masterOperation: m[1] }, value: '' }));
  const counter = { textContent: '' };
  container = element({ querySelector: () => counter, querySelectorAll: () => selects, counter, selects });
  options.didOpen();
}
const target = data => ({ closest: () => data });

describe('Cadastro — seleção → adapter real → Preview/aprovação local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('XLSX', SheetJS);
    download = { click: vi.fn() };
    vi.stubGlobal('document', { createElement: tag => tag === 'a' ? download : {} });
    vi.stubGlobal('Swal', { getHtmlContainer: () => container, fire: vi.fn(async options => {
      abrirModal(options);
      return { isConfirmed: false };
    }) });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:revisao-local');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Rede proibida'); });
    api.getProductMaster.mockResolvedValue({ data: { produtos: [], origens: [], familias: [], agrupamentos: [], ausentes: [] }, error: null });
    api.getCadastroMestrePreviewContext.mockResolvedValue({ data: contexto, error: null });
  });
  afterEach(() => {
    expect(api.importProductMasterXlsm).not.toHaveBeenCalled();
    expect(api.upsertProductMaster).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('seletor HTML aceita os três formatos e o botão abre a seleção', async () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const accept = html.match(/id="master-import-input"[^>]*accept="([^"]+)"/)[1].split(',');
    for (const extension of ['.xls', '.xlsx', '.xlsm']) expect(accept).toContain(extension);
    const { dom, controller } = setup(null);
    await controller.bind();
    await dom.masterImportBtn.emit('click');
    expect(dom.masterImportInput.click).toHaveBeenCalledOnce();
    await dom.masterImportInput.emit('change');
    expect(api.getCadastroMestrePreviewContext).not.toHaveBeenCalled();
  });

  it.each(['xls', 'xlsx', 'xlsm'])('%s chega ao modal com contagens, valores ERP e preservações', async formato => {
    const { dom, controller, errors, onChanged } = setup(arquivoCadastro(formato));
    await controller.bind();
    await dom.masterImportInput.emit('change');
    expect(errors).toEqual([]);
    expect(api.getCadastroMestrePreviewContext).toHaveBeenCalledOnce();
    const options = Swal.fire.mock.calls[0][0];
    expect(options.title).toBe('Preview do Cadastro Mestre');
    for (const [label, total] of [['Linhas lidas', 8], ['Linhas após filtros', 4], ['Linhas excluídas', 4],
      ['Produtos válidos', 4], ['Existentes', 3], ['Novos', 1], ['Produtos com alterações', 1],
      ['Produtos a remover do Cadastro Mestre', 5], ['Cadastro Mestre após reconstrução', 4], ['Campos preservados', 4]]) {
      expect(options.html).toContain(`<td>${label}</td><td>${total}</td>`);
    }
    expect(options.html).toContain('P801');
    expect(options.html).toContain('Preservar descrição');
    expect(options.html).toContain('009');
    expect(container.counter.textContent).toBe('Pendente: 8 · Aprovado: 0 · Rejeitado: 0');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(api.getProductMaster).toHaveBeenCalledOnce();
    expect(dom.masterImportInput.value).toBe('');
    expect(dom.masterImportInput.disabled).toBe(false);
    expect(dom.masterImportBtn.disabled).toBe(false);
  });

  it('aprova somente descrição por campo e baixa decisões locais', async () => {
    Swal.fire.mockImplementation(async options => {
      abrirModal(options);
      const select = container.selects.find(s => s.dataset.masterOperation.startsWith('ATUALIZAR_DESCRICAO'));
      select.value = 'APROVADO';
      await container.emit('change', target(select));
      expect(container.counter.textContent).toContain('Aprovado: 1');
      return { isConfirmed: true };
    });
    const { dom, controller } = setup();
    await controller.bind();
    await dom.masterImportInput.emit('change');
    const blob = URL.createObjectURL.mock.calls[0][0];
    const output = JSON.parse(await blob.text());
    expect(output.aprovado.execucao_permitida).toBe(false);
    expect(output.aprovado.operacoes.map(o => o.dados)).toEqual([{ descricao: 'Descrição atualizada çã' }]);
    expect(output.revisao.decisoes.filter(d => d.status === 'PENDENTE')).toHaveLength(7);
    expect(download.click).toHaveBeenCalledOnce();
    expect(download.download).toBe('revisao_cadastro.xls.json');
  });

  it('ações globais usam o motor de aprovação e cancelamento não baixa/grava', async () => {
    Swal.fire.mockImplementation(async options => {
      abrirModal(options);
      for (const status of ['APROVADO', 'REJEITADO', 'PENDENTE']) {
        await container.emit('click', target({ dataset: { masterDecision: status } }));
        expect(container.counter.textContent).toContain(`${{ APROVADO: 'Aprovado', REJEITADO: 'Rejeitado', PENDENTE: 'Pendente' }[status]}: 8`);
        expect(container.selects.every(s => s.value === status)).toBe(true);
      }
      return { isConfirmed: false };
    });
    const { dom, controller } = setup();
    await controller.bind();
    await dom.masterImportInput.emit('change');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('falha de SELECT não simula Master vazio e libera o seletor', async () => {
    api.getCadastroMestrePreviewContext.mockResolvedValue({ data: null, error: new Error('Sem acesso ao Master') });
    const { dom, controller, errors } = setup();
    await controller.bind();
    await dom.masterImportInput.emit('change');
    expect(errors[0].message).toBe('Sem acesso ao Master');
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(dom.masterImportBtn.disabled).toBe(false);
    expect(dom.masterImportInput.value).toBe('');
  });

  it.each(['cadastro.csv', 'cadastro.xls'])('rejeita extensão inválida ou bytes inválidos (%s) sem importação', async name => {
    const { dom, controller, errors } = setup({ name, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    await controller.bind();
    await dom.masterImportInput.emit('change');
    expect(errors).toHaveLength(1);
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(dom.masterImportInput.disabled).toBe(false);
  });

  it('novo arquivo reinicia decisões e valores do Preview', async () => {
    Swal.fire.mockImplementation(async options => {
      abrirModal(options);
      expect(container.counter.textContent).toContain('Aprovado: 0');
      await container.emit('click', target({ dataset: { masterDecision: 'APROVADO' } }));
      return { isConfirmed: false };
    });
    const { dom, controller } = setup();
    await controller.bind();
    await dom.masterImportInput.emit('change');
    dom.masterImportInput.files = [arquivoCadastro('xlsx')];
    await dom.masterImportInput.emit('change');
    expect(Swal.fire).toHaveBeenCalledTimes(2);
    expect(api.getCadastroMestrePreviewContext).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('reconstrução propõe atualizar origem ERP preenchida, sem criar classificação operacional', async () => {
    const ctx = JSON.parse(JSON.stringify(contexto));
    ctx.produtos[0].origem_cod = '99';
    api.getCadastroMestrePreviewContext.mockResolvedValue({ data: ctx, error: null });
    Swal.fire.mockImplementation(async options => {
      abrirModal(options);
      expect(options.html).toContain('Atualizar origem ERP');
      await container.emit('click', target({ dataset: { masterDecision: 'APROVADO' } }));
      expect(container.counter.textContent).toBe('Pendente: 0 · Aprovado: 9 · Rejeitado: 0');
      return { isConfirmed: true };
    });
    const { dom, controller, errors } = setup();
    await controller.bind();
    await dom.masterImportInput.emit('change');
    expect(errors).toEqual([]);
    const output = JSON.parse(await URL.createObjectURL.mock.calls[0][0].text());
    expect(output.aprovado.operacoes.find(o => o.categoria === 'ATUALIZAR_ORIGEM_ERP').dados).toEqual({ origem_cod: '01' });
  });

  it('impede processamento concorrente enquanto um Preview estiver aberto', async () => {
    let fechar;
    Swal.fire.mockImplementation(async options => {
      abrirModal(options);
      return new Promise(resolve => { fechar = resolve; });
    });
    const { dom, controller } = setup();
    await controller.bind();
    const primeiro = dom.masterImportInput.emit('change');
    await vi.waitFor(() => expect(fechar).toBeTypeOf('function'));
    expect(dom.masterImportBtn.disabled).toBe(true);
    await dom.masterImportInput.emit('change');
    expect(api.getCadastroMestrePreviewContext).toHaveBeenCalledOnce();
    fechar({ isConfirmed: false });
    await primeiro;
    expect(dom.masterImportBtn.disabled).toBe(false);
  });

  it('escapa nome e conteúdo ERP antes de montar o modal', async () => {
    const ctx = JSON.parse(JSON.stringify(contexto));
    ctx.produtos[1].descricao = '<img src=x onerror=alert(1)>';
    api.getCadastroMestrePreviewContext.mockResolvedValue({ data: ctx, error: null });
    const file = arquivoCadastro();
    file.name = '<script>alert(1)</script>.xls';
    const { dom, controller } = setup(file);
    await controller.bind();
    await dom.masterImportInput.emit('change');
    const html = Swal.fire.mock.calls[0][0].html;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
