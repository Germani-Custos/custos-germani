/* Responsabilidade: fluxo de importação — upload (clique/drag&drop), mapeamento
   de colunas, preview validado linha a linha e gravação via API com log.
   Extraído de view/ui-controller.js (MNT-01) sem alteração de comportamento.

   Contratos preservados:
   - `normalizeCodigoProduto` (VAL-01) é a normalização canônica do código.
   - Semântica temporal: `data_referencia` (competência) vem do seletor e
     acompanha o payload; `criado_em` (importação) é atribuído pela camada de API.
   - Importação tolerante linha a linha: falha de linha não derruba o lote. */
import { api } from '../src/services/api.js';
import { readWorkbook, scanHeaders, countValidMappedColumns, REQUIRED_FIELDS, parseBrazilianNumber, formatBrazilianFinancial, normalizeCodigoProduto } from '../core/spreadsheet-engine.js';
import { escapeHtml, showToast } from './ui-utils.js';
import { debugLog } from '../src/config/app-config.js';

// MNT-07: limite de linhas mostradas na tabela do modal de preview de
// importação (confirmImportPreview). É só um teto de exibição — não afeta
// quais linhas são validadas ou efetivamente importadas (preview.validRows
// e o payload usam preview.rows inteiro, sem esse corte).
const IMPORT_PREVIEW_DISPLAY_LIMIT = 20;

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
  const previewRows = preview.rows.slice(0, IMPORT_PREVIEW_DISPLAY_LIMIT).map(row => {
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

/**
 * Cria o controlador de importação ligado ao `dom`/`state` compartilhados.
 * Recebe por injeção a fronteira operacional (`executeOperationalBoundary`,
 * ERR-01) e `fetchMetadata` (recarrega os filtros após importar), preservando
 * o mesmo comportamento do orquestrador. Expõe `bindUpload()` para o `init`.
 */
export function createImportController({ dom, state, executeOperationalBoundary, fetchMetadata }) {
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

  return { bindUpload };
}
