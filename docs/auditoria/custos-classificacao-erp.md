# CUSTOS-ERP-01 — classificação analítica pelo Master ERP

Entrega local em 16/10/2026. Implementação concluída, sem commit, push, deploy, migration, reconstrução ou DML remoto. Consulta de produção exclusivamente GET para verificar a implementação local. [Contrato vigente](../arquitetura/matriz-contratos-operacionais.md#custos-erp-01--classificação-analítica-em-memória-16102026).

## Problema e arquitetura

A paginação integral já estava corrigida. A limitação restante era a fonte exclusivamente operacional: 437 produtos de Custos existiam no operacional, mas somente 151 tinham família. Alterar esses registros não é necessário para investigar famílias ERP.

O núcleo puro `core/custos-classification-engine.js` recebe fatos/códigos, operacional e contexto Master/catálogos. Presença no Master determina autoridade de origem/família, mesmo com campo vazio. Código ausente usa operacional. Resolve códigos exatos dos catálogos existentes para IDs técnicos; a UI continua mostrando descrição. Campo sem correspondência/ambíguo resulta em null, sem inferência por rótulo, UUID como código ou recuperação do campo operacional. Identidade Master duplicada/inválida bloqueia resultado.

A API aplica a mesma projeção antes de montar hierarquia/opções e antes da cascata no histórico e nas comparações. Drill-through acrescenta a mesma classificação ao produto clicado, preservando sua descrição snapshot e seus deltas. Fila, gráfico temporal e exportação derivam dos dados já filtrados pelos controllers existentes. Agrupamento vem sempre do operacional; a leitura Master nem seleciona agrupamento ERP.

A projeção cria cópias em memória. Não grava fatos nem cadastros, não altera OP, Cadastro, Preview ou reconstrução. Mantém páginas de 500/count exact, ordens totais, blocos IN sem teto total e bloqueio de resultados incompletos. Todas as leituras novas usam `supabase.from()`. `data_referencia` continua competência; `criado_em` continua evento de importação. Não há classificação histórica por competência: categorias são as atuais do cadastro.

## Testes automatizados

Oito casos adicionais (incluindo três variantes de falha de paginação) em `tests/api-custos-pagination.test.js` cobrem:

- Master com origem/família e operacional sem família; Master e operacional divergentes; produto fora do Master com fallback; sem classificação em ambas as fontes.
- Agrupamento exclusivamente operacional, inclusive null; agrupamento ERP fora da seleção de campos.
- Famílias ERP na cascata; mesma lista de códigos na seleção TODOS, no agregado e em `buildReportRows`.
- Análise individual; drill-through dos produtos escolhidos, mesma família, deltas e descrição snapshot preservados.
- Comparação de importações e TOP variações pela família ERP; controlador real da exportação com XLSX mockado exporta exatamente os códigos da fila filtrada.
- Todos os fluxos só fazem SELECT; tabelas mockadas permanecem idênticas. Query mock recusa tabela inesperada e consulta sem paginação; métodos de escrita/RPC nunca são chamados.
- Produto no Master sem operacional continua na hierarquia; ERP sem fatos não entra na análise.
- Master com mais de 1.000 linhas: erro, página curta e contagem alterada bloqueiam hierarquia/histórico/gráficos/drill-through, sem fallback silencioso.
- Catálogos com rótulos repetidos mantêm identidade por código; código de catálogo ambíguo não escolhe vencedor; Master duplicado bloqueia a análise.

Os mocks temporais de `tests/api-product-history.test.js` passaram a fornecer as novas fontes SELECT, mantendo as três regressões de competência existentes.

Suíte completa: **37 arquivos / 531 testes passaram**. Lint e typecheck passaram com os binários locais; build passou com configuração pública obtida via GET do runtime publicado, sem mudar env ou runtime-config versionados. `git diff --check` passou. Comandos equivalentes aos scripts do pacote:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json
node node_modules/vitest/vitest.mjs run
```

Build foi executado pela função `buildWeb({env})` de `scripts/build-web.mjs`, com env apenas em memória. Não publica. O build inclui o novo módulo pelo mecanismo existente de cópia de `core/`.

## Validação real somente leitura

Em 16/10/2026 às 14:36:38 (America/Sao_Paulo), o código local da API foi executado em Node com o SDK instalado, substituindo apenas o import CDN e fornecendo configuração pública do runtime publicado. O projeto foi conferido como Custos-Germani. Uma guarda de fetch recusava métodos diferentes de GET/HEAD. Não houve login, RPC, SQL, escrita, alteração de env ou uso de chave administrativa. Scripts e módulo temporários foram removidos ao terminar.

Foram feitas **114 requisições GET**, incluindo leitura integral ordenada de sete tabelas antes e depois. [JSON de prova](custos-classificacao-erp-validacao.json) contém contagens, SHA-256, cobertura e cenário agregado, sem credenciais nem linhas brutas.

- `historico_custos`: **1.370 fatos / 437 códigos**, todos mantidos, zero desaparecidos.
- `dicionario_produtos`: **6.113 registros**, com os mesmos **151** produtos de Custos com família operacional; nenhuma família preenchida no banco.
- Master ERP: **860 produtos**, dos quais **265** aparecem em Custos; os outros **172** produtos de Custos usam o fallback operacional.
- Classificação analítica: **437 com origem / 315 com família / zero com agrupamento**. Ganho de **164** produtos classificados por família, com **122** ainda sem família analítica.
- Filtros: **12 origens / 37 famílias / zero agrupamentos**, contra as 18 famílias operacionais da etapa anterior.
- Origem **CHOCOLATE PRODUZIDO UN**, família ERP **PASCOA UN**: cascata e agregado contêm os mesmos **46 produtos** e 46 fatos. Produto **1769541U**: análise individual e drill-through retornam o mesmo único fato.
- Contagens e hashes antes/depois idênticos em Custos, operacional, Master, OP e nos três catálogos. OP manteve 704 registros; catálogos mantiveram 50 origens, 103 famílias e 34 agrupamentos.

Essas provas são leituras sob a visibilidade da chave pública, sem snapshot transacional entre requisições. Detectam divergências observadas, sem prometer exclusão de toda mutação concorrente possível.

## Conferência manual na interface local

Chrome em `http://127.0.0.1:8765/`, com frontend do checkout. Harness descartável forneceu usuário sintético apenas localmente, sem testar/modificar Auth real, e cliente Supabase restrito a GET/HEAD com a configuração pública publicada. Nenhuma alteração de autenticação ou harness foi adicionada ao código do produto. Realtime foi substituído por stub no harness. Servidor/aba/scripts temporários foram encerrados/removidos.

1. Abrir Custos, escolher **CHOCOLATE PRODUZIDO UN → PASCOA UN**, agrupamento TODOS e Item/Produto TODOS.
2. Selecionar Intervalo **01/02/2026–15/03/2027** e clicar Analisar.
3. Confirmado: **46 itens analisados**, 47 opções de produto contando TODOS e apenas TODOS no agrupamento. [Captura agregada](custos-erp-agregado.png).
4. Selecionar **1769541U** e clicar Analisar: **1 item**, código correto na fila. [Captura individual](custos-erp-individual.png).
5. Clicar na linha: drill-through com **1 registro**, competência maio/2026 e importação 07/08/2026 separadas.

Não foi feito deploy nem teste da nova versão publicada. Exportação foi validada pelo controller em teste automatizado; não houve download de XLSX real nesta conferência manual. A sessão Auth real não faz parte da validação local.

## Arquivos e documentação

Código: `core/custos-classification-engine.js` (novo), `src/services/api.js`; comentário de autoridade atualizado em `core/heuristic-engine.js`, sem lógica nova nesse guardrail. Testes: `tests/api-custos-pagination.test.js`, `tests/api-product-history.test.js`.

Documentos revisados/atualizados: README, ROADMAP, AGENTS, modelo de banco, matriz operacional, os três manuais, índice de auditoria, backlog e este registro com JSON/capturas. VISION foi revisado e permanece coerente, sem mudança de identidade/direção ou changelog. A regra nova sucede explicitamente a exclusividade operacional de origem/família analíticas de Custos; os relatos históricos continuam preservados.

Não foram alterados schemas, migrations, tabelas remotas, flags, env, `historico_custos`, `apontamentos_op`, os dois dicionários ou `categorias_agrupamento`.
