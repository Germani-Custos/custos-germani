# Roadmap Estratégico — Kustos Germani

## Atualização 2026-10-08 — CAD-XLS-01 concluído

- [x] Seletor XLSM/XLSX/XLS conectado ao adapter/motores existentes de Preview e aprovação, com contagens, preservações, decisões locais e download JSON.
- [x] Regressões de XLS binário BIFF, equivalência entre formatos e UI sem escrita.
- [ ] Executor genérico e persistência de novas revisões continuam fora desta entrega. A carga pontual da Fase 3.4 não foi repetida.

[Contrato atual da tela](docs/ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

## Atualização 2026-10-08 — CAD-UX-01 concluído

- [x] Barra horizontal acessível durante a navegação vertical da tabela do Cadastro, usando um único contêiner com cabeçalho sticky.
- [x] Remoção explícita do agrupamento na edição manual (`agrupamento_cod = NULL`), com regressões para preservação de vazios no importador.

[Contrato e validação](docs/ux/cadastro-mestre.md). Sem mudança de ordenação, paginação, Master ERP, mapa, fatos ou pipeline da Fase 3.4.

## Atualização 2026-10-08 — Fase 3.4 concluída

- [x] **CAD-EXEC-01** — primeira carga pontual do Master, após manifesto integral idêntico; lote 1 concluído, Master 5.706, zero erros, EXCEPTs e preservação operacional validados.
- [ ] Importer geral/integrado, permissões de escrita para clientes e reconciliação operacional continuam fora da entrega. Nenhuma ponte de agrupamento ou regra para família pendente foi criada.

[Contrato e evidência da execução](docs/arquitetura/cadastro-mestre-execucao-fase3-4.md). Os eixos `data_referencia` (competência) e `criado_em` (importação) nos fatos continuam inalterados.

## Atualização 2026-10-08 — Fase 3.3: preparar, não executar

- [x] **CAD-APPROVAL-01** — alias oficial `Agrup. Prod.` → agrupamento ERP bruto; manifesto determinístico e controles locais para revisão/decisão individual ou global, com testes e nenhuma escrita.
- [x] Primeira execução pontual/proveniência autorizada e entregue na Fase 3.4. A reconciliação operacional e a ponte ERP → categoria de agrupamento continuam não implementadas.

O manifesto real foi entregue com 423 propostas pendentes, sem aprovação aplicada. `data_referencia` continua competência e `criado_em` evento de importação; nenhum fato foi reescrito. Ver [contrato](docs/arquitetura/cadastro-mestre-aprovacao.md).

> Princípio do roadmap: toda feature deve acelerar investigação, reduzir cliques, melhorar contexto ou destacar risco. Funcionalidades decorativas não entram.

---

## Atualizacao 2026-08-10 — MNT-OP-04

- [x] Contexto investigativo dinamico: a importacao renova a carga local e fila/dossie sao derivados dos filtros e da competencia atual, sem periodo fixo. `data_referencia` e recorte; `criado_em` e rastreabilidade.

## FASE 1 — CONSOLIDAÇÃO OPERACIONAL

**Status: CONCLUÍDA**

Objetivo: garantir robustez operacional total na importação e análise básica.

### Entregues

- Importação resiliente com Smart Scraper de cabeçalhos
- Preview linha a linha antes de gravar (🟢 válida / 🟡 atenção / 🔴 erro)
- Mapeamento manual de colunas com fuzzy matching
- Parsing numérico brasileiro robusto
- Auto-criação de produtos no dicionário em import
- Filtros em cascata (Origem → Família → Agrupamento → Produto)
- Ordenação interativa por coluna
- KPIs de itens analisados e alertas
- Auditoria de OP: importação de CSV com rastreabilidade por competência e lote, incluindo normalização de OP com separador de milhar

---

## FASE 2 — INVESTIGAÇÃO ANALÍTICA

**Status: CONCLUÍDA**

Objetivo: transformar o sistema de dashboard em motor de investigação.

### Entregues

- Score de instabilidade com classificação automática (ESTÁVEL / OSCILANDO / MUITO INSTÁVEL)
- Alertas automáticos (variação absoluta ≥ 5% entre importações, com regra canônica compartilhada por KPI/filtro/exportação)
- TOP VARIAÇÕES entre últimas 2 importações
- Evolução temporal de custos com gráfico de linha
- Badge de tendência (🟢 Estável / 🔺 Alta / 🔻 Queda)
- Tooltip com variação vs. ponto anterior no gráfico
- Auto-refresh ao alterar filtros (elimina necessidade de clicar "Analisar")
- Seleção temporal por Intervalo ou Comparação entre duas competências
- Exportação do relatório para Excel (.xlsx) com seleção de colunas da fila investigativa

### Entregues na revisão arquitetural (mai/2026)

- **Busca direta por produto**: bypass completo da hierarquia, 1 interação para chegar à análise
- **Drill-through de eventos**: histórico das competências selecionadas por produto com `data_referencia` (competência) e `criado_em` (importação) claramente separados, e delta monetário/percentual por registro
- **Detecção de mudança de regime**: 4º KPI — identifica produtos que eram ESTÁVEL e ficaram instáveis no período
- **Coluna "Regime"** na tabela analítica com badge visual
- **Coluna "Competência"** separando claramente data de vigência do custo vs. data de importação
- **Banner de órfãos**: alerta visível quando há produtos sem categorização no dicionário; falhas do diagnóstico aparecem como estado operacional indisponível, nunca como lista vazia
- **Debounce de 2s** no listener de real-time (evita reloads em cascata durante imports)
- **Segurança**: remoção de credenciais hardcoded do código-fonte

---

## FASE 3 — MEMÓRIA OPERACIONAL

**Status: PRÓXIMA**

Objetivo: registrar comportamento histórico e identificar padrões.

### Funcionalidades planejadas

- Histórico de alertas por produto (quando foi alertado, com que frequência, mantendo a regra canônica `abs(variacaoTemporal) >= 5`)
- Detecção de reincidência (produto que voltou a oscilar após período estável)
- Linha do tempo de regime: quando um produto mudou de ESTÁVEL → INSTÁVEL → ESTÁVEL
- Comparação entre períodos equivalentes (este mês vs. mesmo mês do ano anterior)
- Exportação de drill-through individual por produto

### Decisões de arquitetura a tomar

- Manter cálculo client-side ou migrar para views Supabase para períodos mais longos
- Estratégia de retenção para `log_importacao` (hoje cresce sem cleanup)
- Indexação em `historico_custos(codigo_produto, data_referencia)` para queries de drill-through

---

## FASE 4 — INTELIGÊNCIA OPERACIONAL

**Status: FUTURO**

Objetivo: antecipar investigação humana.

### Funcionalidades planejadas

- Ranking automático de risco (score composto: variação + instabilidade + mudança de regime)
- Sugestão de próximos produtos a investigar
- Detecção de sazonalidade vs. ruptura (produto que sobe todo trimestre vs. ruptura inesperada)
- Insights textuais operacionais ("produto X oscilou 4 meses consecutivos")
- Previsão de tendência por regressão simples

---

## NÃO PRIORIZAR (anti-roadmap)

- Features decorativas sem valor operacional
- Burocracia administrativa (multi-tenant, RBAC complexo enquanto for uso interno)
- Abstrações excessivas / overengineering
- Dashboards genéricos estilo Power BI
- Microserviços desnecessários
- IA genérica sem valor específico de auditoria de custos

- [x] Hardening inicial concluído: configuração por ambiente, remoção de auto-auth e gate real de acesso.


## Atualização contínua — 11/05/2026

- Hardening de performance operacional: bulk upsert em chunk, redução de requests no import e pacote de índices SQL para histórico temporal e comparação de importações.

## Atualização contínua — 14/05/2026

- Refinamento da fila investigativa: redução de poluição visual na tabela principal com foco em criticidade operacional.
- Header sticky e densidade visual ajustada para leitura vertical contínua.
- Chips removíveis de filtros ativos para acelerar mudança de recorte sem reset manual de todos os campos.
- Contexto investigativo pré-interpretado por linha (sequência de alta/queda e sinais de oscilação crescente).

## Atualização contínua — 14/05/2026 (configuração frontend)

- Estratégia final de configuração híbrida: prioridade `import.meta.env` + fallback `window.__ENV__` + fallback `<meta name="VITE_*">` com contrato `VITE_*` para compatibilidade de runtime real.
- Tela de falha amigável no bootstrap quando variáveis obrigatórias não estiverem definidas.

- Hardening de configuração em deploy estático: geração automática de `runtime-config.js` no build da Vercel com validação de variáveis obrigatórias e fail-fast.

## Atualização contínua — 14/05/2026 (autenticação)

- Modo temporário de acesso aberto ativado no frontend (sem prompt de login) para acelerar uso investigativo imediato.
- Header de sessão padronizado como `acesso público` durante a janela sem autenticação.
- Fluxo de autenticação hardening mantido como base para futura reativação de controle de acesso.

- Auditoria de fluxo de autenticação com hardening fail-closed no bootstrap.
- Remoção de alias de credenciais (`username` interno) para eliminar superfície de bypass.
- Validação estrita de sucesso de login: usuário + sessão/token obrigatórios antes de liberar acesso.
- Em qualquer inconsistência no login, sessão é encerrada e o acesso continua bloqueado.

## Atualização contínua — 25/05/2026 (auditoria de contratos)

- Matriz operacional de contratos publicada em `docs/arquitetura/matriz-contratos-operacionais.md`.
- Correção de desalinhamento crítico de cascata nos métodos `getLatestImportComparison` e `getTopVariacoesImportacao` (enriquecimento via dimensão antes dos filtros).
- Hardening fail-fast em `getProductHistory` para bloquear chamadas ambíguas com código vazio.
- Refatoração de confiabilidade da camada `src/services/api.js` com:
  - sanitização explícita e whitelist de payload no `upsertHistoricoCustos`;
  - padronização de contratos de retorno `{ data, error }` nos métodos críticos de comparação/drill-through;
  - erros operacionais contextualizados (sem crash silencioso) em `getHistorico`, `getLatestImportComparison`, `getTopVariacoesImportacao` e `getProductHistory`;
  - normalização explícita de recortes temporais (`data_referencia`) antes de aplicar filtros de cascata.


## Marco concluído — Export investigativo operacional (2026-05-21)

- [x] export orientado por fila investigativa (não dump)
- [x] ordenação automática por criticidade/regime/magnitude/reincidência/instabilidade
- [x] contexto investigativo automático por item
- [x] snapshot do estado ativo da investigação (filtros + período + fila)
- [x] metadados de rastreabilidade temporal em aba dedicada


## Atualização contínua — 25/05/2026 (saneamento operacional do banco)

- Entregue: hardening de schema com constraints temporais (`unique_produto_data`), índices de investigação e contrato explícito para órfãos de agrupamento via `SEM_AGRUPAMENTO` + `vw_produtos_orfaos_agrupamento`.

## Atualização contínua — 28/05/2026 (ERR-01)

- Concluído o item **ERR-01** do backlog: fronteiras operacionais de erro em `init()`, `runReport()` e handlers assíncronos críticos do frontend.
- Próximo foco permanece nos demais itens da Onda 1, sem refatoração ampla: `SEC-01`, `LOG-01`, `SEC-04` e `SEC-05`. `VAL-01` foi concluído em 28/05/2026.


## Atualização contínua — 28/05/2026 (VAL-01)

- Concluído o item **VAL-01** do backlog: normalização canônica de `codigo_produto` com `normalizeCodigoProduto()` em preview, payload, API, cascata, relatório, drill-through e exportação derivada.
- O fluxo agora bloqueia linha com código inválido/ambíguo, preserva zeros à esquerda quando a origem vem textual e reduz mutações causadas por notação científica do Excel.
- Sem alteração na arquitetura FATO × DIMENSÃO nem na semântica temporal (`data_referencia` competência; `criado_em` importação).

## Atualização contínua — 25/06/2026 (Onda 2 — Ferramentas)

- [x] CFG-04 — `package.json` criado apenas para tooling, sem dependências de produção e sem alterar runtime CDN.
- [x] CFG-01 — ESLint flat config adicionado para qualidade mínima, globals do browser/CDN/Node e regra contra `innerHTML` interpolado sem revisão explícita.
- [x] CFG-03 — Vitest adicionado com testes de regressão de núcleo para VAL-01, LOG-01 e semântica temporal do relatório.
- [x] CFG-02 — `jsconfig.json`, `// @ts-check` e JSDoc inicial adicionados para type checking leve em JavaScript.
- [x] CFG-05 — GitHub Actions criado para lint/typecheck/test em PRs, sem deploy.

Próximo foco recomendado após a reavaliação arquitetural de 02/07/2026: seguir a nova ordem do `docs/auditoria/backlog-priorizado.md` — começar por `MNT-06`, `MNT-07` e `MNT-05`, então executar `MNT-01` como fatiamento destravador da UI antes de `PERF-01`, `MNT-03`, `SEC-02`, `PERF-02`, `MNT-02` e `VAL-02`. A hipótese validada é que o acoplamento do `view/ui-controller.js` virou o maior multiplicador de risco para performance, segurança de HTML e futura validação.


## Atualização contínua — 20/07/2026 (conferência de backlog)

- **MNT-01 concluído no Engineering Freeze v1.0**: a fila/tabela e a apresentação investigativa (`renderTable`, prioridade operacional e resumo por linha) foram movidas para `view/ui-table.js`, mantendo `ui-controller.js` como orquestrador e preservando comportamento.
- **MNT-03 permanece aberto**, mas parcialmente reduzido: `fillSelect` saiu do `core/` e foi centralizado em `view/ui-utils.js`; ainda falta unificar a cascata em um helper/módulo único.

## Atualização 2026-07-27 — estabilização da persistência de OP

- [x] **MNT-OP-01** — corrigido o parsing de `op` no MCAP105: 119 dos 296 valores do CSV de validação têm ponto de milhar (por exemplo, `2.081`) e eram convertidos indevidamente para `null`. O parser agora produz inteiros, mantendo `op` obrigatório no schema e preservando `data_referencia` como competência e `criado_em` como evento de importação.
- Incluído diagnóstico completo de erro por chunk para acelerar investigações futuras, sem alterar schema, tela ou filtros.

## Atualização 2026-07-30 — Motor Investigativo da Auditoria de OP

- [x] **MNT-OP-02** — implementado motor local de investigação para apontamentos de OP, sem alterar schema nem os fatos importados do ERP. A fila prioriza motivo e provável causa, com dossiê que separa dados ERP de indicadores calculados pelo Kustos.
- Criados indicadores de atendimento da produção, desvio de tempo, desvio de produtividade e índice de paradas. `% Tempo (ERP)` é mantido como conferência do desvio de produtividade; não é usado como segunda regra de criticidade.
- Refinada a UX da OP com KPIs por motivo, filtro de motivo e atualização automática do relatório depois da primeira análise ao alterar filtros. `data_referencia` permanece o recorte de competência; `criado_em` é exibido apenas como evento de importação no dossiê.

## Atualização 2026-08-03 — decisão investigativa da Auditoria de OP

- [x] **MNT-OP-03** — a interpretação de OP agora entrega uma decisão explícita (`mereceInvestigacao`), prioridade e evidências combinadas no motor puro. A fila e o dossiê mostram a resposta operacional sem alterar schema ou fatos do ERP.
- Cobertos os cenários de desperdício com entrega, excelente execução, baixa produção, tempo justificado por volume, parada sem impacto e parada com perda de produtividade/atraso/déficit de produção (prioridade máxima).
- A semântica temporal não mudou: `data_referencia` filtra competência; `criado_em` informa o evento de importação e não participa das fórmulas.
## Atualização 2026-08-13 — Cadastro mestre de produtos

- [x] Aba Cadastro sobre `dicionario_produtos`, sem fonte paralela.
- [x] Importação incremental do XLSM e agrupamento investigativo manual.
- [x] Resolução compartilhada por Custos e Auditoria de OP.

## Atualização 2026-09-28 — PERF-01 concluído

- [x] Fila investigativa limitada à janela TOP-200 já priorizada, com aviso de total e refinamento de filtros.
- [x] Drill-through e detalhes preservados por delegação de um único evento no `tbody`, sem listeners por linha.

## Atualização 2026-10-01 — Fase 2A: estrutura do Cadastro Mestre

- [x] Criado o log auditável de importação do Cadastro Mestre e a referência opcional de proveniência por produto.
- [ ] Reconciliar `dicionario_master_produtos` com `dicionario_produtos` somente após decisão de negócio para os códigos de família ERP sem correspondência determinística.

## Atualização 2026-10-05 — Fase 2C.2: agrupamento ERP e proveniência

- [x] Estrutura aditiva para guardar agrupamento ERP bruto, lote de origem, override manual e origem de classificação.
- [ ] Definir uma ponte empresarial explícita antes de qualquer conversão de agrupamento ERP para categoria Kustos.

## Atualização 2026-10-08 — Fase 3.1: núcleo de Preview

- [x] **CAD-PREVIEW-01** — leitura XLSM/XLSX/XLS, normalização canônica, filtros ordenados e comparação em memória contra `dicionario_master_produtos`, com testes e sem gravação/ativação na UI.
- [x] Preparação de manifesto e revisão local entregue na Fase 3.3; o lote real não foi aprovado.
- [ ] Execução auditável e eventual projeção operacional exigem novas fases explícitas. Agrupamento ERP continua sem ponte oficial.
