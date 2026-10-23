# Arquivo histórico do backlog — fotografia anterior à reconciliação

Estas cópias preservam integralmente os textos lidos antes das mudanças documentais de 22/10/2026. **Não são listas ativas.** Estado vigente: [backlog](backlog-priorizado.md); classificação/evidência de cada ID: [reconciliação](backlog-reconciliacao-2026-10-22.md).

Os blocos literais conservam inclusive checkboxes, prioridades, afirmações e links antigos. Links dentro dos blocos não são navegação e devem ser interpretados a partir do caminho original indicado. Linhas citadas no inventário contam desde a primeira linha do conteúdo de cada bloco, sem o cabeçalho deste arquivo. SHA-256 abaixo refere-se ao texto UTF-8 original, inclusive seus finais de linha.

## Backlog central original

Caminho original: `docs/auditoria/backlog-priorizado.md`. SHA-256: `8f2265a85e704e012ca8fe7123ba89f8263f938f654e4adcb39ea3b97d4ad7c5`.

<!-- INICIO ORIGINAL docs/auditoria/backlog-priorizado.md -->
`````markdown
# Backlog Priorizado — Auditoria Técnica

- [x] **CAD-ERP-TABLE-01 — apresentação local** (22/10/2026): cinco colunas no Master ERP; Agrup. Prod. removido somente da tabela e par comercial reunido em Agrupamento comercial. Sem inferências ou mudança de modelo/importação/executor/filtros/classificação. [Provas e leitura real](cadastro-mestre-comercial-validacao.md#cad-erp-table-01--apresentação-comercial-unificada-22102026).

- [x] **IMP-PEND-01 — implementação local** (22/10/2026): lista única de códigos/descrições do arquivo compartilhada com warnings e contagem, deduplicação e acesso contextual ao Cadastro. Momento anterior ao envio explícito por decisão humana; API/garantia legada intactas. Abrir/preparar não salva. Sem classificação nova, escrita remota ou publicação. [Diagnóstico e provas](robustez-erros-validacao.md#imp-pend-01--produtos-sem-cadastro-identificáveis-22102026).

- [x] **CUSTOS-DATA-01 — apresentação local** (22/10/2026): Histórico de Importações do produto exibe Data a partir de `data_referencia` já presente no payload, sem horário/dia fixo. Competência e uma linha por registro mantidas, inclusive 05/10 e 14/10. `criado_em` permanece proveniência; sem API/filtros/cálculos/banco/schema/publicação. [Causa e validação real](robustez-erros-validacao.md#custos-data-01--data-de-referência-no-histórico-do-produto-22102026).

- [x] **CAD-COM-EXEC-01 — executor isolado local** (22/10/2026): somente UPDATE do par comercial, com fotografia/hash, revalidação pelo adapter e universo 860/162/698, transação e rollback, preservando timestamps/proveniência/logs. Escrita real bloqueada até autorização própria; sem schema/publicação. [Contrato](../arquitetura/cadastro-mestre-comercial-executor-isolado.md) e [provas](cadastro-mestre-comercial-executor-isolado.md).

- [x] **CAD-COM-PROD-01 — somente migration** (19/10/2026): versão remota 20261019173633 aplicada com backup; duas colunas TEXT NULL, 860 produtos sem preenchimento comercial. Contagens e SHA-256 das 12 tabelas públicas idênticos; sem carga, publicação, commit ou push. [Provas](cadastro-mestre-comercial-producao-etapa1.md).

- [x] **VIS-01 — implementação visual local** (19/10/2026): tokens Black + Purple, cards para módulos existentes e apresentação compartilhada de Custos/OP/Cadastro/Documentação/login/modais, com semântica operacional preservada. Conferência sintética em três viewports e 554 testes verdes; sem publicação. Aprovação humana pendente. [Escopo e evidências](identidade-visual.md).

- [x] **CAD-COM-01 — implementação local** (19/10/2026): dois campos comerciais opcionais, limpeza explícita de vazio para NULL, transporte V3/manifesto V2, executor/snapshot/rollback e consulta ERP. XLS real: 860 produtos válidos, 162 com comercial, 698 sem, 29 códigos, zero conflitos; validação local anterior com remoto somente leitura. Migration posteriormente aplicada em CAD-COM-PROD-01, sem carga; os novos campos do Master de produção continuam NULL. Publicação e carga futura dependem de nova etapa autorizada. [Provas](cadastro-mestre-comercial-validacao.md).

## Organização documental — 16/10/2026

- [x] **DOC-ORG-01** — auditar os 53 Markdown versionados, separar apresentação/estratégia/planejamento/contratos/processo/manuais/evidências/história, reaproveitar História e atualizar índice. Somente documentação; sem testes de aplicação, commit, push ou deploy. [Diagnóstico, movimentos e validação](reorganizacao-documental.md).
- [ ] **DOC-DIV-01 — evidência insuficiente para encerrar divergências**: conferir critério de SRI/versão exata do cliente CDN em SEC-05, destino efetivo da FK de agrupamento (`id` no modelo especializado versus `codigo` em SQL histórico) e alcance RLS remoto. Não alterar checkboxes de segurança ou banco por esta revisão; exige escopo próprio e evidência. [Detalhes](reorganizacao-documental.md#contradições-e-tratamento).

Itens datados abaixo preservam o estado de cada entrega. Afirmações antigas de reconstrução/deploy/bucket pendentes foram sucedidas pelos registros de revisão final e de 15/10; não são tarefas atuais duplicadas. Publicação das entregas locais de 15–16/10 e execução das propostas V2 de famílias permanecem pendências próprias. A reavaliação de 02/07 é fundamento histórico; a sequência vigente considera somente itens abertos.

ERR-02 registra melhoria histórica de degradação; CUSTOS-PAGE-01 exige erro explícito se fonte da hierarquia falhar. Só o diagnóstico isolado permanece indisponível. Não reintroduzir hierarquia parcial pelo critério antigo.

- [x] **CUSTOS-PAGE-01** (2026-10-16): leituras completas da hierarquia/diagnóstico/histórico/comparações/drill-through de Custos, reutilizando paginação do Cadastro, com contagem exata e ordenação total. Erros/páginas incompletas não geram sucesso parcial; enriquecimento antes da cascata e classificações existentes preservados. 25 novas regressões; validação GET real confirmou 6.113 produtos/1.370 fatos/437 códigos encontrados/zero ausentes e 437 pendências de agrupamento. Sem DML, migration, sincronização ERP, alteração de OP ou deploy. [Contrato e evidências](../arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026).

- [x] **CAD-FAM-01 — implementação local** (2026-10-15): rótulo ERP no adapter/transporte V2 e manifesto, catálogo puro apenas do universo, decisões independentes, executor central com proteção específica integral de famílias, snapshot parcial e rollback conjunto. Preview real somente GET: 860 produtos/81 famílias/16 existentes/65 novas/693 impactados, sem conflitos ou escrita. Deploy e execução real ficam pendentes de autorização própria. [Contrato e provas](../arquitetura/cadastro-mestre-familias-erp.md).

- [x] **CAD-FAM-SCHEMA-01** (2026-10-15): remover somente `UNIQUE(descricao)` de `categorias_familia`, permitindo rótulos iguais em códigos diferentes. Migration 20261015182351 aplicada; 38 registros/35 códigos não nulos/38 descrições, PK, código único, NOT NULL e fingerprints protegidos preservados. Backup prévio e rollback manual não executado. Nenhum cadastro automático ou mudança de executor nesta etapa. [SQL e validações](../arquitetura/migracoes.md#cad-fam-schema-01--descrição-de-família-não-é-identidade-15102026).

- [x] **CAD-ERP-VIEW-01** (2026-10-15): acrescentar consulta Master ERP dentro de Cadastro, com fonte/total, busca, filtros exatos, agrupamento bruto e páginas visuais de 50. Reutiliza leitor Supabase de 500; não fixa 860, não mistura estado operacional nem escreve/sincroniza. Cadastro/edição operacional e Preview preservados. 463 testes/35 arquivos (31 novos) passaram com dois workers após timeout inicial preexistente; QA visual sintético e sonda GET real 860/50/18, sem escrita. Publicação depende de revisão/autorização. [Contrato e evidências](../ux/cadastro-mestre.md#cad-erp-view-01--duas-visões-no-cadastro-15102026).

- [x] **CAD-OP-PAGE-01** (2026-10-15): corrigir truncamento de `getProductMaster()` com páginas de 500/count exact/ordenação nas três fontes volumosas; preservar cálculo canônico e impedir sucesso parcial. Aviso explicita cadastro operacional. 23 regressões novas; 432 testes/32 arquivos, lint/typecheck/build/diff check passaram. Sonda real restrita a GET confirmou 6.113/1.370/704 linhas, 501 códigos únicos/zero ausentes, sem escrita ou Master ERP. Deploy pendente. [Contrato](../ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026).

- [x] **CAD-PAYLOAD-01 — contrato local** (2026-10-09): original somente no Preview; execução transporta campos ERP compactos de todas as linhas, decisões/hash/confirmacao/lote em JSON até 4 MiB. Hash dos dados vinculado antes da aprovação; servidor regenera filtros/universo/manifesto/contexto e executor repete sob locks. Sem aumento simples de teto XLS, parser/importador paralelo, schema/env/deploy/escrita de produção. [Contrato e confiança](../arquitetura/cadastro-mestre-execucao-web.md#cad-payload-01--transporte-sem-o-xls-bruto).
- [x] **CAD-PAYLOAD-01 — validação local**: cópia `cadastro mestre 8_10.xls` de 24.307.397 bytes produziu 6.230 linhas/860 válidos/4.853 remoções/dez UPDATEs/517 preservações de campos/zero erros. Equivalência direta/compacta/servidor, corpo local 885.146 bytes e 4.870 decisões; 409 testes/31 arquivos passaram. Sem comprovar identidade com nome `(1)` ou fazer POST/executor em produção. [Registro](./cadastro-mestre-payload-validacao.md).
- [x] **CAD-PAYLOAD-01 — operação real, concluída anteriormente**: usuário confirmou reconstrução bem-sucedida; diagnóstico somente leitura em 15/10 confirmou Master ERP 860 e operacional 6.113. CAD-OP-PAGE-01 não executa carga nem altera esses registros. A tentativa antiga bloqueada antes do POST permanece distinta da execução posterior bem-sucedida.

- [x] **Revisão final da execução web (2026-10-09)**: administrador informou DIAGNOSTICO_OK/CA válida; Production READY main 04a2412, flag false, UI/transporte/plano publicados iguais ao checkout. 103 regressões locais passaram e nenhum bloqueio concreto encontrado. Somente documentação atualizada, sem código/env/deploy/escrita de produção/commit. 860 exige novo Preview com esse universo. [Evidência e limites](../arquitetura/cadastro-mestre-preparacao-ambiente.md#revisão-final-somente-leitura-09102026). Falha TLS abaixo é histórica.

- [x] **CAD-DIAG-TLS-01 — instrumentação local** (2026-10-09): presença/tamanho/PEM/X.509/fingerprint da CA e parâmetros efetivos sanitizados no GET autorizado. Sem mudar TLS/flag/POST/executor; testes sem rede/DML/upload. [Contrato](../arquitetura/cadastro-mestre-preparacao-ambiente.md#cad-diag-tls-01--metadados-da-ca-e-do-driver).
- [x] **CAD-DIAG-TLS-01 — deploy autorizado**: Production READY `9swD3fEMicHbkGRzHKYqjUzDdyra`, GET público 401 sem CA/endpoint e execução false, disponibilidade 503. 369 testes/lint/typecheck/diff check passaram; sem commit/env/DML/upload.
- [x] **CAD-DIAG-TLS-01 — verificação autenticada Production**: JSON recebido do usuário confirma HTTP 409 TLS `SELF_SIGNED_CERT_IN_CHAIN`, CA presente/aplicada de 1.365 bytes, marcadores PEM presentes mas parsing X.509 inválido/fingerprint null, execução false. Correção da CA depende de ação administrativa posterior, não foi aplicada.

- [x] **CAD-DIAG-01 — diagnóstico local por etapas** (2026-10-09): GET de leitura com catálogo de erros sanitizados, sem credenciais/erro bruto; regressões para conexão/TLS/Storage/bucket/auth e rollback de leitura. [Guia](../arquitetura/cadastro-mestre-preparacao-ambiente.md#cad-diag-01--diagnóstico-de-etapas-sem-escrita).
- [x] **CAD-DIAG-01 — publicação autorizada**: Production READY B2mVXerHzJjbRjaYHSjZMm3TWPvF; GET público confirma instrumentação/configuração OK e flag false, 401 sem sessão.
- [x] **CAD-DIAG-01 — confirmar falha remota**: usuário confirmou HTTP 409 `SELF_SIGNED_CERT_IN_CHAIN`, etapa TLS; configuração/origem/auth/autorização OK, PostgreSQL não concluído, Storage não verificado e execução false. CA ainda depende de inspeção.

**Ponto de partida para o agente de desenvolvimento.** Este backlog foi **reavaliado em 2026-07-02** após a conclusão da Onda 2 (tooling), a entrada de CI/lint/typecheck/testes e a estabilização dos contratos VAL-01/LOG-01/ERR-01. A ordem abaixo agora é arquitetural: prioriza itens que reduzem risco de regressão, desbloqueiam refatorações futuras, preservam contratos existentes e aumentam velocidade investigativa sem alterar comportamento funcional desnecessariamente.

Cada item tem um **ID** detalhado no arquivo temático indicado (use Ctrl+F pelo ID). Ao concluir: marque o checkbox, referencie o ID no commit e **atualize a documentação** (ver `docs/regras-gerais.md`).

Esforço: **P** ≈ ≤ meio dia · **M** ≈ 1-2 dias · **G** ≈ 3+ dias / requer decisão.

---

## Entrega 2026-08-10 — MNT-OP-04

- [x] Contexto investigativo dinamico. Causa raiz: `allRows` era carregado somente na abertura e a importacao nao o renovava; o dossie tambem ignorava o recorte de competencia. Correcao: renovar a carga apos importar e derivar fila/dossie pelos filtros e por `data_referencia`, sem schema, RPC ou regra nova. `criado_em` permanece rastreabilidade. Regressao cobre dados novos e mudanca de competencia.

- [x] **CUSTOS-ERP-01** (16/10/2026): origem/família analíticas pelo Master com fallback apenas fora dele, projeção em memória antes da cascata e mesmos produtos na fila/gráficos/drill-through/XLSX. Operacional e agrupamento preservados. Implementação e validação GET/interface local concluídas; sem publicação nesta etapa. [Provas e testes](custos-classificacao-erp.md).

- [x] **CAD-VOL-01** (19/10/2026): reproduzido timeout do teste de payload com 6.230 linhas sob concorrência padrão; grafo sem UI e idêntico ao HEAD, medições determinísticas sem regressão associada ao redesign. Limite de 10 s somente no teste de volume, sem alterar fixture/asserções/contrato ou timeout global. Suíte completa com dois workers 554/554. [Causa, evidências e limite de ambiente](cadastro-mestre-payload-validacao.md#cad-vol-01--timeout-local-do-teste-de-volume-19102026).

## Estabilizações operacionais concluídas

- [x] **CAD-ENV-01 — preparação local** (2026-10-09): publicação dist por allowlist, diagnóstico autenticado READ ONLY com flag false, verificação de bucket/permissões/dependências e proteção de segredos. UUID único indicado pelo usuário resolvido por SELECT no Auth. [Guia](../arquitetura/cadastro-mestre-preparacao-ambiente.md).
- [x] **CAD-ENV-01 — ambiente real**: Production READY main 04a2412 e administrador informou diagnóstico autenticado DIAGNOSTICO_OK com CA/TLS/PostgreSQL/Storage/bucket/guardas válidos. Flag continua false; upload/rollback de produção não testados e habilitação não realizada por esta revisão.

- [x] **CAD-EXEC-WEB-01** 🟠 M (2026-10-09) — Conecta UI ao executor central por função Node Vercel autenticada/autorizada: aprovação integral, confirmação explícita, hash/revalidação, snapshot privado conferido, transação/rollback e consulta de resultado. Configuração/habilitação/deploy/carga real pendentes; zero escrita de produção/schema/RPC/fatos/operacional nesta entrega. → [Contrato](../arquitetura/cadastro-mestre-execucao-web.md).

- [x] **CAD-REBUILD-01** 🟠 M — Reconstrução do universo ERP (2026-10-09): Preview/aprovação substituem preservados fora do conjunto por remoções revisáveis; campos vazios de pertencentes preservados. Executor administrativo opt-in, mesma leitura/filtros, snapshot integral durável/no log existente, transação dedicada com rollback, lote/proveniência e provas de tabelas protegidas. Testes XLS/XLSX/XLSM e PostgreSQL em memória, nenhuma carga real ou alteração de schema/migration/RLS/Custos/OP. Execução real ainda depende da aprovação operacional. → [Contrato](../arquitetura/cadastro-mestre-reconstrucao.md).

- [x] **CAD-XLS-01** 🟠 P — Seletor XLSM/XLSX/XLS ligado ao adapter/motores existentes de Preview/aprovação após esclarecer que a tela anterior executava o legado diretamente. Contagens, preservações, decisões e download são locais; regressões BIFF/UI sem parser paralelo, executor, schema, migration ou carga real. → [Contrato atual](../ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

- [x] **CAD-UX-01** 🟠 P — Usabilidade do Cadastro (2026-10-08): tabela em contêiner único com altura limitada à viewport, barra horizontal acessível e cabeçalho sticky; remoção manual explícita grava `agrupamento_cod = NULL` sem mudar a preservação do importador. Validado em Chrome com 5.706 linhas sintéticas e três viewports; lint/typecheck verdes. Suíte: 247/250 passaram, três falhas CRLF preexistentes no artefato da Fase 3.3, fora deste escopo. → [Causas, contrato e validação](../ux/cadastro-mestre.md).

- [x] **MNT-OP-01** 🟠 P — Diagnosticar e corrigir a persistência da Auditoria de OP. **Causa raiz confirmada:** 119 de 296 valores de OP do CSV real usam ponto de milhar (por exemplo, `2.081`); o conversor inteiro estrito devolvia `null` e a constraint `op NOT NULL` rejeitava o chunk. **Correção:** normalização exclusiva do campo `op` antes do parse inteiro + diagnóstico completo de erro por chunk em `src/services/api.js`, sem migrar o schema. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **MNT-OP-02** 🟠 M — Construir o motor investigativo da Auditoria de OP. **Resolução (2026-07-30):** `core/op-investigation-engine.js` adiciona indicadores calculados e classifica por motivo/provável causa, sem alterar fatos do ERP ou schema. A fila/dossiê de `view/ui-op.js` separam “Dados do ERP (imutáveis)” de “Indicadores calculados pelo Kustos”; `% Tempo (ERP)` é conferência, não penalidade duplicada. Critério atendido: parada isolada não define investigação; combinações de tempo, produtividade, produção e parada definem o motivo.
- [x] **MNT-OP-03** 🟠 M — Declarar a decisão investigativa e calibrar cenários combinados da OP. **Resolução (2026-08-03):** o motor agora entrega `mereceInvestigacao`, prioridade, ação e evidências, consumidos sem recálculo pela fila/dossiê. Cobertos por regressão: desperdício com entrega, alta eficiência, baixa produção, tempo justificado pelo volume, parada sem impacto e paradas com perda de produtividade/atraso/déficit de produção (prioridade máxima). Sem alteração de schema ou dos fatos do ERP.

---

## Reavaliação arquitetural — 2026-07-02

### Decisão principal

A antiga separação rígida “Performance antes de Manutenibilidade” deixou de ser a melhor ordem. Com CI/lint/typecheck/testes já ativos, o maior risco atual não é ausência de ferramenta: é o acoplamento do `view/ui-controller.js`, que concentra renderização, eventos, importação, filtros, relatório, drill-through, exportação e gráficos. Por isso, **MNT-01 passa a ser o eixo destravador** antes das mudanças que mexem em tabela, cascata, HTML seguro e ciclo de cache da UI.

### Validação da hipótese sobre MNT-01

A hipótese está **majoritariamente correta**:

- **Desbloqueia diretamente `PERF-01`**: virtualização/limitação da tabela exige isolar renderização da fila investigativa, estado de ordenação, expansão de detalhes e delegação de eventos. Fazer isso dentro do god module aumenta risco de quebrar filtros, drill-through e exportação.
- **Desbloqueia diretamente `MNT-03`**: centralizar cascata/`fillSelect` depende de separar fluxos de filtros e relatório das demais responsabilidades de UI. Sem fatiamento, a mudança tende a virar refactor amplo e difícil de revisar.
- **Desbloqueia diretamente `SEC-02`**: helper de HTML seguro precisa ser aplicado nos pontos que montam HTML dinâmico. Separar componentes/fluxos da UI torna a adoção auditável e reduz exceções de lint.
- **Desbloqueia parcialmente `PERF-02`**: cache de `masters` com invalidação por realtime/import depende do ciclo de vida da UI (`loadMasters`, `fetchMetadata`, navegação e listeners), hoje dentro do `ui-controller`. O fatiamento ajuda muito, embora a solução também toque estado e API.
- **Desbloqueia parcialmente `VAL-02`**: o validador único de linha de custo depende mais de `MNT-06` e `MNT-02` (pipeline de importação/API) do que de `MNT-01`; porém separar o fluxo de importação no controller reduz risco ao substituir validações inline no preview.

Conclusão: **MNT-01 deve subir**, mas não sozinho. Antes dele ainda vale eliminar baixo esforço/alto risco que reduz divergência de importação (`MNT-06`) e documentar limites/contratos que serão preservados (`MNT-07`, `MNT-05`).

---

## Onda 1 — Concluída: segurança e correção de contrato

- [x] **SEC-01** 🔴 P — Escapar `value`/`label` em `fillSelect` (`core/report-engine.js:9,13`); mover `escapeHtml` para util compartilhada. → [`seguranca.md`](./seguranca.md)
- [x] **ERR-01** 🔴 M — `try/catch` de fronteira em `init()` e nos `await` de `runReport` (`view/ui-controller.js:16-24,508-524`). Resolvido no commit `fix(ERR-01): adiciona fronteiras operacionais e tratamento robusto de erros`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **VAL-01** 🟠 P — Normalizar código de produto (notação científica) no fluxo ativo, reusando `normalizeCodigoProduto`. Resolvido no commit `fix(VAL-01): unifica normalização de código de produto no pipeline operacional`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **LOG-01** 🟠 P — Unificar critério do KPI "Alertas (>5%)" e do filtro rápido do card. Resolvido no commit `fix(LOG-01): unifica regra operacional dos alertas investigativos`. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **SEC-04** 🟠 M — Limite de tamanho de string + sanitização de fórmula no export + faixa de data em `normalizeISODate`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-05** 🟠 P — Fixar versões de `xlsx`/`chart.js` (+ SRI) em `index.html`. → [`seguranca.md`](./seguranca.md)
- [x] **SEC-03** 🔵 G — Registrar decisão de acesso público + checklist de reativação de RLS/Auth; idealmente RLS de escrita já. → [`seguranca.md`](./seguranca.md)

## Onda 2 — Concluída: rede de segurança de desenvolvimento

- [x] **CFG-04** 🟡 P — `package.json` só com `devDependencies` + scripts (sem tocar no runtime CDN). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-01** 🟠 P — ESLint com regra anti-`innerHTML` não escapado e `no-unused-vars`. → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-03** 🟠 M — Vitest sobre `core/` (testes de regressão para `VAL-01` e `LOG-01`). → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-02** 🟠 M — `jsconfig.json` + `// @ts-check` + JSDoc inicial adicionados como base para `MNT-05`. → [`tooling-configuracao.md`](./tooling-configuracao.md)
- [x] **CFG-05** 🟡 P — CI (GitHub Actions) rodando lint/typecheck/test em PR. → [`tooling-configuracao.md`](./tooling-configuracao.md)

