# Auditoria 2 — contrato de reconciliação do Cadastro Mestre

## 1. Objetivo

Auditar o contrato técnico e de negócio entre Cadastro Mestre ERP e Cadastro Operacional, sem executar reconciliação. **Auditoria concluída; contrato recomendado ainda não aprovado e não implementado.** Nenhuma recomendação deste documento autoriza escrita, filtro novo, importação, reconstrução, schema, migration, RLS/Auth, commit, push ou deploy.

Separar presença física no ERP, elegibilidade analítica, existência operacional, divergência e campo vazio. Preservar identidade, classificação Kustos e fatos históricos. `data_referencia` permanece competência; `criado_em` permanece evento/importação, sem derivar competência da data do arquivo ou do lote cadastral.

## 2. Fontes

Auditoria em **30/10/2026**, America/Sao_Paulo. HEAD `486b646b25d0929dedb80804493cdcd88b34e537`. Antes desta tarefa já existiam os dois arquivos não rastreados da Auditoria 1; foram preservados, sem incorporá-los como alterações desta entrega.

- [AGENTS](../../AGENTS.md), [Regras Gerais](../regras-gerais.md), [README](../../README.md), [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md), [Manual Técnico](../manuais/manual-tecnico.md), [Manual de Operação](../manuais/manual-operacao.md) e [backlog](backlog-priorizado.md).
- [Auditoria 1](cadastro-mestre-classificacao-validacao.md) e seu [JSON por produto](cadastro-mestre-classificacao-evidencias.json); [engenharia Supabase](../engenharia-dados-supabase.md), [banco de dados](../arquitetura/banco-de-dados.md), [matriz](../arquitetura/matriz-contratos-operacionais.md), [Cadastro/UX](../ux/cadastro-mestre.md), [reconstrução](../arquitetura/cadastro-mestre-reconstrucao.md), [execução web](../arquitetura/cadastro-mestre-execucao-web.md), [famílias](../arquitetura/cadastro-mestre-familias-erp.md), [comercial ERP](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md), [aprovação](../arquitetura/cadastro-mestre-aprovacao.md), [validação da reconstrução](cadastro-mestre-reconstrucao-validacao.md) e [OP × CUSTO](../arquitetura/op-custo.md).
- **Documento ausente:** `docs/auditoria/auditoria-cadastro-mestre.md` não existe no checkout e não foi localizado pelo inventário de arquivos. Não foi declarado como lido nem recriado como histórico. As evidências disponíveis acima permitiram a análise; qualquer conclusão exclusiva desse documento ausente permanece fora do alcance.
- Supabase Custos-Germani, `umpebdovrazzrdndhigc`: SELECTs de preservação das 12 tabelas, colunas/nullable e snapshots/remoções dos logs do Master. As contagens e hashes integrais coincidiram com a fotografia da Auditoria 1; por isso seus dados brutos puderam ser reutilizados com revalidação atual. Nenhum writer, RPC ou SQL no frontend foi chamado.
- Arquivo real `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\cadastro mestre 22_10.xls`, aba **Sheet1**, 6.255 linhas de dados, SHA-256 **46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff**, novamente conferido e igual ao lote 5. Fonte conhecida de 22/10, não uma consulta ao ERP ao vivo em 30/10. Leitura local pelo reader/adapter existente, sem macros, fórmulas, upload, conversão ou modificação do XLS.

Código inspecionado: [adapter](../../src/services/cadastro-mestre-preview.js), [Preview](../../core/cadastro-mestre-preview-engine.js), [manifesto](../../core/cadastro-mestre-approval-engine.js), [transporte](../../core/cadastro-mestre-execution-data.js), [plano](../../core/cadastro-mestre-reconstruction-engine.js), [executor](../../scripts/lib/cadastro-mestre-reconstruction.mjs), [backend web](../../scripts/lib/cadastro-mestre-web.mjs), [UI do Preview](../../view/ui-cadastro-mestre-preview.js), [API](../../src/services/api.js), [classificação de Custos](../../core/custos-classification-engine.js), [cadastro operacional](../../core/product-master-engine.js) e [normalizador](../../core/spreadsheet-engine.js).

[Evidências estruturadas desta auditoria](cadastro-mestre-reconciliacao-evidencias.json): 174 produtos completos, 114 casos MASSA PRODUZIDA, distribuição de regras independentes/primeiro motivo, referências técnicas, campos vazios, histórico e mapa de estados para 6.256 códigos (união do XLS, cadastros e snapshots conhecidos). O schema das tuplas e os universos de cada estado estão explícitos. São documentos de auditoria, sem dependência do runtime.

## 3. Estado atual

| Situação | Quantidade | Recorte |
| --- | --- | --- |
| Master ERP | 860 | Subconjunto elegível persistido |
| Cadastro Operacional | 6113 | Todos os códigos operacionais |
| Custos | 447 | Códigos distintos; 2.481 fatos |
| OP | 355 | Códigos distintos; 1.469 eventos |
| Compartilhados Master/Operacional | 853 | Não inclui os sete somente Master |
| Operacional fora do Master | 5260 | 5.259 presentes no XLS e filtrados; TESTE123 ausente fisicamente |
| Excluídos pelo filtro | 5395 | Arquivo bruto de 6.255 linhas |
| Novos potenciais para o Operacional, elegíveis | 7 | Já estão no Master; zero novos para o Master sob a regra atual |
| Custos compartilhados Master/Operacional | 273 | Demais 174 ficam somente no Operacional |
| Custos sem agrupamento Kustos | 447 | Zero preenchidos nesse universo |


**Os recortes não são equivalentes nem somáveis.** Arquivo físico contém 6.255 códigos; Master contém 860 elegíveis. O Operacional não é um espelho de 860 linhas. Há 143 códigos do arquivo sem Operacional, mas 136 são filtrados; os sete restantes são os únicos candidatos elegíveis atuais para inclusão operacional. Em toda a fotografia, a normalização não alterou nem colidiu códigos.

### Estados A–G por identidade

