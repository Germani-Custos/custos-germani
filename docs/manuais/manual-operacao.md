# Manual de Operação — Kustos Germani

## CAD-ENV-01 — preparação sem reconstrução (09/10/2026)

Seguir [passo a passo de deploy/env/bucket/diagnóstico e primeira execução](../arquitetura/cadastro-mestre-preparacao-ambiente.md). Manter flag false e allowlist com apenas o UUID do usuário indicado. GET diagnóstico funciona nesse estado sem lote/upload/escrita; sucesso não testa upload/rollback em produção. Endpoint remoto ainda 404 e Storage sem bucket na verificação desta entrega. Configuração real permanece pendente. Nenhuma carga, snapshot de produção ou mudança nos eixos competência/importação.

## CAD-EXEC-WEB-01 — habilitação e operação futura (09/10/2026)

Nenhuma reconstrução real nesta entrega. Antes de publicar/habilitar: configurar função Node na Vercel com conexão PostgreSQL administrativa do mesmo projeto/TLS verificado, allowlist de UUIDs Auth, origem exata e bucket privado existente sem policies públicas. Segredos somente server-side; flag `CADASTRO_MESTRE_EXECUTION_ENABLED=false` até verificação explícita. Preview de deploy usa banco separado ou execução desabilitada. Não criar bucket/lote/migration automaticamente.

Depois da habilitação, usuário autorizado seleciona original, revisa/aprova integralmente, clica **Executar reconstrução…** e confirma texto/contagens. Servidor conserva revalidação/snapshot/transação/rollback; resultado retorna lote. Conferir lote concluído/universo e fingerprints protegidos. Em erro/resposta perdida, consultar lote sem retry; snapshot privado permanece auditável, inclusive em rollback. Ausência de lote pode significar execução em curso. CLI continua alternativa explícita. [Variáveis, limites, recuperação e referências](../arquitetura/cadastro-mestre-execucao-web.md). Custos/OP/operacional/mapa não recebem DML; `data_referencia` continua competência e `criado_em` importação. Sucede a limitação de UI abaixo.

## CAD-REBUILD-01 — procedimento vigente (09/10/2026)

Conferir o universo filtrado e as remoções no Preview do original XLS/XLSX/XLSM. Produtos ausentes ou fora do filtro serão removidos somente do Master ERP; vazios preservam campos de quem permanece. Aprovar integralmente e baixar a revisão. Não repetir a migration pontual da Fase 3.4.

