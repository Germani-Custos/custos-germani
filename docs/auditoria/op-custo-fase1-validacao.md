# OP × CUSTO — validação da Fase 1

**OP-CUSTO-F1 · 23/10/2026 · base `16fc9f8` · implementação local sem UI/publicação.**

Escopo autorizado: engine puro de relação, contexto API somente leitura e dois arquivos de testes. [Contrato aprovado e complementos da Fase 1](../arquitetura/op-custo.md#16-fase-1--núcleo-local-implementado). Nenhum acesso ao Supabase real foi necessário; os cenários novos usam cliente simulado e dados sintéticos. Resultados abaixo são execuções reais das ferramentas locais, não prova de comportamento autenticado em produção.

## 1. Implementação e arquivos

- Novo `core/op-custo-engine.js`: `analyzeOpCustoContext`, limites mensais civis e inspeção de fontes/IDs; somente importa o normalizador canônico. Sem DOM, runtime config, API, Supabase, fetch, views, relógio ou persistência.
- `src/services/api.js`: `getOpCustoContext`, leituras mensais completas e adaptação das saídas atuais. Não calcula a classificação relacional; não modifica os métodos existentes.
- Novo `tests/op-custo-engine.test.js`: 48 testes.
- Novo `tests/api-op-custo-context.test.js`: 31 testes.

Documentos atualizados: `AGENTS.md`, `README.md`, `ROADMAP.md`, `docs/arquitetura/op-custo.md`, `docs/arquitetura/matriz-contratos-operacionais.md`, `docs/arquitetura/indice-documentacao-kustos.md`, `docs/manuais/manual-tecnico.md`, `docs/auditoria/backlog-priorizado.md` e este novo relatório. Não alterar manuais de usuário/operação para inventar procedimento de UI inexistente. VISION/regras gerais preservados; lista ativa permanece em 25 correções, sem itens encerrados por OP × CUSTO.

## 2. Contrato disponível

Engine: `analyzeOpCustoContext({ contexto, analisesOp, analisesCusto, produtoSolicitado? })`. `contexto` contém uma competência `AAAA-MM`, fatos OP/Custo e estados/contagens de fontes completas. As análises OP correspondem aos fatos pelo ID, conservando o `InvestigationResult` e posição da fila original. As análises Custo trazem resultado original por código, flag canônica e prioridade original quando fornecida pelo futuro orquestrador.

Saída: versão/competência/proveniência, cobertura completa A/B/C, produtos com chave produto+competência, eventos/snapshots/resultados originais, contagens descritivas, distribuição dos motivos/decisões OP, presença de sinais, maior prioridade OP observada, prioridades separadas, referência/base de custo, relação e evidências/limitações. D somente para código explicitamente solicitado. Fontes incompletas impedem cobertura/conclusão; adaptações inválidas ou IDs repetidos falham explicitamente. Não há seleção automática de inclusão B/C: essa escolha pertence à futura UI.

API: `getOpCustoContext({ competencia, periodo?, produto? })` retorna `{ data, error }`. Limites opcionais devem coincidir com o mês inteiro; produto é metadado de busca, sem filtro do universo mensal. `data` inclui fatos, fontes, proveniência local não transacional, análises adaptadas, cobertura e qualidade/diagnósticos. Falha devolve `data:null` sem dados parciais. Páginas de 500/count exact, filtros reaplicados por página, ordem total com ID, detecção de erro/count/página curta/IDs inválidos ou repetidos. Dimensões lidas em blocos, catálogos compartilhados, sem consulta por produto.

OP conserva ID/OP/estágio/origem/unidade/lote/datas e todos os valores, sem somas ou médias. Consolidação `nao_disponivel`, valores `null`; possíveis reimports são avisos, nunca deduplicação. Custo conserva a série disponível, seleciona referência dentro da competência por instante de importação com precisão de microssegundos e marca empate real ambíguo. Base zero permite delta monetário, não percentual; ausência não vira zero. Códigos inválidos ficam em diagnóstico, sem chave vazia compartilhada.

`relacao.codigo` mantém os códigos do contrato. `relacao.tipo` expõe os aliases literais do pedido da Fase 1; ambos têm a mesma semântica, documentada na seção 16. Não há score ou prioridade conjunta nem conclusão causal. Comparação e flag de relevância continuam sendo do motor de Custos; a integração apenas valida se correspondem às bases usadas.

## 3. Cenários e resultados medidos

| Grupo | Casos executados | Resultado |
|---|---|---|
| Pureza/identidade | Import em processo Node sem ambiente/DOM; entradas congeladas; IDs/estágios/reimports; normalização/zeros/descrições/colisões | 48 testes de engine passaram |
| Tempo/qualidade | Datas diferentes no mês, importação em outro mês, fato fora do mês, limites bissextos, A/B/C/D, fonte vazia/indisponível, custo zero/ausente/base zero | Sem competência por importação, falso zero ou consolidação |
| Custos/relação | Snapshots múltiplos/único, empate conflitante/equivalente/na base, microssegundos distintos, mesmo instante em fusos distintos, todas as células/fallbacks, saída original incompatível | Referência rastreável, empate explícito, relação inconclusiva quando necessário |
| Volume API | 0, 1, 499, 500, 501, 1.000, 1.001 e 1.201 registros **em cada fonte** | Totais integrais, páginas 500, IDs ordenados e únicos, cobertura antes da apresentação |
| Falhas API | Erro/rejeição, count ausente/divergente, página curta, ID repetido/ausente nas duas fontes, enriquecimento indisponível | Nenhum contexto parcial aceito; erro seguro com código/fonte |
| Limites API | Produto opcional sem estreitar universo, registros inválidos preservados em diagnóstico, classificação operacional OP/ERP Custo, ausência de N+1 e writes | 31 testes de API passaram |
| Regressão | Suíte integral, inclusive OP/Custo/contrato/API/UI/TOP-200 e fixtures locais de outros módulos | **745/745 testes, 45 arquivos**, duração da execução final 31,29 s |

Foram adicionados **79 testes** (48 + 31). Nenhum teste existente foi alterado. A suíte integral anterior desta sessão passou com 740 testes; depois da revisão de precisão de timestamp e cenários adicionais, a execução final passou com os 745 acima. Não extrapolar esses volumes sintéticos para afirmar contagens remotas atuais.

## 4. Comandos e checks

Ferramentas locais executadas diretamente pelo Node disponível, sem instalar/atualizar dependências ou depender de npm global:

```powershell
node node_modules/vitest/vitest.mjs run tests/op-custo-engine.test.js tests/api-op-custo-context.test.js --maxWorkers=2
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit -p jsconfig.json
node scripts/build-web.mjs
git diff --check
```

- Testes novos e suíte integral: aprovados, contagens acima.
- Lint: aprovado, zero erros/warnings na execução final.
- Typecheck: aprovado, sem emissão.
- Build: aprovado com URL/chave públicas **de teste** fornecidas somente ao processo (`https://example.supabase.co`, `test-anon-key`). Gera `dist` local por allowlist, sem deploy ou chamada ao Supabase; não é artefato configurado para produção.
- Diff/links/escopo: conferidos ao encerrar; somente os quatro arquivos de implementação/teste e os nove documentos enumerados. Nenhuma UI, engine legado, parser, schema, migration, RLS/Auth ou fixture existente alterada.

Os testes existentes de outros módulos usam fixtures/bancos locais descartáveis; sua execução não é carga remota nem autorização para operação administrativa real. Nenhum segredo ou chave administrativa foi necessário para esta fase.

## 5. Divergências e decisões

Não foi necessária decisão humana nova nem mudança de regra de negócio. Os complementos explícitos do pedido desta fase foram registrados sem substituir o contrato aprovado:

1. Nomes de taxonomia da Fase 1 diferem dos identificadores textuais do documento; `codigo` canônico foi preservado e `tipo` é alias explícito, sem duas classificações.
2. API agora inclui análises adaptadas e produto/limites opcionais, como solicitado; produto não reduz cobertura e limites não podem estreitar o mês.
3. Ranking/prioridade de Custo reside na view existente, que não pode ser importada por este núcleo. API entrega prioridade `null`/`aguarda_presenter_existente`; engine preserva uma prioridade original quando o futuro orquestrador a fornecer. Nenhuma prioridade substituta foi criada.

Os limites já conhecidos continuam: reimportação de custo pode sobrescrever registro produto/data, `criado_em` não comprova toda revisão, possíveis reimports OP não têm deduplicação empresarial aprovada, unidades/aditividade não sustentam consolidação numérica e a leitura paginada não é transação entre fontes. LOG-02/03/04/06 permanecem abertos. Não foi feito saneamento, refatoração dos motores ou validação autenticada em produção.

Decisões humanas futuras, fora desta fase: prova ERP antes de consolidar números; eventual contrato de saneamento/proveniência; ampliação de matriz, prioridade conjunta ou multi-competência; autorização de UI/publicação. Não são bloqueios para o núcleo conservador implementado.

**Fase 1 encerrada. UI não implementada:** nenhum botão, tela, modal, tabela visual, controller novo, alteração de `index.html` ou CSS. Nenhum acesso/escrita no Supabase real, alteração de dados remotos, schema, migration, RLS/Auth, carga, commit, push ou deploy. Não iniciar a Fase 2 automaticamente.
