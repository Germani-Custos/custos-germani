# OP × CUSTO — validação da Fase 2

**OP-CUSTO-F2 · conferência em 26/10/2026 · base `44a4b64` · implementação local, sem publicação.**

**Estado do aceite:** implementação e verificações automatizadas aprovadas; validação visual/manual ainda pendente por bloqueio da ferramenta de navegador. Não declarar a Fase 2 integralmente concluída até conferir essa etapa. A autorização humana para a origem local já foi dada, mas a ferramenta continua informando bloqueio por permissão salva/política gerenciada.

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

O diff contém 18 arquivos. `view/ui-op.js`, `view/ui-table.js`, todos os engines, API, parser e arquivos de SQL/migrations permanecem sem alterações. VISION, regras gerais e backlog também permanecem intactos; nenhum item de correção mudou de status.

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

Implementação local disponível para revisão, **com aceite visual pendente**. Não declarar “FASE 2 CONCLUÍDA LOCALMENTE” enquanto essa pendência permanecer. Sem alteração de Supabase/dados/schema/migrations/RLS/Auth, motores, parser, API ou TOP-200. Sem commit, push ou deploy, e sem início automático de outra fase.
