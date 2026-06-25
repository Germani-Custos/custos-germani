# Kustos Germani — Motor de Investigação de Custos

Sistema operacional de auditoria analítica de custos. Não é um dashboard genérico.

É um cockpit investigativo que transforma planilhas ERP em velocidade de investigação.

---

## Documentos estratégicos

- `VISION.md`: identidade do produto, princípios e direção estratégica
- `ROADMAP.md`: fases entregues e próximas, com raciocínio de priorização
- `AGENTS.md`: guia para agentes e desenvolvedores (regras técnicas e de produto)
- `docs/arquitetura/indice-documentacao-kustos.md`: índice da documentação técnica
- `docs/arquitetura/matriz-contratos-operacionais.md`: auditoria de contratos UI ↔ API ↔ banco ↔ engines

---

## 1. Visão Geral

O sistema importa planilhas de custo (origem ERP/SAP), armazena histórico temporal e oferece investigação analítica por produto com filtros em cascata e drill-through de eventos.

**Princípio central**: o investigador deve encontrar o problema em segundos, não em minutos.

---

## 2. Fluxo Operacional

### Importação

1. Selecionar data de referência (competência operacional)
2. Arrastar planilha `.xlsx` ou clicar na área de upload
3. Confirmar mapeamento de colunas (detecção automática com fuzzy matching)
4. Revisar preview linha a linha (🟢 válida / 🟡 atenção / 🔴 erro)
5. Confirmar importação — somente linhas sem erro são gravadas

### Auditoria

1. **Busca direta** (novo): digitar código ou descrição — acesso imediato sem navegar pela hierarquia
2. Ou usar filtros em cascata: Origem → Família → Agrupamento → Item
3. Definir período (dtInício + dtFim) — relatório atualiza automaticamente
4. Clicar em qualquer linha da tabela → abre **drill-through** com histórico completo de importações
5. Usar KPIs clicáveis para filtrar rapidamente:
   - **Itens analisados**: todos
   - **Alertas (>5%)**: variações absolutas ≥ 5% entre as duas últimas importações (`criado_em`), usando a mesma regra do filtro rápido/exportação
   - **Mudanças de Regime**: produtos que eram ESTÁVEL e ficaram instáveis
   - **Média de variação**: variações positivas
6. Exportar relatório operacional para Excel (XLSX com abas `Contexto` e `Fila Investigativa`)

---

## 3. Arquitetura de Dados

### Separação Fato × Dimensão

**Tabela fato**: `historico_custos`
- `codigo_produto` (TEXT)
- `descricao` (TEXT) — snapshot no momento da importação
- `custo_variavel` (NUMERIC 18,4)
- `custo_direto_fixo` (NUMERIC 18,4)
- `custo_total` (NUMERIC 18,4)
- `data_referencia` (DATE) — **competência operacional** (quando o custo é válido)
- `criado_em` (TIMESTAMPTZ) — **evento de importação** (quando entrou no sistema)
- UNIQUE: `(codigo_produto, data_referencia)`

**Dimensão produtos**: `dicionario_produtos`
- `codigo_produto` (TEXT) — chave de negócio
- `origem_id` (UUID) → `categorias_origem.id`
- `familia_id` (UUID) → `categorias_familia.id`
- `agrupamento_cod` (TEXT) → `categorias_agrupamento.codigo`

**Dimensões de categoria**: `categorias_origem`, `categorias_familia`, `categorias_agrupamento`
- `id` (UUID): chave técnica de integração
- `codigo` (TEXT): chave de negócio
- `descricao` (TEXT): rótulo exibido na UI

### Semântica Temporal (importante)

O sistema tem dois eixos de tempo distintos:

| Campo | Uso |
|---|---|
| `data_referencia` | Período de competência do custo — usado para análise temporal |
| `criado_em` | Data de importação — usado para identificar "última importação" vs. "penúltima" |

Estes conceitos nunca devem ser confundidos. O drill-through exibe os dois explicitamente.

---

## 4. Capacidades Analíticas

### Score de Instabilidade

Média das variações percentuais absolutas entre pontos consecutivos no período:
- `ESTÁVEL`: score < 3%
- `OSCILANDO`: score 3–8%
- `MUITO INSTÁVEL`: score ≥ 8%


### Fila Investigativa (Tabela Principal)

A tabela analítica evoluiu para uma **fila investigativa operacional** com hierarquia de leitura:

- **Produto** (código + descrição)
- **Variação** (delta monetário + %)
- **Prioridade operacional** (`🔴 Crítico`, `🟠 Atenção`, `🟡 Monitorar`, `🟢 Estável`)
- **Regime** (com destaque forte para mudança de regime)
- **Contexto investigativo resumido** (pré-interpretação automática)

