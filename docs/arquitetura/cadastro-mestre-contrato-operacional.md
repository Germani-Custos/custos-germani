# Contrato operacional do Cadastro Mestre — decisões aprovadas

## 1. Estado, autoridade e alcance

**Identificador:** CAD-CONTRATO-01. **Versão:** 1.0. **Formalização:** 05/11/2026, America/Sao_Paulo.

**DEC-01 a DEC-07: APROVADAS pelo responsável pelo projeto, conforme declaração e conteúdo fornecidos nesta tarefa.** Este é o contrato oficial de negócio para a evolução do Cadastro Mestre. Sua formalização é exclusivamente documental: não implementa funcionalidades, não autoriza carga, reconstrução, mudança de código/banco, commit, push ou deploy.

Há três estados distintos:

- **Decisão aprovada:** os critérios e limites das sete decisões abaixo devem orientar a implementação.
- **Fato observado:** números e comportamento comprovados nas auditorias, válidos para suas fontes e datas.
- **Solução técnica pendente:** mecanismos de armazenamento, UI, validação, execução e recuperação ainda precisam de desenho, implementação e testes. Uma recomendação técnica da Auditoria 4 não se torna implementação por esta aprovação.

Aprovar o contrato não equivale a aprovar uma execução com determinado arquivo. Cada admissão/carga exige o Preview e a aprovação correspondentes. Não é necessário reapresentar as sete decisões como pendentes; detalhes técnicos e autorizações de execução têm escopo próprio.

## 2. Vocabulário e fontes

**Identidade** é o código normalizado pelo helper existente; descrição, classificação, presença em arquivo, atividade e fatos são dimensões diferentes.

**Cadastro Geral** é o papel lógico que preserva as identidades reconhecidas e seu vínculo com o histórico. **Cadastro Detalhado** é o recorte de produtos elegíveis, com admissão aprovada. Os nomes são conceitos aprovados, não nomes de novas tabelas, funções, painéis ou uma segunda fonte de verdade.

O mapeamento desses papéis para as estruturas e consultas existentes permanece uma pendência técnica. Não declarar que Geral já é sinônimo de `dicionario_produtos`, que Detalhado já é sinônimo de `dicionario_master_produtos`, nem renomear as duas telas atuais por documentação. As auditorias mostram que nenhuma das tabelas isoladas cobre todas as identidades reconhecidas.

Fontes de evidência:

- [Auditoria 1 — classificação](../auditoria/cadastro-mestre-classificacao-validacao.md) e [evidências](../auditoria/cadastro-mestre-classificacao-evidencias.json).
- [Auditoria 2 — reconciliação Master × Operacional](../auditoria/cadastro-mestre-reconciliacao-validacao.md) e [evidências](../auditoria/cadastro-mestre-reconciliacao-evidencias.json).
- [Auditoria 3 — universo canônico](../auditoria/cadastro-mestre-universo-canonico.md) e [evidências](../auditoria/cadastro-mestre-universo-canonico-evidencias.json).
- [Auditoria 4 — proposta de reconstrução incremental](../auditoria/cadastro-mestre-contrato-reconstrucao.md) e [evidências/simulações](../auditoria/cadastro-mestre-contrato-reconstrucao-evidencias.json).
- [Auditoria 4.1 — reconciliação dos universos](../auditoria/cadastro-mestre-universo-identidade-reconciliacao.md) e [evidências individuais](../auditoria/cadastro-mestre-universo-identidade-reconciliacao-evidencias.json).

Os relatórios e JSONs conservam suas conclusões e estados de aprovação nas datas originais. As notas de atualização remetem a este contrato, sem reescrever o passado.

## 3. DEC-01 — Identidade e admissão

**Estado: APROVADA.**

### Critérios aprovados

- `normalizeCodigoProduto()` e `codigo_produto` normalizado são a identidade canônica.
- Os **6.123 códigos persistidos** da fotografia auditada são reconhecidos.
- Os **133 códigos adicionais observados nos arquivos ERP** são candidatos, não admitidos automaticamente.
- Novas identidades exigem critérios de elegibilidade e aprovação.
- Ausência do Master não remove identidade nem fatos históricos.
- Master ERP não é o universo absoluto de produtos Kustos.

