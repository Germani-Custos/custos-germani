# Cadastro Mestre, Cadastro Operacional e Custos — auditoria de classificação

## 1. Objetivo

Responder à situação real dos cadastros e à ausência de Agrupamento no universo de Custos, cruzando os dados existentes sem preencher, excluir, importar ou reconstruir nada. **Status: CONCLUÍDO, somente leitura.** A conclusão descreve a fotografia atual e os contratos encontrados; não autoriza uma ponte ERP → Kustos.

Distinções usadas: **fato observado** é o resultado da leitura; **evidência** identifica consulta, arquivo ou trecho do checkout; **hipótese** é uma explicação ainda não comprovada; **decisão pendente** exige definição humana antes de qualquer implementação. Quantidades referem-se a códigos distintos, salvo quando a unidade é explicitamente registros/fatos.

## 2. Data da auditoria

30/10/2026, fuso America/Sao_Paulo. Fotografia conjunta de dados: **14:09:30** (17:09:30 UTC). Controle das 12 tabelas públicas: **14:13:52 → 14:17:34** (17:13:52 → 17:17:34 UTC), com contagens e fingerprints idênticos; as 11 tabelas já presentes na fotografia conjunta também coincidiram com o primeiro controle. HEAD inicial/final: `486b646b25d0929dedb80804493cdcd88b34e537`; checkout inicialmente limpo.

O último arquivo ERP comprovado é de **22/10/2026**, identificado no lote 5. Não há consulta ao ERP ao vivo nem afirmação de que esse arquivo represente todos os produtos cadastrados no ERP em 30/10. “Universo ERP atual” neste relatório significa o universo persistido no Master e o conjunto elegível do último arquivo comprovado.

## 3. Fontes consultadas

- [AGENTS](../../AGENTS.md), [Regras Gerais](../regras-gerais.md), [README](../../README.md), [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md), [Manual Técnico](../manuais/manual-tecnico.md), [Manual de Operação](../manuais/manual-operacao.md) e [backlog](backlog-priorizado.md).
- [Engenharia de dados Supabase](../engenharia-dados-supabase.md), [modelo de banco](../arquitetura/banco-de-dados.md), [matriz operacional](../arquitetura/matriz-contratos-operacionais.md), [Cadastro/UX](../ux/cadastro-mestre.md), [Preview](../arquitetura/cadastro-mestre-preview.md), [aprovação](../arquitetura/cadastro-mestre-aprovacao.md), [reconstrução](../arquitetura/cadastro-mestre-reconstrucao.md), [famílias](../arquitetura/cadastro-mestre-familias-erp.md), [comercial ERP](../arquitetura/cadastro-mestre-agrupamento-comercial-erp.md) e [OP × CUSTO](../arquitetura/op-custo.md).
- Auditorias existentes: [reconstrução](cadastro-mestre-reconstrucao-validacao.md), [comercial e consulta](cadastro-mestre-comercial-validacao.md), [classificação de Custos](custos-classificacao-erp.md), [agrupamento/cascata](custos-agrupamento-validacao.md) e [segurança/RLS](seguranca-rls-validacao.md). Números históricos não substituíram leituras atuais.
- Supabase **Custos-Germani / umpebdovrazzrdndhigc**, conexão Primary: apenas SELECTs administrativos de tabelas/catálogos, sem RPC ou SQL no frontend, sem chamadas de importação/execução. Uma única instrução SELECT capturou conjuntamente Master, Operacional, Custos, códigos de OP, categorias, mapa, resumos de logs e colunas. Metadados de triggers/funções foram lidos por `pg_get_*`; as funções de escrita não foram invocadas.
- Código: [API](../../src/services/api.js), [classificação de Custos](../../core/custos-classification-engine.js), [adapter ERP](../../src/services/cadastro-mestre-preview.js), [Preview puro](../../core/cadastro-mestre-preview-engine.js), [manifesto](../../core/cadastro-mestre-approval-engine.js), [plano de reconstrução](../../core/cadastro-mestre-reconstruction-engine.js), [executor](../../scripts/lib/cadastro-mestre-reconstruction.mjs), [cadastro operacional](../../core/product-master-engine.js) e [normalização canônica](../../core/spreadsheet-engine.js). Leitura de código não executou writers.

**Fonte ERP física:** `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\cadastro mestre 22_10.xls`, **24.405.643 bytes**, primeira aba **Sheet1**, cabeçalho na linha 1, **6.255 linhas de dados**. SHA-256 **46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff**, igual ao `arquivo_hash` do lote 5 e à releitura final do arquivo. Não houve modificação, upload, conversão, avaliação de macros/fórmulas ou links externos.

O reader SheetJS/adapter oficiais e o núcleo puro de Preview foram usados localmente para identificar elegibilidade, sem aprovação/manifesto de execução ou conexão de escrita. Os 860 códigos elegíveis coincidem exatamente com o Master: **zero de cada lado sem correspondente**. Exclusões por etapa: 383 por Tipo, 4.891 por Origem, 121 por descrição; **6.255 = 860 + 383 + 4.891 + 121**. O contexto local reduzido forneceu identidades reais do Master e catálogos vazios apenas para essa contagem de elegibilidade; não certifica resolução cadastral, apurada separadamente contra os catálogos reais.

**Evidência por produto e reprodutibilidade:** [cadastro-mestre-classificacao-evidencias.json](cadastro-mestre-classificacao-evidencias.json) contém os 447 códigos de Custos, existência em cada cadastro, campos/descrições originais, resoluções por chave, classe A/B/C e marcador D, fatos/competências, linha física e cinco campos do XLS, distribuições, listas de diferenças e fingerprints. Não contém credenciais ou valores monetários. A identidade entre fontes foi apurada por código; não houve junção aproximada por descrição. Todos os códigos da fotografia já estavam canônicos, sem alterações/colisões pelo normalizador.

Um SELECT agregado independente confirmou os totais centrais: 447 custos, 447 operacionais, 273 no Master, 158 com família operacional, zero com agrupamento, 165 diferenças de família, zero de origem, cinco de descrição, 355 OP e 350 OP no operacional. Resultado integral e método de preservação constam no JSON.

