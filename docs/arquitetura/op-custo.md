# OP × CUSTO — contrato técnico final

**OP-CUSTO-01 · contrato versão 1.0 · 23/10/2026 · Fase 1 local implementada; UI não iniciada.**

Contrato da investigação de **uma competência por vez**, fechado a partir da especificação anterior fornecida no chat, das oito decisões aprovadas e da inspeção do checkout `fa9c7bb`. O fechamento original foi exclusivamente documental. Após autorização específica da Fase 1, o núcleo/API foi implementado sobre `16fc9f8`, sem UI ou acesso remoto. As seções de proposta preservam o contrato base; a seção 16 registra exatamente o subconjunto agora disponível e os complementos pedidos na Fase 1, sem mudar regras de negócio. Publicação e próximas fases não estão autorizadas. O estado de produção não foi revalidado nesta tarefa.

## 1. Escopo e decisões incorporadas

O produto é a entidade investigativa que relaciona **Produto → Competência → Eventos OP → Snapshots de Custo → Evidências → Relação investigativa OP × Custo**. A integração ajuda a decidir o que investigar e quais fatos conferir; não é relatório financeiro genérico nem nova fonte de verdade.

As oito decisões estão encerradas para esta versão:

1. Preservar todos os eventos OP, com suas interpretações individuais. Consolidação numérica somente mediante prova técnica de granularidade, unidade e aditividade.
2. Analisar somente a competência selecionada na V1, com identidade preparada para extensão temporal.
3. Preservar a série de custos disponível e usar o snapshot mais recente da competência como referência principal, respeitando ausência e ambiguidade.
4. Aplicar a matriz relacional aprovada na seção 7, sem afirmar causalidade.
5. Manter prioridades OP e Custo separadas; nenhum score ou ranking conjunto.
6. Detectar cobertura, informar e obter escolha explícita sobre incluir produtos sem um dos lados. Ausência nunca vira zero; indisponibilidade nunca vira fonte vazia.
7. Reservar análise multi-competência para evolução futura, fora da implementação inicial.
8. Não somar taxas, fazer médias simples de taxas/percentuais ou criar uma “OP mensal” artificial.

Os motores atuais continuam independentes e conservam suas classificações, limiares, prioridades e fatos. O novo resultado é uma evidência relacional, não uma reclassificação dos domínios. O TOP-200 existente permanece intacto.

## 2. Diagnóstico da arquitetura e limites atuais

### 2.1 OP

`src/services/api.js:getApontamentosOp` lê `apontamentos_op` integralmente com o leitor compartilhado `lerCompleto`, páginas de 500/count exact, ordem por `data_referencia DESC`, `estagio`, `origem`, `op`, `id ASC`. Verifica IDs repetidos e enriquece pelo cadastro operacional completo. Seu argumento `dataReferencia` atualmente faz igualdade de **data completa**, não seleção de mês.

`view/ui-op.js` conserva `allRows` e recalcula fila/dossiê localmente; a recarga após importação pertence a esse ciclo. `applyCompetenciaRange` compara datas completas contra limites construídos no dia 01, inclusive o limite final. Portanto, não serve como recorte mensal completo para OPs com outras datas no mês. A importação atual normalmente constrói o dia 01 a partir do mês; isso não autoriza supor que todos os fatos possíveis sejam assim.

`core/op-investigation-engine.js` analisa cada linha por produção, tempo, produtividade e parada. `core/investigation-contract.js` adapta para `InvestigationResult`; sua `chave` usa OP + produto + data completa e não inclui ID, estágio, origem, unidade ou lote. Ela não é identidade única de evento. O adaptador também não transporta todos esses metadados.

### 2.2 Custo

`api.getHistorico` lê os fatos do recorte de `data_referencia`, com paginação completa e enriquecimento antes da cascata. Custos reconsulta a API; não compartilha automaticamente o ciclo de estado de OP. A classificação analítica segue CUSTOS-ERP-01: origem/família do Master ERP quando o código existe nele, inclusive vazios/sem resolução; fallback operacional somente fora do Master. Não harmonizar essa classificação com a de OP nesta integração.

`core/report-engine.js` agrupa por código e distingue variação entre extremos de competência de `variacaoTemporal`, obtida dos registros ordenados por `criado_em`. O alerta canônico usa `abs(variacaoTemporal) >= 5`, sem arredondamento anterior. A comparação temporal atual por produto usa os dois registros mais recentes disponíveis, exigindo base anterior positiva para percentual. O comparador de prioridade da fila está em `view/ui-table.js`, compartilhado com exportação; não pertence ao novo engine.

O upsert de custos conflita em `codigo_produto,data_referencia` **com a data completa**. Duas datas no mesmo mês podem coexistir; reimportar o mesmo produto/data pode substituir valores em vez de preservar outra revisão. O payload inspecionado não atualiza explicitamente `criado_em`. Sem verificação remota de triggers, não se pode afirmar que ele identifique toda revisão de um registro. “Preservar snapshots” significa preservar todos os registros atualmente disponíveis, sem prometer recuperar revisões já sobrescritas.

### 2.3 Dependências e divergências registradas, sem correção

| Evidência do checkout | Consequência para OP × CUSTO | Tratamento contratual |
|---|---|---|
| OP usa igualdade de data na API; limite final da UI usa dia 01 | Reutilizar esses filtros literalmente omite outras datas do mês | Novo método mensal com limites completos; não alterar os fluxos existentes nesta tarefa |
| `InvestigationResult.chave` não distingue estágios/eventos | Possível colisão entre resultados do mesmo produto/OP/data | Envelope externo por ID técnico; não modificar o contrato legado |
| Upsert de custo por produto/data completa | Série disponível não é arquivo imutável de todos os uploads | Exibir registros existentes e limite de proveniência, sem inventar revisões |
| Payload não comprova atualização de `criado_em` em reimportações | Último persistido por timestamp não prova último conteúdo ERP reenviado | Referência conforme timestamps disponíveis; explicitar limite, sem alterar banco/importador |
| Algumas conversões legadas usam `Number(valor || 0)`; parser OP pode converter vazio/inválido em zero | Ausência original pode já ter sido perdida | Validar fatos disponíveis antes da evidência; zero persistido não pode ser retroativamente declarado ausente |
| `report-engine.js` importa configuração/debug com dependência transitiva de browser | A descrição genérica de `core/` puro não vale integralmente para esse caminho atual | Novo engine recebe resultados prontos, sem importar o report engine nem configuração |
| Ranking de Custo está em `view/ui-table.js` | Importá-lo no novo core violaria a separação | Calcular no fluxo existente fora do novo engine e transportar resultado |
| LOG-02/03 documentam chunks como importações e escolha global fora do recorte | Comparadores globais de importação não são base segura para o cruzamento mensal | Não usar esses métodos como fonte; não declarar os itens resolvidos |
| LOG-04 associa narrativa de recorrência a série insuficiente; LOG-06 afeta ordem manual do XLSX | Reutilizar narrativa/exportação sem crítica propaga conclusões indevidas | Receber prioridades originais separadas; evidência relacional referencia fatos, sem afirmar recorrência nem adicionar exportação nesta V1 |
| Visão temática de engenharia descreve dimensão operacional de forma simplificada | Não explicita toda a projeção ERP atual de Custos | Ler com os contratos especializados vigentes; não criar classificação paralela |

