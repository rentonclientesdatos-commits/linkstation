// Convierte los .md de auditoría/decisiones/spec/seguridad a HTML "bonitos"
// y los deposita en docs/audit2/anexos/ con la misma estética que index.html.
//
// Estrategia robusta (marked v16):
//   1) walkTokens reescribe el href de cada token <link> antes del render
//   2) marked.parse() devuelve HTML estándar
//   3) post-proceso con regex inyecta:
//        - id="slug" en cada <h2>/<h3>/<h4>
//        - target="_blank" + rel="noopener" en TODOS los <a> que apunten fuera del propio HTML
//        - wrap <table> en <div class="table-wrap">
//   4) construimos el TOC a partir de los headings detectados
//
// Uso:
//   node docs/audit2/scripts/build-anexos.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const docsDir = path.resolve(projectRoot, "docs");
const audit2Dir = path.resolve(docsDir, "audit2");
const anexosDir = path.resolve(audit2Dir, "anexos");
const assetsDir = path.resolve(audit2Dir, "assets");

const documents = [
  {
    src: path.join(docsDir, "audit/findings-summary.md"),
    slug: "findings-summary",
    title: "Findings Summary — Auditoría V1",
    subtitle:
      "Resumen consolidado de 65 findings quick scan (18-may-2026)",
  },
  {
    src: path.join(docsDir, "audit/deep/DEEP-FINDINGS-SUMMARY.md"),
    slug: "deep-findings-summary",
    title: "Deep Findings Summary — Deep Audit V1",
    subtitle: "67 findings de las 5 fases de deep audit (DA-1..DA-5)",
  },
  {
    src: path.join(docsDir, "audit/deep/EXECUTIVE-SUMMARY-FOR-CLIENT.md"),
    slug: "executive-summary-for-client",
    title: "Executive Summary for Client — Deep Audit V1",
    subtitle: "Informe ejecutivo en español para la clienta",
  },
  {
    src: path.join(docsDir, "audit/STACK-TECNOLOGICO.md"),
    slug: "stack-tecnologico",
    title: "Stack Tecnológico — Decisiones confirmadas",
    subtitle: "Tecnologías aprobadas y descartadas para el MVP",
  },
  {
    src: path.join(docsDir, "audit/DECISIONES-AUDITOR-JAVIER-HP.md"),
    slug: "decisiones-auditor",
    title: "Decisiones del Auditor — Javier HP",
    subtitle: "Decision log de la auditoría (R-001 a R-025)",
  },
  {
    src: path.join(docsDir, "security/hardening-policy.md"),
    slug: "hardening-policy",
    title: "Hardening Policy — Política de seguridad",
    subtitle: "Medidas obligatorias de seguridad para producción",
  },
  {
    src: path.join(docsDir, "audit/gap-analysis-spec-vs-code.md"),
    slug: "gap-analysis-spec-vs-code",
    title: "Gap Analysis — Spec vs Código",
    subtitle: "Brechas entre lo prometido a la clienta y lo implementado",
  },
  {
    src: path.join(docsDir, "audit/STACK-DECISION-DRIZZLE-MIGRATION.md"),
    slug: "stack-decision-drizzle-migration",
    title: "Stack Decision — Drizzle Migration",
    subtitle:
      "Análisis y decisión: rechazar Drizzle/Prisma, mantener @supabase/ssr + Zod + Repository",
  },
  {
    src: path.join(docsDir, "audit/PREGUNTAS-PARA-LA-CLIENTE.md"),
    slug: "preguntas-para-la-cliente",
    title: "Preguntas para la cliente — Sesión de validación",
    subtitle:
      "Cuestionario formal del auditor para cerrar requisitos ambiguos",
  },
  {
    src: path.join(docsDir, "audit/RESPUESTAS-CLIENTA-JAVIER-HP.md"),
    slug: "respuestas-cliente",
    title: "Respuestas de la clienta — Sesión Javier HP",
    subtitle: "Respuestas formales a las preguntas del auditor",
  },
  {
    src: path.join(audit2Dir, "audit-v2.md"),
    slug: "audit-v2",
    title: "Auditoría V2 — Documento base (medio proyecto)",
    subtitle:
      "Análisis cuantitativo + cualitativo del estado del proyecto a 27-may-2026",
  },
];

