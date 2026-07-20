/* Responsabilidade: orquestração da interface — bootstrap, navegação, eventos e
   coordenação dos fluxos investigativos (delegando importação, gráficos,
   drill-through, filtros e exportação a módulos dedicados: ui-import.js,
   ui-charts.js, ui-drill-through.js, ui-filters.js, ui-export.js). */
import { api } from '../src/services/api.js';
import { normalizeCodigoProduto } from '../core/spreadsheet-engine.js';
import { fillSelect, calculateCascadeOptions, buildReportRows, calculateKpis, isAlertaCritico } from '../core/report-engine.js';
import { createInitialState } from './ui-state.js';
import { getDomRefs } from './ui-dom.js';
import { debugLog } from '../src/config/app-config.js';
import { escapeHtml, formatCurrencyBRL, formatDateTimeBR, formatDateBR, showToast } from './ui-utils.js';
import { bindDocumentationView } from './documentation-controller.js';
import { createChartsController } from './ui-charts.js';
import { createDrillThroughController } from './ui-drill-through.js';
import { createImportController } from './ui-import.js';
import { createFiltersController } from './ui-filters.js';
import { createExportController } from './ui-export.js';

const state = createInitialState();
const dom = getDomRefs();
const charts = createChartsController({ dom, state });
const drillThrough = createDrillThroughController({ dom });
const importer = createImportController({ dom, state, executeOperationalBoundary, fetchMetadata });
const exporter = createExportController({ dom, state, executeOperationalBoundary, getOperationalPriority, buildInvestigativeSummary });
const filters = createFiltersController({ dom, state, executeOperationalBoundary, fetchMetadata, renderTable, runReport, exportReport: exporter.exportReport });

// ── Utilitários ──────────────────────────────────────────────────────────────

function normalizeOperationalError(error, operation = 'operação desconhecida') {
  const rawMessage = error?.message || (typeof error === 'string' ? error : 'Falha operacional inesperada.');
  const technical = {
    name: error?.name || 'OperationalError',
    message: String(rawMessage).slice(0, 240),
    code: error?.code || error?.status || null
  };

  return {
    message: 'Não foi possível concluir a operação. Tente novamente ou acione o suporte com o horário do erro.',
    technical,
    timestamp: new Date().toISOString(),
    operation
  };
}

function handleOperationalError(error, { operation, message } = {}) {
  const operationalError = normalizeOperationalError(error, operation);
  if (message) operationalError.message = message;
  showToast('error', operationalError.message);
  debugLog('Erro operacional controlado', operationalError);
  return operationalError;
}

async function executeOperationalBoundary(operation, action, options = {}) {
  try {
    return await action();
  } catch (error) {
    handleOperationalError(error, { operation, message: options.message });
    if (options.rethrow) throw error;
    return options.fallback;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  bindNavigation();
  importer.bindUpload();
  filters.bindFilters();
  bindSearch();
  bindDocumentationView(dom);
  dom.logoutBtn?.addEventListener('click', handleLogout);

  // Fronteira operacional do bootstrap: falha crítica interrompe o carregamento parcial.
  await executeOperationalBoundary('init', async () => {
    await requireLogin();
    await loadMasters({ force: true });
    await fetchMetadata();
  }, {
    message: 'Falha ao iniciar dados operacionais. Verifique a conexão e tente recarregar a página.',
    fallback: null
  });
}

// ── Auth gate ─────────────────────────────────────────────────────────────────

async function requireLogin() {
  // 1. Verificar sessão ativa (refresh automático do Supabase)
  const { data: { user } } = await api.getCurrentUser();
  if (user) {
    setLoggedInState(user);
    return;
  }
  // 2. Sem sessão ativa: exibir tela de login
  await showLoginGate();
}

function setLoggedInState(user) {
  state.user = user;
  const label = user.user_metadata?.username || user.email || 'Usuário';
  dom.userLabel.textContent = 'Olá, ' + label;
  dom.logoutBtn.classList.remove('hidden');
  dom.loginOverlay.classList.add('hidden');
}

function showLoginGate() {
  return new Promise((resolve) => {
    dom.loginOverlay.classList.remove('hidden');
    dom.loginUsername.focus();

    // Permite Enter no campo de senha
    dom.loginPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') dom.loginForm.requestSubmit();
    }, { once: false });

    dom.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      dom.loginError.classList.add('hidden');
      dom.loginBtn.disabled = true;
      dom.loginBtn.textContent = 'Verificando...';

      const username = dom.loginUsername.value.trim();
      const password = dom.loginPassword.value;

      const { data, error } = await api.signIn(username, password);

      if (error || !data?.user) {
        dom.loginError.classList.remove('hidden');
        dom.loginBtn.disabled = false;
        dom.loginBtn.innerHTML = '<i class="ri-login-circle-line"></i> Entrar';
        dom.loginPassword.value = '';
        dom.loginPassword.focus();
        return;
      }

      setLoggedInState(data.user);
      resolve();
    }, { once: true });
  });
}

