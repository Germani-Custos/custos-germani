# CAD-EXEC-WEB-01 — Execução explícita do Cadastro Mestre (09/10/2026)

Preparação posterior **CAD-ENV-01**: build público isolado em dist e GET verificar=1 autenticado disponível com flag false. Sem execução/novo parser; guardas de dependência compartilhadas com executor. Revisão final de 09/10: Production READY main `04a2412`, flag false e usuário informou `DIAGNOSTICO_OK`; deploy/configuração/bucket não estão mais pendentes. Quantidade final depende do novo universo aprovado, sem valor 860 fixo no código. [Evidência atual, limites, ambiente e execução passo a passo](./cadastro-mestre-preparacao-ambiente.md#revisão-final-somente-leitura-09102026). As menções abaixo à ausência de deploy/carga descrevem a entrega original.

## Arquitetura e alcance

XLS/XLSX/XLSM → adapter/motores existentes → Preview → aprovação integral → **Executar reconstrução…** → confirmação digitada → função Node Vercel → executor PostgreSQL existente → confirmação do lote.

A aprovação anterior era local. O novo botão é separado de **Baixar revisão (sem gravar)**. Selecionar arquivo, aprovar propostas ou baixar revisão continuam sem DML. Tabela/edição manual operacional continuam independentes; sua contagem não representa o Master ERP.

Nenhuma carga real, deploy, configuração de credenciais, bucket/lote novo ou alteração de schema/migration/RLS nesta entrega. A divergência de fingerprint de `dicionario_produtos` permanece investigação separada.

## Responsabilidades

- `view/ui-cadastro-mestre-preview.js`: contagens antes/depois/inserções/atualizações/remoções; habilita execução após aprovação integral e disponibilidade administrativa. Segunda janela exige digitar `RECONSTRUIR <quantidade final>`. Cancelar não envia execução; download parcial permanece local.
- `src/services/api.js` → `src/services/cadastro-mestre-execution.js`: sessão de usuário e HTTP same-origin. Contexto continua SELECT paginado via `supabase.from()`. Sem SQL/RPC/credencial administrativa no browser.
- `api/reconstruir-cadastro-mestre.js` → `scripts/lib/cadastro-mestre-web.mjs`: função Node com autorização server-side, origem exata, limites de payload e erros sanitizados. O modelo público da função de documentação não é usado nesta operação.
- `core/cadastro-mestre-reconstruction-engine.js` e `scripts/lib/cadastro-mestre-reconstruction.mjs`: única lógica de reconstrução, compartilhada com CLI. Não há segundo parser/filtro/reconciliador.

## Configuração

Execução desabilitada por padrão. Configurar somente no servidor Vercel, nunca em `runtime-config.js`, código versionado ou variável `VITE_*`:

```env
CADASTRO_MESTRE_EXECUTION_ENABLED=false
CADASTRO_MESTRE_EXECUTION_ADMIN_IDS=<UUIDs Supabase Auth separados por vírgula>
CADASTRO_MESTRE_APP_ORIGIN=https://<dominio-da-aplicacao>
CADASTRO_MESTRE_DATABASE_URL=<conexao administrativa PostgreSQL do mesmo projeto>
CADASTRO_MESTRE_DATABASE_CA=<CA PEM quando necessária>
CADASTRO_MESTRE_STORAGE_SECRET_KEY=<chave secreta server-side para Storage>
CADASTRO_MESTRE_SNAPSHOT_BUCKET=<bucket privado existente>
```

As configurações públicas existentes `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` identificam o projeto para verificar o token pelo Auth. `getUser(token)` consulta o servidor; não confiar em autor/identidade/role do payload ou `user_metadata`. Anônimos e IDs fora da allowlist são recusados. Autor do lote deriva do ID autenticado.

Verificar domínio exato sem barra final, IDs autorizados, projeto da conexão e TLS antes de habilitar `CADASTRO_MESTRE_EXECUTION_ENABLED=true`. Aceita conexão direta ou pooler oficial cujo usuário pertence ao project-ref. TLS exige certificado válido, com CA opcional; não desabilitar verificação. Falta de visão integral/permissões/RLS/locks bloqueia; nenhuma concessão automática de privilégios.

Bucket previamente existente e privado, sem policies públicas de leitura/escrita. A função verifica `public=false`; revisão das policies/retensão cabe à operação. Não cria bucket/policy. Deploy Preview deve usar banco de teste separado ou manter execução desabilitada, sem acesso destrutivo a produção.

`pg`, SheetJS e `@supabase/supabase-js` são dependencies fixadas da função Node, sem alteração do CDN frontend. Node >=22 é obrigatório pelo SDK e declarado em package.json; CI já usa Node 22 e validação local usa Node 24. PGlite continua devDependency. Máximo configurado: 300 segundos; verificar suporte do plano/runtime antes de publicar. Nenhuma tarefa em background após resposta.

## Transporte e revalidação

Cliente envia bytes originais, nome/aba, decisões por ID, SHA256 do manifesto integral, confirmação `RECONSTRUIR_MASTER:<hash>` e lote `CAD_UI_<UUID>`. Não envia manifesto duplicado, conexão nem autor. Gzip é transporte, sem conversão: servidor recupera os mesmos bytes ERP.

Limites: original 16 MiB e JSON enviado 4 MiB, abaixo dos 4,5 MB da Vercel. Sem CompressionStream, enviar raw com o mesmo limite de payload. Excedente exige CLI documentado, sem conversão manual. Nenhum upload ao abrir Preview.

A função lê contexto integral em transação de leitura UTC com visão administrativa, recalcula manifesto pelo adapter e compara hash. Contrato central rejeita decisões ausentes/duplicadas/rejeitadas/pendentes, erros e universo vazio. Executor faz segunda revalidação integral sob locks, cobrindo mudança entre leitura inicial e execução. Divergência exige novo Preview.

## Snapshot e atomicidade

Executor mantém BEGIN, locks Master/log e sete tabelas protegidas, guardas de dependência/repetição, snapshot integral/hash no JSONB, SAVEPOINT, DML somente Master/log, provas finais e COMMIT. Vazios ERP de pertencentes preservam valores; filtros não mudaram.

Callback web grava JSON privado em `<lote>/<hash_manifesto>.json`, com `upsert:false`; baixa e confere SHA256. Só então pode haver alteração de produtos. Referência `storage://<bucket>/<objeto>` fica no log existente. `/tmp` não é cópia durável na Vercel. CLI mantém `wx`/`fsync`; única extensão do executor registra a referência opcional do callback antes do SAVEPOINT.

Falha anterior ao SAVEPOINT reverte log e não altera Master. Erro DML/prova posterior reverte Master inteiro e registra `falhou`. Objeto privado já salvo permanece auditável em rollback. Nenhuma limpeza automática ou alteração operacional. Falha da auditoria/COMMIT conserva regras centrais de resultado incerto.

## API e recuperação

- `GET /api/reconstruir-cadastro-mestre`: disponibilidade autenticada/autorizada, sem conexão ao banco ou lote.
- `POST /api/reconstruir-cadastro-mestre`: ação explícita; sucesso após COMMIT/provas. Retorna lote/contagens/referência, nunca snapshot integral ou credenciais.
- `GET /api/reconstruir-cadastro-mestre?lote=CAD_UI_<UUID>`: somente SELECT do resultado daquele contrato.

Resposta perdida/inválida ou erro exibe **Reconstrução não confirmada**, identificador e consulta do lote. Sem retry automático. Lote ausente pode significar validação/rollback inicial ou transação em curso; não autoriza repetição. `falhou` confirma reversão; `concluido` confirma provas daquela execução. Guardar identificador/revisão/original e consultar antes de nova tentativa.

Arquivo informado: 6.230 linhas → 860 válidos, 853 existentes, 7 inserções, 4.853 remoções; esperado **5.706 − 4.853 + 7 = 860**. Atualizações dependem dos campos. Contagens só serão fato após execução futura; esta implementação não muda produção.

Nenhum DML em Custos/OP/dicionário operacional/mapa/categorias. `data_referencia` continua competência e `criado_em` importação dos fatos. Fingerprint operacional divergente não é corrigido; provas usam o estado imediatamente anterior à execução.

## Referências e verificação

[Contrato central](./cadastro-mestre-reconstrucao.md), [Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [Storage sem sobrescrita](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [limites Vercel](https://vercel.com/docs/functions/limitations).

Testes: UI/API/fetch/Auth/Storage mockados e executor real com PostgreSQL local em memória (PGlite). Três formatos, aprovação/cancelamento, autorização/configuração/origem/limites, hash/decisões/contexto, snapshot/proveniência, falha de persistência/conferência e erro SQL com rollback/consulta. Sem banco/credencial de produção.

[Resultados e lista completa de arquivos](../auditoria/cadastro-mestre-execucao-web-validacao.md): 323 testes/28 arquivos passaram; lint/typecheck/diff check passaram, sem commit ou execução real.
