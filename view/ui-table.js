/* Responsabilidade: fila investigativa da aba Custos — renderização da tabela,
   presenter operacional por linha e expansão de detalhes.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento. */
import { isAlertaCritico } from '../core/report-engine.js';
import { escapeHtml, formatCurrencyBRL, formatDateTimeBR, formatDateBR } from './ui-utils.js';

// PERF-01: a fila já chega ordenada pelo estado investigativo. Renderizar só a
// primeira janela preserva essa prioridade e evita crescer o DOM com a base ERP.
export const MAX_VISIBLE_INVESTIGATION_ROWS = 200;

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
    return { label: '🟡 Monitorar', className: 'monitor', reason: 'Variação de menor magnitude no período.' };
  }
  return { label: '🟢 Estável', className: 'stable', reason: 'Sem sinais relevantes de anomalia no período.' };
}

// Comparador existente da exportação, compartilhado com a fila antes do corte.
// getOperationalPriority é recebido por injeção, preservando o contrato do XLSX.
export function getInvestigationRankScore(row, getOperationalPriority) {
  const prioridade = getOperationalPriority(row);
  const criticidadePeso = { '🔴 Crítico': 4, '🟠 Atenção': 3, '🟡 Monitorar': 2, '🟢 Estável': 1 }[prioridade.label] || 1;
  const regimePeso = row.mudouRegime ? 1 : 0;
  const magnitude = Math.abs(Number(row.variacaoTemporal ?? row.variacao ?? 0));
  const reincidencia = isAlertaCritico(row) ? 1 : 0;
  const instabilidade = Number(row.scoreInstabilidade || 0);
  return { criticidadePeso, regimePeso, magnitude, reincidencia, instabilidade };
}

export function compareByInvestigativePriority(a, b, getOperationalPriority) {
  const ra = getInvestigationRankScore(a, getOperationalPriority);
  const rb = getInvestigationRankScore(b, getOperationalPriority);
  if (rb.criticidadePeso !== ra.criticidadePeso) return rb.criticidadePeso - ra.criticidadePeso;
  if (rb.regimePeso !== ra.regimePeso) return rb.regimePeso - ra.regimePeso;
  if (rb.magnitude !== ra.magnitude) return rb.magnitude - ra.magnitude;
  if (rb.reincidencia !== ra.reincidencia) return rb.reincidencia - ra.reincidencia;
  if (rb.instabilidade !== ra.instabilidade) return rb.instabilidade - ra.instabilidade;
  return String(a.codigo || '').localeCompare(String(b.codigo || ''), 'pt-BR');
}

export function buildInvestigativeSummary(row) {
  const signals = [];
  if (row.mudouRegime) signals.push('Mudança de regime no recorte analisado.');
  // O ReportRow não contém contagem/prova de transições históricas de alerta.
  if (isAlertaCritico(row)) signals.push(row.variacaoTemporal > 0
    ? 'Alerta de alta entre os dois registros mais recentes por importação.'
    : 'Alerta de queda entre os dois registros mais recentes por importação.');
  else if (row.variacao > 0) signals.push(`Alta no período de ${row.variacao.toFixed(2)}%.`);
  else if (row.variacao < 0) signals.push(`Queda no período de ${Math.abs(row.variacao).toFixed(2)}%.`);
  if (row.classificacaoInstabilidade === 'MUITO INSTÁVEL') signals.push('Comportamento muito instável no recorte analisado.');
  else if (row.classificacaoInstabilidade === 'OSCILANDO') signals.push('Comportamento oscilante no recorte analisado.');
  if (signals.length) return signals.slice(0, 2).join(' ');
  if (row.variacaoTemporal === null) return 'Sem comparativo entre registros por importação; conferir o histórico.';
  return 'Comportamento sem ruptura relevante; manter monitoramento contínuo.';
}

/**
 * @param {{ dom: Record<string, any>, executeOperationalBoundary: Function, renderDrillThrough: Function, rerunReportForProduct: Function }} params
 */
export function createTableController({ dom, executeOperationalBoundary, renderDrillThrough, rerunReportForProduct }) {
  async function handleTableClick(event) {
    const detailsButton = event.target?.closest?.('.row-details-toggle');
    if (detailsButton) {
      const detailsRow = dom.tableBody.querySelector(`tr[data-details-for="${detailsButton.dataset.codigo}"]`);
      if (!detailsRow) return;
      detailsRow.classList.toggle('hidden');
      detailsButton.textContent = detailsRow.classList.contains('hidden') ? 'Detalhes' : 'Ocultar';
      return;
    }

    const row = event.target?.closest?.('tr[data-row-type="main"]');
    if (!row) return;
    const codigo = row.dataset.codigo;
    await executeOperationalBoundary('drill-through do produto', () => renderDrillThrough(codigo), {
      message: 'Falha ao carregar o histórico completo do produto.'
    });
    await rerunReportForProduct(codigo);
  }

  // PERF-01: um único listener delegado, independente da quantidade de linhas.
  dom.tableBody.addEventListener('click', handleTableClick);

  function renderTable(rows, options = {}) {
    const visibleRows = rows.slice(0, MAX_VISIBLE_INVESTIGATION_ROWS);
    const windowDescription = options.manualSort
      ? `os primeiros ${MAX_VISIBLE_INVESTIGATION_ROWS} de ${rows.length} na ordenação escolhida`
      : `os ${MAX_VISIBLE_INVESTIGATION_ROWS} itens mais prioritários de ${rows.length}`;
    const limitNotice = rows.length > visibleRows.length
      ? `<tr class="table-limit-notice"><td colspan="6">Mostrando ${windowDescription}. Refine os filtros para investigar outros itens.</td></tr>`
      : '';

    dom.tableBody.innerHTML = limitNotice + visibleRows.map(row => {
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
  }

  return { renderTable, getOperationalPriority, buildInvestigativeSummary };
}
