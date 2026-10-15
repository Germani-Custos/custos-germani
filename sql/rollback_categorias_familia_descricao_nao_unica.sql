-- Rollback manual de CAD-FAM-SCHEMA-01. NAO executar automaticamente.
-- Se surgirem descricoes duplicadas, o PostgreSQL recusara a constraint.
-- Nesse caso, interromper e revisar; nunca apagar/renomear familias para forcar rollback.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.categorias_familia
  ADD CONSTRAINT categorias_familia_descricao_key UNIQUE (descricao);

COMMIT;
