# Backlog Priorizado — Auditoria Técnica

**Ponto de partida para o agente de desenvolvimento.** Este backlog foi **reavaliado em 2026-07-02** após a conclusão da Onda 2 (tooling), a entrada de CI/lint/typecheck/testes e a estabilização dos contratos VAL-01/LOG-01/ERR-01. A ordem abaixo agora é arquitetural: prioriza itens que reduzem risco de regressão, desbloqueiam refatorações futuras, preservam contratos existentes e aumentam velocidade investigativa sem alterar comportamento funcional desnecessariamente.

Cada item tem um **ID** detalhado no arquivo temático indicado (use Ctrl+F pelo ID). Ao concluir: marque o checkbox, referencie o ID no commit e **atualize a documentação** (ver `docs/regras-gerais.md`).

Esforço: **P** ≈ ≤ meio dia · **M** ≈ 1-2 dias · **G** ≈ 3+ dias / requer decisão.

---

## Reavaliação arquitetural — 2026-07-02

### Decisão principal

A antiga separação rígida “Performance antes de Manutenibilidade” deixou de ser a melhor ordem. Com CI/lint/typecheck/testes já ativos, o maior risco atual não é ausência de ferramenta: é o acoplamento do `view/ui-controller.js`, que concentra renderização, eventos, importação, filtros, relatório, drill-through, exportação e gráficos. Por isso, **MNT-01 passa a ser o eixo destravador** antes das mudanças que mexem em tabela, cascata, HTML seguro e ciclo de cache da UI.

### Validação da hipótese sobre MNT-01

A hipótese está **majoritariamente correta**:

- **Desbloqueia diretamente `PERF-01`**: virtualização/limitação da tabela exige isolar renderização da fila investigativa, estado de ordenação, expansão de detalhes e delegação de eventos. Fazer isso dentro do god module aumenta risco de quebrar filtros, drill-through e exportação.
- **Desbloqueia diretamente `MNT-03`**: centralizar cascata/`fillSelect` depende de separar fluxos de filtros e relatório das demais responsabilidades de UI. Sem fatiamento, a mudança tende a virar refactor amplo e difícil de revisar.
- **Desbloqueia diretamente `SEC-02`**: helper de HTML seguro precisa ser aplicado nos pontos que montam HTML dinâmico. Separar componentes/fluxos da UI torna a adoção auditável e reduz exceções de lint.
- **Desbloqueia parcialmente `PERF-02`**: cache de `masters` com invalidação por realtime/import depende do ciclo de vida da UI (`loadMasters`, `fetchMetadata`, navegação e listeners), hoje dentro do `ui-controller`. O fatiamento ajuda muito, embora a solução também toque estado e API.
- **Desbloqueia parcialmente `VAL-02`**: o validador único de linha de custo depende mais de `MNT-06` e `MNT-02` (pipeline de importação/API) do que de `MNT-01`; porém separar o fluxo de importação no controller reduz risco ao substituir validações inline no preview.

Conclusão: **MNT-01 deve subir**, mas não sozinho. Antes dele ainda vale eliminar baixo esforço/alto risco que reduz divergência de importação (`MNT-06`) e documentar limites/contratos que serão preservados (`MNT-07`, `MNT-05`).

---

## Onda 1 — Concluída: segurança e correção de contrato

- [x] **SEC-01** 🔴 P — Escapar `value`/`label` em `fillSelect` (`core/report-engine.js:9,13`); mover `escapeHtml` para util compartilhada. → [`seguranca.md`](./seguranca.md)
- [x] **ERR-01** 🔴 M — `try/catch` de fronteira em `init()` e nos `await` de `runReport` (`view/ui-controller.js:16-24,508-524`). Resolvido no commit `fix(ERR-01): adiciona fronteiras operacionais e tratamento robusto de erros`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **VAL-01** 🟠 P — Normalizar código de produto (notação científica) no fluxo ativo, reusando `normalizeCodigoProduto`. Resolvido no commit `fix(VAL-01): unifica normalização de código de produto no pipeline operacional`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **LOG-01** 🟠 P — Unificar critério do KPI "Alertas (>5%)" e do filtro rápido do card. Resolvido no commit `fix(LOG-01): unifica regra operacional dos alertas investigativos`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **SEC-04** 🟠 M — Limite de tamanho de string + sanitização de fórmula no export + faixa de data em `normalizeISODate`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-05** 🟠 P — Fixar versões de `xlsx`/`chart.js` (+ SRI) em `index.html`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-03** 🔵 G — Registrar decisão de acesso público + checklist de reativação de RLS/Auth; idealmente RLS de escrita já. → [`seguranca.md`](./seguranca.md)

