# Auditoria 4 — contrato de reconstrução incremental do Cadastro Mestre

## 1. Objetivo, status e fontes

**CONCLUÍDO — auditoria e especificação propostas; contrato não aprovado, não implementado e ainda não liberado para implementação.** Esta etapa responde exatamente quais mudanças a futura carga poderia propor, quais dados deve preservar e quais escolhas precisam de aprovação. Regras abaixo são recomendações verificáveis, não uma alteração da arquitetura oficial.

A proposta é **atualização incremental não destrutiva do Master**, mesmo quando a entrada é um arquivo integral: comparar/adicionar/atualizar somente o que estiver explicitamente autorizado; ausência ou filtro não apagam identidades. Não é possível obtê-la apenas trocando uma flag do executor atual.

Auditoria em **30/10/2026**, America/Sao_Paulo. HEAD `486b646b25d0929dedb80804493cdcd88b34e537`. O checkout já continha alterações documentais e seis arquivos das Auditorias 1/2/3; foram preservados. Nenhum código, teste, importer, executor ou configuração foi alterado.

### Fontes obrigatórias e limites

Consultados [AGENTS](../../AGENTS.md), [README](../../README.md), [Regras Gerais](../regras-gerais.md), [Manual Técnico](../manuais/manual-tecnico.md), [Manual de Operação](../manuais/manual-operacao.md), [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md) e [Engenharia Supabase](../engenharia-dados-supabase.md), além dos contratos de [reconstrução integral](../arquitetura/cadastro-mestre-reconstrucao.md), [execução web](../arquitetura/cadastro-mestre-execucao-web.md), [famílias](../arquitetura/cadastro-mestre-familias-erp.md) e [executor comercial isolado](../arquitetura/cadastro-mestre-comercial-executor-isolado.md).

Referências preservadas: [Auditoria 1](cadastro-mestre-classificacao-validacao.md), [evidências 1](cadastro-mestre-classificacao-evidencias.json), [Auditoria 2](cadastro-mestre-reconciliacao-validacao.md), [evidências 2](cadastro-mestre-reconciliacao-evidencias.json), [Auditoria 3](cadastro-mestre-universo-canonico.md), [evidências 3](cadastro-mestre-universo-canonico-evidencias.json). **`auditoria-cadastro-mestre.md` não existe no checkout**, conforme inventário repetido; não foi declarado como lido nem recriado como histórico.

Supabase Custos-Germani, `umpebdovrazzrdndhigc`, conexão Primary: apenas SELECTs administrativos pelo conector para revalidar 12 tabelas públicas e oito históricas. Sem RPC, SQL no frontend ou chamada de executor. As imagens das Auditorias 1–3 foram reutilizadas somente após confirmar hashes integrais iguais. Controle público: **18:04:22 → 18:14:33 UTC** (15:04:22 → 15:14:33 local). Controle histórico:**18:05:31 → 18:14:35 UTC**. Datas exatas ficam no JSON; igualdade é observada, não auditoria contínua contra alteração transitória revertida.

Arquivo comprovado: `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\cadastro mestre 22_10.xls`, Sheet1, 6.255 linhas, 24.405.643 bytes, SHA-256 **46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff**, revalidado nesta tarefa. Os dados do adapter oficial já auditados foram reutilizados; sem editar, converter, importar ou executar macros/fórmulas. Não equivale ao ERP ao vivo.

[Evidências desta auditoria](cadastro-mestre-contrato-reconstrucao-evidencias.json) contêm hashes dos relatórios/código, matrizes, 30 ensaios de normalização, teste de 6.256 identidades observadas, dez cenários sintéticos em memória, casos PRODUZIDA, regras e controles. Resultados atuais foram obtidos com motores puros reais; resultados futuros são **expectativas do contrato**, sem executor incremental implementado ou persistência de estados simulados.

## 2. Fluxo atual real

| Etapa | Código/função | Entrada → saída / regra | Modifica dados? | Informação perdida ou decisão implícita |
| --- | --- | --- | --- | --- |
| Leitura | src/services/cadastro-mestre-preview.js:mapearPlanilhaCadastroMestre / lerArquivoCadastroMestre | XLS/XLSX/XLSM → linhas/colunas/aba/linha física; primeira aba por padrão; zeros por máscara 000000 de inteiro seguro | Só memória | Outras abas, colunas não mapeadas e linhas completamente vazias ficam fora do transporte; cinco grupos ERP não são todos persistidos |
| Identidade | core/cadastro-mestre-preview-engine.js:codigoSeguro; core/spreadsheet-engine.js:normalizeCodigoProduto | Número exige safe integer no Preview; texto passa pelo helper; presença física registrada antes do filtro | Só memória | Helper não é idempotente universal; texto científico pode perder precisão; valor original não vira chave separada |
| Filtro | core/cadastro-mestre-preview-engine.js:motivoFiltro | Tipo P/C → /produzido\|revenda/i → rejeita /inativo\|exluir/i | Só memória; excluídos com motivo | PRODUZIDA não passa; EXCLUIR não é EXLUIR; código inválido em linha filtrada pode ficar só como exclusão |
| Validação/Preview | core/cadastro-mestre-preview-engine.js:criarPreviewCadastroMestre | Duplicidade por código, erros em elegíveis, campos fornecidos/vazios, resolução exata de categorias | Só memória | Resolver catálogo é diferente de admitir identidade; pendência de categoria não bloqueia necessariamente dado ERP bruto |
| Catálogos | core/cadastro-mestre-familias-engine.js:proporCatalogoFamiliasCadastroMestre | Família por código; conflitos em todas as ocorrências do código do universo; comercial também verifica conflitos de rótulos | Só propostas | Novo rótulo de categoria pode afetar produtos fora do arquivo |
| Reconciliação | core/cadastro-mestre-approval-engine.js:criarManifestoCadastroMestre | Com modo RECONSTRUCAO_UNIVERSO, todos Master fora dos elegíveis viram DELETE proposto; preenchidos mudam seis campos ERP; blank comercial limpa | Só manifesto | Desaparecimento e filtro causam remoção do Master; proteção física do Operacional não impede efeito analítico em Custos |
| Transporte | core/cadastro-mestre-execution-data.js:criarFonteManifestoDadosCadastroMestre; src/services/cadastro-mestre-preview.js:prepararAprovacaoDadosCadastroMestre | V3: linha + dez posições; hashes dados/contexto; modo fixo RECONSTRUCAO_UNIVERSO | Só memória/POST autorizado | Binário não vai ao servidor web; hash de arquivo é declarado; modo INCREMENTAL histórico não é fluxo executável atual |
| Aprovação/plano | view/ui-cadastro-mestre-preview.js:executarAprovado; core/cadastro-mestre-reconstruction-engine.js:criarPlanoReconstrucaoCadastroMestre | Todas operações aprovadas, universo não vazio, sem erros; confirmação; V2 obrigatório | Sem DML no frontend | Revisão antiga é inválida com contexto/arquivo divergente; aprovação local não é prova de execução |
| Persistência geral | scripts/lib/cadastro-mestre-reconstruction.mjs:executarReconstrucaoCadastroMestre | Locks; revalidação; log/snapshot durável; INSERT/UPDATE/DELETE Master e famílias aprovadas; provas; COMMIT/rollback | Escrita real somente quando executor autorizado é chamado; não chamado na auditoria | DELETE em linha 200; COMMIT perdido é indeterminado; não há restauração automática |
| Persistência isolada comercial | scripts/lib/cadastro-mestre-comercial.mjs:validarCargaComercial / executarCargaComercial | Fotografia inicial específica: 6230/860/162/324; somente UPDATE dos dois campos comerciais; imagens integrais | Executor separado; não chamado | Não é importador incremental; sem novo log/timestamps/FK; segunda execução contra fotografia inicial diverge |
| Classificação em leitura | core/custos-classification-engine.js:classificarCustos; src/services/api.js:getApontamentosOp | Custos: Master presente manda origem/família; OP: Operacional; grupo permanece operacional | Projeção sem escrita | Inclusão/alteração/remoção Master muda classificação atual de Custos sem alterar um único fato |

