# Kustos Germani — Motor de Investigação de Custos

## 1. O que é o Kustos

O Kustos Germani é um motor de investigação operacional de custos sobre dados ERP/SAP. Organiza evidências, destaca anomalias e permite chegar ao histórico de um produto por busca direta ou filtros em cascata. Seu público é controladoria, custos industriais e coordenação operacional.

## 2. Objetivo

Encontrar problemas em segundos: mostrar o que mudou, quanto, em qual competência e entre quais eventos de importação, com contexto para priorizar a investigação. Identidade, princípios e direção estão em [VISION.md](VISION.md).

## 3. Como funciona

Planilhas de custos e apontamentos de OP passam por leitura, normalização, preview e validação antes da persistência. A investigação de Custos usa origem/família do Master ERP quando o código existe nele, com fallback operacional apenas para códigos fora do Master; agrupamento continua operacional. A OP usa a classificação operacional; cálculos e interpretação ficam nos motores puros do Kustos.

Os dois eixos temporais são distintos: **`data_referencia` é competência operacional**; **`criado_em` é evento de importação**. Intervalo inclui as competências entre início e fim; Comparação considera somente as duas competências escolhidas. Fila, gráficos e drill-through compartilham o recorte.

## 4. Principais capacidades

- Busca por código/descrição e cascata Origem → Família → Agrupamento → Produto.
- Fila investigativa de Custos com prioridade, contexto, instabilidade e mudança de regime; janela visual de até 200 itens, com KPIs e exportação sobre o relatório completo.
- Drill-through por produto com competência (mês/ano), Data de referência (DD/MM/AAAA), custos e deltas; mantém cada registro, inclusive datas diferentes no mesmo mês. Importação (`criado_em`) permanece proveniência, sem exibição na coluna Data; alerta canônico de variação absoluta ≥ 5%.
- Gráficos de comparação de importações, TOP variações e evolução por competência.
- Exportação XLSX com seleção de campos e abas `Contexto` e `Fila Investigativa`.
- Auditoria de OP com decisão, prioridade, provável causa e evidências combinando produção, tempo, KG/Hora e paradas.
- Cadastro Operacional para classificação Kustos e consulta independente do Cadastro Mestre ERP; Preview de XLS/XLSX/XLSM com aprovação e execução administrativa explícita. Carga pontual de Agrup. Com. com [executor isolado](docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md), preservando timestamps/proveniência/logs; escrita real ainda bloqueada.
- Consulta/edição dos documentos permitidos pela tela Documentação.

Procedimentos e limites: [Manual do Usuário](docs/manuais/manual-usuario.md).

A interface usa a identidade **Black + Purple**: superfícies grafite, acentos violeta e cores operacionais semânticas. A área inicial de Importação reúne cards para os módulos existentes. [Componentes e tokens visuais](docs/ux/componentes.md).

## 5. Arquitetura resumida

Frontend estático em HTML/CSS/JavaScript ES Modules, com bibliotecas CDN. `view/` apresenta e orquestra; `core/` calcula sem I/O; `src/services/api.js` concentra o acesso Supabase e delega o HTTP administrativo. Funções Vercel em `api/` tratam gravação documental e execução autorizada do Master. O executor PostgreSQL administrativo é compartilhado com o CLI e permanece fora do browser.

`historico_custos` é fato temporal; `dicionario_produtos` e `categorias_*` fornecem a classificação operacional. Em Custos, `core/custos-classification-engine.js` projeta em memória origem/família do `dicionario_master_produtos`, resolvidas por código exato dos catálogos, antes da cascata e da análise. O fallback operacional vale somente fora do Master; a projeção não grava cadastros nem fatos. OP e manutenção operacional conservam sua fonte. Classificações de agrupamento provenientes do ERP são dados opcionais e independentes da classificação investigativa do Kustos. O Master preserva Agrup. Prod. e, em campos próprios, Agrup. Com. e sua descrição; nenhum deles preenche agrupamento Kustos. [Contrato comercial ERP](docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md). [Modelo de dados](docs/arquitetura/banco-de-dados.md) e [matriz de contratos](docs/arquitetura/matriz-contratos-operacionais.md) detalham os limites.

## 6. Estrutura do projeto

```text
index.html / assets/       Shell, navegação e estilos
view/                     Controllers, estado, DOM e apresentação
core/                     Parsing, cálculos e motores puros
src/services/             Fachada Supabase, adapter e cliente HTTP
services/api.js           Shim de compatibilidade
api/                      Funções Vercel
scripts/                  Build e ferramentas administrativas
sql/                      Scripts e migrations versionados
tests/ / types/           Regressões e contratos de tipos
docs/                     Manuais, arquitetura, auditoria e história
```

O [Manual Técnico](docs/manuais/manual-tecnico.md) descreve os módulos e o ciclo de desenvolvimento.

## 7. Fluxos principais

