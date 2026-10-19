# CAD-COM-PROD-01 — migration comercial em produção

Aplicação autorizada em 19/10/2026 no projeto **Custos-Germani**, ID `umpebdovrazzrdndhigc`, região sa-east-1. Somente a migration foi aplicada; nenhum XLS foi carregado, nenhuma reconstrução/publicação executada e nenhum registro de negócio preenchido.

## Migration e estrutura

- Arquivo de origem: [`20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql`](../../sql/20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql), inalterado.
- Registro remoto: **20261019173633 / cadastro_mestre_agrupamento_comercial_erp**. O MCP atribui a versão remota; o arquivo local conserva seu timestamp original. Somente uma migration foi acrescentada ao histórico, que passou de 11 para 12 entradas.
- `dicionario_master_produtos.agrupamento_comercial_erp_cod` e `agrupamento_comercial_erp_descricao`: tipo TEXT, nullable, default ausente; posições 10 e 11. Comentários originais aplicados. Sem nova constraint, FK, índice ou backfill.
- Os 860 produtos têm **ambos os campos NULL**; zero preenchidos, zero valores inferidos. Agrupamento investigativo continua independente.

## Backup e comparação

Backup estrutural e dos 860 registros completos do Master salvo fora do repositório antes de aplicar, com fsync/releitura. SHA-256 do arquivo: `3092bd972c36df9ad86574bf1f610bc0799427f56b67e23b277bed086d27b0b7`. Inclui os nove campos anteriores, metadados das 12 tabelas públicas e fingerprints. Não contém credenciais. Backup bruto não é publicado/versionado.

Capturas SQL: antes `2026-10-19T17:35:13.040215+00:00` e depois `2026-10-19T17:36:57.051335+00:00`. SELECTs em transação READ ONLY; prova de dados repetida imediatamente antes da aplicação confirmou o estado do backup.

Contagens antes → depois:

- `dicionario_master_produtos`: **860 → 860**, SHA-256 idêntico.
- `dicionario_produtos`: **6113 → 6113**, SHA-256 idêntico.
- `historico_custos`: **1370 → 1370**, SHA-256 idêntico.
- `apontamentos_op`: **704 → 704**, SHA-256 idêntico.
- `mapa_produtos`: **292 → 292**, SHA-256 idêntico.
- `categorias_origem`: **50 → 50**, SHA-256 idêntico.
- `categorias_familia`: **103 → 103**, SHA-256 idêntico.
- `categorias_agrupamento`: **34 → 34**, SHA-256 idêntico.
- `familias_base`: **21 → 21**, SHA-256 idêntico.
- `log_importacao`: **25 → 25**, SHA-256 idêntico.
- `log_importacao_cadastro_mestre`: **3 → 3**, SHA-256 idêntico.
- `log_importacao_op`: **6 → 6**, SHA-256 idêntico.

As 12 provas SHA-256 cobrem o conjunto completo e ordenado de linhas JSONB. No Master, a comparação exclui somente as duas colunas adicionadas, verificadas separadamente como NULL. Além do hash, os **860 objetos completos dos nove campos anteriores** foram comparados integralmente e permaneceram iguais, inclusive códigos, classificações, proveniência, `criado_em` e `atualizado_em`. Nos fatos, `data_referencia` continua competência e `criado_em` importação, sem alteração de valores.

Colunas anteriores de todas as tabelas, constraints, índices, políticas, grants, RLS/owners, triggers e event triggers permaneceram idênticos. Nenhuma alteração em `dicionario_produtos`, Custos, OP, mapa, categorias ou logs da aplicação. O único registro novo de controle é o histórico da própria migration no schema administrativo do Supabase.

[Prova estruturada e SQL de fingerprint](cadastro-mestre-comercial-producao-etapa1.json). A confirmação `{success:true}` do apply_migration foi complementada por SELECTs de schema, NULLs, conteúdo, metadados e listagem de migrations; não se inferiu sucesso somente da resposta de aplicação.

## Limites e Git

Sem carga XLS, importação, reconstrução, inferência, publicação, push, commit ou execução de outras migrations. O SQL original, código, testes, configuração e redesign não foram editados. As alterações locais desta etapa se limitam à documentação do estado e às provas, sem commit. `main` continua em `55a35251309059d0bf72b6f2f29b902af704ba94`; o branch reconstruído não foi promovido ou modificado.

A etapa termina aqui. Publicação compatível V3, novo Preview/aprovação e eventual carga exigem nova autorização. A validação desta etapa foi a conferência SQL real; a suíte de 554 testes pertence à validação local anterior e não foi reexecutada, pois não houve alteração de código. Links documentais e git diff --check são conferidos no fechamento.
