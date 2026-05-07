# Capítulo 13 — Componentes

## Componentes críticos
- Dropzone de importação (`#dropZone`).
- Modal de mapeamento de colunas obrigatórias.
- Filtros em cascata (`selO`, `selF`, `selA`, `selI`).
- KPIs, tabela de auditoria e gráficos (`Chart.js`).

## Painel temporal de custos
- Container: `#trendChartPanel` com header e badge de tendência.
- Título fixo: `Evolução Temporal de Custos`.
- Badge dinâmica:
  - `🟢 Estável`
  - `🔺 Tendência de Alta`
  - `🔻 Tendência de Queda`
- Mensagem de fallback: `#trendFallback` para cenários de histórico insuficiente.
