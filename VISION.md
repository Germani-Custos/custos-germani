# Visão do Produto — Kustos Germani

## Missão

Transformar auditoria de custos em um processo rápido, investigativo, contextual e orientado por anomalias.

O investigador deve encontrar o problema em segundos, não em minutos.

---

## Identidade do Produto

O Kustos Germani é um **motor de investigação operacional de custos**, não um dashboard.

### O que isso significa na prática:

| Dashboard | Motor de Investigação |
|---|---|
| Mostra o estado atual | Responde por que o custo mudou |
| Exige navegação hierárquica | Busca direta por produto/código |
| Exibe variação | Mostra quando e em qual import ocorreu |
| Lista os mais instáveis | Detecta quem mudou de comportamento |

---

## Princípios Inegociáveis

### 1. Velocidade de investigação acima de tudo

Toda decisão arquitetural e de UX deve responder:
> "isso ajuda a encontrar o problema mais rápido?"

Se não ajudar: não implemente, simplifique ou remova.

### 2. Contexto antes de navegação

O investigador não deve precisar montar contexto manualmente.
O sistema deve apresentar o que merece atenção.

### 3. Explicação de eventos, não apenas exibição de dados

Não basta mostrar "variou 12%".
O sistema deve mostrar: quando, entre quais imports, qual foi o valor antes e depois.

### 4. Mudança de comportamento é mais importante que variação pontual

Um produto que sempre oscilou e oscilou de novo não é anomalia.
Um produto que era ESTÁVEL e ficou INSTÁVEL é sinal de ruptura.
Prioridade operacional: detectar mudança de regime.

### 5. Robustez operacional

O sistema deve tolerar planilhas imperfeitas, colunas extras e inconsistências parciais.
Falha de linha não derruba lote inteiro.

### 6. Temporalidade é central e deve ser clara

Dois eixos de tempo sempre presentes:
- `data_referencia`: competência operacional (quando o custo é válido)
- `criado_em`: evento de importação (quando o dado entrou no sistema)

Esses dois conceitos são distintos e não devem ser confundidos na UI.

### 7. Contratos entre camadas são parte do produto

Confiabilidade investigativa depende de contrato explícito entre UI, API, banco e engine analítica.
Método fantasma, coluna presumida ou payload implícito é defeito de produto, não detalhe técnico.

---

## Capacidades Investigativas (estado atual)

### Busca direta por produto
O investigador pode digitar código ou descrição e chegar diretamente à análise do produto — sem navegar pela hierarquia Origem → Família → Agrupamento.

### Drill-through de eventos de custo
Clicar em qualquer produto na tabela abre o histórico completo de importações:
- Competência (data_referencia): período de vigência do custo
- Importado em (criado_em): quando o dado entrou no sistema
- Delta monetário e percentual vs. registro anterior
- Destaque visual para variações absolutas ≥ 5% pela regra canônica de alerta

### Fila investigativa com baixa carga cognitiva
A tabela principal prioriza leitura operacional com hierarquia clara:
- principal: produto, criticidade, variação e mudança de regime
- contextual: resumo investigativo automático por linha
- secundário: detalhes completos em expansão sob demanda

O objetivo é reduzir leitura horizontal e manter o comportamento de cockpit investigativo, não de planilha ERP.

### Detecção de mudança de regime
Produto classificado como `ESTÁVEL` na primeira metade do período e `OSCILANDO` ou `MUITO INSTÁVEL` na segunda metade → marcado como "Mudança de Regime".
Disponível como KPI clicável e como coluna na tabela.

### Score de instabilidade e classificação automática
- `ESTÁVEL`: score < 3%
- `OSCILANDO`: score 3–8%
- `MUITO INSTÁVEL`: score ≥ 8%

### Export para Excel
O relatório atual pode ser exportado como `.xlsx` com todos os campos analíticos, incluindo classificação de regime.

### Alerta de produtos sem categoria
Banner visível na tela de importação quando há produtos sem categorização completa no dicionário. Quando o diagnóstico de órfãos está indisponível, o sistema deve avisar explicitamente que não foi possível validar produtos sem agrupamento, diferenciando falha operacional de ausência real de órfãos.

---

## O que o Sistema NÃO deve virar

- ERP genérico
- CRUD administrativo
- Dashboard decorativo com gráficos sem valor operacional
- Sistema burocrático com navegação excessiva
- Réplica de Power BI ou Metabase