### Consequências e restrições

Descrição não é chave de identidade; campos de categoria ou rótulos semelhantes não autorizam fusão/renomeação de códigos. Código já existente em Operacional, Custos ou OP é uma identidade existente, mesmo que seja novo para o Master.

Reconhecimento dos códigos persistidos não certifica que todos estejam ativos, elegíveis ou comercializáveis. Inclusive TESTE123 foi contado por presença persistida; esta decisão não apaga nem classifica automaticamente esse registro.

A admissão deve distinguir observação, elegibilidade e aprovação. A presença no arquivo pode gerar candidatura e evidência, sem transformar os 133 candidatos em Cadastro Geral/Detalhado automaticamente. Os quantitativos são evidência datada conforme DEC-06, não constantes do código.

**Pendência técnica:** tratar entradas inválidas/ambíguas e limites do helper, inclusive precisão científica e estabilidade dos casos sintéticos da Auditoria 4, antes de admitir identidades. A aprovação do helper como referência canônica não afirma que ele já resolva todos esses casos nem autoriza modificá-lo nesta tarefa.

## 4. DEC-02 — Elegibilidade

**Estado: APROVADA.**

### Critérios aprovados

- Origens elegíveis: **PRODUZIDO, PRODUZIDA, MASSA PRODUZIDA e REVENDA**.
- Tipo deve ser **P ou C**.
- Código deve ser válido e duplicidades precisam ser resolvidas.
- Descrição contendo **INATIVO ou EXCLUIR** bloqueia elegibilidade.
- Dos **114 registros MASSA PRODUZIDA** auditados, os **19 com INATIVO permanecem bloqueados**; os outros **95 podem competir pela admissão se cumprirem todos os critérios**.
- Admissão sempre exige **Preview e aprovação**.

### Consequências e restrições

Pertencer a uma origem aprovada, isoladamente, não admite um produto. Os requisitos são cumulativos; não escolher uma ocorrência vencedora para esconder duplicidade. Um bloqueio por INATIVO/EXCLUIR não elimina identidade já reconhecida nem seus fatos: altera o pertencimento elegível nos termos de DEC-05.

**95 significa candidatos potenciais, não 95 admissões, nem uma meta de crescimento do Master.** Os 133 candidatos físicos e os 114 MASSA PRODUZIDA são conjuntos diferentes com sobreposição; não somar suas contagens como novos produtos.

A regra aprovada usa **EXCLUIR**. Na formalização, o código inspecionado ainda usava `/inativo|exluir/i` e `/produzido|revenda/i`. A Etapa 4 (05/11/2026) corrigiu localmente esse alcance: Tipo P/C; palavras completas PRODUZIDO/PRODUZIDA/MASSA PRODUZIDA/REVENDA em `descr_origem`, com qualificadores; descrição contendo INATIVO/EXCLUIR. EXLUIR sozinho não bloqueia. A comparação normaliza caixa, diacríticos e espaços, sem alterar valores originais ou identidade. Código e duplicidades continuam validados no Preview; elegibilidade não é admissão. [Implementação, testes e limites](../auditoria/cadastro-mestre-elegibilidade-validacao.md).

**Limite técnico:** a Etapa 4 reconhece o vocabulário aprovado na descrição ERP da origem, com limites Unicode de letras/números/underscore. Não cria allowlist de códigos, equivalência de catálogo ou fallback por família/descrição comercial. Correspondências futuras de rótulos/códigos ERP, vigência e admissão continuam próprias; categoria sem resolução não bloqueia automaticamente. A aplicação dessa política não reabre a aprovação das origens.

## 5. DEC-03 — Autoridade

**Estado: APROVADA.**

### Critérios aprovados

- **Identidade: Kustos.**
- **Descrição, origem e família ERP: Cadastro Mestre**, respeitando resolução exata por código.
- **Agrupamento e override manual: Kustos/Operacional.**
- Descrição histórica dos fatos permanece **snapshot imutável**.
- Conflitos devem ser exibidos no Preview, sem sobrescrita silenciosa.

### Consequências e restrições

