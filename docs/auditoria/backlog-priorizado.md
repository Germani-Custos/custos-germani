# Backlog ativo de correções — Kustos

Estado vigente em **26/10/2026**, após SEC-03, MNT-OP-05, LOG-03/04/05/06 e a entrega parcial LOG-02: **22 itens ativos — P0 = 1, P1 = 5, P2 = 10, P3 = 6.** São 12 IDs históricos e 10 novos da reconciliação ainda pendentes; oito parcialmente resolvidos e 14 confirmados. A fotografia original de 22/10 permanece na reconciliação. SEC-03/SEC-07 e as implementações locais de MNT-OP-05/LOG-03/04/05/06 foram encerrados com provas abaixo; LOG-02 permanece ativo. Publicação dessas correções de frontend aguarda autorização própria.

Esta é a fonte única da lista ativa. [Reconciliação e evidências](backlog-reconciliacao-2026-10-22.md) explicam a classificação de todos os itens antigos; [arquivo histórico](backlog-historico.md) conserva as listas anteriores integralmente. Novas capacidades pertencem ao [ROADMAP](../../ROADMAP.md). Checkboxes e rótulos antigos nos documentos temáticos são registros datados, não o estado vigente.

A autorização da entrega RLS cobriu SEC-03 e o fechamento da view em SEC-07. Não autoriza os itens restantes. A consolidação de 22/10 foi documental; o hardening subsequente foi aplicado em migration própria, sem carga, commit, push ou deploy de aplicação. Contagens remotas continuam sendo evidência datada.

## Prioridades e contratos comuns

- **P0 — crítico:** risco de acesso/escrita indevida ou integridade; tratar antes de evolução funcional.
- **P1 — investigação / operação:** falhas que prejudicam encontrar, interpretar ou importar dados.
- **P2 — confiabilidade / UX:** lacunas importantes de contrato, clareza e verificação.
- **P3 — refinamento:** manutenção e defesa em profundidade sem falha crítica demonstrada.

`data_referencia` continua competência operacional; `criado_em` continua importação/proveniência. Seleção de competências é conjunto explícito, sem completar intervalos na comparação. Preservar FATO × DIMENSÃO, fonte canônica, leitura integral/falha explícita, código de negócio e ausência de inferência textual. Ensaios administrativos de escrita exigem escopo autorizado, rollback obrigatório e prova de preservação; cargas reais continuam com procedimento próprio.

Cada item abaixo tem um único estado: **CONFIRMADO** ou **PARCIALMENTE RESOLVIDO**. Risco/configuração confirmada não equivale a exploração demonstrada. Os demais estados ficam no inventário e fora da lista de execução.

## P0


### SEC-06

**Gravação documental sem autorização no handler**

- **ID:** SEC-06
- **Prioridade:** P0
- **Área:** Segurança / Documentação
- **Problema:** O handler save-doc possui allowlist de caminhos, porém não verifica sessão nem autorização antes de usar GITHUB_TOKEN para gravar no GitHub.
- **Evidência:** api/save-doc.js: handler e chamadas GitHub; ausência de validação Auth. GET publicado retorna 500, portanto exploração remota não demonstrada. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Quando o handler voltar a funcionar, clientes sem autorização poderão alcançar a gravação documental e gerar commits.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Teste de handler comprova recusa de requisição ausente/inválida/não autorizada antes de qualquer chamada de escrita; somente identidade autorizada grava caminho permitido. Publicar recuperação do endpoint somente com essa proteção.
- **Dependências:** Modelo de acesso de SEC-03 já definido; autorização documental própria e coordenação com ERR-04 continuam necessárias.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** A — Segurança e integridade.

## P1

### LOG-02

**Chunks são tratados como importações distintas**

