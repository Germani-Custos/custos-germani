import { api } from '../src/services/api.js';
import { prepararConsultaCadastroMestreErp, consultarCadastroMestreErp } from '../core/cadastro-mestre-erp-engine.js';
import { escapeHtml, fillSelect } from './ui-utils.js';

export function createCadastroMestreErpController({ dom, executeOperationalBoundary }) {
  let dados = null;
  let pagina = 1;

  function render() {
    if (!dados) return;
    const resultado = consultarCadastroMestreErp(dados.produtos, { busca: dom.erpSearch.value,
      origem: dom.erpOrigemFilter.value, familia: dom.erpFamiliaFilter.value }, pagina);
    pagina = resultado.pagina;
    dom.erpCount.textContent = dados.produtos.length.toLocaleString('pt-BR');
    dom.erpSummary.textContent = `${resultado.total.toLocaleString('pt-BR')} registro(s) encontrado(s) de ${dados.produtos.length.toLocaleString('pt-BR')} no Master ERP. Somente consulta.`;
    dom.erpPageInfo.textContent = `${resultado.inicio}–${resultado.fim} de ${resultado.total.toLocaleString('pt-BR')} · Página ${pagina} de ${resultado.paginas}`;
    dom.erpPreviousBtn.disabled = pagina <= 1;
    dom.erpNextBtn.disabled = pagina >= resultado.paginas;
    dom.erpTableBody.innerHTML = resultado.produtos.length ? resultado.produtos.map(produto => `
      <tr><td>${escapeHtml(produto.codigo_produto)}</td><td>${escapeHtml(produto.descricao || '—')}</td>
      <td>${escapeHtml(produto.origem.label)}</td><td>${escapeHtml(produto.familia.label)}</td>
      <td>${escapeHtml(produto.agrupamento_erp_valor || 'Não informado')}</td>
      <td>${escapeHtml(produto.agrupamento_comercial_erp_cod || 'Não informado')}</td>
      <td>${escapeHtml(produto.agrupamento_comercial_erp_descricao || 'Não informada')}</td></tr>`).join('') :
      '<tr><td colspan="7" class="empty-state">Nenhum produto encontrado no Master ERP.</td></tr>';
  }

  async function reload() {
    dados = null;
    dom.erpCount.textContent = '…';
    dom.erpSummary.textContent = 'Carregando Cadastro Mestre ERP…';
    dom.erpPageInfo.textContent = '';
    dom.erpTableBody.textContent = '';
    dom.erpRefreshBtn.disabled = true;
    dom.erpPreviousBtn.disabled = true;
    dom.erpNextBtn.disabled = true;
    try {
      const { data, error } = await api.getCadastroMestreErp();
      if (error) throw error;
      dados = prepararConsultaCadastroMestreErp(data);
      fillSelect(dom.erpOrigemFilter, dados.origens, { value: '', label: 'Todas as origens ERP' }, dom.erpOrigemFilter.value);
      fillSelect(dom.erpFamiliaFilter, dados.familias, { value: '', label: 'Todas as famílias ERP' }, dom.erpFamiliaFilter.value);
      pagina = 1;
      render();
    } catch (error) {
      dados = null;
      dom.erpCount.textContent = 'indisponível';
      dom.erpSummary.textContent = 'Não foi possível carregar o Cadastro Mestre ERP. Atualize a consulta para tentar novamente.';
      throw error;
    } finally {
      dom.erpRefreshBtn.disabled = false;
    }
  }

  function bind() {
    const filtrar = () => { pagina = 1; render(); };
    dom.erpSearch.addEventListener('input', filtrar);
    dom.erpOrigemFilter.addEventListener('change', filtrar);
    dom.erpFamiliaFilter.addEventListener('change', filtrar);
    dom.erpPreviousBtn.addEventListener('click', () => { pagina--; render(); });
    dom.erpNextBtn.addEventListener('click', () => { pagina++; render(); });
    const atualizar = () => executeOperationalBoundary('consultar Cadastro Mestre ERP', reload,
      { message: 'Não foi possível carregar o Cadastro Mestre ERP.' });
    dom.erpRefreshBtn.addEventListener('click', atualizar);
    return atualizar();
  }
  return { bind, reload };
}