async function handleLogout() {
  await api.signOut();
  state.user = null;
  dom.userLabel.textContent = 'Carregando...';
  dom.logoutBtn.classList.add('hidden');
  dom.loginForm.reset();
  dom.loginError.classList.add('hidden');
  dom.loginBtn.disabled = false;
  dom.loginBtn.innerHTML = '<i class="ri-login-circle-line"></i> Entrar';
  await showLoginGate();
  await loadMasters({ force: true });
}
async function loadMasters(options = {}) {
  const { force = false } = options;
  const masters = await api.getMasters();
  if (masters.error) {
    // Fail-fast: filtros sem tabelas de apoio podem induzir investigação incorreta.
    throw new Error(`Falha ao carregar tabelas de apoio: ${masters.error.message}`);
  }

  if (!force && state.masters.dicionario.length && !masters.dicionario?.length) return;

  state.masters = {
    origens: masters.origens || [],
    familias: masters.familias || [],
    agrupamentos: masters.agrupamentos || [],
    produtos: masters.produtos || [],
    dicionario: masters.dicionario || [],
    hierarquia: masters.hierarquia || []
  };

  updateProductSuggestions();

  const diagnosticoSemMapa = masters.diagnostico_sem_mapa || { status: 'ok', rows: [] };
  if (diagnosticoSemMapa.status === 'indisponivel') {
    dom.orphansCount.textContent = '!';
    if (dom.orphansMessage) {
      dom.orphansMessage.textContent = 'Não foi possível validar produtos sem agrupamento.';
    }
    dom.orphansBanner.classList.remove('hidden');
    debugLog('Diagnóstico operacional de órfãos indisponível', diagnosticoSemMapa.error?.details || {});
  } else {
    const orphanCount = diagnosticoSemMapa.rows?.length ?? 0;
    if (orphanCount > 0) {
      dom.orphansCount.textContent = orphanCount;
      if (dom.orphansMessage) {
        dom.orphansMessage.textContent = 'produto(s) sem categorização completa detectado(s). Categorize no Supabase antes de analisar para evitar dados ausentes nos filtros.';
      }
      dom.orphansBanner.classList.remove('hidden');
      debugLog('Diagnóstico operacional de órfãos', { orphanCount });
    } else {
      dom.orphansBanner.classList.add('hidden');
    }
  }

  fillSelect(dom.selO, state.masters.origens.map(x => ({ value: String(x.id), label: x.descricao })), { value: 'TODAS', label: 'TODAS' }, dom.selO.value || 'TODAS');
  filters.refreshCascade();
}

function updateProductSuggestions() {
  if (!dom.productSuggestions) return;
  dom.productSuggestions.innerHTML = state.masters.produtos
    .map(p => `<option value="${escapeHtml(p.codigo_produto)}">${escapeHtml(p.codigo_produto)} - ${escapeHtml(p.descricao || '')}</option>`)
    .join('');
}

