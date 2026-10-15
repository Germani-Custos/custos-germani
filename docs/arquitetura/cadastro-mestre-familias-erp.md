# CAD-FAM-01 — famílias ERP no Cadastro Mestre (15/10/2026)

## Escopo e identidade

Código exato identifica a família; descrição é apenas rótulo. Códigos diferentes podem compartilhar descrição após a migration estrutural já aplicada, 20261015182351. Esta entrega não cria migration/tabela, não sincroniza Master → operacional e não altera fatos, mapa, agrupamentos Kustos ou vínculos. `data_referencia` continua competência e `criado_em` importação dos fatos, intactos.

O adapter XLS/XLSX/XLSM existente reconhece `Família` e `Descr. (Família)` por aliases explícitos; F/AD são posições do arquivo real, não índices fixos. Preserva zeros textuais e máscaras inteiras de zeros já tratadas pelo leitor. A descrição não entra nos campos persistíveis do produto Master.

`proporCatalogoFamiliasCadastroMestre` é puro: usa somente as famílias efetivas dos produtos calculados pelos filtros/reconciliação existentes. Para esses códigos, verifica descrições preenchidas em todas as ocorrências do arquivo, inclusive excluídas, detectando conflitos sem ampliar o universo. Família somente em linhas excluídas nunca é proposta. Comparação usa trim técnico existente, sem fuzzy, equivalência textual ou deduplicação por rótulo.

Situações: `EXISTENTE_SEM_ALTERACAO` não escreve; `NOVA_FAMILIA` propõe INSERT; `ALTERACAO_DESCRICAO` propõe UPDATE somente de descrição, preservando ID/código; `DESCRICAO_VAZIA` preserva catálogo e não cria. `CONFLITO` bloqueia por rótulos diferentes do mesmo código; `CATALOGO_AMBIGUO` bloqueia por código duplicado no catálogo. Corrigir explicitamente a fonte/catálogo e gerar nova revisão; não há primeira/última ocorrência vencedora ou aprovação forçada. Impacto conta somente os produtos válidos.

## Transporte, manifesto e decisões

Contrato vigente **CADASTRO_MESTRE_DADOS_V2**: tupla de nove posições `[linha,codigo_produto,descricao,tipo,descr_origem,origem_cod,familia_cod,agrupamento_erp_valor,familia_descricao_erp]`. Todas as linhas não vazias continuam no transporte, inclusive excluídas. Mesmos limites de 4 MiB, sem XLS bruto, SQL, patches ou catálogo declarado como instrução de escrita. V1 é recusado: gerar novo Preview e publicar UI/função compatíveis antes de executar.

Manifesto contém `catalogo_familias` (lista/resumo) e operações com IDs `CADASTRAR_FAMILIA_ERP:<codigo codificado>` ou `ATUALIZAR_ROTULO_FAMILIA_ERP:<codigo codificado>`, tabela `categorias_familia`, `codigo_familia`, precondições e quantidade impactada. INSERT tem `{codigo,descricao}`; UPDATE, apenas `{descricao}`, com imagem anterior/ID/código. Dados, rótulos, contexto, universo e propostas ficam vinculados pelos hashes existentes.

Seção **Catálogo de famílias ERP** mostra código, descrições ERP/atual, situação/proposta, quantidade impactada e seletor de decisão próprio, separada dos produtos. Todas as propostas começam PENDENTES. Aprovar produto não aprova família; aprovação global é ação explícita sobre as propostas permitidas. Famílias sem operação não exigem decisão.

Aprovação integral foi mantida: qualquer proposta pendente/rejeitada impede a execução inteira. Download pode registrar rejeições, mas não permite carga parcial. Auditoria do lote contém `rejeitadas`, necessariamente zero em execução iniciada, pois rejeição é recusada antes de persistir lote. Seleção, decisões/download e Preview não escrevem.

## Executor central, snapshot e rollback

UI → serviço HTTP → função Vercel → handler existente → executor central único. Gate de execução, origem, Auth `getUser` e allowlist UUID continuam obrigatórios; variáveis não são alteradas. Servidor valida V2, recalcula hash de dados, lê contexto integral e regenera manifesto/decisões. Executor repete sob locks EXCLUSIVE NOWAIT em Master/log/famílias e SHARE nas demais seis tabelas. Mudança concorrente do catálogo invalida a aprovação. Triggers/regras/herança em famílias ou referências capazes de propagar atualização de descrição bloqueiam. Diagnóstico exige INSERT/UPDATE administrativos no catálogo, sem conceder privilégios.

Famílias passam a ter proteção própria: imagens completas antes/depois são comparadas com os únicos patches e INSERTs aprovados. Registros fora das propostas, inclusive legados sem código, devem ficar idênticos. UPDATE não escreve ID, código ou `criado_em`; INSERT usa defaults reais. Não há upsert cego ou DELETE de família. SQL parametrizado fica exclusivamente no executor; frontend mantém `supabase.from()` nas leituras, sem RPC/credencial administrativa.

Antes do SAVEPOINT/DML, o snapshot durável existente contém Master completo e **somente imagens anteriores das famílias afetadas**, com código e `anterior:null` para INSERT. Hash integral do catálogo serve de prova, sem snapshot adicional da tabela inteira. Storage mantém `upsert:false` e download/hash antes do DML; CLI mantém `wx`/`fsync`, sem sobrescrita.

