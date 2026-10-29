# Manual do Usuário — Kustos Germani

Guia do comportamento implementado no checkout, revisado quanto ao acesso em **23/10/2026**. Publicação das entregas recentes é acompanhada no [ROADMAP](../../ROADMAP.md); as provas datadas do acesso remoto estão no relatório SEC-03. Instalação: [Manual Técnico](manual-tecnico.md). Rotina e recuperação: [Manual de Operação](manual-operacao.md).

## 1. Acesso e áreas da aplicação

O [modelo de acesso vigente](../arquitetura/modelo-acesso-rls.md) exige sessão permanente para ler dados; somente os dois administradores indicados podem importar Custos/OP e criar/editar produtos operacionais. Demais autenticados têm leitura. Não há exclusão operacional, escrita direta de catálogos/Master ou acesso anônimo às tabelas. Reconstrução ERP continua com allowlist/flag e procedimento separados. A autorização é aplicada no banco, mesmo se controles de edição/importação estiverem visíveis na UI de um leitor. Erro de permissão exige conferir sessão/identidade/operação; não conceder ALL, usar service_role no browser ou desabilitar RLS. [Provas e limites](../auditoria/seguranca-rls-validacao.md).


Sem sessão ativa, o fluxo principal de Custos/OP apresenta login antes da carga de masters/metadados e apontamentos. Depois da entrada, o cabeçalho identifica o usuário e oferece saída. A aplicação tem cinco áreas:

- **Importação:** carregar custos por competência.
- **Custos:** investigar variações, regime e histórico por produto.
- **OP:** importar MCAP105 e investigar apontamentos.
- **Cadastro:** manter classificação operacional e consultar Master ERP.
- **Documentação:** consultar/editar os documentos disponibilizados no seletor.

A área **Importação** também apresenta a Central de investigação: cards de Custos, OP, Cadastro e Documentação abrem essas mesmas áreas. A navegação lateral permanece disponível; em telas estreitas fica acima do conteúdo. A identidade preta/grafite e roxa destaca ações, enquanto vermelho, amarelo, verde e azul conservam os significados operacionais indicados pelos rótulos. [Linguagem visual](../ux/componentes.md).

## 2. Competência e importação

**Competência (`data_referencia`)** é o mês/período a que o dado pertence no ERP. **Importação (`criado_em`)** é quando ele entrou no sistema. Uma planilha de março enviada em maio continua sendo da competência março; o evento de entrada é maio. As telas identificam os dois eixos separadamente.

Em Custos, **Intervalo** inclui todas as competências entre início e fim. **Comparação** usa somente as duas informadas: Junho + Agosto não inclui Julho. Fila, KPIs, gráficos e drill-through respeitam o mesmo recorte.

## 3. Importar custos

1. Abra **Importação** e escolha a **Data de Referência (Competência)** antes do arquivo.
2. Arraste ou selecione o `.xlsx`. Colunas extras podem permanecer.
3. Confira as cinco colunas obrigatórias: Produto, Descrição, Custo Variável, Custo Direto Fixo e Custo Total. Se o reconhecimento automático falhar, associe cada campo à coluna correta na janela de mapeamento.
4. Revise o preview: válida será gravada; atenção exige conferência, mas pode ser gravada; erro bloqueia a linha. A amostra mostra as primeiras 20 linhas; todas as linhas do arquivo são validadas.
5. Confirme a importação e confira Total / Importadas / Falhas. Código inválido ou ambíguo é erro de linha; não é substituído por um código aproximado.

**LOG-02 preparado localmente, ainda não ativado:** não executar o novo importador contra produção antes da migration e da liberação operacional dos clientes compatíveis. Após ativação, **Execução no log** identifica aquela chamada, inclusive falhas parciais. Cada chunk grava o vínculo junto dos custos; o resultado distingue vínculo confirmado, confirmação parcial/pendente e nenhum fato enviado. Sem ID confirmado no início, nenhum registro é gravado. Uma nova importação recebe outro ID mesmo na mesma competência/horário; não repetir automaticamente em resposta incerta. O upsert vincula a versão atual à última execução que a gravou, sem recuperar versões substituídas. Legado permanece sem vínculo comprovado, sem inferência por competência/timestamp. [Contrato e limites](../arquitetura/identidade-lote-custos.md).

A normalização trata espaços, caracteres invisíveis e notação científica; preserva zeros à esquerda quando a origem textual permite. Valores monetários brasileiros são convertidos com precisão de até quatro casas decimais.

Reimportar produto/competência atualiza o registro, em vez de duplicá-lo. O banner sinaliza produtos sem classificação; não invente categoria para eliminá-lo. **“Não foi possível validar produtos sem agrupamento.”** significa diagnóstico indisponível, e não ausência de pendências.

