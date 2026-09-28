-- FASE 1 — preservação e diagnóstico versionado.
-- Escopo deliberadamente restrito ao schema privado audit_kustos.
-- Não altera tabelas, dados, funções ou triggers de domínio.

begin;

create schema if not exists audit_kustos;
revoke all on schema audit_kustos from public, anon, authenticated;

create table audit_kustos.fase1_execucao (
  id bigint generated always as identity primary key,
  versao text not null unique,
  executado_em timestamptz not null default now(),
  observacao text not null
);

create table audit_kustos.fase1_contagens_chaves (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  tabela_origem text not null,
  chave_logica text not null,
  quantidade_linhas bigint not null,
  quantidade_chaves bigint not null,
  primary key (execucao_id, tabela_origem)
);

create table audit_kustos.fase1_mapa_produtos_snapshot (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  codigo_produto text not null,
  origem_id text,
  familia_id text,
  agrupamento_cod text,
  primary key (execucao_id, codigo_produto)
);

create table audit_kustos.fase1_mestre_operacional_chaves (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  codigo_produto text not null,
  estado text not null check (estado in ('COMPARTILHADO', 'SOMENTE_MESTRE', 'SOMENTE_OPERACIONAL')),
  descricao_mestre text,
  descricao_operacional text,
  origem_cod_mestre text,
  origem_id_operacional text,
  familia_cod_mestre text,
  familia_id_operacional text,
  agrupamento_cod_operacional text,
  primary key (execucao_id, codigo_produto)
);

create table audit_kustos.fase1_divergencias_descricao (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  codigo_produto text not null,
  descricao_mestre text,
  descricao_operacional text,
  primary key (execucao_id, codigo_produto)
);

create table audit_kustos.fase1_matriz_origem (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  codigo_produto text not null,
  origem_cod_mestre text,
  categoria_origem_id text,
  categoria_origem_descricao text,
  estado_resolucao text not null check (estado_resolucao in ('RESOLVIDA', 'PENDENTE')),
  primary key (execucao_id, codigo_produto)
);

create table audit_kustos.fase1_matriz_familia (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  codigo_produto text not null,
  familia_cod_mestre text,
  categoria_familia_id text,
  categoria_familia_descricao text,
  familia_base_codigo text,
  familia_base_descricao text,
  estado_categoria text not null check (estado_categoria in ('RESOLVIDA', 'PENDENTE')),
  estado_base text not null check (estado_base in ('RESOLVIDA', 'PENDENTE')),
  primary key (execucao_id, codigo_produto)
);

create table audit_kustos.fase1_catalogo_funcoes_triggers (
  execucao_id bigint not null references audit_kustos.fase1_execucao(id),
  tipo_objeto text not null check (tipo_objeto in ('FUNCAO', 'TRIGGER')),
  assinatura_ou_nome text not null,
  tabela_alvo text,
  definicao text not null,
  primary key (execucao_id, tipo_objeto, assinatura_ou_nome)
);

insert into audit_kustos.fase1_execucao (versao, observacao)
values (
  '2026-09-28_fase1_preservacao_diagnostico_v1',
  'Snapshot imutável pré-Fase 2; sem mutação de objetos ou dados de domínio.'
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
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1';

insert into audit_kustos.fase1_mapa_produtos_snapshot (execucao_id, codigo_produto, origem_id, familia_id, agrupamento_cod)
select e.id, mp.codigo_produto, mp.origem_id, mp.familia_id, mp.agrupamento_cod
from audit_kustos.fase1_execucao e
cross join public.mapa_produtos mp
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1';

insert into audit_kustos.fase1_mestre_operacional_chaves (
  execucao_id, codigo_produto, estado, descricao_mestre, descricao_operacional,
  origem_cod_mestre, origem_id_operacional, familia_cod_mestre, familia_id_operacional, agrupamento_cod_operacional
)
select e.id, coalesce(m.codigo_produto, d.codigo_produto),
  case when m.codigo_produto is null then 'SOMENTE_OPERACIONAL'
       when d.codigo_produto is null then 'SOMENTE_MESTRE'
       else 'COMPARTILHADO' end,
  m.descricao, d.descricao, m.origem_cod, d.origem_id, m.familia_cod, d.familia_id, d.agrupamento_cod
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
full outer join public.dicionario_produtos d using (codigo_produto)
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1';

insert into audit_kustos.fase1_divergencias_descricao (execucao_id, codigo_produto, descricao_mestre, descricao_operacional)
select e.id, m.codigo_produto, m.descricao, d.descricao
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
join public.dicionario_produtos d using (codigo_produto)
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1'
  and m.descricao is distinct from d.descricao;

insert into audit_kustos.fase1_matriz_origem (execucao_id, codigo_produto, origem_cod_mestre, categoria_origem_id, categoria_origem_descricao, estado_resolucao)
select e.id, m.codigo_produto, m.origem_cod, o.id, o.descricao,
  case when o.id is null then 'PENDENTE' else 'RESOLVIDA' end
from audit_kustos.fase1_execucao e
cross join public.dicionario_master_produtos m
left join public.categorias_origem o on o.codigo = m.origem_cod
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1';

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
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1';

insert into audit_kustos.fase1_catalogo_funcoes_triggers (execucao_id, tipo_objeto, assinatura_ou_nome, tabela_alvo, definicao)
select e.id, 'FUNCAO', p.oid::regprocedure::text, null, pg_get_functiondef(p.oid)
from audit_kustos.fase1_execucao e
cross join pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1'
  and n.nspname = 'public'
  and p.proname in ('fn_upsert_mapa_produtos_por_codigo', 'inserir_custo', 'trg_categoriza_apos_import', 'trg_categoriza_apos_import_produto')
union all
select e.id, 'TRIGGER', tg.tgname, c.oid::regclass::text, pg_get_triggerdef(tg.oid)
from audit_kustos.fase1_execucao e
cross join pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where e.versao = '2026-09-28_fase1_preservacao_diagnostico_v1'
  and n.nspname = 'public'
  and not tg.tgisinternal
  and tg.tgname in ('tg_categoriza_apos_import', 'tg_categoriza_apos_import_produto');

revoke all on all tables in schema audit_kustos from public, anon, authenticated;

commit;
