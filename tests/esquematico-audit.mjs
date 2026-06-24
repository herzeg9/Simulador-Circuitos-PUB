/**
 * Auditoria automática do esquemático — exemplos nativos + casos sintéticos.
 * Uso: node tests/esquematico-audit.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

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
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.MathJax = null;

const require = createRequire(import.meta.url);
const {
    exemplos,
    circuitoExemploParaTopologia,
    auditarEsquematico
} = require(path.join(root, 'script.js'));

/** Casos sintéticos: topologias que costumam revelar bugs de layout. */
const sinteticos = [
    {
        id: 'trafo_pri_retorno_R',
        desc: 'Trafo pri 2–5 + R3→GND (caso do usuário)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '220', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '30k', Nos: [1, 2] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 5, 3, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '15k', Nos: [3, 4] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '100u', Nos: [4, 0] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '1k', Nos: [5, 0] }
        ]
    },
    {
        id: 'trafo_integrado_classico',
        desc: 'Trafo pri/sec ambos em GND direto',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '1k', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 0, 3, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [3, 4] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '100u', Nos: [4, 0] }
        ]
    },
    {
        id: 'tres_shunts_meso_no',
        desc: 'V, R e C em paralelo no nó 1',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 0] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '10u', Nos: [1, 0] }
        ]
    },
    {
        id: 'cadeia_serie_longa',
        desc: '5 resistores em série na barra',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [2, 3] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '1k', Nos: [3, 4] },
            { Componente: 'R4', Tipo: 'Resistor', Valor: '1k', Nos: [4, 5] },
            { Componente: 'R5', Tipo: 'Resistor', Valor: '1k', Nos: [5, 0] }
        ]
    },
    {
        id: 'dois_trafos',
        desc: 'Dois transformadores no mesmo circuito',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:1', Nos: [1, 0, 2, 0] },
            { Componente: 'T2', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 0, 3, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [3, 0] }
        ]
    },
    {
        id: 'trafo_sec_retorno',
        desc: 'Secundário com nó satélite + C→GND',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:1', Nos: [1, 0, 2, 6] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [2, 3] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '10u', Nos: [6, 0] }
        ]
    },
    {
        id: 'fonte_corrente_shunt',
        desc: 'Fonte de corrente + carga',
        circuito: [
            { Componente: 'I1', Tipo: 'CurrentSource', Valor: '1m', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '10k', Nos: [1, 0] }
        ]
    },
    {
        id: 'vcvs_amp_minimo',
        desc: 'VCVS com controle e saída',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '5', Nos: [1, 0] },
            { Componente: 'E1', Tipo: 'VCVS', Valor: '2', Nos: [2, 0, 1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '10k', Nos: [2, 0] }
        ]
    },
    {
        id: 'malha_dupla_fonte',
        desc: 'Duas fontes em nós diferentes (estilo malhas)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '12', Nos: [1, 0] },
            { Componente: 'V2', Tipo: 'VoltageSource', Valor: '6', Nos: [2, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '2k', Nos: [2, 3] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '3k', Nos: [3, 0] }
        ]
    },
    {
        id: 'rlc_serie',
        desc: 'R-L-C em série com fonte',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [1, 2] },
            { Componente: 'L1', Tipo: 'Inductor', Valor: '10m', Nos: [2, 3] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '1u', Nos: [3, 0] }
        ]
    },
    {
        id: 'trafo_enrolamento_serie',
        desc: 'Pri entre dois nós não-GND (pode usar fallback)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:1', Nos: [2, 3, 4, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [4, 0] }
        ]
    },
    {
        id: 'degenerado_so_gnd',
        desc: 'Resistor curto 0–0 (deve avisar)',
        circuito: [
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [0, 0] }
        ]
    },
    // --- Fontes dependentes (variantes além dos exemplos nativos) ---
    {
        id: 'vccs_transcondutancia',
        desc: 'VCCS: corrente de saída controlada por tensão de entrada',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '5', Nos: [1, 0] },
            { Componente: 'Rin', Tipo: 'Resistor', Valor: '2k', Nos: [1, 0] },
            { Componente: 'G1', Tipo: 'VCCS', Valor: '0.005', Nos: [2, 0, 1, 0] },
            { Componente: 'Rout', Tipo: 'Resistor', Valor: '500', Nos: [2, 0] }
        ]
    },
    {
        id: 'ccvs_transresistencia',
        desc: 'CCVS com resistor alvo explícito',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '12', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '4.7k', Nos: [1, 2] },
            { Componente: 'H1', Tipo: 'CCVS', Valor: '3', Nos: [2, 0], Alvo: 'R1' }
        ]
    },
    {
        id: 'cccs_controlado',
        desc: 'CCCS com corrente de controle em resistor shunt',
        circuito: [
            { Componente: 'I1', Tipo: 'CurrentSource', Valor: '2m', Nos: [1, 0] },
            { Componente: 'Rs', Tipo: 'Resistor', Valor: '470', Nos: [1, 0] },
            { Componente: 'F1', Tipo: 'CCCS', Valor: '50', Nos: [2, 0], Alvo: 'Rs' },
            { Componente: 'Rc', Tipo: 'Resistor', Valor: '2.2k', Nos: [2, 0] }
        ]
    },
    {
        id: 'vcvs_ganho_cruzado',
        desc: 'VCVS com nós de saída distantes do controle',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '3.3', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'E1', Tipo: 'VCVS', Valor: '5', Nos: [4, 0, 2, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '10k', Nos: [4, 0] }
        ]
    },
    // --- Transformadores (variantes) ---
    {
        id: 'trafo_pri_sec_retorno',
        desc: 'R no retorno do pri e C no retorno do sec',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '220', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '10k', Nos: [1, 2] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 5, 3, 6] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [3, 4] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '100', Nos: [5, 0] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '47u', Nos: [6, 0] },
            { Componente: 'R4', Tipo: 'Resistor', Valor: '4.7k', Nos: [4, 0] }
        ]
    },
    {
        id: 'trafo_em_no_da_fonte',
        desc: 'Primário compartilha nó com fonte (estilo step-up)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '2:1', Nos: [1, 0, 2, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '50', Nos: [2, 0] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '10u', Nos: [1, 0] }
        ]
    },
    {
        id: 'dois_trafos_cascata',
        desc: 'T1 secundário alimenta primário de T2',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:1', Nos: [1, 0, 2, 0] },
            { Componente: 'T2', Tipo: 'Transformer', Valor: '1:3', Nos: [2, 0, 3, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '200', Nos: [3, 0] },
            { Componente: 'L1', Tipo: 'Inductor', Valor: '1m', Nos: [3, 0] }
        ]
    },
    // --- Shunts, malhas e nós internos ---
    {
        id: 'quatro_shunts_no1',
        desc: 'V, R, C e L em paralelo no mesmo nó',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 0] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '1u', Nos: [1, 0] },
            { Componente: 'L1', Tipo: 'Inductor', Valor: '1m', Nos: [1, 0] }
        ]
    },
    {
        id: 'nos_numeros_altos',
        desc: 'Nós 8–10 em cadeia (ordem numérica vs layout)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '5', Nos: [8, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [8, 9] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '2k', Nos: [9, 10] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '100n', Nos: [10, 0] }
        ]
    },
    {
        id: 'duas_fontes_tensao',
        desc: 'Duas fontes de tensão em nós diferentes',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '15', Nos: [1, 0] },
            { Componente: 'V2', Tipo: 'VoltageSource', Valor: '9', Nos: [2, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '3k', Nos: [1, 3] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '6k', Nos: [2, 3] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '9k', Nos: [3, 0] }
        ]
    },
    {
        id: 'fonte_corrente_serie',
        desc: 'Fonte de corrente em série na barra (não shunt)',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '5k', Nos: [1, 2] },
            { Componente: 'I1', Tipo: 'CurrentSource', Valor: '1m', Nos: [2, 3] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '2k', Nos: [3, 0] }
        ]
    },
    {
        id: 'ponte_wheatstone_mini',
        desc: 'Ponte com resistor de diagnóstico central',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '5', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '100', Nos: [2, 0] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '100', Nos: [1, 3] },
            { Componente: 'R4', Tipo: 'Resistor', Valor: '100', Nos: [3, 0] },
            { Componente: 'Rg', Tipo: 'Resistor', Valor: '1k', Nos: [2, 3] }
        ]
    },
    {
        id: 'rl_paralelo_carga',
        desc: 'R e L em paralelo como carga reativa',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '200', Nos: [2, 0] },
            { Componente: 'L1', Tipo: 'Inductor', Valor: '50m', Nos: [2, 0] }
        ]
    },
    {
        id: 'rc_paralelo_no4',
        desc: 'R série + ramo RC paralelo no secundário',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '2.2k', Nos: [2, 3] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '10u', Nos: [3, 0] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '4.7k', Nos: [3, 0] }
        ]
    },
    {
        id: 'cadeia_rlc_dupla',
        desc: 'Duas seções RLC em sequência',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [1, 2] },
            { Componente: 'L1', Tipo: 'Inductor', Valor: '10m', Nos: [2, 3] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '1u', Nos: [3, 4] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '220', Nos: [4, 5] },
            { Componente: 'C2', Tipo: 'Capacitor', Valor: '100n', Nos: [5, 0] }
        ]
    },
    {
        id: 'vazio_sem_componentes',
        desc: 'Lista vazia (deve avisar circuito vazio)',
        circuito: []
    }
];

