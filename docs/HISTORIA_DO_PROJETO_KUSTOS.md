# História do Projeto Kustos

Registro consolidado em **16/10/2026**, a partir da documentação do repositório. Explica decisões, problemas e aprendizados; o Git continua sendo a fonte oficial do histórico de commits. Este arquivo já existia, mas continha somente o marcador `///chat-gpt///`, sem relato histórico.

## Como ler esta história

Os estados e contagens abaixo pertencem às datas e aos escopos das entregas. Expressões como “ainda pendente”, “sem executor” ou “Master 5.706” não descrevem automaticamente o estado atual. Consulte [README](../README.md), [ROADMAP](../ROADMAP.md), [manuais](manuais/manual-tecnico.md) e [contratos vigentes](arquitetura/matriz-contratos-operacionais.md) para trabalhar hoje.

Os registros de entrega preservam proveniência e limitações das provas; não autorizam repetir cargas, migrations, deploys ou mudanças de acesso. Nenhuma evidência foi atualizada por consulta remota nesta reorganização.

## Da consolidação de planilhas à investigação operacional

A base inicial organizou leitura XLSX, parsing brasileiro, validação por linha e persistência por produto/competência. A separação FATO × DIMENSÃO evitou transformar classificações atuais em reescrita de fatos históricos. Dois eixos precisaram ficar explícitos: `data_referencia` como competência ERP e `criado_em` como evento de importação.

O foco evoluiu da exposição de números para a pergunta “o que merece investigar?”. Busca direta, drill-through, regime, contexto por linha e exportação priorizada reduziram navegação e interpretação manual. A fila ganhou cabeçalho fixo, chips removíveis e detalhe sob demanda; a exportação passou a transportar decisão e contexto, não apenas uma tabela.

## Confiabilidade passou a fazer parte do produto

Em maio, contratos UI/API/banco ganharam uma matriz própria. Normalização única de código (VAL-01) evitou identidades corrompidas por notação científica; regra canônica de alerta (LOG-01) corrigiu a divergência entre KPI, filtro e exportação. Fronteiras operacionais de erro (ERR-01) passaram a preservar contexto e distinguir falha de consulta de ausência de dados. O diagnóstico de órfãos também passou a declarar indisponibilidade, sem convertê-la em zero.

A configuração de frontend atravessou propostas sucessivas de `import.meta.env`, fallback global e meta tags. O contrato final documentado adotou runtime-config gerado no build como fonte principal para browser estático; essas propostas anteriores não são regras simultâneas. Em 14/05 houve uma janela documentada de acesso público. O checkout inspecionado em 16/10 já chama `requireLogin()` antes de carregar os dados; a data exata de reativação e as políticas RLS remotas não foram inferidas. A função de edição documental permanece uma fronteira distinta, descrita no contrato de API.

A auditoria de 25/05 é evidência da base daquela data. Seus achados originais foram preservados; o backlog passou a registrar resoluções. Em junho, lint, tipos leves, testes e CI deram suporte às refatorações sem introduzir bundler no frontend. Uma falha de CI expôs a dependência indevida do ESLint global: declarar `eslint` e reproduzir instalação pelo lockfile tornou-se aprendizado do processo. [Auditoria de tooling](auditoria/tooling-configuracao.md).

## Por que a UI foi separada por fluxo

A reavaliação de julho posicionou a retirada do caminho órfão MNT-06, os limites MNT-07 e os contratos MNT-05 antes do fatiamento MNT-01. O objetivo foi evitar que uma extração mecânica precisasse decidir simultaneamente qual payload era correto. O [review AR-002](arquitetura/reviews/AR-002-mnt06-antes-de-mnt01.md) preserva esse raciocínio e seu contexto histórico.

Gráficos, drill-through, importação, filtros, exportação e fila/presenter ganharam controllers com dependências explícitas. MNT-01 foi encerrado no Engineering Freeze v1.0; registros retroativos sob a data de 20/07 e o encerramento registrado em 27/07 não permitem deduzir uma nova cronologia de commits. Em setembro, a janela TOP-200 e a delegação de eventos reduziram o custo de renderização mantendo o relatório completo para KPIs/exportação.

A revisão de julho corrigiu o delta monetário exibido sem registro anterior: custo inteiro não pode representar uma diferença inexistente. Revelou também LOG-02: chunks de 400 podem receber timestamps distintos e ser tratados como importações separadas. Essa dívida permanece aberta; paginação completa não decide identidade de lote. [Robustez e evidências](auditoria/robustez-erros-validacao.md).