## 4. Universo real encontrado

| Universo/medida | Quantidade |
| --- | --- |
| Master ERP — registros / códigos distintos | 860 / 860 |
| Operacional — registros / códigos distintos | 6.113 / 6.113 |
| Produtos distintos com Custos | 447 |
| Fatos históricos de Custos | 2.481 |
| Produtos com ao menos uma competência de Custos | 447 |
| Primeiro / último data_referencia | 01/04/2026 / 26/10/2026 |
| Produtos identificáveis de OP | 355 |
| OP relacionados ao Operacional / sem correspondente | 350 / 5 |
| Categorias: Origem / Família / Agrupamento | 50 / 103 / 34 |
| Mapa legado / familias_base | 299 / 21 |


`data_referencia` = **competência**; `criado_em` = **evento/importação**. As datas extremas são das competências dos fatos, não das datas do arquivo, do log ou do cadastro. As contagens globais de produtos não são uma consolidação mensal de OP.

| Cadastro | Com origem | Sem origem | Com família | Sem família | Com agrupamento | Sem agrupamento |
| --- | --- | --- | --- | --- | --- | --- |
| Master ERP (Origem/Família/Prod. brutos) | 860 | 0 | 860 | 0 | 378 | 482 |
| Operacional (origem_id/familia_id/agrupamento_cod) | 6112 | 1 | 319 | 5794 | 1 | 6112 |


No Master, os 378 agrupamentos acima são **Agrup. Prod. ERP**, não classificação Kustos; Agrup. Com. possui **162 preenchidos / 698 vazios**. No Operacional, todos os 6.113 têm descrição; as 6.112 referências de origem e as 319 de família preenchidas encontram seu ID no catálogo. As colunas de override manual e proveniência de agrupamento têm **zero valores preenchidos**. O único `agrupamento_cod` preenchido é `SEM_AGRUPAMENTO` de TESTE123, portanto não constitui uma classificação investigativa completa.

### Distribuição do Master por Origem

| Código de negócio | Descrição oficial | Produtos |
| --- | --- | --- |
| 515 | CHOCOLATE PRODUZIDO UN | 216 |
| 510 | CHOCOLATE PRODUZIDO PCT | 122 |
| 410 | CHOCOLATE PRODUZIDO CX | 115 |
| 525 | BISCOITO PRODUZIDO PCT | 72 |
| 425 | BISCOITO PRODUZIDO CX | 60 |
| 625 | BISCOITO REVENDA PCT | 45 |
| 725 | BISCOITO REVENDA CX | 39 |
| 550 | CEREAIS E MATINAIS PRODUZIDO PCT | 38 |
| 450 | CEREAIS E MATINAIS PRODUZIDO FARDO/CX | 33 |
| 700 | MASSA REVENDA CX | 27 |
| 600 | MASSA REVENDA PCT | 24 |
| 475 | MACARRAO INSTANTANEO PRODUZIDO CX | 19 |
| 575 | MACARRAO INSTANTANEO PRODUZIDO PCT | 19 |
| 630 | CEREAIS E MATINAIS REVENDA PCT | 16 |
| 730 | CEREAIS E MATINAIS REVENDA CX | 11 |
| 631 | PANIFICAÇÃO REVENDA UN | 2 |
| 632 | Sem correspondência por código | 2 |


Soma: 860 produtos em 17 códigos de origem. Código 632 tem dois produtos e não encontra `categorias_origem.codigo`; não resolver por texto ou pelo ID.

### Distribuição do Master por Família

