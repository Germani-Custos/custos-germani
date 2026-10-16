# Manual do Usuário — Kustos Germani

Guia do comportamento implementado no checkout, revisado em **16/10/2026**. Publicação das entregas recentes é acompanhada no [ROADMAP](../../ROADMAP.md); este manual não confirma o estado do ambiente remoto. Instalação: [Manual Técnico](manual-tecnico.md). Rotina e recuperação: [Manual de Operação](manual-operacao.md).

## 1. Acesso e áreas da aplicação

Sem sessão ativa, o fluxo principal de Custos/OP apresenta login antes da carga de masters/metadados e apontamentos. Depois da entrada, o cabeçalho identifica o usuário e oferece saída. A aplicação tem cinco áreas:

- **Importação:** carregar custos por competência.
- **Custos:** investigar variações, regime e histórico por produto.
- **OP:** importar MCAP105 e investigar apontamentos.
- **Cadastro:** manter classificação operacional e consultar Master ERP.
- **Documentação:** consultar/editar os documentos disponibilizados no seletor.

## 2. Competência e importação

**Competência (`data_referencia`)** é o mês/período a que o dado pertence no ERP. **Importação (`criado_em`)** é quando ele entrou no sistema. Uma planilha de março enviada em maio continua sendo da competência março; o evento de entrada é maio. As telas identificam os dois eixos separadamente.

Em Custos, **Intervalo** inclui todas as competências entre início e fim. **Comparação** usa somente as duas informadas: Junho + Agosto não inclui Julho. Fila, KPIs, gráficos e drill-through respeitam o mesmo recorte.

## 3. Importar custos

1. Abra **Importação** e escolha a **Data de Referência (Competência)** antes do arquivo.
2. Arraste ou selecione o `.xlsx`. Colunas extras podem permanecer.
3. Confira as cinco colunas obrigatórias: Produto, Descrição, Custo Variável, Custo Direto Fixo e Custo Total. Se o reconhecimento automático falhar, associe cada campo à coluna correta na janela de mapeamento.
4. Revise o preview: válida será gravada; atenção exige conferência, mas pode ser gravada; erro bloqueia a linha. A amostra mostra as primeiras 20 linhas; todas as linhas do arquivo são validadas.
5. Confirme a importação e confira Total / Importadas / Falhas. Código inválido ou ambíguo é erro de linha; não é substituído por um código aproximado.

A normalização trata espaços, caracteres invisíveis e notação científica; preserva zeros à esquerda quando a origem textual permite. Valores monetários brasileiros são convertidos com precisão de até quatro casas decimais.

Reimportar produto/competência atualiza o registro, em vez de duplicá-lo. O banner sinaliza produtos sem classificação; não invente categoria para eliminá-lo. **“Não foi possível validar produtos sem agrupamento.”** significa diagnóstico indisponível, e não ausência de pendências.

## 4. Investigar custos

### Chegar ao produto

Na área **Custos**, digite código ou descrição na busca rápida e escolha a sugestão, ou defina o período e refine Origem → Família → Agrupamento → Produto. A cascata mostra apenas dados existentes e remove seleções dependentes quando o filtro anterior muda. Depois da primeira análise, alterações de filtros atualizam o relatório; **Analisar** permite solicitar a execução. Chips mostram filtros ativos e podem ser removidos pelo x.

### Ler a fila

Os quatro KPIs são clicáveis: Itens analisados, Alertas (>5%), Mudanças de Regime e Média de variação. O filtro de média mostra variações positivas. Apesar do rótulo **Alertas (>5%)**, o critério é variação absoluta **≥ 5%**, incluindo quedas, entre última e penúltima importação (`criado_em`) no recorte de competência. Sem comparativo anterior, o delta não representa o custo inteiro.

A fila mostra produto, variação, prioridade, regime e contexto automático; **Detalhes** expande custos, datas e score. Sem ordenação manual, a prioridade orienta a investigação; clicar no cabeçalho muda a ordenação. A janela visual mostra até 200 itens na ordem ativa e informa o excedente. Refine filtros/período para trazer outros itens; KPIs e exportação continuam considerando o relatório completo.

