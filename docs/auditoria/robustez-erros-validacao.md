# Auditoria — Robustez, Tratamento de Erros e Correção

Ver legenda e formato em [`README.md`](./README.md). Inclui **bugs de correção** (lógica), que costumam ser mais perigosos que os de estilo.

---

## ERR-01 · 🔴 Alto · `async/await` sem `try/catch` no caminho principal

- **Local:** `view/ui-controller.js` — `init()` (`16-24`), e os `await` encadeados de `runReport()` (`508`, `515`, `524`).
- **Evidência:** `init()` faz `await allowOpenAccess(); await loadMasters({force:true}); await fetchMetadata();` sem `try/catch`. O bootstrap é disparado por `import('./view/ui-controller.js').catch(showConfigErrorScreen)` (`index.html:38`), que só captura **falha de import/config**, não erros lançados depois. As funções da API retornam `{data, error}` (não lançam em erro de query), mas **falhas de rede, CORS ou parse lançam** e sobem sem tratamento.
- **Impacto:** uma instабilidade de rede no carregamento inicial deixa a UI **parcialmente renderizada e travada**, sem feedback ao usuário (os toasts de `loadMasters` só cobrem o `masters.error`, não a exceção).
- **Correção recomendada:** padronizar um wrapper de erro de fronteira. Ex.: envolver o corpo de `init()` em `try/catch` com `showToast('error', ...)` + estado de "falha ao iniciar"; e tratar os `await render*` de `runReport` (que já retornam `false` em erro, mas podem lançar). Não adicionar `try/catch` ornamental em código que não faz I/O — focar nas fronteiras (chamadas de rede, `XLSX.read`, `Chart`).
- **Critério de aceite:** simular falha de rede (DevTools offline) ao abrir o app e ao clicar "Analisar"; a UI mostra mensagem de erro clara e permanece utilizável, sem `Uncaught (in promise)` no console.
- **Status 2026-05-28:** resolvido em `view/ui-controller.js` com helper `normalizeOperationalError`, `executeOperationalBoundary`, fail-fast no carregamento de tabelas de apoio e degradação controlada dos painéis auxiliares do relatório.

---

## LOG-01 · ✅ Resolvido em 2026-05-28 · KPI "Alertas (>5%)" e filtro rápido alinhados

- **Local original:** contagem do KPI em `core/report-engine.js:181` (`totalAlertas = rows.filter(r => r.alert)`); filtro rápido do card em `view/ui-controller.js:539` e `803` (`row.variacao > 5`).
- **Evidência original:** o KPI **Alertas** conta `row.alert`, que é definido por `alertaImportacao` = variação **entre as duas últimas importações** (`variacaoTemporal`, `core/report-engine.js:140-142`). Já o filtro rápido acionado ao **clicar no card** (`data-kpi-filter="alerts"`) filtra por `row.variacao > 5`, que é a variação **do período inteiro** (`inicial → final`). São métricas distintas.
- **Impacto:** o número exibido no card e a quantidade de linhas que aparecem ao clicá-lo **não batem**, minando a confiança do investigador (contradiz o princípio "encontrar o problema em segundos"). Também há assimetria: `> 5` ignora quedas ≤ -5%, embora "alerta" semântico inclua variações relevantes em ambos os sentidos.
- **Correção aplicada (2026-05-28 / LOG-01):** `core/report-engine.js` centraliza a regra em `classifyAlert()`/`isAlertaCritico()` e expõe `filterAlertRows()`. O KPI, filtro rápido, tabela, drill-through, ranking/reincidência e exportação reutilizam essa fonte única.
- **Semântica padronizada:** alerta é `abs(variacaoTemporal) >= 5` entre as duas últimas importações (`criado_em`), sem arredondamento antes da comparação; altas e quedas são equivalentes. `null` significa sem comparativo e não alerta; `undefined`, `NaN` ou payload sem `variacaoTemporal`/`deltaPerc`/`variacaoPercentual` falham rápido com log apenas via `debugLog`.
- **Critério de aceite:** com dados reais, o número do card "Alertas (>5%)" é **igual** à contagem de linhas exibidas ao clicá-lo e ao total exportado quando o filtro rápido está ativo.

---

## LOG-02 · 🟠 Médio · Comparação entre importações pode comparar chunks da mesma importação (dívida conhecida)

