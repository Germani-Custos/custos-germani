# Autenticação e Gate Operacional

## Estado do checkout — 16/10/2026

`view/ui-controller.js` chama `requireLogin()` antes de carregar masters/metadados e OP. Esta é a ordem específica desse fluxo; não constitui prova de que todo I/O de outros controllers aguarda o gate. Sessão existente identifica o usuário; sem usuário, a sobreposição de login solicita credenciais e chama `api.signIn`, que usa `supabase.auth.signInWithPassword`. Logout encerra sessão e volta ao gate. Não existe `autoAuthenticate`.

A janela de acesso público registrada em 14/05 é [histórica](../HISTORIA_DO_PROJETO_KUSTOS.md). A data de reativação não foi determinada nesta revisão; login no checkout não comprova políticas RLS nem publicação remota.

## Configuração e administração

`src/config/app-config.js` resolve runtime-config (`window.__ENV__`/`window.__RUNTIME_CONFIG__`), depois `import.meta.env` e meta tags. URL/chave públicas são obrigatórias; credenciais nunca ficam nos módulos. [Setup](../../README_SETUP.md).

`scripts/create-master-user.mjs` permite criação administrativa separada: recebe `--login`/`--password`, usa URL do projeto e `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no processo autorizado, verifica usuário existente e converte login sem @ para `<login>@master.local`. Não há senha padrão a copiar da documentação. Não executar para testar esta revisão.

## Fronteiras de autorização

- O login controla o fluxo do frontend; RLS/permissões do banco precisam de verificação própria conforme modelo de acesso aprovado. Não presumir isolamento por usuário/tenant.
- Reconstrução usa função Node com Auth `getUser`, allowlist UUID, origem exata e flag server-side. [Contrato](cadastro-mestre-execucao-web.md).
- `api/save-doc.js` não valida sessão no handler atual; allowlist de arquivos/limite de tamanho não equivalem à autorização da reconstrução. Não mudar essa decisão por reorganização documental.

Acesso a tabelas no frontend continua por `supabase.from()`, sem RPC/SQL bruto; operações Auth usam o SDK Auth existente. Nenhuma política ou configuração remota foi consultada/alterada nesta revisão.
