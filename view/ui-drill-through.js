/* Responsabilidade: drill-through investigativo — histórico completo de
   importações de um produto (competência, importação, deltas por registro).
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contrato temporal preservado: cada linha exibe a competência (`data_referencia`)
   e a data de importação (`criado_em`) explicitamente rotuladas. */
import { api } from '../src/services/api.js';
import { isAlertaCritico } from '../core/report-engine.js';
import { escapeHtml, formatCurrencyBRL, formatDateBR, formatDateTimeBR, showToast } from './ui-utils.js';

/**
 * Cria o controlador de drill-through ligado ao `dom` compartilhado.
 * Expõe `renderDrillThrough(codigoProduto)` para abrir o histórico completo
 * de eventos de custo do produto no painel dedicado.
 */
export function createDrillThroughController({ dom }) {
  async function renderDrillThrough(codigoProduto) {
    const { data: history, error } = await api.getProductHistory(codigoProduto);
    if (error) {
      showToast('error', 'Falha ao carregar histórico do produto.');
      return;
    }
    if (!history?.length) {
      showToast('info', 'Sem histórico para este produto.');
      return;
    }

    const descricao = history[history.length - 1]?.descricao || '';
    dom.drillTitle.textContent = `${escapeHtml(codigoProduto)} — ${escapeHtml(descricao)}`;
    dom.drillSubtitle.textContent = `${history.length} registro(s) no histórico total · clique em uma linha para ver detalhes`;

    /* eslint-disable no-restricted-syntax -- Drill-through monta tabela HTML controlada com valores formatados/escapados; SEC-02 deve centralizar helper de HTML seguro. */
    dom.drillBody.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Competência</th>
            <th>Importado em</th>
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
                <td>${formatDateTimeBR(row.criado_em)}</td>
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

  return { renderDrillThrough };
}
