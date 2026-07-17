/* Responsabilidade: renderização dos gráficos investigativos (comparação entre
   importações, TOP VARIAÇÕES, análise temporal) e layout condicional do relatório.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contrato temporal preservado: a análise temporal agrupa por `data_referencia`
   (competência) e desempata a última importação por `criado_em`. */
import { api } from '../src/services/api.js';
import { normalizeCodigoProduto } from '../core/spreadsheet-engine.js';
import { escapeHtml, formatCurrencyBRL, showToast } from './ui-utils.js';

const chartA11yTheme = {
  textColor: '#FFFFFF',
  gridColor: 'rgba(255,255,255,0.22)',
  gridBorderColor: 'rgba(255,255,255,0.4)',
  tooltipBg: 'rgba(15,23,42,0.95)'
};

function getReadableChartOptions() {
  return {
    color: chartA11yTheme.textColor,
    plugins: {
      legend: { labels: { color: chartA11yTheme.textColor, usePointStyle: true } },
      tooltip: {
        titleColor: chartA11yTheme.textColor,
        bodyColor: chartA11yTheme.textColor,
        backgroundColor: chartA11yTheme.tooltipBg,
        borderColor: chartA11yTheme.gridBorderColor,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: chartA11yTheme.textColor },
        grid: { color: chartA11yTheme.gridColor, borderColor: chartA11yTheme.gridBorderColor }
      },
      y: {
        ticks: { color: chartA11yTheme.textColor },
        grid: { color: chartA11yTheme.gridColor, borderColor: chartA11yTheme.gridBorderColor }
      }
    }
  };
}

function renderTopVariationItems(items, type) {
  if (!items.length) {
    return '<li><span class="product">Sem dados comparáveis entre as 2 últimas importações.</span><span class="variation">-</span></li>';
  }
  return items.map(item => `
    <li class="${type}">
      <span class="product" title="${escapeHtml(item.codigo_produto)} - ${escapeHtml(item.descricao)}">${escapeHtml(item.codigo_produto)} - ${escapeHtml(item.descricao)}</span>
      <span class="variation">${item.variacao_percentual >= 0 ? '+' : ''}${item.variacao_percentual.toFixed(2)}%</span>
    </li>
  `).join('');
}

function buildTemporalSeries(rows = [], filters = {}) {
  const selectedItem = filters.item && filters.item !== 'TODOS' ? normalizeCodigoProduto(filters.item) : null;
  const scopedRows = (rows || []).filter(row => {
    if (!selectedItem) return true;
    return normalizeCodigoProduto(row?.codigo_produto) === selectedItem;
  });

  const latestByProductAndCompetencia = new Map();
  scopedRows.forEach(row => {
    const competencia = row?.data_referencia;
    const codigoProduto = normalizeCodigoProduto(row?.codigo_produto);
    if (!competencia || !codigoProduto) return;
    const dedupeKey = `${codigoProduto}__${competencia}`;
    const current = latestByProductAndCompetencia.get(dedupeKey);
    if (!current || String(row?.criado_em || '') > String(current?.criado_em || '')) {
      latestByProductAndCompetencia.set(dedupeKey, row);
    }
  });

  const grouped = new Map();
  [...latestByProductAndCompetencia.values()].forEach(row => {
    const competencia = row.data_referencia;
    if (!grouped.has(competencia)) grouped.set(competencia, { sum: 0, count: 0, values: [] });
    const entry = grouped.get(competencia);
    const custo = Number(row.custo_total || 0);
    entry.sum += custo;
    entry.count += 1;
    entry.values.push(custo);
  });

  const mode = filters.item && filters.item !== 'TODOS' ? 'produto' : 'agregado';
  const labels = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const values = labels.map(label => {
    const entry = grouped.get(label);
    if (mode === 'produto') return Number((entry.values[0] || 0).toFixed(4));
    return Number((entry.sum / Math.max(entry.count, 1)).toFixed(4));
  });

  return { labels, values, mode };
}

function getTrendStatus(values = []) {
  if (values.length < 2) return { text: '🟢 Estável', className: 'stable' };
  const first = Number(values[0] || 0);
  const last = Number(values[values.length - 1] || 0);
  const variation = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
  if (variation > 1) return { text: '🔺 Tendência de Alta', className: 'up' };
  if (variation < -1) return { text: '🔻 Tendência de Queda', className: 'down' };
  return { text: '🟢 Estável', className: 'stable' };
}

/**
 * Cria o controlador de gráficos ligado ao `dom` e ao `state` compartilhados.
 * As instâncias Chart.js seguem sendo mantidas em `state.chart`/`state.trendChart`
 * para preservar o ciclo de destruição/recriação existente.
 */