Instabilidade é a média das variações percentuais absolutas consecutivas: ESTÁVEL abaixo de 3%, OSCILANDO de 3% até menos de 8%, MUITO INSTÁVEL a partir de 8%. Com pelo menos quatro pontos, estabilidade na primeira metade e instabilidade na segunda sinalizam mudança de regime.

### Histórico e gráficos

Clique na linha do produto para abrir o drill-through: competências selecionadas, importações, custos variável/fixo/total e Δ/Δ% em relação ao registro anterior desse recorte. Variações absolutas ≥ 5% recebem destaque. Meses intermediários não entram na Comparação.

O gráfico temporal usa competência: custo unitário do produto selecionado ou média agregada quando não há produto, com média histórica e tendência. `criado_em` escolhe o registro mais recente por produto/competência. Comparação e TOP variações usam os últimos timestamps de importação; existe a [ressalva LOG-02](../auditoria/robustez-erros-validacao.md), pois chunks podem pertencer ao mesmo lote lógico.

### Exportar

Rode a análise e clique **Exportar**. Todos os campos começam marcados; desmarque os indesejados e confirme. Cancelar não gera arquivo. O XLSX conserva a ordem canônica das colunas e tem abas **Contexto** e **Fila Investigativa**. Respeita filtros, fila rápida e ordenação ativa; sem ordenação manual, usa criticidade → regime → magnitude → reincidência → instabilidade. O nome inclui o período analisado.

## 5. Importar e investigar OP

Na área **OP**, selecione o CSV MCAP105, confira a amostra, informe competência e confirme. OP formatada como `2.081` é gravada como inteiro `2081`. Após importar, a carga local é renovada e fila/dossiê incorporam os novos apontamentos.

Filtre Estágio, Origem, OP, Produto, competência e Motivo da investigação. Depois da primeira análise, mudar filtros atualiza a fila. A coluna **Decisão** informa se merece investigação e a prioridade, cruzando produção, tempo, KG/Hora e paradas:

- **Gargalo de produtividade:** tempo alto e produtividade baixa sem parada material que explique o resultado; conferir processo, padrão, matéria-prima ou apontamento.
- **Desperdício operacional:** entrega com tempo alto, KG/Hora baixo e parada material; prioridade alta.
- **Paradas com impacto:** parada material, atraso, déficit de produção e queda/não melhoria de produtividade; prioridade máxima.
- **Baixa produção:** volume abaixo do plano sem redução correspondente de tempo; investigar perdas, disponibilidade, programação, material ou encerramento.
- **Tempo justificado pelo volume:** produção adicional explica o tempo e a produtividade permanece praticamente estável; sem alerta.
- **Parada sem impacto:** registrar sem priorizar quando entrega, tempo e produtividade permanecem normais.
- **Alta eficiência:** referência positiva; ausência de base prevista suficiente impede concluir eficiência.

Abra **Ver dossiê** para conferir decisão e evidências. **Dados do ERP (imutáveis)** ficam separados de **Indicadores calculados pelo Kustos**. `% Tempo (ERP)` é conferência, nunca sentença isolada. Competência e importação são rastreabilidade, sem entrar nas fórmulas de execução.

## 6. Cadastro

### Cadastro Operacional

Pesquisa, edição e **Cadastrar produto** mantêm a classificação Kustos consumida por Custos/OP. A dimensão operacional pode conter materiais fora do universo Master ERP. Produto não resolvido aparece como **Produto sem classificação**; não invente Origem/Família.

Para remover um agrupamento, **Editar → Sem agrupamento → Salvar classificação**. Cancelar preserva o cadastro. Essa intenção manual é diferente de célula ERP vazia, que preserva valores no fluxo de importação correspondente. A lista rola nos dois eixos dentro de uma área limitada à janela, com cabeçalho fixo e barra horizontal acessível.

