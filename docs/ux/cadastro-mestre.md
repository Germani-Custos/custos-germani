# CAD-UX-01 — Usabilidade do Cadastro

Entrega: **2026-10-08**. Escopo: navegação da tabela e remoção explícita do agrupamento na edição manual.

## Fonte atual e limites

A tela `view/ui-product-master.js` consulta e edita `dicionario_produtos` pelos métodos existentes `getProductMaster`/`upsertProductMaster`. O Master ERP `dicionario_master_produtos` e a carga pontual da Fase 3.4 são separados e não foram alterados. Não há novo schema, ponte de agrupamento, migração, política RLS ou integração de importação. Nenhuma carga foi reexecutada.

Editar a classificação atual continua atualizando a dimensão consumida por Custos/OP, sem regravar mapa, fatos, categorias ou proveniência do Master ERP. `data_referencia` permanece competência e `criado_em` evento de importação.

## Rolagem em listas extensas

**Causa:** `.table-panel` tinha apenas `overflow-x: auto`, sem limite de altura. Sua barra horizontal ficava depois de todas as linhas, e não junto à área visível de navegação.

**Correção:** somente o Cadastro recebe `.master-table-scroll`, com `overflow: auto`, altura máxima de `60dvh` (fallback `60vh`) e sem padding interno. Os dois eixos pertencem ao mesmo contêiner; não há barra duplicada, estado de sincronização ou listeners de scroll. O `th` sticky existente usa esse mesmo contêiner e permanece no topo durante a navegação vertical. A região aceita foco pelo teclado e possui nome acessível.

A altura acompanha a viewport. Em telas pequenas, basta posicionar a área da tabela na tela; a barra horizontal fica no rodapé dessa área, sem precisar chegar à última linha. A lista mantém os dados, filtros, ordem e comportamento de paginação existentes. Não foi acrescentado limite de registros.

## Remoção manual versus preservação ERP

**Causa:** o formulário enviava `agrupamento_cod: ''`, mas `buildProductMasterPayload` omitia campos vazios. O upsert não recebia `NULL`, mantendo o agrupamento já salvo.

**Correção:** o salvamento manual usa `buildManualProductMasterPayload`, que reutiliza o payload persistível existente e inclui `agrupamento_cod: null` quando esse campo é explicitamente vazio ou nulo. Campo omitido continua preservando o agrupamento atual na API. Demais regras de campos e normalização de produto permanecem iguais.

Fluxo: **M005 → Sem agrupamento → Salvar classificação → `agrupamento_cod = NULL`**. Após recarregar, a tabela mostra **Sem agrupamento** e o editor mantém essa seleção. Escolher outro agrupamento volta a gravar seu código; cancelar não grava.

O importador continua usando `buildProductMasterPayload` e `reconcileProductMasterImport`, sem alteração: vazios no ERP preservam valores, produtos ausentes não são excluídos e agrupamento investigativo não é inferido do ERP.

## Validação

- Lint e typecheck passaram com dependências instaladas do lockfile (`npm ci`, CLI npm 10).
- Testes de engine/API cobrem remoção explícita, campo omitido, preservação dos demais campos, nova atribuição, falha de escrita e preservação ERP.
- Chrome headless com HTML/CSS, controlador e API reais do checkout; Supabase substituído por fixture em memória, sem banco compartilhado. Lista com **5.706 produtos sintéticos**, sem uso dos dados reais do lote.
- Viewports **1440×900**, **1024×768** e **390×700**: ambos os eixos, barra no rodapé da área visível, cabeçalho sticky no início/meio/fim, deslocamento horizontal correspondente ao `scrollLeft` e ordem preservada.
- Fluxo em navegador: M005 → remoção → recarga/reabertura → M006; cancelamento sem escrita; XLSM com campos vazios preservando M006.
- Suíte completa: **247 testes passaram; 3 falhas preexistentes** em `tests/cadastro-mestre-review-artifact.test.js`. O gerador procura o marcador `/**\n * Cria propostas`, que não corresponde ao checkout CRLF no Windows. O código de `HEAD` reproduz a falha em CRLF e gera o artefato em LF. Esses arquivos/pipeline não foram alterados nesta tarefa.

## Conferência após deploy

1. Abrir Cadastro com uma lista extensa; posicionar a área da tabela na viewport e rolar suas linhas até o meio. Mover horizontalmente pela barra no rodapé da área e conferir o cabeçalho fixo. Repetir com janela estreita.
2. Em um produto de teste autorizado, editar M005 para **Sem agrupamento**, salvar e reabrir. Confirmar **Sem agrupamento** na tabela/editor e `NULL` na dimensão operacional.
3. Atribuir outro agrupamento e conferir a recarga. Selecionar **Sem agrupamento** novamente e cancelar: o agrupamento salvo deve permanecer.

A validação local não realizou escrita em produção nem executou a migração da Fase 3.4.