## Onda 3 — Preparação de contratos antes de refatorar

Objetivo: reduzir ambiguidade e remover divergências pequenas antes de fatiar módulos grandes.

- [x] **1. MNT-06** 🟠 P — Unificar os dois caminhos de importação; remover `mapRowsToPayload` órfão. **Motivo da subida:** baixo esforço, reduz divergência de payload e protege o contrato VAL-01 antes de mexer no fluxo de importação. Resolvido removendo `mapRowsToPayload`/`parseCurrency`/`normalizeReferenceDate` de `core/spreadsheet-engine.js` (o fluxo vivo em `view/ui-controller.js` já cobria normalização de `codigo_produto` e é o único gerador de payload); teste correspondente removido de `tests/spreadsheet-engine.test.js`. → [`manutenibilidade.md`](./manutenibilidade.md)
- [x] **2. MNT-07** 🟡 P — Documentar/centralizar limiares e tetos (`.limit(1000)`, limiares de regime). **Motivo da subida:** deixa explícitos limites de negócio/performance que `PERF-01`, `PERF-02` e futuras análises não podem alterar silenciosamente. Resolvido: todos os limiares nomeados e comentados no código (`ALERTA_CRITICO_CONFIG`, `LIMIAR_ESTAVEL`, `LIMIAR_OSCILANDO`, `MIN_PONTOS_REGIME`, `IMPORT_CHUNK_SIZE`, `IMPORT_COMPARISON_LOOKBACK_LIMIT`, `IMPORT_PREVIEW_DISPLAY_LIMIT`) e catalogados em `docs/regras-negocio/glossario.md`. O `.limit(1000)` foi justificado (tabela tem 601 linhas hoje; risco de truncamento documentado no código para revisitar se a base crescer) em vez de redesenhado, para não introduzir mudança de comportamento fora de escopo. → [`manutenibilidade.md`](./manutenibilidade.md)
- [x] **3. MNT-05** 🟡 M — Completar JSDoc/`@typedef` dos contratos (`Masters`, `HistoricoRow`, `ReportRow`). **Motivo da subida:** aumenta a precisão do typecheck já existente e reduz risco no fatiamento de UI/API. Resolvido: `src/services/api.js` entrou no `jsconfig.json` com `@ts-check`, importa os typedefs de `core/report-engine.js` e documenta `getMasters`, `getHistorico`, `getProductHistory` e `importarHistoricoCustosComLog`. O typecheck expôs e corrigiu 2 bugs reais: `enrichRowsWithDicionario` retornava array puro (não `{data,error}`) quando nenhuma linha tinha `codigo_produto`, e `getMasters` retornava `diagnostico_sem_mapa: []` em vez do formato `{status,rows,error}` esperado pela UI no caminho de erro do histórico. → [`manutenibilidade.md`](./manutenibilidade.md)

