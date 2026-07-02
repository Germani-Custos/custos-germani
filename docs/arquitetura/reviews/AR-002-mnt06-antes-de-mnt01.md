# AR-002 — MNT-06 antes de MNT-01

## Objetivo

Registrar permanentemente o raciocínio arquitetural que levou à priorização de **MNT-06** antes de **MNT-01** após a reavaliação do backlog de 2026-07-02.

Este documento não propõe alteração de código, comportamento, modelo de dados ou backlog. Ele preserva a decisão arquitetural que orienta a próxima sequência de trabalho.

## Contexto

A reavaliação de 2026-07-02 não colocou MNT-06 acima de MNT-01 porque MNT-06 tenha maior impacto final que o fatiamento do `view/ui-controller.js`.

A decisão foi mais específica: **MNT-06 é o menor ajuste arquitetural capaz de reduzir ambiguidade no contrato de importação antes de iniciar uma refatoração grande da UI**.

A nova ordem do backlog prioriza itens que:

- reduzem risco de regressão;
- desbloqueiam refatorações futuras;
- preservam contratos existentes;
- aumentam velocidade investigativa sem mudança funcional desnecessária.

A Onda 3 foi posicionada como preparação de contratos antes de refatorar, com o objetivo de reduzir ambiguidade e remover divergências pequenas antes de fatiar módulos grandes.

## Hipótese inicial

A hipótese principal da reavaliação era que **MNT-01** deveria subir de prioridade porque o `view/ui-controller.js` se tornou o maior multiplicador de risco arquitetural.

Esse arquivo concentra:

- bootstrap;
- navegação;
- upload;
- preview;
- mapeamento de importação;
- busca direta;
- filtros em cascata;
- relatório;
- tabela investigativa;
- chips de filtro;
- drill-through;
- exportação XLSX;
- gráficos Chart.js.

A hipótese foi considerada majoritariamente correta: MNT-01 é de fato o eixo destravador para itens como `PERF-01`, `MNT-03`, `SEC-02` e parte de `PERF-02`/`VAL-02`.

Porém, a investigação mostrou que **MNT-01 não deveria começar antes de eliminar uma ambiguidade pequena e crítica no fluxo de importação**.

Essa ambiguidade é MNT-06.

## Investigação realizada

A investigação comparou a arquitetura atual dos caminhos de importação e seus contratos operacionais.

Foram analisados:

- o fluxo vivo de importação em `view/ui-controller.js`;
- o caminho legado/órfão `mapRowsToPayload()` em `core/spreadsheet-engine.js`;
- os contratos de gravação em `src/services/api.js`;
- a matriz de contratos UI → API;
- a auditoria de manutenibilidade;
- a ordem reavaliada do backlog.

A pergunta investigativa foi:

> Antes de fatiar o `ui-controller`, existe alguma ambiguidade pequena, localizada e de alto risco que possa contaminar a extração do fluxo de importação?

A resposta encontrada foi: **sim**.

## Evidências encontradas

### 1. Existem dois caminhos conceituais para gerar payload de importação

Hoje há um caminho ativo e um caminho legado/órfão.

#### Caminho ativo

O caminho realmente usado está em `view/ui-controller.js`:

1. lê a planilha;
2. detecta cabeçalhos;
3. confirma o mapeamento;
4. monta o preview;
5. cria manualmente o payload a partir de `preview.validRows`;
6. chama `api.importarHistoricoCustosComLog(payload, { dataReferencia })`.

Esse fluxo é operacionalmente vivo.

#### Caminho legado/órfão

O caminho paralelo está em `core/spreadsheet-engine.js`, na função `mapRowsToPayload()`.

Essa função também:

- mapeia linhas da planilha;
- valida mapeamento obrigatório;
- normaliza `data_referencia`;
- normaliza `codigo_produto`;
- normaliza descrição;
- faz parsing monetário;
- produz registros no contrato de gravação de `historico_custos`.

O problema é que esse caminho não participa do fluxo vivo da aplicação.

### 2. A auditoria já classifica esse ponto como caminho morto e divergente

A auditoria de manutenibilidade identifica MNT-06 como:

> Caminho de importação morto e divergente.

A evidência registrada é que `mapRowsToPayload` não é importado no fluxo ativo, enquanto a importação real monta payload em `handleImport`/`buildImportPreview`.

Logo, existem dois geradores de payload, mas apenas um deles é executado pela aplicação.

### 3. O payload de importação é contrato arquitetural, não detalhe de UI

O payload de importação atravessa o núcleo operacional do sistema:

```text
Planilha ERP/SAP
→ normalização/validação
→ fato historico_custos
→ dicionário de produtos
→ cascata
→ relatório
→ drill-through
→ alertas por criado_em
→ exportação
```

