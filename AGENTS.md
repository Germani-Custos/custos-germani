Você está trabalhando no projeto **Kustos Germani**, um motor de investigação operacional de custos.

- Atualização 2026-10-30 (CUS-AGR-01 / PERF-03): Agrupamento de Custos permanece `dicionario_produtos.agrupamento_cod`, enriquecido pelo código de `categorias_agrupamento` (no catálogo real, `id` TEXT contém o código; `codigo` tem preferência quando presente). Só aparecem vínculos de produtos com custos, sem inferência textual/ERP ou categoria fictícia. Cache compara fotografia estruturada dos campos consumidos, incluindo fallback dicionário, vínculos e rótulos; mesma entrada reutiliza e mudança de conteúdo invalida mesmo com tamanhos iguais. Realtime recebido relê masters completos; reset de grupo recalcula produtos pelo valor aceito. Família/Origem limpam dependentes; reload preserva apenas seleções válidas. Drill-through fecha produto excluído do relatório e recorte vazio limpa `reportRows`, impedindo XLSX antigo. Leitura real: 6.113 operacionais, 34 categorias, único vínculo TESTE123/SEM_AGRUPAMENTO sem custos; 447 produtos com custos/zero agrupamentos, tela 12 origens/37 famílias/zero grupos. UI local autenticada conferida, mas seleção positiva de grupo real indisponível sem classificação existente; não fabricar dados. PERF-03 corrigido localmente; nenhuma alteração de classificação, alerta, prioridade/TOP-200, parser/importador, OP/OP×CUSTO, schema/RLS/Auth ou dados de produção. `data_referencia` é competência e `criado_em` evento/importação. Sem importação real, commit/push/deploy. Provas em docs/auditoria/custos-agrupamento-validacao.md.

- Atualização 2026-10-29 (A360-OP-02 / VAL-03): parser MCAP105 valida formato da OP antes de remover milhar e rejeita por linha fora do payload; inteiro assinado de 32 bits, zero/negativos preservados, sem fração/exponencial/pontuação ambígua. `validateApontamentoOpRow` puro é compartilhado com a defesa da API; metadados de linha física e erros seguem separados dos fatos. API exige ID de log confirmado, filtra antes dos chunks de 400 e distingue validação, falha operacional, persistência indeterminada e falha de fechamento. Estados OP: processando/concluido/parcial/rejeitado/erro/indeterminado; contadores conhecidos reconciliáveis, indeterminado não fecha balanço nem timestamp final. UI mostra diagnósticos completos, bloqueia execução simultânea e reapresenta a mesma tentativa (conteúdo + competência) sem reenvio no mesmo controller; não garante idempotência entre abas/reloads. Arquivo totalmente rejeitado no preview não cria log/fato remoto; detalhes por linha/chunk são transitórios, schema guarda somente contagens/status existentes. Sem retry automático, nova chave de conflito ou schema. MNT-OP-01/02/03/05, motores/OP×CUSTO/Custos/RLS/Auth preservados; data_referencia continua competência e criado_em importação/default. Implementação e testes locais, sem carga real, migration, commit/push/deploy; ERR-03 corrigido somente no alcance OP, restante aberto. Contrato na matriz operacional e provas em docs/auditoria/robustez-erros-validacao.md.

- Atualização 2026-10-29 (LOG-02 busca de original multichunk): busca somente leitura em toda a origem autorizada pedro e subpastas, 194 arquivos Excel/622.446.506 bytes, primeira aba integral conforme importador; um temporário ignorado, zero erros. Identificados 53 candidatos de Custos; maior 357 linhas com nome de teste, original já autorizado 349. Nenhum original elegível >400, hashes dos 53 candidatos preservados. Não combinar arquivos/abas/competências, duplicar ou fabricar dados para satisfazer o teste. LOG-02 permanece PARCIAL; nenhum novo batch/chunk/fato, acesso/escrita Supabase, schema/migration/RLS/Auth ou código funcional nesta busca. data_referencia é competência humana confirmada, nunca data do arquivo/criado_em. Provas em docs/auditoria/custos-lote-busca-multichunk.md; lotes 30/31 são evidência anterior, não teste multichunk. Sem commit/push/deploy.

- Atualização 2026-10-29 (LOG-02 ativação controlada, PARCIAL): pausa atual dos writers confirmada pelo humano; conexão Supabase/Custos-Germani e catálogo revalidados. Aplicada somente a migration preparada 20261026185939_custos_proveniencia_lote.sql como versão remota 20261029165515; BIGINT NULL sem default, FK DELETE/UPDATE RESTRICT não diferível e índice parcial não único. Pós-DDL: 2.481 legados NULL e dados anteriores/permissões/objetos anteriores preservados nas 12 tabelas. Backup atual durável fora do repo; FK inválida rejeitada em sonda revertida. Arquivo original 14_10.xlsx/14-10-2026 autorizado, 349 linhas válidas: importador oficial local autenticado gravou lotes 30 e 31, 349 sucessos/zero falhas cada. Upsert trocou somente o vínculo atual 30→31 nas mesmas 349 chaves; total 2.481 fatos, 2.132 legados não tocados NULL, custos/IDs/datas/criado_em e demais tabelas/logs antigos preservados. Um chunk por execução; por decisão humana, múltiplos chunks em produção permanecem PENDENTES, sem concatenar/inventar dados. Custo total remoto é NUMERIC(15,2), componentes NUMERIC sem escala fixa: precisão existente preservada; data_type sozinho não prova escala. Cliente local validado; GETs dos módulos publicados de API/importação/shim iguais ao checkout, sem atribuir origem da publicação ou comprovar atualização de todas as abas antigas. Nenhum deploy nesta tarefa; manter controle de writers antigos/admin. Código funcional/migration preparada/OP/OP×CUSTO/fila/prioridade/exportação/RLS/Auth preservados; data_referencia é competência, criado_em mantém timestamp/default e FK é última execução da versão atual. Sem snapshots/RPC/commit/push/deploy. Provas em docs/auditoria/custos-lote-ativacao-validacao.md; não declarar LOG-02 concluído.

- Atualização 2026-10-29 (LOG-02 persistência preparada): writer local transmite log_importacao_id da PK textual confirmada do log em todos os fatos no mesmo upsert, ignora lote externo e valida RETURNING por chave/ID/lote, sem patch posterior/N+1/retry automático. upsertHistoricoCustos legado bloqueado antes de I/O. Migration 20261026185939_custos_proveniencia_lote.sql gerada por CLI, ensaiada em PostgreSQL isolado: BIGINT NULL sem default, FK DELETE/UPDATE RESTRICT não diferível e índice parcial não único; legado NULL sem backfill, chave produto/data e criado_em preservados. Catálogo real confirmado por SELECT em 29/10; por decisão humana nesta data, SOMENTE preparação local, sem aplicar migration nem gravar dados remotos. LOG-02 permanece PARCIAL: aplicação exige nova janela pausada/revalidação/backup e ativação dos writers compatíveis, inclusive clientes antigos. Não usar novo writer com schema antigo. Comparação/OP/OP×CUSTO/fila/prioridade/TOP-200/exportação/parser/Cadastro/RLS/Auth preservados; sem commit/push/deploy. data_referencia é competência; criado_em conserva timestamp existente; FK identifica última execução da versão atual, sem snapshots. Contrato em docs/arquitetura/identidade-lote-custos.md; provas em docs/auditoria/custos-lote-persistencia-validacao.md. Sucede apenas os limites de preparação local da nota LOG-02 anterior.

- Atualização 2026-10-26 (LOG-02 parcial): importação auditada de Custos reutiliza log_importacao.id confirmado como batchId textual da execução; sem ID/erro de criação, nenhuma preparação operacional ou gravação de fato começa. Um contexto por chamada acompanha todos os chunks e o fechamento, inclusive falhas parciais/rejeições, sem identidade por timestamp/chunk. Retorno e resultado mostram batchId/controle dos chunks e ausência explícita de vínculo persistido no fato. O schema versionado não tem FK de lote em historico_custos; proposta somente documental, sem migration/DDL/DML remoto. LOG-02 permanece ativo/parcial; comparação A360-CUS-04 não muda, nem fila/prioridade/TOP-200/exportação/OP/OP×CUSTO/parser/Cadastro/RLS/Auth. data_referencia é competência, criado_em timestamp existente e lote é a execução; upsert/chave/ausência de snapshots preservados. Sem commit/push/deploy. Contrato em docs/arquitetura/identidade-lote-custos.md; proposta em docs/arquitetura/proposta-vinculo-lote-custos.md; provas em docs/auditoria/custos-identidade-lote-validacao.md.

