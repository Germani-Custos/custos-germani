# CAD-COM-01 — validação de Agrup. Com. ERP

Registro histórico da validação local **anterior à aplicação da migration**. A etapa posterior CAD-COM-PROD-01 aplicou somente o schema em produção; declarações abaixo de migration pendente/ausência de colunas pertencem ao estado anterior. [Prova posterior, sem carga XLS](cadastro-mestre-comercial-producao-etapa1.md).

Implementação local concluída em 19/10/2026. Sem commit, push, deploy, migration no Supabase, reconstrução real ou escrita remota. [Contrato](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md) e [provas em JSON](cadastro-mestre-comercial-validacao.json).

## Fonte e escopo

Arquivo indicado pelo usuário: `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\cadastro mestre 8_10.xls`, 24,307,397 bytes, aba `Sheet1`, SHA-256 `3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14`. Lido sem conversão, edição ou upload, com o SheetJS do projeto e o adapter real. Não se usaram revisões JSON antigas como fonte dos novos campos.

Cabeçalhos confirmados: Agrup. Com. na coluna S (índice 18), Descrição (Agrup. Com.) na AP (índice 41); Agrup. Prod. continua Q (índice 16). Origem/família e filtros existentes não mudaram. Nenhum alias foi criado para Agrup. Custos/Est./Fiscal.

Decisão humana registrada: quando o XLS informa célula comercial vazia para um produto existente, limpar o valor anterior para NULL. Essa regra não se estende aos outros campos ERP. Coluna ausente conserva valor existente; sem valor anterior permanece NULL. Informações parciais continuam parciais, sem preenchimento inferido.

## Contagens reais

- Arquivo completo: **6.230 linhas**, **316 com Agrup. Com.**, **5.914 sem**, **34 códigos comerciais distintos**.
- Universo após os filtros atuais: **860 produtos**, **162 com Agrup. Com.**, **698 sem**, **29 códigos comerciais distintos**.
- Nos dois conjuntos: zero códigos preenchidos sem descrição, zero descrições preenchidas sem código e **zero conflitos** de descrição para um mesmo código. JSON contém todas as correspondências código/rótulo encontradas.
- Os cinco exemplos pedidos foram confirmados exatamente: C006 → BISCOITO ESPECIAL; C012 → BISCOITO SOLTO DOCE; C005 → BISCOITO CHAMPAGNE; C008 → BISCOITO LAMINADO DOCE; C011 → BISCOITO RECHEADO.
- Master atual: **860**. Manifesto preparado em memória: **0 INSERT**, **162 produtos com UPDATE**, **0 remoções**, **324 propostas comerciais** (código e descrição de cada produto). Nenhuma proposta de família ou de outros campos nesta leitura.
- O universo calculado com os novos campos é idêntico ao calculado sem eles: nenhum produto foi criado, incluído, excluído ou tornado obrigatório por causa do agrupamento.
- Os **698 sem agrupamento** têm código e descrição comerciais NULL no cálculo; continuam válidos. Os valores dos 162 com agrupamento correspondem literalmente às colunas ERP após trim técnico, sem fonte operacional.
- Dados V3: **820,344 bytes**. Corpo POST apenas simulado em memória: **847,017 bytes**, abaixo de 4 MiB. Nenhum POST foi enviado.

## Validação real somente leitura

Sonda local em `2026-10-19T16:38:10.229Z` usou URL/chave públicas do runtime publicado, SDK instalado, paginação de 500/count exact e ordenação explícita. Fetch restrito por método GET, host do projeto confirmado e allowlist de sete tabelas. Sem login, sessão privada, chave administrativa, upload ou chamada ao endpoint de execução. A consulta de schema anterior foi SELECT de `information_schema.columns`; não executou DDL.

Foram feitas **46 requisições GET** para imagens integrais antes/depois. SHA-256 usa serialização determinística do conteúdo ordenado. Todas as provas foram idênticas:

- `dicionario_master_produtos`: **860 → 860**.
- `dicionario_produtos`: **6.113 → 6.113**.
- `historico_custos`: **1.370 → 1.370**.
- `apontamentos_op`: **704 → 704**.
- `categorias_origem`: **50 → 50**.
- `categorias_familia`: **103 → 103**.
- `categorias_agrupamento`: **34 → 34**.

O mesmo caminho de regeneração usado no servidor produziu manifesto integralmente idêntico ao Preview direto. Aprovação e plano foram construídos apenas em memória para conferir contagens; executor remoto não foi chamado. O schema remoto ainda não tem as duas colunas, e a migration permanece pendente. Portanto estes resultados demonstram preparação/reconciliação local com dados reais; não afirmam persistência comercial já realizada no Supabase.

