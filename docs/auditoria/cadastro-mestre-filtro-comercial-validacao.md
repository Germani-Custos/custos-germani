# CAD-COM-FILTER-01 — Filtro de agrupamento comercial

## Causa raiz

O select global chamado **Agrupamento** é da cascata investigativa de Custos. Por contrato, ele lê somente `dicionario_produtos.agrupamento_cod` e `categorias_agrupamento`; na fotografia real esses vínculos não geravam opções, portanto mostrava apenas TODOS. Ele nunca consultou campos comerciais ERP e não é o local correto para exibi-los.

Os campos `dicionario_master_produtos.agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao` já eram carregados para a consulta ERP, mas não havia filtro para eles. A correção acrescenta **Agrupamento comercial** exclusivamente ao painel Cadastro Mestre ERP.

## Dados e comportamento

Leitura somente `SELECT` em 06/11/2026: 860 produtos Master, 162 com código e descrição comercial, 698 ambos vazios, 29 códigos distintos, zero campos parciais e zero códigos com descrições conflitantes. Logo, 29 opções comerciais válidas devem aparecer; TODOS permanece. A identidade da opção é o código; a descrição é rótulo. Código vazio não cria opção, e conflito de rótulos para o mesmo código é excluído para não escolher um vencedor.

A seleção filtra somente `agrupamento_comercial_erp_cod` na coleção já carregada do Master ERP. Limpar volta a TODOS. Falha de leitura continua estado indisponível, não lista vazia. A cascata de Custos e `agrupamento_cod`/override Kustos não foram alterados.

## Validação e limites

Testes de engine, UI e API: 37/37. Cobrem vazio, nulo, espaços, duplicidade, conflito, código/descrição parciais, ordenação, TODOS, seleção, limpeza, filtro combinado, erro de carga e isolamento operacional. Não houve INSERT/UPDATE/DELETE, migration, schema, RPC, importação, alteração de classificação, commit, push ou deploy.
