# Bootstrap histórico do Cadastro Mestre

## Escopo

`core/cadastro-mestre-bootstrap-engine.js` é um modelo puro de diagnóstico. Ele não consulta banco, não cria payload, não admite nem remove produtos. A identidade reaproveita exclusivamente `normalizeCodigoProduto()`.

Para cada identidade, o modelo mantém independentes: reconhecimento (fonte persistida Master/Operacional/Custos/OP/mapa), observações ERP, elegibilidade calculada por `avaliarElegibilidadeCadastroMestre()`, aprovação individual explícita, execução individual comprovada, fatos Custos/OP e conflitos. `execucoes_agregadas` é preservado como contexto, mas nunca se converte em execução individual.

## Admissão

O resultado sempre devolve `admissao_detalhado: PENDENTE_DE_CONTRATO`. A Etapa 5 não definiu a suficiência que permitiria admissão formal. Logo, Master atual, elegibilidade, observação ERP, decisão histórica ou execução são evidências diferentes e nenhuma delas admite o produto isoladamente.

`criarRelatorioBootstrapCadastroMestre()` agrega categorias sobrepostas sem somá-las como partição. É somente diagnóstico em memória; não gera allowlist nem artefato importável.

## Limites

As evidências históricas locais provam os lotes e suas contagens, porém não mapeiam operação individual para todos os 860 registros. Sete decisões `NOVO_PRODUTO` do lote 2 são individualmente localizáveis; presença atual no Master ou no resultado agregado não é substituto dessa prova. O mapeamento de Geral/Detalhado, a admissibilidade e qualquer bootstrap persistente permanecem etapas futuras.
