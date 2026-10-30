# Auditoria 3 — universo canônico de produtos

## 1. Objetivo

**Status: CONCLUÍDO — auditoria somente leitura.** Determinar quais códigos precisam ser reconhecidos como a mesma identidade no Kustos, separando existência, fonte, classificação, fato histórico e proveniência. Nenhuma recomendação foi aprovada ou implementada.

**Conclusão auditável:** o universo mínimo para os fatos atualmente disponíveis é **524 códigos (Custos ∪ OP)**. Para preservar também todas as identidades dos cadastros atuais, a união contém **6.123 códigos**. Master (860) e Operacional (6.113) isolados deixam fatos de fora. Recomenda-se o **Modelo D como contrato lógico de identidade por código, com fontes e classificações separadas**, alimentado pela união do Modelo C incluindo os fatos. A evidência não determina uma nova tabela, outro ID ou segunda fonte de verdade.

O contrato proposto não confunde produto existir, estar no arquivo ERP, passar pelo filtro, possuir cadastro operacional, ter classificação, ter movimento ou estar ativo. “Sem movimento” significa ausência nos fatos retidos desta fotografia, nunca inexistência de movimentação no ERP.

## 2. Fontes

Auditoria em **30/10/2026**, America/Sao_Paulo; HEAD **486b646b25d0929dedb80804493cdcd88b34e537**. Já existiam quatro documentos não rastreados das Auditorias 1/2; seus conteúdos e hashes foram preservados.

Leituras documentais: [AGENTS](../../AGENTS.md), [README](../../README.md), [Regras Gerais](../regras-gerais.md), [Manual Técnico](../manuais/manual-tecnico.md), [Manual de Operação](../manuais/manual-operacao.md), [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md), [engenharia Supabase](../engenharia-dados-supabase.md), [modelo de banco](../arquitetura/banco-de-dados.md), [matriz operacional](../arquitetura/matriz-contratos-operacionais.md), [Cadastro/UX](../ux/cadastro-mestre.md), [reconstrução](../arquitetura/cadastro-mestre-reconstrucao.md), [famílias](../arquitetura/cadastro-mestre-familias-erp.md), [comercial ERP](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md) e [OP × CUSTO](../arquitetura/op-custo.md). Também foram conferidas as validações históricas da reconstrução/comercial e as auditorias de classificação/cascata.

Fontes imediatamente anteriores: [Auditoria 1](cadastro-mestre-classificacao-validacao.md), [JSON 1](cadastro-mestre-classificacao-evidencias.json), [Auditoria 2](cadastro-mestre-reconciliacao-validacao.md) e [JSON 2](cadastro-mestre-reconciliacao-evidencias.json). Elas preservam os contratos e os dados originais; esta análise amplia o universo e a dimensão temporal, sem reescrever resultados históricos.

**Supabase:** Custos-Germani, projeto `umpebdovrazzrdndhigc`, conexão Primary. Apenas SELECTs administrativos pelo conector: tabelas, catálogos de colunas/objetos, definição da view e controles. Nenhuma RPC, função de escrita, SQL no frontend ou atalho em componente. A API de produção foi inspecionada, não alterada: continua utilizando `supabase.from()` e seus leitores integrais.

A fotografia conjunta da Auditoria 1, de **17:09:30 UTC**, foi reutilizada **após revalidar hashes integrais das 12 tabelas públicas**, iguais às Auditorias 1/2. Novas leituras de OP completo, lotes, inventário e cruzamentos independentes ocorreram nesta auditoria. Controle público: **17:50:50 → 18:00:08 UTC** (14:50:50 → 15:00:08 local); oito tabelas históricas de `audit_kustos`: **17:54:51 → 18:00:10 UTC**. Todas as contagens e fingerprints permaneceram iguais. Fontes temporais completas: **2.481 fatos de Custos e 1.469 eventos OP**.

**Arquivo ERP comprovado:** `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\cadastro mestre 22_10.xls`, 24.405.643 bytes, Sheet1, cabeçalho 1, 6.255 linhas de dados. SHA-256 revalidado: **46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff**, igual ao lote 5. Os dados canônicos lidos pelo SheetJS/adapter oficial nas Auditorias 1/2 foram reutilizados com esse controle. Sem edição, conversão, upload ou execução de macros/fórmulas. Não é uma consulta ao ERP ao vivo em 30/10.

[Evidências estruturadas desta auditoria](cadastro-mestre-universo-canonico-evidencias.json): 6.123 identidades com schema explícito de tuplas, flags, campos e resolução, combinações/listas completas, 524 trajetórias mensais, 1.469 eventos OP e 2.481 fatos de Custos sem valores monetários, comparações textuais, proveniência, controles independentes e fingerprints de 20 tabelas. Os quatro documentos anteriores têm hashes no JSON; são dependências de evidência, não dependências do runtime.

## 3. Metodologia

1. Inventariar as fontes realmente consumidas por `src/services/api.js`, os motores e os objetos existentes. Código de produto é distinto de código de categoria.
2. Usar a função **real** `normalizeCodigoProduto` de [spreadsheet-engine](../../core/spreadsheet-engine.js), lida do checkout, para todas as identidades. Não usar descrição, cast para Number, prefixo, família ou aproximação.
3. Construir conjuntos independentes de Master, Operacional, Custos, OP e mapa; inspecionar snapshots legados e arquivo físico separadamente. Operacional e Dicionário são a mesma tabela, não universos somáveis.
4. Cruzar existência antes de comparar classificação. Resolver ERP por `categorias_*.codigo` exato e operacional por ID, preservando NULL, sentinela e referência não encontrada como estados distintos.
5. Comparar competências pelo mês de `data_referencia`, conservando datas integrais/IDs e eventos. `criado_em` identifica importação, não competência; não somar produção/custos nem executar nova interpretação OP × Custo.
6. Comparar descrições apenas para informar divergências. A triagem textual do JSON não participa de junções, classificação ou escolha de identidade.
7. Conferir união, marginais, combinações e meses contra um **SELECT agregado independente**. Comparar contagens e hashes integrais antes/depois; executar a qualidade pedida mesmo sem código alterado.

