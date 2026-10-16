# DOC-ORG-01 — Auditoria e reorganização documental

Data: **16/10/2026**. Escopo exclusivamente documental; leitura local do checkout e das evidências já versionadas. Worktree inicial limpo. Não houve consulta ao Supabase/produção, mudança de código/configuração/schema/dados, migration, deploy, commit ou push.

## Diagnóstico anterior

A auditoria precedeu as alterações: foram lidos os **53 Markdown versionados** do projeto, incluindo os três manuais, índice, matriz, backlog, relatórios técnicos e o arquivo histórico. Dependências em node_modules e cópias geradas em dist não são documentação autoral a reorganizar. Código/SQL/configuração foram lidos somente para confirmar afirmações locais; não foram executados como aplicação.

- **A — Conteúdo no lugar correto:** contratos normativos em AGENTS; identidade/princípios na parte central de VISION; procedimentos principais nos manuais; modelo e contratos detalhados em arquitetura; achados/backlog/provas em auditoria; UX/regras/playbooks especializados. Foram mantidas essas funções.
- **B — Conteúdo fora do lugar:** README acumulava apresentação, schema completo, aliases, implementação, deploy, segurança e 31 seções de marcos/atualizações. VISION/ROADMAP e os três manuais também recebiam relatos de entrega, testes, contagens e estados remotos. O índice se apresentava como manual técnico e não indexava o conjunto completo.
- **C — Duplicações:** alerta LOG-01, normalização VAL-01, temporalidade, exportação, OP, fases do Cadastro e status de preparação apareciam repetidos nos documentos de entrada e manuais. Repetições normativas curtas que protegem o contrato foram mantidas; relatos repetidos foram consolidados por finalidade.
- **D — História misturada com operação:** manuais diziam simultaneamente “sem executor”, “execução web”, “sem visão ERP”, “duas visões”, “Master 5.706” e “860”. Eram fases diferentes apresentadas como procedimento atual. O backlog também conserva notas de entregas antigas; ganhou escopo para não converter cada nota em pendência ativa.
- **E — Obsolescência/contradição:** login público versus gate existente, configuração via import.meta versus runtime-config, ausência de servidor/endpoints versus funções Vercel, pacote só dev versus dependencies de servidor, PERF-01 ainda pendente versus concluído, teto 1.000 versus paginação, view SQL ausente versus script existente, ausência de testes versus tooling entregue. Tratamento detalhado abaixo.
- **F — Referências a commits:** README continha SHA de produção `04a2412`, deployments e conferência de PRs; ROADMAP misturava etapas com menções a PRs e marcos. Identificadores de produção foram preservados nos registros movidos para História e nas provas especializadas; referências de PRs que explicam decisões ficam na auditoria histórica. README/ROADMAP finais não contêm uma sequência de commits.
- **G — Destinos históricos existentes:** `docs/HISTORIA_DO_PROJETO_KUSTOS.md` existia somente com o marcador `///chat-gpt///`; passou a receber narrativa e marcos. AR-002, Fases 3.1/3.3/3.4 e validações de Cadastro já eram memória de decisão/evidência: continuam nos mesmos caminhos, com escopo histórico explícito e links pela História. Não duplicar suas provas integrais em outro arquivo.

## Responsabilidade de cada documento

