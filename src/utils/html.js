/* Responsabilidade: utilitários de HTML seguros — shared entre core/ e view/.
 * Centralizado aqui para evitar duplicação e garantir escape consistente.
 * Qualquer interpolação de dado externo em innerHTML DEVE passar por escapeHtml.
 */

/**
 * Escapa caracteres HTML especiais de uma string.
 * Protege contra XSS em interpolações de innerHTML.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitiza um valor para uso seguro em atributos HTML (value=, data-*, etc).
 * @param {*} value
 * @returns {string}
 */
export function escapeAttr(value) {
  return escapeHtml(value);
}
