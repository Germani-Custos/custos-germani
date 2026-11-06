# CAD-ELEG-01 — Etapa 4: elegibilidade do Cadastro Mestre

## Escopo e estado

Implementação local em 05/11/2026, derivada da DEC-02 já aprovada. HEAD inicial `4d82ecff91a213180cf6ed916cba430662959af8`, checkout inicialmente limpo. Somente motor puro, testes e documentação; sem SQL/consulta Supabase, RPC, migration, carga, admissão, classificação manual, commit, push ou deploy. `data_referencia` permanece competência e `criado_em` importação/proveniência.

As Etapas 1/2/3 desta conversa são relatórios no chat, não arquivos versionados que esta entrega teria alterado. Auditorias históricas e seus JSONs permanecem intactos. Esta correção não implementa Geral/Detalhado, bootstrap, fluxo incremental ou reversão seletiva, nem declara DEC-01–07 integralmente implementadas.

## Diagnóstico e regra corrigida

O único `motivoFiltro()` está em `core/cadastro-mestre-preview-engine.js`, chamado pelo Preview. Antes: Tipo P/C, `/produzido|revenda/i` em `descr_origem`, `/inativo|exluir/i` na descrição. Faltavam PRODUZIDA/MASSA PRODUZIDA e EXCLUIR; substrings como REVENDADEIRA e REPRODUZIDO passavam. A fixture de rejeição também reproduzia EXLUIR.

`avaliarElegibilidadeCadastroMestre()` agora centraliza a avaliação pura:

1. Tipo P/C.
2. Descrição ERP da origem com palavras completas PRODUZIDO, PRODUZIDA, MASSA PRODUZIDA ou REVENDA, inclusive qualificadores CX/PCT/UN/FARDO. Limites Unicode impedem letras, números e underscore adjacentes. Código de origem, família, agrupamento e descrição comercial não são fallback.
3. Descrição contendo INATIVO ou EXCLUIR; INATIVO tem precedência se ambos ocorrerem. EXLUIR sozinho não bloqueia. A regra dos marcadores é substring, conforme o contrato “contém”, sem inventar outros marcadores.

Comparação usa `normalizeText(textoCadastro(valor) || '')`, reutilizando normalização de caixa, diacríticos e espaços. Valores originais não mudam; `normalizeCodigoProduto` permanece intacto. Null/ausente/vazio são ausência, números finitos são texto; 0 é origem desconhecida, não origem vazia. Objetos, booleanos e números não finitos mantêm o erro escalar existente. Descrição vazia não recebe uma nova regra de bloqueio nesta entrega.

O helper retorna `{elegivel,motivo}` com ELEGIVEL, TIPO_NAO_AUTORIZADO, ORIGEM_NAO_INFORMADA, ORIGEM_NAO_AUTORIZADA, PRODUTO_INATIVO ou PRODUTO_EXCLUIR. Ele não valida identidade/admissão: código e duplicidades continuam no Preview, com suas regras anteriores.

O wrapper privado preserva os motivos gerais do Preview: TIPO_NAO_AUTORIZADO, ORIGEM_NAO_AUTORIZADA (inclusive ausência) e DESCRICAO_EXCLUIDA. Não foram criados estados persistidos, labels de UI ou campos de transporte. Origem 632 sem categoria pode ser elegível e continuar PENDENTE na resolução exata; origem vazia é outro diagnóstico.

## Reconciliação em memória com as fontes da Etapa 3

Os originais estão fora do checkout, nas origens locais já autorizadas e examinadas nesta conversa. As linhas canônicas da leitura anterior em memória foram reutilizadas após reler os bytes e verificar o SHA-256. Não houve upload, conversão, importação ou avaliação de macros/fórmulas. A fotografia dos 860 códigos é a examinada na Etapa 3; não foi relida do Supabase nesta etapa.

| Fonte | Linhas | SHA-256 |
| --- | ---: | --- |
| `D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/cadastro mestre 8_10.xls` — F08, Sheet1 | 6.230 | `3b0e8ce693038884f5453e2094adf8a0e860d4a0d079d25f8dccbffb15c16c14` |
| `D:/Meus Documentos - Aprendiz Custos/Área de Trabalho/pedro/1234/cadastro mestre 22_10.xls` — F22, Sheet1 | 6.255 | `46b308b73f04ee4c1ca019ea2186bfaf4b41b3b2118dbf5a76a0bc4406013dff` |

| Medida | F08 | F22 |
| --- | ---: | ---: |
| Elegíveis pelo filtro anterior | 860 | 860 |
| Elegíveis pelo motor corrigido | 955 | 955 |
| Adicionados / retirados do conjunto analítico | 95 / 0 | 95 / 0 |
| Códigos da fotografia Master que continuam passando | 860 / 860 | 860 / 860 |
| MASSA PRODUZIDA — registros / elegíveis | 114 / 95 | 114 / 95 |
| MASSA PRODUZIDA bloqueados por INATIVO | 19 | 19 |
| Descrições com EXCLUIR / aceitas | 64 / 0 | 64 / 0 |

Os 95 adicionados são os MASSA PRODUZIDA sem os marcadores impeditivos, não uma allowlist ou admissão. Os 64 EXCLUIR já ficavam fora pelos critérios anteriores de Tipo/origem; o conjunto real não demonstra sozinho o efeito do marcador corrigido em origem elegível. Esse efeito é comprovado pelas fixtures unitárias/de formato. Nenhuma descrição EXLUIR foi encontrada nesses originais.