const includedSlugBySrc = new Map();
for (const d of documents) {
  includedSlugBySrc.set(path.resolve(d.src), d.slug);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
  return s.replace(/"/g, "&quot;");
}

function relFromAnexo(absTargetPath) {
  return path.relative(anexosDir, absTargetPath).replace(/\\/g, "/");
}

// Extrae frontmatter YAML simple. Devuelve { meta, body }.
// Solo entiende pares "key: value" en el primer nivel (suficiente para nuestros docs).
function extractFrontmatter(md) {
  if (!md.startsWith("---\n") && !md.startsWith("---\r\n")) {
    return { meta: {}, body: md };
  }
  const end = md.indexOf("\n---", 4);
  if (end === -1) return { meta: {}, body: md };
  const fm = md.slice(4, end);
  const after = md.slice(end + 4).replace(/^\r?\n/, "");
  const meta = {};
  for (const rawLine of fm.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s+|\s+$/g, "");
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    // Quitar comillas envolventes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Lista YAML inline tipo [a, b, c] -> string
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return { meta, body: after };
}

// Renderiza tarjeta de metadatos a partir del frontmatter. Solo muestra claves útiles.
function renderMetaCard(meta) {
  const labels = {
    title: "Título",
    date: "Fecha",
    status: "Estado",
    phase: "Fase",
    agent: "Generado por",
    audit: "Auditoría",
    version: "Versión",
    versión: "Versión",
    owner: "Responsable",
    related: "Relacionados",
    supersedes: "Reemplaza a",
    "superseded-by": "Reemplazado por",
    severity: "Severidad",
  };
  const items = [];
  for (const [k, v] of Object.entries(meta)) {
    const lbl = labels[k.toLowerCase()];
    if (!lbl || !v) continue;
    items.push(
      `<div class="meta-item"><span class="meta-key">${escapeHtml(
        lbl
      )}</span><span class="meta-val">${escapeHtml(String(v))}</span></div>`
    );
  }
  if (items.length === 0) return "";
  return `<section class="meta-card">${items.join("")}</section>`;
}

// --- Reescritura de hrefs vía walkTokens ---
function buildWalker(sourceFileAbsPath) {
  const sourceDir = path.dirname(sourceFileAbsPath);
  return function walkTokens(token) {
    if (token.type !== "link") return;
    const href = token.href;
    if (!href) return;
    // Anchor interno
    if (href.startsWith("#")) return;
    // URL absoluta — la dejamos pero marcamos para target=_blank en post-proceso
    if (/^[a-z]+:/i.test(href)) {
      token.href = href;
      return;
    }
    // Path relativo
    let pure = href;
    let hash = "";
    const hashIdx = href.indexOf("#");
    if (hashIdx >= 0) {
      pure = href.slice(0, hashIdx);
      hash = href.slice(hashIdx);
    }
    let targetAbs;
    try {
      targetAbs = path.resolve(sourceDir, pure);
    } catch {
      targetAbs = null;
    }
    if (!targetAbs) return;

    if (pure.toLowerCase().endsWith(".md")) {
      const includedSlug = includedSlugBySrc.get(targetAbs);
      if (includedSlug) {
        token.href = `${includedSlug}.html${hash}`;
        return;
      }
      // .md NO incluido → enlace al .md original con path relativo desde anexos/
      if (!fs.existsSync(targetAbs)) {
        token.href = `__BROKEN__:${pure}`;
        return;
      }
      token.href = `${relFromAnexo(targetAbs)}${hash}`;
      return;
    }
    // Otro path relativo (imágenes, otros archivos)
    // Si el archivo destino NO existe, marcamos el enlace como muerto para que postProcess lo neutralice
    if (!fs.existsSync(targetAbs)) {
      token.href = `__BROKEN__:${pure}`;
      return;
    }
    token.href = `${relFromAnexo(targetAbs)}${hash}`;
  };
}

function buildImageWalker(sourceFileAbsPath) {
  const sourceDir = path.dirname(sourceFileAbsPath);
  return function walkImg(token) {
    if (token.type !== "image") return;
    const href = token.href;
    if (!href) return;
    if (href.startsWith("#") || /^[a-z]+:/i.test(href)) return;
    let pure = href;
    let hash = "";
    const hashIdx = href.indexOf("#");
    if (hashIdx >= 0) {
      pure = href.slice(0, hashIdx);
      hash = href.slice(hashIdx);
    }
    const targetAbs = path.resolve(sourceDir, pure);
    token.href = `${relFromAnexo(targetAbs)}${hash}`;
  };
}

// --- Slugify para IDs de headings ---
function makeSlugger() {
  const used = new Map();
  return function slugify(text) {
    let s = text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!s) s = "section";
    let base = s;
    let i = 2;
    while (used.has(s)) s = `${base}-${i++}`;
    used.set(s, true);
    return s;
  };
}