| Dado | Autoridade e limite |
| --- | --- |
| Código do produto | Identidade canônica Kustos; não depende de descrição ou de presença exclusiva no Master |
| Descrição, origem e família ERP | Campos oficiais do Cadastro Mestre; categorias resolvidas por código exato, preservando ausência/ambiguidade explícitas |
| Classificações operacionais existentes | Preservadas frente à carga ERP; diferenças devem aparecer como conflitos, sem presumir erro ou autoria manual |
| Agrupamento e override Kustos | Mantidos no domínio operacional; grupos ERP não autorizam conversão ou preenchimento automático |
| Descrição e demais fatos históricos | Preservados no snapshot; manutenção cadastral não os reescreve |

Autoridade ERP não significa copiar todo o Master para o Operacional, substituir FKs por códigos brutos ou resolver categorias por texto. Não foi aprovada ponte automática entre Agrup. Prod./Com./Est./Custos/Fiscal e agrupamento Kustos.

A leitura atual de Custos pode mudar de classificação quando muda a presença/origem/família do Master, mesmo sem escrita no Operacional. O Preview futuro precisa tornar o conflito/efeito compreensível; preservar apenas a tabela operacional não é prova suficiente de ausência de impacto.

A imutabilidade aqui exige que operações cadastrais não alterem descrições snapshot, IDs, valores, métricas ou datas dos fatos. **Não declara que o writer atual de Custos já tenha versionamento imutável de todas as reimportações**: o upsert e sua retenção continuam sendo descritos pelos contratos existentes.

## 6. DEC-04 — Campos vazios

**Estado: APROVADA.**

### Critérios aprovados

- Campo ERP vazio ou coluna ausente preserva o valor existente.
- Descrição, origem e família não são limpas automaticamente.
- Classificações e overrides Kustos são protegidos.
- Limpeza intencional exige operação explícita, visível no Preview e aprovada.
- A exceção comercial permanece restrita aos campos ERP comerciais correspondentes.

### Consequências e restrições

| Situação | Regra aprovada |
| --- | --- |
| Descrição/origem/família ERP vazia ou coluna ausente | Preservar existente; sem valor anterior, manter ausência explícita |
| Agrup. Prod. ERP vazio ou coluna ausente | Preservar existente conforme contrato de campo; não limpar classificação Kustos |
| Coluna comercial ausente | Preservar respectivo campo comercial |
| Coluna comercial presente com célula vazia | Exceção comercial existente pode propor NULL somente no respectivo campo ERP comercial, de forma explícita e aprovada |
| Agrupamento/override/classificação Kustos | Preservar; blank de ERP não é comando de manutenção manual |
| Limpeza intencional de outro campo | Operação própria, visível, com aprovação; não inferir a intenção de NULL/blank |

A exceção comercial do [CAD-COM-01](cadastro-mestre-agrupamento-comercial-erp.md) não se estende a descrição de produto, origem, família, Agrup. Prod. ou agrupamento/override Kustos. Código e descrição comerciais permanecem independentes, sem completar pares parciais.

Coluna ausente, célula vazia, valor preenchido e operação de limpeza são estados distintos no Preview/proveniência. Não atribuir “não aplicável” por inferência de NULL. O editor manual operacional é outro fluxo: sua possibilidade de limpar agrupamento explicitamente não transforma célula ERP vazia em comando equivalente.

## 7. DEC-05 — Cadastro Geral e Detalhado

**Estado: APROVADA.**

### Critérios aprovados

- Cadastro Geral preserva identidade e histórico.
- Cadastro Detalhado contém somente produtos elegíveis.
- Inativos e produtos fora dos filtros permanecem no Geral, mas são excluídos do Detalhado.
- Ausência no arquivo não exclui identidade.
- Nenhuma mudança de elegibilidade apaga fatos de Custos ou OP.

### Consequências e restrições

Detalhado é um recorte do Geral, condicionado aos critérios de DEC-02 e à admissão aprovada. Uma identidade já reconhecida que fique inativa/fora do filtro permanece no Geral com seu histórico; sair do Detalhado não significa DELETE da identidade nem dos fatos.

Os candidatos apenas observados continuam candidatos conforme DEC-01. “Preservar no Geral” não admite todo código físico por simples presença no arquivo.

Ausência em um arquivo não prova inatividade ou falha no critério de origem. Não transformar ausência em exclusão automática da identidade. A forma de representar observação, elegibilidade, vigência e pertencimento deve ser especificada e validada na implementação.

