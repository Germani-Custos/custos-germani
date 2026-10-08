import { createCadastroMestrePreviewController } from './ui-cadastro-mestre-preview.js';
import { api } from '../src/services/api.js';
import { escapeHtml, fillSelect, showToast } from './ui-utils.js';

const TODOS = 'TODOS';

export function createProductMasterController({ dom, executeOperationalBoundary, onChanged }) {
  let cadastro = { produtos: [], origens: [], familias: [], agrupamentos: [], ausentes: [] };

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
    dom.masterTableBody.innerHTML = rows.length ? rows.map(produto => `
      <tr><td>${escapeHtml(produto.codigo_produto)}</td><td>${escapeHtml(produto.descricao || '-')}</td>
      <td>${escapeHtml(labelById(cadastro.origens, produto.origem_id))}</td><td>${escapeHtml(labelById(cadastro.familias, produto.familia_id))}</td><td>${escapeHtml(produto.agrupamento_cod ? labelById(cadastro.agrupamentos, produto.agrupamento_cod) : 'Sem agrupamento')}</td>
      <td>${escapeHtml(status(produto))}</td><td><button class="btn-outline btn-sm" data-master-code="${escapeHtml(produto.codigo_produto)}">Editar</button></td></tr>`).join('') :
      '<tr><td colspan="7" style="text-align:center;padding:16px">Nenhum produto encontrado.</td></tr>';
  }

  function openEditor(codigo = '', descricao = '') {
    const produto = cadastro.produtos.find(item => item.codigo_produto === codigo) || {};
    dom.masterCode.value = produto.codigo_produto || '';
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

  function bind() {
    if (!dom.masterTableBody) return;
    dom.masterSearch.addEventListener('input', render);
    dom.masterOrigemFilter.addEventListener('change', render);
    dom.masterFamiliaFilter.addEventListener('change', render);
    dom.masterNewBtn.addEventListener('click', () => openEditor());
    createCadastroMestrePreviewController({ dom, executeOperationalBoundary }).bind();
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
    return reload();
  }
  return { bind, reload, openEditor };
}
