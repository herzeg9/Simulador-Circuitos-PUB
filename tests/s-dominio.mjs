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
    valorParametroS,
    valorNumericoDcAc,
    expressaoLaplace,
    modeloSerieS,
    respostaEhDominioS,
    svgAmostrasTemporais,
    setaDeAparaB,
    positivoNoLadoA,
    htmlCaracteristicaDominioS,
    htmlResultadosDominioS
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
verificar('texto solto não é parâmetro', valorInicialInformado('2foo').motivo === 'invalido');
verificar('nome simbólico passa', valorParametroS('v10').ok && valorParametroS('i0').valor === 'i0' && valorParametroS('A').ok && valorParametroS('alpha').ok);
verificar('expressão simbólica passa', valorParametroS('2*v10').ok && valorParametroS('-i0').valor === '-i0' && valorParametroS('(v10+v20)/2').ok);
verificar('DC rejeita nome', valorNumericoDcAc('v10') === false && valorNumericoDcAc('1k') === true && valorNumericoDcAc('-30') === true);

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
    const m = msgs([{ Componente: 'C1', Tipo: 'Capacitor', Nos: [1, 0], CondicaoInicial: '2foo' }]);
    verificar('v(0) inválido', m.includes('não é um número válido'));
    verificar('v(0) nome passa', msgs([{ Componente: 'C1', Tipo: 'Capacitor', Nos: [1, 0], CondicaoInicial: 'v10' }]) === '');
    verificar('i(0) expressão passa', msgs([{ Componente: 'L1', Tipo: 'Inductor', Nos: [1, 0], CondicaoInicial: '-i0' }]) === '');
}
{
    const m = msgs([{ Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0], Laplace: { Amplitude: '', Alpha: '1' } }]);
    verificar('amplitude vazia', m.includes('amplitude') && m.includes('vazia'));
    const ruim = msgs([{ Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0], Laplace: { Amplitude: '2A', Alpha: 'a+' } }]);
    verificar('amplitude e alpha inválidos', ruim.includes('amplitude') && ruim.includes('decaimento'));
    verificar('fonte simbólica passa', msgs([{
        Componente: 'V1', Tipo: 'VoltageSource', Nos: [1, 0],
        Laplace: { Amplitude: '2*v10', Alpha: 'alpha' }
    }]) === '');
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
    const longa = svgAmostrasTemporais([[0, 0], [10000, 1]], { titulo: 'v_1(t)' });
    verificar('janela longa usa notação compacta', longa.includes('1.00e+4') && longa.includes('v_1(t)'), longa.slice(0, 80));
}

console.log('Sentido da fonte');
verificar('CCCS rot 0: A→B para a direita', setaDeAparaB('CCCS', 0) === true);
verificar('CCCS rot 90: A em cima, seta para baixo', setaDeAparaB('CCCS', 90) === true);
verificar('CCCS rot 180: seta para a esquerda', setaDeAparaB('CCCS', 180) === false);
verificar('CCCS rot 270: A embaixo, seta para cima', setaDeAparaB('CCCS', 270) === false);
verificar('VCCS rot 0 segue A→B', setaDeAparaB('VCCS', 0) === true);
verificar('fonte de corrente independente rot 0 aponta para A', setaDeAparaB('CurrentSource', 0) === false);
verificar('fonte de corrente independente rot 90 aponta para cima', setaDeAparaB('CurrentSource', 90) === false);
verificar('+ no lado A em rot 0 e 90', positivoNoLadoA(0) && positivoNoLadoA(90));
verificar('+ no lado B em rot 180 e 270', !positivoNoLadoA(180) && !positivoNoLadoA(270));

