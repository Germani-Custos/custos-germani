# Auditoria 4.1 — reconciliação do universo de identidade

## 1. Objetivo

**CONCLUÍDO — somente leitura.** Explicar e reproduzir a diferença entre os 6.123 códigos da união persistida e os 6.256 códigos observados nas fontes de dados, sem aprovar produto, universo de admissão ou contrato incremental.

**Resposta comprovada:** os **133 códigos são linhas físicas do arquivo ERP de 22/10, ausentes dos cadastros/fatos persistidos examinados**. 108 também aparecem no arquivo de 08/10 e 25 apenas no de 22/10 entre os dois examinados. Não foram criados por normalização, testes ou snapshots. Todos possuem descrição e todos são excluídos pelo filtro atual. Não houve correção nem admissão desses códigos.

“Presente em arquivo ERP” é prova da fonte, não certificação de atividade/validade empresarial. “Observado” sempre precisa nomear fontes e data; neste documento o universo de ensaios permanece separado do universo de dados.

## 2. Contexto das Auditorias 1–4 e fontes

- [Auditoria 1 — classificação](cadastro-mestre-classificacao-validacao.md) e [evidência 1](cadastro-mestre-classificacao-evidencias.json).
- [Auditoria 2 — reconciliação](cadastro-mestre-reconciliacao-validacao.md) e [evidência 2](cadastro-mestre-reconciliacao-evidencias.json).
- [Auditoria 3 — universo canônico](cadastro-mestre-universo-canonico.md), especialmente seções 4/5/14, e [evidência 3](cadastro-mestre-universo-canonico-evidencias.json).
- [Auditoria 4 — contrato proposto](cadastro-mestre-contrato-reconstrucao.md), seção 3 e CAD-01, e [evidência 4](cadastro-mestre-contrato-reconstrucao-evidencias.json).

Lidos os contratos de [AGENTS](../../AGENTS.md), [README](../../README.md), [Regras Gerais](../regras-gerais.md), [Manual Técnico](../manuais/manual-tecnico.md), [Operação](../manuais/manual-operacao.md), [VISION](../../VISION.md), [ROADMAP](../../ROADMAP.md), [Engenharia Supabase](../engenharia-dados-supabase.md), [modelo de dados/identidade](../arquitetura/banco-de-dados.md), [Cadastro/UX](../ux/cadastro-mestre.md) e [reconstrução](../arquitetura/cadastro-mestre-reconstrucao.md). Nenhuma regra oficial foi substituída.

Código inspecionado: [normalizador](../../core/spreadsheet-engine.js), [reader/adapter ERP](../../src/services/cadastro-mestre-preview.js), [Preview/filtro](../../core/cadastro-mestre-preview-engine.js) e [API](../../src/services/api.js). As operações de conjuntos das auditorias eram análises em memória, não um módulo de produção de universo. Reproduzimos sua definição e os códigos preservados nos artefatos; não atribuímos a um arquivo versionado um script original que não existe.

HEAD inicial **8e1daeb2797f749bda18e3ae11c3d6908f95dc8a**, checkout inicialmente limpo. Esse HEAD contém os documentos anteriores; as Auditorias3/4 registram corretamente seu HEAD histórico 486b646b. Nenhum commit foi realizado nesta tarefa.

Leituras remotas em **30/10/2026**: Supabase Custos-Germani, `umpebdovrazzrdndhigc`, conexão Primary, apenas SELECTs administrativos pelo conector. Nenhum RPC/SQL no frontend/escritor foi chamado. Revalidamos 12 tabelas públicas e 8 históricas e relimos listas distintas de códigos e snapshots/logs, sem obter métricas monetárias, credenciais ou Auth. Controle público: **18:21:51 → 18:32:43 UTC** (15:21:51 → 15:32:43 local); histórico: **18:22:27 → 18:32:45 UTC**, com os horários exatos no JSON.

| Fonte física | Linhas | Aba / cabeçalho | SHA-256 |
| --- | --- | --- | --- |
| D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/cadastro mestre 22_10.xls | 6255 | Sheet1 / 1 | 46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff |
| D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/cadastro mestre 8_10.xls | 6230 | Sheet1 / 1 | 3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14 |

Bytes:24.405.643 no arquivo22/10 e24.307.397 no8/10. Foram relidos pelo SheetJS/adapter oficiais, sem editar, converter, enviar ao servidor ou avaliar macros/fórmulas. São arquivos datados, não uma consulta ao ERP ao vivo.

[Evidências desta auditoria](cadastro-mestre-universo-identidade-reconciliacao-evidencias.json) guardam fontes/códigos necessários para refazer os conjuntos, identificação individual dos 133, linhas/descrições/presença histórica, normalização, controles de banco e referências. Não contêm valores de Custos ou atores privados.

## 3. Definição dos universos

| Símbolo | Definição | Quantidade |
| --- | --- | --- |
| M | Códigos do dicionario_master_produtos persistido | 860 |
| O | Códigos do dicionario_produtos; Operacional e Dicionário são a mesma tabela | 6113 |
| C | Códigos distintos de historico_custos | 447 |
| P | Códigos distintos de apontamentos_op | 355 |
| L | Códigos do mapa_produtos legado | 299 |
| F22 | Códigos físicos do arquivo cadastro mestre 22_10.xls, sem aplicar elegibilidade | 6255 |
| F08 | Códigos físicos do arquivo cadastro mestre 8_10.xls | 6230 |
| A | M ∪ O ∪ C ∪ P ∪ L — união persistida analisada | 6123 |
| B | A ∪ F22 — universo observado nas fontes de dados selecionadas | 6256 |
| I | C ∪ P — universo investigativo retido | 524 |
| T | Entradas/identidades sintéticas de ensaios, tratadas separadamente | Não incorporadas a A/B |

