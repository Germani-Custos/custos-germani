# LOG-05 — prioridade investigativa antes do TOP-200

Validação em **23/10/2026**, checkout inicialmente limpo no HEAD `fe531a2`. Entrega local para revisão, sem commit, push, deploy, escrita no Supabase, importação, criação de conta, mudança de Auth/RLS/policies/schema ou avanço para outro P1. A versão publicada permanece anterior até autorização própria.

## Diagnóstico e fluxo real antes da correção

`runReport` em `view/ui-controller.js` chama `api.getHistorico` com competência/cascata/produto. O leitor integral existente pagina fatos, enriquece classificação e aplica o recorte sem teto de 200. `buildReportRows` agrupa todos os fatos por produto; calcula variação no período por `data_referencia`, variação entre os dois registros mais recentes por `criado_em`, alerta canônico, score/classificação de instabilidade e mudança de regime. `calculateKpis` e `state.reportRows` recebem esse conjunto completo.

O defeito estava depois: `createInitialState` definia `sortKey:'variacao', sortDirection:'desc'`; `applyTableView` filtrava o conjunto completo, mas ordenava apenas pela variação **com sinal**. `renderTable` fazia `slice(0,200)` e anunciava “itens mais prioritários”. O corte já vinha depois da ordenação global, porém essa ordem padrão não era a prioridade investigativa prometida. Não houve evidência de candidatos perdidos, criticidade mal calculada ou filtro prematuro nesse caso.

O comparador investigativo já existia em `ui-export.js`: criticidade → regime → magnitude absoluta → flag de alerta → instabilidade → código. Os manuais descreviam essa prioridade como padrão. A tela não o utilizava. Portanto, o caso é **defeito confirmado de ordenação padrão**, não mera falta de capacidade da janela. A ordenação numérica com sinal continua válida quando escolhida manualmente.

## Reprodução real antes de alterar runtime

SELECT atual confirmou **558 fatos de outubro**, competências entre 05/10 e 14/10, e **349 produtos**. Na interface local autenticada do build anterior à correção, recorte Intervalo 01/10–31/10/2026, sem filtros cadastrais, sem filtro rápido e sem escolha manual: KPI 349 produtos, cinco alertas, zero regimes; 200 linhas renderizadas e **zero alertas na janela**.

Uma página temporária de diagnóstico em `dist` importou a API, o motor e ambos os comparadores existentes, sem mudar o produto nem escrever dados. A leitura real autenticada devolveu 558 fatos/349 candidatos e reproduziu exatamente as posições auditadas. TOP-500 foi somente diagnóstico: como há 349 candidatos, mostrou todos os 349 e os cinco alertas; não foi usado como correção.

Para os cinco produtos, a competência de referência é **14/10/2026**; os pares de custos têm competências 05/10 e 14/10 e importações `criado_em` de 19/10 às 19:58:24.900927 e 19:58:41.800652 UTC. Nesta amostra, variação no período e variação temporal são iguais. Não converter essa coincidência em equivalência geral entre os eixos.

- **1002012 — GERMANI BISCOITO MAIZENA 20 X 345 G:** 39,87 → 37,50; variação **−5,9443190369%**; prioridade **Atenção**, classificação OSCILANDO; score 5,9443190369; sem regime; magnitude 5,9443190369; flag de alerta 1. Motivo existente: variação relevante entre as duas últimas importações. Posição **345 → 5**.
- **1002152 — GERMANI BISCOITO LEITE 20 X 345 G:** 38,83 → 36,40; **−6,2580479011%**; **Atenção**, OSCILANDO; score/magnitude 6,2580479011; sem regime; flag 1. Mesmo motivo temporal. Posição **346 → 4**.
- **MM006 — MISTURA MASSA COM OVOS BOMGRADO:** 0,09 → 0,08; **−11,1111111111%**; **Crítico** pela classificação MUITO INSTÁVEL; score/magnitude 11,1111111111; sem regime; flag 1. Mesmo motivo temporal. Posição **347 → 1**.
- **MM013 — MISTURA MASSA COM OVOS CORTADA BELLA DICA:** 0,09 → 0,08; **−11,1111111111%**; **Crítico**, MUITO INSTÁVEL; score/magnitude 11,1111111111; sem regime; flag 1. Posição **348 → 2**.
- **MM014 — MISTURA MASSA COM OVOS LONGA BELLA DICA:** 0,09 → 0,08; **−11,1111111111%**; **Crítico**, MUITO INSTÁVEL; score/magnitude 11,1111111111; sem regime; flag 1. Posição **349 → 3**.

