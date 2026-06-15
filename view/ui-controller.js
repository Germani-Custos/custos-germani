/* Responsabilidade: controle de interface, eventos, gráficos e fluxo investigativo. */
import { api } from '../src/services/api.js';
import { readWorkbook, scanHeaders, countValidMappedColumns, REQUIRED_FIELDS, parseBrazilianNumber, formatBrazilianFinancial, normalizeCodigoProduto } from '../core/spreadsheet-engine.js';
import { fillSelect, calculateCascadeOptions, buildReportRows, calculateKpis, isAlertaCritico, filterAlertRows } from '../core/report-engine.js';
import { createInitialState } from './ui-state.js';
import { getDomRefs } from './ui-dom.js';
import { debugLog } from '../src/config/app-config.js';
import { debounce, escapeHtml, formatCurrencyBRL, formatDateTimeBR, formatDateBR, showToast } from './ui-utils.js';
import { bindDocumentationView } from './documentation-controller.js';

const state = createInitialState();
const dom = getDomRefs();

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
  bindUpload();
  bindFilters();
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

  const orphanCount = masters.diagnostico_sem_mapa?.length ?? 0;
  if (orphanCount > 0) {
    dom.orphansCount.textContent = orphanCount;
    dom.orphansBanner.classList.remove('hidden');
    debugLog('Diagnóstico operacional de órfãos', { orphanCount });
  } else {
    dom.orphansBanner.classList.add('hidden');
  }

  fillSelect(dom.selO, state.masters.origens.map(x => ({ value: String(x.id), label: x.descricao })), { value: 'TODAS', label: 'TODAS' }, dom.selO.value || 'TODAS');
  refreshCascade();
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
  refreshCascade();
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

// ── Importação ────────────────────────────────────────────────────────────────

function bindUpload() {
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());
  dom.dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') dom.fileInput.click();
  });

  dom.fileInput.addEventListener('change', async () => {
    if (dom.fileInput.files?.[0]) {
      await executeOperationalBoundary('importação via seletor de arquivo', () => handleImport(dom.fileInput.files[0]), {
        message: 'Falha ao importar a planilha. Confira o arquivo e tente novamente.'
      });
    }
  });

  ['dragenter', 'dragover'].forEach(evt => {
    dom.dropZone.addEventListener(evt, (e) => { e.preventDefault(); dom.dropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dom.dropZone.addEventListener(evt, (e) => { e.preventDefault(); dom.dropZone.classList.remove('dragover'); });
  });
  dom.dropZone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await executeOperationalBoundary('importação por arrastar arquivo', () => handleImport(file), {
        message: 'Falha ao importar a planilha. Confira o arquivo e tente novamente.'
      });
    }
  });
}

async function handleImport(file) {
  const refDate = dom.importDate.value;
  if (!refDate) {
    showToast('warning', 'Selecione a data de referência (competência).');
    return;
  }

  dom.dropZone.classList.add('processing');
  try {
    const rows = readWorkbook(await file.arrayBuffer());
    const { headers, mapping: detectedMapping } = scanHeaders(rows);
    const mapping = await confirmColumnMapping(headers, detectedMapping);
    if (!mapping) return;
    state.importMapping = { ...mapping };

    if (countValidMappedColumns(mapping) < REQUIRED_FIELDS.length) {
      showToast('error', 'Todos os 5 campos obrigatórios devem ser mapeados antes do envio.');
      return;
    }

    const preview = buildImportPreview(rows, state.importMapping, state.masters.produtos || []);
    const confirmed = await confirmImportPreview(preview, countValidMappedColumns(mapping));
    if (!confirmed) return;

    const payload = preview.validRows.map(row => ({
      codigo_produto: row.codigo_produto,
      descricao: row.descricao,
      custo_variavel: row.custo_variavel,
      custo_direto_fixo: row.custo_direto_fixo,
      custo_total: row.custo_total,
      data_referencia: refDate
    }));

    const { data: resultadoImportacao, error } = await api.importarHistoricoCustosComLog(payload, {
      dataReferencia: refDate
    });
    if (error) {
      showToast('error', `Erro na importação: ${error.message}`);
      return;
    }

    const resumo = resultadoImportacao?.resumo || { total_linhas: payload.length, linhas_importadas: payload.length, linhas_erro: 0 };
    if (resultadoImportacao?.log_error) {
      debugLog('Falha controlada ao registrar log da importação', { message: resultadoImportacao.log_error?.message || String(resultadoImportacao.log_error) });
    }

    const successCount = Number(resumo.linhas_importadas || 0);
    const errorCount = Number(resumo.linhas_erro || 0);
    const successMessage = `${successCount} itens importados com sucesso`;
    showToast('success', successMessage);
    await Swal.fire({
      icon: errorCount > 0 ? 'warning' : 'success',
      title: successMessage,
      html: `
        <div style="text-align:left;">
          <p><b>Total de linhas:</b> ${resumo.total_linhas}</p>
          <p><b>Importadas:</b> ${successCount}</p>
          <p><b>Falhas:</b> ${errorCount}</p>
          ${errorCount > 0 ? `<p><b>${errorCount} itens falharam</b></p>` : ''}
        </div>
      `
    });

    await executeOperationalBoundary('recarregar filtros após importação', () => fetchMetadata(), {
      message: 'Importação concluída, mas não foi possível atualizar os filtros automaticamente.'
    });
  } finally {
    dom.dropZone.classList.remove('processing');
  }
}