// Quita tags HTML para obtener texto plano (para el TOC)
function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// --- Post-proceso del HTML ---
function postProcess(rawHtml) {
  const slugify = makeSlugger();
  const toc = [];

  // 1) Inyectar id en <h2>, <h3>, <h4>
  let html = rawHtml.replace(/<h([234])>([\s\S]*?)<\/h\1>/g, (m, depth, inner) => {
    const plain = stripTags(inner);
    const id = slugify(plain);
    const d = parseInt(depth, 10);
    if (d === 2 || d === 3) toc.push({ depth: d, id, text: plain });
    return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="enlace">#</a> ${inner}</h${depth}>`;
  });

  // 2) target=_blank en todos los <a> excepto anchors internos (#...)
  html = html.replace(/<a\s+href="([^"]+)"([^>]*)>/g, (m, href, rest) => {
    if (href.startsWith("#")) return m;
    if (/target=/.test(rest)) return m; // ya tiene target
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${rest}>`;
  });

  // 3) Wrap <table> en <div class="table-wrap">
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>');
  html = html.replace(/<\/table>/g, "</table></div>");

  // 4) Neutralizar enlaces __BROKEN__ (destino que no existe en disco)
  html = html.replace(
    /<a href="__BROKEN__:([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
    (m, target, text) => {
      return `<span class="broken-link" title="Archivo no disponible: ${escapeHtml(
        target
      )}">${text} <span class="broken-tag">[no disponible]</span></span>`;
    }
  );

  // 5) Deshacer mailto: falsos creados por autolink de GFM cuando el "dominio" no es válido
  //    (típico: `next@16.1.6`, `axios@1.14.0` se interpretan como email).
  //    Si la parte derecha del @ no contiene un punto seguido de TLD alfabético, NO es email.
  html = html.replace(
    /<a href="mailto:([^"]+)"[^>]*>([^<]+)<\/a>/g,
    (m, addr, text) => {
      const at = addr.indexOf("@");
      if (at < 0) return m;
      const domain = addr.slice(at + 1);
      // Email válido: dominio con al menos un punto y TLD de letras (>=2 chars)
      if (/\.[a-zA-Z]{2,}$/.test(domain)) return m;
      return `<code>${escapeHtml(text)}</code>`;
    }
  );

  return { html, toc };
}

