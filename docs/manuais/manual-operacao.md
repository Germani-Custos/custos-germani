# Manual de Operação — Kustos Germani

Procedimentos para **manter o sistema rodando** em produção: rotina mensal, categorização de órfãos, deploy/rollback, administração do Supabase e diagnóstico de problemas. Público: operação/controladoria com acesso ao Supabase e à Vercel. Para uso da tela, ver [Manual do Usuário](./manual-usuario.md); para código, [Manual Técnico](./manual-tecnico.md).

---

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
| `inserir_custo.sql`, `variacao_percentual_produto.sql` | Utilitários de consulta/inserção. |

> Ao criar novas migrações, siga o padrão de nomeação `AAAA-MM-DD_descricao.sql` e registre em [`docs/arquitetura/migracoes.md`](../arquitetura/migracoes.md) e no log do `AGENTS.md`.

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
O deploy é automático a partir da branch de produção (Vercel conectada ao GitHub). No build, a Vercel roda `node scripts/generate-runtime-config.mjs`, que gera `runtime-config.js` a partir das **Environment Variables** do projeto.

### Variáveis de ambiente (Vercel → Settings → Environment Variables)
Obrigatórias em Production/Preview/Development:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_VERBOSE_LOGS` (opcional; `false` em produção)

Se faltarem, **o build falha** (proposital). Checklist completo: [`docs/arquitetura/deploy.md`](../arquitetura/deploy.md).

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
| Mesmo produto com históricos separados | Código corrompido (notação científica do Excel) | Bug conhecido `VAL-01` ([auditoria](../auditoria/robustez-erros-validacao.md)); padronizar o código e reimportar. |
| Auditoria lenta com base grande | Tabela sem virtualização | Limitação conhecida `PERF-01`; refinar filtros como paliativo. |
| Logs detalhados necessários | — | Ativar `VITE_ENABLE_VERBOSE_LOGS=true` temporariamente (ativa `debugLog`). |

Playbook detalhado: [`docs/troubleshooting/playbook-operacional.md`](../troubleshooting/playbook-operacional.md) · integração: [`docs/troubleshooting/guia-integracao.md`](../troubleshooting/guia-integracao.md).

---

## 7. Monitoramento e saúde

- **Após cada importação:** confira `log_importacao` (linhas_erro próximo de zero) e o banner de órfãos.
- **Mensal:** revise a fila de críticos na Auditoria; investigue mudanças de regime.
- **Dependências de CDN:** hoje sem versão fixada (`SEC-05`) — uma quebra externa pode derrubar parsing/gráficos. Se algo parar "do nada" sem deploy recente, suspeite de atualização de CDN.

---

## 8. Quando algo não estiver coberto aqui

1. Consulte [Manual Técnico](./manual-tecnico.md), [Manual do Usuário](./manual-usuario.md) e `docs/arquitetura/`.
2. Para fragilidades/itens em aberto, veja [`docs/auditoria/`](../auditoria/README.md).
3. **Atualize esta documentação** ao descobrir um procedimento novo — ver [Regras Gerais](../regras-gerais.md). Documentação desatualizada é incidente operacional.
