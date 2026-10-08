# Cadastro Mestre — manifesto e revisão local (Fase 3.3)

## Continuidade autorizada — Fase 3.4

Em 08/10/2026, um pedido humano separado autorizou as 423 propostas após revalidação integral. A execução pontual concluiu o lote 1, com 103 novos e 312 existentes atualizados (320 patches). O manifesto/evidência originais não foram editados. O núcleo/relatório de revisão continuam sem executor; somente a migration pontual realizou a carga no Master/log, sem escrita operacional ou alteração de RLS. [Registro completo da Fase 3.4](cadastro-mestre-execucao-fase3-4.md). As referências a 'sem execução' abaixo descrevem a entrega histórica da Fase 3.3, não anulam o lote posterior.

Entrega **CAD-APPROVAL-01**, 2026-10-08. Prepara propostas e controles de revisão; **não executa aprovação do lote real nem grava dados**. Não existe executor, migration, escrita de log ou ativação no importador legado. Custos e OP continuam consumindo `dicionario_produtos`.

## Campo ERP oficialmente identificado

Decisão de negócio explícita: **`Agrup. Prod.`**, coluna **Q** do arquivo real, alimenta `agrupamento_erp_valor`. O adaptador agora aceita o alias exato normalizado `agrup prod`, sem similaridade textual. No arquivo real são 7 cabeçalhos reconhecidos e 249 não utilizados. Outros agrupamentos não são escolhidos como substitutos; dois aliases concorrentes continuam sendo erro de cabeçalho ambíguo.

Preservar o escalar ERP após a normalização técnica já contratada (trim lateral, preservando caixa/zeros/espaços internos). **Pxxx não é Mxxx**. Não existe conversão para `categorias_agrupamento.id` nem alteração de `dicionario_produtos.agrupamento_cod`.

## Arquitetura e contratos

`prepararAprovacaoArquivoCadastroMestre(arquivo,contexto,XLSX,nomeAba?)`, em `src/services/cadastro-mestre-preview.js`, lê os bytes uma vez, reutiliza o adaptador e calcula SHA-256 de arquivo/contexto. Usa Web Crypto em contexto seguro. Recebe contexto read-only completo, já consultado por `api.getCadastroMestrePreviewContext()` ou snapshot. Não consulta nem escreve no banco por conta própria.

`core/cadastro-mestre-approval-engine.js` reutiliza o Preview puro e exporta:

- `criarManifestoCadastroMestre(linhas,contexto,fonte)`: propostas, preservações, pendências e detalhes, com ordenação determinística.
- `criarRevisaoCadastroMestre(manifesto)`: todas as propostas começam **PENDENTES**.
- `decidirOperacoesCadastroMestre(manifesto,revisao,ids,decisao)`: decisão local individual/lote, com IDs explícitos. Aceita APROVADO, REJEITADO ou retorno a PENDENTE, sem modificar entradas.
- `obterOperacoesAprovadasCadastroMestre(manifesto,revisao)`: conjunto explícito independente das propostas escolhidas, mantendo `execucao_permitida:false`.

O núcleo não acessa Supabase, DOM, rede, relógio, aleatoriedade ou armazenamento. IDs são categoria + código canônico. Uma serialização canônica do manifesto completo vincula decisões aos dados revisados; mudar qualquer proposta/metadata invalida a revisão anterior. Isso não é assinatura criptográfica nem autorização de escrita. A execução futura deve revalidar arquivo, contexto, precondições, permissões, concorrência e proveniência.

## Categorias do manifesto