## Onda 2 — Concluída: rede de segurança de desenvolvimento

- [x] **CFG-04** 🟡 P — `package.json` só com `devDependencies` + scripts (sem tocar no runtime CDN). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-01** 🟠 P — ESLint com regra anti-`innerHTML` não escapado e `no-unused-vars`. → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-03** 🟠 M — Vitest sobre `core/` (testes de regressão para `VAL-01` e `LOG-01`). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-02** 🟠 M — `jsconfig.json` + `// @ts-check` + JSDoc inicial adicionados como base para `MNT-05`. → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-05** 🟡 P — CI (GitHub Actions) rodando lint/typecheck/test em PR. → [`tooling-configuracao.md`](./tooling-configuracao.md)

## Onda 3 — Preparação de contratos antes de refatorar

Objetivo: reduzir ambiguidade e remover divergências pequenas antes de fatiar módulos grandes.

- [x] **1. MNT-06** 🟠 P — Unificar os dois caminhos de importação; remover `mapRowsToPayload` órfão. **Motivo da subida:** baixo esforço, reduz divergência de payload e protege o contrato VAL-01 antes de mexer no fluxo de importação. Resolvido removendo `mapRowsToPayload`/`parseCurrency`/`normalizeReferenceDate` de `core/spreadsheet-engine.js` (o fluxo vivo em `view/ui-controller.js` já cobria normalização de `codigo_produto` e é o único gerador de payload); teste correspondente removido de `tests/spreadsheet-engine.test.js`. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **2. MNT-07** 🟡 P — Documentar/centralizar limiares e tetos (`.limit(1000)`, limiares de regime). **Motivo da subida:** deixa explícitos limites de negócio/performance que `PERF-01`, `PERF-02` e futuras análises não podem alterar silenciosamente. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **3. MNT-05** 🟡 M — Completar JSDoc/`@typedef` dos contratos (`Masters`, `HistoricoRow`, `ReportRow`). **Motivo da subida:** aumenta a precisão do typecheck já existente e reduz risco no fatiamento de UI/API. → [`manutenibilidade.md`](./manutenibilidade.md)

## Onda 4 — Fatiamento destravador da UI

Objetivo: decompor `view/ui-controller.js` por fluxo, preservando comportamento e preparando mudanças de performance/segurança sem refactor transversal. Deve ser feito em commits pequenos por fluxo, mantendo `init()`, `runReport()` e handlers críticos sob as fronteiras ERR-01.

- [ ] **4. MNT-01** 🟠 G — Fatiar `view/ui-controller.js` por fluxo (bootstrap/navegação, importação, filtros/relatório, fila investigativa, drill-through, exportação/gráficos). **Motivo da subida:** maior destravador arquitetural atual; reduz acoplamento antes de `PERF-01`, `PERF-02`, `MNT-03` e `SEC-02`. → [`manutenibilidade.md`](./manutenibilidade.md)

## Onda 5 — Performance e segurança da fila investigativa/UI

Objetivo: melhorar velocidade investigativa percebida e reduzir superfície de XSS com a UI já fatiada.

- [ ] **5. PERF-01** 🟠 M — Virtualizar/limitar tabela investigativa + delegação de eventos. **Dependência real:** fica mais seguro após o fatiamento da fila/tabela em `MNT-01`. → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [ ] **6. MNT-03** 🟠 M — Centralizar cascata e `fillSelect`. **Dependência real:** deve vir após separar fluxos de filtros/relatório em `MNT-01`; preserva o contrato de cascata e reduz duplicação. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **7. SEC-02** 🟡 M — Helper de "HTML seguro" + endurecimento da regra de lint. **Dependência real:** `CFG-01` já existe; após `MNT-01`, aplicar o helper por componente/fluxo fica revisável. → [`seguranca.md`](./seguranca.md)
- [ ] **8. PERF-02** 🟠 M — Cachear `masters` com invalidação por realtime/import (parar de recarregar a cada troca de view). **Dependência real:** parcialmente desbloqueado por `MNT-01`; também exige preservar degradação parcial de `ERR-02` e diagnóstico de órfãos. → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [x] **PERF-03** 🟡 P — Memoizar `calculateCascadeOptions`. → [`performance-otimizacao.md`](./performance-otimizacao.md)