- [README](../../README.md): porta de entrada, sistema/estrutura/capacidades/fluxos/setup resumido e estado do checkout.
- [VISION](../../VISION.md): identidade, missão, princípios e direção estratégica; sem relatório de release.
- [ROADMAP](../../ROADMAP.md): iniciativas por Concluído, Em andamento, Próxima onda e Backlog futuro; distingue implementação/publicação/execução e remete à ordem técnica do backlog.
- [AGENTS](../../AGENTS.md): contratos obrigatórios. Todas as linhas anteriores foram preservadas; somente entrada DOC-ORG-01 e explicação da atualização por responsabilidade foram acrescentadas.
- [Regras Gerais](../regras-gerais.md): processo, governança e tratamento de divergências, sem criar nova precedência de runtime.
- [Manuais](../manuais/manual-tecnico.md): procedimentos atuais por público; sem cronologia de desenvolvimento ou contagem histórica apresentada como alvo fixo.
- [Arquitetura](../arquitetura/indice-documentacao-kustos.md): decisões/contratos detalhados. Capítulos curtos obsoletos foram corrigidos; provas de fases receberam aviso de escopo, mantendo o corpo.
- [Auditoria](README.md): problemas/diagnósticos/backlog/evidências datadas. Avisos distinguem achado original, resolução e contrato posterior.
- [História](../HISTORIA_DO_PROJETO_KUSTOS.md): por que o projeto chegou ao desenho atual, decisões, problemas/soluções e marcos. Git continua fonte oficial dos commits.
- [Índice](../arquitetura/indice-documentacao-kustos.md): navegação por todas essas funções, incluindo documentos futuros e registros históricos.

Não foi encontrada hierarquia total preexistente entre todos os Markdown. Foram respeitados AGENTS como origem dos contratos obrigatórios, manuais como fonte operacional, e sucessões explícitas de contrato nos próprios documentos. A data isolada ou o título “estado atual” não escolhe um vencedor. Código confirma descrição local; prova datada confirma somente o intervalo/ambiente observado. Ausência de prova mantém divergência aberta.

## Conteúdo movido e consolidado

1. **README → História:** 31 seções completas de atualizações/marcos, preservadas como registros de entrega com títulos subordinados e links ajustados. Incluem CAD-PAGE/CAD-FAM/CAD-ERP/CAD-PAYLOAD/diagnósticos/cargas, ERR-01/VAL-01/LOG-01, tooling, modularização, OP e fila TOP-200. A narrativa explica razões e sucessões; os registros não autorizam repetir ações.
2. **README → manuais/especializados:** schema/FKs ficam no modelo de banco; tabela detalhada de módulos/aliases/parsing e contratos canônicos no Manual Técnico; passos de investigação/exportação/Cadastro no Manual do Usuário; ambiente, diagnóstico e recuperação no Manual de Operação e setup. Resumos curtos permanecem no README com links.
3. **VISION → visão estável / História / ROADMAP:** princípios foram consolidados, capacidades atuais descritas em README/manuais, planejamento de autocomplete, memória de alertas/regime, comparação equivalente, export individual, sazonalidade/previsão e integração ERP ficou no ROADMAP. Relatos de implementação foram absorvidos pela História e referências especializadas já existentes.
4. **ROADMAP → História / auditoria:** fases e aprendizados de configuração/auth, tooling/CI, preparação MNT-06/07/05 e fatiamento MNT-01 foram sintetizados na narrativa. Testes/contagens/deploys continuam nas provas existentes. Entregas foram agrupadas por iniciativa; não se criou um item por commit.
5. **Manuais → procedimentos atuais / História / arquitetura:** retiradas notas de “nesta entrega”, lotes e resultados antigos já preservados nas Fases e validações especializadas. Versão V1/exclusividade CLI/ausência de UI não aparecem como instrução vigente. Operação mantém referências datadas de conferência, expressamente sem convertê-las em metas permanentes.
6. **Índice:** substituído cabeçalho de manual técnico por navegação de toda a documentação. Caminhos especializados não foram renomeados; somente um documento novo foi criado, este relatório de auditoria, pois não havia relatório com esta responsabilidade. O arquivo histórico existente foi reaproveitado.

## Redundâncias retiradas das portas de entrada

Consolidação, não descarte de evidência única:

