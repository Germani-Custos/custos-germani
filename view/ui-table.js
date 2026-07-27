/* Responsabilidade: fila investigativa da aba Custos — renderização da tabela,
   presenter operacional por linha e expansão de detalhes.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento. */
import { isAlertaCritico } from '../core/report-engine.js';
import { escapeHtml, formatCurrencyBRL, formatDateTimeBR, formatDateBR } from './ui-utils.js';

function formatCurrencyCell(value) {
  if (value === null || value === undefined) return '-';
  return `R$ ${formatCurrencyBRL(value)}`;
}

function formatDiffCell(diferenca, variacao) {
  if (diferenca === null || diferenca === undefined) return '-';
  const variacaoText = Number.isFinite(variacao) ? ` (${variacao.toFixed(2)}%)` : '';
  return `${diferenca >= 0 ? '+' : '-'}R$ ${formatCurrencyBRL(Math.abs(diferenca))}${variacaoText}`;
}

export function getOperationalPriority(row) {
  const absVariacao = Math.abs(Number(row.variacao || 0));
  const reincidencia = isAlertaCritico(row);
  if (row.mudouRegime || row.classificacaoInstabilidade === 'MUITO INSTÁVEL' || absVariacao >= 20) {
    return { label: '🔴 Crítico', className: 'critical', reason: 'Mudança de regime, instabilidade extrema ou variação muito alta.' };
  }
  if (isAlertaCritico(row) || absVariacao >= 10 || row.classificacaoInstabilidade === 'OSCILANDO') {
    return { label: '🟠 Atenção', className: 'attention', reason: 'Variação relevante com potencial impacto operacional.' };
  }
  if (reincidencia || absVariacao >= 3) {
    return { label: '🟡 Monitorar', className: 'monitor', reason: 'Oscilação recorrente de menor magnitude.' };
  }
  return { label: '🟢 Estável', className: 'stable', reason: 'Sem sinais relevantes de anomalia no período.' };
}

export function buildInvestigativeSummary(row) {
  const signals = [];
  if (row.mudouRegime) signals.push('Mudou regime após estabilidade longa.');
  if ((row.variacao ?? 0) > 0 && (row.variacaoTemporal ?? 0) > 0) signals.push('2ª alta consecutiva entre importações.');
  if ((row.variacao ?? 0) < 0 && (row.variacaoTemporal ?? 0) < 0) signals.push('2ª queda consecutiva entre importações.');
  if (Math.abs(Number(row.variacao || 0)) > Math.abs(Number(row.variacaoTemporal || 0)) + 2 && row.classificacaoInstabilidade !== 'ESTÁVEL') {
    signals.push('Oscilação crescente no recorte atual.');
  }
  if (signals.length) return signals.slice(0, 2).join(' ');
  if (row.mudouRegime) return 'Mudou regime após fase estável; priorizar investigação temporal.';
  if (row.classificacaoInstabilidade === 'MUITO INSTÁVEL') return 'Oscilação crescente com comportamento instável no período.';
  if (Math.abs(Number(row.variacao || 0)) >= 10) return `Variação expressiva de ${row.variacao.toFixed(2)}% no recorte analisado.`;
  if (isAlertaCritico(row)) return 'Nova variação relevante na última importação (reincidência).';
  return 'Comportamento sem ruptura relevante; manter monitoramento contínuo.';
}

/**
 * @param {{ dom: Record<string, any>, executeOperationalBoundary: Function, renderDrillThrough: Function, rerunReportForProduct: Function }} params
 */
export function createTableController({ dom, executeOperationalBoundary, renderDrillThrough, rerunReportForProduct }) {
  function renderTable(rows, _options = {}) {
    dom.tableBody.innerHTML = rows.map(row => {
      const prioridade = getOperationalPriority(row);
      const contexto = buildInvestigativeSummary(row);
      return `
        <tr class="investigation-row ${isAlertaCritico(row) ? 'row-alert' : row.mudouRegime ? 'row-regime' : ''}" data-codigo="${escapeHtml(row.codigo)}" data-row-type="main">
          <td>
            <div class="product-main"><strong>${escapeHtml(row.codigo)}</strong><small>${escapeHtml(row.descricao)}</small></div>
          </td>
          <td>${formatDiffCell(row.diferenca, row.variacaoTemporal)} <span class="muted-inline">(${row.variacao.toFixed(2)}%)</span></td>
          <td><span class="badge priority ${prioridade.className}" title="${prioridade.reason}">${prioridade.label}</span></td>
          <td><span class="badge regime ${row.mudouRegime ? 'regime-change-strong' : 'regime-stable'}">${row.mudouRegime ? '⚡ Mudança de regime' : row.classificacaoInstabilidade}</span></td>
          <td class="summary-cell">${contexto}</td>
          <td><button type="button" class="btn-outline btn-sm row-details-toggle" data-codigo="${escapeHtml(row.codigo)}">Detalhes</button></td>
        </tr>
        <tr class="details-row hidden" data-details-for="${escapeHtml(row.codigo)}">
          <td colspan="6">
            <div class="details-grid">
              <span><strong>Último custo:</strong> ${formatCurrencyCell(row.ultimoCusto)}</span>
              <span><strong>Penúltimo custo:</strong> ${formatCurrencyCell(row.penultimoCusto)}</span>
              <span><strong>Custo inicial:</strong> R$ ${formatCurrencyBRL(row.inicial)}</span>
              <span><strong>Custo final:</strong> R$ ${formatCurrencyBRL(row.final)}</span>
              <span><strong>Importado em (criado_em):</strong> ${formatDateTimeBR(row.ultimaAtualizacao)}</span>
              <span><strong>Competência (data_referencia):</strong> ${row.dataCompetencia ? formatDateBR(row.dataCompetencia) : '-'}</span>
              <span><strong>Score instabilidade:</strong> ${row.scoreInstabilidade.toFixed(2)}%</span>
              <span><strong>Classificação:</strong> ${row.classificacaoInstabilidade}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    dom.tableBody.querySelectorAll('tr[data-row-type="main"]').forEach(tr => {
      tr.addEventListener('click', async event => {
        if (event.target.closest('.row-details-toggle')) return;
        const codigo = tr.dataset.codigo;
        await executeOperationalBoundary('drill-through do produto', () => renderDrillThrough(codigo), {
          message: 'Falha ao carregar o histórico completo do produto.'
        });
        await rerunReportForProduct(codigo);
      });
    });

    dom.tableBody.querySelectorAll('.row-details-toggle').forEach(btn => {
      btn.addEventListener('click', event => {
        event.stopPropagation();
        const detailsRow = dom.tableBody.querySelector(`tr[data-details-for="${btn.dataset.codigo}"]`);
        if (!detailsRow) return;
        detailsRow.classList.toggle('hidden');
        btn.textContent = detailsRow.classList.contains('hidden') ? 'Detalhes' : 'Ocultar';
      });
    });
  }

  return { renderTable, getOperationalPriority, buildInvestigativeSummary };
}
