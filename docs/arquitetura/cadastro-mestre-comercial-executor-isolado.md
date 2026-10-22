# CAD-COM-EXEC-01 — carga comercial isolada

Implementação administrativa local. **A escrita real permanece bloqueada até nova autorização humana explícita.** Não há nova migration, alteração de schema, frontend, endpoint ou publicação. O executor geral `executarReconstrucaoCadastroMestre` continua intacto e não deve ser usado nesta carga: também grava proveniência, timestamps e log.

## Contrato de entrada

`validarCargaComercial(entrada)` em `scripts/lib/cadastro-mestre-comercial.mjs` recebe:

- `manifesto`: objeto integral `MANIFESTO_COMERCIAL_PARA_REVISAO_FASE_A`, sem mudar suas marcas de preparação/execução proibida;
- `hashManifesto`: SHA-256 explicitamente conferido do JSON canônico (`serializarDeterministico`), diferente do hash dos bytes do arquivo JSON;
- `fotografiaBytes`: bytes originais da fotografia anterior, vinculados pelo SHA-256 do manifesto;
- `arquivo`: `{name, arrayBuffer()}`, contendo o XLS/XLSX/XLSM original;
- `leitor`: SheetJS da mesma versão registrada no manifesto.

`executarCargaComercial({...entrada, client, confirmacao})` exige também cliente PostgreSQL administrativo dedicado, **sem transação já aberta**, e confirmação exata `APLICAR_AGRUP_COM:<hashManifesto>`. O chamador deve encerrar a conexão em `finally`, inclusive após erro. A biblioteca não cria conexão nem lê credenciais. Não disponibilizar no browser nem usar RPC. A confirmação textual não substitui autorização humana para produção.

A evidência é copiada antes dos awaits. Fotografia e XLS são conferidos pelos bytes. Adapter e motores existentes são reutilizados sem alteração: V3 de onze posições, `RECONSTRUCAO_UNIVERSO_V2`, mesmos filtros, normalização, conflitos e valores recebidos/calculados. A projeção comercial integral de 860 produtos, inclusive valores brutos/atuais/propostos, ações e campos alterados, deve reproduzir a Fase A. Conferir também hashes dos dados/contexto, aba, colunas, nome/tamanho do arquivo e versão SheetJS.

Contrato limitado a esta primeira carga revisada: 6.230 linhas; 860 identidades já existentes no Master de onze colunas; 162 produtos/324 valores comerciais; 698 pares NULL sem preenchimento proposto; 29 códigos; fotografia inicial integralmente NULL; zero conflitos, inferências, inserções, remoções, limpezas ou operações de outros atributos/catálogos. Qualquer divergência bloqueia. Outro estado inicial, limpeza futura ou universo exige nova revisão deste contrato. A regra geral de vazio comercial continua NULL, sem fallback operacional ou preenchimento artificial.

## Transação e isolamento

1. Revalidar completamente a entrada antes da transação. Sem confirmação exata, nem BEGIN é enviado.
2. Uma transação READ COMMITTED, locks NOWAIT: EXCLUSIVE no Master e SHARE nas demais tabelas públicas existentes. Leituras comuns podem continuar; escritas concorrentes conflitam. Contenção aborta, sem retry. Esses locks mantêm estáveis as leituras seguintes e provas, sem mudar dados.
3. Conferir catálogo e dependências do Master. Triggers ativos de usuário, regras, herança/particionamento, CHECK/exclusion, RLS ativa para a conexão ou FKs nos campos comerciais bloqueiam. RLS habilitada é preservada e aceita quando a conexão administrativa **já** tem bypass/ownership aplicável; nenhuma política, role ou configuração é alterada para obter acesso. Nada é desabilitado ou corrigido automaticamente.
4. Reler Master completo e catálogos de origem/família sob locks. Exigir igualdade integral com a fotografia, inclusive timestamps, proveniência, nove atributos anteriores, schema e identidade/universo. Produto ausente/extra bloqueia. Capturar counts/SHA-256 de todas as outras tabelas públicas, inclusive todos os logs.
5. Executar **um único UPDATE parametrizado** nas 162 identidades revisadas. SET fixo contém exclusivamente `agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao`. Sem INSERT/DELETE/upsert, timestamps/lote/log, DDL ou SQL fornecido pelo manifesto.
6. Conferir identidades retornadas, imagem integral dos 860 registros, 698 pares NULL e counts/hashes integrais das outras tabelas. Somente a imagem esperada com os 324 valores comerciais aplicados permite COMMIT.
7. Falha anterior ao COMMIT provoca ROLLBACK integral. ROLLBACK não confirmado ou resposta perdida do COMMIT é resultado desconhecido: encerrar conexão, conferir fotografia/manifesto e banco, sem repetir automaticamente. Nenhum log é gravado para registrar erro.

As provas das outras tabelas comparam antes/depois **da execução futura**; não exigem congelar Custos/OP desde a Fase A. Master e catálogos utilizados no manifesto precisam continuar idênticos à fotografia. Provas locais não confirmam o estado remoto atual. A auditoria desta carga é externa ao banco: preservar fotografia e manifesto imutáveis, hash confirmado e resultado retornado. Não existe lote/log desta operação. `criado_em`, `atualizado_em` e ambos os IDs de importação ficam intactos. Nos fatos, `data_referencia` continua competência e `criado_em` importação, sem escrita ou mudança de interpretação.

Referências: [locks PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html) e [SET/RETURNING do UPDATE](https://www.postgresql.org/docs/current/sql-update.html).

## Contrato de saída

- Validação: plano local com `resumo`, `contexto`, `produtos`, `hashManifesto` e `fotografiaSha256`. **Não prova carga realizada.**
- Execução: somente após confirmar COMMIT, objeto `CARGA_COMERCIAL_ISOLADA_V1`, `status=COMMIT_CONFIRMADO`, hashes do manifesto/fotografia e Master antes/depois, contagens revisadas, dois `campos_escritos`, `outras_colunas_preservadas=true`, `inseridos=0`, `removidos=0`, provas antes/depois de todas as demais tabelas públicas.
- Falha: rejeita a Promise, sem resultado de sucesso ou retry. COMMIT desconhecido exige investigação externa, pois não existe lote/log.

## Validação local sem conexão

Comando somente de leitura: não importa `pg`, não lê env administrativa e recusa `--executar`:

```powershell
node scripts/validar-carga-comercial.mjs --manifesto "manifesto-comercial.json" --hash "SHA256_CANONICO_CONFERIDO" --fotografia "fotografia-master-antes.json" --arquivo "cadastro mestre 8_10.xls"
```

O executor não foi ligado à UI, CLI de reconstrução ou job automático. Invocador real, conexão dedicada e autorização devem ser conferidos na etapa futura, sem usar reconstrução como alternativa. [Provas locais e testes](../auditoria/cadastro-mestre-comercial-executor-isolado.md).
