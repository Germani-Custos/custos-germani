-- Saneamento operacional do schema Supabase
-- Objetivo: alinhar Banco/API/UI/Engines preservando velocidade investigativa

begin;

-- 1) colunas obrigatórias de custo (remover colunas fantasmas por adição controlada)
alter table if exists public.historico_custos
  add column if not exists custo_variavel numeric(18,4),
  add column if not exists custo_direto_fixo numeric(18,4),
  add column if not exists custo_total numeric(18,4),
  add column if not exists criado_em timestamptz not null default now();

-- 2) constraints temporais e de integridade básica
alter table if exists public.historico_custos
  alter column codigo_produto set not null,
  alter column data_referencia set not null,
  alter column custo_total set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'unique_produto_data'
      and conrelid = 'public.historico_custos'::regclass
  ) then
    alter table public.historico_custos
      add constraint unique_produto_data unique (codigo_produto, data_referencia);
  end if;
end $$;

-- 3) reforço de dimensões e órfãos investigáveis
alter table if exists public.dicionario_produtos
  alter column codigo_produto set not null;

-- agrupamento fallback operacional explícito (não silencioso)
insert into public.categorias_agrupamento (codigo, descricao)
select 'SEM_AGRUPAMENTO', 'Sem agrupamento (pendente de categorização)'
where not exists (
  select 1 from public.categorias_agrupamento where codigo = 'SEM_AGRUPAMENTO'
);

update public.dicionario_produtos
set agrupamento_cod = 'SEM_AGRUPAMENTO'
where agrupamento_cod is null or btrim(agrupamento_cod) = '';

-- 4) FKs de categorização (sem usar descrição textual)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dicionario_produtos_agrupamento_cod_fkey'
      and conrelid = 'public.dicionario_produtos'::regclass
  ) then
    alter table public.dicionario_produtos
      add constraint dicionario_produtos_agrupamento_cod_fkey
      foreign key (agrupamento_cod) references public.categorias_agrupamento(codigo);
  end if;
end $$;

-- 5) índices para investigação e drill-through
create index if not exists idx_historico_codigo_produto on public.historico_custos (codigo_produto);
create index if not exists idx_historico_data_referencia on public.historico_custos (data_referencia);
create index if not exists idx_historico_criado_em on public.historico_custos (criado_em desc);
create index if not exists idx_historico_produto_data on public.historico_custos (codigo_produto, data_referencia desc);
create index if not exists idx_dicionario_agrupamento_cod on public.dicionario_produtos (agrupamento_cod);

-- 6) visão de auditoria de órfãos (não mascarar inconsistência)
create or replace view public.vw_produtos_orfaos_agrupamento as
select
  dp.codigo_produto,
  dp.descricao,
  dp.agrupamento_cod,
  case
    when dp.agrupamento_cod = 'SEM_AGRUPAMENTO' then 'PENDENTE_CATEGORIZACAO'
    when ca.codigo is null then 'AGRUPAMENTO_INVALIDO'
    else 'OK'
  end as status_agrupamento
from public.dicionario_produtos dp
left join public.categorias_agrupamento ca on ca.codigo = dp.agrupamento_cod;

commit;