Snapshots históricos e F08 são fontes verificadas à parte. Nesta fotografia não acrescentam códigos além deB; isso não autoriza considerá-los cadastro corrente ou atividade vigente.

A definição ampla “qualquer código observado” poderia incluir também entradas sintéticas. **6.256 não pretende representar a união de todas as strings de qualquer teste.** É o universo **observado de dados** explicitamente usado na Auditoria 4: arquivo físico ∪ fontes persistidas. Ensaios ficam emT e não entram por aparecerem numa evidência JSON. TESTE123 entra em A/B por estar persistido, não por uma exceção para fixtures.

## 4. Metodologia

1. Revalidar hashes integrais do banco e reler conjuntos distintos M/O/C/P/L, sem filtros de competência, elegibilidade, descrição ou classificação.
2. Relê-los como códigos, sem contar linhas repetidas de fatos como novas identidades; normalizar pelo helper existente e deduplicar por igualdade exata de string canônica.
3. Relê-los nos artefatos originais: lista `produtos` da Auditoria 3 e suas flags/schema; lista `arquivo_fora_uniao_runtime`; contador e método da Auditoria 4.
4. Reler F22/F08 pelo adapter oficial, preservando zeros/linha física; construir conjuntos **antes do filtro de elegibilidade**.
5. Calcular A/B/interseções/diferenças e comparar cada código com a lista da Auditoria 3.
6. Para cada um dos 133, localizar linha/descrição/bruto em F22, presença em F08, cinco estruturas correntes, snapshots e evidências; atribuir uma única origem principal.
7. Rodar o Preview puro oficial sobre os 133 somente para conferir motivos de filtro, com contexto vazio em memória; isso não executa manifesto, aprovação ou persistência.
8. Separar coincidência de valor em teste da origem do código. Inspecionar57 arquivos JS de testes/fixtures por literais exatos e os casos explicitamente documentados na Auditoria 4; não importar fixtures como dados da união.
9. Validar normalização, estabilidade e colisões e executar qualidade existente. Conferir hashes de fonte/código/documentos e banco antes/depois.

A categoria principal privilegia a fonte física comprovada dos valores que acrescentam B−A. Marcas históricas ou cópias em relatórios são anotações independentes, não segunda categoria principal.

## 5. Reconstrução exata de 6.123

| Componente | Códigos | Relação com A |
| --- | --- | --- |
| Master M | 860 | 853 também estão em O |
| Operacional O | 6113 | A mesma fonte do Dicionário |
| Custos C | 447 | Todos já pertencem aO |
| OP P | 355 | 350 em O; dois dos cinco restantes em M; três fora deM/O |
| Mapa L | 299 | Todos já contidos em M∪O∪C∪P |
| Histórico operacional | 6113 | Mesmo conjunto deO; não amplia |
| Snapshots Master conhecidos | 5713 | Todos contidos emA; não amplia |
| Snapshot mapa / divergências | 292 /96 | Contidos emA; não ampliam |

**|M ∪ O| =860+6.113−853=6.120.** Custos acrescenta0. OP acrescenta os três códigos **1758717,1758718,MCC016**, ausentes deM/O. Mapa acrescenta0.

**A=M∪O∪C∪P∪L; |A|=6.120+3=6.123.**

A lista reconstruída coincide **código por código** com os 6.123 da Auditoria 3: zero faltantes/excedentes. Nenhum código foi descartado por normalização, falta de descrição, grupo ou elegibilidade. Os rejeitados pelos filtros do arquivo não foram removidos dos cadastros para efetuar esta contagem.

Fotografia original: dados conjuntos da Auditoria 1 de17:09:30 UTC em 30/10, com revalidações integrais na Auditoria 3 em17:50:50–18:00:08 UTC e na Auditoria 4 em18:04:22–18:14:33 UTC. Nesta tarefa, nova leitura de códigos em **2026-10-30 18:22:24.98521+00** reproduziu os conjuntos, após conferir hashes iguais. Não foi substituída a composição original por um cadastro “corrigido”.

## 6. Reconstrução exata de 6.256

A Auditoria 4 usou a união dos códigos dos registros `canon_rows` (M/O/C/P/L já conciliados na Auditoria 3) com as linhas canônicas do arquivo em `recon_file`. Esses nomes eram variáveis transitórias da análise; as fontes e os resultados constam nos JSONs.

O artefato4 guarda o total/estabilidade dos 6.256 e hashes de suas fontes, não uma segunda lista completa desses códigos. A reconstrução é possível pela **lista A preservada no artefato3 + arquivo físico com hash idêntico**, cuja lista adicional de133 também já estava explicitamente preservada no artefato3. Não dependemos de inferência a partir apenas do total.

**B=A∪F22.**

- **|F22|=6.255**, todas as linhas de dados têm código canônico distinto.
- **|A∩F22|=6.122**.
- **A−F22={TESTE123}**.
- Logo, **|B|=6.123+6.255−6.122=6.256=6.255+1**.

A Auditoria 3 já registrava ambos os conceitos em suas seções 4/5/14. A Auditoria 4 ampliou o domínio do ensaio de estabilidade para os dados físicos, sem aumentar o cadastro persistido.

Não entram em B por origem de teste: `++1`, demais entradas do helper, S001–S110, OPONLY, FACT101 ou C001. Não entram novas identidades por categorias, IDs técnicos, descrições, snapshots duplicados ou transformação numérica.

## 7. Diferenças e interseções

| Operação | Resultado |
| --- | --- |
| A | 6123 |
| B | 6256 |
| A∩B | 6123 |
| B−A | 133 |
| A−B | 0 |
| F22−A | 133 |
| A−F22 | 1:TESTE123 |
| F22∩A | 6122 |

**B=A ⊎ (B−A)**, união disjunta; **6.256=6.123+133**. A diferença encontrada coincide exatamente com os 133 da lista `arquivo_fora_uniao_runtime` da Auditoria 3. Não houve arredondamento de contagem, compensação por inválidos ou resultado forçado.