| Código de negócio | Descrição oficial | Produtos |
| --- | --- | --- |
| 51504 | ARTESANAIS KG | 90 |
| 51506 | PASCOA UN | 51 |
| 62502 | BISCOITO REVENDA DOCE EMPILHADO PCT | 44 |
| 72502 | BISCOITO REVENDA DOCE EMPILHADO CX | 38 |
| 51004 | NATAL UN | 33 |
| 52501 | BISCOITO PRODUZIDO DOCE SOLTO PCT | 31 |
| 41010 | BARRA CATTE CX | 27 |
| 41011 | PASCOA CX | 27 |
| 51509 | BARRA CATTE UN | 27 |
| 42501 | BISCOITO PRODUZIDO DOCE SOLTO CX | 25 |
| 47501 | MACARRAO INSTANTANEO PRODUZIDO CX | 19 |
| 57501 | MACARRAO INSTANTANEO PRODUZIDO PCT | 19 |
| 52502 | BISCOITO PRODUZIDO DOCE EMPILHADO PCT | 18 |
| 41004 | BOMBOM CX | 17 |
| 52504 | BISCOITO PRODUZIDO SALGADO EMPILHADO PCT | 17 |
| 42502 | BISCOITO PRODUZIDO DOCE EMPILHADO CX | 16 |
| 51005 | DRAGEAS GRANEL KG | 15 |
| 51503 | BOMBOM ESTRUTURA UN | 15 |
| 60001 | MASSA REVENDA ESPECIAL CURTA PCT FD | 15 |
| 70001 | MASSA REVENDA ESPECIAL CURTA FARDO | 14 |
| 42504 | BISCOITO PRODUZIDO SALGADO EMPILHADO CX | 13 |
| 51011 | BARRAS UN | 11 |
| 51507 | ARTESANAIS UN | 11 |
| 41006 | BARRAS CX | 10 |
| 51006 | DRAGEAS POTE UN | 10 |
| 51009 | BOMBOM CAIXA UN | 10 |
| 55002 | DERIVADOS DE MILHO PRODUZIDO PCT | 10 |
| 45002 | DERIVADOS DE MILHO PRODUZIDO FARDO | 9 |
| 51008 | BOMBOM PCT | 9 |
| 41008 | TABLETES CX | 8 |
| 51007 | BARRA QUADRADO UN | 8 |
| 51012 | TABLETES UN | 8 |
| 51502 | BOMBOM DELIZIE UN | 8 |
| 51505 | BOMBOM DELIZIE PCT | 8 |
| 63001 | BOLOS E MISTURAS REVENDA PCT | 8 |
| 73001 | BOLOS E MISTURAS REVENDA CX | 7 |
| 41002 | CAIXA SPECIALLE CX | 6 |
| 41009 | BOMBOM CATTE CX | 6 |
| 42503 | BISCOITO PRODUZIDO SALGADO SOLTO CX | 6 |
| 45003 | DERIVADOS DE MANDIOCA PRODUZIDO FARDO/CX | 6 |
| 51003 | CAIXA SPECIALLE UN | 6 |
| 51010 | BISCOITO COM CHOCOLATE UN | 6 |
| 51508 | BOMBOM CATTE UN | 6 |
| 52503 | BISCOITO PRODUZIDO SALGADO SOLTO PCT | 6 |
| 55003 | DERIVADOS DE MANDIOCA PRODUZIDO PCT | 6 |
| 70004 | MASSA REVENDA ESPECIAL CURTA CX | 6 |
| 41005 | BISCOITO COM CHOCOLATE CX | 5 |
| 45008 | CEREAIS PRODUZIDO CX | 5 |
| 55001 | DERIVADOS DE AVEIA PRODUZIDO PCT | 5 |
| 55004 | CEREAIS PRODUZIDO PCT | 5 |
| 55008 | CEREAIS PRODUZIDOS PCT | 5 |
| 41007 | TAVOLETTAS CX | 4 |
| 45001 | DERIVADOS DE AVEIA PRODUZIDO FARDO | 4 |
| 45004 | CEREAIS PRODUZIDO FARDO | 4 |
| 51002 | TAVOLETTAS UN | 4 |
| 60003 | MASSA REVENDA VEGETAIS CURTA PCT | 4 |
| 60004 | MASSA REVENDA ESPECIAL CURTA PCT CX | 4 |
| 70003 | MASSA REVENDA VEGETAIS CURTA FARDO/CX | 4 |
| 41003 | DRAGEAS POTE CX | 3 |
| 41001 | ALFAJOR CX | 2 |
| 45005 | MATINAIS PRODUZIDO FARDO | 2 |
| 45009 | MATINAIS PRODUZIDO CX | 2 |
| 51001 | ALFAJOR DISLAY UN | 2 |
| 55005 | MATINAIS PRODUZIDO PCT | 2 |
| 55007 | SOPAS PRODUZIDO PCT | 2 |
| 55009 | MATINAIS PRODUZIDO PCT | 2 |
| 63002 | FARINHAS REVENDA PCT | 2 |
| 63003 | FARINHAS REVENDA FD | 2 |
| 63004 | PAES REVENDA UN | 2 |
| 63005 | DERIVADOS DE M R PCT | 2 |
| 63101 | PANETONE REVENDA UN | 2 |
| 63201 | DERIVADOS DE MILHO REVENDA PCT | 2 |
| 73002 | PAES REVENDA CX | 2 |
| 73003 | DERIVADOS DE M R FD | 2 |
| 73101 | DERIVADOS DE MILHO REVENDA FARDO | 2 |
| 45010 | DERIVADOS DE MILHO PRODUZIDO CX | 1 |
| 55010 | DERIVADOS DE MILHO PRODUZIDO PCT | 1 |
| 60002 | MASSA REVENDA ESPECIAL LONGA PCT | 1 |
| 62504 | BISCOITO REVENDA SALGADO EMPILHADO PCT | 1 |
| 70002 | MASSA REVENDA ESPECIAL LONGA FARDO/CX | 1 |
| 72504 | BISCOITO REVENDA SALGADO EMPILHADO CX | 1 |


Soma: 860 produtos em 81 códigos de família. Todos encontram exatamente uma categoria por código.

### Distribuição dos agrupamentos persistidos no Master

| Agrup. Prod. | Produtos |
| --- | --- |
| Não informado | 482 |
| P005 | 258 |
| P802 | 82 |
| P801 | 33 |
| P302 | 5 |


| Agrup. Com. | Produtos |
| --- | --- |
| Não informado | 698 |
| C011 | 16 |
| C003 | 12 |
| C025 | 12 |
| C034 | 11 |
| C022 | 10 |
| C020 | 9 |
| C033 | 9 |
| C006 | 8 |
| C008 | 7 |
| C031 | 7 |
| C007 | 6 |
| C009 | 6 |
| C004 | 5 |
| C019 | 5 |
| C021 | 5 |
| C012 | 4 |
| C017 | 4 |
| C018 | 4 |
| C028 | 4 |
| C015 | 3 |
| C013 | 2 |
| C014 | 2 |
| C016 | 2 |
| C023 | 2 |
| C024 | 2 |
| C035 | 2 |
| C005 | 1 |
| C010 | 1 |
| C029 | 1 |


## 5. Custos × Operacional

**Fato observado:** os 447 códigos de Custos existem no Operacional; zero ausentes. O cruzamento é por código e considera todo o histórico disponível.

```text
CUSTOS — 447 produtos / 2.481 fatos
├── Presentes no Operacional: 447
│   ├── Com origem: 447 / sem origem: 0
│   ├── Com família: 158 / sem família: 289
│   ├── Com agrupamento: 0 / sem agrupamento: 447
│   ├── Com descrição: 447 / sem descrição: 0
│   └── Também presentes no Master ERP: 273
└── Ausentes do Operacional: 0
```

**Evidência:** fotografia conjunta, SELECT independente e `custos_por_codigo` no JSON. O preenchimento de Origem não implica família/agrupamento completos. Não houve atualização do Operacional para eliminar pendências.

## 6. Custos × Master ERP

| Classe | Definição | Quantidade |
| --- | --- | --- |
| A — Compartilhado | Presente no Master e no Operacional | 273 |
| B — Somente operacional | Presente no Operacional e ausente do Master | 174 |
| C — Somente Master no universo de Custos | Presente no Master e ausente do Operacional | 0 |
| Sem os dois cadastros | Produto de Custos sem correspondente em ambos | 0 |
| D — Divergente (subconjunto de A) | Diferença relevante de descrição/origem/família | 165 |


