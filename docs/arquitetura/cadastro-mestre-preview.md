# Cadastro Mestre — Preview determinístico (Fase 3.1)

## Contrato vigente desde 09/10/2026 — CAD-REBUILD-01

O motor puro de filtros deste documento permanece intacto. A camada de manifesto/aprovação passa a interpretar produtos fora do conjunto ou ausentes como remoções do Master, conforme [reconstrução do universo](./cadastro-mestre-reconstrucao.md), substituindo a preservação histórica de produtos ausentes descrita abaixo. Campos vazios de produtos que permanecem continuam preservados. O contexto SELECT passa a incluir a imagem completa do Master. Nenhuma mudança de competência `data_referencia` ou evento `criado_em` dos fatos.

## Continuidade — CAD-XLS-01 (08/10/2026)

O seletor do Cadastro aceita XLSM/XLSX/XLS e reutiliza este adapter via `prepararAprovacaoArquivoCadastroMestre`. O modal apresenta contagens, propostas, preservações e aprovação local, com download JSON sem execução. A integração foi confirmada após constatar que a tela executava o legado diretamente. Adapter, filtros e reconciliação não mudaram; XLS é lido diretamente pelo SheetJS. Referências abaixo à ausência de integração descrevem a entrega original. [Contrato atual](../ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

Continuidade: a [Fase 3.4](cadastro-mestre-execucao-fase3-4.md) executou uma única carga autorizada após reprocessar o mesmo arquivo e confirmar identidade integral com o manifesto da Fase 3.3. O Preview permanece somente leitura; não é executor/importer. O Master atual contém 5.706 registros, portanto um Preview novo não deve repetir as contagens pré-carga como se fossem atuais.

Entrega CAD-PREVIEW-01 em 2026-10-08. Esta fase calcula um Preview; **não importa dados**. O contrato original não inclui aprovação nem execução. A [Fase 3.3](./cadastro-mestre-aprovacao.md) acrescenta manifesto/revisão local em módulo separado, sem escrita de log ou preenchimento de proveniência. Nenhuma tela do runtime foi ligada ao novo pipeline. O importador legado e a dimensão operacional continuam com seus contratos anteriores.

## Arquitetura e chamada

Arquivo ERP → adaptador SheetJS → linhas canônicas → núcleo puro → Preview.

- `src/services/cadastro-mestre-preview.js`: lê XLSM/XLSX/XLS e resolve cabeçalhos por aliases explícitos, sem fuzzy. O leitor é injetado; no browser deve ser o `XLSX` já carregado pelo runtime.
- `core/cadastro-mestre-preview-engine.js`: recebe linhas e contexto obrigatório `{produtos,origens,familias}` e devolve cálculo determinístico. Reutiliza `normalizeCodigoProduto`; não acessa DOM, API, Supabase ou armazenamento.
- `api.getCadastroMestrePreviewContext()`: retorna `{data,error}` por SELECT exclusivamente de `dicionario_master_produtos`, `categorias_origem` e `categorias_familia`. Ordenação estável, páginas de 500 e contagem exata evitam truncamento silencioso. Não consulta `dicionario_produtos`, mapas ou fatos.

Exemplo para futura integração, **não acionado pela UI nesta fase**:

```js
import { api } from '../../src/services/api.js';
import { previewArquivoCadastroMestre } from '../../src/services/cadastro-mestre-preview.js';

const { data: contexto, error } = await api.getCadastroMestrePreviewContext();
if (error) throw error;
const preview = await previewArquivoCadastroMestre(arquivo, contexto, XLSX);
// Apenas inspecionar o resultado. Não existe método de execução do Preview.
```

O contexto também pode ser fornecido por quem chama, sem acesso ao banco. Deve representar uma leitura completa e bem-sucedida do Mestre; não converter falha de leitura em arrays vazios.

## Leitura e normalização

Extensões sem distinção de caixa. Primeira aba por padrão; o quarto argumento de `previewArquivoCadastroMestre` permite escolher uma aba pelo nome. Não concatenar abas silenciosamente.

Detecta a linha de cabeçalho após títulos/linhas vazias. Obrigatórios: Produto, Descrição, Tipo, Descr(Origem). Colunas extras são ignoradas. Código de origem, família e agrupamento ERP são opcionais: ausência da coluna resulta em `CAMPO_NAO_FORNECIDO`, distinto de célula vazia. Cabeçalho ausente ou com múltiplas colunas para o mesmo campo gera erro explícito.

Aliases canônicos aceitam underscores, caixa e acentos: `codigo_produto`, `descricao`, `tipo`, `descr_origem`, `origem_cod`, `familia_cod`, `agrupamento_erp_valor`. Também aceita Produto/Código Produto/Cod Produto/Código/Cod; Descrição/Descr/Desc; Tipo Produto; Descr(Origem)/Descrição Origem; Origem/Código Origem/Cod Origem; Família/Código Família/Cod Família; Agrupamento/Agrupamento ERP e, desde a decisão de negócio da Fase 3.3, **Agrup. Prod.**. Esses aliases só identificam **colunas**, não classificam produtos. No arquivo real, somente a coluna Q é o agrupamento ERP oficial; nenhum Pxxx é convertido para Mxxx.

Após leitura, campos escalares viram texto com trim lateral; vazio vira null. Caixa, zeros textuais e espaços internos permanecem. Identidade do produto usa a função canônica. Inteiros numéricos além da precisão segura são rejeitados antes de normalizar; zeros de máscara Excel explicitamente composta apenas por `0` são preservados nos identificadores e agrupamento. Formatação genérica de milhar/decimal não inventa códigos.

SheetJS recebe `bookVBA:false` e `cellFormula:false`. Macros não são executadas/carregadas e fórmulas não são calculadas: só valores cacheados existentes no arquivo podem ser lidos. Sem valor cacheado, a célula permanece vazia. Agrupamento ERP é o escalar bruto após essa normalização mínima, nunca um agrupamento Kustos. A dependência de desenvolvimento SheetJS 0.20.3 usa o [tarball oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), na mesma versão do CDN atual; serve somente aos testes, sem mudar o runtime.

## Filtros ordenados

1. Tipo: somente P/C, com trim e comparação case-insensitive; D e qualquer outro valor são excluídos.
2. Descr(Origem): deve conter Produzido ou Revenda, case-insensitive.
3. Descrição: excluir quando contiver inativo ou **EXLUIR** (grafia literal aprovada), case-insensitive.

Cada exclusão registra linha física, código, primeiro motivo aplicável e se o Mestre existente será preservado. Produto filtrado mas fisicamente presente não é marcado como ausente. Linhas totalmente vazias não são registros; títulos/cabeçalhos não entram em `linhas_lidas`.

## Reconciliação, só em memória

Chave: `codigo_produto` canônico; campos: descrição, origem_cod, familia_cod, agrupamento_erp_valor.

- Novo: `NOVO_PRODUTO`, proposta restrita ao Mestre em eventual etapa futura autorizada. Nunca criar dimensão operacional.
- Existente + recebido não vazio diferente do atual: `ALTERACAO_POTENCIAL` por campo, com atual/recebido/proposto explícitos.
- Recebido igual: `SEM_ALTERACAO`.
- Existente + célula vazia: `CAMPO_VAZIO_PRESERVA_EXISTENTE`; o cálculo preserva o atual.
- Coluna opcional ausente: `CAMPO_NAO_FORNECIDO`; preserva o atual.
- Mestre fisicamente ausente no arquivo: `AUSENTE_NO_ARQUIVO` e `PRESERVAR_MASTER`, sem excluir.

Códigos duplicados no arquivo, mesmo envolvendo linha filtrada, geram erro e não escolhem last-wins. Identidade duplicada/inválida no contexto do Mestre bloqueia o cálculo. Erros de linha não impedem o Preview das outras linhas. Não há função para executar qualquer das decisões propostas.

## Resolução, sem inferência

Origem e família: comparar exclusivamente texto com trim contra `categorias_*.codigo`, preservando caixa e zeros. Exatamente uma correspondência: RESOLVIDO; nenhuma: PENDENTE; várias: AMBIGUO; vazio: NAO_INFORMADO. ID técnico e descrição não resolvem código. Os 35 códigos de família anteriormente identificados não são hardcoded: a situação depende do catálogo fornecido. Os sem correspondência permanecem pendentes, sem regra por família, origem, descrição ou frequência.

Por produto, `origem` e `familia` separam `recebido` de `efetivo` (após preservação de vazios). Agrupamento recebido preenchido: sempre `SEM_PONTE_ERP_KUSTOS`. Sem valor recebido: `NAO_INFORMADO`. Não há catálogo de agrupamentos na entrada nem campo operacional `agrupamento_cod` no cálculo.

## Estrutura do resultado e contagens

`versao_contrato`, `somente_preview:true`, `status` (OK/COM_ERROS), metadados de arquivo/aba/colunas, `resumo`, `produtos`, `ausentes`, `excluidos`, `erros`.

Cada produto elegível contém código/linha, registro atual Mestre, recebido ERP, valores calculados, diferenças por campo, tipo global, resolução de origem/família/agrupamento e decisão proposta. Ausentes e excluídos são coleções separadas para não contar preservações como atualizações.

Resumo:

- `linhas_lidas`, `linhas_apos_filtros`, `linhas_excluidas`, `erros`: unidades de linha/diagnóstico. Após filtros inclui linha elegível posteriormente rejeitada por identidade/valor/duplicidade.
- `produtos_com_preview`, `novos_produtos`, `produtos_existentes`, `produtos_ausentes`, `produtos_com_alteracoes`: produtos distintos. Existentes aqui são somente os elegíveis com Preview.
- `alteracoes_potenciais`: quantidade de campos alterados de existentes, não de novos produtos.
- `campos_vazios`: células fornecidas vazias nos quatro campos de produtos com Preview, incluindo novos; não inclui colunas ausentes.
- `familias/origens_resolvidas`, `pendentes` e `nao_informadas`: resolução **efetiva calculada** dos produtos com Preview. Ambíguos contam como pendentes e mantêm seu status explícito por produto.
- `agrupamentos_erp_recebidos` e `agrupamentos_erp_sem_resolucao`: produtos com agrupamento recebido não vazio; são iguais enquanto não existe ponte oficial.

Ordenação de produtos/ausentes por código textual, sem relógio ou aleatoriedade. Entradas não são modificadas.

## Limites e validação

Nenhuma tabela foi consultada no banco real nesta implementação; integração Supabase validada com mocks que oferecem somente SELECT e verificam ausência de chamadas de escrita. Contagens de 5.603 no teste são dados sintéticos, não uma nova auditoria do banco.

Leitura de contexto respeita RLS: contagem exata refere-se às linhas visíveis ao cliente autenticado. Falhas, truncamento e mudança de contagem durante paginação geram erro. SELECTs de tabelas/páginas separadas **não são snapshot transacional**; alterações concorrentes com a mesma contagem podem não ser detectadas. Por isso Preview não é autorização de escrita nem evidência imutável: eventual fase de execução deverá revalidar contexto e definir consistência/proveniência.

Testes incluem os 20 cenários solicitados, códigos exatos/ambíguos, filtros ordenados, congelamento de entradas, determinismo, duplicados, paginação/falhas e bytes reais XLSM/XLSX/XLS gerados em memória. Nada é salvo no banco ou em arquivos ERP.

Validação local: instalação limpa pelo lockfile (`npm ci --ignore-scripts`), testes completos, ESLint, `tsc --noEmit -p jsconfig.json` e `git diff --check`. O SheetJS adicional é exclusivamente devDependency; nenhuma outra versão do lockfile foi atualizada.

Não há mudança em schema, RLS, funções, triggers, mapas, fatos, classificação operacional, telas de Custos/OP ou importer legado. `data_referencia` continua competência e `criado_em` evento de importação; o Preview cadastral não atribui nem altera esses campos.

Durante a instalação de teste, `npm audit` apontou 8 vulnerabilidades de tooling (1 moderada, 5 altas, 2 críticas), em dependências já presentes no lockfile. SheetJS 0.20.3 não consta nesses alertas. Atualizações/correções de tooling não foram aplicadas por estarem fora desta fase.