Dados detalhados (sem perda analítica) ficam em **expansão por linha**: penúltimo custo, custo inicial/final, score de instabilidade e os dois eixos temporais explícitos:

- **Importado em (`criado_em`)** = evento de importação
- **Competência (`data_referencia`)** = validade operacional do custo

Refinamentos de UX investigativa (mai/2026):
- Header da tabela com comportamento **sticky** para manter contexto durante rolagem.
- **Chips de filtros ativos removíveis** para reduzir carga cognitiva e facilitar pivôs rápidos de investigação.
- Hierarquia de leitura reforçada por linha: foco em produto + criticidade + variação + regime; detalhes secundários apenas em expansão sob demanda.
- Contexto investigativo passa a antecipar sinais como "2ª alta consecutiva", "2ª queda consecutiva" e "oscilação crescente", reduzindo interpretação manual.

### Detecção de Mudança de Regime

Produto com ≥ 4 pontos no período: compara instabilidade da primeira metade vs. segunda metade.
- `ESTÁVEL` na primeira metade + `OSCILANDO` ou `MUITO INSTÁVEL` na segunda → `mudouRegime = true`
- Aparece como KPI "Mudanças de Regime" e coluna "⚡ Mudou" na tabela

### Drill-through de Eventos

Histórico completo de importações para o produto selecionado:
- Competência (data_referencia): período de vigência
- Importado em (criado_em): data/hora da entrada no sistema
- Custo variável, direto fixo e total
- Delta monetário e percentual vs. registro anterior
- Destaque em vermelho para variações ≥ 5%

### Evolução Temporal de Custos (gráfico)

Semântica investigativa do gráfico temporal:
- Eixo temporal: **competência** (`data_referencia`)
- Eixo de atualização: usa `criado_em` apenas para escolher o **registro mais recente por produto+competência**
- Quando há produto selecionado: plota **custo unitário do produto** por competência (sem soma acumulada)
- Quando não há produto selecionado: plota média agregada por competência com base no snapshot mais recente de cada produto

Isso evita inflação por soma indevida de múltiplas importações da mesma competência.


### Exportação Investigativa (XLSX)

A exportação foi desenhada para preservar contexto operacional e acelerar handoff investigativo:

- Gera duas abas: **`Contexto`** (filtros/período/metadata da execução) e **`Fila Investigativa`** (itens priorizados para ação).
- Sem ordenação manual ativa, aplica ordenação automática por prioridade investigativa: **criticidade → mudança de regime → magnitude → reincidência → instabilidade**.
- Cada linha exportada inclui **contexto pré-interpretado** para reduzir leitura manual posterior.
- O nome do arquivo inclui o **período analisado** para rastreabilidade.

### TOP VARIAÇÕES

Compara automaticamente os dois últimos eventos de importação (`criado_em`):
- TOP 5 maiores aumentos de custo
- TOP 5 maiores reduções de custo

### Alerta de Importação

Variação absoluta ≥ 5% entre os dois últimos eventos de importação (`criado_em`) de um produto → badge ALERTA, usando a mesma regra do KPI/filtro.

---


### Escalabilidade operacional (atualização de 11/05/2026)

- Importação com **bulk upsert em chunks (400 linhas)** para reduzir requisições HTTP e manter tolerância parcial de erros.
- Garantia de produtos no dicionário em **lote** antes da escrita da fato `historico_custos`.
- Consultas de comparação entre importações com recorte menor de eventos (`criado_em`) para reduzir carga de leitura.
- Script de índices essenciais em `sql/2026-05-11_indices_performance_operacional.sql` para acelerar drill-through, filtros e comparações temporais.


### Configuração operacional em deploy estático

- O runtime do frontend lê configurações prioritariamente de `runtime-config.js` (`window.__ENV__`).
- Em Vercel, `vercel.json` executa `node scripts/generate-runtime-config.mjs` para gerar o arquivo com as variáveis reais de ambiente.
- Fallbacks de compatibilidade permanecem ativos (`window.__RUNTIME_CONFIG__`, `import.meta.env`, `<meta name="VITE_*">`).
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são obrigatórias e validadas no build e no bootstrap.

## 5. Módulos