| Fonte | Linhas/eventos | Códigos normalizados | Inválidos | Alterados pelo helper | Colisões entre códigos brutos |
| --- | --- | --- | --- | --- | --- |
| master | 860 | 860 | 0 | 0 | 0 |
| operacional | 6113 | 6113 | 0 | 0 | 0 |
| custo | 2481 | 447 | 0 | 0 | 0 |
| op | 1469 | 355 | 0 | 0 | 0 |
| mapa | 299 | 299 | 0 | 0 | 0 |
| arquivo | 6255 | 6255 | 0 | 0 | 0 |

Zero duplicidades normalizadas em cada cadastro/mapa/arquivo. As repetições de códigos nos fatos são eventos/competências; não são produtos duplicados. Os 6.113 códigos históricos legados também têm zero alteração, invalidez ou colisão. Não se aplicou mudança de caixa aos códigos: o helper não autoriza fundir alfanuméricos por case-fold.

## 4. Universo de cada fonte

| Universo | Códigos distintos | Papel |
| --- | --- | --- |
| Master ERP | 860 | Subconjunto filtrado persistido |
| Operacional | 6113 | dicionario_produtos |
| Dicionário | 6113 | A mesma tabela do Operacional |
| Custos | 447 | 2.481 fatos retidos |
| OP | 355 | 1.469 eventos retidos |
| mapa_produtos | 299 | Estrutura legada; zero identidade adicional |
| Snapshots audit_kustos | 6113 | Histórico; conjunto de códigos igual ao Operacional atual |
| Arquivo ERP físico | 6255 | Fonte de 22/10; inclui 5.395 excluídos do filtro |
| União persistida das fontes | 6123 | Master ∪ Operacional ∪ Custo ∪ OP; mapa/snapshots não ampliam |
| União incluindo arquivo físico | 6256 | Contexto da fonte; não admissão automática no Kustos |

### Fontes legadas e limites do runtime

`mapa_produtos` possui 299 códigos, todos contidos na união principal. Os 292 códigos distintos do snapshot histórico do mapa, os 6.113 de `fase1_mestre_operacional_chaves` e os 96 de `fase1_divergencias_descricao` também não ampliam a união. Essas tabelas têm respectivamente 584, 11.716 e 192 linhas por execuções históricas; contar linhas como identidades duplicaria produtos.

As demais tabelas de `audit_kustos` são execução/contagens/matrizes de categorias/catálogo de funções. Não são outra dimensão corrente de produto. `familias_base` tem 21 linhas de código/descrição de família, não `codigo_produto`. Categorias também identificam categorias, não produtos. O staging `stg_dicionario_master_produtos` consta em SQL histórico, mas **não existe no catálogo público atual**.

A view `vw_produtos_orfaos_agrupamento` deriva integralmente de `dicionario_produtos` com LEFT JOIN em categorias; não cria identidades. Nem mapa, familias_base, audit_kustos ou essa view aparecem como fonte direta da identidade nas leituras atuais da API; os executores apenas protegem algumas dessas tabelas. O trigger legado lê o Operacional para manter o mapa, não transforma mapa em autoridade reversa. Nenhuma função foi invocada.

Os logs/snapshots do Master já examinados na Auditoria 2 contêm 5.713 códigos anteriores conhecidos, todos fisicamente presentes no arquivo e sem acrescentar identidade fora da união corrente. Não contam como produtos atualmente ativos.

## 5. União

**860 + 6.113 − 853 = 6.120** códigos em Master ∪ Operacional.

Todos os 447 códigos de Custos já estão no Operacional. Dos cinco códigos OP sem Operacional, dois estão no Master e **três faltam a ambos**: `1758717`, `1758718`, `MCC016`. Portanto:

**6.120 + 3 = 6.123** na união de todas as fontes persistidas. Mapa e estruturas históricas acrescentam **zero**.

A união com o arquivo físico é **6.256 = 6.255 + TESTE123**. Há **133 códigos do arquivo fora dos cadastros/fatos correntes**; todos são excluídos pelo filtro atual e não têm Custos/OP nesta fotografia. Sua presença física é evidência de fonte; elegibilidade futura e natureza empresarial dependem de decisão, sem incluí-los ou removê-los automaticamente.

## 6. Interseções

| Conjunto | Códigos |
| --- | --- |
| Master ∩ Operacional | 853 |
| Master − Operacional | 7 |
| Operacional − Master | 5260 |
| Master ∩ Custos | 273 |
| Operacional ∩ Custos | 447 |
| Master ∩ OP | 180 |
| Operacional ∩ OP | 350 |
| Custos ∩ OP | 278 |
| Custos − OP | 169 |
| OP − Custos | 77 |
| Custos ∪ OP | 524 |
| Master ∩ (Custos ∪ OP) | 302 |
| Operacional ∩ (Custos ∪ OP) | 519 |

Interseções globais são por código em toda a retenção; não afirmam coexistência mensal. Os dois códigos `1755712` e `1755713` explicam Master ∩ OP = 180 contra apenas 178 compartilhados simultaneamente com o Operacional.

## 7. Combinações de presença

`tem_dicionario = tem_operacional` em todos os casos. A tabela esgota as combinações **não vazias**; as demais têm zero. Cada código aparece uma única vez.

| Master | Operacional | Custo | OP | Dicionário | Códigos |
| --- | --- | --- | --- | --- | --- |
| SIM | NÃO | NÃO | NÃO | NÃO | 5 |
| SIM | NÃO | NÃO | SIM | NÃO | 2 |
| SIM | SIM | NÃO | NÃO | SIM | 553 |
| SIM | SIM | NÃO | SIM | SIM | 27 |
| SIM | SIM | SIM | NÃO | SIM | 122 |
| SIM | SIM | SIM | SIM | SIM | 151 |
| NÃO | SIM | NÃO | NÃO | SIM | 5041 |
| NÃO | SIM | SIM | SIM | SIM | 127 |
| NÃO | SIM | SIM | NÃO | SIM | 47 |
| NÃO | SIM | NÃO | SIM | SIM | 45 |
| NÃO | NÃO | NÃO | SIM | NÃO | 3 |