**A + B + C + sem os dois = 447. D não é uma classe disjunta:** marca 165 dos 273 compartilhados; restam 108 compartilhados sem diferenças nos campos comparados. Usou-se comparação exata após trim técnico; nenhuma inferência por rótulo ou substituição de valor.

- Origem: **zero divergências** entre referência operacional e ID resolvido pelo código ERP dos compartilhados.
- Família: **165 divergências**, todas por família operacional vazia e família ERP resolvida. Zero casos com duas famílias preenchidas e diferentes.
- Descrição: **cinco divergências**, todas dentro desses 165 casos. Nenhuma delas é somente o sufixo “ - U”. As duas descrições ficam preservadas.

| Código | Descrição operacional | Descrição Master / XLS |
| --- | --- | --- |
| 3748669 | CATTE BARRA CHOCOCOLATE BRANCO 10 X 80 G | CATTE BARRA CHOCOLATE BRANCO 10 X 80 G |
| 3748683 | CATTE BARRA MEGA CHOCOBISCUIT AVELA 10 X 245 G | CATTE BARRA MEGA CHOCOBISCUIT AVELA 9 X 245 G |
| 3748684 | CATTE BARRA MEGA CHOCOBISCUIT BLACK 10 X 245 G | CATTE BARRA MEGA CHOCOBISCUIT BLACK 9 X 245 G |
| 3748685 | CATTE BARRA MEGA CHOCOBISCUIT CLASSICO 10 X 245 G | CATTE BARRA MEGA CHOCOBISCUIT CLASSICO 9 X 245 G |
| 3764638 | CATTE BOMBOM CHOCOLATE AO LEITE COM RECHEIO AVELA 6 X 240 G | CATTE BOMBOM CHOCOLATE AO LEITE COM RECHEIO AVELA LOVERS 6 X 240 G |


**Ressalva de negócio:** três mudanças de 10 × 245 g para 9 × 245 g são relevantes para conferência da apresentação do produto, mas esta auditoria não recalcula custos nem afirma que o conteúdo do fato deva ser substituído. Descrição de cadastro atual não reescreve o snapshot histórico.

Nos 273 produtos com Custos presentes no Master, 273 têm origem/família ERP informadas e resolvidas; 145 têm Agrup. Prod. e 96 têm Agrup. Com. A análise de Custos aplica CUSTOS-ERP-01 em memória: família efetiva resolvida passa de **158 operacionais para 323 analíticas** (273 do Master + 50 por fallback fora dele); 124 continuam sem família efetiva. Não houve sincronização persistida.

## 7. Situação dos agrupamentos

**Causa comprovada do estado atual:** a dimensão consumida pela cascata é `dicionario_produtos.agrupamento_cod`, nula nos 447 produtos com custos. Os fluxos ERP atuais preservam dados no Master e **não projetam agrupamento para o Operacional**; não existe ponte empresarial aprovada. A leitura atual não prova quem ou quando deixou de preencher/limpou classificações no passado. Não atribuir a ausência a uma carga específica sem histórico de antes/depois.

O catálogo `categorias_agrupamento` contém 34 categorias; sua chave de negócio é `id` TEXT (Mxxx e SEM_AGRUPAMENTO), não há `codigo` separado. O Master persiste `agrupamento_erp_valor` para Agrup. Prod. e o par `agrupamento_comercial_erp_cod/descricao` para Agrup. Com. **Est., Custos e Fiscal não têm colunas próprias no Master.** A ausência de coluna não foi confundida com campo vazio: as cinco colunas foram inspecionadas no XLS comprovado.

Base da tabela: **447 produtos com Custos, presentes no Operacional, todos com agrupamento NULL e todos encontrados no XLS**. Preenchimento no XLS inclui também os 174 produtos excluídos do universo Master. A coluna de persistidos se restringe aos 273 presentes no Master, sem inventar persistência dos demais.

| Campo ERP / coluna | Preenchidos no XLS / 447 | Distintos no XLS | Cobertura | Persistidos no Master entre os 447 | Correspondências exatas com catálogo Kustos |
| --- | --- | --- | --- | --- | --- |
| Agrup. Est. / P | 246 | 20 | 55,03% | Campo não persistido | 0 |
| Agrup. Prod. / Q | 201 | 7 | 44,97% | 145 | 0 |
| Agrup. Custos / R | 301 | 3 | 67,34% | Campo não persistido | 0 |
| Agrup. Com. / S | 146 | 26 | 32,66% | 96 | 0 |
| Agrup. Fiscal / T | 447 | 1 | 100,00% | Campo não persistido | 0 |


Entre os 273 elegíveis, o XLS possui Est. em 200 (16 valores), Prod. em 145 (quatro), Custos em 251 (dois), Com. em 96 (21) e Fiscal em 273 (um). Não somar campos como se fossem dimensões equivalentes.

### Agrup. Est.

| Valor real no XLS | Produtos de Custos |
| --- | --- |
| E701 | 65 |
| E401 | 33 |
| E103 | 23 |
| E204 | 21 |
| E301 | 19 |
| E101 | 16 |
| E201 | 12 |
| E202 | 10 |
| E803 | 6 |
| E203 | 5 |
| E801 | 5 |
| E802 | 5 |
| E807 | 5 |
| E205 | 4 |
| E603 | 4 |
| E804 | 4 |
| E104 | 3 |
| E806 | 3 |
| E805 | 2 |
| E102 | 1 |


Exemplos verificáveis: 1001051, linha 3493: E204 — SOLTOS DOCES; 1001055, linha 3498: E204 — SOLTOS DOCES; 1001056, linha 3500: E603 — TERCEIROS BISCOITOS.

### Agrup. Prod.

| Valor real no XLS | Produtos de Custos |
| --- | --- |
| P802 | 66 |
| P005 | 46 |
| P801 | 31 |
| P102 | 27 |
| P101 | 16 |
| P901 | 10 |
| P302 | 5 |


Exemplos verificáveis: 1020123, linha 3606: P102 — MASSA CURTA; 1020124, linha 3608: P102 — MASSA CURTA; 1020125, linha 3610: P101 — MASSA LONGA.