async function fetchMetadata() {
  // PERF-03: loadMasters já foi chamado em init() — apenas repopula os selects
  fillSelect(
    dom.selO,
    state.masters.origens.map(item => ({ value: String(item.id), label: item.nome || item.descricao || String(item.id) })),
    { value: 'TODAS', label: 'TODAS' },
    dom.selO.value || 'TODAS'
  );
  fillSelect(
    dom.selF,
    state.masters.familias.map(item => ({ value: String(item.id), label: item.nome || item.descricao || String(item.id) })),
    { value: 'TODAS', label: 'TODAS' },
    dom.selF.value || 'TODAS'
  );
  fillSelect(
    dom.selI,
    state.masters.produtos.map(item => ({ value: String(item.codigo_produto), label: `${String(item.codigo_produto)} - ${item.descricao || '-'}` })),
    { value: 'TODOS', label: 'TODOS' },
    dom.selI.value || 'TODOS'
  );
  filters.refreshCascade();
}

// ── Navegação ─────────────────────────────────────────────────────────────────

function bindNavigation() {
  dom.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.viewTrigger;
      dom.navItems.forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      Object.values(dom.views).forEach(v => v.classList.add('hidden'));
      dom.views[view].classList.remove('hidden');
      if (view === 'report') {
        executeOperationalBoundary('carregar filtros ao abrir relatório', () => fetchMetadata(), {
          message: 'Falha ao atualizar filtros do relatório. Os filtros anteriores foram preservados.'
        });
      }
    });
  });
}

// ── Busca Direta (bypass da hierarquia) ───────────────────────────────────────

function bindSearch() {
  dom.searchProduct.addEventListener('change', () => {
    const raw = dom.searchProduct.value.trim();
    if (!raw) return;

    const code = normalizeCodigoProduto(raw.includes(' - ') ? raw.split(' - ')[0] : raw);
    const product = state.masters.produtos.find(p => normalizeCodigoProduto(p.codigo_produto) === code);

    if (product) {
      jumpToProduct(product.codigo_produto);
      dom.searchProduct.value = '';
    } else {
      showToast('warning', `Produto "${code}" não encontrado no cadastro.`);
    }
  });
}

function jumpToProduct(codigoProduto) {
  dom.selO.value = 'TODAS';
  dom.selF.value = 'TODAS';
  dom.selA.value = 'TODOS';

  const { familyOptions } = calculateCascadeOptions({ origem: 'TODAS', familia: 'TODAS' }, state.masters);
  fillSelect(dom.selF, familyOptions, { value: 'TODAS', label: 'TODAS' }, 'TODAS');

  const { groupOptions, productOptions } = calculateCascadeOptions(
    { origem: 'TODAS', familia: 'TODAS', agrupamento: 'TODOS' },
    state.masters
  );
  fillSelect(dom.selA, groupOptions, { value: 'TODOS', label: 'TODOS' }, 'TODOS');
  fillSelect(dom.selI, productOptions, { value: 'TODOS', label: 'TODOS' }, codigoProduto);

  filters.autoRefreshReport();
}

// ── Relatório principal ───────────────────────────────────────────────────────