Soma **6.123**. Marginais reconstituem Master 860, Operacional/Dicionário 6.113, Custos 447 e OP 355. O JSON lista todos os códigos por combinação, inclusive as três identidades “somente OP”.

### Grupos críticos A–E

Estes grupos pertencem **à Auditoria 3**; não reutilizam o significado das letras das auditorias anteriores.

| Medida | A: Custo + OP | B: só Custo | C: só OP |
| --- | --- | --- | --- |
| Códigos | 278 | 169 | 77 |
| Com Master | 151 | 122 | 29 |
| Com Operacional | 278 | 169 | 72 |
| Origem operacional resolvida | 278 | 169 | 72 |
| Família operacional resolvida | 134 | 24 | 1 |
| Classificado pelo status operacional atual | 134 | 24 | 1 |
| Com agrupamento Kustos atribuído | 0 | 0 | 0 |
| Classificação efetiva de Custos: origem + família | 195 | 128 | Não há fatos de Custo neste grupo |
| Diferença de família Master/Operacional | 61 | 104 | 26 |
| Diferença de origem Master/Operacional | 0 | 0 | 0 |
| Diferença de descrição Master/Operacional | 4 | 1 | 0 |
| Sem Operacional | 0 | 0 | 5 |
| Fisicamente no arquivo ERP | 278 | 169 | 77 |

**A:** 127 dos 278 não têm Master. Das 144 famílias operacionais ausentes, 61 têm contraparte resolvida no Master; a projeção atual de Custos classifica 195, mas OP continua com 134. Os quatro conflitos de descrição Master/Operacional estão dentro dos 61 de família, portanto **61 códigos**, e não 65, têm essas divergências cadastrais; considerando variações entre todas as fontes textuais há oito códigos com diferenças além do sufixo de Custos. Nenhum possui agrupamento. Não exigir grupo para reconhecer a identidade.

**B:** todos os 169 possuem Operacional, Tipo P no arquivo, sem marcador INATIVO/EXCLUIR; 122 elegíveis estão no Master, 47 são excluídos pela Origem. Nenhum órfão de Operacional, 47 órfãos de Master, 145 sem família operacional e 169 sem grupo. Os fatos e a presença no arquivo sustentam existência observada; não certificam atividade atual, origem de cada carga ou que sejam todos comercializáveis. Não há evidência para chamá-los inválidos, exclusivamente históricos ou técnicos.

**C:** 77 possuem OP sem Custos em toda a retenção; todos constam no arquivo, Tipo P, sem INATIVO/EXCLUIR. Há 29 no Master, 48 fora dele, 72 no Operacional e cinco ausentes. Somente um tem origem/família operacional completas. A ausência de Custos não prova invalidade. Preservar os eventos; os cinco ausentes exigem reconciliação posterior, não exclusão de OP.

**D estrito — somente Operacional:** **5.041 = Operacional − (Master ∪ Custos ∪ OP)**. São 5.040 códigos no arquivo, todos filtrados, e TESTE123 ausente fisicamente. O contexto mostra 4.398 Tipo C, 358 Tipo D, 284 Tipo P e um sem arquivo; **324 descrições INATIVO**, 64 EXCLUIR. Os 102 com origem/família completas devem ser preservados como valores existentes, sem presumir correção semântica. Não há flag ativa/inativa estruturada nem prova de que “nunca” tiveram movimento; há ausência apenas nos históricos retidos. Nomes ERP de manutenção, insumos e embalagens demonstram naturezas amplas, não invalidade.

Se “somente Operacional” significar **sem Custos/OP, permitindo Master**, a contagem é **5.594**, incluindo 553 também no Master. Declarar a definição evita a divergência aparente de 553 códigos.

**E estrito — somente Master:** **cinco códigos sem Operacional, Custo e OP**: `1041716`, `1041716P`, `1747719U`, `1841715`, `1841715P`. Todos constam no XLS e são elegíveis. Não há prova de que sejam recém-criados, ativos ou futuros; são identidades cadastradas sem movimento na retenção. Sua existência deve ser conservada na hipótese de universo cadastral completo. A lista de **sete Master sem Operacional** inclui também `1755712` e `1755713`, que já possuem OP; portanto não são cinco mais dois produtos “sem movimento”.

## 8. Custo × OP

| Competência | Fatos Custo | Eventos OP | Produtos Custo | Produtos OP | Ambos | Só Custo | Só OP | União mensal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04 | 251 | 0 | 251 | 0 | 0 | 251 | 0 | 251 |
| 2026-05 | 350 | 0 | 350 | 0 | 0 | 350 | 0 | 350 |
| 2026-06 | 357 | 296 | 357 | 169 | 137 | 220 | 32 | 389 |
| 2026-07 | 340 | 408 | 340 | 241 | 182 | 158 | 59 | 399 |
| 2026-08 | 206 | 386 | 206 | 215 | 136 | 70 | 79 | 285 |
| 2026-09 | 206 | 379 | 206 | 212 | 118 | 88 | 94 | 300 |
| 2026-10 | 771 | 0 | 349 | 0 | 0 | 349 | 0 | 349 |