function buildImportPreview(rows, mapping, produtos = []) {
  const produtoSet = new Set((produtos || []).map(item => normalizeCodigoProduto(item.codigo_produto)).filter(Boolean));
  const statuses = { valid: 0, warning: 0, error: 0 };
  const normalizacoes = [];
  const analyzedRows = rows.map((row, index) => {
    const codigoOriginal = row[mapping.codigo_produto];
    const codigo = normalizeCodigoProduto(codigoOriginal);
    const descricao = String(row[mapping.descricao] || '').trim();
    const custoVariavel = parseBrazilianNumber(row[mapping.custo_variavel]);
    const custoDiretoFixo = parseBrazilianNumber(row[mapping.custo_direto_fixo]);
    const custoTotal = parseBrazilianNumber(row[mapping.custo_total]);
    const issues = [];

    if (!codigo) issues.push({ level: 'error', text: 'Produto inválido ou ausente' });
    if (codigo && String(codigoOriginal ?? '').trim() !== codigo) {
      normalizacoes.push({ linha: index + 1, antes: String(codigoOriginal ?? '').slice(0, 40), depois: codigo });
    }
    if (codigo && !produtoSet.has(codigo)) issues.push({ level: 'warning', text: 'Produto não encontrado no cadastro' });
    if (!descricao) issues.push({ level: 'error', text: 'Descrição vazia' });
    if (custoVariavel < 0 || custoDiretoFixo < 0 || custoTotal < 0) issues.push({ level: 'warning', text: 'Valor negativo' });
    if (custoTotal === 0) issues.push({ level: 'warning', text: 'Custo total zerado' });
    if ((String(row[mapping.custo_total] || '').trim()) && custoTotal === 0) issues.push({ level: 'warning', text: 'Número convertido para 0' });

    const hasError = issues.some(issue => issue.level === 'error');
    const hasWarning = issues.some(issue => issue.level === 'warning');
    const status = hasError ? 'error' : (hasWarning ? 'warning' : 'valid');
    statuses[status] += 1;

    return {
      index: index + 1,
      codigo_produto: codigo,
      descricao,
      custo_variavel: custoVariavel,
      custo_direto_fixo: custoDiretoFixo,
      custo_total: custoTotal,
      status,
      issues
    };
  });

  if (normalizacoes.length) {
    debugLog('Normalização de código de produto no preview de importação', {
      total: normalizacoes.length,
      amostras: normalizacoes.slice(0, 5)
    });
  }

  return {
    rows: analyzedRows,
    validRows: analyzedRows.filter(row => row.status !== 'error'),
    statuses
  };
}

async function confirmImportPreview(preview, totalColunasValidas) {
  const previewRows = preview.rows.slice(0, 20).map(row => {
    const statusIcon = row.status === 'valid' ? '🟢 válida' : row.status === 'warning' ? '🟡 atenção' : '🔴 erro';
    return `
      <tr>
        <td>${row.index}</td>
        <td>${escapeHtml(row.codigo_produto)}</td>
        <td>${escapeHtml(row.descricao)}</td>
        <td>${formatBrazilianFinancial(row.custo_variavel)}</td>
        <td>${formatBrazilianFinancial(row.custo_direto_fixo)}</td>
        <td>${formatBrazilianFinancial(row.custo_total)}</td>
        <td>${statusIcon}<br><small>${escapeHtml(row.issues.map(item => item.text).join('; ') || 'OK')}</small></td>
      </tr>
    `;
  }).join('');

  const result = await Swal.fire({
    icon: 'question',
    title: 'Preview da importação',
    width: 1100,
    html: `
      <p>Colunas válidas: <b>${totalColunasValidas}/5</b> | Linhas: <b>${preview.rows.length}</b> | 🟢 ${preview.statuses.valid} | 🟡 ${preview.statuses.warning} | 🔴 ${preview.statuses.error}</p>
      <div style="max-height:360px; overflow:auto; text-align:left;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <thead><tr><th>#</th><th>Produto</th><th>Descrição</th><th>C. Variável</th><th>C. Direto Fixo</th><th>C. Total</th><th>Status</th></tr></thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>
      <p style="margin-top:10px;">Somente linhas sem erro serão gravadas.</p>
    `,
    showCancelButton: true,
    confirmButtonText: `Confirmar importação (${preview.validRows.length} linhas)`,
    cancelButtonText: 'Cancelar'
  });

  return result.isConfirmed;
}

function getFieldLabel(field) {
  const labels = {
    codigo_produto: 'Produto',
    descricao: 'Descrição',
    custo_variavel: 'Custo Variável',
    custo_direto_fixo: 'Custo Direto Fixo',
    custo_total: 'Custo Total'
  };
  return labels[field] || field;
}

