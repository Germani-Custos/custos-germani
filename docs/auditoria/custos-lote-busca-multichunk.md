# LOG-02 — busca do original para múltiplos chunks reais

**29/10/2026 — LOG-02 = PARCIAL.** Nenhum arquivo elegível com mais de 400 registros válidos foi encontrado nas origens autorizadas pesquisadas. Não houve nova importação, batch, consulta ou escrita no Supabase nesta tarefa.

> Persistência de lote e upsert real comprovados em produção. Teste de múltiplos chunks permanece pendente por ausência de arquivo original autorizado com mais de 400 registros válidos.

## 1. Escopo pesquisado e prova da leitura

- Origem autorizada: `D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro`, incluindo todas as subpastas; não se pesquisaram diretórios pessoais diferentes não autorizados.
- **194 arquivos regulares**: 134 XLSX, 33 XLSM e 27 XLS; **622.446.506 bytes**. Um temporário de bloqueio Excel `~$` foi ignorado.
- Enumerados arquivos ocultos/ignorados e extensões sem distinção de maiúsculas; nenhuma pasta interna da origem foi omitida.
- Checkout `custos-germani` também pesquisado por essas extensões, excluindo dependências, saída de build e metadados Git: nenhum original de Custos encontrado ali. Fixtures/sintéticos não são origens produtivas.
- **Leitura integral da primeira aba dos 194 arquivos**, correspondendo ao contrato de `readWorkbook()`; **zero erros de leitura**. Não se somaram abas ou arquivos. Nove livros têm várias abas; as abas secundárias não são a entrada do importador atual e não foram agregadas/reordenadas.
- **53 candidatos** com os cinco campos exigidos; **141 fora do layout de entrada de Custos**. A triagem por cabeçalho e a conferência integral chegaram aos mesmos 53 candidatos, contagens e hashes.
- As linhas válidas foram contadas com a normalização canônica de código, presença de descrição e limites de código/descrição aceitos pela API, seguindo as regras atuais de Preview/validação. Aviso de classificação não transforma linha em erro. Data de referência continua dependendo da competência humana selecionada.
- Todos os 53 candidatos têm cinco campos, linhas aceitas pelos critérios locais e códigos únicos, sem repetição após normalização. **Nenhum ultrapassa 357 linhas válidas.**
- Originalidade não foi presumida por extensão, cabeçalho, hash ou nome. Oito nomes indicam teste/calculado; os demais são candidatos por layout, não autenticação independente do ERP. Mesmo incluindo todos eles na contagem, nenhum atinge 401.
- SHA-256 de cada candidato foi relido após a análise e conferiu com a leitura: originais preservados. Não houve gravação/recalculo/exportação dos livros, execução de macros ou construção de planilha ampliada.

Inventário de metadados dos 194 arquivos e resultados completos preservados localmente, fora do repositório:

- [Inventário completo CSV](<C:/Users/aprendizcustos/.codex/backups/custos-germani/log02-busca-multichunk-2026-10-29/inventario-completo.csv>)
- [Resultado completo JSON](<C:/Users/aprendizcustos/.codex/backups/custos-germani/log02-busca-multichunk-2026-10-29/resultado-completo.json>)
- SHA-256 do resultado JSON: `4712f5a519a4ac3be6f5a95c7391a8ec2a6af27bc270a8364e36920b2fc01a49`.

## 2. Resultado objetivo

- Maior candidato técnico: `Importação Jun_Jul_Ago\TESTE-JUN.xlsx`, **357 válidos/357 códigos**, um chunk hipotético; nome de teste, originalidade e competência operacional não confirmadas. Não foi escolhido ou importado.
- Maior arquivo já confirmado/autorizado pelo humano na etapa anterior: `14_10.xlsx`, **349 válidos/349 códigos**, competência **14/10/2026**, um chunk. Não foi reimportado nesta busca.
- Outros candidatos maiores: `import geral julho.xlsx` e `TEste-JUL.xlsx`, **340** cada; `TESTE-AGO.xlsx`, **328**. Não são somados.
- **Nenhum arquivo escolhido para novo teste.** Zero chunks executados, nenhum novo `log_importacao.id`, zero fatos gravados. A igualdade de IDs entre múltiplos chunks e a contagem remota por batch não foram testadas nesta etapa.
- A existência anterior dos lotes 30/31 e sua validação permanecem nas [provas da ativação](custos-lote-ativacao-validacao.md). Esta busca não substitui aquela evidência por nova consulta remota.

