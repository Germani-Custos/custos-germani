/* Cadastro ERP: aprovação local; execução explícita pela função administrativa.
   A revisão/download nunca chama o importador legado nem grava no banco. */
import { api } from '../src/services/api.js';
import { prepararAprovacaoArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { decidirOperacoesCadastroMestre, obterOperacoesAprovadasCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { escapeHtml } from './ui-utils.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';

const DECISOES = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REJEITADO: 'Rejeitado' };
const CAMPOS = { descricao: 'Descrição', origem_cod: 'Origem ERP', familia_cod: 'Família ERP', agrupamento_erp_valor: 'Agrup. Prod. (ERP)' };
const CATEGORIAS = { NOVO_PRODUTO: 'Novo no Cadastro Mestre', ATUALIZAR_DESCRICAO: 'Atualizar descrição', ATUALIZAR_AGRUPAMENTO_ERP: 'Atualizar agrupamento ERP', ATUALIZAR_ORIGEM_ERP: 'Atualizar origem ERP', ATUALIZAR_FAMILIA_ERP: 'Atualizar família ERP', REMOVER_FORA_UNIVERSO: 'Remover do Cadastro Mestre' };
const valor = value => escapeHtml(value ?? '(vazio)');
const tabela = (headers, rows) => `<div style="max-height:360px;overflow:auto"><table style="width:100%;text-align:left"><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

function detalhesOperacao(operacao) {
  if (operacao.acao === 'DELETE') return `<details><summary>Conferir remoção do Master</summary><p>${valor(operacao.atual?.descricao)} · ${operacao.motivo === 'AUSENTE_NO_ARQUIVO' ? 'Ausente do arquivo' : 'Fora dos filtros oficiais'}</p><p>Remover somente do Cadastro Mestre ERP após aprovação. Custos, OP, cadastro operacional e históricos permanecem intactos.</p></details>`;
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
    ['Produtos a remover do Cadastro Mestre', r.produtos_a_remover],
    ['Cadastro Mestre antes', r.produtos_master_antes], ['Cadastro Mestre após reconstrução', r.produtos_master_depois],
    ['Existentes sem operação', r.existentes_sem_operacao], ['Campos preservados', r.preservacoes_campos],
    ['Erros', r.erros]
  ];
  const decisoes = new Map(revisao.decisoes.map(d => [d.id, d.status]));
  const operacoes = manifesto.operacoes.map(o => `<tr><td>${valor(o.codigo_produto)}</td><td>${valor(CATEGORIAS[o.categoria])}</td><td>${detalhesOperacao(o)}</td><td>
    <select aria-label="Decisão para ${escapeHtml(o.codigo_produto)}: ${escapeHtml(CATEGORIAS[o.categoria])}" data-master-operation="${escapeHtml(o.id)}">
      ${Object.entries(DECISOES).map(([status, label]) => `<option value="${status}" ${decisoes.get(o.id) === status ? 'selected' : ''} ${status === 'APROVADO' && !o.aprovavel ? 'disabled' : ''}>${label}</option>`).join('')}
    </select></td></tr>`);
  return `<p>${valor(manifesto.fonte.arquivo)} · ${valor(manifesto.fonte.tipo_arquivo)} · Aba ${valor(manifesto.fonte.aba)}</p>
    <p>Reconstrução do universo: o Cadastro Mestre deverá conter somente os produtos válidos do arquivo filtrado. Confira também as remoções antes de aprovar. Decisões e download são locais; a seleção do arquivo não executa a carga. Executar reconstrução irá MODIFICAR o Cadastro Mestre ERP.</p>
    <p>A execução administrativa exige todas as propostas aprovadas, inclusive remoções. Qualquer proposta pendente ou rejeitada impede a reconstrução inteira.</p>
    ${manifesto.reconstrucao_bloqueada ? '<p role="alert">Reconstrução bloqueada: existem erros no arquivo ou o universo filtrado está vazio. Corrija e gere novo Preview antes de aprovar.</p>' : ''}
    ${tabela(['Resumo', 'Quantidade'], contagens.map(([label, count]) => `<tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>`))}
    <p>Decisões: <span data-master-decisions></span></p>
    <div class="master-preview-actions">${Object.entries(DECISOES).map(([status, label]) => `<button type="button" class="btn-outline" data-master-decision="${status}">${label === 'Aprovado' ? 'Aprovar todas as permitidas' : label === 'Rejeitado' ? 'Rejeitar todas' : 'Voltar todas a pendente'}</button>`).join('')}</div>
    ${tabela(['Produto', 'Proposta', 'Valores', 'Decisão'], operacoes)}
    <details><summary>Produtos válidos e valores após preservação (${manifesto.produtos.length})</summary>
      ${tabela(['Produto', 'Descrição', 'Origem ERP', 'Família ERP', 'Agrup. Prod. (ERP)'], manifesto.produtos.map(p =>
        `<tr><td>${valor(p.codigo_produto)}</td>${Object.keys(CAMPOS).map(c => `<td>${valor(p.calculado[c])}</td>`).join('')}</tr>`))}</details>
    <details><summary>Produtos a remover do Cadastro Mestre (${manifesto.remocoes.length})</summary>
      ${tabela(['Produto', 'Descrição atual', 'Motivo'], manifesto.remocoes.map(p => `<tr><td>${valor(p.codigo_produto)}</td><td>${valor(p.atual?.descricao)}</td><td>${p.motivo === 'AUSENTE_NO_ARQUIVO' ? 'Ausente do arquivo' : 'Fora dos filtros oficiais'}</td></tr>`))}</details>
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

  async function executarAprovado(file, manifesto, revisao) {
    const plano = criarPlanoReconstrucaoCadastroMestre(manifesto, revisao);
    const lote = `CAD_UI_${crypto.randomUUID()}`;
    const frase = `RECONSTRUIR ${plano.resumo.depois}`;
    const confirmacao = await Swal.fire({
      title: 'Modificar o Cadastro Mestre?', icon: 'warning',
      html: `<p>Esta ação irá MODIFICAR o Cadastro Mestre ERP.</p>
        <p>Atual: ${plano.resumo.antes} · Inserir: ${plano.resumo.inseridos} · Atualizar: ${plano.resumo.atualizados} · Remover: ${plano.resumo.removidos}.</p>
        <p>Resultado esperado: <strong>${plano.resumo.depois} produtos</strong>.</p>
        <p>Somente dicionario_master_produtos será reconstruído. Custos, OP, cadastro operacional e mapa permanecem intactos. O servidor revalidará arquivo e contexto e preservará snapshot antes da alteração.</p>
        <p>Lote: ${escapeHtml(lote)}. Digite <strong>${escapeHtml(frase)}</strong> para confirmar.</p>`,
      input: 'text', inputPlaceholder: frase,
      inputValidator: value => value === frase ? undefined : 'Digite a confirmação exatamente como indicada.',
      showCancelButton: true, focusCancel: true, confirmButtonText: 'Modificar Cadastro Mestre', cancelButtonText: 'Cancelar'
    });
    if (!confirmacao.isConfirmed || confirmacao.value !== frase) return;
    Swal.fire({ title: 'Reconstruindo Cadastro Mestre', text: `Lote ${lote}. Aguarde a confirmação do servidor.`,
      allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try {
      const result = await api.executarReconstrucaoCadastroMestre({ arquivo: file, manifesto, revisao, lote });
      await Swal.fire({ icon: 'success', title: 'Reconstrução concluída',
        text: `Lote ${result.lote_id} (${lote}) concluído. Master: ${result.depois} produtos. Inseridos: ${result.inseridos}; atualizados: ${result.atualizados}; removidos: ${result.removidos}. Snapshot preservado. Custos, OP, cadastro operacional e mapa intactos.` });
    } catch (error) {
      const resposta = await Swal.fire({ icon: 'error', title: 'Reconstrução não confirmada',
        text: `${error.message} Lote: ${lote}. Não repetir automaticamente. Consulte o resultado antes de qualquer nova tentativa.`,
        showCancelButton: true, confirmButtonText: 'Consultar resultado do lote', cancelButtonText: 'Fechar' });
      if (resposta.isConfirmed) {
        try {
          const consulta = await api.consultarReconstrucaoCadastroMestre(lote);
          const r = consulta.resultado;
          await Swal.fire({ icon: r?.status === 'concluido' ? 'success' : 'info', title: 'Resultado do lote',
            text: r ? `Lote ${lote}: ${r.status}. Master após execução: ${r.depois ?? 'não concluído'}; inseridos: ${r.inseridos}; atualizados: ${r.atualizados}; removidos: ${r.removidos ?? 0}.` :
              `Lote ${lote} não localizado. Isso não autoriza repetição: aguarde e confira com o administrador, pois uma execução ainda em curso pode não estar visível.` });
        } catch { await Swal.fire({ icon: 'error', title: 'Consulta indisponível', text: `Solicite a conferência administrativa do lote ${lote}. Não repetir a execução automaticamente.` }); }
      }
    }
  }

  async function abrirPreview(file) {
    const { data: contexto, error } = await api.getCadastroMestrePreviewContext();
    if (error) throw error;
    const preparado = await prepararAprovacaoArquivoCadastroMestre(file, contexto, globalThis.XLSX);
    const { manifesto } = preparado;
    let revisao = preparado.revisao;
    let disponibilidade;
    try { disponibilidade = await api.getCadastroMestreExecutionAvailability(); }
    catch (error) { disponibilidade = { disponivel: false, motivo: error.message }; }
    const result = await Swal.fire({
      title: 'Preview do Cadastro Mestre', width: 1100,
      customClass: { htmlContainer: 'master-preview' },
      html: htmlPreview(manifesto, revisao) + (disponibilidade.disponivel ?
        '<p>Execução disponível para seu usuário. Aprovar todas as propostas habilita Executar reconstrução; haverá outra confirmação.</p>' :
        `<p>Execução indisponível: ${escapeHtml(disponibilidade.motivo || 'solicite habilitação administrativa')}. O Preview e o download continuam disponíveis.</p>`),
      showCancelButton: true, confirmButtonText: 'Baixar revisão (sem gravar)', cancelButtonText: 'Fechar',
      showDenyButton: true, denyButtonText: 'Executar reconstrução…',
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        const atualizarDecisoes = () => {
          container.querySelector('[data-master-decisions]').textContent = Object.entries(DECISOES)
            .map(([status, label]) => `${label}: ${revisao.decisoes.filter(d => d.status === status).length}`).join(' · ');
          const states = new Map(revisao.decisoes.map(d => [d.id, d.status]));
          container.querySelectorAll('[data-master-operation]').forEach(select => { select.value = states.get(select.dataset.masterOperation); });
          let aprovado = false;
          try { criarPlanoReconstrucaoCadastroMestre(manifesto, revisao); aprovado = true; } catch { /* Revisão parcial permanece local. */ }
          const executar = Swal.getDenyButton?.();
          if (executar) executar.disabled = !disponibilidade.disponivel || !aprovado;
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
    if (result.isDenied && disponibilidade.disponivel) await executarAprovado(file, manifesto, revisao);
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
