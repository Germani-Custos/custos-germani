# Auditoria — Tooling e Configuração

Ver legenda e formato em [`README.md`](./README.md). Restrição importante: o **runtime é estático via CDN, sem bundler** (decisão de arquitetura). As melhorias abaixo **não devem introduzir bundler nem mudar o runtime** — apenas ferramentas de desenvolvimento.

---

## CFG-01 · 🟠 Médio · Sem linter

- **Evidência:** não há `.eslintrc*`. Foi a ausência de lint que deixou passar o XSS de `SEC-01`.
- **Correção recomendada:** adicionar **ESLint** (flat config) rodando sobre ES Modules de browser. Regras de maior valor aqui: `no-unsanitized/property` (plugin) ou regra custom para flagrar `innerHTML` com template literal contendo `${`; `no-unused-vars` (pegaria `MNT-06`); `no-undef` com globals `XLSX`, `Chart`, `Swal`, `supabase`. Rodar via `npx eslint` (sem instalar no runtime).
- **Critério de aceite:** `npx eslint .` roda limpo (ou com baseline conhecida); a regra de `innerHTML` não-escapado dispararia em `SEC-01` antes da correção.

---

## CFG-02 · 🟠 Médio · Sem checagem de tipos (caminho leve recomendado)

- **Contexto:** migrar para TypeScript implicaria build/bundler — **contra** a arquitetura atual. O caminho proporcional é **JSDoc + `// @ts-check`** com `checkJs`, que dá verificação de tipos no editor/CI **sem alterar o runtime**.
- **Correção recomendada:** adicionar `jsconfig.json` com `{ "compilerOptions": { "checkJs": true, "strict": true, "module": "esnext", "target": "es2022" }, "include": ["core", "src", "view"] }`; adicionar `// @ts-check` no topo dos módulos `core/` e `src/services/`; documentar os contratos como `@typedef` (ver `MNT-05`). Rodar `npx tsc --noEmit` em CI.
- **Critério de aceite:** `npx tsc --noEmit` passa; erros reais de tipo (ex.: `row.variacao` possivelmente `null` em `toFixed`) ficam visíveis.

---

## CFG-03 · 🟠 Médio · Sem testes automatizados (cobertura 0%)

- **Evidência:** nenhum `*.test.js`/`*.spec.js`, nenhuma config de runner. Refatorar (`MNT-01/02`) sem rede de segurança é arriscado.
- **Correção recomendada:** adicionar **Vitest** (roda ESM nativo, sem precisar de bundler do app). Priorizar testes de **lógica pura**, que é onde mora o valor e o risco:
  - `core/report-engine.js`: `buildReportRows` (variação, regime, instabilidade), `calculateKpis`, `calculateCascadeOptions`.
  - `core/spreadsheet-engine.js`: `parseBrazilianNumber`, `normalizeCodigoProduto` (notação científica — `VAL-01`), `detectColumnMapping` (fuzzy).
  - `src/services/validation.js` (após `MNT-02`): `validateHistoricoRow`, `normalizeISODate`.
  Mockar Supabase nos métodos `api.*` ou deixá-los para teste de integração separado.
- **Critério de aceite:** `npx vitest run` executa; cobertura inicial ≥ 60% em `core/`; os bugs `VAL-01` e `LOG-01` têm teste de regressão.

---

## CFG-04 · 🟡 Baixo · Adicionar `package.json` apenas para DEV (sem tocar no runtime)

- **Contexto:** hoje não há `package.json` (o app carrega tudo por CDN). Para viabilizar `CFG-01/02/03` é preciso um `package.json`, mas ele deve conter **somente `devDependencies` e scripts de qualidade** — o `index.html` continua usando CDN.
- **Correção recomendada:** criar `package.json` com `"private": true`, `devDependencies` (eslint, typescript, vitest e plugins) e scripts:
  ```json
  { "scripts": { "lint": "eslint .", "typecheck": "tsc --noEmit", "test": "vitest run", "build": "node scripts/generate-runtime-config.mjs" } }
  ```
  Manter o `buildCommand` da Vercel apontando para o script de runtime-config (`vercel.json`). Adicionar `node_modules/` ao `.gitignore` (verificar se já está).