## 3. Candidatos encontrados — caminhos, contagens e competência

Compatibilidade abaixo é técnica na leitura/Preview e nos campos locais: não equivale a autorização de importação ou prova de origem. O seletor da UI filtra `.xlsx`; para os três `.xlsm`, o parser suporta a leitura e o caminho existente por arrastar arquivo não restringe extensão. Nenhum deles foi enviado ao aplicativo ou gravado. Não houve mudança de UI/parser para acomodar formatos.

Nenhum candidato contém coluna operacional explícita de competência no conjunto importado. Somente `14_10.xlsx` tem a data completa já confirmada pelo usuário. Os demais rótulos temporais abaixo são apenas indícios de nome; ano/dia não foram inventados e data de modificação/criação do arquivo não foi usada como `data_referencia`.

### 01. TESTE-JUN.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\TESTE-JUN.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/TESTE-JUN.xlsx>)
- Extensão: `.xlsx`; registros válidos: **357**; códigos únicos: 357; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere junho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 02. 14_10.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\14_10.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/14_10.xlsx>)
- Extensão: `.xlsx`; registros válidos: **349**; códigos únicos: 349; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: 14/10/2026 — confirmado pelo usuário na ativação anterior
- Compatível com a leitura do importador: **sim**.
- Origem: original autorizado pelo humano na ativação anterior.

### 03. import geral julho.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\import geral julho.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/import geral julho.xlsx>)
- Extensão: `.xlsx`; registros válidos: **340**; códigos únicos: 340; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere julho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 04. TEste-JUL.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\TEste-JUL.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/TEste-JUL.xlsx>)
- Extensão: `.xlsx`; registros válidos: **340**; códigos únicos: 340; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere julho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 05. TESTE-AGO.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\TESTE-AGO.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/TESTE-AGO.xlsx>)
- Extensão: `.xlsx`; registros válidos: **328**; códigos únicos: 328; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere agosto, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 06. Misturas-Jun.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\Misturas-Jun.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/Misturas-Jun.xlsx>)
- Extensão: `.xlsx`; registros válidos: **249**; códigos únicos: 249; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere junho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 07. 26_10 custos.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\AAAdemanda Genarro\26_10 custos.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/AAAdemanda Genarro/26_10 custos.xlsx>)
- Extensão: `.xlsx`; registros válidos: **213**; códigos únicos: 213; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere 26/10, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 08. 05_10.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\05_10.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/05_10.xlsx>)
- Extensão: `.xlsx`; registros válidos: **209**; códigos únicos: 209; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere 05/10, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 09. import massas setembro.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\import massas setembro.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/import massas setembro.xlsx>)
- Extensão: `.xlsx`; registros válidos: **206**; códigos únicos: 206; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere setembro, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 10. teste-AGO2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\teste-AGO2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/teste-AGO2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **206**; códigos únicos: 206; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere agosto, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 11. TESTE-AGO3.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\TESTE-AGO3.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/TESTE-AGO3.xlsx>)
- Extensão: `.xlsx`; registros válidos: **206**; códigos únicos: 206; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere agosto, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 12. Produzidos-Jun.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\Produzidos-Jun.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/Produzidos-Jun.xlsx>)
- Extensão: `.xlsx`; registros válidos: **152**; códigos únicos: 152; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere junho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 13. Produzidos-abril.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Produzidos-abril.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Produzidos-abril.xlsx>)
- Extensão: `.xlsx`; registros válidos: **149**; códigos únicos: 149; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere abril, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 14. Produzidos-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Produzidos-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Produzidos-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **149**; códigos únicos: 149; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 15. AAAAAAAAAAAAAA.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\AAAAAAAAAAAAAA.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/AAAAAAAAAAAAAA.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 16. BISCOITO ABRIL.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\BISCOITO ABRIL.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/BISCOITO ABRIL.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere abril, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 17. BISCOITO MARÇO.xlsm

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\BISCOITO MARÇO.xlsm](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/BISCOITO MARÇO.xlsm>)
- Extensão: `.xlsm`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim** (seletor filtra XLSX; leitura XLSM disponível pelo fluxo existente de arrastar).
- Origem: layout de exportação de Custos; originalidade não atestada independentemente. Livro com 4 abas; contagem exclusiva da primeira, sem combinação.