São leituras independentes sob a visibilidade da chave pública, sem snapshot transacional entre páginas/fontes. As provas registram igualdade observada; não prometem detectar toda mutação concorrente possível. O script temporário foi removido, sem deixar credenciais ou dados brutos no repositório.

## Testes e qualidade

Base anterior: 531 testes. Foram acrescentadas **23 regressões**, chegando a **554 testes em 38 arquivos**, todos aprovados.

- **16 testes novos** em `tests/cadastro-mestre-comercial.test.js`: BIFF/XLSX/XLSM, aliases separados, transporte V3/regeneração, código/descrição preenchidos, código vazio, descrição vazia, ambos vazios/NULL/espaços, produto opcional, limpeza do existente, coluna ausente, universo sem produto artificial, conflito em ocorrência excluída, rótulos repetidos entre códigos diferentes, consulta ERP, invariância de Custos/agrupamento operacional e recusa de versões antigas.
- **5 testes adicionais no executor PostgreSQL/PGlite**: nos três formatos grava/atualiza comercial, limpa NULL, preserva snapshot e tabelas protegidas; rollback após DML reverte limpeza; schema ausente bloqueia antes de log/snapshot/escrita.
- **2 testes de UI adicionais**: Preview mostra propostas/contagens/limpeza; consulta ERP exibe e escapa código/descrição separadamente da classificação operacional.
- Migration aplicada somente em tabela de PGlite local: exatamente duas TEXT NULL sem default; registro existente recebe ausência NULL e mantém seus valores anteriores; operacional intacto. Sem FK/índice/tabela/backfill ou obrigatoriedade nova.
- Suíte existente de Custos, OP, agrupamentos, famílias, formatos, aprovação, Storage, erros e rollback passou sem novas mudanças nesses fluxos.

Lint, typecheck, build e `git diff --check` passaram no fechamento da entrega. Links locais da documentação também foram conferidos. Comandos de qualidade:

```powershell
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node scripts/build-web.mjs
git diff --check
```

Build local usa apenas configuração pública em memória, sem alteração de env/flag/runtime-config versionado e sem publicação. Não houve teste manual da versão publicada nem execução administrativa real; apresentação foi coberta pelos testes dos controllers de UI.

## Arquivos desta etapa

Implementação:

- `src/services/cadastro-mestre-preview.js`: aliases explícitos e preservação de máscara do código comercial.
- `core/cadastro-mestre-preview-engine.js`: novos campos e limpeza de vazio restrita ao comercial.
- `core/cadastro-mestre-approval-engine.js`: propostas, conflitos, contagens e manifesto V2.
- `core/cadastro-mestre-execution-data.js`: transporte V3 de onze posições.
- `core/cadastro-mestre-reconstruction-engine.js`: exige manifesto novo.
- `scripts/lib/cadastro-mestre-reconstruction.mjs`: whitelist/comparação final e preflight de schema; snapshot integral já cobre novas colunas.
- `scripts/lib/cadastro-mestre-web.mjs`: GET de resultado aceita lotes antigos V1 e novos V2.
- `core/cadastro-mestre-erp-engine.js`, `view/ui-cadastro-mestre-erp.js`, `view/ui-cadastro-mestre-preview.js`, `index.html`: consulta/Preview dos campos separados.
- `sql/20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql`: migration aditiva preparada e não aplicada remotamente.

Testes/fixtures: `tests/cadastro-mestre-comercial.test.js`, `tests/fixtures/cadastro-mestre-comercial.js` (novos), `tests/cadastro-mestre-reconstruction.test.js`, `tests/cadastro-mestre-execution-data.test.js`, `tests/fixtures/cadastro-mestre-arquivo.js`, `tests/ui-cadastro-mestre-erp.test.js`, `tests/ui-cadastro-mestre-preview.test.js`.

Documentação: README, ROADMAP, AGENTS, três manuais, modelo de banco, migrations, contratos de Preview/reconstrução/web/famílias/comercial, matriz/índice de arquitetura, UX do Cadastro, índice/backlog de auditoria e este registro com JSON. VISION foi revisado e continua coerente, sem mudança de missão/direção ou changelog.

As alterações de CUSTOS-ERP-01 já estavam no checkout ao iniciar esta etapa e foram preservadas. Nesta etapa não se editaram `src/services/api.js`, módulos de Custos/OP, `core/custos-classification-engine.js` ou manutenção operacional. **`dicionario_produtos`, Custos, OP e a classificação investigativa não foram alterados.** `data_referencia` continua competência e `criado_em` importação. Nenhuma gravação de schema/dados remotos foi feita.