- Atualização 2026-10-26 (LOG-03 / A360-CUS-04): comparação/TOP leem primeiro o recorte de data_referencia completo (500/count exact/ordem criado_em DESC + id), enriquecem e aplicam cascata/produto antes dos dois timestamps distintos. Estado insuficiente explícito com zero/um evento; denominador zero gera percentual null, sem estabilidade fictícia. Por decisão humana, TOP passa a produto canônico + data_referencia completa, com IDs por lado e semComparativo; datas distintas não formam pares e ambiguidades não escolhem vencedor. UNIQUE produto/data e upsert limitam a retenção desses pares; sem schema/histórico fabricado. LOG-02 permanece aberto. Fila/prioridade/TOP-200/exportação/drill-through/OP/OP×CUSTO/alerta/parser/importação intactos; data_referencia é competência e criado_em importação/proveniência. Sem escrita remota/migration/RLS/Auth, commit/push/deploy. Contrato em docs/arquitetura/comparacao-temporal-custos.md; provas em docs/auditoria/custos-comparacao-recorte-validacao.md.

- Atualização 2026-10-26 (LOG-04/06): fila de Custos e XLSX usam getOrderedInvestigationRows sobre o recorte completo; qualquer chave explícita, inclusive variacao, é manual. Restaurar prioridade investigativa limpa somente chave/direção, preservando filtros/recorte. Prioridade/comparador/limiares existentes e TOP-200 preservados; descrição de Monitorar perde alegação de recorrência. Contexto não infere segunda ocorrência de sinais agregados; XLSX nomeia Alerta atual (≥5%) e distingue SEM COMPARATIVO de NÃO. ReportRow não prova contagem histórica, portanto não anuncia recorrência mesmo quando a série permitiria comprová-la; essa evolução exige contrato próprio. OP/OP×CUSTO, core/API/parser e dados/schema/migrations/RLS/Auth intactos; data_referencia continua competência e criado_em importação/proveniência. Implementação local, sem commit/push/deploy ou acesso remoto. Provas em docs/auditoria/custos-fila-validacao.md.

- Atualização 2026-10-23 (OP-CUSTO-F2): apresentação mensal OP × CUSTO implementada localmente como subpainel da tela OP. Botão exige De = Até explícito válido; ui-op-custo consome getOpCustoContext integral, injeta prioridade Custo pelo presenter existente e apresenta o resultado do engine sem nova classificação. Cobertura/qualidade antecedem a escolha explícita de incluir B/C ou somente A; ausência permanece ausente. Fila com filtros locais e paginação visual de 50 após o conjunto completo, modos independentes de prioridade OP/Custo, busca canônica exata local com D e dossiê de todos os eventos/snapshots da competência. Retorno preserva DOM/estado OP e scroll/foco; nova leitura renova a escolha, resposta obsoleta é invalidada. Motores/API/parser/TOP-200/ranking existentes, Supabase/dados/schema/migrations/RLS/Auth preservados; sem commit/push/deploy. data_referencia continua competência e criado_em importação/proveniência. Contrato em docs/arquitetura/op-custo.md; escopo/provas em docs/auditoria/op-custo-fase2-validacao.md.

- Atualização 2026-10-23 (OP-CUSTO-F1): núcleo local OP × CUSTO implementado sem UI. core/op-custo-engine.js recebe contexto/InvestigationResult por ID/resultados e flags originais de Custo; preserva eventos, snapshots, prioridades separadas e retorna cobertura A/B/C, D explícito, diagnósticos e relação sem causalidade. Consolidação numérica indisponível; nenhuma OP mensal/score/ranking conjunto. getOpCustoContext usa somente SELECT/from, mês inteiro em páginas 500/count exact/ordem total/IDs únicos, dimensão compartilhada e resultados adaptados sem lógica relacional na API. Produto opcional é metadado, não filtro do universo; custo aguarda prioridade do presenter existente, sem importá-lo na API/core. relacao.codigo preserva o contrato e relacao.tipo identifica os aliases solicitados na Fase 1. Precisão de importação preserva microssegundos e empates reais ficam ambíguos. Sem alteração de motores legados, parser, UI/CSS/TOP-200, Supabase/dados/schema/migrations/RLS/Auth; sem commit/push/deploy. data_referencia continua competência e criado_em importação/proveniência. Contrato em docs/arquitetura/op-custo.md; provas em docs/auditoria/op-custo-fase1-validacao.md.

- Atualização 2026-10-23 (OP-CUSTO-01): contrato técnico final em docs/arquitetura/op-custo.md, exclusivamente documental; implementação não iniciada. Relação por código canônico + competência AAAA-MM, preservando datas integrais, eventos OP e série disponível de custos; referência por criado_em dentro da competência, com ausência/ambiguidade explícitas. Cobertura A/B/C somente após ambas as leituras completas de 500/count exact/ordem total/IDs únicos; D somente por busca explícita. Incluir casos sem correspondência exige escolha humana na futura UI; ausência nunca vira zero nem fonte indisponível vira vazia. Matriz relacional aprovada sem causalidade; prioridades originais separadas, sem score conjunto ou alteração de TOP-200. Consolidações numéricas OP indisponíveis sem prova ERP de granularidade/unidade/aditividade; multi-competência fica futura. Novo engine/API/botão não foram criados; nenhum código, dado, schema, migration, RLS/Auth ou parser alterado. Sem acesso remoto, carga, commit, push ou deploy. data_referencia continua competência e criado_em importação/proveniência.

- Atualização 2026-10-23 (LOG-05): fila de Custos inicia sem chave manual e usa o comparador investigativo existente antes de slice(0,200). Criticidade > regime > magnitude absoluta > flag de alerta > instabilidade > código; funções transferidas sem mudança de corpo para ui-table e reexportadas em ui-export. Não alterar pesos, alerta, instabilidade, motor, candidatos ou limite DOM. Cabeçalho seleciona ordenação manual; aviso distingue prioridade automática de ordem escolhida. KPIs/reportRows/exportação padrão preservam conjunto completo. Outubro real: 558 fatos/349 produtos, cinco alertas antes em 345–349 passam a 1–5; 200 linhas visíveis. LOG-04/narrativa e LOG-06/ordem manual do XLSX permanecem separados. data_referencia é competência e criado_em importação/proveniência. Sem escrita Supabase/Auth/RLS/schema, commit/push/deploy; publicação aguarda autorização. Contrato em docs/arquitetura/matriz-contratos-operacionais.md; provas em docs/auditoria/custos-top200-validacao.md.

- Atualização 2026-10-23 (MNT-OP-05): getApontamentosOp reutiliza lerCompleto em páginas de 500/count exact; filtros repetidos antes de cada range, ordem anterior competência DESC/estágio/origem/OP com id ASC como desempate. Contagem alterada/ausente, página incompleta, erro ou ID repetido bloqueiam resultado parcial. Enriquecimento operacional usa leitor IN existente e catálogos paginados, sem alterar classificação. Carga local única, filtros, fila/dossiê e motor investigativo preservados. Leitura autenticada local real: 1.469 carregados/investigados/exibidos, 299 gargalos versus 222 nos primeiros 1.000; SHA-256 de OP idêntico antes/depois. 647 testes, lint/typecheck/build; sem escrita remota, alteração de Auth/RLS/schema, commit/push/deploy. Publicação exige autorização própria. data_referencia continua competência e criado_em importação/proveniência. Contrato em docs/arquitetura/matriz-contratos-operacionais.md; provas em docs/auditoria/op-paginacao-validacao.md.

- Atualização 2026-10-23 (SEC-03 / SEC-07): modelo indicado pelo humano: leitura compartilhada para permanentes autenticados; as duas contas indicadas, conferidas por UUID, importam Custos/OP e editam o operacional. Migration remota 20261022192657 aplicada em 22/10: RLS nas nove tabelas, 21 policies, grants de cliente mínimos nas 12 tabelas, view sem acesso de cliente/security_invoker=true, sequências e EXECUTEs reduzidos. Trigger invoker do mapa preservado por policies de admin + pg_trigger_depth()>0; nenhuma role/schema/RPC/credencial de browser nova. Master/catálogos mantêm escrita por backend e allowlist de reconstrução independente. Ensaios SQL com rollback/IDs explícitos, negativas REST e 627 testes; não houve carga/commit/push/deploy. Preservação das 12 tabelas no hardening e nos ensaios finais; lote 5 posterior registrado separadamente, sem atribuir origem por suposição. SEC-06/ERR-04 e SEC-08 continuam pendentes. data_referencia permanece competência e criado_em importação. Contrato em docs/arquitetura/modelo-acesso-rls.md; provas em docs/auditoria/seguranca-rls-validacao.md.