## Da OP importada à decisão explicável

A correção inicial da OP investigou o dado real: 119 de 296 valores MCAP105 usavam ponto de milhar. Normalizar somente o campo OP resolveu a rejeição por `NOT NULL` sem mudar schema. O motor evoluiu para cruzar produção, tempo, KG/Hora e paradas, mantendo o relatório ERP imutável e os indicadores Kustos separados.

A decisão passou a explicar se merece investigação, prioridade, ação e evidências. Tempo adicional explicado pelo volume e parada sem impacto deixaram de ser incidentes isolados; parada com atraso, perda/não melhoria de produtividade e déficit de produção recebeu prioridade máxima. Em agosto, renovar a carga local após importação e aplicar o recorte também ao dossiê corrigiu contexto desatualizado sem consulta por filtro.

## Cadastro: separar evidência ERP de classificação operacional

O Cadastro inicial manteve `dicionario_produtos` como dimensão comum de Custos/OP, com agrupamento Kustos manual e preservação de vazios no importador incremental. A evolução de outubro acrescentou um Master ERP e proveniência próprios, sem torná-los uma segunda classificação operacional nem criar uma ponte por texto.

O pipeline foi entregue em etapas: estrutura de lote; agrupamento ERP bruto; Preview puro; manifesto/aprovação; primeira carga pontual. `Agrup. Prod.` foi definido por decisão de negócio como campo ERP oficial; Pxxx não se converte em Mxxx. O manifesto da Fase 3.3 tinha 423 propostas; autorização separada permitiu a Fase 3.4, que levou o Master a 5.706. A migration pontual preserva provas e não pode ser reexecutada como importador.

A decisão posterior CAD-REBUILD-01 mudou o alcance apenas do Master: produtos fora do universo filtrado passaram de preservados a remoções revisáveis. Vazios de quem permanece continuam preservados. CLI e depois função Vercel compartilham executor central, snapshot, locks, revalidação, rollback e auditoria. O limite de tamanho do XLS no transporte bruto motivou CAD-PAYLOAD-01: dados canônicos compactos, sem binário, vinculados ao manifesto. O hash do arquivo web é proveniência declarada, não prova independente da origem ERP.

Preparação de ambiente, erro TLS, inspeção X.509 e diagnóstico posterior OK são momentos diferentes. Os deployments e testes dos registros abaixo identificam essas provas, não uma sequência de commits a reproduzir. Reconstrução posterior foi confirmada pelo usuário e pelos registros de leitura de 15/10 (Master 860, operacional 6.113); não há nesta revisão nova prova do lote, horário ou flag remota. A tentativa antiga bloqueada antes do POST permanece distinta da operação posterior concluída.

