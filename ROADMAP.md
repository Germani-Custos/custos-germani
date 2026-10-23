# Roadmap Estratégico — Kustos Germani

Recorte reconciliado em **22/10/2026**. Este documento reúne capacidades futuras e decisões de produto. Problemas existentes, prioridades P0–P3 e critérios de correção pertencem exclusivamente ao [backlog ativo](docs/auditoria/backlog-priorizado.md). A evolução funcional aguarda a decisão humana após a auditoria; esta organização não autoriza implementação, escrita remota ou publicação.

## Base disponível e evidência de entregas

Custos oferece busca/cascata, fila, KPIs, gráficos, drill-through e exportação. OP oferece fila/dossiê e decisão por produção, tempo, produtividade e parada. Cadastro separa Operacional de Mestre ERP, com Preview e fronteira administrativa. A implementação dessas capacidades convive com defeitos atuais: consulta de OP parcial, ordenação/narrativa/comparação e salvamento documental estão no backlog; não são entregas futuras opcionais.

Leitura de produção em 22/10 confirmou 860 produtos ERP, 162 pares comerciais preenchidos, 698 vazios e lote histórico com 65 famílias inseridas. Recursos frontend publicados foram conferidos; saúde autenticada atual de TLS/Storage/flags e causa remota do HTTP 500 continuam sem conclusão. Não manter uma tarefa genérica de repetir publicação/carga dessas entregas com base em textos antigos. O executor comercial isolado foi implementado para uma fotografia inicial específica; o preenchimento atual não prova uso dele nem autoriza executá-lo novamente.

O [inventário de reconciliação](docs/auditoria/backlog-reconciliacao-2026-10-22.md) avalia cada uma das 38 entradas anteriores e os IDs históricos. O [arquivo histórico](docs/auditoria/backlog-historico.md) preserva integralmente a versão anterior deste roadmap, do README e do backlog. [História do projeto](docs/HISTORIA_DO_PROJETO_KUSTOS.md), contratos e provas continuam responsáveis pelos marcos detalhados; Git é a fonte oficial de commits.

## Próxima evolução funcional — memória operacional

Planejada, sem implementação declarada por esta reorganização:

- Histórico persistente de alertas por produto, frequência/reincidência e linha do tempo de regime, preservando o alerta canônico ≥5%. A narrativa indevida da fila atual deve ser corrigida por LOG-04 sem exigir essa nova persistência.
- Comparação ampliada entre períodos equivalentes e exportação do drill-through individual. Corrigir a comparação existente por lote/recorte é LOG-02/03, no backlog.
- Autocomplete avançado por código/descrição e persistência do filtro de mudança de regime por período, se priorizados por uso. PERF-04 não prova necessidade dessas novas capacidades.

Antes de escolher uma entrega, definir cálculo local versus séries maiores, retenção de evidências e critério de benefício investigativo. Índices existentes e planos reais devem ser conferidos; não assumir ausência de índice a partir de proposta histórica.

## Evolução futura — inteligência operacional

- Ranking de risco composto e sugestões explicáveis de próximos produtos a investigar. Corrigir a prioridade prometida pela janela atual é LOG-05, não depende desse novo motor.
- Distinguir sazonalidade de ruptura, ampliar insights temporais e avaliar previsão de tendência com base suficiente.
- Integração direta ERP/SAP e eventual sugestão revisável de classificação por código de negócio, condicionada a contrato empresarial. Não inferir classificação por descrição ou semelhança textual.
- Acessibilidade e experiência em volumes maiores conforme requisitos e evidências de uso; nenhum gargalo genérico foi confirmado apenas pela existência de datalist.

## Decisões de negócio e dados

- Reconciliação Master ERP → dimensão operacional somente após decisão explícita; a existência de duas visões não autoriza sincronização automática nem exclusão da dimensão operacional.
- Ponte empresarial aprovada para agrupamento ERP → categoria Kustos; não converter por família, origem, descrição ou semelhança de códigos.
- Retenção de evidências e eventual autoria detalhada conforme necessidade e contrato aprovado. A correção do risco atual de acesso/RLS tem prioridade própria em SEC-03, fora da espera por multi-tenant/RBAC futuro.

`data_referencia` permanece competência; `criado_em` permanece importação/proveniência. Nenhuma proposta implica nova fonte de verdade, schema ou carga sem decisão específica.

## Verificações separadas de features

PERF-04, divergência de fingerprint da Fase 3.3, saúde administrativa atual e causa remota do save-doc estão na [fila de verificação](docs/auditoria/backlog-reconciliacao-2026-10-22.md#verificações-pendentes). Não são features aprovadas nem defeitos cuja causa já tenha sido provada. A ordem de correções A–E fica somente no backlog.

## Não priorizar

Features decorativas, CRUD complexo, multi-tenant/RBAC sem necessidade de uso, microserviços sem justificativa, abstrações excessivas e IA genérica sem aplicação verificável à investigação. [Multi-tenant](docs/roadmap/multi-tenant.md) continua proposta futura; essa decisão não adia a proteção do acesso atual.

[VISION](VISION.md) define direção e princípios; [README](README.md) apresenta o sistema e resume a lista ativa; [backlog](docs/auditoria/backlog-priorizado.md) é a única lista priorizada de correções.