function buildMappingSelect(field, headers = []) {
  const options = headers
    .map(header => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`)
    .join('');

  return `
    <div style="text-align:left; margin-bottom: 10px;">
      <label for="map_${field}" style="display:block; font-weight:600; margin-bottom:4px;">
        ${getFieldLabel(field)}
      </label>
      <select id="map_${field}" class="swal2-select" style="width:100%; margin:0;">
        <option value="">Selecione uma coluna</option>
        ${options}
      </select>
    </div>
  `;
}

async function confirmColumnMapping(headers, detectedMapping) {
  if (!headers.length) {
    showToast('error', 'Nenhum cabeçalho foi encontrado na planilha.');
    return null;
  }

  const html = REQUIRED_FIELDS.map(field => buildMappingSelect(field, headers)).join('');
  const result = await Swal.fire({
    icon: 'info',
    title: 'Confirmar mapeamento de colunas',
    html,
    confirmButtonText: 'Confirmar mapeamento',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    focusConfirm: false,
    didOpen: () => {
      REQUIRED_FIELDS.forEach(field => {
        const select = document.getElementById(`map_${field}`);
        if (select && detectedMapping[field]) select.value = detectedMapping[field];
      });
    },
    preConfirm: () => {
      const mapping = REQUIRED_FIELDS.reduce((acc, field) => {
        const select = document.getElementById(`map_${field}`);
        acc[field] = select?.value || null;
        return acc;
      }, {});

      const missingFields = REQUIRED_FIELDS.filter(field => !mapping[field]);
      if (missingFields.length) {
        Swal.showValidationMessage(`Preencha todos os campos: ${missingFields.map(getFieldLabel).join(', ')}.`);
        return false;
      }
      return mapping;
    }
  });

  return result.isConfirmed ? result.value : null;
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

  autoRefreshReport();
}

// ── Filtros em cascata ────────────────────────────────────────────────────────

function bindFilters() {
  dom.selO.addEventListener('change', () => refreshCascade('origem'));
  dom.selF.addEventListener('change', () => refreshCascade('familia'));
  dom.selA.addEventListener('change', () => refreshCascade('agrupamento'));
  dom.selI.addEventListener('change', () => autoRefreshReport());
  [dom.dtStart, dom.dtEnd].forEach(input => input.addEventListener('change', () => autoRefreshReport()));
  dom.analyzeBtn.addEventListener('click', () => runReport());
  dom.exportBtn.addEventListener('click', () => exportReport());
  dom.drillClose.addEventListener('click', () => dom.drillPanel.classList.add('hidden'));
  bindInteractiveTableControls();

  if (state.unsubscribeFiltersRealtime) state.unsubscribeFiltersRealtime();
  state.unsubscribeFiltersRealtime = api.subscribeFiltrosRealtime(
    debounce(async () => {
      // Degradação controlada: mantém filtros atuais se o realtime disparar durante instabilidade.
      await executeOperationalBoundary('atualização realtime de filtros', () => fetchMetadata(), {
        message: 'Falha ao atualizar filtros em tempo real. Mantendo o contexto atual.'
      });
    }, 2000)
  );
}

function bindInteractiveTableControls() {
  dom.kpiCards.forEach(card => {
    card.addEventListener('click', () => {
      state.reportView.quickFilter = card.dataset.kpiFilter || 'all';
      applyTableView();
    });
  });
  document.querySelectorAll('th[data-sort-key]').forEach(th => {
    th.addEventListener('click', () => {
      const nextKey = th.dataset.sortKey;
      if (state.reportView.sortKey === nextKey) {
        state.reportView.sortDirection = state.reportView.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.reportView.sortKey = nextKey;
        state.reportView.sortDirection = 'desc';
      }
      applyTableView();
    });
  });
}

function refreshCascade(trigger) {
  const currentFamily = dom.selF.value || 'TODAS';
  const currentGroup = dom.selA.value || 'TODOS';
  const currentItem = dom.selI.value || 'TODOS';

  if (trigger === 'origem') {
    dom.selF.value = 'TODAS';
    dom.selA.value = 'TODOS';
    dom.selI.value = 'TODOS';
  }
  if (trigger === 'familia') {
    dom.selA.value = 'TODOS';
    dom.selI.value = 'TODOS';
  }
  if (trigger === 'agrupamento') {
    dom.selI.value = 'TODOS';
  }

  const familyValue = trigger === 'origem' ? 'TODAS' : currentFamily;
  const { familyOptions } = calculateCascadeOptions({ origem: dom.selO.value, familia: familyValue }, state.masters);
  fillSelect(dom.selF, familyOptions, { value: 'TODAS', label: 'TODAS' }, familyValue);

  const { groupOptions, productOptions } = calculateCascadeOptions({
    origem: dom.selO.value,
    familia: dom.selF.value || 'TODAS',
    agrupamento: dom.selA.value || 'TODOS'
  }, state.masters);
  const groupValue = ['origem', 'familia'].includes(trigger) ? 'TODOS' : currentGroup;
  const itemValue = ['origem', 'familia', 'agrupamento'].includes(trigger) ? 'TODOS' : currentItem;
  fillSelect(dom.selA, groupOptions, { value: 'TODOS', label: 'TODOS' }, groupValue);
  fillSelect(dom.selI, productOptions, { value: 'TODOS', label: 'TODOS' }, itemValue);
  autoRefreshReport();
}

function autoRefreshReport() {
  if (dom.dtStart.value && dom.dtEnd.value) {
    runReport({ silent: true });
  }
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
      () => renderImportComparisonChart(chartFilters),
      { message: 'Relatório carregado, mas a comparação entre importações ficou indisponível.', fallback: false }
    );

    await executeOperationalBoundary(
      'renderizar top variações',
      () => renderTopVariationsPanel(chartFilters),
      { message: 'Relatório carregado, mas o painel TOP VARIAÇÕES ficou indisponível.' }
    );

    state.reportRows = rows;
    applyTableView({ hasSingleItemAnalysis });

    const hasTrendData = await executeOperationalBoundary(
      'renderizar análise temporal',
      () => renderTemporalAnalysis(data, {
        origem: dom.selO.value,
        familia: dom.selF.value,
        agrupamento: dom.selA.value,
        item: selectedProduct || dom.selI.value
      }),
      { message: 'Relatório carregado, mas a análise temporal ficou indisponível.', fallback: false }
    );

    applyReportLayout({ hasSingleItemAnalysis, hasImportComparison, hasTrendData });
    dom.reportContent.classList.remove('hidden');
  }, {
    message: 'Falha ao executar relatório. O contexto atual foi preservado para nova tentativa.'
  });
}

// ── Tabela analítica ──────────────────────────────────────────────────────────

function getRowsMatchingQuickFilter(rows, operation) {
  if (state.reportView.quickFilter === 'alerts') return filterAlertRows(rows, { operation });
  if (state.reportView.quickFilter === 'positive') return rows.filter(row => row.variacao > 0);
  if (state.reportView.quickFilter === 'regime') return rows.filter(row => row.mudouRegime === true);
  return rows;
}

function applyTableView(options = {}) {
  const { hasSingleItemAnalysis = false } = options;
  const filteredRows = getRowsMatchingQuickFilter(state.reportRows, 'filtro rápido Alertas (>5%)');
  const sortedRows = [...filteredRows].sort((a, b) => compareRowsBySort(a, b, state.reportView.sortKey, state.reportView.sortDirection));
  renderTable(sortedRows, { hasSingleItemAnalysis });
  renderActiveFilterChips();
  updateKpiCardState();
  updateSortHeaderState();
}

function renderActiveFilterChips() {
  if (!dom.activeFilterChips) return;
  const chips = [];
  const pushChip = (key, label, value) => value && value !== 'TODAS' && value !== 'TODOS' && chips.push({ key, label, value });
  pushChip('dtStart', 'Início', dom.dtStart.value);
  pushChip('dtEnd', 'Fim', dom.dtEnd.value);
  pushChip('origem', 'Origem', dom.selO.options[dom.selO.selectedIndex]?.textContent);
  pushChip('familia', 'Família', dom.selF.options[dom.selF.selectedIndex]?.textContent);
  pushChip('agrupamento', 'Agrupamento', dom.selA.options[dom.selA.selectedIndex]?.textContent);
  pushChip('item', 'Produto', dom.selI.value);
  if (state.reportView.quickFilter !== 'all') {
    const quickLabels = { alerts: 'Alertas >5%', positive: 'Variação positiva', regime: 'Mudança de regime' };
    chips.push({ key: 'quickFilter', label: 'Fila', value: quickLabels[state.reportView.quickFilter] || 'Filtro rápido' });
  }
  if (!chips.length) {
    dom.activeFilterChips.classList.add('hidden');
    dom.activeFilterChips.innerHTML = '';
    return;
  }
  dom.activeFilterChips.classList.remove('hidden');
  dom.activeFilterChips.innerHTML = chips.map(chip => `
    <button type="button" class="filter-chip" data-chip-key="${chip.key}">
      <span>${escapeHtml(chip.label)}: ${escapeHtml(chip.value)}</span><i class="ri-close-line"></i>
    </button>
  `).join('');
  dom.activeFilterChips.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => removeFilterChip(btn.dataset.chipKey));
  });
}

function removeFilterChip(chipKey) {
  if (chipKey === 'dtStart') dom.dtStart.value = '';
  if (chipKey === 'dtEnd') dom.dtEnd.value = '';
  if (chipKey === 'origem') dom.selO.value = 'TODAS';
  if (chipKey === 'familia') dom.selF.value = 'TODAS';
  if (chipKey === 'agrupamento') dom.selA.value = 'TODOS';
  if (chipKey === 'item') dom.selI.value = 'TODOS';
  if (chipKey === 'quickFilter') state.reportView.quickFilter = 'all';
  if (['origem', 'familia', 'agrupamento', 'item'].includes(chipKey)) refreshCascade();
  runReport({ silent: true });
}

function compareRowsBySort(a, b, key, direction) {
  const order = direction === 'asc' ? 1 : -1;
  const valueA = a?.[key];
  const valueB = b?.[key];
  if (key === 'alert' || key === 'mudouRegime') return ((valueA ? 1 : 0) - (valueB ? 1 : 0)) * order;
  if (typeof valueA === 'number' || typeof valueB === 'number') return ((Number(valueA) || 0) - (Number(valueB) || 0)) * order;
  return String(valueA || '').localeCompare(String(valueB || ''), 'pt-BR') * order;
}

function updateKpiCardState() {
  dom.kpiCards.forEach(card => {
    card.classList.toggle('active', card.dataset.kpiFilter === state.reportView.quickFilter);
  });
}

function updateSortHeaderState() {
  document.querySelectorAll('th[data-sort-key]').forEach(th => {
    th.classList.toggle('sort-active', th.dataset.sortKey === state.reportView.sortKey);
  });
}

function renderTable(rows, options = {}) {
  const { hasSingleItemAnalysis = false } = options;
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
      await executeOperationalBoundary('drill-through do produto', () => renderDrillThrough(codigo), {
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

function getInstabilityClass(classificacao) {
  if (classificacao === 'ESTÁVEL') return 'stable';
  if (classificacao === 'OSCILANDO') return 'oscillating';
  return 'unstable';
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

// ── Drill-through: histórico completo de importações ─────────────────────────

async function renderDrillThrough(codigoProduto) {
  const { data: history, error } = await api.getProductHistory(codigoProduto);
  if (error) {
    showToast('error', 'Falha ao carregar histórico do produto.');
    return;
  }
  if (!history?.length) {
    showToast('info', 'Sem histórico para este produto.');
    return;
  }

  const descricao = history[history.length - 1]?.descricao || '';
  dom.drillTitle.textContent = `${escapeHtml(codigoProduto)} — ${escapeHtml(descricao)}`;
  dom.drillSubtitle.textContent = `${history.length} registro(s) no histórico total · clique em uma linha para ver detalhes`;

  dom.drillBody.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Competência</th>
          <th>Importado em</th>
          <th>Custo Variável</th>
          <th>Custo Direto Fixo</th>
          <th>Custo Total</th>
          <th>Δ vs anterior</th>
          <th>Δ%</th>
        </tr>
      </thead>
      <tbody>
        ${history.map(row => {
          const isAlert = isAlertaCritico({ deltaPerc: row.deltaPerc });
          const deltaText = row.delta !== null
            ? `${row.delta >= 0 ? '+' : ''}R$ ${formatCurrencyBRL(Math.abs(row.delta))}`
            : '—';
          const deltaPercText = row.deltaPerc !== null
            ? `${row.deltaPerc >= 0 ? '+' : ''}${row.deltaPerc.toFixed(2)}%`
            : '—';
          const deltaClass = row.delta === null ? 'delta-neutral'
            : row.delta > 0 ? 'delta-up'
            : row.delta < 0 ? 'delta-down'
            : 'delta-neutral';
          return `
            <tr class="${isAlert ? 'row-alert' : ''}">
              <td><strong>${formatDateBR(row.data_referencia)}</strong></td>
              <td>${formatDateTimeBR(row.criado_em)}</td>
              <td>R$ ${formatCurrencyBRL(row.custo_variavel)}</td>
              <td>R$ ${formatCurrencyBRL(row.custo_direto_fixo)}</td>
              <td><strong>R$ ${formatCurrencyBRL(row.custo_total)}</strong></td>
              <td class="${deltaClass}">${deltaText}</td>
              <td class="${isAlert ? deltaClass : ''}">${deltaPercText}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  dom.drillPanel.classList.remove('hidden');
  dom.drillPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


function getInvestigationRankScore(row) {
  const prioridade = getOperationalPriority(row);
  const criticidadePeso = { '🔴 Crítico': 4, '🟠 Atenção': 3, '🟡 Monitorar': 2, '🟢 Estável': 1 }[prioridade.label] || 1;
  const regimePeso = row.mudouRegime ? 1 : 0;
  const magnitude = Math.abs(Number(row.variacaoTemporal ?? row.variacao ?? 0));
  const reincidencia = isAlertaCritico(row) ? 1 : 0;
  const instabilidade = Number(row.scoreInstabilidade || 0);
  return { criticidadePeso, regimePeso, magnitude, reincidencia, instabilidade };
}

function compareByInvestigativePriority(a, b) {
  const ra = getInvestigationRankScore(a);
  const rb = getInvestigationRankScore(b);
  if (rb.criticidadePeso !== ra.criticidadePeso) return rb.criticidadePeso - ra.criticidadePeso;
  if (rb.regimePeso !== ra.regimePeso) return rb.regimePeso - ra.regimePeso;
  if (rb.magnitude !== ra.magnitude) return rb.magnitude - ra.magnitude;
  if (rb.reincidencia !== ra.reincidencia) return rb.reincidencia - ra.reincidencia;
  if (rb.instabilidade !== ra.instabilidade) return rb.instabilidade - ra.instabilidade;
  return String(a.codigo || '').localeCompare(String(b.codigo || ''), 'pt-BR');
}

function getRowsFromCurrentInvestigationState() {
  const filteredRows = getRowsMatchingQuickFilter(state.reportRows, 'exportação da fila investigativa');

  const hasManualSort = state.reportView.sortKey && state.reportView.sortKey !== 'variacao';
  if (hasManualSort) {
    return [...filteredRows].sort((a, b) => compareRowsBySort(a, b, state.reportView.sortKey, state.reportView.sortDirection));
  }

  return [...filteredRows].sort(compareByInvestigativePriority);
}

function buildExportFilename() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const periodStart = dom.dtStart.value || 'inicio';
  const periodEnd = dom.dtEnd.value || 'fim';
  return `auditoria_criticos_${periodStart}_a_${periodEnd}_${yyyy}${mm}${dd}.xlsx`;
}

// ── Exportação ────────────────────────────────────────────────────────────────

// SEC-04: sanitiza campos de texto para evitar formula injection no Excel/Sheets.
// Prefixar com ' previne que valores como =CMD, +CMD sejam interpretados como fórmula.
function sanitizeCsvFormula(value) {
  const str = String(value ?? '');
  if ([' =', '+', '-', '@', '\t', '\r'].some(ch => str.startsWith(ch)) || str.startsWith('=')) {
    return "'" + str;
  }
  return str;
}

function exportReport() {
  if (!state.reportRows.length) {
    showToast('warning', 'Rode a análise antes de exportar.');
    return;
  }

  // Fronteira operacional da exportação: mantém a análise atual mesmo se XLSX falhar.
  executeOperationalBoundary('exportar relatório investigativo', async () => {
    const investigationRows = getRowsFromCurrentInvestigationState();
    const filtrosAtivos = [
      `Origem: ${dom.selO.options[dom.selO.selectedIndex]?.textContent || 'TODAS'}`,
      `Família: ${dom.selF.options[dom.selF.selectedIndex]?.textContent || 'TODAS'}`,
      `Agrupamento: ${dom.selA.options[dom.selA.selectedIndex]?.textContent || 'TODOS'}`,
      `Produto: ${dom.selI.value || 'TODOS'}`,
      `Fila: ${state.reportView.quickFilter}`
    ].join(' | ');

    const metadataRows = [
      { Campo: 'Tipo de relatório', Valor: 'Relatório Investigativo Operacional de Custos' },
      { Campo: 'Gerado em (criado_em do relatório)', Valor: new Date().toISOString() },
      { Campo: 'Período de competência (data_referencia)', Valor: `${dom.dtStart.value || '-'} até ${dom.dtEnd.value || '-'}` },
      { Campo: 'Filtros ativos', Valor: filtrosAtivos },
      { Campo: 'Ordenação aplicada', Valor: 'Criticidade > Mudança de regime > Magnitude > Reincidência > Instabilidade (ou ordenação ativa manual)' },
      { Campo: 'Total de itens exportados', Valor: String(investigationRows.length) }
    ];

    const exportData = investigationRows.map((row, idx) => {
      const prioridade = getOperationalPriority(row);
      const rank = getInvestigationRankScore(row);
      return {
        'Prioridade #': idx + 1,
        'Produto (código)': sanitizeCsvFormula(row.codigo),
        'Produto (descrição)': sanitizeCsvFormula(row.descricao),
        'Criticidade': prioridade.label,
        'Mudança de regime': row.mudouRegime ? 'SIM' : 'NÃO',
        'Variação da última importação (%)': row.variacaoTemporal !== null ? row.variacaoTemporal.toFixed(2) : '—',
        'Variação no período (%)': row.variacao.toFixed(2),
        'Delta monetário última importação (R$)': row.diferenca ?? '—',
        'Contexto investigativo': sanitizeCsvFormula(buildInvestigativeSummary(row)),
        'Reincidência de alerta': rank.reincidencia ? 'SIM' : 'NÃO',
        'Score de instabilidade (%)': row.scoreInstabilidade.toFixed(2),
        'Regime': row.classificacaoInstabilidade,
        'Competência de referência (data_referencia)': row.dataCompetencia || '—',
        'Importado em (criado_em)': row.ultimaAtualizacao || '—',
        'Último custo (R$)': row.ultimoCusto ?? '—',
        'Penúltimo custo (R$)': row.penultimoCusto ?? '—',
        'Histórico resumido': `Inicial R$ ${formatCurrencyBRL(row.inicial)} -> Final R$ ${formatCurrencyBRL(row.final)}`
      };
    });

    const wsMeta = XLSX.utils.json_to_sheet(metadataRows);
    const wsData = XLSX.utils.json_to_sheet(exportData);
    wsData['!autofilter'] = { ref: wsData['!ref'] };
    wsData['!cols'] = [
      { wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
      { wch: 50 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 36 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Contexto');
    XLSX.utils.book_append_sheet(wb, wsData, 'Fila Investigativa');
    const filename = buildExportFilename();
    XLSX.writeFile(wb, filename);
    showToast('success', `Relatório investigativo exportado: ${filename}`);
  }, {
    message: 'Falha ao exportar o relatório. A análise atual foi preservada.'
  });
}

// ── Gráficos ──────────────────────────────────────────────────────────────────

const chartA11yTheme = {
  textColor: '#FFFFFF',
  gridColor: 'rgba(255,255,255,0.22)',
  gridBorderColor: 'rgba(255,255,255,0.4)',
  tooltipBg: 'rgba(15,23,42,0.95)'
};

function getReadableChartOptions() {
  return {
    color: chartA11yTheme.textColor,
    plugins: {
      legend: { labels: { color: chartA11yTheme.textColor, usePointStyle: true } },
      tooltip: {
        titleColor: chartA11yTheme.textColor,
        bodyColor: chartA11yTheme.textColor,
        backgroundColor: chartA11yTheme.tooltipBg,
        borderColor: chartA11yTheme.gridBorderColor,
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: chartA11yTheme.textColor },
        grid: { color: chartA11yTheme.gridColor, borderColor: chartA11yTheme.gridBorderColor }
      },
      y: {
        ticks: { color: chartA11yTheme.textColor },
        grid: { color: chartA11yTheme.gridColor, borderColor: chartA11yTheme.gridBorderColor }
      }
    }
  };
}

async function renderImportComparisonChart(filters) {
  const { data, error } = await api.getLatestImportComparison(filters);
  if (error) {
    showToast('error', 'Falha ao buscar comparação entre importações.');
    return false;
  }

  const imports = data?.imports || [];
  if (imports.length < 2) {
    if (state.chart) state.chart.destroy();
    return false;
  }

  const labels = imports.map(item => new Date(item.criado_em).toLocaleString('pt-BR'));
  const values = imports.map(item => Number(item.media || 0));
  const counts = imports.map(item => Number(item.quantidade || 0));
  const variacao = Number(data?.resumo?.variacao_percentual_media || 0);
  const baseA11yOptions = getReadableChartOptions();

  if (state.chart) state.chart.destroy();
  state.chart = new Chart(dom.mainChart, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Custo médio por importação', data: values, backgroundColor: ['#0ea5e9', '#6366f1'] }]
    },
    options: {
      ...baseA11yOptions,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        ...baseA11yOptions.scales,
        y: {
          ...baseA11yOptions.scales.y,
          ticks: { ...baseA11yOptions.scales.y.ticks, callback: value => `R$ ${formatCurrencyBRL(value)}` }
        }
      },
      plugins: {
        ...baseA11yOptions.plugins,
        tooltip: {
          ...baseA11yOptions.plugins.tooltip,
          callbacks: {
            title: items => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return idx === 0 ? 'Última importação' : 'Importação anterior';
            },
            label: context => {
              const idx = context.dataIndex;
              return `R$ ${formatCurrencyBRL(context.parsed.y)} · ${counts[idx]} item(ns)`;
            },
            afterBody: items => {
              const idx = items?.[0]?.dataIndex ?? 0;
              if (idx !== 0) return '';
              return `Variação média vs anterior: ${variacao.toFixed(2)}%`;
            }
          }
        }
      }
    }
  });
  return true;
}