### Onde inclusão, atualização, exclusão, classificação e preservação são decididas

- **Inclusão:** `criarPreviewCadastroMestre` compara exclusivamente contra Master; `criarManifestoCadastroMestre` gera NOVO_PRODUTO/INSERT quando elegível e ausente. Um código já existente em Operacional/Custo/OP ainda aparece como novo no Master, sem ser uma nova identidade global.
- **Atualização/preservação:** `CAMPOS_CADASTRO_MESTRE` e `diferencas` no Preview calculam os seis campos ERP. Preenchido diferente propõe patch; quatro campos comuns vazios preservam; comerciais presentes vazios podem limpar. Coluna ausente preserva. O plano consolida patches por produto.
- **Exclusão:** [approval-engine](../../core/cadastro-mestre-approval-engine.js), cálculo de `preservados/remocoes` e operação `REMOVER_FORA_UNIVERSO`; [plano](../../core/cadastro-mestre-reconstruction-engine.js) carrega a lista; [executor](../../scripts/lib/cadastro-mestre-reconstruction.mjs), linha 200, executa DELETE parametrizado dessas identidades do **Master**, após aprovação/revalidação.
- **Classificação:** [classificarCustos](../../core/custos-classification-engine.js) projeta origem/família do Master quando presente, inclusive campos vazios/sem resolução; fallback apenas fora dele. OP utiliza [resolveProductClassification](../../core/product-master-engine.js) sobre o Operacional. Agrupamento não vem do ERP.
- **Proteção física:** executor geral protege Operacional/mapa/fatos e permite somente Master/log e famílias aprovadas. Isso **não congela a classificação analítica atual**: inserir, atualizar ou remover Master pode trocar o resultado de Custos sem alterar fatos/Operacional.

O modo `INCREMENTAL` que ainda existe no núcleo histórico **não é o contrato executado pela tela**: transporte fixa RECONSTRUCAO_UNIVERSO, plano exige V2 e universo integral. O método legado `api.importProductMasterXlsm` escreve o Operacional por outro contrato, inclusive resolução histórica por texto/ID; não deve ser ligado à proposta como atalho.

### Executor comercial isolado

[validarCargaComercial/ executarCargaComercial](../../scripts/lib/cadastro-mestre-comercial.mjs) aceitam uma fotografia específica inicial: 6.230 linhas, 860 identidades existentes, 162 atualizações/324 valores, 698 pares NULL, zero novos/conflitos/remoções. Revalidam bytes/manifesto/contexto; sob locks fazem somente UPDATE do par comercial, mantendo timestamps/FKs/logs e provas integrais das outras tabelas. **Não são um importador incremental genérico.**

Na repetição, a fotografia inicial NULL deixa de coincidir; o comportamento é bloqueio, não retorno idempotente genérico. Não grava novo log: sua auditoria é a fotografia/manifesto/resultado externo. Não foi invocado; o preenchimento remoto atual de 162 pares não prova execução desse caminho.

## 3. Identidade e idempotência do helper

A identidade compartilhada continua sendo **`codigo_produto` normalizado**; `cod_produto` de OP usa o mesmo domínio. Isso não significa que qualquer entrada aceita pelo helper seja segura para admissão empresarial.

Normalização em [spreadsheet-engine](../../core/spreadsheet-engine.js), linhas 157–194: NFKC, remoção de invisíveis/espaços, tratamento de milhar, ciência e decimal terminado em zero; não faz uppercase nem remove zeros de texto por cast generalizado. Preview chama `codigoSeguro`; números precisam ser inteiros seguros e tipo precisa ser string/number.

| Entrada / tipo | Resultado 1× | Resultado 2× | Conclusão |
| --- | --- | --- | --- |
| "000001" texto | 000001 | 000001 | Zeros preservados |
| 1 número | 1 | 1 | Zeros perdidos antes da leitura não podem ser inventados |
| "1.000" / "1,000" / "1e3" | 1000 | 1000 | Representações distintas convergem; repetidas no arquivo são duplicidade |
| "001.000" | 001000 | 001000 | Zeros textuais preservados no resultado |
| "1.5" ou "1e-3" | vazio | vazio | Fração rejeitada |
| "-1" ASCII | vazio | vazio | Negativo rejeitado |
| "++1" | +1 | 1 | NÃO idempotente |
| "+-1" | -1 | vazio | NÃO idempotente |
| "+++001" | ++001 | +001 | NÃO idempotente |
| "9007199254740993e0" | 9007199254740992 | 9007199254740992 | Idempotência não prova precisão; conversão perdeu unidade |
| "+1.000" | 1 | 1 | Diferente de "1.000"→1000; forma ambígua para admissão |
| "−1" com menos Unicode | −1 | −1 | Helper não rejeita como negativo ASCII; requer política de entrada |
| "AB 001" e invisíveis | AB001 | AB001 | Convergem; não é alias empresarial |
| "ab001" / "AB001" | ab001 / AB001 | mesmos | Sem fusão por caixa |

**Resultado:** 30 ensaios sintéticos; três não idempotentes. Nos **6.256 códigos reais observados (arquivo ∪ fontes)**, zero alterações pelo helper, zero instabilidades e zero colisões encontradas nas auditorias anteriores. O achado sintético não altera nem invalida essas contagens e não comprova ocorrência/persistência de código malformado em produção.

O Preview real aceitou sinteticamente `++1`, `+-1`, `+1.000` e ciência textual imprecisa, mas rejeitou número unsafe e booleano. O helper isolado converte booleanos/objetos em texto; o Preview os rejeita por tipo. Três representações de 1000 no mesmo arquivo geraram erro de duplicidade real. Não confundir contrato do helper com o da fronteira.

**Regra proposta:** reutilizar o helper, sem alterá-lo nesta etapa, e exigir na admissão futura resultado não vazio e estável; rejeitar números inseguros e ciência fora do domínio seguro; encaminhar forma numérica ambígua/sinal não contratado para correção/revisão antes do lote. Uma segunda aplicação não deve “corrigir” o código. Preservar bruto/tipo/máscara, pois estabilidade sozinha não detecta perda de precisão. Sem gramática aprovada de entrada, esses casos bloqueiam a implementação, em vez de ganhar interpretação escondida.

## 4. Admissão de novos produtos

