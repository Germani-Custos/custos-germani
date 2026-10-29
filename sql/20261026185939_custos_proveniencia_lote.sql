-- LOG-02: proveniência da versão atual; não reconstrói lotes ou retém snapshots.
-- Gerada com Supabase CLI migration new. Executar somente com writers pausados.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.log_importacao IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.historico_custos IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.log_importacao'::regclass
      AND attname = 'id' AND atttypid = 'bigint'::regtype AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.log_importacao'::regclass
      AND contype = 'p' AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.historico_custos'::regclass
      AND contype = 'u' AND pg_get_constraintdef(oid) = 'UNIQUE (codigo_produto, data_referencia)')
    OR EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.historico_custos'::regclass
      AND attname = 'log_importacao_id' AND NOT attisdropped)
  THEN
    RAISE EXCEPTION 'LOG-02: schema divergente ou migration já aplicada; interromper sem saneamento automático';
  END IF;
END $$;

ALTER TABLE public.historico_custos
  ADD COLUMN log_importacao_id BIGINT NULL,
  ADD CONSTRAINT historico_custos_log_importacao_id_fkey
    FOREIGN KEY (log_importacao_id) REFERENCES public.log_importacao(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT NOT DEFERRABLE;

-- Índice não único apenas para as referências presentes; legado NULL não é associado.
CREATE INDEX idx_historico_log_importacao_id ON public.historico_custos(log_importacao_id)
  WHERE log_importacao_id IS NOT NULL;
COMMIT;
