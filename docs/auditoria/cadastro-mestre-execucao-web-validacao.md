# CAD-EXEC-WEB-01 — Entrega e validação (09/10/2026)

Etapa posterior: [CAD-ENV-01 — preparação e evidências](./cadastro-mestre-preparacao-ambiente-validacao.md) registra isolamento em dist, diagnóstico READ ONLY e validações adicionais. Os 323 testes abaixo são o resultado histórico da implementação web anterior. Deploy/reconstrução reais continuam pendentes.

Implementação local, sem commit/deploy/habilitação/carga real. [Arquitetura e procedimento](../arquitetura/cadastro-mestre-execucao-web.md). Nenhuma escrita, lote, snapshot ou bucket em Supabase de produção. A divergência de fingerprint operacional não foi alterada.

## Resultado e proteções

UI oferece **Executar reconstrução…** após aprovação integral e disponibilidade administrativa. Confirmação digitada exibe Master atual, inserções, atualizações, remoções e resultado esperado. Seleção/aprovação/download não executam carga. Cancelamento não envia execução.

Função Node Vercel verifica Auth/allowlist/origem/configuração e usa conexão administrativa TLS apenas no servidor. Transporte preserva bytes originais dos três formatos; hash vincula o manifesto integral. Adapter e plano centrais são reutilizados; revalidação é repetida sob locks pelo executor existente. Snapshot privado upload sem sobrescrita + leitura/SHA256 precede alteração de produto, com referência no log existente. Transação/rollback/provas centrais continuam ativos. Erro não causa retry; consulta de resultado é GET/SELECT.

## Verificações executadas

- Instalação limpa: `npm@10.9.5 ci --ignore-scripts`, concluída com lockfile. Node local 24.19.0; runtime exige >=22 e CI existente usa 22.
- `node node_modules/vitest/vitest.mjs run`: **323 testes / 28 arquivos passaram**, zero falhas; **35 testes novos**.
- `node node_modules/eslint/bin/eslint.js .`: passou, zero erros/avisos.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: passou, inclui o serviço HTTP novo.
- `git diff --check`: passou.
- Importação do entrypoint Node da função: passou, sem invocação/conexão.
- `npm audit --omit=dev --json`: zero vulnerabilidades detectadas nas dependências de produção. A instalação reporta oito achados nas dependências de desenvolvimento; não foram tratados nesta tarefa.

Testes UI/API/Auth/Storage/fetch usam mocks. HTTP integra o executor real com PGlite local em memória, cobrindo XLS/XLSX/XLSM, aprovação/cancelamento, hash/decisões/contexto divergentes, identidade/origem/gate, bucket público, falha de upload/conferência e erro SQL durante DELETE com reversão integral/consulta falhou. Comprovam snapshot antes do DML, autor autenticado, log/referência e preservação das tabelas protegidas. Testes centrais anteriores também continuam cobrindo erros INSERT/UPDATE/conclusão do log, RLS, dependências e COMMIT incerto. Sem leitura nova do original real: contagens 6.230 → 860 são expectativa informada, reproduzida sinteticamente.

## Arquivos criados

- `api/reconstruir-cadastro-mestre.js`
- `scripts/lib/cadastro-mestre-web.mjs`
- `src/services/cadastro-mestre-execution.js`
- `tests/cadastro-mestre-web.test.js`
- `tests/cadastro-mestre-execution-client.test.js`
- `tests/fixtures/cadastro-mestre-web.js`
- `docs/arquitetura/cadastro-mestre-execucao-web.md`
- `docs/auditoria/cadastro-mestre-execucao-web-validacao.md`

## Arquivos alterados

- `view/ui-cadastro-mestre-preview.js`
- `src/services/api.js`
- `scripts/lib/cadastro-mestre-reconstruction.mjs` — exporta a leitura central e registra referência opcional do callback de snapshot; CLI permanece compatível.
- `tests/ui-cadastro-mestre-preview.test.js`
- `tests/cadastro-mestre-reconstruction.test.js`
- `package.json`, `package-lock.json`, `jsconfig.json`, `vercel.json`, `.env.example`
- `README.md`, `README_SETUP.md`, `VISION.md`, `ROADMAP.md`, `AGENTS.md`
- `docs/arquitetura/cadastro-mestre-reconstrucao.md`
- `docs/arquitetura/indice-documentacao-kustos.md`
- `docs/arquitetura/matriz-contratos-operacionais.md`
- `docs/auditoria/backlog-priorizado.md`
- `docs/manuais/manual-usuario.md`, `manual-tecnico.md`, `manual-operacao.md`
- `docs/ux/cadastro-mestre.md`

Motor de filtros, engine de reconciliação/plano, importações Custos/OP, operacional/mapa, SQL histórico e schema não foram alterados. `data_referencia` permanece competência e `criado_em` evento de importação dos fatos.

## Pendências operacionais

Publicação e configuração/habilitação do ambiente administrativo não foram realizadas. Verificar Auth/IDs/origem/TLS/projeto e bucket privado/policies/retensão, com execução desabilitada até autorização operacional. Depois: novo Preview do original, revisão integral, Executar reconstrução, confirmação e conferência do lote/universo/fingerprints. Esperado: **5.706 − 4.853 + 7 = 860**, ainda não executado. Limites de envio e recuperação estão no contrato; resposta perdida não autoriza repetição automática.

Não foi feito teste de deploy/navegador conectado a produção. A validação desta entrega é automatizada/local; teste de ambiente futuro deve usar banco isolado antes de habilitar produção.