| Caso | Situação | Identidade | Inclusão/preservação proposta | Classificação | Revisão e proveniência |
| --- | --- | --- | --- | --- | --- |
| A | Não existe em nenhuma fonte | Novo código candidato, não nova chave técnica | INSERT somente Master se identidade segura, elegibilidade aprovada e revisão integral; não cria Operacional automaticamente | Sem classe Kustos inventada; categorias resolvidas por código ou pendência explícita | Aprovar admissão/universo; origem do arquivo/linha e primeiro evento observado |
| B | Novo no Master, já no Operacional | Mesma identidade existente | Proposta de acrescentar fonte ERP; preservar Operacional integral | Simular precedência de Custos antes de incluir Master; manual/unknown protegido | Revisão dos campos ERP e impacto; registrar ambas as imagens |
| C | Novo no Master, já em Custo | Mesma identidade do fato | Preservar todos os fatos; verificar Operacional, mas ausência não cria outra identidade | Inserir Master pode trocar fallback por ERP; impacto obrigatório | Revisão de impacto inclusive perda de resolução; não regravar fato |
| D | Novo no Master, já em OP | Mesma identidade de OP | Preservar eventos e origem de classificação OP; evidenciar cadastro operacional ausente | Não criar FK fictícia nem preencher grupo | Revisar lacunas e admissão ERP; registrar OP como observação anterior |
| E | Existente no Kustos, ausente do arquivo | Continua existindo | Não remover/desativar Master/Operacional; marcar ausência apenas na evidência da carga | Preservar classificação e histórico | Ausência não significa inatividade; registrar escopo integral/delta e validade da fonte |
| F | Fisicamente no ERP, rejeitado pelo filtro | Identidade observada/preservada; elegibilidade separada | Não inserir nem remover automaticamente; exceção depende de regra empresarial aprovada | Manter classificação existente; sem categoria inferida | Motivo/língua/código de origem e decisão, sem reescrever filtro nesta auditoria |

**Escopo base proposto:** cargas ERP escrevem Master e sua auditoria, não criam uma segunda dimensão nem sincronizam silenciosamente Operacional. Se a política aprovar categorias de família no mesmo lote, esse segmento terá aprovação própria e prova global conforme contrato existente; não é autorização automática de categoria nova.

Código com fatos já é identidade observada mesmo sem Master/Operacional. A inclusão de nova linha Master precisa mostrar o impacto de precedência em Custos. Os dez cadastros operacionais ausentes da Auditoria 3 permanecem uma pendência de reconciliação, não algo a “resolver” inserindo todos durante esta carga.

## 5. Master não pode apagar identidades — proposta e diferença vigente

**Hoje:** arquivo → universo elegível → remoções propostas → aprovação integral → DELETE Master. Ausência física e exclusão pelo filtro têm motivos distintos, mas ambos podem remover do Master. Não há DELETE de Operacional/fatos nesse executor.

**No incremental proposto:** nenhum desaparecimento do arquivo remove ou desativa Master, Operacional ou identidade observada. Manter valores e registrar o estado de observação na evidência do evento; não criar coluna de estado nesta auditoria. Não permitir remoção apenas porque o arquivo ficou menor.

| Estado | O que prova | Ação proposta |
| --- | --- | --- |
| AUSENTE_NO_ARQUIVO | Não foi observado no escopo recebido; completude pode ser desconhecida | Preservar; em delta nem inferir ausência empresarial |
| INATIVO | Marcador textual ou estado empresarial se documentado | Revisar política; não apagar identidade/classificação/histórico |
| EXCLUÍDO EXPLICITAMENTE | Só é comando se protocolo empresarial de remoção existir e estiver aprovado | Fora do fluxo automático incremental; autorização específica e reversão |
| FORA_DO_FILTRO | Está fisicamente presente mas não elegível | Preservar existente e motivo; não converter em ausência |
| NÃO ENCONTRADO | Resultado de busca/catálogo ou erro de fonte são estados diferentes | Identificar fonte/estado; leitura indisponível bloqueia, nunca conjunto vazio |

A regra proposta muda expressamente o contrato integral vigente de remoções; só aprovação posterior pode oficializá-la. Esta auditoria não muda a UI nem autoriza executar o executor integral como se fosse incremental.

## 6. Regra de blank

| Campo | Se já existe valor Kustos | Se já existe valor ERP | Se nunca houve valor | Coluna ausente / marcador | Regra operacional proposta |
| --- | --- | --- | --- | --- | --- |
| Descrição ERP | Preserva atual | Preserva atual | Continua sem valor; exibir pendência | Omitido preserva; literal NULL não é comando | Correção/limpeza não inferida; requer ação/decisão própria |
| Origem ERP | Não altera origem_id Kustos | Preserva origem_cod anterior | Permanece NULL/pendente | Resolver por código exato, não descrição/ID | Mudança preenchida exige revisão e efeito em Custos |
| Família ERP | Não altera familia_id Kustos | Preserva familia_cod anterior | Permanece NULL/pendente | Não criar categoria automaticamente | Conflito/novo catálogo exige revisão separada |
| Agrup. Prod. ERP | Não altera agrupamento_cod Kustos | Preserva agrupamento_erp_valor | Permanece NULL | Nenhuma ponte Pxxx→Mxxx | Remoção explícita exige decisão fora do blank comum |
| Agrup. Com. código/descrição | Jamais apaga campo Kustos | Coluna presente vazia propõe NULL em cada campo comercial, conforme exceção vigente | Permanece NULL | Coluna ausente preserva; par parcial não é completado | Aplicar somente limpeza ERP comercial explícita e aprovada; não ampliar aos demais |
| Agrup. Est./Custos/Fiscal ERP | Sem efeito Kustos | Não há persistência equivalente no Master | Apenas evidência de fonte | Fora do transporte/destino atuais | Adicionar persistência/ponte é outra decisão, não parte do contrato base |
| Origem/família/agrupamento/override Kustos | Preservar todo valor preenchido ou NULL | Não são campos ERP do Master | Não preencher por inferência | Somente manutenção Kustos autorizada em outro fluxo | Marcador textual ERP não manda limpar manual |

A exceção comercial já foi decisão humana em CAD-COM-01: **célula vazia em coluna presente propõe NULL; coluna ausente preserva**. Recomenda-se mantê-la delimitada e explícita no novo contrato, com aprovação da limpeza. Não generalizar “todo blank preserva” nem “todo NULL apaga”. Código e descrição comerciais são independentes; pares parciais não são completados.

Os textos `NULL`, `EXCLUIR`, `REMOVER` e `INATIVO` não são automaticamente comandos de apagar um campo. `textoCadastro` apenas trim/converte escalar; eventual interpretação especial exige protocolo aprovado. A regex atual usa **EXLUIR**, não EXCLUIR. Inatividade textual é elegibilidade, não uma coluna de estado da identidade.

Edição manual operacional é outra operação: `buildManualProductMasterPayload` permite limpar `agrupamento_cod` explicitamente vazio/null. Isso não autoriza uma carga ERP a imitá-la. Nos demais campos operacionais o payload legado preserva vazios; não usar esse helper como política universal de blank ERP.

## 7. Autoridade por campo

| Campo | ERP | Operacional | Kustos/manual | Autoridade proposta |
| --- | --- | --- | --- | --- |
| codigo_produto | Observação no arquivo | Observação no cadastro/fatos | Não renomeia nem funde código | Helper existente + validação de segurança; relação por código estável, nunca descrição |
| Descrição | Autoridade sobre descricao do Master | Autoridade sobre descricao operacional; fatos preservam snapshot | Editor do seu campo, sem sobrescrita pela carga | Campos por fonte; ERP preenchido propõe revisão de Master, não padronização transversal |
| Origem | origem_cod bruto; Custos resolve pelo catálogo quando Master existe | origem_id; OP e fallback Custos | Preservar valor/autor desconhecido; revisão própria | Conservar autoridade atual em leitura; mudanças ERP exigem revisão do impacto, não sync |
| Família | familia_cod bruto; propostas de catálogo separadas | familia_id; OP/fallback | Preservar valor/override e dependências globais | Código exato→ID somente na regra existente; sem bridge textual ou recategorização automática |
| Agrupamento | Prod./Com. e demais grupos são dados ERP distintos | agrupamento_cod efetivo Kustos | Manutenção Kustos; vazio explícito no editor pode limpar | Carga ERP não escreve grupo/override/proveniência Kustos |
| Override/manual | Não fornece decisão de override Kustos | Campos existentes devem permanecer íntegros | Responsável humano de manutenção decide | Não ativar novo algoritmo de precedência; colunas de override não provam uso pelo runtime |