Criticidade tem peso legado 3 nos dois primeiros e 4 nas três misturas; regime é zero nos cinco. Não há peso criado nesta entrega. O nome legado `reincidencia` no ranking equivale a `isAlertaCritico(row) ? 1 : 0`, isto é, alerta atual; não é prova de recorrência histórica. LOG-04 continua responsável pela narrativa indevida.

### Comparação com a janela e os vizinhos

Todos os **200 anteriores eram Estável**, com criticidade 1, sem mudança de regime e sem alerta. Cada um dos cinco supera **todos esses 200** já no primeiro critério do comparador existente. Não foi preciso ajustar pesos para incluí-los.

Exemplos da ordem anterior:

- Posição 1: MB014, +1,6233766234%, Estável; veio antes porque a comparação numérica descendente prefere variações positivas.
- Posição 200: 3748667, variação de período zero e temporal null, Estável; magnitude zero.
- Posição 201: 3748668, zero/null, Estável; igualmente antes de qualquer variação negativa nessa ordem.
- Posição 344, imediatamente antes dos cinco: 2920124, −2,25%, Estável. A sequência final era −2,25 → −5,9443 → −6,2580 → −11,1111 → −11,1111 → −11,1111.

1002012 e 1002152 não empatam: criticidade/regime iguais e magnitude maior coloca 1002152 antes. MM006/MM013/MM014 empatam nos cinco critérios quantitativos; o código `pt-BR` desempata deterministicamente nessa ordem. Não há dado faltante provocando as cinco posições anteriores; é consequência da chave padrão errada.

## Implementação localizada

- `view/ui-state.js`: `sortKey:null` identifica ausência de escolha manual, em vez de iniciar por variação.
- `view/ui-filters.js`: filtro rápido continua aplicado ao conjunto completo; sem chave manual, usa a prioridade investigativa global. Com chave manual, mantém `compareRowsBySort` e direção explícita. Não corta nem altera `state.reportRows`.
- `view/ui-table.js`: recebe os dois helpers puros já existentes da exportação e continua cortando somente na apresentação. O aviso distingue “itens mais prioritários” de “primeiros 200 ... na ordenação escolhida”. O limite **200**, o listener delegado e os detalhes por linha permanecem.
- `view/ui-export.js`: importa/reexporta os helpers pelo caminho compatível anterior, sem duplicar algoritmo ou criar ciclo de imports. A seleção de linhas, condição legada de ordem manual, campos e gravação XLSX não mudaram.

Os corpos de `getInvestigationRankScore` e `compareByInvestigativePriority` foram comparados ao HEAD e são idênticos, normalizando apenas CRLF/LF. Prioridades, limiares, alerta `abs(variacaoTemporal)>=5`, regime, cálculo de instabilidade, magnitude e pesos não foram alterados. **Zero temporal válido não usa fallback**; null usa `variacao`; magnitude é absoluta, sem preferência de sinal. Código é o último desempate. Não se tenta forçar todo alerta ao TOP: se 200 casos forem mais prioritários, ele continuará fora.

Fluxo corrigido: fatos completos/recorte → evidências/classificação → candidatos completos → KPIs/estado completo → filtro rápido → **ordem investigativa global** (ou ordem manual escolhida) → **TOP-200 visual**. `data_referencia` permanece competência; `criado_em` importação/proveniência. Core, API, consultas e importadores não têm diff nesta entrega.

