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

## LOG-01 · 🟠 Médio · KPI "Alertas (>5%)" e seu filtro rápido medem coisas diferentes

- **Local:** contagem do KPI em `core/report-engine.js:181` (`totalAlertas = rows.filter(r => r.alert)`); filtro rápido do card em `view/ui-controller.js:539` e `803` (`row.variacao > 5`).
- **Evidência:** o KPI **Alertas** conta `row.alert`, que é definido por `alertaImportacao` = variação **entre as duas últimas importações** (`variacaoTemporal`, `core/report-engine.js:140-142`). Já o filtro rápido acionado ao **clicar no card** (`data-kpi-filter="alerts"`) filtra por `row.variacao > 5`, que é a variação **do período inteiro** (`inicial → final`). São métricas distintas.
- **Impacto:** o número exibido no card e a quantidade de linhas que aparecem ao clicá-lo **não batem**, minando a confiança do investigador (contradiz o princípio "encontrar o problema em segundos"). Também há assimetria: `> 5` ignora quedas ≤ -5%, embora "alerta" semântico inclua variações relevantes em ambos os sentidos.
- **Correção recomendada:** unificar o critério. Filtrar o card "alerts" por `row.alert === true` (mesma base do KPI). Avaliar usar `Math.abs(...) >= 5` para capturar quedas. Centralizar o predicado num único lugar (ex.: função `isAlertRow(row)` em `report-engine.js`) usada pelo KPI **e** pelo filtro.
- **Critério de aceite:** com dados reais, o número do card "Alertas (>5%)" é **igual** à contagem de linhas exibidas ao clicá-lo.

---

## VAL-01 · 🟠 Médio · Código de produto em notação científica não é normalizado no fluxo ativo

- **Local:** fluxo ativo `view/ui-controller.js:208` (`buildImportPreview` faz `String(row[mapping.codigo_produto]).trim()`); existe a função correta `normalizeCodigoProduto` em `core/spreadsheet-engine.js:137-147`, **mas ela só é usada por `mapRowsToPayload`, que está morto** (ver `MNT-06`).
- **Evidência:** o Excel converte códigos numéricos longos (ex.: `7891234560123`) para notação científica (`7.89123e+12`). `normalizeCodigoProduto` (linhas 141-143) detecta e reverte isso; o caminho ativo **não**, gravando o código corrompido.
- **Impacto:** **integridade de dados** — o mesmo produto entra com códigos diferentes em competências diferentes, quebrando o drill-through, a deduplicação `unique_produto_data` e a análise temporal. Difícil de perceber (silencioso).
- **Correção recomendada:** aplicar `normalizeCodigoProduto` no fluxo ativo (em `buildImportPreview` e/ou ao montar o `payload` em `handleImport`, `view/ui-controller.js:161-168`), reutilizando a função existente em vez de duplicar.
- **Critério de aceite:** importar planilha com um código que o Excel exibe como `7,89123E+12`; o registro gravado tem o código inteiro original e o drill-through encontra todo o histórico sob um único código.

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
