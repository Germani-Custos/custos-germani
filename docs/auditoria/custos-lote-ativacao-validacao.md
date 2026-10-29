# LOG-02 — ativação controlada e validação no Supabase

**29/10/2026 — LOG-02 = PARCIAL.** Migration aplicada, schema/FK/legado validados e importação/upsert reais de **um chunk** comprovados. **Teste de múltiplos chunks em produção = PENDENTE**, por decisão explícita do usuário: o original autorizado tem 349 registros, não criar dados fictícios, não concatenar competências e não apresentar duas execuções como múltiplos chunks de uma execução. Retenção histórica continua fora do escopo.

Base local lida: HEAD `ec6665f`, checkout limpo no início. Nenhuma alteração funcional, de testes ou do SQL preparado nesta ativação. Sem commit/push/deploy executados pelo agente. Este relatório sucede somente o estado de ativação das [provas de preparação](custos-lote-persistencia-validacao.md).

## 1. Pré-condições e conexão

O humano confirmou explicitamente nesta janela de 29/10 que importações, writers administrativos, abas/processos antigos estavam pausados e nenhum outro processo gravaria `historico_custos` até terminar a validação. Essa confirmação substitui a negativa anterior da preparação local; não se reutilizou a pausa de 26/10. A consulta de sessões sem atividade e zero logs `processando` foi evidência complementar, nunca substituto da confirmação humana.

Conexão **Supabase**, escolhida anteriormente pelo usuário e reconfirmada por `list_projects`: **Custos-Germani / umpebdovrazzrdndhigc**, PostgreSQL 17.6.1.084. Catálogo relido antes de qualquer escrita: PKs BIGINT IDENTITY ALWAYS, UNIQUE `unique_produto_data(codigo_produto,data_referencia)`, coluna de lote ainda ausente, 2.481 fatos/29 logs. Não se alteraram RLS/Auth/grants nem se criou conexão administrativa no frontend.

## 2. Backup atual e provas

Diretório local, fora do repositório:

`C:\Users\aprendizcustos\.codex\backups\custos-germani\log02-ativacao-2026-10-29T16-55-02.180Z`

`antes.json.gz`: **81.263 bytes**, SHA-256 **`ab04d9fcb054e19d6da3c39ed433d3ea78224e6a01317c03e3d36dd652762b0d`**. Fotografia capturada em transação REPEATABLE READ READ ONLY, 16:54:31 UTC; contém registros integrais de Custos/log, catálogo completo relevante e COUNT/SHA-256 das 12 tabelas. Arquivo criado sem sobrescrita, sincronizado e relido/decodificado para igualdade integral antes da migration.

Outras provas salvas nesse diretório: SQL original aplicado, `depois-schema.json`, `arquivo-controle.json`, `depois-lote30.json.gz`, `depois-lote31.json.gz`, Preview e resultados dos dois lotes em JPG/texto. Configuração do teste contém somente URL/chave pública anon existente; nenhum segredo administrativo/token/senha foi colocado no código ou relatório.

## 3. Migration aplicada e schema antes/depois

Arquivo existente aplicado sem recriação/alteração de contrato: [`20261026185939_custos_proveniencia_lote.sql`](../../sql/20261026185939_custos_proveniencia_lote.sql). SHA-256 do arquivo local: `520335c8db63090bb40bc28410f75ffd4d79cd3f0850ba708daae2ea97c8ff5f`.

Aplicação via mecanismo de migrations do conector Supabase, sucesso confirmado; histórico remoto registra **`20261029165515 / custos_proveniencia_lote`**. O arquivo local conserva a versão gerada em 26/10; o MCP atribuiu a versão remota da aplicação em 29/10. Não há segundo arquivo/migration alternativa desta tarefa.

- Antes: nenhuma coluna equivalente de lote no fato.
- Depois: `historico_custos.log_importacao_id BIGINT NULL`, sem default.
- FK validada `historico_custos_log_importacao_id_fkey` → `log_importacao(id)`, **ON DELETE RESTRICT / ON UPDATE RESTRICT, não diferível**.
- Índice parcial não único `idx_historico_log_importacao_id WHERE log_importacao_id IS NOT NULL`.
- PK/UNIQUE produto/data, colunas e índices anteriores intactos; sem backfill ou modificação da estrutura do log.

Validação às **16:55:49 UTC**, antes da importação: os **2.481 fatos continuavam NULL no novo campo**. COUNT e SHA-256 das **12 tabelas** idênticos ao backup, comparando somente colunas anteriores em Custos. Colunas/constraints/índices anteriores, 21 policies, grants/ACLs, RLS, funções e triggers anteriores também idênticos. Nenhuma outra alteração de schema.

### Precisão preservada — correção do diagnóstico anterior