| Estado | Definição sem confundir universos | Observado |
| --- | --- | --- |
| A — Novo para o Operacional | Arquivo presente e Operacional ausente; elegibilidade é uma marca separada | 143 físicos, dos quais 7 elegíveis e 136 também E |
| B — Compartilhado | Arquivo físico e Operacional presentes; se o recorte for o Master, contar separadamente | 6.112 físicos compartilhados; 853 Master/Operacional |
| C — Somente operacional | Sem presença física no arquivo atual; ausência apenas no Master não basta | 1 físico (TESTE123); 5.260 fora do Master, incluindo 5.259 E |
| D — Ausente do ERP atual | Existência anterior comprovada em snapshot e ausência física no novo arquivo | 0 entre 5.713 códigos históricos conhecidos |
| E — Excluído pelo filtro | Fisicamente presente, mas não elegível pelas regras atuais | 5.395 físicos; 5.259 já no Operacional |
| F — Divergente | Master e Operacional com diferença após resolver código ERP para ID técnico | 686 de 853 compartilhados; 165 possuem Custos |
| G — Campo ERP vazio | Elegível com pelo menos um campo canônico vazio; pode ser campo opcional | 855 de 860; não significa produto inválido |


São dimensões/indicadores que podem se sobrepor, e não uma enumeração disjunta. A pode coincidir com E; B pode coincidir com F/G; E não é D. **Os rótulos A/B/C desta Auditoria 2 não redefinem as classes da Auditoria 1**: naquela, A era compartilhado de Custos. Sempre identificar a definição e a base.

F global: 686 famílias operacionais vazias contra família ERP resolvida, dez descrições diferentes (dentro desses 686) e zero divergências de origem. Entre os 447 de Custos, mantém-se o achado anterior: 165 famílias e cinco descrições diferentes. Os seis campos persistidos do Master conferem exatamente com o XLS atual; não há diferença entre esses valores oficiais e o arquivo comprovado.

## 4. Regra atual de elegibilidade

**Local exato:** `core/cadastro-mestre-preview-engine.js`, `textoCadastro` nas linhas 13–18 e `motivoFiltro` nas linhas 38–43. `criarPreviewCadastroMestre`, linhas 65–88, chama o filtro antes de construir candidatos e registra **somente o primeiro motivo** por linha. Duplicidade/identidade são verificadas separadamente e podem bloquear o Preview.

```js
const tipo = (textoCadastro(row.tipo) || '').toUpperCase();
if (tipo !== 'P' && tipo !== 'C') return 'TIPO_NAO_AUTORIZADO';
if (!/produzido|revenda/i.test(textoCadastro(row.descr_origem) || ''))
  return 'ORIGEM_NAO_AUTORIZADA';
if (/inativo|exluir/i.test(textoCadastro(row.descricao) || ''))
  return 'DESCRICAO_EXCLUIDA';
return null;
```

| Campo/etapa | Comparação implementada | Limites |
| --- | --- | --- |
| Tipo | Trim lateral → toUpperCase → igualdade exata P ou C | Não é includes; outros valores são excluídos primeiro |
| Descr(Origem) | Regex /produzido\|revenda/i em qualquer parte do texto | Substrings literais, sem fronteira de palavra, sem interpretação semântica |
| Descrição do produto | Regex /inativo\|exluir/i | Marcador textual, não status estruturado ativo/inativo |
| Valores das células | textoCadastro converte escalar para string e faz trim lateral | Não remove acentos nem colapsa espaços internos nos rótulos |
| Cabeçalhos | normalizarCabecalho no adapter, linhas 25–26: NFD, remove diacríticos, minúsculas, troca separadores por espaço e trim | Normalização de cabeçalho não é aplicada ao conteúdo do filtro |
| Código do produto | normalizeCodigoProduto compartilhado | Normalização de identidade é separada da elegibilidade textual |


Logo, PRODUZIDO e produzido passam pela regra de Origem; PRODUZIDA não corresponde ao literal produzido. Revenda passa em qualquer caixa. Espaço dentro da palavra e acento na própria palavra não são normalizados para equivalência. PANIFICAÇÃO REVENDA UN passa pelo termo revenda apesar do acento em outro trecho. Não há allowlist por `origem_cod` nessa etapa; o código ERP não decide elegibilidade.

A regex usa **EXLUIR**, exatamente como documentado/codificado; não usa **EXCLUIR**. O XLS contém **64 descrições com EXCLUIR** e zero com EXLUIR. As 64 foram excluídas pela Origem, portanto não houve admissão indevida desses casos no arquivo atual. Ampliar Origem sem revisar esse detalhe pode mudar o resultado; não se corrigiu a expressão nesta auditoria.

| Primeiro motivo observado no núcleo atual | Linhas |
| --- | --- |
| ORIGEM_NAO_AUTORIZADA | 4891 |
| ELEGIVEL | 860 |
| TIPO_NAO_AUTORIZADO | 383 |
| DESCRICAO_EXCLUIDA | 121 |


Contagem independente, sem short-circuit: 383 falham Tipo, 5.274 falham Origem, 324 contêm INATIVO e zero contêm EXLUIR. Sobreposições reais: 383 Tipo + Origem; 203 Origem + INATIVO; 4.688 somente Origem; 121 somente INATIVO; 860 não falham nesses predicados. Por isso o primeiro motivo de Origem é 4.891, e não 5.274. Nenhuma categoria de motivo foi inventada para completar o balanço.

### Interpretação e decisão pendente

O código cumpre a regra literal vigente. A evidência mostra que ela **não cobre toda a taxonomia produtiva usada no ERP nem todo o universo operacional com fatos**. Isso não prova que todos os excluídos devam entrar no Master. Há produtos com uso real excluídos, ao lado de manutenção, embalagens e descrições INATIVO. Recomenda-se discutir uma política por códigos de negócio/escopo ERP com revisão versionada; a lista de códigos permitidos ou exceções precisa ser aprovada, não inferida de nome, prefixo ou presença de custos.

## 5. Auditoria dos 174 somente-operacionais

Base: os **174 códigos que possuem Custos, existem no Operacional e não existem no Master**, todos encontrados fisicamente no XLS. Não são os 5.260 somente-operacionais globais. O JSON registra para cada um: código, linha, descrição, Tipo, Descr(Origem), códigos ERP de origem/família, cinco agrupamentos e rótulos, presença em Custos/OP, classificação operacional e resolução exata nos catálogos.