- **Local:** `src/services/api.js` — `getLatestImportComparison` e `getTopVariacoesImportacao` (identificação das "2 últimas importações" por `criado_em` distinto); interação com o upsert em chunks de `importarHistoricoCustosComLog` (`IMPORT_CHUNK_SIZE = 400`).
- **Evidência:** ambos os métodos definem "as 2 últimas importações" como os **2 valores distintos de `criado_em` mais recentes** (`[...new Set(rows.map(r => r.criado_em))].slice(0, 2)`). A importação, porém, grava em **chunks de 400 linhas**, e **cada chunk é uma chamada `.upsert()` separada** — logo, uma transação distinta, com `criado_em` (default `now()`) próprio. Uma importação com **mais de 400 linhas** gera **múltiplos `criado_em`** para a mesma competência/lote lógico.
- **Impacto:** quando um único lote lógico ultrapassa 400 linhas, a "Comparação entre importações" e o "TOP variações" podem comparar **dois chunks da mesma importação** (conjuntos de produtos diferentes, mesmo lote) em vez de duas importações reais — produzindo variação média ~0 e listas de TOP incorretas. A base tinha ~601 linhas em 2026-07-13, então o cenário **já é possível hoje** num reimport completo.
- **Por que é silencioso:** não há exceção nem `error`; os painéis renderizam normalmente com números plausíveis, apenas **incorretos**. O investigador não tem sinal de que a comparação não é entre importações reais.
- **Relação com contratos:** toca diretamente a semântica **`criado_em` (evento de importação)** do `AGENTS.md`. A premissa implícita "1 importação = 1 `criado_em`" não é garantida pelo pipeline atual de chunking.
- **Correção recomendada (a decidir — implica mudança de comportamento/contrato, não fazer sem validação):**
  - **(a)** gravar um **`criado_em` único por lote** no payload de `importarHistoricoCustosComLog` (todas as linhas do lote compartilham o timestamp capturado no início da importação), tornando "1 importação = 1 `criado_em`". Atenção: em `onConflict` de reimport isso sobrescreveria o `criado_em` de linhas já existentes, alterando a noção de "penúltima importação".
  - **(b)** agrupar a comparação por **lote/`log_importacao`** (ex.: associar cada linha ao `log_id` da importação) em vez de por `criado_em` distinto, deixando o `criado_em` como está.
- **Critério de aceite:** importar um lote com mais de `IMPORT_CHUNK_SIZE` linhas e confirmar que a comparação entre importações e o TOP variações tratam esse lote como **uma única** importação (não como dois chunks distintos).
- **Status 2026-07-17:** registrada como **dívida arquitetural conhecida**, sem alteração de comportamento. Aguarda decisão entre (a) e (b) antes de implementar. Backlog: `docs/auditoria/backlog-priorizado.md` (Onda 6). Achado derivado da revisão de erros silenciosos que corrigiu o delta monetário (`fix: corrige delta monetário inventado...`, 2026-07-17).

---

## VAL-01 · ✅ Resolvido · Código de produto em notação científica normalizado no fluxo ativo

- **Local original:** fluxo ativo `view/ui-controller.js` (`buildImportPreview`) fazia `String(row[mapping.codigo_produto]).trim()`; a função `normalizeCodigoProduto` existia em `core/spreadsheet-engine.js`, mas não era usada em todos os caminhos ativos.
- **Evidência original:** o Excel podia converter códigos numéricos longos (ex.: `7891234560123`) para notação científica (`7.89123e+12`), e caminhos paralelos gravavam o código corrompido.
- **Impacto:** **integridade de dados** — o mesmo produto entra com códigos diferentes em competências diferentes, quebrando o drill-through, a deduplicação `unique_produto_data` e a análise temporal. Difícil de perceber (silencioso).
- **Correção aplicada (2026-05-28 / VAL-01):** `normalizeCodigoProduto()` foi promovida a função canônica exportada e reutilizada no preview, payload, API de importação, garantia de dicionário, filtros/cascata, relatório, drill-through e comparações/exportação derivadas. A leitura XLSX passou a usar `raw:true` para reduzir mutação por formatação visual do Excel.
- **Critério de aceite:** importar planilha com um código que o Excel exibe como `7,89123E+12`; o registro gravado tem o código inteiro original e o drill-through encontra todo o histórico sob um único código. Linhas com código ambíguo/inválido são bloqueadas por linha, sem derrubar o lote.

---

## VAL-02 · 🟡 Baixo · Ausência de validação por schema reutilizável

- **Local:** validação dispersa: `validateHistoricoRow` (`src/services/api.js:115-130`), checagens inline em `buildImportPreview` (`view/ui-controller.js:213-220`), `preConfirm` do mapeamento (`view/ui-controller.js:334-346`).
- **Impacto:** regras de validação duplicadas e fáceis de divergir (já divergem: o preview classifica "custo total zerado" como warning; a API não). Sem fonte única de verdade das regras de um registro válido.
- **Correção recomendada:** extrair um validador único de "registro de custo" (objeto de regras puro, sem dependência de DOM) usado pelo preview **e** pela API. Uma lib de schema (zod/valibot) é opcional e implica `package.json` (ver `CFG-04`); um validador caseiro centralizado já resolve a duplicação.
- **Critério de aceite:** existe uma única função/módulo que define "linha válida"; preview e gravação produzem o mesmo veredito para a mesma linha.

---

## ERR-02 · 🟡 Baixo · `Promise.all` sem degradação parcial

- **Local:** `src/services/api.js:319-332` (`getMasters`, 5 queries) e `:210-214` (`runDiagnosticoSemAgrupamento`, 3 queries).
- **Evidência:** `getMasters` já trata o caso de erro agregando (`error = a || b || ...`) e retornando estrutura vazia — **bom**. O ponto fino: se **uma** das 5 queries falhar, **tudo** vira vazio, derrubando filtros que poderiam funcionar com dados parciais.
- **Impacto:** indisponibilidade total dos filtros por falha de uma única dimensão. Baixo (geralmente todas falham ou nenhuma), mas degrada a resiliência.
- **Correção recomendada:** considerar `Promise.allSettled` e montar `masters` com o que veio, sinalizando dimensões ausentes (coerente com o banner de órfãos já existente). Opcional — só vale se houver evidência de falhas isoladas em produção.
- **Critério de aceite:** com uma dimensão indisponível, as demais ainda carregam e a UI sinaliza a parcial.