## 8. Os133 códigos — identificação individual

Todos os registros abaixo têm origem principal **arquivo ERP**, descrição não vazia, código bruto textual igual ao normalizado, estabilidade1×/2×, zero linha em M/O/L e zero fatoC/eventoP. Nenhum aparece nos snapshots de cadastro persistido examinados. Flags completas estão no JSON.

“08/10” indica presença no arquivo histórico, não persistência. Motivo **TIPO**=TIPO_NAO_AUTORIZADO; **ORIGEM**=ORIGEM_NAO_AUTORIZADA, conforme Preview oficial. Nenhum desses motivos significa identidade sintaticamente inválida.

| Código | Linha22/10 | Linha08/10 | Descrição do arquivo22/10 | Tipo | Motivo |
| --- | --- | --- | --- | --- | --- |
| 003372 | 3376 | 3376 | GARRAFA DE TINTA T504422-BR AMARELO 70ML EPSON | D | TIPO |
| 003373 | 3377 | 3377 | GARRAFA DE TINTA T504322-BR MAGENTA 70ML EPSON | D | TIPO |
| 003374 | 3378 | 3378 | REFIL TINTA EPSON T504120-AL PRETO 127ML | D | TIPO |
| 003375 | 3379 | 3379 | REFIL TINTA EPSON T504220-AL CIANO 70ML | D | TIPO |
| 003376 | 3380 | 3380 | CONVERSOR DIGITAL DE TV INTELBRAS CD700 | D | TIPO |
| 003377 | 3381 | 3381 | PILHA LITIUM CR1220 | D | TIPO |
| 003378 | 3382 | 3382 | CAIXA DE SOBREPOR TOMADA LIZ FLEX 3 POSTO | D | TIPO |
| 003379 | 3383 | 3383 | MODULO TAMPA CEGA TRAMONTINA LIZ | D | TIPO |
| 003380 | 3384 | 3384 | MODULO TOMADA RJ11 TRAMONTINA LIZ | D | TIPO |
| 003381 | 3385 | 3385 | MODULO TOMADA RJ45 TRAMONTINA LIZ | D | TIPO |
| 003382 | 3386 | 3386 | RESISTENCIA DE CHUVEIRO | C | ORIGEM |
| 003383 | 3387 | 3387 | RESISTENCIA AQUECEDOR | C | ORIGEM |
| 003384 | 3388 | 3388 | TARTARUGA ARANDELA | C | ORIGEM |
| 003385 | 3389 | 3389 | CENTRO ANTARES AT 90 | C | ORIGEM |
| 003386 | 3390 | 3390 | CUBO ANTARES AT 90 | C | ORIGEM |
| 003387 | 3391 | 3391 | COLETOR DE DADOS MC2200 2D QRCODE IMAGER2D 4"16GB WIFI AND10 ZEBRA NS 23034523022582 | D | TIPO |
| 003388 | 3392 | 3392 | CATALOGO CATTERINO | C | ORIGEM |
| 003389 | 3393 | 3393 | TRANSPORTADOR | C | ORIGEM |
| 003390 | 3394 | 3394 | UNIAO CACAMBA MASIPACK | C | ORIGEM |
| 003391 | 3395 | 3395 | CHAPA DO CONFORMADOR DA EMPACOTADORA DA EMPACOTADEIRA DO ESPAGUETE | C | ORIGEM |
| 003392 | 3396 | 3396 | BICO FORMADOR INTERNO REHON INOX | C | ORIGEM |
| 003393 | 3397 | 3397 | PAINEL METALICO COMPLETO | C | ORIGEM |
| 003394 | 3398 | 3398 | LATAO SEXTAVADO 14MM | C | ORIGEM |
| 003395 | 3399 | 3399 | PISO CEJATEL 50X50 | C | ORIGEM |
| 003396 | 3400 | 3400 | MATRIZ PARA FORMA 635X255MM CHOCO BISCUIT CATTERINO | C | ORIGEM |
| 003397 | 3401 | 3401 | FORMA 635X255MM CHOCO BISCUIT CATTERINO | C | ORIGEM |
| 003398 | 3402 | 3402 | SALGADINHO | D | TIPO |
| 003399 | 3403 | 3403 | CHOCOLATE | D | TIPO |
| 003400 | 3404 | 3404 | PICOLE | D | TIPO |
| 003401 | 3405 | 3405 | SENSOR PARA SECADOR DE MAOS | C | ORIGEM |
| 003402 | 3406 | 3406 | BORNE CR109 | C | ORIGEM |
| 003403 | 3407 | 3407 | SUPORTE DO LED E SENSOR CR109 | C | ORIGEM |
| 003404 | 3408 | 3408 | VALVULA MB LATAO | C | ORIGEM |
| 003405 | 3409 | 3409 | MODULO DE LEITURA CELULA DE CARGA E ACC4 | C | ORIGEM |
| 003406 | 3410 | 3410 | CABO TELEFONICO RAMAL 1 PAR | D | TIPO |
| 003407 | 3411 | 3411 | ANEIS PARA BISCOITO | C | ORIGEM |
| 003408 | 3412 | 3412 | ONU 1791 HIPOCLORITO SOLUCAO | C | ORIGEM |
| 003409 | 3413 | 3413 | CAIXA DE ISOPOR | C | ORIGEM |
| 003410 | 3414 | 3414 | PANELA DE PRESSAO 12LITROS | D | TIPO |
| 003411 | 3415 | 3415 | MP5 MODULO DRIVE MOTOR DE PASSO 2 CANAIS TECKINIPACK | C | ORIGEM |
| 003412 | 3416 | 3416 | COROA DE BRONZE Z48 DENTES | C | ORIGEM |
| 003413 | 3417 | 3417 | CAIXA PARA PAINEL VIEW MASIPACK | C | ORIGEM |
| 003414 | 3418 | 3418 | TUNEL DE ENTRADA DE PRODUTO | C | ORIGEM |
| 003415 | 3419 | 3419 | TUNEL DE SAIDA DE PRODUTO | C | ORIGEM |
| 003416 | 3420 | 3420 | ENGATE RAPIDO MACHO 9MM | C | ORIGEM |
| 003417 | 3421 | 3421 | CONJUNTO MOD. INTERFACE | C | ORIGEM |
| 003418 | 3422 | 3422 | PORTA RECADO | D | TIPO |
| 003419 | 3423 | 3423 | BOBINA VIBRATORIA | C | ORIGEM |
| 003420 | 3424 | 3424 | EVAPORADORA PISO TETO 64K | C | ORIGEM |
| 003421 | 3425 | 3425 | ROLAMENTO 6317 ZC3 NSK | C | ORIGEM |
| 003422 | 3426 | 3426 | ARMADURA ELETRO IMA WEG MOD80 | C | ORIGEM |
| 003423 | 3427 | 3427 | KIT MOLA COMPRESSAO COM CILINDRO N10MM 29 | C | ORIGEM |
| 003424 | 3428 | 3428 | LONA SANITARIA CURVA | C | ORIGEM |
| 003425 | 3429 | 3429 | COMPLEMENTAR DE IPI | D | TIPO |
| 003426 | 3430 | 3430 | LUVA CRISTAL 2,5-6 MM PARA IDENTIFICAR CABOS | C | ORIGEM |
| 003427 | 3431 | 3431 | ACRILICO EXPOSITOR | C | ORIGEM |
| 003428 | 3432 | 3432 | MECANISMO ENTRADA UNIVERSAL CAIXA ACOPLADA | C | ORIGEM |
| 003429 | 3433 | 3433 | SECADORA ROUPA 10KG | D | TIPO |
| 003430 | 3434 | 3434 | BLOCO RASCUNHO COM SERRILHA | D | TIPO |
| 003431 | 3435 | 3435 | REPARO DE PISOS ARGAMASSA EPOXI | C | ORIGEM |
| 003432 | 3436 | 3436 | FREIO ELETROMAGNETICO | C | ORIGEM |
| 003433 | 3437 | 3437 | INVERSOR 0,25CV 220V MONOFASICO 1,6 | C | ORIGEM |
| 003434 | 3438 | 3438 | KIT LIMPEZA | C | ORIGEM |
| 003435 | 3439 | 3439 | PAINEL | C | ORIGEM |
| 003436 | 3440 | 3440 | OSCILOSCOPIO | C | ORIGEM |
| 003437 | 3441 | 3441 | PONTA MONTADA A05 HASTE 1/4 | C | ORIGEM |
| 003438 | 3442 | 3442 | CONJUNTO TUBO FORMATO | C | ORIGEM |
| 003439 | 3443 | 3443 | FITA ADESIVA DE PAPEL PARA DEMARCACAO DE CAIXA | C | ORIGEM |
| 003440 | 3444 | 3444 | FAROL AUXILIAR MILHA UNIVERSAL 55W | C | ORIGEM |
| 003441 | 3445 | 3445 | LUVA CRISTAL | C | ORIGEM |
| 003442 | 3446 | 3446 | RESISTENCIA ALTA CARGA 220V X 600W | C | ORIGEM |
| 003443 | 3447 | 3447 | BLOCO DE RESISTENCIA | C | ORIGEM |
| 003444 | 3448 | 3448 | MEDIDOR DE UMIDADE | C | ORIGEM |
| 003445 | 3449 | 3449 | RESISTENCIA | C | ORIGEM |
| 003446 | 3450 | 3450 | KIT 20 CAIXA BANDEJA 7 LITROS COM TAMPA | C | ORIGEM |
| 003447 | 3451 | 3451 | COLA QUENTE BASTAO SILICONE | C | ORIGEM |
| 003448 | 3452 | 3452 | PAPEL LEMBRETE 70X70 | D | TIPO |
| 003449 | 3453 | 3453 | EXPOSITOR CATTE BALCAO BARRAS | C | ORIGEM |
| 003450 | 3454 | 3454 | EXPOSITOR CATTE BALCAO BOMBOM | C | ORIGEM |
| 003451 | 3455 | 3455 | EXPOSITOR CATTE DE CHAO | C | ORIGEM |
| 003452 | 3456 | 3456 | TRILHO PRE GALVANIZADO | C | ORIGEM |
| 003453 | 3457 | 3457 | PINO BARRA TRIFASICO | C | ORIGEM |
| 003454 | 3458 | 3458 | DISJUNTOR TRIPARTIDO 250A 18KA 380V | C | ORIGEM |
| 003455 | 3459 | 3459 | VENTILADOR D 265X256X85MM 110/220V | C | ORIGEM |
| 003456 | 3460 | 3460 | GRELHA COM FILTRO 250X250 | C | ORIGEM |
| 003457 | 3461 | 3461 | SERVODRIVE 8 | C | ORIGEM |
| 003458 | 3462 | 3462 | CONTROLADOR PROGRAMAVEL DVP12SE11T | C | ORIGEM |
| 003459 | 3463 | 3463 | PASTILHA MOTOFREIO | C | ORIGEM |
| 003460 | 3464 | 3464 | MOTOR COMPLETO COM CREMALHEIRA | C | ORIGEM |
| 003461 | 3465 | 3465 | RADAR DE ENTRADA E SAIDA ANTIESMAGAMENTO | C | ORIGEM |
| 003462 | 3466 | 3466 | INFRAESTRUTURA ROSCADA 3/4 | C | ORIGEM |
| 003463 | 3467 | 3467 | CABO MANGA 12X26 | C | ORIGEM |
| 003464 | 3468 | 3468 | FONTE MCM 12,8 VCC 5A | C | ORIGEM |
| 003465 | 3469 | Ausente | FIO DE NYLON 40MM | C | ORIGEM |
| 003466 | 3470 | Ausente | PULSEIRA PARA FESTAS | C | ORIGEM |
| 003467 | 3471 | Ausente | REFLETOR LED 30W | C | ORIGEM |
| 003468 | 3472 | Ausente | ROLO MOLDADOR FORNO B DIAMETRO 250MM | C | ORIGEM |
| 003469 | 3473 | Ausente | PINO ADAPTADOR T 3 SAIDAS 3P PRETO | C | ORIGEM |
| 003470 | 3474 | Ausente | PLATAFORMA BACK M1 PRETO | C | ORIGEM |
| 003471 | 3475 | Ausente | JUNTA PARA VISOR CIRCULAR 53MM | C | ORIGEM |
| 003472 | 3476 | Ausente | KIT CONEXAO TIPO TOMADA PARA CONEXAO 4 VIAS | C | ORIGEM |
| 003473 | 3477 | Ausente | INVERSOR TRIFASICO 6,0CV/4,5KW 10,0A 380VCFW | C | ORIGEM |
| 003474 | 3478 | Ausente | INVERSOR TRIFASICO 3,0CV/2,2KW 5,0A 380V CFW | C | ORIGEM |
| 003475 | 3479 | Ausente | INVERSOR TRIFASICO 2,0CV/1,5KW 3,6A 380V CFW | C | ORIGEM |
| 003476 | 3480 | Ausente | SIST PES PTE | C | ORIGEM |
| 003477 | 3481 | Ausente | MICROFONE REDRAGON SEYFERT GM100 | D | TIPO |
| 003478 | 3482 | Ausente | CABO SATA3 UGREEN PRETO 50CM | D | TIPO |
| 003479 | 3483 | Ausente | TELEFONE INTELBRAS SEM FIO TS 3111 PRETO | D | TIPO |
| 003480 | 3484 | Ausente | CABO MINI USB | D | TIPO |
| 003481 | 3485 | Ausente | CORREIA EM 6/2 00+25 | C | ORIGEM |
| 003482 | 3486 | Ausente | TORQUIMETRO DE ENCAIXE DE 1/2 28 | C | ORIGEM |
| 003483 | 3487 | Ausente | SENSOR PT 100 4,7X70 CABO 1000MM | C | ORIGEM |
| 003484 | 3488 | Ausente | ADAPTADOR 3/8 1/4 POLEGADA FORJADO EM ACO CROMO VANADIO | C | ORIGEM |
| 003485 | 3489 | Ausente | ADAPTADOR 1/2 3/8 POLEGADA FORJADO EM ACO CROMO VANADIO | C | ORIGEM |
| 003486 | 3490 | Ausente | CREMALHEIRA PARA VIRAR CANECAS DO TRANSPORTADOR | C | ORIGEM |
| 1020714 | 3628 | 3606 | GERMANI MASSA COM OVOS PADRE NOSSO 20 X 500 G | P | ORIGEM |
| 1020714P | 3629 | 3607 | GERMANI MASSA COM OVOS PADRE NOSSO 20 X 500 G | P | ORIGEM |
| E01355 | 5635 | 5613 | ETIQUETA 50 X 30 | C | ORIGEM |
| E01357 | 5636 | 5614 | BOBINA FILME INTERNO BI REDONDO 220 MM 30µ BOPP | C | ORIGEM |
| E01358 | 5637 | 5615 | BOBINA FILME INTERNO BI QUADRADO 270 MM 30µ BOPP | C | ORIGEM |
| E01359 | 5638 | 5616 | SACO PAPEL KRAFT COM VISOR 12X20CM | C | ORIGEM |
| E01360 | 5639 | 5617 | BOBINA FILME INTERNO BI QUADRADO 275 MM 30µ BOPP | C | ORIGEM |
| E01361 | 5640 | 5618 | SACO PAPEL KRAFT C VISOR 12 X 120 CM | C | ORIGEM |
| E01363 | 5641 | Ausente | CAIXA BRINDE CATTE PRETA | C | ORIGEM |
| E01364 | 5642 | Ausente | CAIXA PAPEL RETANGULAR PRETA COM IMA | C | ORIGEM |
| F01354 | 5661 | 5637 | EMBALAGEM PAPEL DSP CATTE BALCAO BARRAS 1001532801 142340 310X256X385 | C | ORIGEM |
| M01350 | 6089 | 6065 | MUSCULO BOVINO | C | ORIGEM |
| M01351 | 6090 | 6066 | ACEM BOVINO | C | ORIGEM |
| M01352 | 6091 | 6067 | QUEIJO COALHO | C | ORIGEM |
| M01353 | 6092 | 6068 | AROMA IDENTICO AO NATRUAL LEITE CONDENSADO APLINOVA COD 284474 | C | ORIGEM |
| M01356 | 6093 | 6069 | PIMENTA DO REINO | C | ORIGEM |
| M01362 | 6094 | 6070 | PATINHO BOVINO | C | ORIGEM |
| M01365 | 6095 | Ausente | EMULSIFICANTE DPAN 1373 DOREMUS | C | ORIGEM |