A divergência de fingerprint operacional da Fase 3.3 foi registrada sem atribuir autoria. A [evidência original](arquitetura/cadastro-mestre-aprovacao.md#ressalva-detectada-na-comparação-real) e a [carga pontual](arquitetura/cadastro-mestre-execucao-fase3-4.md) explicam seus limites; reorganizar documentos não resolve essa investigação.

## Leituras completas e identidade das famílias

Em 15/10, o aviso de 407 ausentes revelou leitura truncada a 1.000: fontes integrais mostraram 501 códigos únicos importados e zero ausentes operacionais. A correção preservou as duas fontes e levou à consulta ERP independente. Em 16/10, o leitor integral passou a atender também Custos, incluindo hierarquia, diagnóstico, histórico, gráficos e drill-through; completude não preenche classificação ausente e não torna várias requisições um snapshot transacional.

Família passou a ser identificada explicitamente por código: remover somente a unicidade da descrição permitiu rótulos iguais em códigos diferentes. CAD-FAM-01 acrescentou descrição ERP no transporte V2, propostas de catálogo separadas das de produto e rollback conjunto. A prova GET encontrou 81 famílias/16 existentes/65 novas para 693 produtos; essas propostas não foram executadas nessa entrega. Publicação e aprovação futura permanecem etapas próprias.

## Aprendizado documental

Atualizações datadas repetidas em README, VISION, ROADMAP e manuais criaram estados simultâneos incompatíveis. A reorganização DOC-ORG-01 separou apresentação, estratégia, planejamento, contratos, procedimentos e evidências, reaproveitando este arquivo. O [relatório de auditoria](auditoria/reorganizacao-documental.md) registra inventário, contradições, destinos, redundâncias e validação. Não houve mudança de runtime, banco, dados ou configuração.

## Registros dos marcos transferidos do README

As seções seguintes foram movidas do README anterior, preservando suas afirmações e números **como registros das entregas originais**, inclusive ressalvas já superadas. Links foram ajustados para esta localização. Detalhes já existentes nos documentos especializados continuam naqueles documentos; as repetições de VISION, ROADMAP e manuais foram consolidadas na narrativa e nos procedimentos atuais, conforme a auditoria. Esta memória de marcos não substitui o Git nem especifica o runtime vigente.

### Atualização 2026-10-16 — CUSTOS-PAGE-01: leitura integral da Auditoria

`getMasters()`, histórico, diagnóstico de agrupamentos, gráficos de comparação e drill-through de Custos usam páginas de 500 com contagem exata e ordenação determinística, sem teto total. Falha, página incompleta ou contagem alterada não viram sucesso parcial. A hierarquia continua vindo de `dicionario_produtos`, com enriquecimento antes dos filtros; não há sincronização ERP nem preenchimento de classificações. `data_referencia` permanece competência e `criado_em` importação.

Validação real somente GET confirmou 6.113 produtos, 1.370 fatos e 437 códigos encontrados/zero ausentes; 437 com origem, 151 com família e zero com agrupamento. O método corrigido retornou 437 vínculos, 12 origens, 18 famílias e 437 pendências de agrupamento. Nenhuma escrita, migration, deploy ou commit. [Contrato, testes e limites](arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026).

### Atualização 2026-10-15 — CAD-FAM-01: famílias ERP no Preview aprovado

O leitor existente transporta `Família` e `Descr. (Família)` no contrato V2. Preview separa operações de produtos e catálogo: código exato identifica família; nova categoria ou mudança de rótulo exige decisão própria. Servidor/executor regeneram manifesto/contexto sob locks; snapshot das famílias afetadas, transação e rollback abrangem catálogo e Master, com provas integrais de preservação. [Contrato e validação real](arquitetura/cadastro-mestre-familias-erp.md).

Leitura real: 860 produtos, 81 famílias, 16 existentes, 65 novas (693 produtos impactados), zero conflitos/rótulos ausentes; 65 propostas pendentes, nenhuma escrita. Publicar UI/função compatíveis e gerar nova revisão antes de execução futura autorizada. Não houve deploy, reconstrução, cadastro real, nova migration/env/flag ou commit; fatos e eixos temporais permanecem intactos.

### Atualização 2026-10-15 — CAD-FAM-SCHEMA-01: identidade de família por código

Migration estrutural aplicada remove somente a unicidade da descrição em `categorias_familia`, permitindo rótulos iguais para códigos diferentes. PK, código único, descrição obrigatória e os 38 registros foram preservados; nenhuma carga de famílias ou alteração do executor foi implementada. [SQL, rollback não executado e provas antes/depois](arquitetura/migracoes.md#cad-fam-schema-01--descrição-de-família-não-é-identidade-15102026). Fatos e seus eixos de competência/importação permanecem intactos.

### Atualização 2026-10-15 — CAD-ERP-VIEW-01: duas fontes no Cadastro

Cadastro agora oferece **Cadastro Operacional** (`dicionario_produtos`, classificação Kustos/runtime) e **Cadastro Mestre ERP** (`dicionario_master_produtos`, universo oficial, somente consulta). Totais vêm dos dados carregados, sem fixar 6.113/860 no código. A visão ERP permite busca por código/descrição, filtros por origem/família, agrupamento ERP bruto e páginas visuais de 50; leitura Supabase em páginas de 500 com contagem exata, reutilizando o leitor existente. Origem/família resolvem exclusivamente por código ERP exato nos catálogos. [Fluxo, limites e validação](ux/cadastro-mestre.md#cad-erp-view-01--duas-visões-no-cadastro-15102026).

Preview continua separado e acessível em ambas as visões; cadastro/edição/classificação permanecem no painel operacional. A nova visão não sincroniza nem altera dados/schema e não executa reconstrução. `data_referencia` e `criado_em` dos fatos permanecem intactos. Esta implementação ainda depende de publicação autorizada; registros anteriores abaixo são históricos.

Validação CAD-ERP-VIEW-01: **463 testes/35 arquivos passaram**, com 31 regressões novas; reexecução com dois workers após timeout inicial em teste volumoso preexistente, sem alterar timeout. Sonda real restrita a GET confirmou 860 produtos/50 por página/18 páginas, sem consultar operacional ou escrever. Interface conferida localmente com dados sintéticos; [evidências e limites](ux/cadastro-mestre.md#cad-erp-view-01--duas-visões-no-cadastro-15102026).

### Atualização 2026-10-15 — CAD-OP-PAGE-01: Cadastro operacional completo

`getProductMaster()` pagina `dicionario_produtos`, `historico_custos` e `apontamentos_op` em blocos de 500, com ordenação por código, contagem exata e recusa de leitura parcial. O aviso passa a dizer **código(s) importado(s) ausente(s) do cadastro operacional**. A tabela continua operacional; não usa nem sincroniza o Master ERP. O diagnóstico anterior confirmou Master ERP com 860 registros e operacional com 6.113: com as fontes completas, 501 códigos importados únicos e zero ausentes; os 407 eram efeito do corte em 1.000. [Contrato e validação](ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026).

Esta correção não reconstrói nem escreve dados, não muda schema/agrupamentos e não cria a visão Master ERP. `data_referencia` continua competência e `criado_em` importação. Os registros de 09/10 abaixo são históricos: a reconstrução foi concluída posteriormente, antes desta tarefa. Publicação desta correção ainda depende de deploy autorizado.

Validação local: **432 testes/32 arquivos**, lint, typecheck, build com configuração pública sintética e diff check passaram. Sonda do método alterado, somente GETs reais: **6.113 produtos + 1.370 Custos + 704 OP → 501 códigos únicos/zero ausentes**. Sem escrita de produção, reconstrução, alteração de variável ou deploy. [Evidências e limites](ux/cadastro-mestre.md#cad-op-page-01--leitura-integral-do-cadastro-operacional-15102026).

### Atualização 2026-10-09 — CAD-PAYLOAD-01: execução com dados do Preview

O XLS/XLSX/XLSM original permanece necessário para o Preview. A execução web envia somente os campos ERP necessários já lidos pelo adapter, em representação compacta, decisões, hash do manifesto, confirmação e identificador da tentativa; não envia o binário original. Isso elimina o bloqueio do XLS de 24.307.397 bytes sem aumentar o antigo teto de 16 MiB. O servidor recalcula os mesmos filtros e o manifesto contra o contexto atual; o executor central repete a revalidação sob locks, mantendo snapshot, transação e rollback. [Payload, validação e limite de confiança](arquitetura/cadastro-mestre-execucao-web.md#cad-payload-01--transporte-sem-o-xls-bruto).

Última leitura de produção: Master **5.706**; a tentativa `CAD_UI` foi bloqueada antes do POST e não persistiu lote ou snapshot. A cópia local `cadastro mestre 8_10.xls`, também com 24.307.397 bytes, produziu **6.230 linhas, 860 válidos, 4.853 remoções, dez UPDATEs e 517 preservações de campos**, zero erros. Não foi comprovada identidade byte a byte com o nome original que inclui `(1)`. Manifestos direto/compacto/servidor coincidiram; corpo medido localmente com 4.870 decisões: **885.146 bytes**, abaixo de 4 MiB. **409 testes/31 arquivos passaram**. [Evidência e limites](auditoria/cadastro-mestre-payload-validacao.md). **860 continua resultado esperado**, sem reconstrução ou escrita de produção, deploy, mudança de variável/schema ou commit; competência `data_referencia` e importação `criado_em` dos fatos permanecem intactas.

### Atualização 2026-10-09 — revisão final da execução web

Production READY `Jvnme82E7wA8R3h63YfnuaKA5KW1`, main `04a2412`. Usuário informou novo GET autenticado `DIAGNOSTICO_OK`, CA X.509/TLS/PostgreSQL/Storage/guardas OK e execução false; a falha TLS registrada abaixo é histórica. Conferência pública nesta revisão: configuração OK, diagnóstico sem sessão 401, disponibilidade 503 e flag false. Módulos publicados de UI/transporte/plano correspondem ao checkout. 103 regressões locais passaram, somente fixtures/PGlite/Storage mockado; nenhuma escrita de produção, variável alterada, deploy ou commit nesta revisão. [Escopo, resultado esperado e limites](arquitetura/cadastro-mestre-preparacao-ambiente.md#revisão-final-somente-leitura-09102026).

### Atualização 2026-10-09 — CAD-DIAG-TLS-01: inspecionar CA sem expor credenciais

GET `?verificar=1`, após autenticação e autorização, informa presença/tamanho/formato/X.509/fingerprint SHA-256 da CA e parâmetros sanitizados efetivos do driver. Não corrige CA/URI/TLS, altera variáveis nem chama executor. `rejectUnauthorized=true` e execução desabilitada permanecem. Publicado em Production READY `9swD3fEMicHbkGRzHKYqjUzDdyra`; usuário confirmou HTTP 409: CA presente/aplicada, 1.365 bytes, marcadores PEM presentes, parsing X.509 inválido e fingerprint null, `SELF_SIGNED_CERT_IN_CHAIN`, execução false. 369 testes/lint/typecheck/diff check passaram. Nenhuma correção/env/escrita/commit. [Campos e procedimento](arquitetura/cadastro-mestre-preparacao-ambiente.md#cad-diag-tls-01--metadados-da-ca-e-do-driver).

### Atualização 2026-10-09 — CAD-DIAG-01: localizar falhas do GET

Diagnóstico instrumentado distingue configuração, autenticação, autorização, conexão PostgreSQL, TLS, Storage e bucket, além das guardas de leitura. Retorna apenas etapas/códigos conhecidos e mensagens fixas, sem erro bruto/credenciais. Publicado em Production após autorização explícita (deployment B2mVXerHzJjbRjaYHSjZMm3TWPvF, READY), sem commit/env/DML. GET público confirma configuração OK, autenticação 401 e `execucao_habilitada:false`. Falha original 409 ainda depende de nova consulta autenticada; não comprova COMMIT/reconstrução. [Procedimento seguro](arquitetura/cadastro-mestre-preparacao-ambiente.md#cad-diag-01--diagnóstico-de-etapas-sem-escrita).

### Atualização 2026-10-09 — CAD-ENV-01: preparar sem executar

Build publica somente `dist`, excluindo código administrativo/configurações privadas. Diagnóstico autenticado `GET ?verificar=1` funciona com execução desabilitada, somente leitura, sem lote/upload/executor. Allowlist inicial indica apenas o usuário solicitado. Ambiente real ainda pendente: endpoint público 404, bucket inexistente, deploy/segredos não configurados por esta entrega. [Configuração, validação sem escrita e primeira execução passo a passo](arquitetura/cadastro-mestre-preparacao-ambiente.md). Master continua 5.706; nenhuma reconstrução, escrita de produção ou commit. `data_referencia` é competência e `criado_em` importação dos fatos, intactos.

### Atualização 2026-10-09 — CAD-EXEC-WEB-01: execução explícita na aplicação

Após aprovação integral, **Executar reconstrução…** abre confirmação com contagens e texto obrigatório. Função Node autenticada/autorizada na Vercel chama o executor central, revalida arquivo/contexto, preserva snapshot em Storage privado/log e mantém transação/rollback. Seleção, aprovação e download não executam carga. Execução vem desabilitada até configuração administrativa, sem segredos no navegador. [Arquitetura, configuração e recuperação](arquitetura/cadastro-mestre-execucao-web.md).

Nenhuma reconstrução real, deploy, migration ou escrita de produção nesta entrega. Custos/OP/dicionário operacional/mapa ficam intocados; a investigação do fingerprint operacional é separada. `data_referencia` continua competência e `criado_em` importação. Os limites de execução históricos abaixo são sucedidos por este fluxo.

### Atualização 2026-10-09 — CAD-REBUILD-01: universo atual do ERP

O Preview passa a propor remoção do Master de produtos ausentes ou fora dos filtros, além de novos e alterações. Campos ERP vazios preservam valores dos produtos que permanecem. Após aprovação integral, um comando administrativo explícito reconstrói somente `dicionario_master_produtos` em uma transação, com snapshot integral em disco/log, lote e provas de preservação operacional. A tela continua sem execução automática. Não há mudança de schema, RPC ou SQL no frontend.

Para as contagens do XLS real informadas pelo usuário: **6.230 linhas → 860 válidos = 853 existentes + 7 novos**; **4.853 remoções**, com **5.706 − 4.853 + 7 = 860** no Master. Nenhuma carga real foi executada nesta entrega. [Contrato, rollback, comando e validação](arquitetura/cadastro-mestre-reconstrucao.md). As referências abaixo à preservação de produtos fora do conjunto descrevem as entregas históricas e são substituídas por este contrato somente no Master ERP. Custos/OP mantêm `data_referencia` como competência e `criado_em` como evento de importação.

### Atualização 2026-10-08 — CAD-XLS-01: Preview direto do ERP

Em **Cadastro → Preview mestre (XLSM / XLSX / XLS)**, escolha o arquivo ERP original, sem conversão manual. Os três formatos usam o mesmo adapter e motores de Preview/aprovação. A janela mostra contagens, propostas e preservações; decisões e download JSON são locais, sem execução ou escrita no banco. Após esclarecimento humano, o seletor deixou de chamar o importador legado. [Fluxo, contratos e validação](ux/cadastro-mestre.md#cad-xls-01--preview-e-aprovação-na-tela-08102026).

### Atualização 2026-10-08 — CAD-UX-01: usabilidade do Cadastro

A tabela do Cadastro usa uma área de rolagem com altura limitada à viewport: a barra horizontal permanece acessível enquanto as linhas rolam, com cabeçalho fixo. Na edição manual, selecionar **Sem agrupamento** grava `agrupamento_cod = NULL`; vazios na importação continuam preservando valores. A tela mantém sua ligação atual com `dicionario_produtos`, sem alterar o Master ERP ou o pipeline da Fase 3.4. [Comportamento e validação](ux/cadastro-mestre.md).

### Atualização 2026-10-08 — Fase 3.4: primeira carga do Cadastro Mestre

Após revalidação integral, a carga pontual autorizada concluiu o lote 1: 103 novos e 312 existentes atualizados (11 descrições + 309 agrupamentos ERP), com Master final de 5.706. Os 4.853 fora dos filtros foram preservados; operacional/mapa/fatos/categorias não mudaram. Não há importer de runtime nem ponte Pxxx → Mxxx. [Lote, migration e provas](arquitetura/cadastro-mestre-execucao-fase3-4.md).

### Atualização 2026-10-08 — Fase 3.3: manifesto antes da execução

`Agrup. Prod.` (Q) é o campo ERP oficial para `agrupamento_erp_valor`, por decisão de negócio; Pxxx não é convertido em Mxxx. Novo núcleo puro prepara manifesto determinístico e revisão local individual/em lote, sem gravação ou ativação no importador legado. O lote real tem 103 INSERTs candidatos e 320 UPDATEs por campo em 312 existentes; as 423 propostas foram entregues pendentes. [Contrato, contagens e limites](arquitetura/cadastro-mestre-aprovacao.md). Nenhuma alteração de Custos, OP, mapa, fatos, schema ou RLS.

Sistema operacional de auditoria analítica de custos. Não é um dashboard genérico.

É um cockpit investigativo que transforma planilhas ERP em velocidade de investigação.

---

### Atualizacao 2026-08-10 — contexto investigativo dinamico da OP

O contexto da Auditoria de OP deixou de depender do cache da abertura da tela: apos importar, a fonte local e recarregada; a fila e o dossie sao recalculados pelo recorte selecionado, sem janela fixa de meses. `data_referencia` define a competencia; `criado_em` continua como rastreabilidade da entrada.

### Exportação investigativa operacional (Atualização 2026-05-21)

A exportação `.xlsx` deixou de ser dump de tabela e passou a refletir o **estado investigativo ativo**:

- respeita filtros ativos, fila rápida e contexto temporal selecionado;
- prioriza ordenação operacional (`criticidade > mudança de regime > magnitude > reincidência > instabilidade`) quando não houver ordenação manual explícita;
- inclui coluna de **contexto investigativo automático** para reduzir interpretação manual;
- preserva rastreabilidade separando explicitamente `data_referencia` (competência) e `criado_em` (importação);
- gera duas abas: `Contexto` (metadados investigativos) e `Fila Investigativa` (priorização de ação).

Padrão de nome de arquivo: `auditoria_criticos_<periodo_inicio>_a_<periodo_fim>_<YYYYMMDD>.xlsx`.


### Atualização contínua — 25/05/2026 (saneamento de schema)

- Saneamento operacional do schema Supabase com hardening de constraints, índices, fallback explícito para órfãos de agrupamento e view de auditoria (`sql/2026-05-25_saneamento_operacional_schema.sql`).

### Atualização 2026-05-28 — ERR-01: fronteiras operacionais de erro

- `init()` e `runReport()` agora possuem fronteiras explícitas para falhas assíncronas, evitando tela branca ou `Uncaught (in promise)` no fluxo principal de investigação.
- Falhas em filtros, metadata, drill-through e exportação exibem mensagem operacional amigável, preservam o contexto atual da tela e registram detalhes técnicos apenas quando `VITE_ENABLE_VERBOSE_LOGS=true`.
- A mudança não altera contratos Supabase, regras de negócio, semântica temporal (`data_referencia` x `criado_em`) nem visual do relatório.

---

### Atualização 2026-05-28 (VAL-01)

- A importação passou a centralizar o identificador de produto em `normalizeCodigoProduto()` para impedir divergência causada por Excel/notação científica, espaços invisíveis, zeros à esquerda textuais e formatos numéricos mistos.
- Linhas com código inválido são bloqueadas no preview/API e contabilizadas como falha de linha, sem derrubar o lote e sem persistência ambígua.
- A mudança não altera contratos Supabase, regras investigativas nem a distinção temporal: `data_referencia` continua sendo competência operacional; `criado_em` continua sendo evento de importação.

### Atualização 2026-05-28 (LOG-01)

- O KPI **Alertas (>5%)**, o filtro rápido do card, os destaques da tabela, o drill-through e a exportação passaram a reutilizar a mesma regra canônica `isAlertaCritico()`/`classifyAlert()`.
- A semântica ficou explícita: alerta é `abs(variacaoTemporal) >= 5` entre as duas últimas importações (`criado_em`), sem arredondamento prévio, cobrindo altas e quedas; ausência real de comparativo (`null`) não alerta, mas `undefined`/`NaN` falha rápido.
- A mudança não altera visual, KPIs existentes, Supabase, `scoreInstabilidade` nem a distinção temporal: `data_referencia` filtra a competência analisada; `criado_em` define última/penúltima importação.

### 12. Tooling de Qualidade (Onda 2 — 25/06/2026)

A rede de segurança antes de refatorações foi adicionada sem alterar o runtime estático/CDN do produto:

- `package.json` contém apenas `devDependencies` e scripts de desenvolvimento (`lint`, `typecheck`, `test`, `build`).
- ESLint usa flat config para qualidade básica, variáveis/imports mortos e bloqueio de `innerHTML` interpolado sem revisão explícita.
- `jsconfig.json` habilita type checking leve para JavaScript (`checkJs`) sem migração para TypeScript nem bundler.
- Vitest cobre regressões do núcleo (`core/`) para VAL-01 (`normalizeCodigoProduto`) e LOG-01 (`classifyAlert`/`filterAlertRows`/KPIs), além da semântica temporal `data_referencia` × `criado_em` em `buildReportRows`.
- GitHub Actions executa `npm run lint`, `npm run typecheck` e `npm test` em Pull Requests, sem deploy e sem alteração do fluxo Vercel.

Comandos locais:

```bash
npm install
npm run lint
npm run typecheck
npm test
```

Observação: warnings atuais de `no-unused-vars` são baseline de manutenibilidade já exposto pelo lint e devem ser tratados em itens de refatoração dedicados, sem misturar com a Onda 2.

### Atualização documental — 20/07/2026

Engineering Freeze v1.0: o MNT-01 foi encerrado com a extração da fila/tabela e do presenter investigativo para `view/ui-table.js`. `view/ui-controller.js` permanece como orquestrador dos fluxos já modularizados (`ui-charts`, `ui-drill-through`, `ui-import`, `ui-filters`, `ui-export`, `ui-table`), sem alteração funcional.

### Atualização 2026-07-27 — MNT-OP-01

- Corrigida a persistência da Auditoria de OP sem alterar layout, filtros, regras investigativas ou schema.
- Causa raiz: o CSV real formata algumas OPs com ponto de milhar; o conversor inteiro estrito devolvia `null` para valores como `2.081`, e o PostgreSQL rejeitava o chunk por `op NOT NULL`. O parser agora normaliza apenas o campo `op` antes da conversão (`2.081` → `2081`).
- O diagnóstico de falha de chunk agora exibe a resposta completa do Supabase e aponta os registros/campos afetados por uma violação `NOT NULL`.

### Atualização 2026-07-30 — MNT-OP-02: motor investigativo da Auditoria de OP

- A aba OP deixou de reproduzir somente a tabela do ERP e passou a ordenar a fila por **Motivo da investigação**: gargalo de produtividade, paradas operacionais, baixa produção, sinal misto, sem base comparativa ou alta eficiência.
- Os fatos do ERP continuam imutáveis no dossiê (`Tempo Previsto/Real`, `KG/Hora Previsto/Real`, `% Tempo (ERP)`, quantidades e parada). O Kustos calcula separadamente **Desvio de Tempo**, **Desvio de Produtividade**, **Atendimento da Produção** e **Índice de Paradas**.
- Nenhum indicador isolado define criticidade: parada só é hipótese principal quando acompanha atraso e produtividade normal/baixa; produtividade baixa com tempo alto e parada não material aponta gargalo de processo. `% Tempo (ERP)` é conferência contra o desvio de produtividade, nunca dupla penalidade.
- O dossiê explicita competência (`data_referencia`) e o evento de importação (`criado_em`) sem misturá-los.

### Atualização 2026-08-03 — MNT-OP-03: decisão investigativa combinada

- A fila de OP passou a responder explicitamente se a execução **merece investigação**, com prioridade máxima, alta, monitoramento, registro ou nenhuma investigação necessária.
- A decisão é derivada no motor puro pela leitura conjunta de produção, tempo, KG/Hora e paradas; o dossiê mostra as **evidências combinadas** que sustentam a conclusão.
- Entrega com tempo alto, KG/Hora baixo e parada material sinaliza desperdício operacional; a mesma combinação com déficit de produção vira prioridade máxima por paradas com impacto. Em contrapartida, tempo maior explicado por volume maior não alerta, e parada sem efeito em entrega/tempo/produtividade é apenas registrada.
- Não há mudança de schema nem dos fatos do ERP. `data_referencia` permanece a competência do recorte e `criado_em` apenas registra quando o apontamento entrou no sistema.

### Atualização 2026-08-13 — Cadastro mestre de produtos

A aba **Cadastro** mantém `dicionario_produtos` como fonte única de produtos para Custos e OP. Importa o XLSM incrementalmente: valores ERP preenchidos atualizam Produto/Descrição/Origem/Família; campos vazios e produtos ausentes do arquivo são preservados; fatos continuam imutáveis.

### Atualização 2026-09-28 — fila investigativa responsiva

A Auditoria de Custos exibe no máximo os **200 itens mais prioritários** da fila já ordenada e informa o total quando houver mais resultados. Refinar o recorte coloca outros itens na janela sem mudar prioridade, KPIs, drill-through, exportação ou semântica temporal. Os cliques de detalhe e drill-through usam um único listener delegado no corpo da tabela.

### Atualização 2026-10-01 — Fase 2A do Cadastro Mestre

`dicionario_master_produtos` recebeu somente a estrutura de proveniência para futuras cargas ERP em XLSM, XLSX ou XLS. O runtime continua consumindo `dicionario_produtos`; não houve importação, reconciliação, classificação de família nem alteração de fatos.

### Atualização 2026-10-05 — Fase 2C.2: proveniência de agrupamento

O Master passou a poder preservar o valor bruto de agrupamento recebido do ERP e seu lote, sem convertê-lo para uma categoria Kustos. A dimensão operacional agora comporta override manual e origem de classificação, ambos inicialmente nulos; a ponte ERP → Kustos continua inexistente e não houve alteração de agrupamentos, fatos ou runtime.

### Atualização 2026-10-08 — Fase 3.1: Preview do Cadastro Mestre

Novo núcleo puro e adaptador para XLSM/XLSX/XLS: filtros Tipo P/C → Descr(Origem) Produzido/Revenda → exclusão de inativo/EXLUIR; comparação por código contra `dicionario_master_produtos`. Preview preserva vazios/ausentes, resolve origem/família somente por código exato e guarda agrupamento ERP sem ponte Kustos. Sem gravação, migration, aprovação ou execução, e sem ativação na UI/importador legado. Contrato e exemplo em [Cadastro Mestre — Preview](arquitetura/cadastro-mestre-preview.md).

### Atualização 2026-10-23 — universo completo na Auditoria de OP

O MNT-OP-05 corrigiu localmente a consulta que recebia somente 1.000 dos 1.469 apontamentos. Reutilizar a paginação estrita existente fez a mesma investigação alcançar 299 gargalos, contra 222 no recorte truncado, sem mudar o motor ou escrever dados. [Provas reais e regressões](auditoria/op-paginacao-validacao.md) separam a implementação validada da publicação ainda não autorizada. `data_referencia` permanece competência e `criado_em` importação/proveniência; nenhum commit, push ou deploy nesta entrega.