- **Critério de aceite:** `npm install` instala só dev tools; `npm run lint|typecheck|test` funcionam; o deploy estático na Vercel permanece inalterado (CDN no `index.html`).

---

## CFG-05 · 🟡 Baixo · Integração contínua (CI) mínima

- **Correção recomendada:** após `CFG-01/02/03`, um workflow de CI (GitHub Actions) rodando `lint`, `typecheck` e `test` em PRs para a branch de produção. Barato e previne regressão dos itens desta auditoria.
- **Critério de aceite:** PRs exibem o status dos três jobs; merge bloqueado se algum falhar (conforme política do repo).

---

## OK / fora de escopo

- **`scripts/generate-runtime-config.mjs`** (build da Vercel) é simples e adequado ao modelo estático — manter.
- **Acessibilidade** parcial já presente (`aria-label` na nav e dropzone, tema de contraste nos gráficos em `getReadableChartOptions`). Melhorias de a11y são desejáveis mas de menor prioridade que segurança/correção — registrar no `ROADMAP.md` se relevante.

## Atualização 2026-06-25 — Onda 2 implementada

- **CFG-04 concluído:** `package.json` e `package-lock.json` adicionados somente com devDependencies e scripts de qualidade; produção continua usando CDN e `vercel.json` mantém `node scripts/generate-runtime-config.mjs`.
- **CFG-01 concluído:** ESLint flat config (`eslint.config.js`) roda sobre módulos ESM, reconhece globals de browser/CDN/Node e bloqueia interpolação direta em `innerHTML`. O lint passa com warnings de baseline (`no-unused-vars`) que ficam como insumo de manutenção, não como mudança funcional desta onda.
- **CFG-02 concluído:** `jsconfig.json`, tipos globais em `types/globals.d.ts`, `// @ts-check` e JSDoc inicial no núcleo habilitam checagem estática leve sem TypeScript/bundler no runtime.
- **CFG-03 concluído:** Vitest cobre contratos críticos do núcleo, especialmente normalização canônica de produto (VAL-01), regra canônica de alerta (LOG-01) e separação entre competência (`data_referencia`) e importação (`criado_em`).
- **CFG-05 concluído:** `.github/workflows/ci.yml` executa lint, typecheck e testes em Pull Requests e pushes para branches principais, sem deploy.

### Observações de baseline levantadas pelo tooling

- O lint expõe variáveis/funções não usadas em `src/services/api.js`, `view/ui-controller.js` e argumento não usado em `core/report-engine.js`; prioridade média/baixa, recomendado tratar junto de MNT-06/MNT-01/MNT-02.
- Ainda existe HTML dinâmico em partes da UI legada. A regra bloqueia padrões interpolados novos e há exceção documentada no drill-through até SEC-02 centralizar helper de HTML seguro.

## Atualização 2026-06-29 — Correção da falha de CI da Onda 2

- **Causa raiz:** `package.json` declarava `@eslint/js`, mas não declarava o pacote executável `eslint`. Localmente o comando `npm run lint` passava porque havia um `eslint` global no `PATH`; no runner limpo da GitHub Actions, após `npm ci`, `node_modules/.bin/eslint` não existia e o step **Lint** falhava com exit code `127`.
- **Correção:** `eslint` foi adicionado explicitamente a `devDependencies`, mantendo a arquitetura de runtime intacta (nenhuma dependência de produção, nenhum bundler, nenhum carregamento em CDN alterado).
- **Prevenção:** validações da Onda 2 devem ser reproduzidas sempre a partir de ambiente limpo com `rm -rf node_modules && npm ci` antes de considerar a CI confiável. Não use binários globais como evidência de sucesso local.

## Atualização 2026-06-29 — Reemissão de PR

- Reemissão administrativa do PR da Onda 2 para substituir tentativa fechada, sem alteração funcional, sem mudança de runtime/CDN e mantendo `eslint` explicitamente em `devDependencies`.