- Parágrafos repetidos de LOG-01/VAL-01/ERR-01, exportação e OP em README/VISION/ROADMAP/manuais: regras atuais nos manuais/AGENTS/matriz, evolução na História e achados nas auditorias por ID.
- Repetições de contagens 853/103/423/5.706 e expectativa 6.230 → 860: Fases 3.3/3.4 e relatórios de reconstrução/payload preservam valores, limites e hashes; marcos do README foram movidos integralmente.
- Relatos repetidos de 404/bucket ausente/TLS inválido/diagnóstico OK: contrato de preparação e evidências originais permanecem, com aviso de sucessão; manuais descrevem o procedimento aplicável sem afirmar flag/ambiente atuais.
- Notas “sem mudança de uso” e conferência dos PRs #121–#124: raciocínio da modularização preservado na História e em manutenibilidade; não são instrução de operação.
- Exemplos de credencial literal no setup foram substituídos por placeholders; nomes de variáveis, script e transformação de login permanecem documentados. Senha de exemplo não é conhecimento operacional a propagar.

Não foram apagados documentos especializados, scripts, decisões de arquitetura, hashes ou corpos das provas. Não se alegou equivalência binária entre arquivos ERP de mesmo tamanho. Repetição de invariantes essenciais entre AGENTS/manual/matriz continua intencional.

## Contradições e tratamento

### Corrigidas ou delimitadas com evidência suficiente

1. **Acesso público “atual”:** README/manual usuário/operação/autenticação repetiam decisão de 14/05. `view/ui-controller.js` chama `requireLogin` antes de masters/metadados e OP; `src/services/api.js` usa `signInWithPassword`. Documentada essa ordem específica do fluxo principal, sem prometer que todo I/O da aplicação aguarda login e sem afirmar data de reativação/RLS remoto. Janela pública preservada na História.
2. **Configuração:** entradas antigas do AGENTS propunham precedências diferentes. `resolveEnvSource` em `src/config/app-config.js` confirma runtime global → import.meta → meta. AGENTS não foi reescrito; manuais/setup refletem ordem existente. Copiar `.env` não carrega `process.env` do gerador.
3. **Setup:** `package.json` não tem script dev, declara Node >=22 e build-web. Removida instrução operacional inexistente `npm run dev`; mantidos comandos reais e requisito de servir estático. Não se executou build ou gerador nesta tarefa.
4. **Backend/endpoints:** capítulos antigos negavam endpoints/servidor próprio apesar de `api/save-doc.js` e `api/reconstruir-cadastro-mestre.js`. Documentadas funções separadas do frontend; sem inventar servidor Express ou middleware inexistente. Frontend continua sem SQL/RPC.
5. **Dependencies só dev:** contrato histórico de tooling versus `package.json` atual com pg/SDK/SheetJS de servidor. Stack/manual corrigidos; histórico do tooling preservado.
6. **Master 5.706 versus 860 / reconstrução pendente:** provas de 09/10 são anteriores às leituras de 15/10 em UX/backlog, que registram reconstrução concluída e Master 860. Não inferidos novo lote, instante, autor, flag ou deploy V2. Os 6.113 operacionais não são produtos a excluir; 501 códigos Custos+OP e 437 códigos só de Custos são universos distintos.
7. **Ausentes/vazios do Master:** CAD-REBUILD-01 sucede explicitamente preservação de produtos fora do universo somente no Master. Campo vazio de produto que permanece continua preservado. Importador operacional legado mantém contrato próprio; seletor atual segue Preview, sem transportar regra por analogia.
8. **Executor CLI/UI e categorias imutáveis:** CAD-EXEC-WEB-01 e CAD-FAM-01 sucedem a ausência de execução via UI e a proteção genérica de famílias. Avisos/matriz apontam extensão V2, decisões separadas, prova de catálogo e transação conjunta; nenhuma implementação foi alterada.
9. **MNT-01/PERF-01/03 pendentes:** backlog confirma encerramento de MNT-01 e janela TOP-200; código confirma limite/delegação e cache de cascata. Manuais/regras deixam de pedir essas entregas novamente. Registros originais permanecem históricos. MNT-08 localiza presenter em ui-table, não no antigo controller.
10. **Teto de 1.000:** glossário ainda descrevia constante removida; CUSTOS-PAGE-01/`lerCompleto` confirmam páginas de 500 sem teto total para o escopo indicado. Atualizado glossário; LOG-02 não foi tratado como resolvido.
11. **Sem testes/view SQL:** tooling/CI já entregues e SQL de saneamento contém view de órfãos. Corrigida ausência no capítulo de views e avisos de escopo nas auditorias; criação/estado remoto da view não foi revalidado aqui.
12. **ERR-02 versus leitura integral:** critério antigo aceitava hierarquia parcial; contrato explícito CUSTOS-PAGE-01 exige erro de fonte essencial e permite somente diagnóstico isolado indisponível. Registrada sucessão na auditoria/backlog, sem implementar degradação nova.
13. **Conflito concorrente no save documental:** Regras Gerais atribuía ao sha garantia ampla contra sobrescrita. O handler consulta sha ao salvar, sem provar vínculo com a versão originalmente editada. Texto limitado à garantia observável, sem mudar o save.

