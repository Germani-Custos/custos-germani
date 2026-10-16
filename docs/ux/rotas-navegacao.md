# Rotas e Navegação

A navegação alterna views no mesmo `index.html`, por botões `data-view-trigger`:

- `import` → `view-import`: Importação.
- `report` → `view-report`: Custos.
- `op` → `view-op`: Auditoria de OP.
- `products` → `view-products`: Cadastro, com painéis Operacional/Mestre ERP independentes.
- `documentation` → `view-documentation`: Documentação.

Não há router de framework. Login é sobreposição no fluxo principal antes de masters/metadados e OP. [Manual do Usuário](../manuais/manual-usuario.md) e [Frontend](frontend.md).
