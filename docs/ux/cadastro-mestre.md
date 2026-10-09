# CAD-UX-01 — Usabilidade do Cadastro

## CAD-EXEC-WEB-01 — executar pela aplicação (09/10/2026)

Preview/decisão/download não executam carga. Novo **Executar reconstrução…**, disponível apenas com aprovação integral e autorização/configuração server-side, abre confirmação digitada com Master atual, inserções, atualizações, remoções e quantidade final. Cancelamento não envia POST. Função Node Vercel chama executor central com revalidação/snapshot/transação/rollback. Sucesso informa lote/contagens; falha permite consultar lote por SELECT, sem retry. Sem banco real/deploy nesta entrega; tabela operacional continua independente. [Arquitetura e configuração](../arquitetura/cadastro-mestre-execucao-web.md). Esta seção sucede a ausência de botão das fases abaixo. `data_referencia`/`criado_em` dos fatos permanecem competência/importação.

## CAD-REBUILD-01 — Preview de reconstrução (09/10/2026)

O fluxo CAD-XLS-01 agora usa o contrato `RECONSTRUCAO_UNIVERSO_V1`. A contagem antes chamada **preservados fora dos filtros ou ausentes** passa a **produtos a remover do Cadastro Mestre**, com imagem anterior e motivo por código. O modal também mostra Master antes/depois, válidos, novos, existentes e existentes com UPDATE. Preservações passam a se referir aos campos vazios de quem permanece, sem preservar produtos fora do universo.

Origem/família ERP preenchidas podem ser propostas, assim como descrição e agrupamento. Todas as propostas, incluindo remoções, precisam de aprovação para a execução integral; revisão parcial, erros ou universo vazio impedem a reconstrução. A tela continua somente SELECT, decisões locais e download: sem botão de execução, DELETE, SQL ou RPC. O comando administrativo usa o mesmo adapter/motores e tem snapshot/log/transação, descritos no [contrato vigente](../arquitetura/cadastro-mestre-reconstrucao.md). Tabela manual continua na dimensão operacional. Sem alterações de competência `data_referencia` ou evento `criado_em` nos fatos.

Os registros de CAD-XLS-01/CAD-UX-01 abaixo descrevem o comportamento e validação das entregas originais. A preservação de ausentes/bloqueios de origem/família da primeira entrega de Preview foi substituída apenas para o Master ERP. Regressores atuais de formatos/UI validam cinco remoções, quatro produtos finais e oito propostas no contexto sintético de oito produtos; PostgreSQL em memória verifica reversão integral sem banco real.

## CAD-XLS-01 — Preview e aprovação na tela (08/10/2026)

### Causa e decisão de integração

O `accept` do Cadastro e a validação de `view/ui-product-master.js` restringiam o arquivo a XLSM. Porém o botão também chamava diretamente `api.importProductMasterXlsm`, gravando a dimensão operacional sem Preview, filtros das Fases 3.1/3.3 ou aprovação. Liberar apenas a extensão encaminharia XLS ao fluxo errado.

Após apresentar essa divergência, o usuário confirmou ligar o seletor ao Preview/aprovação existente, **sem criar executor ou escrita automática**. O botão passou a ser **Preview mestre (XLSM / XLSX / XLS)**. A tabela/edição manual continuam em `dicionario_produtos`; o Preview consulta exclusivamente `dicionario_master_produtos` e os catálogos por SELECT. O legado não foi alterado, mas não é mais chamado pelo seletor.

### Pipeline único

`createCadastroMestrePreviewController` → `api.getCadastroMestrePreviewContext()` → `prepararAprovacaoArquivoCadastroMestre(arquivo,contexto,XLSX)` → adapter SheetJS existente → filtros/normalização/comparação existentes → manifesto e revisão pendente → apresentação/decisões locais → download JSON opcional.

O frontend lê o arquivo original com `arrayBuffer`; o `xlsx.full` 0.20.3 já carregado reconhece XLS binário BIFF, XLSX e XLSM. Não há parser novo, conversão, servidor de importação, dependência nova ou mudança do contrato. Adapter e motores de Preview/aprovação permanecem intactos. A validação canônica de extensão continua no adapter e aceita caixa variável.

Regras preservadas:

