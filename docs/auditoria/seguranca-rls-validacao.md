# SEC-03 — hardening RLS e validação

**Encerramento: 23/10/2026. Implementação remota: 22/10/2026.** Projeto Custos-Germani / umpebdovrazzrdndhigc. Código base 831a69fda1090badee0239f7e0dc7526f86c7691, com a consolidação documental anterior preservada no checkout. Escopo desta entrega: SEC-03 e fechamento do caminho alternativo da view (SEC-07), sem avançar aos P1/P2 independentes. Nenhum commit, push ou deploy de aplicação.

## SEC-03

**RESOLVIDO.** Modelo decidido pelo responsável: todos os permanentes autenticados leem; somente as duas contas indicadas importam Custos/OP e editam o Cadastro Operacional. Identidades confirmadas por SELECT no Auth, sem coletar senha/token. UUIDs e matriz completa estão em [modelo-acesso-rls.md](../arquitetura/modelo-acesso-rls.md). Nenhum acesso a tabelas foi mantido público.

## SEC-07

**RESOLVIDO como dependência do P0.** vw_produtos_orfaos_agrupamento deixou de ter grants de cliente e usa security_invoker=true. A API usa diagnóstico próprio nas tabelas, portanto não depende dessa view. Negativas de leitura para anon, leitor e administradores operacionais confirmadas; triagem SQL de backend preservada. Não se trata de autorização para remover a view ou alterar seus dados/definição de negócio.

## Diagnóstico anterior

O código atual chama requireLogin antes de masters/metadados e OP. A abertura temporária de maio era histórica, como já dizia o contrato de autenticação; não foi necessário reativar ou refatorar o login.

| Tabela original do P0 | RLS antes | Policies antes | anon antes | authenticated antes | Backend antes |
|---|---|---|---|---|---|
| historico_custos | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| dicionario_produtos | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| categorias_origem | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| categorias_familia | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| categorias_agrupamento | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| apontamentos_op | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| log_importacao | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| log_importacao_op | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |
| mapa_produtos | desabilitada | nenhuma | S/I/U/D/T/R/G | S/I/U/D/T/R/G | preservado |

S=SELECT, I=INSERT, U=UPDATE, D=DELETE, T=TRUNCATE, R=REFERENCES, G=TRIGGER. Owner postgres e service_role tinham esses sete privilégios e os conservaram; postgres/service_role têm BYPASSRLS. anon/authenticated não têm BYPASSRLS nem CREATE no schema public. A role PUBLIC não concedia esses privilégios de tabela, mas concedia EXECUTE nas funções, revogado nesta entrega. authenticator é o login técnico que pode assumir as roles de API; não é uma identidade de usuário final.

Também foram revistas três tabelas já com RLS: Master ERP tinha SELECT público com policy true; familias_base e log de Master não tinham policies, mas tinham grants excessivos, inclusive TRUNCATE (não controlado por RLS). A view usava privilégios do proprietário. As cinco sequências tinham USAGE/SELECT/UPDATE para clientes. O trigger de Custos chamava uma função invoker que escreve no mapa: simplesmente remover sua escrita quebraria importação.

Leitura anônima anterior pelo Data API de historico_custos retornou **HTTP 200 com linha real**. Não se fez INSERT/UPDATE/DELETE antes da proteção para “demonstrar” o risco.

## Implementação aplicada

