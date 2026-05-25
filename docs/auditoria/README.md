# Auditoria Técnica — Kustos Germani

> Análise técnica de fragilidades, melhorias e otimização do código **em produção**.
> Destinada a ser **executada por um agente de IA de desenvolvimento** (não pelo Claude Code que a redigiu). Por isso cada achado é o mais explícito e acionável possível.

Data da auditoria: **2026-05-25** · Base analisada: branch de produção, ~2.600 linhas (frontend Vanilla JS + Supabase).

---

## Como usar este conjunto

Cada arquivo cobre uma dimensão. Comece pelo **backlog priorizado** para saber o que atacar primeiro; use os arquivos temáticos para o detalhe de cada achado.

| Arquivo | Conteúdo |
|---|---|
| [`backlog-priorizado.md`](./backlog-priorizado.md) | **Ponto de partida.** Tabela única ordenada por severidade × esforço, com checkboxes e critério de aceite. |
| [`seguranca.md`](./seguranca.md) | XSS, acesso público/RLS, validação de upload, dependências (CDN). |
| [`robustez-erros-validacao.md`](./robustez-erros-validacao.md) | `try/catch` ausente, validação, e **bugs de correção** (notação científica, inconsistência de KPI). |
| [`manutenibilidade.md`](./manutenibilidade.md) | Arquivos gigantes, duplicação, código morto, tipos/JSDoc. |
| [`performance-otimizacao.md`](./performance-otimizacao.md) | Virtualização, cache de masters, memoização — otimização sobre o que já existe. |
| [`tooling-configuracao.md`](./tooling-configuracao.md) | ESLint/Prettier, `// @ts-check`, testes, `package.json` de dev. |

---

## Formato de cada achado

```
ID · Severidade · Local (arquivo:linha) · Evidência · Impacto · Correção recomendada · Critério de aceite
```

- **ID** estável (ex.: `SEC-01`) — referenciado no backlog e nos commits que o resolverem.
- **Local** sempre com `arquivo:linha`. As linhas refletem o estado em 2026-05-25; se o código mudou, busque pela função citada.
- **Critério de aceite** descreve como validar que está resolvido (sem depender de suíte de testes, que hoje não existe — ver `tooling-configuracao.md`).

### Legenda de severidade

| Nível | Significado |
|---|---|
| 🔴 **Alto** | Risco de segurança explorável, perda de dados, ou trava de UI no caminho principal. Atacar primeiro. |
| 🟠 **Médio** | Bug de correção, dívida que amplia risco de regressão, ou gargalo previsível em produção. |
| 🟡 **Baixo** | Defesa em profundidade, limpeza, ou melhoria sem impacto imediato. |
| 🔵 **Decisão** | Não é defeito: é uma decisão consciente que deve ser **documentada e revisitada**, não "corrigida" às cegas. |

---

## ⚠️ Falso-positivos já verificados (não desperdice esforço aqui)

Durante a auditoria, conferimos o código real e **descartamos** alguns pontos que pareciam vulneráveis mas não são vetor ativo. **Não os trate como bugs**; no máximo, são defesa em profundidade (ver `SEC-02`).

- `renderTable` (`view/ui-controller.js:620-628`): os dados vindos do usuário (`row.codigo`, `row.descricao`) **já passam por `escapeHtml`**. `classificacaoInstabilidade` e o "contexto" são **strings internas constantes** (`'ESTÁVEL' | 'OSCILANDO' | 'MUITO INSTÁVEL'` e frases fixas), não entrada de usuário.
- Drill-through (`view/ui-controller.js:733-773`): só injeta **números/datas formatados**; a descrição vai via `textContent` (linha 730), não `innerHTML`.
- `updateProductSuggestions` (`view/ui-controller.js:65-67`), chips de filtro (`571-575`), TOP variações (`1015-1021`), preview de importação (`247-260`) e mapeamento de colunas (`295-311`): **todos já usam `escapeHtml`**.

O **único** ponto de XSS realmente explorável é o `fillSelect` em `core/report-engine.js` — ver `SEC-01`.

---

## Princípio que rege as correções

Toda mudança deve respeitar o `AGENTS.md`: **"velocidade de investigação acima de tudo"** e a **separação FATO × DIMENSÃO** com a semântica `data_referencia` (competência) × `criado_em` (importação). Uma "melhoria" que viole esses contratos é regressão. Ao concluir um item, **atualize a documentação** (ver `docs/regras-gerais.md`).
