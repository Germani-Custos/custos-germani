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
- Labels, eixos, valores e legendas dos gráficos usam `--text-primary` para alto contraste com o fundo escuro; séries usam os tokens roxos e a média histórica mantém a referência amarela tracejada.
- Grid e bordas do gráfico usam tons claros translúcidos para manter referência visual sem poluição.
- Tooltip usa fundo escuro com texto branco para leitura consistente durante hover.

## Identidade Black + Purple (VIS-01)

`assets/style.css` é a fonte dos tokens. Não adicionar paletas locais por módulo. O runtime continua HTML/CSS/ES Modules com as mesmas dependências.

- Base: `--background`, `--surface`, `--surface-elevated`, `--border` e aliases existentes `--bg-1`, `--bg-2`, `--panel`, `--line`.
- Identidade: `--primary-purple`, `--secondary-purple`, `--accent-solid`, `--accent-soft`, `--accent-border`, `--hover` e `--focus`.
- Texto: `--text-primary`, `--text-secondary`, `--muted`, `--on-primary`.
- Semântica: `--critical`, `--warning`, `--success`, `--informational` e suas superfícies `*-soft`. Vermelho continua crítico, amarelo/âmbar atenção, verde favorável e azul informativo. Rótulos e símbolos existentes acompanham as cores.
- Especializações: `--documentation-accent` (azul-violeta) e `--admin-accent` (violeta/magenta). Não representam novos estados ou permissões.
- Gráficos: `--chart-grid`, `--chart-grid-border` e tokens de superfície/texto/séries, lidos em `view/ui-charts.js` exclusivamente para apresentação.

`.module-grid` e `.module-card` organizam os quatro acessos aos módulos existentes dentro da view Importação. Cada card possui ícone, título, descrição e ação; hover tem borda roxa e elevação de 2px. Não há estado “online” presumido. O checkout não possui Dashboard nem Configuração/Admin independentes; os controles administrativos permanecem no Cadastro/Preview. A navegação usa o handler existente, e CSS identifica o destino aberto também ao entrar por card.

`.panel`, `.glass`, `.btn-primary`, `.btn-outline`, `.field`, `.search-bar`, `.kpi`, `.badge`, tabelas, login e SweetAlert2 compartilham superfícies/tokens. As duas fontes cadastrais continuam nomeadas e separadas por seus painéis/seletores. Preview e revisão usam controles escuros legíveis. Desabilitado conserva sua condição; foco usa contorno de 2px, sem depender de glow. `prefers-reduced-motion` elimina transições/animações.

Cards usam quatro colunas em desktop, duas até 1280px e uma até 700px. Até 1160px a navegação passa para cima do conteúdo. Até 700px os filtros ficam em uma coluna, ações quebram linha e tabelas mantêm rolagem interna. Cabeçalhos sticky existentes e densidade investigativa são preservados.

Não há mudança temporal: `data_referencia` é competência e `criado_em` é importação. [Conferência visual e limites](../auditoria/identidade-visual.md).
