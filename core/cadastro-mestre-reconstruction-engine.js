// @ts-check
/* Plano puro: o universo é indivisível. Não executa SQL nem acessa o banco. */
import { obterOperacoesAprovadasCadastroMestre, serializarDeterministico } from './cadastro-mestre-approval-engine.js';

export function criarPlanoReconstrucaoCadastroMestre(manifesto, revisao) {
  if (manifesto?.versao_contrato !== 'RECONSTRUCAO_UNIVERSO_V1' || manifesto.modo !== 'RECONSTRUCAO_UNIVERSO') {
    throw new Error('Gerar novo Preview no contrato de reconstrução do universo.');
  }
  const aprovado = obterOperacoesAprovadasCadastroMestre(manifesto, revisao);
  if (manifesto.reconstrucao_bloqueada || manifesto.status !== 'OK' || !manifesto.universo.length) {
    throw new Error('Reconstrução bloqueada: arquivo com erros ou universo vazio.');
  }
  if (aprovado.operacoes.length !== manifesto.operacoes.length || aprovado.operacoes.some(o => !o.aprovavel)) {
    throw new Error('Todas as propostas, inclusive remoções, devem estar aprovadas para reconstruir o universo.');
  }
  const inserts = aprovado.operacoes.filter(o => o.acao === 'INSERT');
  const updates = new Map();
  for (const op of aprovado.operacoes.filter(o => o.acao === 'UPDATE')) {
    updates.set(op.codigo_produto, { ...(updates.get(op.codigo_produto) || {}), ...op.dados });
  }
  return {
    versao_contrato: manifesto.versao_contrato,
    universo: [...manifesto.universo],
    inserts: inserts.map(o => ({ ...o.dados })),
    updates: [...updates].map(([codigo_produto, dados]) => ({ codigo_produto, ...dados })),
    remocoes: manifesto.remocoes.map(o => ({ codigo_produto: o.codigo_produto, motivo: o.motivo, atual: o.atual })),
    esperados: manifesto.produtos.map(p => ({ codigo_produto: p.codigo_produto, atual: p.atual, calculado: p.calculado })),
    resumo: { antes: manifesto.resumo.produtos_master_antes, depois: manifesto.universo.length,
      inseridos: inserts.length, atualizados: updates.size, removidos: manifesto.remocoes.length },
    vinculo_manifesto: serializarDeterministico(manifesto)
  };
}