### 18. BISCOITO MARÇO.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\BISCOITO MARÇO.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/BISCOITO MARÇO.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 19. BISCOITO MARÇO2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\BISCOITO MARÇO2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/BISCOITO MARÇO2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 20. biscoitoCalculado06_04.xlsm

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\biscoitoCalculado06_04.xlsm](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/biscoitoCalculado06_04.xlsm>)
- Extensão: `.xlsm`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere 06/04, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim** (seletor filtra XLSX; leitura XLSM disponível pelo fluxo existente de arrastar).
- Origem: nome indica teste/calculado; não se atesta originalidade. Livro com 5 abas; contagem exclusiva da primeira, sem combinação.

### 21. biscototeste1.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\biscototeste1.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/biscototeste1.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: nome indica teste/calculado; não se atesta originalidade.

### 22. MASSABISCOITO04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\biscoito\MASSABISCOITO04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/biscoito/MASSABISCOITO04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 23. 2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **148**; códigos únicos: 148; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 24. Produzidos Chocolate- Jun.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Jun_Jul_Ago\Produzidos Chocolate- Jun.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Jun_Jul_Ago/Produzidos Chocolate- Jun.xlsx>)
- Extensão: `.xlsx`; registros válidos: **69**; códigos únicos: 69; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere junho, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 25. CATTERINO04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\AAAdemanda Genarro\06.04\CATTERINO04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/AAAdemanda Genarro/06.04/CATTERINO04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **67**; códigos únicos: 67; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 26. Chocolates-pascoa-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Chocolates-pascoa-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Chocolates-pascoa-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **67**; códigos únicos: 67; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 27. PASCOA MARÇO_26_2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Pascoa\PASCOA MARÇO_26_2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Pascoa/PASCOA MARÇO_26_2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **67**; códigos únicos: 67; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere 26/2, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 28. PASCOA MARÇO_26.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Pascoa\PASCOA MARÇO_26.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Pascoa/PASCOA MARÇO_26.xlsx>)
- Extensão: `.xlsx`; registros válidos: **65**; códigos únicos: 65; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente. Livro com 3 abas; contagem exclusiva da primeira, sem combinação.

### 29. Produtos-chocolate-abril.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Produtos-chocolate-abril.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Produtos-chocolate-abril.xlsx>)
- Extensão: `.xlsx`; registros válidos: **64**; códigos únicos: 64; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere abril, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 30. Produtos-chocolate-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Produtos-chocolate-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Produtos-chocolate-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **64**; códigos únicos: 64; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 31. CATTERINO ARTESANAL MARÇO.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\CATTERINO artesanal\CATTERINO ARTESANAL MARÇO.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/CATTERINO artesanal/CATTERINO ARTESANAL MARÇO.xlsx>)
- Extensão: `.xlsx`; registros válidos: **58**; códigos únicos: 58; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 32. CATTERINO ARTESANAL MARÇO2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\CATTERINO artesanal\CATTERINO ARTESANAL MARÇO2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/CATTERINO artesanal/CATTERINO ARTESANAL MARÇO2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **58**; códigos únicos: 58; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 33. CHOCOLATE04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\CATTERINO artesanal\CHOCOLATE04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/CATTERINO artesanal/CHOCOLATE04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **58**; códigos únicos: 58; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 34. 3.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\3.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/3.xlsx>)
- Extensão: `.xlsx`; registros válidos: **58**; códigos únicos: 58; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 35. 4.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\4.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/4.xlsx>)
- Extensão: `.xlsx`; registros válidos: **58**; códigos únicos: 58; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 36. Planilha.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\1234\Planilha.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/Planilha.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 37. 1.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\1.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/1.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 38. Mistura-abril.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Mistura-abril.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Mistura-abril.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere abril, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 39. Mistura-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Mistura-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Mistura-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 40. MISTURA MARÇO.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Mistura\MISTURA MARÇO.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Mistura/MISTURA MARÇO.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 41. MISTURA MARÇO2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Mistura\MISTURA MARÇO2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Mistura/MISTURA MARÇO2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 42. MISTURA04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Mistura\MISTURA04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Mistura/MISTURA04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 43. misturaCalculada.xlsm

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Mistura\misturaCalculada.xlsm](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Mistura/misturaCalculada.xlsm>)
- Extensão: `.xlsm`; registros válidos: **38**; códigos únicos: 38; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim** (seletor filtra XLSX; leitura XLSM disponível pelo fluxo existente de arrastar).
- Origem: nome indica teste/calculado; não se atesta originalidade. Livro com 4 abas; contagem exclusiva da primeira, sem combinação.

