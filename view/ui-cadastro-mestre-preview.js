/* Cadastro ERP: adapter e aprovação existentes, exclusivamente em memória.
   A revisão não chama o importador legado nem executa propostas no banco. */
import { api } from '../src/services/api.js';
import { prepararAprovacaoArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { decidirOperacoesCadastroMestre, obterOperacoesAprovadasCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { escapeHtml } from './ui-utils.js';

const DECISOES = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado' };
const CAMPOS = { descricao: 'Descrição', origem_cod: 'Origem ERP', familia_cod: 'Família ERP', agrupamento_erp_valor: 'Agrup. Prod. (ERP)' };
const CATEGORIAS = { NOVO_PRODUTO: 'Novo no Cadastro Mestre', ATUALIZAR_DESCRICAO: 'Atualizar descrição', ATUALIZAR_AGRUPAMENTO_ERP: 'Atualizar agrupamento ERP' };
const valor = value => escapeHtml(value ?? '(vazio)');
const tabela = (headers, rows) => `<div style="max-height:360px;overflow:auto"><table style="width:100%;text-align:left"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

function detalhesOperacao(operacao) {
  const fields = Object.keys(operacao.dados).filter(campo => campo !== 'codigo_produto');
  return `<details><summary>Atual / ERP / proposto</summary>${tabela(['Campo', 'Atual', 'ERP', 'Proposto'], fields.map(campo =>
    `<tr><td>${valor(CAMPOS[campo])}</td><td>${valor(operacao.atual?.[campo])}</td><td>${valor(operacao.recebido[campo])}</td><td>${valor(operacao.dados[campo])}</td></tr>`))}
    ${operacao.bloqueios.map(b => `<p>Bloqueada: alteração de ${valor(CAMPOS[b.campo])} fora do escopo (${valor(b.atual)} → ${valor(b.recebido)}).</p>`).join('')}</details>`;
}

function htmlPreview(manifesto, revisao) {
  const r = manifesto.resumo;
  const contagens = [
    ['Linhas lidas', r.linhas_lidas], ['Linhas após filtros', r.linhas_apos_filtros],
    ['Linhas excluídas', r.linhas_excluidas], ['Produtos válidos', r.produtos_com_preview],
    ['Existentes', r.produtos_existentes], ['Novos', r.novos_produtos],
    ['Produtos com alterações', r.produtos_com_alteracoes], ['Alterações de campos', r.alteracoes_potenciais],
    ['Produtos preservados fora dos filtros ou ausentes', r.produtos_fora_conjunto_preservados],
    ['Existentes sem operação', r.existentes_sem_operacao], ['Campos preservados', r.preservacoes_campos],
    ['Erros', r.erros]
  ];
  const decisoes = new Map(revisao.decisoes.map(d => [d.id, d.status]));
  const operacoes = manifesto.operacoes.map(o => `<tr><td>${valor(o.codigo_produto)}</td><td>${valor(CATEGORIAS[o.categoria])}</td><td>${detalhesOperacao(o)}</td><td>
    <select aria-label="Decisão para ${escapeHtml(o.codigo_produto)}: ${escapeHtml(CATEGORIAS[o.categoria])}" data-master-operation="${escapeHtml(o.id)}">
      ${Object.entries(DECISOES).map(([status, label]) => `<option value="${status}" ${decisoes.get(o.id) === status ? 'selected' : ''} ${status === 'APROVADO' && !o.aprovavel ? 'disabled' : ''}>${label}</option>`).join('')}
    </select></td></tr>`);
  return `<p>${valor(manifesto.fonte.arquivo)} · ${valor(manifesto.fonte.tipo_arquivo)} · Aba ${valor(manifesto.fonte.aba)}</p>
    <p>Confira as propostas antes de decidir. Aprovar prepara uma revisão local; nenhuma alteração é gravada no banco.</p>
    ${tabela(['Resumo', 'Quantidade'], contagens.map(([label, count]) => `<tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>`))}
    <p>Decisões: <span data-master-decisions></span></p>
    <div class="master-preview-actions">${Object.entries(DECISOES).map(([status, label]) => `<button type="button" class="btn-outline" data-master-decision="${status}">${label === 'Aprovado' ? 'Aprovar todas as permitidas' : label === 'Rejeitado' ? 'Rejeitar todas' : 'Voltar todas a pendente'}</button>`).join('')}</div>
    ${tabela(['Produto', 'Proposta', 'Valores', 'Decisão'], operacoes)}
    <details><summary>Produtos válidos e valores após preservação (${manifesto.produtos.length})</summary>
      ${tabela(['Produto', 'Descrição', 'Origem ERP', 'Família ERP', 'Agrup. Prod. (ERP)'], manifesto.produtos.map(p =>
        `<tr><td>${valor(p.codigo_produto)}</td>${Object.keys(CAMPOS).map(c => `<td>${valor(p.calculado[c])}</td>`).join('')}</tr>`))}</details>
    <details><summary>Produtos preservados fora dos filtros ou ausentes (${manifesto.preservados.length})</summary>
      ${tabela(['Produto', 'Motivo'], manifesto.preservados.map(p => `<tr><td>${valor(p.codigo_produto)}</td><td>${p.motivo === 'AUSENTE_NO_ARQUIVO' ? 'Ausente do arquivo: preservar' : 'Fora do conjunto filtrado: preservar'}</td></tr>`))}</details>
    <details><summary>Campos preservados (${manifesto.preservacoes.length})</summary>
      ${tabela(['Produto', 'Campo', 'Valor atual'], manifesto.preservacoes.map(p => `<tr><td>${valor(p.codigo_produto)}</td><td>${valor(CAMPOS[p.campo])}</td><td>${valor(p.atual)}</td></tr>`))}</details>
    <details><summary>Pendências de classificação (${manifesto.pendencias.length})</summary>
      ${tabela(['Produto', 'Campo', 'Código ERP', 'Situação'], manifesto.pendencias.map(p => `<tr><td>${valor(p.codigo_produto)}</td><td>${valor(CAMPOS[p.campo])}</td><td>${valor(p.codigo ?? p.recebido)}</td><td>${p.status === 'SEM_PONTE_ERP_KUSTOS' ? 'Agrupamento ERP sem ponte Kustos' : p.status === 'BLOQUEADO' ? 'Alteração fora do escopo' : 'Código sem resolução única'}</td></tr>`))}</details>
    ${manifesto.erros.length ? `<details open><summary>Erros (${manifesto.erros.length})</summary>${tabela(['Linha', 'Produto', 'Motivo'], manifesto.erros.map(e => `<tr><td>${e.linha}</td><td>${valor(e.codigo_produto)}</td><td>${valor(e.motivo)}</td></tr>`))}</details>` : ''}`;
}

function baixarRevisao(manifesto, revisao) {
  const aprovado = obterOperacoesAprovadasCadastroMestre(manifesto, revisao);
  const blob = new Blob([JSON.stringify({ manifesto, revisao, aprovado }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `revisao_${manifesto.fonte.arquivo}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createCadastroMestrePreviewController({ dom, executeOperationalBoundary }) {
  let preparando = false;

  async function abrirPreview(file) {
    const { data: contexto, error } = await api.getCadastroMestrePreviewContext();
    if (error) throw error;
    const preparado = await prepararAprovacaoArquivoCadastroMestre(file, contexto, globalThis.XLSX);
    const { manifesto } = preparado;
    let revisao = preparado.revisao;
    const result = await Swal.fire({
      title: 'Preview do Cadastro Mestre', width: 1100,
      customClass: { htmlContainer: 'master-preview' },
      html: htmlPreview(manifesto, revisao),
      showCancelButton: true, confirmButtonText: 'Baixar revisão (sem gravar)', cancelButtonText: 'Fechar',
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        const atualizarDecisoes = () => {
          container.querySelector('[data-master-decisions]').textContent = Object.entries(DECISOES)
            .map(([status, label]) => `${label}: ${revisao.decisoes.filter(d => d.status === status).length}`).join(' · ');
          const states = new Map(revisao.decisoes.map(d => [d.id, d.status]));
          container.querySelectorAll('[data-master-operation]').forEach(select => { select.value = states.get(select.dataset.masterOperation); });
        };
        container.addEventListener('change', event => {
          const select = event.target.closest('[data-master-operation]');
          if (!select) return;
          revisao = decidirOperacoesCadastroMestre(manifesto, revisao, [select.dataset.masterOperation], select.value);
          atualizarDecisoes();
        });
        container.addEventListener('click', event => {
          const button = event.target.closest('[data-master-decision]');
          if (!button) return;
          const decisao = button.dataset.masterDecision;
          const ids = manifesto.operacoes.filter(o => decisao !== 'APROVADO' || o.aprovavel).map(o => o.id);
          revisao = decidirOperacoesCadastroMestre(manifesto, revisao, ids, decisao);
          atualizarDecisoes();
        });
        atualizarDecisoes();
      }
    });
    if (result.isConfirmed) baixarRevisao(manifesto, revisao);
  }

  function bind() {
    dom.masterImportBtn.addEventListener('click', () => dom.masterImportInput.click());
    dom.masterImportInput.addEventListener('change', async () => {
      const file = dom.masterImportInput.files?.[0];
      if (!file || preparando) return;
      preparando = true;
      dom.masterImportBtn.disabled = true;
      dom.masterImportInput.disabled = true;
      try {
        await executeOperationalBoundary('Preview do Cadastro Mestre ERP', () => abrirPreview(file), { message: 'Não foi possível preparar o Preview do Cadastro Mestre (XLSM, XLSX ou XLS).' });
      } finally {
        preparando = false;
        dom.masterImportBtn.disabled = false;
        dom.masterImportInput.disabled = false;
        dom.masterImportInput.value = '';
      }
    });
  }
  return { bind };
}