Quando houver ausentes do Cadastro Operacional na validação anterior ao envio, Preview e resultado mostram códigos únicos e descrição original do arquivo. Código repetido conta uma vez; mantém-se a primeira descrição não vazia disponível. Sem descrição, aparece **Descrição não informada no arquivo**; a linha continua inválida para importação. Produtos já cadastrados, mesmo sem classificação, não entram nessa lista.

**Ver produtos no Cadastro** abre o operacional com a lista contextual, independente dos filtros. **Consultar / preparar cadastro** abre formulário com código/descrição sem redigitação e sem salvar; se já existir, usa os dados atuais do Cadastro. **Salvar classificação** continua manual; **Limpar lista** remove somente o contexto da tela. A lista é anterior ao envio: a rotina existente pode ter criado o registro ao importar, portanto não confirma ausência atual. Não há filtro múltiplo novo ou sincronização ERP.

## 4. Investigar custos

### Chegar ao produto

Na área **Custos**, digite código ou descrição na busca rápida e escolha a sugestão, ou defina o período e refine Origem → Família → Agrupamento → Produto. A cascata mostra apenas dados existentes e remove seleções dependentes quando o filtro anterior muda. Depois da primeira análise, alterações de filtros atualizam o relatório; **Analisar** permite solicitar a execução. Chips mostram filtros ativos e podem ser removidos pelo x.

Em Custos, Origem/Família usam a classificação oficial do Master ERP para códigos que existem nele. Produtos fora do Master preservam a classificação operacional. Campo ERP vazio ou sem correspondência no catálogo permanece sem classificação. Agrupamento continua sendo o manual do Kustos. Isso não atualiza o Cadastro Operacional.

Para investigar uma família ERP, escolha Origem → Família, mantenha **Item/Produto = TODOS** e clique **Analisar**. A fila contém todos os produtos dessa família com fatos no período; escolher um produto restringe a análise individual. Gráficos, drill-through e exportação seguem o mesmo conjunto e recorte: `data_referencia` é competência, `criado_em` é importação.
### Ler a fila

Os quatro KPIs são clicáveis: Itens analisados, Alertas (>5%), Mudanças de Regime e Média de variação. O filtro de média mostra variações positivas. Apesar do rótulo **Alertas (>5%)**, o critério é variação absoluta **≥ 5%**, incluindo quedas, entre última e penúltima importação (`criado_em`) no recorte de competência. Sem comparativo anterior, o delta não representa o custo inteiro.

A fila mostra produto, variação, prioridade, regime e contexto automático; **Detalhes** expande custos, datas e score. Sem ordenação manual, a prioridade orienta a investigação; clicar no cabeçalho muda a ordenação. A janela visual mostra até 200 itens na ordem ativa e informa o excedente. Refine filtros/período para trazer outros itens; KPIs e exportação continuam considerando o relatório completo.

Na versão local corrigida, a ordem inicial considera criticidade → mudança de regime → magnitude absoluta → flag de alerta → instabilidade → código, antes do TOP-200. Clicar no cabeçalho escolhe uma ordem manual; o aviso diz “ordenação escolhida”, sem prometer prioridade nessa ordem. **Restaurar prioridade investigativa** retorna à ordem padrão sem perder filtros/período. Os cinco alertas de outubro antes ocultos aparecem no início pelos critérios existentes. A publicação ainda depende de autorização; [provas LOG-05](../auditoria/custos-top200-validacao.md) e [LOG-04/06](../auditoria/custos-fila-validacao.md).

Contexto indica alta/queda no período ou alerta atual entre os dois registros mais recentes por importação. Não afirma segunda ocorrência ou reincidência: o resumo agregado não contém contagem histórica comprovada. Ausência de comparativo é informada explicitamente. Detalhes e drill-through permitem conferir os fatos originais.

Instabilidade é a média das variações percentuais absolutas consecutivas: ESTÁVEL abaixo de 3%, OSCILANDO de 3% até menos de 8%, MUITO INSTÁVEL a partir de 8%. Com pelo menos quatro pontos, estabilidade na primeira metade e instabilidade na segunda sinalizam mudança de regime.

### Histórico e gráficos

Clique na linha do produto para abrir o drill-through: **Competência** mantém mês/ano e **Data** mostra a data de referência completa (`data_referencia`, DD/MM/AAAA), sem horário. A tabela conserva cada registro do recorte: 05/10/2026 e 14/10/2026 aparecem em linhas separadas com a mesma competência out. de 2026. Não há dia fixo nem substituição pela data de importação (`criado_em`), que permanece proveniência dos dados. Custos variável/fixo/total e Δ/Δ% em relação ao registro anterior desse recorte continuam disponíveis. Variações absolutas ≥ 5% recebem destaque. Meses intermediários não entram na Comparação.