Master e famílias recebem DML na mesma transação/SAVEPOINT. Qualquer falha SQL, contagem ou prova reverte ambos; verificação de rollback compara Master completo, catálogo completo e fingerprints protegidos. Lote fica `falhou` com contagens persistidas zero quando a auditoria consegue ser concluída. Falha anterior ao SAVEPOINT pode reverter inclusive o log. Resposta perdida do COMMIT exige consultar o lote, sem retry.

`metadados_origem.catalogo_familias` registra situações/no-ops, códigos, impactos, propostas, valores anteriores/novos, decisões e contagens efetivas. `snapshot_familias_afetadas` e hashes antes/depois completam as provas. Contagens de produtos continuam separadas das famílias na resposta e GET de consulta do lote. Sem alteração de schema ou executor paralelo.

Limite de confiança mantido: sem bytes originais no servidor, hash do XLS é proveniência declarada pelo navegador, não assinatura independente da origem ERP.

## Validação real e testes

Leitura de 15/10/2026: cópia local `cadastro mestre 8_10.xls`, 24.307.397 bytes, SHA-256 `3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14`, aba Sheet1, adapter real. Cliente restrito a GET/três tabelas fez quatro requisições, sem POST, DML/DDL, upload, snapshot de produção ou executor real.

- 6.230 linhas → 860 produtos; Master atual 860; 517 preservações de campos.
- 81 famílias: 16 existentes sem alteração, 65 novas; zero UPDATE, conflito, ambiguidade ou família sem descrição. Outras 134 famílias do XLS fora do escopo.
- 693 produtos nas novas famílias; 65 propostas de INSERT de famílias, zero propostas de produto, 65 decisões PENDENTES.
- Pares 55002/55010 e 55005/55009 independentes, com rótulos iguais.
- Dados V2: 753.094 bytes; manifesto regenerado localmente pelo mesmo caminho usado no servidor integralmente idêntico, sem chamar endpoint de produção.

Regressões usam BIFF/XLSX/XLSM sintéticos, Auth/Supabase/Storage mockados e PGlite local em memória. Cobrem identidade/escopo/impacto, vazios/conflitos, volume sintético 81/16/65/693, aprovação independente, adulteração/versão antiga, revalidação sob locks, snapshot parcial/durável, rollback em INSERT/UPDATE/log e constraint real, proteção de ID/código/criado_em e categorias não propostas, triggers e fatos/operacional/mapa intactos. Não equivalem a execução/upload em Production.

Primeira execução futura: após autorização, publicar UI/função compatíveis; manter flag desabilitada durante conferência; gerar novo Preview, revisar famílias/produtos e aprovar explicitamente. Verificar ambiente e habilitar/executar somente em etapa própria autorizada. Não inserir 65 famílias manualmente ou reconstruir como teste. Após execução autorizada, atualizar consulta ERP para reler os rótulos.

Resultado final: **498 testes em 36 arquivos passaram**, com 35 regressões adicionais sobre a base de 463. Lint, `tsc --noEmit -p jsconfig.json`, build e `git diff --check` passaram. Testes completos executados com dois workers. Build usou URL/chave públicas sintéticas apenas como argumentos locais, sem alterar env/flag de produção. Consulta final confirmou catálogo 38 e Master 860, com os mesmos fingerprints; operacional 6.113, Custos 1.370, OP 704 e mapa 292 mantiveram os fingerprints anteriormente registrados. Nenhum commit, deploy, nova migration, escrita Supabase ou execução real.

## Arquivos desta entrega

Implementação:

- `core/cadastro-mestre-familias-engine.js` (novo): propostas puras do catálogo.
- `core/cadastro-mestre-approval-engine.js`: catálogo no manifesto e decisões próprias.
- `core/cadastro-mestre-reconstruction-engine.js`: plano separa produtos/famílias.
- `core/cadastro-mestre-execution-data.js`: transporte V2 com descrição ERP.
- `src/services/cadastro-mestre-preview.js`: alias de Descr. (Família), mesmo leitor.
- `view/ui-cadastro-mestre-preview.js`: seção/decisões/confirmação/contagens de famílias.
- `scripts/lib/cadastro-mestre-reconstruction.mjs`: único executor, DML restrito, snapshot, provas e rollback conjuntos.
- `scripts/lib/cadastro-mestre-web.mjs`: permissões de catálogo e contagens no GET do lote; revalidação existente reutilizada.

Testes:

- `tests/cadastro-mestre-familias.test.js` e `tests/fixtures/cadastro-mestre-familias.js` (novos).
- `tests/cadastro-mestre-execution-data.test.js`.
- `tests/cadastro-mestre-reconstruction.test.js`.
- `tests/cadastro-mestre-web.test.js`.
- `tests/ui-cadastro-mestre-preview.test.js`.

Documentação: `README.md`, `VISION.md`, `ROADMAP.md`, `AGENTS.md`, este contrato novo, `docs/arquitetura/cadastro-mestre-execucao-web.md`, `docs/arquitetura/cadastro-mestre-reconstrucao.md`, `docs/auditoria/backlog-priorizado.md`, os três `docs/manuais/manual-{usuario,tecnico,operacao}.md` e `docs/ux/cadastro-mestre.md`.