Os itens acima distinguem comportamento existente, incompatibilidade arquitetural e limites de evidência. Não afirmam falha nova em produção nem autorizam saneamento. As evidências históricas de volume nos relatórios de OP/Custos continuam datadas; não são contagens remotas desta tarefa.

## 3. Identidade e regra temporal

### 3.1 Chave lógica

A chave da relação é a tupla **`(codigoNormalizado, competencia)`**, sendo `competencia` uma string válida `AAAA-MM`. `apontamentos_op.cod_produto` e `historico_custos.codigo_produto` passam pelo mesmo `normalizeCodigoProduto()` de `core/spreadsheet-engine.js`. Não criar outro normalizador.

A normalização canônica preserva zeros significativos de códigos textuais; não aplicar `Number`, preenchimento de zeros, mudança arbitrária de caixa ou correção aproximada adicional. As representações aceitas e rejeitadas seguem o helper existente e suas regressões. Código ausente/inválido ou data inválida não gera chave relacional: preservar o registro em diagnóstico com fonte, ID e motivo. Nunca juntar todos os inválidos sob uma chave vazia.

**Descrição, origem, família e agrupamento não participam da chave.** Descrições divergentes são rótulos de seus fatos originais, exibidos como tal no dossiê; não impedem uma relação por código válido nem autorizam relacionar códigos diferentes. Classificação ausente deve permanecer explícita como “Produto sem classificação”.

### 3.2 Competência e proveniência

- `data_referencia` é a competência operacional; conservar sua data integral original.
- `criado_em` é o momento de importação/persistência disponível; pode ordenar snapshots **dentro da competência**, nunca definir o mês analisado.
- Comparar timestamps válidos pelo instante que representam, preservando texto/fuso originais para proveniência. Não ordenar rótulos formatados. Na saída normal do banco, o formato é uniforme; formatos mistos que tornem a ordem incompatível com a comparação legada devem gerar diagnóstico, não uma alteração silenciosa da regra existente.
- Outubro/2026 compreende de `2026-10-01` a `2026-10-31`, inclusive. `05/10` e `14/10` pertencem a outubro e continuam fatos distintos.
- Um fato de outubro importado em novembro entra em outubro. Um fato de novembro importado em outubro não entra em outubro.
- Comparar datas DATE como datas civis válidas, sem deslocamento UTC. Não transformar originais em dia 01. Limites mensais são parâmetros de consulta, não reescrita de fatos.
- Validar mês, ano e calendário; não reutilizar validação permissiva de datas impossíveis, já registrada em SEC-04.
- V1 aceita exatamente uma competência. Arrays/intervalos de competências são rejeitados explicitamente, sem preencher meses intermediários.

## 4. OP: envelope e consolidação

### 4.1 Eventos preservados

Cada evento tem identidade técnica `apontamentos_op + id`. Preservar no envelope: `id`, `op`, `cod_produto` original e código normalizado, `descricao`, `cod_estagio`, `estagio`, `origem`, `unidade`, `log_importacao_op_id`, `data_referencia`, `criado_em`, `qtd_prevista`, `qtd_produzida`, `qtd_apontamentos`, `tempo_previsto`, `tempo_real`, `tempo_parada`, `kg_hora_previsto`, `kg_hora_real`, `perc_tempo` e classificação recebida da API.

O lote disponível é `log_importacao_op_id`; não inferir lote industrial nem inventar referência se o campo vier ausente. Identificadores técnicos são proveniência, não rótulos de negócio. Mostrar estágio/origem/unidade existentes, sem deduzir a unidade de tempo pela unidade de quantidade.

Anexar a cada envelope o resultado original de `analyzeOpInvestigation`/`toInvestigationResult`, seus indicadores, conferência ERP, motivo, decisão, prioridade e evidências. Associar por ID externo **antes de ordenar**. Não associar por descrição, pela chave legada ou por posição entre arrays ordenados de forma diferente.

IDs técnicos repetidos na leitura são erro de integridade, não oportunidade de deduplicação silenciosa. Registros com IDs diferentes e conteúdo semelhante podem ser reimports ou fatos legítimos: conservar todos, sinalizar possível repetição sem afirmar duplicidade de negócio. Contagem de eventos não comprova número de observações independentes. Não selecionar automaticamente um lote “vencedor”.

### 4.2 Fato ERP e conclusão Kustos

Quantidades, tempos, taxas e `perc_tempo` recebidos são fatos ERP. Atendimento, desvios e índice de parada são cálculos do engine atual; motivo/decisão/causa provável são interpretações Kustos. Apresentá-los em grupos identificados. A hipótese de causa do motor OP não pode ser promovida a explicação causal do custo.

Por evento, as fórmulas atuais são: atendimento = produzida/prevista × 100; desvio de tempo = (real − previsto)/previsto × 100; desvio de produtividade = (kg/h real − kg/h previsto)/kg/h previsto × 100; índice de parada = parada/tempo real × 100. Manter as guardas do engine para base ausente/não positiva. Não recalcular essas decisões com novos limiares na integração.

### 4.3 Matriz de agregações

**Não foi comprovada no código/documentação inspecionados a aditividade mensal dos fatos ERP. Na V1, as consolidações numéricas abaixo ficam não disponíveis; o relatório por eventos funciona normalmente.** As condições descrevem a prova necessária para habilitação posterior, não autorização para o implementador inventar uma soma.

| Métrica | Pode agregar? | Regra | Condição |
|---|---|---|---|
| Quantidade prevista | Não disponível para consolidação | Soma somente após prova de parcelas disjuntas | Mesma unidade, significado, estágio comparável e plano não repetido entre estágios/linhas/reimports |
| Quantidade produzida | Não disponível para consolidação | Soma somente de produção comprovadamente aditiva | Mesma unidade e produção sem dupla contagem de passagem por estágios ou reimports |
| Tempo previsto | Não disponível para consolidação | Eventual soma de esforço previsto, não duração mensal | Unidade de tempo comprovada e parcelas de planejamento disjuntas |
| Tempo real | Não disponível para consolidação | Eventual tempo acumulado dos eventos, não tempo de calendário | Unidade e granularidade comprovadas; tratar sobreposição e repetição |
| Tempo de parada | Não disponível para consolidação | Eventual soma de parcelas distintas de parada | Unidade comum, sem mesma parada registrada em múltiplos eventos |
| KG/hora previsto | Não disponível para consolidação | Nunca somar; eventual razão de bases ou ponderação por tempo previsto compatível | Numerador em massa e denominador temporal comprovados; quantidade em CX não vira KG |
| KG/hora real | Não disponível para consolidação | Nunca somar; eventual razão de bases ou ponderação por tempo real compatível | Mesmas definições de massa/tempo, bases completas e não duplicadas |
| Desvio de tempo | Não disponível para consolidação | Nunca somar/média simples; recalcular a partir de bases agregáveis | Só após aprovação das bases de tempo previstas e reais; denominador válido |
| Desvio de produtividade | Não disponível para consolidação | Nunca somar/média simples; recalcular sobre taxas consolidadas válidas | Só após prova das taxas e respectivas bases |
| Índice de parada | Não disponível para consolidação | Nunca somar/média simples; eventual Σparada/Σtempo real × 100 | Só com numerador e denominador aditivos e semanticamente compatíveis |
| Percentuais, inclusive atendimento e `perc_tempo` ERP | Não disponível para consolidação | Preservar por evento; nenhuma média simples ou soma | Recalcular indicador Kustos apenas com suas bases aprovadas; não inventar percentual ERP mensal |
| Número de eventos | Sim, descritivo | Contar IDs técnicos distintos da competência/produto | Fonte completa; não elimina possíveis reimports nem prova independência |
| Número de OPs | Somente contagem de números observados | Contar valores distintos não ausentes de `op`, rotular “Números de OP distintos observados” | Não equivale a ordens de negócio únicas sem prova da identidade empresarial entre origens/lotes |

