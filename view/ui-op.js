/* Responsabilidade: visualização da Auditoria de OP — filtros em cascata
   (estágio → origem → OP → produto), tabela de apontamentos do MCAP105 e linha
   do tempo por produto. Espelha o padrão investigativo da aba Custos
   (ui-filters.js + ui-drill-through.js): cascata que restringe cada nível ao
   anterior, "TODAS/TODOS" como opção padrão e reset em cadeia dos níveis
   inferiores.

   Estratégia de dados: todos os apontamentos são carregados uma única vez no
   bindOp() (api.getApontamentosOp({})) e guardados em memória local ao
   controller. As opções de cada select e a linha do tempo por produto são
   derivadas desse array — evitando uma chamada de API por mudança de select. O
   volume de OP é mensal e pequeno o suficiente para caber em memória.

   Recorte de competência (De/Até): os inputs são `type="month"` e representam
   uma FAIXA de competências. Como api.getApontamentosOp só filtra por igualdade
   de data (`data_referencia`), o recorte é aplicado em memória sobre o resultado
   da consulta — a competência importada é sempre o 1º dia do mês
   (`YYYY-MM-01`), então a comparação lexicográfica de datas ISO cobre a faixa. */
import { api } from '../src/services/api.js';
import { escapeHtml, fillSelect, formatDateBR } from './ui-utils.js';

const TODOS = 'TODOS';
const TODAS = 'TODAS';

// Ordena valores de select: numérico quando ambos são números, senão pt-BR.
function compareCascadeValues(a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;
  return String(a).localeCompare(String(b), 'pt-BR');
}

