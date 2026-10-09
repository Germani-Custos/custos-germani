# Capítulo 12 — Services Frontend

`src/services/api.js` é a camada única de acesso ao Supabase.

CAD-REBUILD-01 (09/10/2026): o Preview do Master lê contexto completo via `supabase.from()` e calcula localmente propostas, inclusive remoções. O frontend não executa DELETE, SQL ou RPC. A reconstrução transacional aprovada usa um comando administrativo Node separado, sem endpoint na UI; [contrato e limites](./cadastro-mestre-reconstrucao.md).

## Responsabilidades principais
- Carregar dados mestres com recorte por produtos que têm custo.
- Garantir produto no dicionário antes da gravação de custo.
- Importar histórico com validação e log.
- Importar e consultar apontamentos de OP (`importarApontamentosOp`/`getApontamentosOp`) usando somente `supabase.from()`.
- Diagnosticar falhas de chunks de OP com resposta Supabase completa e registros associados a uma coluna `NOT NULL`.
- Buscar histórico por período/filtros e tendência temporal.
