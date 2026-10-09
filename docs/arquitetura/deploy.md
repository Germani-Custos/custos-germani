# Capítulo 16 — Deploy

## Modelo atual
- Publicação estática do frontend em `dist` por allowlist, com funções Node em `/api` empacotadas separadamente.
- Supabase como backend gerenciado.

## Checklist mínimo
1. Publicar arquivos estáticos (`index.html`, `assets`, `core`, `view`, `src`).
2. Validar acesso ao Supabase.
3. Testar importação e relatório com filtros.


## Variáveis de ambiente (Vercel)

Definir em Development, Preview e Production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_VERBOSE_LOGS`

O frontend lê configurações por estratégia aderente ao runtime real do deploy: `runtime-config.js` (`window.__ENV__`) como fonte principal, com fallback `window.__RUNTIME_CONFIG__`, `import.meta.env` e fallback final via `<meta name="VITE_*">`.


## Geração de runtime-config em Vercel

- Arquivo `vercel.json` define `buildCommand: node scripts/build-web.mjs` e `outputDirectory: dist`.
- O build copia apenas frontend/docs/assets e chama o gerador de `runtime-config.js` dentro de dist, com somente o trio público. Não publica api/scripts/.env/SQL/dependências/arquivo de banco.
- Em caso de ausência de `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY`, o build falha para bloquear deploy inconsistente.
- Isso garante previsibilidade para frontend estático sem dependência de `process.env` no browser.

## Execução administrativa — CAD-ENV-01 (09/10/2026)

[Procedimento de preparação, diagnóstico sem escrita e primeira execução](./cadastro-mestre-preparacao-ambiente.md). Node >=22, função 300 s, env privada somente Production, allowlist Auth e bucket privado previamente criado. Flag false durante preparação. CLI autenticada publica checkout sem commit; redeploy Git antigo não inclui alterações locais. Nenhuma reconstrução, configuração na nuvem ou escrita de produção foi feita nesta entrega.