Origem 632: `1041716P` e `1841715P` permanecem elegíveis pelo texto DERIVADOS DE MILHO REVENDA PCT, sem exigir categoria. Origem 12: `F01354`, MATERIA PRIMA DEVOLUCAO, continua ORIGEM_NAO_AUTORIZADA pelo vocabulário, não por ausência no catálogo. Não foi criada categoria ou correspondência.

## Impacto nos consumidores

| Consumidor | Compatibilidade e limite |
| --- | --- |
| Adapter/serviço de Preview | Reutiliza o núcleo; arquivo e transporte V3 permanecem intactos. Testes verificam os três formatos. |
| Manifesto/revisão | Usa o conjunto do Preview; propostas e hashes podem mudar. Uma revisão antiga divergente exige novo Preview/aprovação; `execucao_permitida:false` e decisões pendentes permanecem. |
| Plano/executor geral/web | Permanecem integrais e revalidam manifesto/hash, com aprovação separada. Não foram alterados nem chamados contra ambiente compartilhado. Continuam podendo propor DELETE no Master; não são o fluxo Geral/Detalhado. |
| Comercial isolado | Regenera manifesto e exige fotografia inicial 6230/860/162/324/698. F08 com 955 potenciais é incompatível com revisão antiga; deve bloquear. Não ampliar contagens/guardas, admitir candidatos ou usar como incremental. Compatibilidade exige etapa própria. |
| UI de Preview | Continua apresentando cálculos/propostas e confirmação separada. Helper detalhado não altera os motivos gerais existentes. |
| Consulta ERP, operacional, filtros/relatórios/exportações de Custos, OP e OP × CUSTO | Não consomem este filtro diretamente; nenhuma regra de classificação, identidade, métrica, fila ou exportação foi alterada. |

A correção pode mudar propostas de INSERT/UPDATE/DELETE geradas pelo manifesto existente, mas não as executa. Não garante que o executor integral cumpra preservação futura de Geral/Detalhado. Ativação/publicação ou execução continuam fora do escopo.

## Validação técnica

Baseline anterior à edição: 990/990 testes, 52 arquivos, zero falhas, com dois workers. Testes específicos após a correção: 209/209 em cinco arquivos; 102 casos novos de elegibilidade e três casos novos de formato, além das regressões existentes.

Cobertura: tipos/combinações, vocabulário completo, qualificadores, caixa/diacríticos/espaços, limites Unicode e substrings, nulos/números/escalares inválidos, INATIVO/EXCLUIR/EXLUIR, precedência, categoria/família/grupo ausentes, imutabilidade, ausência de I/O, motivos gerais e preservação de ausentes/filtrados no Preview. Código/duplicidade, payload, manifesto, web, UI e executores permanecem cobertos pela suíte existente, com mocks e PostgreSQL local isolado/PGlite; não são ensaios de produção.

Validação final: **1.095/1.095 testes**, 53 arquivos, zero falhas (990 anteriores + 105 novos). Regressões de Cadastro Mestre, API, formatos/transporte, manifesto, UI, web, executor geral/comercial e módulos Custos/OP/OP × CUSTO passaram. Nenhuma falha nova ou preexistente foi observada nesses comandos. Suíte baseline e final usaram `--maxWorkers=2`.

Comandos e resultados:

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 1.095 aprovados, zero falhas.
- Run específico dos cinco arquivos: 209 aprovados, zero falhas.
- `node node_modules/eslint/bin/eslint.js .`: aprovado.
- `node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json`: aprovado.
- `buildWeb` de `scripts/build-web.mjs`: aprovado com URL/chave públicas fictícias (`example.supabase.co` / `test-anon-key`) somente no ambiente do processo; nenhuma configuração de produção alterada e nenhuma publicação.
- `git diff --check`: aprovado; diff e arquivos não rastreados conferidos.

Revisão estática independente não encontrou achado bloqueante no motor/testes. Limites de executor integral e comercial pontual foram registrados, sem alteração de suas guardas.

## Pendências preservadas

Admissão/estados de Geral/Detalhado; reconciliação dos dez códigos ausentes do operacional; bootstrap/aproveitamento das aprovações históricas; correspondências e vigência das fontes; fronteira segura de identidade; conflitos e impactos analíticos; execução incremental; idempotência e reversão seletiva; autoria/histórico de override; compatibilidade dos clientes/executores e publicação. Elegibilidade não encerra esses contratos nem itens alheios do backlog.

Nenhum dado/schema/log/snapshot ou arquivo ERP foi alterado. Nenhum SQL remoto/Supabase, RPC, migration, importação real, admissão, exclusão de produto/fato, commit, push ou deploy foi realizado.

## Estado Git e arquivos

HEAD inicial/final `4d82ecff91a213180cf6ed916cba430662959af8`; sem commit. Estado final contém somente os arquivos desta entrega, ainda sem stage:

- Código: `core/cadastro-mestre-preview-engine.js`.
- Testes/fixture alterados: `tests/cadastro-mestre-preview-engine.test.js`, `tests/cadastro-mestre-preview.test.js`, `tests/cadastro-mestre-execution-data.test.js`, `tests/fixtures/cadastro-mestre-arquivo.js`.
- Teste novo: `tests/cadastro-mestre-eligibilidade.test.js`.
- Documentação alterada: `AGENTS.md`, `README.md`, `ROADMAP.md`, `docs/arquitetura/cadastro-mestre-contrato-operacional.md`, `docs/arquitetura/cadastro-mestre-preview.md`, `docs/arquitetura/cadastro-mestre-reconstrucao.md` e os três manuais.
- Documento novo: este relatório.

Total: 14 arquivos rastreados alterados e dois arquivos novos. Adapter, transporte, API, executores, normalizador canônico, migrations/SQL, dependências, configurações e provas históricas não foram alterados. `dist` é saída local ignorada do build, sem deploy.
