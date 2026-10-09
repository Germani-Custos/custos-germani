# Capítulo 2 — Stack Tecnológico

## Stack atual
- Frontend SPA: HTML + CSS + JavaScript ES Modules.
- Banco/API/Auth: Supabase.
- Leitura de planilhas: SheetJS (`xlsx`).
- Gráficos: Chart.js.
- Feedback/modal: SweetAlert2.
- Comando administrativo do Master (CAD-REBUILD-01): Node + `pg` 8.16.3, sem servidor/endpoint integrado ao frontend; [contrato de reconstrução](./cadastro-mestre-reconstrucao.md).
- Testes transacionais locais: PostgreSQL em memória com PGlite 0.3.14, sem conexão Supabase ou carga real. Essas dependências são somente de desenvolvimento/administração, sem mudança das bibliotecas CDN.

## Decisão arquitetural
Não existe backend próprio no repositório; a camada de integração está em `src/services/api.js`.