- **278 códigos** existem nos dois históricos; **216** compartilham pelo menos um mês e **62** não compartilham nenhum mês. As interseções mensais somam **573 pares produto/mês**, não 573 produtos distintos.
- Entre os 278, o primeiro mês observado de Custo antecede OP em **234**, OP antecede Custo em **quatro**, e os primeiros meses coincidem em **40**. Isso mede início da **retenção observada**, não lançamento de produto ou ordem dos processos empresariais.
- Os quatro OP-primeiro são `1041199` (OP agosto, Custo outubro), `1042096` (agosto/outubro), `1045114` (julho/outubro) e `MB046` (junho/julho). O JSON conserva todos os meses, primeiros/últimos e os 62 sem interseção temporal.
- Custos cobrem abril–outubro, com datas completas até **26/10/2026**; OP cobre junho–setembro, datas de referência de 01/06 a 01/09. Não há eventos OP de abril/maio/outubro na base lida; isto não prova ausência de produção no ERP.
- As 771 linhas de Custo de outubro são 349 produtos com múltiplas datas integrais; não deduplicar fatos nem somar snapshots para “fechar” OP mensal.
- Não existe evidência suficiente de descontinuação ou produto novo a partir de primeiro/último movimento. Marcador INATIVO do cadastro, quando existe, é evidência textual separada; nenhum produto dos grupos A/B/C tem esse marcador no arquivo.

O runtime já relaciona por **código canônico + competência** em [op-custo-engine](../../core/op-custo-engine.js) e [getOpCustoContext](../../src/services/api.js). Não exige que um produto esteja simultaneamente nos dois lados; há cobertura e ausência explícita. Esta auditoria não alterou o motor, a cobertura, a escolha de inclusão ou as prioridades e não produziu consolidação numérica OP.

## 9. Órfãos

“Órfão” indica uma relação ausente, não um produto inválido. Bases e sobreposições são explícitas.

| Tipo | Base e definição | Códigos |
| --- | --- | --- |
| De Master | (Operacional ∪ Custos ∪ OP) − Master | 5263 |
| De Master, em uso | (Custos ∪ OP) − Master | 222 |
| De Operacional | (Master ∪ Custos ∪ OP) − Operacional | 10 |
| De Operacional, em uso | (Custos ∪ OP) − Operacional | 5 |
| De Custo | (Master ∪ Operacional) − Custos | 5673 |
| De OP | (Master ∪ Operacional) − OP | 5768 |
| Sem os dois movimentos | (Master ∪ Operacional) − (Custos ∪ OP) | 5599 |
| De origem operacional, em uso | 524 utilizados; cadastro ausente ou origem não resolvida | 5 |
| De família operacional, em uso | 524 utilizados; cadastro ausente ou família não resolvida | 365 |
| De agrupamento Kustos, em uso | 524 utilizados; sem grupo atribuído | 524 |

Dos 5.263 sem Master, **5.262 estão no arquivo e fora do filtro**, um é TESTE123 ausente do arquivo. Os 222 utilizados sem Master são todos encontrados no XLS e filtrados. Os dez sem Operacional são os sete do Master já listados mais `1758717`, `1758718`, `MCC016`; cinco desses dez têm OP.

### Estados diferentes, sem agregação indevida

| Estado | Evidência e tratamento |
| --- | --- |
| Ausência de registro | Cinco utilizados não têm linha operacional; não converter em família NULL de uma linha existente |
| NULL | Nos utilizados com Operacional: 360 familia_id NULL e 519 agrupamento_cod NULL |
| Blank textual | Zero strings vazias/whitespace nos três campos operacionais dos utilizados; NULL não foi contado como string vazia |
| Não classificado | Status operacional exige origem e família: 159 classificados e 365 restantes, dos quais cinco são cadastro ausente |
| Não aplicável | Não existe flag empresarial suficiente para declarar classificação não aplicável; não inferir de NULL |
| Não encontrado no catálogo | Referência preenchida sem categoria é distinta de NULL; zero nas origens/famílias operacionais preenchidas. Origem ERP 632 não resolve para dois Master |
| Fora do filtro | 5.395 no arquivo completo; 5.262 participam da união persistida sem Master. Produto físico não ausente |
| Sentinela | TESTE123 tem SEM_AGRUPAMENTO; referência existe, mas significa pendência, não grupo investigativo atribuído |

Os 365 sem família incluem **360 linhas com NULL + cinco registros ausentes**; os 524 sem grupo incluem **519 NULL + cinco ausentes**. Nenhum dos 524 utilizados possui os três eixos completos. Não transformar “sem grupo” em custo zero, impossibilidade de identidade ou categoria nova.

## 10. Produtos técnicos/intermediários

A análise usa **rótulos existentes de Descr(Origem)**; não criou taxonomia, regra de classificação ou validação por texto.

| Rótulo literal ERP | União persistida | Master | Operacional | Custo | OP | Custo ∩ OP |
| --- | --- | --- | --- | --- | --- | --- |
| MISTURAS | 139 | 0 | 138 | 104 | 75 | 66 |
| PRODUTOS SEMI-ACABADOS | 17 | 0 | 17 | 13 | 13 | 11 |
| MASSA PRODUZIDA FARDO/CX | 56 | 0 | 56 | 43 | 38 | 38 |
| MASSA PRODUZIDA PCT | 56 | 0 | 56 | 0 | 0 | 0 |
| MATERIAS PRIMAS | 468 | 0 | 468 | 0 | 0 | 0 |
| EMBALAGENS | 711 | 0 | 711 | 0 | 0 | 0 |
| MATERIAIS AUXILIARES DE PRODUCAO | 115 | 0 | 115 | 0 | 0 | 0 |
| MATERIAIS DE MANUTENCAO | 2712 | 0 | 2712 | 0 | 0 | 0 |
| SUBPRODUTOS REMOIDOS | 6 | 0 | 6 | 0 | 0 | 0 |
| CHOCOLATE PRODUZIDO CX | 116 | 115 | 116 | 97 | 45 | 45 |
| BISCOITO PRODUZIDO CX | 71 | 60 | 71 | 59 | 46 | 45 |

A fonte física tem **114 MASSA PRODUZIDA**, 57 de cada um dos dois rótulos; **112** participam da união persistida e dois são apenas fonte física. Os **43 com Custos e 38 com OP** estão em FARDO/CX; os 38 têm também Custos globalmente. Os 19 marcados INATIVO no universo físico continuam distintos dos demais. O literal PRODUZIDA não passa pelo filtro PRODUZIDO; isso não foi corrigido.

