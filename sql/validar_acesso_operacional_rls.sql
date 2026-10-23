-- SEC-03: ensaios de autorização com SET LOCAL ROLE e claims simuladas no SQL administrativo.
-- Nenhum RPC/frontend, sequência ou registro existente é modificado.
-- Escritas permitidas usam IDs explícitos e são revertidas por subtransação forçada.
DO $probe$
DECLARE
  perfil record;
  tabela text;
  comando text;
  coluna text;
  consulta text;
  total bigint;
  permitido boolean;
  esperado boolean;
  erro text;
  familia_a text;
  familia_b text;
  saida jsonb := '[]'::jsonb;
  codigo_teste constant text := 'RLS_P0_PROBE_20261022';
BEGIN
  IF EXISTS(SELECT 1 FROM public.dicionario_produtos WHERE codigo_produto=codigo_teste)
    OR EXISTS(SELECT 1 FROM public.historico_custos WHERE codigo_produto=codigo_teste)
    OR EXISTS(SELECT 1 FROM public.mapa_produtos WHERE codigo_produto=codigo_teste)
    OR EXISTS(SELECT 1 FROM public.apontamentos_op WHERE id=-90000000000001)
    OR EXISTS(SELECT 1 FROM public.log_importacao WHERE id=-90000000000001)
    OR EXISTS(SELECT 1 FROM public.log_importacao_op WHERE id=-90000000000001)
    OR EXISTS(SELECT 1 FROM public.historico_custos WHERE id=-90000000000001) THEN
    RAISE EXCEPTION 'Fixture de ensaio já existe: interromper sem tocar dados';
  END IF;
  SELECT min(id),max(id) INTO familia_a,familia_b FROM public.categorias_familia;
  IF familia_a IS NULL OR familia_a=familia_b THEN RAISE EXCEPTION 'Catálogo insuficiente para ensaio de trigger'; END IF;
  FOR perfil IN SELECT * FROM (VALUES
    ('anon','anon',NULL::text,false,false,false),
    ('leitor','authenticated','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false,true,false),
    ('admin_1','authenticated','14f1b3ff-0b22-495b-a1c3-9aebae13dc36',false,true,true),
    ('admin_2','authenticated','72334848-f7d5-41bb-9e5d-eb4933d9d41c',false,true,true),
    ('auth_anonimo','authenticated','14f1b3ff-0b22-495b-a1c3-9aebae13dc36',true,false,false),
    ('sem_sub','authenticated',NULL::text,false,false,false)
  ) AS p(nome,papel,uid,anonimo,pode_ler,admin)
  LOOP
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',perfil.uid,'role',perfil.papel,'is_anonymous',perfil.anonimo,
      'user_metadata',jsonb_build_object('role','admin'))::text,true);
    EXECUTE format('SET LOCAL ROLE %I',perfil.papel);
    FOREACH tabela IN ARRAY ARRAY['apontamentos_op','categorias_agrupamento','categorias_familia','categorias_origem',
      'dicionario_produtos','historico_custos','log_importacao','log_importacao_op','mapa_produtos',
      'dicionario_master_produtos','familias_base','log_importacao_cadastro_mestre','vw_produtos_orfaos_agrupamento']
    LOOP
      total:=0;erro:=NULL;
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I',tabela) INTO total;
        permitido:=total>0;
      EXCEPTION WHEN insufficient_privilege THEN permitido:=false;erro:=SQLSTATE;
      END;
      esperado:=perfil.pode_ler AND tabela<>ALL(ARRAY['mapa_produtos','familias_base','log_importacao_cadastro_mestre','vw_produtos_orfaos_agrupamento']);
      saida:=saida||jsonb_build_array(jsonb_build_object('perfil',perfil.nome,'tabela',tabela,'operacao','SELECT',
        'permitido',permitido,'esperado',esperado,'linhas',total,'sqlstate',erro,'ok',permitido=esperado));
    END LOOP;
    -- Provas negativas reais: leitor/anon não gravam; mesmo admin não exclui nem edita catálogos/mapa/OP existente.
    FOREACH tabela IN ARRAY ARRAY['apontamentos_op','categorias_agrupamento','categorias_familia','categorias_origem',
      'dicionario_produtos','historico_custos','log_importacao','log_importacao_op','mapa_produtos']
    LOOP
      coluna:=CASE WHEN tabela IN ('log_importacao','log_importacao_op') THEN 'status'
        WHEN tabela IN ('historico_custos','mapa_produtos') THEN 'codigo_produto' ELSE 'descricao' END;
      FOREACH comando IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
        IF perfil.admin AND (comando='INSERT' AND tabela IN ('dicionario_produtos','historico_custos','log_importacao','log_importacao_op','apontamentos_op')
          OR comando='UPDATE' AND tabela IN ('dicionario_produtos','historico_custos','log_importacao','log_importacao_op')) THEN CONTINUE; END IF;
        consulta:=CASE comando WHEN 'DELETE' THEN format('DELETE FROM public.%I',tabela)
          WHEN 'UPDATE' THEN format('UPDATE public.%I SET %I=%I',tabela,coluna,coluna)
          ELSE CASE tabela
            WHEN 'apontamentos_op' THEN 'INSERT INTO public.apontamentos_op(id,data_referencia,origem,op,cod_produto,descricao,cod_estagio,estagio,unidade) VALUES(-90000000000001,''2099-12-31'',1,1,''RLS_P0_PROBE_20261022'',''Ensaio'',1,''Etapa'',''KG'')'
            WHEN 'categorias_agrupamento' THEN 'INSERT INTO public.categorias_agrupamento(id,descricao) VALUES(''RLS_P0_PROBE_20261022'',''Ensaio'')'
            WHEN 'categorias_familia' THEN 'INSERT INTO public.categorias_familia(id,descricao) VALUES(''RLS_P0_PROBE_20261022'',''Ensaio'')'
            WHEN 'categorias_origem' THEN 'INSERT INTO public.categorias_origem(id,descricao) VALUES(''RLS_P0_PROBE_20261022'',''Ensaio'')'
            WHEN 'dicionario_produtos' THEN 'INSERT INTO public.dicionario_produtos(codigo_produto,descricao) VALUES(''RLS_P0_PROBE_20261022'',''Ensaio'')'
            WHEN 'historico_custos' THEN 'INSERT INTO public.historico_custos(id,codigo_produto,custo_total,data_referencia) OVERRIDING SYSTEM VALUE VALUES(-90000000000001,''RLS_P0_PROBE_20261022'',1,''2099-12-31'')'
            WHEN 'log_importacao' THEN 'INSERT INTO public.log_importacao(id) OVERRIDING SYSTEM VALUE VALUES(-90000000000001)'
            WHEN 'log_importacao_op' THEN 'INSERT INTO public.log_importacao_op(id,data_referencia) VALUES(-90000000000001,''2099-12-31'')'
            WHEN 'mapa_produtos' THEN 'INSERT INTO public.mapa_produtos(codigo_produto) VALUES(''RLS_P0_PROBE_20261022'')' END END;
        permitido:=false;total:=0;erro:=NULL;
        BEGIN
          EXECUTE consulta;
          GET DIAGNOSTICS total=ROW_COUNT;
          permitido:=total>0;
          RAISE SQLSTATE 'ZX001' USING MESSAGE='Reverter sempre a tentativa de escrita';
        EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
          WHEN insufficient_privilege THEN permitido:=false;erro:=SQLSTATE;
        END;
        saida:=saida||jsonb_build_array(jsonb_build_object('perfil',perfil.nome,'tabela',tabela,'operacao',comando,
          'permitido',permitido,'esperado',false,'linhas',total,'sqlstate',erro,'ok',NOT permitido));
      END LOOP;
    END LOOP;
    IF perfil.admin THEN
      permitido:=false;erro:=NULL;
      BEGIN
        INSERT INTO public.dicionario_produtos(codigo_produto,descricao,familia_id) VALUES(codigo_teste,'Ensaio RLS',familia_a);
        INSERT INTO public.log_importacao(id,status) OVERRIDING SYSTEM VALUE VALUES(-90000000000001,'processando');
        UPDATE public.log_importacao SET status='finalizado' WHERE id=-90000000000001;
        INSERT INTO public.log_importacao_op(id,data_referencia) VALUES(-90000000000001,'2099-12-31');
        UPDATE public.log_importacao_op SET status='concluido' WHERE id=-90000000000001;
        INSERT INTO public.historico_custos(id,codigo_produto,custo_total,data_referencia) OVERRIDING SYSTEM VALUE
          VALUES(-90000000000001,codigo_teste,1,'2099-12-31');
        UPDATE public.dicionario_produtos SET familia_id=familia_b WHERE codigo_produto=codigo_teste;
        INSERT INTO public.historico_custos(id,codigo_produto,custo_total,data_referencia) OVERRIDING SYSTEM VALUE
          VALUES(-90000000000001,codigo_teste,2,'2099-12-31') ON CONFLICT(codigo_produto,data_referencia)
          DO UPDATE SET codigo_produto=excluded.codigo_produto,custo_total=excluded.custo_total;
        INSERT INTO public.apontamentos_op(id,data_referencia,origem,op,cod_produto,descricao,cod_estagio,estagio,unidade)
          VALUES(-90000000000001,'2099-12-31',1,1,codigo_teste,'Ensaio RLS',1,'Etapa','KG');
        RESET ROLE;
        IF NOT EXISTS(SELECT 1 FROM public.mapa_produtos WHERE codigo_produto=codigo_teste AND familia_id=familia_b) THEN
          RAISE EXCEPTION 'Trigger não preservou atualização do mapa';
        END IF;
        permitido:=true;
        RAISE SQLSTATE 'ZX001' USING MESSAGE='Reverter integralmente o fluxo autorizado';
      EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
        WHEN OTHERS THEN erro:=SQLSTATE;permitido:=false;
      END;
      RESET ROLE;
      saida:=saida||jsonb_build_array(jsonb_build_object('perfil',perfil.nome,'operacao','FLUXO_IMPORTACAO_CADASTRO_TRIGGER',
        'permitido',permitido,'esperado',true,'sqlstate',erro,'ok',permitido));
    END IF;
    RESET ROLE;
  END LOOP;
  PERFORM set_config('request.jwt.claims','{}',true);
  PERFORM set_config('kustos.p0_results',saida::text,false);
END;
$probe$;
SELECT current_setting('kustos.p0_results')::jsonb AS security_checks;