### Agrup. Custos

| Valor real no XLS | Produtos de Custos |
| --- | --- |
| U001 | 228 |
| U002 | 68 |
| U003 | 5 |


Exemplos verificáveis: 1001051, linha 3493: U001 — PRODUTOS COM PIS COFINS; 1001055, linha 3498: U001 — PRODUTOS COM PIS COFINS; 1001056, linha 3500: U001 — PRODUTOS COM PIS COFINS.

### Agrup. Com.

| Valor real no XLS | Produtos de Custos |
| --- | --- |
| C033 | 27 |
| C020 | 10 |
| C022 | 10 |
| C024 | 9 |
| C006 | 8 |
| C019 | 8 |
| C008 | 7 |
| C007 | 6 |
| C004 | 5 |
| C009 | 5 |
| C016 | 5 |
| C021 | 5 |
| C027 | 5 |
| C036 | 5 |
| C012 | 4 |
| C017 | 4 |
| C018 | 4 |
| C015 | 3 |
| C025 | 3 |
| C026 | 3 |
| C034 | 3 |
| C013 | 2 |
| C014 | 2 |
| C005 | 1 |
| C010 | 1 |
| C029 | 1 |


Exemplos verificáveis: 1001051, linha 3493: C012 — BISCOITO SOLTO DOCE; 1001055, linha 3498: C012 — BISCOITO SOLTO DOCE; 1001056, linha 3500: C013 — BISCOITO SOLTO DOCE GLACE.

### Agrup. Fiscal

| Valor real no XLS | Produtos de Custos |
| --- | --- |
| GAF | 447 |


Exemplos verificáveis: 1001051, linha 3493: GAF — AGRUPAMENTO FISCAL; 1001055, linha 3498: GAF — AGRUPAMENTO FISCAL; 1001056, linha 3500: GAF — AGRUPAMENTO FISCAL.

**Relação de negócio:** os contratos registram explicitamente a independência dos agrupamentos ERP. Est. tem rótulos como SOLTOS DOCES/CORSSETI; Prod. usa Pxxx; Custos usa U001/U002/U003, com exemplos ligados a PIS/COFINS; Com. usa Cxxx; Fiscal é GAF em todos os 447. Esses fatos não constituem uma regra investigativa Kustos. Coincidência de descrição ou de sufixo numérico entre Cxxx e Mxxx não comprova equivalência.

**Não há evidência suficiente para transformar este campo ERP em `agrupamento_cod` Kustos.** A declaração aplica-se separadamente aos cinco campos auditados. Nenhuma ponte por similaridade textual foi construída.

### Mapa legado e direção do fluxo

- `mapa_produtos`: 299 linhas, 141 valores de agrupamento preenchidos, dos quais 137 são códigos Mxxx e quatro são SEM_AGRUPAMENTO; 158 são NULL.
- Desses 141 valores, 129 encontram o catálogo atual e 12 não encontram (M030/M031/M032). O mapa não tem FK de agrupamento no catálogo consultado.
- Apenas 162 produtos do mapa têm Custos; **somente quatro têm agrupamento preenchido, todos SEM_AGRUPAMENTO**: 1758396, 1758397, 1758398, 1758583. Nenhum agrupamento Mxxx do mapa oferece cobertura real aos 447 atuais.
- As 141 classificações preenchidas do mapa divergem do Operacional atual, que está NULL nesses códigos. Isso mostra estado legado divergente; não prova qual estado é correto nem autoriza copiar dados.
- O trigger remoto habilitado `tg_categoriza_apos_import`, AFTER INSERT ou UPDATE OF codigo_produto em `historico_custos`, chama a variante TEXT de `fn_upsert_mapa_produtos_por_codigo`. A função lê **Operacional → mapa**, somente quando `familia_id IS NOT NULL`, e não faz a direção inversa. Não foram encontrados triggers de usuário em Master, Operacional ou mapa. Nenhuma dessas funções foi executada nesta auditoria.
- `familias_base` existe com 21 linhas, mas não substitui os catálogos usados pela API/classificação auditadas. Não criar fonte paralela a partir dela.

**Hipótese, não conclusão histórica:** ausência de uma manutenção/reconciliação operacional aprovada pode explicar a falta de vínculos. Os dados atuais e as colunas de proveniência de agrupamento vazias não permitem atribuir autoria, data ou evento causador. O que está demonstrado é o caminho atual sem ponte e a nulidade efetiva.

## 8. Situação de origem/família

- Master: **17 códigos de origem**, 858 produtos resolvidos e dois sem correspondência no catálogo. Código pendente **632**, produtos **1041716P** e **1841715P**, ambos sem Custos na fotografia.
- Master: **81 códigos de família**, todos resolvidos exatamente uma vez. **Famílias ERP sem correspondência: zero; lista de códigos pendentes: vazia.**
- Catálogos: 50 origens e 103 famílias; não há duplicidade de código de negócio preenchido. Três famílias não possuem `codigo` (IDs e rótulos no JSON); elas não são usadas para preencher códigos ERP por descrição.
- Operacional: 6.112 origens e 319 famílias preenchidas, todas por IDs que existem nos respectivos catálogos. Origem vazia em apenas TESTE123; família vazia em 5.794 produtos, incluindo 289 com Custos.
- Em Custos, 447 origens e 323 famílias são resolvidas depois da projeção atual. Em OP, a fonte permanece operacional: 350 origens e 135 famílias resolvidas entre 355 códigos. Não equalizar automaticamente os dois domínios.

**Evidência de estrutura:** o catálogo remoto usa TEXT para os IDs de Origem/Família, embora vários valores de família tenham formato UUID. Código de negócio do Master é confrontado com `categorias_*.codigo`, e só depois retorna o ID técnico existente. Não converter UUID em código, nem buscar por descrição.