export function createChartsController({ dom, state }) {
  async function renderImportComparisonChart(filters) {
    const { data, error } = await api.getLatestImportComparison(filters);
    if (error) {
      showToast('error', 'Falha ao buscar comparação entre importações.');
      return false;
    }

    const imports = data?.imports || [];
    if (imports.length < 2) {
      if (state.chart) state.chart.destroy();
      return false;
    }

    const labels = imports.map(item => new Date(item.criado_em).toLocaleString('pt-BR'));
    const values = imports.map(item => Number(item.media || 0));
    const counts = imports.map(item => Number(item.quantidade || 0));
    const variacao = Number(data?.resumo?.variacao_percentual_media || 0);
    const baseA11yOptions = getReadableChartOptions();

    if (state.chart) state.chart.destroy();
    state.chart = new Chart(dom.mainChart, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Custo médio por importação', data: values, backgroundColor: ['#0ea5e9', '#6366f1'] }]
      },
      options: {
        ...baseA11yOptions,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          ...baseA11yOptions.scales,
          y: {
            ...baseA11yOptions.scales.y,
            ticks: { ...baseA11yOptions.scales.y.ticks, callback: value => `R$ ${formatCurrencyBRL(value)}` }
          }
        },
        plugins: {
          ...baseA11yOptions.plugins,
          tooltip: {
            ...baseA11yOptions.plugins.tooltip,
            callbacks: {
              title: items => {
                const idx = items?.[0]?.dataIndex ?? 0;
                return idx === 0 ? 'Última importação' : 'Importação anterior';
              },
              label: context => {
                const idx = context.dataIndex;
                return `R$ ${formatCurrencyBRL(context.parsed.y)} · ${counts[idx]} item(ns)`;
              },
              afterBody: items => {
                const idx = items?.[0]?.dataIndex ?? 0;
                if (idx !== 0) return '';
                return `Variação média vs anterior: ${variacao.toFixed(2)}%`;
              }
            }
          }
        }
      }
    });
    return true;
  }

  async function renderTopVariationsPanel(filters) {
    const { data, error } = await api.getTopVariacoesImportacao(filters);
    if (error) {
      showToast('error', 'Falha ao calcular TOP VARIAÇÕES.');
      dom.topVariationsPanel.classList.add('hidden');
      return;
    }

    const aumentos = data?.aumentos || [];
    const reducoes = data?.reducoes || [];
    if (!aumentos.length && !reducoes.length) {
      dom.topVariationsPanel.classList.add('hidden');
      return;
    }

    dom.topIncreasesList.innerHTML = renderTopVariationItems(aumentos, 'increase');
    dom.topReductionsList.innerHTML = renderTopVariationItems(reducoes, 'reduction');
    dom.topVariationsPanel.classList.remove('hidden');
  }

  function applyReportLayout({ hasSingleItemAnalysis, hasImportComparison, hasTrendData }) {
    dom.reportContent.classList.toggle('single-item-mode', hasSingleItemAnalysis);
    dom.mainChartPanel.classList.toggle('hidden', hasSingleItemAnalysis || !hasImportComparison);
    dom.trendChartPanel.classList.toggle('hidden', !hasTrendData);
  }

  async function renderTemporalAnalysis(data, filters) {
    const { labels, values, mode } = buildTemporalSeries(data, filters);
    if (labels.length < 2) {
      if (state.trendChart) state.trendChart.destroy();
      dom.trendFallback.textContent = 'Histórico insuficiente para análise temporal';
      dom.trendFallback.classList.remove('hidden');
      dom.trendChart.classList.add('hidden');
      dom.trendBadge.textContent = '🟢 Estável';
      dom.trendBadge.className = 'badge trend stable';
      return false;
    }

    const avg = values.reduce((acc, cur) => acc + Number(cur || 0), 0) / values.length;
    const trend = getTrendStatus(values);
    dom.trendTitle.textContent = 'Evolução Temporal de Custos';
    dom.trendBadge.textContent = trend.text;
    dom.trendBadge.className = `badge trend ${trend.className}`;
    dom.trendFallback.classList.add('hidden');
    dom.trendChart.classList.remove('hidden');
    const baseA11yOptions = getReadableChartOptions();

    if (state.trendChart) state.trendChart.destroy();
    state.trendChart = new Chart(dom.trendChart, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: mode === 'produto' ? 'Custo do produto' : 'Custo médio agregado', data: values, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.14)', fill: true, tension: 0.25 },
          { label: 'Média histórica', data: labels.map(() => avg), borderColor: '#f59e0b', borderDash: [6, 6], pointRadius: 0, fill: false }
        ]
      },
      options: {
        ...baseA11yOptions,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...baseA11yOptions.plugins,
          tooltip: {
            ...baseA11yOptions.plugins.tooltip,
            callbacks: {
              title: items => new Date(items?.[0]?.label || '').toLocaleDateString('pt-BR'),
              label: ctx => `R$ ${formatCurrencyBRL(ctx.parsed.y)}`,
              afterLabel: ctx => {
                if (ctx.dataIndex === 0 || ctx.datasetIndex > 0) return '';
                const prev = Number(values[ctx.dataIndex - 1] || 0);
                const curr = Number(values[ctx.dataIndex] || 0);
                const delta = prev === 0 ? 0 : ((curr - prev) / Math.abs(prev)) * 100;
                return `Variação vs anterior: ${delta.toFixed(2)}%`;
              }
            }
          }
        },
        scales: {
          ...baseA11yOptions.scales,
          y: {
            ...baseA11yOptions.scales.y,
            ticks: { ...baseA11yOptions.scales.y.ticks, callback: value => `R$ ${formatCurrencyBRL(value)}` }
          }
        }
      }
    });
    return true;
  }

  return { renderImportComparisonChart, renderTopVariationsPanel, applyReportLayout, renderTemporalAnalysis };
}
