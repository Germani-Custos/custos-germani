# Mapa de Endpoints e Recursos

## HTTP próprio

- `POST /api/save-doc`: gravação dos documentos permitidos via GitHub; handler sem validação de sessão, allowlist de caminho e limite 200 KB.
- `GET /api/reconstruir-cadastro-mestre`: disponibilidade autenticada/autorizada.
- `GET /api/reconstruir-cadastro-mestre?verificar=1`: diagnóstico administrativo somente leitura, disponível com execução desabilitada.
- `GET /api/reconstruir-cadastro-mestre?lote=<identificador>`: consulta do resultado, sem retry automático.
- `POST /api/reconstruir-cadastro-mestre`: ação administrativa explícita após aprovação integral, confirmação e autorização; [contrato](cadastro-mestre-execucao-web.md).

## Recursos Supabase

Tabelas acessadas pela fachada: `categorias_origem`, `categorias_familia`, `categorias_agrupamento`, `dicionario_produtos`, `historico_custos`, `log_importacao`, `apontamentos_op`, `log_importacao_op`, `dicionario_master_produtos` e `log_importacao_cadastro_mestre`, conforme o fluxo. Snapshot web usa Storage privado pelo servidor. Auth usa SDK próprio; frontend não faz SQL/RPC.

Assinaturas, retornos, eixos temporais e fronteiras: [matriz de contratos](matriz-contratos-operacionais.md). Endpoint existente no código não comprova publicação/configuração atual.