## Onda 4 — Fatiamento destravador da UI

Objetivo: decompor `view/ui-controller.js` por fluxo, preservando comportamento e preparando mudanças de performance/segurança sem refactor transversal. Deve ser feito em commits pequenos por fluxo, mantendo `init()`, `runReport()` e handlers críticos sob as fronteiras ERR-01.

- [x] **4. MNT-01** 🟠 G — Fatiar `view/ui-controller.js` por fluxo (bootstrap/navegação, importação, filtros/relatório, fila investigativa, drill-through, exportação/gráficos). **Resolvido no Engineering Freeze v1.0:** `view/ui-table.js` concentra fila/tabela e presenter investigativo, completando o fatiamento iniciado por gráficos, drill-through, importação, filtros e exportação. `ui-controller.js` fica como orquestrador, sem mudança funcional. → [`manutenibilidade.md`](./manutenibilidade.md)

## Onda 5 — Performance e segurança da fila investigativa/UI

Objetivo: melhorar velocidade investigativa percebida e reduzir superfície de XSS com a UI já fatiada.

- [x] **5. PERF-01** 🟠 M — Limitar a fila investigativa à janela TOP-200 já priorizada + delegação de eventos no `tbody`. **Resolução (2026-09-28):** `view/ui-table.js` renderiza somente os primeiros 200 itens recebidos, informa o total e orienta refinar filtros; um único listener delegado preserva drill-through e detalhes sem listeners por linha. Não altera prioridade, KPIs, recorte temporal, API, importação ou exportação. → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [ ] **6. MNT-03** 🟠 M — Centralizar cascata e `fillSelect`. **Dependência real:** deve vir após separar fluxos de filtros/relatório em `MNT-01`; preserva o contrato de cascata e reduz duplicação. **Progresso parcial registrado em 2026-07-20:** `fillSelect` foi movido para `view/ui-utils.js` no PR #124, mas a cascata ainda não tem helper/módulo único; portanto não marcar como concluído. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **7. SEC-02** 🟡 M — Helper de "HTML seguro" + endurecimento da regra de lint. **Dependência real:** `CFG-01` já existe; após `MNT-01`, aplicar o helper por componente/fluxo fica revisável. → [`seguranca.md`](./seguranca.md)
- [ ] **8. PERF-02** 🟠 M — Cachear `masters` com invalidação por realtime/import (parar de recarregar a cada troca de view). **Dependência real:** parcialmente desbloqueado por `MNT-01`; também exige preservar degradação parcial de `ERR-02` e diagnóstico de órfãos. → [`performance-otimizacao.md`](./performance-otimizacao.md)
- [x] **PERF-03** 🟡 P — Memoizar `calculateCascadeOptions`. → [`performance-otimizacao.md`](./performance-otimizacao.md)