Validar primeiro sem banco: `node scripts/reconstruir-cadastro-mestre.mjs --revisao "revisao.json"`. A saída informa contagens e confirmação vinculada ao manifesto. A execução administrativa futura exige `--executar`, original, revisão, caminho novo de snapshot em diretório existente, lote único, autor e confirmação exata; conexão administrativa integral fica em `CADASTRO_MESTRE_DATABASE_URL`, fora do frontend/repositório. [Argumentos e procedimento completo](../arquitetura/cadastro-mestre-reconstrucao.md#operação-e-exemplo).

Arquivo ou Master alterado exige novo Preview. Lock ocupado, dependência desconhecida, snapshot indisponível, revisão parcial ou universo vazio impedem a carga. Erro durante DML reverte todo o Master e registra falhou com snapshot; resultado de COMMIT não confirmado exige consultar o lote e a cópia independente antes de qualquer tentativa. Guardar revisão, original e snapshot; nunca sobrescrever evidências.

Expectativa informada pelo usuário: 6.230 linhas, 860 válidos, 853 existentes, 7 novos, 4.853 remoções; Master final 860. Conferir log concluído, quantidade final, hash e provas das tabelas protegidas. Nenhuma carga real foi feita no desenvolvimento; testes usam PostgreSQL em memória. A dimensão operacional da tela mantém sua contagem; Custos/OP, fatos e os eixos `data_referencia` (competência)/`criado_em` (importação) permanecem intactos. A preservação de ausentes registrada nas fases abaixo é histórica.

## CAD-XLS-01 — conferência dos formatos ERP (08/10/2026)

Na aba Cadastro, testar XLS, XLSX e XLSM por **Preview mestre (XLSM / XLSX / XLS)**. Conferir contagens e detalhes: P/C e Produzido/Revenda elegíveis, D/inativo/EXLUIR excluídos, vazios/ausentes preservados e Agrup. Prod. como ERP bruto. Decisões individuais/globais e download trabalham localmente; fechar não grava nem baixa arquivo.

O seletor consulta o Master completo via SELECT e não executa o legado. Falha de leitura impede Preview, sem simular Master vazio. Não usar JSON como autorização automática nem repetir a migration da Fase 3.4. Sem log, proveniência ou mudanças RLS/schema; `data_referencia` continua competência e `criado_em` importação nos fatos.

Validação local usa XLS BIFF sintético e API em memória, sem carga real. Um XLS original do ERP não foi fornecido nesta tarefa; a prova de leitura usa binário XLS gerado. [Contrato e limites](../ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

## CAD-UX-01 — conferência do Cadastro (08/10/2026)

Após deploy, conferir a rolagem horizontal no meio de uma lista longa e em janela estreita, mantendo o cabeçalho fixo. Em produto de teste autorizado, selecionar **Sem agrupamento**, salvar e reabrir: a dimensão operacional deve conter `agrupamento_cod = NULL`, e tabela/editor mostrar **Sem agrupamento**. Reatribuir agrupamento e testar cancelar sem gravar. Vazio no ERP continua preservando o cadastro; não usar importação para remover classificação nem repetir a carga da Fase 3.4. [Validação local e passos completos](../ux/cadastro-mestre.md).

## Fase 3.4 — lote 1 concluído (08/10/2026)

A carga autorizada terminou sem erros: 103 novos no Master e 312 existentes atualizados, preservando operacional/mapa/fatos e 4.853 produtos fora dos filtros. Master final = 5.706. Os 103 códigos já existiam no operacional; nenhum foi criado ali por esta carga. Não executar novamente a migration 20261008184501 nem usar o importer legado para repetir o lote. O relatório original continua evidência da preparação, não autorização de nova carga. [Lote, hashes e validações](../arquitetura/cadastro-mestre-execucao-fase3-4.md). Competência `data_referencia` e evento `criado_em` nos fatos continuam intactos.

## Fase 3.3 — preparar aprovação, não importar (08/10/2026)

Conferir manifesto e hashes antes de uma execução futura: base 853/750/103 e 11 descrições; com `Agrup. Prod.` há 342 agrupamentos ERP preenchidos, 511 vazios e 4.853 produtos preservados fora do conjunto. O manifesto tem 103 INSERTs candidatos e 320 UPDATEs por campo em 312 existentes; oito possuem duas propostas. As 423 propostas são entregues pendentes.

Família pendente não autoriza classificação inventada; ERP Pxxx não é Kustos Mxxx. Controles de revisão/download trabalham somente localmente. Não usar o importador legado para executar este manifesto, não liberar RLS, gerar lote ou preencher proveniência nesta fase. A execução requer autorização e revalidação próprias. [Evidências, contrato e limitações](../arquitetura/cadastro-mestre-aprovacao.md).

Procedimentos para **manter o sistema rodando** em produção: rotina mensal, categorização de órfãos, deploy/rollback, administração do Supabase e diagnóstico de problemas. Público: operação/controladoria com acesso ao Supabase e à Vercel. Para uso da tela, ver [Manual do Usuário](./manual-usuario.md); para código, [Manual Técnico](./manual-tecnico.md).

---

## Atualizacao 2026-08-10 — conferencia apos importacao de OP

Depois de importar MCAP105, confira a fila sem recarregar a pagina: o contexto e atualizado automaticamente. Os filtros De/Ate recortam a competencia (`data_referencia`), nunca a data de entrada (`criado_em`).

## 1. Rotina mensal de importação

1. Obtenha a planilha de custos do ERP no formato `.xlsx`, referente a **uma competência** (mês).
2. Na tela **Importação**, selecione a **Data de Referência** = mês da competência.
3. Suba o arquivo, confira o **mapeamento** das 5 colunas obrigatórias e valide o **preview** (🟢/🟡/🔴).
4. Confirme. Anote o resumo (Total / Importadas / Falhas).
5. **Verifique o banner de órfãos** (ver seção 2) — produtos novos sem categoria.
6. Faça uma conferência rápida na **Auditoria** do mês importado (KPIs e fila de críticos).

> **Reimportação é idempotente** por `codigo_produto` + `data_referencia` (constraint `unique_produto_data`): subir o mesmo mês de novo **atualiza** os registros, não duplica.

### Registro de importações (`log_importacao`)
Cada importação grava um registro com `status`, `total_linhas`, `linhas_importadas`, `linhas_erro`, `iniciado_em`, `finalizado_em`, `data_referencia`. Consulte no Supabase para auditar o que entrou e quando.

---

## 2. Tratar produtos órfãos (sem categoria)

**Sintoma:** banner amarelo na Importação ("N produto(s) sem categorização completa") e/ou produtos que não aparecem corretamente nos filtros da Auditoria.

**Causa:** produto novo entrou em `historico_custos` e foi criado em `dicionario_produtos` **sem** `origem_id`/`familia_id`/`agrupamento_cod` (a importação não categoriza — apenas garante a existência do produto).

**Como identificar (Supabase):** a migração de saneamento criou a view `vw_produtos_orfaos_agrupamento` e o fallback explícito `SEM_AGRUPAMENTO`. Liste os órfãos por ela.

**Como corrigir:** preencha a categorização em `dicionario_produtos` (via Supabase Studio ou script): defina `origem_id`, `familia_id` e `agrupamento_cod` válidos para cada `codigo_produto`. Use as tabelas `categorias_origem`/`categorias_familia`/`categorias_agrupamento` como referência. Scripts de apoio: `sql/dicionario_master_produtos.sql`, `sql/mapa_produtos.sql`.

Após categorizar, o produto passa a aparecer corretamente nos filtros (o realtime/recarna atualiza os masters).

## 2.1. Conferir códigos normalizados após importação

O item `VAL-01` faz o fluxo ativo usar `normalizeCodigoProduto()` em preview, payload e API. Se uma planilha vier com produto em notação científica (ex.: `7,89123E+12`), espaços, caracteres invisíveis ou separador de milhar, o sistema grava a chave normalizada ou bloqueia a linha como erro. Em modo verbose (`VITE_ENABLE_VERBOSE_LOGS=true`), as mutações críticas aparecem em `debugLog` com amostras limitadas, nunca com a planilha inteira. A competência continua sendo `data_referencia`; o momento de entrada continua sendo `criado_em`.

---

## 3. Banco de dados (Supabase)

### Estrutura
Fato `historico_custos` + dimensões (`dicionario_produtos`, `categorias_*`) + auditoria (`log_importacao`). Schema completo: [`docs/arquitetura/banco-de-dados.md`](../arquitetura/banco-de-dados.md).

### Scripts SQL versionados (`sql/`)
Aplicados **manualmente** no Supabase (SQL Editor). Ordem cronológica importa:

| Arquivo | Finalidade |
|---|---|
| `dicionario_master_produtos.sql` | Tabelas/seed de master data de produtos. |
| `mapa_produtos.sql` | Mapeamento produto → categorias. |
| `ajustar_precisao_historico_custos.sql` | Ajuste de precisão NUMERIC dos custos. |
| `2026-05-11_indices_performance_operacional.sql` | Índices críticos de performance (consultas por produto/competência/importação). |
| `2026-05-25_saneamento_operacional_schema.sql` | Saneamento: constraint `unique_produto_data`, índices investigativos, fallback `SEM_AGRUPAMENTO`, view de órfãos. |
| `2026-07-23_create_apontamentos_op.sql` e `2026-07-23_log_importacao_op_status.sql` | Tabelas e ciclo de log da Auditoria de OP. |
| `inserir_custo.sql`, `variacao_percentual_produto.sql` | Utilitários de consulta/inserção. |

> Ao criar novas migrações, siga o padrão de nomeação `AAAA-MM-DD_descricao.sql` e registre em [`docs/arquitetura/migracoes.md`](../arquitetura/migracoes.md) e no log do `AGENTS.md`.

### Diagnóstico de falha no upload de OP

Se a importação de OP falhar, abra o console do navegador e procure `========== IMPORTAÇÃO OP ==========`. O registro contém o chunk, a quantidade, o primeiro payload e a resposta completa do Supabase. Para uma violação `NOT NULL`, ele também lista o número do registro e a coluna. Para CSVs MCAP105 com OP como `2.081`, confirme que a versão implantada contém a normalização de milhar do parser; não altere o schema para contornar esse formato.

### Conferência operacional da fila de OP

Após importar, abra a aba **OP** e valide a fila pela coluna **Decisão** e pelo motivo. Não trate `Tempo de Parada` ou `% Tempo (ERP)` isoladamente como incidente. Abra o **dossiê** para conferir os fatos imutáveis do ERP contra os indicadores calculados pelo Kustos e as evidências combinadas. Quando o motivo for gargalo de produtividade, a parada baixa/não material não explica tempo alto e KG/Hora baixo; quando houver paradas com impacto, confirme conjuntamente atraso, queda/não melhoria de KG/Hora e déficit de produção antes de agir. Parada sem efeito nesses três resultados deve permanecer registrada, sem prioridade. A competência é `data_referencia`; `criado_em` mostra somente quando o lote entrou no sistema.

### Índices e performance
Os índices de `2026-05-11` sustentam o drill-through e as comparações de importação. **Não remover** sem entender o impacto nas consultas de `src/services/api.js`.

### Backup
Use o backup gerenciado do Supabase (point-in-time/diário, conforme o plano do projeto). **Antes de aplicar qualquer migração de saneamento/alteração de schema**, garanta um backup recente. Exportações de dados também podem ser feitas pelo Supabase Studio.

---

## 4. Autenticação e acesso

**Estado atual:** acesso **público** (gate de login desativado em 2026-05-14). Implicações de segurança em [`docs/auditoria/seguranca.md`](../auditoria/seguranca.md) (`SEC-03`).

### Criar usuário master (quando reativar auth)
```bash
VITE_SUPABASE_URL=https://<projeto>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
node scripts/create-master-user.mjs --login=<usuario> --password=<senha>
```
É idempotente (não duplica). Se `--login` não tiver `@`, vira `<login>@master.local`. A `service-role key` é **secreta** — nunca commitar nem expor no frontend. Detalhes: [`docs/arquitetura/autenticacao.md`](../arquitetura/autenticacao.md).

---

## 5. Deploy e rollback (Vercel)

### Deploy
O deploy é automático a partir da branch de produção (Vercel conectada ao GitHub). No build, a Vercel roda `node scripts/build-web.mjs`, que gera `dist` por allowlist e `dist/runtime-config.js` com apenas as **Environment Variables** públicas. Alterações locais ainda sem commit exigem CLI autenticada para publicar o checkout; redeploy do commit antigo não as inclui.

### Variáveis de ambiente (Vercel → Settings → Environment Variables)
Obrigatórias em Production/Preview/Development:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_VERBOSE_LOGS` (opcional; `false` em produção)

Se faltarem, **o build falha** (proposital). Checklist completo: [`docs/arquitetura/deploy.md`](../arquitetura/deploy.md).

Para a **tela de Documentação editável** (gravação dos manuais via commit), a Serverless Function `api/save-doc.js` exige:
- `GITHUB_TOKEN` — PAT fine-grained com **Contents: Read and write** apenas neste repositório. **Secreto** — nunca commitar nem expor no frontend.
- `GITHUB_REPO` — `owner/repo` (ex.: `Germani-Custos/custos-germani`).
- `GITHUB_BRANCH` — branch publicada (default `main`).

> A edição em tela é **pública** (sem senha): qualquer pessoa com a URL pode editar os manuais (com allowlist de caminho e limite de tamanho no servidor). Avalie um gate/rotação de token se isso for sensível.

### Rollback
Pelo painel da Vercel: **Deployments → escolher o deploy estável anterior → Promote to Production** (ou "Rollback"). Como o app é estático, o rollback é imediato e seguro. Mudanças de **banco** (migrações SQL) **não** voltam com o rollback do frontend — reverta-as manualmente no Supabase se necessário.

---

## 6. Diagnóstico de problemas

| Sintoma | Causa provável | Ação |
|---|---|---|
| Tela "Configuração do ambiente não encontrada" | Falta `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no ambiente | Conferir env na Vercel; reabrir os "Detalhes técnicos" da tela mostra as fontes avaliadas. Rebuild. |
| App carrega mas sem dados / "Falha ao carregar tabelas de apoio" | Supabase indisponível, chave inválida, ou RLS bloqueando | Verificar status do Supabase, validade da `anon key`, e políticas de RLS (se ativadas). |
| Importação com muitas falhas (🔴) | Colunas mal mapeadas ou dados em branco | Revisar mapeamento e a planilha; ver `linhas_erro`/erros no resultado. |
| Produto sumiu dos filtros | Órfão (sem categoria) | Seção 2 — categorizar em `dicionario_produtos`. |
| Banner mostra “Não foi possível validar produtos sem agrupamento.” | Diagnóstico de órfãos indisponível (ex.: divergência de schema/permissão em `categorias_agrupamento`) | Não interpretar como zero órfãos; verificar `categorias_agrupamento`, permissões/RLS e logs com `VITE_ENABLE_VERBOSE_LOGS=true`. |
| Mesmo produto com históricos separados | Importação antiga anterior ao `VAL-01` ou código já salvo incorretamente | Novas importações normalizam o código no preview/API; para legado, padronizar registros existentes e reimportar a competência afetada. |
| Auditoria lenta com base grande | Tabela sem virtualização | Limitação conhecida `PERF-01`; refinar filtros como paliativo. |
| Logs detalhados necessários | — | Ativar `VITE_ENABLE_VERBOSE_LOGS=true` temporariamente (ativa `debugLog`). |

Playbook detalhado: [`docs/troubleshooting/playbook-operacional.md`](../troubleshooting/playbook-operacional.md) · integração: [`docs/troubleshooting/guia-integracao.md`](../troubleshooting/guia-integracao.md).

---

## 7. Monitoramento e saúde

- **Após cada importação:** confira `log_importacao` (linhas_erro próximo de zero) e o banner de órfãos.
- **Mensal:** revise a fila de críticos na Auditoria; investigue mudanças de regime.
- **Após importação de OP:** revise Gargalos de produtividade e Paradas operacionais; Alta eficiência é referência a validar, não incidente automático.
- **Dependências de CDN:** hoje sem versão fixada (`SEC-05`) — uma quebra externa pode derrubar parsing/gráficos. Se algo parar "do nada" sem deploy recente, suspeite de atualização de CDN.

---


## Conferência de alertas (>5%)

Ao validar uma importação ou fechar uma auditoria, o KPI **Alertas (>5%)** deve bater exatamente com a quantidade de linhas exibidas ao clicar no card e com a quantidade exportada quando a fila `alerts` está ativa. A regra operacional é variação absoluta ≥ 5% entre última e penúltima importação (`criado_em`); o período do relatório continua sendo competência (`data_referencia`). Se houver divergência, tratar como incidente de cálculo e ativar `VITE_ENABLE_VERBOSE_LOGS=true` apenas para coletar o log estruturado.

## 8. Quando algo não estiver coberto aqui

1. Consulte [Manual Técnico](./manual-tecnico.md), [Manual do Usuário](./manual-usuario.md) e `docs/arquitetura/`.
2. Para fragilidades/itens em aberto, veja [`docs/auditoria/`](../auditoria/README.md).
3. **Atualize esta documentação** ao descobrir um procedimento novo — ver [Regras Gerais](../regras-gerais.md). Documentação desatualizada é incidente operacional.

## Atualização 2026-08-27 — modos temporais de Custos

Use **Intervalo** para conferir todas as competências entre as datas e **Comparação** para confrontar somente duas competências. A fila, os KPIs, os gráficos temporais e o drill-through devem receber o mesmo recorte de `data_referencia`; `criado_em` continua somente como data do evento de importação.

## Atualização 2026-08-24 — exportação XLSX por campos

O popup de exportação parte com todos os campos da Fila Investigativa selecionados. O operador pode desmarcar colunas; a planilha usa somente essa seleção, conserva a ordem exibida e não consulta o Supabase. Cancelar encerra o fluxo sem gerar arquivo.

## Atualização 2026-08-24 — recorte do drill-through de Custos

Ao validar um produto no drill-through, o painel consulta exclusivamente as competências selecionadas no relatório. Em um recorte de Junho e Agosto, a comparação é feita entre esses dois registros; Julho não entra como mês intermediário. A competência continua sendo `data_referencia` e a data de importação continua sendo `criado_em`.

## Atualização 2026-05-28 — diagnóstico operacional de falhas da UI

Se a abertura do app, a análise, o drill-through ou a exportação falhar, a UI deve exibir mensagem operacional e manter o contexto possível da investigação. Para diagnóstico controlado, ative temporariamente `VITE_ENABLE_VERBOSE_LOGS=true`, reproduza a operação e use o `timestamp`/`operation` do log estruturado; desative a flag após a análise para manter o console limpo em produção.

## CI e validação de Pull Request — 25/06/2026

O repositório agora possui GitHub Actions para validação de qualidade em Pull Requests. O workflow executa lint, typecheck leve e testes automatizados, mas não realiza deploy nem altera o fluxo da Vercel. A publicação continua dependente da configuração existente de deploy estático e da geração de `runtime-config.js` com variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.


## Atualização 2026-07-20 — conferência de PRs recentes

Sem mudança operacional para o usuário final nesta revisão: apenas documentação do estado real dos PRs #121–#124. A operação deve considerar que filtros, chips, ordenação e exportação seguem com o mesmo comportamento, agora em módulos dedicados. A pendência operacional relevante continua sendo performance da fila/tabela em bases grandes (`PERF-01`), dependente do fechamento do MNT-01.

## Atualização 2026-07-30 — triagem de OP por motivo

O procedimento de OP passa a iniciar pela explicação do Kustos e não por uma coluna isolada do ERP. Em caso de divergência entre `% Tempo (ERP)` e o desvio de produtividade calculado, conferir o apontamento na origem; o Kustos mantém ambos para auditoria.

## Atualização 2026-08-03 — decisão e escalonamento de OP

Use a prioridade máxima para interromper a fila e investigar paradas com impacto em produção, tempo e KG/Hora. Prioridade alta cobre desperdício com entrega ou baixa produção sem redução de tempo. Registre, sem escalar, parada sem impacto; não abra incidente por tempo maior quando a produção maior explicar o consumo e a produtividade estiver estável. Essas decisões não mudam o uso de `data_referencia` (competência) ou `criado_em` (entrada do lote).
## Atualização 2026-08-13 — operar o Cadastro

Antes de importar o XLSM, confirme que Origem e Família existentes no arquivo estão cadastradas no ambiente. Pendências de produto inválido ou categoria desconhecida não substituem valores atuais. O Cadastro representa classificação atual e não altera fatos de Custos ou OP.

## Atualização 2026-09-28 — fila extensa de Custos

Se a Auditoria indicar que há itens além dos 200 exibidos, use os filtros ou o recorte de competência para trazer o produto à janela investigativa. O aviso não indica perda de dados: exportação e KPIs continuam usando o relatório completo, enquanto a tabela preserva apenas a leitura operacional dos itens mais prioritários.
