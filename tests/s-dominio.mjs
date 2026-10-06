/**
 * Validação do modo s e contrato auxiliar.
 * Uso: node tests/s-dominio.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const {
    validarNetlistDominioS,
    valorInicialInformado,
    expressaoLaplace,
    modeloSerieS,
    respostaEhDominioS,
    svgAmostrasTemporais
} = require(path.join(__dirname, '..', 'sdominio.js'));

let falhas = 0;
function verificar(nome, cond, detalhe = '') {
    if (cond) console.log(`  ok  ${nome}`);
    else { falhas++; console.error(`  FALHA  ${nome} ${detalhe}`); }
}
const msgs = net => validarNetlistDominioS(net).map(e => e.mensagem).join(' | ');

console.log('Condição inicial');
verificar('vazio é ausência', valorInicialInformado('  ').motivo === 'ausente');
verificar('zero é válido', valorInicialInformado('0').ok && valorInicialInformado('-2').ok);
verificar('sufixo no i(0)', valorInicialInformado('20m').ok && valorInicialInformado('20m').valor === '20*0.001');
verificar('texto não é número', valorInicialInformado('abc').motivo === 'invalido');

console.log('Capacitor e indutor');
{
    const m = msgs([
        { Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0], Valor: '10' },
        { Componente: 'C1', Tipo: 'Capacitor', Nos: [1, 0], Valor: '1u' },
        { Componente: 'L1', Tipo: 'Inductor', Nos: [1, 0], Valor: '1m' }
    ]);
    verificar('cobra v(0)', m.includes('capacitor C1') && m.includes('v(0)'));
    verificar('cobra i(0)', m.includes('indutor L1') && m.includes('i(0)'));
}
{
    const m = msgs([
        { Componente: 'C1', Tipo: 'Capacitor', Nos: [1, 0], CondicaoInicial: '0' },
        { Componente: 'L1', Tipo: 'Inductor', Nos: [1, 0], CondicaoInicial: '10m' }
    ]);
    verificar('zero e sufixo passam', m === '', m);
}
{
    const m = msgs([{ Componente: 'C1', Tipo: 'Capacitor', Nos: [1, 0], CondicaoInicial: 'foo' }]);
    verificar('v(0) inválido', m.includes('não é um número válido'));
}

console.log('Fontes dependentes');
{
    const base = [
        { Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0] },
        { Componente: 'R1', Tipo: 'Resistor', Nos: [1, 0] }
    ];
    verificar('H sem Alvo', msgs([...base, { Componente: 'H1', Tipo: 'CCVS', Nos: [2, 0], Alvo: '' }]).includes('sem referência de controle'));
    verificar('F com Alvo inexistente', msgs([...base, { Componente: 'F1', Tipo: 'CCCS', Nos: [2, 0], Alvo: 'Rx' }]).includes('não foi resolvida'));
    verificar('H com Alvo R1 passa', msgs([...base, { Componente: 'H1', Tipo: 'CCVS', Nos: [2, 0], Alvo: 'R1', Valor: '2' }]) === '');
    verificar('H não pode ser o próprio Alvo', msgs([{ Componente: 'H1', Tipo: 'CCVS', Nos: [1, 0], Alvo: 'H1' }]).includes('si mesma'));
    verificar('E com Ctrl+ solto', msgs([
        { Componente: 'E1', Tipo: 'VCVS', Nos: [2, 0, 5, 0], Valor: '3' }
    ]).includes('Ctrl+'));
    verificar('E com controle no terra e no nó da fonte passa', msgs([
        { Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0] },
        { Componente: 'E1', Tipo: 'VCVS', Nos: [2, 0, 1, 0], Valor: '3' }
    ]) === '');
    verificar('G com os dois pinos de controle soltos', (() => {
        const m = msgs([{ Componente: 'G1', Tipo: 'VCCS', Nos: [1, 0, 4, 5], Valor: '1' }]);
        return m.includes('Ctrl+') && m.includes('Ctrl−');
    })());
}

console.log('Laplace e modelo série');
verificar('degrau', expressaoLaplace('degrau', '10', '0') === '(10)/s');
verificar('impulso', expressaoLaplace('impulso', '3', '1') === '3');
verificar('exponencial', expressaoLaplace('exponencial', '4', '2') === '(4)/(s+(2))');
verificar('capacitor é 1/(sC) com v(0)/s', JSON.stringify(modeloSerieS('Capacitor')) === JSON.stringify({ impedancia: '1/(s*C)', fonteSerie: 'v(0)/s' }));
verificar('indutor é sL com -L i(0)', modeloSerieS('Inductor').fonteSerie === '-L*i(0)');

console.log('Resposta da API');
verificar('sem Modo S não conta', !respostaEhDominioS({ Modo: 'DC', Resultados: [{ ValorNumerico: '1' }] }));
verificar('Modo S com Expressao conta', respostaEhDominioS({ Modo: 'S', Resultados: [{ Expressao: '10/s' }] }));

console.log('Gráfico');
{
    const svg = svgAmostrasTemporais([[0, 0], [1, 1], [2, 0.5]], { titulo: 'Nó 1', unidade: 'V' });
    verificar('svg tem a curva', svg.includes('<path') && svg.includes('Nó 1'));
    verificar('amostra curta não desenha', svgAmostrasTemporais([[0, 1]]) === '');
}

console.log('Notebook completo');
{
    const nb = fs.readFileSync(path.join(__dirname, '..', 'wolfram', 'simulador-circuitos-api-v2.nb'), 'utf8');
    const wl = fs.readFileSync(path.join(__dirname, '..', 'wolfram', 'simulador-circuitos-api-v2.wl'), 'utf8');
    verificar('nb contém processCircuit', nb.includes('processCircuit'));
    verificar('nb contém CloudDeploy no mesmo objeto', nb.includes('simulador-circuitos-api-v2') && nb.includes('CloudDeploy'));
    verificar('nb contém a substituição do capacitor e do indutor', nb.includes('/(s*compVal)') && nb.includes('compVal*i0'));
    verificar('AC da V25 permanece 1/(I omega C)', wl.includes('(1/(I*omega*compVal))') && wl.includes('(I*omega*compVal)'));
    verificar('DC da V25 abre o capacitor', wl.includes('i[comp["Componente"]]==0'));
    verificar('campos v0, i0 e Laplace step/impulse/exponential', wl.includes('"v0"') && wl.includes('"i0"') && wl.includes('"step"') && wl.includes('"impulse"') && wl.includes('"exponential"'));
    verificar('wl cabe no nb (primeira definição)', nb.includes('parseValue'));
    verificar('fontes do wl estão referenciadas', wl.includes('validarDominioS') && nb.includes('validarDominioS'));
    verificar('nb não é um Get externo', !nb.includes('Get['));
}

if (falhas) {
    console.error(`\n${falhas} falha(s)`);
    process.exit(1);
}
console.log('\nTudo certo.');