- **NOVO_PRODUTO**: um INSERT candidato no Master, com código e campos ERP recebidos não vazios. Vazios são omitidos, nunca propostos como NULL. Origem/família pendentes continuam códigos ERP brutos, sem categoria ou FK Kustos inventada. INSERT é uma decisão indivisível.
- **ATUALIZAR_DESCRICAO**: UPDATE candidato contendo somente `descricao`, com atual/ERP/diferença, demais campos recebidos e precondição de existência/valor anterior.
- **ATUALIZAR_AGRUPAMENTO_ERP**: UPDATE candidato contendo somente o valor ERP não vazio e diferente do atual. Master NULL é preenchimento normal, não conflito. Igual ao atual não gera escrita nem renovação de proveniência.
- **CAMPO_VAZIO_PRESERVA_EXISTENTE**: preservação de campo, não operação. Novos usam CAMPO_VAZIO_OMITIDO_NO_INSERT; coluna ausente usa CAMPO_NAO_FORNECIDO.
- **SEM_ALTERACAO**: existente sem mudança relevante não possui operação.

Descrição e agrupamento de um existente são aprováveis independentemente. Portanto UPDATEs **por campo** não equivalem a produtos afetados. A fusão/execução desses patches não foi implementada. Alterações inesperadas de origem/família de existentes são diagnosticadas fora do escopo e bloqueiam aprovação das propostas desse produto, sem execução silenciosa.

Cada proposta informa `campos_lote_na_execucao`: `ultima_importacao_cadastro_mestre_id` e, somente quando contém agrupamento preenchido, `agrupamento_erp_importacao_id`. O ID **BIGINT** real do lote só será definido na execução futura. Não são fabricados IDs, datas, NULLs de proveniência ou comandos SQL. Nenhuma proposta altera fatos ou `data_referencia` (competência); `criado_em` continua evento de importação.

## Revisão pelo usuário

Relatório local independente, sem integração às telas de Custos/OP ou ao importador legado: grupos Novos, Descrição, Agrupamento ERP, Pendências, Campos preservados, Fora do conjunto filtrado e Sem operação. Oferece busca, paginação sem perda, detalhes completos antes da decisão, aprovação/rejeição individual ou global e retorno a pendente. Controles globais abrangem todo o manifesto, independentemente do filtro. Decisões ficam locais e vinculadas ao manifesto.

Download produz JSON com fonte, vínculo, decisões e conjunto aprovado para a próxima etapa. **Não existe botão de executar nem conexão Supabase no relatório.** Rejeitar todas produz conjunto aprovado vazio. O agente entrega o lote real sem decisões aplicadas; testes de interação usam somente fixtures sintéticas.

`scripts/cadastro-mestre-review-artifact.mjs` gera apenas texto do canvas e incorpora exatamente as funções de revisão testadas do núcleo, pois o canvas não aceita imports locais. Não escreve arquivos nem acessa rede/banco. O arquivo ERP permanece inalterado.

## Manifesto real de 08/10/2026

Filtros mantidos: Tipo P/C → Descr(Origem) contendo Produzido/Revenda → descrição sem inativo/EXLUIR. Base anterior reproduzida: **853 produtos, 750 existentes, 103 novos, 739 existentes sem alteração antes do novo campo, 11 diferenças de descrição**.

- **103 INSERTs candidatos**: 33 novos com agrupamento, 70 sem agrupamento.
- **320 UPDATEs candidatos por campo em 312 existentes**: 11 descrição + 309 agrupamento; oito produtos possuem ambas as propostas.
- **438 existentes sem operação** após considerar agrupamento.
- **342 agrupamentos preenchidos / 511 vazios**: existentes 309/441; novos 33/70.
- P005 = 305 (1 novo, 304 existentes); P302 = 5 (todos existentes); P801 = 32 (todos novos).
- Famílias: 167 produtos resolvidos por código exato, 686 pendentes. Origens: 853 resolvidas, zero pendentes.
- **4.853 produtos do Master fora do conjunto filtrado**, preservados sem UPDATE/DELETE. Nenhum está fisicamente ausente do arquivo nesta leitura; presença física não equivale a elegibilidade pelos filtros.
- Zero erros, zero propostas bloqueadas. **423 propostas PENDENTES; zero aprovadas e zero rejeitadas.**

