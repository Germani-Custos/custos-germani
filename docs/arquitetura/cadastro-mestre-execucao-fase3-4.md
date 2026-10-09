# Cadastro Mestre — execução pontual Fase 3.4

## Continuidade do contrato em 09/10/2026

Este documento preserva evidências da carga pontual já concluída; sua migration não é um importador e não deve ser reexecutada. A próxima reconstrução usa o [contrato CAD-REBUILD-01](./cadastro-mestre-reconstrucao.md): o universo filtrado é a fonte de verdade do Master, com remoções aprovadas, snapshot integral e transação administrativa. A preservação histórica de 4.853 fora dos filtros permanece como fato do lote anterior, mas foi substituída como regra de execução futura. Nenhuma reconstrução real foi executada no desenvolvimento da nova entrega.

Entrega **CAD-EXEC-01**, em 08/10/2026. Primeira gravação autorizada exclusivamente em `dicionario_master_produtos` e `log_importacao_cadastro_mestre`. Não é um importer integrado ao runtime e não reconcilia a dimensão operacional.

## Autorização e revalidação

O pedido humano da Fase 3.4 autorizou executar as 423 propostas da Fase 3.3 somente após revalidação integral. A evidência original, inclusive as decisões inicialmente PENDENTES, não foi editada. A autorização desta execução está registrada separadamente em `metadados_origem` do lote.

Fonte: `casdatromestrexd.xlsm`, primeira aba `casdatromestrexd`, com 7 cabeçalhos reconhecidos. `Agrup. Prod.` (Q) é o agrupamento ERP oficial.

- SHA-256 do arquivo: `ea5092e92e9b843f341545837f6618998072dc2c533cc837d1807ce7f69ef6da`.
- SHA-256 do contexto integral: `c2660e76d861b7ad56484f16ffe152e214585abfaf4866e46681de11f3aacd18`.
- SHA-256 da serialização canônica do manifesto: `16b0250d89cbeb8fede57a14defa2a460173270952e754428e55357809817fe2`.

Arquivo reprocessado pelo mesmo adaptador/núcleo, sem alterar o pipeline nem o XLSM. Em Node, foram fornecidos os bytes nativos Buffer do arquivo; um ArrayBuffer de outro realm do REPL não foi reconhecido pelo leitor, sem divergência no arquivo. A comparação final usou o contexto completo, incluindo timestamps/proveniência e os catálogos ordenados por código, exatamente como na Fase 3.3.

O manifesto reconstruído e todas as operações são integralmente idênticos à evidência original. Reconfirmados: 853 filtrados, 750 existentes, 103 novos, 11 descrições, 309 agrupamentos de existentes, 423 propostas, zero erros/bloqueios. Master anterior = 5.603. Zero novos já existentes no Master, zero imagens anteriores divergentes nas atualizações e zero lotes prévios.

## Migration e lote real

Migration aplicada uma única vez pelo Supabase MCP: **`20261008184501` / `fase3_4_execucao_cadastro_mestre`**. SQL versionado em [`sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql`](../../sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql). A versão é a atribuída pelo servidor; a CLI não estava disponível. Nenhum DDL, RPC, DELETE, função, trigger, policy ou permissão foi criado/alterado.

- ID do log: **1**, obtido por `INSERT ... RETURNING id`, nunca fixado na migration.
- Identificador: `FASE_3_4_9dfb2843-5bcb-4159-8a2a-a59051276a27`.
- Fonte/tipo: ERP / XLSM.
- Início: `2026-10-08T18:45:01.108576+00:00` (15:45:01, São Paulo).
- Finalização: `2026-10-08T18:45:02.174821+00:00`.
- Status final: **concluido**.
- Total/processados: **853 / 853**.
- Inseridos: **103**.
- Atualizados: **312 produtos distintos**, correspondentes a **320 patches de campo**: 11 descrições + 309 agrupamentos; oito produtos têm ambos.
- Erros: **0**; `erros = []`.

Master final: **5.706 registros**. Os 103 novos já constavam como SOMENTE_OPERACIONAL no snapshot completo da Fase 1: são novos apenas no Master, não novos na dimensão operacional. Nenhuma escrita foi feita no operacional.

## Contrato de escrita e proveniência

Novos receberam somente código/descrição/códigos ERP não vazios, agrupamento ERP quando informado, timestamps e IDs de proveniência do lote. São 33 novos com agrupamento e 70 sem agrupamento; nestes 70, valor e ID de agrupamento permanecem NULL. `ultima_importacao_cadastro_mestre_id = 1` está preenchido somente nos **415 produtos efetivamente gravados** (103 novos + 312 existentes).

Existentes mantiveram `origem_cod`, `familia_cod` e `criado_em`. Somente descrição/agrupamento propostos e proveniência/`atualizado_em` foram atualizados. `agrupamento_erp_importacao_id = 1` identifica os **342 valores efetivamente recebidos**: 309 existentes + 33 novos.

Distribuição preservada literalmente: P005 = 305, P302 = 5, P801 = 32. Nenhum Pxxx virou Mxxx. As 686 pendências de família do conjunto permanecem sem resolução operacional; os 167 casos resolvidos mantêm apenas a resolução exata já prevista, sem preenchimento de FK Kustos. Não existe ponte ou classificação inventada.

