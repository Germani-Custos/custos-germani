# CAD-COM-01 — Agrup. Com. opcional no Cadastro Mestre ERP

Contrato de 19/10/2026, implementado localmente. A etapa CAD-COM-PROD-01 aplicou somente a migration no projeto Custos-Germani, versão remota 20261019173633; ambos os campos permanecem NULL nos 860 produtos, sem carga ou publicação. [Prova de produção](../auditoria/cadastro-mestre-comercial-producao-etapa1.md). [Validação local anterior e arquivos](../auditoria/cadastro-mestre-comercial-validacao.md).

## Modelo e separação de autoridades

Classificações de agrupamento provenientes do ERP são dados opcionais e independentes da classificação investigativa do Kustos.

- `agrupamento_erp_valor` mantém exclusivamente Agrup. Prod., com sua proveniência anterior intacta.
- `agrupamento_comercial_erp_cod` recebe Agrup. Com.; `agrupamento_comercial_erp_descricao` recebe Descrição (Agrup. Com.). Ambas são TEXT NULL, sem default, FK, índice ou unicidade. Códigos repetem entre produtos.
- Agrup. Custos, Agrup. Est. e Agrup. Fiscal continuam fora do adapter/contrato. Não são aliases de Agrup. Com. ou Agrup. Prod.
- `dicionario_produtos.agrupamento_cod` permanece classificação operacional/investigativa; não existe ponte, sincronização, inferência ou categoria nova nesta entrega.

Descrição é referência recebida por produto, não chave para classificar nem meio de descobrir um código. Código preserva caixa, zeros e espaços internos; apenas trim lateral/normalização técnica existente. Não usar SEM_AGRUPAMENTO no Master. Sem agrupamento, produto continua válido pelos mesmos filtros existentes. Não criar produto, catálogo, categoria ou linha apenas por causa do agrupamento.

## Adapter e reconciliação

O adapter único `lerArquivoCadastroMestre` reconhece aliases explícitos normalizados `agrup com` e `descricao agrup com`/`descr agrup com`, além dos nomes físicos canônicos dos dois campos. Identifica cabeçalho, sem posições fixas. No XLS real, correspondem às colunas S e AP, respectivamente; posição não é regra de parsing. A máscara inteira de zeros também cobre o código comercial.

Para cada um dos dois campos, independentemente:

1. Coluna presente com valor preenchido: propõe INSERT/UPDATE do valor recebido.
2. Coluna presente com célula vazia/NULL/espaços: normaliza para NULL e propõe limpar valor existente, conforme decisão humana expressa nesta tarefa. Novo produto recebe NULL.
3. Coluna ausente: preserva o existente; sem valor anterior, resultado NULL.
4. Código sem descrição ou descrição sem código: mantém exatamente a informação parcial recebida; não completa por outro produto, rótulo, proximidade, operacional ou catálogo artificial. Não torna agrupamento obrigatório.

Essa exceção de limpeza aplica-se somente ao par comercial. Descrição do produto, origem, família e Agrup. Prod. conservam os contratos anteriores de vazios. Recorte/filtros do universo e normalização de produto não mudam.

Para códigos comerciais do universo efetivo, manifesto verifica descrições preenchidas em todas as ocorrências do arquivo, inclusive linhas excluídas. Duas descrições diferentes após trim para o mesmo código bloqueiam reconstrução e aprovação, sem escolher vencedor. Diferentes códigos podem compartilhar um rótulo. Ausência de descrição é informação faltante opcional, não conflito nem autorização para completar. Esta checagem não amplia o universo nem grava catálogo.

## Preview, manifesto, transporte e consulta

Preview exibe os dois campos separadamente de Agrup. Prod., valores atual/ERP/proposto e contagens com/sem comercial/códigos distintos. UPDATEs comerciais têm propostas por campo, inclusive valores NULL; INSERT de produto é indivisível. Campos comerciais ausentes e já nulos não acrescentam preservações sem valor ao resumo. Coluna ausente com valor anterior aparece como preservação.