- Atualização 2026-10-22 (DOC-BACKLOG-01): reconciliação exclusivamente documental do backlog com código/testes/GETs e SELECTs. Fonte ativa única em docs/auditoria/backlog-priorizado.md: 29 correções com contrato; inventário/estados/limites e origem do site em docs/auditoria/backlog-reconciliacao-2026-10-22.md. Originais integrais preservados em docs/auditoria/backlog-historico.md; README resume, ROADMAP guarda capacidades futuras e temáticos permanecem provas datadas. Publicação do site continua no snapshot anterior até autorização própria. Nenhuma implementação funcional, escrita Supabase, carga, migration, commit, push ou deploy; aguardar aprovação para executar itens. data_referencia continua competência e criado_em importação/proveniência.

- Atualização 2026-10-22 (CAD-ERP-TABLE-01): tabela de consulta do Cadastro Mestre ERP tem cinco colunas: Código, Descrição, Origem, Família e Agrupamento comercial. Agrup. Prod. sai somente da apresentação; par comercial aparece como código — descrição, somente o valor existente em campos parciais e Não informado quando ambos vazios, com escape HTML. Modelo/API/importador/executores/filtros/classificação/operacional/Custos/OP/schema e identidade Black + Purple preservados. Validação real somente SELECT; sem escrita remota, migration, commit, push ou deploy. data_referencia continua competência e criado_em importação. Provas em docs/auditoria/cadastro-mestre-comercial-validacao.md.

- Atualização 2026-10-22 (IMP-PEND-01): importação de Custos consulta o operacional completo via getProductMaster, não a lista analítica de produtos com fatos. listarProdutosSemCadastro produz conjunto único normalizado compartilhado por warnings, quantidade e lista integral no Preview/resultado. Descrição é rótulo original; usar primeira não vazia por código e ausência explícita sem mudar validação/payload. Por decisão humana, fotografia anterior ao envio: a API legada já tenta criar ausentes e permanece intacta. Botão leva contexto ao Cadastro Operacional; consultar/preparar preenche formulário, sem salvar automaticamente ou exigir redigitação. Sem filtro múltiplo, nova persistência/API/RPC/schema ou classificação. Black + Purple preservado; data_referencia continua competência e criado_em importação. Provas em docs/auditoria/robustez-erros-validacao.md.

- Atualização 2026-10-22 (CUSTOS-DATA-01): somente a segunda coluna do Histórico de Importações do produto passa de Importado em para Data, exibindo `historico_custos.data_referencia` completo em DD/MM/AAAA, sem horário/conversão UTC ou dia fixo. Competência mantém mês/ano; uma linha por registro retornado, inclusive duas datas no mesmo mês (05/10 e 14/10). Payload/API, recorte, ordem, deltas, filtros, cálculos e visual preservados. `data_referencia` continua competência e `criado_em` importação/proveniência, sem exibição nesta coluna. Sem escrita remota, schema, migration, commit, push ou deploy. Provas em docs/auditoria/robustez-erros-validacao.md.

- Atualização 2026-10-22 (CAD-COM-EXEC-01): executor administrativo isolado `executarCargaComercial` revalida XLS/adapter V3, manifesto comercial/hash e fotografia da Fase A; exige 860 identidades existentes, 162 produtos/324 valores, 698 pares NULL, 29 códigos e zero conflitos/inferências. Sob locks, exige igualdade integral do Master/catálogos com a fotografia; única escrita é UPDATE parametrizado do par comercial, sem timestamps, proveniência, logs, INSERT/DELETE ou outras tabelas. Imagens integrais/provas antes/depois bloqueiam COMMIT divergente; falha reverte integralmente, COMMIT incerto não autoriza retry. CLI novo somente valida localmente, sem opção de execução. Executor geral/UI/schema intactos. Sem conexão/escrita real, migration, commit, push ou deploy; carga exige nova autorização. data_referencia continua competência e criado_em importação. Contrato em docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md; provas em docs/auditoria/cadastro-mestre-comercial-executor-isolado.md.

- Atualização 2026-10-19 (CAD-COM-PROD-01): aplicada somente a migration comercial no Supabase Custos-Germani (umpebdovrazzrdndhigc), versão remota 20261019173633 / cadastro_mestre_agrupamento_comercial_erp, a partir do arquivo local 20261019163220. Duas colunas TEXT NULL sem default/FK/índice/backfill; 860 produtos com ambos os campos NULL. Backup local prévio e comparação integral dos nove campos anteriores do Master; contagens e SHA-256 das 12 tabelas públicas idênticos antes/depois, inclusive operacional/Custos/OP/mapa. Constraints, índices, RLS/policies/grants e triggers preservados. Registro anterior CAD-COM-01 descreve a fase local antes desta aplicação. Sem carga XLS, reconstrução, publicação, commit ou push; próxima etapa exige nova autorização. data_referencia continua competência e criado_em importação. Provas em docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md.

- Atualização 2026-10-19 (CAD-VOL-01): investigado timeout do teste sintético de 6.230 linhas do transporte Master. Grafo de onze módulos idêntico ao HEAD, sem UI/configuração nova; medições isoladas determinísticas e timeout reproduzido sob concorrência padrão. Somente esse `it` em tests/cadastro-mestre-execution-data.test.js recebe limite local de 10 s; timeout global de 5 s, fixture integral, validações/hashes/POST e regras de negócio permanecem. Provas em docs/auditoria/cadastro-mestre-payload-validacao.md. Suíte integral com dois workers: 554/554; timeout separado do build foi observado antes/depois na concorrência padrão, sem mudar seu teste. Sem commit/push/deploy ou consulta/escrita remota. data_referencia continua competência e criado_em importação.

- Atualização 2026-10-19 (VIS-01): identidade Black + Purple centralizada nos tokens de `assets/style.css`, incluindo acesso/login, cards dos módulos existentes na Importação, formulários, tabelas, KPIs, modais e cores Chart.js. Documentação usa azul-violeta; controles administrativos existentes usam violeta/magenta. Cores operacionais críticas/atenção/favoráveis/informativas e textos/decisões permanecem explícitos. Não criar Dashboard ou Configuração fictícios: o checkout mantém cinco views e os cards reutilizam a navegação existente. Sem alteração funcional de motores, APIs, consultas, filtros, cálculos, classificação, importação ou execução; `data_referencia` continua competência e `criado_em` importação. Conferência local com dados sintéticos e três viewports em `docs/auditoria/identidade-visual.md`; nenhum commit/push/deploy/banco.

- Atualização 2026-10-19 (CAD-COM-01): adapter reconhece somente Agrup. Com. e Descrição (Agrup. Com.) como agrupamento_comercial_erp_cod/agrupamento_comercial_erp_descricao, opcionais e independentes de Agrup. Prod./Custos/Est./Fiscal e do agrupamento Kustos. Preenchido atualiza; célula comercial vazia limpa existente para NULL por decisão humana; coluna ausente preserva. Demais regras de vazios não mudam. Não inferir ou completar campos parciais. Conflitos de descrição de um código comercial do universo, conferidos em todas as ocorrências, bloqueiam reconstrução. Transporte V3 de onze posições e manifesto RECONSTRUCAO_UNIVERSO_V2 exigem novo Preview/aprovação e publicação compatível; snapshots integrais/locks/provas/rollback e aprovação integral mantidos. Migration 20261019163220 adiciona apenas duas colunas TEXT NULL sem default/FK/índice/backfill no Master, preparada e não aplicada remotamente. Sem alterações em dicionario_produtos, fatos, categorias_agrupamento, mapa, OP ou classificação analítica de Custos; data_referencia continua competência e criado_em importação. Ver docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md. Sem commit/push/deploy ou execução remota.