```text
174 produtos de Custos somente-operacionais
├── Primeiro motivo: Descr(Origem) = 174
├── Reprovados por Tipo = 0
├── Marcador INATIVO = 0
├── Marcador EXLUIR = 0
├── Combinação dessas regras = 0
└── Motivo indeterminado = 0
```

| Descr(Origem) no arquivo | Produtos | Também possuem OP |
| --- | --- | --- |
| MISTURAS | 104 | 66 |
| MASSA PRODUZIDA FARDO/CX | 43 | 38 |
| PRODUTOS SEMI-ACABADOS | 13 | 11 |
| CEREAIS EMATER FD | 7 | 6 |
| COPA CATTERINO FARDO | 4 | 4 |
| COPA CATTERINO UN/ KG | 3 | 2 |


Todos são Tipo P; 174 têm Custos, **127 têm OP**, 174 têm origem operacional, 50 têm família operacional e nenhum tem agrupamento Kustos. Classificação operacional completa por origem + família + agrupamento: zero. Eles têm identidade válida e uso operacional observado; isso não concede automaticamente elegibilidade futura no Master.

Os seis códigos de origem desse recorte são **200, 300, 400, 432, 455 e 530**, todos resolvidos no catálogo atual. As famílias ERP resolvem para **50 produtos**; **124 produtos** têm 12 códigos de família sem correspondência por chave: **20001, 20002, 20003, 20004, 20006, 20008, 20009, 30002, 30003, 30004, 43202, 53009**. Não criar categorias ou pontes por descrição.

Esse achado não contradiz a Auditoria 1: **as 81 famílias dos 860 já elegíveis no Master continuam resolvidas**. Agora foi auditado também o conjunto excluído. Rever elegibilidade pode exigir uma decisão cadastral de famílias, além de mudar o conjunto de produtos, sem que essa decisão esteja tomada aqui.

## 6. Caso MASSA PRODUZIDA

| Descr(Origem) | Código ERP | Linhas | Excluídas | Com Custos | Com OP |
| --- | --- | --- | --- | --- | --- |
| MASSA PRODUZIDA FARDO/CX | 400 | 57 | 57 | 43 | 38 |
| MASSA PRODUZIDA PCT | 500 | 57 | 57 | 0 | 0 |


Total: **114 códigos**, todos excluídos; **43 com Custos e 38 com OP**; 112 já no Operacional. São 95 sem marcador INATIVO/EXLUIR e 19 com INATIVO na descrição. Para os 95, a Origem é o único impedimento entre os três predicados de elegibilidade. Não foi simulada ou aplicada uma nova regra de inclusão.

A taxonomia física do ERP usa o adjetivo feminino PRODUZIDA nos códigos 400/500, enquanto o filtro exige a substring masculina produzido. **Sim, existe variante taxonômica não coberta pelo literal previsto.** Isso é evidência para revisão humana do escopo, não autorização para transformar o texto ou admitir automaticamente os 114.

| Padrão literal na Origem | Linhas | Elegíveis após todas as regras | Excluídas | Com Custos | Com OP |
| --- | --- | --- | --- | --- | --- |
| PRODUZIDO | 793 | 694 | 99 | 273 | 180 |
| REVENDA | 188 | 166 | 22 | 0 | 0 |
| PRODUZIDA | 114 | 0 | 114 | 43 | 38 |


Outros rótulos reais sem os termos permitidos incluem MISTURAS, PRODUTOS SEMI-ACABADOS, CEREAIS EMATER e COPA CATTERINO, todos com fatos nos recortes acima. Há também TERCEIRIZADO sem PRODUZIDO e classes de materiais sem fatos. O arquivo tem 46 pares distintos código de origem/rótulo, sem um mesmo código com mais de um rótulo na fotografia; isso ajuda a revisar um contrato por código, mas não prova estabilidade universal da taxonomia.

## 7. Produtos novos

**Caminho atual do código X, sem executá-lo:**

| Etapa | Comportamento atual | Lacuna de reconciliação |
| --- | --- | --- |
| 1. Preview | Reader normaliza identidade e cabeçalhos, aplica filtros, verifica duplicidades e calcula dados ERP | Um X fisicamente presente pode ser E e não chegar ao conjunto candidato |
| 2. Comparação | Contexto compara contra dicionario_master_produtos; ausência nele gera NOVO_PRODUTO | Não compara existência no Operacional para propor inclusão operacional |
| 3. Aprovação | Manifesto/revisão, todas as propostas inclusive remoções/famílias aprovadas e confirmação administrativa | Aprovar um produto não autoriza atualizar outro cadastro ou ignorar remoções |
| 4. Master | Executor geral insere X no Master, com lote/proveniência, dentro do universo integral aprovado | Não há teto de 860; há dependência de arquivo completo |
| 5. Operacional | Não é criado pela execução do Master | Inclusão exige editor autorizado ou fluxo existente de fatos de Custos; não é automática nessa cadeia |
| 6. Classificação | Master guarda códigos oficiais; Operacional mantém referências próprias e agrupamento manual | Sem resolução exata não inventar categoria; Agrupamento não é preenchido pelo ERP |
| 7. Custos | Importação de fatos tenta garantir código/descrição operacionais e depois grava custos por produto/data | Garantia usa classificação NULL para ausentes e pode reportar falha parcial; não é reconciliador |
| 8. OP | Importação OP grava eventos, sem garantir cadastro operacional; leitura enriquece o que encontrar | OP pode existir antes do cadastro; cinco códigos atuais demonstram a lacuna |
| 9. Filtros | Custos mostra categorias de produtos com fatos, depois da projeção atual; Master sem custos não aparece só por estar cadastrado | Presença no Master não garante classificação operacional nem opção investigativa |
| 10. Histórico | Fatos preservam código, descrição snapshot, competência e importação; classificação consultada é atual | Atualizar cadastro não reescreve fatos nem cria classificação histórica retida |


