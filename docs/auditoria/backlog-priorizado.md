# Backlog Priorizado — Auditoria Técnica

**Ponto de partida para o agente de desenvolvimento.** Ordenado por severidade × esforço. Cada item tem um **ID** detalhado no arquivo temático indicado (use Ctrl+F pelo ID). Ao concluir: marque o checkbox, referencie o ID no commit e **atualize a documentação** (ver `docs/regras-gerais.md`).

Esforço: **P** ≈ ≤ meio dia · **M** ≈ 1-2 dias · **G** ≈ 3+ dias / requer decisão.

---

## Onda 1 — Segurança e correção (fazer primeiro)

- [x] **SEC-01** 🔴 P — Escapar `value`/`label` em `fillSelect` (`core/report-engine.js:9,13`); mover `escapeHtml` para util compartilhada. → [`seguranca.md`](./seguranca.md)
- [x] **ERR-01** 🔴 M — `try/catch` de fronteira em `init()` e nos `await` de `runReport` (`view/ui-controller.js:16-24,508-524`). Resolvido no commit `fix(ERR-01): adiciona fronteiras operacionais e tratamento robusto de erros`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **VAL-01** 🟠 P — Normalizar código de produto (notação científica) no fluxo ativo, reusando `normalizeCodigoProduto`. Resolvido no commit `fix(VAL-01): unifica normalização de código de produto no pipeline operacional`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **LOG-01** 🟠 P — Unificar critério do KPI "Alertas (>5%)" e do filtro rápido do card. Resolvido no commit `fix(LOG-01): unifica regra operacional dos alertas investigativos`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **SEC-04** 🟠 M — Limite de tamanho de string + sanitização de fórmula no export + faixa de data em `normalizeISODate`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-05** 🟠 P — Fixar versões de `xlsx`/`chart.js` (+ SRI) em `index.html`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-03** 🔵 G — Registrar decisão de acesso público + checklist de reativação de RLS/Auth; idealmente RLS de escrita já. → [`seguranca.md`](./seguranca.md)

## Onda 2 — Ferramentas (rede de segurança antes de refatorar)

- [ ] **CFG-04** 🟡 P — `package.json` só com `devDependencies` + scripts (sem tocar no runtime CDN). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [ ] **CFG-01** 🟠 P — ESLint com regra anti-`innerHTML` não escapado e `no-unused-vars`. → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [ ] **CFG-03** 🟠 M — Vitest sobre `core/` (testes de regressão para `VAL-01` e `LOG-01`). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [ ] **CFG-02** 🟠 M — `jsconfig.json` + `// @ts-check` + JSDoc (`MNT-05`). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [ ] **CFG-05** 🟡 P — CI (GitHub Actions) rodando lint/typecheck/test em PR. → [`tooling-configuracao.md`](./tooling-configuracao.md)

## Onda 3 — Performance (com testes já no lugar)

- [ ] **PERF-01** 🟠 M — Virtualizar/limitar tabela investigativa + delegação de eventos (`view/ui-controller.js:614-664`). → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [ ] **PERF-02** 🟠 M — Cachear `masters` com invalidação por realtime/import (parar de recarregar a cada troca de view). → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [x] **PERF-03** 🟡 P — Memoizar `calculateCascadeOptions`. → [`performance-otimizacao.md`](./performance-otimizacao.md)

## Onda 4 — Manutenibilidade (refatoração com rede de segurança)

- [ ] **MNT-06** 🟠 P — Unificar os dois caminhos de importação; remover `mapRowsToPayload` órfão (resolve `VAL-01` de quebra). → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **MNT-02** 🟠 M — Fatiar `src/services/api.js` (fachada + validation + enrichment + client). → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **MNT-01** 🟠 G — Fatiar `view/ui-controller.js` por fluxo (um commit por fluxo). → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **MNT-03** 🟠 M — Centralizar cascata e `fillSelect`. → [`manutenibilidade.md`](./manutenibilidade.md)
- [x] **MNT-04** 🟡 P — Decidir integrar/remover `heuristic-engine`, `getTrendsByProduct`, `upsertHistoricoCustos`. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **MNT-05** 🟡 M — JSDoc/`@typedef` dos contratos (`Masters`, `HistoricoRow`, `ReportRow`). → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **MNT-07** 🟡 P — Documentar/centralizar limiares e tetos (`.limit(1000)`, limiares de regime). → [`manutenibilidade.md`](./manutenibilidade.md)
- [x] **ERR-02** 🟡 P — `Promise.allSettled` em `getMasters` (degradação parcial). → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [ ] **VAL-02** 🟡 M — Validador de "linha de custo" único (preview = API). → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [ ] **SEC-02** 🟡 M — Helper de "HTML seguro" + regra de lint (depende de `CFG-01`). → [`seguranca.md`](./seguranca.md)

---

## Regras de execução para o agente

1. **Respeitar contratos do `AGENTS.md`**: separação FATO × DIMENSÃO e semântica `data_referencia` × `criado_em`. Uma "melhoria" que viole isso é regressão.
2. **Um item por commit** (ou por PR pequeno), com a referência do ID no commit (ex.: `fix(SEC-01): escapar opções de select`).
3. **Onda 2 antes da 3/4**: ter lint/testes antes de refatorar reduz risco.
4. **Sem suíte de testes ainda?** Validar manualmente pelos **critérios de aceite** de cada achado (servir local: `python3 -m http.server 8000`).
5. **Ao concluir**: marcar o checkbox aqui, atualizar manuais/`docs` afetados e registrar no log do `AGENTS.md`.
