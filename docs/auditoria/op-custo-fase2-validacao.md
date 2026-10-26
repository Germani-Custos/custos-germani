# OP × CUSTO — validação da Fase 2

**OP-CUSTO-F2 · conferência em 26/10/2026 · base `44a4b64` · implementação local, sem publicação.**

**Estado do aceite após a auditoria final sobre `e4a5c48`, em 26/10/2026:** Fase 2 tecnicamente concluída pela auditoria estática/automatizada adicional; aceite visual manual pendente por limitação de ambiente. Isso não equivale a validação visual realizada. A autorização humana para a origem local já foi dada, mas o navegador/preview permanece indisponível para essa conferência. Escopo, resultados e limites da revalidação estão na seção 6.

## 1. Arquivos e componentes

Criados:

- `view/ui-op-custo.js`: controller de apresentação, inclusão, filtros, paginação e dossiê, consumindo a Fase 1.
- `tests/ui-op-custo.test.js`: 37 testes do controller com motores reais e API simulada.
- `tests/fixtures/op-custo-context.js`: fatos sintéticos e resultados dos motores existentes.
- `tests/fixtures/op-custo-preview-server.mjs`: servidor de preview sintético, somente em `127.0.0.1:4185`, sem API/Supabase reais.
- Este relatório `docs/auditoria/op-custo-fase2-validacao.md`.

Alterados:

- `index.html`: entrada vinculada à competência e subpainel OP × CUSTO com visão geral, inclusão, fila e dossiê.
- `view/ui-controller.js`: integração do novo controller, sem alterar a lógica OP/Custo atual.
- `view/ui-dom.js`: referências dos quatro elementos de integração com OP.
- `assets/style.css`: estilos restritos à superfície nova, usando tokens existentes e rolagem interna.
- `README.md`, `ROADMAP.md`, `AGENTS.md`.
- `docs/arquitetura/op-custo.md`, `docs/arquitetura/matriz-contratos-operacionais.md`, `docs/arquitetura/indice-documentacao-kustos.md`.
- `docs/manuais/manual-operacao.md`, `docs/manuais/manual-tecnico.md`, `docs/manuais/manual-usuario.md`.

A implementação original da Fase 2 envolveu os 18 arquivos acima. A revalidação final altera somente este relatório. `view/ui-op.js`, `view/ui-table.js`, todos os engines, API, parser e arquivos de SQL/migrations permanecem sem alterações funcionais. VISION, regras gerais e backlog também permanecem intactos; nenhum item de correção mudou de status.

## 2. Consumo da Fase 1

Entrada: De e Até preenchidos explicitamente com o mesmo mês válido. Sem mês único, o botão fica oculto/desabilitado e o texto explica o bloqueio. Não há seleção automática do mês mais recente.

Fluxo: `api.getOpCustoContext({competencia})` → prioridade Custo pelo presenter existente `getOperationalPriority(resultadoOriginal)` → `analyzeOpCustoContext` → apresentação. A UI não acessa Supabase, não cria consultas por produto, não refaz indicadores, classificação ou relação e não usa a fila OP visível como fonte.

Overview recebe cobertura, fontes e diagnósticos do engine. A contagem dos rótulos relacionais é apenas uma apresentação das relações já classificadas. Totais mensais antecedem os filtros visuais. Fonte vazia confirmada é diferente de erro ou contexto incompleto; falha não apresenta relatório parcial nem cobertura zero.

Se houver B/C, a escolha de incluir sem correspondência ou somente A é explícita e reversível. Enquanto pendente não há fila. Lados ausentes recebem textos próprios, sem zero ou estabilidade fictícia. Custo real zero permanece zero. A fila usa o conjunto completo e mostra páginas visuais de 50; TOP-200 existente não é alterado.

