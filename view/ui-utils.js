export function debounce(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }
export function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
export function formatCurrencyBRL(value) { return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
export function formatDateTimeBR(value) { if (!value) return '-'; const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) return '-'; return parsed.toLocaleString('pt-BR'); }
export function formatDateBR(value) { if (!value) return '-'; const parsed = new Date(value + 'T00:00:00'); if (Number.isNaN(parsed.getTime())) return '-'; return parsed.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); }
export function showToast(icon, text) { Swal.fire({ toast: true, position: 'top-end', timer: 2600, showConfirmButton: false, icon, text }); }

// Helper local de "valor nulo/vazio" para o filtro de opções de `fillSelect`.
// Cópia intencional do mesmo predicado em core/report-engine.js: `core/` não
// pode importar de `view/`, então o util genérico vive nos dois lados sem
// acoplar a camada de cálculo à de apresentação.
function isNullLike(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

/**
 * Preenche um select usando APIs DOM em vez de innerHTML para reduzir superfície de XSS.
 * Helper de apresentação (manipula DOM) — vive na camada view junto de
 * escapeHtml/showToast; movido de core/report-engine.js (A-01), sem alteração
 * de comportamento.
 * @param {HTMLSelectElement} select
 * @param {Array<{value: unknown, label: unknown}>} options
 * @param {{value: unknown, label: unknown}} first
 * @param {unknown} [selectedValue]
 * @returns {void}
 */
export function fillSelect(select, options, first, selectedValue = null) {
  const createOption = (value, label) => {
    const option = document.createElement('option');
    option.value = String(value ?? '');
    option.textContent = String(label ?? '');
    return option;
  };

  const safeOptions = [createOption(first.value, first.label)];
  options
    .filter(opt => !isNullLike(opt?.value) && !isNullLike(opt?.label))
    .forEach(opt => {
      safeOptions.push(createOption(opt.value, opt.label));
    });

  select.replaceChildren(...safeOptions);

  if (selectedValue !== null) {
    const hasOption = [first.value, ...options.map(opt => opt.value)].includes(String(selectedValue));
    select.value = hasOption ? String(selectedValue) : String(first.value);
  }
}
