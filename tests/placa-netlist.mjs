/**
 * Extração de nós da placa de montagem: fios + posições → números de nó.
 * Uso: node tests/placa-netlist.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { extrairNos, juncoes, diagnosticar } = require(path.join(__dirname, '..', 'placa.js'));

let falhas = 0;
function verificar(nome, cond, detalhe = '') {
    if (cond) console.log(`  ok  ${nome}`);
    else { falhas++; console.error(`  FALHA  ${nome} ${detalhe}`); }
}

const R = (id, nome, x, y, rot = 0) => ({ id, tipo: 'Resistor', nome, x, y, rot, valor: '1k' });
const V = (id, nome, x, y, rot = 90) => ({ id, tipo: 'VoltageSource', nome, x, y, rot, valorDc: '10', modulo: '10', fase: '0' });
const GND = (id, x, y) => ({ id, tipo: 'GND', x, y, rot: 0 });
const fio = (id, x1, y1, x2, y2, hv = true) => ({ id, x1, y1, x2, y2, hv });
const nos = (res, id) => res.nosPorComp.get(id);

console.log('Divisor de tensão: V1 vertical, R1 horizontal, R2 vertical, terra embaixo');
{
    // V1 em (100,200) girada 90°: A (+) em (100,160), B em (100,240)
    // R1 em (200,160): A (160,160), B (240,160)
    // R2 em (240,200) girado 90°: A (240,160), B (240,240)
    const comps = [V('v', 'V1', 100, 200), R('r1', 'R1', 200, 160), R('r2', 'R2', 240, 200, 90), GND('g', 100, 240)];
    const fios = [fio('f1', 100, 160, 160, 160), fio('f2', 100, 240, 240, 240)];
    const res = extrairNos(comps, fios);
    verificar('V1 = [1, 0]', nos(res, 'v').A === 1 && nos(res, 'v').B === 0, JSON.stringify(nos(res, 'v')));
    verificar('R1 = [1, 2]', nos(res, 'r1').A === 1 && nos(res, 'r1').B === 2, JSON.stringify(nos(res, 'r1')));
    verificar('R2 = [2, 0]', nos(res, 'r2').A === 2 && nos(res, 'r2').B === 0, JSON.stringify(nos(res, 'r2')));
    verificar('sem terminais soltos', res.soltos.length === 0);
    verificar('sem erros de diagnóstico', diagnosticar(comps, res).erros.length === 0);
}

console.log('Junção em T: ponta de fio no meio de outro fio conecta');
{
    const comps = [R('a', 'R1', 100, 100), R('b', 'R2', 300, 100), R('c', 'R3', 200, 240, 90), GND('g', 200, 280)];
    const fios = [fio('f1', 140, 100, 260, 100), fio('f2', 200, 100, 200, 200)];
    const res = extrairNos(comps, fios);
    verificar('R1.B, R2.A e R3.A no mesmo nó',
        nos(res, 'a').B === nos(res, 'b').A && nos(res, 'b').A === nos(res, 'c').A);
    verificar('ponto de junção desenhado em (200,100)', juncoes(comps, fios).some(j => j.x === 200 && j.y === 100));
}

console.log('Fios que apenas se cruzam não conectam');
{
    const comps = [R('a', 'R1', 100, 200), R('b', 'R2', 200, 100, 90)];
    const fios = [fio('h', 140, 200, 300, 200), fio('v', 200, 140, 200, 300)];
    const res = extrairNos(comps, fios);
    verificar('R1.B e R2.B em nós diferentes', nos(res, 'a').B !== nos(res, 'b').B);
    verificar('sem ponto de junção no cruzamento', !juncoes(comps, fios).some(j => j.x === 200 && j.y === 200));
}

console.log('Fio em L conecta pela dobra');
{
    const comps = [R('a', 'R1', 100, 100), R('b', 'R2', 300, 260, 90), GND('g', 300, 300)];
    const fios = [fio('l', 140, 100, 300, 220, true)];
    const res = extrairNos(comps, fios);
    verificar('R1.B ligado a R2.A pelo L', nos(res, 'a').B === nos(res, 'b').A);
}

console.log('Terminal encostado direto em outro (sem fio) conecta');
{
    const comps = [R('a', 'R1', 100, 100), R('b', 'R2', 180, 100), GND('g', 220, 100)];
    const res = extrairNos(comps, []);
    verificar('R1.B = R2.A', nos(res, 'a').B === nos(res, 'b').A);
    verificar('R2.B no terra', nos(res, 'b').B === 0);
    verificar('R1.A é terminal solto', res.soltos.some(s => s.comp.id === 'a' && s.term.nome === 'A'));
}

console.log('Diagnóstico: sem terra e fonte em curto');
{
    const semTerra = [R('a', 'R1', 100, 100)];
    verificar('erro quando falta GND', diagnosticar(semTerra, extrairNos(semTerra, [])).erros.some(m => m.includes('terra')));
    const curto = [V('v', 'V1', 100, 200), GND('g', 100, 240)];
    const fiosCurto = [fio('f', 100, 160, 100, 240)];
    const res = extrairNos(curto, fiosCurto);
    verificar('fonte de tensão em curto é erro', diagnosticar(curto, res).erros.some(m => m.includes('curto')));
}

if (falhas) {
    console.error(`\n${falhas} verificação(ões) falharam.`);
    process.exit(1);
}
console.log('\nTodas as verificações passaram.');
