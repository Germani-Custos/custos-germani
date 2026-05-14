# Autenticação e Gate Operacional

## Situação atual (maio/2026)

- Não existe mais `autoAuthenticate`.
- Em 14/05/2026 o login obrigatório foi temporariamente removido para acesso aberto de investigação.
- O bootstrap define sessão visual como `acesso público` e libera carregamento sem prompt.

## Configuração

As credenciais de conexão não ficam no código-fonte dos módulos de serviço.

- `src/config/app-config.js` centraliza leitura de `import.meta.env`
- `.env` e `.env.example` definem contrato de variáveis por ambiente (`VITE_*`)
- bootstrap captura falha de configuração e mostra tela operacional amigável

## Compatibilidade com RLS

A aplicação usa somente `supabase.from()` para I/O. Isso mantém compatibilidade direta com políticas RLS sem SQL bruto no frontend.

Ao habilitar RLS no Supabase, as permissões passam a ser controladas por usuário/sessão sem refatoração estrutural da camada de acesso.