// Exibe números "crus" (sem formatação monetária); '-' para vazio/nulo.
function formatNum(value) {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return escapeHtml(value);
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// % Tempo: 2 casas + '%'. Tempo acima do previsto (>0) é ruim neste contexto.
function formatPercTempo(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${num.toFixed(2)}%`;
}

// Cores reaproveitam as classes de delta da aba Custos: vermelho (delta-up)
// para > 0 (ruim), verde (delta-down) para < 0 (bom), cinza para = 0/indefinido.
function percTempoClass(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return 'delta-neutral';
  return num > 0 ? 'delta-up' : 'delta-down';
}

/**
 * Responsabilidade: visualização da Auditoria de OP — filtros em cascata
 * (estágio → origem → OP → produto), tabela de apontamentos e linha do tempo.
 * @param {{ dom: Record<string, any>, executeOperationalBoundary: Function }} params
 * @returns {{ bindOp: Function, runOpReport: Function }}
 */
export function createOpController({ dom, executeOperationalBoundary }) {
  // Fonte única em memória: todos os apontamentos (sem filtro) para derivar a
  // cascata e a linha do tempo por produto.
  let allRows = [];

  // Valores distintos e não-vazios de um campo, preservando o tipo original.
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

  // Recalcula origem → OP → produto a partir das seleções superiores atuais,
  // resetando em cadeia os níveis abaixo do que mudou (mesmo contrato da aba
  // Custos). `changed` indefinido apenas repovoa sem resetar (carga inicial).
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
    }, { message: 'Falha ao carregar dados de OP. Reabra a aba ou importe o MCAP105.' });
  }

  // Filtros da consulta: só inclui um nível quando ele não está em TODAS/TODOS.
  function buildQueryFilters() {
    const filters = {};
    if (dom.selOpEstagio.value !== TODOS) filters.estagio = dom.selOpEstagio.value;
    if (dom.selOpOrigem.value !== TODAS) filters.origem = dom.selOpOrigem.value;
    if (dom.selOpOp.value !== TODAS) filters.op = dom.selOpOp.value;
    if (dom.selOpProduto.value !== TODOS) filters.codProduto = dom.selOpProduto.value;
    return filters;
  }

  // Recorte de competência aplicado em memória (ver comentário de cabeçalho).
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

  function renderTable(rows) {
    if (!rows.length) {
      dom.opTableBody.innerHTML = '<tr><td colspan="16" style="text-align:center; padding:16px;">Nenhum apontamento para os filtros selecionados.</td></tr>';
      return;
    }

    /* eslint-disable no-restricted-syntax -- Tabela HTML controlada com todos os valores escapados/formatados; mesmo padrão documentado de ui-drill-through.js (SEC-02). */
    dom.opTableBody.innerHTML = `${rows.map(row => `
      <tr class="op-row" data-cod-produto="${escapeHtml(row.cod_produto)}">
        <td>${formatDateBR(row.data_referencia)}</td>
        <td>${escapeHtml(row.estagio)}</td>
        <td>${escapeHtml(row.origem)}</td>
        <td>${escapeHtml(row.op)}</td>
        <td><strong>${escapeHtml(row.cod_produto)}</strong></td>
        <td style="text-align:left;">${escapeHtml(row.descricao)}</td>
        <td>${formatNum(row.qtd_prevista)}</td>
        <td>${formatNum(row.qtd_produzida)}</td>
        <td>${escapeHtml(row.unidade)}</td>
        <td>${formatNum(row.tempo_previsto)}</td>
        <td>${formatNum(row.tempo_real)}</td>
        <td>${formatNum(row.kg_hora_previsto)}</td>
        <td>${formatNum(row.kg_hora_real)}</td>
        <td class="${percTempoClass(row.perc_tempo)}">${formatPercTempo(row.perc_tempo)}</td>
        <td>${formatNum(row.tempo_parada)}</td>
        <td>${formatNum(row.qtd_apontamentos)}</td>
      </tr>
    `).join('')}`;
    /* eslint-enable no-restricted-syntax */
  }

  // Linha do tempo: todas as competências do mesmo produto, em ordem crescente.
  function renderTimeline(codProduto) {
    const entries = allRows
      .filter(row => String(row.cod_produto) === String(codProduto))
      .slice()
      .sort((a, b) => String(a.data_referencia || '').localeCompare(String(b.data_referencia || '')));

    if (!entries.length) return;

    const descricao = entries[entries.length - 1]?.descricao || '';
    dom.opDrillTitle.textContent = descricao ? `${codProduto} — ${descricao}` : String(codProduto);

    /* eslint-disable no-restricted-syntax -- Tabela HTML controlada com valores escapados/formatados; mesmo padrão de ui-drill-through.js (SEC-02). */
    dom.opDrillBody.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Competência</th>
            <th>OP</th>
            <th>Tempo Prev.</th>
            <th>Tempo Real</th>
            <th>KG/Hora Prev.</th>
            <th>KG/Hora Real</th>
            <th>% Tempo</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(row => `
            <tr>
              <td><strong>${formatDateBR(row.data_referencia)}</strong></td>
              <td>${escapeHtml(row.op)}</td>
              <td>${formatNum(row.tempo_previsto)}</td>
              <td>${formatNum(row.tempo_real)}</td>
              <td>${formatNum(row.kg_hora_previsto)}</td>
              <td>${formatNum(row.kg_hora_real)}</td>
              <td class="${percTempoClass(row.perc_tempo)}">${formatPercTempo(row.perc_tempo)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    /* eslint-enable no-restricted-syntax */

    dom.opDrillPanel.classList.remove('hidden');
    dom.opDrillPanel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  async function runOpReport() {
    await executeOperationalBoundary('consultar apontamentos de OP', async () => {
      const { data, error } = await api.getApontamentosOp(buildQueryFilters());
      if (error) throw new Error(error.message || 'Falha ao consultar apontamentos de OP.');
      renderTable(applyCompetenciaRange(data || []));
    }, { message: 'Falha ao consultar apontamentos de OP. O contexto atual foi preservado.' });
  }

  function bindOp() {
    // Sem os elementos da aba OP no DOM, bind() é no-op — a aba Custos permanece
    // intacta (mesmo contrato defensivo de ui-import-op.js).
    if (!dom.selOpEstagio) return undefined;

    dom.selOpEstagio.addEventListener('change', () => refreshCascade('estagio'));
    dom.selOpOrigem.addEventListener('change', () => refreshCascade('origem'));
    dom.selOpOp.addEventListener('change', () => refreshCascade('op'));
    dom.analisarOpBtn?.addEventListener('click', () => runOpReport());

    // Delegação de clique: abre a linha do tempo do produto da linha clicada.
    dom.opTableBody?.addEventListener('click', event => {
      const tr = event.target?.closest?.('tr[data-cod-produto]');
      if (!tr) return;
      renderTimeline(tr.dataset.codProduto);
    });

    return reloadData();
  }

  return { bindOp, runOpReport };
}
