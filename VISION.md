# Visão do Produto — Kustos Germani

## Identidade e missão

O Kustos Germani é um **motor de investigação operacional de custos** e uma camada analítica sobre evidências ERP/SAP. Sua missão é tornar a auditoria rápida, contextual e orientada por anomalias: o investigador deve encontrar o problema em segundos, entender por que merece atenção e decidir o próximo passo.

O produto não deve se tornar ERP genérico, CRUD administrativo complexo, dashboard decorativo, sistema burocrático ou réplica de Power BI/Metabase.

## Princípios

1. **Velocidade de investigação acima de tudo.** Toda mudança deve ajudar a encontrar problemas mais rápido; caso contrário, simplificar ou não implementar.
2. **Contexto antes de navegação.** Busca direta e contexto por linha reduzem cliques e interpretação manual. A fila deve apontar o que merece atenção.
3. **Explicar os eventos.** Mostrar quando o custo mudou, entre quais importações, de qual valor para qual valor e com quais evidências.
4. **Priorizar mudanças de comportamento.** Ruptura de estabilidade merece atenção especial; variação isolada não substitui a leitura do histórico.
5. **Decisão operacional explicável.** Na OP, produção, tempo, KG/Hora e paradas sustentam a decisão conjunta. Nenhum indicador isolado define criticidade. Fatos ERP e interpretação Kustos permanecem separados.
6. **Temporalidade explícita.** `data_referencia` é competência; `criado_em` é evento de importação. O mesmo recorte deve acompanhar fila, indicadores e drill-through.
7. **Robustez e confiança.** Importação de fatos tolera erros por linha e colunas extras; falhas operacionais precisam aparecer sem mascarar indisponibilidade como ausência de problemas. Leituras completas e contratos verificáveis sustentam a investigação.
8. **Identidade por código.** Descrição é rótulo. Classificação depende do dicionário/códigos/FKs; agrupamento ERP não implica classificação Kustos. Cadastro apoia a investigação e preserva os fatos históricos.
9. **Revisar antes de executar.** Consultar, aprovar e executar são ações distintas. Reconstrução administrativa exige aprovação integral, revalidação, snapshot, atomicidade e evidências auditáveis. A resiliência por linha da importação de fatos não autoriza reconstrução cadastral parcial.
10. **Exportar contexto para ação.** A exportação deve conservar a fila priorizada, os campos escolhidos e a rastreabilidade de competência e importação.

## Direção estratégica

Evoluir de investigação contextual para memória comportamental por produto: reincidência de alertas, trajetória de regime e comparação de períodos equivalentes. A inteligência operacional deve distinguir sazonalidade de ruptura, priorizar risco e sugerir próximos focos com explicação verificável.

Previsão de tendência e integração direta ERP/SAP são possibilidades de longo prazo. Eventual sugestão de classificação depende de código de negócio, revisão explícita e contrato aprovado; texto livre não se torna regra de categorização.

Segurança de acesso, configuração verificável e rede de qualidade são condições para sustentar essa evolução. A arquitetura deve permanecer proporcional ao problema e favorecer dados já carregados, motores puros e contratos claros entre camadas.

## Onde consultar cada assunto

Capacidades e estrutura atuais ficam no [README](README.md); fases, prioridades e propostas ficam no [ROADMAP](ROADMAP.md). Contratos obrigatórios estão em [AGENTS.md](AGENTS.md), o processo nas [Regras Gerais](docs/regras-gerais.md), e decisões e aprendizados na [História do Projeto](docs/HISTORIA_DO_PROJETO_KUSTOS.md). Esta visão não registra entregas ou commits.