## Onda 6 — Camada de dados/importação e validação compartilhada

Objetivo: consolidar contratos de serviço e validação depois que o fluxo de importação e a UI estiverem menos acoplados.

- [ ] **9. MNT-02** 🟠 M — Fatiar `src/services/api.js` (fachada + validation + enrichment + client). **Motivo da descida relativa:** importante, mas menos destravador para a dor imediata da UI; deve aproveitar `MNT-05` e manter fachada compatível para não quebrar UI→API. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **10. VAL-02** 🟡 M — Validador de "linha de custo" único (preview = API). **Dependência real:** melhor após `MNT-06` e `MNT-02`, com fluxo de importação isolado por `MNT-01`; preserva VAL-01 e importação tolerante linha a linha. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [ ] **11. LOG-02** 🟠 M — Comparação entre importações pode comparar **dois chunks da mesma importação** em vez de duas importações reais, porque o upsert grava em chunks de 400 e cada chunk recebe um `criado_em` distinto. **Dívida arquitetural conhecida** (registrada em 2026-07-17, sem alteração de comportamento): erro silencioso em `getLatestImportComparison`/`getTopVariacoesImportacao` que afeta a comparação e o TOP variações quando um lote passa de `IMPORT_CHUNK_SIZE`. Toca o contrato temporal `criado_em`; exige decisão entre (a) `criado_em` único por lote no payload ou (b) agrupar por lote/`log_importacao`, antes de implementar. → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **ERR-02** 🟡 P — `Promise.allSettled` em `getMasters` (degradação parcial). → [`robustez-erros-validacao.md`](./robustez-erros-validacao.md)
- [x] **MNT-04** 🟡 P — Decidir integrar/remover `heuristic-engine`, `getTrendsByProduct`, `upsertHistoricoCustos`. **Decisão (rev. arquitetural A-04):** `heuristic-engine.js` mantido como guardrail somente-documentação; `AGENTS.md` corrigido. → [`manutenibilidade.md`](./manutenibilidade.md)
- [ ] **12. MNT-08** 🟠 M — Mover `getOperationalPriority`/`buildInvestigativeSummary` de `view/ui-table.js` para um presenter investigativo dedicado; remover a injeção em `ui-export.js`. **Dependência real:** companheiro natural de `MNT-01` (fatiamento da UI). Avaliado e adiado na revisão arquitetural (A-02): destino ambíguo (não é `report-engine`, que reintroduziria vazamento de apresentação; nem `ui-utils`, que não remove a injeção), toca contrato público de `createExportController` e exige reescrever `tests/ui-export.test.js`. → [`manutenibilidade.md`](./manutenibilidade.md)

