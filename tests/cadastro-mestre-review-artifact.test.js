import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { gerarCanvasRevisaoCadastroMestre } from '../scripts/cadastro-mestre-review-artifact.mjs';
import { criarManifestoCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';

const ts = createRequire(import.meta.url)('typescript');
const core = readFileSync(new URL('../core/cadastro-mestre-approval-engine.js', import.meta.url), 'utf8');
const contexto = { produtos: [{ codigo_produto: '1', descricao: 'Atual', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: null }], origens: [{ codigo: '01' }], familias: [{ codigo: 'F1' }] };
const linhas = ['1', '2'].map(codigo_produto => ({ codigo_produto, descricao: 'Nova', origem_cod: '01', familia_cod: 'F1', tipo: 'P', descr_origem: 'Produzido', agrupamento_erp_valor: 'P005' }));
const manifesto = criarManifestoCadastroMestre(linhas, contexto, { hash_arquivo_sha256: 'arquivo', hash_contexto_sha256: 'contexto' });

function ambienteSintetico() {
  const source = gerarCanvasRevisaoCadastroMestre({ manifesto }, core);
  const result = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  expect(result.diagnostics).toEqual([]);
  const states = new Map();
  const sdk = Object.fromEntries(['Button','Grid','H1','H2','Row','Stack','Stat','Table','Text'].map(key => [key,key]));
  sdk.useCanvasState = (key, initial) => { if (!states.has(key)) states.set(key, initial); return [states.get(key), value => states.set(key, value)]; };
  sdk.useHostTheme = () => ({ text: { primary: 'text' }, bg: { editor: 'bg', elevated: 'elevated' }, stroke: { primary: 'border' } });
  const element = (type, props) => ({ type, props });
  const module = { exports: {} };
  runInNewContext(result.outputText, { exports: module.exports, require: name => {
    if (name === 'cursor/canvas') return sdk;
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    throw new Error('Import proibido: ' + name);
  } });
  const render = () => module.exports.default();
  const all = value => {
    if (!value || typeof value !== 'object') return [];
    if (Array.isArray(value)) return value.flatMap(all);
    return [value, ...all(value.props?.children), ...all(value.props?.rows)];
  };
  const click = label => { const button = all(render()).find(v => v.type === 'Button' && v.props.children === label); expect(button).toBeTruthy(); button.props.onClick(); };
  const revisao = () => states.get('revisao-arquivo-contexto');
  return { source, states, render, all, click, revisao };
}

describe('Relatório de revisão isolado do runtime', () => {
  it('não contém acesso a rede/banco nem execução de importação', () => {
    const { source, revisao } = ambienteSintetico();
    expect(source).not.toMatch(/\bfetch\s*\(|supabase\.|\.rpc\s*\(|\.upsert\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(/);
    // Renderizar prepara estado PENDENTE, não aprova dados.
    const runtime = ambienteSintetico(); runtime.render();
    expect(runtime.revisao().decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
    expect(revisao()).toBeUndefined();
  });
  it('aprovar/rejeitar todos afeta apenas estado local de fixture sintética', () => {
    const ui = ambienteSintetico();
    ui.click('Aprovar todas as propostas');
    expect(ui.revisao().decisoes.every(d => d.status === 'APROVADO')).toBe(true);
    ui.click('Rejeitar todas as propostas');
    expect(ui.revisao().decisoes.every(d => d.status === 'REJEITADO')).toBe(true);
    ui.click('Voltar todas para pendente');
    expect(ui.revisao().decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
  });
  it('detalhes e decisão individual mantêm outras operações pendentes', () => {
    const ui = ambienteSintetico();
    ui.click('Detalhes');
    expect(ui.all(ui.render()).some(v => v.type === 'Table' && v.props.headers[0] === 'Campo')).toBe(true);
    ui.click('Aprovar esta operação');
    expect(ui.revisao().decisoes.filter(d => d.status === 'APROVADO')).toHaveLength(1);
    ui.click('Rejeitar esta operação');
    expect(ui.revisao().decisoes.filter(d => d.status === 'REJEITADO')).toHaveLength(1);
    expect(ui.revisao().decisoes.filter(d => d.status === 'PENDENTE')).toHaveLength(2);
  });
});
