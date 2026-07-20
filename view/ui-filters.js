/* Responsabilidade: filtros investigativos — cascata (origem → família →
   agrupamento → item), filtro rápido da fila (KPIs), ordenação da tabela e chips
   de filtros ativos. Decide "quais linhas e em que ordem"; a renderização da
   tabela (renderTable) e o relatório principal (runReport)/exportação (exportReport)
   permanecem em ui-controller.js e são injetados por callback.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contratos preservados:
   - Filtro rápido: alerts / positive / regime / all idêntico.
   - Cascata: prioridade origem → família → agrupamento → item idêntica.
   - Debounce de 2000ms no realtime de filtros idêntico. */
import { api } from '../src/services/api.js';
import { calculateCascadeOptions, filterAlertRows } from '../core/report-engine.js';
import { debounce, escapeHtml, fillSelect } from './ui-utils.js';

// Fonte canônica de "quais linhas" da fila investigativa — compartilhada com ui-export.js.
export function getRowsMatchingQuickFilter(rows, operation, quickFilter) {
  if (quickFilter === 'alerts') return filterAlertRows(rows, { operation });
  if (quickFilter === 'positive') return rows.filter(row => row.variacao > 0);
  if (quickFilter === 'regime') return rows.filter(row => row.mudouRegime === true);
  return rows;
}

// Fonte canônica de "em que ordem" — compartilhada com ui-export.js.
export function compareRowsBySort(a, b, key, direction) {
  const order = direction === 'asc' ? 1 : -1;
  const valueA = a?.[key];
  const valueB = b?.[key];
  if (key === 'alert' || key === 'mudouRegime') return ((valueA ? 1 : 0) - (valueB ? 1 : 0)) * order;
  if (typeof valueA === 'number' || typeof valueB === 'number') return ((Number(valueA) || 0) - (Number(valueB) || 0)) * order;
  return String(valueA || '').localeCompare(String(valueB || ''), 'pt-BR') * order;
}

/**
 * Cria o controlador de filtros ligado ao `dom`/`state` compartilhados.
 * Recebe por injeção a fronteira operacional (`executeOperationalBoundary`,
 * ERR-01), `fetchMetadata` (recarrega os selects no realtime) e os callbacks
 * `renderTable`/`runReport`/`exportReport` — que permanecem em ui-controller.js —
 * preservando o mesmo comportamento do orquestrador. Expõe `bindFilters`,
 * `applyTableView`, `refreshCascade` e `autoRefreshReport` para o orquestrador.
 */
