/* Responsabilidade: exportação da fila investigativa para XLSX — ordenação por
   prioridade investigativa, planilha de contexto/metadados e sanitização
   anti-fórmula. Consome de ui-filters.js as funções canônicas de seleção e
   ordenação de linhas (getRowsMatchingQuickFilter, compareRowsBySort). A
   prioridade de exibição (getOperationalPriority) e o resumo investigativo
   (buildInvestigativeSummary) permanecem em ui-controller.js — usados também
   pela tabela — e entram por injeção.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contratos preservados:
   - SEC-04 (sanitizeCsvFormula): mitigação de formula injection, sem alteração.
   - Nome do arquivo (buildExportFilename) byte-a-byte igual.
   - Ordem de prioridade investigativa (compareByInvestigativePriority) idêntica. */
import { isAlertaCritico } from '../core/report-engine.js';
import { formatCurrencyBRL, showToast } from './ui-utils.js';
import { getRowsMatchingQuickFilter, compareRowsBySort } from './ui-filters.js';

const EXPORT_COLUMNS = Object.freeze([
  { key: 'Prioridade #', label: 'Prioridade', width: 10 },
  { key: 'Produto (código)', label: 'Produto', width: 20 },
  { key: 'Produto (descrição)', label: 'Descrição', width: 40 },
  { key: 'Criticidade', label: 'Criticidade', width: 14 },
  { key: 'Mudança de regime', label: 'Mudança de regime', width: 18 },
  { key: 'Variação da última importação (%)', label: 'Delta em % (última importação)', width: 16 },
  { key: 'Variação no período (%)', label: 'Variação no período (%)', width: 14 },
  { key: 'Delta monetário última importação (R$)', label: 'Delta em R$ (última importação)', width: 16 },
  { key: 'Contexto investigativo', label: 'Contexto investigativo', width: 50 },
  { key: 'Reincidência de alerta', label: 'Reincidência de alerta', width: 16 },
  { key: 'Score de instabilidade (%)', label: 'Score de instabilidade (%)', width: 16 },
  { key: 'Regime', label: 'Regime', width: 16 },
  { key: 'Competência de referência (data_referencia)', label: 'Competência de referência', width: 16 },
  { key: 'Importado em (criado_em)', label: 'Importado em', width: 22 },
  { key: 'Último custo (R$)', label: 'Custo atual', width: 16 },
  { key: 'Penúltimo custo (R$)', label: 'Custo anterior', width: 16 },
  { key: 'Histórico resumido', label: 'Histórico resumido', width: 36 }
]);

export function selectExportColumns(row, selectedKeys) {
  const selected = new Set(selectedKeys);
  return Object.fromEntries(EXPORT_COLUMNS
    .filter(column => selected.has(column.key))
    .map(column => [column.key, row[column.key]]));
}

export async function chooseExportColumns() {
  const optionsHtml = EXPORT_COLUMNS.map(column => `
    <label style="display:block;text-align:left;margin:6px 0;cursor:pointer;">
      <input type="checkbox" value="${column.key}" checked> ${column.label}
    </label>
  `).join('');

  const result = await Swal.fire({
    title: 'Selecionar campos para exportação',
    html: `<div id="export-column-picker" style="max-height:360px;overflow-y:auto;padding:0 4px;">${optionsHtml}</div>`,
    showCancelButton: true,
    confirmButtonText: 'Exportar XLSX',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const selected = Array.from(Swal.getPopup().querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
      if (!selected.length) {
        Swal.showValidationMessage('Selecione pelo menos um campo para exportar.');
        return false;
      }
      return selected;
    }
  });

  return result.isConfirmed ? result.value : null;
}

// getOperationalPriority permanece em ui-controller.js (também usado pela tabela)
// e é recebido por injeção; aqui entra como parâmetro para manter estas funções
// puras e testáveis isoladamente.
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

export function buildExportFilename(dom) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const periodStart = dom.dtStart.value || 'inicio';
  const periodEnd = dom.dtEnd.value || 'fim';
  return `auditoria_criticos_${periodStart}_a_${periodEnd}_${yyyy}${mm}${dd}.xlsx`;
}

// SEC-04: sanitiza campos de texto para evitar formula injection no Excel/Sheets.
// Prefixar com ' previne que valores como =CMD, +CMD sejam interpretados como fórmula.
export function sanitizeCsvFormula(value) {
  const str = String(value ?? '');
  if ([' =', '+', '-', '@', '\t', '\r'].some(ch => str.startsWith(ch)) || str.startsWith('=')) {
    return "'" + str;
  }
  return str;
}

/**
 * Cria o controlador de exportação ligado ao `dom`/`state` compartilhados.
 * Recebe por injeção a fronteira operacional (`executeOperationalBoundary`,
 * ERR-01) e os helpers de apresentação que permanecem em ui-controller.js
 * (`getOperationalPriority`, `buildInvestigativeSummary`). Expõe `exportReport()`.
 */