Prioridade OP e prioridade Custo são apresentadas separadamente. A ordem OP usa a posição original observada; a ordem Custo reutiliza seu comparador existente. Sem score conjunto, novos pesos ou narrativa de recorrência da fila legada. A busca por código usa o normalizador canônico e o engine local, podendo produzir D sem novo GET nem alteração de A/B/C.

O dossiê conserva eventos OP individuais, IDs, estágio/origem/unidade/lote disponível, fatos, indicadores e resultados originais. A série de Custo conserva snapshots, componentes, datas de referência completas e timestamps originais, referência/candidatos/base e motivos de ambiguidade. Relação, evidências e limitações vêm do engine. Hipótese OP permanece rotulada; não vira causa do custo.

Voltar conserva DOM/estado da OP, campos/filtros/motivo/produto, dossiê e posição compatível. Voltar do dossiê cruzado conserva a fila local. Geração de leitura impede respostas antigas de reabrir ou substituir outro contexto. Atualizar inicia nova leitura e nova escolha de inclusão.

## 3. Verificações executadas

Execução integral em 26/10/2026:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json
node scripts/build-web.mjs
git diff --check
```

- **782/782 testes aprovados em 46 arquivos.** Execução integral de 36,86 s; 37 testes novos de UI, sem alteração dos testes anteriores.
- Cenários novos: competência explícita/multi-mês bloqueado; chamada mensal correta; loading; rejeição/erro/integridade; contexto incompleto; fontes vazias; A/B/C e D explícito; escolha e exclusão reversíveis; inválidos em diagnóstico; ausência/zero; relação original; prioridades separadas; dossiê com múltiplos eventos/snapshots; empate; XSS; filtros locais; retorno e respostas obsoletas.
- Volume: teste com 1.201 produtos no contexto e teste com 1.001 produtos A/2.002 snapshots, incluindo busca fora da janela visual. Nenhum GET por produto/página visual.
- **Lint aprovado**, sem erros/warnings. O HTML é montado por builders que escapam os valores, em fronteira local documentada; descrições/IDs maliciosos são cobertos pelos testes de XSS.
- **Typecheck configurado aprovado**, sem emissão. O `jsconfig.json` vigente cobre `core/`/API/utilitários/configuração e não inclui `view/`; não apresentar esse resultado como checagem estática integral da UI. O novo controller foi carregado/exercitado pelos testes e pelo lint, sem ampliar tooling fora do escopo.
- **Build local aprovado**, com configuração pública de teste (`https://example.supabase.co`, `test-anon-key`) apenas no processo; não é publicação nem artefato configurado para produção.
- **`git diff --check` aprovado**; IDs usados pelo controller conferidos como presentes e únicos no HTML. Links e escopo do diff conferidos ao encerrar.

Dados dos testes novos são sintéticos. A suíte existente utiliza suas fixtures/bancos locais descartáveis. Nenhuma consulta ou escrita no Supabase real foi necessária, e os resultados não são validação autenticada em produção.

## 4. Validação visual/manual — pendente

O preview foi preparado e iniciado com:

```powershell
node tests/fixtures/op-custo-preview-server.mjs
```

URL: `http://127.0.0.1:4185/`. Ele serve o HTML/CSS/controllers reais com API simulada somente nesse servidor. Há identificação de dados sintéticos; a sessão do preview não altera Auth real. Não usar esse servidor como implantação.

Tentativas de abrir essa mesma origem pelo navegador integrado foram recusadas, inclusive após autorização explícita do usuário e na retomada de 26/10. A ferramenta informa: **“A saved user permission setting blocks this action”** e **“A saved permission or managed policy denies access.”** Não foi tentado contorno por outra origem, navegador, CDP ou execução indireta.

Não há captura visual, inspeção de layout responsivo ou percurso manual concluído. Os testes automatizados com DOM simulado não substituem essa evidência.

Roteiro de aceite ainda necessário:

1. OP → selecionar De = Até `2026-10` → botão Outubro/2026 → visão geral A/B/C e escolha explícita.
2. Incluir sem correspondência → conferir 001 (A, dois eventos e dois snapshots), 002 (B) e 003 (C).
3. Abrir 001 → conferir estágios, datas completas, referência/base, prioridades separadas, relação e limitações → voltar à fila → voltar à OP com filtros/motivo/produto/dossiê/posição preservados.
4. Escolher somente A e alterar inclusão; investigar código válido sem fatos para D, sem nova consulta.
5. Competência `2026-09`: fonte Custo vazia; `2026-08`: fonte OP vazia; `2026-07`: 1.001 produtos A e 2.002 snapshots. Conferir paginação/consulta além da primeira janela.
6. Conferir largura desktop e viewport estreita: tabela com rolagem interna, cabeçalhos e foco utilizáveis, sem redesign das telas anteriores.

O bloqueio restante depende da permissão efetiva da ferramenta ou dessa conferência realizada pelo usuário. Não é necessária outra decisão de regra de negócio nem nova autorização para banco/publicação.

## 5. Limites e estado de entrega

Nenhuma divergência exigiu mudar regra ou contrato de engine. Os nomes apresentados seguem o contrato real da Fase 1; prioridade Custo é fornecida pelo presenter existente, conforme previsto. Nenhuma soma de OP, média de taxa/percentual, score/ranking conjunto, causalidade ou comparação multi-mês foi acrescentada.

Implementação local tecnicamente pronta para aceite conforme a auditoria adicional da seção 6, **com aceite visual manual pendente**. A conclusão técnica não encerra a conferência visual. Sem alteração de Supabase/dados/schema/migrations/RLS/Auth, motores, parser, API ou TOP-200. Sem commit, push ou deploy, e sem início automático de outra fase.

## 6. Validação final estática/automatizada, sem alteração funcional

**Data:** 26/10/2026. **Checkout inspecionado:** `e4a5c48`, inicialmente sem alterações locais. Por solicitação expressa, nenhum recurso, regra, teste ou arquivo de implementação foi criado, modificado ou refatorado nesta revalidação. Somente este relatório foi atualizado. O build gera seu artefato local ignorado pelo Git.

> Validação visual manual não realizada devido à indisponibilidade do navegador/preview no ambiente de execução. A implementação foi submetida a auditoria estática/automatizada adicional.

### 6.1 Arquivos analisados e confronto com o contrato

Foram inspecionados os 18 arquivos da seção 1: controller novo, integração/controller/refs DOM, HTML/CSS, teste UI, duas fixtures de validação e documentação afetada. O confronto documental incluiu expressamente `docs/arquitetura/op-custo.md` (contrato e seção 17), `docs/auditoria/op-custo-fase1-validacao.md` e este relatório.

Também foram conferidos os pontos de contrato/dependência em `core/op-custo-engine.js`, `src/services/api.js`, `view/ui-op.js`, `view/ui-table.js`, `view/ui-utils.js`, `tests/op-custo-engine.test.js`, `tests/api-op-custo-context.test.js`, `jsconfig.json`, `package.json` e `vitest.config.js`. Essas dependências foram somente lidas/exercitadas; não foram alteradas. O diff entre a base da Fase 1 `44a4b64` e o checkout atual não contém modificações em engines, API, parser, OP original, presenter/ranking, SQL ou migrations.