**Atualização automática antes de decisão/política aprovada: nenhuma escrita de negócio.** Depois da aprovação integral de um lote e de seus efeitos, a aplicação técnica pode executar somente os patches ERP explicitamente previstos, de maneira atômica. Não delegar ao implementador decidir que “ERP sempre vence” ou que “manual sempre é identificável”.

O escopo dos seis campos ERP é descrição, origem_cod, familia_cod, agrupamento_erp_valor e o par comercial. Mudanças de timestamp/FK acompanham somente escritas efetivas conforme política, nunca um no-op usado para fingir nova origem de criação. Valores operacionais com autoria desconhecida são protegidos igual aos declarados manuais.

## 8. Conflitos

| Tipo | Exemplo/ocorrência | Conduta proposta | Evidência a manter |
| --- | --- | --- | --- |
| Duplicidade por código/canônico | Mesmo ou diferentes rótulos | Bloquear lote inteiro; sem first/last-wins nem dedup silencioso | Preservar todas as linhas físicas |
| Código instável/impreciso | ++1; +-1; ciência fora de safe integer | Bloquear antes de persistir; corrigir fonte/contrato de entrada, não normalizar repetidamente | Valor bruto, tipo/máscara, resultados 1×/2× |
| Descrição diferente | Master/Operacional ou snapshots | Não fundir nem copiar entre fontes; propor somente campo ERP e revisar | Ambos + vigente/recebido + aprovação |
| Origem/família diferentes | Entre ERP e Kustos ou ERP anterior | Preservar Kustos; patch Master só após impacto aprovado; categoria ambígua bloqueia | Códigos e IDs separados, classe efetiva antes/depois |
| Agrupamentos diferentes | ERP P/C/U/GAF vs Kustos Mxxx | Não são equivalentes; não bridge/overwrite | Cinco campos originais separados do grupo Kustos |
| Código de categoria com rótulos conflitantes | Família/comercial do universo | Bloquear lote conforme guarda atual; sem vencedor inferido | Todas ocorrências, inclusive filtradas que referenciam código efetivo |
| Categoria nova/ausente | ERP bruto sem catálogo correspondente | Pode permanecer dado ERP bruto apenas com pendência e impacto explícitos; criar família exige aprovação separada | Ausente/ambíguo/vazio não se confundem |
| Blank comercial contra valor anterior | Coluna presente e célula vazia | Propor limpeza somente comercial; pendente impede lote até decisão | Imagem anterior, recebido NULL, fornecido=true |
| Marcador remover/inativo/excluir | Texto ou sinal não contratado | Nenhuma exclusão/desativação automática; revisar sem converter literal em comando | Estado de observação, fonte e intenção explícita |
| Contexto/concorrrência divergente | Mudança após aprovação | Bloquear/regerar Preview, sem aplicar subconjunto válido | Hash/imagem/contexto anterior e novo |
| Lote repetido/COMMIT desconhecido | Mesma intenção ou resposta perdida | Consultar execução; nunca retry cego; conflito de conteúdo sob mesmo ID bloqueia | ID estável, hash, status, prova/snapshot |

Código de família `80002` no ERP versus `42502` no Operacional de `000001` e embalagens 9×/10× nos códigos da Auditoria 3 continuam **sem resolução**. São casos reais de revisão, não fixtures para serem corrigidas.

Bloqueio técnico, pendência de negócio e preservação são resultados distintos: preservar não equivale a aprovar o valor existente; manter ambos na evidência não significa duplicar a identidade. Proposta pendente/rejeitada impede execução integral desse lote; retirar item exige novo escopo/manifesto e revisão, não aplicar o resto silenciosamente.

## 9. Proteção da classificação Kustos e precedência

| ERP | Kustos | Override | Hoje | Contrato incremental proposto |
| --- | --- | --- | --- | --- |
| Vazio | Preenchido | Ausente | Master mantém blank comum; comercial pode propor limpeza; Kustos não é escrito | Preservar Kustos; revisar limpeza comercial e qualquer efeito de Master |
| Preenchido igual | Preenchido | Ausente | No-op ERP quando igual; leitura segue fonte do módulo | Sem patch de classificação/timestamp por simples observação |
| Preenchido diferente | Preenchido | Ausente | Pode mudar Master após aprovação; Custos pode mudar; OP não | Revisão de ERP e impacto; não sobrescrever Operacional |
| Preenchido | Vazio | Ausente | Master pode resolver Custos; OP continua sem classificação operacional | Não preencher Operacional automaticamente; tornar lacuna/efeito explícitos |
| Vazio | Vazio | Ausente | Ausência continua; grupo não é inferido | Preservar desconhecido; não criar zero/categoria/sentinela |
| Qualquer | Qualquer | Presente | classificarCustos usa agrupamento_cod, não deriva novo valor de override | Preservar grupo, override e proveniência; não ativar nova precedência |
| Qualquer | Qualquer | Ausente | Ausência de override não prova origem ERP do valor | Não autoriza overwrite; autoria desconhecida permanece desconhecida |

A prova sintética **SIM-10** insere um Master com família NULL para um código cujo Operacional possui F1. A função real `classificarCustos` passa de **F1 para NULL**, mesmo com Operacional e fatos intactos. Grupo M001 não muda. Logo, “não escrever Operacional” é necessário, mas insuficiente para garantir que a carga não degrade a análise.

**Guarda proposta de impacto:** comparar antes/depois da presença Master, origem/família/resolução, rótulos de categorias e classificações efetivas de todos os produtos afetados, inclusive dependentes de catálogo fora do arquivo. Exibir perdas, ganhos e mudanças sem atribuir causalidade. Mudança/degradação não aprovada impede o lote; aceitar excepcionalmente campo não resolvido requer decisão expressa, sem alterar o motor ou fazer fallback novo.

## 10. PRODUZIDO × PRODUZIDA

Recontagem sobre o arquivo comprovado, com hashes remotos revalidados:

| Medida | Códigos |
| --- | --- |
| MASSA PRODUZIDA total | 114 |
| Com Custo | 43 |
| Com OP | 38 |
| Com ambos | 38 |
| Sem nenhum fato | 71 |
| Marcados INATIVO | 19 |
| Participam da união persistida | 112 |
| Somente no arquivo físico | 2 |

São dois rótulos, 57 códigos em FARDO/CX e 57 em PCT. Os 43/38 estão no primeiro; os 38 OP também têm Custos. As métricas se sobrepõem: 43 + 38 não é a quantidade de produtos com fatos.

A divergência **literal/textual está comprovada**: PRODUZIDA não corresponde à regex PRODUZIDO. O arquivo demonstra uma taxonomia ERP com MASSA PRODUZIDA. Não há evidência suficiente para declarar que toda a exclusão é só um bug de linguagem ou que todos os 114 devam entrar. Há INATIVO e naturezas distintas.

**Decisão de negócio pendente:** admitir quais códigos/naturezas por regra versionada, por código de origem ou outro critério empresarial aprovado; tratar também INATIVO e EXLUIR/EXCLUIR. Não propor apenas substituição textual e carga. Nenhum filtro foi alterado.

## 11. Integral × delta

