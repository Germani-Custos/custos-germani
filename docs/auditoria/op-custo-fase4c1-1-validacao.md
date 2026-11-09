# OP × CUSTO — Fase 4C-1.1: fechamento das ressalvas técnicas

**Data e ambiente:** 09/11/2026, checkout local em `main`; somente mocks e validações locais. Não houve consulta ao Supabase, escrita, importação, SQL, RPC, migration, mudança de RLS/Auth, commit, push ou deploy.

## Escopo entregue

Foram acrescentados testes diretos a `getOpCustoHistorico` para falha na terceira página, fronteiras completas de competência (inclusive virada de ano), competência única e `data_referencia` inválida. O único ajuste de produção preserva no erro público a distinção técnica já gerada pelo helper: `IDENTIDADE_REPETIDA` não é mais reduzido a `IDENTIDADE_INVALIDA`. Estados, fatos, paginação, fontes e bloqueio de completude permanecem inalterados.

## Evidências locais

- Terceira página de OP: depois de duas páginas válidas, a terceira falha; OP fica `erro`, seus fatos não são apresentados como conjunto completo, o contexto fica `incompleto` e sem cobertura, enquanto Custos completa permanece disponível.
- Fronteiras: `data_referencia` inclui primeiro e último dia dos meses inicial/final e exclui os dias adjacentes; a seleção atravessa dezembro/janeiro sem usar `criado_em`.
- Competência única: os limites são `AAAA-MM-01` até o último dia do mesmo mês, sem incluir registros vizinhos embora tenham `criado_em` no mês.
- Data inválida: o fato é preservado com o valor original; recebe diagnóstico `data_invalida`, não cria chave vazia nem competência inventada e não usa `criado_em` como substituto.
- Identidade: produto de entrada inválido continua `PRODUTO_INVALIDO`; ID técnico ausente é `IDENTIDADE_INVALIDA`; ID técnico repetido é `IDENTIDADE_REPETIDA`; erro de fonte é `FONTE_INDISPONIVEL`.

## Limites remanescentes

Compatibilidade RLS e comportamento sobre histórico remoto real continuam **não verificados**, pois esta fase proibiu consultas remotas. Não há teto artificial de competências e não há truncamento de resultados; intervalos grandes podem ampliar custo/latência ou encontrar limites remotos, o que exige decisão futura de produto/arquitetura. A leitura entre fontes/páginas permanece não transacional. Não há motor histórico, UI, cobertura A/B/C/D, agregação, recorrência, score, causalidade ou início da Fase 4C-2.

## Encerramento

As ressalvas técnicas locais identificadas na auditoria foram cobertas por testes e documentação. A aprovação de qualquer etapa posterior continua humana e separada.