---

## Mudanças de ordem nesta reavaliação

- **`MNT-01` subiu** de Onda 4 para eixo central da nova Onda 4, antes de `PERF-01`, `PERF-02`, `MNT-03` e `SEC-02`, porque o acoplamento da UI é hoje o maior multiplicador de risco.
- **`PERF-01` desceu para depois de `MNT-01`**, apesar do alto impacto ao usuário, porque virtualizar a tabela sem isolar renderização/eventos tende a misturar mudança funcional e refactor estrutural.
- **`PERF-02` desceu para depois de `MNT-01` e depois de itens da UI**, porque cache/invalidação depende de navegação, realtime/import e estado de masters; a solução precisa preservar `ERR-02` e o diagnóstico explícito de órfãos.
- **`MNT-06` subiu para primeiro item aberto**, porque é pequeno, remove caminho morto/divergente e reduz risco sobre `codigo_produto` antes de novas refatorações.
- **`MNT-07` e `MNT-05` subiram**, porque documentação de limites e tipos torna a rede de segurança (typecheck/testes) mais útil antes de fatiar módulos grandes.
- **`MNT-02` desceu para Onda 6**, não por menor importância, mas porque a API já tem contratos estabilizados; fatiá-la antes da UI não desbloqueia tanto quanto `MNT-01` e pode aumentar área de regressão simultânea.
- **`VAL-02` ficou após `MNT-02`**, porque o validador único deve nascer no limite correto entre preview e API, evitando uma terceira fonte de verdade.
- **`SEC-02` ficou após `MNT-01`/`MNT-03`**, pois a segurança de HTML seguro será mais consistente quando os pontos de renderização e `fillSelect` estiverem centralizados.

---

## Regras de execução para o agente

