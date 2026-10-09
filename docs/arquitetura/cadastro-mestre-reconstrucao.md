# CAD-REBUILD-01 — Reconstrução do universo ERP (09/10/2026)

## Decisão e alcance

O conjunto de produtos elegíveis do arquivo ERP é a fonte de verdade de `dicionario_master_produtos`. Produto ausente ou excluído pelos filtros passa a ser uma **remoção proposta do Master**. Esta decisão substitui a preservação de produtos fora do conjunto nas Fases 3.1/3.3/3.4 e CAD-XLS-01. As evidências dessas entregas continuam históricas e sua migration pontual não deve ser repetida.

Somente Master e `log_importacao_cadastro_mestre` recebem DML. `dicionario_produtos`, `mapa_produtos`, `historico_custos`, `apontamentos_op` e categorias ficam intactos. Nenhum produto operacional é criado. A tabela e a edição manual do Cadastro ainda mostram a dimensão operacional; por isso sua quantidade não deve ser confundida com a quantidade do Master ERP após reconstrução.

Nenhum schema, migration ou política RLS é alterado. O JSONB `metadados_origem` existente no log comporta snapshot integral, hash, remoções, decisões, contagens e provas. `data_referencia` continua competência dos fatos; `criado_em` continua evento de entrada. Nenhum desses campos dos fatos é alterado.

## Pipeline e contrato

`XLS/XLSX/XLSM → adapter existente → criarPreviewCadastroMestre → criarManifestoCadastroMestre(modo=RECONSTRUCAO_UNIVERSO) → revisão local → criarPlanoReconstrucaoCadastroMestre → executor administrativo`.