- Arquivo criado pelo Supabase CLI 2.121.0 e preservado em [sql/20261022191744_hardening_acesso_operacional_rls.sql](../../sql/20261022191744_hardening_acesso_operacional_rls.sql).
- Versão remota **20261022192657 / hardening_acesso_operacional_rls**, confirmada pelo catálogo de migrations. Não confundir os dois timestamps nem reaplicar o arquivo.
- Transação única, limites de lock/statement e guardas de owner, estado anterior de policies/RLS, policy ERP e identidades indicadas. Não há DML de negócio na migration.
- RLS habilitada nas nove; três tabelas que já tinham RLS continuam protegidas. **12 tabelas públicas com RLS** ao final.
- **21 policies específicas**: nove SELECTs autenticados; cinco INSERTs e quatro UPDATEs restritos aos UUIDs administrativos; três policies do mapa exigindo também contexto de trigger. UPDATE tem USING e WITH CHECK. Nenhuma policy true genérica foi criada.
- Todos os grants de PUBLIC/anon/authenticated retirados das 12 tabelas e da view; somente operações da matriz foram reconcedidas a authenticated. Nenhum DELETE/TRUNCATE/REFERENCES/TRIGGER de cliente. O mapa tem grants técnicos de SELECT/INSERT/UPDATE, mas seu acesso direto é negado pela RLS.
- Master ERP: SELECT autenticado; escrita direta de cliente removida. Famílias-base e log de Master: sem grants de cliente. Catálogos: SELECT autenticado; escritor de famílias continua no backend administrativo.
- View: grants de cliente removidos e security_invoker=true, sem alterar o SELECT de negócio.
- Sequências: nenhum grant anon; authenticated apenas USAGE nas quatro operacionais, sem UPDATE/setval e sem sequência administrativa.
- EXECUTE público das cinco assinaturas legadas revogado; authenticated conserva somente a função text exigida pelo trigger, cujas escritas diretas são barradas pela policy do mapa. Definições das funções e do trigger não mudaram.
- Defaults do owner postgres no schema public endurecidos para novos objetos. Não se alteraram defaults de owners/schemas geridos pela plataforma fora desse contrato.
- Nenhuma role, usuário, perfil, schema, helper SECURITY DEFINER ou RPC novo; nenhum segredo no browser. APIs, UI, importadores, payloads, paginação e regras investigativas permanecem no mesmo código.

## Segurança específica

[Script versionado de ensaio](../../sql/validar_acesso_operacional_rls.sql), primeiro validado em PostgreSQL local, depois executado pelo mecanismo SQL administrativo. São **224 verificações, todas com resultado esperado**, para anon, leitor, admin_1, admin_2, usuário Auth anônimo e authenticated sem sub.

As claims foram simuladas somente na conexão administrativa de teste com SET LOCAL ROLE; isso não significa emissão de JWT real para leitor fictício nem criação de conta. Incluem tentativa de user_metadata.role=admin sem concessão de privilégio. A sessão real da aplicação foi validada separadamente com a conta Gmail indicada.

- SELECT nas 13 relações (12 tabelas + view), conforme a matriz; leitor vê integralmente as nove fontes autorizadas.
- INSERT/UPDATE/DELETE negativos nas nove tabelas, incluindo ambos os admins para operações não permitidas. UPDATE filtrado a zero linhas por RLS também conta como bloqueio, sem interpretá-lo como sucesso de edição.
- Para cada admin indicado, fluxo real SQL: criar produto sintético, abrir/fechar logs, INSERT e UPSERT de custo, INSERT de OP e conferência do INSERT/UPDATE interno do mapa pelo trigger.
- Todas as escritas de teste revertidas por exceção controlada em subtransação. IDs explícitos impediram avanço de sequências. Nenhuma carga pela UI, snapshot remoto, arquivo ERP aprovado ou reconstrução foi executada nesta tarefa.
- Teste local verifica também ACL de TRUNCATE/UPDATE de sequências, bloqueio da view/log/legado e preservação do backend. service_role preserva leitura e escrita administrativa; nenhuma chave privilegiada foi colocada no cliente.

Negativas externas pelo **Data API real**, com a chave pública e sem sessão: **52 requisições** (GET/POST/PATCH/DELETE nas 13 relações). As **36 tentativas nas nove tabelas originais** retornaram HTTP 401/código 42501. No total, 50 retornaram esse bloqueio de privilégio; POST/DELETE da view retornaram HTTP 500/código 55000 porque a view não é atualizável. Esses dois erros estruturais não provam ACL de escrita por si; a ausência de grants foi conferida no catálogo e sua leitura retornou 401. Nenhuma tentativa gravou dados.

## Preservação e sequência temporal das provas

Backup local prévio, fora do repositório/publicação: C:/Users/aprendizcustos/.codex/backups/kustos-rls-2026-10-22T19-18-29-322Z. Contém as 12 imagens JSON integrais e metadata-before.json (colunas, constraints, índices, grants, policies, sequências, funções, trigger, owner e contagens/SHA-256). Cada imagem foi relida e contada antes da aplicação.

