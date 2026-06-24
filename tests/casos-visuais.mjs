/** Circuitos usados na regressão visual (screenshots PNG). */
export const casosVisuais = [
    {
        id: 'divisor',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '100', Nos: [2, 0] }
        ]
    },
    {
        id: 'trafo_integrado',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '1k', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 0, 3, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [3, 4] },
            { Componente: 'C1', Tipo: 'Capacitor', Valor: '100u', Nos: [4, 0] }
        ]
    },
    {
        id: 'trafo_pri_retorno_R',
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
        id: 'dois_trafos',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '10', Nos: [1, 0] },
            { Componente: 'T1', Tipo: 'Transformer', Valor: '1:1', Nos: [1, 0, 2, 0] },
            { Componente: 'T2', Tipo: 'Transformer', Valor: '1:2', Nos: [2, 0, 3, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '100', Nos: [3, 0] }
        ]
    },
    {
        id: 'ponte',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '12', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 2] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '1k', Nos: [2, 0] },
            { Componente: 'R3', Tipo: 'Resistor', Valor: '1k', Nos: [1, 3] },
            { Componente: 'R4', Tipo: 'Resistor', Valor: '1k', Nos: [3, 0] },
            { Componente: 'Rg', Tipo: 'Resistor', Valor: '500', Nos: [2, 3] }
        ]
    },
    {
        id: 'vcvs_amp',
        circuito: [
            { Componente: 'V1', Tipo: 'VoltageSource', Valor: '5', Nos: [1, 0] },
            { Componente: 'R1', Tipo: 'Resistor', Valor: '1k', Nos: [1, 0] },
            { Componente: 'E1', Tipo: 'VCVS', Valor: '3', Nos: [2, 0, 1, 0] },
            { Componente: 'R2', Tipo: 'Resistor', Valor: '10k', Nos: [2, 0] }
        ]
    }
];
