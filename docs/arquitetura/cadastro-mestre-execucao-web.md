# CAD-EXEC-WEB-01 — Execução explícita do Cadastro Mestre (09/10/2026)

**Leitura documental em 16/10:** contrato web com extensão V2 indicada a seguir. As contagens 5.706 → 860, tentativa bloqueada e estados de deploy na seção de evidências pertencem a 09/10; [registros de 15/10](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026) confirmam reconstrução posterior. Não representam publicação da extensão de famílias nem status remoto de flag verificado hoje. Menções a categorias sem DML preservam a fase anterior; o alcance atual permite somente famílias aprovadas, conforme CAD-FAM-01.

Contrato vigente **CAD-FAM-01 (15/10/2026)**: famílias entram na aprovação/revalidação e na mesma transação/snapshot do Master, com proteção específica. Transporte V2 exige novo Preview e publicação compatível de UI/função. Implementação/validação sem escrita de produção ou deploy. [Decisões, guardas e provas](./cadastro-mestre-familias-erp.md). Referências abaixo à ausência de DML em categorias descrevem a fase anterior.

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

### CAD-PAYLOAD-01 — transporte sem o XLS bruto

O contrato anterior enviava o original em base64, eventualmente compactado, e rejeitava arquivos maiores que 16 MiB antes da compactação. O XLS informado (`cadastro mestre 8_10(1).xls`, 24.307.397 bytes) passou pelo Preview, mas foi bloqueado no cliente antes do POST: o identificador `CAD_UI` não chegou ao log ou ao Storage. O contrato abaixo substitui esse transporte na web sem alterar filtros/reconciliação ou simplesmente aumentar o limite do binário.

O adapter de Preview mantém os valores dos campos ERP necessários de **todas** as linhas não vazias, inclusive excluídas e inválidas. A representação compacta usa o contrato `CADASTRO_MESTRE_DADOS_V2`:

```js
{
  dados_execucao: {
    versao_transporte: 'CADASTRO_MESTRE_DADOS_V2',
    fonte: {
      arquivo, tipo_arquivo, aba, colunas, linha_cabecalho,
      hash_arquivo_sha256
    },
    linhas: [
      [linha, codigo_produto, descricao, tipo, descr_origem,
       origem_cod, familia_cod, agrupamento_erp_valor, familia_descricao_erp]
    ]
  },
  decisoes,
  hash_manifesto,
  confirmacao: 'RECONSTRUIR_MASTER:<hash_manifesto>',
  lote: 'CAD_UI_<UUID>'
}
```

`colunas` preserva o mapeamento canônico para diferenciar uma coluna opcional ausente de uma célula vazia. As tuplas conservam número da linha, identidade (inclusive zeros de formatação resolvidos pelo adapter), descrição, Tipo, Descr. (Origem), códigos ERP de origem/família e agrupamento ERP. Não incluem fórmulas, macros, formatação, colunas extras, contexto do banco, manifesto duplicado ou plano de DML do cliente. Enviar somente os 860 produtos já filtrados seria insuficiente para reproduzir contagens, erros, duplicidades e motivos de remoção; por isso os campos necessários das demais linhas também são enviados.

Antes da revisão local, SHA-256 da serialização determinística dos dados é incluído como `fonte.hash_dados_sha256` no manifesto. A aprovação e `hash_manifesto` vinculam assim dados, universo, contexto, propostas, preservações e remoções. O original continua necessário para gerar o Preview e seu hash local, mas não é lido novamente para o POST. A API envia JSON UTF-8, sem binário/base64/gzip, mantendo limite de **4 MiB**, abaixo do teto de requisição da Vercel. A verificação desse limite continua obrigatória; representações que o excedam são recusadas, sem upload alternativo ou truncamento silencioso.

Após flag habilitada, origem, sessão Auth e UUID da allowlist, o servidor valida contrato, tipos, campos permitidos e estrutura das tuplas; recalcula o hash dos dados; lê contexto integral em transação de leitura UTC; recalcula seu hash; e regenera o manifesto pelos mesmos motores de Preview/aprovação. Não aplica patches ou confia nas contagens/filtros do cliente. O hash integral deve coincidir com o aprovado, e todas as operações regeneradas precisam de decisão aprovada. Erros, universo vazio, decisões ausentes/duplicadas/rejeitadas/pendentes e divergência de dados/contexto/manifesto bloqueiam antes do snapshot/DML.

O executor central repete a regeneração com os mesmos dados contra o contexto relido **sob locks**, cobrindo alteração concorrente entre a leitura inicial e a execução. O snapshot, transação, SAVEPOINT, provas e rollback permanecem os existentes. CLI conserva o modo de revalidação pelo arquivo original; nenhum segundo importador é criado. Revisões geradas antes deste contrato devem ser substituídas por novo Preview/aprovação, inclusive no CLI que regenera o manifesto pelo mesmo adapter.

**Limite de confiança:** sem os bytes originais no servidor, `hash_arquivo_sha256` é proveniência declarada pelo navegador e não pode ser conferido independentemente contra o XLS. Os hashes verificam consistência com a aprovação e contexto; não são assinatura da origem ERP nem impedem um administrador autorizado de substituir conjuntamente dados e aprovação. A origem do ERP continua dependendo da revisão do usuário autorizado, sem alegar prova criptográfica do arquivo que não foi recebido.