O gráfico temporal usa competência: custo unitário do produto selecionado ou média agregada quando não há produto, com média histórica e tendência. `criado_em` escolhe o registro mais recente por produto/competência. Comparação e TOP variações usam os dois últimos timestamps elegíveis **depois de aplicar o recorte de competência e os filtros**. Sem dois eventos, não apresentam comparação válida nem percentual zero; sem base temporal, o indicador informa insuficiência, sem afirmar estabilidade. Zero real é preservado; percentual com base anterior zero fica indisponível.

O TOP local compara cada produto + data de referência completa, exibindo a data DD/MM/AAAA. Datas diferentes não formam um par, mesmo no mesmo mês. Como o upsert atual substitui versões do mesmo produto/data, pode não haver pares para o TOP, embora o agregado de eventos seja comparável; ausência não é estabilidade. Essa correção não cria comparação automática com mês anterior. [Contrato e limites LOG-03](../arquitetura/comparacao-temporal-custos.md). A [ressalva LOG-02](../auditoria/robustez-erros-validacao.md) permanece: timestamps diferentes podem ser chunks do mesmo lote lógico. Publicação depende de autorização própria.

### Exportar

Rode a análise e clique **Exportar**. Todos os campos começam marcados; desmarque os indesejados e confirme. Cancelar não gera arquivo. O XLSX conserva a ordem canônica das colunas e tem abas **Contexto** e **Fila Investigativa**. Exporta a fila completa filtrada, na mesma ordem ativa da UI, inclusive variação manual crescente/decrescente; só a tela limita a janela a 200. Sem chave manual, usa criticidade → regime → magnitude absoluta → alerta atual → instabilidade → código. Contexto registra a ordem efetivamente aplicada. **Alerta atual (≥5%)** informa SIM/NÃO/SEM COMPARATIVO, sem contagem de reincidência. O nome inclui o período analisado.

## 5. Importar e investigar OP

Na área **OP**, selecione o CSV MCAP105, confira a amostra, informe competência e confirme. OP formatada como `2.081` é gravada como inteiro `2081`. Após importar, a carga local é renovada e fila/dossiê incorporam os novos apontamentos.

A versão local corrigida carrega todos os apontamentos elegíveis, inclusive acima de 1.000, antes da investigação. Falha de uma página impede apresentar essa carga como completa. A publicação dessa correção depende de autorização; [provas MNT-OP-05](../auditoria/op-paginacao-validacao.md).

Filtre Estágio, Origem, OP, Produto, competência e Motivo da investigação. Depois da primeira análise, mudar filtros atualiza a fila. A coluna **Decisão** informa se merece investigação e a prioridade, cruzando produção, tempo, KG/Hora e paradas:

- **Gargalo de produtividade:** tempo alto e produtividade baixa sem parada material que explique o resultado; conferir processo, padrão, matéria-prima ou apontamento.
- **Desperdício operacional:** entrega com tempo alto, KG/Hora baixo e parada material; prioridade alta.
- **Paradas com impacto:** parada material, atraso, déficit de produção e queda/não melhoria de produtividade; prioridade máxima.
- **Baixa produção:** volume abaixo do plano sem redução correspondente de tempo; investigar perdas, disponibilidade, programação, material ou encerramento.
- **Tempo justificado pelo volume:** produção adicional explica o tempo e a produtividade permanece praticamente estável; sem alerta.
- **Parada sem impacto:** registrar sem priorizar quando entrega, tempo e produtividade permanecem normais.
- **Alta eficiência:** referência positiva; ausência de base prevista suficiente impede concluir eficiência.

Abra **Ver dossiê** para conferir decisão e evidências. **Dados do ERP (imutáveis)** ficam separados de **Indicadores calculados pelo Kustos**. `% Tempo (ERP)` é conferência, nunca sentença isolada. Competência e importação são rastreabilidade, sem entrar nas fórmulas de execução.

### Cruzar OP e Custo da competência

O checkout local oferece **OP × CUSTO**, ainda sem publicação. Na tela OP, selecione explicitamente o mesmo mês em **De** e **Até**. O botão passa a mostrar, por exemplo, **OP × CUSTO — Outubro/2026**. Sem mês único, a ação fica indisponível e explica a limitação; nenhum mês é aberto automaticamente.