| Dimensão | Entrada integral | Entrada delta |
| --- | --- | --- |
| Ausência | Integral pode demonstrar não observação apenas com prova de completude; não exclusão | Delta nada diz sobre códigos omitidos |
| Classificação/manual | Mesmo arquivo completo não pode sobrescrever Kustos; impacto global deve ser mostrado | Mesmo cuidado por código recebido e categoria compartilhada |
| Risco | Arquivo incompleto interpretado como universo removível; atual100→90 apaga10Master | Delta fora de ordem pode restaurar valor antigo; precisa vigência/versão da fonte |
| Histórico | Snapshot antes de toda escrita; fatos preservados | Imagens antes/depois do patch e contexto íntegro; fatos preservados |
| Idempotência | Identificador da intenção + fonte/política e verificação de contexto | Mesma base; hash do arquivo sozinho não define intenção ou ordem |
| Reprocessamento | Mesmos bytes com nova intenção podem ser no-op ou requerer revisão após mudança de contexto | Reaplicar delta antigo deve bloquear se ordem/vigência não comprovada; não usar data do arquivo como versão |
| Falha parcial | Atomicidade do lote completo validado | Atomicidade do lote delta validado; chunk não vira transação independente |
| Auditoria | Contagem universo recebido/ausente e fonte comprovada | Contagem códigos recebidos/alterados/preservados; ausência não é estado empresarial |
| Reversibilidade | Snapshot + comparação atual + decisão; sem restauração cega | Patch inverso condicionado à imagem atual e dependências |
| Proveniência | Arquivo, aba, hash, escopo e observação integral | Evento/identificador da fonte e ordem, se disponíveis; desconhecido explícito |

**Recomendação:** aceitar fotografia integral como entrada quando sua completude é demonstrada, mas aplicar **diferenças não destrutivas**; suportar delta somente quando o ERP fornecer semântica/ordem/vigência verificável. “Arquivo integral” e “escrita por patch” não são opostos.

Até decisão, não inferir modo por nome, quantidade de linhas, data do arquivo ou timestamp de upload. Um delta antigo não pode sobrescrever dado novo por ser carregado depois. Se não houver versão empresarial confiável, bloquear replay com alteração conflitante e pedir revisão; conservar valores iguais como no-op. Política e escopo precisam integrar manifesto/decisão, sem aumentar teto web nem enviar contexto duplicado desnecessariamente.

## 12. Reprocessamento — simulações somente em memória

| Cenário | Plano atual observado | Resultado esperado do contrato proposto |
| --- | --- | --- |
| SIM-01 — mesma carga duas vezes | Primeira:100 inserts; segunda:0 inserts/updates/remoções;100 identidades | No-op de dados na segunda; mesma intenção consulta execução anterior; sem duplicar identidade |
| SIM-02 — descrição alterada | 1 produto atualizado no plano aprovado sintético | 1 proposta;0 escritas antes de aprovação; depois altera somente descrição ERP autorizada |
| SIM-03 — ERP vazio | Quatro campos comuns preservados;2 comerciais propõem NULL | Preservar até aprovação; depois somente limpeza comercial expressa; Kustos intocado |
| SIM-04 — arquivo100→90 | 10 DELETE por AUSENTE_NO_ARQUIVO; Master90 | Master100;10 ausentes evidenciados;0 DELETE/desativação |
| SIM-05 — arquivo100→110 | 10 INSERT; Master110 | 10 candidatos; Master100 antes da aprovação e110 após admissão aprovada;0 criação operacional automática |
| SIM-06 — Operacional sem ERP | Executor atual não toca OPONLY | Conserva identidade/Operacional; não cria Master por ausência; fatos intocados |
| SIM-07 — Custo/OP fora do filtro | FACT101 não entra Master | Preserva identidade e fatos; admissão Master depende de elegibilidade/impacto |
| SIM-08 — Master passa a ser filtrado | Remove1 por FORA_DO_CONJUNTO_FILTRADO; Master99 | Preserva Master100; estado PRESENTE_FORA_FILTRO |
| SIM-09 — código duplicado | Lote bloqueado por duplicidade nas linhas2/102 | Lote bloqueado;0 escrita; sem vencedor |
| SIM-10 — Master novo sem família | Classificação Custos F1→NULL; grupoM001 preservado | Inserção bloqueada sem decisão de impacto; F1 permanece enquanto não há escrita |

Os resultados atuais usam `criarManifestoCadastroMestre`, revisão/aprovação **sintéticas**, `criarPlanoReconstrucaoCadastroMestre` e projeção da lista de operações em objetos JS descartáveis. Não foi usado executor SQL, PGlite, arquivo real de carga para simular aprovação nem persistência desses estados. Resultados propostos são expectativas verificadas quanto à coerência/invariantes, **não teste de uma implementação futura**. O JSON contém entradas-resumo e saídas por cenário.

### Idempotência operacional

A idempotência de código, de dados, de intenção de execução e de resposta são garantias diferentes.

- Atual: mesmo identificador de lote registrado é bloqueado; não retorna necessariamente o resultado anterior. Outra intenção/lote exige novo contexto/Preview e pode gerar novo log/snapshot mesmo sem mudança Master. Manifesto/contexto antigo é recusado após a primeira escrita. Executor comercial isolado bloqueia fotografia inicial divergente.
- Proposta: a mesma intenção conserva ID, conteúdo, política e escopo; consultar resultado confirmado e retornar/explicar o estado, sem novo DML. Mesmo ID com fonte/decisões diferentes bloqueia. Nova intenção com mesmos bytes é avaliada contra contexto atual; se tudo igual, zero patch e timestamps preservados, com observação auditada separada.
- Hash de arquivo sozinho não é idempotência: mesma fonte pode ser legítima em outra intenção/contexto. Hash de manifesto inclui contexto e pode mudar depois da primeira execução; não pode ser a única identidade de retry.
- COMMIT desconhecido mantém a intenção original e exige consulta/prova. Não gerar ID novo para contornar incerteza. A capacidade de consulta existente pode ser reutilizada, mas o comportamento futuro de resposta idempotente ainda precisa implementação/testes.

## 13. Falha parcial

**Contrato proposto: lote indivisível dos patches aprovados.** Linhas válidas não autorizam publicar parte quando há inválidas, ambíguas, duplicadas, conflito de catálogo ou decisões pendentes. Validar identidade em todas as linhas **antes** de permitir que o filtro esconda erros. Arquivo vazio/incompleto/inacessível ou contexto não íntegro bloqueia.

| Falha | Resultado de negócio proposto | Auditoria / recuperação |
| --- | --- | --- |
| Inválida/ambígua/duplicada | 0 escrita cadastral; lote não elegível | Lista completa com bruto, linha, motivo e escopo; não é falha operacional |
| Categoria/conflito/impacto sem decisão | 0 escrita enquanto pendente | Distinguir categoria ausente de ambígua; não tratar como zero |
| Persistência em uma operação | Rollback de todos os patches e catálogos do lote | Provar imagens/contagens; log falhou separado do estado cadastral |
| Snapshot/auditoria indisponível | Não iniciar/publicar DML de negócio | Falha anterior ao log pode não ter log remoto; conservar evidência local/servidor sanitizada |
| Rollback/COMMIT sem confirmação | Estado indeterminado, nunca sucesso parcial presumido | Consultar lote/imagens; sem retry automático |
| Parte processada antes da falha | Trabalho intermediário não vira estado publicado | Chunk é transporte, não unidade de commit de cadastro |

Balanço proposto por linhas físicas de dados não vazias, com precedência sem dupla contagem: **L = inválidas + duplicadas + válidas não elegíveis + válidas elegíveis**. Duplicidade conta cada linha envolvida uma vez nesse balanço; motivos adicionais são flags. Para códigos elegíveis únicos: **E = novos no Master + existentes**; existentes = com proposta + sem mudança. Erro de categoria/decisão é dimensão separada, não nova linha. Lote bloqueado tem aplicados=0; lote confirmado tem todos os patches aprovados aplicados e remoções incrementais=0, com contagens separadas de produtos e campos. Falha de fechamento/estado indeterminado não pode fabricar reconciliação.