Algumas visões temáticas e scripts históricos descrevem IDs como UUID, fallback SEM_AGRUPAMENTO ou um `agrupamento_cod` no Master. O catálogo e o runtime atuais mostram IDs TEXT, agrupamento operacional nullable e campos ERP separados. [Banco de Dados](../arquitetura/banco-de-dados.md) já distingue trechos históricos; `sql/dicionario_master_produtos.sql` não é uma migration atual a reaplicar. Divergências documentais são registradas aqui, sem mudar contratos ou executar saneamento (tema relacionado a DOC-DIV-02).

## 9. Produtos novos

**Resposta conceitual:** o modelo de dados e os núcleos detectam e comportam um novo código válido; **860 não é limite de tabela, regra de negócio nem teto do executor geral**. Há PK por `codigo_produto`, normalização canônica e bloqueio de duplicidades no arquivo/contexto. O Preview detecta código elegível ausente do Master, propõe novo produto e o executor geral pode incluí-lo no Master após aprovação/revalidação integral.

**Limitação do fluxo vigente:** a tela e o adapter preparam **RECONSTRUCAO_UNIVERSO_V2**, e `criarPlanoReconstrucaoCadastroMestre` recusa manifesto incremental histórico. Portanto, a entrada operacional atual não é um importador seguro de arquivo delta. Enviar somente um novo produto pode propor remover os demais do Master por ausência; não é a forma autorizada de inclusão incremental preservando todos os ausentes. O modo INCREMENTAL do núcleo antigo e `importProductMasterXlsm` legado não equivalem a um caminho atual de execução incremental do Master ERP.

- **Detecção:** `mapearPlanilhaCadastroMestre`/`lerArquivoCadastroMestre` → `criarPreviewCadastroMestre` → `NOVO_PRODUTO`/INSERT no manifesto.
- **Armazenamento:** somente `dicionario_master_produtos`, com proveniência de lote conforme campos efetivamente escritos. Novo Master não cria automaticamente registro operacional; os sete somente Master comprovam essa separação.
- **Duplicação:** PK do código, códigos canônicos, bloqueio de duplicidade no arquivo/contexto, revalidação sob locks e prova do universo final. Zero colisões de normalização observadas nesta fotografia.
- **Existentes:** arquivo integral aprovado define o universo final; presentes têm patches explícitos, ausentes/fora dos filtros são remoções propostas do Master. Vazios preservam campos de quem fica, exceto a limpeza comercial já aprovada; isso não é preservação automática de todos os ausentes.
- **Classificação manual:** permanece no Operacional, protegido pelo executor geral; não é inferida ou apagada por incluir um Master. Nenhuma reconciliação Master → Operacional foi implementada por esta auditoria.
- **Fatos históricos:** Custos/OP estão entre as tabelas protegidas. Remoção eventual do Master não apaga fatos nem Operacional; muda a disponibilidade de classificação atual em memória, não o conteúdo dos fatos.
- **Lacuna adicional:** a garantia operacional do importador de Custos cria códigos ausentes com descrição e classificação NULL; não é um classificador ERP. O endpoint legado operacional e o executor comercial isolado têm escopos próprios e não devem ser usados para contornar o fluxo geral. O executor comercial com fotografia de 860 é deliberadamente isolado; essa guarda não é teto do Master.

**Decisão pendente:** se a empresa deseja atualização incremental por delta com preservação de ausentes, aprovar um contrato próprio de entrada, elegibilidade, atualizações, manutenção manual e tratamento dos descontinuados. Não foi implementado ou simulado um produto novo em produção.

## 10. Produtos somente Master

Globalmente são **sete produtos** no Master sem Operacional; nenhum possui Custos. Dois têm OP e compõem parte dos cinco códigos de OP sem correspondente operacional. Todos estão no conjunto elegível do XLS confirmado.

| Código | Descrição do Master | Possui OP | Possui Custos |
| --- | --- | --- | --- |
| 1041716 | GERMANI CANJIQUINHA DE MILHO 12 X 500 G REV | NÃO | NÃO |
| 1041716P | GERMANI CANJIQUINHA DE MILHO 12 X 500 G REV PCT | NÃO | NÃO |
| 1747719U | CATTERINO ART QUEBRA QUEBRA BARRA 135 G UN | NÃO | NÃO |
| 1755712 | CATTERINO DRAGEAS GRANEL FLOCOS AMARGO KG | SIM | NÃO |
| 1755713 | CATTERINO DRAGEAS GRANEL FLOCOS MEIO AMARGO KG | SIM | NÃO |
| 1841715 | PERDIZ FARINHA DE MILHO MEDIA 12 X 1 KG REV | NÃO | NÃO |
| 1841715P | PERDIZ FARINHA DE MILHO MEDIA 1 KG REV PCT | NÃO | NÃO |


Além disso, **587 dos 860** produtos do Master não têm Custos. Ausência de fato de custo não implica erro, desativação ou autorização de exclusão.

## 11. Produtos somente Operacional

Globalmente são **5.260 produtos** no Operacional fora do Master. Destes, 5.259 existem fisicamente no XLS e são excluídos pelos filtros vigentes; apenas TESTE123 não está no arquivo. O grupo contém os 174 produtos de Custos classificados como B.

| Motivo no último XLS, respeitando a ordem dos filtros | Produtos somente Operacional |
| --- | --- |
| ORIGEM_NAO_AUTORIZADA | 4780 |
| TIPO_NAO_AUTORIZADO | 358 |
| DESCRICAO_EXCLUIDA | 121 |
| AUSENTE_NO_ARQUIVO | 1 |


**Custos fora do Master: 174; OP fora do Master: 175. Todos os 174/175 existem fisicamente no XLS e são excluídos pela regra de Origem**, não por ausência de código nem por deduplicação. Produtos presentes no Master fora do universo elegível: zero. Para Custos, a distribuição das origens excluídas é:

| Descr. (Origem) do XLS | Produtos de Custos fora do Master |
| --- | --- |
| MASSA PRODUZIDA FARDO/CX | 43 |
| CEREAIS EMATER FD | 7 |
| COPA CATTERINO FARDO | 4 |
| COPA CATTERINO UN/ KG | 3 |
| MISTURAS | 104 |
| PRODUTOS SEMI-ACABADOS | 13 |