Balanço individual: **133 identificados;0 origem indeterminada**. Todos estão fisicamente no arquivo; “código real observado” neste sentido não significa produto ativo, comercializável ou admitido no Kustos.

## 9. Classificação principal por origem

| Categoria principal dos 133 | Quantidade |
| --- | --- |
| Master ERP persistido | 0 |
| Cadastro Operacional | 0 |
| dicionario_produtos (mesma fonte operacional) | 0 |
| dicionario_master_produtos (mesmo Master) | 0 |
| mapa_produtos | 0 |
| Custos | 0 |
| OP | 0 |
| Arquivo ERP | 133 |
| Snapshot/evidência como origem principal | 0 |
| Fixture/teste | 0 |
| Código sintético de ensaio | 0 |
| Resultado de normalização | 0 |
| Duplicidade antes eliminada | 0 |
| Outra origem comprovada | 0 |
| Origem indeterminada | 0 |

**Soma=133.** Operacional/Dicionário e Master/dicionario_master são aliases de fonte, não quatro tabelas distintas. Aparecer numa evidência histórica não muda a origem principal de um código comprovadamente extraído do arquivo corrente analisado.

### Rótulos ERP existentes, sem taxonomia nova

| Descr(Origem) literal | Códigos |
| --- | --- |
| PASSAGEM DIRETA | 25 |
| MATERIAIS DE MANUTENCAO | 80 |
| MATERIAIS DE MARKETING | 10 |
| MASSA PRODUZIDA FARDO/CX | 1 |
| MASSA PRODUZIDA PCT | 1 |
| MATERIAIS AUXILIARES DE PRODUCAO | 1 |
| EMBALAGENS | 7 |
| MATERIA PRIMA DEVOLUCAO | 1 |
| MATERIAS PRIMAS | 7 |

