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

  function exportReport() {
    if (!state.reportRows.length) {
      showToast('warning', 'Rode a análise antes de exportar.');
      return;
    }

    // Fronteira operacional da exportação: mantém a análise atual mesmo se XLSX falhar.
    executeOperationalBoundary('exportar relatório investigativo', async () => {
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
        return {
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
      });

      const wsMeta = XLSX.utils.json_to_sheet(metadataRows);
      const wsData = XLSX.utils.json_to_sheet(exportData);
      wsData['!autofilter'] = { ref: wsData['!ref'] };
      wsData['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
        { wch: 50 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 36 }
      ];

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
