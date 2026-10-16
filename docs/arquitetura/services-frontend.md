# Services Frontend

`src/services/api.js` é a fachada única Supabase do frontend; `services/api.js` reexporta por compatibilidade. Integra tabelas via `supabase.from()` e Auth via SDK existente; sem SQL bruto/RPC no browser.

Responsabilidades: masters/hierarquia e diagnóstico, histórico/recortes/comparações/drill-through, importação validada com logs, Custos/OP e Cadastro operacional. Leituras de Custos/Cadastro usam paginação integral nos escopos da [matriz](matriz-contratos-operacionais.md), sem resultados parciais de fontes essenciais.

Consulta ERP/Preview usam Master/catálogos completos; adapter fica em `src/services/cadastro-mestre-preview.js` e motores puros em `core/`. Consulta ERP não refiltra arquivo nem sincroniza o operacional. Aprovação/download são locais.

A fachada delega o HTTP administrativo a `src/services/cadastro-mestre-execution.js`. Função Vercel autentica/autoriza e chama o executor central, compartilhado com CLI. A antiga exclusividade CLI foi sucedida pelo [contrato web](cadastro-mestre-execucao-web.md), estendido por [CAD-FAM-01](cadastro-mestre-familias-erp.md). Não importar `pg`/conexão administrativa no browser.
