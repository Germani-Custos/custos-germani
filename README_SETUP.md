# Setup de Ambiente — Kustos Germani

Guia do checkout revisado em **16/10/2026**. Frontend estático com runtime-config gerado; funções administrativas dependem do ambiente Vercel. Não confirma configuração de produção e não autoriza deploy, criação de usuário ou reconstrução.

## Requisitos e variáveis públicas

Node >=22 para ferramentas/build/funções e servidor HTTP estático para desenvolvimento do frontend. Instale dependências pelo lockfile com `npm ci`.

Use os nomes de [.env.example](.env.example) como referência. `.env` não deve ser versionado com valores reais; copiar esse arquivo sozinho não carrega variáveis no processo. O gerador usa `process.env` e requer URL/chave públicas:

```powershell
$env:VITE_SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'
$env:VITE_SUPABASE_ANON_KEY = 'SUA_CHAVE_PUBLICA'
$env:VITE_ENABLE_VERBOSE_LOGS = 'false'
node scripts/generate-runtime-config.mjs
```

Preencha valores autorizados localmente; nunca use service-role/secret como chave pública. O comando gera `runtime-config.js` na raiz. Sirva a raiz por HTTP com ferramenta disponível no ambiente; não abra `index.html` por file://. O servidor estático não executa funções `/api`.

## Bootstrap e fontes de configuração

`runtime-config.js` carrega antes do bootstrap e disponibiliza `window.__ENV__`. Ordem de resolução: `window.__ENV__`/`window.__RUNTIME_CONFIG__` → `import.meta.env` → meta tags `VITE_*`. Browser não lê `process.env` nem `.env` diretamente. Fallbacks não introduzem dependência de Vite.

Falta de URL/chave obrigatória produz tela operacional de configuração com as fontes avaliadas. Sem sessão ativa, o fluxo principal exige login antes de masters/metadados e OP; [Autenticação](docs/arquitetura/autenticacao.md) descreve o fluxo. Isso não comprova configuração RLS remota.

## Comandos disponíveis

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Não há script `dev` em `package.json`. Typecheck usa `tsc --noEmit -p jsconfig.json`. Build gera `dist` por allowlist e runtime-config público dentro dela, sem publicar. Falta de variável obrigatória bloqueia o build. Testes/lint/typecheck são para mudanças de código; revisão somente documental usa verificação de links/referências e `git diff --check`.

## Vercel e fronteira administrativa

`vercel.json` usa `node scripts/build-web.mjs` e output `dist`. Configurar as variáveis públicas nos escopos necessários (Development/Preview/Production). `VITE_ENABLE_VERBOSE_LOGS` é opcional e deve permanecer false em produção salvo diagnóstico controlado. Funções em `/api` são empacotadas separadamente; somente hospedar `dist` não as publica.

A reconstrução exige configuração server-side `CADASTRO_MESTRE_*`, Auth/allowlist/origem/TLS e bucket privado existente. Flag é desabilitada por padrão. Nunca copiar esses valores para runtime-config, variáveis VITE, código ou chat. Preview de deploy deve usar ambiente isolado ou execução desabilitada, sem acesso destrutivo à produção. Procedimento: [preparação e diagnóstico](docs/arquitetura/cadastro-mestre-preparacao-ambiente.md) e [execução web](docs/arquitetura/cadastro-mestre-execucao-web.md). Esses guias preservam também evidências históricas; conferir seu escopo/data.

## Usuário administrativo e conferência

Criação de usuário é operação administrativa separada; [Autenticação](docs/arquitetura/autenticacao.md) aponta o script e seu contrato. Chave administrativa vive somente no processo autorizado; não documentar senhas literais de exemplo.

Após setup autorizado, conferir acesso e leitura, recorte por competência, deltas por importação, abas Contexto/Fila Investigativa e seleção de campos. Não importar, executar reconstrução ou criar dados apenas para testar configuração em produção. [Manual Técnico](docs/manuais/manual-tecnico.md) e [Manual de Operação](docs/manuais/manual-operacao.md) detalham os fluxos.