Por isso, a existência de dois caminhos para formar esse payload cria risco sobre a base inteira de investigação.

### 4. Há validações distribuídas em camadas com fronteiras pouco claras

Atualmente, a definição de “linha importável válida” pode aparecer em três pontos:

- `buildImportPreview`, na UI;
- `mapRowsToPayload`, no core, embora órfão;
- `importarHistoricoCustosComLog`, na API.

O fluxo ativo faz preview e payload em etapas acopladas à UI. A API valida novamente, contabiliza falhas linha a linha e persiste. O caminho legado também valida, mas não é chamado.

Isso cria ambiguidade conceitual antes de `VAL-02`, que pretende consolidar um validador único de linha de custo.

### 5. Há risco sobre o contrato VAL-01

VAL-01 estabilizou a normalização canônica de `codigo_produto`.

O fluxo ativo normaliza `codigo_produto` no preview e a API normaliza novamente antes de persistir. O caminho legado também possui normalização própria.

Enquanto houver dois caminhos conceituais de payload, qualquer refatoração do fluxo de importação pode quebrar ou duplicar a aplicação desse contrato.

### 6. A importação correta precisa preservar `log_importacao`

O contrato operacional vivo é `api.importarHistoricoCustosComLog(payload, { dataReferencia })`.

Esse método:

- cria registro em `log_importacao`;
- valida linha a linha;
- contabiliza linhas importadas e linhas com erro;
- garante produtos no dicionário;
- grava `historico_custos` em chunks;
- fecha o log ao final.

Qualquer caminho alternativo de payload que não deixe explícito esse contrato aumenta risco de regressão operacional.

### 7. A importação correta preserva FATO × DIMENSÃO

Antes de gravar na fato `historico_custos`, a API garante os produtos no dicionário.

Isso preserva a arquitetura obrigatória do projeto:

- fato: `historico_custos`;
- dimensões: `dicionario_produtos`, `categorias_origem`, `categorias_familia`, `categorias_agrupamento`.

Unificar o caminho de importação reduz risco de uma refatoração criar atalho que trate a gravação de histórico como simples upsert isolado.

### 8. A importação correta preserva a semântica temporal

A importação carrega `data_referencia` como competência operacional.

O evento de entrada no sistema é `criado_em`.

Essa separação é crítica porque:

- `data_referencia` define o período operacional analisado;
- `criado_em` define última e penúltima importação;
- alertas, comparação de importações e drill-through dependem de não misturar esses eixos.

Um caminho duplicado de payload aumenta o risco de tratar `data_referencia` de forma diferente durante refatorações.

## Comparação MNT-06 × MNT-01

### MNT-01

MNT-01 é a refatoração estrutural maior.

Seu objetivo é fatiar `view/ui-controller.js` por fluxo, preservando comportamento:

- bootstrap/navegação;
- importação;
- filtros/relatório;
- fila investigativa;
- drill-through;
- exportação;
- gráficos.

MNT-01 desbloqueia diretamente ou parcialmente:

- `PERF-01`;
- `MNT-03`;
- `SEC-02`;
- `PERF-02`;
- parte de `VAL-02`.

Portanto, MNT-01 continua sendo o maior destravador arquitetural da UI.

### MNT-06

MNT-06 é menor, mais localizado e prepara o terreno para MNT-01.

Seu objetivo é unificar os dois caminhos de importação e remover `mapRowsToPayload` como caminho órfão/divergente.

MNT-06 reduz ambiguidade antes de MNT-01 porque deixa claro:

- qual caminho gera payload de importação;
- qual contrato UI → API deve ser preservado;
- onde a normalização de `codigo_produto` precisa permanecer;
- que importação deve continuar passando por `log_importacao`;
- que a gravação deve continuar respeitando FATO × DIMENSÃO;
- que `data_referencia` e `criado_em` continuam semanticamente separados.

### Por que MNT-06 vem antes

Executar MNT-01 antes de MNT-06 faria a extração da importação acontecer sobre uma dúvida aberta:

- o novo módulo de importação deve preservar o payload inline atual?
- deve chamar `mapRowsToPayload`?
- deve mover parte do preview para o core?
- deve manter validação duplicada até VAL-02?
- deve remover exports não usados agora ou depois?

Essas decisões desviariam MNT-01 de sua intenção original: **extração mecânica por fluxo, sem alteração funcional**.

MNT-06 reduz o custo cognitivo e o risco de revisão de MNT-01.

## Conclusão

A arquitetura do projeto fica melhor se MNT-06 acontecer antes de MNT-01 porque **MNT-06 fecha uma ambiguidade de contrato pequena, mas crítica, antes de uma refatoração grande**.