### 44. Chocolates-catte-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Chocolates-catte-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Chocolates-catte-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **30**; códigos únicos: 30; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 45. SALGADOS04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\AAAdemanda Genarro\06.04\SALGADOS04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/AAAdemanda Genarro/06.04/SALGADOS04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **4**; códigos únicos: 4; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 46. CATTERINO SALGADOS.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\catterino salgados\CATTERINO SALGADOS.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/catterino salgados/CATTERINO SALGADOS.xlsx>)
- Extensão: `.xlsx`; registros válidos: **4**; códigos únicos: 4; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 47. CATTERINO SALGADOS2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\catterino salgados\CATTERINO SALGADOS2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/catterino salgados/CATTERINO SALGADOS2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **4**; códigos únicos: 4; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 48. 6.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\6.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/6.xlsx>)
- Extensão: `.xlsx`; registros válidos: **4**; códigos únicos: 4; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 49. Salgados-catte-maio.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\Importação Abril_Maio\Salgados-catte-maio.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/Importação Abril_Maio/Salgados-catte-maio.xlsx>)
- Extensão: `.xlsx`; registros válidos: **4**; códigos únicos: 4; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere maio, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 50. CATTECHOCOLATE04.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\AAAdemanda Genarro\06.04\CATTECHOCOLATE04.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/AAAdemanda Genarro/06.04/CATTECHOCOLATE04.xlsx>)
- Extensão: `.xlsx`; registros válidos: **1**; códigos únicos: 1; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 51. CATTERINO PRODUÇÃO MARÇO.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\catterino producao\CATTERINO PRODUÇÃO MARÇO.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/catterino producao/CATTERINO PRODUÇÃO MARÇO.xlsx>)
- Extensão: `.xlsx`; registros válidos: **1**; códigos únicos: 1; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 52. CATTERINO PRODUÇÃO MARÇO2.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\catterino producao\CATTERINO PRODUÇÃO MARÇO2.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/catterino producao/CATTERINO PRODUÇÃO MARÇO2.xlsx>)
- Extensão: `.xlsx`; registros válidos: **1**; códigos únicos: 1; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; nome sugere marco, sem ano/data de referência confirmados.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

### 53. 5.xlsx

- Caminho completo: [D:\Meus Documentos - Aprendiz Custos\Área de Trabalho\pedro\IA\5.xlsx](<D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/IA/5.xlsx>)
- Extensão: `.xlsx`; registros válidos: **1**; códigos únicos: 1; repetidos: 0; chunks hipotéticos de 400: 1.
- Competência: Não embutida no conteúdo; sem competência confirmada.
- Compatível com a leitura do importador: **sim**.
- Origem: layout de exportação de Custos; originalidade não atestada independentemente.

## 4. Encerramento e limitações

**LOG-02 permanece PARCIAL.** Falta um único original autorizado com mais de 400 linhas válidas, competência confirmada, confirmação explícita antes do envio e janela de writers pausados para executar o ensaio real. O fato de haver 53 arquivos não autoriza reuni-los em um lote artificial.

Não foram concatenadas competências, duplicadas linhas, ampliadas planilhas, criados produtos/datas fictícios ou executados testes sintéticos como substituto de produção. Não houve acesso ou escrita adicional no Supabase, schema/migration/RLS/Auth/RPC, alteração funcional de OP/OP×CUSTO/fila/prioridade/exportação/A360, commit, push ou deploy.

A ausência é limitada às extensões e origens autorizadas acima; não é afirmação sobre outros diretórios do computador ou dados comprimidos/arquivados não fornecidos como origem. Apenas a primeira aba é compatível com o importador atual sem alterar o original; não se transforma soma de abas em registro elegível.

Como nenhum teste real foi executado, a regressão condicional da seção 7 da solicitação não foi acionada. Não se repetiram testes de aplicação sem mudança de runtime; foram conferidos relatório/inventário, hashes dos candidatos, referências locais, escopo do diff e `git diff --check`. Os 870/91 testes da ativação continuam evidência daquela etapa, não uma nova execução desta busca.

Documentação alterada nesta busca: `AGENTS.md`, `docs/auditoria/README.md`, `docs/auditoria/backlog-priorizado.md`, `docs/auditoria/custos-lote-ativacao-validacao.md` e este relatório. README/VISION/ROADMAP/manuais e contratos relevantes foram consultados; não exigem mudança funcional/procedimental por este inventário. Nenhuma prioridade, contagem de itens ativos ou estado de outro item do backlog foi alterado.
