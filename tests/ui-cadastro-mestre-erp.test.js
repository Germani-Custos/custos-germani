import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/api.js', () => ({ api: { getProductMaster: vi.fn(), getCadastroMestreErp: vi.fn(),
  getCadastroMestrePreviewContext: vi.fn(), executarReconstrucaoCadastroMestre: vi.fn(), upsertProductMaster: vi.fn(), importProductMasterXlsm: vi.fn() } }));
import { api } from '../src/services/api.js';
import { createProductMasterController } from '../view/ui-product-master.js';

function element() {
  const listeners = {};
  const classes = new Set();
  const attributes = {};
  return { value: '', textContent: '', innerHTML: '', disabled: false, files: [],
    classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
    setAttribute: (key, value) => { attributes[key] = value; }, getAttribute: key => attributes[key],
    replaceChildren: vi.fn(), click: vi.fn(),
    addEventListener: (event, fn) => { listeners[event] = fn; },
    emit: async (event, target = {}) => listeners[event]?.({ preventDefault() {}, target }) };
}

let master;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('document', { createElement: () => element() });
  master = { produtos: Array.from({ length: 123 }, (_, i) => ({ codigo_produto: String(i + 1).padStart(6, '0'), descricao: `Café ERP ${i + 1}`,
    origem_cod: i % 2 ? '02' : '01', familia_cod: i % 2 ? 'F2' : 'F1', agrupamento_erp_valor: 'P801', agrupamento_cod: 'M999' })),
  origens: [{ id: 'erp-id-1', codigo: '01', descricao: 'Produzido ERP' }, { id: 'erp-id-2', codigo: '02', descricao: 'Revenda ERP' }],
  familias: [{ id: 'erp-id-f1', codigo: 'F1', descricao: 'Café' }, { id: 'erp-id-f2', codigo: 'F2', descricao: 'Alimentos' }] };
  api.getCadastroMestreErp.mockImplementation(async () => ({ data: master, error: null }));
  api.getProductMaster.mockResolvedValue({ data: { produtos: [{ codigo_produto: 'OP001', descricao: 'Produto operacional', origem_id: 'op-id-1', familia_id: 'op-id-f1', agrupamento_cod: 'M005' }],
    origens: [{ id: 'op-id-1', descricao: 'Origem operacional' }], familias: [{ id: 'op-id-f1', descricao: 'Família operacional' }],
    agrupamentos: [{ id: 'M005', descricao: 'Grupo operacional' }], ausentes: [] }, error: null });
});
afterEach(() => {
  for (const method of ['executarReconstrucaoCadastroMestre', 'upsertProductMaster', 'importProductMasterXlsm', 'getCadastroMestrePreviewContext']) expect(api[method]).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

async function setup() {
  const keys = ['masterSearch', 'masterOrigemFilter', 'masterFamiliaFilter', 'masterMissingCount', 'masterTableBody', 'masterNewBtn',
    'masterImportBtn', 'masterImportInput', 'masterCancelBtn', 'masterForm', 'masterCode', 'masterDescription', 'masterOrigem', 'masterFamilia', 'masterAgrupamento',
    'masterOperationalTab', 'masterOperationalCount', 'masterOperationalPanel', 'erpTab', 'erpCount', 'erpPanel',
    'erpSearch', 'erpOrigemFilter', 'erpFamiliaFilter', 'erpSummary', 'erpTableBody', 'erpPreviousBtn', 'erpNextBtn', 'erpPageInfo', 'erpRefreshBtn',
    'masterImportPending', 'masterImportPendingCount', 'masterImportPendingBody', 'masterImportPendingClear'];
  const dom = Object.fromEntries(keys.map(key => [key, element()]));
  const errors = [];
  const executeOperationalBoundary = async (_operation, action) => { try { return await action(); } catch (error) { errors.push(error); } };
  const controller = createProductMasterController({ dom, executeOperationalBoundary, onChanged: vi.fn() });
  await controller.bind();
  return { dom, controller, errors };
}

describe('Cadastro em duas visões independentes', () => {
  it('recebe a lista da importação, mantém contexto completo e prepara cadastro sem salvar nem exigir redigitação', async () => {
    const { dom, controller } = await setup();
    await dom.erpTab.emit('click');
    dom.masterSearch.value = 'filtro anterior';
    const pendentes = [{ codigo_produto: '200', descricao: '<b>Do arquivo</b>' }, { codigo_produto: '300', descricao: null }];
    await controller.showImportPendingProducts(pendentes);
    expect(dom.masterImportPendingCount.textContent).toBe('2');
    expect(dom.masterImportPendingBody.innerHTML).toContain('<td>200</td><td>&lt;b&gt;Do arquivo&lt;/b&gt;</td>');
    expect(dom.masterImportPendingBody.innerHTML).toContain('Descrição não informada no arquivo');
    expect(dom.masterSearch.value).toBe('filtro anterior');
    expect(dom.erpPanel.classList.contains('hidden')).toBe(true);
    expect(api.getProductMaster).toHaveBeenCalledTimes(2);
    await dom.masterImportPendingBody.emit('click', { closest: () => ({ dataset: { importPendingCode: '200' } }) });
    expect(dom.masterCode.value).toBe('200');
    expect(dom.masterCode.disabled).toBe(false);
    expect(dom.masterDescription.value).toBe('<b>Do arquivo</b>');
    expect(dom.masterOrigem.value).toBe('');
    await dom.masterImportPendingBody.emit('click', { closest: () => ({ dataset: { importPendingCode: '300' } }) });
    expect(dom.masterCode.value).toBe('300');
    expect(dom.masterDescription.value).toBe('');
    await dom.masterImportPendingClear.emit('click');
    expect(dom.masterImportPending.classList.contains('hidden')).toBe(true);
    expect(dom.masterImportPendingCount.textContent).toBe('0');
  });

  it('consulta registro já criado usando descrição/categorias atuais, sem sobrescrever com a lista anterior ao envio', async () => {
    const { dom, controller } = await setup();
    await controller.showImportPendingProducts([{ codigo_produto: 'OP001', descricao: 'Descrição do arquivo antigo' }]);
    await dom.masterImportPendingBody.emit('click', { closest: () => ({ dataset: { importPendingCode: 'OP001' } }) });
    expect(dom.masterCode.value).toBe('OP001');
    expect(dom.masterCode.disabled).toBe(true);
    expect(dom.masterDescription.value).toBe('Produto operacional');
    expect(dom.masterOrigem.value).toBe('op-id-1');
  });

  it('CAD-COM-01 mostra código/descrição comerciais escapados e ausência sem substituir agrupamento operacional', async () => {
    master.produtos[0].agrupamento_comercial_erp_cod = 'C006';
    master.produtos[0].agrupamento_comercial_erp_descricao = '<b>BISCOITO ESPECIAL</b>';
    const { dom } = await setup();
    expect(dom.erpTableBody.innerHTML).toContain('<td>C006 — &lt;b&gt;BISCOITO ESPECIAL&lt;/b&gt;</td>');
    expect(dom.erpTableBody.innerHTML).toContain('Não informado');
    expect(dom.masterTableBody.innerHTML).toContain('Grupo operacional');
    expect(dom.masterTableBody.innerHTML).not.toContain('C006');
  });

  it('CAD-ERP-TABLE-01 reúne o comercial em uma célula e preserva campos parciais sem inferir valores', async () => {
    const comerciais = [
      ['C008', 'BISCOITO LAMINADO DOCE', 'C008 — BISCOITO LAMINADO DOCE'],
      ['C011', 'BISCOITO RECHEADO', 'C011 — BISCOITO RECHEADO'],
      [null, null, 'Não informado'],
      ['C008', null, 'C008'],
      [null, 'Descrição isolada', 'Descrição isolada'],
      [' ', ' ', 'Não informado']
    ];
    comerciais.forEach(([codigo, descricao], i) => {
      master.produtos[i].agrupamento_comercial_erp_cod = codigo;
      master.produtos[i].agrupamento_comercial_erp_descricao = descricao;
    });
    const anterior = JSON.parse(JSON.stringify(master));
    const { dom } = await setup();
    const linhas = [...dom.erpTableBody.innerHTML.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
    expect(linhas).toHaveLength(50);
    linhas.forEach(([, linha]) => expect(linha.match(/<td>/g)).toHaveLength(5));
    comerciais.forEach(([, , esperado], i) => expect(linhas[i][1]).toContain(`<td>${esperado}</td>`));
    expect(master).toEqual(anterior);
    expect(dom.erpTableBody.innerHTML).not.toContain('P801');
  });

  it('rotula as duas fontes com totais dinâmicos e exibe somente campos ERP no painel de consulta', async () => {
    const { dom, errors } = await setup();
    expect(errors).toEqual([]);
    expect(dom.masterOperationalCount.textContent).toBe('1');
    expect(dom.erpCount.textContent).toBe('123');
    expect(dom.masterTableBody.innerHTML).toContain('Produto operacional');
    expect(dom.masterTableBody.innerHTML).not.toContain('Café ERP');
    expect(dom.erpTableBody.innerHTML).toContain('Café ERP');
    expect(dom.erpTableBody.innerHTML).not.toContain('<td>P801</td>');
    expect(dom.erpTableBody.innerHTML).toContain('01 — Produzido ERP');
    expect(dom.erpTableBody.innerHTML).toContain('F1 — Café');
    expect(dom.erpTableBody.innerHTML).not.toMatch(/M999|M005|Grupo operacional|Produto operacional|<button|Editar/);
    expect(dom.erpPanel.classList.contains('hidden')).toBe(true);
    await dom.erpTab.emit('click');
    expect(dom.erpPanel.classList.contains('hidden')).toBe(false);
    expect(dom.masterOperationalPanel.classList.contains('hidden')).toBe(true);
    expect(dom.erpTab.getAttribute('aria-pressed')).toBe('true');
    expect(dom.masterOperationalTab.getAttribute('aria-pressed')).toBe('false');
  });

  it('paginação visual mostra 50/50/23 registros, busca reinicia página e contagem considera todos', async () => {
    const { dom } = await setup();
    expect(dom.erpTableBody.innerHTML.match(/<tr>/g)).toHaveLength(50);
    expect(dom.erpPageInfo.textContent).toBe('1–50 de 123 · Página 1 de 3');
    expect(dom.erpPreviousBtn.disabled).toBe(true);
    await dom.erpNextBtn.emit('click');
    expect(dom.erpPageInfo.textContent).toBe('51–100 de 123 · Página 2 de 3');
    await dom.erpNextBtn.emit('click');
    expect(dom.erpTableBody.innerHTML.match(/<tr>/g)).toHaveLength(23);
    expect(dom.erpNextBtn.disabled).toBe(true);
    dom.erpSearch.value = '000123'; await dom.erpSearch.emit('input');
    expect(dom.erpSummary.textContent).toContain('1 registro(s) encontrado(s) de 123');
    expect(dom.erpPageInfo.textContent).toBe('1–1 de 1 · Página 1 de 1');
    expect(dom.erpTableBody.innerHTML).toContain('Café ERP 123');
    dom.erpSearch.value = 'não existe'; await dom.erpSearch.emit('input');
    expect(dom.erpSummary.textContent).toContain('0 registro(s)');
    expect(dom.erpPageInfo.textContent).toBe('0–0 de 0 · Página 1 de 1');
    expect(dom.erpTableBody.innerHTML).toContain('Nenhum produto encontrado no Master ERP');
    expect(dom.erpTableBody.innerHTML).toContain('colspan="5"');
    expect(api.getCadastroMestreErp).toHaveBeenCalledOnce();
  });

  it('troca de visões preserva buscas, filtros e página separados, sem reler ou mesclar fontes', async () => {
    const { dom } = await setup();
    dom.masterSearch.value = 'operacional'; await dom.masterSearch.emit('input');
    dom.masterOrigemFilter.value = 'op-id-1'; await dom.masterOrigemFilter.emit('change');
    await dom.erpTab.emit('click');
    dom.erpSearch.value = 'CAFE'; await dom.erpSearch.emit('input');
    dom.erpOrigemFilter.value = '01'; await dom.erpOrigemFilter.emit('change');
    dom.erpFamiliaFilter.value = 'F1'; await dom.erpFamiliaFilter.emit('change');
    expect(dom.erpSummary.textContent).toContain('62 registro(s)');
    await dom.erpNextBtn.emit('click');
    const html = dom.erpTableBody.innerHTML;
    await dom.masterOperationalTab.emit('click');
    expect(dom.masterSearch.value).toBe('operacional');
    expect(dom.masterOrigemFilter.value).toBe('op-id-1');
    expect(dom.masterTableBody.innerHTML).toContain('Produto operacional');
    await dom.erpTab.emit('click');
    expect(dom.erpSearch.value).toBe('CAFE');
    expect(dom.erpOrigemFilter.value).toBe('01');
    expect(dom.erpFamiliaFilter.value).toBe('F1');
    expect(dom.erpTableBody.innerHTML).toBe(html);
    expect(dom.erpPageInfo.textContent).toContain('Página 2 de 2');
    expect(api.getCadastroMestreErp).toHaveBeenCalledOnce();
    expect(api.getProductMaster).toHaveBeenCalledOnce();
  });

  it('editor acionado pelo runtime retorna ao operacional, sem editar o Master ERP', async () => {
    const { dom, controller } = await setup();
    await dom.erpTab.emit('click');
    controller.openEditor('OP001');
    expect(dom.erpPanel.classList.contains('hidden')).toBe(true);
    expect(dom.masterOperationalPanel.classList.contains('hidden')).toBe(false);
    expect(dom.masterCode.value).toBe('OP001');
    expect(dom.masterDescription.value).toBe('Produto operacional');
  });

  it('erro ERP não vira zero nem apaga a tabela operacional; atualizar consulta permite recuperação', async () => {
    api.getCadastroMestreErp.mockResolvedValueOnce({ data: null, error: new Error('Sem acesso ao ERP') });
    const { dom, errors } = await setup();
    expect(errors).toHaveLength(1);
    expect(dom.erpCount.textContent).toBe('indisponível');
    expect(dom.erpSummary.textContent).toContain('Não foi possível carregar');
    expect(dom.masterTableBody.innerHTML).toContain('Produto operacional');
    expect(dom.erpNextBtn.disabled).toBe(true);
    await dom.erpRefreshBtn.emit('click');
    expect(dom.erpCount.textContent).toBe('123');
    expect(dom.erpSummary.textContent).toContain('123 registro(s)');
    expect(api.getProductMaster).toHaveBeenCalledOnce();
  });

  it('valores ERP são escapados antes de HTML', async () => {
    master.produtos[0].descricao = '<img src=x onerror=alert(1)>';
    master.produtos[0].agrupamento_comercial_erp_cod = '<script>teste</script>';
    master.produtos[0].agrupamento_comercial_erp_descricao = '<b>Comercial</b>';
    const { dom } = await setup();
    expect(dom.erpTableBody.innerHTML).toContain('&lt;img');
    expect(dom.erpTableBody.innerHTML).toContain('&lt;script&gt;');
    expect(dom.erpTableBody.innerHTML).toContain('&lt;b&gt;Comercial&lt;/b&gt;');
    expect(dom.erpTableBody.innerHTML).not.toMatch(/<img|<script|<b>/);
  });

  it('HTML mantém Preview comum e cadastro/classificação apenas no painel operacional', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const erp = html.slice(html.indexOf('<div id="master-erp-panel"'), html.indexOf('<!-- ===== VIEW: DOCUMENTAÇÃO'));
    expect(html).toContain('Cadastro Operacional —');
    expect(html).toContain('Cadastro Mestre ERP —');
    expect(html.match(/id="master-import-btn"/g)).toHaveLength(1);
    expect(html.indexOf('id="master-import-btn"')).toBeLessThan(html.indexOf('id="master-operational-panel"'));
    expect([...erp.matchAll(/<th>(.*?)<\/th>/g)].map(([, label]) => label)).toEqual([
      'Código', 'Descrição', 'Origem', 'Família', 'Agrupamento comercial'
    ]);
    expect(erp).not.toMatch(/Agrup\. Prod\. \(ERP\)|Agrup\. Com\. \(ERP\)|Descrição \(Agrup\. Com\.\)/);
    expect(erp).not.toMatch(/<form|master-new-btn|master-form|Salvar classificação|Excluir|Sincronizar/);
  });
});
