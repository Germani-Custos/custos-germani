import { createCadastroMestrePreviewController } from './ui-cadastro-mestre-preview.js';
import { createCadastroMestreErpController } from './ui-cadastro-mestre-erp.js';
import { api } from '../src/services/api.js';
import { escapeHtml, fillSelect, showToast } from './ui-utils.js';

const TODOS = 'TODOS';

export function createProductMasterController({ dom, executeOperationalBoundary, onChanged }) {
  let cadastro = { produtos: [], origens: [], familias: [], agrupamentos: [], ausentes: [] };
  let importPending = [];
  const erp = dom.erpTableBody ? createCadastroMestreErpController({ dom, executeOperationalBoundary }) : null;

  function selecionarVisao(visao) {
    const mestre = visao === 'erp';
    if (dom.masterOperationalPanel) dom.masterOperationalPanel.classList[mestre ? 'add' : 'remove']('hidden');
    if (dom.erpPanel) dom.erpPanel.classList[mestre ? 'remove' : 'add']('hidden');
    dom.masterOperationalTab?.setAttribute('aria-pressed', String(!mestre));
    dom.erpTab?.setAttribute('aria-pressed', String(mestre));
  }

  function labelById(rows, id) { return rows.find(row => String(row.id) === String(id))?.descricao || '-'; }
  function status(produto) { return produto.origem_id && produto.familia_id ? 'Classificado' : 'Produto sem classificação'; }

  function render() {
    const term = String(dom.masterSearch?.value || '').trim().toLocaleLowerCase('pt-BR');
    const origem = dom.masterOrigemFilter?.value || TODOS;
    const familia = dom.masterFamiliaFilter?.value || TODOS;
    const rows = cadastro.produtos.filter(produto =>
      (!term || `${produto.codigo_produto} ${produto.descricao || ''}`.toLocaleLowerCase('pt-BR').includes(term)) &&
      (origem === TODOS || String(produto.origem_id) === origem) &&
      (familia === TODOS || String(produto.familia_id) === familia)
    );
    dom.masterMissingCount.textContent = String(cadastro.ausentes.length);
    if (dom.masterOperationalCount) dom.masterOperationalCount.textContent = cadastro.produtos.length.toLocaleString('pt-BR');
    dom.masterTableBody.innerHTML = rows.length ? rows.map(produto => `
      <tr><td>${escapeHtml(produto.codigo_produto)}</td><td>${escapeHtml(produto.descricao || '-')}</td>
      <td>${escapeHtml(labelById(cadastro.origens, produto.origem_id))}</td><td>${escapeHtml(labelById(cadastro.familias, produto.familia_id))}</td><td>${escapeHtml(produto.agrupamento_cod ? labelById(cadastro.agrupamentos, produto.agrupamento_cod) : 'Sem agrupamento')}</td>
      <td>${escapeHtml(status(produto))}</td><td><button class="btn-outline btn-sm" data-master-code="${escapeHtml(produto.codigo_produto)}">Editar</button></td></tr>`).join('') :
      '<tr><td colspan="7" style="text-align:center;padding:16px">Nenhum produto encontrado.</td></tr>';
  }

  function openEditor(codigo = '', descricao = '') {
    selecionarVisao('operacional');
    const produto = cadastro.produtos.find(item => item.codigo_produto === codigo) || {};
    dom.masterCode.value = produto.codigo_produto || codigo;
    dom.masterCode.disabled = Boolean(produto.codigo_produto);
    dom.masterDescription.value = produto.descricao || descricao || '';
    fillSelect(dom.masterOrigem, cadastro.origens.map(item => ({ value: item.id, label: item.descricao })), { value: '', label: 'Sem origem' }, produto.origem_id || '');
    fillSelect(dom.masterFamilia, cadastro.familias.map(item => ({ value: item.id, label: item.descricao })), { value: '', label: 'Sem família' }, produto.familia_id || '');
    fillSelect(dom.masterAgrupamento, cadastro.agrupamentos.map(item => ({ value: item.id, label: item.descricao })), { value: '', label: 'Sem agrupamento' }, produto.agrupamento_cod || '');
    dom.masterForm.classList.remove('hidden');
  }

  async function reload() {
    const { data, error } = await api.getProductMaster();
    if (error) throw error;
    cadastro = data;
    fillSelect(dom.masterOrigemFilter, cadastro.origens.map(item => ({ value: item.id, label: item.descricao })), { value: TODOS, label: 'Todas as origens' }, dom.masterOrigemFilter.value || TODOS);
    fillSelect(dom.masterFamiliaFilter, cadastro.familias.map(item => ({ value: item.id, label: item.descricao })), { value: TODOS, label: 'Todas as famílias' }, dom.masterFamiliaFilter.value || TODOS);
    render();
  }

  async function showImportPendingProducts(produtos) {
    await reload();
    importPending = produtos.map(item => ({ ...item }));
    selecionarVisao('operacional');
    dom.masterForm.classList.add('hidden');
    dom.masterImportPendingCount.textContent = String(importPending.length);
    dom.masterImportPendingBody.innerHTML = importPending.map(item => `<tr>
      <td>${escapeHtml(item.codigo_produto)}</td><td>${escapeHtml(item.descricao || 'Descrição não informada no arquivo')}</td>
      <td><button type="button" class="btn-outline btn-sm" data-import-pending-code="${escapeHtml(item.codigo_produto)}">Consultar / preparar cadastro</button></td></tr>`).join('');
    dom.masterImportPending.classList.remove('hidden');
  }

  function bind() {
    if (!dom.masterTableBody) return;
    dom.masterSearch.addEventListener('input', render);
    dom.masterOrigemFilter.addEventListener('change', render);
    dom.masterFamiliaFilter.addEventListener('change', render);
    dom.masterNewBtn.addEventListener('click', () => openEditor());
    dom.masterImportPendingClear?.addEventListener('click', () => {
      importPending = [];
      dom.masterImportPendingBody.replaceChildren();
      dom.masterImportPendingCount.textContent = '0';
      dom.masterImportPending.classList.add('hidden');
    });
    dom.masterImportPendingBody?.addEventListener('click', event => {
      const codigo = event.target.closest('[data-import-pending-code]')?.dataset.importPendingCode;
      const produto = importPending.find(item => item.codigo_produto === codigo);
      if (produto) openEditor(produto.codigo_produto, produto.descricao);
    });
    createCadastroMestrePreviewController({ dom, executeOperationalBoundary }).bind();
    dom.masterOperationalTab?.addEventListener('click', () => selecionarVisao('operacional'));
    dom.erpTab?.addEventListener('click', () => selecionarVisao('erp'));
    selecionarVisao('operacional');
    dom.masterCancelBtn.addEventListener('click', () => dom.masterForm.classList.add('hidden'));
    dom.masterTableBody.addEventListener('click', event => { const code = event.target.closest('[data-master-code]')?.dataset.masterCode; if (code) openEditor(code); });
    dom.masterForm.addEventListener('submit', event => executeOperationalBoundary('salvar cadastro mestre de produto', async () => {
      event.preventDefault();
      const { error } = await api.upsertProductMaster({ codigo_produto: dom.masterCode.value, descricao: dom.masterDescription.value, origem_id: dom.masterOrigem.value, familia_id: dom.masterFamilia.value, agrupamento_cod: dom.masterAgrupamento.value });
      if (error) throw error;
      await reload();
      dom.masterForm.classList.add('hidden');
      await onChanged?.();
      showToast('success', 'Cadastro mestre atualizado. Custos e OP passam a consultar esta classificação.');
    }, { message: 'Não foi possível salvar o cadastro mestre do produto.' }));
    return Promise.all([reload(), erp?.bind()]);
  }
  return { bind, reload, openEditor, showImportPendingProducts };
}
