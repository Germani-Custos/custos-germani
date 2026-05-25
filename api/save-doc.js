/**
 * Serverless Function (Vercel) — grava edições dos manuais via commit no GitHub (Contents API).
 *
 * Fluxo: a tela de Documentação (view/documentation-controller.js) faz POST aqui com
 * { caminho, conteudo, titulo }. Esta função lê o sha atual do arquivo e faz PUT (cria/atualiza),
 * gerando um commit na branch de produção. O redeploy da Vercel publica o .md atualizado.
 *
 * Env obrigatórias (Vercel → Project Settings → Environment Variables):
 *   GITHUB_TOKEN  — PAT fine-grained com Contents: Read and write SOMENTE neste repo (secreto).
 *   GITHUB_REPO   — "owner/repo", ex.: "Germani-Custos/custos-germani".
 *   GITHUB_BRANCH — branch publicada (default "main").
 *
 * Segurança: endpoint público (decisão de produto). Mitigações: allowlist de caminho,
 * limite de tamanho e o token vive apenas no servidor (nunca no frontend).
 */

const ALLOWED_PATHS = [
  /^docs\/manuais\/[a-z0-9-]+\.md$/,
  /^docs\/auditoria\/[A-Za-z0-9-]+\.md$/,
  /^docs\/regras-gerais\.md$/
];
const MAX_BYTES = 200 * 1024; // 200 KB

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) {
    res.status(500).json({ error: 'Servidor sem GITHUB_TOKEN/GITHUB_REPO configurados.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const caminho = String(body?.caminho || '').trim();
  const conteudo = typeof body?.conteudo === 'string' ? body.conteudo : null;
  const titulo = String(body?.titulo || caminho).slice(0, 120);

  if (!caminho || conteudo === null) {
    res.status(400).json({ error: 'Campos obrigatórios: caminho e conteudo.' });
    return;
  }
  if (!ALLOWED_PATHS.some(rx => rx.test(caminho))) {
    res.status(400).json({ error: `Caminho não permitido: ${caminho}` });
    return;
  }
  if (Buffer.byteLength(conteudo, 'utf8') > MAX_BYTES) {
    res.status(413).json({ error: 'Conteúdo excede o limite de 200 KB.' });
    return;
  }

  const apiBase = `https://api.github.com/repos/${repo}/contents/${caminho}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kustos-germani-doc-editor',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // 1. sha atual do arquivo (necessário para atualizar; ausente quando o arquivo ainda não existe).
    let sha;
    const getResponse = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders });
    if (getResponse.ok) {
      const current = await getResponse.json();
      sha = current?.sha;
    } else if (getResponse.status !== 404) {
      const detail = await getResponse.text();
      res.status(502).json({ error: `Falha ao ler arquivo atual (HTTP ${getResponse.status}).`, detail });
      return;
    }

    // 2. PUT cria/atualiza o arquivo, gerando um commit.
    const putResponse = await fetch(apiBase, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `docs: edição de ${titulo} via tela de documentação`,
        content: Buffer.from(conteudo, 'utf8').toString('base64'),
        branch,
        sha
      })
    });

    if (!putResponse.ok) {
      const detail = await putResponse.text();
      res.status(502).json({ error: `Falha ao gravar no GitHub (HTTP ${putResponse.status}).`, detail });
      return;
    }

    const result = await putResponse.json();
    res.status(200).json({ ok: true, commit: result?.commit?.sha || null, caminho });
  } catch (error) {
    res.status(500).json({ error: `Erro inesperado: ${error?.message || error}` });
  }
};