- Atualização 2026-10-16 (CUSTOS-ERP-01): exclusivamente na análise de Custos, origem/família do Master ERP têm autoridade quando o código existe nele, inclusive campos vazios/sem resolução; fallback operacional somente fora do Master. Resolver categorias por codigo exato para FK/rótulo oficiais, sem texto ou UUID como código. Projeção pura em memória compartilhada por hierarquia, histórico, gráficos e drill-through, antes da cascata; fila/exportação derivam do mesmo recorte. Agrupamento continua operacional e descrição preserva a regra de cada fluxo (snapshot no drill-through); agrupamento ERP nem é selecionado. Sucede a exclusividade operacional de origem/família de Custos dos contratos anteriores, sem alterar OP/Cadastro, executor, dados, schema ou paginação de 500/count exact/falha explícita. data_referencia continua competência e criado_em importação. Validação local e real GET em docs/auditoria/custos-classificacao-erp.md; sem commit/push/deploy.
- Atualização 2026-10-16 (DOC-ORG-01): organização exclusivamente documental. README apresenta o sistema/estrutura atual; VISION guarda identidade/princípios/direção; ROADMAP agrupa iniciativas por estado/prioridade; este arquivo mantém contratos obrigatórios; docs/regras-gerais.md mantém processo/governança; manuais descrevem procedimentos atuais; arquitetura detalha contratos; auditoria guarda diagnósticos/backlog/provas; docs/HISTORIA_DO_PROJETO_KUSTOS.md concentra narrativa e marcos. Git permanece fonte oficial dos commits. Atualizar documentos afetados no mesmo conjunto de mudanças, sem inserir changelog no README/VISION/ROADMAP/manuais. As entradas datadas existentes deste AGENTS foram preservadas integralmente: limites “nesta fase/entrega” registram seu escopo original; sucessões explícitas dos contratos especializados devem ser lidas antes de aplicar restrições antigas a fases posteriores. Não inferir estado de produção de relato histórico ou mudar contrato por reorganização. data_referencia continua competência e criado_em importação, sem alteração. Inventário/divergências/validação em docs/auditoria/reorganizacao-documental.md.

- Atualização 2026-10-16 (CUSTOS-PAGE-01): API compartilha o leitor integral do Cadastro com as leituras da Auditoria de Custos: hierarquia/catálogos, diagnóstico, histórico, gráficos e drill-through. Páginas de 500/count exact, ordem total por código/PK ou competência/importação/PK; falha, página incompleta ou contagem alterada bloqueiam resultados parciais. Dimensão por IN em blocos sem teto total; enriquecer antes da cascata. GetMasters falha explicitamente se fonte da hierarquia falhar; diagnóstico isolado mantém indisponivel. Não mudar classificação, filtros/cálculos, OP, Master ERP, schema ou dados. data_referencia é competência e criado_em importação, intactos. Validação real exclusivamente GET: 6.113/1.370/437/zero ausentes, 437 origens/151 famílias/zero agrupamentos; provas de operacional/fatos idênticas antes/depois. Ver docs/arquitetura/matriz-contratos-operacionais.md.

- Atualização 2026-10-15 (CAD-FAM-01): adapter único captura familia_descricao_erp; transporte V2 em tupla de nove posições, sem XLS bruto. Core puro propõe catálogo apenas por código exato das famílias do universo efetivo; verificar conflitos em todas as ocorrências desses códigos, sem ampliar universo, resolver por texto ou escolher vencedor. Preview separa famílias/produtos e decisões próprias; aprovação integral mantida. Executor único revalida sob locks Master/log/famílias, permite somente INSERT e patch de descrição aprovados, prova integral do catálogo e snapshot apenas das famílias afetadas, transação/rollback conjunto e auditoria. ID/código/criado_em de existentes e demais tabelas protegidos. Nova revisão/UI/função V2 compatíveis obrigatórias. Validação real somente GET: 860/81/16/65/693, zero escrita/deploy/migration/env/commit. data_referencia/criado_em dos fatos intactos. Ver docs/arquitetura/cadastro-mestre-familias-erp.md.

- Atualização 2026-10-15 (CAD-FAM-SCHEMA-01): aplicada migration isolada `20261015182351_categorias_familia_descricao_nao_unica`, removendo somente `UNIQUE(descricao)` de `categorias_familia` e seu índice de suporte, com RESTRICT. PK(id), índice único de codigo e NOT NULL(descricao) preservados; 38 registros/35 códigos não nulos/38 descrições, dados e fingerprints protegidos idênticos. Código identifica família; rótulos podem repetir entre códigos diferentes. Backup local prévio; rollback preparado e não executado (futuras duplicidades impedem sua recriação, sem saneamento automático). Não implementa cadastro automático nem altera executor, Master, operacional, mapa ou fatos. data_referencia/criado_em intactos. Ver docs/arquitetura/migracoes.md.

- Atualização 2026-10-15 (CAD-ERP-VIEW-01): Cadastro oferece painéis Operacional e Mestre ERP com totais dinâmicos e filtros/estado independentes. `getCadastroMestreErp()` reutiliza SELECT integral paginado do Master/catálogos; não consulta operacional/fatos/mapa. Núcleo puro usa normalização e `resolverCodigoExato` existentes, sem executar filtros do arquivo ou inferir classificação. Origem/família usam categorias.codigo exato; agrupamento somente agrupamento_erp_valor. UI ERP somente consulta, páginas visuais de 50 sobre páginas Supabase de 500; atualização de consulta é leitura. Cadastrar/editar permanece operacional; Preview comum intacto. Sem schema/dados/sincronização/reconstrução; data_referencia/criado_em intactos. Ver docs/ux/cadastro-mestre.md.

- Atualização 2026-10-15 (CAD-OP-PAGE-01): `getProductMaster()` continua consultando a dimensão operacional `dicionario_produtos`; pagina também os códigos de `historico_custos` e `apontamentos_op`, em 500 linhas ordenadas por código com count exact, rejeitando páginas incompletas/contagem alterada. Calcular ausentes somente após as três leituras completas, reutilizando normalização/deduplicação existentes. Aviso deve nomear cadastro operacional, nunca confundir com os 860 do Master ERP. Não sincronizar, excluir operacional, criar visão ERP ou escrever dados como parte dessa leitura. `data_referencia`/`criado_em` intactos. Ver docs/ux/cadastro-mestre.md.

- Atualização 2026-10-09 (CAD-PAYLOAD-01): original XLS/XLSX/XLSM permanece no Preview; POST web envia dados ERP canônicos compactos de todas as linhas, decisões/hash/confirmacao/lote, sem binário/base64/gzip/manifesto/contexto duplicados ou patches confiados ao cliente. Hash dos dados integra a fonte do manifesto antes da aprovação. Servidor valida formato/hash, relê contexto e regenera manifesto pelos motores existentes; executor revalida novamente sob locks, mantendo snapshot/transação/rollback/provas. CLI mantém modo original. Hash de arquivo no modo web é proveniência declarada, não prova independente dos bytes/origem ERP. Teto JSON de 4 MiB continua; não aumentar teto do XLS como solução. CAD_UI é identificador local até persistência do log no COMMIT. Não alterar filtros/schema/env/flag nem fatos/operacional/mapa; data_referencia e criado_em intactos. Ver docs/arquitetura/cadastro-mestre-execucao-web.md.

- Atualização 2026-10-09 (CAD-DIAG-TLS-01): metadados CA/endpoint apenas no GET verificar=1 após getUser/allowlist. Retornar tamanhos, flags PEM, parsing X.509 e fingerprint DER SHA-256; nunca CA/URI/senha/tokens/erro bruto. Ler connectionParameters do pg sem serializá-lo; host restrito ao formato Supabase, usuário de pooler com referência mascarada e valores arbitrários ocultos. Parsing não prova confiança/validade temporal. Não normalizar PEM ou alterar rejectUnauthorized=true/env/POST/executor. Sem DML/upload/snapshot/lote; data_referencia e criado_em intactos. Ver docs/arquitetura/cadastro-mestre-preparacao-ambiente.md.

- Atualização 2026-10-09 (CAD-DIAG-01): GET verificar=1 identifica configuração/auth/autorização/PostgreSQL/TLS/Storage/bucket e guardas de leitura por catálogo fechado de códigos/mensagens. Nunca encaminhar message/detail/hint/stack/cause bruto nem código arbitrário. Instrumentação somente no GET; POST/executor/flag intactos, sem DML/upload/snapshot/lote. Publicado após autorização humana em Production (B2mVXerHzJjbRjaYHSjZMm3TWPvF, READY, flag false/configuração OK no GET público); confirmação do erro original autenticado pendente. 409 anterior é genérico e não comprova COMMIT. Ver docs/arquitetura/cadastro-mestre-preparacao-ambiente.md. data_referencia/criado_em intactos.

