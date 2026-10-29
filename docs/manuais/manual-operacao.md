# Manual de Operação — Kustos Germani

Procedimentos atuais de manutenção e conferência, revisados quanto ao acesso em **23/10/2026**. O [ROADMAP](../../ROADMAP.md) distingue implementação local de publicação/execução. Quantidades reais e status de ambiente citados nas provas são datados; a validação remota do acesso está nas provas SEC-03; demais referências mantêm suas datas. Uso da tela: [Manual do Usuário](manual-usuario.md). Implementação: [Manual Técnico](manual-tecnico.md).

## 1. Rotina mensal de Custos

1. Obtenha XLSX ERP de uma competência e selecione essa competência na Importação.
2. Confira as cinco colunas, mapeamento, preview e status por linha antes de confirmar.
3. Anote Total / Importadas / Falhas; confira `log_importacao` e o banner de classificação incompleta. Havendo ausentes antes do envio, confira lista/quantidade únicas e descrições do arquivo. **Ver produtos no Cadastro** leva contexto ao operacional sem gravar; o registro pode já ter sido criado pela rotina existente. Consultar/preparar confere a situação atual; salvar permanece manual. Falha de leitura do cadastro deve ser resolvida antes do envio, nunca interpretada como zero pendências.
4. Abra Custos no mesmo recorte e confira KPIs/fila/drill-through. No histórico do produto, Competência mostra mês/ano e Data mostra `data_referencia` completo, sem horário. Confira o dia real de cada registro, inclusive duas datas no mesmo mês (05/10 e 14/10); não há agrupamento mensal nesta tabela. `criado_em` permanece evento de importação/proveniência, sem exibição na coluna Data.
5. Ao exportar, escolha campos e confirme abas Contexto/Fila Investigativa, período e ordenação.

Reimportação atualiza a chave produto/competência, sem duplicá-la. `log_importacao` registra status, totais, linhas importadas/em erro, início/fim e `data_referencia`. **Competência é `data_referencia`; importação é `criado_em`.** Normalização de código é canônica (VAL-01); logs verbose devem conter somente amostras limitadas, sem planilha inteira.

**LOG-02: preparação local, não ativada.** A migration de proveniência não foi aplicada ao Supabase; em 29/10 o usuário pediu concluir somente a preparação local, pois os writers não estavam pausados. Não executar o novo writer contra o schema antigo. Uma janela futura deve: pausar todos os writers administrativos/importações, controlar abas/builds antigos, reconfirmar catálogo e backup, aplicar a migration revisada e conferir legado NULL/chaves/RLS/dados preservados, então ativar somente clientes compatíveis com autorização de publicação própria. Sem controle integral, manter LOG-02 PARCIAL; não há proteção automática contra cliente antigo pela coluna nullable.

Após ativação, anotar **Execução no log**: PK textual confirmada de `log_importacao`, enviada em cada fato no mesmo upsert e conferida no retorno do comando. Não é competência nem horário. Falha inicial bloqueia dimensão/fatos; falha/retorno incompleto de chunk não confirma suas linhas nem cria novo lote. Não há retry automático: resposta perdida pode coexistir com COMMIT e exige reconciliação, não reenvio presumido seguro. `log_error` registra fechamento pendente. Uma nova chamada é outra execução; retry do mesmo payload dentro de uma execução, quando tecnicamente controlado, conserva o contexto. API legada `upsertHistoricoCustos` está bloqueada localmente; função SQL antiga/transformação de precisão/saneamento/sondas não são writers produtivos autorizados neste procedimento. Upsert não guarda versões anteriores. [Contrato](../arquitetura/identidade-lote-custos.md) e [provas/pendências](../auditoria/custos-lote-persistencia-validacao.md).

