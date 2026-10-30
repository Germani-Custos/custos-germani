/* Responsabilidade: drill-through investigativo — histórico completo de
   importações de um produto (competência, importação, deltas por registro).
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contrato temporal: Competência exibe mês/ano e Data exibe o dia completo de
   `data_referencia`; `criado_em` permanece proveniência na API, sem exibição nesta tabela. */
import { api } from '../src/services/api.js';
import { isAlertaCritico } from '../core/report-engine.js';
import { escapeHtml, formatCurrencyBRL, formatDateBR, showToast } from './ui-utils.js';

function formatReferenceDateBR(value) {
  if (!value) return '-';
  // DATE do payload, interpretado à meia-noite local para preservar o dia sem conversão UTC.
  const parsed = new Date(value + 'T00:00:00');
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
}

/**
 * Cria o controlador de drill-through ligado ao `dom` compartilhado.
 * Expõe `renderDrillThrough(codigoProduto, temporalFilters)` para abrir os eventos
 * de custo do produto no mesmo recorte temporal ativo no relatório.
 */
export function createDrillThroughController({ dom }) {
  let activeCodigoProduto = null;

  async function renderDrillThrough(codigoProduto, temporalFilters = {}) {
    const { data: history, error } = await api.getProductHistory(codigoProduto, temporalFilters);
    if (error) {
      showToast('error', 'Falha ao carregar histórico do produto.');
      return;
    }
    if (!history?.length) {
      showToast('info', 'Sem histórico para este produto.');
      return;
    }

    const descricao = history[history.length - 1]?.descricao || '';
    activeCodigoProduto = codigoProduto;
    dom.drillTitle.textContent = `${escapeHtml(codigoProduto)} — ${escapeHtml(descricao)}`;
    dom.drillSubtitle.textContent = `${history.length} registro(s) no recorte selecionado · clique em uma linha para ver detalhes`;

    /* eslint-disable no-restricted-syntax -- Drill-through monta tabela HTML controlada com valores formatados/escapados; SEC-02 deve centralizar helper de HTML seguro. */
    dom.drillBody.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Competência</th>
            <th title="Data de referência da competência">Data</th>
            <th>Custo Variável</th>
            <th>Custo Direto Fixo</th>
            <th>Custo Total</th>
            <th>Δ vs anterior</th>
            <th>Δ%</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(row => {
            const isAlert = isAlertaCritico({ deltaPerc: row.deltaPerc });
            const deltaText = row.delta !== null
              ? `${row.delta >= 0 ? '+' : ''}R$ ${formatCurrencyBRL(Math.abs(row.delta))}`
              : '—';
            const deltaPercText = row.deltaPerc !== null
              ? `${row.deltaPerc >= 0 ? '+' : ''}${row.deltaPerc.toFixed(2)}%`
              : '—';
            const deltaClass = row.delta === null ? 'delta-neutral'
              : row.delta > 0 ? 'delta-up'
              : row.delta < 0 ? 'delta-down'
              : 'delta-neutral';
            return `
              <tr class="${isAlert ? 'row-alert' : ''}">
                <td><strong>${formatDateBR(row.data_referencia)}</strong></td>
                <td>${formatReferenceDateBR(row.data_referencia)}</td>
                <td>R$ ${formatCurrencyBRL(row.custo_variavel)}</td>
                <td>R$ ${formatCurrencyBRL(row.custo_direto_fixo)}</td>
                <td><strong>R$ ${formatCurrencyBRL(row.custo_total)}</strong></td>
                <td class="${deltaClass}">${deltaText}</td>
                <td class="${isAlert ? deltaClass : ''}">${deltaPercText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
    /* eslint-enable no-restricted-syntax */

    dom.drillPanel.classList.remove('hidden');
    dom.drillPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function refreshActive(temporalFilters, eligibleCodes = null) {
    if (!activeCodigoProduto) return;
    if (eligibleCodes && !eligibleCodes.includes(activeCodigoProduto)) {
      activeCodigoProduto = null;
      dom.drillPanel.classList.add('hidden');
      return;
    }
    await renderDrillThrough(activeCodigoProduto, temporalFilters);
  }

  return { renderDrillThrough, refreshActive };
}