Misturas e semiacabados têm uso efetivo nos fatos e ausência de Master por filtro, demonstrando que identidade investigativa não pode se restringir à representação comercial do Master. Insumos, embalagens, auxiliares e manutenção têm rótulos explícitos e cadastro, mas zero Custos/OP nas fontes atuais; a auditoria não decide que terão que participar de toda análise. “Consumo interno”, natureza técnica formal, comercialização e atividade atual exigem outra evidência empresarial: não são inferidos de prefixo, Tipo ou descrição.

Exemplos verificáveis no JSON: `MCC016` é MISTURA RECHEIO CALZONE CARNE, com OP sem ambos os cadastros; `000001` é PLUG MACHO 10 A COM PRENSA CABO, no Operacional e arquivo, sem fatos; `1041596` é produto com Custos/OP e código preservado apesar do sufixo textual “ - U” no snapshot de Custos.

## 11. Divergências de descrição

Comparação por código; preservadas todas as descrições distintas de cada fato, não apenas a última. As classes textuais são triagem de auditoria, sem decidir qual fonte vence.

| Fontes | Códigos comparados | Conjunto literal igual | Diferença só sufixo “ - U” | Outras diferenças limitadas | Candidatos textuais muito distintos |
| --- | --- | --- | --- | --- | --- |
| master_operacional | 853 | 843 | 0 | 10 | 0 |
| master_custo | 273 | 0 | 260 | 13 | 0 |
| master_op | 180 | 178 | 0 | 2 | 0 |
| operacional_custo | 447 | 0 | 432 | 15 | 0 |
| operacional_op | 350 | 343 | 0 | 7 | 0 |
| custo_op | 278 | 0 | 272 | 6 | 0 |

A classe “diferença limitada” usa distância Levenshtein mínima relativa ≤20% após normalização textual para triagem; quando há várias descrições, basta uma aproximação, sem eliminar variantes. Não é prova de mesma identidade empresarial nem de diferença irrelevante. **Zero candidato acima desse limiar não certifica ausência de conflito de negócio.**

Há **14 códigos com múltiplas descrições em Custos e três em OP**, 15 códigos distintos na união desses casos. Os 2.481 snapshots de Custo possuem sufixo “ - U”; ele não aparece nos códigos e não autoriza anexar/remover U da identidade. Não houve descrição ausente nas linhas dos quatro conjuntos principais.

Divergências potencialmente relevantes, mesmo textualmente pequenas:

- `3748683/3748684/3748685`: Master informa **9 X 245 G**, Operacional **10 X 245 G**. Requer revisão empresarial, não equivalência por similaridade.
- `1749215`: fatos de Custos contêm **10 X 90 G** e **10 X 100 G**. Sem dados de vigência, isso não prova reciclagem de código nem autoriza alterar o histórico.
- `3748669`: CHOCOLATE versus CHOCOCOLATE.
- `3764638`: descrição com/sem LOVERS.
- Cinco códigos com sufixo U têm MAX versus MEGA; nenhum possui Custo/OP nesta fotografia.
- Comparando arquivo físico com Operacional são **11 diferenças**, dez já presentes em Master/Operacional e `E00252` adicional (BOBINA FILME BMSF SANTA FELICIDADE... versus ...FELICIDADE...). Essa diferença fora do Master não contradiz o recorte anterior de dez.

Descrições exatamente iguais em códigos diferentes: **quatro grupos no Master, 59 no Operacional, 60 no recorte do arquivo coberto pela união, dois em Custos e zero em OP**. Todos os grupos/códigos constam no JSON. Por exemplo, `1043120` e `1043599` compartilham GERMANI CEVADA SOLUVEL 6 X 100 G; `1841707` e `1841715` compartilham PERDIZ FARINHA DE MILHO MEDIA 12 X 1 KG REV. Igualdade do rótulo é insuficiente para afirmar duplicação empresarial. Não há alias, equivalência ou fusão comprovada.

## 12. Divergências de classificação

### Master × Operacional

Dos **853 compartilhados**, 853 origens coincidem após resolução por código/ID; **167 famílias coincidem** e **686 estão NULL no Operacional contra família resolvida no Master**. Zero diferença entre duas famílias preenchidas nesse recorte. Dez descrições divergem, todas dentro dos 686: não somar divergências como produtos adicionais.

Nos utilizados, são **191 diferenças de família**: 61 no grupo A, 104 em B, 26 em C. Custos usa a projeção ERP de origem/família quando Master existe, inclusive ausência ou falha de resolução; OP usa Operacional. O relatório informa ambas, sem escolher nova autoridade. [classificarCustos](../../core/custos-classification-engine.js) e [getProductClassificationStatus](../../core/product-master-engine.js) confirmam esse contrato atual.

### Arquivo físico × Operacional — universo mais amplo

Em **6.112 compartilhados**, as origens coincidem por código em todos. Famílias: **318 iguais**, **5.793 NULL no Operacional**, **uma diferença entre campos preenchidos**.

O caso **000001** tem arquivo ERP `familia_cod=80002`, enquanto Operacional aponta para categoria cujo código é `42502` (ID `6482a93b-f1ba-45f3-8f0b-af0b5a1ccdb2`). Está fora do Master e sem fatos. Registrar como conflito para revisão; não inferir autoria manual, escolher vencedor ou corrigir. É um achado de universo ampliado, não contradição com zero divergências preenchidas nos 853 Master/Operacional das auditorias anteriores.

Categorias atuais: origem `id` é **TEXT**, com os 50 IDs iguais aos respectivos códigos; família `id` é **TEXT com formato UUID**, distinta dos códigos de negócio; agrupamento tem `id` TEXT com Mxxx/sentinela, sem coluna `codigo` no catálogo real. As 6.112 origens e 319 famílias operacionais preenchidas encontram catálogo. Isso não prova que todo vínculo seja semanticamente correto, como demonstra a necessidade de revisão do 000001.

### Cinco agrupamentos ERP

