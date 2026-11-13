# Roadmap Estratégico — Kustos Germani

Recorte do backlog reconciliado em **22/10/2026**. Este documento reúne capacidades futuras e decisões de produto. Problemas existentes, prioridades P0–P3 e critérios de correção pertencem exclusivamente ao [backlog ativo](docs/auditoria/backlog-priorizado.md). Para o Cadastro Mestre, as DEC-01–07 foram aprovadas e formalizadas no [contrato operacional](docs/arquitetura/cadastro-mestre-contrato-operacional.md); essa aprovação de negócio não declara implementação nem autoriza escrita remota ou publicação.

## Base disponível e evidência de entregas

A proveniência da execução de Custos reutiliza `log_importacao.id` no mesmo upsert dos custos e confere o retorno dos chunks; API legada sem contexto bloqueada. [LOG-02](docs/arquitetura/identidade-lote-custos.md) continua ativo: migration aplicada em janela pausada, schema/dados/permissões preservados e importação/upsert reais validados com cliente oficial local. Falta comprovar múltiplos chunks em produção e concluir a liberação controlada de todos os writers compatíveis. GETs dos módulos publicados de API/importação/shim coincidiram com o checkout; não houve deploy nesta tarefa. [Provas e limites](docs/auditoria/custos-lote-ativacao-validacao.md). Comparadores e retenção histórica permanecem inalterados.

Custos oferece busca/cascata, fila, KPIs, gráficos, drill-through e exportação; a prioridade padrão antes do TOP-200 foi corrigida no checkout ([LOG-05](docs/auditoria/custos-top200-validacao.md)). A ordem ativa completa é compartilhada com o XLSX, incluindo escolha manual por variação e retorno ao padrão; a narrativa distingue alerta atual de recorrência não comprovada ([LOG-04/06](docs/auditoria/custos-fila-validacao.md)). Comparação/TOP selecionam eventos pertinentes após o recorte e distinguem ausência de zero ([LOG-03](docs/auditoria/custos-comparacao-recorte-validacao.md)); TOP usa produto + data completa por decisão humana, sujeito à retenção atual dos snapshots. Essas correções aguardam publicação autorizada. OP oferece fila/dossiê e decisão por produção, tempo, produtividade e parada; a leitura integral foi validada no checkout em 23/10, aguardando publicação autorizada ([MNT-OP-05](docs/auditoria/op-paginacao-validacao.md)). Cadastro separa Operacional de Mestre ERP, com Preview e fronteira administrativa. Identidade de lote de Custos (LOG-02) e salvamento documental continuam no backlog de defeitos atuais; não são entregas futuras opcionais.

Leitura de produção em 22/10 confirmou 860 produtos ERP, 162 pares comerciais preenchidos, 698 vazios e lote histórico com 65 famílias inseridas. Recursos frontend publicados foram conferidos; saúde autenticada atual de TLS/Storage/flags e causa remota do HTTP 500 continuam sem conclusão. Não manter uma tarefa genérica de repetir publicação/carga dessas entregas com base em textos antigos. O executor comercial isolado foi implementado para uma fotografia inicial específica; o preenchimento atual não prova uso dele nem autoriza executá-lo novamente.

O [inventário de reconciliação](docs/auditoria/backlog-reconciliacao-2026-10-22.md) avalia cada uma das 38 entradas anteriores e os IDs históricos. O [arquivo histórico](docs/auditoria/backlog-historico.md) preserva integralmente a versão anterior deste roadmap, do README e do backlog. [História do projeto](docs/HISTORIA_DO_PROJETO_KUSTOS.md), contratos e provas continuam responsáveis pelos marcos detalhados; Git é a fonte oficial de commits.

## Investigação cruzada OP × CUSTO — V1 consolidada

[OP-CUSTO-01 — contrato técnico final](docs/arquitetura/op-custo.md) define a relação por produto + competência, preservando eventos OP e snapshots disponíveis de Custo. **OP × CUSTO V1 — IMPLEMENTADO E APROVADO COM RESSALVAS.** A Fase 3A não encontrou não conformidade funcional concreta e registrou 116/116 testes específicos, lint, build e typecheck no escopo configurado; não declara suíte completa após resultado inconclusivo final. A Fase 3B inspecionou o site publicado autenticado no cenário C de outubro/2026, sem provar A/B, eventos OP, leitor de tela, toda a rolagem horizontal ou equivalência com o HEAD local. A entrada exige competência explícita; o relatório apresenta cobertura, escolha humana de inclusão, fila e dossiê, com prioridades separadas e sem causalidade automática ou consolidação numérica sem prova ERP. [Núcleo e limites da Fase 1](docs/auditoria/op-custo-fase1-validacao.md); [auditoria Fase 2/3A](docs/auditoria/op-custo-fase2-validacao.md); [aceite visual Fase 3B](docs/auditoria/op-custo-aceite-visual.md).

A evolução temporal multi-competência está prevista em seção própria do contrato: seleção explícita de meses, evolução e padrões exigirão novas regras aprovadas. Não pertence à primeira implementação. O contrato não altera TOP-200, não resolve LOG-02/03/04/06 nem autoriza refatoração, escrita remota ou publicação.

**Fases 4C-1/4C-2 implementadas localmente:** a API entrega leitura factual por produto canônico e intervalo explícito; o motor histórico puro organiza competências, fatos OP, snapshots de Custo, diagnósticos, evidências descritivas, cobertura A/B/C/D condicionada à completude e candidato de maior `criado_em`. Falha de uma fonte não é convertida em ausência da outra, e a série de Custo não é reduzida ao candidato. Não há UI histórica, agregação OP, comparação monetária intercompetência, recorrência, causalidade, score ou prioridade conjunta. RLS, comportamento com histórico remoto e teto de intervalos grandes permanecem fora dessa validação. A Fase 4C-3 depende de revisão humana e não é autorizada por esta entrega. [Leitura](docs/auditoria/op-custo-fase4c1-validacao.md), [fechamento 4C-1.1](docs/auditoria/op-custo-fase4c1-1-validacao.md) e [motor 4C-2](docs/auditoria/op-custo-fase4c2-validacao.md).

