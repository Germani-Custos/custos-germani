/* Responsabilidade: fluxo de importação do relatório MCAP105 (Auditoria de OP)
   — upload de CSV latin-1, parse puro via parseMCAP105, preview com escolha da
   competência e gravação via api.importarApontamentosOp.

   Espelha o padrão de view/ui-import.js: Swal para preview/confirmação,
   showToast para feedback e FileReader para leitura. O encoding ISO-8859-1 é
   obrigatório na leitura do CSV do MCAP105 (acentos e cabeçalhos do ERP).

   Rejeições conservam linha física; só fatos válidos seguem para a API. */
import { api } from '../src/services/api.js';
import { parseMCAP105 } from '../core/spreadsheet-engine.js';
import { escapeHtml, showToast } from './ui-utils.js';

const PREVIEW_ROW_LIMIT = 5;

// Validação de extensão case-insensitive: aceita .csv e .CSV (o export real do
// ERP costuma vir em maiúsculas). Arquivos sem extensão .csv são recusados com
// mensagem clara antes de qualquer leitura.
function isCsvFile(file) {
  return /\.csv$/i.test(String(file?.name || ''));
}

function lerArquivoLatin1(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler o arquivo.'));
    reader.readAsText(file, 'ISO-8859-1');
  });
}

function buildErrorsHtml(errors) {
  if (!errors.length) return '';
  return `<details open><summary>Diagnósticos (${errors.length})</summary><div style="max-height:260px;overflow:auto;text-align:left;"><ul>${errors.map(error => {
    const local = error.linha != null ? `Linha ${error.linha}` : error.registro ? `Registro ${error.registro} (linha física não informada)` : error.chunk ? `Chunk ${error.chunk}` : 'Execução';
    const problemas = error.problemas || [error];
    const fontes = error.fontes?.map(f => f.linha != null ? `linha ${f.linha}` : `registro ${f.registro} (linha física não informada)`).join(', ');
    return `<li>${escapeHtml(local)} — ${escapeHtml(error.tipo === 'operacional' ? 'falha operacional' : 'validação')}: ${problemas.map(p => `${escapeHtml(p.campo || error.etapa || '')}: ${escapeHtml(p.mensagem)}${p.valorOriginal !== undefined ? ` (original: ${escapeHtml(p.valorOriginal)})` : ''}`).join('; ')}${fontes ? `<p>Registros afetados: ${escapeHtml(fontes)}</p>` : ''}</li>`;
  }).join('')}</ul></div></details>`;
}

function buildPreviewHtml(rows, errors) {
  const linhasPreview = rows.slice(0, PREVIEW_ROW_LIMIT).map(row => `
    <tr>
      <td>${escapeHtml(row.origem)}</td>
      <td>${escapeHtml(row.op)}</td>
      <td>${escapeHtml(row.cod_produto)}</td>
      <td style="text-align:left;">${escapeHtml(row.descricao)}</td>
      <td>${escapeHtml(row.estagio)}</td>
    </tr>
  `).join('');

  return `
    <p>Linhas de dados lidas: <b>${rows.length + errors.length}</b> | Válidas: <b>${rows.length}</b> | Rejeitadas por validação: <b>${errors.length}</b></p>
    <p>Persistência e falhas operacionais: ainda não executadas.</p>
    ${buildErrorsHtml(errors)}
    <div style="max-height:260px; overflow:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead><tr><th>Ori.</th><th>OP</th><th>Cód. Prod.</th><th>Descrição</th><th>Estágio</th></tr></thead>
        <tbody>${linhasPreview}</tbody>
      </table>
    </div>
    ${rows.length ? `<p style="margin-top:12px; text-align:left;">
      <label for="op-import-mes" style="display:block; font-weight:600; margin-bottom:4px;">Competência (mês de referência)</label>
      <input type="month" id="op-import-mes" class="swal2-input" style="margin:0;">
    </p>` : ''}
  `;
}

/**
 * Cria o controlador de importação de apontamentos de OP.
 * @param {{ dom?: Record<string, any>, executeOperationalBoundary: Function, onImported?: Function }} params
 * @returns {{ bindUpload: Function }}
 */