O contrato inicial de consolidação é `{ estado: 'nao_disponivel', valores: null, motivos: [...] }`, acompanhado das contagens descritivas. Não preencher as somas indisponíveis com zero. Uma futura habilitação exige documento ERP identificado, prova de unidades/granularidade/repetições, decisão de negócio e atualização deste contrato/testes; não basta todos os campos serem numéricos. Não criar nova “OP mensal”.

## 5. Custo: série, referência e comparação

### 5.1 Série e referência principal

Para cada produto/competência, conservar todos os snapshots persistidos retornados na leitura completa, com `id`, `codigo_produto`, `descricao`, `data_referencia`, `criado_em`, `custo_variavel`, `custo_direto_fixo`, `custo_total` e classificação recebida. Não juntar componentes de linhas diferentes nem calcular total como soma presumida dos componentes.

A referência principal é o registro com **maior `criado_em` válido entre os registros daquela competência**. `data_referencia` não é critério substituto de recência da importação. Listar a série integral no dossiê, com as duas datas rotuladas. Ordenação por ID desempata apresentação, não prova recência de negócio.

Empate no maior timestamp com vetores de custos divergentes: referência ambígua, mostrar candidatos e motivo, sem escolher vencedor por ID/data de referência. Se os vetores forem iguais, os valores comuns podem ser mostrados com todas as identidades candidatas; não declarar snapshot único. Empate que torne referência ou base de comparação indeterminada impede a conclusão relacional sobre variação. Timestamp inválido/ausente que impeça ordenar a série também torna a seleção inconclusiva; não descartar a linha para fabricar referência segura.

### 5.2 Comparação existente, com base explícita

Usar a comparação canônica por produto dos **dois registros mais recentes disponíveis no recorte mensal**, ordenados por `criado_em`. Não selecionar dois timestamps globais da base nem comparar meses anteriores automaticamente. Não trocar a base por “timestamp distinto anterior” em caso de empate: seria outra regra de custo. Preservar a saída original do motor; em ambiguidade, a integração registra comparação não utilizável e explica por quê, sem alterar o motor legado.

Com apenas um snapshot, há custo principal e **sem base comparativa**: variação percentual e monetária comparativa ficam ausentes, não zero. Com dois valores finitos, delta monetário é referência − base; percentual segue a regra existente, com base anterior positiva. Base zero real permite delta monetário, mas não percentual nem classificação de aumento relevante pelo percentual. Base negativa/não válida não autoriza inventar denominador alternativo.

Exibir os três valores absolutos (`custo_variavel`, `custo_direto_fixo`, `custo_total`) do snapshot principal e, quando válidos, delta monetário e percentual de **custo total** com IDs/datas da base. Eles respondem magnitude econômica e relevância relativa já existentes. V1 não adiciona percentuais por componente, somas de custos de produtos, impacto `custo × quantidade OP`, margens ou novos indicadores financeiros sem contrato de unidade/base econômica.

Zero numérico válido é fato e aparece como zero. `null`, `undefined`, vazio ou número inválido ficam ausentes/inválidos conforme a origem; nunca `Number(null)` ou `valor || 0` para formar evidência. Custo total ausente não pode parecer estável. Componentes ausentes não invalidam automaticamente um total válido, mas sua ausência aparece no dossiê. Não reconstruir ausências anteriores que o parser já tenha convertido em zero.

## 6. Cobertura e escolha explícita de inclusão

### 6.1 Estados e qualidade

Calcular a união completa de códigos válidos da competência **somente após concluir e validar ambas as fontes e seu enriquecimento obrigatório**.

| Estado | Presença | Apresentação |
|---|---|---|
| A — OP + Custo | Pelo menos um evento OP e um snapshot de custo | Ambos os domínios presentes; relação depende da qualidade/base |
| B — OP sem Custo | OP presente, nenhum custo no mês | Custo ausente; relação não aplicável |
| C — Custo sem OP | Custo presente, nenhuma OP no mês | OP ausente; relação não aplicável |
| D — Nenhum dos dois | Código válido explicitamente consultado, nenhum fato no mês | “Sem OP e sem Custo nesta competência”; não gerar linhas D para todo o cadastro |

Cobertura é presença de fatos com chave válida, não de métricas calculáveis. Um produto com ambos os lados e custo inválido continua A, com qualidade insuficiente. Códigos/datas inválidos ficam fora de A/B/C, em diagnóstico visível; reconciliar total lido = fatos vinculáveis + fatos não vinculáveis por fonte. Não excluir registros sem explicação.

- **Fonte vazia:** consulta completa bem-sucedida, count zero. Permite calcular cobertura.
- **Dado ausente:** fonte completa, mas falta o lado para produto/mês, ou falta um campo numérico. Representar lado ausente como `null`, campo como `null` e motivo; listas de eventos podem ser vazias sem criar evento fictício.
- **Fonte indisponível:** erro de acesso/rede/leitura/enriquecimento/completude. Impede cobertura confiável; não converter em coleção vazia nem calcular A/B/C com o outro lado.
- **Dado inválido:** registro recebido com chave/data/número inadequado. Conservar diagnóstico e proveniência; erro de identidade/paginação bloqueia leitura, enquanto métrica inválida isolada bloqueia a evidência que depender dela.

### 6.2 Fluxo obrigatório da escolha

Depois de obter A/B/C, se B + C > 0, entrar em `inclusaoSemCorrespondencia: 'pendente'` e mostrar:

> “[A] produtos com OP e Custo; [B] com OP sem Custo; [C] com Custo sem OP em [competência]. Deseja incluir produtos sem correspondência?”

Ações explícitas: **“Incluir sem correspondência”**, **“Somente OP + Custo”**, **“Voltar”**. Não há decisão automática por seleção prévia, fechamento ou timeout. Enquanto pendente, mostrar cobertura, sem apresentar fila como se a inclusão já tivesse sido decidida.