Intervalo considera toda a faixa; Comparação considera só duas competências, sem meses intermediários. KPI Alertas (>5%), filtro rápido e exportação precisam usar o mesmo conjunto de variações absolutas ≥ 5%. Com mais de 200 itens, compare o total do relatório com o aviso de janela visual; refine o recorte para acessar outros itens. Exportação e KPIs usam o conjunto completo. LOG-02 continua limitando a interpretação de dois timestamps como dois lotes distintos.

Na versão local corrigida, a primeira fila prioriza globalmente todos os candidatos antes de mostrar até 200. Quedas relevantes também podem ocupar o início. Cabeçalho ativa ordem manual e o aviso distingue a ordem escolhida da prioridade automática. **Restaurar prioridade investigativa** retorna ao padrão preservando filtros e recorte, sem nova consulta. Na conferência real de 23/10, outubro teve 349 produtos/cinco alertas, todos nas primeiras cinco posições e 200 itens renderizados; [provas datadas](../auditoria/custos-top200-validacao.md). LOG-04/06 têm [regressões locais adicionais](../auditoria/custos-fila-validacao.md): exporte nas ordens padrão e manual de variação nos dois sentidos; os primeiros 200 códigos devem coincidir com a tela, com os demais presentes no arquivo. A aba Contexto deve identificar a ordem aplicada. Alerta atual não é reincidência; SEM COMPARATIVO não significa ausência de alerta comprovada. Nenhuma narrativa de segunda alta é deduzida dos agregados. Publicação aguarda autorização própria. `data_referencia` permanece competência, `criado_em` importação/proveniência.

## 2. Classificação e dados incompletos

Na comparação local corrigida por LOG-03, confira primeiro o recorte: abril–junho não pode receber fatos de competência outubro. Importações posteriores que carreguem competências abril–junho continuam elegíveis pelo seu `data_referencia`; `criado_em` apenas ordena esses eventos. Zero/um evento significa comparação insuficiente, sem resumo 0% ou estabilidade. Um custo zero observado permanece válido; base anterior zero impede calcular o percentual. TOP compara produto + data completa; ausência de par não é zero. A unicidade produto/data e o upsert não retêm versões anteriores desse mesmo par, portanto o TOP pode ficar sem pares mesmo quando existe comparação agregada. Não importar novamente, editar fatos ou mudar schema para preencher essa ausência. LOG-02 (chunks versus lote) permanece aberto; [contrato](../arquitetura/comparacao-temporal-custos.md) e [provas](../auditoria/custos-comparacao-recorte-validacao.md). Correção local, publicação não autorizada.

O operacional é `dicionario_produtos`, preservado para manutenção e OP. Em Custos, origem/família do Master enriquecem a análise em memória para os códigos existentes nele, sem atualizar o operacional; códigos fora do Master mantêm o fallback operacional. Agrupamento continua operacional. Produto novo sem classificação deve ser sinalizado. Confira no Cadastro Operacional e use a manutenção autorizada da classificação, com referências reais dos catálogos. Não inferir Origem/Família/Agrupamento por descrição, nem usar reconstrução ERP para corrigir classificação operacional.

A view `vw_produtos_orfaos_agrupamento` é apoio SQL de triagem; a API faz diagnóstico próprio nas tabelas, tolerando chave de agrupamento `codigo`/`id`/`cod`. **“Não foi possível validar produtos sem agrupamento.”** indica indisponibilidade; não interpretar como zero. `SEM_AGRUPAMENTO` e ausência de classificação seguem o [modelo documentado](../arquitetura/banco-de-dados.md).

**Sem agrupamento** no editor remove explicitamente `agrupamento_cod`; cancelar não grava. Célula ERP vazia no fluxo de importação correspondente preserva valores. Qualquer saneamento de dado legado deve ter procedimento próprio aprovado; não executar scripts históricos de seed/reconciliação como reparo automático.

## 3. Rotina de OP

Importe o CSV MCAP105 com competência, confira amostra e resumo. OP com milhar (`2.081`) deve virar inteiro `2081`; não alterar `op INTEGER NOT NULL`. Após a importação, confira fila/dossiê sem recarregar a página: a carga local deve ser renovada. Filtros/competência precisam afetar ambos.