Na aplicação de 22/10 e na primeira rodada de 224 ensaios, **as 12 contagens e SHA-256 integrais ficaram idênticos ao backup**, assim como o estado das sequências. Esse resultado foi observado antes da interrupção e não deve ser confundido com comparação de estados de dias diferentes.

Na retomada de 23/10, apareceu uma operação administrativa posterior, **lote 5**, iniciado/finalizado em **22/10/2026 20:17:59 UTC (17:17:59 America/Sao_Paulo)**, com 83 atualizações, zero inserções e zero erros. Autor registrado: supabase-auth:14f1b3ff-0b22-495b-a1c3-9aebae13dc36. A alteração ocorreu depois da migration de RLS (19:26:57 UTC). Esse registro não identifica sozinho quem operou ou por qual interface; não se atribui autoria humana nem origem do cliente por suposição.

Comparação com o backup anterior: 83 produtos com atualizado_em/proveniência do lote 5, 82 alterações de agrupamento ERP/proveniência e uma descrição. O log de Master passou de quatro a cinco registros. Os demais dez conjuntos de dados continuam iguais ao backup original. Não se restauraram esses dados nem se repetiu a carga.

A rodada final de 224 ensaios usou uma fotografia nova, posterior ao lote 5, e confirmou **todos os 12 conjuntos e as cinco sequências idênticos antes/depois dos ensaios**. Logo, as duas provas são distintas: preservação no momento do hardening e preservação na revalidação posterior.

| Tabela | Backup anterior ao RLS | Fotografia da retomada | Após os ensaios finais | SHA-256 antes/depois dos ensaios finais |
|---|---:|---:|---:|---|
| apontamentos_op | 1469 | 1469 | 1469 | idêntico |
| categorias_agrupamento | 34 | 34 | 34 | idêntico |
| categorias_familia | 103 | 103 | 103 | idêntico |
| categorias_origem | 50 | 50 | 50 | idêntico |
| dicionario_master_produtos | 860 | 860 | 860 | idêntico |
| dicionario_produtos | 6113 | 6113 | 6113 | idêntico |
| familias_base | 21 | 21 | 21 | idêntico |
| historico_custos | 2268 | 2268 | 2268 | idêntico |
| log_importacao | 28 | 28 | 28 | idêntico |
| log_importacao_cadastro_mestre | 4 | 5 | 5 | idêntico |
| log_importacao_op | 8 | 8 | 8 | idêntico |
| mapa_produtos | 299 | 299 | 299 | idêntico |

Evidências locais adicionais: validation-after.json (224 verificações/metadados/duas fotografias/sequências/advisors) e negative-rest.json (52 negativas sem chaves ou tokens). Esses arquivos privados não são publicados por build. Constraints, índices e definição do trigger foram conferidos; a migration só contém mudanças de autorização e contexto da view. data_referencia continua competência e criado_em continua importação/proveniência.

## Validação funcional

| Fluxo | Como foi conferido | Resultado/limite |
|---|---|---|
| Bootstrap/login | sessão real no navegador integrado, após a migration | usuário Gmail identificado; masters/banner carregados |
| Custos/categorias | análise 01/10–31/10/2026, filtros reais | 349 produtos, cinco alertas, zero mudanças de regime, média −0,10%; mesmos resultados anteriores |
| Fila investigativa | renderização real e regressões existentes | mantém conjunto e janela de 200; defeito anterior de prioridade não corrigido nesta tarefa |
| Histórico/drill-through | MB014 na sessão autenticada | 05/10 e 14/10/2026, R$ 9,24 e R$ 9,39 preservados |
| Cadastro Operacional | consulta real | 6.113 produtos e cinco códigos ausentes identificados; edição/importação validada em SQL com os dois admins e rollback |
| Consulta Master ERP | consulta real | 860 registros, cinco colunas e páginas de 50; catálogos carregados |
| OP/dossiê | análise real e OP 833 | fila atual de 1.000, dossiê 833/1021146; produção 91,3%, tempo +101,2%, produtividade −50,3%, paradas 25,4%; truncamento de OP continua MNT-OP-05 |
| Importação Custos/OP | regressões de UI/API e ensaios SQL reais com rollback | INSERT/UPSERT, logs e trigger autorizados; leitor/anon bloqueados; não enviado arquivo real para persistir |
| Exportação | botão da UI e download real | XLSX de outubro, 285.216 bytes, assinatura ZIP válida; SHA-256 54701e0dffbf4995d3eba033cca149e55c382752ee91cc4db48c7cc9a5381358 |
| Administração ERP | regressões do handler/executores, backend preservado e endpoint público | allowlist/flag/TLS/Storage não ampliados; nenhuma reconstrução ou ensaio de snapshot real |