1. Incluir: fila A+B+C; lados ausentes ficam `null`/“OP ausente”/“Custo ausente”, sem métricas zero.
2. Somente ambos: fila A; manter contagens B/C e aviso de exclusão por escolha do usuário.
3. Voltar/fechar: não equivale a excluir. Retornar ao contexto OP ou manter a escolha pendente.
4. Se A = 0 e o usuário escolher somente ambos: “Não há produtos com os dois lados nesta competência. Os casos sem correspondência foram excluídos pela sua escolha.” Oferecer **“Alterar inclusão”**.
5. Se B+C = 0, não perguntar desnecessariamente. Se ambas as fontes estiverem vazias, mostrar cobertura zero confirmada; uma busca explícita pode produzir D.
6. Manter **“Alterar inclusão”** e totais de cobertura global visíveis depois da escolha. Filtros locais não apagam esses totais nem provocam nova pergunta.
7. A escolha pertence à competência e à revisão local do contexto carregado. Nova competência ou atualização bem-sucedida do contexto exige nova escolha quando houver B/C. Voltar ao mesmo contexto sem recarga conserva a escolha.
8. Fonte indisponível: “Não foi possível concluir a leitura de [OP/Custo] de [competência]. A cobertura ainda não pode ser determinada.” Sem contagens zero, pergunta de inclusão ou relatório parcial. Oferecer nova tentativa explícita/voltar; eventual resultado anterior conserva seu rótulo de competência e leitura, sem parecer a nova consulta.

## 7. Evidência relacional e linguagem

### 7.1 Adaptação dos sinais originais

Não criar novos limiares OP. Para síntese relacional por produto, usar os motivos já calculados: `paradas_operacionais`, `desperdicio_operacional`, `gargalo_produtividade`, `baixa_producao` indicam eventos desfavoráveis; `alta_eficiencia` indica favoráveis; `tempo_justificado_volume` e `parada_sem_impacto` permitem o estado “sem desvio operacional priorizado”. `sem_base_comparativa` é insuficiência e `sinal_misto` não significa normalidade.

Presença simultânea de favoráveis e desfavoráveis, sinal misto ou insuficiência que impeça síntese segura resulta em inconclusivo com motivos/eventos identificados. Desfavoráveis com eventos não priorizados podem ser resumidos como “há eventos desfavoráveis”; favoráveis com não priorizados como “há eventos favoráveis”, sem generalizar para todos os eventos. Múltiplos estágios, por si só, não tornam eventos inválidos; impedir síntese quando sinais/bases não sustentarem uma leitura comum. Não converter contagem de reimports em reforço de evidência.

No custo, receber a comparação validada e o resultado do alerta canônico: relevante positivo = aumento; relevante negativo = queda; percentual finito não relevante = sem variação relevante. Isso não equivale à classificação de regime “ESTÁVEL”. Percentual ausente/ambíguo = sem base utilizável. O engine relacional recebe a decisão canônica, sem duplicar constante ou arredondar antes do limiar.

### 7.2 Matriz aprovada

| Sinal OP | Sinal Custo | Relação V1 |
|---|---|---|
| Desfavorável | Aumento relevante | Evidência temporal compatível |
| Desfavorável | Sem variação relevante | Sem confirmação pelo custo |
| Sem desvio operacional priorizado | Aumento relevante | Sinal de custo sem correspondência operacional |
| Favorável | Aumento relevante | Sinais divergentes |
| Desfavorável | Queda relevante | Sinais divergentes |
| Favorável | Queda relevante | Evidências temporalmente compatíveis, em sentido favorável |
| Heterogêneo/insuficiente em qualquer lado presente | Qualquer sinal | Inconclusivo, com motivo explícito |

B/C recebem “Não aplicável: OP ausente” ou “Não aplicável: Custo ausente”; D recebe “Não aplicável: ambos ausentes”. Não confundir com insuficiência de métricas de um produto A. Combinações válidas não incluídas na matriz aprovada, como favorável + sem variação relevante ou não priorizado + queda, recebem **“Sem relação definida na V1”** e conservam os sinais originais. Não inventar nova categoria de alerta, causalidade ou prioridade para preencher essas células.

Os códigos estáveis das seis relações, na ordem da matriz, são `evidencia_temporal_compativel`, `sem_confirmacao_pelo_custo`, `sinal_custo_sem_correspondencia_operacional`, `sinais_divergentes`, `sinais_divergentes` e `evidencia_temporal_compativel_favoravel`. Os demais estados são `inconclusivo`, `nao_aplicavel` e `sem_relacao_definida_v1`; `motivos` distingue ausência OP/Custo/ambos e cada insuficiência. Abaixo do limiar canônico, pequenas altas/quedas pertencem a “sem variação relevante”, sem criar uma segunda regra de relevância.

Cada evidência relacional deve conter tipo/ID local determinístico, competência, código, IDs dos eventos OP envolvidos, IDs da referência/base de custo, valores/indicadores utilizados, sinais originais, limitações e frase explicativa. Referências apontam para os fatos já carregados, não cópias persistidas em outra tabela. Evidências OP/Custo originais permanecem separadas da nova evidência relacional.

Texto permitido:

> “Foram observados eventos operacionais desfavoráveis e aumento de custo na mesma competência. Há evidência temporal compatível; a relação exige investigação.”

Texto proibido:

> “As paradas causaram o aumento do custo.”

O mês comum não comprova ordem dos acontecimentos, exposição econômica, mecanismo ou causa. “Sem confirmação pelo custo” também não prova inexistência de impacto. A `causaProvavel` de OP deve aparecer como **“Hipótese do motor OP”**, nunca como causa do custo. Não gerar probabilidade/confiança causal, recorrência ou conclusão de persistência sem contrato próprio.

## 8. Prioridades e ordenação

Prioridade OP permanece no resultado OP; prioridade Custo permanece no resultado Custo. Não comparar escalas, somar pesos, tomar máximo entre domínios ou construir score conjunto. Para produto com múltiplos eventos OP, pode-se exibir **“Maior prioridade OP observada”**, com referência ao evento de maior posição segundo o comparador OP existente; isso não cria decisão mensal.

A fila oferece dois modos independentes: **“Prioridade OP”** (entrada inicial pela tela OP) e **“Prioridade Custo”**. Cada modo usa somente o comparador original daquele domínio sobre o conjunto incluído completo. Sem prioridade daquele domínio, apresentar grupo identificado “Sem OP”/“Sem Custo”, acessível com sua contagem, sem atribuir prioridade zero. Desempates técnicos por código/ID não usam a prioridade do outro domínio. A relação não interfere na ordem.

O ranking de Custo é calculado fora do novo engine pelo presenter/comparador existente e entregue como resultado/posição original. Não interpretar narrativa de reincidência como nova evidência. Não alterar pesos, TOP-200 ou exportação atuais. Se houver paginação visual no novo relatório, aplica-se **depois** da composição/ordenação do conjunto completo; cobertura e totais distinguem universo mensal, inclusão escolhida e filtro visual. Uma futura prioridade conjunta exige outro contrato explícito.

## 9. Arquitetura e contratos de dados futuros

### 9.1 Responsabilidades

Fluxo: **UI → API → adaptação dos resultados existentes → engine puro OP × CUSTO → apresentação**.

