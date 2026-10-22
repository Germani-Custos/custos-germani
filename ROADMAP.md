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

- CAD-COM-EXEC-01: executor isolado da primeira carga comercial, preservando timestamps/proveniência/logs; validação local do XLS/manifesto e rollback. Execução real bloqueada até autorização própria. [Contrato](docs/arquitetura/cadastro-mestre-comercial-executor-isolado.md).

- CAD-COM-01: Agrup. Com. e descrição opcionais no Master; migration aditiva aplicada em produção na etapa CAD-COM-PROD-01, sem carga. Publicação compatível V3, novo Preview/aprovação e execução continuam dependentes de novas etapas autorizadas. [Prova da migration](docs/auditoria/cadastro-mestre-comercial-producao-etapa1.md).

- CUSTOS-ERP-01: classificação analítica de origem/família pelo Master em memória, fallback fora do Master e agrupamento operacional; validação GET e interface local concluídas, publicação fora desta etapa.
- CAD-OP-PAGE-01 e CUSTOS-PAGE-01: paginação integral do Cadastro operacional e da Auditoria de Custos, contagem exata e bloqueio de leitura parcial.
- CAD-ERP-VIEW-01: consulta do Master ERP com estado independente, filtros por código e páginas visuais de 50.
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