console.log('Resposta s v3');
{
    const exemplo = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'exemplo-resposta-s-v3.json'), 'utf8'));
    const car = htmlCaracteristicaDominioS(exemplo.Caracteristica);
    const res = htmlResultadosDominioS(exemplo);
    const html = car + res;
    verificar('rótulo V_1(s)', html.includes('V_{1}(s)'));
    verificar('rótulo v_1(t)', html.includes('v_{1}(t)'));
    verificar('fração exata de V1', html.includes('\\frac{21 (2 s-1)}{21 s^2+70 s+3}'));
    verificar('nota de coeficientes aproximados', html.includes('(coeficientes aproximados)'));
    verificar('não usa o rótulo genérico y(t)', !html.includes('>y(t)<'));
    verificar('título da equação característica', car.includes('Equação característica e polos'));
    verificar('explica o determinante da MNA', car.includes('determinante da matriz da análise nodal (MNA)') && car.includes('frequências naturais'));
    verificar('determinante', car.includes('21 s^2+70 s+3'));
    verificar('estável e superamortecido', car.includes('Estável') && car.includes('superamortecido'));
    verificar('omega_n exato', car.includes('\\frac{1}{\\sqrt{7}}'));
    verificar('zeta exato', car.includes('\\frac{5 \\sqrt{7}}{3}'));
    verificar('polo e tau', car.includes('s = -0.04342') && car.includes('\\tau = 23.03'));
    const tFim = exemplo.Resultados[0].Tempo.Amostras.at(-1)[0];
    verificar('gráfico da janela real', res.includes('v_1(t)') && res.includes('<path') && res.includes(String(Math.round(tFim * 1000) / 1000)));
    verificar('121 amostras no exemplo', exemplo.Resultados.every(r => r.Tempo.Amostras.length === 121));
    verificar('sem Caracteristica não há seção', htmlCaracteristicaDominioS(null) === '' && htmlCaracteristicaDominioS(undefined) === '');
    const instavel = htmlCaracteristicaDominioS({ DeterminanteTeX: 's-1', Ordem: 1, Estavel: false, Polos: [], ConstantesDeTempo: [] });
    verificar('instável', instavel.includes('Instável') && !instavel.includes('>Estável<'));
    const impulso = htmlResultadosDominioS({
        Resultados: [{
            Local: 'Nó 1',
            Unidade: 'A',
            RotuloTeX: 'I_{L1}(s)',
            ExpressaoTeX: '1',
            Tempo: {
                Rotulo: 'i_{L1}(t)',
                RotuloTeX: 'i_{L1}(t)',
                ExpressaoTeX: '0',
                Forma: 'exata',
                ImpulsoTeX: '\\delta(t)',
                Amostras: [[0, 1], [1, 0]]
            }
        }]
    });
    verificar('termo impulsivo', impulso.includes('Termo impulsivo') && impulso.includes('\\delta(t)') && impulso.includes('i_{L1}(t)'));
    verificar('forma exata sem a nota numérica', !impulso.includes('coeficientes aproximados'));
    const antigo = htmlResultadosDominioS({
        Resultados: [{ Local: 'Nó 2', ExpressaoTeX: '10/s', Unidade: 'V', Tempo: { ExpressaoTeX: '10-10 e^{-t}', Amostras: [[0, 0], [1, 6]] } }]
    });
    verificar('resposta antiga continua com y(t)', antigo.includes('>y(t)<') && antigo.includes('Nó 2'));
}