---

## Evolução Esperada

### Próximos passos (alta prioridade operacional)

- Busca com autocomplete avançado (by código + descrição simultâneos)
- Filtro "produtos que mudaram de regime" persistente por período
- Comparação entre períodos (ex: este mês vs. mesmo mês do ano anterior)
- Exportação do drill-through individual por produto

### Médio prazo

- Priorização automática de investigação (ranking de risco)
- Memória comportamental: histórico de alertas por produto (reutilizando a semântica canônica de alerta ≥5% por `criado_em`)
- Detecção de sazonalidade vs. ruptura
- Insights operacionais textuais ("produto X oscilou 3 meses seguidos")

### Longo prazo

- Previsão de tendência baseada em série histórica
- Integração direta com ERP/SAP para importação automatizada
- Categorização automática de novos produtos via código de negócio

- Segurança operacional mínima (config por ambiente + autenticação real) é pré-requisito para escala do motor investigativo.

- Configuração de frontend com prioridade para `import.meta.env`, fallback seguro para `window.__ENV__`/`window.__RUNTIME_CONFIG__` e fallback final via `<meta name="VITE_*">`, evitando falhas de bootstrap em runtimes sem Vite.

- Confiabilidade de bootstrap em runtime estático é tratada como requisito investigativo: sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` válidas, o deploy deve falhar antes de publicar.


### Export é instrumento de investigação (Atualização 2026-05-21)

Exportação não é mais planilha administrativa. Deve funcionar como relatório operacional de decisão:
- topo do relatório = itens com maior urgência investigativa;
- contexto automático por linha para acelerar triagem;
- rastreabilidade temporal explícita (`data_referencia` x `criado_em`) sem ambiguidade semântica.


## Atualização 2026-05-25 — Saneamento operacional de dados

- Contrato investigativo reforçado: todo produto deve permanecer investigável mesmo sem categorização completa, usando fallback explícito `SEM_AGRUPAMENTO` e auditoria ativa de órfãos.

## Atualização 2026-05-28 — robustez como velocidade investigativa

A execução do **ERR-01** reforça que falhas de rede, Supabase ou bibliotecas auxiliares não podem interromper silenciosamente a investigação. O produto deve preservar o contexto operacional, explicar a falha em linguagem de uso e emitir diagnóstico técnico apenas em modo debug.


## Atualização 2026-05-28 — identidade operacional de produto

A execução do **VAL-01** reforça que `codigo_produto` é chave investigativa, não dado visual de planilha. O mesmo produto deve atravessar preview, importação, relatório, drill-through e exportação com a mesma chave canônica, mesmo quando o Excel apresentar notação científica ou formatações mistas. A mudança preserva a separação temporal: `data_referencia` é competência; `criado_em` é importação.


## Atualização 2026-05-28 — LOG-01 e confiança operacional dos alertas

A execução do **LOG-01** transforma o alerta investigativo em contrato explícito: KPI, filtro rápido, fila, drill-through e exportação usam a mesma função canônica. Alerta significa variação absoluta ≥ 5% entre a última e a penúltima importação (`criado_em`), sem arredondamento prévio e incluindo altas e quedas. O recorte temporal do relatório segue sendo `data_referencia`; a regra de alerta apenas qualifica a mudança observada entre eventos de importação.

## Atualização contínua — 25/06/2026 (rede de segurança técnica)

A Onda 2 reforça a visão de motor investigativo ao reduzir risco de regressão antes das próximas refatorações. ESLint, type checking leve, Vitest e CI foram adicionados exclusivamente como ferramentas de desenvolvimento, preservando a arquitetura estática/CDN e evitando dependências de produção. A prioridade permanece velocidade de investigação: a rede de segurança existe para permitir evoluções futuras com menor risco sobre contratos críticos como VAL-01, LOG-01 e a separação temporal `data_referencia` × `criado_em`.


## Atualização 2026-07-20 — documentação alinhada aos PRs recentes

A revisão dos PRs #121–#124 reforça a direção de arquitetura modular sem mudar comportamento visível: filtros e exportação foram isolados para reduzir risco de regressão e acelerar futuras melhorias de investigação. O fatiamento MNT-01 ainda não está concluído enquanto a fila/tabela e a lógica de apresentação investigativa permanecerem no orquestrador.
