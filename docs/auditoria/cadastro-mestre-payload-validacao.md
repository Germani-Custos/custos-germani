# CAD-PAYLOAD-01 — Validação do transporte compacto (09/10/2026)

## Escopo e fonte

O original informado pelo usuário, `cadastro mestre 8_10(1).xls`, tinha 24.307.397 bytes e foi bloqueado pelo antigo cliente antes do POST. Nesta validação foi lida a cópia local `cadastro mestre 8_10.xls`, também com **24.307.397 bytes**, mas sem `(1)` no nome. O tamanho igual não comprova identidade byte a byte entre os dois arquivos; não foi alegada essa comparação.

O contexto atual de Production foi obtido somente por SELECT: **5.706 produtos**, **50 origens** e **38 famílias**. A geração de Preview e a simulação do transporte usaram esse contexto em memória. Nenhum POST de execução foi enviado à aplicação Production e o executor não foi chamado nesta medição.

## Leitura e equivalência verificadas

Pelo adapter e motores existentes, a cópia local produziu:

- **6.230** linhas lidas e **860** produtos válidos.
- **853** existentes e **7** novos.
- **4.853** remoções propostas somente do Master.
- **10** propostas de UPDATE e **517 preservações de campos**.
- **Zero** erros; Master antes **5.706**, depois esperado **860**.

As 517 preservações são de campos ERP vazios/omitidos em produtos que permanecem, não de produtos fora do universo. O resultado esperado conserva **5.706 − 4.853 + 7 = 860**; nenhuma reconstrução real aconteceu.

O manifesto da leitura direta coincidiu integralmente com o manifesto gerado pela representação compacta. A regeneração pelo caminho do servidor, usando o contexto lido, também coincidiu com o manifesto aprovado. Isso confere os mesmos filtros, universo, alterações, remoções e preservações para a cópia local efetivamente lida.

## Tamanho e transporte

- Dados compactos: **601.940 bytes**.
- Corpo JSON do POST com **4.870 decisões** (4.853 remoções + sete inserções + dez UPDATEs): **885.146 bytes**.
- Teto mantido: **4.194.304 bytes (4 MiB)**.

A medição executou o cliente local com `fetch` interceptado e token sintético. O corpo não contém XLS bruto/base64/gzip, manifesto duplicado ou contexto do banco. O original não foi relido para preparar o POST. A prova demonstra tamanho e conteúdo do transporte local, sem validar um POST real na Vercel ou gravar lote/snapshot.

## Verificações automatizadas e limites

Suíte completa: **409 testes em 31 arquivos passaram**. Os testes cobrem dados compactos, formatos, alteração de dados/manifesto/contexto, aprovação integral, limites, recusa com flag false e as regressões de snapshot/transação/rollback do executor existente. PostgreSQL em memória e Storage mockado não são Production.

Lint, typecheck e `git diff --check` passaram nesta entrega, incluindo conferência final da documentação. Não inferir resultados a partir de verificações históricas.

Mantidos sessão Auth, UUID da allowlist, flag server-side, origem, revalidação antes da execução e sob locks, snapshot sem sobrescrita e anterior ao DML, transação, rollback e provas das tabelas protegidas. O hash do XLS é proveniência declarada pelo navegador no modo web; sem seus bytes no servidor, não comprova independentemente origem ERP. Revisões anteriores exigem novo Preview/aprovação.

A revisão independente não identificou risco bloqueante concreto no código. Publicação futura precisa incluir frontend e função juntos, seguida de novo Preview/aprovação; revisão antiga ou versões divergentes não devem ser usadas. Hashes comprovam consistência, não assinatura da origem ERP. Esta conclusão não substitui aprovação operacional para habilitar ou executar.

## Arquivos alterados

Código (seis arquivos):

- `core/cadastro-mestre-execution-data.js` — representação compacta e validação fechada.
- `src/services/cadastro-mestre-preview.js` — dados do adapter e hash vinculados ao manifesto.
- `src/services/cadastro-mestre-execution.js` — POST compacto, sem binário/gzip.
- `view/ui-cadastro-mestre-preview.js` — encaminhamento dos dados aprovados.
- `scripts/lib/cadastro-mestre-web.mjs` — contrato HTTP e regeneração no servidor.
- `scripts/lib/cadastro-mestre-reconstruction.mjs` — revalidação da entrada compacta no executor central, preservando o modo de arquivo CLI.

Testes (cinco arquivos):

- `tests/cadastro-mestre-execution-data.test.js`.
- `tests/cadastro-mestre-execution-client.test.js`.
- `tests/cadastro-mestre-web.test.js`.
- `tests/cadastro-mestre-reconstruction.test.js`.
- `tests/ui-cadastro-mestre-preview.test.js`.

Documentação (13 arquivos):

- `README.md`.
- `VISION.md`.
- `ROADMAP.md`.
- `AGENTS.md`.
- `docs/arquitetura/cadastro-mestre-execucao-web.md`.
- `docs/arquitetura/cadastro-mestre-reconstrucao.md`.
- `docs/arquitetura/cadastro-mestre-preparacao-ambiente.md`.
- `docs/arquitetura/matriz-contratos-operacionais.md`.
- `docs/auditoria/backlog-priorizado.md`.
- `docs/auditoria/cadastro-mestre-payload-validacao.md` (este registro).
- `docs/manuais/manual-usuario.md`.
- `docs/manuais/manual-tecnico.md`.
- `docs/manuais/manual-operacao.md`.

O entrypoint `api/reconstruir-cadastro-mestre.js`, a fachada `src/services/api.js` e os motores de filtros/aprovação/plano permanecem os existentes; não houve schema, migration, dependência ou variável nova.

**Nenhuma escrita em Production, reconstrução real, upload/snapshot/lote de produção, mudança de variável, deploy, schema/migration ou commit nesta validação.** `data_referencia` permanece competência e `criado_em` importação nos fatos. [Contrato completo](../arquitetura/cadastro-mestre-execucao-web.md#cad-payload-01--transporte-sem-o-xls-bruto).