**Dependências concretas de reconstrução completa:** `criarFonteManifestoDadosCadastroMestre` (transporte, linha 62) fixa RECONSTRUCAO_UNIVERSO; o adapter encaminha esse modo ao manifesto; a UI exige revisão integral e confirmação; o plano (linhas 6–14) exige RECONSTRUCAO_UNIVERSO_V2 e todas as decisões; o executor revalida contexto sob locks, aplica lista de remoções e prova igualdade integral com `plano.universo`. Não é seguro enviar somente o delta de um produto.

O modo INCREMENTAL histórico do núcleo não é aceito pelo plano geral atual. `importProductMasterXlsm` é um legado operacional com outro destino e outras regras; não deve ser usado como atalho para o Master. Seu resolver antigo aceita inclusive descrição, enquanto o caminho ERP vigente usa `resolverCodigoExato`; não reutilizá-lo cegamente num novo contrato.

**Conclusão:** o modelo comporta um novo código, mas o fluxo completo atual **não oferece manutenção incremental segura por delta de ERP até Operacional**. Os sete produtos elegíveis somente Master — 1041716, 1041716P, 1747719U, 1755712, 1755713, 1841715, 1841715P — já estão no Master e não são novos para ele. Dois possuem OP. Dois outros têm origem ERP 632 sem catálogo; isso deve ficar pendente, não virar classificação inventada.

## 8. Produtos ausentes

**Comportamento atual:** `core/cadastro-mestre-approval-engine.js`, linhas 107–120, distingue presença física de elegibilidade, mas no modo reconstrução ambos podem gerar `REMOVER_FORA_UNIVERSO`/DELETE somente do Master. O motivo é AUSENTE_NO_ARQUIVO se não há linha física; FORA_DO_CONJUNTO_FILTRADO se existe linha física e foi filtrada. Exige aprovação integral, confirmação e execução administrativa; selecionar/abrir Preview não apaga nada.

Não existe hoje coluna ativa/arquivada/ausente no Master. A remoção deixa imagem no snapshot/log e cópia durável, não uma linha mestre arquivada consultável pelo fluxo normal. Históricos e Operacional são protegidos, sem exclusão em cascata autorizada. Não houve remoção nesta tarefa.

**Evidência histórica:** lote 2 contém snapshot de 5.706 produtos e 4.853 remoções registradas, todas FORA_DO_CONJUNTO_FILTRADO; lotes 3/4/5 têm snapshot de 860 e zero remoções. A união dos snapshots consultados tem 5.713 códigos; todos existem fisicamente no XLS atual. Portanto **não há caso D físico observado nesses snapshots**, e não se deve chamar as 4.853 remoções de desaparecimento do ERP. O lote 1 não contém snapshot_master integral nesse formato; a prova não cobre todo o passado do ERP.

**Ausência não equivale a inatividade:** o código usa o marcador textual INATIVO na descrição, não um status formal estruturado do ERP. Nenhum código deve ser chamado de inativo só porque faltou num arquivo, e um arquivo parcial/erro de leitura não prova ausência. Mesmo um marcador explícito requer distinguir manter histórico de retirar do universo ativo.

**Impactos:** remoção do Master não apaga custos/OP ou identidade operacional, mas pode mudar a classificação analítica de Custos, que passa à fonte operacional quando o Master desaparece. Família operacional vazia pode fazer perder uma família antes resolvida pelo Master. OP continua lendo sua fonte operacional; o cruzamento pode exibir classificações diferentes sem alteração dos fatos. Manter a linha antiga do Master também exige política de validade, pois a presença atual continua sendo autoridade de Custos. Não alterar silenciosamente essa escolha.

**Recomendação não aprovada:** para manutenção recorrente, separar presença/validade/atividade de identidade e não autorizar exclusão física por mera ausência. Preservar dados e fatos até revisão de um arquivo comprovadamente completo. Preservar/arquivar/retirar do universo ativo e a forma de representar esses estados dependem de decisão humana; esta proposta **revê, para uma fase futura**, a política de remoção de CAD-REBUILD-01, sem revogá-la ou implementá-la agora.

## 9. Produtos excluídos pelo filtro

Há 5.395 excluídos fisicamente presentes; 5.259 já estão no Operacional e 136 não estão. Entre os existentes, todos mantiveram identidade e valores. Os 174 de Custos e os 175 de OP excluídos são exemplos concretos de uso operacional fora do recorte Master, sem INATIVO/EXLUIR nos casos com esses fatos.

E não é uma categoria de exclusão operacional. Recomenda-se conservar os códigos e a classificação manual de quem já existe, apresentar o motivo da regra/versionamento e solicitar revisão do escopo sem apagar ou reclassificar. A eventual presença em fatos não aprova automaticamente elegibilidade no Master; gera evidência para a decisão.

A implementação atual remove do Master um existente fora do conjunto elegível apenas no fluxo integral aprovado. Recomendar preservação/estado separado para a futura manutenção exige revisar esse contrato explicitamente; não significa que essa regra nova já existe ou que se possa reexecutar uma carga histórica.

## 10. Campos vazios

| Campo no arquivo elegível | Vazios / 860 | Atualização vigente de existente | Novo produto |
| --- | --- | --- | --- |
| descricao | 0 | Vazio/coluna ausente preserva o atual | Recebido não vazio ou omitido/NULL conforme contrato e default |
| origem_cod | 0 | Vazio/coluna ausente preserva o atual | Recebido não vazio ou omitido/NULL conforme contrato e default |
| familia_cod | 0 | Vazio/coluna ausente preserva o atual | Recebido não vazio ou omitido/NULL conforme contrato e default |
| agrupamento_erp_valor | 482 | Vazio/coluna ausente preserva o atual | Recebido não vazio ou omitido/NULL conforme contrato e default |
| agrupamento_comercial_erp_cod | 698 | Coluna presente vazia limpa para NULL; ausente preserva | Recebido não vazio ou omitido/NULL conforme contrato e default |
| agrupamento_comercial_erp_descricao | 698 | Coluna presente vazia limpa para NULL; ausente preserva | Recebido não vazio ou omitido/NULL conforme contrato e default |


As seis colunas canônicas estão presentes neste arquivo. Há **855 elegíveis com algum vazio** nos agrupamentos opcionais; os 860 têm descrição, origem e família preenchidas. Não tornar agrupamento obrigatório por causa desse total. No catálogo remoto, descrição/origem/família/agrupamentos do Master são nullable e sem default de conteúdo; apenas código é obrigatório/PK.