**Estado de implementação:** os papéis Geral/Detalhado não foram criados nem mapeados fisicamente nesta tarefa. As telas atuais Operacional/ERP não comprovam essa implementação. Não está aprovada a criação automática de novas tabelas, funções ou fontes paralelas para representá-los.

## 8. DEC-06 — Datas, fontes e denominadores

**Estado: APROVADA.**

### Critérios aprovados

- **6.123 = universo persistido.**
- **6.256 = universo observado**, incluindo os 133 códigos encontrados fisicamente nos arquivos ERP em relação à persistência examinada.
- Os universos nunca podem ser tratados como equivalentes.
- Toda contagem deve informar **fonte, data e denominador**.
- Cada reconciliação deve registrar arquivos e snapshots utilizados.

### Base factual datada — não meta de implementação

A tabela inteira abaixo refere-se à **fotografia de 30/10/2026** das Auditorias 3/4.1, aos arquivos ERP de 08/10 e 22/10 com hashes preservados e às tabelas/snapshots listados nos respectivos JSONs. A conferência documental final de 4.1 ocorreu em 05/11, sem transformar os números em uma nova leitura remota de 05/11.

| Universo / medida | Quantidade de códigos distintos | Fonte e denominador |
| --- | --- | --- |
| Persistido | 6.123 | União Master, Operacional/Dicionário, Custos, OP e mapa; históricos examinados não acrescentam identidades |
| Observado de dados | 6.256 | Persistido ∪ arquivo físico ERP 22/10; arquivo 08/10 e históricos examinados não ampliam o conjunto |
| Adicionais observados | 133 | Observado − persistido; todos com linha e descrição no arquivo, sem cadastro/fato nas estruturas examinadas |
| Investigativo | 524 | Custos ∪ OP na retenção auditada |
| MASSA PRODUZIDA | 114 | Registros dos dois rótulos MASSA PRODUZIDA no arquivo auditado |
| MASSA PRODUZIDA bloqueados por INATIVO | 19 | Subconjunto dos 114 com o marcador |
| MASSA PRODUZIDA potenciais candidatos | 95 | 114 − 19; sujeitos aos demais critérios e aprovação |

São denominadores diferentes. Operacional e `dicionario_produtos` são a mesma fonte; não somar duas vezes. Linhas, fatos, códigos distintos, campos e operações também não são unidades intercambiáveis.

Ensaios sintéticos permanecem separados dos dados observados. TESTE123 integra os dois universos por persistência e não explica os 133; os contraexemplos como ++1 não foram adicionados às contagens. Os 133 não são efeito de transformação/colisão de normalização.

`data_referencia` continua competência e `criado_em` continua evento/importação. Data do arquivo, data desta aprovação e lote cadastral não substituem esses eixos.

## 9. DEC-07 — Atualização, proveniência e reversibilidade

**Estado: APROVADA.**

### Critérios aprovados

- **Atualização incremental é o fluxo padrão.**
- Reconstrução integral é **excepcional, explícita e exige Preview e aprovação**.
- Registrar **lote, arquivo/hash, data/hora, responsável, campos afetados e resultado**.
- Execução deve ser **atômica e idempotente**.
- **Snapshot anterior deve ser preservado.**
- Reversão somente quando houver comprovação das alterações pertencentes à execução.
- Estado indeterminado bloqueia repetição cega.

### Consequências e restrições

Arquivo integral recebido e reconstrução integral do cadastro não são sinônimos: é possível comparar uma fotografia completa e aplicar diferenças. A rotina padrão não deve usar desaparecimento no arquivo para apagar identidade ou história.

Atomicidade significa que as alterações pertencentes à execução aprovada não podem ser publicadas silenciosamente pela metade. Idempotência significa que a mesma intenção de execução não pode duplicar alterações; isso não está comprovado apenas porque existe PK, upsert ou bloqueio de um identificador repetido. Identificar intenção, consulta de resultado e concorrência ainda exige implementação e testes.

O snapshot anterior é necessário, mas não é autorização para restaurá-lo sobre alterações posteriores. A reversão depende de comprovar o que aquela execução mudou e verificar o estado atual/dependências. COMMIT ou rollback sem confirmação precisa de investigação de resultado antes de qualquer repetição.

