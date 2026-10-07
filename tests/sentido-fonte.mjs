/**
 * Seta e polaridade desenhadas nas fontes, no mesmo sentido da API.
 * Uso: node tests/sentido-fonte.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const { drawSimbolo } = require(path.join(__dirname, '..', 'script.js'));

let falhas = 0;
function verificar(nome, cond, detalhe = '') {
    if (cond) console.log(`  ok  ${nome}`);
    else { falhas++; console.error(`  FALHA  ${nome} ${detalhe}`); }
}

function seta(svg) {
    const m = svg.match(/class="esq-seta-fonte" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/);
    if (!m) return null;
    return { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) };
}

function polos(svg) {
    const mais = [...svg.matchAll(/class="esq-polo" x="([^"]+)" y="([^"]+)"[^>]*>\+<\/text>/g)];
    const menos = [...svg.matchAll(/class="esq-polo" x="([^"]+)" y="([^"]+)"[^>]*>−<\/text>/g)];
    if (!mais.length || !menos.length) return null;
    return {
        px: Number(mais[0][1]), py: Number(mais[0][2]),
        mx: Number(menos[0][1]), my: Number(menos[0][2])
    };
}

console.log('CCCS / VCCS');
{
    const baixo = seta(drawSimbolo({ tipo: 'CCCS', nome: 'F1', valor: '2', _fromAtoB: true, _positiveOnA: true }, 0, 0, 'V'));
    verificar('rot 90 aponta para baixo (A em cima)', baixo && baixo.y2 > baixo.y1, JSON.stringify(baixo));
    const cima = seta(drawSimbolo({ tipo: 'CCCS', nome: 'F1', valor: '2', _fromAtoB: false, _positiveOnA: false }, 0, 0, 'V'));
    verificar('rot 270 aponta para cima (A embaixo)', cima && cima.y2 < cima.y1, JSON.stringify(cima));
    const dir = seta(drawSimbolo({ tipo: 'VCCS', nome: 'G1', valor: '1', _fromAtoB: true, _positiveOnA: true }, 0, 0, 'H'));
    verificar('VCCS horizontal A→B para a direita', dir && dir.x2 > dir.x1, JSON.stringify(dir));
    const esq = seta(drawSimbolo({ tipo: 'CCCS', nome: 'F1', valor: '2', _fromAtoB: false, _positiveOnA: false }, 0, 0, 'H'));
    verificar('CCCS rot 180 aponta para a esquerda', esq && esq.x2 < esq.x1, JSON.stringify(esq));
}

console.log('CCVS / VCVS');
{
    const h = polos(drawSimbolo({ tipo: 'VCVS', nome: 'E1', valor: '3', _fromAtoB: true, _positiveOnA: true }, 0, 0, 'H'));
    verificar('+ à esquerda de −', h && h.px < h.mx, JSON.stringify(h));
    const v = polos(drawSimbolo({ tipo: 'CCVS', nome: 'H1', valor: '4', _fromAtoB: true, _positiveOnA: true }, 0, 0, 'V'));
    verificar('+ acima de −', v && v.py < v.my, JSON.stringify(v));
    const inv = polos(drawSimbolo({ tipo: 'VCVS', nome: 'E1', valor: '3', _fromAtoB: false, _positiveOnA: false }, 0, 0, 'H'));
    verificar('rot 180 põe + à direita', inv && inv.px > inv.mx, JSON.stringify(inv));
}

console.log('Fontes independentes');
{
    const svg = drawSimbolo({ tipo: 'CurrentSource', nome: 'I1', valor: '1', _fromAtoB: false }, 0, 0, 'V');
    const m = svg.match(/x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"[^>]*marker-end="url\(#esq-arrow-curr\)"/);
    const setaI = m ? { y1: Number(m[2]), y2: Number(m[4]) } : null;
    verificar('corrente independente vertical com fromAtoB falso aponta para cima', setaI && setaI.y2 < setaI.y1, svg);
    const vsrc = drawSimbolo({ tipo: 'VoltageSource', nome: 'V1', valor: '10', _positiveOnA: true }, 0, 0, 'V');
    const mais = vsrc.match(/x="([^"]+)" y="([^"]+)"[^>]*>\+<\/text>/);
    const menos = vsrc.match(/x="([^"]+)" y="([^"]+)"[^>]*>−<\/text>/);
    verificar('fonte de tensão independente mantém + em A (em cima)', mais && menos && Number(mais[2]) < Number(menos[2]), vsrc);
}

if (falhas) {
    console.error(`\n${falhas} falha(s)`);
    process.exit(1);
}
console.log('\nTudo certo.');