Na versão com MNT-OP-05, confira o total carregado contra o universo elegível, inclusive acima de 1.000. A API percorre páginas de 500 e bloqueia resultado incompleto; filtros seguintes recalculam sobre a carga integral local. KPIs consideram o recorte antes do filtro de Motivo; a fila mostra o motivo escolhido. Dossiê/histórico conservam o contexto do período/produto. Falha de leitura exige investigar e repetir somente a consulta; não importar para compensar linhas ausentes. [Validação real local](../auditoria/op-paginacao-validacao.md); a versão publicada ainda aguarda autorização própria. `data_referencia` continua competência e `criado_em` importação.

Triagem começa pela coluna Decisão e pelo motivo, conferindo fatos ERP versus indicadores Kustos. Prioridade máxima combina parada material, atraso, déficit e queda/não melhoria de produtividade. Desperdício com entrega merece investigação; parada sem impacto é registro. Tempo adicional explicado pelo volume e produtividade estável não é incidente isolado. Divergência de `% Tempo (ERP)` pede conferência na origem; não recalcular fórmulas na tela.

Falha de gravação: procurar `========== IMPORTAÇÃO OP ==========` no console. O diagnóstico inclui chunk, quantidade, primeiro registro e resposta Supabase; violação NOT NULL identifica registros/campo. Use essas evidências para investigar o formato, sem converter falha em mudança de schema. Competência/importação ficam distintas e não entram nas fórmulas operacionais.

### Conferir OP × CUSTO mensal

Recurso implementado no checkout local, ainda não publicado. Na OP, escolha explicitamente o mesmo mês em **De** e **Até** e abra **OP × CUSTO — [Mês/Ano]**. A ação lê o mês completo de `data_referencia`, inclusive datas diferentes do dia 01. Os filtros OP são preservados para retorno e não restringem silenciosamente o cruzamento.

Confira primeiro o status de cada fonte, A (OP + Custo), B (OP sem Custo), C (Custo sem OP) e registros não relacionáveis. Se existirem B/C, escolha incluir esses produtos ou somente A. Sem essa escolha, a fila não é liberada. Fonte vazia confirmada é diferente de erro/incompletude; uma falha impede a apresentação de relatório parcial. Repita somente a leitura, sem importar ou alterar dados para compensar a falha.