| Arquivo | Responsabilidade |
|---|---|
| `view/ui-controller.js` | Orquestração principal (bootstrap, fluxo entre módulos, ciclo investigativo) |
| `view/ui-state.js` | Estado central da UI (filtros, visão da fila e referências de gráficos) |
| `view/ui-dom.js` | Mapeamento único de referências do DOM para reduzir acoplamento |
| `view/ui-utils.js` | Utilitários puros de formatação, debounce, escape e feedback visual |
| `core/spreadsheet-engine.js` | Parsing de planilhas, detecção fuzzy de colunas, normalização |
| `core/report-engine.js` | Cálculos analíticos, cascata, detecção de regime |
| `src/services/api.js` | Camada única de acesso Supabase |
| `services/api.js` | Shim de compatibilidade (re-exporta de src/services) |
| `assets/style.css` | Estilos globais |
| `index.html` | Estrutura HTML e carregamento de dependências |

### Dependências externas (CDN)

- `XLSX.js`: leitura e exportação de planilhas Excel
- `Chart.js`: gráficos temporais e de comparação
- `SweetAlert2`: diálogos de confirmação e preview
- `Supabase JS v2`: acesso ao banco de dados
- `RemixIcon`: ícones

---

## 6. Regras de Identidade

- **Backend/persistência**: lógica via código de negócio + FKs técnicas
- **Frontend**: exibe `descricao` — UUID nunca é semântica de negócio na UI
- **Categorização**: nunca depende de texto livre — sempre opera por código/FK
- **Credenciais**: nunca armazenadas em código-fonte

---

## 7. Importação — Comportamento

### Colunas obrigatórias (5)

| Campo | Aliases detectados automaticamente |
|---|---|
| `codigo_produto` | produto, codigo, cod, item, cod produto |
| `descricao` | descrição, desc |
| `custo_variavel` | custo variavel, custo var, variavel |
| `custo_direto_fixo` | fixo, direto fixo, custo fixo |
| `custo_total` | total, custo total, vl total, valor total |

### Parsing numérico

- Remove separadores de milhar e símbolo R$
- Converte vírgula decimal para ponto
- Arredonda para 4 casas decimais (exibição em 2-4 casas)
- Trata notação científica em códigos de produto

### Normalização de código de produto

`normalizeCodigoProduto()` é a função canônica para todo identificador de produto. O mesmo código é normalizado antes do preview, do payload de importação, da validação API, dos filtros/cascata, do relatório, do drill-through e da exportação. Ela remove espaços/caracteres invisíveis, preserva zeros à esquerda quando vêm como texto, expande notação científica do Excel e bloqueia códigos ambíguos em vez de persistir uma chave parcialmente mutada. Logs de mutação são emitidos apenas via `debugLog` quando `VITE_ENABLE_VERBOSE_LOGS=true`, com amostras limitadas.


### Regra operacional de alerta (>5%)

`isAlertaCritico()` / `classifyAlert()` em `core/report-engine.js` é a fonte única para alerta investigativo. A regra usa a variação percentual entre as duas últimas importações (`variacaoTemporal`, eixo `criado_em`) e considera alerta quando `abs(variação) >= 5`, sem arredondar antes da comparação. Altas e quedas entram no mesmo conjunto lógico. Quando não há comparativo anterior (`null`), o item não é alerta; `undefined`, `NaN` ou payload sem percentual canônico geram falha operacional para evitar KPI/filtro/exportação inconsistentes. O período escolhido continua filtrado por `data_referencia`, mas o alerta mede mudança entre importações.

### Produto novo

Se o código não existe em `dicionario_produtos`, é criado automaticamente com categorização nula.
O banner de órfãos sinaliza quantos produtos estão sem categoria. Se o diagnóstico não puder ser executado por falha operacional ou divergência de schema em `categorias_agrupamento`, o banner não assume zero órfãos: exibe explicitamente `Não foi possível validar produtos sem agrupamento.` para impedir investigação com categorização mascarada.

---

## 8. Filtros em Cascata

Cascata funcional: **Origem → Família → Agrupamento → Produto**

- Apenas categorias com custo histórico real aparecem nos filtros
- Mudança de Origem reseta Família, Agrupamento e Item
- Mudança de Família reseta Agrupamento e Item
- Filtros auto-atualizam o relatório quando período está preenchido

### Busca Rápida (bypass da hierarquia)

Campo de busca aceita código puro (`M012`) ou formato `M012 - DESCRIÇÃO`.
Seta o Item diretamente e executa o relatório em 1 interação.

---

## 9. Análise Temporal

- **Modo produto** (Item selecionado): série com o custo do produto específico
- **Modo agregado** (sem Item específico): média de custo dos produtos do filtro por data
- Linha auxiliar: média histórica do período (tracejada)
- Badge de tendência: 🟢 Estável / 🔺 Alta / 🔻 Queda

---

## 10. Boas Práticas Técnicas

