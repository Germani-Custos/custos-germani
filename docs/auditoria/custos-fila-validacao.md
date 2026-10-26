# Fila investigativa de Custos — A360-CUS-01/02/03

Auditoria e correção local em **26/10/2026**, partindo do checkout limpo no HEAD `8121610`. Escopo: confirmar LOG-05 já entregue e corrigir LOG-04/06. Sem commit, push, deploy, consulta ou escrita remota, carga, migration ou alteração de RLS/Auth/schema. OP e OP × CUSTO não receberam alteração funcional.

## Diagnóstico e causas

A [reconciliação original](backlog-reconciliacao-2026-10-22.md#evidências-e-limites) registra os aliases A360-CUS-01 → LOG-05, A360-CUS-02 → LOG-04 e A360-CUS-03 → LOG-06 e o caso real de outubro. O [relatório LOG-05](custos-top200-validacao.md) contém as leituras reais e a correção anterior. Não presumir que o defeito publicado continua no checkout: este já inicia com `reportView.sortKey:null` e ordena investigativamente antes do corte visual.

Fluxo confirmado: `ui-controller.runReport` → `api.getHistorico` integral e recortado → `buildReportRows` → `calculateKpis`/`state.reportRows` completos → filtro rápido → ordem ativa completa → janela visual de 200. Exportação parte do mesmo `reportRows`, sem nova consulta e sem corte.

Localização dos cálculos existentes, todos preservados:

- `core/report-engine.js`, `buildReportRows`: agrupa pelo código canônico; `variacao = (final - inicial) / inicial × 100`, com base positiva, sobre a ordem de `data_referencia`. `variacaoTemporal = (ultimoCusto - penultimoCusto) / penultimoCusto × 100`, com base anterior positiva, sobre os dois registros mais recentes por `criado_em`; sem base, retorna null.
- `classifyAlert`/`isAlertaCritico`: fonte única do alerta atual, `abs(variacaoTemporal) >= 5`, incluindo quedas. Não depende da narrativa nem de uma contagem de recorrências.
- `calcInstabilityScore`/`classifyInstability`: média das magnitudes das transições percentuais válidas, ordem de competência; ESTÁVEL <3, OSCILANDO <8, MUITO INSTÁVEL nos demais casos. `mudouRegime` exige ao menos quatro pontos e transição de primeira parte estável para parte final não estável, com os segmentos existentes do motor.
- `view/ui-table.js`: `getOperationalPriority`, `getInvestigationRankScore`, `compareByInvestigativePriority`; `MAX_VISIBLE_INVESTIGATION_ROWS=200` e `renderTable` fazem somente o corte de apresentação.
- `view/ui-filters.js`: ordem padrão ou manual; `view/ui-export.js`: ordem e campos XLSX.

LOG-06 ainda era real: o exportador considerava `sortKey='variacao'` ausência de escolha manual, mas a UI ordenava explicitamente por essa coluna. O mesmo recorte podia sair em duas sequências.

LOG-04 ainda era real: `buildInvestigativeSummary` combinava os sinais de `variacao` e `variacaoTemporal` para dizer “2ª alta/queda consecutiva”. Dois pontos podem produzir as duas métricas, mas representam apenas uma transição. MB014, 9,24 → 9,39, é o exemplo histórico. O XLSX chamava a flag canônica de alerta atual de “Reincidência de alerta”, e o motivo de Monitorar dizia “recorrente” sem contar eventos. Também havia alegações de estabilidade longa/oscilação crescente sem duração ou evolução comprovadas pelo agregado.

Baseline: **48 testes passaram** em custos-top200/ui-table/ui-filters/ui-export; o teste antigo de resumo aceitava explicitamente as frases falsas. Passar na suíte anterior não refutava o achado.

## Correção e regra final

`getOrderedInvestigationRows`, no módulo de filtros existente, concentra apenas seleção e aplicação da ordem: filtro rápido sobre todos os candidatos, cópia do array e comparador existente. UI e exportação consomem a mesma função. `sortKey:null` significa prioridade investigativa; qualquer chave explícita é manual, inclusive `variacao` ascendente/descendente. Não há implementação paralela de alerta ou prioridade.

Regra padrão preservada, em cascata lexicográfica, sem somar um score novo:

1. Criticidade original: Crítico > Atenção > Monitorar > Estável. Crítico se mudou regime, muito instável ou magnitude de período ≥20%; Atenção se alerta canônico, magnitude de período ≥10% ou oscilando; Monitorar mantém a condição original, incluindo magnitude de período ≥3%.
2. Mudança de regime.
3. Magnitude absoluta de `variacaoTemporal ?? variacao ?? 0`. Zero temporal válido não usa fallback; null usa variação de período.
4. Flag canônica de alerta atual.
5. Score de instabilidade existente.
6. Código por `localeCompare('pt-BR')`, determinístico para os candidatos únicos por código.

Os pesos legados 4/3/2/1 apenas representam a ordem ordinal de criticidade existente. Os corpos de `getInvestigationRankScore` e `compareByInvestigativePriority` foram comparados programaticamente com o HEAD: **idênticos**. `getOperationalPriority` só muda a string do motivo Monitorar, de recorrência para variação de menor magnitude no período; condições, classes e rótulos não mudam. A integração OP × CUSTO continua usando esse mesmo presenter e comparador, sem mudança de classificação, relação, prioridades, filtros ou ranking.

Somente a tabela corta em 200, depois da ordem completa. XLSX exporta todos os candidatos após o filtro rápido, com a mesma sequência; a aba Contexto informa a ordem realmente aplicada. Exportação mantém escolha de colunas, ordem canônica das colunas, cancelamento, nome do arquivo e sanitização anti-fórmula.

O botão **Restaurar prioridade investigativa**, restrito ao painel de Custos, limpa chave/direção para null/desc. Preserva filtro rápido, produto, recorte e candidatos; não refaz consulta. Cabeçalhos continuam alternando direção e trocando coluna. Aviso de janela distingue prioridade automática de ordem manual.

## Recorrência: semântica conservadora e limite

Contexto agora descreve mudança de regime, alerta de alta/queda atual entre os dois registros mais recentes por importação, direção no período e classificação de instabilidade. Sem comparação, informa a falta de comparativo. Não afirma segunda ocorrência, duração de estabilidade ou oscilação crescente a partir desses agregados.

O contrato atual de ReportRow **não transporta contagem nem proveniência de transições históricas de alerta**. A correção não cria essa contagem. Mesmo quando fatos como 100 → 106 → 112,36 provam duas altas consecutivas de 6%, o presenter agregado se limita ao alerta atual. O teste demonstra separadamente as duas transições reais e impede que o resumo extrapole o contrato. Uma futura descrição de recorrência pode usar essa evidência somente após contrato próprio de histórico/proveniência; não é requisito para corrigir a afirmação falsa atual nem altera a prioridade existente.

XLSX substitui a coluna por **Alerta atual (≥5%)**: SIM/NÃO pela função canônica; **SEM COMPARATIVO** quando a variação temporal é null. O delta sem base continua `—`. O nome interno legado `reincidencia` em `getInvestigationRankScore` permanece por compatibilidade, mas não é apresentado como contagem histórica. “NÃO” não é usado para ausência de base nessa coluna.

`data_referencia` permanece competência operacional; `criado_em` permanece evento de importação/proveniência. Não se redefine lote ou comparação temporal: LOG-02/03 continuam abertos.

## Caso dos cinco alertas de outubro

A leitura real **de 23/10**, preservada no relatório LOG-05, registrou 558 fatos de 05/10–14/10/2026, 349 produtos, cinco alertas e zero mudanças de regime. A ordem antiga os colocava em 345–349; a ordem investigativa existente os põe em **1–5**, na sequência **MM006, MM013, MM014, 1002152, 1002012**. A janela continua com 200 itens.

Nesta tarefa não houve nova leitura real. A regressão `outubro()` em `tests/custos-top200.test.js` usa os pares reais dos cinco produtos e 344 produtos estáveis sintéticos: **349 candidatos provenientes de 354 fatos de teste**, não uma cópia integral dos 558 fatos reais. Confirma posições antigas 345–349, atuais 1–5, cinco alertas, zero regimes, KPIs preservados e XLSX completo na mesma sequência inicial da UI. Não apresentar essa fixture como nova medição dos 558 fatos de produção.

Não se força alerta sempre ao início: o teste com 205 candidatos muito instáveis e um alerta de Atenção mantém esse alerta abaixo do TOP-200 por criticidade legitimamente inferior. Produtos estáveis sem sinal não ultrapassam os cinco alertas do reproducer.

## Testes e qualidade

- `tests/custos-fila-contrato.test.js`: **18 testes novos**. Workbooks e worksheets reais do SheetJS; somente o download (`writeFile`) é substituído. Leitura das abas geradas valida ordem padrão, variação e código em ambos os sentidos, metadados, coluna de alerta atual e ausência de reincidência inventada.
- Testes de interação com DOM controlado: cabeçalhos alternam direção/trocam coluna; restauração mantém recorte/filtro e não chama `runReport`; fila >200 e arquivo completo na mesma ordem. Não equivale a inspeção visual em navegador real.
- Narrativa: uma alta, uma queda, MB014, Monitorar, base insuficiente, alternância, duas altas realmente comprováveis nos fatos e mudança de regime. Sem falsas ocorrências ou durações.
- `tests/ui-table.test.js`: expectativa que aceitava segunda alta/queda foi substituída pela descrição factual do alerta atual.
- `tests/custos-top200.test.js`: 19 regressões existentes preservadas — 0/37/199/200/201/349/500 candidatos, total/janela, prioridade relativa, alertas positivos/negativos, regime/instabilidade/magnitude, null/zero/sem base, código/empate/embaralhamento determinístico, casos legitimamente abaixo do TOP e exportação completa.
- Suíte completa: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` — **800 testes / 47 arquivos**, sem pulados. Inclui os 37 testes da UI OP × CUSTO e os 48 do engine relacional, sem alterar seus arquivos.
- Lint: `node node_modules/eslint/bin/eslint.js .` — aprovado. Foi corrigida uma referência de teste para `globalThis.structuredClone`, conforme ambiente ESLint já usado no projeto.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — aprovado.
- Build: `node scripts/build-web.mjs` — aprovado com URL/chave **sintéticas**, apenas no processo local. Primeira tentativa sem variáveis falhou por ausência de VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY; configuração de produção não foi lida nem alterada. Build comprova geração de dist/allowlist, sem comprovar conexão ou deploy.
- `git diff --check` — aprovado; revisão do diff confirma escopo.

## Documentos lidos e alterados

Lidos: AGENTS.md, README.md, VISION.md, ROADMAP.md, docs/regras-gerais.md, os três manuais em docs/manuais/, docs/auditoria/README.md, backlog-priorizado.md, backlog-reconciliacao-2026-10-22.md (evidências/aliases), custos-top200-validacao.md e docs/arquitetura/matriz-contratos-operacionais.md. Código, testes e scripts de qualidade citados acima foram inspecionados.

Documentação alterada: README.md, ROADMAP.md, AGENTS.md, docs/manuais/manual-usuario.md, docs/manuais/manual-tecnico.md, docs/manuais/manual-operacao.md, docs/arquitetura/matriz-contratos-operacionais.md, docs/auditoria/README.md, docs/auditoria/backlog-priorizado.md, docs/auditoria/custos-top200-validacao.md (ponte para esta continuidade, preservando provas históricas) e este relatório. VISION/regras gerais não mudam: a capacidade e filosofia existentes foram respeitadas.

Arquivos funcionais alterados: **index.html**, **view/ui-dom.js**, **view/ui-filters.js**, **view/ui-table.js**, **view/ui-export.js**. Testes: **tests/ui-table.test.js** e **tests/custos-fila-contrato.test.js** (novo). Nenhum arquivo core/API/OP/parser/Cadastro/importação/state recebeu diff; nenhuma migration criada. Índice de auditoria aponta para as provas. LOG-04/06 saem do backlog ativo com evidência, LOG-05 permanece resolvido localmente; **23 itens ativos**, P0=1/P1=6/P2=10/P3=6.

## Limitações e aceite

Correção tecnicamente validada localmente. **Inspeção visual em navegador real não realizada** nesta tarefa; layout do novo botão, responsividade, foco real e abertura do arquivo em Excel desktop não foram conferidos visualmente. Testes de DOM controlado e workbook não substituem essa inspeção. Sem nova consulta aos dados reais, não se certifica o volume atual de produção.

Não há nova decisão de prioridade pendente: o domínio existente é explícito e foi preservado. Recorrência histórica com contagem/proveniência continua evolução futura, sem nova persistência nesta tarefa. Publicação requer autorização própria. Nenhum outro item do backlog foi implementado.
