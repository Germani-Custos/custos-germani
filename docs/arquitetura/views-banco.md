# Views de Banco

Existe SQL versionado para `vw_produtos_orfaos_agrupamento` no [saneamento operacional](../../sql/2026-05-25_saneamento_operacional_schema.sql), com fallback `SEM_AGRUPAMENTO`. O registro de evidências de schema está em [Migrações](migracoes.md); sua existência não autoriza reaplicação.

A aplicação consulta as tabelas de histórico/dicionário/categorias diretamente. O diagnóstico frontend usa `supabase.from()` e resolução tolerante de chave, sem depender da view para executar sua leitura. Falha deve ser `indisponivel`, não zero. [Modelo de dados](banco-de-dados.md) e [matriz](matriz-contratos-operacionais.md).