## Testes e qualidade

`tests/custos-top200.test.js`: **19 regressões**. A versão inicial dos testes reproduziu quatro falhas antes de alterar runtime: cinco alertas ocultos, prioridade errada no filtro rápido, estado inicial confundido com escolha manual e primeiro clique de variação invertido por esse estado.

Cobertura final:

- 0/37/199/200/201/349/500 candidatos: todos ou exatamente os 200 primeiros da ordem global, sem modificar entrada/estado completo.
- Cenário de 349 candidatos com pares dos cinco alertas auditados e demais estáveis sintéticos: 345–349 antes, 1–5 depois; TOP-500 só diagnóstico.
- Filtro rápido encontra os cinco mesmo depois da posição 200 original; KPIs continuam completos.
- Caso de 205 críticos e um alerta Atenção: alerta permanece abaixo do TOP por prioridade legítima, sem favorecimento artificial.
- Exportação padrão conserva **349 candidatos**, mesma sequência inicial da fila e sem aplicar corte visual; mock da escrita XLSX, sem arquivo real ou consulta.
- Ordem manual numérica por variação nas duas direções, aviso correspondente e preservação da carga completa.
- Precedência, magnitude absoluta positiva/negativa, zero/null, flag de alerta, instabilidade, código, empates e repetição/embaralhamento determinísticos.

Suíte integral: **666 testes / 43 arquivos**. Lint, typecheck, build e `git diff --check` aprovados. Testes usam dois workers, conforme prática existente do projeto; sem mudar timeout, ferramentas ou dependências.

## Validação real após a correção

Build local em `http://127.0.0.1:4173/`, configuração pública já publicada, sessão normal autenticada existente. Nenhum login master, extração de sessão ou escrita remota. Recarregamento intencional para iniciar sem escolha manual, recorte Intervalo 01/10–31/10/2026:

- Banco: **558 fatos / 349 produtos**; API real e motor: **558 / 349**.
- Candidatos globais: **349**, KPIs **349 itens / cinco alertas / zero regimes / média −0,10%**.
- Janela: **200 linhas**, cinco alertas presentes e início **MM006, MM013, MM014, 1002152, 1002012**; 2920124 vem em seguida.
- Filtro rápido Alertas: **cinco linhas**, mesmos cinco códigos nessa ordem, KPI total permanece 349.
- Ordem manual Variação descendente: 200 linhas, MB014 primeiro e zero alertas nessa janela, por escolha explícita; aviso “ordenação escolhida”. Ascendente: os cinco negativos reaparecem no início. Não confundir a escolha manual legítima com o defeito da ordem inicial.
- Cálculo local independente sobre os 558 fatos lidos por SELECT confirmou os mesmos KPIs, posições, 558 IDs únicos e sequência priorizada idêntica ao inverter a entrada.

## Preservação, estado e pendências

Fingerprint integral de `public.historico_custos` antes/depois: **2.268 registros**, SHA-256:

`478c7433091b983d7cbdff4a9493ea8a047684a901f32f317335e750e00f7d10`

Método: SHA-256 em UTF-8 do `string_agg(to_jsonb(t)::text,E'\n' order by to_jsonb(t)::text)`, com todas as colunas de todas as linhas. Nenhum DML foi executado. Somente SELECTs e GETs autenticados foram usados para a validação real.

**LOG-05 concluído localmente**, aguardando revisão/publicação autorizada. Não aumentar TOP-200 nem tratar os cinco como exceções. LOG-04 (narrativa/recorrência) e LOG-06 (XLSX ignora escolha manual por variação) permanecem abertos; compartilhamento do comparador não corrige a condição manual do exportador. Nenhuma outra correção foi executada. A janela continua tendo capacidade de 200: casos legitimamente abaixo dela exigem refinamento de filtros, como no contrato existente.