**5.291 registros antigos permaneceram integralmente iguais**: 4.853 fora do conjunto filtrado + 438 elegíveis sem operação. Vazios não apagaram valores. `data_referencia` continua competência; `criado_em` nos fatos continua evento de importação. Nesta carga cadastral, timestamps registram a proveniência do cadastro, não uma competência de custo/OP. Nenhum fato temporal foi reescrito.

## Segurança transacional e repetição

A revalidação foi executada em transação read-only antes da aplicação. A carga usa uma única transação, com locks NOWAIT, `lock_timeout=3s` e `statement_timeout=30s`. Master/log recebem locks exclusivos compatíveis com leitura; tabelas protegidas recebem locks SHARE curtos durante a prova de preservação. Os locks não persistem após commit.

Antes do primeiro INSERT, a migration exige Master com 5.603 registros e fingerprint original, log vazio, nenhum trigger inesperado, 415 códigos únicos, 103 novos ausentes, imagens completas de 312 existentes idênticas e fingerprints das sete tabelas protegidas iguais à revalidação. Qualquer divergência bloqueia sem criar lote. Uma repetição agora falha nessas guardas antes do DML.

Os patches são consolidados por código e gravados em conjunto. A subtransação do Master exige 103 inserções, 312 atualizações, 5.706 linhas finais e EXCEPT bidirecional integral zero. Qualquer erro reverte toda a escrita do Master e preserva o log como `falhou`, com contagens efetivamente persistidas zero e erro explícito. Este lote não teve falha parcial; não se aplica `concluido_com_erros`. Não foi implementado executor/importer genérico nem mecanismo de retomada automática.

O log preserva as imagens anteriores completas dos 312 atualizados, hashes, autorização, contagens, pendências e evidências de preservação. Qualquer reversão futura exige decisão própria e migration, sem sobrescrita/restauração automática.

## Validações executadas

- EXCEPT **integral** da imagem esperada com o Master real e sentido inverso, antes do commit: **0 / 0**.
- Comparação independente pós-commit das 5.706 linhas com a imagem esperada: **0 divergências nos dois sentidos**.
- EXCEPT pós-commit das chaves (5.603 chaves mestres do snapshot Fase 1 v2 + 103 novas), bidirecional: **0 / 0**.
- Todas as 103 novas chaves presentes; nenhuma chave antiga perdida.
- 11 descrições e 309 agrupamentos de existentes conferidos; IDs de lote corretos.
- 415 vínculos de última carga e 342 vínculos de agrupamento; 70 novos sem agrupamento continuam NULL.
- Zero alterações de origem/família dos 5.603 existentes.
- Todos os 4.853 fora do conjunto e os 438 elegíveis sem operação preservados integralmente.
- Nenhuma alteração de RLS; Master/log continuam com RLS ativo. Log continua sem policies.

Fingerprint final do Master: `0678865df9f1abc1a5a5bde8be6fa19b`; fingerprint do log com um lote: `1d074d5bee1e60753b06941bad0ff778`.

Fingerprints/contagens das tabelas protegidas, iguais antes, dentro da transação e na conferência pós-commit:

- `dicionario_produtos`: 6.113 / `1555ee693aabad7d5e8536a36666721b`.
- `mapa_produtos`: 292 / `8769a09b104e42e3a996b07fa6574f76`.
- `historico_custos`: 1.370 / `a4de7e0aa918697373e00a0423ac4b70`.
- `apontamentos_op`: 704 / `b576ac931683bfac99dd1df1794d453a`.
- `categorias_origem`: 50 / `603925b56407a96870fb064123eb8860`.
- `categorias_familia`: 38 / `04b3645662df0f79ac18e9880d832592`.
- `categorias_agrupamento`: 34 / `3b14395a70b6cad47474c3fa160e16db`.

A alteração externa de `000001` identificada na Fase 3.3.1 foi preservada. Os logs eram compatíveis com o editor web legado, sem prova de autoria; este lote não corrige nem reclassifica esse produto.

## Testes e próximos limites

Advisors de segurança consultados após a aplicação: RLS ativo sem policy no log e em `familias_base` (INFO); nove tabelas públicas legadas com RLS desativado (ERROR); view `vw_produtos_orfaos_agrupamento` como security definer (ERROR); cinco assinaturas de funções com search_path mutável (WARN); proteção de senha vazada desabilitada (WARN). A carga não criou/alterou nenhum desses objetos ou políticas. Não foram aplicadas correções fora do escopo. Referências: [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [RLS desativado](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [view security definer](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**242 testes em 22 arquivos aprovados**, incluindo sete testes de contrato do SQL (payload completo, consolidação, campos autorizados, DML restrito, guardas, EXCEPT/subtransação e ID retornado). Lint, `tsc --noEmit -p jsconfig.json` e `git diff --check`: exit 0. Os testes estáticos não substituem as validações reais listadas acima.

Fase 3.4 concluída somente como carga pontual. Preview/revisão continuam puros e sem executor de UI. Importer geral, permissões de escrita para clientes, ponte ERP → Kustos e reconciliação operacional permanecem fora do escopo e exigem autorização futura.