## Snapshot e atomicidade

Executor mantém BEGIN, locks exclusivos Master/log/famílias e SHARE nas seis tabelas imutáveis, guardas de dependência/repetição, snapshot/hash no JSONB, SAVEPOINT, DML Master/log e somente famílias aprovadas, provas finais e COMMIT. Catálogo tem prova integral própria; snapshot inclui imagens anteriores apenas das famílias afetadas. Vazios ERP de pertencentes preservam valores; filtros não mudaram.

Callback web grava JSON privado em `<lote>/<hash_manifesto>.json`, com `upsert:false`; baixa e confere SHA256. Só então pode haver alteração de produtos. Referência `storage://<bucket>/<objeto>` fica no log existente. `/tmp` não é cópia durável na Vercel. CLI mantém `wx`/`fsync`; única extensão do executor registra a referência opcional do callback antes do SAVEPOINT.

Falha anterior ao SAVEPOINT reverte log e não altera Master. Erro DML/prova posterior reverte Master inteiro e registra `falhou`. Objeto privado já salvo permanece auditável em rollback. Nenhuma limpeza automática ou alteração operacional. Falha da auditoria/COMMIT conserva regras centrais de resultado incerto.

## API e recuperação

- `GET /api/reconstruir-cadastro-mestre`: disponibilidade autenticada/autorizada, sem conexão ao banco ou lote.
- `POST /api/reconstruir-cadastro-mestre`: ação explícita; sucesso após COMMIT/provas. Retorna lote/contagens/referência, nunca snapshot integral ou credenciais.
- `GET /api/reconstruir-cadastro-mestre?lote=CAD_UI_<UUID>`: somente SELECT do resultado daquele contrato.

Resposta perdida/inválida ou erro exibe **Reconstrução não confirmada**, identificador e consulta do lote. Sem retry automático. Lote ausente pode significar validação/rollback inicial ou transação em curso; não autoriza repetição. `falhou` confirma reversão; `concluido` confirma provas daquela execução. Guardar identificador/revisão/original e consultar antes de nova tentativa.

`CAD_UI_<UUID>` nasce localmente no navegador antes do envio; a existência desse texto não prova execução nem persistência. Só passa a existir no log persistente depois que o executor cria a auditoria e a transação correspondente faz COMMIT. Falha local de payload ou bloqueio anterior ao executor não cria lote; rollback anterior ao SAVEPOINT também pode deixá-lo ausente. Quando a tentativa já teve causa local comprovada, como o antigo limite do XLS, a consulta vazia é esperada; fora disso é necessário investigar, sem retry automático.

Arquivo informado: 6.230 linhas → 860 válidos, 853 existentes, 7 inserções, 4.853 remoções; esperado **5.706 − 4.853 + 7 = 860**. Atualizações dependem dos campos. Contagens só serão fato após execução futura; esta implementação não muda produção.

Na cópia local `cadastro mestre 8_10.xls`, de 24.307.397 bytes, foram confirmadas **517 preservações de campos**, dez UPDATEs e zero erros, além das contagens acima. Não confundir preservação de campos de pertencentes com produtos fora do universo: os 4.853 continuam sendo remoções propostas. Manifestos direto/compacto/servidor coincidiram. Dados compactos: 601.940 bytes; corpo local com 4.870 decisões: **885.146 bytes**, abaixo de 4 MiB. A cópia não possui `(1)` no nome; tamanho igual não comprova identidade com o arquivo originalmente informado. [Leitura, medição sem POST de produção e testes](../auditoria/cadastro-mestre-payload-validacao.md).

Última leitura de produção: Master 5.706; a investigação anterior encontrou apenas lote 1 da Fase 3.4, e a tentativa bloqueada não chegou ao POST, ao lote ou ao snapshot. Esta mudança de transporte não executa a reconstrução nem confirma resultado real de 860.

Nenhum DML em Custos/OP/dicionário operacional/mapa/categorias. `data_referencia` continua competência e `criado_em` importação dos fatos. Fingerprint operacional divergente não é corrigido; provas usam o estado imediatamente anterior à execução.

## Referências e verificação

[Validação CAD-PAYLOAD-01](../auditoria/cadastro-mestre-payload-validacao.md): **409 testes/31 arquivos passaram**, equivalência do Preview da cópia local e medição do transporte com `fetch` interceptado/token sintético, sem chamar executor ou enviar POST a Production. Os resultados de 323 testes abaixo pertencem à entrega original CAD-EXEC-WEB-01.

[Contrato central](./cadastro-mestre-reconstrucao.md), [Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [Storage sem sobrescrita](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [limites Vercel](https://vercel.com/docs/functions/limitations).

Testes: UI/API/fetch/Auth/Storage mockados e executor real com PostgreSQL local em memória (PGlite). Três formatos, aprovação/cancelamento, autorização/configuração/origem/limites, hash/decisões/contexto, snapshot/proveniência, falha de persistência/conferência e erro SQL com rollback/consulta. Sem banco/credencial de produção.

[Resultados e lista completa de arquivos](../auditoria/cadastro-mestre-execucao-web-validacao.md): 323 testes/28 arquivos passaram; lint/typecheck/diff check passaram, sem commit ou execução real.