| Campo ERP | Coluna | Arquivo: preenchidos / códigos | 524 utilizados: preenchidos / códigos | 278 grupo A: preenchidos / códigos | Persistência atual no Master |
| --- | --- | --- | --- | --- | --- |
| Agrup. Est. | P | 413 / 23 | 249 / 21 | 145 / 17 | Não há coluna equivalente |
| Agrup. Prod. | Q | 1.071 / 20 | 233 / 7 | 104 / 7 | agrupamento_erp_valor; 378 preenchidos |
| Agrup. Custos | R | 1.086 / 3 | 328 / 3 | 182 / 3 | Não há coluna equivalente |
| Agrup. Com. | S | 316 / 34 | 146 / 26 | 126 / 25 | Par comercial; 162 preenchidos |
| Agrup. Fiscal | T | 6.253 / 1 | 524 / 1 | 278 / 1 | Não há coluna equivalente |

Nos utilizados, os cinco campos têm **zero igualdade literal** com agrupamento Kustos, que está ausente. Nenhuma correspondência empresarial aprovada foi encontrada. Ausência de igualdade não prova impossibilidade de ponte; apenas impede inventá-la.

O único grupo operacional preenchido é TESTE123/SEM_AGRUPAMENTO, sem movimento e sem fonte física. Há 141 grupos preenchidos no mapa legado e 158 NULL; 12 referências preenchidas não encontram categoria atual. Não importar esse mapa para “recuperar” grupos: direção do trigger e fonte da UI não o tornam autoridade. Preservar dados e investigar separadamente.

Não há prova de que classificações operacionais exclusivas/diferentes sejam manuais ou corretas. A falta de autoria não autoriza sobrescrevê-las. Campos ERP e Kustos têm semânticas separadas; cinco agrupamentos ERP não se tornam automaticamente um eixo Kustos.

### Divergência documental vigente

A visão temática [engenharia Supabase](../engenharia-dados-supabase.md) chamava genericamente IDs de Origem/Família de UUID e omitia a projeção ERP na descrição da fonte de Custos. O catálogo e o código confirmam TEXT e a distinção de fontes acima. Foram corrigidas essas descrições factuais na visão temática e no modelo de banco vigente. O modelo também distingue o relato preparatório de LOG-02 do vínculo já aplicado, a ausência de comercial na etapa original dos 162 pares atuais, e NULL da sentinela de agrupamento. São correções documentais verificadas, sem mudança de comportamento. As Auditorias 1/2 e os contratos históricos foram preservados.

## 13. Proveniência

| Fonte | Disponível | Lacuna/limite |
| --- | --- | --- |
| Master | Cinco logs com arquivo/hash/lote/fonte; 604 linhas com ultima_importacao e atualizado_em; 378 com proveniência Agrup. Prod.; 110 criado_em | Vínculo de última escrita, não por campo nem prova de criação para todas as 860 linhas |
| Operacional | 6113 atualizado_em; valores atuais | Sem batch/arquivo/autor por linha; zero override/proveniência de agrupamento preenchidos; timestamp não prova origem ERP ou edição manual |
| Custos | 2481 competência/criado_em; 349 fatos ligados ao lote 31 | 2132 fatos sem lote; log não guarda arquivo/hash. Upsert substitui versão sobrevivente; vínculo atual não reconstrói todas as importações passadas |
| OP | 1469 fatos com FK de log; oito logs com arquivo, competência e data de importação | Log OP não possui coluna de autor nem hash do arquivo; nome não prova autenticidade ERP |
| Arquivo físico | Hash igual ao lote 5 e linha física por código | Arquivo conhecido de 22/10; não prova ERP atual ou vigência empresarial |
| Mapa e snapshots legados | Imagens históricas/execuções e valores atuais | Mapa não fornece auditoria de classificação manual nem autoridade reversa |
| Executor web/CLI | Web registra autor derivado da sessão autenticada; CLI exige string autor e aprovação/snapshot | Garantias são distintas; não atribuir autoria de todos os dados atuais a esse executor |

O lote OP **6** registra `teste.CSV`, competência julho. Isso é proveniência nominal, não prova de que cada fato seja sintético ou inválido; limita a certificação externa de origem real. Não foram relidos arquivos originais de todos os lotes, nem conteúdo privado de Auth.

As informações permitem rastrear parte dos eventos, não responder integralmente “de onde veio este produto?” para todo o Operacional ou todos os campos. Futuro contrato deve conservar proveniência **por fonte/evento quando disponível**, e declarar desconhecida a informação ausente.

## 14. Hipóteses de universo

| Hipótese | Códigos | Custos omitidos | OP omitidos | Master omitidos | Operacionais omitidos | Incluídos sem fatos |
| --- | --- | --- | --- | --- | --- | --- |
| Custos ∪ OP | 524 | 0 | 0 | 558 | 5594 | 0 |
| Master | 860 | 174 | 175 | 0 | 5260 | 558 |
| Operacional | 6113 | 0 | 5 | 7 | 0 | 5594 |
| Master ∪ Operacional | 6120 | 0 | 3 | 0 | 0 | 5599 |
| Master ∪ Operacional ∪ Custos ∪ OP | 6123 | 0 | 0 | 0 | 0 | 5599 |

**Mínimo necessário à investigação atual:** 524. Reconhece todos os fatos disponíveis; não preserva sozinho 558 identidades do Master nem 5.594 operacionais sem fatos. Não usar “mínimo” como critério de eliminação cadastral.

**Universo cadastral preservado:** 6.123. Master ∪ Operacional (6.120) ainda omite três identidades somente OP; acrescentar fatos é necessário nesta fotografia. A união não concede classificação, atividade, permissão de escrita ou participação automática em toda análise. Cada módulo continua selecionando fatos/recortes pertinentes.

**Arquivo bruto como universo automático:** 6.256 na união com TESTE123, incluindo 133 códigos apenas físicos. Não há evidência suficiente para aprovar admissão automática de todo arquivo, nem para excluir tais códigos como inválidos.

## 15. Matriz de decisão

