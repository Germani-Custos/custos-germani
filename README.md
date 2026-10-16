# Kustos Germani — Motor de Investigação de Custos

## 1. O que é o Kustos

O Kustos Germani é um motor de investigação operacional de custos sobre dados ERP/SAP. Organiza evidências, destaca anomalias e permite chegar ao histórico de um produto por busca direta ou filtros em cascata. Seu público é controladoria, custos industriais e coordenação operacional.

## 2. Objetivo

Encontrar problemas em segundos: mostrar o que mudou, quanto, em qual competência e entre quais eventos de importação, com contexto para priorizar a investigação. Identidade, princípios e direção estão em [VISION.md](VISION.md).

## 3. Como funciona

Planilhas de custos e apontamentos de OP passam por leitura, normalização, preview e validação antes da persistência. A investigação combina os fatos ERP com a classificação operacional dos produtos; cálculos e interpretação ficam nos motores puros do Kustos.

Os dois eixos temporais são distintos: **`data_referencia` é competência operacional**; **`criado_em` é evento de importação**. Intervalo inclui as competências entre início e fim; Comparação considera somente as duas competências escolhidas. Fila, gráficos e drill-through compartilham o recorte.

## 4. Principais capacidades

- Busca por código/descrição e cascata Origem → Família → Agrupamento → Produto.
- Fila investigativa de Custos com prioridade, contexto, instabilidade e mudança de regime; janela visual de até 200 itens, com KPIs e exportação sobre o relatório completo.
- Drill-through por produto com competência, importação, custos e deltas; alerta canônico de variação absoluta ≥ 5%.
- Gráficos de comparação de importações, TOP variações e evolução por competência.
- Exportação XLSX com seleção de campos e abas `Contexto` e `Fila Investigativa`.
- Auditoria de OP com decisão, prioridade, provável causa e evidências combinando produção, tempo, KG/Hora e paradas.
- Cadastro Operacional para classificação Kustos e consulta independente do Cadastro Mestre ERP; Preview de XLS/XLSX/XLSM com aprovação e execução administrativa explícita.
- Consulta/edição dos documentos permitidos pela tela Documentação.

Procedimentos e limites: [Manual do Usuário](docs/manuais/manual-usuario.md).

## 5. Arquitetura resumida

Frontend estático em HTML/CSS/JavaScript ES Modules, com bibliotecas CDN. `view/` apresenta e orquestra; `core/` calcula sem I/O; `src/services/api.js` concentra o acesso Supabase e delega o HTTP administrativo. Funções Vercel em `api/` tratam gravação documental e execução autorizada do Master. O executor PostgreSQL administrativo é compartilhado com o CLI e permanece fora do browser.

`historico_custos` é fato temporal; `dicionario_produtos` e `categorias_*` fornecem a classificação operacional de Custos/OP. `dicionario_master_produtos` guarda o universo ERP, separado da dimensão operacional. Agrupamento ERP bruto não se converte em agrupamento Kustos por texto ou inferência. [Modelo de dados](docs/arquitetura/banco-de-dados.md) e [matriz de contratos](docs/arquitetura/matriz-contratos-operacionais.md) detalham os limites.

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

1. **Custos:** selecionar competência → enviar XLSX → conferir colunas/preview → importar com log → investigar por produto ou cascata → detalhar/exportar.
2. **OP:** enviar CSV MCAP105 com competência → conferir/importar → investigar fila e dossiê derivados da carga local atualizada.
3. **Cadastro:** consultar/editar classificação operacional ou consultar Master ERP com estado independente. Preview ERP é separado da consulta e da edição manual; decidir/baixar revisão é local. Executar reconstrução exige autorização administrativa, aprovação integral, segunda confirmação e revalidação no servidor.
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

Estado do **checkout documentado em 16/10/2026**, sem nova verificação de produção nesta revisão:

- Investigação de Custos/OP, Cadastro e Documentação implementados. Bootstrap exige sessão/login; isso não comprova políticas RLS do ambiente remoto.
- Leituras integrais de Cadastro/Custos implementadas com paginação de 500, contagem exata e recusa de resultados incompletos. Paginação entre requisições não é snapshot transacional.
- Consulta ERP independente e catálogo de famílias no Preview V2 implementados. Os registros de entrega ainda deixam publicação dessas alterações e execução real das novas propostas de famílias pendentes de etapa autorizada.
- Reconstrução do Master ERP já foi confirmada nos registros de 15/10; antigas contagens de 5.706 e expectativa de 860 pertencem às fases anteriores. Quantidades são evidências datadas, nunca valores fixos do produto.
- Dívidas abertas incluem cascata compartilhada, HTML seguro, cache de masters, separação da API/validação e LOG-02: timestamps distintos de chunks ainda podem representar um mesmo lote lógico. Prioridades e limites estão no [backlog](docs/auditoria/backlog-priorizado.md).
