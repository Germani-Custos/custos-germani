# Modelo de acesso — SEC-03

Contrato vigente após a migration de 22/10/2026, conferido no encerramento em **23/10/2026**. [Provas e limites](../auditoria/seguranca-rls-validacao.md). Este contrato sucede a abertura temporária registrada em maio; não altera classificação, cálculos, dados ou a semântica competência/importação.

## Decisão humana

O responsável escolheu: **todos os autenticados leem; somente administradores indicados importam e editam**. Indicou explicitamente **as duas contas existentes**:

- aprendizcustos@germani.com.br → UUID 14f1b3ff-0b22-495b-a1c3-9aebae13dc36.
- aprendizcustosger@gmail.com → UUID 72334848-f7d5-41bb-9e5d-eb4933d9d41c.

São administradores das operações atuais de importação de Custos/OP e edição do Cadastro Operacional. Essa indicação **não amplia a allowlist independente da reconstrução ERP**, que continua server-side. Não foi criada role PostgreSQL, tabela de autorização, schema, RPC, coluna de perfil ou alteração em auth.users.

Não existe necessidade identificada de leitura ou escrita anônima nos dados. Arquivos estáticos, documentação publicada e o formulário de login continuam acessíveis como recursos web; isso não concede acesso às tabelas. Usuário anônimo do Supabase Auth (is_anonymous=true) também não entra como leitor, ainda que o seu JWT carregue role authenticated.

A leitura é compartilhada entre usuários permanentes autenticados: fatos/dimensões não são particionados por autor ou tenant. Não usar criado_por/user_id como propriedade dos registros existentes, pois isso ocultaria o histórico legado e introduziria um modelo de negócio não aprovado.

## Matriz tabela × operação × consumidor × role

A coluna “role anterior” registra os privilégios anteriores à proteção. A coluna “role necessária” é a autorização efetiva implantada, combinando grant e RLS. Admin operacional é uma identidade autenticada com UUID indicado, não uma role PostgreSQL adicional.

