import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../sql/20261008184501_fase3_4_execucao_cadastro_mestre.sql', import.meta.url), 'utf8');
const patches = JSON.parse(sql.match(/\$payload\$([\s\S]*?)\$payload\$/)[1]);
const metadata = JSON.parse(sql.match(/\$metadata\$([\s\S]*?)\$metadata\$/)[1]);
const novos = patches.filter(p => p.novo);
const existentes = patches.filter(p => !p.novo);

describe('CAD-EXEC-01: contrato da carga pontual Fase 3.4', () => {
  it('consolida 423 propostas em 415 produtos, sem perder os oito patches duplos', () => {
    expect(patches).toHaveLength(415);
    expect(new Set(patches.map(p => p.codigo_produto)).size).toBe(415);
    expect(novos).toHaveLength(103);
    expect(existentes).toHaveLength(312);
    expect(existentes.filter(p => Object.hasOwn(p.dados, 'descricao'))).toHaveLength(11);
    expect(existentes.filter(p => Object.hasOwn(p.dados, 'agrupamento_erp_valor'))).toHaveLength(309);
    expect(existentes.filter(p => Object.hasOwn(p.dados, 'descricao') && Object.hasOwn(p.dados, 'agrupamento_erp_valor'))).toHaveLength(8);
  });
  it('mantem valores ERP e agrupamentos dos novos, sem conversao Pxxx para Mxxx', () => {
    expect(novos.filter(p => Object.hasOwn(p.dados, 'agrupamento_erp_valor'))).toHaveLength(33);
    const agrupamentos = patches.filter(p => Object.hasOwn(p.dados, 'agrupamento_erp_valor'));
    expect(agrupamentos).toHaveLength(342);
    expect(agrupamentos.every(p => ['P005', 'P302', 'P801'].includes(p.dados.agrupamento_erp_valor))).toBe(true);
    expect(novos.every(p => p.dados.codigo_produto === p.codigo_produto && p.antes === null)).toBe(true);
  });
  it('nao propoe NULLs, familia/origem de existentes ou campos operacionais', () => {
    for (const p of patches) {
      expect(Object.values(p.dados).every(v => typeof v === 'string' && v.trim() !== '')).toBe(true);
      const permitidos = p.novo ? ['codigo_produto', 'descricao', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'] : ['descricao', 'agrupamento_erp_valor'];
      expect(Object.keys(p.dados).every(k => permitidos.includes(k))).toBe(true);
    }
    expect(existentes.every(p => p.antes.codigo_produto === p.codigo_produto)).toBe(true);
    expect(patches.some(p => p.codigo_produto === '000001')).toBe(false);
  });
  it('permite DML apenas no Master e no log, sem schema, RPC ou DELETE', () => {
    const alvos = [...sql.matchAll(/^\s*(?:insert into|update)\s+(public\.\w+)/gim)].map(m => m[1]);
    expect(new Set(alvos)).toEqual(new Set(['public.dicionario_master_produtos', 'public.log_importacao_cadastro_mestre']));
    expect(sql).not.toMatch(/^\s*(?:delete|create|alter|drop|grant|revoke|truncate|call)\b/gim);
    expect(sql).not.toMatch(/\.rpc\s*\(/);
  });
  it('revalida antes do primeiro INSERT e bloqueia repeticao/concorrencia', () => {
    expect(sql.indexOf('v_quantidade <> 5603')).toBeLessThan(sql.indexOf('insert into public.log_importacao_cadastro_mestre'));
    expect(sql).toContain('or exists(select 1 from public.log_importacao_cadastro_mestre)');
    expect(sql).toContain('to_jsonb(d) is distinct from p->\'antes\'');
    expect(sql).toContain('in exclusive mode nowait');
    expect(sql).toContain("set local lock_timeout = '3s'");
    expect(sql).toContain("set local statement_timeout = '30s'");
  });
  it('valida imagem integral por EXCEPT bidirecional e registra falha sem Master parcial', () => {
    expect(sql).toContain('except select to_jsonb(d) from public.dicionario_master_produtos d');
    expect(sql).toContain('except select value from jsonb_array_elements(v_esperado)');
    expect(sql).toContain('v_faltantes <> 0 or v_excedentes <> 0');
    expect(sql).toContain('v_protegidas_depois is distinct from v_protegidas_antes');
    expect(sql).toContain('exception when others then');
    expect(sql).toContain("set status='falhou'");
    expect(sql).toContain("'master_revertido_pela_subtransacao',true");
  });
  it('usa ID retornado pelo log e vincula somente escritas efetivas', () => {
    expect(sql).toContain('returning id into v_id');
    expect(sql).toContain('ultima_importacao_cadastro_mestre_id = v_id');
    expect(sql).toContain("case when p->'dados' ? 'agrupamento_erp_valor' then v_id else null end");
    expect(metadata.propostas_autorizadas).toBe(423);
    expect(metadata.sem_reconciliacao_operacional).toBe(true);
    expect(metadata.hash_arquivo_sha256).toBe('ea5092e92e9b843f341545837f6618998072dc2c533cc837d1807ce7f69ef6da');
    expect(metadata.hash_contexto_sha256).toBe('c2660e76d861b7ad56484f16ffe152e214585abfaf4866e46681de11f3aacd18');
    expect(metadata.protegidas_antes.dicionario_produtos.registros).toBe(6113);
    expect(metadata.protegidas_antes.historico_custos.registros).toBe(1370);
    expect(metadata.protegidas_antes.apontamentos_op.registros).toBe(704);
  });
});