Aprovação do contrato não libera o executor integral existente para uso como rotina incremental, nem o executor comercial isolado para cargas genéricas. Nenhuma execução real foi autorizada por esta formalização.

## 10. Sucessão documental e numeração das decisões

Esta versão formaliza **as sete decisões com o conteúdo e a numeração fornecidos na aprovação atual**. A Auditoria 4 organizava as pendências de outra forma. Não renumerar suas evidências nem reinterpretar uma aprovação apenas pelo número coincidente.

| Decisão oficial atual | Relação com as pendências da Auditoria 4 |
| --- | --- |
| DEC-01 — Identidade e admissão | Universo/admissão e identidade; preserva a distinção esclarecida em 4.1 |
| DEC-02 — Elegibilidade | Resolve a política antes pendente sobre PRODUZIDO/PRODUZIDA e INATIVO/EXCLUIR |
| DEC-03 — Autoridade | Separa a autoridade do tema histórico “autoridade/blank”; mantém conflitos visíveis |
| DEC-04 — Campos vazios | Formaliza blank, limpezas explícitas e exceção comercial; não é o antigo rótulo “conflitos/impacto” |
| DEC-05 — Cadastro Geral e Detalhado | Formaliza os dois papéis lógicos; não é o antigo rótulo “integral/delta/vigência” |
| DEC-06 — Datas, fontes e denominadores | Formaliza distinção de universos e rastreabilidade de contagens |
| DEC-07 — Atualização, proveniência e reversibilidade | Reúne fluxo incremental/exceção integral, auditoria, atomicidade, idempotência, snapshot e reversão; não equivale à antiga pendência “entrada segura” |

Os limites do normalizador e detalhes de vigência/ordenação da fonte continuam pendências técnicas. Não foram transformados em funcionalidades aprovadas ou corrigidas pela troca de numeração.

**Sucessão explícita de política:** no alcance de identidade, elegibilidade, campos vazios, papéis Geral/Detalhado e modo de manutenção, estas decisões aprovadas substituem as recomendações ainda não aprovadas das Auditorias 2/3/4/4.1 e orientam a evolução além de CAD-REBUILD-01. As descrições de código/executor dos contratos anteriores continuam válidas como estado da implementação inspecionada; não significam que o software já aplica a nova política.

As regras técnicas CAD-01–20, simulações e checklists da Auditoria 4 são insumos de desenho/validação. **Não houve ratificação automática de cada detalhe técnico** apenas porque suas decisões de negócio foram aprovadas. Cada requisito técnico deve ser alinhado ao conteúdo efetivo de DEC-01–07, sem reabrir as decisões aprovadas.

## 11. Estado da implementação e diferenças conhecidas

| Tema | Estado observado no checkout / evidências | Consequência para a próxima etapa |
| --- | --- | --- |
| Normalização | Helper existente compartilhado; há contraexemplos sintéticos de estabilidade/precisão na Auditoria 4 | Validar a fronteira de identidade; não prometer correção já entregue |
| Filtro ERP | Etapa 4 local: Tipo P/C, palavras completas PRODUZIDO/PRODUZIDA/MASSA PRODUZIDA/REVENDA e INATIVO/EXCLUIR; testes e reconciliação em memória | Não equivale a admissão ou implementação integral de DEC-02/01–07; novas revisões e compatibilidade dos executores continuam necessárias |
| Manutenção do Master | Transporte/manifesto/plano atuais exigem reconstrução do universo e podem propor remoções de Master por ausência/filtro | Projetar o padrão incremental e provar preservação de identidade; não ligar o modo histórico INCREMENTAL como atalho |
| Geral e Detalhado | Papéis aprovados; consultas/telas/tabelas atuais não foram convertidas | Definir o mapeamento usando a estrutura existente antes de propor qualquer mudança física |
| Autoridade/classificação | Custos projeta origem/família do Master quando presente; OP conserva fonte operacional; agrupamento operacional | Mostrar conflitos/impactos sem inferir ponte ou sincronização |
| Branco/comercial | Regra comum de preservação e exceção comercial já existem em parte do fluxo | Alinhar operações explícitas e proteção manual em toda a implementação |
| Auditoria/execução | Há logs/snapshots/locks/provas e executor comercial separado, com garantias e alcances específicos | Completar proveniência por execução/campo, idempotência e reversão verificáveis; sem declarar cobertura total atual |

