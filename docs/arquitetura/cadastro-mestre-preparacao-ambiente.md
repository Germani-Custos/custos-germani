# CAD-ENV-01 — Preparação da execução web (09/10/2026)

## CAD-DIAG-01 — diagnóstico de etapas sem escrita

Atualização posterior à preparação inicial: o administrador informou redeploy Production e criação do bucket privado. GET autenticado verificar=1 retorna 409 com mensagem genérica de COMMIT; o handler antigo suprime o erro original também no caminho de leitura. Isso não comprova execução nem identifica TLS/senha/bucket como causa.

Após autorização humana específica, publicado este checkout sem commit/env/DML às 16:37 BRT: deployment `B2mVXerHzJjbRjaYHSjZMm3TWPvF`, Production READY e alias custos-germani.vercel.app. GET público instrumentado retorna 401 na autenticação, configuração OK e execucao_habilitada=false; GET disponibilidade normal continua 503. O metadata Git continua main/e27e119, mas upload CLI inclui mudanças locais instrumentadas. Confirmação da falha original depende de repetir GET com sessão autorizada. 355 testes locais/lint/typecheck/diff check passaram. CLI autenticada/vinculada ao projeto existente; nenhum segredo administrativo foi recuperado ou publicado. Arquivo temporário .env.local gerado pela vinculação foi removido; .gitignore preservado.

O GET retorna `diagnostico` com `etapa`, `codigo`, `codigo_original` (somente allowlist), `mensagem` fixa, mapa `etapas` e `execucao_realizada:false`. Distingue configuração, conexão PostgreSQL, validação TLS do driver, acesso ao Storage, bucket privado existente, autenticação getUser e autorização UUID; inclui origem/dependências/leitura/permissões/policies. Etapas posteriores à falha ficam `NAO_VERIFICADO`. Código desconhecido resulta em `NAO_CLASSIFICADO`, nunca em mensagem bruta. TLS é marcado OK somente após conexão validada com rejectUnauthorized=true. Um erro TLS na conexão marca conexão `NAO_CONCLUIDO`.

Consulta de bucket usa apenas getBucket; falha HTTP 401/403 identifica Storage e 404 identifica bucket. Não valida capacidade de upload. Banco mantém BEGIN READ ONLY/SELECT/SET LOCAL/ROLLBACK e encerra conexão, sem chamar executor, locks de escrita, lote ou snapshot. Se ROLLBACK também falhar, preserva o erro inicial da leitura.

Após publicação autorizada do checkout instrumentado (redeploy do commit antigo não inclui mudança local), manter EXECUTION_ENABLED=false e, no console da aplicação autenticada, executar somente:

```js
try {
  const { api } = await import('/src/services/api.js');
  const r = await api.verificarAmbienteReconstrucaoCadastroMestre();
  console.log(JSON.stringify({ status: 200, diagnostico: r.diagnostico, execucao_habilitada: r.execucao_habilitada }));
} catch (e) {
  console.log(JSON.stringify({ status: e.status, diagnostico: e.diagnostico }));
}
```

Enviar somente esse JSON. Não imprimir sessão, token, error bruto ou configuração. Sem `diagnostico`, conferir se novo arquivo cliente/função foi publicado e recarregar a aplicação. A consulta normal de disponibilidade segue 503 com flag false; o botão desabilitado não indica falha desse GET separado. Não habilitar nem enviar POST para diagnosticar. Testes locais de erros simulados não comprovam a causa em Production.

## Estado verificado, sem reconstrução

Preparação local concluída; ambiente real ainda **não pronto**. GET público de `/api/reconstruir-cadastro-mestre` retornou **404**. Não há `.vercel/project.json`, autenticação CLI ou variáveis administrativas no processo local. O painel aberto da Vercel não pôde ser inspecionado: duas tentativas falharam por timeout do controle do navegador. Isso não demonstra ausência de variáveis no painel; sua configuração permanece não verificada.

SELECT no projeto `umpebdovrazzrdndhigc`: Master **5.706**, Custos **1.370**, OP **704**, dimensão operacional **6.113**, mapa **292**. Somente lote 1 concluído, sem contrato RECONSTRUCAO_UNIVERSO_V1; Storage sem buckets/policies. O e-mail indicado pelo usuário foi localizado no Auth, confirmado e não anônimo. Seu UUID está no template `.env.example`, sem credencial. Não criar outros administradores por inferência.

Nenhum deploy, habilitação, bucket, snapshot, lote, DML, migration ou RPC foi realizado. Consultas foram SELECT; validação de execução usa mocks e PostgreSQL local em memória. Não tratar a expectativa de 860 produtos como estado do banco.

## O que está preparado no código