MNT-01 deve fatiar o `view/ui-controller.js`, que hoje concentra quase todos os fluxos da aplicação. Porém, dentro desse módulo está o fluxo vivo de importação, e a arquitetura ainda possui um segundo gerador de payload em `core/spreadsheet-engine.js` que a auditoria classifica como morto e divergente.

Se MNT-01 vier antes, a extração da importação será feita sobre uma dúvida aberta: **qual caminho representa o contrato correto de payload?**

Isso aumenta o risco de regressão em:

- `codigo_produto`;
- validação linha a linha;
- `log_importacao`;
- upsert por `codigo_produto,data_referencia`;
- separação FATO × DIMENSÃO;
- distinção temporal `data_referencia` × `criado_em`.

Se MNT-06 vier antes, MNT-01 pode ser executado como deveria: uma extração mecânica por fluxo, preservando comportamento, com contrato de importação já unificado, menor superfície de revisão e menor risco de quebrar a velocidade investigativa.

## Impacto na ordem do backlog

MNT-06 tornou-se o primeiro item aberto porque:

- é menor que MNT-01;
- é localizado;
- remove caminho morto/divergente;
- reduz risco sobre o contrato VAL-01;
- prepara a extração da importação em MNT-01;
- evita que MNT-01 misture fatiamento estrutural com decisão de contrato de payload.

A ordem resultante preserva a lógica:

```text
MNT-06
→ remove ambiguidade no contrato de importação

MNT-07 / MNT-05
→ tornam limites e contratos mais explícitos

MNT-01
→ fatia a UI com menos decisões abertas

PERF-01 / MNT-03 / SEC-02 / PERF-02
→ evoluem sobre UI mais modular

MNT-02 / VAL-02
→ consolidam API/importação/validação compartilhada
```

## Consequências para as próximas ondas

### Para MNT-01

MNT-01 fica mais simples porque a importação a ser extraída terá um contrato único.

O fatiamento poderá focar em mover responsabilidades sem decidir simultaneamente qual gerador de payload é correto.

### Para VAL-02

VAL-02 fica mais seguro porque não precisará consolidar uma função órfã como terceira fonte de verdade.

Depois de MNT-06, a validação única de linha de custo poderá nascer no limite correto entre preview e API.

### Para MNT-02

MNT-02 fica mais objetivo porque a futura separação da API em fachada, validação, enriquecimento e client poderá preservar com mais clareza o contrato de importação vivo.

### Para PERF-02

PERF-02 fica mais previsível porque cache e invalidação por importação passam a depender de um fluxo de importação menos ambíguo.

### Para MNT-03 e SEC-02

MNT-03 e SEC-02 ficam indiretamente mais seguros porque os dados importados alimentam filtros, selects, tabela e exportação.

Com importação unificada, fica mais previsível de onde vêm `descricao`, `codigo_produto` e demais valores renderizados.

## Referências aos arquivos analisados

- `docs/auditoria/backlog-priorizado.md`
  - Reavaliação arquitetural de 2026-07-02.
  - Motivo da subida de MNT-06.
  - Dependências entre MNT-01, MNT-06, MNT-02, VAL-02, PERF-01, PERF-02, MNT-03 e SEC-02.

- `docs/auditoria/manutenibilidade.md`
  - Descrição de MNT-01 como god module.
  - Descrição de MNT-06 como caminho de importação morto e divergente.
  - Critério de aceite para unificação do caminho de payload.

- `view/ui-controller.js`
  - Fluxo ativo de importação.
  - `handleImport()`.
  - `buildImportPreview()`.
  - Montagem inline do payload a partir de `preview.validRows`.
  - Chamada para `api.importarHistoricoCustosComLog()`.

- `core/spreadsheet-engine.js`
  - `mapRowsToPayload()`.
  - Normalização e validação legadas do payload.
  - Funções auxiliares associadas ao caminho órfão.

- `src/services/api.js`
  - `importarHistoricoCustosComLog()`.
  - Criação e fechamento de `log_importacao`.
  - Validação linha a linha.
  - Normalização de `codigo_produto`.
  - Garantia de produtos no dicionário.
  - Upsert em `historico_custos` por `codigo_produto,data_referencia`.

- `docs/arquitetura/matriz-contratos-operacionais.md`
  - Contrato UI → API para importação resiliente.
  - Contratos relacionados a histórico, drill-through e comparação por `criado_em`.

- `docs/manuais/manual-tecnico.md`
  - Registro de que `view/ui-controller.js` concentra todos os fluxos de UI.
  - Registro de que `importarHistoricoCustosComLog()` é o método operacional de importação.
  - Observação de que há caminho legado de payload e que MNT-06 deve preceder refatoração.