| Modelo | Vantagem | Risco | Evidência favorável | Evidência contrária |
| --- | --- | --- | --- | --- |
| A — Master único | Fonte ERP auditável e catálogo elegível | Perder identidade de fatos e dimensão operacional | 860 elegíveis coincidem com arquivo/lote; família resolvida para os 860 | 174 Custos/175 OP fora; filtros textuais; grupos ERP não são Kustos |
| B — Operacional único | Reutiliza dimensão existente e classificações | Omitir identidades e conteúdo ERP; manter lacunas como se fossem completude | 6113; todos Custos; 350/355 OP; editor existente | 7 Master ausentes e 5 OP ausentes; 5794 famílias NULL; não contém os campos ERP |
| C — União/reconciliação | Cobertura sem apagar identidades | União de linhas não define autoridade; usar só ERP+Operacional omite 3 OP | 6123 após incluir fatos; mapa/histórico não acrescentam | Reconciliação automática pode destruir classificação; divergências e elegibilidade exigem política |
| D — Identidade única + fontes | Separa código, classificação, fato e proveniência | Pode virar nova fonte duplicada se materializada sem necessidade | Código compartilhado já funciona; cobertura e classificações distintas comprovadas | Não há prova de necessidade de nova tabela/ID; autoria/vigência/equivalências ainda incompletas |

A e B são insuficientes como universo único sob o requisito de preservar todos os fatos/cadastros. C resolve cobertura apenas se inclui Custos/OP; D acrescenta a separação conceitual exigida pelos campos e lifecycles reais.

## 16. Recomendação

### Recomendação da auditoria

**Modelo D no plano lógico, com identidade por código e múltiplas fontes, usando a união completa de 6.123 códigos como universo cadastral preservado e 524 como recorte investigativo mínimo atual.** Aplicar o princípio de reconciliação do Modelo C sem fundir classificações ou destruir proveniência. Não criar nova fonte de verdade. A decisão física — reutilização da dimensão, projeção de leitura, garantias de inclusão ou eventual outra estrutura — permanece **insuficiente para decisão** sem contrato e aprovação posteriores.

### Respostas objetivas sobre identidade

| Pergunta | Resposta sustentada |
| --- | --- |
| Unidade de identidade | codigo_produto normalizado; cod_produto de OP pertence ao mesmo domínio. Chave de evento/mês/estágio é outra unidade |
| Mesmo código representa identidades diferentes? | Nenhum caso comprovado. Há mudanças de rótulo/quantidade que exigem revisão; não provam reciclagem nem ausência dela |
| Códigos diferentes são o mesmo produto? | Nenhuma equivalência comprovada. Há descrições iguais em códigos diferentes, insuficientes para fusão |
| Custos e OP compartilham código? | Sim: 278 globalmente e 216 com ao menos uma competência comum; contrato runtime confirma código+mês |
| Master substitui Operacional? | Não com as evidências atuais: exclui identidades usadas e não contém classificação Kustos equivalente |
| Operacional substitui Master? | Não integralmente: faltam sete identidades ERP e campos/proveniência ERP próprios; classificação de Custos já usa Master |
| Camada canônica independente? | Separação lógica necessária; uma nova persistência independente não está demonstrada. Reutilizar o existente deve ser avaliado primeiro |

### Contrato conceitual proposto — não implementado

- **IDENTIDADE:** um código normalizado pelo helper existente; fontes acrescentam presença, não outra chave por descrição. Nenhum alias/fusão sem equivalência empresarial documentada. Código desconhecido deve poder ser reconhecido como identidade observada sem ganhar classificação fictícia.
- **FONTES:** ERP físico e Master elegível são estados distintos; Operacional, Custos e OP conservam registros/autoridades próprias. Presença em arquivo, filtro, cadastro, fatos e atividade são flags separadas.
- **CLASSIFICAÇÃO:** origem, família e agrupamento permanecem atribuídos à respectiva fonte e regra vigente. Não escolher vencedor neste contrato; conflitos, campos vazios e referências sem resolução ficam explícitos. Agrupamentos ERP não são agrupamento Kustos.
- **FATO HISTÓRICO:** preservar IDs, código, descrição snapshot, competência, importação e métricas durante a reconciliação cadastral. “Histórico imutável” é o objetivo de não modificar fatos nessa futura operação; **não descreve uma capacidade de versionamento já existente**. Custos hoje faz upsert por produto/data e OP conserva eventos; retenção imutável ampliada exige decisão própria.
- **PROVENIÊNCIA:** por fonte/evento quando disponível; não inventar arquivo, autor, lote ou classificação manual. Competência continua data_referencia, importação continua criado_em.
- **INTEGRIDADE:** todos os códigos com fatos devem ser contabilizados mesmo sem cadastro/classe; fonte indisponível não pode virar conjunto vazio. Universo e estados devem ter controles reconciliáveis e ausência explícita.
- **EXECUÇÃO FUTURA:** Preview, aprovação, escopo de patches, preservação de vazios/manual, bloqueio de conflitos, snapshot, transação, provas e reversão precisam de contrato específico. Esta proposta não substitui silenciosamente o executor de reconstrução integral vigente.

**IDENTIDADE ≠ CLASSIFICAÇÃO ≠ FATO HISTÓRICO ≠ PROVENIÊNCIA.**

### Impacto na reconstrução

| Categoria | Delimitação para a próxima etapa |
| --- | --- |
| Precisa ser reconstruído | O contrato do universo/eligibilidade e o plano de projeção/reconciliação, antes de qualquer dado. Não foi demonstrada necessidade de apagar/recriar uma tabela |
| Precisa ser preservado | 6123 identidades observadas; 6113 operacionais, 860 Master e todos os fatos/IDs/datas/campos manuais/ERP/proveniência conhecidos, com suas sobreposições |
| Precisa ser reconciliado | Dez ausências operacionais (cinco em uso), 5263 ausências de Master por natureza/filtro, famílias vazias/conflitantes, descrições e proveniência parcial; sem preencher automaticamente |
| Precisa de decisão humana | Inclusão por natureza/fonte, elegibilidade PRODUZIDA/INATIVO/EXCLUIR, autoridade por campo e vazios, admissão dos 133 físicos sem cadastro, estratégia incremental e eventual retenção histórica |
| Não deve ser alterado por esta auditoria | Banco, classificações, 860/6113, filtros, categorias, schema/RLS/Auth, motores, OP/Custos/OP×Custo e regras temporais |

