# Capítulo 13 — Componentes

## Componentes críticos
- Dropzone de importação (`#dropZone`).
- Modal de mapeamento de colunas obrigatórias.
- Filtros em cascata (`selO`, `selF`, `selA`, `selI`).
- KPIs, tabela de auditoria e gráficos (`Chart.js`).

## Cadastro — CAD-UX-01 (2026-10-08)

- `.master-table-scroll`: região acessível com foco pelo teclado, altura máxima de 60% da viewport e rolagem nativa nos dois eixos. Uma única posição horizontal, barra no rodapé da área e cabeçalho sticky durante a navegação pelas linhas.
- `#master-agrupamento`: **Sem agrupamento** remove explicitamente a classificação ao salvar; a tabela confirma esse estado. Não muda a regra de vazio na importação. [Contrato e validação](./cadastro-mestre.md).

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
