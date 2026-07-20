# Manual do Usuário — Custos Germani

Guia de uso para quem **opera** o sistema no dia a dia (analistas, controladoria). Linguagem direta, sem jargão técnico. Para dúvidas de instalação/infra veja o [Manual Técnico](./manual-tecnico.md); para rotina e problemas veja o [Manual de Operação](./manual-operacao.md).

> **O que é o Kustos Germani?** Uma ferramenta para **investigar variações de custo** de produtos a partir das planilhas do ERP. O objetivo é simples: **achar o que mudou de preço, quanto e quando — em segundos.**

---

## 1. Visão geral da tela

A aplicação tem um **menu à esquerda** com duas áreas:

| Menu | Para quê |
|---|---|
| **Importação** | Carregar a planilha de custos do mês (competência). |
| **Auditoria** | Investigar variações, anomalias e histórico de cada produto. |

No alto à esquerda aparece o usuário (atualmente **"acesso público"**).

---

## 2. Dois "tempos" que você precisa entender

O sistema trabalha com **duas datas diferentes**. Não confunda — elas respondem a perguntas diferentes:

| Termo | O que significa | Pergunta que responde |
|---|---|---|
| **Competência** (`data_referencia`) | O mês a que o custo se refere no ERP. | "Esse custo vale para **qual mês**?" |
| **Importação** (`criado_em`) | Quando você subiu a planilha no sistema. | "**Quando** esse dado entrou aqui?" |

Exemplo: em 25/05 você importa a planilha de **março/2026**. A competência é março; a importação é 25/05. As telas sempre dizem qual das duas estão mostrando.

---

## 3. Importar uma planilha (passo a passo)

1. Clique em **Importação** no menu.
2. Em **"Data de Referência (Competência)"**, escolha o mês a que a planilha se refere. **Obrigatório** — sem isso a importação não começa.
3. **Arraste o arquivo `.xlsx`** para a área pontilhada, ou clique nela para escolher. (Só `.xlsx`.)
4. O sistema lê os cabeçalhos e tenta **reconhecer as colunas** sozinho. Ele precisa de **5 colunas obrigatórias**:
   - **Produto** (código)
   - **Descrição**
   - **Custo Variável**
   - **Custo Direto Fixo**
   - **Custo Total**
5. **Se ele não reconhecer alguma coluna**, aparece uma janela de **mapeamento**: para cada campo, escolha qual coluna da sua planilha corresponde. Confirme. (Os 5 campos precisam estar preenchidos.)
6. Aparece o **Preview**: uma amostra das primeiras linhas com um status:
   - 🟢 **válida** — será gravada.
   - 🟡 **atenção** — será gravada, mas confira (ex.: "produto não encontrado no cadastro", "valor negativo", "custo total zerado").
   - 🔴 **erro** — **não** será gravada (ex.: produto ou descrição em branco).
   > O preview mostra as primeiras 20 linhas, mas a importação grava **todas** as linhas sem erro do arquivo.
   > O código do produto é normalizado automaticamente no preview e na gravação: espaços, caracteres invisíveis e notação científica do Excel são tratados para evitar histórico quebrado. Se o código ficar ambíguo/inválido, a linha aparece como 🔴 erro e não é gravada.
7. Clique em **"Confirmar importação"**. Ao final, um resumo mostra **Total de linhas / Importadas / Falhas**.

### Banner de produtos sem categoria ("órfãos")
Se entrarem produtos novos **sem Origem/Família/Agrupamento**, aparece um aviso amarelo na Importação. Esses produtos existem, mas **não aparecem direito nos filtros** até serem categorizados. Avise quem cuida do cadastro (ver [Manual de Operação](./manual-operacao.md)). Se o aviso disser **“Não foi possível validar produtos sem agrupamento.”**, trate como diagnóstico indisponível: não significa que não existem órfãos, significa que o sistema não conseguiu validar a categoria.

> **Reimportar o mesmo mês é seguro:** o sistema atualiza o registro daquele produto/competência em vez de duplicar.

---

## 4. Investigar custos (tela de Auditoria)

Há **dois caminhos** para chegar a um produto. Use o que for mais rápido.

### Caminho A — Busca rápida (recomendado quando você já sabe o produto)
1. Clique em **Auditoria**.
2. No campo de busca no topo, digite o **código** ou a **descrição**. Sugestões aparecem enquanto você digita.
3. Escolha o produto. O sistema já abre a análise dele.

### Caminho B — Filtros em cascata (quando você está explorando)
1. Defina o **período**: campos **Início** e **Fim** (por competência).
2. Refine com os filtros, nesta ordem: **Origem → Família → Agrupamento → Item/Produto**. Cada filtro mostra só o que existe dentro do anterior.
3. O relatório **atualiza sozinho** assim que há período + filtro. Se precisar, clique em **"Analisar"**.

> Os filtros ativos aparecem como **etiquetas** logo abaixo. Clique no **x** de uma etiqueta para removê-la.

---

## 5. Lendo o relatório

### Os 4 indicadores (KPIs) no topo
São **clicáveis** — clicar filtra a tabela:

| Indicador | O que mostra |
|---|---|
| **Itens analisados** | Quantos produtos entraram no recorte. |
| **Alertas (>5%)** | Produtos com variação absoluta ≥ 5% entre as duas últimas importações (`criado_em`); o número do card é o mesmo conjunto do filtro rápido e da exportação. |
| **Mudanças de Regime** | Produtos que eram **estáveis** e ficaram **instáveis** — a anomalia mais importante. |
| **Média de variação** | Variação média do período (clicar mostra os de variação positiva). |

### A tabela (fila de investigação)
As linhas vêm **ordenadas por prioridade** (o mais crítico primeiro). Colunas:

- **Produto** — código e descrição.
- **Variação** — diferença em R$ e %, comparando as duas últimas importações e o período.
- **Prioridade** — 🔴 Crítico · 🟠 Atenção · 🟡 Monitorar · 🟢 Estável. Passe o mouse para ver o motivo.
- **Regime** — "⚡ Mudança de regime" ou a classificação de estabilidade (ESTÁVEL / OSCILANDO / MUITO INSTÁVEL).
- **Contexto Investigativo** — uma frase explicando o que chamou atenção naquele item.
- **Detalhes** — botão que expande custos (último, penúltimo, inicial, final, datas, score).

Você pode **ordenar** clicando no cabeçalho de uma coluna.

### Drill-through (histórico completo do produto)
**Clique em qualquer linha** para abrir o **histórico de importações** daquele produto: cada competência, quando foi importada, os custos (variável, fixo, total) e a **variação (Δ e Δ%)** em relação ao registro anterior. Variações ≥ 5% ficam destacadas.

### Gráficos
- **Comparação entre as 2 últimas importações** (barras): custo médio de cada uma e a variação.
- **Evolução temporal** (linha): custo ao longo das competências, com a **média histórica** tracejada e um selo de tendência (🔺 alta / 🔻 queda / 🟢 estável).

---

## 6. Exportar para Excel

Na Auditoria, clique em **"Exportar"** (rode a análise antes). Gera um `.xlsx` com **duas abas**:
- **Contexto** — período, filtros aplicados, ordenação e total de itens.
- **Fila Investigativa** — a lista priorizada com criticidade, regime, variações, contexto e custos.

O nome do arquivo já vem com o período analisado (ex.: `auditoria_criticos_2026-03-01_a_2026-03-31_20260525.xlsx`).

---

## 7. Tela de Documentação (consultar e editar)

No menu **Documentação** você consulta e edita os próprios manuais, sem sair do sistema:
1. Escolha o documento no seletor, agrupado em **Manuais**, **Regras** e **Auditoria técnica** (segurança, robustez, performance, backlog etc.).
2. O conteúdo aparece formatado.
3. Para alterar, clique em **Editar**: surge o texto em **Markdown** à esquerda e a **pré-visualização** à direita, atualizada enquanto você digita.
4. Clique em **Salvar** para gravar, ou **Cancelar** para descartar.

> Ao salvar, a alteração é registrada no repositório (um commit) e **publicada após o redeploy** (cerca de 30 a 60 segundos) — por isso a versão publicada não muda instantaneamente.
> **Atenção:** a edição é **aberta** (sem senha). Edite com cuidado, pois a mudança vale para todos.

## 8. Glossário rápido

- **Competência** — mês ao qual o custo pertence (`data_referencia`).
- **Importação** — quando a planilha entrou no sistema (`criado_em`).
- **Variação** — quanto o custo mudou (em R$ e %).
- **Mudança de regime** — produto estável que passou a oscilar; sinal de anomalia prioritária.
- **Instabilidade** — o quanto o custo de um produto "balança" ao longo do tempo (ESTÁVEL / OSCILANDO / MUITO INSTÁVEL).
- **Órfão** — produto sem categorização completa (Origem/Família/Agrupamento).

---

## 9. Problemas comuns

| Situação | O que fazer |
|---|---|
| "Selecione a data de referência" | Escolha a competência **antes** de subir o arquivo. |
| Colunas não reconhecidas | Use a janela de **mapeamento** para indicar a coluna de cada campo. |
| Linhas 🔴 não importaram | Produto ou descrição em branco — corrija na planilha e reimporte. |
| Produto não aparece nos filtros | Pode ser **órfão** (sem categoria) — ver banner e [Manual de Operação](./manual-operacao.md). |
| "Sem dados para os filtros" | Amplie o período ou afrouxe os filtros. |
| Tela de "Configuração do ambiente não encontrada" | É problema técnico de configuração — acione o responsável ([Manual de Operação](./manual-operacao.md)). |

> Esta documentação é viva. Se algo na tela não corresponder a este manual, **atualize o manual** (ou avise quem mantém) — ver [Regras Gerais](../regras-gerais.md).

## Atualização 2026-05-28 — mensagens de falha operacional

Quando ocorrer instabilidade de rede, Supabase indisponível ou falha em gráficos/exportação, a tela deve mostrar uma mensagem amigável e preservar os filtros e resultados já carregados sempre que possível. Se o relatório principal não puder ser consultado, corrija a conexão/ambiente e rode a análise novamente; os conceitos temporais exibidos continuam os mesmos: `data_referencia` é competência operacional e `criado_em` é evento de importação.


## Atualização 2026-07-20 — sem mudança de uso

A revisão dos PRs recentes apenas alinhou documentação ao estado do sistema. O uso da Auditoria permanece igual: filtros em cascata, KPIs clicáveis, chips removíveis, drill-through e exportação XLSX continuam com o mesmo comportamento visível.