## 14. Proveniência — capacidade atual e alvo

| Pergunta | O que existe hoje | O que o contrato futuro precisa garantir |
| --- | --- | --- |
| Qual arquivo trouxe o código? | Master tem lote/arquivo/hash em parte das linhas;604 últimas escritas vinculadas; fonte física coincide lote5 | Evento de observação por código/linha, inclusive preservado/não elegível, com origem e limites do hash |
| Quando observado? | criado_em/atualizado_em e datas dos logs não equivalem a primeira/última observação universal | Separar observado_em/importado_em/competência; não reescrever criado_em para uma observação |
| Valor recebido do ERP? | Fonte/dados compactos existem no pedido; metadados do executor não guardam integralmente todos os valores recebidos/patches por campo de produto | Guardar bruto/tipo/presença da coluna e normalizado dos campos consumidos, sem inferir campos não recebidos |
| Valor anterior e alterado? | Snapshot Master completo anterior, hash final e atual sobrevivente; famílias têm prova própria | Antes/recebido/proposto/efetivo por campo; imagem pós-evento ou prova suficiente para revisão/reversão futura |
| O que foi preservado? | Núcleo calcula preservações; nem toda decisão por campo fica detalhada no log de execução atual | Registrar motivo: omitido/blank/igual/manual/conflito/filtro, sem fingir escrita |
| Houve decisão humana? | Revisão vinculada ao manifesto; autor web vem da sessão, CLI recebe string | Ator/decisão/escopo/tempo, origem da autoridade e política; não atribuir autoria anterior desconhecida |
| Qual execução? | PK/log/identificador_lote no geral; comercial isolado só prova externa | Intenção estável, resultado e vínculo de patch; última escrita não é última observação |

Operacional tem 6.113 atualizado_em, mas não possui batch/arquivo/autor por produto; override/proveniência de grupo estão vazios. Custos tem349 vínculos ao lote31 e2.132 NULL; OP possui1.469 vínculos a oito logs, sem hash/autor por coluna. Não fabricar origem para o legado.

JSONB existente de log/snapshots e artefatos privados podem ser avaliados para ampliar evidência, **sem concluir que schema novo é necessário**. Esta auditoria não cria estrutura. Campos ERP não transportados (Est./Custos/Fiscal), original web não enviado e máscara perdida precisam de limitação explícita ou desenho aprovado de preservação da fonte. Hash declarado no browser não é prova independente dos bytes ERP. Não registrar credenciais ou contexto sensível desnecessário.

## 15. Reversibilidade

| Alteração | Classificação | Condição |
| --- | --- | --- |
| Inclusão Master | Reversível com histórico + decisão | Remover associação ERP só com análise de impacto; nunca apagar identidade/fatos por undo; preservar se passou a ser referenciada |
| Descrição ERP | Reversível com histórico | Restaurar campo anterior apenas se valor atual ainda é o pós-lote e sem decisão posterior conflitante |
| Origem ERP | Reversível com histórico + decisão | Mesma condição e recomputar impacto em Custos; não regravar histórico |
| Família ERP/catálogo | Reversível com histórico + decisão | Catálogo compartilhado exige todos os dependentes; família nova com referências não é removida automaticamente |
| Classificação Kustos | Não deve ocorrer automaticamente | Fora do fluxo ERP proposto; se alterada por outra operação, recuperação é contrato próprio |
| Remoção/desativação | Não deve ocorrer automaticamente | Não faz parte do incremental; recuperação de remoções históricas usa snapshot e autorização, nunca completar por inferência |
| Transação em falha antes do COMMIT | Reversível transacionalmente quando rollback confirmado | Snapshot/log/provas necessários; resposta perdida torna estado indeterminado, não prova de reversão |

O executor geral faz rollback em transação e guarda snapshot anterior; isso não implementa “desfazer lote” depois de COMMIT. O comercial isolado usa fotografia externa e não cria log novo. A proposta deve guardar antes/depois suficiente e conferir que o estado corrente ainda corresponde ao pós-lote antes de qualquer patch inverso. Mudança posterior, novo fato ou referência bloqueia reversão automática e exige plano humano.

Nenhuma inclusão deve ser desfeita apagando a identidade global que ganhou fatos. Remover associação/fonte ERP é diferente de remover produto do Kustos. Restauração cega de snapshot integral pode apagar decisões posteriores; não é o procedimento recomendado.

## 16. Guardrails contra destruição

| Evento ERP | Pode apagar identidade? | Pode apagar classificação? | Pode alterar fato histórico? | Pode exigir revisão? |
| --- | --- | --- | --- | --- |
| Código novo | NÃO | NÃO | NÃO | SIM — admissão/impacto |
| Código ausente | NÃO | NÃO | NÃO | SIM — escopo/qualidade da fonte |
| Campo vazio | NÃO | NÃO em Kustos; comercial ERP pode propor limpeza aprovada | NÃO | SIM — exceção comercial ou intenção de remoção |
| Campo alterado | NÃO | NÃO silenciosamente; efeito analítico deve ser revisado | NÃO | SIM — patch/impacto |
| Produto inativo | NÃO | NÃO | NÃO | SIM — política de estado futura |
| Produto fora do filtro | NÃO | NÃO | NÃO | SIM — elegibilidade |
| Código inválido/ambíguo | NÃO | NÃO | NÃO | SIM — lote bloqueado |
| Duplicidade | NÃO | NÃO | NÃO | SIM — corrigir fonte, lote bloqueado |

Essas são regras da **proposta incremental**, não descrição de remoções do executor integral atual. “Classificação” inclui valores Kustos e efeito efetivo da leitura; campos comerciais ERP têm sua exceção delimitada e aprovação. Nenhuma limpeza automática amplia o alcance para origem/família/grupo manual ou fatos.

## 17. Contrato final proposto — operacional, não oficializado

- **Identidade:** código canônico estável e entrada segura; descrição não cria identidade nem prova alias.
- **Inclusão:** observar fonte, reconhecer A–F e admitir novo Master somente por política/revisão aprovadas, com impacto analítico explícito. Nada de sincronizar Operacional implicitamente.
- **Atualização:** somente seis campos ERP, proveniência de escrita e catálogos explicitamente aprovados no escopo. Sem patch para valor igual; política/decisão manda, não ordem de chegada de arquivo.
- **Preservação:** manter Operacional/manual/override/mapa e fatos; preservar campos comuns ERP vazios/omitidos. Não mascarar proveniência desconhecida.
- **Ausência:** evento de não observação, sem DELETE/desativação automático. Arquivo integral e delta têm semântica declarada.
- **Blank:** campo ausente, célula vazia e comando explícito são estados diferentes. Comercial conserva exceção aprovada, com proposta clara de limpeza ERP.
- **Conflito:** identidade/duplicidade/catálogo ambíguo bloqueiam; conflitos de conteúdo e impacto exigem decisão e ambas as imagens. Sem decisão, zero escrita.
- **Classificação:** não bridge nem alteração do motor; comparar impacto da regra vigente antes/depois e proteger classificações Kustos. Categoria nova é decisão separada.
- **Histórico:** cadastro não altera nenhum fato, ID, descrição snapshot, custo, métrica OP, competência, criado_em ou vínculo de lote. Isso não transforma o upsert histórico atual em versionamento imutável.
- **Proveniência:** cada observação/decisão/patch deve responder origem, bruto, antes, recebido, proposto, efetivo/preservado, motivo, ator/política e execução quando conhecidos.
- **Reversibilidade:** snapshot/provas duráveis antes do DML, atomicidade e patch inverso condicionado; desfazer após COMMIT exige revisão de dependências/alterações posteriores.
- **Idempotência:** intenção estável consultável; segundo envio não duplica negócio; contexto/conteúdo divergente bloqueia; estado incerto não autoriza retry.