Arquivo exportado localmente: D:/Meus Documentos - Aprendiz Custos/Downloads/auditoria_criticos_2026-10-01_a_2026-10-31_20261022.xlsx. A conferência do arquivo verificou existência, bytes, assinatura e hash; não é uma nova auditoria de seus cálculos/ordenação, que continuam cobertos pelas regressões e pendências anteriores.

A extensão do Chrome não permitiu conexão estável; o usuário fez login no navegador integrado para a validação. Alguns snapshots grandes/ações de scroll tiveram timeout de automação; o estado real foi conferido por DOM compacto ou captura, e botões de análise foram acionados pelo teclado quando necessário. Não se interpretou timeout de ferramenta como defeito de RLS.

## Checks de engenharia

- **627/627 testes em 41 arquivos**, incluindo 27 testes novos de RLS com PostgreSQL local/PGlite; suíte final com dois workers, sem exclusões. Tempo observado: 26,59 s.
- Lint e typecheck passaram usando os binários do lockfile. npm não está no PATH; foram usados node node_modules/eslint/bin/eslint.js . e node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json.
- Build executado com node scripts/build-web.mjs, configuração pública sintética e verbose=false; quatro testes específicos de build também passaram. Build local não é deploy nem prova de env real da Vercel.
- git diff --check sem erros; 984 referências locais em 65 Markdown conferidas, sem arquivos/âncoras ausentes, excluindo blocos literais históricos. Escopo do diff conferido. Não houve alteração nos módulos funcionais de src/core/view/api/scripts nem no package/lockfile. A suíte não foi convertida em autorização para gravação de produção.

## Impacto e pendências de segurança

Agora todo dado de tabela exige sessão permanente; somente os dois UUIDs indicados podem realizar as escritas operacionais atuais. Catálogos e Master continuam com escrita administrativa separada. Nenhum dado foi movido para outra fonte e nenhuma regra investigativa foi modificada.

Advisors após a mudança: **zero rls_disabled_in_public** e **zero security_definer_view**. Permanecem duas ocorrências informativas de RLS sem policy em tabelas exclusivas de backend (agora sem grants de cliente), cinco ocorrências de search_path mutável e o alerta de proteção de senha vazada. Consulte [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não foram criadas policies amplas para silenciar os avisos informativos.

- **SEC-06/ERR-04:** handler save-doc continua sem autorização no código e com HTTP 500; RLS de tabelas não protege gravação no GitHub. Não recuperado/publicado nesta tarefa.
- **SEC-08:** search_path das funções legadas continua sem fixação; as funções são invoker e os EXECUTEs de cliente foram reduzidos. Não se alteraram seus corpos nem se alegou exploração; item permanece na lista ativa.
- **INDETERMINADO quanto à intenção/necessidade:** consumidores externos dos legados e proteção adicional de senhas. O catálogo também confirma defaults amplos de public para o owner gerido supabase_admin, que não foram alterados; a migration restringe os defaults do owner postgres das tabelas atuais. Novos objetos criados por outros owners precisam de revisão explícita de grants/RLS antes de exposição. Nenhuma tabela atual permanece aberta por essa ressalva.
- **Limite de validação administrativa:** saúde autenticada completa de TLS/Storage/flag não foi ensaiada por execução real. Guardas e autorização separada foram preservadas e testadas localmente; uma operação administrativa futura continua exigindo seu procedimento próprio.

Essas limitações não reabrem os acessos anônimos removidos das tabelas atuais. Não foi iniciada correção de P1 nem refatoração oportunista.

## Referências técnicas consultadas

Skill Supabase e skill PostgreSQL/RLS, changelog oficial e documentação de RLS/grants/views. [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API](https://supabase.com/docs/guides/api/securing-your-api), [triggers PostgreSQL 17](https://www.postgresql.org/docs/17/trigger-definition.html). Os avisos recentes de TLS/upgrade PostgreSQL foram conferidos sem introduzir mudanças de versão, cifra, CA ou extensão nesta entrega.
