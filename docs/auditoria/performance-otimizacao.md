# Auditoria — Performance e Otimização

Ver legenda e formato em [`README.md`](./README.md). Foco do usuário: **otimizar sobre o que já existe**, sem reescrever. O `AGENTS.md` já fixa boas práticas (debounce em realtime, destruir/recriar Chart.js, evitar refetch) — algumas estão cumpridas, outras não.

---

## PERF-01 · 🟠 Médio · Tabela sem virtualização nem paginação

- **Local:** `view/ui-controller.js:614-645` (`renderTable` reescreve `dom.tableBody.innerHTML` com **todas** as linhas + uma `<tr>` de detalhes por linha).
- **Evidência:** para N produtos, gera ~2N `<tr>` e adiciona 2 listeners por linha principal (`647-664`). Não há limite.
- **Impacto:** com milhares de produtos no período, o `innerHTML` gigante e os milhares de listeners travam a aba — exatamente o cenário de produção (base ERP). Contradiz "resposta em segundos".
- **Correção recomendada:** acima de um limiar (ex.: 500 linhas), paginar ou virtualizar (renderizar só a janela visível). Como a tabela já opera como **fila investigativa priorizada** (`getRowsFromCurrentInvestigationState`), uma abordagem barata é **limitar à fila TOP-N** (ex.: 200 mais críticos) com um rótulo "mostrando 200 de N — refine os filtros", preservando o princípio investigativo. Usar **delegação de eventos** (um listener no `tbody`) em vez de um por linha.
- **Critério de aceite:** com ~5.000 linhas no resultado, a Auditoria renderiza e responde a cliques em < 1s; memória/ível estável; nenhum listener por linha.

---

## PERF-02 · 🟠 Médio · `masters` recarregado a cada troca para a Auditoria

- **Local:** `view/ui-controller.js:103` (`if (view === 'report') fetchMetadata()`); `fetchMetadata` (`70-91`) chama `loadMasters({ force: true })` que dispara `getMasters` (5 queries + diagnóstico de órfãos, `src/services/api.js:318-399`).
- **Evidência:** toda vez que o usuário clica em "Auditoria", recarrega tudo do zero, mesmo sem mudança de dados. O `force: true` ignora o guard de cache de `loadMasters` (`37`).
- **Impacto:** latência e carga no Supabase desnecessárias; `runDiagnosticoSemAgrupamento` faz +3 queries varrendo tabelas inteiras a cada visita.
- **Correção recomendada:** cachear `masters` em `state` com invalidação por **realtime** (o canal `subscribeFiltrosRealtime` já existe, `src/services/api.js:402-417`) e/ou TTL curto. Trocar `force: true` por recarga só quando o realtime sinalizar mudança ou após importação. O `AGENTS.md` ("evitar re-fetch do que já está em state") endossa isso.
- **Critério de aceite:** navegar Importação↔Auditoria repetidamente dispara `getMasters` **uma vez** (mais recargas só após import ou evento realtime), verificável na aba Network.

---

## PERF-03 · 🟡 Baixo · `calculateCascadeOptions` sem memoização

- **Local:** `core/report-engine.js:46-114`; chamada 2x em `jumpToProduct` (`view/ui-controller.js:377,380`) e a cada `refreshCascade` (`449,452`).
- **Impacto:** recomputa a hierarquia inteira (map/filter/sort sobre o dicionário) a cada interação de filtro; perceptível com dicionário grande.
- **Correção recomendada:** memoizar por chave `(origem,familia,agrupamento, versão dos masters)`. Como `masters` muda raramente, um cache simples invalida-o em `loadMasters`. Em `jumpToProduct`, a 2ª chamada pode reusar o resultado da 1ª.
- **Critério de aceite:** trocar Origem/Família com dicionário grande não recomputa quando a entrada é idêntica (medível por contador/log temporário).

---

## PERF-04 · 🟡 Baixo · Datalist de sugestões reconstruído por inteiro

- **Local:** `view/ui-controller.js:63-68` (`updateProductSuggestions` reescreve o `<datalist>` com **todos** os produtos a cada `loadMasters`).
- **Impacto:** com dezenas de milhares de produtos, o `<datalist>` fica pesado e é recriado a cada recarga (que hoje é frequente, ver `PERF-02`).
- **Correção recomendada:** depois de resolver `PERF-02` (menos recargas), avaliar limitar o datalist ou alimentá-lo sob digitação. Baixa prioridade — só relevante em bases muito grandes.
- **Critério de aceite:** busca direta continua fluida com base grande; datalist não é o gargalo.

---

## Pontos já OK (não regredir)

- **Bulk upsert com chunking** de 400 (`IMPORT_CHUNK_SIZE`, `src/services/api.js:552-556`) — alinhado ao `AGENTS.md`. Mantém resiliência por chunk.
- **Debounce de 2s no realtime** (`view/ui-controller.js:404-406`) — evita tempestade de recargas durante import em lote.
- **Chart.js destruído antes de recriar** (`state.chart.destroy()` em `928-947` e `1083-1101`) — evita vazamento de canvas.
- **Consultas temporais com `ORDER BY` explícito** (`getProductHistory` `718-719`, `getHistoricoWithClientFallback` `150`) — conforme `AGENTS.md`.

> Otimização tem que respeitar a semântica `data_referencia` × `criado_em`. Qualquer cache deve invalidar após importação para não exibir "última importação" desatualizada.
