// Valida TODOS los hrefs del informe Auditoría V2:
//   - index.html (raíz docs/audit2/)
//   - anexos/*.html (todos los anexos)
//
// Distingue:
//   - URLs externas (http/https): HEAD/GET con seguimiento de redirects → reporta no-2xx
//   - Anchors internos (#xxx): verifica que el id existe en el mismo HTML
//   - Paths relativos: verifica que el archivo destino existe en disco
//
// Salida: tabla de enlaces ROTOS por archivo, código y URL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audit2Dir = path.resolve(__dirname, "..");
const anexosDir = path.resolve(audit2Dir, "anexos");

// Recopilar todos los HTML a auditar
const htmlFiles = [
  path.resolve(audit2Dir, "index.html"),
  ...fs
    .readdirSync(anexosDir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.resolve(anexosDir, f)),
];

// Extraer hrefs e ids de cada HTML
function extractHrefsAndIds(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const hrefs = [];
  const hrefRe = /<a\s+[^>]*href="([^"]+)"[^>]*>/g;
  let m;
  while ((m = hrefRe.exec(html))) hrefs.push(m[1]);

  // También enlaces de <link rel="stylesheet" href=...>, <img src=...>, <script src=...>
  const assetHrefs = [];
  const linkRe = /<link\s+[^>]*href="([^"]+)"[^>]*>/g;
  while ((m = linkRe.exec(html))) assetHrefs.push(m[1]);
  const srcRe = /<(?:img|script)\s+[^>]*src="([^"]+)"[^>]*>/g;
  while ((m = srcRe.exec(html))) assetHrefs.push(m[1]);

  const idRe = /\sid="([^"]+)"/g;
  const ids = new Set();
  while ((m = idRe.exec(html))) ids.add(m[1]);

  return { hrefs, assetHrefs, ids, html };
}

// Caches
const idsByFile = new Map();
const broken = [];

for (const f of htmlFiles) {
  const { ids } = extractHrefsAndIds(f);
  idsByFile.set(f, ids);
}

// Dominios/URLs de repositorios privados conocidos → 404 público es esperado
const KNOWN_PRIVATE_PATTERNS = [
  /^https:\/\/github\.com\/LinkStation\//i,
];

function isKnownPrivate(url) {
  return KNOWN_PRIVATE_PATTERNS.some((re) => re.test(url));
}

// HEAD con fallback a GET (algunos servidores rechazan HEAD)
async function checkUrl(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, {
        method,
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (audit-link-checker)  AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);
      if (r.ok || r.status === 403 /*algunos bloquean bots*/) {
        return { ok: true, status: r.status, finalUrl: r.url };
      }
      if (method === "GET") {
        return { ok: false, status: r.status, finalUrl: r.url };
      }
      // si HEAD devuelve 4xx que no sea 403, probamos GET
      continue;
    } catch (e) {
      if (method === "GET") {
        return { ok: false, status: 0, error: e.message };
      }
    }
  }
  return { ok: false, status: 0, error: "all-methods-failed" };
}

// Procesar cada archivo
let externalQueue = []; // {file, url}
for (const f of htmlFiles) {
  const { hrefs, assetHrefs, ids } = extractHrefsAndIds(f);
  const all = [...hrefs, ...assetHrefs];
  for (const href of all) {
    // Anchor interno mismo archivo
    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (!id) continue;
      if (!ids.has(id)) {
        broken.push({
          file: path.relative(audit2Dir, f),
          href,
          reason: `anchor-not-found (#${id})`,
        });
      }
      continue;
    }
    // mailto / javascript / tel
    if (/^(mailto|tel|javascript):/i.test(href)) continue;
    // URL absoluta
    if (/^[a-z]+:\/\//i.test(href)) {
      externalQueue.push({ file: f, href });
      continue;
    }
    // Path relativo: separar hash
    let pure = href;
    let hash = "";
    const hashIdx = href.indexOf("#");
    if (hashIdx >= 0) {
      pure = href.slice(0, hashIdx);
      hash = href.slice(hashIdx + 1);
    }
    if (!pure) {
      // sólo hash (mismo archivo) — ya cubierto arriba
      continue;
    }
    const targetAbs = path.resolve(path.dirname(f), pure);
    if (!fs.existsSync(targetAbs)) {
      broken.push({
        file: path.relative(audit2Dir, f),
        href,
        reason: `file-not-found (${path.relative(audit2Dir, targetAbs)})`,
      });
      continue;
    }
    // Si el destino es .html y hay hash, comprobar que el id existe en el destino
    if (hash && targetAbs.endsWith(".html")) {
      let targetIds = idsByFile.get(targetAbs);
      if (!targetIds) {
        // archivo no escaneado todavía (no debería pasar porque escaneamos todos los .html dentro de audit2/, pero por si acaso)
        const { ids: tIds } = extractHrefsAndIds(targetAbs);
        targetIds = tIds;
        idsByFile.set(targetAbs, targetIds);
      }
      if (!targetIds.has(hash)) {
        broken.push({
          file: path.relative(audit2Dir, f),
          href,
          reason: `anchor-not-found-in-target (${path.relative(
            audit2Dir,
            targetAbs
          )}#${hash})`,
        });
      }
    }
  }
}

// Procesar externos en paralelo controlado (concurrency 8)
async function processExternal() {
  console.log(
    `\nValidando ${externalQueue.length} URLs externas (HEAD/GET, timeout 15s)...\n`
  );
  // Deduplicar por URL para no repetir fetch
  const uniqueUrls = new Map(); // url -> [files]
  for (const item of externalQueue) {
    const list = uniqueUrls.get(item.href) || [];
    list.push(item.file);
    uniqueUrls.set(item.href, list);
  }

  const urls = [...uniqueUrls.keys()];
  const concurrency = 8;
  let idx = 0;
  let done = 0;
  const results = new Map();

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      const r = await checkUrl(url);
      results.set(url, r);
      done++;
      const status = r.ok ? "OK " : "ROT";
      process.stdout.write(
        `\r  [${done}/${urls.length}] ${status} ${r.status} ${url.slice(
          0,
          80
        )}            `
      );
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  process.stdout.write("\n\n");

  let privateSkipped = 0;
  for (const [url, r] of results) {
    if (!r.ok) {
      if (isKnownPrivate(url)) {
        privateSkipped++;
        continue; // 404 esperado en repo privado, no es bug
      }
      for (const file of uniqueUrls.get(url)) {
        broken.push({
          file: path.relative(audit2Dir, file),
          href: url,
          reason: `http-${r.status || "err"}${
            r.error ? " (" + r.error + ")" : ""
          }`,
        });
      }
    }
  }
  if (privateSkipped > 0) {
    console.log(
      `ℹ ${privateSkipped} URL(s) ignoradas (repos privados conocidos, 404 esperado para anónimos).\n`
    );
  }
}

await processExternal();

// Reportar
console.log("");
console.log("=".repeat(80));
console.log(`RESULTADO — ${broken.length} enlaces rotos`);
console.log("=".repeat(80));

if (broken.length === 0) {
  console.log("✔ Todo OK");
} else {
  // Agrupar por archivo
  const byFile = new Map();
  for (const b of broken) {
    const list = byFile.get(b.file) || [];
    list.push(b);
    byFile.set(b.file, list);
  }
  for (const [file, items] of byFile) {
    console.log(`\n📄 ${file}  (${items.length})`);
    for (const it of items) {
      console.log(`   ✗ ${it.reason}`);
      console.log(`     → ${it.href}`);
    }
  }
}

console.log("");
process.exit(broken.length > 0 ? 1 : 0);