- **UI/orquestração:** captura competência única/contexto anterior, controla carregamento/erros/escolha de inclusão, dispara uma leitura por contexto e aciona motores/adaptadores. Filtragem local reutiliza o contexto válido; não refaz consultas por linha ou por clique de dossiê.
- **API existente:** único acesso de cliente ao Supabase, somente `supabase.from().select(...)`, com filtros/paginação/enriquecimento/provenientes. Não calcula relação investigativa.
- **Adaptação na orquestração:** preserva envelopes por ID, verifica qualidade de valores originais, chama motores e presenter atuais fora do novo core e entrega seus resultados sem reclassificar. Não importa UI de tabela no engine. Prioridade calculada existente é entrada, não função de DOM passada ao core.
- **Novo engine puro futuro:** recebe contexto completo validado e análises existentes; normaliza relação, calcula cobertura, compõe evidências e matriz aprovada. Não tem I/O, relógio próprio, DOM, Supabase, API ou runtime config; não importa `view/ui-table.js` nem o caminho transitivo de configuração do report engine. Pode reutilizar helpers puros de identidade. Não muta entradas.
- **Apresentação:** mostra fatos/resultados/relação/proveniência/limites; estados de inclusão não escrevem no banco. Usar escapes e componentes/tokens existentes.

Não refatorar motores legados para viabilizar esta definição. A extensão inicial é um contrato externo de composição; **não é necessário alterar `investigation-contract.js`**, nem criar segunda fonte de prioridades ou de classificação. Tipos JSDoc do novo envelope podem residir no próprio módulo futuro.

### 9.2 API — contrato base

`api.getOpCustoContext({ competencia: '2026-10' })`.

Entrada obrigatória: uma competência válida. Não recebe intervalo/múltiplos meses, lista TOP-200, filtros de estágio/origem/motivo nem código que estreite o universo da cobertura. Busca por produto e filtros visuais são aplicados após leitura completa; D nasce de consulta explícita do usuário sobre esse contexto.

Saída de sucesso, no padrão `{ data, error: null }` existente:

```text
ContextoOpCustoV1 {
  versao: 'OP_CUSTO_V1',
  competencia: 'AAAA-MM',
  periodo: { inicio: 'AAAA-MM-DD', fimInclusivo: 'AAAA-MM-DD' },
  opEventos: FatoOpOriginal[],
  custoSnapshots: FatoCustoOriginal[],
  fontes: {
    op: { estado: 'completa' | 'completa_vazia', contagem, paginas, ordem, lidoEm },
    custos: { estado: 'completa' | 'completa_vazia', contagem, paginas, ordem, lidoEm }
  },
  leitura: { idLocal, consistencia: 'nao_transacional' }
}
```

`contagem` representa linhas lidas, antes de validar chaves/métricas; não apenas produtos ou linhas apresentáveis. `lidoEm` e `idLocal` são metadados locais de leitura, não substituem `criado_em`, competência ou lote ERP. Erros não devolvem fontes parciais em `data`.

Saída de falha: `{ data: null, error }`, preservando normalização operacional da API. Códigos conceituais do novo contrato: `COMPETENCIA_INVALIDA`, `MULTICOMPETENCIA_NAO_SUPORTADA_V1`, `FONTE_OP_INDISPONIVEL`, `FONTE_CUSTO_INDISPONIVEL`, `LEITURA_INCOMPLETA`, `CONTAGEM_DIVERGENTE`, `IDENTIDADE_REPETIDA`. Informar fonte/etapa e mensagem segura, sem credenciais/erro bruto. Falha de enriquecimento obrigatório também impede sucesso. Não modificar autorização atual nem tentar corrigir acesso como efeito da leitura.

### 9.3 Paginação e integridade obrigatórias

1. Reutilizar o leitor de páginas de **500** e `count: exact`; aplicar limites mensais e demais parâmetros antes de cada `range`. OP precisa seleção mensal completa, não o argumento atual de igualdade por dia. Custo precisa o mesmo mês antes da comparação, sem cascata que retire produtos da cobertura.
2. OP: `data_referencia DESC, estagio ASC, origem ASC, op ASC, id ASC`; Custo: `data_referencia ASC, id ASC`. Conservar ordem total e desempate por ID. Ordenação da série de custo para referência é operação posterior conforme seção 5.
3. Rejeitar erro, count ausente/divergente, página incompleta antes do total esperado, total final divergente ou ID ausente/repetido em qualquer fonte. O helper genérico sozinho não substitui a checagem de IDs, hoje explícita no método OP.
4. Terminar ambas as fontes e validar suas dimensões antes de calcular A/B/C, inclusão, fila ou indicadores. Não devolver resultado parcial com aviso meramente decorativo.
5. Enriquecer códigos em blocos IN e catálogos paginados pelos mecanismos existentes, sem teto total ou N+1. A mesma dimensão necessária deve ser reutilizada na carga; não buscar dados por produto/dossiê.
6. Não usar `state.reportRows` truncado, filas visíveis, primeiros 1.000 ou TOP-200 como universo. Dataset local já carregado só pode ser reutilizado se comprovar mesmo mês, ambas as fontes completas, enriquecimento e mesma revisão; estado atual de uma tela isolada não comprova isso.
7. Leitura paginada entre duas fontes não é snapshot transacional. Count/IDs detectam várias inconsistências, mas não provam ausência de alteração simultânea com mesmo count. Registrar janela de leitura e esse limite; sem RPC/SQL no frontend ou falsa promessa de atomicidade. Mudança detectada bloqueia resultado; nova tentativa é explícita, nunca write ou retry que esconda falha.

### 9.4 Entrada e saída do engine relacional

Entrada futura: contexto validado, envelopes OP analisados indexados pelo ID original, séries/resultados de custo por código, comparações utilizáveis ou motivo de insuficiência, flags do alerta e prioridades/ordens originais calculadas fora dele. Sem escolha de inclusão implícita; engine compõe cobertura integral, apresentação aplica escolha explícita.

Assinatura proposta: `analyzeOpCustoContext({ contexto, analisesOp, analisesCusto })`. `analisesOp` é uma coleção `{ idFonte, resultadoOriginal, posicaoOriginal }`; cada ID do contexto deve corresponder exatamente a uma análise, sem associação por posição. `analisesCusto` é uma coleção por `codigoNormalizado`, com IDs de snapshots, resultado original, comparação validada, flag canônica de alerta e prioridade/posição originais. Toda referência deve pertencer ao contexto da mesma competência. Falta ou duplicação de análise para um fato válido é erro de contrato da adaptação, não ausência do domínio. IDs inválidos na própria fonte já impedem sucesso da API. Esses nomes são proposta de contrato, não funções existentes.

```text
ProdutoCompetenciaV1 {
  chave: { codigoNormalizado, competencia },
  cobertura: 'A' | 'B' | 'C' | 'D',
  op: null | {
    eventos: [{ idFonte, fatoOriginal, resultadoOriginal }],
    contagens: { eventos, numerosOpDistintosObservados },
    consolidacao: { estado: 'nao_disponivel', valores: null, motivos },
    sinalRelacional, prioridadeOriginalObservada, eventosDaPrioridade
  },
  custo: null | {
    snapshots: [{ idFonte, fatoOriginal }],
    referencia: { estado, idsCandidatos, valores: null | { variavel, fixoDireto, total } },
    comparacao: { estado, idsReferencia, idsBase, deltaMonetario, deltaPercentual, motivos },
    resultadoOriginal, sinalRelacional, prioridadeOriginal
  },
  relacao: { codigo, rotulo, motivos, evidencias },
  qualidade: { avisos, limitacoes }
}
ResultadoOpCustoV1 {
  versao, competencia, leitura,
  cobertura: { ambos, somenteOp, somenteCusto },
  produtos: ProdutoCompetenciaV1[],
  diagnosticos: { opNaoVinculavel, custoNaoVinculavel, metricasInvalidas }
}
```

