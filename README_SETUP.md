# Setup de Ambiente (Frontend com runtime-config.js)

## CAD-ENV-01 — configuração e diagnóstico sem escrita

Build agora usa `scripts/build-web.mjs`/`dist`, sem publicar api/scripts/.env/dependências. Template administrativo preenchido somente com UUID autorizado, origem e nome de bucket recomendado; segredos continuam vazios e flag false. [Guia de deploy, bucket privado, diagnóstico e primeira execução](docs/arquitetura/cadastro-mestre-preparacao-ambiente.md). O ambiente na nuvem ainda depende de configuração; nenhum deploy/reconstrução nesta preparação.

## CAD-EXEC-WEB-01 — configuração exclusivamente server-side

A reconstrução pela aplicação usa função Node na Vercel e permanece desabilitada por padrão. [.env.example](.env.example) lista os nomes; [procedimento completo](docs/arquitetura/cadastro-mestre-execucao-web.md) explica Auth/allowlist, origem, conexão TLS do mesmo projeto e snapshot em bucket privado existente. Nunca publicar `CADASTRO_MESTRE_*` em runtime-config/variáveis VITE ou código. Não houve deploy/configuração/carga real nesta entrega. Não habilitar acesso destrutivo a produção em Preview de deploy.

## Variáveis obrigatórias

Crie um arquivo `.env` local com:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
VITE_ENABLE_VERBOSE_LOGS=false
```

## Regras operacionais

- A fonte principal no browser estático é `runtime-config.js` com `window.__ENV__`.

- Em deploy estático/browser clássico, publique `runtime-config.js` na raiz com `window.__ENV__` e as chaves `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_VERBOSE_LOGS`.
- `runtime-config.js` deve ser carregado antes do bootstrap em `index.html`.
- Em ambiente com bundler Vite, `import.meta.env` segue aceito apenas como fallback de compatibilidade.
- Se o runtime não permitir objeto global, o frontend também aceita fallback via `<meta name="VITE_SUPABASE_URL" ...>` e `<meta name="VITE_SUPABASE_ANON_KEY" ...>` no `index.html` servido.
- Nunca commitar `.env` com credenciais reais.
- Em Vercel (Development/Preview/Production), configure as mesmas chaves no painel de Environment Variables.

## Vercel (escopos obrigatórios)

No projeto da Vercel, configure as três variáveis nos escopos:

- Development
- Preview
- Production

Sem isso, o bundle frontend pode compilar com ambiente incompleto e abrir a tela de erro de configuração no bootstrap.

## Bootstrap

No bootstrap do frontend, se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estiver ausente, a aplicação renderiza uma tela amigável de configuração em vez de quebrar com stacktrace bruto.

## Validação local (quando o frontend estiver corretamente montado)

Execute na raiz que contém `package.json`:

```bash
npm run dev
npm run build
```

Se aparecer erro de `package.json` ausente, o workspace atual não montou a raiz do frontend.



## Criar usuário master (Supabase Auth)

Para criar um usuário master operacional sem salvar credenciais no código-fonte:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY \
node scripts/create-master-user.mjs --login=Pedrokurosaki --password=kurosaki123
```

Notas:
- O script usa `SUPABASE_SERVICE_ROLE_KEY` apenas em runtime local/CI e não persiste a chave em arquivos do repositório.
- Se `--login` não tiver `@`, o script cria o e-mail sintético `<login>@master.local` para autenticação via Supabase Auth.
- O script é idempotente: se o usuário já existir, ele não cria duplicado.

## Diagnóstico rápido de bootstrap

Quando faltar configuração obrigatória, a mensagem inclui as fontes avaliadas (`window.__ENV__/__RUNTIME_CONFIG__`, `import.meta.env`, `meta[name=VITE_*]`) para acelerar investigação operacional em produção.


## Geração automática do runtime-config (Vercel)

- O build `scripts/build-web.mjs` chama `scripts/generate-runtime-config.mjs` em `dist`; só esse diretório é publicado como frontend pela Vercel. Funções em `/api` são empacotadas separadamente.
- Esse script valida `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de deploy e gera `runtime-config.js` com `window.__ENV__` preenchido.
- Se faltar variável obrigatória, o build falha cedo para evitar publicação de frontend inválido.
- O browser **não usa** `process.env`; `process.env` é usado apenas no build/deploy para materializar `runtime-config.js`.


## Checklist pós-setup investigativo

Após configurar ambiente e autenticação, valide também o fluxo de exportação operacional:

1. Rode uma análise com período preenchido (`data_referencia`) e dados importados com pelo menos dois eventos (`criado_em`).
2. Exporte XLSX e confirme as abas `Contexto` e `Fila Investigativa`.
3. Sem ordenação manual na UI, confirme ordenação automática por criticidade/regime/magnitude/reincidência/instabilidade.
4. Confirme no nome do arquivo o período analisado para rastreabilidade operacional.

> Importante: use `data_referencia` para competência da análise e `criado_em` para eventos de importação; ambos devem estar explícitos no contexto exportado.
