import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b, mesmo padrão dos PRs #120/#121): não exporta
// internos nem toca no runtime. O módulo api é mockado — o cliente Supabase
// real do CDN nunca é carregado.
vi.mock('../src/services/api.js', () => ({
  api: { getApontamentosOp: vi.fn() }
}));

import { createOpController } from '../view/ui-op.js';
import { api } from '../src/services/api.js';

// Apontamentos simulados: 2 estágios, origens/OPs/produtos distintos e 2
// competências para o mesmo produto (linha do tempo).
const APONTAMENTOS = [
  { data_referencia: '2026-01-01', estagio: 'EXTRUSAO', origem: 10, op: 100, cod_produto: '001', descricao: 'Produto A', unidade: 'KG', qtd_prevista: 100, qtd_produzida: 90, tempo_previsto: 10, tempo_real: 12, kg_hora_previsto: 5, kg_hora_real: 4, perc_tempo: 20, tempo_parada: 1, qtd_apontamentos: 3 },
  { data_referencia: '2026-02-01', estagio: 'EXTRUSAO', origem: 10, op: 101, cod_produto: '001', descricao: 'Produto A', unidade: 'KG', qtd_prevista: 100, qtd_produzida: 110, tempo_previsto: 10, tempo_real: 8, kg_hora_previsto: 5, kg_hora_real: 6, perc_tempo: -20, tempo_parada: 0, qtd_apontamentos: 2 },
  { data_referencia: '2026-01-01', estagio: 'EMBALAGEM', origem: 20, op: 200, cod_produto: '002', descricao: 'Produto B', unidade: 'UN', qtd_prevista: 50, qtd_produzida: 50, tempo_previsto: 4, tempo_real: 4, kg_hora_previsto: 3, kg_hora_real: 3, perc_tempo: 0, tempo_parada: 0, qtd_apontamentos: 1 }
];

// Fake select que captura as opções aplicadas por fillSelect (via replaceChildren)
// e o handler de 'change'. `value` é livremente ajustável.
function fakeSelect(value) {
  return {
    value,
    options: [],
    _listeners: {},
    addEventListener(ev, fn) { this._listeners[ev] = fn; },
    replaceChildren(...children) { this.options = children; },
    optionValues() { return this.options.map(o => String(o.value)); },
    change(next) { if (next !== undefined) this.value = next; this._listeners.change?.(); }
  };
}

function fakeClassList() {
  return { _s: new Set(['hidden']), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } };
}

function fakeTableBody() {
  return {
    innerHTML: '',
    _click: null,
    addEventListener(ev, fn) { if (ev === 'click') this._click = fn; },
    // Simula clique numa linha com o data-cod-produto informado.
    emitRowClick(codProduto) {
      const tr = { dataset: { codProduto } };
      this._click?.({ target: { closest: sel => sel.includes('data-cod-produto') ? tr : null } });
    }
  };
}

function setup() {
  const dom = {
    selOpEstagio: fakeSelect('TODOS'),
    selOpOrigem: fakeSelect('TODAS'),
    selOpOp: fakeSelect('TODAS'),
    selOpProduto: fakeSelect('TODOS'),
    dtOpStart: { value: '' },
    dtOpEnd: { value: '' },
    analisarOpBtn: { addEventListener() {} },
    opTableBody: fakeTableBody(),
    opDrillPanel: { classList: fakeClassList(), scrollIntoView: vi.fn() },
    opDrillTitle: { textContent: '' },
    opDrillBody: { innerHTML: '' }
  };
  const executeOperationalBoundary = async (_op, action) => action();
  const controller = createOpController({ dom, executeOperationalBoundary });
  return { dom, controller };
}

describe('createOpController — visualização da Auditoria de OP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // fillSelect usa document.createElement; replaceChildren é mockado no fake.
    global.document = { createElement: () => ({}) };
    api.getApontamentosOp.mockResolvedValue({ data: APONTAMENTOS, error: null });
  });

  afterEach(() => { delete global.document; });

  it('bindOp() popula selOpEstagio com os estágios únicos dos dados', async () => {
    const { dom, controller } = setup();
    await controller.bindOp();

    // Carrega tudo uma vez (sem filtro) para derivar a cascata em memória.
    expect(api.getApontamentosOp).toHaveBeenCalledWith({});
    // TODOS (opção padrão) + estágios distintos, ordenados.
    expect(dom.selOpEstagio.optionValues()).toEqual(['TODOS', 'EMBALAGEM', 'EXTRUSAO']);
  });

  it('mudar estágio restringe selOpOrigem às origens daquele estágio', async () => {
    const { dom, controller } = setup();
    await controller.bindOp();

    dom.selOpEstagio.change('EXTRUSAO');

    // Só a origem 10 pertence a EXTRUSAO (origem 20 é de EMBALAGEM).
    expect(dom.selOpOrigem.optionValues()).toEqual(['TODAS', '10']);
    // Reset em cadeia dos níveis inferiores.
    expect(dom.selOpOp.value).toBe('TODAS');
    expect(dom.selOpProduto.value).toBe('TODOS');
  });

  it('runOpReport() chama api.getApontamentosOp com os filtros selecionados', async () => {
    const { dom, controller } = setup();
    await controller.bindOp();
    api.getApontamentosOp.mockClear();

    dom.selOpEstagio.value = 'EXTRUSAO';
    dom.selOpOrigem.value = '10';
    await controller.runOpReport();

    expect(api.getApontamentosOp).toHaveBeenCalledWith({ estagio: 'EXTRUSAO', origem: '10' });
  });

  it('linha da tabela com % Tempo > 0 recebe classe de alerta (vermelho)', async () => {
    const { dom, controller } = setup();
    api.getApontamentosOp.mockResolvedValue({ data: [APONTAMENTOS[0]], error: null });
    await controller.bindOp();
    await controller.runOpReport();

    expect(dom.opTableBody.innerHTML).toContain('delta-up');
    expect(dom.opTableBody.innerHTML).toContain('20.00%');
  });

  it('linha da tabela com % Tempo < 0 recebe classe positiva (verde)', async () => {
    const { dom, controller } = setup();
    api.getApontamentosOp.mockResolvedValue({ data: [APONTAMENTOS[1]], error: null });
    await controller.bindOp();
    await controller.runOpReport();

    expect(dom.opTableBody.innerHTML).toContain('delta-down');
    expect(dom.opTableBody.innerHTML).toContain('-20.00%');
  });

  it('clicar numa linha abre a linha do tempo com os dados daquele produto', async () => {
    const { dom, controller } = setup();
    await controller.bindOp();
    await controller.runOpReport();

    dom.opTableBody.emitRowClick('001');

    // Painel revelado e título com o produto clicado.
    expect(dom.opDrillPanel.classList.contains('hidden')).toBe(false);
    expect(dom.opDrillTitle.textContent).toContain('001');
    expect(dom.opDrillTitle.textContent).toContain('Produto A');
    // Ambas as competências do produto 001 aparecem (linha do tempo completa):
    // as OPs 100 (jan) e 101 (fev) são independentes de locale.
    expect(dom.opDrillBody.innerHTML).toContain('100');
    expect(dom.opDrillBody.innerHTML).toContain('101');
    expect(dom.opDrillPanel.scrollIntoView).toHaveBeenCalled();
  });
});
