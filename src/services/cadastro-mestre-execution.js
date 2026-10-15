/* HTTP da aplicação: sessão, entrada compacta aprovada e revisão. Sem XLS/SQL/segredos. */
import { serializarDeterministico } from '../../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../../core/cadastro-mestre-reconstruction-engine.js';
import { validarDadosExecucaoCadastroMestre } from '../../core/cadastro-mestre-execution-data.js';

const ENDPOINT = '/api/reconstruir-cadastro-mestre';

async function chamada(client, method, body, lote, diagnostico = false) {
  const { data, error } = await client.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('Entre na aplicação antes de executar a reconstrução.');
  let response;
  try {
    response = await fetch(ENDPOINT + (diagnostico ? '?verificar=1' : lote ? `?lote=${encodeURIComponent(lote)}` : ''), {
      method, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body } : {}), credentials: 'same-origin', cache: 'no-store'
    });
  } catch { throw new Error(`Resposta não recebida. Consulte o lote ${lote || '(não iniciado)'} antes de tentar novamente.`); }
  let result;
  try { result = await response.json(); } catch { throw new Error(`Resposta inválida. Consulte o lote ${lote || '(não iniciado)'} antes de tentar novamente.`); }
  if (!response.ok) {
    const failure = new Error(result.error || 'Execução administrativa indisponível.');
    // Metadados sanitizados do GET, sem alterar o contrato da execução/consulta de lote.
    if (diagnostico) Object.assign(failure, { diagnostico: result.diagnostico, status: response.status });
    throw failure;
  }
  return result;
}

export const consultarDisponibilidadeReconstrucao = client => chamada(client, 'GET');
export const consultarLoteReconstrucao = (client, lote) => chamada(client, 'GET', undefined, lote);
export const verificarAmbienteReconstrucao = client => chamada(client, 'GET', undefined, undefined, true);

export async function executarReconstrucaoPelaAplicacao(client, { dadosExecucao, manifesto, revisao, lote }) {
  criarPlanoReconstrucaoCadastroMestre(manifesto, revisao);
  validarDadosExecucaoCadastroMestre(dadosExecucao);
  const hashJson = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new globalThis.TextEncoder().encode(serializarDeterministico(value))))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
  if (await hashJson(dadosExecucao) !== manifesto.fonte.hash_dados_sha256) throw new Error('Dados do Preview mudaram após aprovação. Gere novo Preview e aprovação.');
  const hash = await hashJson(manifesto);
  const body = JSON.stringify({ dados_execucao: dadosExecucao, decisoes: revisao.decisoes,
    hash_manifesto: hash, confirmacao: `RECONSTRUIR_MASTER:${hash}`, lote });
  if (new Blob([body]).size > 4 * 1024 * 1024) throw new Error('Dados/revisão excedem o limite de envio de 4 MiB. Use o procedimento administrativo documentado.');
  const result = await chamada(client, 'POST', body, lote);
  if (result.status !== 'concluido' || result.identificador_lote !== lote || result.depois !== manifesto.universo.length) {
    throw new Error(`Resultado não confirmado. Consulte o lote ${lote} antes de tentar novamente.`);
  }
  return result;
}