export function createFiltersController({ dom, state, executeOperationalBoundary, fetchMetadata, renderTable, runReport, exportReport }) {
  function bindFilters() {
    dom.selO.addEventListener('change', () => refreshCascade('origem'));
    dom.selF.addEventListener('change', () => refreshCascade('familia'));
    dom.selA.addEventListener('change', () => refreshCascade('agrupamento'));
    dom.selI.addEventListener('change', () => autoRefreshReport());
    [dom.dtStart, dom.dtEnd].forEach(input => input.addEventListener('change', () => autoRefreshReport()));
    dom.analyzeBtn.addEventListener('click', () => runReport());
    dom.exportBtn.addEventListener('click', () => exportReport());
    dom.drillClose.addEventListener('click', () => dom.drillPanel.classList.add('hidden'));
    bindInteractiveTableControls();

    if (state.unsubscribeFiltersRealtime) state.unsubscribeFiltersRealtime();
    state.unsubscribeFiltersRealtime = api.subscribeFiltrosRealtime(
      debounce(async () => {
        // Degradação controlada: mantém filtros atuais se o realtime disparar durante instabilidade.
        await executeOperationalBoundary('atualização realtime de filtros', () => fetchMetadata(), {
          message: 'Falha ao atualizar filtros em tempo real. Mantendo o contexto atual.'
        });
      }, 2000)
    );
  }

  function bindInteractiveTableControls() {
    dom.kpiCards.forEach(card => {
      card.addEventListener('click', () => {
        state.reportView.quickFilter = card.dataset.kpiFilter || 'all';
        applyTableView();
      });
    });
    document.querySelectorAll('th[data-sort-key]').forEach(th => {
      th.addEventListener('click', () => {
        const nextKey = th.dataset.sortKey;
        if (state.reportView.sortKey === nextKey) {
          state.reportView.sortDirection = state.reportView.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.reportView.sortKey = nextKey;
          state.reportView.sortDirection = 'desc';
        }
        applyTableView();
      });
    });
  }

  function refreshCascade(trigger) {
    const currentFamily = dom.selF.value || 'TODAS';
    const currentGroup = dom.selA.value || 'TODOS';
    const currentItem = dom.selI.value || 'TODOS';

    if (trigger === 'origem') {
      dom.selF.value = 'TODAS';
      dom.selA.value = 'TODOS';
      dom.selI.value = 'TODOS';
    }
    if (trigger === 'familia') {
      dom.selA.value = 'TODOS';
      dom.selI.value = 'TODOS';
    }
    if (trigger === 'agrupamento') {
      dom.selI.value = 'TODOS';
    }

    const familyValue = trigger === 'origem' ? 'TODAS' : currentFamily;
    const { familyOptions } = calculateCascadeOptions({ origem: dom.selO.value, familia: familyValue }, state.masters);
    fillSelect(dom.selF, familyOptions, { value: 'TODAS', label: 'TODAS' }, familyValue);

    const { groupOptions, productOptions } = calculateCascadeOptions({
      origem: dom.selO.value,
      familia: dom.selF.value || 'TODAS',
      agrupamento: dom.selA.value || 'TODOS'
    }, state.masters);
    const groupValue = ['origem', 'familia'].includes(trigger) ? 'TODOS' : currentGroup;
    const itemValue = ['origem', 'familia', 'agrupamento'].includes(trigger) ? 'TODOS' : currentItem;
    fillSelect(dom.selA, groupOptions, { value: 'TODOS', label: 'TODOS' }, groupValue);
    fillSelect(dom.selI, productOptions, { value: 'TODOS', label: 'TODOS' }, itemValue);
    autoRefreshReport();
  }

  function autoRefreshReport() {
    if (dom.dtStart.value && dom.dtEnd.value) {
      runReport({ silent: true });
    }
  }

  function applyTableView(options = {}) {
    const { hasSingleItemAnalysis = false } = options;
    const filteredRows = getRowsMatchingQuickFilter(state.reportRows, 'filtro rápido Alertas (>5%)', state.reportView.quickFilter);
    const sortedRows = [...filteredRows].sort((a, b) => compareRowsBySort(a, b, state.reportView.sortKey, state.reportView.sortDirection));
    renderTable(sortedRows, { hasSingleItemAnalysis });
    renderActiveFilterChips();
    updateKpiCardState();
    updateSortHeaderState();
  }

  function renderActiveFilterChips() {
    if (!dom.activeFilterChips) return;
    const chips = [];
    const pushChip = (key, label, value) => value && value !== 'TODAS' && value !== 'TODOS' && chips.push({ key, label, value });
    pushChip('dtStart', 'Início', dom.dtStart.value);
    pushChip('dtEnd', 'Fim', dom.dtEnd.value);
    pushChip('origem', 'Origem', dom.selO.options[dom.selO.selectedIndex]?.textContent);
    pushChip('familia', 'Família', dom.selF.options[dom.selF.selectedIndex]?.textContent);
    pushChip('agrupamento', 'Agrupamento', dom.selA.options[dom.selA.selectedIndex]?.textContent);
    pushChip('item', 'Produto', dom.selI.value);
    if (state.reportView.quickFilter !== 'all') {
      const quickLabels = { alerts: 'Alertas >5%', positive: 'Variação positiva', regime: 'Mudança de regime' };
      chips.push({ key: 'quickFilter', label: 'Fila', value: quickLabels[state.reportView.quickFilter] || 'Filtro rápido' });
    }
    if (!chips.length) {
      dom.activeFilterChips.classList.add('hidden');
      dom.activeFilterChips.innerHTML = '';
      return;
    }
    dom.activeFilterChips.classList.remove('hidden');
    dom.activeFilterChips.innerHTML = chips.map(chip => `
      <button type="button" class="filter-chip" data-chip-key="${chip.key}">
        <span>${escapeHtml(chip.label)}: ${escapeHtml(chip.value)}</span><i class="ri-close-line"></i>
      </button>
    `).join('');
    dom.activeFilterChips.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => removeFilterChip(btn.dataset.chipKey));
    });
  }

  function removeFilterChip(chipKey) {
    if (chipKey === 'dtStart') dom.dtStart.value = '';
    if (chipKey === 'dtEnd') dom.dtEnd.value = '';
    if (chipKey === 'origem') dom.selO.value = 'TODAS';
    if (chipKey === 'familia') dom.selF.value = 'TODAS';
    if (chipKey === 'agrupamento') dom.selA.value = 'TODOS';
    if (chipKey === 'item') dom.selI.value = 'TODOS';
    if (chipKey === 'quickFilter') state.reportView.quickFilter = 'all';
    if (['origem', 'familia', 'agrupamento', 'item'].includes(chipKey)) refreshCascade();
    runReport({ silent: true });
  }

  function updateKpiCardState() {
    dom.kpiCards.forEach(card => {
      card.classList.toggle('active', card.dataset.kpiFilter === state.reportView.quickFilter);
    });
  }

  function updateSortHeaderState() {
    document.querySelectorAll('th[data-sort-key]').forEach(th => {
      th.classList.toggle('sort-active', th.dataset.sortKey === state.reportView.sortKey);
    });
  }

  return { bindFilters, applyTableView, refreshCascade, autoRefreshReport };
}
