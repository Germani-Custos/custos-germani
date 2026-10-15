import { describe, expect, it } from 'vitest';
import { prepararConsultaCadastroMestreErp, consultarCadastroMestreErp } from '../core/cadastro-mestre-erp-engine.js';

const contexto = {
  produtos: [
    { codigo_produto: '000003', descricao: 'Café torrado', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P801', agrupamento_cod: 'M999' },
    { codigo_produto: '000001', descricao: 'Biscoito de chocolate', origem_cod: '02', familia_cod: 'F2', agrupamento_erp_valor: null, agrupamento_cod: 'M888' },
    { codigo_produto: '000002', descricao: 'Café solúvel', origem_cod: '01', familia_cod: 'F2', agrupamento_erp_valor: 'P302' }
  ],
  origens: [{ id: 'uuid-origem-1', codigo: '01', descricao: 'Produzido' }, { id: 'uuid-origem-2', codigo: '02', descricao: 'Revenda' }],
  familias: [{ id: 'uuid-familia-1', codigo: 'F1', descricao: 'Café' }, { id: 'uuid-familia-2', codigo: 'F2', descricao: 'Alimentos' }]
};

describe('Consulta pura do Master ERP, sem regras operacionais', () => {
  it('ordena por código e resolve descrições exclusivamente por código ERP', () => {
    const antes = globalThis.structuredClone(contexto);
    const data = prepararConsultaCadastroMestreErp(contexto);
    expect(data.produtos.map(p => p.codigo_produto)).toEqual(['000001', '000002', '000003']);
    expect(data.produtos[2]).toMatchObject({ origem: { codigo: '01', label: '01 — Produzido' }, familia: { codigo: 'F1', label: 'F1 — Café' }, agrupamento_erp_valor: 'P801' });
    expect(JSON.stringify(data)).not.toMatch(/M999|M888|uuid-/);
    expect(data.produtos[0].agrupamento_erp_valor).toBeNull();
    expect(contexto).toEqual(antes);
  });

  it.each([
    [{ busca: '000002' }, ['000002']],
    [{ busca: 'CAFE' }, ['000002', '000003']],
    [{ origem: '02' }, ['000001']],
    [{ familia: 'F1' }, ['000003']],
    [{ origem: '01', familia: 'F2', busca: 'café' }, ['000002']],
    [{ origem: 'uuid-origem-1' }, []],
    [{ busca: 'inexistente' }, []]
  ])('busca/filtros combinados %j', (filtros, esperados) => {
    const result = consultarCadastroMestreErp(prepararConsultaCadastroMestreErp(contexto).produtos, filtros);
    expect(result.produtos.map(p => p.codigo_produto)).toEqual(esperados);
    expect(result.total).toBe(esperados.length);
  });

  it('não resolve por id, descrição, código sem zeros ou primeira correspondência ambígua', () => {
    const data = prepararConsultaCadastroMestreErp({ ...contexto, produtos: [
      { codigo_produto: '1', origem_cod: 'uuid-origem-1', familia_cod: 'Café' },
      { codigo_produto: '2', origem_cod: '1', familia_cod: null },
      { codigo_produto: '3', origem_cod: ' 01 ', familia_cod: 'F1' }
    ], origens: [...contexto.origens, { id: 'outro', codigo: '01', descricao: 'Outra origem' }] });
    expect(data.produtos[0].origem.label).toBe('uuid-origem-1 — Sem correspondência no catálogo');
    expect(data.produtos[0].familia.label).toBe('Café — Sem correspondência no catálogo');
    expect(data.produtos[1].origem.label).toBe('1 — Sem correspondência no catálogo');
    expect(data.produtos[1].familia.label).toBe('Não informada');
    expect(data.produtos[2].origem.label).toBe('01 — Código ambíguo');
    expect(data.origens.map(o => o.value)).toContain('01');
  });

  it.each([0, 50, 860, 1001, 2501])('%i registros: total dinâmico e página final de 50, sem teto de 860', total => {
    const produtos = prepararConsultaCadastroMestreErp({ ...contexto, produtos: Array.from({ length: total }, (_, i) => ({ codigo_produto: String(i).padStart(6, '0') })) }).produtos;
    const first = consultarCadastroMestreErp(produtos);
    expect(first.total).toBe(total);
    expect(first.produtos).toHaveLength(Math.min(50, total));
    const last = consultarCadastroMestreErp(produtos, {}, 999999);
    expect(last.pagina).toBe(Math.max(1, Math.ceil(total / 50)));
    expect(last.fim).toBe(total);
    expect(last.produtos.length).toBe(total ? (total % 50 || 50) : 0);
    expect(consultarCadastroMestreErp(produtos, { busca: 'nada' }, 99)).toMatchObject({ total: 0, inicio: 0, fim: 0, pagina: 1, paginas: 1 });
  });

  it('contexto incompleto e identidades duplicadas são falhas, não consulta vazia', () => {
    expect(() => prepararConsultaCadastroMestreErp(null)).toThrow(/contexto/);
    expect(() => prepararConsultaCadastroMestreErp({ ...contexto, produtos: [{ codigo_produto: '1' }, { codigo_produto: ' 1 ' }] })).toThrow(/duplicado/);
  });
});
