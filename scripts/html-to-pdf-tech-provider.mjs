import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(process.cwd());
const htmlPath = path.join(root, "docs", "entregables", "informe-tech-provider-meta.html");
const pdfPath = path.join(root, "docs", "entregables", "Informe-Tech-Provider-Meta-LinkStation.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "14mm", bottom: "16mm", left: "0mm", right: "0mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="width:100%; font-size:8pt; color:#999; padding:0 14mm; font-family:Segoe UI, sans-serif; display:flex; justify-content:space-between;">' +
    '<span>linkstation · Tech Provider Meta</span>' +
    '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>' +
    "</div>",
});

await browser.close();
console.log("PDF generado:", pdfPath);
