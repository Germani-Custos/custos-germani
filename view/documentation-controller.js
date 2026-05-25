/* Responsabilidade: tela de Documentação — consulta e edição dos manuais (render markdown + gravação via Serverless Function). */
import { debounce, escapeHtml, showToast } from './ui-utils.js';

// Fonte única: arquivos .md versionados no repositório. A edição grava neles via /api/save-doc (commit no GitHub).
const DOCS = [
  { chave: 'usuario', titulo: 'Manual do Usuário', caminho: 'docs/manuais/manual-usuario.md' },
  { chave: 'tecnico', titulo: 'Manual de Uso Técnico', caminho: 'docs/manuais/manual-tecnico.md' },
  { chave: 'operacao', titulo: 'Manual de Operação', caminho: 'docs/manuais/manual-operacao.md' },
  { chave: 'regras', titulo: 'Regras Gerais', caminho: 'docs/regras-gerais.md' }
];

const SAVE_ENDPOINT = '/api/save-doc';

function renderMarkdown(target, markdown) {
  if (!target) return;
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    target.innerHTML = DOMPurify.sanitize(marked.parse(markdown || ''));
  } else {
    // Fallback seguro quando o CDN de markdown não carregou: exibe texto puro (sem innerHTML).
    target.textContent = markdown || '';
  }
}

export function bindDocumentationView(dom) {
  if (!dom.docSelector || !dom.docContent) return; // tela não presente neste documento

  const state = { atual: DOCS[0], conteudo: '' };

  dom.docSelector.innerHTML = DOCS
    .map(doc => `<option value="${escapeHtml(doc.chave)}">${escapeHtml(doc.titulo)}</option>`)
    .join('');

  function exitEditMode() {
    dom.docViewPanel.classList.remove('hidden');
    dom.docEditPanel.classList.add('hidden');
    dom.docEditBtn.classList.remove('hidden');
    dom.docSaveBtn.classList.add('hidden');
    dom.docCancelBtn.classList.add('hidden');
    dom.docSelector.disabled = false;
  }

  function enterEditMode() {
    dom.docEditor.value = state.conteudo;
    renderMarkdown(dom.docPreview, state.conteudo);
    dom.docViewPanel.classList.add('hidden');
    dom.docEditPanel.classList.remove('hidden');
    dom.docEditBtn.classList.add('hidden');
    dom.docSaveBtn.classList.remove('hidden');
    dom.docCancelBtn.classList.remove('hidden');
    dom.docSelector.disabled = true;
  }

  async function loadCurrentDoc() {
    exitEditMode();
    try {
      const response = await fetch(`${state.atual.caminho}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.conteudo = await response.text();
      renderMarkdown(dom.docContent, state.conteudo);
      if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        showToast('warning', 'Renderizador de markdown indisponível; exibindo texto puro.');
      }
    } catch (error) {
      state.conteudo = '';
      dom.docContent.textContent = '';
      showToast('error', `Falha ao carregar "${state.atual.titulo}": ${error.message}`);
    }
  }

  async function saveCurrentDoc() {
    const novoConteudo = dom.docEditor.value;
    dom.docSaveBtn.disabled = true;
    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caminho: state.atual.caminho, conteudo: novoConteudo, titulo: state.atual.titulo })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
      state.conteudo = novoConteudo;
      renderMarkdown(dom.docContent, state.conteudo);
      exitEditMode();
      showToast('success', 'Documento salvo. A versão publicada atualiza após o redeploy (~30-60s).');
    } catch (error) {
      showToast('error', `Falha ao salvar: ${error.message}`);
    } finally {
      dom.docSaveBtn.disabled = false;
    }
  }

  dom.docSelector.addEventListener('change', () => {
    state.atual = DOCS.find(doc => doc.chave === dom.docSelector.value) || DOCS[0];
    loadCurrentDoc();
  });
  dom.docEditBtn.addEventListener('click', enterEditMode);
  dom.docCancelBtn.addEventListener('click', () => { exitEditMode(); renderMarkdown(dom.docContent, state.conteudo); });
  dom.docSaveBtn.addEventListener('click', saveCurrentDoc);
  dom.docEditor.addEventListener('input', debounce(() => renderMarkdown(dom.docPreview, dom.docEditor.value), 250));

  // Recarrega o documento ao abrir a view (pega versão republicada após uma edição anterior).
  const navButton = document.querySelector('[data-view-trigger="documentation"]');
  if (navButton) navButton.addEventListener('click', loadCurrentDoc);

  loadCurrentDoc();
}
