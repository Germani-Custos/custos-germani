# CAD-ENV-01 — Evidências da preparação (09/10/2026)

[Procedimento completo](../arquitetura/cadastro-mestre-preparacao-ambiente.md). Nenhuma reconstrução, snapshot/lote/bucket novo, escrita de produção, RPC, migration, commit ou deploy nesta tarefa.

## Evidências remotas por leitura

- GET público da função: HTTP 404, conteúdo text/plain. Não afirmar que a versão local está publicada.
- Checkout sem vínculo `.vercel/project.json`/CLI autenticada/variáveis administrativas no processo. Não inspecionado env do painel: controle de navegador falhou duas vezes com timeout. Configuração cloud continua não verificada.
- SELECT Storage: nenhum bucket/policy. Nome `cadastro-mestre-snapshots` é recomendado no template, ainda não criado.
- SELECT Auth pelo e-mail fornecido: usuário único, confirmado, não anônimo; UUID técnico usado no template de allowlist. Nenhuma conta ou permissão foi alterada.
- Log: somente lote 1 concluído, contrato null. Nenhum RECONSTRUCAO_UNIVERSO_V1.
- SELECT antes/depois: mesmas contagens e fingerprints integrais em Master/Custos/OP/operacional/mapa. Master 5706; Custos 1370; OP 704; operacional 6113; mapa 292.

Fingerprints desta verificação (iguais antes/depois): Master `f8e5b72dc62f813c56702ed6e165a71e`; Custos `8dd6830cea6fd386bd81d84b2b2952e3`; OP `57ac3e45766e81f7563088f61e5c0e05`; operacional `456ec00326dcc5eb62ef7c4303d01f3e`; mapa `de383acd5e5be0e701ea69440e02a4fe`.

Algoritmo: `md5(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text))` sobre todas as linhas. **Não comparar esses valores com fingerprints anteriores que usaram outra ordenação/separador**. Essa prova estabelece igualdade no intervalo desta tarefa; não atribui autoria nem resolve a divergência operacional anterior.

## Validação local

- Build estático por allowlist: frontend/imports/docs disponíveis; função/executor/env/SQL/pacote/dados de banco excluídos. Canários de conexão e chave secreta não aparecem na saída; chave secreta/service_role pública e vazamento por variável pública recusados.
- Diagnóstico com flag false: somente BEGIN READ ONLY/SET LOCAL/SELECT/ROLLBACK. Não chama executor, Storage upload/download ou DML; preserva Master/log/tabelas em PostgreSQL local em memória.
- Rejeições: sessão/UUID/origem, bucket público/ausente, policies existentes, dependências e permissões insuficientes; POST verificar não desativa o gate.
- Testes de execução anteriores preservados: aprovação integral, hash/contexto/arquivo, snapshot antes do DML, falhas de upload/hash/SQL e rollback, três formatos e tabelas protegidas. Nenhum teste se conecta à produção.

Resultados finais: **337 testes / 29 arquivos passaram**, incluindo 14 testes adicionais nesta etapa. Lint passou sem erros/avisos; `tsc --noEmit -p jsconfig.json` passou; `git diff --check` passou. Build local com valores públicos fictícios e canários administrativos passou, assim como import do entrypoint da função sem invocação. Node local 24.19.0. Nenhum teste usa credencial/conexão de produção.

Último SELECT confirmou **0 buckets, 0 objetos Storage, 1 lote total e 0 lotes RECONSTRUCAO_UNIVERSO_V1**. Upload/rollback/deploy em produção **não testados**: fazê-los ultrapassaria a preparação sem escrita. Configuração real e diagnóstico remoto permanecem pendentes; não marcar prontidão integral como concluída.

## Arquivos desta etapa

Código/configuração: `scripts/build-web.mjs` (novo), `vercel.json`, `package.json`, `.gitignore`, `.env.example`, `scripts/lib/cadastro-mestre-web.mjs`, `scripts/lib/cadastro-mestre-reconstruction.mjs` (somente export da guarda), `src/services/cadastro-mestre-execution.js`, `src/services/api.js`.

Testes: `tests/build-web.test.js` (novo), `tests/cadastro-mestre-web.test.js`, `tests/cadastro-mestre-execution-client.test.js`, `tests/cadastro-mestre-reconstruction.test.js`.

Documentação: este relatório/guia novos, README/SETUP/VISION/ROADMAP/AGENTS, manuais usuário/técnico/operação, deploy/índice/matriz/contrato web e backlog. Alterações anteriores da execução web permanecem no checkout sem commit.
