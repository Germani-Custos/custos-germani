# MNT-OP-05 — paginação integral da Auditoria de OP

Validação em **23/10/2026**, checkout inicialmente limpo no HEAD `44975cc`. Implementação local, aguardando revisão humana. Nenhum commit, push, deploy, migration, alteração de Auth/RLS/schema ou escrita de dados no Supabase. Todas as consultas reais desta tarefa foram leituras; não houve importação para teste.

## Diagnóstico antes da alteração

`view/ui-controller.js` instancia `createOpController` e conecta o callback de importação a `reloadData()`. `view/ui-op.js:reloadData()` chama `api.getApontamentosOp({})` uma vez e guarda a resposta em `allRows`. O método em `src/services/api.js` fazia `select('*')` e quatro ordens, sem `range`, `limit` ou `count`. O teto da resposta PostgREST era tratado como universo completo; não havia um corte local de 1.000 na UI.

SELECT real em `public.apontamentos_op` confirmou **1.469 registros e 1.469 IDs únicos**. A aba publicada autenticada exibiu **1.000 linhas**, KPI total 1.000, **222 gargalos**, cinco paradas operacionais e 285 altas eficiências. A prova HTTP anterior da reconciliação é `Content-Range 0-999/1469`; nesta tarefa a reprodução foi conferida diretamente na UI autenticada e comparada ao SELECT atual. A documentação oficial confirma que [range é inclusivo e depende da ordem](https://supabase.com/docs/reference/javascript/using-modifiers-range).

O caminho posterior é local: cascata/competência → `buildOpInvestigationQueue` → KPIs → filtro de motivo → todas as linhas da fila. Não há janela de 200 nessa fila de OP; essa janela pertence a Custos. Dossiê e histórico por produto derivam de `contextRows`, dentro do recorte de competência e filtros atual; motivo não reduz esse contexto. A ordenação investigativa é do motor. Não há exportação OP neste checkout; o XLSX de Custos tem outro controller e não foi alterado. Não há consulta histórica paralela ou truncamento adicional na apresentação de OP.

Também havia consultas únicas de enriquecimento por IN/catálogos: abaixo do teto na base atual, mas insuficientes para garantir completude conforme o volume crescesse. A correção reutiliza os leitores existentes nessas fontes do mesmo fluxo.

## Implementação e contrato

Somente `getApontamentosOp` mudou no runtime:

- `lerCompleto` existente, páginas de **500** com `count: 'exact'`, intervalos 0–499, 500–999 e 1.000–1.499 na fotografia atual. Não há teto total.
- Os filtros existentes de competência normalizada, estágio, origem, OP e produto são repetidos antes de cada página. Origem/OP zero continuam válidos. A UI continua carregando o universo uma vez e filtrando em memória.
- Ordem anterior preservada: `data_referencia DESC, estagio ASC, origem ASC, op ASC`; `id ASC` acrescentado somente como desempate para ordem total.
- Erro, página incompleta, contagem ausente/alterada impedem retorno parcial, pelo leitor compartilhado. A OP também recusa IDs repetidos; não os elimina silenciosamente.
- Produtos pelo `lerDicionarioDosCodigos`, com IN em blocos de 500, e catálogos paginados por id. Enriquecimento mantém resolução operacional e retorno `classificacaoMestre`.

`core/op-investigation-engine.js` e `view/ui-op.js` não foram alterados. Critérios de produção/tempo/KG por hora/parada, prioridade, confiança, evidências e decisão permanecem iguais. `data_referencia` continua competência; `criado_em` continua importação/proveniência. Nenhum novo RPC, SQL no frontend, estado, mecanismo de paginação ou fonte de classificação.

Paginação por offset não equivale a snapshot transacional entre requisições: alteração concorrente com mesma contagem, sem repetir IDs, pode não ser detectada. As provas reais foram feitas com contagem e hash de OP estáveis antes/depois; isso não cria garantia de snapshot para mutações futuras.

## Testes automatizados

`tests/api-op-pagination.test.js`: 19 testes novos. O mock reproduz o teto de 1.000 em consulta sem range; os 19 testes falharam antes da implementação. Cobrem vazio/37/999/1.000/1.001/1.469/2.501, igualdade dos fatos anteriores ao enriquecimento, identidade única e todos os itens enviados ao motor, classificação além da primeira página, IN em blocos, catálogos acima de 1.000, filtros antes do range, ordem repetível com empates e entrada embaralhada. Falhas de página curta/vazia/count alterado/ausente/rede/ID repetido e enriquecimento parcial retornam erro sem dados parciais.

`tests/ui-op.test.js`: regressão adicional com 1.469 apontamentos percorre o controller e motor reais; prova fila completa, item 1.469, dossiê/histórico integral, competência posterior à posição 1.000 e motivo investigativo sem nova consulta. No recorte sintético de 469 linhas há 235 gargalos; filtro de motivo mostra 235, KPI/contexto permanecem 469 e histórico conserva somente o período escolhido.

Verificações aprovadas:

- Suíte integral: **647/647 testes, 42 arquivos**, `node node_modules/vitest/vitest.mjs run --maxWorkers=2`.
- Lint: `node node_modules/eslint/bin/eslint.js .`.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`.
- Build: `scripts/build-web.mjs`, com configuração pública e execução local; nenhuma publicação.
- `git diff --check` e inspeção de escopo/ausência de mudança no motor.

## Leitura real e UI local autenticada

Frontend gerado pelo build, servido em `http://127.0.0.1:4173/`, com a mesma URL/chave pública da configuração publicada e login normal realizado pelo usuário. Nenhuma credencial foi copiada da sessão publicada. Servidor local somente GET/HEAD; o frontend consultou diretamente o Supabase com Auth/RLS existentes. Uma página temporária de prova em `dist` (ignorado pelo Git) importou a API e o motor do mesmo build e apresentou somente contagens, identidades de exemplo e comparações; não integra o produto.

Sem filtros, a conferência encontrou:

- Banco: **1.469** registros / IDs únicos.
- API corrigida: **1.469** carregados / IDs únicos; sequência de IDs idêntica em duas leituras completas.
- Após filtros sem restrição: **1.469**.
- Entrada e saída do motor: **1.469**.
- Fila real renderizada: **1.469** linhas.
- Gargalos: **299**; paradas operacionais: **7**; alta eficiência: **360**.

Os primeiros 1.000 da mesma resposta completa, processados pelo mesmo motor sem mudança de regra, produziram **222 gargalos / cinco paradas / 285 altas eficiências**, iguais aos KPIs da versão publicada. A diferença resulta dos dados antes omitidos, não de novos critérios.

Totais por competência, iguais ao SELECT e à entrada/saída do motor:

- Junho: **296** registros, 57 gargalos, uma parada, 58 altas eficiências.
- Julho: **408**, 77 gargalos, uma parada, 102 altas eficiências.
- Agosto: **386**, 69 gargalos, quatro paradas, 124 altas eficiências.
- Setembro: **379**, 96 gargalos, uma parada, 76 altas eficiências.

Consulta real `getApontamentosOp({dataReferencia:'2026-06'})`: 296 linhas e os mesmos IDs da filtragem local do universo completo. Na tela, De/Até junho exibiu **296 linhas / 57 gargalos**. Motivo Gargalo exibiu **57 linhas**, mantendo KPI total 296. Dossiê da OP 2128/MI001 mostrou histórico contextual com nove registros de junho, incluindo outros motivos; nenhum mês fora do recorte.

O SELECT com a ordem total identifica a posição **1.001** como **id 1286, competência 01/07/2026, FORNO, origem 200, OP 2288, produto MB007**. A API devolveu os mesmos campos; a fila real contém essa ocorrência (índice investigativo 1.411, pois o motor reordena) e abriu seu dossiê. A outra ocorrência da mesma OP/produto em BISCOITO é um fato distinto, não duplicação de página.

O primeiro item da fila integral conservou a OP 833/1021146 com 91,3% de atendimento, +101,2% de tempo, −50,3% de produtividade e 25,4% de parada. A verificação não recalculou fórmulas fora do motor existente.

## Preservação e limites da entrega

SELECT antes/depois: 1.469 linhas, 1.469 IDs únicos e o mesmo SHA-256 integral:

`99fbe5eb5091cc9cd33285685ec4886d64ad3373e664e44d50d34b07d92d3d19`

Método: SHA-256 de `string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text)` em UTF-8 sobre toda `public.apontamentos_op`, sem selecionar subset de colunas. Nenhuma escrita de dados, criação de conta, alteração de autenticação, RLS, política ou schema foi executada nesta tarefa.

**MNT-OP-05 concluído localmente para revisão.** A versão publicada permanece com o comportamento anterior até autorização própria de publicação. Os outros P1/P2, inclusive problemas de ordenação/narrativa/comparação de Custos, não foram executados. Não há pendência técnica encontrada dentro deste escopo além do limite conhecido de concorrência entre páginas; publicação é etapa operacional separada.
