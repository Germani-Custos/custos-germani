/* Gera somente texto do relatório local. Sem banco, filesystem, rede ou executor. */
export function gerarCanvasRevisaoCadastroMestre(evidencia, fonteNucleo) {
  const inicioSerializacao = fonteNucleo.indexOf('export function serializarDeterministico');
  const fimSerializacao = fonteNucleo.indexOf('/**\n * Cria propostas');
  const inicioRevisao = fonteNucleo.indexOf('/** Todas as propostas');
  if (inicioSerializacao < 0 || fimSerializacao < 0 || inicioRevisao < 0) throw new Error('Contrato de revisão não encontrado.');
  // Incorporar exatamente as funções testadas, pois o canvas não admite imports locais.
  let contrato = fonteNucleo.slice(inicioSerializacao, fimSerializacao) + fonteNucleo.slice(inicioRevisao);
  contrato = contrato.replaceAll('export function', 'function')
    .replace('serializarDeterministico(value)', 'serializarDeterministico(value: any): string')
    .replace('criarRevisaoCadastroMestre(manifesto)', 'criarRevisaoCadastroMestre(manifesto: any)')
    .replace('validarRevisao(manifesto, revisao)', 'validarRevisao(manifesto: any, revisao: any)')
    .replace('decidirOperacoesCadastroMestre(manifesto, revisao, ids, decisao)', 'decidirOperacoesCadastroMestre(manifesto: any, revisao: any, ids: string[], decisao: string)')
    .replace('obterOperacoesAprovadasCadastroMestre(manifesto, revisao)', 'obterOperacoesAprovadasCadastroMestre(manifesto: any, revisao: any)');
  return `import { Button, Grid, H1, H2, Row, Stack, Stat, Table, Text, useCanvasState, useHostTheme } from 'cursor/canvas';
const evidencia: any = JSON.parse(${JSON.stringify(JSON.stringify(evidencia))});
const copiar = (value: any) => JSON.parse(JSON.stringify(value));
const comparar = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
${contrato}
const labels: Record<string, string> = { NOVO_PRODUTO: 'Novos produtos', ATUALIZAR_DESCRICAO: 'Alterações de descrição', ATUALIZAR_AGRUPAMENTO_ERP: 'Agrupamento ERP', PENDENCIAS: 'Pendências', PRESERVACOES: 'Campos preservados', PRESERVADOS: 'Fora do conjunto filtrado', SEM_ALTERACAO: 'Sem operação' };
export default function RevisaoCadastroMestre() {
  const theme = useHostTheme();
  const m = evidencia.manifesto;
  const chave = m.fonte.hash_arquivo_sha256 + '-' + m.fonte.hash_contexto_sha256;
  const [revisao, setRevisao] = useCanvasState<any>('revisao-' + chave, criarRevisaoCadastroMestre(m));
  const [categoria, setCategoria] = useCanvasState<string>('categoria', 'NOVO_PRODUTO');
  const [busca, setBusca] = useCanvasState<string>('busca', '');
  const [pagina, setPagina] = useCanvasState<number>('pagina', 0);
  const [detalhe, setDetalhe] = useCanvasState<string>('detalhe', '');
  const [mensagem, setMensagem] = useCanvasState<string>('mensagem', '');
  let saida: any;
  try { saida = obterOperacoesAprovadasCadastroMestre(m, revisao); }
  catch (error: any) { return <Stack gap={12}><H1>Revisão incompatível com este manifesto</H1><Text>{error.message}</Text><Button onClick={() => setRevisao(criarRevisaoCadastroMestre(m))}>Reiniciar como pendente</Button></Stack>; }
  const decidir = (ids: string[], status: string) => {
    try { setRevisao(decidirOperacoesCadastroMestre(m, revisao, ids, status)); setMensagem('Decisão local registrada. Nenhuma escrita no banco.'); }
    catch (error: any) { setMensagem(error.message); }
  };
  const baixar = () => {
    const blob = new Blob([JSON.stringify({ ...saida, resumo_manifesto: m.resumo }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'cadastro-mestre-decisoes-fase-3-3.json'; link.click(); URL.revokeObjectURL(url);
  };
  const buscaTexto = busca.trim().toLowerCase();
  const filtrar = (item: any) => !buscaTexto || String(item.codigo_produto ?? item).toLowerCase().includes(buscaTexto) || String(item.recebido?.descricao ?? '').toLowerCase().includes(buscaTexto);
  const operacoes = m.operacoes.filter((o: any) => o.categoria === categoria && filtrar(o));
  const informativa = categoria === 'PENDENCIAS' ? m.pendencias : categoria === 'PRESERVACOES' ? m.preservacoes : categoria === 'PRESERVADOS' ? m.preservados : categoria === 'SEM_ALTERACAO' ? m.sem_alteracao : [];
  const lista = informativa.length ? informativa.filter(filtrar) : operacoes;
  const paginaAtual = Math.min(pagina, Math.max(0, Math.ceil(lista.length / 50) - 1));
  const visiveis = lista.slice(paginaAtual * 50, (paginaAtual + 1) * 50);
  const selecionada = m.operacoes.find((o: any) => o.id === detalhe);
  const status = (id: string) => revisao.decisoes.find((d: any) => d.id === id)?.status;
  const aprovadas = revisao.decisoes.filter((d: any) => d.status === 'APROVADO').length;
  const rejeitadas = revisao.decisoes.filter((d: any) => d.status === 'REJEITADO').length;
  const decidirTodos = (status: string) => decidir(m.operacoes.map((o: any) => o.id), status);
  const inputStyle = { color: theme.text.primary, background: theme.bg.elevated, border: '1px solid ' + theme.stroke.primary, padding: 8 };
  return <Stack gap={24} style={{ padding: 24, color: theme.text.primary, background: theme.bg.editor }}>
    <Stack gap={8}>
      <H1>Cadastro Mestre — manifesto para revisão</H1>
      <Text>Fase 3.3. Todas as {m.operacoes.length} propostas foram entregues pendentes. Aprovar aqui apenas monta um conjunto local de operações; não executa importação.</Text>
      <Text>Agrup. Prod. (Q) é o campo ERP oficial. Pxxx não é Mxxx. Origem e família são conferidas por código exato; pendência não inventa classificação.</Text>
      <Text>Fonte: {m.fonte.arquivo}, aba {m.fonte.aba}. Banco: Custos-Germani, leitura em 08/10/2026. Aprovação vinculada aos hashes do arquivo e contexto.</Text>
      {evidencia.ressalva_integridade && <Text>Ressalva de auditoria: {evidencia.ressalva_integridade}</Text>}
    </Stack>
    <Grid columns={4} gap={16}>
      <Stat value={m.resumo.inserts_propostos} label="INSERTs candidatos no Master" />
      <Stat value={m.resumo.updates_propostos} label={'UPDATEs por campo em ' + m.resumo.produtos_existentes_com_update + ' produtos'} />
      <Stat value={m.resumo.agrupamentos_erp_preenchidos} label="Valores ERP preenchidos" />
      <Stat value={m.resumo.produtos_fora_conjunto_preservados} label="Produtos fora do conjunto preservados" />
    </Grid>
    <Text>Base confirmada: {m.resumo_base.produtos} produtos, {m.resumo_base.existentes} existentes, {m.resumo_base.novos} novos, {m.resumo_base.existentes_sem_alteracao} existentes sem alteração antes de considerar agrupamento ERP e {m.resumo_base.alteracoes_descricao} diferenças de descrição. Após agrupamento: {m.resumo.existentes_sem_operacao} existentes sem operação. {m.resumo.agrupamentos_erp_vazios} células de agrupamento vazias são preservadas/omitidas, não propostas como NULL.</Text>
    <Table headers={['Agrup. Prod. ERP', 'Novos', 'Existentes', 'Total preenchido']} rows={m.distribuicao_agrupamento.map((d: any) => [d.valor, d.novos, d.existentes, d.total])} columnAlign={['left','right','right','right']} />
    <Text>Famílias: {m.resumo.familias_resolvidas} resolvidas e {m.resumo.familias_pendentes} pendentes. Origens: {m.resumo.origens_resolvidas} resolvidas e {m.resumo.origens_pendentes} pendentes. Não há ponte ERP → categoria de agrupamento para os {m.resumo.agrupamentos_erp_preenchidos} valores preenchidos.</Text>
    <Stack gap={12}>
      <H2>Revisão por operação</H2>
      <Text>{aprovadas} aprovadas localmente, {rejeitadas} rejeitadas, {m.operacoes.length - aprovadas - rejeitadas} pendentes. Datas e IDs BIGINT de lote só serão definidos em execução futura autorizada.</Text>
      <Row gap={8} wrap><Button onClick={() => decidirTodos('APROVADO')}>Aprovar todas as propostas</Button><Button onClick={() => decidirTodos('REJEITADO')}>Rejeitar todas as propostas</Button><Button onClick={() => decidirTodos('PENDENTE')}>Voltar todas para pendente</Button><Button disabled={aprovadas + rejeitadas === 0} onClick={baixar}>Baixar decisões JSON, sem executar</Button></Row>
      {mensagem && <Text>{mensagem}</Text>}
      <Row gap={12} wrap>
        <label>Grupo <select style={inputStyle} value={categoria} onChange={event => { setCategoria(event.target.value); setPagina(0); setDetalhe(''); }}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Código ou descrição <input style={inputStyle} value={busca} onChange={event => { setBusca(event.target.value); setPagina(0); }} /></label>
      </Row>
      {lista.length > 0 && <Text>{lista.length} itens neste recorte. Página {paginaAtual + 1} de {Math.ceil(lista.length / 50)}. Os controles globais abrangem todas as {m.operacoes.length} propostas, independentemente deste filtro.</Text>}
      {operacoes.length > 0 && <Table headers={['Código', 'Descrição ERP', 'Origem ERP / situação', 'Família ERP / situação', 'Agrup. Prod.', 'Decisão', 'Revisar']} rows={visiveis.map((o: any) => [o.codigo_produto, o.recebido.descricao, String(o.recebido.origem_cod ?? '') + ' / ' + o.origem.efetivo.status, String(o.recebido.familia_cod ?? '') + ' / ' + o.familia.efetivo.status, o.recebido.agrupamento_erp_valor ?? 'Vazio: preservar/omitir', status(o.id), <Button key={o.id} onClick={() => setDetalhe(o.id)}>Detalhes</Button>])} />}
      {informativa.length > 0 && visiveis.length > 0 && <Table headers={['Código', 'Campo / motivo', 'Código recebido / atual', 'Situação']} rows={visiveis.map((p: any) => typeof p === 'string' ? [p, 'SEM_ALTERACAO', '', 'Sem escrita'] : [p.codigo_produto, p.campo ?? p.motivo, p.codigo ?? p.atual ?? '', p.status ?? p.tipo ?? 'PRESERVAR'])} />}
      {lista.length > 50 && <Row gap={8}><Button disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>Anterior</Button><Button disabled={(paginaAtual + 1) * 50 >= lista.length} onClick={() => setPagina(paginaAtual + 1)}>Próxima</Button></Row>}
    </Stack>
    {selecionada && <Stack gap={12}>
      <H2>{selecionada.codigo_produto} — detalhes da proposta</H2>
      <Text>{selecionada.recebido.descricao}. {labels[selecionada.categoria]}. Destino único: dicionario_master_produtos.</Text>
      <Table headers={['Campo', 'Atual no Master', 'Recebido ERP', 'Proposto']} rows={selecionada.diferencas.map((d: any) => [d.campo, d.atual ?? 'Sem valor', d.recebido ?? 'Vazio', d.proposto ?? 'Omitir, não propor NULL'])} />
      <Text>Origem: {selecionada.origem.efetivo.status}. Família: {selecionada.familia.efetivo.status}. Agrupamento: {selecionada.agrupamento.status}. Não alterar dimensão operacional.</Text>
      <Text>Campos vinculados ao lote somente na futura execução: {selecionada.campos_lote_na_execucao.join(', ')}.</Text>
      <details><summary>Dados e precondições técnicas completos</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{JSON.stringify(selecionada, null, 2)}</pre></details>
      <Row gap={8}><Button disabled={!selecionada.aprovavel} onClick={() => decidir([selecionada.id], 'APROVADO')}>Aprovar esta operação</Button><Button onClick={() => decidir([selecionada.id], 'REJEITADO')}>Rejeitar esta operação</Button><Button onClick={() => decidir([selecionada.id], 'PENDENTE')}>Voltar para pendente</Button></Row>
    </Stack>}
    <Stack gap={8}>
      <H2>Evidência de preservação</H2>
      <Text>Arquivo SHA-256: {m.fonte.hash_arquivo_sha256}</Text><Text>Contexto SHA-256: {m.fonte.hash_contexto_sha256}</Text>
      {evidencia.integridade && <Table headers={['Tabela', 'Antes', 'Depois', 'Conteúdo igual']} rows={evidencia.integridade.map((r: any) => [r.tabela, r.antes, r.depois, r.igual ? 'SIM' : 'NÃO'])} />}
      <Text>Somente SELECT no banco. Sem migration, INSERT, UPDATE, DELETE, UPSERT, RPC ou escrita de log. Nenhum controle possui executor. Aprovação local não resolve família pendente e não cria ponte de agrupamento.</Text>
    </Stack>
  </Stack>;
}
`;
}