- **ID:** LOG-02
- **Prioridade:** P1
- **Área:** Custos / Temporalidade
- **Problema:** A execução já recebe identidade confirmada de log no controle dos chunks, mas o schema atual versionado não persiste vínculo de lote nos fatos; comparações continuam por timestamps elegíveis, que podem ser chunks do mesmo envio.
- **Evidência:** `importarHistoricoCustosComLog` reutiliza `log_importacao.id`, bloqueia escrita sem ID confirmado e devolve batchId/chunks/rastreabilidade limitada. Fotografia do schema não tem FK de lote em `historico_custos`. [Provas locais LOG-02](custos-identidade-lote-validacao.md), [contrato](../arquitetura/identidade-lote-custos.md) e [proposta documental de vínculo](../arquitetura/proposta-vinculo-lote-custos.md). A evidência histórica de comparação por timestamp permanece na reconciliação.
- **Impacto:** Comparação pode opor partes do mesmo envio em vez de duas importações.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Contrato vigente:** **Implementação da identidade de execução concluída; persistência da identidade nos fatos depende de migration e atualização integral dos writers.** O usuário confirmou o vínculo da última execução que efetivamente gravou a versão atual. [Inventário completo, tratamento dos writers e garantias](custos-vinculo-lote-auditoria-arquitetural.md#10-fechamento-do-contrato-de-proveniência-por-lote).
- **Critério de aceite:** Um ID confirmado por execução e por todos os chunks; após ativação, writer oficial não cria/substitui fato sem o mesmo ID no payload/upsert. Legado permanece NULL sem reconstrução; upsert mantém produto/data e atualiza vínculo da versão sobrevivente, sem alterar criado_em. Writers antigos devem ser atualizados ou bloqueados, sem fallback ou lote falso. Não resolver retenção, reatribuir competência ou fabricar proveniência. Comparadores A360-CUS-04 não mudam neste contrato; eventual migração deles para lote exige etapa própria.
- **Dependências:** Catálogo remoto atual ainda não confirmado (metadados sem link_id); futura migration somente após autorização, controle efetivo/atualização integral dos writers e testes de contrato. Proposta somente documental, sem arquivo SQL ou execução. LOG-02 permanece PARCIAL e integra os mesmos 22 itens ativos; retenção de snapshots é dívida separada.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#log-02).
- **Bloco recomendado:** B — Confiabilidade da investigação.

### SEC-04

**Datas impossíveis passam pela validação**

- **ID:** SEC-04
- **Prioridade:** P1
- **Área:** Importação / Datas
- **Problema:** A faixa numérica de dia/mês aceita combinações inválidas no calendário.
- **Evidência:** src/services/api.js:normalizeISODate; sonda pura devolveu 2026-02-31 e 2026-02-29 como válidas; 2026-02-28 é controle válido. Limites de string e sanitização já existem. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Preview/API podem aceitar uma competência impossível que o banco rejeita durante a gravação.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Rejeitar datas impossíveis sem normalização silenciosa; aceitar anos bissextos válidos e manter YYYY-MM-DD sem conversão UTC. Preview e API concordam, com erro por linha antes do envio.
- **Dependências:** Coordenar VAL-02 sem exigir fatiamento completo de MNT-02.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#sec-04).
- **Bloco recomendado:** C — Operação.

### VAL-03

**OP inválida chega ao chunk de persistência**

- **ID:** VAL-03
- **Prioridade:** P1
- **Área:** Importação / OP
- **Problema:** parseMCAP105 converte OP não numérica para null sem acrescentar erro de linha.
- **Evidência:** core/spreadsheet-engine.js:parseMCAP105; linha de teste com OP=ABC gerou op:null e errors:[]; coluna remota op é NOT NULL. Sem tentativa de INSERT. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Uma linha inválida pode provocar rejeição de um chunk válido e feedback insuficiente.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Preview bloqueia linha com OP inválida/ambígua e explica o erro; linhas válidas permanecem importáveis. Cobrir ABC, vazio, milhar válido e lote misto, sem regredir MNT-OP-01.
- **Dependências:** Preservar tolerância linha a linha e chunking; coordenar ERR-03.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** C — Operação.

### ERR-03

**Falhas de log e de chunks podem parecer sucesso**

- **ID:** ERR-03
- **Prioridade:** P1
- **Área:** Importação / Feedback
- **Problema:** Custos continua após falha no log e o detalhe log_error fica no debug; OP registra status concluido apesar de falhas de chunks.
- **Evidência:** src/services/api.js:importarHistoricoCustosComLog/importarApontamentosOp; view/ui-import.js e view/ui-import-op.js: tratamento do resultado. Diagnóstico de caminhos, sem escrita remota. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Usuário pode acreditar que há trilha completa e importação integral quando há falha parcial.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Resultado e mensagem distinguem completo, parcial e falha; log ausente é visível. Testes simulam falha de log, de um chunk e de todos os chunks; contagens/status correspondem ao que foi persistido sem retry duplicador automático.
- **Dependências:** Coordenar VAL-03; preservar contratos temporais e decidir compatibilidade de status do log antes de alterar.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** C — Operação.

### ERR-04

**save-doc falha e não carrega como ES Module**

- **ID:** ERR-04
- **Prioridade:** P1
- **Área:** Documentação / Função Node
- **Problema:** Endpoint de salvar documentação responde HTTP 500; entrada local usa module.exports em pacote type=module.
- **Evidência:** GET https://custos-germani.vercel.app/api/save-doc retornou FUNCTION_INVOCATION_FAILED; node api/save-doc.js reproduziu ReferenceError: module is not defined in ES module scope na linha 24. Causa exata do 500 remoto ainda não provada por logs Vercel. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Edição documental não consegue concluir o salvamento; diagnóstico local demonstra incompatibilidade de carregamento.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Obter diagnóstico remoto sanitizado; entrada carrega no runtime configurado e handler responde aos métodos esperados. Validar autenticação e falhas sem criar commit real como teste nesta auditoria; recuperação publicada só após proteção SEC-06.
- **Dependências:** SEC-06 antes de disponibilizar escrita; acesso de diagnóstico aos logs Vercel para atribuir a causa remota.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** C — Operação.

## P2

### PERF-03

**Cache de cascata sobrevive a mudança de conteúdo**

- **ID:** PERF-03
- **Prioridade:** P2
- **Área:** Custos / Cache
- **Problema:** Chave de memoização usa tamanhos das coleções, sem versão/conteúdo que mude com reclassificação ou rótulo.
- **Evidência:** core/report-engine.js:getCascadeCacheKey; trocar apenas descrição mantendo cardinalidade devolveu o mesmo objeto com rótulo antigo (1001051). Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Filtros podem apresentar classificação/rótulo antigo após atualização dos masters.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Conteúdo alterado com mesmos tamanhos invalida o resultado; entrada idêntica reutiliza cache. Cobrir descrição, vínculo e reload/import/realtime, sem consulta por linha.
- **Dependências:** Coordenar versão/invalidação com PERF-02.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#perf-03).
- **Bloco recomendado:** B — Confiabilidade da investigação.

### VAL-02

**Preview e API validam a linha em caminhos distintos**

- **ID:** VAL-02
- **Prioridade:** P2
- **Área:** Importação / Custos
- **Problema:** Regras de linha de custo estão duplicadas, incluindo tratamento de descrição e limites.
- **Evidência:** view/ui-import.js e src/services/api.js:normalização/validação do payload; limite de descrição na API não é um contrato único do Preview. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Linha aprovada visualmente pode ser rejeitada depois ou sofrer tratamento diferente na persistência.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Casos válidos e inválidos têm mesma decisão/motivo nos dois pontos, incluindo código, número, texto e data. Validador puro compartilhado preserva payload e tolerância a colunas extras.
- **Dependências:** SEC-04; MNT-02 pode facilitar extração, mas não bloqueia compartilhamento localizado.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#val-02).
- **Bloco recomendado:** C — Operação.

### PERF-02

**Masters são reconsultados na navegação**

- **ID:** PERF-02
- **Prioridade:** P2
- **Área:** Custos / Carregamento
- **Problema:** loadMasters chama getMasters antes do guard e entrada na view força fetchMetadata.
- **Evidência:** view/ui-controller.js:loadMasters, fetchMetadata e bindNavigation. Cache de cascata não evita essas consultas. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Latência e tráfego repetidos sem mudança dos dados.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Navegar entre módulos reutiliza masters válidos; importação/realtime ou atualização explícita invalida e relê. Falha de fonte essencial continua explícita, sem hierarquia parcial. Medir quantidade de chamadas no fluxo.
- **Dependências:** PERF-03; ERR-02 antigo não autoriza degradar a hierarquia exigida por CUSTOS-PAGE-01.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#perf-02).
- **Bloco recomendado:** C — Operação.

### CFG-03

**Suíte não protege contratos críticos encontrados**

- **ID:** CFG-03
- **Prioridade:** P2
- **Área:** Qualidade / Testes
- **Problema:** Há regressões existentes, mas os cenários agora confirmados de carga integral OP, prioridade, narrativa, exportação e carregamento save-doc não estão protegidos.
- **Evidência:** 209 testes atuais passaram apesar desses achados; tests/ui-table.test.js chega a exigir a narrativa indevida de segunda alta. Percentual de cobertura não medido. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Checks verdes podem acompanhar falhas investigativas e de operação.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Cada correção de contrato adiciona cenário que falha no comportamento anterior e passa na solução; cobrir integração relevante, sem metas percentuais inventadas nem testes que apenas espelham helpers.
- **Dependências:** Acompanhar MNT-OP-05, LOG-03/04/05/06, ERR-03/04 e SEC-06 nas respectivas entregas.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#cfg-03).
- **Bloco recomendado:** E — Manutenção.

### CFG-06

**view e entradas administrativas fora do typecheck**

- **ID:** CFG-06
- **Prioridade:** P2
- **Área:** Qualidade / Tipos e runtime
- **Problema:** jsconfig exclui a camada view e api/scripts; o check atual não detecta incompatibilidade de carregamento da entrada save-doc.
- **Evidência:** jsconfig.json include/exclude; package.json type=module; api/save-doc.js. CFG-02 entregou uma base inicial, não essa cobertura adicional. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Contratos UI/API e entradas Node mudam sem esse tipo de verificação automatizada.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Ampliar checagem de contratos dos controllers prioritários e conferir carregamento das entradas administrativas no runtime declarado. Checks detectam exemplos de contrato inválido e CommonJS incompatível sem emitir dist ou acionar I/O remoto.
- **Dependências:** ERR-04 e CFG-03 para escolher verificação adequada; preservar runtime e dependências necessários.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** E — Manutenção.

### DOC-DIV-02

**Documentos apresentam estados e tipos ultrapassados**

- **ID:** DOC-DIV-02
- **Prioridade:** P2
- **Área:** Documentação / Contratos
- **Problema:** Há declarações de IDs UUID onde o schema usa TEXT e registros de publicação/famílias/comercial pendentes apresentados como estado corrente.
- **Evidência:** docs/arquitetura/banco-de-dados.md, manuais e evidências históricas; information_schema atual; lote 3 com 65 famílias inseridas e lote 4 com 162 atualizações. README/ROADMAP/backlog são reconciliados nesta etapa; o restante ainda requer revisão. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Operação pode repetir carga já feita, usar contrato de chave incorreto ou planejar a partir de pendência superada.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Revisar referências atuais contra código/schema; rotular explicitamente fatos históricos sem reescrever provas antigas. Corrigir tipos/estados presentes, manter fontes por responsabilidade e separar competência/importação. Não inferir autorização de carga a partir da documentação.
- **Dependências:** Reconciliar por evidência; não depende de alterar banco ou funcionalidades.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** C — Operação.

### CUSTOS-UX-01

**Percentuais e limiar têm rótulos ambíguos**

- **ID:** CUSTOS-UX-01
- **Prioridade:** P2
- **Área:** Custos / Clareza de métricas
- **Problema:** A linha mostra dois percentuais sem identificar suficientemente os eixos; rótulo >5% diverge do helper que inclui exatamente 5%.
- **Evidência:** view/ui-table.js: percentuais da linha; index.html/KPI e core/report-engine.js:classifyAlert com abs >=5. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Leitura pode confundir variação por importação com amplitude/instabilidade e excluir mentalmente o limite de 5%.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Rotular métrica/eixo em fila/detalhes e usar ≥5% onde esse é o contrato. Testar clareza para exatamente 5%, variação negativa e série com amplitude diferente; manter cálculos.
- **Dependências:** Coordenar LOG-04/05/06 para apresentar as mesmas métricas e decisões.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** D — UX.

### CAD-UX-02

**Status e orientação de pendências se contradizem**

- **ID:** CAD-UX-02
- **Prioridade:** P2
- **Área:** Cadastro / Classificação
- **Problema:** Cadastro chama produto de Classificado por origem/família mesmo quando banner o considera pendente por agrupamento; banner orienta categorizar no Supabase apesar do editor operacional.
- **Evidência:** view/ui-product-master.js:status de classificação; view/ui-controller.js:banner de pendências e orientação. Agrupamentos atuais ausentes são dados reais, não prova de defeito de preenchimento automático. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Usuário recebe sinais incompatíveis e caminho manual externo apesar do fluxo existente.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Explicitar quais dimensões estão completas/pendentes e conduzir ao editor existente com código/contexto, sem salvar automaticamente ou inferir categoria. Estado deve concordar com o motivo do banner.
- **Dependências:** Preservar fonte operacional, autoridade ERP de Custos e contrato IMP-PEND-01.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** D — UX.


### SEC-08

**Funções têm search_path mutável**

- **ID:** SEC-08
- **Prioridade:** P2
- **Área:** Segurança / Funções legadas
- **Problema:** Advisor aponta cinco ocorrências em inserir_custo, duas sobrecargas de fn_upsert_mapa_produtos_por_codigo e dois triggers de categorização.
- **Evidência:** Advisor function_search_path_mutable e pg_proc em 22/10; funções são invoker. Não há prova de exploração ou uso atual de todos os caminhos. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Resolução de nomes fica dependente do contexto; legado amplia a superfície a revisar no contrato de acesso.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Inventariar assinatura, chamadores e grants; fixar resolução segura ou remover caminho comprovadamente sem contrato após aprovação. Validar triggers/consumidores necessários; não alegar security definer onde não existe.
- **Dependências:** SEC-03 e inventário MNT-04; nenhuma remoção automática por ausência de consumidor no frontend.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** A — Segurança e integridade.

### SEC-05

**Versões e integridade de CDN incompletas**

- **ID:** SEC-05
- **Prioridade:** P2
- **Área:** Segurança / Dependências CDN
- **Problema:** Versões de parte das bibliotecas estão fixas, porém SRI não está aplicado e cliente Supabase usa @2.
- **Evidência:** index.html: versões CDN fixadas, sem integrity; src/services/api.js: cliente @supabase/supabase-js@2/+esm. DOC-DIV-01 deixou de ser dúvida. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Artefato carregado pode mudar sem alteração do repositório; falta verificação de integridade. Nenhuma CVE foi inferida.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Definir entrega/versionamento reprodutível das bibliotecas e integridade compatível com o modo de carregamento; validar bootstrap e módulos. Documentar decisão quando SRI não for aplicável ao formato escolhido.
- **Dependências:** Inventário de recursos; evitar incluir segredos ou código administrativo no frontend.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#sec-05).
- **Bloco recomendado:** A — Segurança e integridade.

## P3

### MNT-03

**Coordenação da cascata continua distribuída**

- **ID:** MNT-03
- **Prioridade:** P3
- **Área:** Manutenção / Cascata
- **Problema:** fillSelect é único, mas refreshCascade, fetchMetadata e jumpToProduct coordenam atualizações de filtros em caminhos diferentes.
- **Evidência:** view/ui-utils.js, view/ui-filters.js e view/ui-controller.js. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Regras semelhantes exigem ajustes em múltiplos pontos e aumentam risco de divergência.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Fonte única da transição de cascata preserva busca direta, filtros válidos, autoatualização e falha explícita de fontes essenciais; remover duplicações efetivas sem reescrever a análise.
- **Dependências:** MNT-01 já entregue; coordenar PERF-02/03.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#mnt-03).
- **Bloco recomendado:** E — Manutenção.

### SEC-02

**Escape manual e exceções permanecem dispersos**

- **ID:** SEC-02
- **Prioridade:** P3
- **Área:** Manutenção / HTML seguro
- **Problema:** Helper de escape e lint existem, mas componentes mantêm templates e dispensas individuais.
- **Evidência:** view/ui-utils.js, eslint.config.js e controllers view/. SEC-01 foi corrigido; nenhum novo XSS foi demonstrado. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Defesa depende de disciplina repetida e pode regredir durante manutenção.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Padronizar os pontos de interpolação realmente variáveis e justificar exceções; testes de entrada HTML literal nos componentes alterados e lint coerente. Não substituir markup seguro sem necessidade.
- **Dependências:** CFG-01 e MNT-01 já entregues; executar por componente sem refatoração geral obrigatória.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#sec-02).
- **Bloco recomendado:** E — Manutenção.

### MNT-02

**Fachada concentra responsabilidades distintas**

- **ID:** MNT-02
- **Prioridade:** P3
- **Área:** Manutenção / API
- **Problema:** src/services/api.js ainda mistura leitores paginados, validação, enriquecimento e importação em cerca de 1.200 linhas.
- **Evidência:** Leitura do arquivo atual; fachada pública e shim services/api.js existentes. O tamanho sozinho não é falha funcional. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Alteração localizada tem superfície ampla de regressão e dificulta revisão dos contratos.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Extrair responsabilidades em fatias preservando métodos públicos, chamadas UI→API, ordenação/paginação e semântica temporal. Regressões cobrem consumidores afetados; não condicionar correções P1 à refatoração inteira.
- **Dependências:** Contratos consolidados em VAL-02, LOG-02/03 e leitores integrais; planejar após estabilizar fluxos críticos.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#mnt-02).
- **Bloco recomendado:** E — Manutenção.

### MNT-04

**Caminhos sem consumidor não têm destinação completa**

- **ID:** MNT-04
- **Prioridade:** P3
- **Área:** Manutenção / Legado
- **Problema:** Guardrail heuristic-engine está decidido, mas métodos legados da API e caminhos de banco ainda precisam de inventário de responsabilidade.
- **Evidência:** getTrendsByProduct, upsertHistoricoCustos, suggestCategory e importProductMasterXlsm sem consumidor UI localizado; inserir_custo referencia descricao_na_planilha ausente, sem chamada ativa do frontend demonstrada. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Legado confunde contratos e pode quebrar se um consumidor externo ainda o usar.
- **Estado:** PARCIALMENTE RESOLVIDO
- **Critério de aceite:** Para cada caminho, registrar consumidores/contrato e decidir preservar, adaptar ou remover com evidência. Não remover funções SQL por busca apenas no frontend nem reintroduzir heurística textual.
- **Dependências:** SEC-08 para funções; MNT-02 pode acomodar módulos preservando a fachada.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#mnt-04).
- **Bloco recomendado:** E — Manutenção.

### MNT-08

**Ranking depende de texto e emoji**

- **ID:** MNT-08
- **Prioridade:** P3
- **Área:** Manutenção / Presenter
- **Problema:** Exportação converte rótulos visuais em pesos de prioridade; presenter compartilhado é injetado pelo controller.
- **Evidência:** view/ui-export.js:getInvestigationRankScore; view/ui-table.js:getOperationalPriority/buildInvestigativeSummary. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Mudança de rótulo pode alterar ordenação sem mudança deliberada da regra.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Prioridade possui representação estável separada da apresentação; UI e exportação derivam do mesmo contrato. Alterar apenas texto/emoji não muda peso; mover funções de arquivo sozinho não encerra o item.
- **Dependências:** LOG-04/05/06 estabilizam comportamento; MNT-01 já entregue.
- **Origem:** ID histórico preservado; descrição e decisão anteriores no [inventário](backlog-reconciliacao-2026-10-22.md#mnt-08).
- **Bloco recomendado:** E — Manutenção.

### PERF-05

**Dois índices equivalentes em data de referência**

- **ID:** PERF-05
- **Prioridade:** P3
- **Área:** Manutenção / Índices
- **Problema:** Banco mantém idx_historico_data e idx_historico_data_referencia com a mesma definição.
- **Evidência:** Advisor duplicate_index e pg_indexes em 22/10. Índices apenas não usados ou FKs sem índice são avaliações separadas. Ver também [protocolo e limites](backlog-reconciliacao-2026-10-22.md#evidências-e-limites).
- **Impacto:** Duplicação consome armazenamento e manutenção por escrita sem fornecer acesso distinto.
- **Estado:** CONFIRMADO
- **Critério de aceite:** Conferir equivalência, dependências e planos; após autorização própria, manter cobertura e restrições com uma estrutura equivalente. Comparar integridade e consultas; não excluir índices só por ausência de uso na amostra.
- **Dependências:** Revisão PostgreSQL e autorização para qualquer alteração remota; não exige migration nesta auditoria.
- **Origem:** achado novo formalizado nesta reconciliação.
- **Bloco recomendado:** E — Manutenção.

## Ordem recomendada de execução

A ordem combina risco e dependências; itens P2 do mesmo bloco não atrasam correções P1 independentes de blocos seguintes. Nenhuma refatoração ampla é pré-requisito artificial para corrigir um contrato localizado.

### Bloco A — Segurança e integridade

1. [SEC-06](#sec-06) — Gravação documental sem autorização no handler.
2. [SEC-08](#sec-08) — Funções têm search_path mutável.
3. [SEC-05](#sec-05) — Versões e integridade de CDN incompletas.

### Bloco B — Confiabilidade da investigação

1. [LOG-02](#log-02) — Chunks são tratados como importações distintas.
2. [PERF-03](#perf-03) — Cache de cascata sobrevive a mudança de conteúdo.

### Bloco C — Operação

1. [SEC-04](#sec-04) — Datas impossíveis passam pela validação.
2. [VAL-03](#val-03) — OP inválida chega ao chunk de persistência.
3. [ERR-03](#err-03) — Falhas de log e de chunks podem parecer sucesso.
4. [ERR-04](#err-04) — save-doc falha e não carrega como ES Module.
5. [VAL-02](#val-02) — Preview e API validam a linha em caminhos distintos.
6. [PERF-02](#perf-02) — Masters são reconsultados na navegação.
7. [DOC-DIV-02](#doc-div-02) — Documentos apresentam estados e tipos ultrapassados.

### Bloco D — UX

1. [CUSTOS-UX-01](#custos-ux-01) — Percentuais e limiar têm rótulos ambíguos.
2. [CAD-UX-02](#cad-ux-02) — Status e orientação de pendências se contradizem.

### Bloco E — Manutenção

1. [CFG-03](#cfg-03) — Suíte não protege contratos críticos encontrados.
2. [CFG-06](#cfg-06) — view e entradas administrativas fora do typecheck.
3. [MNT-03](#mnt-03) — Coordenação da cascata continua distribuída.
4. [SEC-02](#sec-02) — Escape manual e exceções permanecem dispersos.
5. [MNT-02](#mnt-02) — Fachada concentra responsabilidades distintas.
6. [MNT-04](#mnt-04) — Caminhos sem consumidor não têm destinação completa.
7. [MNT-08](#mnt-08) — Ranking depende de texto e emoji.
8. [PERF-05](#perf-05) — Dois índices equivalentes em data de referência.

SEC-03 teve o modelo decidido e aplicado; SEC-07 foi encerrado junto com a proteção da view. SEC-08 permanece aberto quanto a search_path e legado. SEC-06 precisa acompanhar a recuperação de ERR-04 antes de liberar escrita documental. LOG-05 precede alinhamento de exportação; LOG-02 define a unidade temporal para LOG-03. PERF-03 e PERF-02 compartilham invalidação. CFG-03 acompanha cada correção, e não uma campanha de testes somente ao final. Não repetir MNT-01, a renderização entregue de PERF-01 ou cargas históricas para iniciar essas correções.

## Fora da execução automática

**OP-CUSTO-01 — Fases 1/2 implementadas localmente:** o [contrato técnico](../arquitetura/op-custo.md), as [provas do núcleo/API](op-custo-fase1-validacao.md) e as [provas da apresentação](op-custo-fase2-validacao.md) registram a investigação por produto/competência, preservando as oito decisões aprovadas. É capacidade do [ROADMAP](../../ROADMAP.md), fora dos 22 itens ativos e sem prioridade P0–P3 atribuída aqui. O limite de proveniência de LOG-02 permanece aberto; LOG-03/04/06 foram corrigidos separadamente em Custos. OP e OP×CUSTO não foram modificados nesta correção; validação visual manual da Fase 2 mantém a limitação de ambiente registrada. Escrita remota e publicação não estão autorizadas por esta referência.

PERF-04, fingerprint histórico, saúde autenticada do ambiente administrativo e atribuição da causa remota do HTTP 500 ficam na [fila de verificação](backlog-reconciliacao-2026-10-22.md#verificações-pendentes). Agrupamento ausente, origem ERP sem catálogo e produto fora do operacional exigem diagnóstico/decisão de dados; não autorizam preenchimento, sincronização ou nova fonte de classificação. Features estão no ROADMAP.

## Encerrados após a reconciliação

### LOG-03

**RESOLVIDO LOCALMENTE — 26/10/2026; publicação pendente de autorização.** A360-CUS-04: API escolhia os dois timestamps globais e filtrava competência depois, produzindo dois eventos vazios como comparação. Agora lê o universo completo recortado por data_referencia, enriquece/aplica cascata/produto e só então identifica os dois criado_em elegíveis. Zero/um evento retorna insuficiência e resumo null; denominador zero não vira 0%. Por decisão humana, TOP usa produto canônico + data completa, com IDs por lado e ausência explícita. Unicidade produto/data e upsert limitam a retenção de pares; nenhuma versão anterior é fabricada. Leitura e consumidores rejeitam incompletude/erro/números fictícios; fallback sem base não diz Estável. PostgreSQL local reproduz abril–junho versus outubro, microssegundos, paginação e unicidade; suíte completa e qualidade registradas nas [provas](custos-comparacao-recorte-validacao.md). [Contrato](../arquitetura/comparacao-temporal-custos.md). LOG-02 permanece aberto; não certifica lotes lógicos nem snapshots não retidos. Sem escrita remota, schema/migration/RLS/Auth, commit/push/deploy; fila/OP/OP×CUSTO preservados.

### LOG-04

**RESOLVIDO LOCALMENTE — 26/10/2026; publicação pendente de autorização.** A360-CUS-02: sinais de período/última transição eram tratados como duas ocorrências; MB014 9,24 → 9,39 ilustrava a afirmação falsa. Contexto agora descreve somente direção/alerta atual/regime/instabilidade, sem segunda alta, reincidência ou duração não comprovada. O motivo textual de Monitorar também perde “recorrente”, mantendo sua classificação. XLSX usa Alerta atual (≥5%) por função canônica, com ausência de comparativo explícita. Sem contrato de contagem/proveniência no ReportRow, não se anuncia recorrência nem para séries suficientes; memória/contagem histórica permanece evolução própria. Testes de dois pontos, duas altas comprováveis nos fatos, alternância, base insuficiente, motivo e workbook; [provas e limites](custos-fila-validacao.md). Sai da contagem ativa, sem alteração de motores/alerta/prioridade/dados.

### LOG-06

**RESOLVIDO LOCALMENTE — 26/10/2026; publicação pendente de autorização.** A360-CUS-03: a condição que excluía sortKey=variacao foi removida em favor da seleção/ordenação completa compartilhada entre UI/XLSX. Padrão investigativo e toda chave manual, inclusive variação asc/desc, conservam a mesma sequência; só a UI corta em 200. Metadados identificam a ordem ativa e o botão de restauração limpa chave/direção sem perder filtros/recorte. Testes com workbook real, download substituído, mais de 200 linhas e troca/restauração de ordem; [provas](custos-fila-validacao.md). Sai da contagem ativa; nenhuma refatoração do ranking ou nova regra de prioridade.

### SEC-03

**RESOLVIDO — 23/10/2026.** RLS habilitada nas nove tabelas, 21 policies conforme modelo indicado, grants anônimos retirados e operações autenticadas/administrativas validadas. Migration remota 20261022192657. [Provas, aceites e limites](seguranca-rls-validacao.md#sec-03); [matriz de acesso](../arquitetura/modelo-acesso-rls.md). Sai da contagem ativa; descrição histórica preservada na reconciliação de 22/10.

### SEC-07

**RESOLVIDO — 23/10/2026, como dependência do P0.** View de triagem sem grants de cliente e com security_invoker=true; leitura por cliente bloqueada e backend preservado. [Provas](seguranca-rls-validacao.md#sec-07). Sai da contagem ativa; SEC-08 e SEC-06 não foram encerrados por essa entrega.

### MNT-OP-05

**RESOLVIDO LOCALMENTE — 23/10/2026; publicação pendente de autorização.** A consulta única sem range/count recebia apenas 1.000 dos 1.469 fatos e omitia 296 linhas de junho/173 de julho. Agora reutiliza o leitor de 500/count exact, aplica filtros antes de cada range, acrescenta id à ordem anterior e bloqueia sobreposição de IDs. Enriquecimento operacional também completo. API/motor/fila reais locais: 1.469, IDs únicos 1.469 e 299 gargalos versus 222 no corte anterior. Motor, carga local MNT-OP-04 e critérios preservados; 647 testes e verificações de qualidade aprovados. [Provas, aceites e limites](op-paginacao-validacao.md); [contrato](../arquitetura/matriz-contratos-operacionais.md#mnt-op-05--leitura-integral-da-auditoria-de-op-23102026). Sai da contagem ativa de implementação; não afirma correção publicada nem autoriza deploy/próximo P1. Sem escrita de dados/Auth/RLS/schema, commit ou push.

### LOG-05

**RESOLVIDO LOCALMENTE — 23/10/2026; publicação pendente de autorização.** Outubro real reproduzido com 558 fatos/349 produtos: cinco alertas negativos em 345–349, atrás de 200 estáveis. A fila padrão compartilha o comparador investigativo existente antes do corte de 200; os cinco passam a 1–5, sem novos pesos/cálculos. Ordem manual explícita e aviso correspondente preservados; reportRows/KPIs/exportação padrão completos. [Diagnóstico, critérios, comparação e provas](custos-top200-validacao.md); [contrato](../arquitetura/matriz-contratos-operacionais.md#log-05--prioridade-global-antes-do-top-200-23102026). Sai da contagem ativa de implementação; LOG-04/06 foram encerrados separadamente em 26/10, com as provas acima. Sem escrita remota, alteração de Auth/RLS/schema, commit, push ou deploy; não autoriza o próximo P1.