### Em aberto — DOC-DIV-01

- **SEC-05:** backlog marca concluído o item com SRI; HTML atual fixa versões principais de bibliotecas, mas tags não têm integrity e o import do SDK Supabase frontend usa `@2/+esm`. Não se marcou segurança concluída novamente nem se alterou dependência/HTML. Há diferença entre o critério e evidência local; conferência própria necessária.
- **FK de agrupamento:** modelo especializado aponta `categorias_agrupamento.id`; SQL histórico de saneamento e README anterior apontam `codigo`. Resolução frontend tolera `codigo/id/cod`, o que não prova a FK real. Os dois registros foram preservados; sem inspeção de schema atual não se escolheu vencedor nem se reescreveu SQL.
- **RLS/produção:** login no código e decisão SEC-03 fechada no backlog não comprovam políticas do ambiente. Advisors da Fase 3.4 são prova de 08/10, não diagnóstico atual. Nenhuma configuração/policy foi alterada.

Também permanecem limitações já conhecidas: LOG-02, divergência histórica de fingerprint operacional, ausência de snapshot transacional entre páginas e publicação/execução das novas famílias dependentes de etapa autorizada. Não são lacunas preenchidas com suposições.

## Links e referências

A verificação inicial encontrou **304 links Markdown locais em 53 arquivos, sem destino ou âncora ausente**. O problema inicial era cobertura/coerência, não um inventário de links quebrados.

- Movimentação README → História ajustou caminhos `docs/...` para a nova posição relativa em `docs/`, além de links para documentos da raiz.
- Índice foi ampliado para manuais, governança, histórico, contratos vigentes, auditorias/provas e propostas futuras.
- Links de estado atual passaram a apontar para o contrato completo/mais recente no seu escopo; documentos históricos continuam acessíveis nos caminhos originais.
- O seletor da UI e allowlist do save não foram alterados. Não prometer que todo documento do índice fica editável em tela.
- Scripts/configurações citados foram conferidos por existência/leitura local; não há links remotos validados nem alegação de ambiente atual.

## Inventário completo e arquivos alterados

Legenda: **ajustado** = consta no diff documental; **preservado** = lido e mantido; **novo** = relatório desta tarefa. A lista cobre todos os Markdown anteriores, por responsabilidade, sem renomear arquivos.

### Raiz

- [AGENTS.md](../../AGENTS.md) — **ajustado**.
- [README.md](../../README.md) — **ajustado**.
- [README_SETUP.md](../../README_SETUP.md) — **ajustado**.
- [ROADMAP.md](../../ROADMAP.md) — **ajustado**.
- [VISION.md](../../VISION.md) — **ajustado**.

### História

- [docs/HISTORIA_DO_PROJETO_KUSTOS.md](../HISTORIA_DO_PROJETO_KUSTOS.md) — **ajustado**.