Campos numéricos ausentes são `null` com motivo. `estado` distingue disponível, sem base, inválido e ambíguo conforme seções 4–6. Eventos de um lado presente nunca são eliminados porque a métrica é inválida. Não há campo `scoreGlobal`, prioridade conjunta ou persistência de conclusão. Consultas D são resultados explícitos adicionais, não incrementam os totais A/B/C.

Enums da referência de custo: `disponivel` (um candidato), `valor_comum_empatado` (mesmos valores, vários candidatos), `ambigua` (candidatos conflitantes) e `invalida` (proveniência insuficiente para seleção). Lado Custo ausente é `custo: null`, não uma referência de custo zero. Enums da comparação: `disponivel`, `sem_base`, `denominador_invalido`, `ambigua`, `invalida`. Em `denominador_invalido`, delta monetário pode existir quando ambos os valores são finitos, mas delta percentual é `null`; nos estados ambíguo/inválido, não fornecer delta candidato como se fosse conclusão. OP tem sinais `desfavoravel`, `favoravel`, `sem_desvio_priorizado`, `heterogeneo`, `insuficiente`; Custo tem `aumento_relevante`, `queda_relevante`, `sem_variacao_relevante`, `sem_base_utilizavel`. Sinais sintetizam evidência relacional; não substituem classificações originais.

## 10. UX futura

### 10.1 Entrada e contexto

Na Auditoria de OP, junto aos controles do relatório, o futuro botão será **“OP × CUSTO — Outubro/2026”**, com o rótulo correspondente ao mês selecionado. Habilitar quando houver **uma competência explícita válida**: se a UI usar início/fim, ambos devem indicar o mesmo mês. Sem seleção ou com intervalo de meses, desabilitar com motivo “Selecione uma única competência para OP × CUSTO”. Não inferir mês de `criado_em`, data atual, primeira linha ou dossiê.

Não exigir OP presente para habilitar: um mês válido pode ter somente Custo. Carregamento/erro da própria ação tem estado explícito, sem disparar análises concorrentes. Abrir relatório próprio no contexto do módulo, sem criar dashboard genérico ou pressupor uma nova view global.

Guardar contexto de retorno: competência original, filtros de busca/origem/estágio/OP, motivo selecionado, produto ativo, ordenação, posição de rolagem/foco e dossiê aberto. Esses filtros são contexto de origem, **não recorte silencioso do conjunto mensal cruzado**. Exibir aviso de escopo: “Cruzamento da competência completa; filtros da tela OP preservados para retorno”. Filtros locais do novo relatório devem ser explícitos e separados dos totais globais.

### 10.2 Estrutura

1. **Visão geral:** competência, identificação da leitura/limite não transacional, A/B/C, inválidos não vinculados, inclusão escolhida, contagens de sinais relacionais e limitações. Se houver sinais inconclusivos, mostrá-los; ausência de base não é “sem alerta”.
2. **Fila investigativa:** Produto/código, síntese OP com quantidade de eventos e prioridade OP original observada, Custo de referência/comparação/prioridade original, Relação, Evidência e qualidade. Colunas de prioridades separadas e modos de ordenação da seção 8; sem prioridade global. Explicitar o lado ausente.
3. **Análise por produto:** drill-through por código dentro do conjunto completo, com cobertura, eventos OP, série de snapshots e referências das evidências. Busca explícita fora da união produz D. Não restringir busca aos itens visíveis.
4. **Dossiê:** fatos ERP individuais, indicadores/decisões originais dos motores, hipóteses OP rotuladas, datas completas de referência e importação, comparações/base, snapshots anteriores da mesma competência, sinais contraditórios, possíveis reimports e conclusão relacional Kustos com limitações. Histórico de outros meses não é requisito V1 e não entra no cálculo mensal; navegação para históricos existentes deve manter o escopo visível e retorno.

Voltar restaura o contexto OP guardado e seu dossiê; voltar do dossiê cruzado restaura a fila cruzada, produto e posição. Trocar competência invalida o resultado da ação anterior; resposta assíncrona atrasada não pode sobrescrever a competência atual. Reusar padrões Black + Purple e cores/rotulagem operacionais existentes, sem reduzir a relação a uma cor.

## 11. Extensão futura — análise temporal multi-competência

A chave inclui competência e o envelope é versionado para permitir futura coleção explícita de resultados mensais. Isso não autoriza aceitar vários meses na API V1 nem acrescentar endpoints, telas ou cálculos agora.

No futuro deverá ser possível selecionar meses explícitos, comparar evolução OP e Custo, detectar persistência e deterioração/melhoria, observar possível defasagem temporal e padrões recorrentes. Meses não selecionados não podem ser preenchidos silenciosamente; cobertura/qualidade/inclusão devem existir por mês. Mudança de granularidade ou ausência de base deve permanecer identificável.

**Nada disso será implementado na primeira versão.** Baselines entre meses, regras estatísticas, janelas, sazonalidade, defasagem, recorrência e eventual prioridade conjunta exigem novos contratos e aprovação. Nenhum padrão temporal futuro será automaticamente causal.

## 12. Matriz de testes obrigatórios para implementação posterior

Esta seção especifica testes futuros; não declara sua execução nesta entrega documental.

