# OP × CUSTO — Fase 4C-2: motor de composição histórica

**Estado:** implementado e validado localmente em 09/11/2026. Não há UI histórica, consulta remota, escrita, importação, schema/migration, RLS/Auth, SQL/RPC, commit, push ou deploy.

## Entrega

`core/op-custo-historico-engine.js` exporta `analyzeOpCustoHistorico(contexto)`. Sua entrada é exclusivamente o `data` da leitura factual `api.getOpCustoHistorico`; exige produto normalizado e competências explícitas, únicas e cronológicas. O módulo importa apenas `normalizeCodigoProduto` e `analyzeOpInvestigation`, não toca API/Supabase/DOM, não modifica a entrada e é determinístico.

O resultado separa `competencias`, fatos OP/Custo, diagnósticos de leitura/composição, evidências, contagens descritivas e limitações. Cada evento OP conserva ID e fato ERP completos, acompanhado do resultado individual do motor OP; a única contagem é de eventos, e a consolidação numérica permanece indisponível. Cada competência conserva a série íntegra de snapshots, inclusive datas completas, zero, `null` e campos ausentes.

Cobertura A/B/C/D é factual por competência e somente existe quando ambas as fontes completas são confirmadas. Qualquer fonte/contexto incompleto retorna cobertura nula, sem converter erro em vazio, enquanto fatos já lidos continuam visíveis. D decorre apenas do produto explicitamente consultado na leitura factual completa.

O candidato de Custo é descritivo: maior `criado_em` válido dentro da competência. Ele não substitui a série, não afirma maior atualidade econômica e distingue selecionado, indisponível, empate equivalente e empate ambíguo. Não há comparação financeira entre competências.

## Validação local

`tests/op-custo-historico-engine.test.js` cobre carregamento puro, identidade por código sem associação por descrição, datas completas/virada de ano, A/B/C/D, estados e contagens por competência, fontes incompletas, eventos OP múltiplos e heterogêneos, sinais favoráveis/desfavoráveis coexistentes, preservação de snapshots/zero/nulo/ausência, candidato sem timestamp e empates, data inválida, imutabilidade, determinismo e ausência de comparação/recorrência/impacto/score histórico.

## Limites

As evidências são observações rastreáveis de disponibilidade, série, ambiguidade e sinais individuais; não provam causalidade, recorrência, estabilidade ou impacto. Não existem agregação de OP, prioridade histórica, exportação, interface, seleção de produto em UI, comparação monetária nem Fase 4C-3. RLS, comportamento sobre histórico remoto e limite de recursos em intervalos muito grandes não foram verificados, pois não houve consulta remota.
