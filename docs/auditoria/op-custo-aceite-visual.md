# OP × CUSTO — aceite visual manual

**Data:** 06/11/2026 (America/Sao_Paulo)  
**Ambiente efetivamente validado:** Chrome autenticado na aplicação publicada `https://custos-germani.vercel.app/`. Não foi o checkout local: o runtime local não tinha as variáveis públicas de configuração. Logo, este aceite visual não prova equivalência entre a publicação e o HEAD local.  
**Checkout de referência:** `main`, `8a05f18515bff3e75394390012887d24338692d8`, limpo antes e depois desta validação.

## Contexto observado

Competência selecionada: **outubro/2026**. Leitura autenticada mostrou fonte OP vazia confirmada, fonte Custo completa e cobertura somente C (Custo sem OP). Os números detalhados e identificadores de produto não são reproduzidos neste registro. Não houve importação, gravação, alteração de filtros persistidos nem outra ação de escrita.

## Roteiro e resultados

### A. Entrada e contexto

- **Conforme:** com De = Até em outubro/2026, a entrada `OP × CUSTO — Outubro/2026` ficou visível, nomeando a competência e explicando que o cruzamento é mensal e independente dos filtros OP.
- **Conforme:** ao alterar Até para novembro/2026, a entrada foi retirada e a tela informou que é necessário selecionar uma única competência (De = Até).
- **Conforme:** houve estado de carregamento antes da visão geral e, depois da leitura completa, a interface informou que ausência não seria convertida em zero.

### B. Visão geral

- **Conforme:** KPIs de A/B/C e registros não relacionáveis ficaram legíveis nas três larguras verificadas.
- **Conforme:** a fonte OP apareceu como vazia confirmada, enquanto a fonte Custo apareceu como leitura completa; a interface não representou a ausência como erro.
- **Conforme:** competência, escopo mensal completo, escolha de inclusão e limite de leitura não transacional ficaram explícitos.

### C. Fila investigativa

- **Conforme:** a fila só apareceu após a escolha explícita de incluir itens sem correspondência.
- **Conforme:** colunas de OP, Custo, Relação, Evidência e as duas prioridades foram visualmente distintas. Itens C apresentaram OP ausente, sem atribuir prioridade OP artificial.
- **Conforme:** paginação visual e filtro local foram identificados; a tabela declarou região própria de rolagem horizontal e vertical.
- **Não verificado integralmente:** neste recorte não havia A ou B; portanto não foi possível conferir visualmente relações temporais entre os dois domínios nem prioridade OP observada com dados reais.

### D. Dossiê

- **Conforme:** o dossiê C mostrou cobertura, ausência explícita de OP, snapshots individuais de custo, data de referência e `criado_em` em colunas distintas, além de referência/base e delta.
- **Conforme:** limitações de série e de consolidação, bem como a mensagem de que correlação temporal não comprova causalidade, permaneceram visíveis.
- **Não verificado:** eventos OP individuais, estágios distintos e combinação A não estavam disponíveis na competência real escolhida.

### E. Responsividade e acessibilidade

- **Conforme:** 1920 × 1080 — KPIs em uma linha, filtros e tabela sem sobreposição observada.
- **Conforme:** 1366 × 768 — conteúdo permaneceu legível; a continuidade vertical exigiu rolagem de página, sem sobreposição observada.
- **Conforme:** largura 768 px — navegação passou para faixa horizontal; KPIs foram organizados em duas colunas e textos longos quebraram sem cortar controles. A tabela de snapshots exibiu barra de rolagem horizontal.
- **Conforme:** navegação por teclado alcançou o botão Voltar à fila, com contorno de foco violeta claramente visível; Enter retornou à fila preservando o contexto.
- **Não verificado integralmente:** operação manual completa da barra horizontal, leitor de tela e todos os controles de teclado não foram exauridos.

## Evidências visuais

Foram observadas capturas na sessão Chrome para:

1. Entrada OP com competência outubro/2026 e botão OP × Custo disponível.
2. Visão geral com estado pendente de inclusão e distinção entre fonte vazia e fonte completa.
3. Fila de cobertura C, em que prioridades OP e Custo aparecem separadas.
4. Dossiê com snapshots e datas de referência/importação separadas.
5. Foco visível no botão Voltar à fila.
6. Layouts em 1920 × 1080, 1366 × 768 e largura 768 px.

As imagens não foram adicionadas ao repositório: a tarefa não autorizava artefatos binários nem mudança de aplicação; a evidência acima reflete a observação direta durante a sessão autenticada.

## Problemas encontrados

Nenhum defeito visual confirmado no recorte observado.

## Itens não verificáveis nesta sessão

- Casos reais A (OP + Custo), B (OP sem Custo), eventos OP, estágios e relações temporais: não havia OP na competência real selecionada.
- Tela de erro de carregamento: não foi induzida, para não adicionar falhas artificiais ao ambiente autenticado.
- Equivalência da publicação com o HEAD local: não comprovada; o ambiente local permanece sem configuração pública de runtime.
- Leitor de tela e varredura completa de teclado/rolagem horizontal: não exauridos.

## Conclusão

**APROVADO COM RESSALVAS.**

O fluxo visual observado para cobertura C, inclusive ausência explícita, visão geral, fila, dossiê, foco e responsividade, está aceitável. O aceite não se estende aos cenários A/B, eventos OP e relações temporais, pois estes não estavam presentes na competência real examinada. Também não constitui aceite do checkout local nem autorização para publicação, alteração funcional ou qualquer escrita no Supabase.
