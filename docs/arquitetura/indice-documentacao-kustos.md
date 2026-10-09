# Kustos — Manual Técnico

Preparação do ambiente (2026-10-09): [CAD-ENV-01 — deploy/env/bucket, diagnóstico sem escrita e primeira execução](./cadastro-mestre-preparacao-ambiente.md). Preparação local validada; configuração remota e reconstrução continuam pendentes.

Contrato de execução vigente (2026-10-09): [CAD-EXEC-WEB-01 — execução explícita pela aplicação](./cadastro-mestre-execucao-web.md), com função Node autorizada que reutiliza o executor central; habilitação/deploy/carga real pendentes. Sucede a exclusividade administrativa por CLI, sem mudança de fatos, filtros ou schema.

Contrato vigente (2026-10-09): [Cadastro Mestre — reconstrução do universo ERP](./cadastro-mestre-reconstrucao.md), com Preview/aprovação local e execução administrativa atômica explícita. Substitui a preservação de produtos fora do conjunto somente no Master ERP. Histórico: [Preview determinístico, Fase 3.1](./cadastro-mestre-preview.md), [aprovação Fase 3.3](./cadastro-mestre-aprovacao.md) e [execução pontual Fase 3.4](./cadastro-mestre-execucao-fase3-4.md).

**Sistema:** kustos germani  
**Escopo:** estado atual implementado no repositório  
**Atualização:** 2026-05-08

## Índice

0. [Visão do produto (estratégica)](../../VISION.md)
1. [Visão geral](./visao-geral-kustos.md)
2. [Stack tecnológico](./stack-tecnologico.md)
3. [Arquitetura de dados](./banco-de-dados.md)
4. [Relacionamentos e cascata](../regras-negocio/relacionamentos-cascata.md)
5. [Frontend](../ux/frontend.md)
6. [Services frontend](./services-frontend.md)
7. [Importação e integração](../troubleshooting/guia-integracao.md)
8. [Deploy](./deploy.md)
9. [Boas práticas e padrões](../regras-negocio/padroes-codigo.md)
10. [Glossário](../regras-negocio/glossario.md)
11. [Playbook operacional](../troubleshooting/playbook-operacional.md)
12. [Reviews arquiteturais](./reviews/AR-002-mnt06-antes-de-mnt01.md)

> Os capítulos refletem o comportamento real do código atual. Itens de arquitetura futura são marcados explicitamente como evolução.