| ID | Cenário | Resultado obrigatório |
|---|---|---|
| T01 | Código canônico nos dois nomes de campo | Uma entidade pela normalização existente; nenhum normalizador paralelo |
| T02 | Códigos vazios, inválidos, ambíguos e espaços/invisíveis | Casos rejeitados ficam em diagnóstico por ID; inválidos nunca se relacionam entre si |
| T03 | Zeros significativos, códigos textuais e representações numéricas aceitas | Preservar exatamente a semântica do helper; não colapsar códigos distintos por coerção |
| T04 | Descrições e categorias divergentes/ausentes | Mesmo código válido relaciona; descrição/categoria não cria nem bloqueia chave |
| T05 | 05/10 e 14/10 do mesmo produto | Mesmo mês, fatos/snapshots individuais e datas originais preservadas |
| T06 | Importação em novembro de competência outubro e inverso | Mês segue `data_referencia`, referência ordena `criado_em` somente dentro do mês |
| T07 | Limites de mês, dezembro/janeiro, fevereiro bissexto e datas impossíveis | Recorte completo, sem UTC/dia 01 artificial; parâmetros inválidos rejeitados |
| T08 | A/B/C e busca D | União integral; D somente por busca explícita; métricas inválidas não mudam presença A |
| T09 | Uma fonte vazia e ambas vazias | Cobertura válida/estado vazio confirmado, sem erro fictício nem valores inventados |
| T10 | Fonte ou enriquecimento indisponível | `data: null`, mensagem de falha; nenhum A/B/C, zero ou escolha de inclusão falsa |
| T11 | Inclusão sim/não/cancelar e A = 0 | Sim inclui B/C com null; não mantém contagens; cancelar não decide; alteração de escolha disponível |
| T12 | Atualização, troca de mês e filtros locais | Nova leitura/mês exige escolha quando aplicável; filtro local não apaga contexto/contagens |
| T13 | Mesma OP/produto/data, múltiplos estágios/origens/unidades/IDs | Nenhuma colisão da chave legada ou associação errada após ordenação |
| T14 | Possíveis reimports com IDs distintos e lote ausente | Preservar eventos e hipótese de repetição; não deduplicar negócio nem inferir lote |
| T15 | Múltiplos snapshots, um só snapshot e série fora de ordem | Referência mais recente dentro do mês, série completa; um só = sem base |
| T16 | Empate de timestamp igual/divergente na referência ou base | Mostrar candidatos, sem recência pelo ID; comparação ambígua não produz sinal de custo |
| T17 | Zero real, null, vazio, inválido e denominador zero/não positivo | Zero preservado; ausências não viram zero; percentual indisponível quando sem base válida |
| T18 | Quantidades/tempos com estágios e unidades potencialmente repetidos | Nenhuma soma mensal sem prova; consolidação indisponível e eventos intactos |
| T19 | Taxas/percentuais e quantidades em CX | Não somar nem média simples; não inferir KG ou bases de tempo |
| T20 | Contagem de eventos e números OP | IDs distintos contam eventos; números distintos não se tornam ordens únicas comprovadas |
| T21 | 0/1/499/500/501/1.000/1.001/mais páginas em ambas as fontes | Todos os registros lidos antes da composição; nenhum teto TOP-200/1.000 |
| T22 | Página curta, erro intermediário, count ausente/alterado, IDs repetidos/ausentes | Bloqueio integral sem deduplicação silenciosa; filtros e ordem repetidos em cada página |
| T23 | Paginação com empates nos campos anteriores ao ID; enriquecimento em blocos | Ordem total estável, universo reconciliado; nenhuma consulta por produto |
| T24 | Seis células aprovadas da matriz, insuficiência/mistura e células não definidas | Rótulos exatos, motivos e IDs; nenhuma reclassificação de OP/Custo |
| T25 | Limite do alerta, variação negativa e arredondamento | Reutilizar decisão canônica; não alterar limiar/prioridades nem confundir regime com variação |
| T26 | Frases/evidências e `causaProvavel` OP | Sem causalidade/reincidência inventada; hipótese OP identificada e fatos rastreáveis |
| T27 | Dois modos de prioridade e lados ausentes | Escalas separadas, sem score ou desempate pelo outro domínio; conjunto completo antes da janela |
| T28 | Botão sem mês, intervalo, mês válido sem OP | Habilitação pela competência única, sem inferência por linha ou importação |
| T29 | Drill-through, voltar, produto/posição/dossiê e resposta atrasada | Restaurar contexto; não substituir mês atual com resposta obsoleta |
| T30 | Entrada com vários meses e entidades de meses diferentes | V1 rejeita multi-mês; chaves/versionamento suportam evolução sem misturar meses |
| T31 | Pureza, imutabilidade e execução sem browser/configuração | Novo engine importa sem DOM/env/Supabase/API/ui-table; entradas e resultados originais intactos |
| T32 | Spy de I/O no fluxo completo | Somente SELECT pela API/from; nenhum insert/upsert/update/delete/RPC/SQL/frontend ou mudança Auth |

Além dos novos testes, executar na implementação os checks existentes pertinentes (lint, typecheck e regressões dos motores/API/UX) para provar que a composição não mudou decisões, paginação ou TOP-200 legados. Não criar testes que apenas espelhem o novo código: usar fatos com resultados esperados, falhas de leitura e regressões reais acima.

## 13. Decisões ainda dependentes de evidência/aprovação humana

As oito decisões da seção 1 **não estão pendentes**. Restam limites para evoluções específicas:

- Para habilitar consolidações numéricas: documentação ERP de unidades (quantidade, tempo, massa e base econômica do custo), granularidade dos apontamentos, repetição de planos/produção por estágio, sobreposição de paradas e identidade de reimports. Sem essa prova, V1 apresenta eventos e consolidação indisponível; isso não bloqueia o relatório por eventos.
- Se for desejado recuperar revisões sobrescritas, resolver empates ou assegurar identidade de importação em custos: contrato próprio de proveniência/saneamento, compatível com LOG-02/03 e autorização separada. V1 usa a série disponível e sinaliza ambiguidades, sem corrigir dados.
- Para ampliar a matriz além das células aprovadas, combinar prioridades ou analisar vários meses: novos critérios de negócio aprovados, sem alteração silenciosa dos motores. V1 tem fallback explícito “Sem relação definida”.
- Início da implementação e eventual publicação continuam sujeitos a autorização própria. Esta entrega encerra na documentação; não inicia a próxima etapa.

## 14. Inventário planejado no fechamento do contrato

Arquivos planejados no fechamento documental, com responsabilidade delimitada. Na Fase 1 foram implementados somente `core/op-custo-engine.js`, `src/services/api.js` e os dois testes de engine/API; os demais caminhos continuam futuros. Estado e uso atuais estão na seção 16.

| Arquivo | Mudança futura prevista |
|---|---|
| `core/op-custo-engine.js` (novo) | Composição pura, tipos JSDoc, cobertura, qualidade e relação |
| `view/ui-op-custo.js` (novo) | Orquestração/adaptação, escolha de inclusão, relatório e dossiê |
| `src/services/api.js` | Método somente leitura `getOpCustoContext`, aproveitando paginação/enriquecimento existentes |
| `view/ui-op.js` | Entrada e captura/restauração do contexto OP, sem reclassificar motor |
| `view/ui-controller.js` | Integração entre controllers e ciclo da ação |
| `view/ui-dom.js` | Referências dos futuros controles |
| `index.html` | Botão e estrutura do relatório a implementar posteriormente |
| `assets/style.css` | Somente ajustes de apresentação necessários com os tokens existentes |
| `tests/op-custo-engine.test.js` (novo) | Identidade, cobertura, qualidade, matriz, pureza e agregações |
| `tests/api-op-custo-context.test.js` (novo) | Recorte completo, paginação, erros, proveniência e ausência de writes |
| `tests/ui-op-custo.test.js` (novo) | Escolha de inclusão, UX, contexto de retorno e prioridades separadas |

Não estão previstas alterações em motores OP/Custo, `investigation-contract.js`, parser, schema, SQL, migrations, RLS/Auth ou executores. Se a implementação demonstrar necessidade real de outra mudança, justificar e revisar o escopo antes de executá-la; não fazer refatoração oportunista.

Quando autorizada a implementação, atualizar este contrato e a matriz de contratos operacionais com as chamadas reais; manuais técnico/operação/usuário com comportamento efetivamente entregue; índice, README e ROADMAP com capacidade/estado correto; AGENTS com entrada datada; backlog somente quanto aos itens realmente afetados, com provas próprias em auditoria. VISION e regras gerais só mudam se seus princípios/processo mudarem, o que este contrato não exige.

## 15. Fontes consultadas e entrega documental

### 15.1 Documentos lidos nesta definição

