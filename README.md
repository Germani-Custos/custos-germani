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
- Fila investigativa de Custos ordenada por prioridade investigativa antes da janela visual de até 200 itens; cabeçalhos permitem ordem manual e o botão Restaurar prioridade investigativa retorna ao padrão. XLSX conserva a ordem completa ativa, inclusive variação manual; contexto distingue alerta atual de recorrência histórica.
- Drill-through por produto com competência (mês/ano), Data de referência (DD/MM/AAAA), custos e deltas; mantém cada registro, inclusive datas diferentes no mesmo mês. Importação (`criado_em`) permanece proveniência, sem exibição na coluna Data; alerta canônico de variação absoluta ≥ 5%.
- Gráficos de comparação de importações, TOP variações e evolução por competência.
- Exportação XLSX com seleção de campos e abas `Contexto` e `Fila Investigativa`.
- Auditoria de OP com leitura integral paginada, decisão, prioridade, provável causa e evidências combinando produção, tempo, KG/Hora e paradas.
- OP × CUSTO mensal no checkout local: entrada pela OP com De = Até explícito, cobertura dos dois domínios, escolha de inclusão dos produtos sem correspondência, fila e dossiê por produto. Preserva prioridades separadas e eventos/snapshots, sem inferir causalidade. Publicação ainda depende de autorização.
- Cadastro Operacional para classificação Kustos e consulta independente do Cadastro Mestre ERP; Preview de XLS/XLSX/XLSM com aprovação e execução administrativa explícita. [Executor isolado comercial](docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md) implementado para a fotografia inicial, preservando timestamps/proveniência/logs; a auditoria atual não autoriza nova execução.
- Consulta e editor dos documentos permitidos pela tela Documentação; salvamento atualmente bloqueado pelo HTTP 500 ([ERR-04](docs/auditoria/backlog-priorizado.md#err-04)).

Procedimentos e limites: [Manual do Usuário](docs/manuais/manual-usuario.md).

A interface usa a identidade **Black + Purple**: superfícies grafite, acentos violeta e cores operacionais semânticas. A área inicial de Importação reúne cards para os módulos existentes. [Componentes e tokens visuais](docs/ux/componentes.md).

## 5. Arquitetura resumida

O [OP × CUSTO](docs/arquitetura/op-custo.md#17-fase-2--apresentação-e-integração-local) combina o engine puro e a API mensal da Fase 1 com um subpainel na tela OP. A UI consome o contexto completo e os resultados originais, com paginação visual própria de 50 produtos, sem alterar TOP-200 ou os motores existentes. Os domínios continuam independentes e suas prioridades permanecem separadas. A superfície está implementada localmente, ainda não publicada; [escopo e validação da Fase 2](docs/auditoria/op-custo-fase2-validacao.md).

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
2. **OP:** enviar CSV MCAP105 com competência → conferir/importar → investigar fila e dossiê derivados da carga local atualizada. Para cruzamento mensal, selecionar De = Até → OP × CUSTO → conferir cobertura → escolher a inclusão de produtos sem correspondência → fila/dossiê → voltar ao contexto OP preservado.
3. **Cadastro:** consultar/editar classificação operacional ou consultar Master ERP com estado independente. A tabela ERP mostra Código, Descrição, Origem, Família e Agrupamento comercial (código — descrição), sem coluna Agrup. Prod.; os campos persistidos permanecem. Preview ERP é separado da consulta e da edição manual; decidir/baixar revisão é local. Executar reconstrução exige autorização administrativa, aprovação integral, segunda confirmação e revalidação no servidor.
4. **Documentação:** consultar os documentos disponibilizados na tela. O salvamento foi projetado para gerar commit no GitHub; a função retorna HTTP 500 e requer revisão de autorização antes da recuperação (ERR-04/SEC-06 no backlog).

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

## 10. Backlog ativo e estado verificado

Estado em **26/10/2026**: o [backlog de correções](docs/auditoria/backlog-priorizado.md) é a fonte única, com **23 itens — um P0, seis P1, dez P2 e seis P3**. SEC-03/RLS e a proteção da view foram concluídos; segurança do salvamento documental permanece P0. Leitura integral de OP foi validada localmente com 1.469 registros e 299 gargalos; [provas](docs/auditoria/op-paginacao-validacao.md). A prioridade padrão de Custos foi corrigida localmente: os cinco alertas de outubro passaram de 345–349 para 1–5, mantendo TOP-200 e critérios existentes; [provas LOG-05](docs/auditoria/custos-top200-validacao.md). Narrativa sem recorrência inferida e alinhamento da ordem manual do XLSX também estão corrigidos localmente; [provas LOG-04/06](docs/auditoria/custos-fila-validacao.md). Publicação aguarda autorização própria; comparação e demais correções permanecem no backlog. Cada item tem evidência, aceite e dependências; o README mantém somente este resumo.

A [reconciliação](docs/auditoria/backlog-reconciliacao-2026-10-22.md) registra os 60 IDs antigos, duplicações, fatos atuais, limites de verificação e conflitos entre fontes. A fotografia de leitura encontrou Master ERP com 860 produtos, 162 pares comerciais preenchidos e 698 vazios; lote histórico de famílias com 65 inserções. Afirmações anteriores de comercial integralmente NULL e famílias ainda por carregar são estados históricos, preservados no [arquivo original](docs/auditoria/backlog-historico.md), e não instruções de repetir carga.

O [modelo de acesso](docs/arquitetura/modelo-acesso-rls.md) está aplicado no Supabase: leitura compartilhada para autenticados permanentes, importação/edição operacional apenas para os dois administradores indicados e nenhum acesso anônimo às tabelas. A reconstrução ERP conserva sua autorização separada. [Provas do P0](docs/auditoria/seguranca-rls-validacao.md) distinguem aplicação, ensaios com rollback e a operação administrativa posterior do lote 5.

A tela de Documentação apresenta o Markdown publicado do mesmo caminho do backlog; o snapshot documental do site continua anterior até publicação autorizada. A proteção RLS já vale no banco, independentemente de deploy do frontend. Features ficam no [ROADMAP](ROADMAP.md). Nenhuma carga, commit, push ou deploy de aplicação foi realizado pela entrega RLS.
