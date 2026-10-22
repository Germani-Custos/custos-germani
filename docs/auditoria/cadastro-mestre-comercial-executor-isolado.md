# CAD-COM-EXEC-01 — provas do executor isolado

Validação local de 22/10/2026, a partir de `main` em `b22426f107d0d3c53abb5de772491d9d9d8f32ee`. Nenhuma conexão ao Supabase, carga real, migration, commit, push ou deploy. [Contrato de entrada/saída e isolamento](../arquitetura/cadastro-mestre-comercial-executor-isolado.md).

## Escopo de código

- `scripts/lib/cadastro-mestre-comercial.mjs`: `validarCargaComercial` e `executarCargaComercial`; única escrita parametrizada no par comercial, com revalidação, locks, provas e rollback. Não importa o executor geral, API, UI ou `pg`.
- `scripts/validar-carga-comercial.mjs`: comando exclusivamente local; não aceita opção de execução ou conexão.
- `tests/cadastro-mestre-comercial-executor.test.js`: PostgreSQL/PGlite local, fixture sintética integral de 6.230 linhas, 860 produtos e 12 tabelas públicas.

Adapter, motores/contratos existentes, executor de reconstrução, frontend, schema e migrations não foram editados. Nenhuma mudança em regras de Custos/OP, agrupamento investigativo ou fallback. O novo caminho não escreve `log_importacao_cadastro_mestre`, timestamps ou proveniência.

## XLS real e manifesto aprovado como diagnóstico

XLS original: `cadastro mestre 8_10.xls`, 24.307.397 bytes; SHA-256 `3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14`. Adapter original, SheetJS 0.20.3, aba Sheet1, transporte V3 e manifesto de reconstrução V2, sem alterar o arquivo.

Manifesto integral da Fase A: SHA-256 canônico `a80248802de000f0c1be155975d3ad44691659b893cbfebebcdb0bbc62c23dc5`. Fotografia original de `2026-10-19T17:44:17.463982+00:00`: SHA-256 dos bytes `77d65229bf40595995793789ccc57e001110f054dba87023679f452b467b9149`. Ambos permanecem imutáveis, fora do repositório, em `C:/Users/aprendizcustos/.codex/visualizations/2026/10/16/01a145c5-887d-75a1-b93c-1352f9889309/cad-com-producao-etapa2-fase-a-20261019/`.

O novo validador conferiu hashes de arquivo/fotografia/dados/contexto e comparou a projeção integral regenerada, com todas as ações/valores e identidades, ao manifesto da Fase A. Resultado idêntico:

- 6.230 linhas; 860 produtos existentes; zero novos/removidos;
- 162 com Agrup. Com., 698 sem; 29 códigos distintos;
- 162 produtos a atualizar, 324 valores; 698 pares mantidos NULL;
- zero conflitos, inferências, limpezas ou operações de outros atributos/catálogos.

Também foi realizado ensaio de transação com o **XLS real**, exclusivamente em PGlite em memória: cópia dos 860 registros integrais do Master e dos catálogos da fotografia, com RLS habilitada e acesso administrativo já existente. A biblioteca aplicou um único UPDATE, confirmou 162/324, preservou a imagem restante e os 698 pares NULL. As outras tabelas reais não foram copiadas nesse ensaio: isolamento de todas as 12 tabelas e falhas são cobertos pela fixture sintética dos testes. [Resultado estruturado local, hashes e exemplos](cadastro-mestre-comercial-executor-isolado.json).

Exemplos confirmados no resultado local: C006 → BISCOITO ESPECIAL (8 produtos); C012 → BISCOITO SOLTO DOCE (4); C005 → BISCOITO CHAMPAGNE (1); C008 → BISCOITO LAMINADO DOCE (7); C011 → BISCOITO RECHEADO (16).

## Testes e isolamento

Os 23 testes novos comprovam atualização real em PostgreSQL local, 162 identidades/324 campos, 698 pares NULL, universo intacto e igualdade de todas as outras colunas, inclusive valores não nulos de timestamps/proveniência. Conferem SQL enviado: um único DML, SET fixo de dois campos. Counts/hashes integrais das outras 11 tabelas incluem todos os logs, operacional, Custos, OP, mapa e catálogos.

Há provas de rollback após UPDATE verdadeiro, erro no UPDATE, retorno incompleto, alteração indevida de timestamp e alteração indevida de log injetadas somente no teste. Após abortar, os dois campos, imagem integral do Master e dados protegidos permanecem no estado anterior. Drift de código/descrição/timestamp/proveniência, produto ausente, trigger de efeito colateral, hashes/arquivo/fotografia/confirmação divergentes e propostas adulteradas bloqueiam. RLS habilitada/políticas são preservadas, sem conceder bypass; o cliente administrativo local já o possui. Validação pura não chama rede/banco e CLI recusa `--executar`.

Comprovações executadas:

- Suíte completa: `node node_modules/vitest/vitest.mjs run --maxWorkers=2` — **577/577**, 39 arquivos, incluindo 23 testes novos. Nenhum timeout alterado.
- ESLint integral (`node node_modules/eslint/bin/eslint.js .`): passou, sem avisos.
- Typecheck do projeto (`node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`): passou.
- Build local (`buildWeb` de `scripts/build-web.mjs`, URL/chave públicas sintéticas): passou, saída apenas em `dist` ignorado; sem deploy.
- `git diff --check`: passou; seis arquivos novos também conferidos separadamente, sem erros de whitespace. Os 147 links locais nos documentos revisados apontam para arquivos existentes.

PGlite não simula disputa entre sessões independentes; os locks NOWAIT foram exercitados pelo executor local, sem alegar teste de concorrência em produção. Leitura remota não foi repetida em 22/10. A fotografia de 19/10 não prova estado remoto atual: execução futura relê tudo sob locks e bloqueia qualquer divergência.

## Arquivos e limites

Além dos três arquivos de código/teste, documentação restrita: README, ROADMAP, AGENTS, manual técnico, manual de operação, backlog e contrato comercial existente; novos contrato isolado, esta prova e JSON agregado local. VISION foi revisada e não exige mudança de princípios. Não houve reorganização documental ou histórico de commits no README.

Inventário integral, 13 arquivos sem staging/commit:

```text
scripts/lib/cadastro-mestre-comercial.mjs
scripts/validar-carga-comercial.mjs
tests/cadastro-mestre-comercial-executor.test.js
AGENTS.md
README.md
ROADMAP.md
docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md
docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md
docs/auditoria/backlog-priorizado.md
docs/auditoria/cadastro-mestre-comercial-executor-isolado.md
docs/auditoria/cadastro-mestre-comercial-executor-isolado.json
docs/manuais/manual-operacao.md
docs/manuais/manual-tecnico.md
```

`dicionario_produtos`, `historico_custos`, `apontamentos_op`, `mapa_produtos` e demais tabelas de produção não receberam escrita nesta etapa; nenhuma conexão de produção foi aberta. `data_referencia` continua competência e `criado_em` importação. O executor permanece sem invocador de produção/UI/job; futura execução requer autorização explícita, cliente dedicado e confirmação do hash. Resultado ou COMMIT incerto não permite retry automático. **A etapa termina sem executar produção.**
