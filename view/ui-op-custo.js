/* OP-CUSTO-F2: apresentação/orquestração. Regras e fatos pertencem à Fase 1. */
import { api } from '../src/services/api.js';
import { analyzeOpCustoContext, getOpCustoPeriod } from '../core/op-custo-engine.js';
import { normalizeCodigoProduto } from '../core/spreadsheet-engine.js';
import { getOperationalPriority, compareByInvestigativePriority } from './ui-table.js';
import { escapeHtml } from './ui-utils.js';

const PAGE_SIZE = 50;
const text = value => value === null || value === undefined || value === '' ? 'Não informado' : String(value);
const safe = value => escapeHtml(text(value));
const list = items => `<ul>${(items || []).map(item => `<li>${safe(item)}</li>`).join('')}</ul>`;
const fullDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Não informado';
const number = (value, currency = false) => {
  if (value === null || value === undefined || value === '') return 'Não informado';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', currency
    ? { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 }
    : { maximumFractionDigits: 4 }) : 'Valor inválido';
};
const percent = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ? 'Sem base' : `${number(value)}%`;
const monthLabel = value => {
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${value.slice(0, 4)}`;
};
const description = p => p.op?.eventos[0]?.fatoOriginal.descricao || p.custo?.snapshots[0]?.fatoOriginal.descricao || 'Descrição não informada';
const costPriorityText = p => !p.custo ? 'Custo ausente' : `${p.custo.comparacao.estado !== 'disponivel' ? 'Comparação sem base utilizável · ' : ''}${p.custo.prioridadeOriginal?.label || 'Prioridade não disponível'}`;
const opPriorityText = p => !p.op ? 'OP ausente' : p.op.prioridadeOriginalObservada?.decisao?.rotulo || 'Prioridade não disponível';
const costStates = { disponivel: 'Disponível', sem_base: 'Sem base comparativa', denominador_invalido: 'Denominador não positivo',
  ambigua: 'Comparação ambígua', invalida: 'Comparação inválida', valor_comum_empatado: 'Valores comuns em empate' };

export function createOpCustoController({ dom, apiClient = api, analyze = analyzeOpCustoContext,
  costPriority = getOperationalPriority, costComparator = compareByInvestigativePriority }) {
  const $ = id => dom.opCustoPanel?.querySelector(`#${id}`);
  // Fronteira HTML local: builders abaixo escapam cada fato/rótulo com safe().
  // Não recebe HTML da API nem a narrativa legada de Custos (SEC-02/LOG-04).
  const setHtml = (id, content) => { $(id).innerHTML = content; };
  let bound = false;
  let active = false;
  let generation = 0;
  let competencia = null;
  let contexto = null;
  let analisesCusto = [];
  let resultado = null;
  let inclusion = null;
  let page = 0;
  let sourceScroll = 0;
  let queueScroll = 0;
  let queueTop = 0;
  let sourceFocus = null;

  function selectedMonth() {
    const start = dom.dtOpStart?.value;
    const end = dom.dtOpEnd?.value;
    if (!start || start !== end) return null;
    try { getOpCustoPeriod(start); return start; } catch { return null; }
  }
  function updateEntry() {
    const month = selectedMonth();
    if (dom.opCustoBtn) {
      dom.opCustoBtn.hidden = !month;
      dom.opCustoBtn.classList.toggle('hidden', !month);
      dom.opCustoBtn.disabled = !month;
      dom.opCustoBtn.textContent = month ? `OP × CUSTO — ${monthLabel(month)}` : 'OP × CUSTO';
    }
    if (dom.opCustoHint) dom.opCustoHint.textContent = month
      ? 'Cruzamento mensal completo por produto, independente dos filtros OP.'
      : 'Selecione uma única competência mensal (De = Até) para OP × CUSTO. A análise de múltiplos meses será uma evolução futura.';
    if (active && competencia !== month) close();
  }
  function status(state, message) {
    $('opc-status').textContent = message;
    $('opc-status').dataset.state = state;
    $('opc-status').setAttribute('role', state === 'error' ? 'alert' : 'status');
    dom.opCustoPanel.setAttribute('aria-busy', String(state === 'loading'));
  }
  function hideResults() {
    for (const id of ['opc-overview', 'opc-quality', 'opc-choice', 'opc-report', 'opc-dossier', 'opc-change-inclusion']) $(id).classList.add('hidden');
    $('opc-body').innerHTML = '';
  }
  function buildResult(produtoSolicitado) {
    return analyze({ contexto, analisesOp: contexto.analisesOp, analisesCusto, produtoSolicitado });
  }
  async function open() {
    const month = selectedMonth();
    if (!month || !dom.opCustoPanel) { updateEntry(); return; }
    sourceScroll = globalThis.window?.scrollY || 0;
    sourceFocus = globalThis.document?.activeElement;
    dom.opSourcePanel.classList.add('hidden');
    dom.opCustoPanel.classList.remove('hidden');
    active = true;
    competencia = month;
    $('opc-title').textContent = `OP × CUSTO — ${monthLabel(month)}`;
    await reload();
  }
  async function reload() {
    if (!active) return;
    const ticket = ++generation;
    const month = competencia;
    contexto = null; resultado = null; inclusion = null; page = 0;
    hideResults();
    $('opc-reload').disabled = true;
    status('loading', `Carregando OP e Custo de ${monthLabel(month)}. A cobertura será exibida após a leitura completa.`);
    try {
      const { data, error } = await apiClient.getOpCustoContext({ competencia: month });
      if (!active || ticket !== generation) return;
      if (error) throw error;
      if (!data || data.versao !== 'OP_CUSTO_V1' || data.competencia !== month || data.qualidade?.completa !== true) throw new Error('Contexto incompleto.');
      contexto = data;
      // Presenter existente, sem mudança de peso/limiar e sem narrativa LOG-04.
      analisesCusto = data.analisesCusto.map(item => ({ ...item, prioridadeOriginal: costPriority(item.resultadoOriginal) }));
      resultado = buildResult();
      if (resultado.estado !== 'completo' || !resultado.qualidade?.completa || !resultado.cobertura) throw new Error('Contexto incompleto.');
      renderOverview();
      $('opc-search').value = ''; $('opc-code').value = ''; $('opc-coverage').value = ''; $('opc-order').value = 'op';
      const { ambos, somenteOp, somenteCusto } = resultado.cobertura;
      const options = [['A', ambos, 'OP + Custo'], ['B', somenteOp, 'OP sem Custo'], ['C', somenteCusto, 'Custo sem OP']];
      setHtml('opc-coverage', '<option value="">Todos os incluídos</option>' + options.filter(([, count]) => count > 0)
        .map(([value, , label]) => `<option value="${value}">${label}</option>`).join(''));
      if (somenteOp + somenteCusto > 0) askInclusion();
      else { inclusion = 'ambos'; renderQueue(); }
    } catch (error) {
      if (!active || ticket !== generation) return;
      contexto = null; resultado = null;
      hideResults();
      const code = error?.details?.code || error?.code;
      const integrity = ['CONTAGEM_DIVERGENTE', 'LEITURA_INCOMPLETA', 'IDENTIDADE_INVALIDA', 'IDENTIDADE_REPETIDA', 'ADAPTACAO_INVALIDA'].includes(code);
      status('error', integrity ? 'Erro de integridade: não foi possível concluir o contexto. Nenhum relatório parcial foi apresentado. Tente atualizar a leitura.'
        : 'Não foi possível carregar um contexto completo de OP e Custo. A cobertura não pode ser determinada; falha de leitura não significa fonte vazia. Tente atualizar a leitura.');
    } finally {
      if (active && ticket === generation) $('opc-reload').disabled = false;
    }
  }
  function renderOverview() {
    const c = resultado.cobertura;
    const d = resultado.diagnosticos;
    const counts = new Map();
    // Contagem de rótulos já produzidos pelo engine, sem nova classificação.
    for (const p of resultado.produtos) counts.set(p.relacao.rotulo, (counts.get(p.relacao.rotulo) || 0) + 1);
    const source = (name, f) => `<p><strong>${name}:</strong> ${f.estado === 'completa_vazia' ? 'Fonte vazia confirmada' : 'Leitura completa'} · ${safe(f.contagem)} registros.</p>`;
    setHtml('opc-overview', `<h3>Visão geral — ${safe(monthLabel(competencia))}</h3><div class="opc-kpis">
      <div><span>OP + Custo</span><strong>${safe(c.ambos)}</strong></div><div><span>OP sem Custo</span><strong>${safe(c.somenteOp)}</strong></div>
      <div><span>Custo sem OP</span><strong>${safe(c.somenteCusto)}</strong></div><div><span>Registros não relacionáveis</span><strong>${d.opNaoVinculavel.length + d.custoNaoVinculavel.length}</strong></div></div>
      ${source('OP', resultado.fontes.op)}${source('Custo', resultado.fontes.custos)}
      <div class="opc-relations">${[...counts].map(([label, count]) => `<span class="badge">${safe(label)}: ${count}</span>`).join('')}</div>
      <p class="help-text">Cobertura da competência completa, antes da inclusão e dos filtros locais. Leitura não transacional · ${safe(resultado.leitura?.iniciadoEm || resultado.leitura?.idLocal)}</p>`);
    $('opc-overview').classList.remove('hidden');
    const invalids = [...d.opNaoVinculavel, ...d.custoNaoVinculavel, ...d.foraCompetencia];
    const warnings = resultado.produtos.flatMap(p => [...p.relacao.motivos.slice(1), ...(p.custo?.qualidadeCampos || []).map(q => `${p.chave.codigoNormalizado}: ${q.campo} — ${q.motivo}`)]);
    setHtml('opc-quality', `<details><summary>Qualidade e limites — ${invalids.length} registros sem vínculo; ${d.inconsistencias.length} inconsistências</summary>
      <p>As somas numéricas de OP não estão disponíveis. Reimports possíveis não comprovam eventos independentes. A série de custos contém somente os snapshots persistidos disponíveis.</p>
      ${list(warnings)}${list(d.inconsistencias.map(item => `${item.codigoNormalizado}: ${item.motivo}`))}
      ${invalids.length ? `<div class="opc-scroll"><table><thead><tr><th>Fonte</th><th>ID</th><th>Código original</th><th>Data de referência</th><th>Motivo</th></tr></thead><tbody>${invalids.map(r => `<tr><td>${safe(r.fonte)}</td><td>${safe(r.idFonte)}</td><td>${safe(r.fatoOriginal?.cod_produto ?? r.fatoOriginal?.codigo_produto)}</td><td>${safe(r.fatoOriginal?.data_referencia)}</td><td>${safe(r.motivo)}</td></tr>`).join('')}</tbody></table></div>` : ''}</details>`);
    $('opc-quality').classList.remove('hidden');
  }
  function askInclusion() {
    inclusion = null;
    $('opc-report').classList.add('hidden'); $('opc-dossier').classList.add('hidden');
    const c = resultado.cobertura;
    $('opc-choice-text').textContent = `${c.ambos} produtos com OP e Custo; ${c.somenteOp} com OP sem Custo; ${c.somenteCusto} com Custo sem OP em ${monthLabel(competencia)}. Deseja incluir produtos sem correspondência?`;
    $('opc-choice').classList.remove('hidden');
    $('opc-change-inclusion').classList.add('hidden');
    status('pending', 'Aguardando sua escolha de inclusão. Ausência de OP ou Custo não será convertida em zero.');
  }
  function choose(value) { inclusion = value; page = 0; $('opc-choice').classList.add('hidden'); renderQueue(); }
  function renderQueue() {
    if (!resultado || inclusion === null) return;
    const query = $('opc-search').value.trim().toLocaleLowerCase('pt-BR');
    const coverage = $('opc-coverage').value;
    const rows = resultado.produtos.filter(p => (inclusion === 'todos' || p.cobertura === 'A') && (!coverage || p.cobertura === coverage) &&
      (!query || `${p.chave.codigoNormalizado} ${description(p)}`.toLocaleLowerCase('pt-BR').includes(query)));
    rows.sort((a, b) => {
      if ($('opc-order').value === 'custo') {
        if (!a.custo || !b.custo) return a.custo ? -1 : b.custo ? 1 : a.chave.codigoNormalizado.localeCompare(b.chave.codigoNormalizado);
        return costComparator(a.custo.resultadoOriginal, b.custo.resultadoOriginal, costPriority);
      }
      const pa = a.op?.prioridadeOriginalObservada?.posicaoOriginal;
      const pb = b.op?.prioridadeOriginalObservada?.posicaoOriginal;
      return (pa ?? Infinity) - (pb ?? Infinity) || a.chave.codigoNormalizado.localeCompare(b.chave.codigoNormalizado);
    });
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
    const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    setHtml('opc-body', visible.length ? visible.map(p => `<tr data-opc-code="${safe(p.chave.codigoNormalizado)}">
      <td><button type="button" class="btn-outline btn-sm" data-opc-code="${safe(p.chave.codigoNormalizado)}">${safe(p.chave.codigoNormalizado)}</button><small>${safe(description(p))}</small></td>
      <td>${p.op ? `${p.op.contagens.eventos} eventos · ${safe(p.op.sinalRelacional)}` : 'OP ausente'}</td>
      <td>${p.custo ? `${safe(number(p.custo.referencia.valores?.total, true))}<small>${safe(p.custo.sinalRelacional)}</small>` : 'Custo ausente'}</td>
      <td>${safe(p.relacao.rotulo)}</td><td>${safe(p.relacao.motivos[0])}</td><td>${safe(opPriorityText(p))}</td><td>${safe(costPriorityText(p))}</td></tr>`).join('')
      : '<tr><td colspan="7">Nenhum resultado para os filtros e a inclusão escolhidos. Produtos sem correspondência permanecem contados na visão geral.</td></tr>');
    $('opc-page').textContent = `${rows.length} produtos nos filtros · página ${page + 1} de ${Math.max(1, Math.ceil(rows.length / PAGE_SIZE))} · até ${PAGE_SIZE} por página. ${inclusion === 'todos' ? 'Incluídos OP + Custo e casos sem correspondência.' : 'Somente OP + Custo; casos sem correspondência excluídos pela sua escolha.'}`;
    $('opc-prev').disabled = page === 0;
    $('opc-next').disabled = (page + 1) * PAGE_SIZE >= rows.length;
    $('opc-report').classList.remove('hidden'); $('opc-dossier').classList.add('hidden');
    $('opc-change-inclusion').classList.toggle('hidden', resultado.cobertura.somenteOp + resultado.cobertura.somenteCusto === 0);
    status('success', 'Contexto completo. Relações temporais exigem investigação e não comprovam causalidade.');
  }
  function renderDossier(p) {
    queueScroll = dom.opCustoPanel.scrollTop || 0; queueTop = globalThis.window?.scrollY || 0;
    $('opc-report').classList.add('hidden');
    $('opc-dossier-title').textContent = `${p.chave.codigoNormalizado} — ${description(p)} · ${monthLabel(p.chave.competencia)}`;
    const fields = (row, keys) => `<dl class="opc-facts">${keys.map(([key, label]) => `<div><dt>${label}</dt><dd>${safe(row[key])}</dd></div>`).join('')}</dl>`;
    const event = e => {
      const r = e.resultadoOriginal;
      return `<article class="opc-event"><h5>ID ${safe(e.idFonte)} · OP ${safe(e.fatoOriginal.op)} · ${safe(e.fatoOriginal.estagio)}</h5>
        ${fields(e.fatoOriginal, [['cod_produto', 'Produto original'], ['descricao', 'Descrição ERP'], ['cod_estagio', 'Código estágio'], ['estagio', 'Estágio'], ['origem', 'Origem ERP'], ['unidade', 'Unidade'], ['log_importacao_op_id', 'Lote de importação'], ['data_referencia', 'Data de referência original'], ['criado_em', 'Importado em (original)'], ['qtd_prevista', 'Qtd. prevista'], ['qtd_produzida', 'Qtd. produzida'], ['qtd_apontamentos', 'Apontamentos'], ['tempo_previsto', 'Tempo previsto'], ['tempo_real', 'Tempo real'], ['tempo_parada', 'Tempo de parada'], ['kg_hora_previsto', 'KG/h previsto'], ['kg_hora_real', 'KG/h real'], ['perc_tempo', '% Tempo ERP']])}
        <p><strong>Data de referência:</strong> ${safe(fullDate(e.fatoOriginal.data_referencia))}</p>
        <p><strong>Indicadores Kustos:</strong> Atendimento ${safe(percent(r.indicadores.atendimentoProducaoPct))} · Desvio tempo ${safe(percent(r.indicadores.desvioTempoPct))} · Desvio produtividade ${safe(percent(r.indicadores.desvioProdutividadePct))} · Índice de parada ${safe(percent(r.indicadores.indiceParadasPct))}</p>
        <p><strong>Resultado OP:</strong> ${safe(r.classificacao.rotulo)} · <strong>Prioridade OP:</strong> ${safe(r.decisao.rotulo)}</p>
        <p>${safe(r.resumo)}</p><p><strong>Hipótese do motor OP:</strong> ${safe(r.causaProvavel)}</p>${list(r.evidencias)}</article>`;
    };
    const snapshots = p.custo?.snapshots.map(s => {
      const ref = p.custo.referencia.idsCandidatos.includes(s.idFonte);
      const base = p.custo.comparacao.idsBase.includes(s.idFonte);
      return `<tr><td>${safe(s.idFonte)}</td><td>${safe(fullDate(s.fatoOriginal.data_referencia))}</td><td>${safe(s.fatoOriginal.criado_em)}</td>
        <td>${safe(number(s.fatoOriginal.custo_variavel, true))}</td><td>${safe(number(s.fatoOriginal.custo_direto_fixo, true))}</td><td>${safe(number(s.fatoOriginal.custo_total, true))}</td>
        <td>${ref ? p.custo.referencia.estado === 'disponivel' ? 'Referência principal' : 'Candidato à referência' : base ? 'Base da comparação' : 'Snapshot preservado'}</td></tr>`;
    }).join('');
    setHtml('opc-dossier-body', `<p><strong>Cobertura:</strong> ${safe(p.cobertura)} · competência operacional por data_referencia. Importação por criado_em.</p>
      <section><h4>OP — fatos e resultados individuais</h4>${p.op ? `${list(p.op.consolidacao.motivos)}${list(p.op.possiveisReimports.map(r => `${r.motivo} IDs: ${r.ids.join(', ')}`))}${p.op.eventos.map(event).join('')}` : '<p>OP ausente. Sem apontamento OP correspondente nesta competência.</p>'}</section>
      <section><h4>Custo — snapshots da competência</h4>${p.custo ? `<p><strong>Prioridade Custo:</strong> ${safe(costPriorityText(p))}</p><p>Referência: ${safe(costStates[p.custo.referencia.estado] || p.custo.referencia.estado)} · Comparação: ${safe(costStates[p.custo.comparacao.estado] || p.custo.comparacao.estado)}</p>
        <p>Delta monetário: ${safe(number(p.custo.comparacao.deltaMonetario, true))} · Delta percentual: ${safe(percent(p.custo.comparacao.deltaPercentual))}</p>
        <div class="opc-scroll" tabindex="0" aria-label="Snapshots de custo"><table><thead><tr><th>ID</th><th>Data de referência</th><th>Importado em (criado_em original)</th><th>Variável</th><th>Fixo direto</th><th>Total</th><th>Papel</th></tr></thead><tbody>${snapshots}</tbody></table></div>${list(p.custo.comparacao.motivos)}${list(p.custo.qualidadeCampos.map(q => `ID ${q.idFonte}: ${q.campo} — ${q.motivo}`))}` : '<p>Custo ausente. Sem custo correspondente nesta competência.</p>'}</section>
      <section class="opc-conclusion"><h4>${safe(p.relacao.rotulo)}</h4>${list(p.relacao.motivos)}${p.relacao.evidencias.map(e => `<p>${safe(e.texto)}</p><p>Eventos OP: ${safe(e.idsOp.join(', '))} · Referência Custo: ${safe(e.idsReferenciaCusto.join(', '))} · Base: ${safe(e.idsBaseCusto.join(', '))}</p>${list(e.limitacoes)}`).join('')}
      ${list(p.qualidade.limitacoes)}<p>Correlação temporal não comprova causalidade nem a ordem dos acontecimentos.</p></section>`);
    $('opc-dossier').classList.remove('hidden');
    $('opc-dossier-title').focus?.({ preventScroll: true });
    $('opc-dossier').scrollIntoView?.({ block: 'start' });
  }
  function searchProduct(value) {
    if (!contexto || inclusion === null) return;
    const code = normalizeCodigoProduto(value ?? $('opc-code').value);
    if (!code) { status('error', 'Informe um código de produto válido; descrição não é chave de relação.'); return; }
    const local = buildResult(code);
    const product = local.produtos.find(p => p.chave.codigoNormalizado === code);
    if (product) renderDossier(product);
  }
  function close() {
    generation++; active = false;
    dom.opCustoPanel.classList.add('hidden'); dom.opSourcePanel.classList.remove('hidden');
    (sourceFocus || dom.opCustoBtn)?.focus?.({ preventScroll: true });
    globalThis.window?.scrollTo?.({ top: sourceScroll, behavior: 'instant' });
  }
  function bind() {
    if (bound || !dom.opCustoPanel) return;
    bound = true;
    dom.opCustoBtn.addEventListener('click', open);
    for (const input of [dom.dtOpStart, dom.dtOpEnd]) input?.addEventListener('change', updateEntry);
    $('opc-back').addEventListener('click', close);
    $('opc-reload').addEventListener('click', reload);
    $('opc-include').addEventListener('click', () => choose('todos'));
    $('opc-only-both').addEventListener('click', () => choose('ambos'));
    $('opc-change-inclusion').addEventListener('click', askInclusion);
    $('opc-prev').addEventListener('click', () => { page--; renderQueue(); });
    $('opc-next').addEventListener('click', () => { page++; renderQueue(); });
    for (const id of ['opc-search', 'opc-coverage', 'opc-order']) $(id).addEventListener(id === 'opc-search' ? 'input' : 'change', () => { page = 0; renderQueue(); });
    $('opc-code-form').addEventListener('submit', event => { event.preventDefault(); searchProduct(); });
    $('opc-body').addEventListener('click', event => {
      const code = event.target?.closest?.('[data-opc-code]')?.dataset.opcCode;
      const p = resultado?.produtos.find(item => item.chave.codigoNormalizado === code);
      if (p) renderDossier(p);
    });
    $('opc-dossier-back').addEventListener('click', () => {
      $('opc-dossier').classList.add('hidden'); $('opc-report').classList.remove('hidden');
      dom.opCustoPanel.scrollTop = queueScroll;
      globalThis.window?.scrollTo?.({ top: queueTop, behavior: 'instant' });
    });
    updateEntry();
  }
  return { bind, open, close, reload, searchProduct };
}