O Preview exige cabeçalhos Produto/Descrição/Tipo/Descr(Origem), mas não garante descrição preenchida em toda célula elegível. Origem textual vazia falha no filtro, enquanto `origem_cod` ou `familia_cod` vazio pode permanecer sem resolução. Zero casos de descrição/origem/família vazios nos elegíveis atuais não prova que o runtime os bloqueie em todo arquivo futuro.

**Distinção atual possível:** `colunas`/`Object.hasOwn` distinguem coluna opcional ausente de célula vazia durante leitura, transporte e Preview. `textoCadastro` colapsa célula vazia/NULL/espaços para null. O Master final, sozinho, não distingue não informado, não aplicável, nunca carregado ou preservado de carga antiga; um FK de última escrita não completa essa semântica por campo.

O significado de “não aplicável” só pode vir de sinal explícito da fonte ou decisão de negócio aprovada. Não inferir do campo nulo. A regra já aprovada do par comercial é uma **instrução de limpeza quando fornecido vazio**, não uma licença genérica para limpar descrição, origem, família ou agrupamento Kustos. Esta auditoria não revoga essa exceção.

**Recomendação:** preservar presença da coluna e valor original na evidência; tratar ausência de coluna como não fornecido; manter as regras de vazio por campo já aprovadas e rotular semântica desconhecida. Novas limpezas ou mínimos obrigatórios dependem de contrato, sem nova inferência ou migration nesta entrega.

## 11. Preservação da classificação Kustos

Para o cenário ERP Família X/Origem Y/Agrupamento ERP Z e Operacional Família A/Origem B/Agrupamento Kustos G, a carga ERP atual pode atualizar os **campos ERP do Master** após revisão, mas o executor geral mantém o Operacional integralmente protegido. A nova carga não transforma Z em G nem sobrescreve A/B/G. Na análise de Custos, a projeção atual usa X/Y quando o Master existe; OP mantém A/B. Esse contrato de leitura continua intacto.

| Campo/dado | Autoridade/estado atual | Recomendação para futura reconciliação |
| --- | --- | --- |
| codigo_produto | Chave de negócio compartilhada, normalizador existente | Usar exatamente a chave canônica, sem renomear por descrição |
| Master.descricao, origem_cod, familia_cod | ERP oficial persistido, com regras aprovadas de atualização/vazios | Manter origem ERP e propor diferenças explícitas; nunca atribuir código como FK sem resolução |
| Master.Agrup. Prod./Com. | ERP bruto independente do agrupamento Kustos | Preservar em campos próprios; nenhuma conversão automática |
| Operacional.descricao | Rótulo operacional existente; proveniência manual completa não é garantida | Preservar por padrão; patch oficial somente com escopo/decisão explícitos |
| Operacional.origem_id/familia_id | Classificação operacional, editável; não é espelho persistido do Master | Vazio pode ser candidato a preenchimento exato aprovado; preenchido diferente vira conflito, não overwrite automático |
| agrupamento_cod / override / origem de classificação | Kustos investigativo/manual; override e proveniência estão vazios na fotografia | Preservar G e seus metadados, incluindo intenção manual de remoção; não inferir de ERP ou mapa |
| Histórico de Custos e eventos OP | Fatos ERP e proveniência de importação | Não alterar conteúdo, descrição snapshot, código, datas, custos ou métricas por reconciliação cadastral |
| Catálogos de origem/família | Código exato resolve um ID existente; famílias têm fluxo aprovado específico | Não escolher vencedor por texto/UUID nem criar categoria sem proposta/decisão próprias |


**ERP authoritative** significa autoridade sobre os campos oficiais no Master, não autorização geral para apagar classificação operacional diferente. **Kustos authoritative** inclui o agrupamento investigativo/manual e a preservação das decisões operacionais existentes até revisão do conflito. Como falta proveniência por campo, não se pode presumir que A/B eram erro ou que eram escolhas manuais intencionais: preservar e revisar é o comportamento técnico seguro recomendado.

Preencher somente vazios ainda é uma escrita nova no Operacional, atualmente fora do executor geral; requer aprovação do escopo e do conflito/precedência. Nenhum dos 165 produtos de Custos nem dos 686 globais foi atualizado. Não confundir o resolver legado que admite descrição com o resolver por código exato do fluxo ERP vigente.

## 12. Identidade do produto

A chave é **codigo_produto**; OP usa `cod_produto` no fato e compartilha o mesmo `normalizeCodigoProduto()`. Descrição, origem, família, agrupamento, unidade e sufixo “ - U” não são chave. Não criar normalizador novo, cast geral para Number, preenchimento arbitrário de zeros ou junção aproximada.

Implementação em `core/spreadsheet-engine.js:157–194`: NFKC, remoção de caracteres invisíveis, trim e remoção de espaços internos de identidade; rejeição de negativos; remoção de separador de milhar quando o padrão inteiro corresponde; expoentes convertidos apenas para inteiro finito; números finitos inteiros; decimal textual com apenas zeros fracionários perde a fração; outro decimal é rejeitado; sinal + inicial é removido. Caixa de código alfanumérico é preservada. O Preview adicionalmente exige tipos escalares e rejeita número não seguro.

| Entrada examinada localmente | Saída do helper real |
| --- | --- |
| "000001" | 000001 |
| 1 | 1 |
| "001" | 001 |
| " 00 01 " | 0001 |
| "MB001" | MB001 |
| "mb001" | mb001 |
| "1E+6" | 1000000 |
| "2.081" | 2081 |
| "12.0" | 12 |
| "12.5" | Vazio / rejeitado |
| "-1" | Vazio / rejeitado |
| null | Vazio / rejeitado |


`001` textual não se torna `1`: zeros significativos são preservados quando conhecidos. O adapter também usa a máscara Excel inteira de zeros para restaurar identidade representada pela célula; precisão já perdida antes da leitura não pode ser inventada. Conversão de expoente usa Number, portanto não prometer precisão decimal arbitrária fora dos guardas existentes.

