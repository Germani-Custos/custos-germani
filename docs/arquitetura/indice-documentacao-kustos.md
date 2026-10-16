# Índice da Documentação — Kustos Germani

Organização revisada em **16/10/2026**. Comece pela responsabilidade do documento. O índice reúne os Markdown do projeto; não altera a lista de documentos editáveis pela UI nem autoriza ações administrativas. [Governança e tratamento de divergências](../regras-gerais.md#6-responsabilidade-e-autoridade-documental).

## Entrada, estratégia e processo

- [README](../../README.md): o que é o Kustos, capacidades, estrutura, fluxos e estado do checkout.
- [VISION](../../VISION.md): identidade, missão, princípios e direção estratégica.
- [ROADMAP](../../ROADMAP.md): iniciativas concluídas, continuidade, próxima onda e futuro.
- [AGENTS](../../AGENTS.md): contratos e regras obrigatórias; entradas datadas existentes preservadas.
- [Regras Gerais](../regras-gerais.md): processo de trabalho e governança documental.
- [Setup](../../README_SETUP.md): ambiente local, configuração pública e fronteiras de publicação.

## Manuais — comportamento atual

- [Usuário](../manuais/manual-usuario.md): acesso, importação, investigação Custos/OP, Cadastro e documentação.
- [Técnico](../manuais/manual-tecnico.md): módulos, contratos de desenvolvimento e ferramentas.
- [Operação](../manuais/manual-operacao.md): rotina, diagnóstico, evidências, recuperação e publicação autorizada.

## Arquitetura — contratos e decisões detalhados

- [Visão geral](visao-geral-kustos.md): propósito e fluxo de custos.
- [Stack](stack-tecnologico.md): frontend, funções, dados e ferramentas.
- [Banco de dados](banco-de-dados.md): fatos, dimensões, Master ERP e proveniência.
- [Matriz de contratos operacionais](matriz-contratos-operacionais.md): UI ↔ API ↔ banco ↔ motores; inclui completude CUSTOS-PAGE-01.
- [Backend/API](backend-api.md), [services frontend](services-frontend.md), [mapa de endpoints](mapa-endpoints.md) e [controles de fronteira](middlewares.md).
- [Autenticação](autenticacao.md): gate do checkout e fronteiras distintas de autorização/RLS.
- [Views de banco](views-banco.md), [migrações](migracoes.md) e [deploy](deploy.md).

### Cadastro Mestre — leitura na ordem dos contratos

- [Reconstrução do universo ERP](cadastro-mestre-reconstrucao.md): decisão de universo, aprovação integral e executor central.
- [Execução web e transporte compacto](cadastro-mestre-execucao-web.md): HTTP, segurança, limites, snapshot e recuperação.
- [Famílias ERP / V2](cadastro-mestre-familias-erp.md): extensão vigente de catálogo, decisões e transação conjunta.
- [Preparação/diagnóstico de ambiente](cadastro-mestre-preparacao-ambiente.md): procedimentos e provas datadas; ler o aviso de escopo antes dos estados históricos.
- [Preview Fase 3.1](cadastro-mestre-preview.md), [aprovação Fase 3.3](cadastro-mestre-aprovacao.md) e [carga pontual Fase 3.4](cadastro-mestre-execucao-fase3-4.md): fundamentos/contratos de fase e evidências preservadas. Ausência de executor/UI e contagens antigas nesses relatos não especificam o fluxo atual.
- [AR-002 — por que MNT-06 antecedeu MNT-01](reviews/AR-002-mnt06-antes-de-mnt01.md): decisão histórica de priorização, sem reabrir itens concluídos.

## UX, regras e integração

- [Cadastro](../ux/cadastro-mestre.md): duas fontes, leitura completa, Preview e evidências de UX por etapa.
- [Frontend](../ux/frontend.md), [componentes](../ux/componentes.md) e [rotas/navegação](../ux/rotas-navegacao.md).
- [Relacionamentos/cascata](../regras-negocio/relacionamentos-cascata.md), [padrões de código](../regras-negocio/padroes-codigo.md) e [glossário/limiares](../regras-negocio/glossario.md).
- [Engenharia de dados](../engenharia-dados-supabase.md): visão temática de Custos; modelo completo no capítulo de banco.
- [Guia de integração](../troubleshooting/guia-integracao.md) e [playbook operacional](../troubleshooting/playbook-operacional.md).
- [Multi-tenant](../roadmap/multi-tenant.md): proposta futura, sem isolamento implementado declarado.

## Auditoria — diagnósticos, backlog e provas

- [Índice de auditoria](../auditoria/README.md): escopo/datas dos achados.
- [Backlog priorizado](../auditoria/backlog-priorizado.md): estados, critérios, dependências e divergências ainda abertas.
- [Segurança](../auditoria/seguranca.md), [robustez/validação](../auditoria/robustez-erros-validacao.md), [manutenibilidade](../auditoria/manutenibilidade.md), [performance](../auditoria/performance-otimizacao.md) e [tooling](../auditoria/tooling-configuracao.md): achados originais e atualizações por ID.
- Evidências de [reconstrução](../auditoria/cadastro-mestre-reconstrucao-validacao.md), [execução web](../auditoria/cadastro-mestre-execucao-web-validacao.md), [preparação de ambiente](../auditoria/cadastro-mestre-preparacao-ambiente-validacao.md) e [payload](../auditoria/cadastro-mestre-payload-validacao.md).
- [DOC-ORG-01 — auditoria documental](../auditoria/reorganizacao-documental.md): inventário, conteúdos movidos/consolidados, contradições e validação desta organização.

## História e proveniência

- [História do Projeto Kustos](../HISTORIA_DO_PROJETO_KUSTOS.md): razões, mudanças de pensamento, problemas/soluções e marcos transferidos do README. Não é especificação operacional atual nem cópia do git log.
- Git: fonte oficial de commits; documentos de evidência podem manter identificadores necessários para delimitar uma prova. README e ROADMAP não registram sequências de commits.

Contagens, resultados de testes, deployments e status de flags são válidos para o escopo/data da evidência. Sucessões explícitas de contrato resolvem somente os pontos indicados; divergências sem prova permanecem na auditoria. `data_referencia` continua competência e `criado_em` evento de importação.