// --- HTML completo ---
function buildHtml(doc, mdRaw) {
  const { meta, body: mdBody } = extractFrontmatter(mdRaw);
  const walkLink = buildWalker(doc.src);
  const walkImg = buildImageWalker(doc.src);

  marked.setOptions({ gfm: true, breaks: false });
  marked.use({
    walkTokens: (token) => {
      walkLink(token);
      walkImg(token);
    },
  });

  const raw = marked.parse(mdBody);
  const { html: body, toc } = postProcess(raw);
  const metaCardHtml = renderMetaCard(meta);

  const sourceRel = relFromAnexo(doc.src);
  const indexHref = "../index.html";

  const tocHtml = toc
    .map((e) => {
      const cls = e.depth === 3 ? ' class="toc-sub"' : "";
      return `<li${cls}><a href="#${escapeAttr(e.id)}">${escapeHtml(
        e.text
      )}</a></li>`;
    })
    .join("\n      ");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(doc.title)} · Auditoría V2 · linkstation</title>
  <meta name="description" content="${escapeAttr(doc.subtitle)}">
  <link rel="stylesheet" href="../assets/anexo.css">
</head>
<body>
<header class="anexo-head">
  <div class="anexo-head-row">
    <div class="anexo-brand">
      <span class="anexo-brand-logo" aria-hidden="true">📚</span>
      <div>
        <div class="anexo-brand-title">Auditoría V2 · linkstation</div>
        <div class="anexo-brand-sub">AUTOMATIZA FORMACIÓN SL · Anexo documental</div>
      </div>
    </div>
    <div class="anexo-head-actions">
      <a class="btn btn-ghost" href="${indexHref}">← Volver al informe</a>
      <a class="btn btn-source" href="${escapeAttr(
        sourceRel
      )}" target="_blank" rel="noopener noreferrer">Ver fuente .md ↗</a>
    </div>
  </div>
  <div class="anexo-title-wrap">
    <h1>${escapeHtml(doc.title)}</h1>
    <p class="anexo-subtitle">${escapeHtml(doc.subtitle)}</p>
    <p class="anexo-source-cite">
      <b>📄 Fuente original:</b>
      <code>${escapeHtml(sourceRel)}</code>
      <a href="${escapeAttr(
        sourceRel
      )}" target="_blank" rel="noopener noreferrer" class="link-inline">[abrir .md en nueva ventana ↗]</a>
    </p>
  </div>
</header>

<main class="anexo-main">
${
  toc.length > 3
    ? `  <aside class="anexo-toc">
    <h2>Índice del documento</h2>
    <ol>
      ${tocHtml}
    </ol>
  </aside>`
    : ""
}
  <article class="anexo-body markdown-body">
${metaCardHtml}
${body}
  </article>
</main>

<footer class="anexo-foot">
  <div>📚 Anexo de la Auditoría V2 · linkstation · AUTOMATIZA FORMACIÓN SL</div>
  <div>
    <a href="${indexHref}">← Volver al informe principal</a> ·
    <a href="${escapeAttr(
      sourceRel
    )}" target="_blank" rel="noopener noreferrer">Fuente .md original ↗</a>
  </div>