`data_type=NUMERIC` sozinho não prova ausência de escala. O catálogo completo confirma **`custo_total NUMERIC(15,2)`**; `custo_variavel`/`custo_direto_fixo` são NUMERIC sem escala fixa. Código e `criado_em` são nullable; IDs ALWAYS. A documentação da preparação inferiu incorretamente que todos os custos eram sem escala fixa. Essa descrição foi corrigida, sem saneamento/schema novo.

Na conferência do primeiro envio, o Preview normalizado em quatro casas diferiu do total persistido em 347 registros, até 0,005. A investigação confirmou a coerção existente de `NUMERIC(15,2)` no banco, não alteração da migration. Validando o payload sob essa escala, **todos os valores anteriores de Custos permaneceram iguais**, inclusive no segundo envio. Não se mudou parser, arredondamento, precisão ou payload para mascarar a diferença.

## 4. Arquivo e fluxo oficial

Original indicado pelo usuário: `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\14_10.xlsx`, competência exata **14/10/2026**. SHA-256 **`db8795d8b50c44127ead1133d8aed5a7f6f9b1ec685fdb32da220e9ac8987a74`**. Original somente lido, sem salvar/editar/recriar/concatenar.

Leitura confirmou **349 códigos canônicos únicos**, todos já existentes nessa data; cinco colunas mapeadas pelos mecanismos existentes: Produto, Descrição, Custo Variável, Custo Direto Fixo e Custo Total. Preview da UI: **5/5 campos, 349 válidas, zero avisos, zero erros**. Não se utilizou o Cadastro Mestre nem se escreveu lote por SQL avulso para substituir o fluxo oficial.

Cliente oficial servido em loopback `http://127.0.0.1:4173/`, build público por allowlist e chave pública anon existente. Login efetuado pelo humano em conta administrativa; sem pedir/expor senha, criar usuário ou modificar Auth. Os dois envios passaram por mapeamento → Preview → confirmação → `importarHistoricoCustosComLog` → log/ID textual → contexto → upsert → retorno conferido → resultado da UI. A API criou os lotes; nenhum ID foi fornecido artificialmente ao writer.

### Publicação conferida, sem deploy do agente

GETs somente leitura dos módulos publicados em `https://custos-germani.vercel.app/` confirmaram igualdade com o checkout, normalizando apenas CRLF/LF:

- `src/services/api.js`: SHA-256 da resposta `56f4a2d171d8f4cf9b7c9e2ccf8f20f2f7c280247c902cfa3224a28aac472fdd`; payload com FK, guarda legada e conferência do retorno presentes.
- `view/ui-import.js`: `f6e26a9de2d61ba0d38af185343c2f16ae9b7f76f218021b240c541dfa647895`.
- `services/api.js`: `908a75b49aea127bb7c2581d3b881afdae9132d137d5e107b0419f0a4d9c9e76`.

Isso confirma esses recursos publicados naquela leitura; **não se atribui autoria/data/origem da publicação**, não se afirma que todas as abas antigas foram recarregadas e não houve deploy nesta tarefa. O ensaio autenticado ocorreu pelo cliente oficial local contra o banco de produção. Não confundir esse ensaio com navegação/importação executada na aba do domínio publicado.

## 5. Primeira execução — lote 30

- Início **17:10:26.130 UTC**, fim **17:10:27.230 UTC**; log **30**, `finalizado`.
- Total/importadas **349/349**, erros **0**. **Um chunk**, dado o limite existente de 400.
- UI informou lote **30** e vínculo confirmado; leitura do banco confirmou as mesmas **349 chaves** com FK **30**, sem NULL ou outro lote nesse conjunto.
- Todos os campos conferidos contra o original normalizado, respeitando a escala remota existente do total.
- Total de fatos permaneceu **2.481**; nenhum novo ID/linha técnica foi inserido. Foram atualizações de chaves existentes.
- Custos, descrições, códigos, datas, autoria e `criado_em` anteriores preservados; **2.132 fatos não envolvidos** continuaram integralmente iguais e com FK NULL.
- Dez outras tabelas, além de Custos/log, mantiveram contagens/fingerprints. Os 29 logs anteriores permaneceram integrais.

## 6. Segunda execução — lote 31 / upsert

Mesmo original e mesma data autorizados. Recarregou-se o cliente local para reiniciar o seletor: selecionar novamente o mesmo arquivo sem limpar o input não disparou `change`. Sessão restaurada normalmente; data exata e mapeamento/Preview reconferidos. Não houve modificação funcional do seletor ou manipulação de estado para gravar.

- Início **17:14:34.324 UTC**, fim **17:14:35.259 UTC**; log **31**, `finalizado`.
- **349/349**, erros **0**, **um chunk**.
- As mesmas 349 chaves e IDs passaram de FK **30 → 31**. Não se escolheu lote por timestamp, não se misturaram IDs e não se criou segunda linha artificial.
- Total **2.481 fatos**, **31 logs**, nenhuma duplicidade produto/data. **349 vínculos 31**, **zero vínculos 30**, **2.132 NULL não tocados**.
- Comparação integral de cada fato contra o backup inicial, retirando somente o campo novo de lote: **igualdade total**. Custos, IDs, `data_referencia`, `criado_em`, descrições/componentes/autoria preservados. Comparação com a primeira execução também confirmou somente a troca do vínculo atual.
- Log 30 e todos os anteriores continuam preservados. O lote 30 mantém contagem 349 importadas, embora não tenha mais fatos sobreviventes: comportamento esperado do vínculo da última versão, sem retenção histórica.

