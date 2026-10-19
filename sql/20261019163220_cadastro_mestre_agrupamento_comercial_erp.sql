-- CAD-COM-01: duas classificações referenciais opcionais, somente no Master ERP.
-- Preparada localmente. Aplicação remota exige backup e autorização próprios.
BEGIN;
SET LOCAL lock_timeout = '3s';
ALTER TABLE public.dicionario_master_produtos
  ADD COLUMN agrupamento_comercial_erp_cod text NULL,
  ADD COLUMN agrupamento_comercial_erp_descricao text NULL;
COMMENT ON COLUMN public.dicionario_master_produtos.agrupamento_comercial_erp_cod
  IS 'Código opcional de Agrup. Com. do ERP; independente de agrupamento_cod do Kustos.';
COMMENT ON COLUMN public.dicionario_master_produtos.agrupamento_comercial_erp_descricao
  IS 'Descrição opcional de Agrup. Com. recebida do ERP; sem inferência ou ponte Kustos.';
COMMIT;
