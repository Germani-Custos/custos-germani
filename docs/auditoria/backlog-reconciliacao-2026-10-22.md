# Reconciliação do backlog — 22/10/2026

## Escopo e unidades de contagem

Auditoria documental sobre o HEAD `831a69fda1090badee0239f7e0dc7526f86c7691`, com diagnóstico de código, testes, GETs de produção e SELECTs Supabase. A cópia inicial estava limpa. Autorização desta etapa: somente documentação de backlog; nenhum item implementado. [Lista ativa com contratos](backlog-priorizado.md); [originais integrais](backlog-historico.md).

O inventário distingue entradas, IDs e referências para não contar uma citação como novo problema:

- **67 entradas com checkbox no backlog central**, representando 59 IDs e uma revisão final sem ID. Há sete ocorrências extras de IDs repetidos e a revisão final repete CAD-ENV-01.
- **60 IDs antigos distintos** no conjunto: os 59 centrais mais PERF-04, que estava no documento temático e no ROADMAP.
- Uma pendência independente sem ID no ROADMAP: divergência histórica de fingerprint operacional (Fase 3.3).
- Portanto, **69 entradas de origem de correção/manutenção** = 67 centrais + PERF-04 + fingerprint, correspondentes a **61 assuntos canônicos e oito duplicações de entrada**.
- Foram encontrados **79 checkboxes brutos**: além dos 67, seis subtarefas concluídas de MNT-01 em manutenibilidade.md e seis perguntas preventivas na matriz de contratos. Esses 12 não são 12 novos defeitos.
- **31 cabeçalhos de achados temáticos** repetem os IDs centrais, com exceção de PERF-04.
- **38 entradas de lista no ROADMAP** misturam entregas, referências a correções, verificações e planos de produto; são reconciliadas individualmente abaixo. Não são 38 bugs adicionais. README resume dívida e aponta a lista; a tela do site apresenta o próprio Markdown publicado.

## Resultado da limpeza

Classificação das 69 entradas de origem, com um único estado por entrada:

- **RESOLVIDO: 43.** Evidência/escopo por ID abaixo; conclusão local não certifica saúde atual de todo ambiente administrativo.
- **PARCIALMENTE RESOLVIDO: 8.** CFG-03, MNT-03, MNT-04, PERF-03, SEC-02, SEC-03, SEC-04, SEC-05.
- **CONFIRMADO: 5.** LOG-02, MNT-02, MNT-08, PERF-02, VAL-02.
- **OBSOLETO: 3.** CAD-01, CFG-04, ERR-02; contratos sucedidos, sem apagar a história ou remover funcionalidades.
- **DUPLICADO: 8.** Ocorrências adicionais listadas na seção própria; não oito IDs diferentes.
- **NÃO VERIFICADO: 2.** PERF-04 e fingerprint sem ID.

A lista ativa retém **13 IDs antigos** (oito parciais e cinco confirmados) e incorpora **16 novos**: **29 correções**, distribuídas em P0=2, P1=10, P2=11, P3=6. Assim, 56 das 69 entradas de origem saem da execução ativa: 43 resolvidas + três obsoletas + oito duplicadas + duas sem verificação suficiente. As duas últimas continuam visíveis como investigação pendente.

Os estados dos 38 registros do ROADMAP são classificações do conteúdo composto daquela referência, não parcelas adicionais da soma acima. Planos futuros classificados NÃO VERIFICADO não foram promovidos a defeitos. Prioridades antigas por severidade não equivalem automaticamente aos novos P0–P3.

## Fontes inventariadas

- [Backlog central original](backlog-historico.md): 67 entradas; descrições, severidades, esforço, decisões e evidências preservados literalmente.
- [README original](backlog-historico.md): seção 9 encaminhava à auditoria; seção 10 repetia seis IDs técnicos e estados de publicação/dados defasados. O resumo atual aponta a fonte ativa.
- [ROADMAP original](backlog-historico.md): 38 entradas; seis posições de prioridade técnica duplicavam a lista ativa, além de estados de publicação ultrapassados e decisões de segurança misturadas a features.
- Documentos temáticos: seguranca.md, robustez-erros-validacao.md, manutenibilidade.md, performance-otimizacao.md e tooling-configuracao.md. Preservados como provas datadas, com aviso para consultar o estado consolidado.
- Matriz de contratos: seis itens preventivos contínuos, sem evidência de seis falhas atuais. AGENTS, arquitetura, manuais e auditorias especializadas repetem IDs como contratos/provas; referências por ID estão abaixo.
- Site: DocumentationController carrega o caminho docs/auditoria/backlog-priorizado.md. Detalhes e limite de publicação na seção de conflitos.

## Inventário por ID antigo

A descrição resumida identifica o assunto; a descrição original integral e suas referências estão no arquivo histórico ou no documento temático indicado. As linhas do backlog/README/ROADMAP se referem à fotografia original, e não às linhas após a reorganização. Referências múltiplas abaixo não viram múltiplas tarefas.

### CAD-01

- **Descrição resumida:** Cadastro mestre operacional exclusivo e importador incremental.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 188, seção Concluído; sem severidade explícita.
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** OBSOLETO.
- **Justificativa:** Exclusividade como mestre analítico foi sucedida por CUSTOS-ERP-01 e Preview/reconstrução. O operacional continua necessário; não remover a dimensão.
- **Evidência:** core/custos-classification-engine.js; view/ui-product-master.js; src/services/api.js.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-APPROVAL-01

