# CAD-REBUILD-01 — Entrega e validação (09/10/2026)

Implementação concluída localmente, **sem commit e sem carga real**. [Contrato exato e execução futura](../arquitetura/cadastro-mestre-reconstrucao.md). O comando administrativo não está conectado ao navegador; seleção/aprovação/download permanecem locais.

## Resultado funcional

O mesmo adapter SheetJS/motor de filtros alimenta o manifesto de reconstrução. Produtos ausentes/fora dos filtros viram remoções aprováveis somente do Master. Campo ERP preenchido atualiza; vazio preserva valor existente de quem permanece. Origem/família ficam como códigos brutos, Agrup. Prod. permanece agrupamento ERP. Produtos novos entram somente no Master.

Após aprovação integral e confirmação explícita do hash: conexão PostgreSQL dedicada, locks/revalidação, snapshot integral no log existente e arquivo independente sincronizado antes do DML do Master, SAVEPOINT, INSERT/UPDATE/DELETE explícito, provas finais, log/proveniência e COMMIT. Erro de DML reverte todo o Master e registra falhou. Resposta de COMMIT incerta exige consulta ao lote/snapshot, sem repetição automática. Não há SQL, RPC ou DELETE no frontend; não houve mudança de schema, migration, RLS, Custos, OP, operacional, mapa ou fatos.

## Verificações executadas

- Instalação limpa: `npm@10.9.5 ci --ignore-scripts` usando npm via runtime Node empacotado; concluída com o lockfile atual.
- `node node_modules/vitest/vitest.mjs run`: **288 testes passaram, 26 arquivos, zero falhas**. Os **21 novos testes** de reconstrução incluem PostgreSQL local em memória, erros reais de SQL em inserção/atualização/remoção/conclusão do log, reversão integral, snapshot e log falhou, RLS incompleta, FK CASCADE bloqueada, campos ERP preenchidos/vazios, revisão parcial, repetição, arquivo/contexto divergentes, COMMIT incerto e validação CLI sem conexão.
- `node node_modules/eslint/bin/eslint.js .`: passou, zero erros/avisos.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: passou.
- `git diff --check`: passou.
- Chrome headless: controlador/HTML/CSS e SheetJS reais, contexto/API locais substituídos. XLS/XLSX/XLSM chegaram ao Preview e aprovaram oito propostas sintéticas; rejeição individual e download local preservaram execução desabilitada. Zero chamadas Supabase, sem erros no browser. Viewports 1440×900 e 390×700 inspecionadas.

A fixture de vazio editada para teste preserva a máscara numérica do código (`cellNF:true`), mantendo 001 como identidade existente. O motor de filtros `core/cadastro-mestre-preview-engine.js`, o parser e a migration histórica não foram modificados.

## Exemplo informado pelo usuário

O original ERP já foi validado pelo usuário: 6.230 linhas, 860 válidos, 853 existentes, 7 novos, 4.853 fora do universo. Expectativa sobre Master anterior de 5.706: **5.706 − 4.853 + 7 = 860 registros**. Os testes reproduzem essas contagens com registros sintéticos; não houve nova leitura do original nem execução dessa carga nesta tarefa. A quantidade de existentes com alterações depende dos valores do arquivo/contexto, não apenas dessas contagens.

Nenhum registro de histórico, Custos, OP, operacional ou mapa é apagado/criado por essa reconstrução. `data_referencia` segue competência e `criado_em` evento de importação nos fatos, preservados.

## Arquivos alterados ou adicionados

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
- [ROADMAP.md](../../ROADMAP.md)
- [VISION.md](../../VISION.md)
- [core/cadastro-mestre-approval-engine.js](../../core/cadastro-mestre-approval-engine.js)
- [core/cadastro-mestre-reconstruction-engine.js](../../core/cadastro-mestre-reconstruction-engine.js)
- [docs/arquitetura/banco-de-dados.md](../../docs/arquitetura/banco-de-dados.md)
- [docs/arquitetura/cadastro-mestre-aprovacao.md](../../docs/arquitetura/cadastro-mestre-aprovacao.md)
- [docs/arquitetura/cadastro-mestre-execucao-fase3-4.md](../../docs/arquitetura/cadastro-mestre-execucao-fase3-4.md)
- [docs/arquitetura/cadastro-mestre-preview.md](../../docs/arquitetura/cadastro-mestre-preview.md)
- [docs/arquitetura/cadastro-mestre-reconstrucao.md](../../docs/arquitetura/cadastro-mestre-reconstrucao.md)
- [docs/arquitetura/indice-documentacao-kustos.md](../../docs/arquitetura/indice-documentacao-kustos.md)
- [docs/arquitetura/matriz-contratos-operacionais.md](../../docs/arquitetura/matriz-contratos-operacionais.md)
- [docs/arquitetura/services-frontend.md](../../docs/arquitetura/services-frontend.md)
- [docs/arquitetura/stack-tecnologico.md](../../docs/arquitetura/stack-tecnologico.md)
- [docs/auditoria/backlog-priorizado.md](../../docs/auditoria/backlog-priorizado.md)
- [docs/auditoria/cadastro-mestre-reconstrucao-validacao.md](../../docs/auditoria/cadastro-mestre-reconstrucao-validacao.md)
- [docs/manuais/manual-operacao.md](../../docs/manuais/manual-operacao.md)
- [docs/manuais/manual-tecnico.md](../../docs/manuais/manual-tecnico.md)
- [docs/manuais/manual-usuario.md](../../docs/manuais/manual-usuario.md)
- [docs/ux/cadastro-mestre.md](../../docs/ux/cadastro-mestre.md)
- [package-lock.json](../../package-lock.json)
- [package.json](../../package.json)
- [scripts/lib/cadastro-mestre-reconstruction.mjs](../../scripts/lib/cadastro-mestre-reconstruction.mjs)
- [scripts/reconstruir-cadastro-mestre.mjs](../../scripts/reconstruir-cadastro-mestre.mjs)
- [src/services/cadastro-mestre-preview.js](../../src/services/cadastro-mestre-preview.js)
- [tests/cadastro-mestre-formatos.test.js](../../tests/cadastro-mestre-formatos.test.js)
- [tests/cadastro-mestre-reconstruction.test.js](../../tests/cadastro-mestre-reconstruction.test.js)
- [tests/ui-cadastro-mestre-preview.test.js](../../tests/ui-cadastro-mestre-preview.test.js)
- [view/ui-cadastro-mestre-preview.js](../../view/ui-cadastro-mestre-preview.js)
