# Auditoria — Segurança

Ver legenda e formato em [`README.md`](./README.md). Foco: o que é explorável **de fato**.

---

## SEC-01 · 🔴 Alto · XSS armazenado via `fillSelect`

- **Local:** `core/report-engine.js:8-20` (função `fillSelect`), linhas **9** e **13**.
- **Evidência:**
  ```js
  export function fillSelect(select, options, first, selectedValue = null) {
    select.innerHTML = `<option value="${first.value}">${first.label}</option>`;   // L9
    options.filter(...).forEach(opt => {
      select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;     // L13
    });
  ```
- **Por que é explorável:** os `label`/`value` vêm de `descricao` de produtos e categorias (origem/família/agrupamento) e de `codigo_produto`. Esses textos entram no banco **pela importação de planilha** (`importarHistoricoCustosComLog` → `garantirProdutosNoDicionarioEmLote`), sem sanitização de HTML. Como a importação hoje é de **acesso público** (ver `SEC-03`), um arquivo `.xlsx` com uma descrição como `"><img src=x onerror=alert(document.cookie)>` é persistido e, ao popular os selects de Origem/Família/Agrupamento/Item (`fillSelect` em `view/ui-controller.js:59,72-89,378-385,450,459-460`), executa script no navegador de quem abrir a Auditoria.
- **Impacto:** execução de JavaScript arbitrário no contexto da aplicação (roubo de sessão/token Supabase do usuário logado quando a auth for reativada, redirecionamento, manipulação de dados exibidos).
- **Correção recomendada:** escapar `value` e `label` (texto **e** atributo). Reutilizar o `escapeHtml` que já existe em `view/ui-utils.js:2` — mas note que `core/` **não importa de `view/`** hoje. Opção limpa: **mover `escapeHtml` para um util compartilhado** (ex.: `core/text-utils.js` ou `src/utils/html.js`) e importá-lo tanto em `report-engine.js` quanto em `ui-utils.js` (reexportando para não quebrar os imports atuais). Implementação:
  ```js
  import { escapeHtml } from '../src/utils/html.js';
  select.innerHTML = `<option value="${escapeHtml(first.value)}">${escapeHtml(first.label)}</option>`;
  // idem no forEach
  ```
- **Critério de aceite:** importar uma planilha com `descricao = '"><img src=x onerror=alert(1)>'`, abrir a Auditoria e confirmar que o texto aparece **literal** na lista, sem disparar o `alert` e sem quebrar o markup do `<select>`. Verificar que nenhum `fillSelect` perdeu o escape.

---

## SEC-02 · 🟡 Baixo (defesa em profundidade) · Padronizar "HTML seguro"

- **Contexto:** os demais pontos que montam `innerHTML` **já escapam** o que vem do usuário (ver lista de falso-positivos no `README.md`). Porém o padrão é manual e repetido 20+ vezes, fácil de esquecer em código novo (foi exatamente o que aconteceu em `SEC-01`).
- **Correção recomendada:** criar um helper de template seguro (ex.: tag function `html\`...\`` que escapa interpolações por padrão) **ou**, no mínimo, centralizar `escapeHtml` (ver `SEC-01`) e adotar uma regra de lint (ver `CFG-01`) que sinalize `innerHTML +=`/`innerHTML =` com template literal contendo `${`. Defensivamente, escapar também `classificacaoInstabilidade`/contexto em `renderTable` (hoje constantes, mas blindando contra mudança futura).
- **Critério de aceite:** existe um único utilitário de escape/markup seguro reutilizado pelos módulos; regra de lint ativa alertando interpolação não escapada em `innerHTML`.

---

## SEC-03 · 🔵 Decisão · Acesso público sem RLS

- **Local:** `view/ui-controller.js:26-29` (`allowOpenAccess` define `state.user = { email: 'acesso_publico' }`); realtime sem filtro de usuário em `src/services/api.js:402-417`; `AGENTS.md` documenta a desativação do gate de login em 2026-05-14.
- **Evidência:** não há chamada de autenticação no bootstrap (`init` em `view/ui-controller.js:16-24` chama `allowOpenAccess`, não `signIn`). A `anon key` do Supabase é pública por design, mas **sem RLS** ela permite ler/gravar as tabelas diretamente.
- **Impacto:** qualquer pessoa com a URL pública lê todos os custos e **dispara importações/gravações** (`importarHistoricoCustosComLog`, `upsertHistoricoCustos`, inserts no dicionário). Combinado com `SEC-01`, é o que torna o XSS explorável por terceiros. Dados de custo são sensíveis comercialmente.
- **Isto é uma decisão de produto** (acesso público temporário), **não um bug a corrigir às cegas**. Recomendações:
  1. **Documentar explicitamente** o risco aceito (feito aqui e em `docs/manuais/manual-operacao.md`).
  2. Preparar o **checklist de reativação**: ativar RLS nas tabelas (`historico_custos`, `dicionario_produtos`, `categorias_*`, `log_importacao`), políticas por usuário/role, e religar o gate de login (a infra já existe: `api.signIn/signOut/getCurrentUser` em `src/services/api.js:444-467` e `scripts/create-master-user.mjs`; ver `docs/arquitetura/autenticacao.md`).
  3. Enquanto público, **no mínimo** proteger a escrita (RLS de `INSERT/UPDATE` exigindo sessão) mesmo mantendo leitura aberta — reduz muito o risco de `SEC-01`/`SEC-04`.
