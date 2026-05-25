# Regras Gerais — Kustos Germani

Porta de entrada da documentação e **regras de trabalho** válidas para qualquer pessoa ou agente que mexa neste repositório. Vale tanto para intervenção via **agente de IA** quanto **humana** (inclusive pela futura tela de Documentação editável).

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
2. **Depois de qualquer mudança relevante**, atualize a documentação **no mesmo PR/commit**:
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
- A **tela de Documentação editável** (Fase 2) edita **esses mesmos arquivos** via commit no GitHub. Portanto:
  - Edições humanas (tela) e de agente (repo) convergem para o mesmo `.md`.
  - Sempre parta da **versão mais recente** do arquivo antes de editar (a tela/Function usa o `sha` atual para evitar sobrescrever).

---

## 3. Backlog de auditoria

- O backlog priorizado está em [`docs/auditoria/backlog-priorizado.md`](./auditoria/backlog-priorizado.md).
- Ao resolver um item: **marque o checkbox**, use o ID no commit (ex.: `fix(SEC-01): ...`) e atualize a doc afetada.
- Respeite a ordem das **ondas** (segurança/correção → ferramentas → performance → refatoração): ter lint/testes antes de refatorar reduz risco.

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