### Arquitetura

- [docs/arquitetura/autenticacao.md](../arquitetura/autenticacao.md) — **ajustado**.
- [docs/arquitetura/backend-api.md](../arquitetura/backend-api.md) — **ajustado**.
- [docs/arquitetura/banco-de-dados.md](../arquitetura/banco-de-dados.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-aprovacao.md](../arquitetura/cadastro-mestre-aprovacao.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-execucao-fase3-4.md](../arquitetura/cadastro-mestre-execucao-fase3-4.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-execucao-web.md](../arquitetura/cadastro-mestre-execucao-web.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-familias-erp.md](../arquitetura/cadastro-mestre-familias-erp.md) — **preservado**.
- [docs/arquitetura/cadastro-mestre-preparacao-ambiente.md](../arquitetura/cadastro-mestre-preparacao-ambiente.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-preview.md](../arquitetura/cadastro-mestre-preview.md) — **ajustado**.
- [docs/arquitetura/cadastro-mestre-reconstrucao.md](../arquitetura/cadastro-mestre-reconstrucao.md) — **ajustado**.
- [docs/arquitetura/deploy.md](../arquitetura/deploy.md) — **preservado**.
- [docs/arquitetura/indice-documentacao-kustos.md](../arquitetura/indice-documentacao-kustos.md) — **ajustado**.
- [docs/arquitetura/mapa-endpoints.md](../arquitetura/mapa-endpoints.md) — **ajustado**.
- [docs/arquitetura/matriz-contratos-operacionais.md](../arquitetura/matriz-contratos-operacionais.md) — **ajustado**.
- [docs/arquitetura/middlewares.md](../arquitetura/middlewares.md) — **ajustado**.
- [docs/arquitetura/migracoes.md](../arquitetura/migracoes.md) — **preservado**.
- [docs/arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md](../arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md) — **ajustado**.
- [docs/arquitetura/services-frontend.md](../arquitetura/services-frontend.md) — **ajustado**.
- [docs/arquitetura/stack-tecnologico.md](../arquitetura/stack-tecnologico.md) — **ajustado**.
- [docs/arquitetura/views-banco.md](../arquitetura/views-banco.md) — **ajustado**.
- [docs/arquitetura/visao-geral-kustos.md](../arquitetura/visao-geral-kustos.md) — **preservado**.

### Auditoria

- [docs/auditoria/README.md](README.md) — **ajustado**.
- [docs/auditoria/backlog-priorizado.md](backlog-priorizado.md) — **ajustado**.
- [docs/auditoria/cadastro-mestre-execucao-web-validacao.md](cadastro-mestre-execucao-web-validacao.md) — **ajustado**.
- [docs/auditoria/cadastro-mestre-payload-validacao.md](cadastro-mestre-payload-validacao.md) — **ajustado**.
- [docs/auditoria/cadastro-mestre-preparacao-ambiente-validacao.md](cadastro-mestre-preparacao-ambiente-validacao.md) — **ajustado**.
- [docs/auditoria/cadastro-mestre-reconstrucao-validacao.md](cadastro-mestre-reconstrucao-validacao.md) — **ajustado**.
- [docs/auditoria/manutenibilidade.md](manutenibilidade.md) — **ajustado**.
- [docs/auditoria/performance-otimizacao.md](performance-otimizacao.md) — **ajustado**.
- [docs/auditoria/robustez-erros-validacao.md](robustez-erros-validacao.md) — **ajustado**.
- [docs/auditoria/seguranca.md](seguranca.md) — **ajustado**.
- [docs/auditoria/tooling-configuracao.md](tooling-configuracao.md) — **ajustado**.

### Manuais e governança

