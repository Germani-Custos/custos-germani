/* Módulo de sugestão de categoria (roadmap — não conectado ao fluxo principal).
 *
 * ATENÇÃO — REGRA CENTRAL DO SISTEMA (NÃO VIOLAR):
 * Este módulo NÃO deve inferir categorias por descrição, palavras-chave ou
 * qualquer heurística baseada em texto. Categorização é responsabilidade
 * exclusiva do dicionario_produtos (fonte de verdade).
 *
 * Ref: MNT-04, AGENTS.md — "NUNCA misturar lógica temporal com categorização"
 *
 * Funções removidas (violavam a regra acima):
 * - suggestCategory: inferia origem/família por palavras-chave da descrição
 * - splitImportRows: usava suggestCategory para auto-categorizar produtos novos
 * - GERMANI_RULES / KEYWORDS: regras hardcoded de classificação por texto
 *
 * Função removida (duplicação, não violação da regra):
 * - normalizeProductCode: normalizava código de produto sem nenhum consumidor;
 *   a implementação canônica é normalizeCodigoProduto em core/spreadsheet-engine.js.
 *
 * Se auto-sugestão for reativada no futuro, deve ser:
 * 1. Baseada em código de produto (prefixo numérico), nunca em texto livre
 * 2. Apresentada como sugestão editável, nunca gravada automaticamente
 * 3. Aprovada explicitamente antes de atualizar o dicionario_produtos
 */
