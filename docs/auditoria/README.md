# Auditoria Técnica — Kustos Germani

> **LOG-02 parcial — 26/10/2026:** identidade da execução reutiliza a PK confirmada do log e acompanha o controle dos chunks; falta vínculo persistido nos fatos. [Provas e limites](custos-identidade-lote-validacao.md), [contrato](../arquitetura/identidade-lote-custos.md) e [proposta documental de vínculo](../arquitetura/proposta-vinculo-lote-custos.md). Não encerra o item nem resolve retenção histórica. Sem migration, escrita remota ou publicação.

> **LOG-03 / A360-CUS-04 — 26/10/2026:** comparação seleciona eventos depois do recorte de competência e distingue ausência de zero. TOP por produto + data completa conforme decisão humana; retenção atual limita pares históricos. [Provas e limites](custos-comparacao-recorte-validacao.md). Correção local, sem publicação/escrita remota; LOG-02 continua pendente.

> **LOG-04/06 — 26/10/2026:** contexto sem recorrência inferida e XLSX na mesma ordem ativa completa da fila, inclusive variação manual. Prioridade e TOP-200 preservados; retorno explícito à prioridade padrão. [Provas e limites](custos-fila-validacao.md). Correção local, sem publicação ou acesso remoto.

> **LOG-05 — 23/10/2026:** prioridade global aplicada antes do TOP-200, com critérios existentes. Cinco alertas reais de outubro passam de 345–349 para 1–5 na versão local; limite 200 preservado. [Provas e limites](custos-top200-validacao.md). Sem publicação/escrita remota.

> **MNT-OP-05 — 23/10/2026:** leitura integral de OP corrigida e validada localmente com dados reais: 1.469 registros/299 gargalos, sem escrita remota ou publicação. [Provas e limites](op-paginacao-validacao.md).

> **SEC-03 / SEC-07 — estado de 23/10/2026:** RLS/grants aplicados e verificados, com leitura autenticada e escrita operacional dos dois admins indicados. [Matriz vigente](../arquitetura/modelo-acesso-rls.md) e [provas](seguranca-rls-validacao.md). SEC-06/ERR-04 e SEC-08 permanecem pendentes; o corpo histórico abaixo não reabre o acesso público.

> **Estado vigente em 22/10/2026:** use o [backlog ativo](backlog-priorizado.md) e a [reconciliação por ID](backlog-reconciliacao-2026-10-22.md). O conteúdo temático abaixo preserva a auditoria datada; afirmações de ausência de suíte, XSS em fillSelect e estados antigos não são diagnóstico atual. SEC-01 foi resolvido. A lista anterior está no [arquivo histórico](backlog-historico.md).


## Escopo e navegação atuais

Este conjunto preserva achados e evidências da base analisada em cada data. Não é declaração de que todos os defeitos originais permanecem ativos, nem nova inspeção de produção. Para estados/resoluções, consultar o [backlog](backlog-priorizado.md); para contratos em vigor, a [matriz operacional](../arquitetura/matriz-contratos-operacionais.md).

- [VIS-01 — identidade visual Black + Purple](identidade-visual.md): escopo visual, componentes, conferência local sintética e limites.
- [DOC-ORG-01 — auditoria e reorganização documental](reorganizacao-documental.md): inventário completo, responsabilidades, movimentos, redundâncias, divergências e validação.
- Evidências de Cadastro: [reconstrução](cadastro-mestre-reconstrucao-validacao.md), [execução web](cadastro-mestre-execucao-web-validacao.md), [preparação](cadastro-mestre-preparacao-ambiente-validacao.md) e [transporte compacto](cadastro-mestre-payload-validacao.md). Estados remotos pertencem à data de cada prova.
- [História do Projeto](../HISTORIA_DO_PROJETO_KUSTOS.md): decisões e marcos, separados dos procedimentos atuais.

O relato original a seguir é de 25/05. Ausência de testes, XSS de fillSelect, acesso público e dependências sem versão descrevem aquela base; não reaplicar recomendações já concluídas sem verificar código/backlog. Divergências de SRI, RLS e FKs ficam explícitas na auditoria documental, sem saneamento de código/banco.

> Análise técnica de fragilidades, melhorias e otimização do código **em produção**.
> Destinada a ser **executada por um agente de IA de desenvolvimento** (não pelo Claude Code que a redigiu). Por isso cada achado é o mais explícito e acionável possível.

Data da auditoria: **2026-05-25** · Base analisada: branch de produção, ~2.600 linhas (frontend Vanilla JS + Supabase).

---

## Como usar este conjunto

Cada arquivo cobre uma dimensão. Comece pelo **backlog priorizado** para saber o que atacar primeiro; use os arquivos temáticos para o detalhe de cada achado.

| Arquivo | Conteúdo |
|---|---|
| [`backlog-priorizado.md`](./backlog-priorizado.md) | **Ponto de partida.** Backlog reavaliado em 2026-07-02 e ordenado por dependência arquitetural, risco × benefício, desbloqueio e preservação de contratos, com checkboxes e critério de aceite. |
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
- **Critério de aceite:** demonstra como validar o contrato; a suíte atual existe, com limites de cobertura descritos na reconciliação.

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

Na base histórica de 25/05, o achado explorável identificado foi `fillSelect`. **SEC-01 foi corrigido**; os casos atuais e a defesa em profundidade constam na reconciliação e em SEC-02.

---

## Princípio que rege as correções

Toda mudança deve respeitar o `AGENTS.md`: **"velocidade de investigação acima de tudo"** e a **separação FATO × DIMENSÃO** com a semântica `data_referencia` (competência) × `criado_em` (importação). Uma "melhoria" que viole esses contratos é regressão. Ao concluir um item, **atualize a documentação** (ver `docs/regras-gerais.md`).

- [CUSTOS-ERP-01 — classificação analítica pelo Master](custos-classificacao-erp.md): contrato, validação somente GET e interface local, sem sincronização operacional.

- [CAD-COM-01 — validação comercial ERP](cadastro-mestre-comercial-validacao.md): evidência local anterior à aplicação, XLS real, contagens, hashes e testes.
- [CAD-COM-PROD-01 — migration comercial em produção](cadastro-mestre-comercial-producao-etapa1.md): estrutura, backup e provas de dados idênticos antes/depois; sem carga XLS.
