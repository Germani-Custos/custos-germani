-- Feature Auditoria de OP (MCAP105) — Fase 2: estado de importação no log.
--
-- Estende log_importacao_op (criada na Fase 1) para espelhar o padrão de
-- log_importacao do sistema de custos: permite acompanhar o ciclo
-- processando → concluido de cada upload mensal e registrar quantas linhas
-- foram importadas e quantas falharam. `criado_em` (Fase 1) segue marcando o
-- início; `finalizado_em` marca o fechamento do lote.

begin;

alter table if exists public.log_importacao_op
  add column if not exists status            text,
  add column if not exists linhas_importadas integer,
  add column if not exists linhas_erro       integer,
  add column if not exists finalizado_em     timestamptz;

commit;