export function createImportOpController({ dom, executeOperationalBoundary, onImported = async () => {} }) {
  let running = false;
  // Cache somente desta sessão/controller: reapresenta uma tentativa, nunca a reenvia.
  // Não altera o lote persistido nem promete idempotência entre abas/reloads.
  const submissions = new Map();

  async function showResult({ data, error }) {
    if (error) {
      const r = error.details?.resumo;
      await Swal.fire({ icon: 'error', title: 'Importação OP não iniciada',
        html: `<p>${escapeHtml(error.message || 'Falha operacional; nenhum reenvio automático.')}</p>
          ${r ? `<p>Linhas lidas: ${r.total_linhas} | Válidas: ${r.linhas_validas} | Rejeitadas: ${r.linhas_rejeitadas} | Enviadas: 0 | Persistidas: 0</p>` : ''}
          ${buildErrorsHtml(error.details?.erros || [])}` });
      return;
    }
    const r = data.resumo;
    const titles = { concluido: 'Importação OP concluída', parcial: 'Importação OP parcial', erro: 'Falha operacional na importação OP', rejeitado: 'Arquivo rejeitado por validação', indeterminado: 'Persistência OP indeterminada' };
    await Swal.fire({
      icon: data.estado === 'concluido' && !data.logError ? 'success' : data.estado === 'erro' ? 'error' : 'warning',
      title: data.logError ? 'Resultado OP — fechamento do log não confirmado' : titles[data.estado] || 'Resultado da importação OP',
      html: `<p>Lote: ${escapeHtml(data.logId)}</p><p>Linhas lidas: ${r.total_linhas} | Válidas: ${r.linhas_validas} | Rejeitadas por validação: ${r.linhas_rejeitadas}</p>
        <p>Enviadas: ${r.linhas_enviadas} | Persistidas confirmadas: ${r.linhas_importadas} | Falhas operacionais de fatos: ${r.linhas_falha_operacional}</p>
        <p>Persistência indeterminada: ${r.linhas_indeterminadas} | Não enviadas: ${r.linhas_nao_enviadas}</p>
        <p>Log: ${data.logFinalizado ? 'fechamento confirmado' : 'fechamento não confirmado'}. Detalhes por linha/chunk disponíveis nesta sessão; não persistidos no log.</p>
        ${data.estado === 'indeterminado' ? '<p>Confira os fatos pelo lote antes de qualquer nova importação. Não repita o envio.</p>' : ''}
        ${buildErrorsHtml(data.erros)}`
    });
  }

  async function handleFile(file) {
    if (!isCsvFile(file)) {
      showToast('warning', 'Selecione um arquivo CSV de apontamentos (extensão .csv).');
      return;
    }

    const text = await lerArquivoLatin1(file);
    const { rows, errors, origens } = parseMCAP105(text);

    if (!rows.length) {
      if (errors.length) await Swal.fire({ icon: 'warning', title: 'Arquivo rejeitado por validação', html: buildPreviewHtml(rows, errors) });
      else showToast('warning', 'Nenhuma linha de dados encontrada no arquivo.');
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'Preview — Importação de Apontamentos de OP',
      width: 900,
      html: buildPreviewHtml(rows, errors),
      showCancelButton: true,
      confirmButtonText: `Importar ${rows.length} linha(s)`,
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById('op-import-mes');
        const mes = input ? String(input.value || '') : '';
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
          Swal.showValidationMessage('Selecione a competência (mês de referência).');
          return false;
        }
        // Competência vira o primeiro dia do mês (data_referencia é DATE).
        return `${mes}-01`;
      }
    });

    if (!result.isConfirmed) return;
    const dataReferencia = result.value;

    const submissionKey = `${dataReferencia}\u0000${text}`;
    if (submissions.has(submissionKey)) {
      const previous = submissions.get(submissionKey);
      if (previous) await showResult(previous);
      else showToast('warning', 'Tentativa anterior sem resultado confirmado. Confira o lote; não repita o envio.');
      return;
    }
    submissions.set(submissionKey, null);
    const response = await api.importarApontamentosOp({
      rows,
      dataReferencia,
      arquivoNome: file.name,
      origens,
      errosLeitura: errors
    });
    submissions.set(submissionKey, response);
    if (response.data?.resumo.linhas_enviadas > 0) {
      try { await onImported(); }
      catch { showToast('warning', 'Resultado de gravação preservado; falha ao atualizar a consulta OP. Repita somente a leitura.'); }
    }
    await showResult(response);
  }

  const MENSAGEM_ERRO = 'Falha no fluxo de OP. Confira o resultado/lote antes de repetir qualquer envio.';

  async function runFile(file) {
    if (running) return;
    running = true;
    try {
      await executeOperationalBoundary('importação de apontamentos de OP', () => handleFile(file), { message: MENSAGEM_ERRO });
    } finally {
      running = false;
      if (dom?.importOpInput) dom.importOpInput.value = '';
    }
  }

  function bindUpload() {
    const input = dom?.importOpInput;
    const dropZone = dom?.dropZoneOp;
    if (!input) return;

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      await runFile(file);
    });

    if (!dropZone) return;

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });
    dropZone.addEventListener('drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      await runFile(file);
    });
  }

  return { bindUpload };
}
