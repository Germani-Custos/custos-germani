import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O cliente CDN não participa dos testes de apresentação. A API é injetada;
// os resultados e as relações continuam sendo produzidos pelos motores reais.
vi.mock('../src/services/api.js', () => ({ api: { getOpCustoContext: vi.fn() } }));

import { createOpCustoController } from '../view/ui-op-custo.js';
import { analyzeOpCustoContext } from '../core/op-custo-engine.js';
import { getOperationalPriority, compareByInvestigativePriority } from '../view/ui-table.js';
import { makeOpCustoContext, makeOpEvent, makeCostSnapshots } from './fixtures/op-custo-context.js';

function element({ value = '', hidden = false } = {}) {
  const classes = new Set(hidden ? ['hidden'] : []);
  const listeners = {};
  return { value, hidden: false, disabled: false, innerHTML: '', textContent: '', dataset: {}, scrollTop: 0,
    classList: { add: (...cs) => cs.forEach(c => classes.add(c)), remove: (...cs) => cs.forEach(c => classes.delete(c)),
      contains: c => classes.has(c), toggle: (c, force) => { if (force ?? !classes.has(c)) classes.add(c); else classes.delete(c); } },
    addEventListener: (type, listener) => { (listeners[type] ||= []).push(listener); },
    setAttribute(name, val) { this[name] = String(val); },
    removeAttribute(name) { delete this[name]; },
    getAttribute(name) { return this[name]; },
    scrollIntoView: vi.fn(), focus: vi.fn(),
    async emit(type, patch = {}) {
      const event = { target: this, currentTarget: this, preventDefault: vi.fn(), ...patch };
      for (const listener of listeners[type] || []) await listener(event);
      await this[`on${type}`]?.(event);
    }
  };
}

function setup(context = makeOpCustoContext(), apiOverride) {
  const ids = ['title', 'status', 'overview', 'quality', 'choice', 'choice-text', 'include', 'only-both',
    'change-inclusion', 'back', 'reload', 'report', 'search', 'coverage', 'order', 'body', 'page', 'prev',
    'next', 'code-form', 'code', 'dossier', 'dossier-title', 'dossier-body', 'dossier-back'];
  const els = Object.fromEntries(ids.map(id => [id, element({ hidden: ['choice', 'report', 'dossier'].includes(id) })]));
  els.order.value = 'op';
  const dom = { opSourcePanel: element(), opCustoPanel: element({ hidden: true }),
    opCustoBtn: element(), opCustoHint: element(),
    dtOpStart: element({ value: '2026-10' }), dtOpEnd: element({ value: '2026-10' }),
    selOpMotivo: element({ value: 'paradas_operacionais' }), selOpProduto: element({ value: '001' }) };
  dom.opCustoPanel.querySelector = selector => els[selector.replace('#opc-', '')] || null;
  dom.opCustoPanel.querySelectorAll = () => [];
  const apiClient = apiOverride || { getOpCustoContext: vi.fn().mockResolvedValue({ data: context, error: null }) };
  const analyze = vi.fn(analyzeOpCustoContext);
  const costPriority = vi.fn(getOperationalPriority);
  const costComparator = vi.fn(compareByInvestigativePriority);
  const controller = createOpCustoController({ dom, apiClient, analyze, costPriority, costComparator });
  controller.bind();
  return { dom, els, controller, apiClient, analyze, costPriority, costComparator };
}

