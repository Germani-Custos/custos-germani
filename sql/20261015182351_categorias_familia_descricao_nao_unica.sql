-- CAD-FAM-SCHEMA-01: codigo identifica a familia; descricao e somente rotulo.
-- Versao registrada no Supabase: 20261015182351 (15/10/2026).
-- Remove apenas a constraint indicada e seu indice de suporte.
-- RESTRICT impede efeitos em cascata; nenhum registro e modificado.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.categorias_familia
  DROP CONSTRAINT categorias_familia_descricao_key RESTRICT;

COMMIT;