export function createExportController({ dom, state, executeOperationalBoundary, getOperationalPriority, buildInvestigativeSummary }) {
  function getRowsFromCurrentInvestigationState() {
    const filteredRows = getRowsMatchingQuickFilter(state.reportRows, 'exportação da fila investigativa', state.reportView.quickFilter);

    const hasManualSort = state.reportView.sortKey && state.reportView.sortKey !== 'variacao';
    if (hasManualSort) {
      return [...filteredRows].sort((a, b) => compareRowsBySort(a, b, state.reportView.sortKey, state.reportView.sortDirection));
    }

    return [...filteredRows].sort((a, b) => compareByInvestigativePriority(a, b, getOperationalPriority));
  }

  async function exportReport() {
    if (!state.reportRows.length) {
      showToast('warning', 'Rode a análise antes de exportar.');
      return;
    }

    const selectedColumns = await chooseExportColumns();
    if (!selectedColumns) return;

    // Fronteira operacional da exportação: mantém a análise atual mesmo se XLSX falhar.
    await executeOperationalBoundary('exportar relatório investigativo', async () => {
      const investigationRows = getRowsFromCurrentInvestigationState();
      const filtrosAtivos = [
        `Origem: ${dom.selO.options[dom.selO.selectedIndex]?.textContent || 'TODAS'}`,
        `Família: ${dom.selF.options[dom.selF.selectedIndex]?.textContent || 'TODAS'}`,
        `Agrupamento: ${dom.selA.options[dom.selA.selectedIndex]?.textContent || 'TODOS'}`,
        `Produto: ${dom.selI.value || 'TODOS'}`,
        `Fila: ${state.reportView.quickFilter}`
      ].join(' | ');

      const metadataRows = [
        { Campo: 'Tipo de relatório', Valor: 'Relatório Investigativo Operacional de Custos' },
        { Campo: 'Gerado em (criado_em do relatório)', Valor: new Date().toISOString() },
        { Campo: 'Período de competência (data_referencia)', Valor: `${dom.dtStart.value || '-'} até ${dom.dtEnd.value || '-'}` },
        { Campo: 'Filtros ativos', Valor: filtrosAtivos },
        { Campo: 'Ordenação aplicada', Valor: 'Criticidade > Mudança de regime > Magnitude > Reincidência > Instabilidade (ou ordenação ativa manual)' },
        { Campo: 'Total de itens exportados', Valor: String(investigationRows.length) }
      ];

      const exportData = investigationRows.map((row, idx) => {
        const prioridade = getOperationalPriority(row);
        const rank = getInvestigationRankScore(row, getOperationalPriority);
        const completeRow = {
          'Prioridade #': idx + 1,
          'Produto (código)': sanitizeCsvFormula(row.codigo),
          'Produto (descrição)': sanitizeCsvFormula(row.descricao),
          'Criticidade': prioridade.label,
          'Mudança de regime': row.mudouRegime ? 'SIM' : 'NÃO',
          'Variação da última importação (%)': row.variacaoTemporal !== null ? row.variacaoTemporal.toFixed(2) : '—',
          'Variação no período (%)': row.variacao.toFixed(2),
          'Delta monetário última importação (R$)': row.diferenca ?? '—',
          'Contexto investigativo': sanitizeCsvFormula(buildInvestigativeSummary(row)),
          'Reincidência de alerta': rank.reincidencia ? 'SIM' : 'NÃO',
          'Score de instabilidade (%)': row.scoreInstabilidade.toFixed(2),
          'Regime': row.classificacaoInstabilidade,
          'Competência de referência (data_referencia)': row.dataCompetencia || '—',
          'Importado em (criado_em)': row.ultimaAtualizacao || '—',
          'Último custo (R$)': row.ultimoCusto ?? '—',
          'Penúltimo custo (R$)': row.penultimoCusto ?? '—',
          'Histórico resumido': `Inicial R$ ${formatCurrencyBRL(row.inicial)} -> Final R$ ${formatCurrencyBRL(row.final)}`
        };
        return selectExportColumns(completeRow, selectedColumns);
      });

      const wsMeta = XLSX.utils.json_to_sheet(metadataRows);
      const wsData = XLSX.utils.json_to_sheet(exportData);
      wsData['!autofilter'] = { ref: wsData['!ref'] };
      wsData['!cols'] = EXPORT_COLUMNS.filter(column => selectedColumns.includes(column.key)).map(column => ({ wch: column.width }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsMeta, 'Contexto');
      XLSX.utils.book_append_sheet(wb, wsData, 'Fila Investigativa');
      const filename = buildExportFilename(dom);
      XLSX.writeFile(wb, filename);
      showToast('success', `Relatório investigativo exportado: ${filename}`);
    }, {
      message: 'Falha ao exportar o relatório. A análise atual foi preservada.'
    });
  }

  return { exportReport };
}