| Ponto de auditoria | Evidência estática/automatizada | Resultado |
|---|---|---|
| Entrada pela OP | `index.html:view-op`, refs de `ui-dom.js` e `createOpCustoController`/`opCusto.bind()` no controller principal | Integrado ao subpainel, mantendo a OP montada |
| Competência explícita e botão | `selectedMonth` exige De e Até preenchidos/iguais e usa `getOpCustoPeriod`; `updateEntry` controla rótulo, ocultação e disabled | Mês selecionado pelo usuário; sem escolha automática; multi-mês bloqueado |
| Contexto mensal | `reload` chama somente `getOpCustoContext({competencia})`, sem transportar filtros ou linhas visíveis de OP | Fonte completa da Fase 1; sem TOP-200/primeiros 1.000 como universo |
| Loading e integridade | `hideResults` antecede a leitura; erro da API, versão/mês/qualidade incompatíveis ou engine incompleto impedem apresentação | Loading explícito; nenhum contexto rejeitado tratado como relatório válido |
| Erro de leitura/página/count/ID | Testes da API exercitam falhas nas duas fontes; testes UI exercitam códigos de erro, rejeição de transporte e contexto incompleto | Sem dataset parcial, escolha de inclusão ou cobertura zero fictícia |
| Fonte vazia versus indisponível | Metadata `completa_vazia` é exibida apenas no resultado completo; qualquer erro segue o tratamento de indisponibilidade | Vazio confirmado é distinguido de falha de leitura |
| Inclusão A/B/C | `askInclusion` impede fila até escolha; `choose` e `Alterar inclusão` permitem incluir B/C ou somente A; visão geral mantém totais mensais | Escolha explícita e reversível; nenhuma exclusão silenciosa |
| Fila e paginação | Filtro/ordem aplicados a `resultado.produtos`, seguidos de paginação visual de 50; testes com 1.201 produtos e com 1.001 A/2.002 snapshots | Contexto completo preservado; página visual não reduz análise |
| Busca D | `searchProduct` reutiliza normalizador canônico e chama o engine local com `produtoSolicitado`; teste confirma um único GET | D somente por consulta explícita; A/B/C globais preservados |
| Dossiê OP | `p.op.eventos.map(event)` mostra IDs, OP, produto, estágio/código, origem, unidade, lote, fatos, indicadores e resultados individuais | Eventos preservados, sem criar OP mensal nem somar apontamentos/tempos |
| Dossiê Custo | `p.custo.snapshots.map` mostra cada ID/data/importação/componentes, referência/candidatos/base e qualidade/comparação | Série preservada; empate não recebe referência principal fictícia |
| Relações, evidências e limites | UI apresenta `relacao.rotulo`, `motivos`, `evidencias`, IDs e limitações recebidos; testes confrontam com a saída real do engine | Sem classificador paralelo, causalidade automática ou narrativa de recorrência legada |
| Prioridades | Adaptação reutiliza `getOperationalPriority`; ordem OP usa posição original; ordem Custo usa seu comparador existente | Escalas separadas, sem score, peso ou ranking conjunto novo |
| Retorno e concorrência | `close` restaura superfície/foco/scroll; retorno do dossiê conserva fila; `generation` invalida respostas antigas | Estado/campos preservados em código e testes; apresentação/foco reais ainda dependem de navegador |
| Segurança da apresentação | Escape dos rótulos/fatos e teste de XSS; inspeção de IDs/refs da marcação | Sem HTML ERP cru; controles ligados ao HTML existente |

### 6.2 Ausência de dados — confirmação A/B/C/D

- **A — OP + Custo:** ambos os domínios permanecem presentes com suas métricas/resultados/prioridades originais. Múltiplos eventos e snapshots continuam individuais.
- **B — OP sem Custo:** `custo:null` é apresentado como **Custo ausente / Sem custo correspondente nesta competência**. Não recebe R$ 0,00, estabilidade ou prioridade de custo fictícia.
- **C — Custo sem OP:** `op:null` é apresentado como **OP ausente / Sem apontamento OP correspondente nesta competência**. Não recebe quantidade, tempo ou prioridade OP zero.
- **D — nenhum dos dois:** nasce somente de busca explícita de código válido; apresenta ambos ausentes e o motivo original do engine. Não cria linhas D para todo o cadastro.

Os guardas de formatação distinguem `null`/`undefined`/vazio de zero real antes de usar `Number`/formatadores. Testes específicos confirmam custo total real zero e custo total ausente em snapshot existente. Ausência de comparação fica sem base; não vira variação percentual zero. Produtos sem um lado usam o motivo de ausência do contrato, sem converter isso em normalidade ou evidência relacional inventada.