## Onda 6 — Camada de dados/importação e validação compartilhada

Objetivo: consolidar contratos de serviço e validação depois que o fluxo de importação e a UI estiverem menos acoplados.

- [ ] **9. MNT-02** 🟠 M — Fatiar `src/services/api.js` (fachada + validation + enrichment + client). **Motivo da descida relativa:** importante, mas menos destravador para a dor imediata da UI; deve aproveitar `MNT-05` e manter fachada compatível para não quebrar UI→API. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **10. VAL-02** 🟡 M — Validador de "linha de custo" único (preview = API). **Dependência real:** melhor após `MNT-06` e `MNT-02`, com fluxo de importação isolado por `MNT-01`; preserva VAL-01 e importação tolerante linha a linha. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **ERR-02** 🟡 P — `Promise.allSettled` em `getMasters` (degradação parcial). → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **MNT-04** 🟡 P — Decidir integrar/remover `heuristic-engine`, `getTrendsByProduct`, `upsertHistoricoCustos`. → [`manutenibilidade.md`](./manutenibilidade.md)

---

## Mudanças de ordem nesta reavaliação

- **`MNT-01` subiu** de Onda 4 para eixo central da nova Onda 4, antes de `PERF-01`, `PERF-02`, `MNT-03` e `SEC-02`, porque o acoplamento da UI é hoje o maior multiplicador de risco.
- **`PERF-01` desceu para depois de `MNT-01`**, apesar do alto impacto ao usuário, porque virtualizar a tabela sem isolar renderização/eventos tende a misturar mudança funcional e refactor estrutural.
- **`PERF-02` desceu para depois de `MNT-01` e depois de itens da UI**, porque cache/invalidação depende de navegação, realtime/import e estado de masters; a solução precisa preservar `ERR-02` e o diagnóstico explícito de órfãos.
- **`MNT-06` subiu para primeiro item aberto**, porque é pequeno, remove caminho morto/divergente e reduz risco sobre `codigo_produto` antes de novas refatorações.
- **`MNT-07` e `MNT-05` subiram**, porque documentação de limites e tipos torna a rede de segurança (typecheck/testes) mais útil antes de fatiar módulos grandes.
- **`MNT-02` desceu para Onda 6**, não por menor importância, mas porque a API já tem contratos estabilizados; fatiá-la antes da UI não desbloqueia tanto quanto `MNT-01` e pode aumentar área de regressão simultânea.
- **`VAL-02` ficou após `MNT-02`**, porque o validador único deve nascer no limite correto entre preview e API, evitando uma terceira fonte de verdade.
- **`SEC-02` ficou após `MNT-01`/`MNT-03`**, pois a segurança de HTML seguro será mais consistente quando os pontos de renderização e `fillSelect` estiverem centralizados.

---

## Regras de execução para o agente

1. **Respeitar contratos do `AGENTS.md`**: separação FATO × DIMENSÃO e semântica `data_referencia` × `criado_em`. Uma "melhoria" que viole isso é regressão.
2. **Um item por commit** (ou por PR pequeno), com a referência do ID no commit (ex.: `fix(SEC-01): escapar opções de select`). Para `MNT-01`, usar commits menores por fluxo.
3. **Preservar a rede de segurança da Onda 2**: rodar lint/typecheck/test antes de concluir qualquer item aberto.
4. **Não alterar comportamento funcional quando o item for estrutural**: refatorações devem manter UX, semântica temporal, cascata, exportação e contratos UI→API existentes.
5. **Ao concluir**: marcar o checkbox aqui, atualizar manuais/`docs` afetados e registrar no log do `AGENTS.md`.