No arquivo atual: 6.255 códigos distintos, zero duplicidades; nas tabelas da fotografia, zero códigos inválidos, alterados ou colididos pela normalização. O Preview bloqueia identidade duplicada no contexto e duplicidades do arquivo mesmo quando uma ocorrência foi filtrada; não escolhe last-wins. As PKs existentes protegem código no Master e Operacional. O sufixo de descrição “ - U” dos 447 produtos de Custos não cria outro código.

## 13. Origem/Família

| Superfície | Tipo físico remoto | Forma/uso observado |
| --- | --- | --- |
| categorias_origem.id | TEXT | 50 IDs iguais aos respectivos codigo de negócio |
| Operacional.origem_id | TEXT | 6.112 preenchidos, numéricos textuais, iguais ao codigo da categoria; zero órfãos |
| categorias_familia.id | TEXT | 103 IDs em formato UUID, diferentes de codigo |
| Operacional.familia_id | TEXT | 319 preenchidos em formato UUID; zero órfãos |
| Master.origem_cod / familia_cod | TEXT | Códigos ERP, não FKs operacionais |


A inconsistência semântica apontada foi confirmada: Origem usa uma referência que hoje também é código de negócio; Família usa uma referência UUID. **Fisicamente ambos são TEXT**, não tipos SQL UUID distintos. Não generalizar que `id === codigo` valha para todas as categorias.

Impactos: reconciliação/importação precisam resolver **codigo exato → uma categoria → seu id** para ambos; API/filtros/Cadastro já comparam IDs como strings e usam rótulos oficiais; gravar `familia_cod` diretamente em `familia_id` quebraria o contrato mesmo que pareça um código válido. OP usa Operacional e Custos usa a projeção ERP atual; não comparar UUID à coluna de código nem harmonizar as duas fontes silenciosamente.

**Recomendação sobre pré-requisito:** resolver essa semântica no contrato, no mapeamento e nas provas **antes de implementar** qualquer writer de reconciliação. Uniformização física do schema não é pré-requisito demonstrado: a resolução exata existente já é determinística e os preenchidos atuais não têm órfãos. Uma futura migration precisaria de justificativa e autorização separadas; não recomendá-la por analogia.

Catálogos pendentes continuam explícitos: origem 632 em dois somente Master, sem resolução atual; no conjunto dos 174 excluídos, 12 códigos de família pendentes para 124 produtos. Não converter a semântica de ID em justificativa para criar categorias ou fazer fallback por descrição.

## 14. Impacto em OP

| Produtos distintos de OP | Quantidade |
| --- | --- |
| Total identificável | 355 |
| Compartilhados Master + Operacional | 178 |
| Somente Master, sem Operacional | 2 |
| Somente Operacional, sem Master | 172 |
| Sem Master e sem Operacional | 3 |
| Sem Master (172 + 3) | 175 |
| Excluídos pelo filtro, todos presentes fisicamente | 175 |
| Com classificação atual por origem/família | 135 |
| Sem classificação atual por origem/família | 220 |
| Com agrupamento Kustos | 0 |


Os cinco sem Operacional são **1755712, 1755713, 1758717, 1758718 e MCC016**; os dois primeiros existem no Master. Nenhum dos 355 está ausente fisicamente do XLS; nenhum falha Tipo ou contém os marcadores INATIVO/EXLUIR. O filtro de Origem exclui 175, inclusive 38 em MASSA PRODUZIDA.

Os 135 classificados seguem o status atual `getProductClassificationStatus` (origem + família); **classificação completa incluindo Agrupamento é zero**. Não mudar esse status ou o engine nesta auditoria. Presença de OP válida não é permissão para copiar classificação de custo.

Custos/OP compartilham **278 códigos no histórico global**, com 169 somente Custos e 77 somente OP, união de 524. Não são 278 pares mensais certificados. Usar o Master filtrado de 860 como única identidade universal excluiria 174 códigos de Custos e 175 de OP. O arquivo bruto contém todos esses fatos por código, mas a dimensão operacional ainda falta para cinco de OP.

**Conclusão técnica:** o Master pode fornecer atributos oficiais, mas o subconjunto filtrado atual não serve sozinho como universo de identidade comum. Recomenda-se a chave canônica e a dimensão operacional existente como vínculo persistente, com pendências explícitas e revisão de inclusão dos ausentes; não criar segunda fonte de verdade nem condicionar disponibilidade do histórico à elegibilidade atual do Master. OP × CUSTO mantém sua chave produto + competência, fontes e prioridades separadas.

## 15. Mapa de decisão

| Situação | Comportamento atual | Comportamento recomendado — não executado | Decisão humana necessária? |
| --- | --- | --- | --- |
| Produto novo | INSERT candidato só no Master após arquivo integral/revisão; Operacional não é incluído | Propor inclusão por código e por destino, com aprovação, diagnóstico de catálogo e sem exigir grupo fictício | SIM — modo de manutenção e alcance de inclusão operacional |
| Produto compartilhado | Atualiza Master aprovado; Operacional protegido; leituras mantêm autoridades distintas | Atualizar campos oficiais e apresentar diferenças operacionais; não sobrescrever preenchidos automaticamente | SIM — campos autorizados e política de conflitos |
| Produto somente operacional | É preservado; pode ter fatos mesmo fora do Master | Preservar identidade/fatos/manual e separar sem arquivo de filtrado | Preservação já exigida; SIM para qualquer nova projeção ERP |
| Produto ausente do ERP | Pode gerar DELETE do Master em reconstrução aprovada, com snapshot/log | Não tratar ausência como inatividade; revisar validade/arquivo completo e preservar antes de decisão de ciclo de vida | SIM — revisão explícita de CAD-REBUILD-01 para manutenção futura |
| Produto excluído pelo filtro | Pode sair do Master por FORA_DO_CONJUNTO_FILTRADO; Operacional/fatos mantidos | Mostrar E e motivo/versionamento, preservando operacional; revisar elegibilidade por política aprovada | SIM — taxonomia/códigos/exceções permitidos |
| Campo ERP vazio | Preserva existente, exceto comercial fornecido vazio que limpa para NULL | Manter presença de coluna e regra por campo; não inferir não aplicável/nunca carregado | SIM somente para novo significado, mínimo obrigatório ou limpeza diferente |
| Divergência ERP/Operacional | Master oficial e classificação operacional coexistem, sem sincronização | Conflito revisável com antes/depois, autoridade por campo e aprovação específica | SIM — se/quando atualizar cada campo operacional |
| Classificação Kustos existente | Permanece no Operacional e não deriva dos cinco Agrup.* | Preservar valor/override/proveniência e intenção manual; edição fora da carga ERP | Preservação já estabelecida; nova substituição requer decisão própria |