</footer>
</body>
</html>
`;
}

const css = `:root{
  --brand:#1e63d2;
  --brand-dark:#143f87;
  --ink:#1c2433;
  --ink-soft:#5b6477;
  --line:#dfe3ef;
  --bg:#f5f6fb;
  --panel:#ffffff;
  --ok:#2c8a4a;
  --warn:#c98415;
  --bad:#c0392b;
  --info:#1e63d2;
  --code-bg:#f3f5fc;
  --code-ink:#143f87;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:15.5px;line-height:1.6}
a{color:var(--brand);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;background:var(--code-bg);color:var(--code-ink);padding:1px 6px;border-radius:4px;font-size:.88em}
pre{background:#0f1729;color:#e6ebf5;padding:14px 16px;border-radius:10px;overflow-x:auto;font-size:.86rem;line-height:1.5;margin:14px 0}
pre code{background:transparent;color:inherit;padding:0;border-radius:0;font-size:inherit}
blockquote{margin:16px 0;padding:10px 16px;background:#eef3fc;border-left:4px solid var(--brand);border-radius:6px;color:var(--ink)}
blockquote p:first-child{margin-top:0}
blockquote p:last-child{margin-bottom:0}
hr{border:none;border-top:1px solid var(--line);margin:24px 0}

/* Header */
.anexo-head{background:linear-gradient(135deg,#143f87 0%,#1e63d2 100%);color:#fff;padding:18px 32px 28px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
.anexo-head a{color:#fff}
.anexo-head-row{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;max-width:1180px;margin:0 auto}
.anexo-brand{display:flex;align-items:center;gap:14px}
.anexo-brand-logo{font-size:2rem;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.16);width:48px;height:48px;border-radius:10px}
.anexo-brand-title{font-weight:700;font-size:1.05rem}
.anexo-brand-sub{font-size:.78rem;opacity:.85;letter-spacing:.04em;text-transform:uppercase}
.anexo-head-actions{display:flex;gap:8px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:.85rem;font-weight:500;transition:all .15s;border:1px solid transparent;text-decoration:none}
.btn:hover{text-decoration:none}
.btn-ghost{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.25)}
.btn-ghost:hover{background:rgba(255,255,255,.22)}
.btn-source{background:#fff;color:var(--brand-dark)}
.btn-source:hover{background:#eef3fc}
.anexo-title-wrap{max-width:1180px;margin:18px auto 0}
.anexo-title-wrap h1{margin:0;font-size:1.8rem;font-weight:700;line-height:1.2}
.anexo-subtitle{margin:6px 0 12px;font-size:1rem;opacity:.92}
.anexo-source-cite{margin:14px 0 0;font-size:.85rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:10px 14px;display:inline-block;color:#fff}
.anexo-source-cite code{background:rgba(255,255,255,.18);color:#fff}
.anexo-source-cite .link-inline{margin-left:8px;text-decoration:underline}

/* Main + TOC */
.anexo-main{max-width:1180px;margin:24px auto 40px;padding:0 32px;display:grid;grid-template-columns:260px 1fr;gap:32px;align-items:start}
.anexo-main:has(article.anexo-body:only-child){grid-template-columns:1fr}
@media (max-width:900px){.anexo-main{grid-template-columns:1fr;padding:0 18px}}
.anexo-toc{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;position:sticky;top:18px;max-height:calc(100vh - 36px);overflow-y:auto}
.anexo-toc h2{margin:0 0 10px;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);font-weight:700;border:none;padding:0}
.anexo-toc ol{margin:0;padding-left:18px;font-size:.85rem;line-height:1.55}
.anexo-toc li{margin-bottom:4px}
.anexo-toc li.toc-sub{list-style:none;margin-left:-8px;font-size:.8rem;color:var(--ink-soft)}
.anexo-toc li.toc-sub a{color:var(--ink-soft)}
.anexo-toc a{color:var(--brand-dark)}

/* Meta card */
.meta-card{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px 14px;background:#eef3fc;border:1px solid #cdd9ee;border-radius:10px;padding:14px 16px;margin:0 0 22px;font-size:.85rem}
.meta-item{display:flex;flex-direction:column;gap:2px;min-width:0}
.meta-key{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);font-weight:600}
.meta-val{color:var(--ink);font-weight:500;word-break:break-word}

/* Body */
.anexo-body{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px 32px;min-width:0}
.markdown-body > h1:first-child{margin:0 0 16px;font-size:1.5rem;color:var(--brand-dark);border-bottom:2px solid var(--brand);padding-bottom:8px}
.markdown-body h1{margin:24px 0 12px;font-size:1.4rem;color:var(--brand-dark)}
.markdown-body h2{margin:28px 0 12px;font-size:1.3rem;color:var(--brand-dark);border-bottom:2px solid var(--brand);padding-bottom:6px;font-weight:700}
.markdown-body h3{margin:22px 0 10px;font-size:1.1rem;color:var(--ink);font-weight:600}
.markdown-body h4{margin:18px 0 8px;font-size:.98rem;color:var(--ink);font-weight:600}
.markdown-body h5{margin:14px 0 6px;font-size:.9rem;color:var(--ink-soft);font-weight:600}
.markdown-body h6{margin:12px 0 6px;font-size:.85rem;color:var(--ink-soft);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.markdown-body h2 .anchor,.markdown-body h3 .anchor,.markdown-body h4 .anchor{color:var(--ink-soft);opacity:0;font-weight:400;font-size:.85em;margin-right:4px;text-decoration:none}
.markdown-body h2:hover .anchor,.markdown-body h3:hover .anchor,.markdown-body h4:hover .anchor{opacity:.7}
.markdown-body p{margin:10px 0}
.markdown-body ul,.markdown-body ol{margin:10px 0;padding-left:26px}
.markdown-body li{margin:4px 0}
.markdown-body li > p{margin:4px 0}
.markdown-body strong{color:var(--ink);font-weight:600}
.markdown-body em{color:var(--ink-soft)}
.markdown-body img{max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line);margin:12px 0}

/* Enlaces rotos */
.broken-link{color:var(--ink-soft);text-decoration:line-through dotted;cursor:help}
.broken-tag{display:inline-block;background:#f3d6cd;color:#a3331f;font-size:.7rem;padding:1px 6px;border-radius:4px;margin-left:4px;text-decoration:none;font-weight:600;vertical-align:middle}

/* Tablas */
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:10px;background:#fff}
.markdown-body table{width:100%;border-collapse:collapse;font-size:.88rem;background:#fff}
.markdown-body th,.markdown-body td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.markdown-body th{background:#eef3fc;color:var(--brand-dark);font-weight:600;border-bottom:2px solid var(--brand)}
.markdown-body tbody tr:nth-child(even){background:#fafbfe}
.markdown-body tbody tr:hover{background:#f3f6fc}

/* Detalles + callouts implícitos */
.markdown-body details{background:#fafbfe;border:1px solid var(--line);border-radius:8px;padding:8px 14px;margin:12px 0}
.markdown-body summary{cursor:pointer;font-weight:600;color:var(--brand-dark)}

/* Footer */
.anexo-foot{max-width:1180px;margin:0 auto;padding:20px 32px 36px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:.85rem;color:var(--ink-soft)}
.anexo-foot a{color:var(--brand)}

@media print{
  .anexo-head-actions,.anexo-toc,.anexo-foot{display:none}
  .anexo-main{grid-template-columns:1fr;padding:0}
  .anexo-body{border:none;padding:0}
  .anexo-head{background:#143f87 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

ensureDir(anexosDir);
ensureDir(assetsDir);
fs.writeFileSync(path.join(assetsDir, "anexo.css"), css, "utf8");
console.log("✔ CSS escrito: docs/audit2/assets/anexo.css");

let okCount = 0;
let errCount = 0;
for (const doc of documents) {
  if (!fs.existsSync(doc.src)) {
    console.error(`✗ FALTA: ${doc.src}`);
    errCount++;
    continue;
  }
  try {
    // Resetear marked entre archivos (importante porque .use() acumula)
    marked.setOptions(marked.getDefaults());

    const md = fs.readFileSync(doc.src, "utf8");
    const html = buildHtml(doc, md);
    const outPath = path.join(anexosDir, `${doc.slug}.html`);
    fs.writeFileSync(outPath, html, "utf8");
    console.log(`✔ ${doc.slug}.html  (${(md.length / 1024).toFixed(1)} KB md)`);
    okCount++;
  } catch (e) {
    console.error(`✗ ERROR ${doc.slug}: ${e.message}`);
    errCount++;
  }
}

console.log("");
console.log(`Resumen: ${okCount} OK · ${errCount} errores`);
