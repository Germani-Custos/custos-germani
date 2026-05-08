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


## Acessibilidade visual dos gráficos
- Labels, eixos, valores e legendas dos gráficos da Auditoria usam `#FFFFFF` para alto contraste com o fundo escuro.
- Grid e bordas do gráfico usam tons claros translúcidos para manter referência visual sem poluição.
- Tooltip usa fundo escuro com texto branco para leitura consistente durante hover.