function runCase(id, topologia) {
    const r = auditarEsquematico(topologia);
    return { id, ...r };
}

const results = [];

for (const [key, entry] of Object.entries(exemplos)) {
    const topologia = circuitoExemploParaTopologia(entry.circuito);
    results.push(runCase(`exemplo:${key}`, topologia));
}

for (const s of sinteticos) {
    const topologia = circuitoExemploParaTopologia(s.circuito);
    results.push(runCase(`sintetico:${s.id}`, topologia));
}

const failed = results.filter(r => !r.ok);
const warned = results.filter(r => r.ok && r.warnings.length > 0);

console.log('=== Auditoria do esquemático ===');
console.log(`Total: ${results.length}  |  OK: ${results.length - failed.length}  |  Erros: ${failed.length}  |  Avisos: ${warned.length}`);
console.log('');

if (failed.length) {
    console.log('--- ERROS ---');
    failed.forEach(r => {
        console.log(`[${r.id}]`);
        r.errors.forEach(e => console.log(`  ✗ ${e}`));
        r.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    });
    console.log('');
}

if (warned.length) {
    console.log('--- AVISOS (sem erro) ---');
    warned.forEach(r => {
        console.log(`[${r.id}]`);
        r.warnings.forEach(w => console.log(`  ⚠ ${w}`));
        const m = r.meta || {};
        if (m.trafosFallback) console.log(`  → trafos fallback: ${m.trafosFallback}, inline: ${m.trafosInline}`);
        if (m.satellites?.length) console.log(`  → satélites: [${m.satellites.join(', ')}]`);
    });
    console.log('');
}

console.log('--- Resumo por status ---');
const byStatus = {};
results.forEach(r => {
    const st = r.meta?.status || '?';
    byStatus[st] = (byStatus[st] || 0) + 1;
});
Object.entries(byStatus).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

process.exit(failed.length ? 1 : 0);