O aviso **código(s) importado(s) ausente(s) do cadastro operacional** compara códigos únicos importados com o operacional completo, independentemente dos filtros visuais. Erro de leitura deve ser tratado como indisponibilidade, sem cadastrar ou reconstruir para compensá-lo.

### Cadastro Mestre ERP

Consulta independente do universo ERP, sem editar/excluir/cadastrar/classificar. Totais são dinâmicos; busca por código/descrição, origem/família e páginas de 50 consideram todo o universo carregado. Alternar fontes preserva seus filtros/página. **Atualizar consulta** relê os dados, conserva filtros válidos e retorna à primeira página; não sincroniza bases.

Origem/família usam códigos ERP exatos e mostram descrição ou pendência explícita. **Agrupamento ERP** é valor bruto, separado da classificação operacional. Falha de carga não vira zero nem usa o operacional como substituto.

### Preview, aprovação e execução

1. Use **Preview mestre (XLSM / XLSX / XLS)** com o original ERP; não é necessária conversão do XLS.
2. Confira linhas, produtos válidos, novos, alterações, preservações de campos e **remoções do Master**. Filtros: Tipo P/C → Descr. (Origem) contendo Produzido/Revenda → excluir descrição com inativo/EXLUIR. Produtos fora do universo são removíveis somente do Master; vazios de quem permanece preservam o existente.
3. Confira separadamente **Catálogo de famílias ERP**: código, rótulo, situação, impacto e decisão. Rótulos iguais podem identificar códigos diferentes; conflitos bloqueiam e exigem corrigir a fonte e gerar novo Preview.
4. Escolha Aprovado/Rejeitado/Pendente por proposta ou ações globais. Aprovar produto não aprova família. Descrição/agrupamento de existente têm decisões próprias; novo produto é indivisível. Qualquer proposta pendente/rejeitada impede a execução inteira.
5. **Baixar revisão (sem gravar)** salva evidência local. **Fechar** descarta a revisão. Seleção, decisão e download não escrevem.
6. Com aprovação integral e disponibilidade administrativa, **Executar reconstrução…** abre outra confirmação. Confira as contagens atuais e digite `RECONSTRUIR <quantidade final>`. Cancelar não envia execução.

A execução web transporta dados canônicos compactos, não o binário original. Mudança de arquivo/contexto ou revisão incompatível exige novo Preview/aprovação. Sucesso informa lote e contagens; erro/resposta perdida exige **consultar o lote**, sem repetir automaticamente. `CAD_UI` nasce localmente e sozinho não prova persistência; lote ausente pode representar execução em curso. Guarde original, revisão e identificador. [Contrato e limites](../arquitetura/cadastro-mestre-execucao-web.md).

## 7. Documentação

Selecione documentos agrupados em Manuais, Regras e Auditoria técnica. **Editar** abre Markdown e prévia sanitizada; **Salvar** solicita commit no GitHub, e **Cancelar** descarta. A publicação depende do redeploy; não há prazo garantido nesta revisão.

O login da aplicação e a autorização da função de gravação são fronteiras distintas: a função `api/save-doc.js` não valida sessão no código atual, conforme o [Manual Técnico](manual-tecnico.md). Edições valem para todos. Esta reorganização não adiciona documentos ao seletor nem muda a allowlist.

## 8. Problemas comuns e glossário

Sem competência, selecione-a antes de importar. Colunas não reconhecidas pedem mapeamento; linhas com erro pedem correção na planilha. Produto ausente da cascata pode precisar de classificação ou de outro recorte. Falha de ambiente/carga exige conferir conexão e acionar operação, não interpretar o resultado como vazio.

Falhas de rede, gráficos ou exportação devem apresentar mensagem operacional e preservar contexto quando possível. O [Manual de Operação](manual-operacao.md) descreve diagnóstico e logs controlados.

Competência é validade ERP; importação é entrada do dado; variação é diferença em R$/%; mudança de regime é ruptura de estabilidade; órfão é produto com classificação incompleta. Se a tela divergir deste manual, registre a evidência e atualize a documentação conforme as [Regras Gerais](../regras-gerais.md).
