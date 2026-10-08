import { describe, expect, it, vi } from 'vitest';
import { previewArquivoCadastroMestre, prepararAprovacaoArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { decidirOperacoesCadastroMestre, obterOperacoesAprovadasCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { arquivoCadastro, contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';

describe('Cadastro Mestre — mesmos contratos em XLS, XLSX e XLSM', () => {
  it.each(['xls', 'xlsx', 'xlsm'])('%s aplica filtros, normalização, comparação e preservação antes da aprovação', async formato => {
    const file = arquivoCadastro(formato, formato.toUpperCase());
    if (formato === 'xls') {
      // Compound File Binary/BIFF: XLS verdadeiro, não XLSX renomeado.
      expect([...new Uint8Array(await file.arrayBuffer()).slice(0, 8)]).toEqual([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    }
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Rede proibida'); });
    const original = JSON.stringify(contexto);
    try {
      const preview = await previewArquivoCadastroMestre(file, contexto, SheetJS);
      expect(preview.resumo).toMatchObject({ linhas_lidas: 8, linhas_apos_filtros: 4, linhas_excluidas: 4,
        produtos_com_preview: 4, produtos_existentes: 3, novos_produtos: 1, produtos_com_alteracoes: 1,
        alteracoes_potenciais: 2, produtos_ausentes: 1, campos_vazios: 4, erros: 0 });
      expect(preview.produtos.map(p => p.codigo_produto)).toEqual(['001', '002', '008', '1000']);
      expect(preview.produtos[0].calculado).toMatchObject({ descricao: 'Descrição atualizada çã', origem_cod: '01', agrupamento_erp_valor: 'P801' });
      expect(preview.produtos[1].calculado).toEqual(contexto.produtos[1]);
      expect(preview.ausentes[0]).toMatchObject({ codigo_produto: '009', decisao_proposta: 'PRESERVAR_MASTER' });
      expect(preview.excluidos.map(p => [p.codigo_produto, p.motivo, p.preserva_master])).toEqual([
        ['003', 'TIPO_NAO_AUTORIZADO', true], ['004', 'ORIGEM_NAO_AUTORIZADA', true],
        ['005', 'DESCRICAO_EXCLUIDA', true], ['006', 'DESCRICAO_EXCLUIDA', true]
      ]);
      const { manifesto, revisao } = await prepararAprovacaoArquivoCadastroMestre(file, contexto, SheetJS);
      expect(manifesto.resumo).toMatchObject({ operacoes_propostas: 3, inserts_propostos: 1, updates_propostos: 2,
        produtos_fora_conjunto_preservados: 5, existentes_sem_operacao: 2 });
      expect(manifesto.preservados.map(p => p.codigo_produto)).toEqual(['003', '004', '005', '006', '009']);
      expect(manifesto.operacoes.every(o => o.tabela === 'dicionario_master_produtos')).toBe(true);
      expect(manifesto.operacoes.find(o => o.acao === 'INSERT').dados).toMatchObject({ codigo_produto: '1000', agrupamento_erp_valor: 'P302' });
      expect(revisao.decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
      const decisao = decidirOperacoesCadastroMestre(manifesto, revisao, manifesto.operacoes.map(o => o.id), 'APROVADO');
      const aprovado = obterOperacoesAprovadasCadastroMestre(manifesto, decisao);
      expect(aprovado.operacoes).toHaveLength(3);
      expect(aprovado.execucao_permitida).toBe(false);
      expect(network).not.toHaveBeenCalled();
      expect(JSON.stringify(contexto)).toBe(original);
    } finally { network.mockRestore(); }
  });

  it('XLS produz o mesmo Preview e operações de XLSX/XLSM, exceto metadados de arquivo', async () => {
    const results = await Promise.all(['xls', 'xlsx', 'xlsm'].map(f => prepararAprovacaoArquivoCadastroMestre(arquivoCadastro(f), contexto, SheetJS)));
    const { fonte: _fonte, ...base } = results[0].manifesto;
    for (const result of results.slice(1)) {
      const { fonte: _outraFonte, ...dados } = result.manifesto;
      expect(dados).toEqual(base);
    }
  });
});