async function renderTopVariationsPanel(filters) {
  const { data, error } = await api.getTopVariacoesImportacao(filters);
  if (error) {
    showToast('error', 'Falha ao calcular TOP VARIAÇÕES.');
    dom.topVariationsPanel.classList.add('hidden');
    return;
  }

  const aumentos = data?.aumentos || [];
  const reducoes = data?.reducoes || [];
  if (!aumentos.length && !reducoes.length) {
    dom.topVariationsPanel.classList.add('hidden');
    return;
  }

  dom.topIncreasesList.innerHTML = renderTopVariationItems(aumentos, 'increase');
  dom.topReductionsList.innerHTML = renderTopVariationItems(reducoes, 'reduction');
  dom.topVariationsPanel.classList.remove('hidden');
}

function renderTopVariationItems(items, type) {
  if (!items.length) {
    return '<li><span class="product">Sem dados comparáveis entre as 2 últimas importações.</span><span class="variation">-</span></li>';
  }
  return items.map(item => `
    <li class="${type}">
      <span class="product" title="${escapeHtml(item.codigo_produto)} - ${escapeHtml(item.descricao)}">${escapeHtml(item.codigo_produto)} - ${escapeHtml(item.descricao)}</span>
      <span class="variation">${item.variacao_percentual >= 0 ? '+' : ''}${item.variacao_percentual.toFixed(2)}%</span>
    </li>
  `).join('');
}