async function runReport(options = {}) {
  const { silent = false, selectedProduct = null } = options;
  const start = dom.dtStart.value;
  const end = dom.dtEnd.value;
  if (!start || !end) {
    if (!silent) showToast('warning', 'Informe período inicial e final.');
    return;
  }

  // Fronteira operacional do relatório: falhas críticas não devem quebrar a tela.
  await executeOperationalBoundary('executar relatório investigativo', async () => {
    const { data, error } = await api.getHistorico({
      start,
      end,
      origem: dom.selO.value,
      familia: dom.selF.value,
      agrupamento: dom.selA.value,
      item: dom.selI.value
    });
    if (error) throw new Error(error.message || 'Erro na consulta do histórico de custos.');
    if (!data?.length) {
      dom.reportContent.classList.add('hidden');
      if (!silent) showToast('info', 'Sem dados para os filtros selecionados.');
      return;
    }

    const rows = buildReportRows(data, state.masters);
    const hasSingleItemAnalysis = rows.length === 1;
    const kpis = calculateKpis(rows);

    dom.kpiItens.textContent = kpis.totalItens;
    dom.kpiAlertas.textContent = kpis.totalAlertas;
    dom.kpiRegime.textContent = kpis.mudancasRegime;
    dom.kpiMedia.textContent = `${kpis.mediaVariacao.toFixed(2).replace('.', ',')}%`;

    const chartFilters = {
      start, end,
      origem: dom.selO.value,
      familia: dom.selF.value,
      agrupamento: dom.selA.value,
      item: dom.selI.value
    };

    // Degradação controlada: a fila investigativa continua mesmo sem gráficos auxiliares.
    const hasImportComparison = await executeOperationalBoundary(
      'renderizar comparação entre importações',
      () => charts.renderImportComparisonChart(chartFilters),
      { message: 'Relatório carregado, mas a comparação entre importações ficou indisponível.', fallback: false }
    );

    await executeOperationalBoundary(
      'renderizar top variações',
      () => charts.renderTopVariationsPanel(chartFilters),
      { message: 'Relatório carregado, mas o painel TOP VARIAÇÕES ficou indisponível.' }
    );

    state.reportRows = rows;
    filters.applyTableView({ hasSingleItemAnalysis });

    const hasTrendData = await executeOperationalBoundary(
      'renderizar análise temporal',
      () => charts.renderTemporalAnalysis(data, {
        origem: dom.selO.value,
        familia: dom.selF.value,
        agrupamento: dom.selA.value,
        item: selectedProduct || dom.selI.value
      }),
      { message: 'Relatório carregado, mas a análise temporal ficou indisponível.', fallback: false }
    );

    charts.applyReportLayout({ hasSingleItemAnalysis, hasImportComparison, hasTrendData });
    dom.reportContent.classList.remove('hidden');
  }, {
    message: 'Falha ao executar relatório. O contexto atual foi preservado para nova tentativa.'
  });
}

// ── Tabela analítica ──────────────────────────────────────────────────────────