## 16. Contrato recomendado

**Proposta conceitual para revisão, não contrato aprovado.** Mantém as garantias de identidade, fatos, aprovação e proteção manual; propõe separar manutenção recorrente da reconstrução integral. Modificações de política abaixo são explicitamente futuras.

### Fonte

ERP é autoridade dos campos oficiais brutos no Master; Kustos é autoridade do agrupamento investigativo e das decisões operacionais manuais. Origem/família operacional têm regra de conflito aprovada, nunca sobrescrita apenas por diferença. Manter a autoridade analítica atual CUSTOS-ERP-01 e a fonte operacional de OP enquanto não houver decisão específica de alteração.

### Identidade

Usar `normalizeCodigoProduto()` e os códigos canônicos/PKs existentes. Separar identidade de elegibilidade e atividade; preservar código bruto e linha na evidência. Nunca deduplicar por descrição, eliminar zeros arbitrariamente ou converter UUID em chave de negócio. Bloquear ambiguidades e leituras incompletas.

### Inclusão

Separar X novo no Master de X novo no Operacional. Preview deve mostrar destino, presença física, elegibilidade, campos e resolução de catálogo. Incluir somente o escopo aprovado, sem fabricar categoria; código com classificação pendente pode permanecer identificado sem ser chamado de classificado. A política de criação operacional é decisão nova, não capacidade já existente da execução do Master.

### Atualização

Gerar diff por produto/campo, com imagem anterior e fonte oficial, preservando ausentes no modo incremental se esse modo for aprovado. Preenchido diferente no Operacional é conflito; vazio só pode ser preenchido por código exato após aprovação do escopo. Não reutilizar o executor atual alterando sua whitelist de forma implícita: ele protege o Operacional, e um writer que o modifique requer contrato/validação próprios.

### Ausência

D exige arquivo completo comprovado e presença anterior demonstrável. Falha de leitura, arquivo delta e produto fora do conjunto filtrado não são D. Recomenda-se preservar identidade e dados até decisão explícita de validade/atividade; revisar a política de DELETE do Master e seus efeitos na projeção de Custos antes de adotar outro comportamento. Representação persistente de ausência/arquivo/ativo ainda não está definida e não foi criada.

### Exclusão

E registra presença física e motivo da regra, não elimina Operacional ou fatos. Marcador INATIVO na descrição deve ser distinto de ausência e de um eventual status estruturado ERP. Elegibilidade por códigos ou variantes textuais só muda depois de política aprovada/versionada. Não admitir automaticamente todo produto com fato nem excluir automaticamente quem deixou de ter movimento.

### Vazios

Guardar na revisão presença da coluna, valor bruto, valor canônico, atual e proposta. Não fornecido preserva; célula vazia segue política por campo. Conservar a exceção comercial já aprovada. Não transformar ausência em zero/SEM_AGRUPAMENTO nem afirmar não aplicável sem prova. Definições novas de mínimos obrigatórios/limpeza precisam de aprovação.

### Classificação manual

Preservar `agrupamento_cod`, override e proveniência; manter G operacional independente de Z ERP. Não assumir que A/B operacionais eram erro quando divergem de X/Y oficiais. Qualquer substituição exige conflito explícito e aprovação. Não preencher grupo nem criar ponte ERP → Kustos como parte desta manutenção.

### Proveniência

Identificar carga, arquivo/aba/hash, versão da regra de elegibilidade, código/linha de origem, destino e campos efetivamente alterados. O estado atual tem `ultima_importacao_cadastro_mestre_id` por última escrita da linha e `agrupamento_erp_importacao_id` específico de Prod.; isso não é proveniência completa de todos os campos nem prova de valor nunca carregado. Preservar inalterados os timestamps/proveniências de quem não muda. Hash de arquivo no modo web é declarado pelo browser, não assinatura de autenticidade ERP.

### Auditoria

Vincular a aprovação ao diff integral e ao contexto revalidado; registrar ator, decisão, escopo e antes/depois. Hoje o backend web deriva o autor da identidade Auth autorizada (`supabase-auth:<id>`); o CLI recebe autor declarado. Não equiparar uma string do CLI a identidade autenticada nem afirmar autoria individual por campo que o log não fornece. A futura reconciliação deve usar os controles existentes, sem enfraquecer Auth/RLS ou criar permissão implícita.

### Reversibilidade

Planejar imagens anteriores de todos os destinos autorizados e catálogos afetados, snapshots duráveis, prova final e reversão transacional no backend administrativo. O mecanismo atual cobre Master e famílias aprovadas, com Operacional/fatos protegidos; não é restauração automática de ambos os cadastros. Antes de desfazer, verificar se o estado ainda é o posterior aprovado para não apagar edições posteriores. COMMIT incerto exige conferência do lote, não retry. Nunca reescrever ou apagar fatos históricos para desfazer cadastro.

Nenhuma migration, tabela, coluna, endpoint, RPC, novo normalizador ou executor foi criado para essa proposta. A escolha de representação de estados e execução coordenada é uma etapa futura de arquitetura depois das decisões de negócio.

## 17. Decisões que dependem de aprovação humana

1. **Escopo de elegibilidade:** quais códigos/taxonomias ERP pertencem ao Master e como tratar PRODUZIDA, MISTURAS, semiacabados, EMATER/COPA e marcadores textuais. Não aprovar uma ampliação por analogia; revisar também EXLUIR/EXCLUIR antes de qualquer mudança.
2. **Modo de manutenção e inclusão:** adotar delta incremental ou seguir somente arquivos integrais; em quais condições a aprovação ERP deve também propor/criar identidade no Operacional, incluindo os sete atuais e os códigos de OP fora do Master.
3. **Autoridade e conflitos operacionais:** quais campos podem receber preenchimento/atualização ERP, quando preservar manual, quem decide conflitos e quais mínimos de conteúdo/catalogação são exigidos. Não há decisão de copiar Z para G.
4. **Ausência/atividade:** manter ou revisar a remoção física do Master por ausência/filtro; definir preservação/arquivamento/universo ativo e validade da classificação para análise, sem confundir falta de linha com inatividade.
5. **Categorias pendentes no escopo que vier a ser aprovado:** resolver códigos sem correspondência por processo cadastral aprovado, inclusive origem 632 e as 12 famílias do recorte excluído, se forem incluídos. Nenhuma criação está autorizada agora.