Houve **698 gravações confirmadas somadas em duas execuções**, sobre os mesmos **349 fatos distintos**, sem inserção de novo fato. Isso não representa 698 fatos distintos nem múltiplos chunks na mesma execução.

## 7. Segurança e integridade

Sonda exclusivamente de backend, em transação revertida e subtransação: tentativa de atribuir a um fato existente o batch BIGINT inexistente **9223372036854775807** rejeitada com **foreign_key_violation / 23503**. FK confirmou `condeferrable=false`; nenhum vínculo inválido persistiu. Não se criou log/fato de teste nem se desabilitaram triggers/RLS. Não executar esse SQL no frontend nem reexpor função por RPC.

Guarda sem ID confirmado, rejeição de log, lote externo ignorado e API legada bloqueada continuam comprovados nos testes da aplicação; os dois ensaios reais só gravaram após ID persistido e confirmado. Nenhum fallback para NULL ocorreu. A coluna é nullable para legado: SQL/cliente administrativo arbitrário ainda pode escrever NULL se tiver privilégio. **Não afirmar que a FK proíbe toda escrita sem batch no banco.** A garantia é do writer oficial com controle dos demais writers, sem ampliar privilégios.

Policies/grants/RLS/Auth/funções/triggers anteriores preservados. Advisors de segurança antes/depois mantiveram os avisos preexistentes de search_path, proteção de senha vazada e duas tabelas administrativas com RLS sem policies, sem correção fora do escopo ([search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

## 8. Validação final

Comandos executados novamente nesta ativação, sem alterações funcionais:

- Suíte completa: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` — **870/870, 51/51 arquivos**; rodada posterior aos dois envios **43,94s**, sem pulados.
- Focados: `api-custos-lote`, `custos-proveniencia-schema`, `ui-import`, `api-comparacao-recorte`, `acesso-operacional-rls` — **91/91**, 5 arquivos.
- Lint: `node node_modules/eslint/bin/eslint.js .` — aprovado.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — aprovado.
- Build: rotina `buildWeb` de `scripts/build-web.mjs`, URL/chave pública anon existente fornecidas somente ao processo local, sem alteração de configuração de produção/segredo administrativo — aprovado.
- `git diff --check` e referências locais dos documentos — conferidos na finalização.
- `git diff --exit-code -- core src view tests sql` — código, engines/API/UI/parser, testes e migration preparada **sem alteração** nesta tarefa.

Regressões incluem fila/prioridade/TOP-200, exportação, A360-CUS-01/02/03/04, leitura integral, drill-through, OP e OP×CUSTO. Não se afirma inspeção visual manual de todos esses módulos: evidência de regressão é automatizada e de diff. O fluxo real de importação foi observado no navegador e os resultados foram conferidos no banco.

## 9. Documentação alterada

README, ROADMAP, AGENTS (nova entrada datada), os três manuais, contratos `identidade-lote-custos`, `proposta-vinculo-lote-custos`, `matriz-contratos-operacionais`, `banco-de-dados`, `migracoes` e índice documental; índice de auditoria, backlog, notas de sucessão/correção nas provas anteriores e este relatório. VISION/regras gerais preservados, sem alteração de princípio/processo. Backlog continua com LOG-02 **PARCIALMENTE RESOLVIDO**, mesmos 22 itens ativos.

## 10. Aceites pendentes e encerramento desta janela

**Múltiplos chunks em produção = PENDENTE.** O usuário autorizou explicitamente o arquivo de 349 linhas e determinou que essa limitação fosse registrada. Testes isolados de 801 linhas/400+400+1 não substituem o aceite produtivo. Não foram criados registros fictícios, arquivo ampliado, concatenação de competências ou mudança do tamanho do chunk. Não realizar terceira importação sem escopo autorizado.

Os ensaios reais atualizaram chaves existentes; inserção de novo ID técnico é coberta nos testes isolados, não foi simulada em produção com produto/data artificiais. Retenção de snapshots e comparação por lote continuam separadas e não foram implementadas.

Manter controle de clientes antigos/admin e usar somente recursos compatíveis; igualdade dos módulos publicados não comprova que toda aba antiga carregou a versão nova. A pausa é operacional, não um bloqueio global criado no banco. Não se alterou flag, RLS/Auth ou rotina externa para contornar essa condição.

**Resultado: migration/schema/FK/importação/upsert de um chunk validados; LOG-02 permanece PARCIAL pelo aceite multichunk produtivo pendente. Sem commit, push ou deploy executados pelo agente.**