- **Critério de aceite:** decisão registrada com responsável e data; checklist de reativação versionado; (se aprovado) RLS de escrita ativo verificável tentando um `insert` anônimo e recebendo erro de policy.

---

## SEC-04 · 🟠 Médio · Validação de upload incompleta (tamanho e fórmula)

- **Local:** `src/services/api.js:115-130` (`validateHistoricoRow`); parsing em `core/spreadsheet-engine.js:157-181` (`parseBrazilianNumber`) e `view/ui-controller.js:204-244` (`buildImportPreview`).
- **Evidência:** `validateHistoricoRow` checa presença e numérico, mas **não limita tamanho** de `codigo_produto`/`descricao`, e não há mitigação de **CSV/Excel formula injection** (células iniciando com `=`, `+`, `-`, `@`). `normalizeISODate` (`src/services/api.js:86-103`) aceita datas semanticamente inválidas (`new Date('2099-99-99')` pode rolar para outra data em vez de rejeitar).
- **Impacto:** strings enormes inchando o banco/DOM (degradação, possível DoS leve); valores que parecem números mas viram fórmula quando o `.xlsx` exportado (aba "Fila Investigativa") é reaberto no Excel por um operador; competências fora de faixa poluindo a análise temporal.
- **Correção recomendada:** (a) limitar comprimento de `codigo_produto` (ex.: ≤ 64) e `descricao` (ex.: ≤ 256) em `validateHistoricoRow`, registrando como linha de erro (mantendo a resiliência linha-a-linha já existente); (b) na **exportação** (`exportReport`, `view/ui-controller.js:829-891`), prefixar com `'` campos de texto que comecem com `= + - @`; (c) endurecer `normalizeISODate` validando faixa plausível de ano (ex.: 2000–2100) e dia/mês reais.
- **Critério de aceite:** planilha com `descricao` de 100k caracteres gera linha de erro (não grava); export reaberto no Excel não executa fórmula; `data_referencia = 2099-99-99` é rejeitada com mensagem clara.

---

## SEC-05 · 🟠 Médio · Dependências de CDN sem versão fixada nem SRI

- **Local:** `index.html:8,12-14`.
- **Evidência:**
  ```html
  <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>   <!-- sem versão -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>          <!-- sem versão -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>    <!-- só major -->
  <link ... remixicon@3.5.0 ...>                                          <!-- ok, fixada -->
  ```
- **Impacto:** `xlsx` e `chart.js` resolvem para a **última versão**; um release com breaking change ou comprometido entra direto em produção sem revisão (risco de supply chain e de quebra silenciosa do parsing/gráficos).
- **Correção recomendada:** fixar versões exatas (ex.: `xlsx@0.20.x`, `chart.js@4.4.x`, `sweetalert2@11.x.y`) e adicionar `integrity` (SRI) + `crossorigin="anonymous"`. Documentar as versões no `docs/manuais/manual-tecnico.md`. (A `@supabase/supabase-js@2` em `src/services/api.js:2` também usa só o major — fixar minor recomendado.)
- **Critério de aceite:** todas as tags `<script>`/`<link>` de terceiros têm versão exata e `integrity`; build/preview continua funcional (import, auditoria, gráficos e modais).

---

## Itens fora de escopo / OK

- **Segredos no código:** OK — credenciais vêm de env/runtime (`src/config/app-config.js`), nada hardcoded (alinhado ao `AGENTS.md`).
- **SQL bruto no frontend:** OK — só `supabase.from()` (regra do `AGENTS.md` respeitada); sem RPC.
- **CSRF:** baixo risco no modelo atual (sem cookies de sessão próprios; tokens via Supabase). Reavaliar ao reativar auth (`SEC-03`).