1. **Respeitar contratos do `AGENTS.md`**: separação FATO × DIMENSÃO e semântica `data_referencia` × `criado_em`. Uma "melhoria" que viole isso é regressão.
2. **Um item por commit** (ou por PR pequeno), com a referência do ID no commit (ex.: `fix(SEC-01): escapar opções de select`). Para `MNT-01`, usar commits menores por fluxo.
3. **Preservar a rede de segurança da Onda 2**: rodar lint/typecheck/test antes de concluir qualquer item aberto.
4. **Não alterar comportamento funcional quando o item for estrutural**: refatorações devem manter UX, semântica temporal, cascata, exportação e contratos UI→API existentes.
5. **Ao concluir**: marcar o checkbox aqui, atualizar manuais/`docs` afetados e registrar no log do `AGENTS.md`.
## Concluído

- [x] **CAD-EXEC-01** — Fase 3.4 (2026-10-08): carga pontual autorizada, revalidação integral, migration 20261008184501 e lote 1 concluído. Master 5.706, 103 inserções, 312 produtos atualizados (320 campos), zero erros. Preservação integral fora dos filtros e do operacional/mapa/fatos/categorias, sem ponte, RLS ou importer de runtime. → [Contrato e provas](../arquitetura/cadastro-mestre-execucao-fase3-4.md)

- [x] **CAD-APPROVAL-01** — Fase 3.3 (2026-10-08): alias empresarial `Agrup. Prod.` → valor ERP bruto, manifesto determinístico, revisão/decisões locais individuais ou globais e exportação explícita de aprovadas. Lote real entregue pendente; zero escrita pelo fluxo, sem execução, ponte ou ativação no legado. → [Contrato e evidência](../arquitetura/cadastro-mestre-aprovacao.md)

- [x] **CAD-PREVIEW-01** — Fase 3.1 (2026-10-08): núcleo puro e adaptador de Preview XLSM/XLSX/XLS contra `dicionario_master_produtos`, com filtros ordenados, preservação de vazios/ausentes, resolução exclusivamente por código exato e agrupamento ERP sem ponte. Somente leitura, sem migration ou alteração de telas/legado. → [Contrato e limites](../arquitetura/cadastro-mestre-preview.md)

- [x] **CAD-01** — Cadastro mestre em `dicionario_produtos`: XLSM incremental, agrupamento investigativo manual e resolução compartilhada por Custos/OP sem segunda fonte de verdade.

`````
<!-- FIM ORIGINAL docs/auditoria/backlog-priorizado.md -->

## ROADMAP original

Caminho original: `ROADMAP.md`. SHA-256: `71fc693497414ac402d31a3529a588c5f37eebfa169f868ef6238f8797ad15a7`.

<!-- INICIO ORIGINAL ROADMAP.md -->
`````markdown
# Roadmap Estratégico — Kustos Germani

Recorte documental: **19/10/2026**. Toda iniciativa deve acelerar investigação, reduzir cliques, melhorar contexto ou destacar risco. Conclusão de implementação local e publicação/execução real são estados distintos; a validação GET de CUSTOS-ERP-01 está na auditoria específica e não representa publicação.

## Concluído

### Consolidação operacional e investigação analítica

- Importação resiliente de custos com reconhecimento/mapeamento de cabeçalhos, parsing brasileiro, preview por linha, normalização canônica, chunking, log e garantia de produtos no dicionário.
- Busca direta, cascata, ordenação, filtros rápidos, chips e atualização do relatório após mudança de filtros.
- Alertas canônicos, instabilidade, mudança de regime, comparação de importações, TOP variações e evolução temporal.
- Recortes Intervalo/Comparação compartilhados com drill-through e exportação XLSX com contexto e campos selecionáveis.
- Auditoria de OP: persistência MCAP105, decisão investigativa por sinais combinados e carga local renovada após importar (MNT-OP-01 a MNT-OP-04).
- Fronteiras de erro, contratos tipados, lint/testes/CI e modularização da UI (MNT-01); fila de Custos com janela TOP-200 e delegação de eventos (PERF-01).

### Cadastro e proveniência ERP

- Dimensão operacional comum a Custos/OP e manutenção manual da classificação, separada dos fatos.
- Estrutura de proveniência do Master, preservação do agrupamento ERP bruto e primeira carga pontual auditada.
- Pipeline único XLS/XLSX/XLSM → Preview → manifesto → aprovação integral → reconstrução administrativa explícita, por CLI ou função Vercel, com snapshot/revalidação/transação/rollback.
- Transporte web compacto, diagnóstico administrativo de leitura e isolamento do frontend em `dist`.
- Reconstrução real confirmada nos registros posteriores à preparação; [evidência de 15/10](docs/ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026). Isso não representa execução das novas propostas de famílias.
- Identidade de família por código, com remoção isolada da unicidade da descrição aplicada e documentada em [Migrações](docs/arquitetura/migracoes.md).

### Implementações locais com continuidade de publicação