function applyReportLayout({ hasSingleItemAnalysis, hasImportComparison, hasTrendData }) {
  dom.reportContent.classList.toggle('single-item-mode', hasSingleItemAnalysis);
  dom.mainChartPanel.classList.toggle('hidden', hasSingleItemAnalysis || !hasImportComparison);
  dom.trendChartPanel.classList.toggle('hidden', !hasTrendData);
}

function buildTemporalSeries(rows = [], filters = {}) {
  const selectedItem = filters.item && filters.item !== 'TODOS' ? normalizeCodigoProduto(filters.item) : null;
  const scopedRows = (rows || []).filter(row => {
    if (!selectedItem) return true;
    return normalizeCodigoProduto(row?.codigo_produto) === selectedItem;
  });

  const latestByProductAndCompetencia = new Map();
  scopedRows.forEach(row => {
    const competencia = row?.data_referencia;
    const codigoProduto = normalizeCodigoProduto(row?.codigo_produto);
    if (!competencia || !codigoProduto) return;
    const dedupeKey = `${codigoProduto}__${competencia}`;
    const current = latestByProductAndCompetencia.get(dedupeKey);
    if (!current || String(row?.criado_em || '') > String(current?.criado_em || '')) {
      latestByProductAndCompetencia.set(dedupeKey, row);
    }
  });

  const grouped = new Map();
  [...latestByProductAndCompetencia.values()].forEach(row => {
    const competencia = row.data_referencia;
    if (!grouped.has(competencia)) grouped.set(competencia, { sum: 0, count: 0, values: [] });
    const entry = grouped.get(competencia);
    const custo = Number(row.custo_total || 0);
    entry.sum += custo;
    entry.count += 1;
    entry.values.push(custo);
  });

  const mode = filters.item && filters.item !== 'TODOS' ? 'produto' : 'agregado';
  const labels = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const values = labels.map(label => {
    const entry = grouped.get(label);
    if (mode === 'produto') return Number((entry.values[0] || 0).toFixed(4));
    return Number((entry.sum / Math.max(entry.count, 1)).toFixed(4));
  });

  return { labels, values, mode };
}