- Atualização 2026-10-09 (CAD-ENV-01): build-web publica apenas dist por allowlist; nunca publicar api/scripts/executor/.env/dependências/SQL. Diagnóstico GET verificar=1 autentica getUser/UUID allowlist e valida bucket privado, contexto/guardas centrais/privilégios/policies em READ ONLY/ROLLBACK, mesmo com flag false, sem executor/lote/upload. Allowlist inicial somente usuário indicado e confirmado por SELECT no Auth; não inferir outros admins. Deploy/env/bucket reais ainda pendentes; endpoint público 404 na verificação. Não habilitar/reconstruir como teste. Nenhuma escrita de produção/migration/snapshot/commit; fatos mantêm data_referencia como competência e criado_em como importação. Ver docs/arquitetura/cadastro-mestre-preparacao-ambiente.md.

- Atualização 2026-10-09 (CAD-EXEC-WEB-01): execução explícita de reconstrução pela UI usa função Node Vercel autenticada por Supabase Auth, allowlist server-side/origem exata e gate desabilitado por padrão. Reutilizar plano/executor centrais; nunca importar pg/conexão administrativa no browser. Aprovação/download permanecem locais; POST exige aprovação integral, hash e segunda confirmação. Snapshot web em bucket privado existente, sem sobrescrita, conferido por download/hash antes do DML; CLI mantém wx/fsync. Lote/provas/rollback preservados, GET de resultado somente SELECT, sem retry automático. Nenhuma carga real/deploy/schema/fatos/operacional/mapa nesta entrega; data_referencia é competência e criado_em importação, intactos. Ver docs/arquitetura/cadastro-mestre-execucao-web.md.

O sistema NÃO é:

* ERP genérico
* CRUD administrativo
* dashboard decorativo
* réplica de Power BI ou Metabase

O sistema É:

* ferramenta de investigação operacional de custos
* camada analítica sobre dados ERP/SAP
* cockpit de auditoria investigativa
* motor de detecção de anomalias operacionais

---

- Atualizacao 2026-08-10 (MNT-OP-04): `view/ui-op.js` usa uma carga local unica de `apontamentos_op`; filtros e periodo devem recalcular fila e dossie nela, e `view/ui-import-op.js` deve solicitar recarga apos importacao bem-sucedida. Nao usar periodo fixo nem consulta nova por mudanca pequena. `data_referencia` e competencia; `criado_em` e evento de importacao.

# PRINCÍPIO MAIS IMPORTANTE

## Velocidade de investigação acima de tudo.

Toda mudança deve responder:

> "isso ajuda a encontrar problemas mais rápido?"

Se não ajudar: não implemente, simplifique ou remova.

---

# ARQUITETURA DE DADOS (NÃO VIOLAR)

## Separação FATO × DIMENSÃO é obrigatória

### Tabela fato:
* `historico_custos`

### Dimensões:
* `dicionario_produtos`
* `categorias_origem`
* `categorias_familia`
* `categorias_agrupamento`

NUNCA misturar lógica temporal com categorização.

---

# SEMÂNTICA TEMPORAL (CRÍTICO)

O sistema tem dois eixos de tempo. Nunca confundir:

| Campo | Significado | Uso |
|---|---|---|
| `data_referencia` | Competência operacional | Quando o custo é válido (mês de referência ERP) |
| `criado_em` | Evento de importação | Quando o dado entrou no sistema |

### Regras:
- `data_referencia` é usado para análise de período e drill-through temporal
- `criado_em` é usado para identificar "última importação" e "penúltima importação"
- A UI deve sempre rotular explicitamente qual eixo está sendo exibido
- Nunca exibir "Última Atualização" sem especificar se é competência ou importação

---

# REGRAS TÉCNICAS OBRIGATÓRIAS

* NÃO usar RPC
* NÃO executar SQL bruto no frontend
* Usar apenas `supabase.from()`
* Frontend exibe `descricao` (nunca UUID como semântica de negócio)
* Backend usa `codigo`/FK
* UUID é chave técnica, nunca semântica de negócio
* NÃO usar descrição textual para lógica de categorização
* NÃO armazenar credenciais em código-fonte

---

# IMPORTAÇÃO

A importação deve ser:

* resiliente
* tolerante a erros linha a linha
* tolerante a colunas extras
* validada antes de gravar
* registrada em `log_importacao`

Falha de linha NÃO deve derrubar lote inteiro.

Produto novo importado sem categoria deve ser sinalizado no banner de órfãos — não silenciado.

---

# UX INVESTIGATIVA

## Busca direta é prioridade

O investigador deve poder digitar um código de produto e chegar à análise sem navegar pela hierarquia Origem → Família → Agrupamento.

## Drill-through é obrigatório

Clicar em qualquer produto deve abrir o histórico completo de eventos de custo:
- competência de cada registro
- data de importação de cada registro
- delta monetário e percentual vs. registro anterior
- destaque visual para variações relevantes (≥5%)

## Detecção de mudança de regime

Produto que era ESTÁVEL e ficou instável = anomalia operacional prioritária.
Deve aparecer como KPI e como coluna na tabela.

## Filtros

Filtros devem:
* ser rápidos
* ser em cascata
* mostrar apenas dados reais existentes
* nunca mostrar null/undefined
* auto-atualizar o relatório ao mudar (sem necessidade de clicar "Analisar" após primeiro run)

---

# PERFORMANCE

Preferir:
* processamento local quando o dataset couber em memória razoavelmente
* datasets já carregados (evitar re-fetch do que já está em state)
* debounce em listeners de real-time (evitar loops de reload durante imports em lote)

Evitar:
* loops com múltiplas chamadas Supabase sequenciais por linha
* recálculo desnecessário em dados já processados
* renderizações excessivas de Chart.js (destruir e recriar apenas quando necessário)

---

# MÓDULOS DO SISTEMA

| Arquivo | Responsabilidade |
|---|---|
| `view/ui-controller.js` | Eventos de UI, bootstrap e orquestração de fluxos |
| `view/ui-table.js` | Fila investigativa da aba Custos, detalhes por linha e presenter operacional compartilhado com exportação |
| `view/ui-charts.js` | Gráficos investigativos (comparação de importações, TOP variações, análise temporal) e layout condicional do relatório |
| `view/ui-drill-through.js` | Drill-through: histórico completo de importações de um produto (competência × importação, deltas por registro) |
| `view/ui-import.js` | Fluxo de importação: upload, mapeamento de colunas, preview validado linha a linha e gravação via API com log |
| `view/ui-import-op.js` | Upload, preview e persistência do CSV de apontamentos da Auditoria de OP |
| `view/ui-op.js` | Fila investigativa e dossiê da Auditoria de OP: filtros, motivo e provável causa |
| `core/spreadsheet-engine.js` | Parsing de planilhas, detecção de colunas, normalização numérica |
| `core/op-investigation-engine.js` | Indicadores e interpretação investigativa de OP; preserva fatos do ERP e não acessa UI/API |
| `core/report-engine.js` | Cálculos analíticos, cascata, detecção de regime |
| `src/services/api.js` | Camada única de acesso Supabase (I/O) |
| `services/api.js` | Shim de compatibilidade de import (re-exporta de src/services/api.js) |
| `core/heuristic-engine.js` | Somente documentação: guardrail contra heurística por texto; operacional vem de dicionario_produtos e a projeção analítica de Custos segue CUSTOS-ERP-01. Não exporta lógica (funções de sugestão foram removidas); serve de aviso no local onde alguém tentaria adicioná-la. Ver MNT-04. |

---

# DIREÇÃO DO PRODUTO

O sistema deve evoluir para:
* motor de investigação operacional
* detecção automática de anomalias
* priorização de risco por produto
* análise comportamental temporal

E NÃO para:
* ERP administrativo
* sistema burocrático
* CRUD complexo

---

# DOCUMENTAÇÃO

## SEMPRE consultar ANTES de mudar

