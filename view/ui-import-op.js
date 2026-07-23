/* Responsabilidade: fluxo de importação do relatório MCAP105 (Auditoria de OP)
   — upload de CSV latin-1, parse puro via parseMCAP105, preview com escolha da
   competência e gravação via api.importarApontamentosOp.

   Espelha o padrão de view/ui-import.js: Swal para preview/confirmação,
   showToast para feedback e FileReader para leitura. O encoding ISO-8859-1 é
   obrigatório na leitura do CSV do MCAP105 (acentos e cabeçalhos do ERP).

   Nesta fase o controller ainda não é ligado ao init (isso é da Fase 3): se o
   input de upload não existir no DOM, `bind()` é um no-op — a aba Custos
   permanece intacta. */
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

  const avisoErros = errors.length
    ? `<p style="color:#b45309;"><b>${errors.length}</b> linha(s) ignorada(s) por erro de leitura.</p>`
    : '';

  return `
    <p>Linhas de dados encontradas: <b>${rows.length}</b>${errors.length ? ` | Erros: <b>${errors.length}</b>` : ''}</p>
    ${avisoErros}
    <div style="max-height:260px; overflow:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead><tr><th>Ori.</th><th>OP</th><th>Cód. Prod.</th><th>Descrição</th><th>Estágio</th></tr></thead>
        <tbody>${linhasPreview}</tbody>
      </table>
    </div>
    <p style="margin-top:12px; text-align:left;">
      <label for="op-import-mes" style="display:block; font-weight:600; margin-bottom:4px;">Competência (mês de referência)</label>
      <input type="month" id="op-import-mes" class="swal2-input" style="margin:0;">
    </p>
  `;
}

/**
 * Cria o controlador de importação de apontamentos de OP.
 * @param {{ dom?: Record<string, any>, executeOperationalBoundary: Function }} params
 * @returns {{ bindUpload: Function }}
 */
export function createImportOpController({ dom, executeOperationalBoundary }) {
  async function handleFile(file) {
    if (!isCsvFile(file)) {
      showToast('warning', 'Selecione um arquivo CSV de apontamentos (extensão .csv).');
      return;
    }

    const text = await lerArquivoLatin1(file);
    const { rows, errors } = parseMCAP105(text);

    if (!rows.length) {
      showToast('warning', 'Nenhuma linha de dados válida encontrada no arquivo.');
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
        if (!mes) {
          Swal.showValidationMessage('Selecione a competência (mês de referência).');
          return false;
        }
        // Competência vira o primeiro dia do mês (data_referencia é DATE).
        return `${mes}-01`;
      }
    });

    if (!result.isConfirmed) return;
    const dataReferencia = result.value;

    const { data, error } = await api.importarApontamentosOp({
      rows,
      dataReferencia,
      arquivoNome: file.name
    });

    if (error) {
      showToast('error', `Erro na importação: ${error.message || 'falha desconhecida'}`);
      return;
    }

    const inseridos = data?.inseridos ?? 0;
    const houveFalha = (data?.erros?.length ?? 0) > 0;
    showToast(houveFalha ? 'warning' : 'success', `${inseridos} apontamento(s) de OP importado(s).`);
  }

  const MENSAGEM_ERRO = 'Falha ao importar o relatório de OP. Confira o arquivo e tente novamente.';

  function bindUpload() {
    const input = dom?.importOpInput;
    const dropZone = dom?.dropZoneOp;
    if (!input) return;

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      await executeOperationalBoundary('importação de apontamentos de OP', () => handleFile(file), { message: MENSAGEM_ERRO });
      // Libera o mesmo arquivo para nova seleção (dispara change de novo).
      input.value = '';
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
      await executeOperationalBoundary('importação de apontamentos de OP (arrastar)', () => handleFile(file), { message: MENSAGEM_ERRO });
    });
  }

  return { bindUpload };
}
