# CAD-PAYLOAD-01 — Validação do transporte compacto (09/10/2026)

**Evidência histórica de 09/10:** a tentativa bloqueada e a medição local abaixo precedem a reconstrução posterior confirmada em [15/10](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026). Não substituir estas contagens por valores atuais; equivalência/tamanho de V1 não comprovam execução de V2. [Contrato de famílias vigente](../arquitetura/cadastro-mestre-familias-erp.md). A reorganização documental não refez as medições de produção. A seção CAD-VOL-01 ao final registra nova investigação exclusivamente sintética/local.

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


## CAD-VOL-01 — timeout local do teste de volume (19/10/2026)

Pedido de pós-validação: investigar uma falha de 5.000 ms no teste `Volume real informado, registros exclusivamente sintéticos > 6.230 linhas → 860 válidos, 4.853 remoções e 517 preservações cabem no POST de 4 MiB`, sem reduzir dados ou trocar o processamento real por mocks. As alterações visuais já presentes em `assets/style.css`, `index.html`, `view/ui-charts.js`, `view/ui-import.js` e `view/ui-import-op.js` foram preservadas, sem edição nesta correção.

### Diagnóstico e reprodução

- O diff inicial contém somente esses cinco arquivos visuais. `vitest.config.js`, package/lockfile, teste alvo e módulos de preparação/revalidação não mudaram em relação ao HEAD `509a64d`.
- Configuração usa ambiente Node, sem `setupFiles`, `globalSetup`, bootstrap visual ou timeout global configurado. O limite padrão efetivo de 5 s foi reproduzido, sem alteração na configuração.
- O grafo estático alcançável do teste tem onze módulos locais, todos idênticos ao HEAD após normalizar CRLF/LF. Nenhum módulo em `view/`, CSS, HTML ou inicialização do aplicativo é importado. A fixture compartilhada carrega SheetJS para os testes de formatos durante coleta; o caso de volume constrói arrays e não abre/transforma workbook.
- O import de `hashReconstrucao` alcança o executor administrativo apenas como definição de função e dependências puras já importadas. Não instancia cliente PostgreSQL, não abre conexão, não executa SQL, não cria UI e não grava snapshot.
- Uma execução isolada original passou em **1.651 ms**. Na suíte completa padrão, o mesmo teste falhou por timeout em **5.052,856 ms**: **552 passaram / 2 falharam**. A segunda falha foi um timeout separado no primeiro teste de build (**6.538,638 ms**), já observado antes de qualquer alteração desta correção.
- O host informa 12 CPUs disponíveis e 8 GiB de RAM total, com cerca de 1 GiB livre no momento da leitura. A configuração padrão permite disputa de recursos entre arquivos. O contraste entre execuções isoladas e concorrentes, inclusive no build independente, sustenta a origem em tempo de parede sob concorrência; não foi atribuído um processo externo específico ou alegada medição de saturação do sistema operacional.

### Perfil e determinismo

Uma cópia temporária do teste adicionou somente relógios entre as etapas, mantendo os mesmos arrays, funções reais, asserts e o mock HTTP original. Três processos isolados produziram os seguintes tempos por etapa em milissegundos, na ordem das rodadas:

- Montagem do fixture: **3 / 3 / 2**.
- Criação/validação dos dados compactos: **12 / 10 / 8**.
- Preparação do manifesto/revisão: **250 / 224 / 223**.
- Asserções do resumo: **2 / 2 / 2**.
- Aprovação integral: **392 / 321 / 325**.
- Plano/revalidação: **444 / 433 / 426**.
- Cliente HTTP, nova revalidação do plano, hashes e serialização do POST: **595 / 563 / 563**.
- Asserções do corpo: **19 / 18 / 18**.

Somas das etapas: **1.717 / 1.574 / 1.565 ms**. Não há uma espera de UI escondida: `document`, `Chart` e `getComputedStyle` permanecem `undefined` no ambiente do caso. O SHA-256 canônico do corpo JSON foi o mesmo nas três rodadas: `7c652b4344b362c971f266f16c3df7499d1b2b82e91afcebea2240f19ac9e305`.

O custo predominante é aprovação/plano/revalidações e serialização/hashing do conjunto com milhares de operações; as validações existentes fazem buscas repetidas nas listas e são exercitadas novamente pelo cliente HTTP. Isso faz parte da cobertura do contrato atual, sem nova alteração pelo redesign. Não houve redução/remoção dessas verificações ou mudança na implementação para obter o resultado. Instrumentação e cópia temporárias foram removidas.

### Correção e validação final

Somente o `it` de volume em `tests/cadastro-mestre-execution-data.test.js` recebe **10.000 ms** pelo argumento local do Vitest, com comentário explicativo. É uma margem de duas vezes o limite anterior para a execução concorrente medida, sem timeout global, retries ou teste desabilitado. O corpo funcional do teste permanece integralmente igual ao HEAD: 6.230 linhas, 860 válidos, 4.853 remoções, 517 preservações, limite de POST 4 MiB, hashes, aprovação/plano e mocks HTTP originais.

Na suíte completa com concorrência padrão, o teste alvo passou em **5.894,669 ms**, efetivamente acima do limite antigo. Resultado dessa rodada: **553 passaram / 1 falhou**, sendo a falha remanescente o timeout separado do teste de build (**6.132,407 ms**). Seu código/timeout não foi alterado nesta tarefa.

Validação da suíte integral com `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **554 testes / 38 arquivos passaram**, sem exclusões ou aumento global de timeout. O volume levou **2.322,711 ms** e o primeiro teste de build **715,557 ms**. O limite de workers foi usado apenas no comando dessa conferência, sem mudar `vitest.config.js` ou o script `npm test`.

Lint (`node node_modules/eslint/bin/eslint.js .`), typecheck (`node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`) e build local (`buildWeb({env})`, configuração pública sintética somente em memória) passaram. `git diff --check` e links locais foram conferidos no fechamento. Sem deploy, commit, push, mudanças de env, banco ou acesso de produção.

Arquivos da correção: teste alvo, entrada datada em AGENTS, nota do Manual Técnico, item CAD-VOL-01 no backlog e esta evidência. README/VISION/ROADMAP e manuais de usuário/operação foram revisados e não precisam de mudança: comportamento funcional, contratos de dados/POST e procedimentos do produto permanecem iguais. `data_referencia` continua competência e `criado_em` importação.

Limite conhecido: esta correção resolve o timeout do teste de volume; não declara que a suíte com concorrência padrão deixou de ser sensível à disponibilidade de recursos, pois houve timeout independente de build antes/depois. A conferência integral verde usa dois workers explicitamente.