Não é necessário reabrir decisões já estabelecidas de preservar fatos, usar código canônico, manter Agrupamento Kustos separado e exigir aprovação/revalidação. Uniformizar fisicamente IDs não foi demonstrado como pré-requisito e não é uma migration proposta nesta entrega.

## 18. Riscos

- Tratar 860 como limite ou como universo universal apaga conceitualmente produtos operacionais com fatos.
- Confundir C físico (1) com fora do Master (5.260) ou E (5.395) gera exclusões injustificadas; confundir 4.853 remoções históricas por filtro com ausência é factualmente errado.
- Tratar todas as 114 massas como ativas ignora 19 descrições INATIVO; tratar as 95 restantes como automaticamente aprovadas decide negócio sem autorização.
- Ampliar Origem sem rever EXLUIR/EXCLUIR pode admitir descrições hoje barradas por outra regra; os 64 casos atuais não foram admitidos.
- Passar `familia_cod` diretamente a `familia_id` perde o vínculo; copiar código por semelhança de rótulo escolhe categoria indevidamente.
- Ampliar o Master pode trazer 124 produtos da coorte com famílias ERP sem catálogo, além de criar pendências de classificação.
- Campos vazios não carregam significado de não aplicável/nunca carregado; aplicar limpeza genérica destrói valores e contradiz as regras de campo vigentes.
- Novo produto no Master não garante Operacional; depender da ordem de importação de fatos deixa OP sem classificação.
- Retirar ou manter uma linha do Master altera o caminho de classificação atual de Custos; preservar fatos não basta para afirmar que a interpretação ficou igual.
- Estado manual desconhecido e proveniência de agrupamento vazia impedem atribuir uma divergência a erro ou autor. Reverter snapshot sem validar edições posteriores pode sobrescrever trabalho válido.
- Dados de arquivo de 22/10 e snapshots conhecidos não equivalem a todo o histórico do ERP ou ao estado do ERP ao vivo em 30/10.

### Preservação do banco

Baseline por SELECT das **12 tabelas públicas** em **30/10/2026 14:26:23** (17:26:23 UTC). Primeiro controle às **14:35:17** (17:35:17 UTC): todas as contagens/fingerprints idênticas; coincidência também com a Auditoria 1. **Controle final às 14:43:02 (17:43:02 UTC): as 12 contagens/fingerprints continuaram idênticas ao baseline.** O JSON contém as três imagens de controle (antes, intermediário e depois). Nenhum comando remoto de escrita ou função de writer foi executado.

| Tabela | Registros no baseline |
| --- | --- |
| apontamentos_op | 1.469 |
| categorias_agrupamento | 34 |
| categorias_familia | 103 |
| categorias_origem | 50 |
| dicionario_master_produtos | 860 |
| dicionario_produtos | 6.113 |
| familias_base | 21 |
| historico_custos | 2.481 |
| log_importacao | 31 |
| log_importacao_cadastro_mestre | 5 |
| log_importacao_op | 8 |
| mapa_produtos | 299 |


Fingerprint é MD5 de `jsonb_agg` de linhas completas ordenadas por `to_jsonb(linha)::text`; foi usado para igualdade observada, não assinatura de segurança. Leitura de controle não prova ausência de mutação transitória por terceiro seguida de reversão. Se diferença fosse encontrada, a tarefa seria interrompida; nenhuma foi encontrada nos controles registrados.

### Qualidade e preservação do checkout

- Testes completos: **990/990**, 52 arquivos, 44,30 s, `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=dot`.
- Relacionados ao Cadastro Mestre/Operacional: **433/433**, 22 arquivos, 24,56 s, selecionados por `*cadastro-mestre*.test.js` e `*product-master*.test.js` (incluindo API/UI/SQL local/transportes/reconstrução).
- Lint: `node node_modules/eslint/bin/eslint.js .` — passou, zero erros/avisos.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — passou.
- Build: `buildWeb` de `scripts/build-web.mjs` — passou; configuração pública do projeto validada pelo hostname, saída local ignorada `dist`, sem modificar runtime versionado ou publicar.
- Nenhum teste novo/runtime foi criado. A análise usou o helper de identidade real, reader/adapter e evidências existentes; nenhuma aprovação ou execução de carga foi disparada.
- `git diff --check`: passou. Os arquivos novos também tiveram whitespace/newline conferidos diretamente; JSON, 174 códigos, 114 massas, 6.256 estados, 19 seções e links locais reconciliados. Predicados auditados coincidiram com o Preview real nas 6.255 linhas, sem alterar a regra. SHA-256 do JSON final: **b2351e66edbe4dd311bb7e6efb25c12238f528b804dd2aceb3ed56896f53e399**.

Somente os dois documentos desta Auditoria 2 foram criados. Os dois documentos da Auditoria 1, demais históricos, código, filtros, parser/importador, APIs, schema/RLS/Auth e motores de Custos/OP/OP×CUSTO foram preservados. README/AGENTS/VISION/ROADMAP/manuais/backlog não foram reescritos para promover recomendação ainda não aprovada.

## 19. Próximo passo

Realizar uma revisão de negócio do mapa de decisão e do contrato recomendado: aprovar o universo elegível, os destinos/campos da manutenção incremental, conflitos/vazios e a política de ausência. Só depois preparar um plano técnico revisável, com prova de preservação e reversibilidade, separado de qualquer execução produtiva.

**Não implementar as recomendações nesta etapa. Nenhuma linha foi inserida, atualizada ou removida durante esta auditoria.** Sem importação real, reconstrução, migration, nova ponte de agrupamento, alteração de filtro/runtime, commit, push ou deploy.
