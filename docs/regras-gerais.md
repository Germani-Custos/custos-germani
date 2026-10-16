# Regras Gerais — Kustos Germani

Processo de trabalho e governança documental válidos para pessoas e agentes. A apresentação do projeto está no [README](../README.md); a navegação completa está no [índice](arquitetura/indice-documentacao-kustos.md). A tela de Documentação já permite consultar/editar os documentos nela disponibilizados.

---

## 0. Regra de ouro do produto

> **Velocidade de investigação acima de tudo.** Toda mudança deve responder "isso ajuda a encontrar problemas mais rápido?". Se não ajudar, simplifique ou não faça. (Definido no `AGENTS.md`.)

E os **contratos inegociáveis** (do `AGENTS.md`):
- Separação **FATO × DIMENSÃO** (`historico_custos` × `dicionario_produtos`/`categorias_*`).
- Semântica temporal **`data_referencia` (competência) × `criado_em` (importação)** — nunca confundir; a UI sempre rotula qual está mostrando.
- Acesso a dados **só** por `supabase.from()` (sem RPC, sem SQL bruto no frontend); credenciais só por env.

---

## 1. Documentação: sempre consultar ANTES, sempre atualizar DEPOIS

Esta é a regra central pedida para este projeto:

1. **Antes de qualquer mudança**, leia a documentação relevante:
   - `AGENTS.md` (contratos), este arquivo, e os [manuais](./manuais/) (usuário/técnico/operação).
   - [`docs/auditoria/`](./auditoria/README.md) para saber se o que você vai tocar já tem fragilidade mapeada.
   - `docs/arquitetura/`, `docs/ux/`, `docs/regras-negocio/` conforme a área.
2. **Depois de qualquer mudança relevante**, atualize os documentos afetados **no mesmo PR/commit**, conforme sua responsabilidade (sem obrigar commit quando a tarefa o proibir):
   - `README.md`, `VISION.md`, `ROADMAP.md`, `AGENTS.md` quando aplicável.
   - Os **3 manuais** (`docs/manuais/`) sempre que o **comportamento visível ou operacional** mudar.
   - `docs/` específico da área tocada.
   - Registre uma entrada **datada** no log de atualizações do `AGENTS.md` (padrão `- Atualização AAAA-MM-DD (tema): ...`).
3. **Toda mudança de comportamento temporal, de filtro ou de modelo de dados** deve ser documentada explicitando a distinção `data_referencia` × `criado_em`.

> Documentação desatualizada é tratada como **defeito**. Se você encontrar divergência entre o que o código faz e o que a doc diz, corrija a doc (ou abra um item) — não a ignore.

---

## 2. Manuais: fonte única no repositório

- Os manuais vivem em **`docs/manuais/`** e são a **fonte única** de conhecimento operacional.
  - [`manual-usuario.md`](./manuais/manual-usuario.md) — quem usa a tela.
  - [`manual-tecnico.md`](./manuais/manual-tecnico.md) — quem desenvolve/evolui.
  - [`manual-operacao.md`](./manuais/manual-operacao.md) — quem mantém em produção.
- A **tela de Documentação editável** edita **esses mesmos arquivos** via commit no GitHub. Portanto:
  - Edições humanas (tela) e de agente (repo) convergem para o mesmo `.md`.
  - Sempre parta da **versão mais recente** antes de editar. A Function consulta o `sha` no momento do save; isso não comprova que a tela partiu da mesma versão nem elimina toda sobrescrita concorrente. Não ampliar essa garantia por documentação.

---

## 3. Backlog de auditoria

- O backlog priorizado está em [`docs/auditoria/backlog-priorizado.md`](./auditoria/backlog-priorizado.md).
- Ao resolver um item: **marque o checkbox**, use o ID no commit (ex.: `fix(SEC-01): ...`) e atualize a doc afetada.
- Respeite os itens ainda abertos e as dependências do backlog. A reavaliação de 02/07 explica a ordem histórica; MNT-01 e PERF-01 já foram concluídos. Não reiniciar essas entregas nem alterar prioridades sem evidência/justificativa arquitetural.

