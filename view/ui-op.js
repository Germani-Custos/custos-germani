/* Responsabilidade: fila e dossiê investigativos da Auditoria de OP.
   Os fatos do MCAP105 permanecem imutáveis; o motor puro só adiciona
   indicadores calculados e motivo/provável causa para acelerar a triagem. */
import { api } from '../src/services/api.js';
import { buildOpInvestigationQueue, getOpInvestigationReasonOptions } from '../core/op-investigation-engine.js';
import { escapeHtml, fillSelect, formatDateBR, formatDateTimeBR } from './ui-utils.js';

const TODOS = 'TODOS';
const TODAS = 'TODAS';

function compareCascadeValues(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a).localeCompare(String(b), 'pt-BR');
}

function formatNum(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return escapeHtml(value);
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatPercent(value, { signed = false } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${signed && num > 0 ? '+' : ''}${num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function metricClass(value, positiveIsBad) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return 'delta-neutral';
  const adverse = positiveIsBad ? num > 0 : num < 0;
  return adverse ? 'delta-up' : 'delta-down';
}

function reasonFilterValue(reason) {
  return reason === TODOS ? TODOS : String(reason || TODOS);
}

function getErpConferenceText(conferencia) {
  if (conferencia?.status === 'confirmado') return 'Confere com o desvio de produtividade calculado.';
  if (conferencia?.status === 'divergente') return 'Diverge do desvio de produtividade; conferir apontamento do ERP.';
  return 'Sem base suficiente para conferência.';
}

/**
 * Visualização da Auditoria de OP: filtros em cascata, fila por motivo de
 * investigação e dossiê que separa explicitamente fatos ERP de cálculos do
 * Kustos.
 * @param {{ dom: Record<string, any>, executeOperationalBoundary: Function }} params
 * @returns {{ bindOp: Function, runOpReport: Function, reloadData: Function }}
 */
export function createOpController({ dom, executeOperationalBoundary }) {
  let allRows = [];
  let hasRunReport = false;

  function distinct(rows, key) {
    const seen = new Set();
    const out = [];
    rows.forEach(row => {
      const value = row?.[key];
      if (value === null || value === undefined || value === '') return;
      const chave = String(value);
      if (seen.has(chave)) return;
      seen.add(chave);
      out.push(value);
    });
    return out;
  }

  function toOptions(values) {
    return values
      .slice()
      .sort(compareCascadeValues)
      .map(value => ({ value, label: value }));
  }

  function fillEstagioSelect() {
    fillSelect(
      dom.selOpEstagio,
      toOptions(distinct(allRows, 'estagio')),
      { value: TODOS, label: TODOS },
      dom.selOpEstagio.value || TODOS
    );
  }

  function fillMotivoSelect() {
    if (!dom.selOpMotivo) return;
    fillSelect(
      dom.selOpMotivo,
      getOpInvestigationReasonOptions().map(reason => ({ value: reason.key, label: reason.label })),
      { value: TODOS, label: 'TODOS OS MOTIVOS' },
      reasonFilterValue(dom.selOpMotivo.value)
    );
  }

  function refreshCascade(changed) {
    if (changed === 'estagio') { dom.selOpOrigem.value = TODAS; dom.selOpOp.value = TODAS; dom.selOpProduto.value = TODOS; }
    if (changed === 'origem') { dom.selOpOp.value = TODAS; dom.selOpProduto.value = TODOS; }
    if (changed === 'op') { dom.selOpProduto.value = TODOS; }

    const estagio = dom.selOpEstagio.value;
    const byEstagio = allRows.filter(row => estagio === TODOS || String(row.estagio) === estagio);
    fillSelect(dom.selOpOrigem, toOptions(distinct(byEstagio, 'origem')), { value: TODAS, label: TODAS }, dom.selOpOrigem.value || TODAS);

    const origem = dom.selOpOrigem.value;
    const byOrigem = byEstagio.filter(row => origem === TODAS || String(row.origem) === origem);
    fillSelect(dom.selOpOp, toOptions(distinct(byOrigem, 'op')), { value: TODAS, label: TODAS }, dom.selOpOp.value || TODAS);

    const op = dom.selOpOp.value;
    const byOp = byOrigem.filter(row => op === TODAS || String(row.op) === op);
    const produtoOptions = distinct(byOp, 'cod_produto')
      .slice()
      .sort(compareCascadeValues)
      .map(cod => {
        const descricao = byOp.find(row => String(row.cod_produto) === String(cod))?.descricao || '';
        return { value: cod, label: descricao ? `${cod} - ${descricao}` : String(cod) };
      });
    fillSelect(dom.selOpProduto, produtoOptions, { value: TODOS, label: TODOS }, dom.selOpProduto.value || TODOS);
  }

  async function reloadData() {
    await executeOperationalBoundary('carregar apontamentos de OP', async () => {
      const { data, error } = await api.getApontamentosOp({});
      if (error) throw new Error(error.message || 'Falha ao carregar apontamentos de OP.');
      allRows = data || [];
      fillEstagioSelect();
      refreshCascade();
      fillMotivoSelect();
    }, { message: 'Falha ao carregar dados de OP. Reabra a aba ou importe o relatório de apontamentos de OP.' });
  }

  function buildQueryFilters() {
    const filters = {};
    if (dom.selOpEstagio.value !== TODOS) filters.estagio = dom.selOpEstagio.value;
    if (dom.selOpOrigem.value !== TODAS) filters.origem = dom.selOpOrigem.value;
    if (dom.selOpOp.value !== TODAS) filters.op = dom.selOpOp.value;
    if (dom.selOpProduto.value !== TODOS) filters.codProduto = dom.selOpProduto.value;
    return filters;
  }

  function applyCompetenciaRange(rows) {
    const start = dom.dtOpStart?.value ? `${dom.dtOpStart.value}-01` : null;
    const end = dom.dtOpEnd?.value ? `${dom.dtOpEnd.value}-01` : null;
    if (!start && !end) return rows;
    return rows.filter(row => {
      const data = String(row?.data_referencia || '').slice(0, 10);
      if (start && data < start) return false;
      if (end && data > end) return false;
      return true;
    });
  }

  function getSelectedReason() {
    return dom.selOpMotivo?.value || TODOS;
  }

  function applyReasonFilter(rows) {
    const reason = getSelectedReason();
    if (reason === TODOS) return rows;
    return rows.filter(row => row.classificacaoInvestigativa?.key === reason);
  }

  function renderKpis(rows) {
    if (dom.opKpiTotal) dom.opKpiTotal.textContent = String(rows.length);
    if (dom.opKpiGargalos) dom.opKpiGargalos.textContent = String(rows.filter(row => row.classificacaoInvestigativa?.key === 'gargalo_produtividade').length);
    if (dom.opKpiParadas) dom.opKpiParadas.textContent = String(rows.filter(row => row.classificacaoInvestigativa?.key === 'paradas_operacionais').length);
    if (dom.opKpiAltaEficiencia) dom.opKpiAltaEficiencia.textContent = String(rows.filter(row => row.classificacaoInvestigativa?.key === 'alta_eficiencia').length);

    dom.opKpiCards?.forEach(card => {
      const reason = card.dataset.opReason || TODOS;
      card.classList.toggle('active', reason === getSelectedReason());
    });
  }

  function renderTable(rows) {
    if (!rows.length) {
      dom.opTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:16px;">Nenhum apontamento para os filtros e motivo selecionados.</td></tr>';
      return;
    }

    dom.opTableBody.innerHTML = rows.map((row, index) => {
      const indicadores = row.indicadoresKustos;
      const classificacao = row.classificacaoInvestigativa;
      return `
        <tr class="op-investigation-row op-reason-${escapeHtml(classificacao.tone)}" data-op-index="${index}">
          <td><strong>${formatDateBR(row.data_referencia)}</strong><small>OP ${escapeHtml(row.op)}</small></td>
          <td><span class="badge op-reason ${escapeHtml(classificacao.tone)}">${escapeHtml(classificacao.motivo)}</span></td>
          <td class="op-cause-cell">${escapeHtml(classificacao.causaProvavel)}</td>
          <td><div class="product-main"><strong>${escapeHtml(row.cod_produto)}</strong><small>${escapeHtml(row.descricao)}</small><small>${escapeHtml(row.estagio)} · Origem ${escapeHtml(row.origem)}</small></div></td>
          <td>${formatPercent(indicadores.atendimentoProducaoPct)}</td>
          <td class="${metricClass(indicadores.desvioTempoPct, true)}">${formatPercent(indicadores.desvioTempoPct, { signed: true })}</td>
          <td class="${metricClass(indicadores.desvioProdutividadePct, false)}">${formatPercent(indicadores.desvioProdutividadePct, { signed: true })}</td>
          <td>${formatPercent(indicadores.indiceParadasPct)}</td>
          <td><button type="button" class="btn-outline btn-sm op-dossier-toggle" data-op-index="${index}">Ver dossiê</button></td>
        </tr>
      `;
    }).join('');
    dom.opTableBody.onclick = event => {
      const trigger = event.target?.closest?.('[data-op-index]');
      if (!trigger) return;
      const row = rows[Number(trigger.dataset.opIndex)];
      if (row) renderOpDossier(row);
    };
  }

  function renderProductTimeline(codProduto) {
    return allRows
      .filter(row => String(row.cod_produto) === String(codProduto))
      .slice()
      .sort((a, b) => String(a.data_referencia || '').localeCompare(String(b.data_referencia || '')))
      .map(row => buildOpInvestigationQueue([row])[0]);
  }

  function renderOpDossier(row) {
    const indicadores = row.indicadoresKustos;
    const classificacao = row.classificacaoInvestigativa;
    const conferencia = row.conferenciaErp;
    const history = renderProductTimeline(row.cod_produto);

    dom.opDrillTitle.textContent = `Dossiê da OP ${row.op} — ${row.cod_produto}${row.descricao ? ` · ${row.descricao}` : ''}`;
    /* eslint-disable no-restricted-syntax -- valores do ERP escapados; indicadores e chaves vêm do motor local (SEC-02). */
    dom.opDrillBody.innerHTML = `
      <section class="op-dossier-section op-dossier-kustos">
        <h4>Interpretação produzida pelo Kustos</h4>
        <div class="op-dossier-highlight">
          <span class="badge op-reason ${escapeHtml(classificacao.tone)}">${escapeHtml(classificacao.motivo)}</span>
          <p>${escapeHtml(classificacao.resumo)}</p>
          <p><strong>Provável causa:</strong> ${escapeHtml(classificacao.causaProvavel)}</p>
        </div>
      </section>
      <section class="op-dossier-section">
        <h4>Indicadores calculados pelo Kustos</h4>
        <div class="details-grid">
          <span><strong>Atendimento da produção:</strong> ${formatPercent(indicadores.atendimentoProducaoPct)}</span>
          <span><strong>Desvio de tempo:</strong> <span class="${metricClass(indicadores.desvioTempoPct, true)}">${formatPercent(indicadores.desvioTempoPct, { signed: true })}</span></span>
          <span><strong>Desvio de produtividade:</strong> <span class="${metricClass(indicadores.desvioProdutividadePct, false)}">${formatPercent(indicadores.desvioProdutividadePct, { signed: true })}</span></span>
          <span><strong>Índice de paradas:</strong> ${formatPercent(indicadores.indiceParadasPct)}</span>
        </div>
      </section>
      <section class="op-dossier-section">
        <h4>Dados do ERP (imutáveis)</h4>
        <div class="details-grid">
          <span><strong>Qtd. prevista:</strong> ${formatNum(row.qtd_prevista)} ${escapeHtml(row.unidade)}</span>
          <span><strong>Qtd. produzida:</strong> ${formatNum(row.qtd_produzida)} ${escapeHtml(row.unidade)}</span>
          <span><strong>Tempo previsto:</strong> ${formatNum(row.tempo_previsto)}</span>
          <span><strong>Tempo real:</strong> ${formatNum(row.tempo_real)}</span>
          <span><strong>KG/Hora previsto:</strong> ${formatNum(row.kg_hora_previsto)}</span>
          <span><strong>KG/Hora real:</strong> ${formatNum(row.kg_hora_real)}</span>
          <span><strong>% Tempo (ERP):</strong> ${formatPercent(conferencia.percentTempoErp, { signed: true })}</span>
          <span><strong>Tempo de parada:</strong> ${formatNum(row.tempo_parada)}</span>
          <span><strong>Apontamentos:</strong> ${formatNum(row.qtd_apontamentos)}</span>
          <span><strong>Competência (data_referencia):</strong> ${formatDateBR(row.data_referencia)}</span>
          <span><strong>Importado em (criado_em):</strong> ${formatDateTimeBR(row.criado_em)}</span>
        </div>
        <p class="help-text op-erp-conference"><strong>Conferência % Tempo ERP:</strong> ${escapeHtml(getErpConferenceText(conferencia))}</p>
      </section>
      <section class="op-dossier-section">
        <h4>Histórico investigativo do produto</h4>
        <table>
          <thead><tr><th>Competência</th><th>OP</th><th>Motivo</th><th>Atendimento</th><th>Desvio tempo</th><th>Desvio produtividade</th></tr></thead>
          <tbody>${history.map(item => `
            <tr>
              <td>${formatDateBR(item.data_referencia)}</td>
              <td>${escapeHtml(item.op)}</td>
              <td>${escapeHtml(item.classificacaoInvestigativa.motivo)}</td>
              <td>${formatPercent(item.indicadoresKustos.atendimentoProducaoPct)}</td>
              <td class="${metricClass(item.indicadoresKustos.desvioTempoPct, true)}">${formatPercent(item.indicadoresKustos.desvioTempoPct, { signed: true })}</td>
              <td class="${metricClass(item.indicadoresKustos.desvioProdutividadePct, false)}">${formatPercent(item.indicadoresKustos.desvioProdutividadePct, { signed: true })}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </section>
    `;
    /* eslint-enable no-restricted-syntax */

    dom.opDrillPanel.classList.remove('hidden');
    dom.opDrillPanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  async function runOpReport() {
    await executeOperationalBoundary('consultar apontamentos de OP', async () => {
      const { data, error } = await api.getApontamentosOp(buildQueryFilters());
      if (error) throw new Error(error.message || 'Falha ao consultar apontamentos de OP.');
      const queue = buildOpInvestigationQueue(applyCompetenciaRange(data || []));
      renderKpis(queue);
      renderTable(applyReasonFilter(queue));
      hasRunReport = true;
    }, { message: 'Falha ao consultar apontamentos de OP. O contexto atual foi preservado.' });
  }

  function rerunAfterFilterChange(changed) {
    refreshCascade(changed);
    if (hasRunReport) runOpReport();
  }

  function bindOp() {
    if (!dom.selOpEstagio) return undefined;

    dom.selOpEstagio.addEventListener('change', () => rerunAfterFilterChange('estagio'));
    dom.selOpOrigem.addEventListener('change', () => rerunAfterFilterChange('origem'));
    dom.selOpOp.addEventListener('change', () => rerunAfterFilterChange('op'));
    dom.selOpProduto.addEventListener('change', () => { if (hasRunReport) runOpReport(); });
    if (typeof dom.dtOpStart?.addEventListener === 'function') dom.dtOpStart.addEventListener('change', () => { if (hasRunReport) runOpReport(); });
    if (typeof dom.dtOpEnd?.addEventListener === 'function') dom.dtOpEnd.addEventListener('change', () => { if (hasRunReport) runOpReport(); });
    dom.selOpMotivo?.addEventListener('change', () => { if (hasRunReport) runOpReport(); });
    dom.analisarOpBtn?.addEventListener('click', () => runOpReport());
    dom.opKpiCards?.forEach(card => card.addEventListener('click', () => {
      if (!dom.selOpMotivo) return;
      dom.selOpMotivo.value = card.dataset.opReason || TODOS;
      runOpReport();
    }));

    return reloadData();
  }

  return { bindOp, runOpReport, reloadData };
}