- [docs/manuais/manual-operacao.md](../manuais/manual-operacao.md) — **ajustado**.
- [docs/manuais/manual-tecnico.md](../manuais/manual-tecnico.md) — **ajustado**.
- [docs/manuais/manual-usuario.md](../manuais/manual-usuario.md) — **ajustado**.
- [docs/regras-gerais.md](../regras-gerais.md) — **ajustado**.

### UX, regras, integração e futuro

- [docs/engenharia-dados-supabase.md](../engenharia-dados-supabase.md) — **ajustado**.
- [docs/regras-negocio/glossario.md](../regras-negocio/glossario.md) — **ajustado**.
- [docs/regras-negocio/padroes-codigo.md](../regras-negocio/padroes-codigo.md) — **preservado**.
- [docs/regras-negocio/relacionamentos-cascata.md](../regras-negocio/relacionamentos-cascata.md) — **preservado**.
- [docs/roadmap/multi-tenant.md](../roadmap/multi-tenant.md) — **preservado**.
- [docs/troubleshooting/guia-integracao.md](../troubleshooting/guia-integracao.md) — **preservado**.
- [docs/troubleshooting/playbook-operacional.md](../troubleshooting/playbook-operacional.md) — **preservado**.
- [docs/ux/cadastro-mestre.md](../ux/cadastro-mestre.md) — **ajustado**.
- [docs/ux/componentes.md](../ux/componentes.md) — **preservado**.
- [docs/ux/frontend.md](../ux/frontend.md) — **ajustado**.
- [docs/ux/rotas-navegacao.md](../ux/rotas-navegacao.md) — **ajustado**.

- [docs/auditoria/reorganizacao-documental.md](reorganizacao-documental.md) — **novo**, único arquivo adicionado.

## Validação final

- **Links:** 463 links Markdown locais em 54 documentos conferidos por resolução de caminho e âncora, sem destino/âncora ausente. Índice cobre todos os documentos do inventário, inclusive o relatório novo; caminhos anteriores foram preservados.
- **Referências a arquivos inexistentes:** busca adicional em caminhos inline encontrou 11 ocorrências de propostas históricas (10 destinos distintos) em manutenibilidade, segurança e tooling. São sugestões explicitamente identificadas, não links quebrados nem módulos atuais. Foram acrescentados avisos de escopo; não se criaram os arquivos propostos. Nos documentos atuais de entrada/manuais, nenhuma dessas referências é apresentada como implementação existente.
- **Preservação:** comparação automática confirmou 31/31 seções de marcos do README na História, descontando somente nível de título e ajuste de links/quebras de linha. As 295 linhas anteriores do AGENTS continuam presentes e na ordem original. Corpos das provas históricas não foram reescritos.
- **Responsabilidades/estado:** README tem as dez seções de entrada, ROADMAP agrupa evolução/prioridade; README/VISION/ROADMAP/manuais não têm seções cronológicas de atualização. Não há hashes de commits ou referências a PRs em README/ROADMAP. Estados históricos e contratos atuais estão delimitados; lacunas sem prova permanecem abertas em DOC-DIV-01.
- **Escopo do worktree:** 43 arquivos Markdown existentes modificados e este único Markdown novo; zero alteração em código, SQL, configuração, dependências, dados ou artefatos gerados. Dez documentos especializados do inventário foram lidos e preservados sem diff.
- **Whitespace:** `git diff --check` passou com exit 0. Avisos de conversão futura LF/CRLF do Git no Windows não são erro de whitespace; comparação textual de preservação normalizou somente as quebras de linha.
- **Execução:** testes de aplicação, lint/typecheck/build e scripts administrativos não foram executados, pois código/configuração não mudaram. Somente verificadores documentais temporários fora do repositório e leituras de Git/arquivos foram usados. Nenhuma ferramenta Supabase ou chamada remota foi acionada.
- **Entrega:** alterações locais prontas para revisão, sem stage, commit, push ou deploy. A nova organização não altera runtime, semântica temporal, regra investigativa, filtros ou modelo de dados.
