# Controles de Fronteira

Não existe pipeline de middleware Express. Validações são aplicadas em UI, fachada de serviços e handlers Vercel.

`api/reconstruir-cadastro-mestre.js` delega ao handler central com Auth getUser, allowlist UUID, origem e gate de execução. Diagnóstico GET permanece leitura. `api/save-doc.js` tem allowlist/tamanho, sem validação de sessão no código atual. [Autenticação](autenticacao.md) e [contrato web](cadastro-mestre-execucao-web.md) descrevem fronteiras diferentes; não generalizar a proteção de uma função para a outra.