console.log('Resposta s simbólica');
{
    const exemplo = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'exemplo-resposta-s-v4-simbolico.json'), 'utf8'));
    const res = htmlResultadosDominioS(exemplo);
    verificar('parâmetros simbólicos no cabeçalho', res.includes('Parâmetros simbólicos') && res.includes('v_{10}') && res.includes('v_{20}') && res.includes('i_{0}'));
    verificar('V1 e i_L1 simbólicos', res.includes('V_{1}(s)') && res.includes('v_{1}(t)') && res.includes('i_{L1}(t)') && res.includes('v_{10}+v_{20}'));
    verificar('nota de gráfico indisponível', res.includes('Gráfico indisponível: há parâmetros simbólicos.'));
    verificar('sem curva quando Forma é simbolica', !res.includes('<path') && !res.includes('s-tempo-svg'));
    verificar('forma exata sem nota numérica', !res.includes('coeficientes aproximados'));
    const num = htmlResultadosDominioS({
        Resultados: [{
            Local: 'Nó 1', Unidade: 'V', RotuloTeX: 'V_{1}(s)', ExpressaoTeX: 'v_{10}/s',
            Tempo: {
                RotuloTeX: 'v_{1}(t)', ExpressaoTeX: 'v_{10}', Forma: 'simbolica',
                FormaCoeficientes: 'numerica', Nota: 'sem gráfico',
                Amostras: [[0, 1], [1, 2], [2, 3]]
            }
        }]
    });
    verificar('coeficientes numéricos mesmo na forma simbólica', num.includes('(coeficientes aproximados)') && num.includes('sem gráfico') && !num.includes('<path'));
}

console.log('Notebook completo');
{
    const nb = fs.readFileSync(path.join(__dirname, '..', 'wolfram', 'simulador-circuitos-api-v2.nb'), 'utf8');
    const wl = fs.readFileSync(path.join(__dirname, '..', 'wolfram', 'simulador-circuitos-api-v2.wl'), 'utf8');
    const pedacos = nb.split('", "Code", InitializationCell -> False]');
    const miolos = pedacos.slice(0, -1).map((parte) => {
        const marca = 'Cell["';
        const em = parte.lastIndexOf(marca);
        return em < 0 ? '' : parte.slice(em + marca.length);
    });
    verificar('nb tem 3 células Code e não inicializa ao abrir', miolos.length === 3 && (nb.match(/", "Code", InitializationCell -> False\]/g) || []).length === 3);
    verificar('nb não usa RowBox', !nb.includes('RowBox'));
    verificar('células de código sem comentário (* *)', miolos.every((m) => !m.includes('(*') && !m.includes('*)')));
    verificar('nb sem a string solta de confirmação', !nb.includes('Definicoes da API carregadas') && !wl.includes('Definicoes da API carregadas'));
    verificar('CloudDeploy só na última célula de código', !miolos[0].includes('CloudDeploy') && !miolos[1].includes('CloudDeploy') && miolos[2].includes('CloudDeploy'));
    verificar('nb contém processCircuit', miolos[0].includes('processCircuit'));
    verificar('nb contém CloudDeploy no mesmo objeto', nb.includes('simulador-circuitos-api-v2') && miolos[2].includes('CloudDeploy'));
    verificar('nb contém a substituição do capacitor e do indutor', miolos[0].includes('/(s*compVal)') && miolos[0].includes('compVal*i0'));
    verificar('AC da V25 permanece 1/(I omega C)', wl.includes('(1/(I*omega*compVal))') && wl.includes('(I*omega*compVal)'));
    verificar('DC da V25 abre o capacitor', wl.includes('i[comp["Componente"]]==0'));
    verificar('campos v0, i0 e Laplace step/impulse/exponential', wl.includes('"v0"') && wl.includes('"i0"') && wl.includes('"step"') && wl.includes('"impulse"') && wl.includes('"exponential"'));
    verificar('condicaoBruta lê a chave com SelectFirst', wl.includes('SelectFirst[chaves, KeyExistsQ[comp, #] &, None]') && nb.includes('SelectFirst[chaves, KeyExistsQ[comp, #] &, None]'));
    verificar('Return não fica preso no Do', !wl.includes('Return[comp[ch]]') && !nb.includes('Return[comp[ch]]'));
    verificar('wl cabe no nb (primeira definição)', nb.includes('parseValue'));
    verificar('fontes do wl estão referenciadas', wl.includes('validarDominioS') && nb.includes('validarDominioS'));
    verificar('nb não é um Get externo', !nb.includes('Get['));
}

if (falhas) {
    console.error(`\n${falhas} falha(s)`);
    process.exit(1);
}
console.log('\nTudo certo.');
