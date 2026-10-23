export function createInitialState() {
  return {
    user: null,
    masters: { origens: [], familias: [], agrupamentos: [], produtos: [], dicionario: [], hierarquia: [] },
    chart: null,
    trendChart: null,
    importMapping: null,
    unsubscribeFiltersRealtime: null,
    reportRows: [],
    reportView: { sortKey: null, sortDirection: 'desc', quickFilter: 'all' }
  };
}
