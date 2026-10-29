import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): api e parser mockados — sem runtime real.
vi.mock('../src/services/api.js', () => ({
  api: { importarApontamentosOp: vi.fn() }
}));
vi.mock('../core/spreadsheet-engine.js', () => ({
  parseMCAP105: vi.fn(() => ({ rows: [], errors: [] }))
}));

import { createImportOpController } from '../view/ui-import-op.js';
import { api } from '../src/services/api.js';
import { parseMCAP105 } from '../core/spreadsheet-engine.js';

function fakeEl(extra = {}) {
  const listeners = {};
  return {
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    async emit(ev, arg) { for (const fn of (listeners[ev] || [])) await fn(arg); },
    classList: { add() {}, remove() {} },
    ...extra
  };
}

function setup(file, onImported = vi.fn()) {
  const input = fakeEl({ files: [file], value: '', click: vi.fn() });
  const dom = { importOpInput: input, dropZoneOp: fakeEl() };
  const executeOperationalBoundary = async (_op, action) => action();
  const { bindUpload } = createImportOpController({ dom, executeOperationalBoundary, onImported });
  bindUpload();
  return { input, dropZone: dom.dropZoneOp, onImported };
}

describe('createImportOpController — validação de extensão (case-insensitive)', () => {
  const line = op => `200,${op},MB001,PRODUÇÃO AÇÚCAR,12,BISCOITO,100,90,KG,10,12,10,7,-30,2,3`;
  const result = (extra = {}) => ({ data: { inseridos: 1, erros: [], logId: 10, estado: 'concluido', logFinalizado: true,
    resumo: { total_linhas: 1, linhas_validas: 1, linhas_rejeitadas: 0, linhas_enviadas: 1, linhas_importadas: 1,
      linhas_falha_operacional: 0, linhas_indeterminadas: 0, linhas_nao_enviadas: 0, linhas_erro: 0 }, ...extra }, error: null });
  let readSpy;
  beforeEach(async () => {
    vi.resetAllMocks();
    parseMCAP105.mockImplementation((await vi.importActual('../core/spreadsheet-engine.js')).parseMCAP105);
    api.importarApontamentosOp.mockResolvedValue(result());
    readSpy = vi.fn();
    // FileReader mínimo: resolve o conteúdo lido para lerArquivoLatin1.
    global.FileReader = class {
      readAsText(file, encoding) { readSpy(encoding); this.result = file.content ?? 'conteudo'; this.onload?.(); }
    };
    global.Swal = { fire: vi.fn().mockResolvedValue({ isConfirmed: false }) };
  });

  afterEach(() => { delete global.FileReader; delete global.Swal; });

  it('recusa arquivo sem extensão .csv sem tentar parsear', async () => {
    const { input } = setup({ name: 'relatorio.txt' });
    await input.emit('change');
    expect(parseMCAP105).not.toHaveBeenCalled();
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('warning', ...)
  });



  it('envia linhas válidas com a competência selecionada para a API', async () => {
    const rows = [{ origem: 425, op: 738, cod_produto: '1001056', descricao: 'Produto A', estagio: 'BISCOITO' }];
    parseMCAP105.mockReturnValue({ rows, errors: [], origens: [4] });
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });

    const { input, onImported } = setup({ name: 'MCAP105.CSV' });
    await input.emit('change');

    expect(api.importarApontamentosOp).toHaveBeenCalledWith({
      rows,
      dataReferencia: '2026-07-01',
      arquivoNome: 'MCAP105.CSV', origens: [4], errosLeitura: []
    });
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
    expect(onImported).toHaveBeenCalledOnce();
  });

  it('aceita extensão em maiúsculas (.CSV) e segue para o parse', async () => {
    const { input } = setup({ name: 'RELATORIO.CSV' });
    await input.emit('change');
    // O gate de extensão passou: o parser foi chamado com o conteúdo lido.
    expect(parseMCAP105).toHaveBeenCalledWith('conteudo');
  });

  it('preview e API preservam somente válidos e erros com linha física/encoding', async () => {
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    const file = { name: 'MCAP105.CSV', content: ['Título', line('2.081'), '', line('ABC'), line('2082')].join('\r\n') };
    const { input } = setup(file);
    await input.emit('change');
    const request = api.importarApontamentosOp.mock.calls[0][0];
    expect(request.rows.map(r => r.op)).toEqual([2081, 2082]);
    expect(request.origens).toEqual([2, 5]);
    expect(request.errosLeitura[0]).toMatchObject({ linha: 4, campo: 'op', valorOriginal: 'ABC' });
    const html = global.Swal.fire.mock.calls[0][0].html;
    expect(html).toContain('lidas: <b>3</b>'); expect(html).toContain('Válidas: <b>2</b>');
    expect(html).toContain('Linha 4'); expect(html).toContain('ABC');
    expect(readSpy).toHaveBeenCalledWith('ISO-8859-1');
  });

  it('arquivo totalmente inválido mostra todas as rejeições sem API nem log', async () => {
    const { input, onImported } = setup({ name: 'mcap.csv', content: [line('ABC'), line(''), line('2..081')].join('\n') });
    await input.emit('change');
    expect(api.importarApontamentosOp).not.toHaveBeenCalled(); expect(onImported).not.toHaveBeenCalled();
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arquivo rejeitado por validação', html: expect.stringContaining('Rejeitadas por validação: <b>3</b>') }));
  });

  it('escapa o valor original no diagnóstico', async () => {
    const { input } = setup({ name: 'mcap.csv', content: line('<script>alert(1)</script>') });
    await input.emit('change');
    const html = global.Swal.fire.mock.calls[0][0].html;
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
  });

  it('cancelamento não cria execução e não impede confirmação posterior', async () => {
    const { input } = setup({ name: 'mcap.csv', content: line('2081') });
    await input.emit('change'); expect(api.importarApontamentosOp).not.toHaveBeenCalled();
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    await input.emit('change'); expect(api.importarApontamentosOp).toHaveBeenCalledOnce();
  });

  it('arquivo vazio não importa', async () => {
    const { input } = setup({ name: 'mcap.csv', content: 'Título\r\n\r\n' });
    await input.emit('change'); expect(api.importarApontamentosOp).not.toHaveBeenCalled();
  });

  it('duplo clique/change e drop simultâneos compartilham a trava do controller', async () => {
    let finish;
    api.importarApontamentosOp.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    const file = { name: 'mcap.csv', content: line('2081') };
    const { input, dropZone } = setup(file);
    const first = input.emit('change');
    await vi.waitFor(() => expect(api.importarApontamentosOp).toHaveBeenCalledOnce());
    await Promise.all([input.emit('change'), dropZone.emit('drop', { preventDefault() {}, dataTransfer: { files: [file] } })]);
    expect(api.importarApontamentosOp).toHaveBeenCalledOnce();
    finish(result()); await first;
  });

  it.each(['concluido', 'parcial', 'erro', 'indeterminado'])('retry local do resultado %s reapresenta a tentativa sem duplicar INSERT', async estado => {
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    api.importarApontamentosOp.mockResolvedValue(result({ estado, logFinalizado: estado !== 'indeterminado' }));
    const { input } = setup({ name: 'mcap.csv', content: line('2081') });
    await input.emit('change'); await input.emit('change');
    expect(api.importarApontamentosOp).toHaveBeenCalledOnce();
  });

  it('exceção sem resposta bloqueia reenvio da mesma tentativa', async () => {
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    api.importarApontamentosOp.mockRejectedValue(new Error('resposta perdida'));
    const { input } = setup({ name: 'mcap.csv', content: line('2081') });
    await expect(input.emit('change')).rejects.toThrow('resposta perdida');
    await input.emit('change'); expect(api.importarApontamentosOp).toHaveBeenCalledOnce();
  });

  it('falha da consulta após persistência não repete a importação', async () => {
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    const { input } = setup({ name: 'mcap.csv', content: line('2081') }, vi.fn().mockRejectedValue(new Error('consulta')));
    await input.emit('change'); await input.emit('change');
    expect(api.importarApontamentosOp).toHaveBeenCalledOnce();
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('Persistidas confirmadas: 1') }));
  });

  it('mostra contadores de validação, falha de fato e falha de log separadamente', async () => {
    global.Swal.fire.mockResolvedValue({ isConfirmed: true, value: '2026-07-01' });
    api.importarApontamentosOp.mockResolvedValue(result({ estado: 'parcial', logFinalizado: false, logError: 'falhou',
      erros: [{ tipo: 'operacional', etapa: 'log', mensagem: 'Fechamento não confirmado' }],
      resumo: { total_linhas: 100, linhas_validas: 97, linhas_rejeitadas: 3, linhas_enviadas: 97, linhas_importadas: 60,
        linhas_falha_operacional: 37, linhas_indeterminadas: 0, linhas_nao_enviadas: 0, linhas_erro: 40 } }));
    const { input } = setup({ name: 'mcap.csv', content: line('2081') });
    await input.emit('change');
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'warning', html: expect.stringContaining('Falhas operacionais de fatos: 37') }));
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('fechamento não confirmado') }));
  });
});