- `vercel.json`: framework Other (`null`), build `node scripts/build-web.mjs`, diretório público `dist`, função Node em `api/reconstruir-cadastro-mestre.js`, duração máxima 300 s. Node >=22 e dependências de servidor permanecem no pacote raiz.
- Build por allowlist: index, assets, módulos frontend e documentação Markdown. Exclui `api`, `scripts`, executor administrativo, SQL, testes, dependências, `.env`, pacote e `Banco de Dados.txt`. A função é empacotada separadamente pela Vercel a partir de `/api`; publicar apenas dist em hospedagem puramente estática não publica a função.
- `runtime-config.js` gerado **dentro de dist**, somente com três variáveis públicas. Build recusa `sb_secret_*`, JWT service_role como chave pública e valores administrativos identificados em arquivos publicados. Não modifica o runtime-config local ao construir.
- `GET ?verificar=1`: autenticação getUser + allowlist, bucket privado existente, TLS, contexto administrativo completo, guardas centrais de dependências, permissões de SELECT/DML/locks/sequence e ausência de policies em `storage.objects`. Todas as consultas PostgreSQL estão em `BEGIN READ ONLY`/`ROLLBACK`. Não concede privilégios, faz locks, chama executor, cria lote, faz upload/download ou salva snapshot. Havendo policies, falha fechada para revisão explícita, sem tentar interpretar expressões arbitrárias.
- POST de execução continua desabilitado enquanto a flag não for exatamente `true`. O parâmetro verificar em POST é recusado; diagnóstico nunca oferece caminho alternativo de execução. GET de lote continua disponível com flag desabilitada para recuperação.

O diagnóstico bem-sucedido prova acesso e requisitos de infraestrutura naquele momento. **Não prova capacidade real de upload nem rollback em produção**: estes são cobertos por testes locais, pois seu teste real escreveria dados e está proibido nesta tarefa. Tampouco substitui aprovação/hash/revalidação/locks na futura execução.

## Configurar Vercel sem executar

1. No projeto `custos-germani`, manter Root Directory na raiz do repositório, framework Other, build/output aderentes ao vercel.json, Node 22/24 suportado e duração 300 s compatível com o plano. Manter logs/source do deploy privados.
2. Em **Production**, cadastrar os nomes abaixo no servidor. Usar armazenamento sensível da Vercel para credenciais. Não expor valores em terminal, logs, tickets, arquivos versionados ou chat. Preview/Development devem usar ambiente isolado; deixar flag false e não copiar credenciais destrutivas de produção.
3. Variáveis públicas existentes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_VERBOSE_LOGS=false`. A chave pública deve ser anon/publishable, nunca service_role/secret.
4. Variáveis privadas: `CADASTRO_MESTRE_EXECUTION_ENABLED=false`; `CADASTRO_MESTRE_EXECUTION_ADMIN_IDS` com **somente o UUID do usuário indicado** (template); `CADASTRO_MESTRE_APP_ORIGIN=https://custos-germani.vercel.app`; `CADASTRO_MESTRE_DATABASE_URL`; `CADASTRO_MESTRE_DATABASE_CA` opcional; `CADASTRO_MESTRE_STORAGE_SECRET_KEY`; `CADASTRO_MESTRE_SNAPSHOT_BUCKET=cadastro-mestre-snapshots`.
5. Conexão PostgreSQL administrativa do **mesmo projeto**, preferencialmente pooler session para conectividade IPv4; copiar de Connect no Supabase, sem inventar hostname/usuário/senha. TLS sempre verificado; CA PEM somente quando necessária. Conta precisa enxergar o Master integral, acessar catálogos e tabelas protegidas, usar locks, alterar somente Master/log pelo executor e usar a sequence do log. Nenhuma role/policy/schema é criada automaticamente. Ausência de permissões exige avaliação administrativa separada.
6. Chave de Storage secret/service_role do mesmo projeto, somente no servidor. Não colocar prefixo VITE, não criar URL assinada pública nem policy para acesso frontend ao snapshot.
7. Publicar **este checkout**, incluindo alterações ainda não commitadas, pela CLI autenticada/vinculada (`vercel link`, `vercel --prod`), após instalar a CLI oficial se necessário. Não fazer commit nesta tarefa. Redeploy do commit antigo pelo painel **não inclui as alterações locais**. Conferir a função na lista de Functions e seu import graph/dependências no build. Não promover um Preview que utilize configurações de produção indevidas.
8. Alterações de env exigem novo deployment para terem efeito. Manter flag false durante todos os passos de preparação.

## Criar bucket privado — configuração manual pendente

No Supabase do mesmo projeto: Storage → New bucket → `cadastro-mestre-snapshots`, **Public desmarcado**, MIME permitido `application/json`, limite de arquivo recomendado **50 MiB** dentro dos limites do plano. Sem policy SELECT/INSERT/UPDATE/DELETE para anon/authenticated em storage.objects; acesso da função somente pela chave administrativa. Nenhum upload de teste ou snapshot de produção durante a preparação.

Preservar objetos para auditoria; não configurar expurgo automático sem política de retenção aprovada. Caminho futuro `<CAD_UI_UUID>/<hash_manifesto>.json`, `upsert:false`: não sobrescrever nem apagar em erro. Bucket é criado uma vez pelo administrador, nunca pelo handler. Se tamanho/quota/permissão impedir upload, o executor aborta antes de alterar produtos.

## Demonstrar prontidão sem reconstruir