Tipo: **106 C,25 D,2 P**. Filtro oficial: **25 por Tipo e108 por Origem**, zero elegíveis/erros de identidade nesse recorte. Os doisP são **1020714 e1020714P**, MASSA PRODUZIDA; já constavam na fonte08/10 e na coorte114 da Auditoria 4. Nenhum possui Custos/OP.

Todos têm descrição, nenhum possui registro nas estruturas persistidas examinadas, nenhum é exclusivamente teste, nenhum foi gerado pela normalização. O arquivo é evidência de origem; a ausência de cadastro ou fatos não autoriza invalidar esses produtos.

## 10. Normalização, duplicidades e colisões

| Fonte | Entradas de identidade | Brutos distintos | Canônicos distintos | Inválidos | Transformados | Colisões | Instáveis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| master | 860 | 860 | 860 | 0 | 0 | 0 | 0 |
| operacional | 6113 | 6113 | 6113 | 0 | 0 | 0 | 0 |
| custo | 447 | 447 | 447 | 0 | 0 | 0 | 0 |
| op | 355 | 355 | 355 | 0 | 0 | 0 | 0 |
| mapa | 299 | 299 | 299 | 0 | 0 | 0 | 0 |
| arquivo22 | 6255 | 6255 | 6255 | 0 | 0 | 0 | 0 |
| arquivo8 | 6230 | 6230 | 6230 | 0 | 0 | 0 | 0 |

