# VIS-01 — Identidade visual Black + Purple

Conferência local em **19/10/2026**. Implementação visual no checkout, aguardando aprovação humana; não representa publicação ou validação de produção.

## Escopo entregue

Tokens de fundo, superfícies, borda, roxos, texto, hover, foco e estados semânticos em `assets/style.css`. Cards de acesso, navegação, login, formulários, KPIs, tabelas, drill-through/dossiê, documentação, Preview/revisão e mensagens SweetAlert2 compartilham essa linguagem. Chart.js lê tokens para apresentação, preservando séries/cálculos. Os avisos de importação usam o token de atenção com contraste adequado no fundo escuro.

O checkout contém cinco views: Importação, Custos, OP, Cadastro e Documentação. Não existe Dashboard nem Configuração/Admin independente. A central de módulos ocupa a área inicial de Importação e seus quatro cards abrem destinos existentes com `data-view-trigger`. A importação continua nessa mesma área; não foi criada rota ou módulo. O tratamento administrativo foi conferido nos controles existentes do Cadastro/Preview. Configuração ausente conserva seu fallback, com classes visuais compartilhadas; esse fallback não foi exercitado no navegador nesta validação.

Nenhuma modificação nos motores, APIs, consultas, schema, migrations, dados, filtros, classificação, cálculo, reconciliação, persistência, exportação ou investigação. A verificação de escopo com `git diff --exit-code -- core src/services services api scripts sql package.json package-lock.json` passou. `data_referencia` permanece competência e `criado_em` importação. Alterações de JS desta entrega se limitam a cores; HTML conserva todos os 116 IDs existentes, sem IDs duplicados; os links locais dos documentos revisados foram conferidos, sem destinos ausentes. A navegação por cards é o acesso adicional às mesmas views, sem nova lógica de navegação.

## Conferência real no navegador

Browser in-app, HTML/CSS e controladores reais servidos por HTTP local. O servidor de QA substitui somente o módulo de API por fixture em memória e a configuração pública por valores sintéticos. `connect-src 'self'` bloqueia conexões remotas; POST é recusado. Bibliotecas e fonte de ícones CDN continuam as existentes. Nenhuma sessão de produção ou credencial foi usada.

Fixture: 64 produtos, 36 registros de Custos, dois apontamentos de OP e XLSX de três produtos exclusivamente demonstrativos. Não foi importado dado no banco. Fixture, servidor, métricas JSON e capturas PNG estão fora do repositório, no diretório de artefatos da sessão (`visual-qa`).

Conferidos:

- Central: quatro cards com ícone/título/descrição/ação e navegação pelos destinos atuais.
- Custos: período, análise, seis itens nos KPIs/fila, gráficos Chart.js, drill-through com seis eventos e eixos de competência/importação separados.
- OP: dois apontamentos, fila e decisão crítica/favorável, dossiê com evidências e distinção ERP/Kustos.
- Cadastro: painéis Operacional/ERP, busca ERP de um resultado e paginação 1/2 → 2/2 (51–64 de 64). Nenhuma edição foi salva.
- Preview administrativo: XLSX sintético pelo seletor real, resumo/revisão, cinco decisões locais aprovadas e fechamento; execução indisponível pela fixture. Seletores escuros com texto claro e botões de confirmação/cancelamento usando tokens calculados do CSS. Nenhuma reconstrução foi solicitada.
- Documentação: leitura Markdown renderizada, abertura do editor/prévia e cancelamento. Nenhum commit documental foi solicitado pela tela.

As cinco áreas foram abertas em **1440×900, 1024×768 e 390×700**. Documento sem overflow horizontal externo; tabelas extensas conservam seu scroll interno. Em 390px, filtros em uma coluna; Cadastro ERP com região de 326px para tabela de 891px, OP com região de 341px para tabela de 1534px e Custos com região de 341px para tabela de 796px. Scrollbars explicam a largura útil menor que a viewport. Preview conferido também nas três dimensões. Editor mobile com largura de 309px, sem extrapolar o documento.

Foco por Tab observado no botão Custos: contorno sólido de 2px em `rgb(196,181,253)`. Contraste calculado dos tokens contra a superfície: texto principal 16,89:1, texto secundário 11,28:1, muted 7,37:1, roxo 6,85:1; branco no roxo de botão 5,70:1. Estados mantêm nomes/símbolos além de cor. Movimento reduzido é respeitado por CSS. Isso é conferência básica, não auditoria WCAG completa.

## Qualidade e equivalência

- `node node_modules/eslint/bin/eslint.js .`: passou, sem erros/warnings.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: passou.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: **554 testes / 38 arquivos passaram** na verificação final.
- Build pelo entrypoint existente `scripts/build-web.mjs`: passou com URL/chave pública sintéticas fornecidas somente ao processo. O processo local não tinha as variáveis obrigatórias; o primeiro build sem elas foi bloqueado corretamente. Configuração da raiz/env não foi editada e o artefato não foi publicado.
- `git diff --check`: passou. Git avisou conversão futura LF/CRLF no arquivo de teste alterado em paralelo; não houve erro de whitespace.
- Revisão do diff: alterações funcionais desta entrega ausentes; motores/API/schema e handlers permanecem iguais. Equivalência conferida pelos fluxos locais e testes, sem alegar execução integral de importação, gravação, reconstrução ou produção.

Durante a tarefa surgiu alteração concomitante em `tests/cadastro-mestre-execution-data.test.js` (comentário e timeout de 10s no cenário de volume, CAD-VOL-01). Essa alteração também trouxe registros CAD-VOL-01 em AGENTS, manual técnico, backlog e `docs/auditoria/cadastro-mestre-payload-validacao.md`. Essas edições foram preservadas; não pertencem ao redesign. A suíte final inclui o estado compartilhado observado do teste.

## Arquivos desta entrega

- Apresentação: `assets/style.css`, `index.html`.
- Cores de apresentação: `view/ui-charts.js`, `view/ui-import.js`, `view/ui-import-op.js`.
- Documentação necessária: `README.md`, `AGENTS.md`, os três arquivos de `docs/manuais/`, `docs/ux/componentes.md`, `docs/auditoria/README.md`, `docs/auditoria/backlog-priorizado.md` e este registro.

`VISION.md` e `ROADMAP.md` foram revisados e preservados: princípios, prioridades e iniciativas funcionais não mudaram. [Referência única de componentes/tokens](../ux/componentes.md).

Sem commit, push, deploy, acesso remoto ao banco ou alteração de dependências. Aprovação visual permanece humana.