**Resultado exato para a carga de amanhã enquanto não há aprovação/implementação:** o sistema vigente continua podendo executar somente seu contrato integral autorizado; esta auditoria não libera a carga incremental. A futura implementação deverá recusar execução com política, revisão, escopo ou impacto pendentes.

## 18. Regras CAD-XX e critérios de aceite

### CAD-01 — Identidade segura

**PROPOSTA, não aprovada.** Usar normalizeCodigoProduto existente; só admitir código não vazio, estável na segunda aplicação e sem perda de precisão/forma ambígua. Não repetir normalização para “consertar”.

Aceite: 6256 reais estáveis; ++1/+-1 e ciência imprecisa bloqueiam no contrato proposto.

### CAD-02 — Sem equivalência inferida

**PROPOSTA, não aprovada.** Descrição/unidade/categoria não renomeia nem funde códigos. Preservar representações brutas e linhas.

Aceite: Códigos com rótulo igual continuam distintos; embalagens 9×/10× exigem revisão.

### CAD-03 — Admissão por fonte

**PROPOSTA, não aprovada.** Novo no Master não significa novo no Kustos; classificar A–F e admitir Master somente sob política aprovada e revisão integral.

Aceite: Código já em OP conserva identidade; sem produto operacional automático.

### CAD-04 — Ausência não destrutiva

**PROPOSTA, não aprovada.** Ausência, filtragem e marcador INATIVO não geram DELETE/desativação em nenhuma identidade/cadastro no fluxo incremental proposto.

Aceite: 100→90 mantém100, evidencia10 ausentes.

### CAD-05 — Presença do campo

**PROPOSTA, não aprovada.** Distinguir coluna ausente, célula vazia, valor preenchido e comando explícito contratado; literal NULL não é comando.

Aceite: Omitido preserva; blank comum preserva; marcador não contratado exige revisão.

### CAD-06 — Exceção comercial delimitada

**PROPOSTA, não aprovada.** Manter regra comercial aprovada: coluna presente vazia pode limpar só respectivo campo ERP após proposta explícita aprovada; não estender a Kustos/Prod./origem/família.

Aceite: SIM-03 preserva quatro campos e só limpa dois comerciais após aprovação.

### CAD-07 — Patch ERP fechado

**PROPOSTA, não aprovada.** Escrever somente campos ERP/proveniência efetivamente aprovados; sem-operação conserva imagem e timestamps; nenhuma escrita automática antes da aprovação.

Aceite: Descrição alterada gera proposta; não publica antes da aprovação.

### CAD-08 — Operacional protegido

**PROPOSTA, não aprovada.** Carga ERP não altera descricao/origem_id/familia_id/agrupamento_cod/override/proveniência/manual no Operacional nem mapa. Cadastro ausente vira pendência explícita.

Aceite: Matriz de precedência não ativa novo override nem preenche NULL.

### CAD-09 — Impacto analítico

**PROPOSTA, não aprovada.** Toda mudança de presença ou origem/família Master e rótulo de categoria deve apresentar classificação efetiva antes/depois de todos afetados; impacto sem aprovação bloqueia lote.

Aceite: SIM-10 F1→NULL é exposto e impede inserção sem decisão.

### CAD-10 — Categoria por código

**PROPOSTA, não aprovada.** Resolver pelo código exato, sem descrição/ID como chave de negócio. Ambiguidade/conflito bloqueia; ausência é pendência, sem categoria fictícia.

Aceite: Revisar familia80002/42502 sem escolher vencedor; não bridge ERP→Kustos.

### CAD-11 — Validação integral

**PROPOSTA, não aprovada.** Validar identidades/duplicidades de todas as linhas, inclusive filtradas; uma linha inválida/ambígua ou decisão pendente bloqueia o lote, sem aplicar subconjunto.

Aceite: SIM-09 bloqueado; filtro não esconde identidade inválida no futuro contrato.

### CAD-12 — Contexto vinculado

**PROPOSTA, não aprovada.** Revalidar arquivo/dados, política, decisões, imagens e impacto sob controle de concorrência; divergência exige novo Preview.

Aceite: Mudança após aprovação nunca vira patch best-effort.

### CAD-13 — Intenção idempotente

**PROPOSTA, não aprovada.** Mesma intenção conserva identificador e conteúdo; repetição retorna/consulta estado anterior sem novo DML; mesmo ID com conteúdo divergente bloqueia.

Aceite: Segundo envio não cria identidade/log de execução duplicado para a mesma intenção.

### CAD-14 — Incerteza explícita

**PROPOSTA, não aprovada.** COMMIT/rollback desconhecido não é sucesso nem falha comprovada; consultar lote/provas antes de qualquer reenvio.

Aceite: Resposta perdida não autoriza nova chave/retry.

### CAD-15 — Auditoria reconciliável

**PROPOSTA, não aprovada.** Registrar contagens e decisões por linha/código/campo, antes/recebido/proposto/efetivo/preservado e execução; informação desconhecida continua desconhecida.

Aceite: Linhas e códigos usam denominadores distintos; excluídas não somem do balanço.

### CAD-16 — Fatos protegidos

**PROPOSTA, não aprovada.** Nenhuma reconstrução cadastral altera IDs/códigos/descrições snapshot/métricas/data_referencia/criado_em/lotes dos fatos.

Aceite: Competência não é data de arquivo; upsert histórico existente não é reescrito.

### CAD-17 — Atomicidade e prova

**PROPOSTA, não aprovada.** Lote de patches aprovados é transacional, com snapshot durável e provas; falha não deixa cadastro parcial publicado.

Aceite: Falha em N de M operações reverte todas; log de falha é distinto do estado de negócio.

### CAD-18 — Reversão condicionada

**PROPOSTA, não aprovada.** Correção usa imagens antes/depois, compara estado atual e exige autorização; não apagar identidade nova com referências nem restaurar snapshot sobre mudanças posteriores.

Aceite: Reversível com histórico não significa undo automático.

### CAD-19 — Política versionada

**PROPOSTA, não aprovada.** Modo do arquivo, elegibilidade, blank, autoridade, alcance de catálogos e exceções devem integrar política/manifesto aprovado; sem política aprovada não há carga.

Aceite: PRODUZIDA e arquivo integral/delta não são decisões inferidas do nome/tamanho.

### CAD-20 — Separação de contratos

**PROPOSTA, não aprovada.** A proposta não é compatível por simples troca de flag com o executor integral/comercial isolado; futura versão e testes próprios são pré-condição.

Aceite: Plano atual exige V2 e DELETE; executor comercial exige fotografia inicial específica.

## 19. Decisões humanas — separação explícita

### Sustentado por evidências, sem nova escolha empresarial inferida

Código compartilhado, universos distintos, 6.123 identidades persistidas/524 investigativas; Master/Operacional não se substituem; ausência de grupo não elimina identidade; filtro e ausência física são diferentes; executor atual é integral/removível; blank comercial é exceção já aprovada; alterações Master podem mudar Custos sem escrita operacional; helper tem limites sintéticos reproduzidos. Evidência sustenta a recomendação, mas **não equivale a aprovação do novo contrato**.

