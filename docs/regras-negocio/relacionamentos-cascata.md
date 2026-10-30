# Capítulo 8 — Relacionamentos e Cascata

## Cadeia de categorização
**Origem → Família → Agrupamento → Produto**

## Fonte da hierarquia
- Em Custos, origem/família são projetadas do Master ERP quando o código existe nele, inclusive campos sem resolução; fallback operacional somente fora do Master. OP conserva a classificação operacional. [Contrato CUSTOS-ERP-01](../arquitetura/matriz-contratos-operacionais.md#custos-erp-01--classificação-analítica-em-memória-16102026).
- Agrupamento investigativo vem exclusivamente de `dicionario_produtos.agrupamento_cod`; `categorias_agrupamento` fornece o rótulo. Não usar Agrup. Prod./Com. ERP nem descrição para inferir vínculo.
- O valor da opção é o código de negócio. `getMasters()` usa `codigo` quando presente, senão a referência existente do catálogo. No catálogo real conferido em 30/10/2026, `id` é TEXT e guarda esse código; não existe coluna `codigo` nem UUID de agrupamento. O `id` normalizado entregue à cascata representa o código, não a descrição.
- A hierarquia inclui somente produtos com histórico de custos. Categoria cadastrada sem produto desse universo não aparece; vínculo sem correspondência/rótulo válido não cria opção fictícia. Produto sem agrupamento continua analisável em TODOS.

## Transições e recorte

Sem Família selecionada, Agrupamento oferece os códigos aplicáveis à Origem atual ou a todo o universo de Custos. Família restringe esses códigos; Agrupamento restringe os produtos. As opções consideram produtos com fatos no histórico carregado; período continua sendo aplicado ao relatório, sem transformar a cascata em catálogo por competência.

Mudar Origem limpa Família/Agrupamento/Produto; mudar Família limpa Agrupamento/Produto; mudar Agrupamento limpa Produto. Recarregar masters conserva somente seleções válidas. Se um agrupamento cai para TODOS após reload, os produtos são recalculados pelo valor aceito na mesma atualização.

O cache guarda uma fotografia estruturada dos filtros, vínculos da hierarquia efetiva (ou dicionário como fallback), códigos/rótulos de famílias/agrupamentos e códigos/descrições de produtos. Conteúdo idêntico reutiliza resultado; reclassificação ou rótulo alterado invalida mesmo sem mudança de quantidade. O callback de realtime recebido relê masters completos antes de recalcular; não depende apenas de repopular os selects antigos. A entrega não altera as tabelas/publicação de eventos Supabase.

`getHistorico` e as comparações aplicam `agrupamento_cod` após enriquecimento. Fila/KPIs/gráfico temporal usam esse histórico, XLSX usa `state.reportRows`; ordem e TOP-200 permanecem. Produto aberto no drill-through precisa continuar no relatório completo, senão o painel fecha. Recorte vazio limpa a fonte de exportação anterior. O histórico individual preserva o contrato por produto e competências, sem novo filtro SQL na UI.

## Fonte de custos
- `historico_custos` contém apenas informações de custo por produto/data.

## Regra importante
A lógica de negócio não depende de textos como `FAMILIA XXXX`; depende de códigos e referências estruturadas.

`data_referencia` = competência; `criado_em` = evento/importação. Agrupamento é classificação atual, não reconstrução histórica por competência. [Evidências e limites de validação real](../auditoria/custos-agrupamento-validacao.md).