Antes de qualquer alteração, leia a documentação relevante: este `AGENTS.md`, `docs/regras-gerais.md`, os manuais em `docs/manuais/` e a auditoria em `docs/auditoria/` (para saber se o ponto já tem fragilidade mapeada).

## SEMPRE atualizar DEPOIS de mudar (no mesmo PR/commit)

Revisar os documentos abaixo e atualizar os afetados conforme sua responsabilidade. A obrigação de mantê-los coerentes não exige repetir a mesma nota de entrega em todos: narrativa/marcos vão para História, provas para auditoria, contratos para arquitetura e procedimentos para manuais. O log datado deste AGENTS continua obrigatório.

* `README.md`
* `VISION.md`
* `ROADMAP.md`
* `AGENTS.md` (este arquivo — registre entrada datada no log abaixo)
* `docs/manuais/` (usuário/técnico/operação) sempre que o comportamento visível ou operacional mudar
* `docs/auditoria/backlog-priorizado.md` — marque o item resolvido e referencie o ID no commit
* `docs/` conforme aplicável

Toda mudança de comportamento temporal, de filtro ou de modelo de dados DEVE ser documentada com a distinção `data_referencia` vs. `criado_em`.

Documentação desatualizada é tratada como defeito. Detalhes do processo: `docs/regras-gerais.md`.

- Atualização 2026-05-11: credenciais Supabase devem entrar via config de ambiente/runtime; `autoAuthenticate` está proibido.


- Atualização 2026-05-11: importações devem priorizar bulk upsert com chunking (faixa alvo 300-500) e consultas temporais sempre com ORDER BY explícito.

- Atualização 2026-05-14: a tabela principal da auditoria deve operar como fila investigativa (não planilha), com header sticky, chips removíveis de filtros ativos e contexto pré-interpretado por linha para reduzir carga cognitiva.

- Atualização 2026-05-14: frontend deve usar `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_VERBOSE_LOGS`) sem dependência de `globalThis`/`runtime-config.js`.


- Atualização 2026-05-14 (compatibilidade runtime): frontend deve priorizar `import.meta.env`, mas com fallback seguro para `window.__ENV__` quando o deploy não expuser `import.meta.env`; manter validação obrigatória de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.


- Atualização 2026-05-14 (diagnóstico runtime híbrido): bootstrap frontend deve testar `import.meta.env` → `window.__ENV__/window.__RUNTIME_CONFIG__` → `<meta name="VITE_*">` e expor diagnóstico de fonte avaliada ao falhar validação obrigatória.


- Atualização 2026-05-14 (runtime real de deploy estático): priorizar `runtime-config.js` (`window.__ENV__`) como fonte principal no browser; manter fallback de compatibilidade para `window.__RUNTIME_CONFIG__`, `import.meta.env` e `<meta name="VITE_*">`, com validação obrigatória de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.


- Atualização 2026-05-14 (geração de config em deploy): em Vercel, `runtime-config.js` deve ser gerado no build via `scripts/generate-runtime-config.mjs` (não editado manualmente), com falha obrigatória quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estiverem ausentes.


- Atualização 2026-05-21 (export investigativo): exportação XLSX deve gerar relatório operacional com duas abas (`Contexto` e `Fila Investigativa`), ordenação automática por criticidade/regime/magnitude/reincidência/instabilidade (quando não houver ordenação manual ativa), contexto automático por linha e nome de arquivo com período analisado.

- Atualização 2026-05-25 (auditoria de contratos): manter matriz viva em `docs/arquitetura/matriz-contratos-operacionais.md`; toda chamada UI→API deve estar listada, métodos de comparação de importação devem enriquecer dimensão antes da cascata, e métodos de drill-through devem falhar explicitamente quando parâmetros obrigatórios estiverem ausentes.

- Atualização 2026-05-25 (saneamento operacional de schema): migração base em `sql/2026-05-25_saneamento_operacional_schema.sql` para alinhar colunas de custo, garantir `unique_produto_data`, reforçar índices investigativos e tratar órfãos via fallback explícito `SEM_AGRUPAMENTO` + `vw_produtos_orfaos_agrupamento`.

- Atualização 2026-05-25 (auditoria técnica + manuais): publicada auditoria técnica acionável em `docs/auditoria/` (segurança, robustez, manutenibilidade, performance, tooling + `backlog-priorizado.md`) para execução por agente de desenvolvimento; criados os manuais em `docs/manuais/` (usuário/técnico/operação) e as regras gerais em `docs/regras-gerais.md`. Achado crítico registrado: XSS real em `fillSelect` (`core/report-engine.js`) — ver `SEC-01`. A tela de Documentação editável (consulta/edição dos manuais com commit via Serverless Function) fica como Fase 2.

- Atualização 2026-05-25 (tela de documentação — Fase 2): nova view "Documentação" (`view/documentation-controller.js`, ligada no `init` de `ui-controller.js`, refs em `ui-dom.js`, markup em `index.html`) para consultar/editar `docs/manuais/*.md` e `docs/regras-gerais.md`. Render via `marked` + `DOMPurify` (sanitizado) e gravação por commit no GitHub via Serverless Function `api/save-doc.js` (env: `GITHUB_TOKEN`/`GITHUB_REPO`/`GITHUB_BRANCH`). Edição pública com allowlist de caminho + limite de 200 KB; o repositório segue sendo a fonte única. Render do markdown e fluxo de save exigem verificação em preview da Vercel (CDN/Function/token).

- Atualização 2026-05-25 (documentação na tela — auditoria): a view "Documentação" passou a incluir também os docs de `docs/auditoria/*.md` (seletor agrupado em Manuais / Regras / Auditoria técnica); allowlist da Function `api/save-doc.js` estendida para `docs/auditoria/*.md` (aceita `README.md`).

- Atualização 2026-05-28 (ERR-01): `view/ui-controller.js` deve manter fronteiras operacionais explícitas para `init()`, `runReport()` e handlers assíncronos críticos; erros devem ser normalizados com `{ message, technical, timestamp, operation }`, exibidos ao usuário sem quebrar o contexto atual e registrados apenas via `debugLog` quando `VITE_ENABLE_VERBOSE_LOGS=true`.

- Atualização 2026-05-28 (VAL-01): `normalizeCodigoProduto()` em `core/spreadsheet-engine.js` é a normalização canônica de `codigo_produto`; fluxos de preview, payload, API, dicionário, cascata, relatório, drill-through e exportação derivada devem reutilizá-la, bloquear linha inválida/ambígua e registrar apenas amostras via `debugLog` quando `VITE_ENABLE_VERBOSE_LOGS=true`.


- Atualização 2026-05-28 (LOG-01): `classifyAlert()`/`isAlertaCritico()` em `core/report-engine.js` é a fonte canônica do KPI **Alertas (>5%)**; UI, filtros rápidos, tabela, drill-through, ranking/reincidência e exportação devem reutilizar o helper/`filterAlertRows()`, considerando `abs(variacaoTemporal) >= 5` no eixo `criado_em` sem arredondamento prévio; `data_referencia` permanece como recorte de competência.

- Atualização 2026-06-15 (diagnóstico de órfãos): `runDiagnosticoSemAgrupamento` deve tolerar divergência de schema em `categorias_agrupamento` via `supabase.from().select('*')` + resolução canônica de chave (`codigo`/`id`/`cod`) e retornar estado explícito `indisponivel` em falha operacional; a UI deve mostrar "Não foi possível validar produtos sem agrupamento." e nunca tratar falha como zero órfãos.

- Atualização 2026-06-25 (Onda 2 — tooling): adicionada rede de segurança de desenvolvimento sem impacto em runtime/CDN: `package.json` apenas com devDependencies/scripts, ESLint flat config com bloqueio de `innerHTML` interpolado, `jsconfig.json` + `// @ts-check`/JSDoc inicial em `core/`, Vitest com regressões VAL-01/LOG-01 e CI GitHub Actions para lint/typecheck/test em PRs.

- Atualização 2026-06-29 (CI Onda 2): `eslint` deve permanecer explicitamente em `devDependencies`; `@eslint/js` não fornece o binário do CLI. Validações de tooling devem reproduzir a Actions com ambiente limpo (`rm -rf node_modules && npm ci`) para evitar falso positivo por binários globais no `PATH`.
- Atualização 2026-07-02 (reavaliação do backlog): `docs/auditoria/backlog-priorizado.md` foi reordenado arquiteturalmente após Onda 2/CI; `MNT-01` passa a ser fatiamento destravador antes de `PERF-01`, `MNT-03`, `SEC-02` e parte de `PERF-02`/`VAL-02`, com preparação prévia por `MNT-06`, `MNT-07` e `MNT-05`.