- `codigo` é referência de negócio em categorias; `id` UUID é referência técnica
- Nunca depender de texto livre para categorização
- `data_referencia` = competência; `criado_em` = evento de importação (não confundir)
- Real-time debounced: 2s de delay para evitar reloads em cascata durante imports
- Export via XLSX.js (mesma biblioteca já usada para leitura)

---

## 12. Segurança e Configuração por Ambiente

A aplicação usa configuração por ambiente com estratégia de runtime real do deploy estático: prioriza `window.__ENV__` (arquivo `runtime-config.js` carregado antes do bootstrap), com fallback de compatibilidade para `window.__RUNTIME_CONFIG__`, `import.meta.env` e `<meta name="VITE_*">` no HTML servido.

### Arquivos de configuração

- `.env`: variáveis locais (não versionar segredos reais)
- `.env.example`: modelo mínimo obrigatório
- `README_SETUP.md`: setup operacional local e Vercel
- `src/config/app-config.js`: módulo central de leitura/validação de config

### Variáveis mínimas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_VERBOSE_LOGS` (`true`/`false`)

### Gate de autenticação

O gate de login foi **temporariamente desativado em 14/05/2026** para manter acesso aberto durante a fase atual de investigação operacional.

- O bootstrap da UI não exige mais `signInWithPassword` para liberar carregamento.
- A identificação de sessão no header passa a exibir `acesso público`.
- A camada de dados continua restrita a `supabase.from()` e sem SQL bruto no frontend.

### Preparação para RLS

A arquitetura permanece compatível com RLS e pode reativar autenticação por sessão quando a estratégia de acesso controlado voltar a ser necessária.


## Exportação investigativa operacional (Atualização 2026-05-21)

A exportação `.xlsx` deixou de ser dump de tabela e passou a refletir o **estado investigativo ativo**:

- respeita filtros ativos, fila rápida e contexto temporal selecionado;
- prioriza ordenação operacional (`criticidade > mudança de regime > magnitude > reincidência > instabilidade`) quando não houver ordenação manual explícita;
- inclui coluna de **contexto investigativo automático** para reduzir interpretação manual;
- preserva rastreabilidade separando explicitamente `data_referencia` (competência) e `criado_em` (importação);
- gera duas abas: `Contexto` (metadados investigativos) e `Fila Investigativa` (priorização de ação).

Padrão de nome de arquivo: `auditoria_criticos_<periodo_inicio>_a_<periodo_fim>_<YYYYMMDD>.xlsx`.


### Atualização contínua — 25/05/2026 (saneamento de schema)

- Saneamento operacional do schema Supabase com hardening de constraints, índices, fallback explícito para órfãos de agrupamento e view de auditoria (`sql/2026-05-25_saneamento_operacional_schema.sql`).

## Atualização 2026-05-28 — ERR-01: fronteiras operacionais de erro

- `init()` e `runReport()` agora possuem fronteiras explícitas para falhas assíncronas, evitando tela branca ou `Uncaught (in promise)` no fluxo principal de investigação.
- Falhas em filtros, metadata, drill-through e exportação exibem mensagem operacional amigável, preservam o contexto atual da tela e registram detalhes técnicos apenas quando `VITE_ENABLE_VERBOSE_LOGS=true`.
- A mudança não altera contratos Supabase, regras de negócio, semântica temporal (`data_referencia` x `criado_em`) nem visual do relatório.

---

## Atualização 2026-05-28 (VAL-01)

- A importação passou a centralizar o identificador de produto em `normalizeCodigoProduto()` para impedir divergência causada por Excel/notação científica, espaços invisíveis, zeros à esquerda textuais e formatos numéricos mistos.
- Linhas com código inválido são bloqueadas no preview/API e contabilizadas como falha de linha, sem derrubar o lote e sem persistência ambígua.
- A mudança não altera contratos Supabase, regras investigativas nem a distinção temporal: `data_referencia` continua sendo competência operacional; `criado_em` continua sendo evento de importação.


## Atualização 2026-05-28 (LOG-01)

- O KPI **Alertas (>5%)**, o filtro rápido do card, os destaques da tabela, o drill-through e a exportação passaram a reutilizar a mesma regra canônica `isAlertaCritico()`/`classifyAlert()`.
- A semântica ficou explícita: alerta é `abs(variacaoTemporal) >= 5` entre as duas últimas importações (`criado_em`), sem arredondamento prévio, cobrindo altas e quedas; ausência real de comparativo (`null`) não alerta, mas `undefined`/`NaN` falha rápido.
- A mudança não altera visual, KPIs existentes, Supabase, `scoreInstabilidade` nem a distinção temporal: `data_referencia` filtra a competência analisada; `criado_em` define última/penúltima importação.
