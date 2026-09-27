/**
 * Leitura do ValorNumerico devolvido pela API Wolfram.
 * Cobre o formato antigo (Round a 0.0001) e o atual (6 algarismos significativos, "3.33333e-3").
 * Uso: node tests/formato-resultado.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

global.document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
};
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const require = createRequire(import.meta.url);
const { parsePolar, formatarResultadoEng } = require(path.join(__dirname, '..', 'script.js'));

let falhas = 0;
function exibe(valor, unidade, esperado) {
    const f = formatarResultadoEng(valor, unidade);
    const obtido = `${f.valor} ${f.unidade}`;
    if (obtido === esperado) console.log(`  ok  ${JSON.stringify(valor)} ${unidade} -> ${obtido}`);
    else { falhas++; console.error(`  FALHA  ${JSON.stringify(valor)} ${unidade}: esperado "${esperado}", obtido "${obtido}"`); }
}

console.log('Formato atual (algarismos significativos)');
exibe('1.00000e1', 'V', '10.0 V');
exibe('6.66667e0', 'V', '6.67 V');
exibe('3.33333e-3', 'A', '3.33 mA');
exibe('-3.33333e-3', 'A', '-3.33 mA');
exibe('2.50000e-7', 'A', '250 nA');
exibe('1.23457e7', 'V', '12.3 MV');
exibe('0', 'A', '0 A');
exibe('9.35715e0 \u2220 -20.66\u00b0', 'V', '9.36 \u2220 -20.66\u00b0 V');
exibe('3.52756e-3 \u2220 69.34\u00b0', 'A', '3.53 \u2220 69.34\u00b0 mA');

console.log('Formato antigo continua legível');
exibe('10.', 'V', '10.0 V');
exibe('6.6667', 'V', '6.67 V');
exibe('7.0711 \u2220 45.\u00b0', 'V', '7.07 \u2220 45\u00b0 V');

console.log('Valores pequenos não viram zero');
{
    const p = parsePolar('3.30000e-6');
    const ok = p && Math.abs(p.mod - 3.3e-6) < 1e-12;
    if (ok) console.log('  ok  3.30000e-6 lido como 3.3e-6');
    else { falhas++; console.error('  FALHA  3.30000e-6 lido como', p); }
}

if (falhas) {
    console.error(`\n${falhas} verificação(ões) falharam.`);
    process.exit(1);
}
console.log('\nTodas as verificações passaram.');