Não foi consultado Supabase nesta tarefa. Estados remotos, contagens e publicações continuam vinculados às provas datadas, sem confirmação nova de produção.

## 12. Pendências para implementação e validação humana

### Trabalho técnico ainda necessário

- Definir representação e consultas de Geral/Detalhado e de candidatura/elegibilidade/observação, reutilizando a estrutura existente e evitando segunda fonte de verdade.
- Acompanhar correspondências futuras de origens com os dados ERP e completar a fronteira de códigos válidos/duplicidades, incluindo precisão/estabilidade conhecidas. O reconhecimento textual e os marcadores foram corrigidos localmente na Etapa 4; isso não resolve admissão, vigência ou identidade.
- Projetar Preview com valores atuais/recebidos/propostos, limpezas, preservações, conflitos e impacto da classificação de Custos; operações e autorizações precisam ter escopo inequívoco.
- Desenhar fluxo incremental compatível e exceção integral; definir como tratar arquivos completos/delta, ordem/vigência e alterações de contexto sem presumir política pela data do arquivo.
- Definir registro dos campos aprovados de proveniência, limites entre observação e última escrita, armazenamento/retenção do snapshot e consulta do resultado da mesma intenção.
- Implementar e testar atomicidade, concorrência, idempotência, falhas e estado indeterminado; detalhar o tratamento prévio de linhas inválidas e o lote efetivamente aprovado.
- Especificar prova e procedimento de reversão que preservem alterações posteriores e fatos; validar compatibilidade entre cliente, transporte e executores.

### Validações humanas e autorizações posteriores

As sete decisões de negócio **já estão aprovadas**. Permanecem a validação do mapeamento técnico e de suas amostras/diagnósticos, a revisão dos conflitos reais, a aprovação de admissão de cada conjunto no Preview e a autorização da execução correspondente. Exemplos: os 133 candidatos físicos e os 95 MASSA PRODUZIDA potenciais não recebem aprovação automática de carga.

Ainda precisam ser concretizados com o responsável: correspondência dos rótulos/códigos de origem com o vocabulário aprovado, comportamento de vigência quando o arquivo é parcial, retenção/acesso aos artefatos, responsáveis operacionais e critérios de aceite da implementação/reversão. Esses detalhes não autorizam contradizer preservação, elegibilidade, autoridade ou idempotência já aprovadas.

## 13. Critérios de revisão documental e trilha da formalização

Antes de considerar uma futura implementação aderente, seus documentos e provas precisam distinguir: regra aprovada, comportamento efetivamente entregue e validação executada no ambiente identificado. Uma caixa marcada por aprovação de negócio não é teste passado ou deploy.

Esta formalização:

- cria este contrato e registra a aprovação nos documentos de processo, estratégia, manuais e navegação;
- preserva os relatórios/JSONs históricos e acrescenta apenas notas de atualização onde necessário;
- não altera código, dependências, esquema, migrations, tabelas, RLS/Auth ou dados;
- não cria funções/tabelas nem executa consulta remota, RPC, importação ou reconstrução;
- não realiza commit, push ou deploy.

### Referências técnicas de leitura, sem nova autorização de execução

- [Reconstrução integral implementada e histórico de seu contrato](cadastro-mestre-reconstrucao.md).
- [Transporte e executor web](cadastro-mestre-execucao-web.md).
- [Famílias e resolução por código](cadastro-mestre-familias-erp.md).
- [Campos comerciais e exceção de blank](cadastro-mestre-agrupamento-comercial-erp.md).
- [Executor comercial isolado](cadastro-mestre-comercial-executor-isolado.md).
- [Matriz do runtime](matriz-contratos-operacionais.md) e [modelo de dados](banco-de-dados.md).

### Registro de versão

**05/11/2026 — versão 1.0:** conteúdo de DEC-01–07 fornecido e declarado aprovado pelo responsável pelo projeto; formalização documental sem implementação ou execução. Fonte de aprovação: instrução desta tarefa, preservada no contrato por seus critérios, consequências e restrições.