| Tabela | Operação | Consumidor | Role anterior | Role necessária | Motivo |
|---|---|---|---|---|---|
| historico_custos | SELECT | getMasters, getHistorico, diagnóstico, comparação/TOP, getProductHistory, getProductMaster; gráficos/fila/exportação usam a leitura | anon/authenticated | authenticated permanente | investigação compartilhada e histórico integral |
| historico_custos | INSERT | importarHistoricoCustosComLog; upsertHistoricoCustos legado | anon/authenticated | authenticated + UUID admin operacional | importação existente |
| historico_custos | UPDATE | upsert dos mesmos métodos | anon/authenticated | authenticated + UUID admin operacional | reimportação da chave produto/competência |
| historico_custos | DELETE | nenhum frontend | anon/authenticated | backend autorizado; negado ao cliente | não há exclusão operacional |
| dicionario_produtos | SELECT | masters, enriquecimento Custos/OP, Cadastro e garantia de produtos | anon/authenticated | authenticated permanente | dimensão operacional comum |
| dicionario_produtos | INSERT | garantirProdutosNoDicionarioEmLote, upsertProductMaster; importProductMasterXlsm legado | anon/authenticated | authenticated + UUID admin operacional | preservar criação existente na importação e cadastro manual |
| dicionario_produtos | UPDATE | upsertProductMaster, garantia/importadores legados | anon/authenticated | authenticated + UUID admin operacional | edição operacional autorizada |
| dicionario_produtos | DELETE | nenhum frontend | anon/authenticated | backend autorizado; negado ao cliente | sem fluxo de exclusão |
| categorias_origem | SELECT | masters, enriquecimento, Cadastro e Preview | anon/authenticated | authenticated permanente | catálogo existente |
| categorias_origem | INSERT/UPDATE/DELETE | scripts históricos; nenhum escritor frontend atual | anon/authenticated | backend autorizado | não abrir CRUD de catálogo por hipótese |
| categorias_familia | SELECT | masters, enriquecimento, Cadastro e Preview | anon/authenticated | authenticated permanente | catálogo existente, inclusive famílias ERP |
| categorias_familia | INSERT/UPDATE | executor administrativo central da reconstrução | anon/authenticated sem RLS; backend | conexão administrativa existente | propostas aprovadas e revalidação transacional |
| categorias_familia | DELETE | nenhum fluxo atual aprovado | anon/authenticated | cliente negado; backend conserva privilégios anteriores | executor atual não exclui famílias |
| categorias_agrupamento | SELECT | masters, diagnóstico e editor operacional | anon/authenticated | authenticated permanente | opções de classificação e triagem |
| categorias_agrupamento | INSERT/UPDATE/DELETE | saneamento/seed histórico; nenhum frontend atual | anon/authenticated | backend autorizado | não reexecutar scripts históricos como rotina |
| log_importacao | SELECT | consulta autorizada de trilha; sem tela leitora específica localizada | anon/authenticated | authenticated permanente | decisão de leitura compartilhada dos registros operacionais |
| log_importacao | INSERT | importarHistoricoCustosComLog | anon/authenticated | authenticated + UUID admin operacional | iniciar registro do envio |
| log_importacao | UPDATE | fechamento da mesma importação | anon/authenticated | authenticated + UUID admin operacional | totais/status existentes |
| log_importacao | DELETE | nenhum fluxo atual | anon/authenticated | cliente negado | preservar trilha |
| apontamentos_op | SELECT | getApontamentosOp, getProductMaster | anon/authenticated | authenticated permanente | investigação/filtros/dossiê |
| apontamentos_op | INSERT | importarApontamentosOp | anon/authenticated | authenticated + UUID admin operacional | CSV MCAP105 existente |
| apontamentos_op | UPDATE/DELETE | nenhum escritor atual | anon/authenticated | cliente negado | OP usa INSERT; não criar edição/exclusão |
| log_importacao_op | SELECT | consulta autorizada de trilha; sem tela leitora específica localizada | anon/authenticated | authenticated permanente | leitura compartilhada de registros operacionais |
| log_importacao_op | INSERT | importarApontamentosOp | anon/authenticated | authenticated + UUID admin operacional | iniciar lote de OP |
| log_importacao_op | UPDATE | fechamento da importação de OP | anon/authenticated | authenticated + UUID admin operacional | status/totais existentes |
| log_importacao_op | DELETE | nenhum fluxo atual | anon/authenticated | cliente negado | preservar trilha |
| mapa_produtos | SELECT/INSERT/UPDATE | tg_categoriza_apos_import → fn_upsert_mapa_produtos_por_codigo(text) | anon/authenticated; função invoker | authenticated + UUID admin + pg_trigger_depth()>0 | preservar o efeito interno da importação de Custos, sem escrita direta do mapa |
| mapa_produtos | DELETE | nenhum fluxo atual | anon/authenticated | cliente negado | não há exclusão operacional |
| dicionario_master_produtos | SELECT | classificarCustos, consulta ERP e lerContextoCadastroMestrePreview | anon/authenticated, policy true | authenticated permanente | fonte ERP analítica/consulta/Preview |
| dicionario_master_produtos | INSERT/UPDATE/DELETE | reconstrução administrativa; executor comercial isolado só UPDATE | backend existente; grants de cliente excessivos | conexão administrativa existente, nunca browser | autorização/locks/snapshot/provas próprios |
| log_importacao_cadastro_mestre | SELECT/INSERT/UPDATE | função Vercel/CLI central | backend; cliente tinha grants mas sem policies | exclusivo backend | resultado por endpoint autenticado e autorizado |
| log_importacao_cadastro_mestre | DELETE | nenhum fluxo atual | grants amplos de cliente, RLS sem policy | cliente negado | não criar exclusão de auditoria |
| familias_base | todas | sem consumidor frontend localizado | grants de cliente, RLS sem policy | exclusivo backend | preservar acervo legado sem abrir nova leitura |
| vw_produtos_orfaos_agrupamento | SELECT | triagem SQL; frontend calcula diagnóstico nas tabelas | anon/authenticated por owner da view | backend; grants de cliente removidos, security_invoker=true | evitar caminho alternativo à RLS |
| Todas as tabelas acima | TRUNCATE/REFERENCES/TRIGGER | nenhum cliente atual | anon/authenticated | cliente negado | RLS não protege TRUNCATE; privilégio excessivo removido |

As operações de backend na matriz continuam sujeitas à autorização operacional já existente; preservar uma ACL de postgres/service_role não autoriza executar carga ou exclusão. Nenhuma necessidade de acesso público foi identificada.