1. `README.md`.
2. `AGENTS.md`.
3. `VISION.md`.
4. `ROADMAP.md`.
5. `docs/regras-gerais.md`.
6. `docs/manuais/manual-operacao.md`.
7. `docs/manuais/manual-tecnico.md`.
8. `docs/engenharia-dados-supabase.md`.
9. `docs/arquitetura/indice-documentacao-kustos.md`.
10. `docs/arquitetura/matriz-contratos-operacionais.md`.
11. `docs/arquitetura/banco-de-dados.md`.
12. `docs/arquitetura/backend-api.md`.
13. `docs/auditoria/backlog-priorizado.md`.
14. `docs/auditoria/op-paginacao-validacao.md`.
15. `docs/auditoria/custos-top200-validacao.md`.
16. `docs/auditoria/custos-classificacao-erp.md`.
17. `docs/regras-negocio/glossario.md`.

Considerados também a especificação anterior e o fechamento integral fornecidos pelo usuário no chat. A especificação anterior não foi tratada como implementação já existente nem como garantia de comportamento do checkout. Código conferido: `core/spreadsheet-engine.js`, `core/op-investigation-engine.js`, `core/investigation-contract.js`, `core/report-engine.js`, `src/services/api.js`, `view/ui-op.js`, `view/ui-controller.js`, `view/ui-state.js`, `view/ui-table.js`, `src/config/app-config.js` e pontos de importação de OP/Custos descritos neste diagnóstico.

### 15.2 Documentos alterados por este fechamento

- Este novo contrato `docs/arquitetura/op-custo.md`.
- `AGENTS.md`: registro obrigatório do contrato documental e seus limites.
- `ROADMAP.md`: capacidade futura com definição concluída e implementação não iniciada.
- `docs/arquitetura/indice-documentacao-kustos.md`: acesso ao contrato.
- `docs/auditoria/backlog-priorizado.md`: referência fora da lista ativa de correções, sem mudar contagens/prioridades ou encerrar defeitos.

README, VISION, regras gerais, manuais e demais documentos permanecem sem alteração, pois nenhum comportamento funcional foi entregue. Validação realizada: links locais dos documentos alterados sem caminhos quebrados; diff restrito aos cinco Markdown acima; contagens do backlog preservadas em 25 itens; matriz com 32 cenários futuros; `git diff --check` aprovado e novo arquivo também conferido quanto a espaços finais e newline. Testes da funcionalidade estão especificados, não implementados/executados. Sem commit, push, deploy ou qualquer escrita remota.

## 16. Fase 1 — núcleo local implementado

O pedido específico da Fase 1 autorizou engine puro, contexto de leitura da API e seus testes, sem interface. As oito decisões de negócio permanecem intactas. Os registros de “não implementado” nas seções 13/15 delimitam o fechamento documental original, não o estado desta Fase 1. [Validação, arquivos e limites](../auditoria/op-custo-fase1-validacao.md).

### Entrada e uso disponíveis

`api.getOpCustoContext({ competencia: '2026-10', periodo?, produto? })` deriva os limites completos do mês; `periodo`, quando informado, deve ser exatamente `{inicio:'2026-10-01', fimInclusivo:'2026-10-31'}`. `produto` é código de consulta explícita; não reduz as fontes nem A/B/C. Retorno `{data,error}`: sucesso mantém o contexto da seção 9.2 e acrescenta `analisesOp`, `analisesCusto`, `produtoSolicitado`, `cobertura` e `qualidade`. Erro retorna `data:null`, sem resultados parciais ou mensagens brutas do driver.

API adapta OP com o motor original, preservando o ID no objeto analisado e colocando `idFonte` no envelope antes do contrato descartá-lo. Não reconstrói identidade pela chave legada nem faz zip de arrays. Em Custo, reutiliza `buildReportRows`/`classifyAlert` sobre os fatos vinculáveis do mês. `classificacaoCustos` é metadado separado: o snapshot mantém descrição, custos e datas originais; a projeção existente é usada para o resultado analítico. Dimensão compartilhada por carga; nenhum lookup por produto.

```js
const { data, error } = await api.getOpCustoContext({ competencia: '2026-10' });
if (error) throw error;
const resultado = analyzeOpCustoContext({
  contexto: data,
  analisesOp: data.analisesOp,
  analisesCusto: data.analisesCusto,
  produtoSolicitado: data.produtoSolicitado
});
```

Não há consumidor UI desse fluxo nesta fase. O futuro orquestrador poderá enriquecer `analisesCusto` com `prioridadeOriginal` calculada pelo presenter existente antes de chamar o engine. A API entrega `null` e `qualidadePrioridade:'aguarda_presenter_existente'`, pois não importa views nem cria outra regra de prioridade. Resultados OP fornecem `posicaoOriginal` da fila original; o engine usa essa posição para identificar a maior prioridade observada, sem novo ranking.

### Complementos explícitos de entrada/saída

- `relacao.codigo` mantém os códigos estáveis da seção 7.2. `relacao.tipo` é alias solicitado na Fase 1: `temporalmente_compativel`, `sem_confirmacao_por_custo`, `sinal_de_custo_sem_correspondencia_operacional`, `sinais_divergentes`, `evidencia_temporalmente_compativel_favoravel`, `inconclusivo`. Fallbacks permanecem `nao_aplicavel`/`sem_relacao_definida_v1`. Não há mudança de taxonomia ou substituição silenciosa do código aprovado.
- O engine exporta `analyzeOpCustoContext` e os helpers puros `getOpCustoPeriod`, `assertOpCustoIds`, `inspectOpCustoContext`. A inspeção usada pela API só compõe vínculo/cobertura/diagnóstico; não chama a relação investigativa. Fontes incompletas retornam engine em `estado:'indisponivel'`, `cobertura:null`, `produtos:[]`; ID/adaptação inválidos lançam erro de contrato.
- Eventos OP mantêm fatos/resultados individuais, distribuição por motivo, presença de favoráveis/desfavoráveis/mistos/sem base, contagens e possíveis reimports. Conteúdo equivalente em IDs diferentes apenas gera aviso; não é deduplicação nem prova de repetição de negócio.
- Colisão de normalização: divergência de medidas entre grafias distintas do código normalizado na mesma granularidade observada gera inconsistência e relação inconclusiva, sem retirar fatos. Em Custo, essa granularidade é produto/data completa; em OP, data/OP/estágio/origem/unidade para diagnóstico, nunca identidade única de negócio. Mudança de custo em datas distintas ou passagem por estágios diferentes não é, por si só, colisão.
- Custos mantêm toda a série, candidatos de referência/base, valores e qualidade de campos. Comparação por instante usa precisão suficiente para microssegundos do PostgreSQL; fusos diferentes do mesmo instante continuam empatados. O intermediário de alta precisão não é exposto no payload.
- Consolidação retorna `estado:'nao_disponivel'`, `valores:null`. Nenhuma quantidade/tempo/parada/apontamento/taxa/percentual é somada ou promediada. Ausência permanece `null`; zero real permanece zero.
- Os 32 cenários da seção 12 incluem testes de UI que continuam futuros. Nesta fase foram implementados os cenários pertinentes ao engine/API; escolha de inclusão, botão, navegação e retorno não existem ainda.

Sem alterações nos motores originais, parser, UI, index/CSS, TOP-200, ranking, dados remotos, schema, migrations, RLS/Auth. Nenhuma análise multi-mês, carga, commit, push ou deploy.
