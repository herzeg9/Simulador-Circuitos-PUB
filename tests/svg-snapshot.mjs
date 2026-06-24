/**
 * Snapshots SVG do esquemático (sem dependências externas).
 * Complementa test:visual (PNG via Puppeteer no CI).
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { casosVisuais } from './casos-visuais.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const snapDir = path.join(__dirname, 'snapshots', 'svg');
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

function normalizeSvg(html) {
    return html
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

if (!fs.existsSync(snapDir)) fs.mkdirSync(snapDir, { recursive: true });

const failures = [];

for (const caso of casosVisuais) {
    const topologia = circuitoExemploParaTopologia(caso.circuito);
    const { html } = buildEsquematicoFromTopologia(topologia);
    const norm = normalizeSvg(html);
    const file = path.join(snapDir, `${caso.id}.svg`);

    if (UPDATE || !fs.existsSync(file)) {
        fs.writeFileSync(file, norm, 'utf8');
        console.log(`[snapshot] svg/${caso.id}.svg`);
        continue;
    }

    const baseline = normalizeSvg(fs.readFileSync(file, 'utf8'));
    if (baseline !== norm) {
        fs.writeFileSync(path.join(snapDir, `${caso.id}.received.svg`), norm, 'utf8');
        failures.push(`${caso.id}: SVG diverge do baseline`);
    } else {
        console.log(`[ok] svg/${caso.id}.svg`);
    }
}

console.log(`\n=== SVG snapshots: ${casosVisuais.length} casos ===`);
if (failures.length) {
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
}