- Atualização 2026-07-17 (MNT-01 — 1ª fatia: gráficos): fluxo de gráficos extraído de `view/ui-controller.js` para `view/ui-charts.js` (`createChartsController({ dom, state })`), sem alteração de comportamento. `ui-controller.js` segue como orquestrador e apenas chama `charts.renderImportComparisonChart`, `charts.renderTopVariationsPanel`, `charts.renderTemporalAnalysis` e `charts.applyReportLayout` dentro de `runReport()`, sob as mesmas fronteiras ERR-01. Instâncias Chart.js permanecem em `state.chart`/`state.trendChart`; contrato temporal preservado (série agrupa por `data_referencia` e desempata a última importação por `criado_em`). `MNT-01` permanece aberto (fatias restantes: importação, filtros/relatório, fila/tabela, drill-through, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (MNT-01 — 2ª fatia: drill-through): fluxo de drill-through extraído de `view/ui-controller.js` para `view/ui-drill-through.js` (`createDrillThroughController({ dom })`), seguindo o mesmo padrão de fábrica de `ui-charts.js`. `ui-controller.js` só chama `drillThrough.renderDrillThrough(codigo)` no clique da linha da fila investigativa, sob a fronteira ERR-01 existente. Escolhido por ser folha de acoplamento zero (não chama nenhuma outra função do controller). Contrato temporal preservado: o painel rotula competência (`data_referencia`) e importação (`criado_em`) por registro; regra de alerta segue via `isAlertaCritico`. Convenção arquitetural firmada: todo novo módulo de fluxo da UI expõe `create<Fluxo>Controller(deps)`. `MNT-01` permanece aberto (fatias restantes: importação, filtros/relatório, fila/tabela, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (MNT-01 — 3ª fatia: importação): fluxo de importação extraído de `view/ui-controller.js` para `view/ui-import.js` (`createImportController({ dom, state, executeOperationalBoundary, fetchMetadata })`). Move `bindUpload`, `handleImport`, `buildImportPreview`, `confirmImportPreview`, `confirmColumnMapping`, `buildMappingSelect`, `getFieldLabel` e a constante `IMPORT_PREVIEW_DISPLAY_LIMIT` (MNT-07). `ui-controller.js` só chama `importer.bindUpload()` no `init()`. A fronteira ERR-01 (`executeOperationalBoundary`) e o refresh de filtros (`fetchMetadata`) são injetados para preservar comportamento idêntico. Contratos preservados: `normalizeCodigoProduto` (VAL-01) como normalização canônica; `data_referencia` (competência) do seletor acompanha o payload e `criado_em` (importação) é atribuído pela API; importação tolerante linha a linha. `ui-controller.js` caiu de ~1.022 para ~754 linhas. `MNT-01` permanece aberto (fatias restantes: filtros/relatório, fila/tabela, exportação). lint/typecheck/test verdes.

- Atualização 2026-07-17 (correção de erro silencioso — delta monetário): `buildReportRows` (`core/report-engine.js`) passou a derivar `diferenca` (coluna "Δ vs anterior" e "Delta monetário última importação" na exportação) com gate em `penultimo`, não em `ultimo`. Antes, produto com uma única importação (existe em só uma competência do recorte) exibia o custo total inteiro como se fosse o delta, enquanto `variacaoTemporal` já era `null` — inconsistência silenciosa (sem erro) na fila investigativa e no XLSX. Agora ambos são `null` sem penúltima importação, preservando a distinção `data_referencia` × `criado_em` (o eixo comparado continua sendo `criado_em`). Regressão coberta em `tests/report-engine.test.js`.

- Atualização 2026-07-17 (dívida arquitetural conhecida — LOG-02): registrada, **sem alteração de comportamento**, a limitação de que a "comparação entre importações" (`getLatestImportComparison`/`getTopVariacoesImportacao` em `src/services/api.js`) pode comparar **dois chunks da mesma importação** em vez de duas importações reais. Causa: o upsert grava em chunks de `IMPORT_CHUNK_SIZE` (400) e cada chunk recebe um `criado_em` distinto, quebrando a premissa "1 importação = 1 `criado_em`". Erro silencioso (números plausíveis, sem `error`) quando um lote passa de 400 linhas — possível já hoje (~601 linhas na base). Documentada em `docs/auditoria/robustez-erros-validacao.md` (LOG-02), no backlog (`docs/auditoria/backlog-priorizado.md`, Onda 6) e no `docs/manuais/manual-tecnico.md` (semântica temporal). Correção pendente de decisão entre (a) `criado_em` único por lote no payload ou (b) agrupar por lote/`log_importacao`; ambas mexem no contrato temporal e não devem ser feitas sem validação.


- Atualização 2026-07-20 (registro retroativo de PRs recentes): revisão documental dos PRs #121–#124 sem alteração de código. Registrado que o MNT-01 avançou com filtros (`view/ui-filters.js`) e exportação (`view/ui-export.js`), mas permanece aberto porque a fila/tabela e o presenter investigativo (`renderTable`, `getOperationalPriority`, `buildInvestigativeSummary`) ainda ficam em `view/ui-controller.js`. Registrado também que o PR #124 reduziu parcialmente o MNT-03 ao mover `fillSelect` para `view/ui-utils.js`, sem concluir a centralização completa da cascata.

- Atualização 2026-07-27 (Engineering Freeze v1.0 — MNT-01 encerrado): fila/tabela e presenter investigativo extraídos de `view/ui-controller.js` para `view/ui-table.js` (`createTableController({ dom, executeOperationalBoundary, renderDrillThrough, rerunReportForProduct })`). `ui-controller.js` fica predominantemente como orquestrador, preservando comportamento, fronteiras ERR-01 e semântica temporal (`data_referencia` na competência exibida; `criado_em` na importação exibida). `MNT-01` pode ser considerado encerrado.

- Atualização 2026-07-27 (MNT-OP-01 — persistência da Auditoria de OP): o CSV MCAP105 real formata números de OP com ponto de milhar (por exemplo, `2.081`). O parser deve remover esse separador exclusivamente ao converter o campo `op` para inteiro, preservando `apontamentos_op.op` como `INTEGER NOT NULL`; não criar ou aplicar migração de schema. `importarApontamentosOp` deve registrar falhas de chunk sob o cabeçalho `IMPORTAÇÃO OP` com chunk, quantidade, primeiro registro, resposta completa do Supabase (`code`, `message`, `details`, `hint`) e registros/campo quando a resposta indicar violação `NOT NULL`. `data_referencia` permanece competência e `criado_em` evento de importação.

- Atualização 2026-07-30 (MNT-OP-02 — motor investigativo da Auditoria de OP): os campos importados do MCAP105 são fatos imutáveis do ERP; `core/op-investigation-engine.js` é a fonte única de indicadores calculados pelo Kustos (`desvioTempoPct`, `desvioProdutividadePct`, `atendimentoProducaoPct`, `indiceParadasPct`), conferência do `% Tempo (ERP)` e classificação por motivo/provável causa. Nenhum indicador isolado define a fila: parada só é causa principal com atraso e produtividade normal/baixa; tempo alto + produtividade baixa sem parada material indica gargalo. Não duplicar o `% Tempo (ERP)` como sinal de criticidade. A UI deve separar “Dados do ERP (imutáveis)” de “Indicadores calculados pelo Kustos”, rotulando `data_referencia` como competência e `criado_em` como importação.

- Atualização 2026-08-03 (MNT-OP-03 — decisão investigativa combinada): `analyzeOpInvestigation()` deve expor uma decisão auditável (`mereceInvestigacao`, prioridade, ação e evidências) derivada conjuntamente de produção, tempo, KG/Hora e paradas. Nunca priorizar por uma coluna isolada. Tempo alto com produtividade praticamente estável só é isento de alerta quando o atendimento de produção explica o tempo adicional; parada material sem impacto em entrega, tempo ou produtividade deve ser registrada, não priorizada; parada + atraso + queda/não melhoria de produtividade + déficit de produção é prioridade máxima. Preservar os fatos ERP, sem schema novo, e manter `data_referencia` como competência e `criado_em` como evento de importação.
- Atualização 2026-08-13 (CAD-01 — cadastro mestre): `dicionario_produtos` é a única base mestre ativa para Custos e OP. O XLSM atualiza descrição/origem/família somente quando há valor; vazios e produtos ausentes não apagam cadastro; `agrupamento_cod` é manual do Kustos, nunca inferido dos agrupamentos ERP. Produto sem resolução é "Produto sem classificação", sem inventar categoria nem reescrever fatos.
- Atualização 2026-08-24 (recorte temporal do drill-through de Custos): `getProductHistory(codigoProduto, competencias)` recebe as competências ativas do relatório e aplica filtro explícito em `data_referencia`; o painel calcula Δ/Δ% somente entre essas linhas. Assim, Junho + Agosto não inclui Julho. `criado_em` permanece apenas a proveniência de importação; não houve mudança de schema, importação, exportação ou regra investigativa.
- Atualização 2026-08-24 (seleção de campos na exportação XLSX): `view/ui-export.js` mantém `state.reportRows` como única fonte da Fila Investigativa e abre popup SweetAlert2 com todos os campos marcados. O arquivo exporta somente as colunas confirmadas na ordem canônica; cancelamento não grava arquivo, sem consulta Supabase, schema ou mudança nos indicadores.
- Atualização 2026-08-27 (modos temporais de Custos): `temporalMode=interval` mantém a consulta por faixa de `data_referencia`; `temporalMode=comparison` passa as duas competências explicitamente a `getHistorico`, gráficos e `getProductHistory`. Fila, KPIs, detalhamento e drill-through compartilham o mesmo recorte; `criado_em` continua apenas o eixo de importação. Sem schema, importação, exportação ou nova regra investigativa.
- Atualização 2026-09-28 (PERF-01 — fila investigativa): `view/ui-table.js` limita a renderização aos primeiros 200 itens já priorizados pelo relatório e informa o total excedente; não reordena nem altera KPIs, exportação ou recorte temporal. Clique de detalhe e drill-through usa um único listener delegado no `tbody`; itens fora da janela entram após refinar o recorte.
- Atualização 2026-10-01 (Fase 2A — estrutura do Cadastro Mestre): `dicionario_master_produtos` ganhou a FK opcional `ultima_importacao_cadastro_mestre_id` para `log_importacao_cadastro_mestre`. O log registra arquivo/lote, tipo (`XLSM`/`XLSX`/`XLS`), hash ou identificador, execução, contagens, erros e metadados de origem, com RLS ativo e sem policy de escrita. Nesta fase, não preencher a FK existente, não reconciliar com `dicionario_produtos` e não inferir família por descrição.
- Atualização 2026-10-05 (Fase 2C.2 — agrupamento ERP + proveniência): `dicionario_master_produtos.agrupamento_erp_valor` preserva o valor bruto do ERP e `agrupamento_erp_importacao_id` registra seu lote. `dicionario_produtos.agrupamento_cod` continua sendo a classificação efetiva; `agrupamento_override_manual_cod` e `agrupamento_classificacao_origem` distinguem override e proveniência quando uma etapa futura explícita os preencher. Não inferir agrupamento ERP a partir de mapa, família, origem, descrição ou códigos `Mxxx`; os dados existentes ficaram nulos nessas novas colunas.
- Atualização 2026-10-08 (CAD-PREVIEW-01 — Fase 3.1): `core/cadastro-mestre-preview-engine.js` calcula exclusivamente Preview contra `dicionario_master_produtos`; leitura de arquivo fica em `src/services/cadastro-mestre-preview.js`. Filtrar Tipo P/C, depois Descr(Origem) contendo Produzido/Revenda, depois excluir descrição com inativo/EXLUIR. Resolver origem/família somente por código exato, preservar vazios/ausentes e agrupamento ERP bruto sem ponte. `api.getCadastroMestrePreviewContext()` é somente SELECT paginado; não ligar ao importador legado, aprovar, executar, gravar log/proveniência ou projetar para a dimensão operacional nesta fase. Sem alteração de `data_referencia` (competência) ou `criado_em` (importação).
- Atualização 2026-10-08 (CAD-APPROVAL-01 — Fase 3.3): decisão de negócio define `Agrup. Prod.` (Q) como `agrupamento_erp_valor`; nunca converter Pxxx para Mxxx. `core/cadastro-mestre-approval-engine.js` gera propostas e revisão local pura, com decisões por operação vinculadas ao manifesto completo. Descrição e agrupamento são propostas independentes; INSERT é indivisível; vazios/ausentes não geram NULL/DELETE. IDs BIGINT de proveniência só serão definidos na execução futura. O lote real foi entregue com todas as propostas pendentes; testes de aprovação usam fixtures sintéticas. Não ligar este fluxo ao importador legado nem executar persistência nesta fase. Custos/OP e os eixos `data_referencia`/`criado_em` permanecem inalterados.
- Atualização 2026-10-08 (CAD-EXEC-01 — Fase 3.4): executada carga pontual autorizada após manifesto/contexto/arquivo integralmente idênticos à Fase 3.3. Migration `20261008184501_fase3_4_execucao_cadastro_mestre.sql`, lote 1 concluído, Master 5.706: 103 novos + 312 existentes (320 patches: 11 descrições e 309 agrupamentos). Proveniência somente nas 415 escritas efetivas; 342 agrupamentos ERP vinculados ao lote; 5.291 antigos integralmente preservados, incluindo 4.853 fora dos filtros. Guardas bloqueiam repetição/concorrência; EXCEPT integral bidirecional e fingerprints protegidos conferidos. Sem escrita operacional/mapa/fatos/categorias, ponte, mudança de RLS ou ativação de importer/UI. Fatos mantêm `data_referencia` como competência e `criado_em` como evento de importação. Não reexecutar esta migration nem tratar a carga pontual como importer genérico.
- Atualização 2026-10-08 (CAD-UX-01 — Cadastro): tabela em contêiner único overflow: auto limitado a 60dvh (fallback 60vh), preservando header sticky e acesso à barra horizontal em listas longas. upsertProductMaster usa buildManualProductMasterPayload: agrupamento explicitamente vazio/null grava agrupamento_cod = NULL; omitido preserva o atual. buildProductMasterPayload e o importador mantêm preservação ERP. A tela continua ligada a dicionario_produtos, sem mudança no Master ERP, schema, mapa, fatos, proveniência, RLS ou pipeline. data_referencia (competência) e criado_em (importação) permanecem intactos. Ver docs/ux/cadastro-mestre.md.
- Atualização 2026-10-08 (CAD-XLS-01 — Preview na tela): após esclarecimento humano da divergência entre tela legada e módulos de Preview, o seletor aceita XLSM/XLSX/XLS e chama `createCadastroMestrePreviewController` → `api.getCadastroMestrePreviewContext` (SELECT) → `prepararAprovacaoArquivoCadastroMestre`. Reutiliza filtros, normalização, Master ERP, Agrup. Prod., preservação e decisões existentes, sem parser paralelo ou executor. Revisão/download JSON são locais; seletor não chama `importProductMasterXlsm`. Sem escrita de log/proveniência, schema ou migration. Tabela/edição manual continuam em `dicionario_produtos`; `data_referencia` é competência e `criado_em` importação, intactos nos fatos. Testes usam XLS BIFF sintético/contexto em memória, sem carga real.
- Atualização 2026-10-09 (CAD-REBUILD-01 — reconstrução do universo): decisão humana substitui a preservação de ausentes/fora dos filtros somente no Master ERP. Adapter existente prepara `RECONSTRUCAO_UNIVERSO_V1` com novos, alterações e remoções somente de `dicionario_master_produtos`; preservar vazios de quem permanece e Agrup. Prod. bruto. Aprovação integral obrigatória, bloqueando erros/universo vazio. UI mantém SELECT/decisões/download, sem DELETE/SQL/RPC/execução automática. Comando administrativo separado usa PostgreSQL dedicado, locks/revalidação integral, snapshot durável e JSONB existente do log, SAVEPOINT, DML bulk e provas/COMMIT; falha reverte Master inteiro e registra falhou, COMMIT incerto não autoriza retry. Não mudar schema/migration/RLS nem fatos/operacional/mapa/categorias. Testes em PostgreSQL local em memória; nenhuma carga real. Contrato: `docs/arquitetura/cadastro-mestre-reconstrucao.md`. `data_referencia` permanece competência e `criado_em` evento de importação dos fatos, intactos.