## Categorias de acesso

- **Leitura autenticada:** historico_custos, dicionario_produtos, categorias_origem, categorias_familia, categorias_agrupamento, apontamentos_op, log_importacao, log_importacao_op e dicionario_master_produtos.
- **Escrita administrativa operacional pelo cliente autenticado:** INSERT/UPDATE em historico_custos, dicionario_produtos e os dois logs operacionais; somente INSERT em apontamentos_op. UUID admin obrigatório em cada policy de escrita.
- **Sem acesso direto necessário pelo frontend:** mapa_produtos. Grants técnicos de SELECT/INSERT/UPDATE continuam para executar o trigger invoker; RLS exige simultaneamente admin e profundidade de trigger. SELECT direto retorna zero linhas; INSERT direto falha e UPDATE direto não encontra linhas autorizadas.
- **Exclusivo backend:** familias_base, log_importacao_cadastro_mestre, view de triagem e escritas do Master/catálogos. A consulta do Master continua autenticada; escrita é uma fronteira diferente.
- **Leitura pública necessária:** nenhuma tabela.

## Chamadas e caminhos efetivos

Todo I/O de tabelas no browser permanece na fachada [src/services/api.js](../../src/services/api.js) e no leitor de contexto [cadastro-mestre-preview.js](../../src/services/cadastro-mestre-preview.js), chamado pela fachada com o mesmo cliente. O shim services/api.js apenas reexporta. Não foi criada chamada SQL/RPC no frontend.