### Decisões de negócio ainda necessárias

- **DEC-01 — Universo/admissão:** ratificar modelo lógico, naturezas, fatos sem cadastro e os 133 apenas físicos; decidir se novos elegíveis podem ser admitidos por política ou sempre revisão.
- **DEC-02 — Elegibilidade/estado:** PRODUZIDO/PRODUZIDA, INATIVO, EXLUIR/EXCLUIR e identidade que sai do filtro; nenhuma regra será corrigida por analogia.
- **DEC-03 — Autoridade/blank:** aprovar matriz por fonte/campo e a manutenção da exceção comercial no novo contrato; eventual remoção explícita de outro campo precisa operação própria.
- **DEC-04 — Conflitos/impacto:** decidir revisão e autorização de ganhos/perdas de resolução; proteger manual/autoria desconhecida; rótulos de catálogo afetam terceiros.
- **DEC-05 — Integral/delta/vigência:** confirmar o que o ERP entrega e sua ordem/versão empresarial; não usar nome/data do arquivo como substituto.
- **DEC-06 — Auditoria/reversão:** nível de detalhe, retenção/acesso dos artefatos, responsabilidade por aprovar e desfazer alterações.
- **DEC-07 — Entrada segura:** aprovar tratamento de sinais/ciência/mascara/códigos instáveis e eventual correção do helper em tarefa própria, sem mudar identidades reais por inferência.

### Decisões técnicas posteriores

Representação de evidências usando estruturas existentes, reaproveitamento da PK/identificador do log, revalidação ampliada do impacto, versão de transporte/manifesto compatível, mecanismo de consulta de intenção e retorno idempotente, tamanho operacional de lote, retenção e testes de falhas. Podem ser desenhadas após os critérios aprovados; não podem mudar a semântica das decisões acima.

### Não decidir/executar agora

Não escolher classificações reais, resolver 000001/embalagens, admitir os 114 PRODUZIDA, popular grupos, criar categorias/bridge/dimensão, migrar dados, reverter carga passada ou executar reconstrução/comercial. Nenhum número é meta para forçar a próxima carga.

## 20. Pré-condições para implementação

**Todas pendentes de aprovação explícita para o novo contrato.** Os itens possuem proposta acima; checkbox aberto não significa ausência de investigação. O fato de uma regra estar sustentada por evidência ou já existir em outro contrato não aprova sua adoção no novo fluxo.

- [ ] identidade aprovada, incluindo entradas instáveis/imprecisas.
- [ ] universo canônico e critérios de admissão aprovados.
- [ ] autoridade por campo aprovada.
- [ ] regra de blank e exceção comercial aprovadas para o novo contrato.
- [ ] regra de ausência/inatividade aprovada.
- [ ] regra de conflito e impacto analítico aprovada.
- [ ] preservação/classificação Kustos aprovada.
- [ ] regra PRODUZIDO/PRODUZIDA e EXLUIR/EXCLUIR aprovada.
- [ ] estratégia integral/delta e ordenação/vigência aprovadas.
- [ ] proveniência de observação, preservação e execução definida/aprovada.
- [ ] reversibilidade condicionada definida/aprovada.
- [ ] falha parcial e COMMIT indeterminado definidos/aprovados.
- [ ] estratégia de testes e critérios de aceite aprovados.

A estratégia de testes proposta cobre fixtures sintéticas A–F, blank/coluna ausente/comercial, idempotência e precisão de identidade, efeito indireto em Custos, catálogos compartilhados,100→90/110, replay fora de ordem, concorrência/retorno perdido, rollback, prova de tabelas protegidas, autorizações e limites de payload. Ensaios locais de executor e validação visual futura precisam de autorização/ambiente próprios; não usar produção como fixture.

## 21. Validação, consistência e preservação

| Verificação | Resultado |
| --- | --- |
| Suíte completa existente | 990/990;52 arquivos;43,69s |
| Testes específicos existentes | 433/433;22 arquivos;20,74s;subconjunto dos 990 |
| Lint | OK;zero erros/avisos |
| Typecheck | OK;tsc --noEmit -p jsconfig.json |
| Build local | OK;buildWeb com configuração pública em memória,host confirmado;somente dist ignorado;sem publicação |
| Ensaios sintéticos em memória | 10 cenários de carga +30 entradas de identidade +7 entradas na fronteira +colisão1000;sem estado persistido |
| Identidade real | 6256 códigos observados estáveis;nenhum alterado pelo helper |
| PRODUZIDA | 114=43 com algum fato+71 sem fatos;38OP incluídos nos43;19INATIVO separados |
| JSON/links/referências/diff-check | OK;23 seções,20 regras,13 pré-condições,26 links locais;JSON/simulações/hashes/whitespace conferidos |
| Banco | OK;12 tabelas públicas e8 históricas com contagens/fingerprints integrais iguais antes/depois |

Comandos equivalentes aos scripts de package.json, com binários locais porque npm não está no PATH: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=dot`; relacionados via `rg --files tests -g '*cadastro-mestre*.test.js' -g '*product-master*.test.js' -g '*custos-classification*.test.js'`; `node node_modules/eslint/bin/eslint.js .`; `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`; build invocando `buildWeb({env})` do script oficial com configuração pública em memória e sem imprimir chave; `git diff --check`.

Nenhum teste de produção foi criado/alterado. A suíte verde não certifica o contrato proposto nem elimina os contraexemplos reproduzidos de identidade. Os dez cenários verificam plano puro e expectativas; não afirmam validação de novo executor inexistente.

Revalidação das 12 tabelas públicas coincide integralmente com Auditorias 1/2/3:860 Master,6113 Operacional,2481 fatos/447 códigos Custos,1469 eventos/355 códigos OP. Nenhuma contagem foi “corrigida” para simular contrato futuro. As oito tabelas históricas também têm controle integral. Hashes dos seis documentos anteriores e dos módulos inspecionados são preservados no JSON.

## 22. Escopo documental, banco e Git

Apenas dois arquivos novos desta auditoria e registro datado no AGENTS. **Os relatórios/evidências das Auditorias 1/2/3 não foram alterados.** As alterações prévias em engenharia Supabase/modelo de banco foram preservadas; não se atualizou arquitetura oficial, README, manuais, regras de produção ou backlog para transformar recomendação em norma.

**INSERT: 0; UPDATE: 0; DELETE: 0; MIGRATIONS: 0; IMPORTAÇÃO REAL: NÃO.** Nenhum produto/categoria foi criado, nenhum campo/classificação/filtro/helper/importer/executor/schema/RLS/Auth/engine/Custos/OP/OP×Custo foi alterado. Apenas SELECTs remotos. Simulações sem persistência de estado e sem chamada de executor.

**commit: NÃO; push: NÃO; deploy: NÃO.** Build é local. `data_referencia` continua competência e `criado_em` evento/importação; arquivo/lote cadastral não redefine nenhuma dessas datas.

## 23. Próxima decisão necessária

Aprovar ou rejeitar as matrizes e regras CAD-01–20, resolvendo DEC-01–07 e as 13 pré-condições. Só então especificar a implementação compatível do fluxo incremental e sua autorização de execução.

A resposta contratual proposta é: **uma carga pode acrescentar fonte ERP e aplicar patches ERP expressamente aprovados; deve preservar identidade, Operacional/manual, ausência, campos comuns vazios e fatos; deve pedir decisão para admissão/elegibilidade, conflito, limpeza comercial e todo impacto analítico não aprovado.** Sem essas decisões, a ação correta do futuro executor é bloquear e explicar, não completar a regra dentro do código.