O relatório considera a competência completa de `data_referencia`. Os filtros OP ficam guardados para retorno, sem serem aplicados silenciosamente aos custos. A visão geral informa os produtos com ambos os lados (A), somente OP (B), somente Custo (C), registros sem vínculo válido e qualidade das fontes. Se houver B/C, escolha **Incluir sem correspondência** ou **Somente OP + Custo**. É possível alterar essa decisão; voltar sem decidir não exclui produtos automaticamente. Uma fonte vazia confirmada difere de falha de leitura, que impede apresentar o relatório como completo.

Na fila, filtre texto/cobertura e escolha **Prioridade OP** ou **Prioridade Custo**, sempre em escalas separadas. A paginação de 50 produtos é apenas visual. Clique no código para abrir o dossiê com eventos OP individuais, resultados originais, hipóteses OP identificadas, snapshots de custo, datas integrais, referência/base e evidências. Nenhuma soma mensal de OP ou prioridade conjunta é calculada.

Ausência aparece explicitamente como **OP ausente** ou **Custo ausente**, sem preencher valores com zero. A busca exata de código consulta o contexto carregado; um produto sem nenhum lado recebe D, somente por essa consulta explícita. Relações e motivos são os do engine: coincidência temporal não comprova causalidade. `criado_em` indica importação e não escolhe a competência.

Voltar do dossiê restaura a fila cruzada; **Voltar para OP** conserva competência, filtros, motivo, produto, dossiê e posição de origem quando aplicável. **Atualizar leitura** descarta a consulta anterior e pergunta novamente sobre B/C quando necessário. [Contrato e limites](../arquitetura/op-custo.md#17-fase-2--apresentação-e-integração-local); [validação da Fase 2](../auditoria/op-custo-fase2-validacao.md).

## 6. Cadastro

### Cadastro Operacional

Pesquisa, edição e **Cadastrar produto** mantêm a classificação Kustos consumida por Custos/OP. A dimensão operacional pode conter materiais fora do universo Master ERP. Produto não resolvido aparece como **Produto sem classificação**; não invente Origem/Família.

Para remover um agrupamento, **Editar → Sem agrupamento → Salvar classificação**. Cancelar preserva o cadastro. Essa intenção manual é diferente de célula ERP vazia, que preserva valores no fluxo de importação correspondente. A lista rola nos dois eixos dentro de uma área limitada à janela, com cabeçalho fixo e barra horizontal acessível.

O aviso **código(s) importado(s) ausente(s) do cadastro operacional** compara códigos únicos importados com o operacional completo, independentemente dos filtros visuais. Erro de leitura deve ser tratado como indisponibilidade, sem cadastrar ou reconstruir para compensá-lo.

### Cadastro Mestre ERP

Consulta independente do universo ERP, sem editar/excluir/cadastrar/classificar. Totais são dinâmicos; busca por código/descrição, origem/família e páginas de 50 consideram todo o universo carregado. Alternar fontes preserva seus filtros/página. **Atualizar consulta** relê os dados, conserva filtros válidos e retorna à primeira página; não sincroniza bases.

A tabela mostra **Código, Descrição, Origem, Família e Agrupamento comercial**. Origem/família usam códigos ERP exatos e mostram descrição ou pendência explícita. **Agrupamento comercial** reúne código e descrição, como `C008 — BISCOITO LAMINADO DOCE`; ambos vazios mostram **Não informado**. Campo parcial mostra somente o valor existente, sem completar o ausente. Agrup. Prod. permanece no modelo ERP, sem coluna nesta tabela. Classificações de agrupamento provenientes do ERP são dados opcionais e independentes da classificação investigativa do Kustos. Falha de carga não vira zero nem usa o operacional como substituto.

### Preview, aprovação e execução

1. Use **Preview mestre (XLSM / XLSX / XLS)** com o original ERP; não é necessária conversão do XLS.
2. Confira linhas, produtos válidos, novos, alterações, preservações de campos e **remoções do Master**. Filtros: Tipo P/C → Descr. (Origem) contendo Produzido/Revenda → excluir descrição com inativo/EXLUIR. Produtos fora do universo são removíveis somente do Master; vazios de quem permanece preservam o existente, exceto Agrup. Com. e sua descrição: célula comercial vazia propõe limpar para NULL. Coluna comercial ausente preserva. Produto sem agrupamento permanece válido.
3. Confira separadamente **Catálogo de famílias ERP**: código, rótulo, situação, impacto e decisão. Rótulos iguais podem identificar códigos diferentes; conflitos bloqueiam e exigem corrigir a fonte e gerar novo Preview.
4. Escolha Aprovado/Rejeitado/Pendente por proposta ou ações globais. Aprovar produto não aprova família. Descrição e campos de agrupamento de existente têm decisões próprias, inclusive limpeza comercial para vazio; novo produto é indivisível. Qualquer proposta pendente/rejeitada impede a execução inteira.
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
