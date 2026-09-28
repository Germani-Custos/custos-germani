-- FASE 1 — correção aditiva da matriz mestre × operacional.
-- Mantém a execução anterior imutável e cria um segundo snapshot completo.

begin;

insert into audit_kustos.fase1_execucao (versao, observacao)
values (
  '2026-09-28_fase1_preservacao_diagnostico_v2',
  'Segundo snapshot imutável da Fase 1; corrige a composição da matriz mestre × operacional sem alterar domínio.'
);

insert into audit_kustos.fase1_contagens_chaves (execucao_id, tabela_origem, chave_logica, quantidade_linhas, quantidade_chaves)
select e.id, x.tabela_origem, x.chave_logica, x.quantidade_linhas, x.quantidade_chaves
from audit_kustos.fase1_execucao e
cross join (
  select 'dicionario_master_produtos' as tabela_origem, 'codigo_produto' as chave_logica, count(*) as quantidade_linhas, count(distinct codigo_produto) as quantidade_chaves from public.dicionario_master_produtos
  union all select 'dicionario_produtos', 'codigo_produto', count(*), count(distinct codigo_produto) from public.dicionario_produtos
  union all select 'mapa_produtos', 'codigo_produto', count(*), count(distinct codigo_produto) from public.mapa_produtos
  union all select 'familias_base', 'codigo', count(*), count(distinct codigo) from public.familias_base
  union all select 'categorias_origem', 'id', count(*), count(distinct id) from public.categorias_origem
  union all select 'categorias_familia', 'id', count(*), count(distinct id) from public.categorias_familia
  union all select 'categorias_agrupamento', 'id', count(*), count(distinct id) from public.categorias_agrupamento
  union all select 'historico_custos', 'id', count(*), count(distinct id) from public.historico_custos
  union all select 'apontamentos_op', 'id', count(*), count(distinct id) from public.apontamentos_op
) x
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2';

insert into audit_kustos.fase1_mapa_produtos_snapshot (execucao_id, codigo_produto, origem_id, familia_id, agrupamento_cod)
select e.id, mp.codigo_produto, mp.origem_id, mp.familia_id, mp.agrupamento_cod
from audit_kustos.fase1_execucao e
cross join public.mapa_produtos mp
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2';

insert into audit_kustos.fase1_mestre_operacional_chaves (
  execucao_id, codigo_produto, estado, descricao_mestre, descricao_operacional,
  origem_cod_mestre, origem_id_operacional, familia_cod_mestre, familia_id_operacional, agrupamento_cod_operacional
)
select e.id, x.codigo_produto, x.estado, x.descricao_mestre, x.descricao_operacional,
  x.origem_cod_mestre, x.origem_id_operacional, x.familia_cod_mestre, x.familia_id_operacional, x.agrupamento_cod_operacional
from audit_kustos.fase1_execucao e
cross join (
  select coalesce(m.codigo_produto, d.codigo_produto) as codigo_produto,
    case when m.codigo_produto is null then 'SOMENTE_OPERACIONAL'
         when d.codigo_produto is null then 'SOMENTE_MESTRE'
         else 'COMPARTILHADO' end as estado,
    m.descricao as descricao_mestre, d.descricao as descricao_operacional,
    m.origem_cod as origem_cod_mestre, d.origem_id as origem_id_operacional,
    m.familia_cod as familia_cod_mestre, d.familia_id as familia_id_operacional,
    d.agrupamento_cod as agrupamento_cod_operacional
  from public.dicionario_master_produtos m
  full outer join public.dicionario_produtos d using (codigo_produto)
) x
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2';

insert into audit_kustos.fase1_divergencias_descricao (execucao_id, codigo_produto, descricao_mestre, descricao_operacional)
select e.id, m.codigo_produto, m.descricao, d.descricao
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
join public.dicionario_produtos d using (codigo_produto)
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2'
  and m.descricao is distinct from d.descricao;

insert into audit_kustos.fase1_matriz_origem (execucao_id, codigo_produto, origem_cod_mestre, categoria_origem_id, categoria_origem_descricao, estado_resolucao)
select e.id, m.codigo_produto, m.origem_cod, o.id, o.descricao,
  case when o.id is null then 'PENDENTE' else 'RESOLVIDA' end
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
left join public.categorias_origem o on o.codigo = m.origem_cod
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2';

insert into audit_kustos.fase1_matriz_familia (
  execucao_id, codigo_produto, familia_cod_mestre, categoria_familia_id, categoria_familia_descricao,
  familia_base_codigo, familia_base_descricao, estado_categoria, estado_base
)
select e.id, m.codigo_produto, m.familia_cod, f.id, f.descricao, b.codigo, b.descricao,
  case when f.id is null then 'PENDENTE' else 'RESOLVIDA' end,
  case when b.codigo is null then 'PENDENTE' else 'RESOLVIDA' end
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
left join public.categorias_familia f on f.codigo = m.familia_cod
left join public.familias_base b on b.codigo = m.familia_cod
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2';

insert into audit_kustos.fase1_catalogo_funcoes_triggers (execucao_id, tipo_objeto, assinatura_ou_nome, tabela_alvo, definicao)
select e.id, 'FUNCAO', p.oid::regprocedure::text, null, pg_get_functiondef(p.oid)
from audit_kustos.fase1_execucao e
cross join pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2'
  and n.nspname = 'public'
  and p.proname in ('fn_upsert_mapa_produtos_por_codigo', 'inserir_custo', 'trg_categoriza_apos_import', 'trg_categoriza_apos_import_produto')
union all
select e.id, 'TRIGGER', tg.tgname, c.oid::regclass::text, pg_get_triggerdef(tg.oid)
from audit_kustos.fase1_execucao e
cross join pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v2'
  and n.nspname = 'public'
  and not tg.tgisinternal
  and tg.tgname in ('tg_categoriza_apos_import', 'tg_categoriza_apos_import_produto');

commit;
