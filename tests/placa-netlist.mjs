/**
 * Extração de nós da placa de montagem: fios + posições → números de nó.
 * Uso: node tests/placa-netlist.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { extrairNos, juncoes, diagnosticar, normalizarFios, reposicionarFios, arrastarTrecho, segmentos, nosNetlist, terminais } = require(path.join(__dirname, '..', 'placa.js'));

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

console.log('Fonte de corrente: a netlist segue a seta desenhada');
{
    // I1 vertical em (100,200) girada 90°: seta (A) em cima, em (100,160); cauda em (100,240)
    const I = { id: 'i', tipo: 'CurrentSource', nome: 'I1', x: 100, y: 200, rot: 90, valorDc: '1m', modulo: '1m', fase: '0' };
    const comps = [I, R('r', 'R1', 100, 200, 90), GND('g', 100, 240)];
    const res = extrairNos(comps, [fio('f', 100, 160, 100, 160)]);
    const [n1, n2] = nosNetlist(I, nos(res, 'i'));
    // No backend a corrente vai do 1º para o 2º nó por dentro da fonte: sai pelo 2º, que tem de ser o da seta
    verificar('2º nó é o da ponta da seta', n2 === nos(res, 'i').A && n2 !== 0);
    verificar('1º nó é a cauda (terra)', n1 === 0);
    verificar('fonte de tensão mantém A primeiro', JSON.stringify(nosNetlist(V('v', 'V1', 0, 0), { A: 1, B: 0 })) === '[1,0]');
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

let seq = 0;
const novoId = () => 'n' + (++seq);
const netlist = (comps, fios) => {
    const r = extrairNos(comps, fios);
    return JSON.stringify(comps.filter(c => c.tipo !== 'GND').map(c => [c.nome, r.nosPorComp.get(c.id)]));
};
const coords = fios => fios.map(f => [f.x1, f.y1, f.x2, f.y2].join(',')).sort();

console.log('Normalização: L vira dois trechos retos');
{
    const n = normalizarFios([fio('l', 0, 0, 100, 60, true)], novoId);
    verificar('dois trechos', n.length === 2);
    verificar('todos retos', n.every(f => f.x1 === f.x2 || f.y1 === f.y2));
}

console.log('Normalização: trechos colineares que se tocam ou se sobrepõem viram um só');
{
    const n = normalizarFios([fio('a', 0, 0, 100, 0), fio('b', 100, 0, 200, 0), fio('c', 150, 0, 60, 0)], novoId);
    verificar('um trecho de 0 a 200', n.length === 1 && n[0].x1 === 0 && n[0].x2 === 200, JSON.stringify(n));
}

console.log('Normalização: não junta onde a ponta faz ligação em T com fio perpendicular');
{
    // (100,0) é ponta de a e b e fica no meio do vertical v: é essa ponta que liga v ao horizontal
    const comps = [R('r1', 'R1', 100, -60, 90), R('r2', 'R2', 100, 100, 90), R('r3', 'R3', -40, 0), GND('g', 100, 140)];
    const fios = [fio('a', 0, 0, 100, 0), fio('b', 100, 0, 200, 0), fio('v', 100, -20, 100, 60)];
    const n = normalizarFios(fios, novoId);
    verificar('conectividade igual', netlist(comps, fios) === netlist(comps, n), `${netlist(comps, fios)} vs ${netlist(comps, n)}`);
    verificar('horizontal continua partido em (100,0)', n.filter(f => f.y1 === 0 && f.y2 === 0).length === 2);
}

console.log('Normalização da placa real do teste manual (V1, R1, C1, L1, R2)');
{
    const comps = [
        V('v1', 'V1', 200, 240), { ...R('r1', 'R1', 280, 200), valor: '5k' },
        { id: 'c1', tipo: 'Capacitor', nome: 'C1', x: 380, y: 260, rot: 90 },
        { id: 'l1', tipo: 'Inductor', nome: 'L1', x: 480, y: 260, rot: 90 },
        GND('g', 380, 300), R('r2', 'R2', 560, 260, 90)
    ];
    const fios = [
        fio('f1', 200, 200, 240, 200, true), fio('f2', 320, 200, 380, 220, true), fio('f3', 480, 220, 480, 180, false),
        fio('f4', 480, 180, 380, 200, true), fio('f5', 200, 280, 380, 300, true), fio('f6', 480, 300, 380, 300, true),
        fio('f7', 560, 220, 480, 180, true), fio('f8', 560, 300, 480, 300, true)
    ];
    const n = normalizarFios(fios, novoId);
    verificar('netlist igual depois de normalizar', netlist(comps, fios) === netlist(comps, n), `${netlist(comps, fios)} vs ${netlist(comps, n)}`);
    verificar('só trechos retos', n.every(f => f.x1 === f.x2 || f.y1 === f.y2));
    verificar('trechos sobrepostos em x=480 juntados', n.filter(f => f.x1 === 480 && f.x2 === 480 && f.y1 < 220).length === 1, JSON.stringify(coords(n)));
}

console.log('Arrastar trecho: fios perpendiculares esticam, terminais ganham ponte');
{
    // R1 horizontal em (100,100) e R2 horizontal em (300,100), ligados por baixo: desce, atravessa, sobe
    const comps = [R('r1', 'R1', 100, 100), R('r2', 'R2', 300, 100), GND('g', 60, 100), GND('g2', 340, 100)];
    const base = [fio('d', 140, 100, 140, 200), fio('h', 140, 200, 260, 200), fio('s', 260, 200, 260, 100)];
    const antes = netlist(comps, base);
    const movido = arrastarTrecho(comps, base, 'h', 40, novoId);
    const h = movido.find(f => f.id === 'h');
    verificar('trecho foi para y=240', h.y1 === 240 && h.y2 === 240);
    verificar('verticais esticaram até 240', movido.find(f => f.id === 'd').y2 === 240 && movido.find(f => f.id === 's').y1 === 240);
    verificar('sem ponte desnecessária', movido.length === 3);
    verificar('conectividade mantida', netlist(comps, normalizarFios(movido, novoId)) === antes);

    const direto = [fio('x', 140, 100, 260, 100)];
    const subiu = arrastarTrecho(comps, direto, 'x', -40, novoId);
    verificar('trecho preso a terminais ganha duas pontes', subiu.length === 3);
    verificar('conectividade mantida com pontes', netlist(comps, normalizarFios(subiu, novoId)) === netlist(comps, direto));
}

console.log('VCVS/VCCS: quatro terminais e netlist [out+, out−, ctrl+, ctrl−]');
{
    const e0 = { id: 'e', tipo: 'VCVS', nome: 'E1', x: 200, y: 200, rot: 0, valor: '3' };
    const ts = terminais(e0);
    const porNome = nome => ts.find(t => t.nome === nome);
    verificar('rot 0: Out+ esquerda, Out− direita, Ctrl+ cima, Ctrl− baixo',
        porNome('A').x === 160 && porNome('A').y === 200
        && porNome('B').x === 240 && porNome('B').y === 200
        && porNome('C').x === 200 && porNome('C').y === 160
        && porNome('D').x === 200 && porNome('D').y === 240,
        JSON.stringify(ts));
    const t90 = terminais({ ...e0, rot: 90 });
    const p90 = nome => t90.find(t => t.nome === nome);
    verificar('rot 90 gira os quatro juntos',
        p90('A').x === 200 && p90('A').y === 160 && p90('C').x === 240 && p90('C').y === 200,
        JSON.stringify(t90));
    verificar('netlist VCVS [2,0,1,0]', JSON.stringify(nosNetlist(e0, { A: 2, B: 0, C: 1, D: 0 })) === '[2,0,1,0]');
    const g = { id: 'g1', tipo: 'VCCS', nome: 'G1', x: 0, y: 0, rot: 0, valor: '0.01' };
    verificar('netlist VCCS na mesma ordem', JSON.stringify(nosNetlist(g, { A: 2, B: 0, C: 1, D: 0 })) === '[2,0,1,0]');
}

console.log('Amplificador VCVS na placa casa com o preset amp');
{
    const Vsrc = V('v', 'V_In', 120, 200);
    const r1 = R('r1', 'R1', 220, 160);
    const e = { id: 'e', tipo: 'VCVS', nome: 'E_Amp', x: 400, y: 160, rot: 0, valor: '3' };
    const carga = R('rc', 'R_Carga', 540, 200, 90);
    const comps = [Vsrc, r1, e, carga, GND('g', 120, 240)];
    const fios = [
        fio('a', 120, 160, 180, 160),
        fio('b', 260, 160, 260, 240),
        fio('c', 260, 240, 120, 240),
        fio('d1', 360, 160, 360, 80),
        fio('d2', 360, 80, 540, 80),
        fio('d3', 540, 80, 540, 160),
        fio('e', 440, 160, 440, 240),
        fio('f', 440, 240, 120, 240),
        fio('h', 400, 200, 400, 240),
        fio('i', 400, 240, 120, 240),
        fio('j', 540, 240, 120, 240),
        fio('k', 400, 120, 180, 120),
        fio('l', 180, 120, 180, 160)
    ];
    const res = extrairNos(comps, fios);
    const net = (id, comp) => nosNetlist(comp, nos(res, id));
    verificar('V_In = [1, 0]', JSON.stringify(net('v', Vsrc)) === '[1,0]', JSON.stringify(nos(res, 'v')));
    verificar('R1 = [1, 0]', JSON.stringify(net('r1', r1)) === '[1,0]', JSON.stringify(nos(res, 'r1')));
    verificar('E_Amp = [2, 0, 1, 0]', JSON.stringify(net('e', e)) === '[2,0,1,0]', JSON.stringify(nos(res, 'e')));
    verificar('R_Carga = [2, 0]', JSON.stringify(net('rc', carga)) === '[2,0]', JSON.stringify(nos(res, 'rc')));
    verificar('VCVS ligado sem erro', diagnosticar(comps, res).erros.length === 0, JSON.stringify(diagnosticar(comps, res)));
}

console.log('CCVS/CCCS: só a saída na netlist; Alvo vazio ou inexistente é erro');
{
    const h = { id: 'h', tipo: 'CCVS', nome: 'H1', x: 0, y: 0, rot: 0, valor: '2', alvo: 'R1' };
    verificar('netlist CCVS [out+, out−]', JSON.stringify(nosNetlist(h, { A: 2, B: 0 })) === '[2,0]');
    verificar('CCVS tem dois terminais', terminais(h).length === 2);

    const f = { id: 'f', tipo: 'CCCS', nome: 'F1', x: 100, y: 100, rot: 0, valor: '100', alvo: '' };
    const r = R('r', 'R_Base', 300, 100);
    const comps = [f, r, GND('g', 140, 100)];
    const res = extrairNos(comps, []);
    verificar('CCCS sem Alvo é erro', diagnosticar(comps, res).erros.some(m => m.includes('Alvo')));
    f.alvo = 'R9';
    verificar('Alvo inexistente é erro', diagnosticar(comps, res).erros.some(m => m.includes('R9') && m.includes('não existe')));
    f.alvo = 'F1';
    verificar('Alvo em si mesmo não conta', diagnosticar(comps, res).erros.some(m => m.includes('não existe')));
    f.alvo = 'R_Base';
    verificar('Alvo R_Base aceito', !diagnosticar(comps, res).erros.some(m => m.includes('Alvo') || m.includes('não existe')));

    const f90 = { id: 'f2', tipo: 'CCCS', nome: 'F_BJT', x: 400, y: 200, rot: 90, valor: '100', alvo: 'R_Base' };
    const col = R('col', 'R_Col', 480, 200, 90);
    const base = R('base', 'R_Base', 200, 160);
    const ib = { id: 'i', tipo: 'CurrentSource', nome: 'I_Base', x: 120, y: 200, rot: 270, valorDc: '1m', modulo: '1m', fase: '0' };
    const circuito = [ib, base, f90, col, GND('gnd', 120, 240)];
    const fios = [
        fio('t1', 120, 160, 160, 160),
        fio('t2', 240, 160, 240, 240),
        fio('t3', 240, 240, 120, 240),
        fio('t4', 400, 160, 480, 160),
        fio('t5', 400, 240, 120, 240),
        fio('t6', 480, 240, 120, 240)
    ];
    const r2 = extrairNos(circuito, fios);
    verificar('F_BJT = [2, 0]', JSON.stringify(nosNetlist(f90, nos(r2, 'f2'))) === '[2,0]', JSON.stringify(nos(r2, 'f2')));
    verificar('R_Col = [2, 0]', JSON.stringify(nosNetlist(col, nos(r2, 'col'))) === '[2,0]', JSON.stringify(nos(r2, 'col')));
    verificar('R_Base = [1, 0]', JSON.stringify(nosNetlist(base, nos(r2, 'base'))) === '[1,0]', JSON.stringify(nos(r2, 'base')));
    verificar('I_Base = [1, 0]', JSON.stringify(nosNetlist(ib, nos(r2, 'i'))) === '[1,0]', JSON.stringify(nos(r2, 'i')));
    verificar('CCCS com Alvo sem erro de Alvo', !diagnosticar(circuito, r2).erros.some(m => m.includes('Alvo') || m.includes('não existe')), JSON.stringify(diagnosticar(circuito, r2)));
}

console.log('Mover componente: fio continua saindo da ponta parada na direção original');
{
    const base = [fio('h', 0, 0, 100, 0)];
    const [f] = reposicionarFios(base, p => (p.x === 100 && p.y === 0 ? { x: 140, y: 60 } : null));
    const segs = segmentos(f);
    verificar('primeiro trecho continua horizontal saindo de (0,0)', segs[0].y1 === 0 && segs[0].y2 === 0 && segs[0].x1 === 0);
    verificar('termina em (140,60)', segs[segs.length - 1].x2 === 140 && segs[segs.length - 1].y2 === 60);
}

if (falhas) {
    console.error(`\n${falhas} verificação(ões) falharam.`);
    process.exit(1);
}
console.log('\nTodas as verificações passaram.');
