# Stack Tecnológico

- Frontend: HTML/CSS/JavaScript ES Modules, sem bundler de aplicação.
- Banco/API/Auth/Realtime: Supabase, com fachada frontend em `src/services/api.js`.
- CDN frontend: SheetJS 0.20.3, Chart.js 4.4.9, SweetAlert2 11.22.2, marked 12.0.2, DOMPurify 3.1.6 e RemixIcon 3.5.0, conforme `index.html` inspecionado em 16/10/2026. Versão fixada não comprova SRI; a divergência de SEC-05 está na [auditoria documental](../auditoria/reorganizacao-documental.md).
- Funções Vercel `/api`: gravação documental e reconstrução administrativa autorizada; não há servidor Express persistente.
- Node >=22: ferramentas, build, CLI e funções. Dependencies server-side fixadas: `pg` 8.16.3, `@supabase/supabase-js` 2.117.3 e SheetJS 0.20.3; não são expostas como código administrativo do frontend.
- Desenvolvimento: ESLint, TypeScript para checkJs/JSDoc, Vitest e PGlite 0.3.14 para PostgreSQL local em memória.
- Publicação: frontend `dist` por allowlist; funções empacotadas separadamente. [Deploy](deploy.md).

O runtime frontend estático é escolha arquitetural. Dependências do servidor e ferramentas locais não introduzem bundler nem executor administrativo no browser. [Manual Técnico](../manuais/manual-tecnico.md).
