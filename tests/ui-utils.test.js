import { describe, expect, it, beforeEach } from 'vitest';
import { fillSelect } from '../view/ui-utils.js';

describe('fillSelect', () => {
  beforeEach(() => {
    global.document = {
      createElement: () => ({ value: '', textContent: '' })
    };
  });

  it('preenche opções sem usar innerHTML e preserva texto como conteúdo', () => {
    const select = { children: [], value: '', replaceChildren(...nodes) { this.children = nodes; } };

    fillSelect(select, [{ value: '<x>', label: '<script>alert(1)</script>' }], { value: 'TODOS', label: 'Todos' });

    expect(select.children).toHaveLength(2);
    expect(select.children[1].value).toBe('<x>');
    expect(select.children[1].textContent).toBe('<script>alert(1)</script>');
  });
});