function text(el) { return `${el.textContent} ${el.innerHTML}`; }
function visible(el) { return !el.hidden && !el.classList.contains('hidden'); }
function rowCount(body) { return (body.innerHTML.match(/<tr\b[^>]*data-opc-code=/g) || []).length; }
async function include(h) { await h.els.include.emit('click'); }
async function openDossier(h, codigo) {
  await h.els.body.emit('click', { target: { closest: selector => selector.includes('data-opc-code')
    ? { dataset: { opcCode: codigo } } : null } });
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

describe('OP × CUSTO — competência explícita e carregamento', () => {
  beforeEach(() => { global.window = { scrollY: 81, scrollTo: vi.fn() }; });
  afterEach(() => { delete global.window; vi.restoreAllMocks(); });

  it.each([['', ''], ['2026-10', ''], ['2026-10', '2026-11'], ['2026-13', '2026-13']])(
    'não oferece ação mensal para De=%s Até=%s', async (de, ate) => {
      const h = setup(); h.dom.dtOpStart.value = de; h.dom.dtOpEnd.value = ate;
      await h.dom.dtOpStart.emit('change');
      expect(visible(h.dom.opCustoBtn)).toBe(false);
      expect(h.dom.opCustoBtn.disabled).toBe(true);
      await h.controller.open();
      expect(h.apiClient.getOpCustoContext).not.toHaveBeenCalled();
    });

  it('oferece somente o mês selecionado, explica multi-mês e não abre automaticamente', async () => {
    const h = setup();
    expect(visible(h.dom.opCustoBtn)).toBe(true);
    expect(text(h.dom.opCustoBtn)).toMatch(/OP × CUSTO.*Outubro\/2026/i);
    expect(h.apiClient.getOpCustoContext).not.toHaveBeenCalled();
    h.dom.dtOpEnd.value = '2026-11'; await h.dom.dtOpEnd.emit('change');
    expect(text(h.dom.opCustoHint)).toMatch(/múltiplos meses/i);
    expect(text(h.dom.opCustoHint)).toMatch(/De\s*=\s*Até/);
  });

  it('busca contexto mensal completo sem repassar filtros OP ao custo', async () => {
    const h = setup(); await h.controller.open();
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledExactlyOnceWith({ competencia: '2026-10' });
    expect(h.analyze).toHaveBeenCalled();
    expect(text(h.els.title)).toMatch(/Outubro\/2026/i);
    expect(visible(h.dom.opSourcePanel)).toBe(false);
    expect(visible(h.dom.opCustoPanel)).toBe(true);
  });

  it('mostra loading antes da resposta e não apresenta fila parcial', async () => {
    const request = deferred();
    const h = setup(undefined, { getOpCustoContext: vi.fn(() => request.promise) });
    const pending = h.controller.open();
    expect(text(h.els.status)).toMatch(/carregando|lendo/i);
    expect(visible(h.els.report)).toBe(false);
    request.resolve({ data: makeOpCustoContext(), error: null }); await pending;
    expect(visible(h.els.choice)).toBe(true);
  });

  it.each(['CONTAGEM_DIVERGENTE', 'LEITURA_INCOMPLETA', 'IDENTIDADE_REPETIDA', 'FONTE_OP_INDISPONIVEL']) (
    'erro %s bloqueia relatório e não aparece como fonte vazia', async code => {
      const h = setup(undefined, { getOpCustoContext: vi.fn().mockResolvedValue({ data: null,
        error: { code, message: 'Falha de integridade na leitura.' } }) });
      await h.controller.open();
      expect(text(h.els.status)).toMatch(/falha|erro|integridade|indisponível/i);
      expect(visible(h.els.report)).toBe(false);
      expect(h.els.overview.innerHTML).toBe('');
      expect(visible(h.els.choice)).toBe(false);
      expect(h.analyze).not.toHaveBeenCalled();
    });

  it('trata rejeição de transporte e contexto incompleto sem cobertura parcial', async () => {
    const apiClient = { getOpCustoContext: vi.fn().mockRejectedValue(new Error('Conexão interrompida')) };
    const h = setup(undefined, apiClient); await h.controller.open();
    expect(visible(h.els.report)).toBe(false);
    expect(text(h.els.status)).toMatch(/erro|falha|interrompida|indisponível/i);
    const partial = makeOpCustoContext(); partial.fontes.custos.contagem++;
    apiClient.getOpCustoContext.mockResolvedValue({ data: partial, error: null });
    await h.controller.reload();
    expect(visible(h.els.report)).toBe(false);
    expect(h.els.overview.innerHTML).toBe('');
  });
});

describe('OP × CUSTO — cobertura, inclusão e ausência', () => {
  it('overview usa engine completo e exige escolha explícita para A/B/C', async () => {
    const h = setup(); await h.controller.open();
    expect(visible(h.els.choice)).toBe(true);
    expect(visible(h.els.report)).toBe(false);
    expect(h.els.body.innerHTML).toBe('');
    expect(text(h.els.choice)).not.toMatch(/checked/);
    expect(text(h.els['choice-text'])).toMatch(/OP|Custo/i);
    expect(h.analyze.mock.results.at(-1).value.cobertura).toEqual({ ambos: 1, somenteOp: 1, somenteCusto: 1 });
    await include(h);
    expect(rowCount(h.els.body)).toBe(3);
    expect(h.els.body.innerHTML).toContain('001');
    expect(h.els.body.innerHTML).toContain('002');
    expect(h.els.body.innerHTML).toContain('003');
    expect(text(h.els.body)).toMatch(/OP ausente/);
    expect(text(h.els.body)).toMatch(/Custo ausente/);
  });

  it('somente A é escolha reversível e exclusões continuam explícitas', async () => {
    const h = setup(); await h.controller.open(); await h.els['only-both'].emit('click');
    expect(rowCount(h.els.body)).toBe(1);
    expect(h.els.body.innerHTML).toContain('001');
    expect(h.els.body.innerHTML).not.toContain('data-opc-code="002"');
    expect(visible(h.els['change-inclusion'])).toBe(true);
    await h.els['change-inclusion'].emit('click');
    expect(visible(h.els.choice)).toBe(true);
    expect(visible(h.els.report)).toBe(false);
    await include(h); expect(rowCount(h.els.body)).toBe(3);
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it.each(['op', 'custos'])('fonte %s vazia é diferente de indisponível e ainda pede inclusão', async fonte => {
    const context = makeOpCustoContext(fonte === 'op' ? { opEventos: [] } : { custoSnapshots: [] });
    const h = setup(context); await h.controller.open();
    expect(visible(h.els.choice)).toBe(true);
    expect(text(h.els.overview)).toMatch(/vazia|0 registros|0 eventos|0 snapshots/i);
    await include(h);
    expect(rowCount(h.els.body)).toBe(2);
    expect(text(h.els.body)).toMatch(fonte === 'op' ? /OP ausente/ : /Custo ausente/);
    expect(text(h.els.body)).not.toMatch(fonte === 'op' ? /OP\s*:\s*0/ : /Custo\s*:\s*R\$\s*0/);
  });

  it('ambas fontes vazias produz relatório vazio válido sem diálogo desnecessário', async () => {
    const h = setup(makeOpCustoContext({ opEventos: [], custoSnapshots: [] })); await h.controller.open();
    expect(visible(h.els.choice)).toBe(false);
    expect(visible(h.els.report)).toBe(true);
    expect(text(h.els.body)).toMatch(/nenhum|não há|sem produtos/i);
  });

  it('nenhum produto A após exclusão apresenta vazio com possibilidade de alterar inclusão', async () => {
    const h = setup(makeOpCustoContext({ custoSnapshots: [] })); await h.controller.open();
    await h.els['only-both'].emit('click');
    expect(rowCount(h.els.body)).toBe(0);
    expect(text(h.els.body)).toMatch(/nenhum|não há|sem produtos/i);
    expect(visible(h.els['change-inclusion'])).toBe(true);
  });

  it('registro não relacionável aparece em qualidade, sem código vazio na fila', async () => {
    const context = makeOpCustoContext({ opEventos: [makeOpEvent(), makeOpEvent({ id: 'inválido', cod_produto: '' })] });
    const h = setup(context); await h.controller.open(); await include(h);
    expect(text(h.els.quality)).toMatch(/não vincul|não relacion|inválid/i);
    expect(h.analyze.mock.results.at(-1).value.diagnosticos.opNaoVinculavel).toHaveLength(1);
    expect(h.els.body.innerHTML).not.toContain('data-opc-code=""');
  });

  it('A sem casos não correspondentes abre fila diretamente e sem prompt', async () => {
    const h = setup(makeOpCustoContext({ opEventos: [makeOpEvent()], custoSnapshots: makeCostSnapshots() }));
    await h.controller.open();
    expect(visible(h.els.choice)).toBe(false);
    expect(visible(h.els.report)).toBe(true);
    expect(rowCount(h.els.body)).toBe(1);
  });
});

describe('OP × CUSTO — relações, prioridades e dossiê', () => {
  it('apresenta rótulo/motivo do engine sem criar relação ou causalidade paralela', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    const product = h.analyze.mock.results.at(-1).value.produtos.find(p => p.cobertura === 'A');
    expect(h.els.body.innerHTML).toContain(product.relacao.rotulo);
    expect(h.els.body.innerHTML).toContain(product.relacao.motivos[0]);
    expect(h.els.body.innerHTML).not.toMatch(/paradas causaram|OP causou|causou o aumento/i);
    await openDossier(h, '001');
    expect(text(h.els['dossier-body'])).toContain(product.relacao.motivos[0]);
    expect(text(h.els['dossier-body'])).toMatch(/causalidade|não comprova causa/i);
  });

  it('prioridades originais permanecem separadas e presenter recebe saída de custo original', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    const input = h.analyze.mock.calls.at(-1)[0];
    expect(h.costPriority).toHaveBeenCalledWith(input.analisesCusto[0].resultadoOriginal);
    expect(input.analisesCusto[0].prioridadeOriginal).toEqual(getOperationalPriority(input.analisesCusto[0].resultadoOriginal));
    const p = h.analyze.mock.results.at(-1).value.produtos[0];
    expect(h.els.body.innerHTML).toContain(p.op.prioridadeOriginalObservada.decisao.rotulo);
    expect(h.els.body.innerHTML).toContain(p.custo.prioridadeOriginal.label);
    expect(text(h.els.body)).not.toMatch(/score global|prioridade global|ranking conjunto/i);
    h.els.order.value = 'custo'; await h.els.order.emit('change');
    expect(h.costComparator).toHaveBeenCalled();
  });

  it('dossiê conserva dois eventos/stágios e todos os snapshots com duas datas', async () => {
    const h = setup(); await h.controller.open(); await include(h); await openDossier(h, '001');
    expect(visible(h.els.dossier)).toBe(true);
    const html = text(h.els['dossier-body']);
    for (const label of ['op-1', 'op-2', 'MASSA', 'FORNO', 'CX', '001-c1', '001-c2']) expect(html).toContain(label);
    expect(html).toMatch(/05\/10\/2026|2026-10-05/);
    expect(html).toMatch(/14\/10\/2026|2026-10-14/);
    expect(html).toMatch(/importação|Importado/);
    expect(html).toMatch(/principal|referência/i);
    expect(html).toMatch(/consolidação|consolidado|consolidar/i);
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('dossiê mostra ausência como ausência e zero real como zero', async () => {
    const h = setup(makeOpCustoContext({ custoSnapshots: makeCostSnapshots('001', 100, 0) }));
    await h.controller.open(); await include(h); await openDossier(h, '002');
    expect(text(h.els['dossier-body'])).toMatch(/Custo ausente|Sem custo correspondente/i);
    expect(text(h.els['dossier-body'])).not.toMatch(/R\$\s*0,00/);
    await h.controller.searchProduct('001');
    expect(text(h.els['dossier-body'])).toMatch(/0,00/);
    const p = h.analyze.mock.results.at(-1).value.produtos.find(p => p.chave.codigoNormalizado === '001');
    expect(p.custo.referencia.valores.total).toBe(0);
  });

  it('D depende de consulta explícita local, preserva zeros e não faz outro GET', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    expect(h.analyze.mock.results.at(-1).value.produtos.some(p => p.cobertura === 'D')).toBe(false);
    await h.controller.searchProduct('004');
    expect(text(h.els['dossier-title'])).toContain('004');
    expect(text(h.els['dossier-body'])).toMatch(/OP ausente|Sem apontamento OP/i);
    expect(text(h.els['dossier-body'])).toMatch(/Custo ausente|Sem custo correspondente/i);
    expect(h.analyze.mock.results.at(-1).value.produtos.find(p => p.chave.codigoNormalizado === '004').cobertura).toBe('D');
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('busca explícita recusa código inválido sem criar D artificial nem nova consulta', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    await h.controller.searchProduct('-12');
    expect(text(h.els.status)).toMatch(/código.*válido/i);
    expect(visible(h.els.dossier)).toBe(false);
    expect(h.analyze.mock.results.at(-1).value.produtos).toHaveLength(3);
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('empate de custo conserva os candidatos e informa ambiguidade sem referência inventada', async () => {
    const costs = makeCostSnapshots(); costs[1].criado_em = costs[0].criado_em;
    const h = setup(makeOpCustoContext({ opEventos: [makeOpEvent()], custoSnapshots: costs }));
    await h.controller.open(); await openDossier(h, '001');
    const p = h.analyze.mock.results.at(-1).value.produtos[0];
    expect(p.custo.referencia.estado).toBe('ambigua');
    expect(text(h.els['dossier-body'])).toMatch(/ambígua/i);
    expect(text(h.els['dossier-body'])).toContain('001-c1');
    expect(text(h.els['dossier-body'])).toContain('001-c2');
    expect(text(h.els['dossier-body'])).toContain('Candidato à referência');
    expect(text(h.els['dossier-body'])).not.toContain('Referência principal');
    expect(text(h.els['dossier-body'])).toContain(p.relacao.rotulo);
  });

  it('custo ausente em snapshot existente permanece não informado, sem falso zero ou estabilidade', async () => {
    const costs = makeCostSnapshots(); costs[1].custo_total = null;
    const h = setup(makeOpCustoContext({ opEventos: [makeOpEvent()], custoSnapshots: costs }));
    await h.controller.open();
    const p = h.analyze.mock.results.at(-1).value.produtos[0];
    expect(p.custo.referencia.valores.total).toBeNull();
    expect(text(h.els.body)).toMatch(/Não informado/);
    expect(text(h.els.body)).not.toMatch(/R\$\s*0,00/);
    expect(text(h.els.body)).toContain(p.relacao.rotulo);
    await openDossier(h, '001');
    expect(text(h.els['dossier-body'])).toMatch(/custo_total.*ausente|ausente.*custo_total/i);
  });

  it('escapa descrições/identificadores ERP em fila e dossiê', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    const context = makeOpCustoContext({ opEventos: [makeOpEvent({ descricao: payload, estagio: '<script>ruim()</script>' })],
      custoSnapshots: makeCostSnapshots().map(s => ({ ...s, descricao: payload })) });
    const h = setup(context); await h.controller.open(); await openDossier(h, '001');
    const html = h.els.body.innerHTML + h.els['dossier-body'].innerHTML;
    expect(html).not.toContain(payload);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('OP × CUSTO — universo integral, filtros e navegação', () => {
  it('1.201 produtos chegam ao engine; paginação visual não limita contexto/TOP-200', async () => {
    const ops = Array.from({ length: 1201 }, (_, i) => makeOpEvent({ id: `op-${i}`, cod_produto: String(10000 + i) }));
    const h = setup(makeOpCustoContext({ opEventos: ops, custoSnapshots: [] }));
    await h.controller.open(); await include(h);
    expect(h.analyze.mock.calls[0][0].contexto.opEventos).toHaveLength(1201);
    expect(h.analyze.mock.results.at(-1).value.cobertura.somenteOp).toBe(1201);
    expect(rowCount(h.els.body)).toBe(50);
    expect(text(h.els.page)).toContain('1201');
    for (let i = 0; i < 24; i++) await h.els.next.emit('click');
    expect(rowCount(h.els.body)).toBe(1);
    expect(h.els.body.innerHTML).toContain('11200');
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('busca e cobertura são filtros locais explícitos, sem aplicar filtros OP', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    h.els.coverage.value = 'C'; await h.els.coverage.emit('change');
    expect(rowCount(h.els.body)).toBe(1);
    expect(h.els.body.innerHTML).toContain('003');
    h.els.search.value = 'inexistente'; await h.els.search.emit('input');
    expect(rowCount(h.els.body)).toBe(0);
    expect(text(h.els.body)).toMatch(/nenhum|não há|sem produtos/i);
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('1.001 produtos A preservam eventos e snapshots fora da janela visual', async () => {
    const ops = Array.from({ length: 1001 }, (_, i) => makeOpEvent({ id: `op-${i}`, cod_produto: String(20000 + i) }));
    const costs = ops.flatMap(op => makeCostSnapshots(op.cod_produto));
    const h = setup(makeOpCustoContext({ opEventos: ops, custoSnapshots: costs }));
    await h.controller.open();
    expect(h.analyze.mock.calls[0][0].contexto.custoSnapshots).toHaveLength(2002);
    expect(h.analyze.mock.results.at(-1).value.cobertura.ambos).toBe(1001);
    expect(rowCount(h.els.body)).toBe(50);
    await h.controller.searchProduct('21000');
    expect(text(h.els['dossier-body'])).toContain('op-1000');
    expect(text(h.els['dossier-body'])).toContain('21000-c1');
    expect(text(h.els['dossier-body'])).toContain('21000-c2');
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(1);
  });

  it('voltar do dossiê mantém busca/fila e voltar a OP conserva campos, motivo e posição', async () => {
    const h = setup(); h.dom.opSourcePanel.scrollTop = 212;
    await h.controller.open(); await include(h);
    h.els.search.value = '001'; await h.els.search.emit('input');
    await openDossier(h, '001'); await h.els['dossier-back'].emit('click');
    expect(h.els.search.value).toBe('001');
    expect(rowCount(h.els.body)).toBe(1);
    await h.controller.close();
    expect(visible(h.dom.opSourcePanel)).toBe(true);
    expect(visible(h.dom.opCustoPanel)).toBe(false);
    expect(h.dom.dtOpStart.value).toBe('2026-10');
    expect(h.dom.dtOpEnd.value).toBe('2026-10');
    expect(h.dom.selOpMotivo.value).toBe('paradas_operacionais');
    expect(h.dom.selOpProduto.value).toBe('001');
    expect(h.dom.opSourcePanel.scrollTop).toBe(212);
  });

  it('recarregar obtém novo contexto e pede novamente inclusão dos não correspondentes', async () => {
    const h = setup(); await h.controller.open(); await include(h);
    await h.controller.reload();
    expect(h.apiClient.getOpCustoContext).toHaveBeenCalledTimes(2);
    expect(visible(h.els.choice)).toBe(true);
    expect(visible(h.els.report)).toBe(false);
  });

  it('resposta tardia após voltar não reabre relatório nem substitui estado', async () => {
    const request = deferred(); const h = setup(undefined, { getOpCustoContext: vi.fn(() => request.promise) });
    const pending = h.controller.open(); await h.controller.close();
    request.resolve({ data: makeOpCustoContext(), error: null }); await pending;
    expect(visible(h.dom.opSourcePanel)).toBe(true);
    expect(visible(h.dom.opCustoPanel)).toBe(false);
    expect(h.els.overview.innerHTML).toBe('');
    expect(h.analyze).not.toHaveBeenCalled();
  });

  it('mudança de competência invalida leitura pendente e conserva a nova escolha em OP', async () => {
    const request = deferred(); const h = setup(undefined, { getOpCustoContext: vi.fn(() => request.promise) });
    const pending = h.controller.open();
    h.dom.dtOpStart.value = '2026-11'; h.dom.dtOpEnd.value = '2026-11';
    await h.dom.dtOpStart.emit('change');
    request.resolve({ data: makeOpCustoContext(), error: null }); await pending;
    expect(h.dom.dtOpStart.value).toBe('2026-11');
    expect(h.dom.dtOpEnd.value).toBe('2026-11');
    expect(visible(h.dom.opSourcePanel)).toBe(true);
    expect(visible(h.dom.opCustoPanel)).toBe(false);
    expect(h.analyze).not.toHaveBeenCalled();
    expect(text(h.dom.opCustoBtn)).toMatch(/Novembro\/2026/i);
  });

  it('recarregamento mais recente vence resposta anterior e não replica interpretações', async () => {
    const first = deferred(); const last = deferred();
    const apiClient = { getOpCustoContext: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise) };
    const h = setup(undefined, apiClient);
    const oldOpen = h.controller.open(); const newReload = h.controller.reload();
    last.resolve({ data: makeOpCustoContext({ opEventos: [], custoSnapshots: [] }), error: null }); await newReload;
    expect(visible(h.els.report)).toBe(true);
    expect(visible(h.els.choice)).toBe(false);
    first.resolve({ data: makeOpCustoContext(), error: null }); await oldOpen;
    expect(visible(h.els.choice)).toBe(false);
    expect(h.analyze).toHaveBeenCalledTimes(1);
    expect(h.analyze.mock.results.at(-1).value.cobertura).toEqual({ ambos: 0, somenteOp: 0, somenteCusto: 0 });
  });
});