1. **Custos:** selecionar competência → enviar XLSX → conferir colunas/preview → importar com log → identificar códigos/descrições sem cadastro antes do envio → consultar/preparar cada item no Cadastro sem redigitar códigos → investigar por produto ou cascata → detalhar/exportar. A lista não salva nem classifica produtos; a rotina existente de importação permanece.
2. **OP:** enviar CSV MCAP105 com competência → conferir/importar → investigar fila e dossiê derivados da carga local atualizada.
3. **Cadastro:** consultar/editar classificação operacional ou consultar Master ERP com estado independente. A tabela ERP mostra Código, Descrição, Origem, Família e Agrupamento comercial (código — descrição), sem coluna Agrup. Prod.; os campos persistidos permanecem. Preview ERP é separado da consulta e da edição manual; decidir/baixar revisão é local. Executar reconstrução exige autorização administrativa, aprovação integral, segunda confirmação e revalidação no servidor.
4. **Documentação:** consultar os documentos disponibilizados na tela; salvar usa função própria e gera commit no GitHub. Essa ação não faz parte desta reorganização local.

## 8. Como executar/desenvolver

Requer Node >= 22 para ferramentas e funções. Veja o [setup](README_SETUP.md) antes de executar comandos; configure somente os valores públicos do frontend no ambiente, sem versionar credenciais.

```powershell
npm ci
node scripts/generate-runtime-config.mjs
```

Sirva a raiz com um servidor HTTP estático disponível no seu ambiente. O servidor estático permite usar o frontend, mas não executa as funções `/api`. Não existe script `npm run dev` neste pacote.

Para mudanças de código, os scripts de qualidade são `npm run lint`, `npm run typecheck` e `npm test`. `npm run build` gera `dist` por allowlist e não publica o projeto; configuração pública obrigatória ausente bloqueia o build. Funções são empacotadas separadamente pela Vercel. [Desenvolvimento](docs/manuais/manual-tecnico.md) e [operação](docs/manuais/manual-operacao.md) explicam as rotinas.

## 9. Documentação relacionada

- [Índice completo](docs/arquitetura/indice-documentacao-kustos.md): navegação por responsabilidade.
- [VISION.md](VISION.md): identidade, missão, princípios e direção estratégica.
- [ROADMAP.md](ROADMAP.md): iniciativas concluídas, continuidade, próxima onda e futuro.
- [AGENTS.md](AGENTS.md) e [Regras Gerais](docs/regras-gerais.md): contratos obrigatórios e processo de trabalho.
- [Manual do Usuário](docs/manuais/manual-usuario.md), [Técnico](docs/manuais/manual-tecnico.md) e [Operação](docs/manuais/manual-operacao.md): procedimentos por público.
- [Auditoria e backlog](docs/auditoria/README.md): fragilidades, evidências e prioridades técnicas.
- [História do Projeto](docs/HISTORIA_DO_PROJETO_KUSTOS.md): decisões, problemas superados e marcos; Git continua sendo a fonte oficial de commits.
- [Auditoria desta reorganização](docs/auditoria/reorganizacao-documental.md): diagnóstico, destinos, divergências e validação.

## 10. Estado atual

Estado do **checkout documentado em 19/10/2026**. A [validação CUSTOS-ERP-01](docs/auditoria/custos-classificacao-erp.md) usou apenas GET contra os dados reais e interface local; os demais estados abaixo mantêm as referências anteriores:

- Investigação de Custos/OP, Cadastro e Documentação implementados. Bootstrap exige sessão/login; isso não comprova políticas RLS do ambiente remoto.
- Classificação analítica de Custos pelo Master ERP implementada em memória e validada localmente; publicação fora desta etapa. Cadastro Operacional e agrupamento não são sincronizados.
- Leituras integrais de Cadastro/Custos implementadas com paginação de 500, contagem exata e recusa de resultados incompletos. Paginação entre requisições não é snapshot transacional.
- Consulta ERP independente, catálogo de famílias e agrupamento comercial opcional implementados. A migration de Agrup. Com. foi aplicada em produção; os dois campos continuam NULL nos 860 produtos, sem carga do XLS. Publicação de UI/função compatíveis com transporte V3 e execução dependem de novas etapas autorizadas. [Prova da migration](docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md). Os registros de entrega ainda deixam publicação dessas alterações e execução real das novas propostas de famílias pendentes de etapa autorizada.
- Reconstrução do Master ERP já foi confirmada nos registros de 15/10; antigas contagens de 5.706 e expectativa de 860 pertencem às fases anteriores. Quantidades são evidências datadas, nunca valores fixos do produto.
- Dívidas abertas incluem cascata compartilhada, HTML seguro, cache de masters, separação da API/validação e LOG-02: timestamps distintos de chunks ainda podem representar um mesmo lote lógico. Prioridades e limites estão no [backlog](docs/auditoria/backlog-priorizado.md).
