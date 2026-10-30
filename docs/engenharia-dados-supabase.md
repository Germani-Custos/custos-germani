# Engenharia de Dados — Supabase (Estado Atual)

Este documento é uma visão temática do fluxo de Custos; modelo completo e FKs ficam em [Banco de Dados](arquitetura/banco-de-dados.md). OP, Master ERP, proveniência, famílias V2 e leituras integrais estão na [matriz de contratos](arquitetura/matriz-contratos-operacionais.md). Não interpretar a lista resumida como inventário completo de tabelas.

## 1) Modelo de dados principal

### `categorias_origem`
- `id` (TEXT no catálogo real; os valores atuais coincidem com `codigo`)
- `codigo` (TEXT, chave de negócio)
- `descricao` (TEXT)

### `categorias_familia`
- `id` (TEXT no catálogo real, com valores em formato UUID; chave técnica distinta de `codigo`)
- `codigo` (TEXT, chave de negócio)
- `descricao` (TEXT)

### `categorias_agrupamento`
- usada para enriquecer `agrupamento_cod` com descrição.
- o frontend usa `codigo`/`id` normalizado para montar opções de filtro.
- no catálogo real atual, `id` é TEXT com o código de agrupamento e não existe coluna `codigo`; a resolução respeita o formato disponível.

### `dicionario_produtos`
Fonte operacional da hierarquia para a auditoria:
- `codigo_produto`
- `descricao`
- `origem_id`
- `familia_id`
- `agrupamento_cod`

### `historico_custos`
Tabela fato de custos:
- `codigo_produto`
- `descricao`
- `custo_variavel`
- `custo_direto_fixo`
- `custo_total`
- `data_referencia` (competência operacional)
- `criado_em` (evento de importação)

Constraint documentada no modelo especializado: `unique_produto_data`, UNIQUE (`codigo_produto`, `data_referencia`); não é apenas recomendação pendente.

---

## 2) Regras de identidade

- `codigo` em categorias é a referência de negócio.
- `id` é referência técnica conforme o catálogo de cada categoria; não presumir tipo UUID nem convertê-lo em código de negócio.
- Frontend exibe `descricao`; backend persiste relacionamento técnico.
- Não usar descrição textual para definir categoria.
- Produto usa `normalizeCodigoProduto()` de `core/spreadsheet-engine.js`; `cod_produto` de OP compartilha esse domínio. Identidade, classificação e existência de fatos são conceitos distintos. A [Auditoria 3](auditoria/cadastro-mestre-universo-canonico.md) registra a cobertura observada e uma proposta lógica ainda não implementada.

---

## 3) Categorização e cascata

Cascata da UI:

**Origem → Família → Agrupamento → Produto**

Fonte de dados usada pelo frontend:
- `api.getMasters` carrega histórico, dicionário operacional, Master ERP e categorias. Em Custos, origem/família vêm do Master quando o código existe nele, inclusive campos vazios/sem resolução; fallback operacional somente fora do Master. A projeção é em memória, sem sincronizar cadastros.
- Agrupamento permanece operacional; os cinco agrupamentos ERP não definem automaticamente categoria Kustos. OP conserva a classificação operacional.
- Filtros exibem apenas valores que aparecem em produtos com custo histórico.

`historico_custos` não armazena lógica de categorização; ele armazena custo por data.

---

## 4) Importação de planilha

Campos obrigatórios:
- Produto
- Descrição
- Custo Variável
- Custo Direto Fixo
- Custo Total

Comportamento:
- aceita colunas extras;
- ignora extras sem falhar;
- normaliza números com vírgula decimal;
- trabalha com precisão de até 4 casas decimais;
- valida linha a linha.

Antes de gravar custo, o sistema tenta garantir produto em `dicionario_produtos`.

---

## 5) Princípios de robustez

- Tolerância a dados imperfeitos.
- Processamento resiliente por linha (falha parcial não interrompe lote completo).
- Remoção de valores nulos nos filtros de UI.
- Consistência entre dicionário (hierarquia) e histórico (custos).

---

## 6) Problemas já endereçados

- UUID usado indevidamente como dado de negócio.
- Divergência entre documentação e colunas reais.
- Conversão numérica inconsistente para padrão brasileiro.
- Filtros vazios com `null`/`undefined`.
- Dependência de rotulagem textual estilo `FAMILIA XXXX`.