O parser e o motor de filtros não mudaram. A UI lê XLS diretamente no navegador, mantendo SheetJS 0.20.3. Filtros na ordem existente: somente Tipo P/C (D e outros excluídos), Descr. (Origem) contendo Produzido/Revenda, descrição sem inativo/**EXLUIR**, com as comparações case-insensitive já validadas.

O manifesto é `RECONSTRUCAO_UNIVERSO_V1`: inclui códigos do universo, imagem completa dos existentes, INSERTs, UPDATEs por campo e `REMOVER_FORA_UNIVERSO` por código. Remoções distinguem `FORA_DO_CONJUNTO_FILTRADO` e `AUSENTE_NO_ARQUIVO`. A aprovação se vincula ao manifesto integral. Todas as propostas, inclusive remoções, precisam estar aprovadas: rejeitada ou pendente impede a reconstrução inteira. Erros de identidade/validação ou universo vazio bloqueiam a execução, para não reconstruir sobre um arquivo incompleto. O Preview continua apresentando os erros.

Descrição, origem ERP, família ERP e `Agrup. Prod.` preenchidos podem gerar UPDATE; vazio ou coluna opcional ausente preserva o campo atual de quem permanece no universo. Origem/família são códigos ERP brutos, com resolução exata separada: não são FKs operacionais. A restrição histórica da Fase 3.3 a UPDATEs de origem/família continua apenas no modo incremental histórico. `Agrup. Prod.` permanece `agrupamento_erp_valor`, sem converter Pxxx para Mxxx. INSERT de novo produto é indivisível e omite campos vazios, respeitando defaults existentes.

`getCadastroMestrePreviewContext()` permanece SELECT paginado via `supabase.from()`, mas lê `*` do Master para vincular também proveniência/timestamps e quaisquer outros campos à imagem anterior. Categorias continuam somente leitura. O modo incremental de chamadas históricas diretas ao núcleo permanece para compatibilidade das evidências; o adapter usado pela tela e pelo executor exige reconstrução.

## Preview e aprovação

A tela mostra linhas lidas, excluídas/após filtros, produtos válidos, novos, existentes, existentes com UPDATE, propostas por campo, produtos a remover, quantidade do Master antes/depois e campos vazios preservados. Cada remoção mostra código, descrição atual e motivo, com destino explícito Master. A lista pode ser expandida integralmente.

Selecionar arquivo, decidir e baixar revisão são operações locais, sem gravação de lote. `execucao_permitida:false` permanece no download: ele é evidência revisável, não execução automática. O frontend não faz DELETE, RPC ou SQL bruto; não importa `pg` nem o executor. Não há botão de execução administrativa conectado ao browser.

## Execução atômica administrativa

Implementação: `scripts/reconstruir-cadastro-mestre.mjs` e `scripts/lib/cadastro-mestre-reconstruction.mjs`. Uma conexão PostgreSQL dedicada executa toda a transação, conforme o [contrato de transações do node-postgres](https://node-postgres.com/features/transactions). Não existe atomicidade entre chamadas independentes de `supabase.from()`; por isso o trabalho transacional ocorre no comando administrativo separado, sem RPC ou SQL no frontend.

1. Validar a revisão integral e exigir autor, identificador de lote, caminho novo de snapshot e confirmação `RECONSTRUIR_MASTER:<SHA256 do manifesto>`. Sem `--executar`, o comando apenas valida o plano local e não conecta ao banco.
2. Iniciar BEGIN, definir UTC, limites de lock/statement (3/30 segundos) e `row_security=off`: a conexão deve possuir acesso administrativo integral, ou a operação falha em vez de aceitar um universo parcialmente oculto por RLS. Obter locks EXCLUSIVE NOWAIT no Master/log e SHARE NOWAIT nas sete tabelas protegidas; leitores continuam permitidos, escritores concorrentes são bloqueados durante a transação. Falta de lock aborta sem espera indefinida.
3. Verificar catálogo: triggers ativos não internos, regras, herança/partições no Master/log ou qualquer FK apontando para Master bloqueiam a carga antes de modificar dados. Não remover dependências nem mudar schema automaticamente. Bloquear identificador de lote repetido. Relê arquivo original e contexto completo sob locks; recalcula manifesto usando o mesmo adapter. Qualquer divergência de bytes, nome/aba, contexto, propostas ou decisões exige novo Preview.
4. Capturar Master completo e fingerprints das tabelas protegidas. Inserir log `processando` com snapshot integral e SHA256. Salvar também JSON independente em disco com criação exclusiva (`wx`), sem sobrescrever, e sincronização (`fsync`), **antes de inserir/atualizar/remover produtos**. Falha ao salvar impede DML no Master e reverte o log. Só então criar SAVEPOINT.
5. Fazer INSERT em grupos de campos fornecidos, UPDATE consolidado por produto e DELETE somente da lista explícita aprovada do Master. Nenhum TRUNCATE, DELETE genérico ou DML nas tabelas protegidas. Validar contagens, universo exato, valores finais, campos preservados, timestamps/proveniência e fingerprints protegidos. Produto existente sem alteração mantém a imagem inteira; somente novas escritas recebem `ultima_importacao_cadastro_mestre_id`; lote de agrupamento muda somente quando agrupamento foi fornecido e efetivamente escrito.
6. Registrar `concluido`, contagens efetivas e hash/quantidade final, e COMMIT. Remoções ficam auditadas no JSONB do log e no snapshot anterior, com código, motivo e imagem completa, pois a linha removida não pode guardar sua FK de proveniência.

As consultas administrativas são parametrizadas; identificadores vêm de listas fixas internas. A conexão usa `CADASTRO_MESTRE_DATABASE_URL` no ambiente administrativo, nunca variável `VITE_*`, arquivo versionado, URL da UI ou parâmetro de linha de comando. `pg` e PGlite são devDependencies fixadas; não mudam o runtime/CDN do navegador. A sessão deve permitir os locks e DML requeridos e enxergar integralmente as tabelas; o comando não concede permissões nem altera RLS.

## Erro, concorrência e recuperação

- Erro em INSERT/UPDATE/DELETE, verificação ou conclusão do log: ROLLBACK TO SAVEPOINT, prova integral do Master restaurado e tabelas protegidas intactas; mesmo lote registra `falhou`, zero escritas persistidas e erro, preservando snapshot. O comando termina com erro. O Master nunca é publicado parcialmente.
- Erro anterior ao SAVEPOINT (aprovação, lock, dependência, repetição, arquivo/contexto ou snapshot): ROLLBACK completo, sem modificação do Master. Não há lote novo persistido; uma cópia local já criada pode permanecer como evidência.
- Falha ao persistir a auditoria: ROLLBACK completo quando a conexão permite; snapshot independente continua disponível. Se COMMIT foi enviado e a resposta se perdeu, o resultado é **não confirmado**, sem repetição automática: consultar identificador de lote, estado e snapshot antes de decidir. O PostgreSQL continua garantindo tudo ou nada no Master, mesmo com resposta incerta.
- O identificador já usado, inclusive lote `falhou`, não pode ser reutilizado. Após qualquer mudança no Master/arquivo, gerar nova revisão e identificador. Restaurar um snapshot requer procedimento administrativo explicitamente aprovado; não há restauração automática que possa apagar alterações posteriores.

As tabelas protegidas são: `apontamentos_op`, `categorias_agrupamento`, `categorias_familia`, `categorias_origem`, `dicionario_produtos`, `historico_custos`, `mapa_produtos`. Locks/provas cobrem essas tabelas; dependências desconhecidas do Master/log bloqueiam a carga em vez de permitir efeitos em cascata. Restrições locais adicionais podem rejeitar o lote, caso em que vale a mesma reversão.

## Operação e exemplo

Após conferir e aprovar todas as propostas na tela, baixar o JSON e validar localmente:

```powershell
node scripts/reconstruir-cadastro-mestre.mjs --revisao "revisao.json"
```

Esse comando **não conecta ao banco** e informa contagens e a confirmação exata. A execução futura, somente após aprovação operacional e com conexão administrativa configurada, exige todos os argumentos:

```powershell
node scripts/reconstruir-cadastro-mestre.mjs --executar --revisao "revisao.json" --arquivo "ERP.xls" --snapshot "snapshot-master-lote-novo.json" --lote "identificador-novo" --autor "responsavel" --confirmar "RECONSTRUIR_MASTER:HASH_INFORMADO_PELA_VALIDACAO"
```

O caminho do snapshot deve ser novo, em diretório existente e com espaço disponível. Arquivo ERP, nome e aba devem ser os mesmos do Preview. Guardar revisão, original, snapshot e identificador em local auditável. Após COMMIT, conferir log concluído, contagens e fingerprints; a tabela operacional da tela permanece independente.

Para o XLS real **informado e validado pelo usuário**, a expectativa é: 6.230 linhas lidas, 860 produtos válidos, 853 existentes, 7 novos, 4.853 remoções. Linhas excluídas: 5.370. A contagem final esperada é exatamente **5.706 − 4.853 + 7 = 860**, se contexto e arquivo permanecerem iguais. A quantidade de existentes com alterações depende do conteúdo efetivo dos campos; não pode ser deduzida apenas dessas contagens. Nenhum registro de Custos/OP/operacional ou fato histórico é removido.

## Validação desta entrega

[Resultado das verificações e lista completa de arquivos](../auditoria/cadastro-mestre-reconstrucao-validacao.md): 288 testes/26 arquivos passaram; lint, typecheck e diff check passaram após instalação limpa. Chrome validou os três formatos no Preview/aprovação local, sem chamadas Supabase. Teste adicional com RLS garante falha para conexões que não enxergam o Master integralmente.

Nenhuma execução no banco real. Testes usam XLS BIFF binário e XLSX/XLSM sintéticos pelo adapter existente; as contagens reais acima são reproduzidas por dados sintéticos, sem afirmar nova leitura do original. `tests/cadastro-mestre-reconstruction.test.js` executa o SQL transacional em PostgreSQL local em memória (PGlite): novos/existentes/removidos, vazios, snapshot/log/proveniência, erros reais de SQL em cada etapa com rollback, arquivo/contexto divergente, FK CASCADE bloqueada, repetição e COMMIT de resposta incerta. Testa também snapshot durável sem sobrescrita e validação CLI sem conexão. Testes da UI/formatos cobrem propostas/removíveis e ausência de gravação frontend.