- Leitor lerCompleto (api.js:126) sustenta getMasters, diagnóstico, getHistorico, comparação/TOP, getProductHistory e getProductMaster. lerDicionarioDosCodigos e enrichRowsWithClassificacaoCustos resolvem a dimensão antes da cascata.
- getMasters: SELECT em histórico, operacional, Master e três catálogos; diagnóstico isolado consulta histórico/operacional/agrupamentos.
- getProductMaster: SELECT operacional, catálogos, códigos de Custos/OP. getCadastroMestreErp e getCadastroMestrePreviewContext delegam ao contexto ERP, sem consultar famílias-base/log administrativo.
- upsertProductMaster: SELECT + UPSERT operacional. garantirProdutosNoDicionarioEmLote: SELECT + UPSERT operacional, preservado como parte da importação de Custos.
- importarHistoricoCustosComLog: INSERT/UPDATE em log_importacao, UPSERT em historico_custos e garantia operacional. UPSERT requer INSERT e UPDATE; não exige DELETE.
- importarApontamentosOp: INSERT/UPDATE em log_importacao_op e INSERT em apontamentos_op. getApontamentosOp enriquece com SELECT operacional/origem/família.
- Legados sem consumidor UI localizado: importProductMasterXlsm (SELECT operacional/origem/família + UPSERT operacional), upsertHistoricoCustos (UPSERT de fatos), getTrendsByProduct (SELECT de fatos), suggestCategory (SELECT operacional, sem heurística textual). Mantêm no máximo as permissões de sua operação, sem virarem novos fluxos publicados.
- view/ui-import.js, ui-import-op.js, ui-product-master.js, ui-op.js, ui-cadastro-mestre-erp.js e ui-cadastro-mestre-preview.js usam a fachada. Controllers de relatório, gráficos, drill-through e exportação consomem esses resultados/estado; exportar XLSX não grava banco.
- api/reconstruir-cadastro-mestre.js → scripts/lib/cadastro-mestre-web.mjs: getUser + allowlist UUID + origem + flag; SQL usa conexão administrativa TLS separada. Reconstrução central lê contexto/tabelas protegidas, escreve Master/log e INSERT/UPDATE aprovados em famílias; comercial isolado somente UPDATE comercial no Master. Locks/leituras protegidas exigem os privilégios administrativos antigos, preservados.
- Storage administrativo usa chave secreta apenas no servidor para snapshot privado. Esta migration não muda bucket/policies de Storage, CA, env, flag ou allowlist de reconstrução.
- api/save-doc.js acessa GitHub, não essas tabelas; SEC-06/ERR-04 continuam separados. scripts/create-master-user.mjs usa a Auth Admin API exclusivamente em processo administrativo; não participa da carga de dados.
- sql/*.sql conserva scripts de estrutura, seed, mapas, preservação e cargas históricas. São caminhos administrativos manuais; sua presença não autoriza reexecução. inserir_custo e a sobrecarga bigint do mapa não têm chamada ativa identificada; EXECUTE de PUBLIC/anon/authenticated foi removido. Nenhuma função foi chamada via RPC.

As linhas são referências ao checkout base; localizar por símbolo se houver deslocamento posterior. Busca realizada em src, services, view, api, scripts e sql, excluindo dependências, dist e fixtures de teste.

## Policies e privilégios implantados

[Migration versionada](../../sql/20261022191744_hardening_acesso_operacional_rls.sql), criada inicialmente por Supabase CLI 2.121.0. Aplicada remotamente como **20261022192657 / hardening_acesso_operacional_rls**. Não reexecutar: as guardas exigem o estado anterior de nove tabelas sem RLS e rejeitam drift de owner/policies/identidades.

São **21 policies**:

- kustos_leitura_autenticada: nove SELECTs nas fontes de leitura.
- kustos_insercao_admin: cinco INSERTs (operacional, fatos, logs Custos/OP, apontamentos).
- kustos_atualizacao_admin: quatro UPDATEs (operacional, fatos, logs Custos/OP), com USING e WITH CHECK.
- kustos_mapa_leitura_trigger, kustos_mapa_insercao_trigger e kustos_mapa_atualizacao_trigger: três policies internas do mapa.

Predicado de leitura: TO authenticated, auth.uid() não nulo e is_anonymous diferente de true. Predicado de escrita: leitura permanente + UUID na lista indicada. Chamadas invariantes de Auth são envolvidas por SELECT para evitar avaliação por linha. Não há USING(true), WITH CHECK(true), auth.role(), confiança em user_metadata nem mudança para SECURITY DEFINER.

Removidos todos os privilégios de PUBLIC/anon/authenticated nas 12 tabelas e na view; reatribuídos somente os grants exigidos pela matriz. Owner/service_role conservam suas ACLs anteriores. RLS das três tabelas já protegidas foi mantida; habilitada nas outras nove, sem FORCE que impedisse o mecanismo administrativo existente.

Sequências: anon sem acesso às cinco; authenticated apenas USAGE nas quatro operacionais, sem UPDATE/setval e sem sequência do log de Master. O grant técnico de sequência não substitui a policy de INSERT.

Funções públicas legadas: EXECUTE retirado de PUBLIC, anon e authenticated nas cinco assinaturas. Apenas fn_upsert_mapa_produtos_por_codigo(text) conserva EXECUTE de authenticated porque o trigger invoker a chama. A policy do mapa exige contexto de trigger, bloqueando a chamada direta que tentaria escrever. Defaults do owner postgres em public deixam de conceder automaticamente tabelas/sequências/funções aos clientes. Defaults de owners geridos pela plataforma fora desse contrato não foram alterados.

## Operação e limites

Troca/inclusão de administrador operacional exige indicação humana, conferência do UUID no Auth e nova migration de autorização; não alterar user_metadata para tentar conceder privilégio. Usuários permanentes autenticados futuros têm apenas a leitura aprovada até serem explicitamente indicados.

Em erro de permissão: conferir sessão, identidade, operação e tabela contra esta matriz; não habilitar escrita com true, conceder ALL ou desabilitar RLS. Reverter deployment não reverte a migration. Falha antes do COMMIT reverte a transação inteira; depois de confirmada, investigar e corrigir a autorização por alteração versionada, sem retorno automático ao acesso público.

**INDETERMINADO:** consumidores externos de RPCs legados e de scripts SQL sem integração atual não podem ser deduzidos por busca no repositório. Nenhum grant público foi mantido por essa hipótese; backend autorizado continua disponível. Saúde atual completa de TLS/Storage/flag e a identidade da conexão Vercel não foram inferidas das ACLs; a reconstrução não foi executada como teste. Objetos futuros criados por outros owners devem ter grants/RLS auditados antes de exposição; não declarar seus defaults geridos pela plataforma cobertos por esta migration.

Os controles de edição/importação podem continuar visíveis a um leitor na UI atual; a autorização efetiva está no banco. Não foi feita refatoração de UX ou correção de mensagens P1/P2. data_referencia permanece competência e criado_em permanece importação/proveniência.
