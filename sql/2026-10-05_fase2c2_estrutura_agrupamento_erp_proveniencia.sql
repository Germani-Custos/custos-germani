-- FASE 2C.2 — Estrutura mínima para agrupamento ERP e proveniência.
-- Escopo estritamente aditivo: não atualiza nem reconcilia registros existentes.

begin;

alter table public.dicionario_master_produtos
  add column agrupamento_erp_valor text,
  add column agrupamento_erp_importacao_id bigint;

alter table public.dicionario_master_produtos
  add constraint dicionario_master_produtos_agrupamento_erp_importacao_fkey
  foreign key (agrupamento_erp_importacao_id)
  references public.log_importacao_cadastro_mestre (id)
  on delete restrict;

-- Índice parcial: suporta a auditoria por lote e a verificação da FK sem
-- indexar os registros legados, que permanecem nulos nesta etapa.
create index idx_dicionario_master_agrupamento_erp_importacao
  on public.dicionario_master_produtos (agrupamento_erp_importacao_id)
  where agrupamento_erp_importacao_id is not null;

alter table public.dicionario_produtos
  add column agrupamento_override_manual_cod text,
  add column agrupamento_classificacao_origem text;

alter table public.dicionario_produtos
  add constraint dicionario_produtos_agrupamento_override_manual_fkey
  foreign key (agrupamento_override_manual_cod)
  references public.categorias_agrupamento (id)
  on delete restrict;

alter table public.dicionario_produtos
  add constraint dicionario_produtos_agrupamento_classificacao_origem_check
  check (
    agrupamento_classificacao_origem in (
      'MASTER',
      'MANUAL',
      'LEGADO_NAO_RASTREAVEL'
    )
  );

-- Índice parcial: suporta a verificação da FK e futuras consultas de override
-- sem indexar os registros atuais, que permanecem nulos.
create index idx_dicionario_produtos_agrupamento_override_manual
  on public.dicionario_produtos (agrupamento_override_manual_cod)
  where agrupamento_override_manual_cod is not null;

commit;
