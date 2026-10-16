# Backend e API

## Fronteiras atuais

O frontend consome Supabase pela fachada `src/services/api.js`, com shim `services/api.js`. Não há servidor Express persistente; há funções Vercel em `/api`:

- `api/save-doc.js`: grava documentos permitidos por commit via GitHub Contents API.
- `api/reconstruir-cadastro-mestre.js`: disponibilidade, diagnóstico e consulta por GET; reconstrução por POST autenticado/autorizado, reutilizando executor central.

O executor PostgreSQL e credenciais administrativas ficam somente no servidor/CLI. O frontend usa `supabase.from()` para tabelas e HTTP para a função administrativa, sem SQL/RPC. [Mapa HTTP](mapa-endpoints.md), [matriz de contratos](matriz-contratos-operacionais.md) e [execução web](cadastro-mestre-execucao-web.md).

Operações investigativas incluem masters, histórico/recortes, drill-through, comparação/TOP variações, importações/logs Custos/OP e Cadastro operacional/ERP. A série temporal atual usa o dataset carregado; `getTrendsByProduct()` não é chamado pela UI atual.