- Tipo P/C mantém; D e outros excluem. Depois, Descr. (Origem) deve conter Produzido/Revenda; descrição com inativo/EXLUIR exclui.
- ERP preenchido pode gerar proposta; vazio/coluna opcional ausente preserva o atual. Produto ausente ou fora do conjunto filtrado permanece preservado.
- Agrup. Prod. continua `agrupamento_erp_valor`, sem ponte ou conversão Pxxx → Mxxx.
- Novo é uma proposta indivisível somente no Master ERP. Descrição e agrupamento de existente são independentes; bloqueios de origem/família continuam no motor.

### Apresentação e decisões

O modal mostra linhas lidas/após filtros/excluídas, produtos válidos/existentes/novos, produtos/campos alterados, preservados fora do recorte, existentes sem operação, campos preservados e erros. Preservados fora do recorte e existentes sem operação são contagens separadas, sem confundir preservação de campo com quantidade de produtos.

Propostas mostram atual/ERP/proposto; seções expansíveis apresentam todos os produtos válidos, preservados, campos preservados, pendências e erros, sem truncamento silencioso. Valores ERP são escapados antes de HTML. Decisões individuais e globais usam os helpers canônicos; **Aprovar todas as permitidas** deixa propostas bloqueadas pendentes. Rejeitar/voltar a pendente abrangem todo o manifesto.

**Baixar revisão (sem gravar)** gera JSON `{manifesto,revisao,aprovado}`, com vínculo e hashes existentes e `execucao_permitida:false`. Aprovar ou baixar não cria lote nem atualiza o banco. **Fechar** descarta decisões locais. Um arquivo novo cria uma revisão pendente nova; seleção simultânea é bloqueada enquanto o Preview está sendo preparado/aberto. Falhas passam pela fronteira operacional ERR-01 e liberam o seletor, sem contexto vazio artificial.

Sem executor, escrita de log/proveniência, schema, migration, RPC ou SQL frontend. A carga pontual da Fase 3.4 não foi repetida. `data_referencia` permanece competência e `criado_em` evento de importação nos fatos; o Preview não altera esses campos.

### Validação local e limites

As regressões usam **XLS binário BIFF verdadeiro gerado com dados sintéticos**, confirmado pela assinatura Compound File Binary, e os mesmos registros em XLSX/XLSM. O caso possui oito linhas, quatro excluídas, quatro válidas, três existentes, um novo, duas alterações de campos em um existente, cinco produtos preservados fora do conjunto, dois existentes sem operação e quatro campos vazios preservados. Confere acentos, zeros de máscara numérica, código científico, Agrup. Prod., filtros, ausentes e propostas equivalentes entre formatos.

Testes da UI acionam o controlador real do Cadastro, adapter/motores reais e API/rede mockadas. Cobrem seletor HTML, chegada ao modal nos três formatos, decisões por campo/globais, bloqueios, cancelamento/download, falha de SELECT/arquivo, concorrência, reinício e escape. Toda a validação usa dados locais; nenhuma escrita real no Supabase.

Um arquivo XLS original do ERP não foi disponibilizado nesta tarefa. A prova automatizada verifica o formato XLS real e o pipeline com conteúdo sintético; não afirma validação de um lote original de produção.

Chrome headless validou o HTML/CSS e controladores reais, com API substituída por contexto sintético em memória: XLS/XLSX/XLSM chegaram ao Preview, aprovação global e por campo funcionaram, e o JSON baixado continha somente as propostas aprovadas com execução desabilitada. Nenhuma chamada Supabase. Viewports 1440×900 e 390×700 foram inspecionadas; CSS `.master-preview` mantém contraste dos controles e permite quebra de texto nas contagens sem afetar tabelas existentes.

Verificação final: **267 testes em 25 arquivos passaram** (17 regressões novas); lint, `tsc --noEmit -p jsconfig.json` e `git diff --check` passaram. Comandos executados com Node e os CLIs locais de `node_modules`, sem binários globais: `node node_modules/vitest/vitest.mjs run`, `node node_modules/eslint/bin/eslint.js .`, `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`. Sem commit, deploy, migration ou carga real.

As seções CAD-UX-01 abaixo registram a entrega anterior à ligação do seletor ao Preview.

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