SHA-256 do arquivo: `ea5092e92e9b843f341545837f6618998072dc2c533cc837d1807ce7f69ef6da`.

SHA-256 do contexto read-only: `c2660e76d861b7ad56484f16ffe152e214585abfaf4866e46681de11f3aacd18`.

O hash binário do arquivo difere do Preview original, conforme identificado na Fase 3.2.1. Os valores lidos das 256 colunas permaneceram iguais e a base foi novamente confirmada; não presumir identidade binária entre essas versões.

## Validação e limites

Testes cobrem os 15 critérios solicitados, revisão por campo, vínculo do manifesto, entradas congeladas, códigos exatos, zero escrita, preservação fora dos filtros e o alias oficial entre agrupamentos concorrentes. Interações do relatório são testadas com fixtures sintéticas/SDK simulado; não constituem aprovação real ou validação visual no host.

Banco real: comparar contagens e fingerprints antes/depois do Master, operacional, mapa, fatos, três categorias e log cadastral. Relatório integral/JSON de evidência ficam fora do repositório para não versionar milhares de dados ERP na documentação. Consultas de produção são exclusivamente SELECT. Nenhuma policy de escrita foi criada. Execução, registro de lote e resolução operacional continuam não implementados.

### Ressalva detectada na comparação real

Oito das nove tabelas tiveram contagem e fingerprint de conteúdo iguais, incluindo Master, mapa, fatos, categorias e log. `dicionario_produtos` manteve 6.113 registros, mas seu fingerprint pelo mesmo método mudou de `54bd84ecf0a58533d6d1e20744b437f1` para `1555ee693aabad7d5e8536a36666721b`. Uma nova leitura confirmou o segundo hash. A tabela é física e sua collation determinística; `max(atualizado_em)` permanece em 2026-08-13, portanto o timestamp não identifica a mudança.

Não foi preservada uma imagem inicial completa da dimensão operacional nesta fase, somente seu fingerprint. Assim, os campos/registros/autoria da mudança não foram determinados e não se pode afirmar que essa tabela permaneceu inalterada durante o intervalo. **Todas as consultas desta tarefa foram SELECT, sem escrita pelo agente.** O manifesto depende somente do Master e dos catálogos, que permaneceram iguais; suas contagens base e chaves foram confirmadas. A divergência é registrada, não corrigida nem atribuída por suposição. Deve ser esclarecida antes de qualquer futura execução; preparar revisão não autoriza corrigir a dimensão operacional.

[Contrato de Preview e limites de leitura concorrente](./cadastro-mestre-preview.md).

## Arquivos e verificação da entrega

Implementação: `core/cadastro-mestre-approval-engine.js`, `src/services/cadastro-mestre-preview.js`, `scripts/cadastro-mestre-review-artifact.mjs`.

Testes: `tests/cadastro-mestre-approval-engine.test.js`, `tests/cadastro-mestre-review-artifact.test.js`, `tests/api-cadastro-mestre-preview.test.js`.

Documentação: este contrato; `docs/arquitetura/cadastro-mestre-preview.md`; `docs/arquitetura/matriz-contratos-operacionais.md`; `docs/auditoria/backlog-priorizado.md`; os três manuais; `README.md`, `VISION.md`, `ROADMAP.md` e `AGENTS.md`. Nenhum arquivo de Custos/OP, migration, configuração ou dependência foi alterado.

Validação final: **235 testes em 21 arquivos aprovados**, lint com exit 0, `tsc --noEmit -p jsconfig.json` com exit 0 e `git diff --check` com exit 0. O Git emitiu apenas avisos de conversão futura LF/CRLF, sem erros de whitespace. Artefatos salvos foram comparados integralmente com as evidências em memória. Não foi feito commit, deploy, aprovação do lote real ou execução de importação.

Commit sugerido: `feat(CAD-APPROVAL-01): prepara manifesto e revisão local do Cadastro Mestre`.