### 6.3 Checks executados nesta auditoria final

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/vitest/vitest.mjs run tests/op-custo-engine.test.js tests/api-op-custo-context.test.js tests/ui-op-custo.test.js --maxWorkers=2
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json
node scripts/build-web.mjs
git diff --check
```

- **Suíte completa:** 782/782 testes, 46/46 arquivos; execução de 45,48 s, sem falhas.
- **OP × CUSTO específico:** 116/116 testes, três arquivos — engine 48, API 31, UI 37; execução de 5,76 s, sem falhas.
- **DOM:** os 37 testes UI existentes foram executados, assim como as demais suítes UI incluídas na execução completa. O harness é DOM simulado, com eventos/markup e motores reais; não é navegador, renderização visual ou prova de layout.
- **Lint:** aprovado, sem erros/warnings.
- **Typecheck:** aprovado no escopo vigente do `jsconfig.json`; `view/` não está incluído nessa configuração. A aprovação não deve ser descrita como checagem estática de tipos de toda a UI.
- **Build:** aprovado, usando somente URL/chave públicas de teste no processo, sem publicação. Nenhuma dependência ou configuração de produção foi alterada.
- **Verificação estrutural adicional:** 24 referências diretas de controles conferidas no HTML, IDs únicos, refs de integração e `opCusto.bind()` presentes; sem acesso Supabase/RPC direto, chamada de classificação legada ou uso da fila TOP-200 no novo controller.
- **Diff check:** aprovado. Escopo final restrito a `docs/auditoria/op-custo-fase2-validacao.md`; código, testes, engine/API/TOP-200 e demais documentos preservados.

Não há suíte de screenshot/browser configurada em `package.json`/`vitest.config.js`. Nenhum browser, screenshot, preview visual, consulta autenticada ou escrita Supabase foi utilizado nesta auditoria. As execuções usaram testes e fixtures locais existentes, sem adicionar testes nem simular que houve conferência visual.

### 6.4 Divergências e riscos visuais residuais

**Nenhuma divergência funcional foi identificada nos pontos inspecionados e cenários executados em relação ao contrato vigente da Fase 1 e à seção 17 da arquitetura.** As diferenças de nomenclatura por alias e a prioridade Custo fornecida pelo presenter já estão documentadas; não exigiram nova regra. Os textos anteriores que tratam a UI como futura registram as fases históricas e são explicitamente sucedidos pela seção 17, sem alterar os motores.

O limite de cobertura do typecheck e o uso de DOM simulado são limitações de verificação, não foram tratados como provas visuais nem corrigidos oportunisticamente. Nenhuma divergência foi usada para justificar alteração funcional.

Sem navegador não é possível comprovar: aparência final, alinhamento/altura de linhas, truncamento ou sobreposição de conteúdo extenso, contraste/legibilidade percebida, responsividade nos breakpoints, comportamento real de cabeçalhos sticky/rolagem horizontal, foco visível, navegação por teclado/leitor de tela, controle nativo de competência e restauração perceptível de scroll/foco entre browsers. O CSS e as intenções de acessibilidade foram lidos; esses resultados visuais permanecem **não verificados**, sem serem apresentados como defeitos confirmados.

### 6.5 Conclusão técnica

**FASE 2 TECNICAMENTE CONCLUÍDA — aceite visual manual pendente por limitação de ambiente.**

A implementação está tecnicamente pronta para aceite com a ressalva visual expressa acima. Esta conclusão não afirma que a validação visual ocorreu, não autoriza publicação e não inicia outra fase. Somente este relatório foi alterado; nenhuma mudança funcional, feature, refatoração, alteração de engine/API/TOP-200, banco/schema/migration/RLS/Auth, commit, push ou deploy.