O filtro puro atualmente testa o termo literal `produzido|revenda` (case-insensitive). **MASSA PRODUZIDA FARDO/CX não corresponde a “produzido”**; MISTURAS, PRODUTOS SEMI-ACABADOS, COPA e EMATER também não contêm os termos exigidos. Esse é um fato do contrato/código vigente, não uma autorização para ampliar filtros. Os 174 produtos permanecem no Operacional e nos fatos, com fallback analítico existente.

Não marcar fora do Master como inativo, não apagar e não transformar o universo 860 em limite de produtos válidos de Custos/OP. Há **6255 códigos no arquivo bruto**, 860 no conjunto aprovado e 6113 no cadastro operacional; esses universos têm finalidades diferentes.

## 12. Casos especiais

### TESTE123

Continua no Operacional, descrição Produto Teste, Origem/Família NULL e `agrupamento_cod = SEM_AGRUPAMENTO`; não está no Master, no XLS, no mapa, em Custos ou em OP. É o único agrupamento operacional preenchido, mas não oferece cobertura aos produtos investigados. Não foi excluído, inativado ou reclassificado.

### 1041596 e o sufixo “ - U”

Existe nos dois cadastros e no XLS (linha 3690). Descrição de ambos os cadastros: GERMANI AMIDO DE MILHO 12 X 200 G PRODUZIDO. Os **nove fatos** usam a mesma descrição com o sufixo **“ - U”**, conservado como rótulo de importação; o código continua `1041596`. Não há sufixo no código nem identidade duplicada causada por ele. Em todo o histórico, os 2.481 fatos/447 produtos possuem esse sufixo na descrição, e zero códigos o possuem.

Origem 450 resolve normalmente. Família operacional NULL; Master usa código 45010, resolvido para o ID `7d482646-22fc-47bf-b149-2bdb87b404b7`. Agrupamento Kustos NULL; Agrup. Prod. ERP NULL; Agrup. Com. C020 — DERIVADOS DE MILHO. Está em OP; não está no mapa, coerente com a função do mapa que exige família operacional preenchida. Nenhum desses campos foi corrigido.

Competências dos nove fatos: 01/04, 01/05, 01/06, 15/07, 15/08, 15/09, 05/10, 14/10 e 26/10/2026. A primeira importação disponível ocorreu em agosto para competência abril; `criado_em` não redefine a competência. Os IDs/datas originais estão no JSON.

### OP sem correspondente operacional

| Código | No Master | No XLS elegível | Situação |
| --- | --- | --- | --- |
| 1755712 | SIM | SIM | ELEGIVEL |
| 1755713 | SIM | SIM | ELEGIVEL |
| 1758717 | NÃO | NÃO | ORIGEM_NAO_AUTORIZADA |
| 1758718 | NÃO | NÃO | ORIGEM_NAO_AUTORIZADA |
| MCC016 | NÃO | NÃO | ORIGEM_NAO_AUTORIZADA |


Os cinco códigos são identificáveis, mas não têm a dimensão operacional compartilhada. Os dois primeiros são somente Master; os três demais estão no arquivo, porém fora dos filtros de origem. Não foram cadastrados automaticamente.

### Diferenças e estruturas legadas

As cinco diferenças de descrição e as 165 famílias operacionais vazias já foram detalhadas. `dicionario_master_produtos` existe e é a fonte ERP persistida; `mapa_produtos` existe, conserva estado legado e não é a fonte da cascata. A direção remota atual não copia mapa para Operacional. Não foram feitas inferências de quando esses estados se formaram.

## 13. Impacto em OP × CUSTOS

| Medida global por código | Quantidade |
| --- | --- |
| Custos relacionados ao Operacional | 447 |
| OP relacionados ao Operacional | 350 |
| OP sem correspondente operacional | 5 |
| Códigos existentes em Custos e OP | 278 |
| Somente Custos (sem OP) | 169 |
| Somente OP (sem Custos) | 77 |
| União de códigos de Custos/OP | 524 |
| União presente no Operacional | 519 |
| União com classificação operacional completa (origem + família + agrupamento investigativo) | 0 |
| Custos com agrupamento investigativo | 0 |
| Custos com agrupamento NULL | 447 |
| OP no Operacional com agrupamento NULL | 350 |
| OP sem cadastro e, portanto, sem agrupamento disponível | 5 |


**Limites exatos:** os cinco códigos sem Operacional não perdem sua identidade textual válida; falta o correspondente na dimensão, não o código ERP. Os 77 sem Custos e os 169 sem OP são ausência de um domínio, não erro de identidade. Os 524 não têm agrupamento disponível: 519 por NULL no Operacional e cinco por cadastro ausente.

Esses números usam todo o histórico e não testam coincidência mensal. **278 em comum por código não significa 278 pares elegíveis numa mesma competência**. A cobertura mensal A/B/C do engine existente exige mês explícito, leitura integral de ambos os domínios e eventos originais; esta auditoria não a substitui, não calcula indicadores OP e não agrega suas métricas.

Lacunas para uma análise por Agrupamento: zero vínculos efetivos em Custos/OP, nenhuma ponte empresarial aprovada para os cinco campos ERP, cinco códigos OP sem cadastro operacional, 165 produtos de Custos compartilhados com família diferente apenas por vazio operacional e fontes de classificação distintas entre OP e Custos. Origem/família operacionais não devem ser igualadas silenciosamente à projeção ERP de Custos. As diferenças de descrição/pacote exigem avaliação própria sem mudar a chave por texto.

## 14. Riscos