As linhas de C/P desta tabela são códigos já distintos da consulta; repetições em2.481 fatos/1.469 eventos não são representações brutas diferentes. A igualdade completa das tabelas com as auditorias anteriores também conserva seus controles sobre todos os fatos.

Nos 133: **133 strings,115 com zero à esquerda, comprimento6–8, zero ciência, zero decimal, zero sinal, zero whitespace/invisível e zero número com mais de15 dígitos**. Não ocorreu arredondamento, expansão científica, rejeição, unificação ou separação que alterasse o cardinal. Cada código aparece uma vez em F22.

Exemplos **existentes nos dados**:003372 preserva os zeros;1020714P preserva o sufixo alfanumérico. No universoA/B,000001,001 e001000 são códigos distintos, com descrições diferentes (PLUG MACHO;REFUGO MACARRAO INSTANTANEO;ROLO LIXA), e continuam distintos. Sua coincidência com valores usados em ensaios não lhes dá origem sintética.

**N brutos distintos→1 canônico:** zero ocorrência nas fontes reais examinadas. Mesma representação repetida em arquivos/tabelas é deduplicação de presença, não colisão de normalização.

**1 bruto→múltiplos canônicos:** zero na aplicação de uma mesma função ao mesmo valor real; segunda normalização também permanece igual em A/B. Os contraexemplos malformados da Auditoria 4 são outro domínio e não explicam133. Nenhuma correção ou implementação do helper foi proposta nesta etapa.

## 11. Testes e controles

Os testes e controles remotos abaixo foram executados em **30/10/2026**. A conferência documental final em **05/11/2026** confirmou novamente a matemática, os 133 registros, os links e os hashes dos arquivos ERP, documentos históricos e módulos inspecionados. As contagens continuam referidas à fotografia de 30/10; não houve nova consulta ao banco nesta retomada.

| Verificação | Resultado |
| --- | --- |
| Suíte existente | 990/990;52 arquivos;42,54s |
| Relacionados Cadastro Mestre | 433/433;22 arquivos;27,04s;subconjunto dos990 |
| Lint | OK;zero erros/avisos |
| Typecheck | OK;tsc --noEmit -p jsconfig.json |
| Build | OK;configuração pública em memória,host confirmado;dist local;sem publicação |
| Conjuntos | A=6123;B=6256;interseção=6123;B−A=133;A−B=0 |
| Fonte física | Dois originais relidos;hashes correspondem às auditorias/logs |
| Preview puro dos 133 | 133 excluídos;0 elegíveis;0 erro de identidade;25 Tipo/108 Origem |
| JSON/links/diff-check | OK;19 seções,133 linhas individuais,24 referências locais;JSON/matemática/fontes conferidos |
| Banco | OK;20 tabelas com contagens/fingerprints iguais;nenhuma escrita executada |