function renderTable(rows, _options = {}) {
  dom.tableBody.innerHTML = rows.map(row => {
    const prioridade = getOperationalPriority(row);
    const contexto = buildInvestigativeSummary(row);
    return `
      <tr class="investigation-row ${isAlertaCritico(row) ? 'row-alert' : row.mudouRegime ? 'row-regime' : ''}" data-codigo="${escapeHtml(row.codigo)}" data-row-type="main">
        <td>
          <div class="product-main"><strong>${escapeHtml(row.codigo)}</strong><small>${escapeHtml(row.descricao)}</small></div>
        </td>
        <td>${formatDiffCell(row.diferenca, row.variacaoTemporal)} <span class="muted-inline">(${row.variacao.toFixed(2)}%)</span></td>
        <td><span class="badge priority ${prioridade.className}" title="${prioridade.reason}">${prioridade.label}</span></td>
        <td><span class="badge regime ${row.mudouRegime ? 'regime-change-strong' : 'regime-stable'}">${row.mudouRegime ? '⚡ Mudança de regime' : row.classificacaoInstabilidade}</span></td>
        <td class="summary-cell">${contexto}</td>
        <td><button type="button" class="btn-outline btn-sm row-details-toggle" data-codigo="${escapeHtml(row.codigo)}">Detalhes</button></td>
      </tr>
      <tr class="details-row hidden" data-details-for="${escapeHtml(row.codigo)}">
        <td colspan="6">
          <div class="details-grid">
            <span><strong>Último custo:</strong> ${formatCurrencyCell(row.ultimoCusto)}</span>
            <span><strong>Penúltimo custo:</strong> ${formatCurrencyCell(row.penultimoCusto)}</span>
            <span><strong>Custo inicial:</strong> R$ ${formatCurrencyBRL(row.inicial)}</span>
            <span><strong>Custo final:</strong> R$ ${formatCurrencyBRL(row.final)}</span>
            <span><strong>Importado em (criado_em):</strong> ${formatDateTimeBR(row.ultimaAtualizacao)}</span>
            <span><strong>Competência (data_referencia):</strong> ${row.dataCompetencia ? formatDateBR(row.dataCompetencia) : '-'}</span>
            <span><strong>Score instabilidade:</strong> ${row.scoreInstabilidade.toFixed(2)}%</span>
            <span><strong>Classificação:</strong> ${row.classificacaoInstabilidade}</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  dom.tableBody.querySelectorAll('tr[data-row-type="main"]').forEach(tr => {
    tr.addEventListener('click', async event => {
      if (event.target.closest('.row-details-toggle')) return;
      const codigo = tr.dataset.codigo;
      await executeOperationalBoundary('drill-through do produto', () => drillThrough.renderDrillThrough(codigo), {
        message: 'Falha ao carregar o histórico completo do produto.'
      });
      await runReport({ silent: true, selectedProduct: codigo });
    });
  });

  dom.tableBody.querySelectorAll('.row-details-toggle').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const detailsRow = dom.tableBody.querySelector(`tr[data-details-for="${btn.dataset.codigo}"]`);
      if (!detailsRow) return;
      detailsRow.classList.toggle('hidden');
      btn.textContent = detailsRow.classList.contains('hidden') ? 'Detalhes' : 'Ocultar';
    });
  });
}


function getOperationalPriority(row) {
  const absVariacao = Math.abs(Number(row.variacao || 0));
  const reincidencia = isAlertaCritico(row);
  if (row.mudouRegime || row.classificacaoInstabilidade === 'MUITO INSTÁVEL' || absVariacao >= 20) {
    return { label: '🔴 Crítico', className: 'critical', reason: 'Mudança de regime, instabilidade extrema ou variação muito alta.' };
  }
  if (isAlertaCritico(row) || absVariacao >= 10 || row.classificacaoInstabilidade === 'OSCILANDO') {
    return { label: '🟠 Atenção', className: 'attention', reason: 'Variação relevante com potencial impacto operacional.' };
  }
  if (reincidencia || absVariacao >= 3) {
    return { label: '🟡 Monitorar', className: 'monitor', reason: 'Oscilação recorrente de menor magnitude.' };
  }
  return { label: '🟢 Estável', className: 'stable', reason: 'Sem sinais relevantes de anomalia no período.' };
}

function buildInvestigativeSummary(row) {
  const signals = [];
  if (row.mudouRegime) signals.push('Mudou regime após estabilidade longa.');
  if ((row.variacao ?? 0) > 0 && (row.variacaoTemporal ?? 0) > 0) signals.push('2ª alta consecutiva entre importações.');
  if ((row.variacao ?? 0) < 0 && (row.variacaoTemporal ?? 0) < 0) signals.push('2ª queda consecutiva entre importações.');
  if (Math.abs(Number(row.variacao || 0)) > Math.abs(Number(row.variacaoTemporal || 0)) + 2 && row.classificacaoInstabilidade !== 'ESTÁVEL') {
    signals.push('Oscilação crescente no recorte atual.');
  }
  if (signals.length) return signals.slice(0, 2).join(' ');
  if (row.mudouRegime) return 'Mudou regime após fase estável; priorizar investigação temporal.';
  if (row.classificacaoInstabilidade === 'MUITO INSTÁVEL') return 'Oscilação crescente com comportamento instável no período.';
  if (Math.abs(Number(row.variacao || 0)) >= 10) return `Variação expressiva de ${row.variacao.toFixed(2)}% no recorte analisado.`;
  if (isAlertaCritico(row)) return 'Nova variação relevante na última importação (reincidência).';
  return 'Comportamento sem ruptura relevante; manter monitoramento contínuo.';
}

function formatCurrencyCell(value) {
  if (value === null || value === undefined) return '-';
  return `R$ ${formatCurrencyBRL(value)}`;
}

function formatDiffCell(diferenca, variacao) {
  if (diferenca === null || diferenca === undefined) return '-';
  const variacaoText = Number.isFinite(variacao) ? ` (${variacao.toFixed(2)}%)` : '';
  return `${diferenca >= 0 ? '+' : '-'}R$ ${formatCurrencyBRL(Math.abs(diferenca))}${variacaoText}`;
}

init();