- IMP-PEND-01: Preview/resultado de Custos identificam códigos únicos ausentes antes do envio, com descrição do arquivo e acesso contextual ao Cadastro Operacional. Sem persistência adicional ou mudança da regra existente. [Contrato e provas](docs/auditoria/robustez-erros-validacao.md#imp-pend-01--produtos-sem-cadastro-identificáveis-22102026).

- CAD-COM-EXEC-01: executor isolado da primeira carga comercial, preservando timestamps/proveniência/logs; validação local do XLS/manifesto e rollback. Execução real bloqueada até autorização própria. [Contrato](docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md).

- CAD-COM-01: Agrup. Com. e descrição opcionais no Master; migration aditiva aplicada em produção na etapa CAD-COM-PROD-01, sem carga. Publicação compatível V3, novo Preview/aprovação e execução continuam dependentes de novas etapas autorizadas. [Prova da migration](docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md).

- CUSTOS-ERP-01: classificação analítica de origem/família pelo Master em memória, fallback fora do Master e agrupamento operacional; validação GET e interface local concluídas, publicação fora desta etapa.
- CAD-OP-PAGE-01 e CUSTOS-PAGE-01: paginação integral do Cadastro operacional e da Auditoria de Custos, contagem exata e bloqueio de leitura parcial.
- CAD-ERP-VIEW-01: consulta do Master ERP com estado independente, filtros por código e páginas visuais de 50. Apresentação atual em cinco colunas, com Agrupamento comercial reunindo código — descrição (CAD-ERP-TABLE-01), sem mudança de dados.
- CAD-FAM-01: catálogo de famílias ERP no Preview V2, decisões próprias e executor central com provas/snapshot/rollback conjuntos.

Contratos e evidências: [matriz operacional](docs/arquitetura/matriz-contratos-operacionais.md), [Cadastro](docs/ux/cadastro-mestre.md) e [famílias ERP](docs/arquitetura/cadastro-mestre-familias-erp.md). Contagens e resultados de testes pertencem às evidências datadas, não a itens adicionais deste roadmap.

## Em andamento

Continuidade registrada como pendente nas entregas locais, sem assumir execução ativa por alguém:

- Publicação autorizada das leituras integrais de Cadastro/Custos e da consulta ERP; conferência da UI publicada com sessão de produção.
- Publicação conjunta de UI/função V2 de famílias, novo Preview, revisão independente de famílias/produtos e diagnóstico. Habilitação/execução real das propostas exige autorização própria; não é teste da consulta.
- Esclarecimento da divergência histórica de fingerprint operacional registrada na [Fase 3.3](docs/arquitetura/cadastro-mestre-aprovacao.md#ressalva-detectada-na-comparação-real), sem atribuir causa ou autoria por suposição.

Não há publicação, habilitação ou execução autorizada por este documento. Estado remoto de flags/permissões deve ser verificado na operação correspondente.

## Próxima onda

### Prioridade técnica vigente

Seguir o [backlog priorizado](docs/auditoria/backlog-priorizado.md), que mantém critérios e dependências. MNT-01/PERF-01 já estão concluídos; não reiniciar a preparação histórica:

1. **MNT-03:** centralizar cascata; `fillSelect` já tem lar único, mas a iniciativa permanece parcial.
2. **SEC-02:** padronizar HTML seguro sobre os fluxos separados.
3. **PERF-02:** cache de masters com invalidação por importação/realtime e diagnóstico explícito de falhas.
4. **MNT-02 / VAL-02:** separar responsabilidades da API mantendo a fachada e consolidar validação entre preview e persistência.
5. **LOG-02:** decidir identidade de lote versus timestamp por chunk antes de corrigir comparação de importações. `criado_em` segue importação; `data_referencia` segue competência.
6. **MNT-08:** avaliar presenter investigativo dedicado e desacoplamento da ordenação de exportação dos rótulos visuais.

### Próxima evolução funcional — Memória operacional

Planejada, sem implementação declarada por esta reorganização:

- Histórico de alertas por produto, frequência/reincidência e linha do tempo de regime, preservando o alerta canônico ≥ 5%.
- Comparação entre períodos equivalentes e exportação do drill-through individual.
- Autocomplete avançado por código/descrição e persistência do filtro de mudança de regime por período.

Decisões pendentes: cálculo local versus views para séries longas, retenção de `log_importacao` e suficiência dos índices já documentados. A antiga proposta de indexação não implica ausência dos índices existentes.

## Backlog futuro

### Inteligência operacional

- Ampliar priorização para ranking de risco composto e sugestões explicáveis de próximos produtos a investigar; a prioridade contextual atual já existe.
- Distinguir sazonalidade de ruptura, gerar insights textuais de recorrência e avaliar previsão de tendência.
- Integração direta ERP/SAP e eventual sugestão revisável de classificação por código de negócio.
- Reavaliar datalist em volumes grandes (PERF-04) e acessibilidade conforme impacto investigativo.

### Decisões de negócio e dados

- Reconciliação Master ERP → dimensão operacional somente após decisão explícita de negócio; nenhuma sincronização automática está implícita na existência de duas visões.
- Ponte empresarial aprovada para agrupamento ERP → categoria Kustos; não converter por família, origem, descrição ou semelhança de códigos.
- Modelo de acesso/RLS e retenção de evidências conforme necessidade operacional. Login existente não comprova isolamento no banco.

### Não priorizar

Features decorativas, CRUD complexo, multi-tenant/RBAC burocrático enquanto não houver necessidade de uso, microserviços sem justificativa, abstrações excessivas e IA genérica sem aplicação verificável à auditoria. [Multi-tenant](docs/roadmap/multi-tenant.md) continua proposta futura.

## Documentos de apoio

[VISION](VISION.md) define a direção; [README](README.md) apresenta o estado do checkout; [backlog](docs/auditoria/backlog-priorizado.md) ordena correções técnicas; [História](docs/HISTORIA_DO_PROJETO_KUSTOS.md) explica decisões e marcos anteriores. O histórico oficial de commits permanece no Git.

`````
<!-- FIM ORIGINAL ROADMAP.md -->

## README original

Caminho original: `README.md`. SHA-256: `4a17ae7d3c069449cf3275f00a730ec2345435806718eb6391de88f99a65360f`.

<!-- INICIO ORIGINAL README.md -->
`````markdown
# Kustos Germani — Motor de Investigação de Custos

## 1. O que é o Kustos

O Kustos Germani é um motor de investigação operacional de custos sobre dados ERP/SAP. Organiza evidências, destaca anomalias e permite chegar ao histórico de um produto por busca direta ou filtros em cascata. Seu público é controladoria, custos industriais e coordenação operacional.

## 2. Objetivo

Encontrar problemas em segundos: mostrar o que mudou, quanto, em qual competência e entre quais eventos de importação, com contexto para priorizar a investigação. Identidade, princípios e direção estão em [VISION.md](VISION.md).

## 3. Como funciona

Planilhas de custos e apontamentos de OP passam por leitura, normalização, preview e validação antes da persistência. A investigação de Custos usa origem/família do Master ERP quando o código existe nele, com fallback operacional apenas para códigos fora do Master; agrupamento continua operacional. A OP usa a classificação operacional; cálculos e interpretação ficam nos motores puros do Kustos.

Os dois eixos temporais são distintos: **`data_referencia` é competência operacional**; **`criado_em` é evento de importação**. Intervalo inclui as competências entre início e fim; Comparação considera somente as duas competências escolhidas. Fila, gráficos e drill-through compartilham o recorte.

## 4. Principais capacidades

- Busca por código/descrição e cascata Origem → Família → Agrupamento → Produto.
- Fila investigativa de Custos com prioridade, contexto, instabilidade e mudança de regime; janela visual de até 200 itens, com KPIs e exportação sobre o relatório completo.
- Drill-through por produto com competência (mês/ano), Data de referência (DD/MM/AAAA), custos e deltas; mantém cada registro, inclusive datas diferentes no mesmo mês. Importação (`criado_em`) permanece proveniência, sem exibição na coluna Data; alerta canônico de variação absoluta ≥ 5%.
- Gráficos de comparação de importações, TOP variações e evolução por competência.
- Exportação XLSX com seleção de campos e abas `Contexto` e `Fila Investigativa`.
- Auditoria de OP com decisão, prioridade, provável causa e evidências combinando produção, tempo, KG/Hora e paradas.
- Cadastro Operacional para classificação Kustos e consulta independente do Cadastro Mestre ERP; Preview de XLS/XLSX/XLSM com aprovação e execução administrativa explícita. Carga pontual de Agrup. Com. com [executor isolado](docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md), preservando timestamps/proveniência/logs; escrita real ainda bloqueada.
- Consulta/edição dos documentos permitidos pela tela Documentação.

Procedimentos e limites: [Manual do Usuário](docs/manuais/manual-usuario.md).

A interface usa a identidade **Black + Purple**: superfícies grafite, acentos violeta e cores operacionais semânticas. A área inicial de Importação reúne cards para os módulos existentes. [Componentes e tokens visuais](docs/ux/componentes.md).

## 5. Arquitetura resumida

Frontend estático em HTML/CSS/JavaScript ES Modules, com bibliotecas CDN. `view/` apresenta e orquestra; `core/` calcula sem I/O; `src/services/api.js` concentra o acesso Supabase e delega o HTTP administrativo. Funções Vercel em `api/` tratam gravação documental e execução autorizada do Master. O executor PostgreSQL administrativo é compartilhado com o CLI e permanece fora do browser.

`historico_custos` é fato temporal; `dicionario_produtos` e `categorias_*` fornecem a classificação operacional. Em Custos, `core/custos-classification-engine.js` projeta em memória origem/família do `dicionario_master_produtos`, resolvidas por código exato dos catálogos, antes da cascata e da análise. O fallback operacional vale somente fora do Master; a projeção não grava cadastros nem fatos. OP e manutenção operacional conservam sua fonte. Classificações de agrupamento provenientes do ERP são dados opcionais e independentes da classificação investigativa do Kustos. O Master preserva Agrup. Prod. e, em campos próprios, Agrup. Com. e sua descrição; nenhum deles preenche agrupamento Kustos. [Contrato comercial ERP](docs/arquitetura/cadastro-mestre-agrupamento-comercial-erp.md). [Modelo de dados](docs/arquitetura/banco-de-dados.md) e [matriz de contratos](docs/arquitetura/matriz-contratos-operacionais.md) detalham os limites.

## 6. Estrutura do projeto

```text
index.html / assets/       Shell, navegação e estilos
view/                     Controllers, estado, DOM e apresentação
core/                     Parsing, cálculos e motores puros
src/services/             Fachada Supabase, adapter e cliente HTTP
services/api.js           Shim de compatibilidade
api/                      Funções Vercel
scripts/                  Build e ferramentas administrativas
sql/                      Scripts e migrations versionados
tests/ / types/           Regressões e contratos de tipos
docs/                     Manuais, arquitetura, auditoria e história
```

O [Manual Técnico](docs/manuais/manual-tecnico.md) descreve os módulos e o ciclo de desenvolvimento.

## 7. Fluxos principais

1. **Custos:** selecionar competência → enviar XLSX → conferir colunas/preview → importar com log → identificar códigos/descrições sem cadastro antes do envio → consultar/preparar cada item no Cadastro sem redigitar códigos → investigar por produto ou cascata → detalhar/exportar. A lista não salva nem classifica produtos; a rotina existente de importação permanece.
2. **OP:** enviar CSV MCAP105 com competência → conferir/importar → investigar fila e dossiê derivados da carga local atualizada.
3. **Cadastro:** consultar/editar classificação operacional ou consultar Master ERP com estado independente. A tabela ERP mostra Código, Descrição, Origem, Família e Agrupamento comercial (código — descrição), sem coluna Agrup. Prod.; os campos persistidos permanecem. Preview ERP é separado da consulta e da edição manual; decidir/baixar revisão é local. Executar reconstrução exige autorização administrativa, aprovação integral, segunda confirmação e revalidação no servidor.
4. **Documentação:** consultar os documentos disponibilizados na tela; salvar usa função própria e gera commit no GitHub. Essa ação não faz parte desta reorganização local.

## 8. Como executar/desenvolver

Requer Node >= 22 para ferramentas e funções. Veja o [setup](README_SETUP.md) antes de executar comandos; configure somente os valores públicos do frontend no ambiente, sem versionar credenciais.

```powershell
npm ci
node scripts/generate-runtime-config.mjs
```

Sirva a raiz com um servidor HTTP estático disponível no seu ambiente. O servidor estático permite usar o frontend, mas não executa as funções `/api`. Não existe script `npm run dev` neste pacote.

Para mudanças de código, os scripts de qualidade são `npm run lint`, `npm run typecheck` e `npm test`. `npm run build` gera `dist` por allowlist e não publica o projeto; configuração pública obrigatória ausente bloqueia o build. Funções são empacotadas separadamente pela Vercel. [Desenvolvimento](docs/manuais/manual-tecnico.md) e [operação](docs/manuais/manual-operacao.md) explicam as rotinas.

## 9. Documentação relacionada

- [Índice completo](docs/arquitetura/indice-documentacao-kustos.md): navegação por responsabilidade.
- [VISION.md](VISION.md): identidade, missão, princípios e direção estratégica.
- [ROADMAP.md](ROADMAP.md): iniciativas concluídas, continuidade, próxima onda e futuro.
- [AGENTS.md](AGENTS.md) e [Regras Gerais](docs/regras-gerais.md): contratos obrigatórios e processo de trabalho.
- [Manual do Usuário](docs/manuais/manual-usuario.md), [Técnico](docs/manuais/manual-tecnico.md) e [Operação](docs/manuais/manual-operacao.md): procedimentos por público.
- [Auditoria e backlog](docs/auditoria/README.md): fragilidades, evidências e prioridades técnicas.
- [História do Projeto](docs/HISTORIA_DO_PROJETO_KUSTOS.md): decisões, problemas superados e marcos; Git continua sendo a fonte oficial de commits.
- [Auditoria desta reorganização](docs/auditoria/reorganizacao-documental.md): diagnóstico, destinos, divergências e validação.

## 10. Estado atual

Estado do **checkout documentado em 19/10/2026**. A [validação CUSTOS-ERP-01](docs/auditoria/custos-classificacao-erp.md) usou apenas GET contra os dados reais e interface local; os demais estados abaixo mantêm as referências anteriores:

- Investigação de Custos/OP, Cadastro e Documentação implementados. Bootstrap exige sessão/login; isso não comprova políticas RLS do ambiente remoto.
- Classificação analítica de Custos pelo Master ERP implementada em memória e validada localmente; publicação fora desta etapa. Cadastro Operacional e agrupamento não são sincronizados.
- Leituras integrais de Cadastro/Custos implementadas com paginação de 500, contagem exata e recusa de resultados incompletos. Paginação entre requisições não é snapshot transacional.
- Consulta ERP independente, catálogo de famílias e agrupamento comercial opcional implementados. A migration de Agrup. Com. foi aplicada em produção; os dois campos continuam NULL nos 860 produtos, sem carga do XLS. Publicação de UI/função compatíveis com transporte V3 e execução dependem de novas etapas autorizadas. [Prova da migration](docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md). Os registros de entrega ainda deixam publicação dessas alterações e execução real das novas propostas de famílias pendentes de etapa autorizada.
- Reconstrução do Master ERP já foi confirmada nos registros de 15/10; antigas contagens de 5.706 e expectativa de 860 pertencem às fases anteriores. Quantidades são evidências datadas, nunca valores fixos do produto.
- Dívidas abertas incluem cascata compartilhada, HTML seguro, cache de masters, separação da API/validação e LOG-02: timestamps distintos de chunks ainda podem representar um mesmo lote lógico. Prioridades e limites estão no [backlog](docs/auditoria/backlog-priorizado.md).

`````
<!-- FIM ORIGINAL README.md -->