Comandos equivalentes aos scripts npm, usando binários locais porque npm não está no PATH: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=dot`; relacionados selecionados por `rg --files tests -g '*cadastro-mestre*.test.js' -g '*product-master*.test.js' -g '*custos-classification*.test.js'`; `node node_modules/eslint/bin/eslint.js .`; `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`; build por `buildWeb({env})` do script oficial com configuração pública em memória, sem imprimir chave; `git diff --check`.

Os testes existentes podem usar bancos locais isolados; nenhuma simulação ou verificação desta reconciliação escreve em banco real, fixture, código ou arquivo de origem. Não foram adicionados testes de implementação.

## 12. Códigos sintéticos, fixtures e TESTE123

**TESTE123** existe no Operacional, descrição **Produto Teste**, grupo SEM_AGRUPAMENTO, sem Master/Custos/OP/mapa e ausente dos dois arquivos ERP. Também existe no snapshot histórico operacional. Logo, está em A e B, **não em B−A**. Contribui com o “+1” em 6.255+1, mas não explica os 133.

A designação sugere cadastro de teste; os campos não comprovam quem o criou nem toda a sua proveniência. O registro persistido foi contado por presença, sem removê-lo ou certificar produto empresarial.

Nos ensaios documentados da Auditoria 4, **++1,+-1,+++001** e seus resultados não pertencem aA/B/133. As113 identidades de fixture analisadas (S001–S110,OPONLY,FACT101,C001) também não pertencem aB. Entradas/saídas sintéticas do helper coincidem em **três valores** com códigos reais já persistidos e físicos:000001,001,001000; nenhum está nos 133. Essa coincidência não significa que os ensaios os criaram ou que foram incorporados à conta por teste.

Inspeção de **57 arquivos JS** de testes/fixtures: nenhum literal exato dos 133 encontrado e nenhum TESTE123. Limite: busca de literais não certifica ausência de toda geração dinâmica possível; ela não é necessária para atribuir origem, comprovada no arquivo real. As fixtures não foram fonte deA/B.

Busca por nomes/descrições sugestivas encontrou, além de TESTE123, nomes de materiais como **CHAVE TESTE** e **ESMALTE SINTETICO**. São rótulos de produtos físicos no arquivo, não prova de dado de ensaio. Nenhum dos 133 foi classificado como sintético por esse critério textual.

O lote OP com arquivo chamado teste.CSV, registrado anteriormente, não autoriza chamar todos os seus códigos de sintéticos. Seus fatos já pertencem aA por persistência e nenhum dos 133 possui OP. Não se decidiu uma política definitiva de exclusão de dados de teste.

## 13. Fontes históricas e evidências anteriores

| Fonte histórica | Códigos distintos totais | Quantos dos 133 |
| --- | --- | --- |
| Arquivo08/10 | 6230 | 108 |
| Arquivo22/10 | 6255 | 133 |
| Snapshot operacional audit_kustos | 6113 | 0 |
| Snapshot mapa audit_kustos | 292 | 0 |
| Divergências históricas audit_kustos | 96 | 0 |
| Master anterior conhecido nos logs | 5713 | 0 |
| Removidos Master conhecidos nos logs | 4853 | 0 |
| Detalhamento de produtos no JSON1 | Recorte447Custos | 0 |
| Estados por código do JSON2 | 6256 | 133 |
| União/lista extra do JSON3 | 6123+133 extras | 133 |
| Referências literais no JSON4 | Coorte PRODUZIDA e demais evidências | 2 |

A presença emJSON2/3/4 é evidência documental do arquivo; não é registro persistido de produto. No JSON1, o detalhamento de Custos não precisava enumerar os 133 sem fatos; ausência ali não prova que o arquivo não os contivesse.

**F08 ⊂ F22; |F22−F08|=25; |F08−F22|=0.** Entre os 133,108 foram observados também em 08/10 e 25 apenas em 22/10. “Apenas em 22/10” significa entre os dois arquivos examinados, não data de criação empresarial.

| Tipo dos 133 | Total | Já em 08/10 | Só em 22/10 |
| --- | --- | --- | --- |
| C | 106 | 85 | 21 |
| D | 25 | 21 | 4 |
| P | 2 | 2 | 0 |

Há **25 códigos TipoD** e **25 adicionais entre arquivos**, mas são recortes diferentes: somente quatro dos 25 novos são Tipo D;21 são Tipo C. Não confundir a coincidência numérica.

## 14. Reconciliação matemática final

| Universo | Quantidade | Definição | Fontes |
| --- | --- | --- | --- |
| Auditoria 3 — A | 6123 | União persistida analisada | M/O/C/P/L;históricos não acrescentam |
| Auditoria 4 — B | 6256 | Observado das fontes de dados selecionadas | A∪F22;F08/históricos não acrescentam |
| Interseção | 6123 | A∩B=A | Todos os persistidos estão em B |
| Somente6.123 | 0 | A−B | Nenhum |
| Somente6.256 | 133 | B−A=F22−A | Arquivo ERP;108 também históricos em F08 |

Verificações: **6.123+133=6.256;6.255+TESTE123=6.256;6.122+133=6.255;6.120+3OP=6.123;108+25=133**. Classificação exclusiva principal soma133. Nenhum normalizado/teste/indeterminado foi usado para fechar a diferença.

## 15. Conclusão

1. **6.123≠6.256 porque as fontes são diferentes:** o segundo inclui códigos físicos do arquivo ERP que não existem nas estruturas persistidas analisadas.
2. **6.123 permanece correto como união persistida**, reproduzida integralmente e revalidada.
3. **6.256 permanece correto como universo observado de dados para o escopo A∪F22**, incluindo TESTE123 persistido. Não representa admissão automática ou união irrestrita de strings sintéticas.
4. **Todos os 133 têm origem conhecida: arquivo ERP.** Zero fatos, zero cadastros/snapshots persistidos examinados, zero transformação/colisão e zero origem indeterminada nesse grupo.
5. **Não há conflito numérico entre as Auditorias3/4.** Havia ambiguidade de apresentação e no termo “reais”; a distinção já constava na Auditoria 3 e foi esclarecida documentalmente na Auditoria 4.
6. O universo investigativo **524** e a relação global **278** permanecem iguais. Não houve modificação de produto, filtro, classificação ou regra de negócio.

Não é necessário escolher um número vencedor: conservar ambos com fonte/tempo/definição e manterT separado.

## 16. Impacto na Auditoria 4 e nas CAD-01–20

**A — Observados:**6256 correto para o escopo das fontes de dados. Deve ser rotulado, não apresentado como todos os produtos válidos/ativos ou todas as strings de testes.

**B — Persistidos:**6123 continua correto. Os133 não foram inseridos.

**C — CAD-01:**acrescentar esclarecimento documental de universo observado/persistido/investigativo/ensaios, sem alterar a identidade por código ou aprovar a regra proposta.

**D — DEC-01–07:** permanecem pendentes; o esclarecimento resolve a base numérica, não as decisões empresariais.

**E — CAD-01–20:** não requerem troca de comportamento por causa dos 133. CAD-01 recebe nota de escopo; CAD-15(contagens) e CAD-19(fontes/política) devem ser lidas com denominadores e fontes explicitados nesta reconciliação. Nenhuma regra virou norma oficial ou implementação.

**F — Risco de usar só6123:** omitir133 linhas/códigos físicos da validação da fonte, confundir “não persistido” com “inexistente” ou ignorar candidatos futuros. Isso não significa admitir133 automaticamente.

**G — Risco inverso:** tratar6256 como cadastro corrente fabrica133 registros, mascara pendências de admissão e pode levar a contagens/provas de carga falsas. Validação da fonte e persistência precisam de conjuntos distintos.

A nota acrescentada ao relatório4 preserva a frase original e a identifica, em vez de apagar o histórico. JSONs históricos e relatórios1/2/3 permanecem intactos. O campo histórico `identidade.codigos_reais` no JSON4 conserva seu nome para rastreabilidade; a leitura correta é “códigos observados nas fontes de dados”, não uma certificação de produto real/ativo.

## 17. Impacto nas DEC-01–07

| Decisão | Impacto comprovado | Estado |
| --- | --- | --- |
| DEC-01 — Universo/admissão | Esclarecimento direto: preservar6123 persistidos não admite133 apenas físicos.6256 mede observação das fontes selecionadas | Nenhuma aprovação; decidir admissão/naturezas separadamente |
| DEC-02 — Elegibilidade/estado | 133 seguem filtrados:25 por Tipo e108 por Origem;os dois MASSA já estavam na coorte114 | Não ampliar filtro nem presumir ativos/invalidade |
| DEC-03 — Autoridade/blank | Diferença de universo não é divergência de campo | Sem mudança; manter decisão por campo pendente |
| DEC-04 — Conflitos/impacto | Não há colisão ou conflito de identidade explicando133 | Sem mudança; efeitos de futura admissão continuam revisáveis |
| DEC-05 — Integral/delta/vigência | 25 ausentes em8/10 e presentes22/10 mostram diferença entre arquivos, não prova de produto recém-criado | Não inferir delta ou vigência; decisão continua pendente |
| DEC-06 — Auditoria/reversão | Registrar universo, fontes, snapshot/hash e origem exclusiva versus marca histórica | Aprimorar clareza da evidência sem criar estrutura ou aprovar retenção |
| DEC-07 — Entrada segura | ++1 e ciência imprecisa são ensaios independentes;nenhum explica133 | Pré-condição conhecida permanece, sem correção do helper |

Não aprovar automaticamente nenhuma decisão, nem usar a conclusão para executar contrato incremental. Os limites do helper são uma pré-condição independente já conhecida; sem relação causal com os 133 e sem proposta corretiva nesta auditoria.

## 18. Pendências, limites, banco e Git

A discrepância de evidência está **fechada**, com133/133 origens identificadas. Permanecem as aprovações empresariais e técnicas da Auditoria 4, a política de admissões/atividade e de dados de teste. O ERP ao vivo, arquivos não examinados e proveniência completa de criação dos cadastros não foram certificados. O histórico de Master examinado compreende as arrays snapshot_master/removidos conhecidas; o lote 1 não possui snapshot_master nesse formato. A ausência nessas imagens não prova que um código jamais tenha sido persistido.

Nenhuma mudança conceitual da arquitetura foi introduzida: distinguimos dois conjuntos que já coexistiam na Auditoria 3. Portanto, não foi necessário alterar arquitetura oficial,README,VISION,ROADMAP,manuais ou produção. Apenas relatório/evidências novos, esclarecimento na Auditoria 4 e registro datado no AGENTS.

**INSERT:0;UPDATE:0;DELETE:0;MIGRATIONS:0;IMPORTAÇÃO REAL:NÃO.** Sem mudança de schema,RLS,Auth,helper,filtros,importer,executor,classificação,agrupamento,Custos,OP ouOP×Custo. Nenhum ensaio regravou projeto/banco ou arquivo ERP. Somente os documentos autorizados foram escritos como alterações da entrega; nenhuma fixture/script temporário foi criado. O build obrigatório gerou somente artefatos locais em dist ignorado, sem alterar arquivos versionados de configuração ou produção.

**commit:NÃO;push:NÃO;deploy:NÃO.** Build local não publica. HEAD permanece o inicial. `data_referencia` continua competência e `criado_em` importação; nenhuma data de arquivo é usada como competência.

## 19. Decisão recomendada sobre o conceito de universo

Usar nomes explícitos e datados: **U_persistido=6123;U_observado_dados=6256;U_investigativo=524;U_ensaios separado**. Cada evento de auditoria deve declarar a lista de fontes,hash/snapshot,normalização e unidade(código versus linha/fato).

Fechar a inconsistência 6.123×6.256 como **diferença de definição comprovada**, sem substituir um número pelo outro. Retornar depois às DEC-01–07 e à aprovação formal CAD-01–20; esta auditoria não as aprova e não cria implementação.