- **Descrição resumida:** Manifesto e revisão local por operação.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 184, seção Concluído; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-aprovacao.md](../arquitetura/cadastro-mestre-aprovacao.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Adapter e motores geram decisões locais vinculadas ao manifesto; não confundir implementação com autorização de carga.
- **Evidência:** core/cadastro-mestre-approval-engine.js; tests/cadastro-mestre-approval-engine.test.js; Preview real da Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-COM-01

- **Descrição resumida:** Campos comerciais opcionais e transporte V3.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 15, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md); [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md); [docs/arquitetura/cadastro-mestre-familias-erp.md](../arquitetura/cadastro-mestre-familias-erp.md); [docs/arquitetura/cadastro-mestre-preview.md](../arquitetura/cadastro-mestre-preview.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/arquitetura/migracoes.md](../arquitetura/migracoes.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-comercial-validacao.md](cadastro-mestre-comercial-validacao.md); [docs/auditoria/README.md](README.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Implementação presente; SELECT atual confirma 162 pares preenchidos, 698 vazios e lote 4 V2.
- **Evidência:** core/cadastro-mestre-execution-data.js; tests/cadastro-mestre-comercial.test.js; banco Master/log.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-COM-EXEC-01

- **Descrição resumida:** Implementar executor comercial isolado.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 9, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md); [docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md](../arquitetura/cadastro-mestre-comercial-executor-isolado.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-comercial-executor-isolado.md](cadastro-mestre-comercial-executor-isolado.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Executor local existe e tem regressões. A primeira carga restrita à fotografia NULL não é pendência executável no estado atual; preenchimento posterior não prova uso do isolado.
- **Evidência:** scripts/lib/cadastro-mestre-comercial.mjs; tests/cadastro-mestre-comercial-executor.test.js; contrato isolado; SELECT Master.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-COM-PROD-01

- **Descrição resumida:** Aplicar somente migration comercial.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 11, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/arquitetura/migracoes.md](../arquitetura/migracoes.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md](cadastro-mestre-comercial-producao-etapa1.md); [docs/auditoria/cadastro-mestre-comercial-validacao.md](cadastro-mestre-comercial-validacao.md); [docs/auditoria/README.md](README.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Duas colunas TEXT nullable presentes; prova histórica da migration preservada. Carga posterior é evento distinto.
- **Evidência:** docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md; information_schema.columns.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-DIAG-01

- **Descrição resumida:** Diagnóstico administrativo sanitizado por etapas.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 46, 47, 48, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-preparacao-ambiente.md](../arquitetura/cadastro-mestre-preparacao-ambiente.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Handler e catálogo fechado de erros existem; 12 testes de diagnóstico passaram nesta revisão. Não certifica saúde atual de TLS/Storage.
- **Evidência:** scripts/lib/cadastro-mestre-diagnostic.mjs; tests/cadastro-mestre-diagnostic.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-DIAG-TLS-01

- **Descrição resumida:** Diagnóstico TLS sanitizado.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 42, 43, 44, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-preparacao-ambiente.md](../arquitetura/cadastro-mestre-preparacao-ambiente.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Inspeção e sanitização implementadas e testadas. Erro TLS antigo preservado como histórico; estado autenticado atual não revalidado.
- **Evidência:** scripts/lib/cadastro-mestre-diagnostic.mjs; scripts/lib/cadastro-mestre-web.mjs; tests/cadastro-mestre-diagnostic.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-ENV-01

- **Descrição resumida:** Preparar fronteira e publicação administrativa.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 68, 69, seção Estabilizações operacionais concluídas; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md); [docs/arquitetura/cadastro-mestre-preparacao-ambiente.md](../arquitetura/cadastro-mestre-preparacao-ambiente.md); [docs/arquitetura/deploy.md](../arquitetura/deploy.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-execucao-web-validacao.md](cadastro-mestre-execucao-web-validacao.md); [docs/auditoria/cadastro-mestre-preparacao-ambiente-validacao.md](cadastro-mestre-preparacao-ambiente-validacao.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Build por allowlist, endpoint separado e guardas presentes; GET sem sessão atual retorna 401. Flags, bucket e permissões atuais ficam na fila de verificação, não declarados saudáveis.
- **Evidência:** scripts/build-web.mjs; vercel.json; scripts/lib/cadastro-mestre-web.mjs; GET público.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-ERP-TABLE-01

- **Descrição resumida:** Cinco colunas na consulta ERP.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 3, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-comercial-validacao.md](cadastro-mestre-comercial-validacao.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** HTML e presenter atuais usam cinco colunas; captura após reload na Auditoria 360 confirmou. Incidente da aba antiga não reabre este ID.
- **Evidência:** index.html; view/ui-cadastro-mestre-erp.js; captura após reload em 22/10.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-ERP-VIEW-01

- **Descrição resumida:** Consulta ERP separada do operacional.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 32, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Fonte independente, 860 produtos, páginas visuais de 50 e leitor completo presentes.
- **Evidência:** view/ui-cadastro-mestre-erp.js; core/cadastro-mestre-erp-engine.js; getCadastroMestreErp; UI da Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-EXEC-01

- **Descrição resumida:** Carga pontual Fase 3.4.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 182, seção Concluído; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-execucao-fase3-4.md](../arquitetura/cadastro-mestre-execucao-fase3-4.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** SELECT atual conserva lote 1 concluído, 103 inseridos/312 atualizados; provas históricas permanecem. Não reexecutar.
- **Evidência:** docs/arquitetura/cadastro-mestre-execucao-fase3-4.md; log_importacao_cadastro_mestre.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-EXEC-WEB-01

- **Descrição resumida:** Conectar UI à execução web explícita.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 71, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-execucao-web-validacao.md](cadastro-mestre-execucao-web-validacao.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Fluxo e bloqueios implementados; 42 testes web passaram. Não representa ensaio de rollback remoto nesta etapa.
- **Evidência:** scripts/lib/cadastro-mestre-web.mjs; view/ui-cadastro-mestre-preview.js; tests/cadastro-mestre-web.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-FAM-01

- **Descrição resumida:** Catálogo e decisões independentes de famílias ERP.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 28, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md); [docs/arquitetura/cadastro-mestre-familias-erp.md](../arquitetura/cadastro-mestre-familias-erp.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/arquitetura/services-frontend.md](../arquitetura/services-frontend.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** 15 testes passaram; lote 3 registra 65 inserções; Preview real anterior nesta sessão tem 81 famílias existentes e zero propostas.
- **Evidência:** core/cadastro-mestre-familias-engine.js; tests/cadastro-mestre-familias.test.js; SELECT lote 3.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-FAM-SCHEMA-01

- **Descrição resumida:** Remover unicidade de descrição de família.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 30, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/migracoes.md](../arquitetura/migracoes.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Catálogo atual tem PK(id) e índice único de codigo, sem UNIQUE de descrição; 103 registros.
- **Evidência:** SELECT pg_constraint/pg_indexes; docs/arquitetura/migracoes.md.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-OP-PAGE-01

- **Descrição resumida:** Leitura integral do Cadastro Operacional.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 34, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Sonda atual retornou 6.113 produtos e os cinco ausentes reais; 23 regressões de paginação passaram. O truncamento da Auditoria de OP é outro método.
- **Evidência:** getProductMaster; tests/api-product-master-pagination.test.js; sonda GET atual.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-PAYLOAD-01

- **Descrição resumida:** Transporte compacto sem XLS bruto.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 36, 37, 38, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md); [docs/arquitetura/cadastro-mestre-preparacao-ambiente.md](../arquitetura/cadastro-mestre-preparacao-ambiente.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-execucao-web-validacao.md](cadastro-mestre-execucao-web-validacao.md); [docs/auditoria/cadastro-mestre-payload-validacao.md](cadastro-mestre-payload-validacao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Contrato V3 e teto de 4 MiB presentes; validações de volume e equivalência executadas na Auditoria 360 no mesmo HEAD.
- **Evidência:** core/cadastro-mestre-execution-data.js; tests/cadastro-mestre-execution-data.test.js; scripts/lib/cadastro-mestre-web.mjs.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-PREVIEW-01

- **Descrição resumida:** Núcleo puro e adapter de Preview.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 186, seção Concluído; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-preview.md](../arquitetura/cadastro-mestre-preview.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Arquivo real processado na Auditoria 360: 6.230 linhas/860 válidos/zero erros e operações.
- **Evidência:** src/services/cadastro-mestre-preview.js; core/cadastro-mestre-preview-engine.js; evidência do Preview real.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-REBUILD-01

- **Descrição resumida:** Reconstrução revisável e executor transacional.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 73, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-aprovacao.md](../arquitetura/cadastro-mestre-aprovacao.md); [docs/arquitetura/cadastro-mestre-execucao-fase3-4.md](../arquitetura/cadastro-mestre-execucao-fase3-4.md); [docs/arquitetura/cadastro-mestre-preview.md](../arquitetura/cadastro-mestre-preview.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-reconstrucao-validacao.md](cadastro-mestre-reconstrucao-validacao.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Fluxo e provas locais existem; lote 2 registra 4.853 remoções e Master final 860. Nenhuma nova execução é solicitada.
- **Evidência:** scripts/lib/cadastro-mestre-reconstruction.mjs; tests/cadastro-mestre-reconstruction.test.js; SELECT lote 2.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-UX-01

- **Descrição resumida:** Rolagem do Cadastro e remoção manual de agrupamento.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 77, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [docs/ux/componentes.md](../ux/componentes.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Contêiner limitado/sticky e intenção explícita de NULL presentes; regressões e UI conferidas na Auditoria 360.
- **Evidência:** assets/style.css; buildManualProductMasterPayload; tests/product-master-engine.test.js; captura Cadastro.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-VOL-01

- **Descrição resumida:** Timeout localizado do teste de transporte volumoso.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 64, seção Entrega 2026-08-10 — MNT-OP-04; sem severidade explícita.
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-payload-validacao.md](cadastro-mestre-payload-validacao.md); [docs/auditoria/identidade-visual.md](identidade-visual.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Limite local de 10 s e fixture integral mantidos; caso levou 2,35 s na Auditoria 360 com dois workers. Não implica garantia na concorrência padrão.
- **Evidência:** tests/cadastro-mestre-execution-data.test.js; docs/auditoria/cadastro-mestre-payload-validacao.md.
- **Destino:** histórico preservado; fora da execução ativa.

### CAD-XLS-01

- **Descrição resumida:** Ligar seletor ao Preview único XLS/XLSX/XLSM.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 75, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-aprovacao.md](../arquitetura/cadastro-mestre-aprovacao.md); [docs/arquitetura/cadastro-mestre-preview.md](../arquitetura/cadastro-mestre-preview.md); [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** UI chama o adapter de aprovação, não o importador legado; preparação real passou. Captura do modal real não obtida pela extensão.
- **Evidência:** view/ui-cadastro-mestre-preview.js; tests/ui-cadastro-mestre-preview.test.js; adapter real.
- **Destino:** histórico preservado; fora da execução ativa.

### CFG-01

- **Descrição resumida:** ESLint e bloqueio de interpolação HTML.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 118, seção Onda 2 — Concluída: rede de segurança de desenvolvimento; Médio (🟠).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/seguranca.md](seguranca.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Config e script presentes; lint passou na Auditoria 360. Exceções de HTML pertencem a SEC-02.
- **Evidência:** eslint.config.js; package.json; saída de lint no mesmo HEAD.
- **Destino:** histórico preservado; fora da execução ativa.

### CFG-02

- **Descrição resumida:** Base inicial de typecheck JS/JSDoc.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 120, seção Onda 2 — Concluída: rede de segurança de desenvolvimento; Médio (🟠).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Config cobre core/API/tipos como entrega inicial. Cobertura adicional de view e funções é CFG-06, sem apagar a entrega original.
- **Evidência:** jsconfig.json; types/; saída de typecheck na Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### CFG-03

- **Descrição resumida:** Testes e cobertura crítica.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 119, seção Onda 2 — Concluída: rede de segurança de desenvolvimento; Médio (🟠).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Suíte existe, mas faltam contratos de OP acima de 1.000, prioridade TOP-200, ordem UI/XLSX e carregamento de save-doc; teste de resumo atual aceita a afirmação sem evidência. Percentual de cobertura não medido.
- **Evidência:** tests/; vitest.config.js; 209 testes atuais e 594 da Auditoria 360; tests/ui-table.test.js.
- **Destino:** [correção ativa](backlog-priorizado.md#cfg-03).

### CFG-04

- **Descrição resumida:** Pacote exclusivamente com devDependencies.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 117, seção Onda 2 — Concluída: rede de segurança de desenvolvimento; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md).
- **Estado:** OBSOLETO.
- **Justificativa:** Restrição literal foi sucedida por funções Node e executor que precisam de pg/Supabase/SheetJS. Não remover dependências necessárias para cumprir uma fase antiga.
- **Evidência:** package.json; api/reconstruir-cadastro-mestre.js; scripts/lib/.
- **Destino:** histórico preservado; fora da execução ativa.

### CFG-05

- **Descrição resumida:** CI para lint, tipos e testes.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 121, seção Onda 2 — Concluída: rede de segurança de desenvolvimento; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Workflow versionado executa npm ci e os três checks em PR/push. Esta conclusão é da configuração; status da última execução remota não foi consultado.
- **Evidência:** .github/workflows/ci.yml; package.json.
- **Destino:** histórico preservado; fora da execução ativa.

### CUSTOS-DATA-01

- **Descrição resumida:** Data completa no histórico do produto.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 7, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Código e UI mostram 05/10 e 14/10 em duas linhas; competência continua mês/ano e criado_em não foi substituído nos fatos.
- **Evidência:** view/ui-drill-through.js; tests/ui-drill-through.test.js; captura MB014.
- **Destino:** histórico preservado; fora da execução ativa.

### CUSTOS-ERP-01

- **Descrição resumida:** Autoridade ERP de origem/família em Custos.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 62, seção Entrega 2026-08-10 — MNT-OP-04; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/cadastro-mestre-comercial-validacao.md](cadastro-mestre-comercial-validacao.md); [docs/auditoria/custos-classificacao-erp.md](custos-classificacao-erp.md); [docs/auditoria/README.md](README.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [README.md](../../README.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Projeção por código exato implementada; cobertura atual: 273 produtos ERP e 174 fallback. OP permanece operacional.
- **Evidência:** core/custos-classification-engine.js; tests/api-custos-pagination.test.js; GETs e motor na Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### CUSTOS-PAGE-01

- **Descrição resumida:** Leituras completas de Custos.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 26, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** 2.268 fatos completos; páginas de 500/count exact/ordenação e rejeição de parcial; 33 testes de paginação passaram.
- **Evidência:** src/services/api.js lerCompleto; tests/api-custos-pagination.test.js; fotografia atual.
- **Destino:** histórico preservado; fora da execução ativa.

### DOC-DIV-01

- **Descrição resumida:** Verificar SRI, FK de agrupamento e alcance RLS.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 20, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/seguranca.md](seguranca.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Três dúvidas agora têm evidência: SRI ausente/cliente @2, FK para id e nove tabelas sem RLS. Correções ficam em SEC-05/SEC-03; divergências documentais em DOC-DIV-02.
- **Evidência:** index.html; SELECT pg_constraint/pg_class/grants em 22/10; src/services/api.js.
- **Destino:** histórico preservado; fora da execução ativa.

### DOC-ORG-01

- **Descrição resumida:** Reorganizar documentação por responsabilidade.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 19, seção Organização documental — 16/10/2026; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/README.md](README.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Estrutura especializada existe; verificação anterior de 56 Markdown/521 referências não encontrou destinos quebrados. Defasagem posterior tem item próprio.
- **Evidência:** docs/; docs/auditoria/reorganizacao-documental.md; checagem de links na Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### ERR-01

- **Descrição resumida:** Fronteiras de erro de bootstrap/relatório.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 108, seção Onda 1 — Concluída: segurança e correção de contrato; Alto (🔴).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** executeOperationalBoundary e degradação controlada de gráficos presentes. Não significa que todos os fluxos têm feedback perfeito.
- **Evidência:** view/ui-controller.js init/runReport/executeOperationalBoundary.
- **Destino:** histórico preservado; fora da execução ativa.

### ERR-02

- **Descrição resumida:** Hierarquia parcial após falha de dimensão.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 154, seção Onda 6 — Camada de dados/importação e validação compartilhada; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md).
- **Estado:** OBSOLETO.
- **Justificativa:** Recomendação de liberar hierarquia parcial foi sucedida por CUSTOS-PAGE-01: fonte essencial incompleta deve falhar. Manter indisponibilidade apenas no diagnóstico isolado.
- **Evidência:** getMasters; docs/arquitetura/matriz-contratos-operacionais.md.
- **Destino:** histórico preservado; fora da execução ativa.

### IMP-PEND-01

- **Descrição resumida:** Lista única de produtos ausentes antes do envio.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 5, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Helper canônico/descrições/lista integral e abertura contextual existem; quatro testes específicos passaram. API legada continua podendo criar produtos ao importar.
- **Evidência:** core/product-master-engine.js listarProdutosSemCadastro; view/ui-import.js; tests/import-missing-products.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### LOG-01

- **Descrição resumida:** Alerta canônico e filtro rápido alinhados.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 110, seção Onda 1 — Concluída: segurança e correção de contrato; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** classifyAlert/filterAlertRows compartilhados; cinco alertas em outubro conferem com KPI. Ordenação e narrativa são LOG-05/LOG-04.
- **Evidência:** core/report-engine.js; tests/report-engine.test.js; tests/ui-filters.test.js; fotografia de outubro.
- **Destino:** histórico preservado; fora da execução ativa.

### LOG-02

- **Descrição resumida:** Timestamp de chunk confundido com lote.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 153, seção Onda 6 — Camada de dados/importação e validação compartilhada; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/manuais/manual-operacao.md](../manuais/manual-operacao.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [docs/manuais/manual-usuario.md](../manuais/manual-usuario.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [README.md](../../README.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** CONFIRMADO.
- **Justificativa:** Comparação usa dois criado_em distintos e importador faz upsert em chunks sem identidade de lote no fato. Permanece dívida temporal; não corrigida por paginação.
- **Evidência:** src/services/api.js importarHistoricoCustosComLog/getLatestImportComparison/getTopVariacoesImportacao.
- **Destino:** [correção ativa](backlog-priorizado.md#log-02).

### MNT-01

- **Descrição resumida:** Fatiar controller por fluxo.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 135, seção Onda 4 — Fatiamento destravador da UI; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md); [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/regras-gerais.md](../regras-gerais.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Controllers específicos de importação, filtros, tabela, gráficos, exportação e drill-through existem; orquestrador injeta dependências.
- **Evidência:** view/ui-controller.js; view/ui-*.js; testes de controllers.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-02

- **Descrição resumida:** API concentra I/O, validação e enriquecimento.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 151, seção Onda 6 — Camada de dados/importação e validação compartilhada; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [ROADMAP.md](../../ROADMAP.md).
- **Estado:** CONFIRMADO.
- **Justificativa:** Fachada de aproximadamente 1.200 linhas ainda concentra essas responsabilidades. Dívida de manutenção comprovada, sem alegar falha funcional por tamanho.
- **Evidência:** src/services/api.js.
- **Destino:** [correção ativa](backlog-priorizado.md#mnt-02).

### MNT-03

- **Descrição resumida:** Centralizar cascata e fillSelect.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 142, seção Onda 5 — Performance e segurança da fila investigativa/UI; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** fillSelect tem lar único; refreshCascade/fetchMetadata/jumpToProduct ainda coordenam cascata em pontos diferentes.
- **Evidência:** view/ui-utils.js; view/ui-filters.js; view/ui-controller.js.
- **Destino:** [correção ativa](backlog-priorizado.md#mnt-03).

### MNT-04

- **Descrição resumida:** Decidir caminhos mortos/não integrados.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 155, seção Onda 6 — Camada de dados/importação e validação compartilhada; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Guardrail sem lógica foi decidido; quatro métodos da API continuam sem consumidor UI e sem destinação completa. Não remover sem contrato.
- **Evidência:** core/heuristic-engine.js; busca atual em view/core/src/services; API métodos legados.
- **Destino:** [correção ativa](backlog-priorizado.md#mnt-04).

### MNT-05

- **Descrição resumida:** Tipos dos contratos Masters/HistoricoRow/ReportRow.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 129, seção Onda 3 — Preparação de contratos antes de refatorar; Baixo (🟡).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Typedefs e consumo pela API presentes; typecheck passou no mesmo HEAD. Escopo adicional da UI é CFG-06.
- **Evidência:** core/report-engine.js; src/services/api.js; jsconfig.json.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-06

- **Descrição resumida:** Remover geradores órfãos de payload.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 127, seção Onda 3 — Preparação de contratos antes de refatorar; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md); [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** mapRowsToPayload/parseCurrency/normalizeReferenceDate removidos; fluxo ativo normaliza código e gera payload em ui-import.
- **Evidência:** core/spreadsheet-engine.js; view/ui-import.js; busca de símbolos.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-07

- **Descrição resumida:** Nomear/documentar limiares e tetos.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 128, seção Onda 3 — Preparação de contratos antes de refatorar; Baixo (🟡).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Limiares de alerta/regime, chunks e limites visuais nomeados; antigo lookback foi sucedido por paginação completa.
- **Evidência:** core/report-engine.js; view/ui-table.js; src/services/api.js; docs/regras-negocio/glossario.md.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-08

- **Descrição resumida:** Presenter e ranking acoplado a rótulos.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 156, seção Onda 6 — Camada de dados/importação e validação compartilhada; Médio (🟠).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md); [ROADMAP.md](../../ROADMAP.md).
- **Estado:** CONFIRMADO.
- **Justificativa:** Exportação mapeia rótulos com emoji para pesos; presenter é compartilhado por injeção. Mover arquivo por si só não é critério suficiente.
- **Evidência:** view/ui-table.js; view/ui-export.js getInvestigationRankScore.
- **Destino:** [correção ativa](backlog-priorizado.md#mnt-08).

### MNT-OP-01

- **Descrição resumida:** OP com ponto de milhar.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 79, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Parser remove ponto no campo OP; regressões passaram. Entrada ABC é falha distinta, VAL-03.
- **Evidência:** core/spreadsheet-engine.js; tests/spreadsheet-engine.test.js; Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-OP-02

- **Descrição resumida:** Motor e dossiê investigativos de OP.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 80, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [docs/ux/frontend.md](../ux/frontend.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Motor puro e separação ERP/Kustos presentes; 13 testes do motor e oito de UI passaram; OP 833 conferiu na Auditoria 360.
- **Evidência:** core/op-investigation-engine.js; view/ui-op.js; tests/op-investigation-engine.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-OP-03

- **Descrição resumida:** Decisão conjunta por produção/tempo/KG-Hora/parada.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 81, seção Estabilizações operacionais concluídas; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Engine deriva decisão, ação, prioridade e evidências combinadas; regressões atuais passaram.
- **Evidência:** core/op-investigation-engine.js analyzeOpInvestigation; tests/op-investigation-engine.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### MNT-OP-04

- **Descrição resumida:** Recarga local após importar e recorte do dossiê.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 60, seção Entrega 2026-08-10 — MNT-OP-04; sem severidade explícita.
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** onImported chama reloadData; filtros recalculam carga local. Truncamento na API é MNT-OP-05, sem reabrir a causa de recarga antiga.
- **Evidência:** view/ui-controller.js; view/ui-op.js; tests/ui-op.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### PERF-01

- **Descrição resumida:** Limitar DOM da fila a 200 e delegar clique.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 141, seção Onda 5 — Performance e segurança da fila investigativa/UI; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/performance-otimizacao.md](performance-otimizacao.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/manuais/manual-operacao.md](../manuais/manual-operacao.md); [docs/regras-gerais.md](../regras-gerais.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** slice(0,200) e listener delegado presentes; cinco testes de tabela passaram. A ordenação anterior à janela é LOG-05, fora da correção de renderização.
- **Evidência:** view/ui-table.js; tests/ui-table.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### PERF-02

- **Descrição resumida:** Refetch de masters sem invalidação efetiva.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 144, seção Onda 5 — Performance e segurança da fila investigativa/UI; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/performance-otimizacao.md](performance-otimizacao.md); [docs/manuais/manual-operacao.md](../manuais/manual-operacao.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** CONFIRMADO.
- **Justificativa:** loadMasters chama getMasters antes de qualquer guard; abrir Custos força fetchMetadata. Cache de cascata não evita I/O.
- **Evidência:** view/ui-controller.js loadMasters/fetchMetadata/bindNavigation.
- **Destino:** [correção ativa](backlog-priorizado.md#perf-02).

### PERF-03

- **Descrição resumida:** Memoizar com versão de masters.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 145, seção Onda 5 — Performance e segurança da fila investigativa/UI; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/performance-otimizacao.md](performance-otimizacao.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Memoização existe, mas chave usa tamanho, não conteúdo/versão; reprodução atual manteve rótulo antigo após troca apenas em memória.
- **Evidência:** core/report-engine.js getCascadeCacheKey; reprodução atual.
- **Destino:** [correção ativa](backlog-priorizado.md#perf-03).

### PERF-04

- **Descrição resumida:** Datalist como gargalo em grandes volumes.
- **Origem e prioridade anteriores:** documento temático docs/auditoria/performance-otimizacao.md, linha 36; Baixo (🟡).
- **Onde aparece:** [docs/auditoria/performance-otimizacao.md](performance-otimizacao.md); [ROADMAP.md](../../ROADMAP.md).
- **Estado:** NÃO VERIFICADO.
- **Justificativa:** Reconstrução integral existe, mas não foi demonstrado gargalo com os 447 produtos de Custos atuais. Exige medição; não impor autocomplete novo.
- **Evidência:** view/ui-controller.js updateProductSuggestions; docs/auditoria/performance-otimizacao.md.
- **Destino:** [verificação pendente](#verificações-pendentes), fora da execução automática.

### SEC-01

- **Descrição resumida:** XSS no preenchimento de selects.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 107, seção Onda 1 — Concluída: segurança e correção de contrato; Alto (🔴).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/README.md](README.md); [docs/auditoria/seguranca.md](seguranca.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/regras-gerais.md](../regras-gerais.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** fillSelect cria option por DOM/textContent; teste com HTML literal passou. Não reabrir XSS antigo pelo uso de innerHTML seguro em outro fluxo.
- **Evidência:** view/ui-utils.js; tests/ui-utils.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### SEC-02

- **Descrição resumida:** Padronizar HTML seguro.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 143, seção Onda 5 — Performance e segurança da fila investigativa/UI; Baixo (🟡).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/README.md](README.md); [docs/auditoria/seguranca.md](seguranca.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Escape e lint existem; templates/exceções manuais permanecem. Dívida de defesa em profundidade, sem novo XSS demonstrado.
- **Evidência:** view/ui-utils.js; eslint.config.js; controllers view/.
- **Destino:** [correção ativa](backlog-priorizado.md#sec-02).

### SEC-03

- **Descrição resumida:** Acesso público e RLS.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 113, seção Onda 1 — Concluída: segurança e correção de contrato; Decisão (🔵).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/seguranca.md](seguranca.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Decisão histórica e login existem, mas SELECT atual confirma nove tabelas sem RLS com grants de escrita anon. Login não isola o banco.
- **Evidência:** SELECT pg_class/has_table_privilege em 22/10; advisor; getApontamentosOp anônimo.
- **Destino:** [correção ativa](backlog-priorizado.md#sec-03).

### SEC-04

- **Descrição resumida:** Validação de upload, fórmulas e data.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 111, seção Onda 1 — Concluída: segurança e correção de contrato; Médio (🟠).
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/seguranca.md](seguranca.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** Limites de texto/sanitização existem; normalizeISODate ainda aceita 2026-02-31 e 2026-02-29. Reproduzido extraindo a função sem alterar fonte.
- **Evidência:** src/services/api.js normalizeISODate; view/ui-export.js; reprodução local atual.
- **Destino:** [correção ativa](backlog-priorizado.md#sec-04).

### SEC-05

- **Descrição resumida:** Fixação de dependências e SRI.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 112, seção Onda 1 — Concluída: segurança e correção de contrato; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/stack-tecnologico.md](../arquitetura/stack-tecnologico.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/seguranca.md](seguranca.md).
- **Estado:** PARCIALMENTE RESOLVIDO.
- **Justificativa:** HTML fixa versões, mas não contém integrity e cliente Supabase usa @2/+esm. Não afirmar que há CVE sem análise específica.
- **Evidência:** index.html; src/services/api.js import CDN.
- **Destino:** [correção ativa](backlog-priorizado.md#sec-05).

### VAL-01

- **Descrição resumida:** Normalização canônica de produto.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 109, seção Onda 1 — Concluída: segurança e correção de contrato; Médio (🟠).
- **Onde aparece:** [docs/arquitetura/cadastro-mestre-aprovacao.md](../arquitetura/cadastro-mestre-aprovacao.md); [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md); [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/manutenibilidade.md](manutenibilidade.md); [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md); [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md); [docs/manuais/manual-operacao.md](../manuais/manual-operacao.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** normalizeCodigoProduto é reutilizado nos caminhos ativos de Custos/cadastro/relatório; regressões da Auditoria 360 passaram.
- **Evidência:** core/spreadsheet-engine.js; tests/spreadsheet-engine.test.js; tests/report-engine.test.js.
- **Destino:** histórico preservado; fora da execução ativa.

### VAL-02

- **Descrição resumida:** Validação de custo duplicada entre Preview/API.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 152, seção Onda 6 — Camada de dados/importação e validação compartilhada; Baixo (🟡).
- **Onde aparece:** [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md); [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md); [ROADMAP.md](../../ROADMAP.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** CONFIRMADO.
- **Justificativa:** Preview e validateHistoricoRow têm regras separadas; limite de descrição/código não é idêntico antes do envio.
- **Evidência:** view/ui-import.js buildImportPreviewData; src/services/api.js validateHistoricoRow.
- **Destino:** [correção ativa](backlog-priorizado.md#val-02).

### VIS-01

- **Descrição resumida:** Implementação visual Black + Purple.
- **Origem e prioridade anteriores:** backlog-priorizado.md, linha(s) 13, seção Backlog Priorizado — Auditoria Técnica; sem severidade explícita.
- **Onde aparece:** [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md); [docs/auditoria/identidade-visual.md](identidade-visual.md); [docs/auditoria/README.md](README.md); [docs/ux/componentes.md](../ux/componentes.md); [AGENTS.md](../../AGENTS.md).
- **Estado:** RESOLVIDO.
- **Justificativa:** Tokens/controles atuais conferidos em produção e três larguras na Auditoria 360. Aprovação estética humana não foi presumida.
- **Evidência:** assets/style.css; index.html; capturas da Auditoria 360.
- **Destino:** histórico preservado; fora da execução ativa.

## Entradas duplicadas

DUPLICADO qualifica a entrada repetida, não invalida sua prova histórica. O primeiro registro por ID é avaliado no inventário acima. As oito ocorrências extras são:

- **DUPLICADO** — backlog original linha 37: CAD-PAYLOAD-01 → CAD-PAYLOAD-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 38: CAD-PAYLOAD-01 → CAD-PAYLOAD-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 40: Revisão final da execução web, sem ID → CAD-ENV-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 43: CAD-DIAG-TLS-01 → CAD-DIAG-TLS-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 44: CAD-DIAG-TLS-01 → CAD-DIAG-TLS-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 47: CAD-DIAG-01 → CAD-DIAG-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 48: CAD-DIAG-01 → CAD-DIAG-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.
- **DUPLICADO** — backlog original linha 69: CAD-ENV-01 → CAD-ENV-01. Prova/relato preservado no original; nenhuma tarefa adicional de publicar, executar ou reparar TLS é inferida desse relato antigo.

## Reconciliação das entradas do ROADMAP

As linhas abaixo preservam a origem de cada uma das 38 entradas. Texto completo no [original](backlog-historico.md); aqui se registra o destino e o alcance da classificação.

- **Linha 9 — PARCIALMENTE RESOLVIDO:** Importação resiliente de custos com reconhecimento/mapeamento de cabeçalhos, parsing brasileiro, preview por linha, normalização canônica, chunking, log e garantia de produtos no dicionário. **Destino/razão:** Importação implementada, mas SEC-04/VAL-02/ERR-03 mantêm lacunas concretas; correções no backlog.
- **Linha 10 — PARCIALMENTE RESOLVIDO:** Busca direta, cascata, ordenação, filtros rápidos, chips e atualização do relatório após mudança de filtros. **Destino/razão:** Busca/cascata existem; MNT-03 e PERF-03 continuam na lista de correções.
- **Linha 11 — PARCIALMENTE RESOLVIDO:** Alertas canônicos, instabilidade, mudança de regime, comparação de importações, TOP variações e evolução temporal. **Destino/razão:** Alertas existem; LOG-02/03/04/05 tratam lacunas de comparação, narrativa e prioridade.
- **Linha 12 — PARCIALMENTE RESOLVIDO:** Recortes Intervalo/Comparação compartilhados com drill-through e exportação XLSX com contexto e campos selecionáveis. **Destino/razão:** Recortes/drill-through implementados; alinhamento da ordem XLSX ainda é LOG-06.
- **Linha 13 — RESOLVIDO:** Auditoria de OP: persistência MCAP105, decisão investigativa por sinais combinados e carga local renovada após importar (MNT-OP-01 a MNT-OP-04). **Destino/razão:** Entregas MNT-OP-01 a 04 preservadas; o truncamento atual tem causa distinta em MNT-OP-05.
- **Linha 14 — RESOLVIDO:** Fronteiras de erro, contratos tipados, lint/testes/CI e modularização da UI (MNT-01); fila de Custos com janela TOP-200 e delegação de eventos (PERF-01). **Destino/razão:** Modularização, tooling inicial e janela DOM implementados; cobertura adicional e prioridade da entrada recebem itens próprios.
- **Linha 18 — RESOLVIDO:** Dimensão operacional comum a Custos/OP e manutenção manual da classificação, separada dos fatos. **Destino/razão:** Operacional e editor existem; clareza de status segue CAD-UX-02.
- **Linha 19 — RESOLVIDO:** Estrutura de proveniência do Master, preservação do agrupamento ERP bruto e primeira carga pontual auditada. **Destino/razão:** Master e primeira carga confirmados pelos contratos e lote histórico.
- **Linha 20 — RESOLVIDO:** Pipeline único XLS/XLSX/XLSM → Preview → manifesto → aprovação integral → reconstrução administrativa explícita, por CLI ou função Vercel, com snapshot/revalidação/transação/rollback. **Destino/razão:** Pipeline implementado e testado; não implica autorização de nova execução.
- **Linha 21 — RESOLVIDO:** Transporte web compacto, diagnóstico administrativo de leitura e isolamento do frontend em `dist`. **Destino/razão:** Transporte/diagnóstico/build presentes; saúde autenticada atual fica NÃO VERIFICADO na fila própria.
- **Linha 22 — RESOLVIDO:** Reconstrução real confirmada nos registros posteriores à preparação; evidência de 15/10. Isso não representa execução das novas propostas de famílias. **Destino/razão:** Reconstrução histórica confirmada; ressalva antiga sobre famílias não descreve o lote 3 posterior.
- **Linha 23 — RESOLVIDO:** Identidade de família por código, com remoção isolada da unicidade da descrição aplicada e documentada em Migrações. **Destino/razão:** Unicidade da descrição removida; PK/código único atuais confirmados.
- **Linha 27 — RESOLVIDO:** IMP-PEND-01: Preview/resultado de Custos identificam códigos únicos ausentes antes do envio, com descrição do arquivo e acesso contextual ao Cadastro Operacional. Sem persistência adicional ou mudança da regra existente. Contrato e provas. **Destino/razão:** IMP-PEND-01 implementado e quatro regressões atuais passaram.
- **Linha 29 — RESOLVIDO:** CAD-COM-EXEC-01: executor isolado da primeira carga comercial, preservando timestamps/proveniência/logs; validação local do XLS/manifesto e rollback. Execução real bloqueada até autorização própria. Contrato. **Destino/razão:** Implementação isolada local presente; fotografia inicial NULL não pode ser tratada como carga futura pronta.
- **Linha 31 — RESOLVIDO:** CAD-COM-01: Agrup. Com. e descrição opcionais no Master; migration aditiva aplicada em produção na etapa CAD-COM-PROD-01, sem carga. Publicação compatível V3, novo Preview/aprovação e execução continuam dependentes de novas etapas autorizadas. Prova da migration. **Destino/razão:** Migration e implementação comprovadas; declaração de comercial ainda vazio foi sucedida pelo estado atual 162/698 e lote 4.
- **Linha 33 — RESOLVIDO:** CUSTOS-ERP-01: classificação analítica de origem/família pelo Master em memória, fallback fora do Master e agrupamento operacional; validação GET e interface local concluídas, publicação fora desta etapa. **Destino/razão:** Projeção atual existe; recursos públicos conferidos com checkout. Não certificar servidor só por arquivos frontend.
- **Linha 34 — RESOLVIDO:** CAD-OP-PAGE-01 e CUSTOS-PAGE-01: paginação integral do Cadastro operacional e da Auditoria de Custos, contagem exata e bloqueio de leitura parcial. **Destino/razão:** Leitores integrais Cadastro/Custos implementados; método Auditoria OP é distinto.
- **Linha 35 — RESOLVIDO:** CAD-ERP-VIEW-01: consulta do Master ERP com estado independente, filtros por código e páginas visuais de 50. Apresentação atual em cinco colunas, com Agrupamento comercial reunindo código — descrição (CAD-ERP-TABLE-01), sem mudança de dados. **Destino/razão:** Consulta ERP e cinco colunas confirmadas após reload.
- **Linha 36 — RESOLVIDO:** CAD-FAM-01: catálogo de famílias ERP no Preview V2, decisões próprias e executor central com provas/snapshot/rollback conjuntos. **Destino/razão:** Famílias implementadas, lote 3 com 65 inserções e Preview atual sem propostas.
- **Linha 44 — RESOLVIDO:** Publicação autorizada das leituras integrais de Cadastro/Custos e da consulta ERP; conferência da UI publicada com sessão de produção. **Destino/razão:** Frontend publicado conferido em produção; não manter uma publicação genérica dessas leituras como pendência sem divergência atual.
- **Linha 45 — PARCIALMENTE RESOLVIDO:** Publicação conjunta de UI/função V2 de famílias, novo Preview, revisão independente de famílias/produtos e diagnóstico. Habilitação/execução real das propostas exige autorização própria; não é teste da consulta. **Destino/razão:** Implementação/publicação frontend e inserção histórica de famílias têm evidência; saúde administrativa autenticada não revalidada. Não repetir carga de famílias como tarefa de teste.
- **Linha 46 — NÃO VERIFICADO:** Esclarecimento da divergência histórica de fingerprint operacional registrada na Fase 3.3, sem atribuir causa ou autoria por suposição. **Destino/razão:** Fingerprint: ausência de imagem anterior impede reconstruir causa/autoria; fila de verificação.
- **Linha 56 — PARCIALMENTE RESOLVIDO:** **MNT-03:** centralizar cascata; `fillSelect` já tem lar único, mas a iniciativa permanece parcial. **Destino/razão:** MNT-03 volta à fonte única de correções.
- **Linha 57 — PARCIALMENTE RESOLVIDO:** **SEC-02:** padronizar HTML seguro sobre os fluxos separados. **Destino/razão:** SEC-02 volta à fonte única de correções.
- **Linha 58 — CONFIRMADO:** **PERF-02:** cache de masters com invalidação por importação/realtime e diagnóstico explícito de falhas. **Destino/razão:** PERF-02 volta à fonte única de correções.
- **Linha 59 — CONFIRMADO:** **MNT-02 / VAL-02:** separar responsabilidades da API mantendo a fachada e consolidar validação entre preview e persistência. **Destino/razão:** MNT-02 e VAL-02 voltam à fonte única de correções.
- **Linha 60 — CONFIRMADO:** **LOG-02:** decidir identidade de lote versus timestamp por chunk antes de corrigir comparação de importações. `criado_em` segue importação; `data_referencia` segue competência. **Destino/razão:** LOG-02 volta à fonte única de correções; não é capacidade futura.
- **Linha 61 — CONFIRMADO:** **MNT-08:** avaliar presenter investigativo dedicado e desacoplamento da ordenação de exportação dos rótulos visuais. **Destino/razão:** MNT-08 volta à fonte única de correções.
- **Linha 67 — NÃO VERIFICADO:** Histórico de alertas por produto, frequência/reincidência e linha do tempo de regime, preservando o alerta canônico ≥ 5%. **Destino/razão:** Capacidade futura de memória persistente de alertas mantida no ROADMAP; corrigir narrativa atual por LOG-04 é assunto distinto.
- **Linha 68 — NÃO VERIFICADO:** Comparação entre períodos equivalentes e exportação do drill-through individual. **Destino/razão:** Comparação ampliada/exportação individual são planos de produto, mantidos no ROADMAP.
- **Linha 69 — NÃO VERIFICADO:** Autocomplete avançado por código/descrição e persistência do filtro de mudança de regime por período. **Destino/razão:** Autocomplete e persistência de filtros são capacidades futuras; não derivados automaticamente de PERF-04.
- **Linha 77 — NÃO VERIFICADO:** Ampliar priorização para ranking de risco composto e sugestões explicáveis de próximos produtos a investigar; a prioridade contextual atual já existe. **Destino/razão:** Ranking composto/sugestões ampliadas são roadmap; correção da prioridade prometida hoje é LOG-05.
- **Linha 78 — NÃO VERIFICADO:** Distinguir sazonalidade de ruptura, gerar insights textuais de recorrência e avaliar previsão de tendência. **Destino/razão:** Sazonalidade/previsão são roadmap, sem alegar implementação atual.
- **Linha 79 — NÃO VERIFICADO:** Integração direta ERP/SAP e eventual sugestão revisável de classificação por código de negócio. **Destino/razão:** Integração ERP/SAP e sugestão revisável são roadmap, sem inferência textual automática.
- **Linha 80 — NÃO VERIFICADO:** Reavaliar datalist em volumes grandes (PERF-04) e acessibilidade conforme impacto investigativo. **Destino/razão:** PERF-04 requer medição, passa à fila de verificação; acessibilidade futura depende de requisito/impacto, sem bug genérico inventado.
- **Linha 84 — NÃO VERIFICADO:** Reconciliação Master ERP → dimensão operacional somente após decisão explícita de negócio; nenhuma sincronização automática está implícita na existência de duas visões. **Destino/razão:** Reconciliação de dimensões depende de decisão de negócio; preservada no ROADMAP, sem sincronização implícita.
- **Linha 85 — NÃO VERIFICADO:** Ponte empresarial aprovada para agrupamento ERP → categoria Kustos; não converter por família, origem, descrição ou semelhança de códigos. **Destino/razão:** Ponte de agrupamento depende de contrato empresarial; preservada no ROADMAP.
- **Linha 86 — PARCIALMENTE RESOLVIDO:** Modelo de acesso/RLS e retenção de evidências conforme necessidade operacional. Login existente não comprova isolamento no banco. **Destino/razão:** Risco de acesso atual vai a SEC-03, não fica condicionado a feature RBAC; retenção de evidências permanece decisão futura de produto/operação.

## Itens novos e continuidade dos IDs

Os 16 IDs novos formalizam problemas diferentes dos históricos, usando as mesmas famílias de nomenclatura. Seus problemas, provas e critérios de aceite completos estão na lista ativa:

- [SEC-06](backlog-priorizado.md#sec-06) — Gravação documental sem autorização no handler (P0).
- [MNT-OP-05](backlog-priorizado.md#mnt-op-05) — Carga de OP truncada sem aviso (P1).
- [LOG-05](backlog-priorizado.md#log-05) — Alertas ficam fora dos 200 itens apresentados (P1).
- [LOG-04](backlog-priorizado.md#log-04) — Narrativa afirma recorrência sem série suficiente (P1).
- [LOG-06](backlog-priorizado.md#log-06) — Ordem do XLSX diverge da fila (P1).
- [LOG-03](backlog-priorizado.md#log-03) — Comparação escolhe importações fora do recorte (P1).
- [VAL-03](backlog-priorizado.md#val-03) — OP inválida chega ao chunk de persistência (P1).
- [ERR-03](backlog-priorizado.md#err-03) — Falhas de log e de chunks podem parecer sucesso (P1).
- [ERR-04](backlog-priorizado.md#err-04) — save-doc falha e não carrega como ES Module (P1).
- [CFG-06](backlog-priorizado.md#cfg-06) — view e entradas administrativas fora do typecheck (P2).
- [DOC-DIV-02](backlog-priorizado.md#doc-div-02) — Documentos apresentam estados e tipos ultrapassados (P2).
- [CUSTOS-UX-01](backlog-priorizado.md#custos-ux-01) — Percentuais e limiar têm rótulos ambíguos (P2).
- [CAD-UX-02](backlog-priorizado.md#cad-ux-02) — Status e orientação de pendências se contradizem (P2).
- [SEC-07](backlog-priorizado.md#sec-07) — View usa execução com privilégios do proprietário (P2).
- [SEC-08](backlog-priorizado.md#sec-08) — Funções têm search_path mutável (P2).
- [PERF-05](backlog-priorizado.md#perf-05) — Dois índices equivalentes em data de referência (P3).

Aliases usados nos apontamentos da Auditoria 360 não criam tarefas adicionais: A360-SEC-01 → SEC-03; A360-OP-01 → MNT-OP-05; A360-OP-02 → VAL-03; A360-CUS-01 → LOG-05; A360-CUS-02 → LOG-04; A360-CUS-03 → LOG-06; A360-CUS-04 → LOG-03; A360-CUS-05 → PERF-03.

PERF-01 fica RESOLVIDO no alcance efetivamente entregue de limitar DOM/delegar eventos. A promessa de receber uma entrada já priorizada não foi verificada na entrega antiga; a falha atual da ordenação anterior ao corte fica explícita em LOG-05. Não afirmar que a fila atual já é prioritária. CFG-02/05 também se referem à base/configuração entregue, sem certificar cobertura integral nem o último CI remoto.

## Evidências e limites

### Código, runtime e testes

- Leitura de README, AGENTS, regras gerais, manuais, matriz operacional, contratos de Cadastro e auditorias temáticas antes das alterações. Referências por função são preferidas a linhas históricas que se deslocaram.
- Revalidação atual: **209 testes passaram em 15 arquivos**, com dois workers e sem cache, em 5,21 s. Arquivos: ui-utils, report-engine, report-engine-cascade, ui-filters, ui-table, ui-export, op-investigation-engine, ui-op, api-product-master-pagination, api-custos-pagination, import-missing-products, cadastro-mestre-diagnostic, cadastro-mestre-comercial, cadastro-mestre-familias e cadastro-mestre-web. Incluem 23 casos de paginação do Cadastro, 33 de Custos, quatro de produtos ausentes, 12 de diagnóstico, 15 de famílias e 42 web. Passar nesses testes não invalida os cenários novos reproduzidos fora de sua cobertura.
- Na Auditoria 360 desta sessão, no mesmo HEAD: **594 passaram, dois foram pulados e quatro casos de build foram excluídos** (600 casos inventariados). Pulados casos que escreviam arquivos temporários e excluídos os que gerariam dist para respeitar o escopo; lint e typecheck passaram. Não foi feita instalação limpa de dependências, medição de cobertura percentual ou confirmação do último CI remoto. Esses limites não viram “600 passaram”. Nenhum build ou suíte funcional foi repetido após a edição exclusivamente documental.
- Sondas puras reproduziram datas impossíveis aceitas, cache com mesma cardinalidade e rótulo antigo, OP=ABC sem erro de linha, ordenação de outubro, narrativa com dois pontos e diferença UI/exportação. Nenhum payload de importação foi persistido.
- Comparação com dados atuais: outubro tem 558 fatos entre 05/10 e 14/10, 349 produtos e cinco alertas. Na ordenação inicial, alertas estão em 345 (1002012), 346 (1002152), 347 (MM006), 348 (MM013) e 349 (MM014); os 200 primeiros não contêm nenhum. MB014 é o exemplo distinto de série com apenas uma alta, 9,24 → 9,39.
- Sonda de API apenas com GET: abril–junho retorna dois timestamps de outubro com quantidade zero na comparação; seleção global precede o recorte. Para LOG-02, o mecanismo de timestamp por chunk está confirmado no código; não foi gerada uma importação de produção para demonstrá-lo.
- Diagnóstico local: executar a entrada save-doc com Node reproduz ReferenceError na declaração module.exports sob type=module. GET da função publicada retornou HTTP 500/FUNCTION_INVOCATION_FAILED. Sem logs de execução remota, a atribuição desse 500 especificamente à incompatibilidade ESM continua NÃO VERIFICADO. O diagnóstico não alterou o arquivo.

### Banco real, exclusivamente leitura

Projeto Supabase Custos-Germani (`umpebdovrazzrdndhigc`). Consultas restritas a SELECT em dados, information_schema, pg_class, pg_proc, pg_constraint, pg_indexes, grants e logs existentes; GETs de REST e advisors de segurança/performance. Sem DML, DDL, RPC de aplicação, Storage upload, executor, aprovação, download de revisão ou alteração de configuração. Não houve prova de escrita anônima por tentativa de escrita: grants e RLS sustentam o risco registrado.

Fotografia observada em 22/10:

- historico_custos: **2.268**; apontamentos_op: **1.469**; dicionario_produtos: **6.113**; Master ERP: **860**; categorias_familia: **103**; origens: **50**; agrupamentos: **34**; mapa: **299**. Leituras em requisições separadas não constituem snapshot transacional.
- OP sem paginação retornou **1.000 de 1.469** (Content-Range 0-999/1469). getProductMaster completo identificou cinco códigos de OP ausentes do operacional: 1755712, 1755713, 1758717, 1758718 e MCC016. Isso não reabre o bug antigo de paginação do Cadastro.
- Nove tabelas operacionais sem RLS, com privilégios anon de SELECT/INSERT/UPDATE/DELETE. Master, famílias-base e log de Master têm RLS; grants amplos nessas tabelas não demonstram escrita permitida quando policies a restringem. Não extrapolar o achado das nove tabelas para todas as tabelas.
- Advisor de segurança: nove ocorrências de RLS desabilitado; uma view com security definer; cinco ocorrências de search_path mutável; duas tabelas com RLS sem policy; proteção contra senha vazada desabilitada. As duas tabelas sem policy não demonstram vazamento por si: RLS sem policy nega acesso ordinário. A necessidade operacional da proteção de senha fica na fila de decisão.
- Advisor de performance: três FKs sem índice sugerido, oito índices sem uso observado e uma duplicação. Somente a equivalência concreta idx_historico_data/idx_historico_data_referencia foi promovida a PERF-05; não inferir lentidão, criar índices nem apagar índices por amostra de uso.
- Catálogo atual confirma FK de agrupamento para categorias_agrupamento(id), colunas operacionais de origem/família e respectivos IDs TEXT; descrição de família sem UNIQUE, com código único. As três dúvidas de DOC-DIV-01 têm resposta; as correções respectivas estão em SEC-03/05 e a revisão documental remanescente em DOC-DIV-02.
- Logs existentes: lote 1 registra 103 inserções/312 atualizações; lote 2 registra dez atualizações e 4.853 remoções; lote 3 registra **65 inserções de famílias**; lote 4 (manifesto V2) registra **162 atualizações de produtos**. Master atual tem 162 pares comerciais preenchidos e 698 vazios. Isso sucede o estado “860 NULL” da migration isolada, sem invalidar sua prova histórica de não preenchimento naquela etapa. O lote 4 não prova execução do executor comercial isolado, que não grava esse log.

### Arquivo real e interface

Arquivo autorizado somente para leitura e preparação do Preview: `D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/cadastro mestre 8_10.xls`, 24.307.397 bytes, SHA-256 `3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14`. Adapter/motores existentes processaram 6.230 linhas, universo de 860 produtos, 81 famílias já existentes, zero propostas de alteração/erros, 162 produtos comerciais, 698 sem comercial e 29 códigos comerciais. Essa é preparação real pelos motores; **não foi capturado o modal web com o arquivo**, pois a extensão de seleção de arquivo não permitiu essa etapa. Não houve aprovação, download de revisão ou carga. “Preview real” nos apontamentos refere-se ao arquivo e aos motores, sem afirmar validação integral do gesto de upload no navegador.

UI autenticada na Auditoria 360: navegação, fila/dossiê OP, Custos e consulta ERP conferidos; OP 833 teve sinais consistentes com seus fatos (produção +91,3%, tempo +101,2%, produtividade −50,3% e parada 25,4%). A correção da carga integral continua necessária apesar desse caso individual correto. Após reload, ERP mostrou as cinco colunas atuais. Foram conferidos 19 recursos públicos frontend contra o checkout com normalização CRLF; isso não prova identidade de todo backend implantado.

### Natureza dos achados

- **Defeito confirmado no código atual:** leitor parcial de OP, prioridade antes do TOP-200, narrativa, ordem XLSX, seleção temporal, cache, validação de datas/OP e caminhos de feedback. Contratos completos estão na lista ativa.
- **Configuração de segurança confirmada:** RLS/grants, view e search_path. Risco documentado sem alegar exploração.
- **Problema de ambiente/carregamento local:** CommonJS sob pacote ESM é reproduzível na entrada save-doc. Compatibilidade real do empacotamento Vercel precisa de logs; não transformar a reprodução local em causa remota provada.
- **Estado antigo/cache:** incidente de sete cabeçalhos ERP com cinco células desapareceu após reload. Recursos atuais e DOM recarregado são coerentes. URLs sem versão e aba mantida aberta são compatíveis com mistura de versões; headers max-age=0/must-revalidate não identificam a causa exata. Não foi criado bug de alinhamento do código atual.
- **Comportamento esperado:** campos ERP não criam agrupamento Kustos, faltas de catálogo não autorizam inferência textual, recorte por competência e proveniência são eixos distintos. Ausência atual de agrupamento não é autorização de saneamento automático.
- **Ainda não conclusivo:** causa remota do 500, saúde administrativa autenticada atual, fingerprint histórico e gargalos não medidos. Permanecem explícitos abaixo.

## Verificações pendentes

Esta fila não é um segundo backlog de correções nem autoriza ações remotas. Cada ponto tem o estado **NÃO VERIFICADO** quanto à conclusão descrita:

1. **PERF-04 — gargalo de datalist:** medir após reduzir refetch; há 447 produtos com fatos de Custos nesta fotografia. Sem limiar de atraso medido, não impor autocomplete como “correção”. Origem: performance-otimizacao.md e ROADMAP antigo linha 80.
2. **Fingerprint operacional da Fase 3.3, sem ID:** os fingerprints históricos divergem, mas falta imagem anterior suficiente para reconstituir registros, causa ou autoria. Preservar a ressalva em cadastro-mestre-aprovacao.md; buscar backup/fotografia original se houver. Hash atual não resolve essa lacuna. Origem: ROADMAP antigo linha 46.
3. **Ambiente administrativo atual:** não revalidada a saúde autenticada de TLS, flag, bucket, guardas e Storage; GET público 401 comprova barreira sem sessão, não saúde completa. Uma eventual verificação futura deve ser somente o diagnóstico autorizado, sem habilitar ou executar como teste. Implementação dos guardas permanece distinta dessa verificação de ambiente.
4. **Causa remota do save-doc:** obter logs Vercel sanitizados. HTTP 500 confirmado e incompatibilidade local confirmada já estão em ERR-04; não abrir dois tickets para supostas causas do mesmo sintoma.
5. **Causa exata da mistura de versões ERP:** capturar reprodução, recursos e estado da aba se voltar a ocorrer. Sem recorrência em código atual, o registro permanece incidente resolvido por reload, não defeito publicado confirmado.
6. **Advisors sem decisão de necessidade:** avaliar política de senhas vazadas, FKs sem índice e índices sem uso conforme autenticação/planos/volume reais. Alertas de catálogo são verificáveis, mas necessidade de cada alteração não foi demonstrada.
7. **Qualidade/modelo de dados:** dois códigos de origem ERP sem resolução atingem 632 produtos; cinco códigos OP faltam no operacional; não há agrupamentos nos produtos com fatos desta fotografia. Definir tratamento empresarial sem completar por texto ou sincronizar ERP/operacional automaticamente. Ausência de criado_por em fatos também não vira defeito sem contrato aprovado de autoria.

## Conflitos entre fontes e tratamento

- **README × banco:** afirmava 860 pares comerciais NULL e famílias ainda por executar. Substituído por resumo datado com link para esta fotografia; provas da migration original são preservadas. As capacidades continuam sujeitas aos defeitos ativos, e salvar documentação aponta o bloqueio atual.
- **Backlog × código:** checkboxes concluídos em SEC-03/04/05, PERF-03, CFG-03 e MNT-04 ocultavam lacunas; agora são parciais. DOC-DIV-01 sai da dúvida porque catálogo/código responderam; suas correções não são duplicadas.
- **Backlog × ROADMAP:** seis posições técnicas repetiam correções; centralizadas. Estado genérico de publicar/cargar famílias não prevalece sobre evidência atual. Memória de alertas, comparação ampliada, autocomplete e integrações permanecem features. Acesso/RLS sai do mero futuro estratégico e tem P0 atual em SEC-03.
- **Temáticos × lista ativa:** cinco documentos mantêm conteúdo histórico, com aviso inicial para esta reconciliação. Ex.: ausência de cache descrita em 2026 não é mais a causa de PERF-03; hoje o problema é invalidação. Não reexecutar uma recomendação antiga sem ler sua sucessão de contrato.
- **Site × repositório:** view/documentation-controller.js define aud-backlog → docs/auditoria/backlog-priorizado.md; fetch usa cache:no-store e parâmetro temporal. GET publicado retornou 200 e conteúdo igual à lista original do checkout (normalizados finais de linha), antes desta edição. Não há segundo backlog manual nem tabela remota alimentando a lista. scripts/build-web.mjs publica docs por allowlist.
- **Limite da igualdade no site após esta entrega:** a fonte canônica é o mesmo caminho versionado, mas o site continua com o snapshot publicado anterior, pois não houve deploy nem commit. Portanto, os itens obsoletos da versão publicada continuam visíveis até publicação futura autorizada. Não corrigir código de navegação nem criar cópia manual. Verificação pós-publicação: comparar o Markdown servido com o arquivo aprovado e abrir aud-backlog. Nenhum deploy é autorizado por este relatório.

## Recomendação e encerramento documental

Ordem e dependências completas ficam na [lista ativa](backlog-priorizado.md#ordem-recomendada-de-execução): **A segurança/integridade → B confiabilidade da investigação → C operação → D UX → E manutenção**. Dentro do bloco A, decidir o modelo de acesso, tratar tabelas/view/funções em conjunto e proteger save-doc antes da recuperação de escrita. No bloco B, completar OP e priorizar a fila antes de refinar narrativa/exportação; alinhar lote e período nas comparações. Testes acompanham cada correção, sem aguardar uma refatoração geral.

Esta auditoria não iniciou nenhum desses itens. Aguardar aprovação humana para selecionar e implementar a próxima entrega, com autorização própria para eventual escrita remota ou publicação. A fotografia não autoriza executar o executor comercial sobre dados já preenchidos nem repetir cargas históricas.

## Checklists auxiliares e itens de governança

Estes 12 checkboxes fazem parte do inventário bruto de 79, mas não acrescentam assuntos aos 69 registros de origem de correção/manutenção. A extração de um módulo e a correção de todo o seu comportamento são contratos diferentes. Linhas abaixo são as originais, antes dos avisos documentais.

- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 27: Gráficos. Extração e consumidor no controller conferidos em `view/ui-charts.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.
- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 28: Drill-through. Extração e consumidor no controller conferidos em `view/ui-drill-through.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.
- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 29: Importação. Extração e consumidor no controller conferidos em `view/ui-import.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.
- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 31: Filtros. Extração e consumidor no controller conferidos em `view/ui-filters.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.
- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 32: Exportação. Extração e consumidor no controller conferidos em `view/ui-export.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.
- **RESOLVIDO — subtarefa MNT-01**, manutenibilidade.md linha 33: Fila/tabela e presenter investigativo. Extração e consumidor no controller conferidos em `view/ui-table.js`; erros de comportamento atuais têm IDs próprios na lista ativa. Não somar como novo ID.

Na matriz de contratos, os seis checkboxes são verificações universais para cada mudança futura. **NÃO VERIFICADO** abaixo refere-se ao cumprimento universal/contínuo, não declara seis bugs presentes. Exemplos atuais e critérios já comprovados permanecem nos itens específicos, sem marcar automaticamente essas perguntas como concluídas:

- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 218: Toda query com filtro cascata deve operar em dataset com campos de dimensão resolvidos.
- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 219: Toda query temporal deve explicitar eixo (`data_referencia` vs `criado_em`).
- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 220: Todo método UI→API deve estar listado e testado após mudança de assinatura.
- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 221: Todo payload de escrita deve ser validado por whitelist de colunas da tabela alvo.
- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 222: Todo novo fluxo com `codigo_produto` deve chamar `normalizeCodigoProduto()` e falhar explicitamente se o retorno for vazio.
- **NÃO VERIFICADO — controle contínuo**, matriz-contratos-operacionais.md linha 223: Toda mudança de contrato deve revisar `README.md`, `VISION.md`, `ROADMAP.md` e esta matriz, atualizando cada documento afetado conforme sua função, sem repetir changelog. Ver governança.

## Validação da consolidação documental

- 29 IDs ativos únicos; todos com ID, prioridade, área, problema, evidência, impacto, estado, critério de aceite e dependências. Distribuição conferida: 2/10/11/6; estados ativos: oito parciais e 21 confirmados; origem: 13 mantidos e 16 novos.
- Todos os 60 IDs antigos têm decisão individual; oito ocorrências duplicadas e a ressalva de fingerprint sem ID têm destino explícito. Soma das 69 entradas de origem: 43 + 8 + 5 + 3 + 8 + 2. As 38 entradas do ROADMAP e os 12 checkboxes auxiliares foram discriminados, sem inflar essa soma.
- 956 referências locais verificadas em 63 Markdown do conjunto documental, sem arquivo/âncora ausente, excluindo blocos literais de código/histórico. Conteúdo remoto do site não foi publicado novamente.
- Backlog, ROADMAP e README anteriores foram extraídos de seus blocos de arquivo e comparados com os textos originais: igualdade integral e SHA-256 conferidos. Os hashes registram os finais de linha da leitura original; normalização futura de checkout Git pode mudar o hash de bytes sem mudar o conteúdo documental.
- Somente 12 arquivos Markdown alterados/criados, incluindo avisos nos cinco temáticos; sem alteração de código/configuração. git diff --check sem erros de whitespace. Checks funcionais descritos acima precederam esta edição documental; nenhuma nova execução de carga ou escrita foi usada para validar o relatório.

## Sucessão posterior — 23/10/2026

Esta reconciliação conserva a fotografia e as contagens de 22/10. Após autorização humana própria, SEC-03 e SEC-07 foram encerrados na [entrega de RLS](seguranca-rls-validacao.md), com aplicação remota e provas. O [backlog vigente](backlog-priorizado.md) passa a 27 itens; não reinterpretar os 29 iniciais e os estados antigos como diagnóstico atual após a mudança. Lote administrativo 5 posterior está discriminado nas novas provas, sem alterar retroativamente esta fotografia.
