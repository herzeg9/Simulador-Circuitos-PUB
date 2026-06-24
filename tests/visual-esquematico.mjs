/**
 * Regressão visual do esquemático — gera PNG e compara com snapshots.
 * Uso:
 *   npm run test:visual
 *   UPDATE_SNAPSHOTS=1 npm run test:visual   (atualizar baselines)
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { casosVisuais } from './casos-visuais.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const snapDir = path.join(__dirname, 'snapshots');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

global.document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({
        classList: { toggle() {}, add() {}, remove() {} },
        hidden: true,
        appendChild() {},
        addEventListener() {}
    }),
    body: { classList: { toggle() {}, add() {}, remove() {} }, appendChild() {} },
    addEventListener: () => {}
};
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.MathJax = null;

const require = createRequire(import.meta.url);
const {
    circuitoExemploParaTopologia,
    buildEsquematicoFromTopologia
} = require(path.join(root, 'script.js'));

const { PNG } = await import('pngjs');
const pixelmatchModule = await import('pixelmatch');
const pixelmatch = pixelmatchModule.default;

let puppeteer;
try {
    puppeteer = (await import('puppeteer')).default;
} catch {
    console.log('puppeteer não instalado — execute npm ci para regressão PNG');
    process.exit(0);
}

function buildPreviewHtml(svgInner) {
    const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
    return `<!DOCTYPE html>
<html lang="pt-BR" class="dark-mode">
<head>
<meta charset="UTF-8">
<style>${css}</style>
<style>
  body { margin: 0; padding: 20px; background: #1a1d24; }
  .esq-wrap { width: 920px; min-height: 320px; }
</style>
</head>
<body>
<div id="esquematicoWrap" class="esq-wrap">${svgInner}</div>
</body>
</html>`;
}

function startServer(html) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            if (req.url === '/' || req.url === '/index.html') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, port });
        });
    });
}

async function screenshotCase(browser, html, outPath) {
    const { server, port } = await startServer(html);
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 980, height: 520, deviceScaleFactor: 1 });
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
        const el = await page.$('#esquematicoWrap');
        if (!el) throw new Error('esquematicoWrap não encontrado');
        await el.screenshot({ path: outPath });
        await page.close();
    } finally {
        server.close();
    }
}

function loadPng(filePath) {
    return PNG.sync.read(fs.readFileSync(filePath));
}

if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });

const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const failures = [];
let updated = 0;

for (const caso of casosVisuais) {
    const topologia = circuitoExemploParaTopologia(caso.circuito);
    const { html } = buildEsquematicoFromTopologia(topologia);
    const preview = buildPreviewHtml(html);
    const snapPath = path.join(snapDir, `${caso.id}.png`);
    const tmpPath = path.join(snapDir, `${caso.id}.tmp.png`);

    await screenshotCase(browser, preview, tmpPath);

    if (!fs.existsSync(snapPath)) {
        if (process.env.CI === 'true' && process.env.UPDATE_SNAPSHOTS !== '1') {
            console.log(`[skip] ${caso.id}: baseline PNG ausente (rode UPDATE_SNAPSHOTS=1 npm run test:visual)`);
            fs.unlinkSync(tmpPath);
            continue;
        }
        fs.renameSync(tmpPath, snapPath);
        updated++;
        console.log(`[snapshot] ${caso.id}.png ${UPDATE ? 'atualizado' : 'criado'}`);
        continue;
    }

    if (UPDATE) {
        fs.renameSync(tmpPath, snapPath);
        updated++;
        console.log(`[snapshot] ${caso.id}.png atualizado`);
        continue;
    }

    const img1 = loadPng(snapPath);
    const img2 = loadPng(tmpPath);
    if (img1.width !== img2.width || img1.height !== img2.height) {
        failures.push(`${caso.id}: dimensões diferentes (${img1.width}x${img1.height} vs ${img2.width}x${img2.height})`);
        fs.renameSync(tmpPath, path.join(snapDir, `${caso.id}.diff-received.png`));
        continue;
    }

    const diff = new PNG({ width: img1.width, height: img1.height });
    const diffPx = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
        threshold: 0.12,
        includeAA: true
    });

    fs.unlinkSync(tmpPath);

    const maxDiff = 120;
    if (diffPx > maxDiff) {
        const diffPath = path.join(snapDir, `${caso.id}.diff.png`);
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        failures.push(`${caso.id}: ${diffPx} pixels diferentes (limite ${maxDiff}) → ${path.basename(diffPath)}`);
    } else {
        console.log(`[ok] ${caso.id} (Δ ${diffPx}px)`);
    }
}

await browser.close();

console.log('');
console.log(`=== Regressão visual: ${casosVisuais.length} casos, ${updated} snapshot(s) gravado(s) ===`);
if (failures.length) {
    console.log('Falhas:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
}