Manifesto vigente: `RECONSTRUCAO_UNIVERSO_V2`. Categorias de proposta: `ATUALIZAR_CODIGO_AGRUPAMENTO_COMERCIAL_ERP` e `ATUALIZAR_DESCRICAO_AGRUPAMENTO_COMERCIAL_ERP`. Precondições incluem valores anteriores. Qualquer proposta pendente/rejeitada bloqueia toda a execução; nenhuma limpeza é aplicada só porque o Preview foi aberto.

Transporte vigente: `CADASTRO_MESTRE_DADOS_V3`, tupla de onze posições:

```text
[linha, codigo_produto, descricao, tipo, descr_origem, origem_cod,
 familia_cod, agrupamento_erp_valor, familia_descricao_erp,
 agrupamento_comercial_erp_cod, agrupamento_comercial_erp_descricao]
```

Mantém todas as linhas não vazias, metadados/colunas e hashes; JSON até 4 MiB. Não envia binário, SQL, patches, contexto duplicado ou universo previamente filtrado. V1/V2 do transporte e manifesto de reconstrução V1 não são aceitos para nova execução. Novo Preview/aprovação e UI/função compatíveis são obrigatórios. GET de resultados de lotes antigos V1 continua permitido, sem retry de execução.

Consulta ERP continua usando SELECT integral `*` e páginas existentes. Núcleo/renderer expõem os dois campos, com rótulos não informado quando vazios e escape HTML. Consulta não fornece editor comercial e não altera o operacional.

## Executor, snapshot e schema

Para a carga pontual exclusivamente dos dois campos comerciais, usar o [contrato isolado CAD-COM-EXEC-01](cadastro-mestre-comercial-executor-isolado.md). Ele preserva timestamps, proveniência e logs; escrita real ainda depende de autorização. O executor central descrito a seguir permanece destinado à reconstrução geral e não atende ao isolamento absoluto dessa carga pontual.

Executor central inclui ambos os campos na whitelist de INSERT/UPDATE e na comparação final com o Preview. A expressão parametrizada de UPDATE já distingue chave ausente de chave com JSON null: NULL aprovado limpa o campo, sem coalesce para o valor anterior. Proveniência usa o lote geral existente do Master; a proveniência de Agrup. Prod. não é alterada por mudanças comerciais.

`contextoAtual` confirma por SELECT que as duas colunas existem antes de log/snapshot/DML. Locks Master/log/famílias, guardas de dependências, releitura/regeneração integral, aprovação/hash, snapshot durável, SAVEPOINT, provas de tabelas protegidas e rollback permanecem. Imagem integral do Master no snapshot/log já inclui os dois campos novos, sem snapshot paralelo. Rollback reverte também limpeza para NULL. Fatos, operacional, mapa e categorias investigativas continuam protegidos.

Migration [`20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql`](../../sql/20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql) adiciona somente as duas colunas nullable e comentários. Não faz backfill, UPDATE, DELETE, INSERT, mudança de RLS ou alteração em outras tabelas. Criada com Supabase CLI em diretório temporário e mantida em `sql/`, conforme organização existente. Validada em PostgreSQL local/PGlite antes da aplicação; a estrutura e os dados também foram conferidos por SELECT em produção após aplicar. Aplicada remotamente com autorização e backup na etapa CAD-COM-PROD-01, versão 20261019173633; nome cadastro_mestre_agrupamento_comercial_erp. O timestamp local 20261019163220 identifica o arquivo de origem; o MCP atribuiu a versão remota. Nenhum registro de negócio foi modificado.

Sequência operacional: backup → migration (concluídos na etapa CAD-COM-PROD-01) → publicação compatível V3 → novo Preview do XLS/contexto atual → revisão/aprovação integral → diagnóstico → execução explicitamente autorizada. Publicação e carga não foram autorizadas nesta etapa e dependem de novas autorizações. A migration muda a imagem/hash do contexto; revisões anteriores devem ser descartadas. Não executar reconstrução como teste de migration ou deploy.

`data_referencia` continua competência e `criado_em` evento de importação dos fatos; nenhum desses valores ou sua interpretação é alterado. CAD-COM-01 sucede apenas os contratos anteriores de transporte/manifesto e preservação de vazio dos novos campos comerciais, mantendo os demais agrupamentos e a classificação analítica de Custos.
