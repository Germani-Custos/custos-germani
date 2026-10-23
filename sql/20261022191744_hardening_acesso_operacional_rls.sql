-- SEC-03: leitores autenticados; escrita operacional apenas nos dois UUIDs indicados pelo humano.
-- Escopo: autorização, RLS, ACLs e contexto da view. Sem DML de negócio ou nova role/helper/RPC.
-- Gerado inicialmente com Supabase CLI 2.121.0; aplicação deve ser atômica e precedida de backup.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND pg_get_userbyid(c.relowner)='postgres'
        AND c.relname = ANY(ARRAY['apontamentos_op','categorias_agrupamento','categorias_familia','categorias_origem','dicionario_master_produtos','dicionario_produtos','familias_base','historico_custos','log_importacao','log_importacao_cadastro_mestre','log_importacao_op','mapa_produtos'])) <> 12 THEN
    RAISE EXCEPTION 'Estrutura/owner divergente: reauditar antes do hardening';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
        AND c.relname = ANY(ARRAY['apontamentos_op','categorias_agrupamento','categorias_familia','categorias_origem','dicionario_produtos','historico_custos','log_importacao','log_importacao_op','mapa_produtos'])) <> 9
     OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename = ANY(ARRAY['apontamentos_op','categorias_agrupamento','categorias_familia','categorias_origem','dicionario_produtos','historico_custos','log_importacao','log_importacao_op','mapa_produtos'])) THEN
    RAISE EXCEPTION 'Estado de RLS/policies mudou: não sobrescrever políticas';
  END IF;
  IF (SELECT count(*) FROM auth.users WHERE id = ANY(ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid,'72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid])
      AND NOT is_anonymous AND deleted_at IS NULL AND banned_until IS NULL) <> 2 THEN
    RAISE EXCEPTION 'Identidades administrativas divergentes: exigir indicação humana';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='dicionario_master_produtos') <> 1
     OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dicionario_master_produtos'
       AND policyname='dicionario_master_produtos_select_frontend' AND cmd='SELECT' AND qual='true') THEN
    RAISE EXCEPTION 'Policy ERP divergente: reauditar leitura';
  END IF;
END;
$guard$;

-- RLS não controla TRUNCATE; por isso retiramos também os grants excedentes
-- de tabelas que já tinham RLS. Service role/owner e suas ACLs são preservados.
REVOKE ALL PRIVILEGES ON TABLE public.apontamentos_op,
  public.categorias_agrupamento,
  public.categorias_familia,
  public.categorias_origem,
  public.dicionario_master_produtos,
  public.dicionario_produtos,
  public.familias_base,
  public.historico_custos,
  public.log_importacao,
  public.log_importacao_cadastro_mestre,
  public.log_importacao_op,
  public.mapa_produtos FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.vw_produtos_orfaos_agrupamento FROM PUBLIC, anon, authenticated;
ALTER VIEW public.vw_produtos_orfaos_agrupamento SET (security_invoker = true);

ALTER TABLE public.apontamentos_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_agrupamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_familia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_origem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicionario_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_importacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_importacao_op ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapa_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY dicionario_master_produtos_select_frontend ON public.dicionario_master_produtos;

-- Cada SELECT corresponde à investigação/consulta existente, sem isolamento por autor.
GRANT SELECT ON TABLE public.apontamentos_op TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.apontamentos_op FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.categorias_agrupamento TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.categorias_agrupamento FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.categorias_familia TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.categorias_familia FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.categorias_origem TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.categorias_origem FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.dicionario_produtos TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.dicionario_produtos FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.historico_custos TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.historico_custos FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.log_importacao TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.log_importacao FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.log_importacao_op TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.log_importacao_op FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

GRANT SELECT ON TABLE public.dicionario_master_produtos TO authenticated;
CREATE POLICY kustos_leitura_autenticada ON public.dicionario_master_produtos FOR SELECT TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false));

-- Upserts existentes exigem INSERT e UPDATE; DELETE nunca é operação operacional.
GRANT INSERT, UPDATE ON TABLE public.dicionario_produtos TO authenticated;
CREATE POLICY kustos_insercao_admin ON public.dicionario_produtos FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_atualizacao_admin ON public.dicionario_produtos FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

GRANT INSERT, UPDATE ON TABLE public.historico_custos TO authenticated;
CREATE POLICY kustos_insercao_admin ON public.historico_custos FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_atualizacao_admin ON public.historico_custos FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

GRANT INSERT, UPDATE ON TABLE public.log_importacao TO authenticated;
CREATE POLICY kustos_insercao_admin ON public.log_importacao FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_atualizacao_admin ON public.log_importacao FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

GRANT INSERT, UPDATE ON TABLE public.log_importacao_op TO authenticated;
CREATE POLICY kustos_insercao_admin ON public.log_importacao_op FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_atualizacao_admin ON public.log_importacao_op FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]))
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

GRANT INSERT ON TABLE public.apontamentos_op TO authenticated;
CREATE POLICY kustos_insercao_admin ON public.apontamentos_op FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

-- O trigger existente de historico_custos chama fn_upsert_mapa_produtos_por_codigo(text).
-- Preservar esse efeito interno; negar SELECT/escrita direta do mapa via Data API.
GRANT SELECT, INSERT, UPDATE ON TABLE public.mapa_produtos TO authenticated;
CREATE POLICY kustos_mapa_leitura_trigger ON public.mapa_produtos FOR SELECT TO authenticated
USING (pg_trigger_depth() > 0 AND (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_mapa_insercao_trigger ON public.mapa_produtos FOR INSERT TO authenticated
WITH CHECK (pg_trigger_depth() > 0 AND (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));
CREATE POLICY kustos_mapa_atualizacao_trigger ON public.mapa_produtos FOR UPDATE TO authenticated
USING (pg_trigger_depth() > 0 AND (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]))
WITH CHECK (pg_trigger_depth() > 0 AND (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE((SELECT (auth.jwt() ->> 'is_anonymous')::boolean), false)
  AND (SELECT auth.uid()) = ANY (ARRAY['14f1b3ff-0b22-495b-a1c3-9aebae13dc36'::uuid, '72334848-f7d5-41bb-9e5d-eb4933d9d41c'::uuid]));

-- USAGE basta para os defaults das quatro sequências operacionais; sem setval/UPDATE.
REVOKE ALL PRIVILEGES ON SEQUENCE public.historico_custos_id_seq, public.log_importacao_id_seq,
  public.apontamentos_op_id_seq, public.log_importacao_op_id_seq,
  public.log_importacao_cadastro_mestre_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.historico_custos_id_seq, public.log_importacao_id_seq,
  public.apontamentos_op_id_seq, public.log_importacao_op_id_seq TO authenticated;

-- Não deixar RPCs legados como acesso alternativo. A única chamada aninhada
-- necessária conserva EXECUTE, mas a policy do mapa exige contexto de trigger.
REVOKE EXECUTE ON FUNCTION public.fn_upsert_mapa_produtos_por_codigo(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_upsert_mapa_produtos_por_codigo(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inserir_custo(text,text,numeric,date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_categoriza_apos_import() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_categoriza_apos_import_produto() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_mapa_produtos_por_codigo(text) TO authenticated;

-- Evitar que objetos futuros criados pelo owner atual recuperem grants públicos por default.
-- Não modificar defaults de schemas/owners geridos pela plataforma fora deste contrato.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
COMMIT;