Reconstrução atual exige `RECONSTRUCAO_UNIVERSO_V2` e pode remover do **Master** ausentes/filtrados após aprovação integral; protege Operacional/mapa/fatos. Não implementa reconciliação incremental para o Operacional. Alterar esse comportamento exige nova decisão; a recomendação não autoriza rodar o executor atual com um universo calculado diferente.

## 17. Limitações

- Fonte ERP física conhecida de 22/10; sem ERP ao vivo, status ativo empresarial ou prova de completude de todos os tipos de movimento. Não atribuir fim de vida pelo último mês observado.
- Dados retidos não representam necessariamente todas as versões anteriores: UNIQUE/upsert de Custos limita histórico; log OP com nome teste.CSV exige cautela sobre certificação externa de origem, sem invalidar códigos.
- Igualdade de hashes antes/depois prova preservação observada; não fornece auditoria contínua de concorrência ou detecta alteração transitória revertida. Nenhum writer foi executado pela tarefa.
- Comparação é classificação atual, não histórica por competência. NULL não declara “não aplicável”. Status classificado do runtime usa dois campos; não prova qualidade empresarial.
- Sem documento de equivalência de códigos, unidade de produto empresarial ou vigência ERP, não se prova nem se refuta reciclagem de código apenas por descrições. Não criar aliases.
- Sem ponte empresarial para cinco agrupamentos ERP; sem autoria por campo de toda classificação operacional. Nenhuma categoria ou nova taxonomia inferida.
- Sem inspeção visual, importação ou execução de reconstrução. Não é validação funcional de uma implementação proposta.

### Teste de consistência

Controles independentes locais e SQL concordaram em **6.123 códigos, 11 combinações não vazias, quatro marginais, todas as interseções e sete competências**. Custos: soma mensal 2.481 fatos, 447 códigos contabilizados; OP: soma 1.469 eventos, 355 códigos; cadastros: 860 e 6.113. Todos os 6.123 códigos têm uma única tupla; cada conjunto consta integralmente no JSON. Zero identidade inválida/alterada/colidida; repetições de fatos não tratadas como duplicidades cadastrais. Divergências textuais/cadastrais mantêm recorte e listas de códigos, sem somar flags sobrepostas.

### Validação técnica

| Verificação | Resultado |
| --- | --- |
| Suíte completa | 990/990; 52 arquivos; 48,26 s |
| Relacionados Cadastro Mestre/Operacional/classificação | 433/433; 22 arquivos; 20,28 s; subconjunto dos 990 |
| Lint | OK; zero erros/avisos |
| Typecheck | OK; tsc --noEmit -p jsconfig.json |
| Build local | OK; buildWeb; configuração pública em memória; somente dist ignorado, sem publicação |
| git diff --check | OK; arquivos novos também conferidos para whitespace/newline |
| Documentos/JSON/links/contagens | OK; 18 seções, 26 links locais no relatório, marginais/partições/fatos e quatro documentos anteriores preservados |

Comandos equivalentes aos scripts de package.json, com binários locais porque npm não está no PATH: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=dot`; seleção relacionada via `rg --files tests -g '*cadastro-mestre*.test.js' -g '*product-master*.test.js' -g '*custos-classification*.test.js'`; `node node_modules/eslint/bin/eslint.js .`; `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`. Build invoca `buildWeb({env})` do mesmo script usando exclusivamente configuração pública obtida em memória, com host Supabase confirmado; não escreveu env/runtime-config versionado, não imprimiu chave nem publicou.

### Banco e Git

**INSERT: 0; UPDATE: 0; DELETE: 0; MIGRATIONS: 0; IMPORTAÇÃO REAL: NÃO.** Nenhuma escrita, RPC, rebuild, função de produção, categoria, produto ou classificação foi executada. Contagens e MD5 integrais iguais nas 12 tabelas públicas e oito históricas de audit_kustos. As instruções SELECT e controles estão no JSON.

**commit: NÃO; push: NÃO; deploy: NÃO.** Nenhum arquivo de runtime, teste, migration ou configuração foi modificado. Somente relatório/evidência desta auditoria, correções factuais da visão temática/modelo de banco e registro documental no AGENTS; README, manuais, contratos de execução e os quatro arquivos das Auditorias 1/2 foram preservados.

## 18. Próxima decisão necessária

Aprovar ou rejeitar explicitamente o **contrato lógico de identidade por código com fontes separadas**, antes de desenhar a reconstrução incremental. A aprovação futura deve responder:

1. O universo cadastral deve conservar a união de 6.123 identidades e admitir novas identidades por observação em fatos, mesmo sem Master/classificação? Como tratar os 133 apenas físicos e naturezas auxiliares?
2. Qual política empresarial de elegibilidade ERP distingue ativo, INATIVO, EXCLUIR e PRODUZIDA, sem confundir ausência com filtro? Não basta substituir uma palavra e executar.
3. Quais fontes têm autoridade **por campo**, com que política de vazios, conflito e preservação manual? Resolver especialmente 000001, embalagens divergentes e famílias sem catálogo, sem ponte de grupos presumida.
4. Como suprir os dez cadastros operacionais ausentes e reconhecer identidades sem ambos os cadastros, reutilizando a dimensão existente e evitando segunda fonte de verdade?
5. O futuro fluxo recebe arquivo integral ou delta, quais ausências permitem ação, como mantém proveniência/reversão e qual retenção histórica é necessária? Isso modifica o contrato atual e requer desenho/validação próprios.

Nenhuma dessas escolhas foi executada. O relatório fornece a base para decisão arquitetural; não constitui autorização de reconstrução, carga ou publicação.