Examine os dois modos independentes de prioridade e o dossiê: todos os eventos OP, snapshots da competência, referência/base, ambiguidades e evidências. Ausência não é zero, e simultaneidade não prova causa. Busca exata de código pode mostrar D (nenhum lado), sem novo acesso remoto. Páginas visuais de 50 não limitam o conjunto mensal nem alteram TOP-200. **Atualizar leitura** exige nova decisão de inclusão quando houver B/C; **Voltar para OP** restaura filtros/motivo/produto/dossiê e rolagem/foco mantidos na origem. [Contrato](../arquitetura/op-custo.md#17-fase-2--apresentação-e-integração-local); [validação local e limites](../auditoria/op-custo-fase2-validacao.md). `criado_em` permanece importação/proveniência.

## 4. Conferir Cadastro e leituras completas

Cadastro Operacional e Master ERP têm fontes, totais e filtros independentes. A consulta ERP é somente leitura, com busca local, código exato e páginas de 50. Confira as cinco colunas Código, Descrição, Origem, Família e Agrupamento comercial; a última reúne código — descrição, sem Agrup. Prod. na tabela. Confira exemplos como `C008 — BISCOITO LAMINADO DOCE` e `C011 — BISCOITO RECHEADO`; ambos os campos vazios mostram **Não informado**, campos parciais mostram apenas o valor existente. Essa apresentação não altera os campos persistidos nem autoriza carga. **Atualizar consulta** relê o Master e reinicia a página, conservando filtros válidos; alternar painel não sincroniza bases.

Após publicação autorizada das correções, confira carga integral e mensagem de ausentes **do cadastro operacional**, sem comparar com o total ERP. Leitura de qualquer página com erro/contagem alterada/incompleta deve falhar explicitamente. Repetir somente a leitura após investigar; não cadastrar/importar/reconstruir para compensar o contador.

Referências datadas para comparação, sem tratar números como metas permanentes:

- [Cadastro em 15/10](../ux/cadastro-mestre.md): 6.113 operacionais, 860 no Master ERP; fontes de Custos/OP completas resultaram em 501 códigos importados únicos e zero ausentes operacionais. Os antigos 407 decorriam de truncamento.
- [Custos em 16/10](../arquitetura/matriz-contratos-operacionais.md#custos-page-01--leituras-integrais-da-auditoria-de-custos-16102026): 1.370 fatos, 437 produtos com custo, 12 origens/18 famílias na hierarquia e 437 pendências de agrupamento; 151 produtos tinham família e nenhum tinha agrupamento. No intervalo documentado 01/02/2026–15/03/2027, foram lidos os 1.370 fatos.
- [Famílias em 15/10](../arquitetura/cadastro-mestre-familias-erp.md): 81 famílias do universo, 16 existentes, 65 novas para 693 produtos; 65 propostas pendentes e nenhuma escrita nessa entrega.

A consulta respeita a visibilidade/RLS do cliente e não é snapshot transacional entre requisições. Recarregar masters após publicação não preenche classificações ausentes.

Para conferir a classificação analítica de Custos, recarregue a página, selecione uma origem e família ERP, mantenha Item/Produto em TODOS e compare os códigos da fila com os produtos dessa família que possuem custos no recorte. Depois selecione um produto e abra seu histórico; exportação deriva da mesma fila. Não preencher o operacional como teste. Campos ERP sem resolução não autorizam fallback; erro de página/contagem interrompe a leitura. A projeção reflete o cadastro atual e não é classificação histórica por competência. `data_referencia` continua competência e `criado_em` importação. [Evidências GET e teste local](../auditoria/custos-classificacao-erp.md).
## 5. Reconstrução administrativa do Master

O procedimento exige autorização própria. Consulta, seleção do arquivo, decisões e download não executam carga. Não reexecutar a migration pontual da Fase 3.4 nem chamar o importador legado para aplicar o manifesto atual.

1. Confirmar migration comercial aditiva aplicada em etapa autorizada e versão compatível de UI/função V3 e gerar novo Preview do original XLS/XLSX/XLSM contra o contexto atual. Revisão antiga ou divergência de arquivo/contexto exige regeneração.
2. Conferir filtros, universo, remoções do Master, campos preservados e propostas de famílias/produtos separadamente. Código identifica família; rótulos podem repetir entre códigos. Conflito bloqueia. Nos campos comerciais, célula vazia limpa o existente para NULL; coluna ausente preserva. Nos demais campos, vazio preserva. Não inserir famílias manualmente como teste.
3. Aprovar integralmente todas as propostas permitidas; qualquer pendente/rejeitada bloqueia a carga inteira. Guardar original/revisão e contagens atuais, sem reutilizar a antiga expectativa de 860 como comando.
4. Verificar ambiente por GET autenticado autorizado, mantendo execução desabilitada durante diagnóstico. Sucesso de leitura não prova upload/rollback real nem autoriza execução.
5. Em etapa autorizada, executar pela aplicação com segunda confirmação digitada, ou usar CLI explícito conforme o [contrato central](../arquitetura/cadastro-mestre-reconstrucao.md#operação-e-exemplo). Não combinar caminhos nem repetir automaticamente.
6. Conferir lote concluído, universo, contagens, proveniência, referência do snapshot e provas integrais protegidas. Atualizar consulta ERP para reler rótulos; isso não reconcilia o operacional.

Somente para validação local de uma revisão já disponível, o CLI sem `--executar` não conecta ao banco:

```powershell
node scripts/reconstruir-cadastro-mestre.mjs --revisao "revisao.json"
```

Execução real exige todos os argumentos, conexão administrativa server-side, lote único e snapshot novo em diretório existente. Parâmetros completos, limites e credenciais por ambiente ficam no contrato especializado; não passar conexão administrativa na URL da UI ou em variável VITE.

Snapshot durável contém Master completo e famílias afetadas; catálogo tem prova integral. Storage usa objeto privado sem sobrescrita, conferido por download/hash antes do DML; CLI usa `wx`/`fsync`. DML de produtos/famílias aprovadas é conjunto e atômico, com log. Erro/resposta perdida exige consulta do lote: `CAD_UI` nasce no browser, lote ausente pode significar transação em curso e não autoriza retry. COMMIT incerto não é sucesso nem falha comprovada; preservar snapshot e investigar. Restauração exige procedimento aprovado, sem apagar alterações posteriores.

Detalhes: [execução web](../arquitetura/cadastro-mestre-execucao-web.md), [famílias](../arquitetura/cadastro-mestre-familias-erp.md) e [preparação/diagnóstico](../arquitetura/cadastro-mestre-preparacao-ambiente.md). Os relatos de 5.706 → 860 são evidências históricas; reconstrução posterior já foi confirmada nos registros de 15/10. Novas propostas de famílias continuam uma etapa distinta.

### Carga pontual de Agrup. Com. ERP

Esta carga possui [executor isolado](../arquitetura/cadastro-mestre-comercial-executor-isolado.md) e **não deve usar a reconstrução geral acima**. Guardar manifesto integral da Fase A, SHA-256 canônico conferido, fotografia original e XLS. O CLI `scripts/validar-carga-comercial.mjs` recebe esses quatro argumentos conforme o contrato e somente revalida localmente; não aceita `--executar` e não acessa o banco. Deve reproduzir 860 produtos, 162 com comercial, 698 pares NULL, 29 códigos, 324 valores e zero conflitos/inferências. Divergência bloqueia, sem saneamento automático.

Nenhuma carga desta etapa está autorizada. Na etapa futura, autorização humana e confirmação do hash são obrigatórias; Master/catálogos serão rechecados sob locks. Preservar resultado e fotografia fora do banco: esta operação não grava lote/log nem timestamps/proveniência. Em falha/COMMIT incerto, não buscar lote da reconstrução nem repetir automaticamente; conferir contra fotografia/manifesto. `data_referencia` continua competência e `criado_em` importação, intactos.

## 6. Acesso, configuração e publicação

O [modelo de acesso vigente](../arquitetura/modelo-acesso-rls.md) exige sessão permanente para ler dados; somente os dois administradores indicados podem importar Custos/OP e criar/editar produtos operacionais. Demais autenticados têm leitura. Não há exclusão operacional, escrita direta de catálogos/Master ou acesso anônimo às tabelas. Reconstrução ERP continua com allowlist/flag e procedimento separados. A autorização é aplicada no banco, mesmo se controles de edição/importação estiverem visíveis na UI de um leitor. Erro de permissão exige conferir sessão/identidade/operação; não conceder ALL, usar service_role no browser ou desabilitar RLS. [Provas e limites](../auditoria/seguranca-rls-validacao.md).


O fluxo principal do checkout chama login antes de masters/metadados e OP; criação administrativa de usuário está em [Autenticação](../arquitetura/autenticacao.md). Isso não comprova RLS ou permissões de produção. O modelo indicado foi aplicado; mudanças futuras de autorização exigem evidência e escopo próprio, preservando a matriz. Não expor senhas, tokens ou service-role no frontend, logs ou documentação.

Build Vercel chama `scripts/build-web.mjs`, publica `dist` por allowlist e gera runtime-config com URL/chave públicas e verbose. Funções `/api` são empacotadas separadamente. Segredos administrativos, scripts, SQL e dependências não são arquivos públicos. Variáveis/configuração: [setup](../../README_SETUP.md) e [deploy](../arquitetura/deploy.md). Ausência de variáveis obrigatórias bloqueia o build/bootstrap.

Reconstrução é desabilitada por padrão; configuração real de flag não é presumida. Diagnóstico `GET ?verificar=1` exige Auth/allowlist e usa leitura/ROLLBACK; inspeciona conexão, TLS, Storage/bucket e guardas. CA só aparece como metadados/fingerprint sanitizados; parsing X.509 não prova confiança ou validade temporal. Não modificar TLS, env, privilégios, bucket ou habilitar POST para diagnosticar.

A gravação de documentação usa `api/save-doc.js`, com `GITHUB_TOKEN`/`GITHUB_REPO`/`GITHUB_BRANCH` server-side, allowlist e limite 200 KB. O handler não exige sessão no código atual; não confundir com gate da aplicação ou da reconstrução. Este registro não altera a decisão de acesso.

Deploy precisa de autorização. Publicação por Git depende da integração configurada; checkout sem commit não entra em redeploy de um commit antigo. Rollback do deployment na Vercel não reverte dados/migrations; conferir compatibilidade de frontend/funções antes de promover versão anterior. Banco tem procedimento separado e backup prévio.

Na conferência da interface Black + Purple, verificar central de módulos, Custos, OP, ambas as visões de Cadastro, Documentação e Preview em 1440×900, 1024×768 e 390×700. Confirmar foco visível, rótulos operacionais e rolagem interna das tabelas. Conferir revisão e cancelar, sem usar importação, reconstrução ou salvar documentos apenas para testar aparência. [Referência visual](../ux/componentes.md).

## 7. Banco, backup e diagnóstico

[Migrações](../arquitetura/migracoes.md) centraliza scripts e estado registrado. Exemplos versionados incluem precisão de custos, índices de 11/05, saneamento de 25/05, tabelas/log OP de 23/07, proveniência cadastral de outubro e alteração isolada de unicidade da descrição de família. Scripts utilitários/seed não são rotina mensal. Não reaplicar automaticamente nem inferir que toda migration listada está pendente.

Preserve índices de produto/competência/importação. Antes de mudança estrutural autorizada, garantir backup recente e procedimento de retorno; backup gerenciado depende do plano do projeto. Exportações/snapshots devem ter retenção aprovada e nunca ser sobrescritos para repetir uma tentativa.

- **Configuração ausente:** conferir fontes de runtime e variáveis no ambiente; rebuild exige autorização quando publicar.
- **Falha ao carregar dados:** investigar rede, chave, visibilidade e paginação; resultado parcial/zero não substitui erro.
- **Linhas inválidas:** conferir planilha, mapeamento e erros de linha/log.
- **Produto fora dos filtros:** conferir classificação e recorte antes de alterar dados.
- **Base extensa:** usar filtros e janela visual de 200; PERF-01 está concluído. Cache de masters permanece dívida PERF-02.
- **Gráficos/exportação falham:** conferir mensagem/operation/timestamp. Verbose temporário, quando autorizado, ajuda a coletar diagnóstico; desativar depois. Não compartilhar tokens, configuração privada ou payloads inteiros.

Após cada importação, conferir log e classificação; mensalmente, revisar alertas/regime. Na OP, revisar decisão/evidências e referências de alta eficiência. Dependências CDN têm versões no HTML; não tratá-las genericamente como “sem versão”. O handler documental público e os limites RLS são fronteiras separadas, não resolvidas por esta revisão.

[Playbook](../troubleshooting/playbook-operacional.md), [integração](../troubleshooting/guia-integracao.md) e [auditoria/backlog](../auditoria/README.md) aprofundam problemas. Atualizar procedimentos com evidências conforme as [Regras Gerais](../regras-gerais.md).