## Cadastro Mestre — decisões aprovadas, elegibilidade corrigida localmente

O padrão aprovado é atualização incremental com identidade preservada no Geral e recorte elegível no Detalhado. A política inclui PRODUZIDO/PRODUZIDA/MASSA PRODUZIDA/REVENDA, Tipo P/C, validação de código/duplicidades, bloqueio INATIVO/EXCLUIR, autoridade por campo e proteção das classificações/overrides Kustos. Admissão exige Preview e aprovação; candidato observado não vira produto admitido automaticamente.

O motor puro local implementa Tipo P/C, o vocabulário aprovado por palavras completas na descrição de origem e os bloqueios INATIVO/EXCLUIR, sem usar família, agrupamento ou catálogo como fallback. A correção não admite produtos e não foi publicada. [Validação e impacto nos consumidores](docs/auditoria/cadastro-mestre-elegibilidade-validacao.md).

Ainda precisam de desenho e implementação: mapeamento dos papéis Geral/Detalhado para a estrutura existente, admissão, Preview de conflitos/impactos, execução incremental, proveniência, idempotência e reversão comprovada. O executor integral continua removível; o comercial isolado mantém seu escopo específico e requer compatibilidade própria. Nenhuma carga ou alteração de produção decorre da correção. [Critérios, diferenças do checkout e pendências](docs/arquitetura/cadastro-mestre-contrato-operacional.md#12-pendências-para-implementação-e-validação-humana).

A Etapa 5 acrescentou apenas o diagnóstico puro do bootstrap histórico: ele distingue prova individual de contagem agregada e mantém admissão pendente. Não é bootstrap implantado nem autoriza execução. [Modelo e limites](docs/arquitetura/cadastro-mestre-bootstrap.md).

## Próxima evolução funcional — memória operacional

Planejada, sem implementação declarada por esta reorganização:

- Histórico persistente de alertas por produto, frequência/reincidência e linha do tempo de regime, preservando o alerta canônico ≥5%. LOG-04 já remove localmente afirmações de recorrência sem prova; contar transições históricas e sua proveniência requer contrato próprio, sem inferir contagem de duas métricas agregadas.
- Comparação ampliada entre períodos equivalentes e exportação do drill-through individual. Recorte da comparação existente foi corrigido localmente em LOG-03; identidade de lote permanece LOG-02. Reter versões por produto/data para permitir pares históricos exige decisão própria; não criar persistência nesta correção.

- Autocomplete avançado por código/descrição e persistência do filtro de mudança de regime por período, se priorizados por uso. PERF-04 não prova necessidade dessas novas capacidades.

Antes de escolher uma entrega, definir cálculo local versus séries maiores, retenção de evidências e critério de benefício investigativo. Índices existentes e planos reais devem ser conferidos; não assumir ausência de índice a partir de proposta histórica.

## Evolução futura — inteligência operacional

- Ranking de risco composto e sugestões explicáveis de próximos produtos a investigar. A prioridade padrão da janela atual usa os critérios existentes, corrigida localmente em LOG-05; esse futuro motor não é pré-requisito da correção.
- Distinguir sazonalidade de ruptura, ampliar insights temporais e avaliar previsão de tendência com base suficiente.
- Integração direta ERP/SAP e eventual sugestão revisável de classificação por código de negócio, condicionada a contrato empresarial. Não inferir classificação por descrição ou semelhança textual.
- Acessibilidade e experiência em volumes maiores conforme requisitos e evidências de uso; nenhum gargalo genérico foi confirmado apenas pela existência de datalist.

## Decisões de negócio e dados

- DEC-01–07 do Cadastro Mestre estão aprovadas conforme o contrato oficial; a elegibilidade foi corrigida no motor local, enquanto a implementação completa continua pendente. A existência de visões separadas não autoriza sincronização automática, exclusão da identidade ou sobrescrita da classificação operacional.
- Qualquer ponte empresarial de agrupamento ERP → categoria Kustos exige contrato específico aprovado; DEC-03 não cria essa ponte nem autoriza conversão por família, origem, descrição ou semelhança de códigos.
- Retenção de evidências e eventual autoria detalhada conforme necessidade e contrato aprovado. A correção do risco atual de acesso/RLS tem prioridade própria em SEC-03, fora da espera por multi-tenant/RBAC futuro.

`data_referencia` permanece competência; `criado_em` permanece importação/proveniência. Nenhuma proposta implica nova fonte de verdade, schema ou carga sem decisão específica.

## Verificações separadas de features

PERF-04, divergência de fingerprint da Fase 3.3, saúde administrativa atual e causa remota do save-doc estão na [fila de verificação](docs/auditoria/backlog-reconciliacao-2026-10-22.md#verificações-pendentes). Não são features aprovadas nem defeitos cuja causa já tenha sido provada. A ordem de correções A–E fica somente no backlog.

## Não priorizar

Features decorativas, CRUD complexo, multi-tenant/RBAC sem necessidade de uso, microserviços sem justificativa, abstrações excessivas e IA genérica sem aplicação verificável à investigação. [Multi-tenant](docs/roadmap/multi-tenant.md) continua proposta futura; essa decisão não adia a proteção do acesso atual.

[VISION](VISION.md) define direção e princípios; [README](README.md) apresenta o sistema e resume a lista ativa; [backlog](docs/auditoria/backlog-priorizado.md) é a única lista priorizada de correções.