1. Rodar testes/lint/typecheck/diff check locais. Build com valores públicos de teste e canários administrativos deve manter segredos fora de dist. Não é necessário colocar segredo real no computador para testar o build.
2. Após deployment/configuração de bucket, abrir a aplicação no domínio exato e entrar com o usuário autorizado. No console do navegador, executar **apenas**:

   ```js
   const { api } = await import('/src/services/api.js');
   await api.verificarAmbienteReconstrucaoCadastroMestre();
   ```

   Esse método faz somente GET com a sessão existente; não copiar/imprimir token. Esperar `pronto_para_habilitar:true`, `execucao_habilitada:false`, `execucao_realizada:false`, Master 5706 e verificações de bucket/permissões/dependências positivas. Campos upload/rollback produção permanecem false por desenho. Falha exige resolver a causa sem habilitar a execução.
3. Sem login, GET diagnóstico deve retornar 401 após configuração completa. Com usuário válido fora da allowlist, deve retornar 403. Não criar usuário só para testar; usar conta de teste já autorizada em ambiente isolado. Testes automatizados já cobrem ambas recusas.
4. Conferir que `/scripts/lib/cadastro-mestre-web.mjs`, `/scripts/lib/cadastro-mestre-reconstruction.mjs`, `/.env`, `/package.json` e `/Banco%20de%20Dados.txt` retornam 404, e que runtime-config contém apenas o trio público. Conferir o artefato Functions separadamente. GET disponibilidade normal permanece 503 enquanto flag false.
5. Aprovação parcial/hash/contexto inválido são recusados nos testes locais do mesmo handler/executor. **Não enviar POST de execução contra produção como teste**, mesmo com payload presumivelmente inválido. Snapshot/upload/conferência/erro SQL e rollback são demonstrados em PGlite/Storage mockado, sem produção.
6. Repetir SELECT de quantidades/fingerprints e lote/buckets/objetos, com o mesmo algoritmo de ordenação, para provar ausência de alteração de produtos/fatos/log/snapshots. Criação futura do bucket muda só a configuração de Storage e deve ser registrada separadamente. Não concluir prontidão somente com HTTP 200 de disponibilidade; exigir diagnóstico e inspeção do build/deploy.

## Primeira execução real — etapa futura, fora desta tarefa

1. Confirmar prontidão acima, autorização de negócio, original ERP e janela sem importações concorrentes. Registrar por leitura estado/fingerprints de Master, Custos, OP, operacional, mapa e categorias. Guardar o XLS original e sua revisão.
2. Quando a execução real estiver autorizada, mudar flag para true no servidor e fazer novo deployment. Isso não executa carga; somente habilita o botão para a allowlist.
3. Selecionar o XLS original de 6.230 linhas. Gerar **novo** Preview contra o estado atual. Esperado, se contexto igual: 860 válidos, 853 existentes, 7 novos, 4.853 remoções; **5706 − 4853 + 7 = 860**. Se divergir, investigar antes de aprovar. Campo ERP vazio preserva valor de quem permanece; filtros e Agrup. Prod. continuam os mesmos.
4. Revisar todas as operações, incluindo remoções, aprovar integralmente e baixar revisão auditável. Aprovar/download ainda não executam. Clicar **Executar reconstrução…**, conferir contagens e digitar `RECONSTRUIR 860` na segunda confirmação somente se esse for o resultado atual aprovado.
5. Uma única requisição entrega original/aba/decisões/hash ao servidor. Servidor verifica sessão/allowlist/origem, reconstitui manifesto com contexto integral, exige hash e aprovação exatos. Executor central repete validação sob locks, cria log processando/snapshot anterior na transação, salva JSON independente privado e confere download/hash **antes de alterar produtos**. Somente então INSERT/UPDATE/DELETE no Master, provas do universo e fingerprints protegidos, log concluído e COMMIT. Nenhum produto operacional/fato/mapa é criado/alterado/apagado.
6. Guardar lote `CAD_UI_...`, resposta e referência storage. Confirmar por leitura log concluído, universo exato de 860 e fingerprints protegidos imediatamente antes/depois. Confirmar objeto privado/snapshot anterior preservado e proveniência do lote; não reexecutar migration da Fase 3.4.
7. Em erro ou resposta perdida, consultar somente `api.consultarReconstrucaoCadastroMestre('<lote>')`. Sem retry automático. Lote ausente não prova inexecução se transação ainda estiver em curso. Falhou confirma rollback; COMMIT incerto exige investigação. Não apagar snapshot, corrigir operacional ou restaurar manualmente como parte desta tarefa.
8. Depois da conferência, retornar flag false e publicar novamente se essa for a política de execução pontual. Habilitar/desabilitar não altera dados.

`data_referencia` permanece competência e `criado_em` importação dos fatos; sem mudanças temporais, filtros, schema/RPC/SQL frontend.

Referências: [contrato web](./cadastro-mestre-execucao-web.md), [executor central](./cadastro-mestre-reconstrucao.md), [Vercel configuração](https://vercel.com/docs/project-configuration/vercel-json), [funções Node](https://vercel.com/docs/functions/runtimes/node-js), [bucket](https://supabase.com/docs/guides/storage/buckets/creating-buckets).