function getTrendStatus(values = []) {
  if (values.length < 2) return { text: '🟢 Estável', className: 'stable' };
  const first = Number(values[0] || 0);
  const last = Number(values[values.length - 1] || 0);
  const variation = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
  if (variation > 1) return { text: '🔺 Tendência de Alta', className: 'up' };
  if (variation < -1) return { text: '🔻 Tendência de Queda', className: 'down' };
  return { text: '🟢 Estável', className: 'stable' };
}

async function renderTemporalAnalysis(data, filters) {
  const { labels, values, mode } = buildTemporalSeries(data, filters);
  if (labels.length < 2) {
    if (state.trendChart) state.trendChart.destroy();
    dom.trendFallback.textContent = 'Histórico insuficiente para análise temporal';
    dom.trendFallback.classList.remove('hidden');
    dom.trendChart.classList.add('hidden');
    dom.trendBadge.textContent = '🟢 Estável';
    dom.trendBadge.className = 'badge trend stable';
    return false;
  }

  const avg = values.reduce((acc, cur) => acc + Number(cur || 0), 0) / values.length;
  const trend = getTrendStatus(values);
  dom.trendTitle.textContent = 'Evolução Temporal de Custos';
  dom.trendBadge.textContent = trend.text;
  dom.trendBadge.className = `badge trend ${trend.className}`;
  dom.trendFallback.classList.add('hidden');
  dom.trendChart.classList.remove('hidden');
  const baseA11yOptions = getReadableChartOptions();

  if (state.trendChart) state.trendChart.destroy();
  state.trendChart = new Chart(dom.trendChart, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: mode === 'produto' ? 'Custo do produto' : 'Custo médio agregado', data: values, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.14)', fill: true, tension: 0.25 },
        { label: 'Média histórica', data: labels.map(() => avg), borderColor: '#f59e0b', borderDash: [6, 6], pointRadius: 0, fill: false }
      ]
    },
    options: {
      ...baseA11yOptions,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...baseA11yOptions.plugins,
        tooltip: {
          ...baseA11yOptions.plugins.tooltip,
          callbacks: {
            title: items => new Date(items?.[0]?.label || '').toLocaleDateString('pt-BR'),
            label: ctx => `R$ ${formatCurrencyBRL(ctx.parsed.y)}`,
            afterLabel: ctx => {
              if (ctx.dataIndex === 0 || ctx.datasetIndex > 0) return '';
              const prev = Number(values[ctx.dataIndex - 1] || 0);
              const curr = Number(values[ctx.dataIndex] || 0);
              const delta = prev === 0 ? 0 : ((curr - prev) / Math.abs(prev)) * 100;
              return `Variação vs anterior: ${delta.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        ...baseA11yOptions.scales,
        y: {
          ...baseA11yOptions.scales.y,
          ticks: { ...baseA11yOptions.scales.y.ticks, callback: value => `R$ ${formatCurrencyBRL(value)}` }
        }
      }
    }
  });
  return true;
}

init();