---

## 4. Mudanças e segurança

- **Nunca** introduza segredos no código (env/runtime apenas).
- **Sempre** escape entrada de usuário antes de `innerHTML` (lição do `SEC-01`). Reutilize `escapeHtml` (`view/ui-utils.js`).
- Mudanças de **schema** exigem backup prévio e registro em `docs/arquitetura/migracoes.md`.
- Mudanças que afetam terceiros (deploy, banco compartilhado, branch de produção) devem ser **confirmadas** antes — não são reversíveis localmente.
- Não introduzir bundler/framework no runtime sem decisão explícita: a arquitetura é estática por escolha (ver [`docs/auditoria/tooling-configuracao.md`](./auditoria/tooling-configuracao.md)).

---

## 5. Mapa rápido da documentação

| Preciso de… | Vá para |
|---|---|
| Usar a tela | [`docs/manuais/manual-usuario.md`](./manuais/manual-usuario.md) |
| Desenvolver/evoluir | [`docs/manuais/manual-tecnico.md`](./manuais/manual-tecnico.md) + `AGENTS.md` |
| Operar/manter produção | [`docs/manuais/manual-operacao.md`](./manuais/manual-operacao.md) |
| Saber o que corrigir | [`docs/auditoria/backlog-priorizado.md`](./auditoria/backlog-priorizado.md) |
| Arquitetura/banco | [`docs/arquitetura/indice-documentacao-kustos.md`](./arquitetura/indice-documentacao-kustos.md) |
| Regras de negócio | [`docs/regras-negocio/`](./regras-negocio/glossario.md) |
| Problemas conhecidos | [`docs/troubleshooting/playbook-operacional.md`](./troubleshooting/playbook-operacional.md) |
| Visão/direção | `VISION.md`, `ROADMAP.md` |

## 6. Responsabilidade e autoridade documental

- **README:** porta de entrada, estrutura/capacidades e estado do checkout; sem sequência de commits ou relatórios extensos de entrega.
- **VISION:** identidade, missão, princípios e direção; sem estado operacional datado.
- **ROADMAP:** iniciativas concluídas, continuidade, próxima onda e futuro; prioridades técnicas apontam para o backlog, sem um item por commit.
- **AGENTS:** contratos e regras obrigatórias. Preservar suas entradas existentes e consultar o escopo de cada fase.
- **Regras Gerais:** processo e governança; **manuais:** uso/desenvolvimento/operação atuais, sem narrativa de releases.
- **Arquitetura:** decisões e contratos detalhados; **auditoria:** diagnósticos, fragilidades, backlog e evidências datadas.
- **História:** [evolução, decisões e aprendizados](HISTORIA_DO_PROJETO_KUSTOS.md), sem copiar git log. Git segue fonte oficial de commits.

A documentação anterior não estabelecia uma hierarquia total entre todos os Markdown. Ela já define AGENTS como origem dos contratos obrigatórios, manuais como fonte operacional e sucessões explícitas por fase nos contratos especializados. Usar essas autoridades no seu escopo; resumo de README ou relato histórico não revoga contrato. Data mais recente, isoladamente, não basta para escolher um vencedor.

Em divergência, registrar as duas afirmações e as evidências. Corrigir descrição de implementação somente com leitura do código/contrato; estado remoto exige prova datada do ambiente. Sem evidência suficiente, manter a questão aberta na auditoria; não inventar estado, decisão ou autorização. Esta regra não cria nova precedência de runtime.

Antes de criar arquivo, procurar destino existente com a mesma função. Mover conhecimento fora de lugar, consolidar somente redundância comprovada e manter referências. Números de testes, contagens e deployments são evidências com data/escopo, nunca garantia atual automática. Reorganizações documentais validam links locais (incluindo âncoras), arquivos referenciados, coerência de estados, escopo do diff e `git diff --check`; não precisam executar testes de aplicação quando código não mudou.