1. **Atribuir semântica errada ao agrupamento:** E/P/U/C/GAF representam campos diferentes; valor preenchido ou descrição coincidente não comprova categoria Kustos. Fiscal GAF em 100% não discrimina o universo.
2. **Tratar fora do Master como inválido/inativo:** 174 Custos e 175 OP são produtos reais do arquivo bruto, excluídos pelo recorte ERP aprovado. A grafia PRODUZIDA exige decisão de negócio, não correção por analogia.
3. **Usar arquivo delta no fluxo de reconstrução:** pode propor remoções do Master; o modelo permite novo código, mas o fluxo atual exige universo completo e aprovação integral.
4. **Copiar mapa legado:** 12 vínculos preenchidos não resolvem no catálogo, 141 divergem do Operacional e os únicos quatro com Custos são o sentinela SEM_AGRUPAMENTO. Não é uma fonte alternativa confiável para preencher os 447.
5. **Confundir preenchimento com classificação completa:** status operacional por origem/família não demonstra agrupamento; CAD-UX-02 já documenta a divergência de orientação da UI.
6. **Confundir classificação atual com história:** consultar Master hoje não prova classificação da competência do fato; descrição atual não substitui rótulo histórico. Ausência de proveniência de agrupamento impede atribuição histórica segura.
7. **Reaplicar SQL/documentação histórica:** descrições antigas de tipos/colunas/fallback não autorizam migration ou backfill. Catálogo real e contratos especializados vigentes foram usados como evidência.
8. **Generalizar cobertura global para competência:** identidade comum global não prova coexistência temporal nem causalidade entre OP e Custo.

**Hipóteses não confirmadas:** quem originou os NULLs operacionais, se houve limpeza em algum evento antigo, se o mapa contém decisões de negócio ainda válidas e qual campo ERP a empresa pretende usar como agrupamento investigativo. Nenhuma dessas hipóteses foi convertida em correção.

### Preservação observada

| Tabela pública | Linhas antes/depois | Fingerprint MD5 idêntico |
| --- | --- | --- |
| apontamentos_op | 1.469 / 1.469 | SIM |
| categorias_agrupamento | 34 / 34 | SIM |
| categorias_familia | 103 / 103 | SIM |
| categorias_origem | 50 / 50 | SIM |
| dicionario_master_produtos | 860 / 860 | SIM |
| dicionario_produtos | 6.113 / 6.113 | SIM |
| familias_base | 21 / 21 | SIM |
| historico_custos | 2.481 / 2.481 | SIM |
| log_importacao | 31 / 31 | SIM |
| log_importacao_cadastro_mestre | 5 / 5 | SIM |
| log_importacao_op | 8 / 8 | SIM |
| mapa_produtos | 299 / 299 | SIM |


O JSON contém os hashes completos e os dois horários. MD5 foi usado somente para comparar conteúdo serializado de linhas completas ordenadas, não como assinatura de segurança. Igualdade nas leituras de controle não prova ausência de mutação transitória seguida de reversão por terceiro. As ações desta auditoria foram exclusivamente SELECTs; não houve comando remoto de escrita, mesmo dentro de transação revertida.

### Validação existente

- Testes: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=dot` — **990/990, 52 arquivos**, zero falhas, 47,31 s.
- Lint: `node node_modules/eslint/bin/eslint.js .` — passou, zero erros/avisos.
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json` — passou.
- Build: `buildWeb` de `scripts/build-web.mjs` — passou com a configuração pública existente do site, hostname do projeto validado, sem mudar arquivo versionado de ambiente nem publicar. Somente saída local ignorada `dist`.
- `git diff --check`: passou; como os dois arquivos são novos e não foram staged, verificou-se também diretamente ausência de whitespace final e newline final. Links locais e 16 seções passaram. O JSON foi relido e reconciliado: 447 códigos únicos, 2.481 fatos, classes A/B/D, distribuições de 860 e os 12 fingerprints iguais. SHA-256 do JSON final: **da3dbbfa805f94d10a9f0ce601f0745d1fc50ea867ba299eb8bba53a8c30067e**.
- Nenhum teste, consulta permanente de auditoria, endpoint, função, parser, engine ou fluxo de UI foi adicionado ou alterado. A suíte existente usa seus ambientes/fixtures locais, sem carga real no Supabase.

Somente este relatório e seu JSON de evidências foram criados no checkout. README, AGENTS, VISION, ROADMAP, manuais e backlog foram revisados e preservados: não houve nova conclusão arquitetural ou decisão de produto, apenas verificação do estado e registro de divergências históricas. Sem commit, push ou deploy.

## 15. Decisões que ainda precisam de aprovação humana

- Definir o significado de **Agrupamento investigativo Kustos**, seu responsável e eventual fonte ERP/ponte por código, preservando override e ausência explícita; não escolher automaticamente um dos cinco campos.
- Confirmar o universo ERP pretendido: manter ou revisar o teste literal de Origem, inclusive PRODUZIDA, MISTURAS e semiacabados. Alteração de universo não é um ajuste técnico neutro.
- Escolher fluxo de manutenção de novos produtos: arquivo integral de reconstrução vigente ou futuro modo incremental seguro por delta, com contrato explícito de preservação de ausentes.
- Delimitar eventual reconciliação Master → Operacional (códigos, campos, conflitos, preservação manual, aprovação e provas), incluindo os cinco códigos OP ausentes; nenhuma sincronização está autorizada agora.
- Tratar o código de origem ERP 632 sem catálogo por uma decisão cadastral aprovada, sem resolver por rótulo.
- Avaliar as cinco diferenças de descrição/apresentação e o destino de TESTE123 em tarefas separadas, sem excluir ou atualizar automaticamente.
- Definir se um diagnóstico mensal posterior de OP × CUSTO será solicitado, com mês explícito e regras atuais preservadas.

## 16. Recomendação do próximo passo

Realizar uma **revisão documental de negócio**, sem carga: apresentar a cobertura dos cinco campos ERP, decidir o significado da dimensão investigativa e o universo elegível, e aprovar o contrato de manutenção/reconciliação antes de planejar qualquer preenchimento. Não iniciar por copiar mapa, substituir P/C/E/U por M ou reconstruir o Master.

Após essas decisões, uma etapa separada poderá preparar uma proposta revisável por código, com conflitos, preservação manual, produtos fora do universo e prova de não alteração dos fatos. **Essa etapa não foi implementada, aprovada ou executada nesta auditoria.**

**BANCO — Nenhuma linha foi inserida, atualizada ou removida durante esta auditoria.** Não houve migration, importação real, reconstrução, alteração de schema/RLS/Auth, criação de tabela/RPC/endpoint, dados sintéticos no Supabase, commit, push ou deploy.
