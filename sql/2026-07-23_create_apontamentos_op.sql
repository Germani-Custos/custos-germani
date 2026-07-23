-- Feature Auditoria de OP (MCAP105) — Fase 1: tabelas de apontamentos.
-- Fonte: relatório MCAP105 "Acompanhamento de Tempo por OP" (chão de fábrica).
--
-- Temporalidade (mesmo contrato do sistema de custos):
--   data_referencia = competência (mês/ano do relatório importado)
--   criado_em       = evento de importação (atribuído na gravação)
--
-- log_importacao_op segue o mesmo padrão de log_importacao: rastreia cada
-- upload mensal. Criada antes de apontamentos_op por causa da FK.
--
-- Observação de semântica de colunas (relevante para o parser da Fase 2):
-- no CSV de origem as colunas de tempo e produtividade seguem a ordem do
-- relatório — previsto antes de real (Tempo Prev., Tempo Real, KG/Hora
-- Previsto, KG/Hora Real). O schema abaixo é neutro quanto a essa ordem;
-- a responsabilidade do mapeamento posicional é do parser parseMCAP105.

begin;

create table if not exists public.log_importacao_op (
  id              bigserial primary key,
  data_referencia date not null,
  criado_em       timestamptz not null default now(),
  total_linhas    integer,
  arquivo_nome    text
);

create table if not exists public.apontamentos_op (
  id                   bigserial primary key,
  data_referencia      date not null,
  criado_em            timestamptz not null default now(),
  log_importacao_op_id bigint references public.log_importacao_op(id),

  -- Identificação
  origem           integer not null,
  op               integer not null,
  cod_produto      text not null,
  descricao        text not null,
  cod_estagio      integer not null,
  estagio          text not null,
  unidade          text not null,

  -- Quantidades
  qtd_prevista     numeric(14,4),
  qtd_produzida    numeric(14,4),
  qtd_apontamentos integer,

  -- Tempos
  tempo_real       numeric(14,4),
  tempo_previsto   numeric(14,4),
  tempo_parada     numeric(14,4),

  -- Produtividade
  kg_hora_real     numeric(14,4),
  kg_hora_previsto numeric(14,4),
  perc_tempo       numeric(10,4)
);

create index if not exists idx_apontamentos_op_data_referencia
  on public.apontamentos_op (data_referencia);

create index if not exists idx_apontamentos_op_cod_produto
  on public.apontamentos_op (cod_produto);

create index if not exists idx_apontamentos_op_estagio_origem
  on public.apontamentos_op (estagio, origem);

commit;
