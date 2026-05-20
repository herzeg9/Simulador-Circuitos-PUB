const API_URL = "https://www.wolframcloud.com/obj/f4e13c39-ac72-4d0c-a5ce-43474d36f88f"; 

let idCounter = 1;

const exemplos = {
    "divisor": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "100", "Nos": [1, 2]},
        {"Componente": "R2", "Tipo": "Resistor", "Valor": "100", "Nos": [2, 0]}
    ],
    "ponte": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "12", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 2]},
        {"Componente": "R2", "Tipo": "Resistor", "Valor": "1k", "Nos": [2, 0]},
        {"Componente": "R3", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 3]},
        {"Componente": "R4", "Tipo": "Resistor", "Valor": "1k", "Nos": [3, 0]},
        {"Componente": "R_Ponte", "Tipo": "Resistor", "Valor": "500", "Nos": [2, 3]}
    ],
    "amp": [
        {"Componente": "V_In", "Tipo": "VoltageSource", "Valor": "5", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 0]},
        {"Componente": "E_Amp", "Tipo": "VCVS", "Valor": "3", "Nos": [2, 0, 1, 0]}, 
        {"Componente": "R_Carga", "Tipo": "Resistor", "Valor": "10k", "Nos": [2, 0]}
    ],
    "misto": [
         {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "20", "Nos": [1, 0]},
         {"Componente": "R1", "Tipo": "Resistor", "Valor": "2", "Nos": [1, 2]},
         {"Componente": "R2", "Tipo": "Resistor", "Valor": "2", "Nos": [2, 0]},
         {"Componente": "R3", "Tipo": "Resistor", "Valor": "2", "Nos": [2, 3]},
         {"Componente": "V2", "Tipo": "VoltageSource", "Valor": "10", "Nos": [3, 0]}
    ],
    "capacitor_dc": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 2]},
        {"Componente": "C1", "Tipo": "Capacitor", "Valor": "100u", "Nos": [2, 0]}
    ],
    "indutor_dc": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "100", "Nos": [1, 2]},
        {"Componente": "L1", "Tipo": "Inductor", "Valor": "100m", "Nos": [2, 0]}
    ],
    "vccs_amp": [
        {"Componente": "V_In", "Tipo": "VoltageSource", "Valor": "5", "Nos": [1, 0]},
        {"Componente": "R_In", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 0]},
        {"Componente": "G_Amp", "Tipo": "VCCS", "Valor": "0.01", "Nos": [2, 0, 1, 0]},
        {"Componente": "R_Carga", "Tipo": "Resistor", "Valor": "100", "Nos": [2, 0]}
    ],
    "ccvs_teste": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]},
        {"Componente": "R1", "Tipo": "Resistor", "Valor": "5", "Nos": [1, 2]},
        {"Componente": "H1", "Tipo": "CCVS", "Valor": "2", "Nos": [2, 0], "Alvo": "R1"}
    ],
    "cccs_bjt": [
        {"Componente": "I_Base", "Tipo": "CurrentSource", "Valor": "1m", "Nos": [1, 0]},
        {"Componente": "R_Base", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 0]},
        {"Componente": "F_BJT", "Tipo": "CCCS", "Valor": "100", "Nos": [2, 0], "Alvo": "R_Base"},
        {"Componente": "R_Col", "Tipo": "Resistor", "Valor": "10", "Nos": [2, 0]}
    ]
};

/**
 * Carrega um exemplo de circuito, limpando a lista atual e preenchendo com os componentes do exemplo selecionado.
 * @param {string} chave - Chave do exemplo a ser carregado (ex.: 'divisor', 'ponte', 'vccs_amp', 'ccvs_teste', 'cccs_bjt', ...).
 * @returns {void}
 */
function carregarExemplo(chave) {
    const ch = (chave == null ? '' : String(chave)).trim();
    if (!ch || !Object.prototype.hasOwnProperty.call(exemplos, ch)) return;

    const lista = document.getElementById('listaComponentes');
    if (!lista) return;

    lista.innerHTML = '';
    idCounter = 1;

    exemplos[ch].forEach(comp => {
        add(comp.Tipo, comp.Componente, comp.Nos, comp.Valor, comp.Alvo);
    });
}

/**
 * Remove todos os componentes da lista e reseta o contador de IDs.
 * @returns {void}
 */
function limparTudo() {
    const lista = document.getElementById('listaComponentes');
    lista.innerHTML = "";
    idCounter = 1;
}

/**
 * Valida se um valor numérico (após processar sufixos) é negativo.
 * Componentes que não podem ter valores negativos: Resistor, Capacitor
 * @param {string} tipo - Tipo do componente
 * @param {string} valorStr - String do valor (pode conter sufixos como 'k', 'm', etc)
 * @returns {boolean} - true se o valor é inválido (negativo), false caso contrário
 */
function validarValorNegativo(tipo, valorStr) {
    // Apenas Resistor e Capacitor não podem ter valores negativos
    if (tipo !== 'Resistor' && tipo !== 'Capacitor') {
        return false; // Não precisa validar para outros tipos
    }
    
    if (!valorStr || valorStr.trim() === '') {
        return false; // Valor vazio não é considerado negativo
    }
    
    // Remove espaços e verifica se começa com sinal negativo
    const valorLimpo = valorStr.trim();
    if (valorLimpo.startsWith('-')) {
        return true; // Valor negativo detectado
    }
    
    // Tenta extrair o número antes dos sufixos para verificar se é negativo
    const match = valorLimpo.match(/^-?\d+\.?\d*/);
    if (match) {
        const num = parseFloat(match[0]);
        if (num < 0) {
            return true; // Valor numérico negativo
        }
    }
    
    return false; // Valor válido
}

/**
 * Processa o valor do input e valida se é negativo para componentes que não permitem valores negativos.
 * @param {HTMLElement} input - Elemento input do valor
 * @param {string} tipo - Tipo do componente
 * @returns {void}
 */
function validarInputValor(input, tipo) {
    const valor = input.value.trim();
    const isNegativo = validarValorNegativo(tipo, valor);
    const wrapper = input.parentElement;
    
    // Remove classe de erro e tooltip existente
    input.classList.remove('error');
    let tooltip = wrapper.querySelector('.tooltip-error');
    if (tooltip) {
        tooltip.remove();
    }
    
    // Se for negativo, adiciona classe de erro e tooltip
    if (isNegativo) {
        input.classList.add('error');
        tooltip = document.createElement('span');
        tooltip.className = 'tooltip-error';
        tooltip.textContent = 'Valor não pode ser negativo!';
        wrapper.appendChild(tooltip);
        
        // Adiciona eventos para mostrar tooltip ao hover e foco (apenas uma vez)
        if (!wrapper.dataset.tooltipListeners) {
            const mostrarTooltip = () => {
                const tooltipAtual = wrapper.querySelector('.tooltip-error');
                if (tooltipAtual && input.classList.contains('error')) {
                    tooltipAtual.style.visibility = 'visible';
                    tooltipAtual.style.opacity = '1';
                }
            };
            const esconderTooltip = () => {
                if (!input.matches(':focus')) {
                    const tooltipAtual = wrapper.querySelector('.tooltip-error');
                    if (tooltipAtual) {
                        tooltipAtual.style.visibility = 'hidden';
                        tooltipAtual.style.opacity = '0';
                    }
                }
            };
            
            wrapper.addEventListener('mouseenter', mostrarTooltip);
            wrapper.addEventListener('mouseleave', esconderTooltip);
            input.addEventListener('focus', mostrarTooltip);
            input.addEventListener('blur', esconderTooltip);
            wrapper.dataset.tooltipListeners = 'true';
        }
    }
}

/** @returns {'DC'|'AC'} */
function getModoSimulacao() {
    const el = document.getElementById('toggleModoAc');
    return el && el.checked ? 'AC' : 'DC';
}

function escapeAttr(s) {
    return String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '\u003c');
}

function defaultValPorTipo(tipo, val) {
    if (val != null && val !== '') return String(val);
    if (tipo === 'VCVS' || tipo === 'VCCS' || tipo === 'CCVS' || tipo === 'CCCS') return '2';
    if (tipo === 'Capacitor') return '100u';
    if (tipo === 'Inductor') return '1m';
    return '1k';
}

/**
 * HTML dos controles de valor para VoltageSource / CurrentSource (blocos DC e AC no mesmo card).
 */
function buildFonteIndepValorHtml(tipo, val) {
    const v = defaultValPorTipo(tipo, val);
    return `
    <span class="src-val-dc">
        <span class="label-val">Val</span>
        <span class="val-input-wrapper"><input type="text" class="val-input val-input-dc" value="${escapeAttr(v)}" data-tipo="${tipo}"></span>
    </span>
    <span class="src-val-ac">
        <span class="label-val">Módulo</span>
        <span class="val-input-wrapper"><input type="text" class="val-input val-input-mod" value="${escapeAttr(v)}" data-tipo="${tipo}"></span>
        <span class="label-val">Fase (°)</span>
        <span class="val-input-wrapper"><input type="text" class="val-input val-input-fase" value="0" data-tipo="${tipo}"></span>
    </span>`;
}

function aplicarSufixosValor(valRaw) {
    if (!valRaw || !String(valRaw).trim()) return valRaw;
    return String(valRaw)
        .replace(/k/g, '*1000')
        .replace(/M/g, '*1000000')
        .replace(/m/g, '*0.001')
        .replace(/u/g, '*0.000001')
        .replace(/n/g, '*0.000000001')
        .replace(/p/g, '*0.000000000001');
}

/**
 * Sincroniza classe no body, painel de frequência e persistência do modo DC/AC.
 */
function sincronizarModoSimulacao() {
    const ac = getModoSimulacao() === 'AC';
    document.body.classList.toggle('modo-ac', ac);
    const painel = document.getElementById('painelConfigAc');
    if (painel) painel.hidden = !ac;
    try {
        localStorage.setItem('simModoAc', ac ? '1' : '0');
    } catch (e) { /* ignore */ }
}

function anexarListenersValorFonte(li, tipo) {
    li.querySelectorAll('.val-input-dc, .val-input-mod, .val-input-fase').forEach(inp => {
        inp.addEventListener('input', function() {
            validarInputValor(this, tipo);
        });
        inp.addEventListener('blur', function() {
            validarInputValor(this, tipo);
        });
    });
}

/**
 * Adiciona um componente à interface com base nos parâmetros especificados.
 * @param {string} tipo - O tipo de componente ('Resistor', 'VoltageSource', 'VCVS', etc).
 * @param {?string} nomeFixo - Um nome pré-definido para o componente, se existir.
 * @param {?Array<number>} nosInput - Array de nós para o componente, por exemplo: [1,0] para fontes e resistores; [out+,out-,in+,in-] para VCVS/VCCS; [out+,out-] para CCVS/CCCS.
 * @param {?string|number} val - O valor do componente (resistência, tensão, ganho...).
 * @param {?string} alvo - Para CCVS/CCCS: nome do componente alvo da corrente de controle (ex.: R1).
 * @returns {void}
 */
function add(tipo, nomeFixo=null, nosInput=null, val=null, alvo=null) {
    const lista = document.getElementById('listaComponentes');
    const id = idCounter++;
    const li = document.createElement('li');
    li.className = `comp-item type-${tipo}`;
    li.dataset.tipo = tipo;
    li.dataset.uid = 'cuid-' + id;

    // Setups dos nomes, rótulos, e quantidade/ordem de nós por tipo
    let label = 'Ω'; let nome = `R${id}`; let valLabel = "Val";
    let nA=1, nB=0, nC=1, nD=0;
    if(Array.isArray(nosInput)) {
        nA=nosInput[0]; nB=nosInput[1];
        if(nosInput.length>2) { nC=nosInput[2]; nD=nosInput[3]; }
    } else if (nosInput !== null) {
        nA = arguments[2]; nB = arguments[3];
    }

    let inputsNos = `
        <input type="number" class="no-a" value="${nA}" min="0" style="width:35px" placeholder="no+">
        <input type="number" class="no-b" value="${nB}" min="0" style="width:35px" placeholder="no-">`;

    if (tipo === 'VoltageSource') { label='V'; nome=`V${id}`; }
    if (tipo === 'CurrentSource') { label='A'; nome=`I${id}`; }
    if (tipo === 'Capacitor') { label='C'; nome=`C${id}`; }
    if (tipo === 'Inductor') { label='L'; nome=`L${id}`; }
    if (tipo === 'VCVS') {
        label = 'G';
        nome = `E${id}`;
        valLabel = 'Ganho';
        inputsNos = `
        <span style="font-size:0.7em; color:#9b59b6;">Out:</span>
        <input type="number" class="no-a" value="${nA}" style="width:30px">
        <input type="number" class="no-b" value="${nB}" style="width:30px">
        <span style="font-size:0.7em; color:#9b59b6;">In:</span>
        <input type="number" class="no-c" value="${nC}" style="width:30px">
        <input type="number" class="no-d" value="${nD}" style="width:30px">`;
    }
    if (tipo === 'VCCS') {
        label = 'G';
        nome = `G${id}`;
        valLabel = 'Transcond.';
        inputsNos = `
        <span style="font-size:0.7em; color:#9b59b6;">Out:</span>
        <input type="number" class="no-a" value="${nA}" style="width:30px">
        <input type="number" class="no-b" value="${nB}" style="width:30px">
        <span style="font-size:0.7em; color:#9b59b6;">In:</span>
        <input type="number" class="no-c" value="${nC}" style="width:30px">
        <input type="number" class="no-d" value="${nD}" style="width:30px">`;
    }
    if (tipo === 'CCVS') {
        label = 'H';
        nome = `H${id}`;
        valLabel = 'Transres.';
        inputsNos = `
        <span style="font-size:0.7em; color:#9b59b6;">Out:</span>
        <input type="number" class="no-a" value="${nA}" style="width:30px">
        <input type="number" class="no-b" value="${nB}" style="width:30px">
        <input type="text" class="alvo-comp" placeholder="Comp. Alvo (ex: R1)">`;
    }
    if (tipo === 'CCCS') {
        label = 'F';
        nome = `F${id}`;
        valLabel = 'Ganho';
        inputsNos = `
        <span style="font-size:0.7em; color:#9b59b6;">Out:</span>
        <input type="number" class="no-a" value="${nA}" style="width:30px">
        <input type="number" class="no-b" value="${nB}" style="width:30px">
        <input type="text" class="alvo-comp" placeholder="Comp. Alvo (ex: R1)">`;
    }

    const defVal = defaultValPorTipo(tipo, val);
    let valorSecaoHtml = `
        <span style="font-size:0.8em; color:#999; margin-left:5px">${valLabel}</span>
        <span class="val-input-wrapper">
            <input type="text" class="val-input" value="${escapeAttr(defVal)}" data-tipo="${tipo}">
        </span>`;
    if (tipo === 'VoltageSource' || tipo === 'CurrentSource') {
        valorSecaoHtml = buildFonteIndepValorHtml(tipo, val);
    }

    // Estrutura HTML personalizada do componente na interface
    li.innerHTML = `
        <span class="comp-badge">${label}</span>
        <input type="text" class="nome-comp" value="${nomeFixo || nome}" style="width:50px; font-weight:bold;">
        <div class="nodes-group">${inputsNos}</div>
        ${valorSecaoHtml}
        <button type="button" class="btn-relacionar" onclick="abrirDialogoRelacionar(this.parentElement)" title="Adicionar componente relacionado (s\u00e9rie / paralelo)" aria-label="Adicionar componente em s\u00e9rie ou paralelo">+</button>
        <button class="btn-del" onclick="removerComponente(this.parentElement)">×</button>
    `;
    lista.appendChild(li);

    const alvoInput = li.querySelector('.alvo-comp');
    if (alvoInput && alvo != null && alvo !== '') {
        alvoInput.value = String(alvo);
    }

    if (tipo === 'VoltageSource' || tipo === 'CurrentSource') {
        anexarListenersValorFonte(li, tipo);
        if (val) {
            const dc = li.querySelector('.val-input-dc');
            const mod = li.querySelector('.val-input-mod');
            if (dc) validarInputValor(dc, tipo);
            if (mod) validarInputValor(mod, tipo);
        }
    } else {
        const valInput = li.querySelector('.val-input');
        if (valInput) {
            valInput.addEventListener('input', function() {
                validarInputValor(this, tipo);
            });
            valInput.addEventListener('blur', function() {
                validarInputValor(this, tipo);
            });
            if (val) {
                validarInputValor(valInput, tipo);
            }
        }
    }
}

/**
 * Monta o payload de simulação: Config (modo DC/AC, frequência em AC) + Netlist.
 * Em AC, fontes independentes usam chaves Modulo e Fase (graus); nos demais casos, Valor.
 * Sufixos k, M, m, u, n, p aplicam-se a Valor/Modulo via aplicarSufixosValor.
 *
 * @returns {{ Config: { Modo: string, Frequencia: number }, Netlist: Array<Object> }}
 */
function gerarJSON() {
    const modo = getModoSimulacao();
    const itens = document.querySelectorAll('.comp-item');
    const netlist = [];
    const nomeComp = (item) => item.querySelector('.nome-comp').value;

    itens.forEach(item => {
        const tipo = item.dataset.tipo;
        const fonteIndep = tipo === 'VoltageSource' || tipo === 'CurrentSource';

        let nos = [];
        if (tipo === 'VCVS' || tipo === 'VCCS') {
            nos = [
                parseInt(item.querySelector('.no-a').value, 10),
                parseInt(item.querySelector('.no-b').value, 10),
                parseInt(item.querySelector('.no-c').value, 10),
                parseInt(item.querySelector('.no-d').value, 10)
            ];
        } else if (tipo === 'CCVS' || tipo === 'CCCS') {
            nos = [
                parseInt(item.querySelector('.no-a').value, 10),
                parseInt(item.querySelector('.no-b').value, 10)
            ];
        } else {
            nos = [
                parseInt(item.querySelector('.no-a').value, 10),
                parseInt(item.querySelector('.no-b').value, 10)
            ];
        }

        const compObj = {
            "Componente": nomeComp(item),
            "Tipo": tipo,
            "Nos": nos
        };

        if (modo === 'AC' && fonteIndep) {
            const modIn = item.querySelector('.val-input-mod');
            const faseIn = item.querySelector('.val-input-fase');
            let modRaw = (modIn && modIn.value.trim()) ? modIn.value.trim() : '';
            if (!modRaw) {
                modRaw = nomeComp(item);
            } else {
                modRaw = aplicarSufixosValor(modRaw);
            }
            const faseStr = (faseIn && faseIn.value.trim()) ? faseIn.value.trim() : '0';
            compObj["Modulo"] = modRaw;
            compObj["Fase"] = faseStr;
        } else {
            const valEl = fonteIndep
                ? item.querySelector('.val-input-dc')
                : item.querySelector('.val-input');
            let valRaw = valEl ? valEl.value.trim() : '';
            if (!valRaw) {
                valRaw = nomeComp(item);
            } else {
                valRaw = aplicarSufixosValor(valRaw);
            }
            compObj["Valor"] = valRaw;
        }

        if (tipo === 'CCVS' || tipo === 'CCCS') {
            const alvoEl = item.querySelector('.alvo-comp');
            compObj["Alvo"] = alvoEl ? alvoEl.value.trim() : '';
        }
        netlist.push(compObj);
    });

    const freqEl = document.getElementById('inputFrequenciaAc');
    const f = freqEl ? parseFloat(freqEl.value) : NaN;
    const config = {
        "Modo": modo,
        "Frequencia": Number.isFinite(f) ? f : 60
    };

    return { "Config": config, "Netlist": netlist };
}

/**
 * Valida todos os componentes antes de enviar para a API.
 * Verifica se há valores negativos em Resistências ou Capacitâncias.
 * @returns {Object} - {valido: boolean, erros: Array<string>}
 */
function validarAntesEnvio() {
    const erros = [];
    const itens = document.querySelectorAll('.comp-item');
    
    const modoAc = getModoSimulacao() === 'AC';
    itens.forEach(item => {
        const tipo = item.dataset.tipo;
        const fonteIndep = tipo === 'VoltageSource' || tipo === 'CurrentSource';
        const valInput = fonteIndep
            ? (modoAc ? item.querySelector('.val-input-mod') : item.querySelector('.val-input-dc'))
            : item.querySelector('.val-input');

        if (valInput) {
            const valor = valInput.value.trim();
            if (validarValorNegativo(tipo, valor)) {
                const nomeC = item.querySelector('.nome-comp').value || 'Componente sem nome';
                erros.push(`${nomeC} (${tipo}): valor não pode ser negativo`);
                validarInputValor(valInput, tipo);
            }
        }
    });
    
    return {
        valido: erros.length === 0,
        erros: erros
    };
}

/**
 * Tabela de prefixos SI usada por `formatMagnitudeEng`.
 * Ordem decrescente: o primeiro prefixo cuja base é <= |valor| ganha.
 */
const ENG_PREFIXES = [
    { v: 1e12, s: 'T' },
    { v: 1e9,  s: 'G' },
    { v: 1e6,  s: 'M' },
    { v: 1e3,  s: 'k' },
    { v: 1,    s: ''  },
    { v: 1e-3, s: 'm' },
    { v: 1e-6, s: 'µ' },
    { v: 1e-9, s: 'n' },
    { v: 1e-12,s: 'p' }
];

/**
 * Converte um número para notação de engenharia (mantissa em [1, 1000)) com
 * 3 algarismos significativos e o prefixo SI correspondente.
 *
 * - 0.0015   -> { mantissa: '1.50', prefix: 'm' }
 * - 3000     -> { mantissa: '3.00', prefix: 'k' }
 * - 20       -> { mantissa: '20.0', prefix: ''  }
 * - 1234567  -> { mantissa: '1.23', prefix: 'M' }
 * - 5e-7     -> { mantissa: '500',  prefix: 'n' }
 * - 0        -> { mantissa: '0',    prefix: ''  }
 *
 * @param {number} num
 * @returns {{mantissa:string, prefix:string}}
 */
function formatMagnitudeEng(num) {
    if (!Number.isFinite(num)) return { mantissa: String(num), prefix: '' };
    const abs = Math.abs(num);
    if (abs === 0) return { mantissa: '0', prefix: '' };
    const sign = num < 0 ? '-' : '';
    const rounded = Number(abs.toPrecision(3));
    let selected = ENG_PREFIXES[ENG_PREFIXES.length - 1];
    for (const p of ENG_PREFIXES) {
        if (rounded >= p.v) { selected = p; break; }
    }
    const mantissa = rounded / selected.v;
    return { mantissa: sign + mantissa.toPrecision(3), prefix: selected.s };
}

/**
 * Formata uma fase (em graus) com no máximo 2 casas decimais, removendo zeros
 * e ponto desnecessários ao final.
 *
 * - 60.0   -> '60'
 * - -97.38 -> '-97.38'
 * - -8.2   -> '-8.2'
 *
 * @param {number} fase
 * @returns {string}
 */
function formatFaseLimpa(fase) {
    if (!Number.isFinite(fase)) return String(fase);
    return String(parseFloat(fase.toFixed(2)));
}

/**
 * Reformata um par (ValorNumerico, Unidade) vindo da API para notação de
 * engenharia com prefixo SI concatenado à unidade.
 *
 * - ('0.0015 ∠ -8.2°', 'A') -> { valor: '1.50 ∠ -8.2°', unidade: 'mA' }
 * - ('3000.', 'V')          -> { valor: '3.00',         unidade: 'kV' }
 * - ('20. ∠ 60.°', 'V')     -> { valor: '20.0 ∠ 60°',   unidade: 'V'  }
 *
 * Se o valor não puder ser interpretado, devolve a string original.
 *
 * @param {string} valorStr
 * @param {string} unidade
 * @returns {{valor:string, unidade:string}}
 */
function formatarResultadoEng(valorStr, unidade) {
    const polar = parsePolar(valorStr);
    if (!polar) return { valor: valorStr, unidade: unidade || '' };
    const isPolar = /[\u2220<]/.test(String(valorStr || ''));
    if (isPolar) {
        const { mantissa, prefix } = formatMagnitudeEng(polar.mod);
        const fase = formatFaseLimpa(polar.fase);
        return { valor: `${mantissa} ∠ ${fase}°`, unidade: prefix + (unidade || '') };
    }
    const signed = polar.fase === 180 ? -polar.mod : polar.mod;
    const { mantissa, prefix } = formatMagnitudeEng(signed);
    return { valor: mantissa, unidade: prefix + (unidade || '') };
}

/**
 * Sanitiza equações vindas do backend em modo AC para renderização AsciiMath.
 *
 * Motivação: o cleanTeX do Wolfram (IC_1905.nb) faz StringReplace["}" -> ""],
 * que elimina TODAS as chaves fechadas do output do TeXForm. Em DC isso é
 * inofensivo, mas fontes fasoriais geram saídas como
 *     20 e^{60 i {}^{\circ }}
 * que após o strip viram
 *     20 e^{60 i {{\circ
 * (chaves desbalanceadas + \circ pendurado), e o MathJax/AsciiMath renderiza
 * isso como uma sopa visual (ex: "20e^{60i{ˆ{o").
 *
 * Esta função detecta a forma corrompida e a substitui pela notação polar
 * AsciiMath /_ (que renderiza como ∠), didaticamente mais clara.
 * Não altera o backend (consome o que ele já manda).
 *
 * @param {string} eq
 * @returns {string}
 */
function limparEquacaoAC(eq) {
    let s = String(eq);
    s = s.replace(/\{*\s*\^?\s*\{*\\circ\b\s*\}*/g, '°');
    s = s.replace(/\{*\s*\^?\s*\{*\\degree\b\s*\}*/g, '°');
    s = s.replace(
        /(\d+(?:\.\d+)?)\s*e\^\{(-?\d+(?:\.\d+)?)\s*i\s*°\s*\}?/g,
        '$1 /_ ($2°)'
    );
    return s;
}

/* ============================================================
 * FASE 3.A — Diagrama Fasorial (SVG nativo)
 * Consome dados.Resultados; ativa-se apenas em modo AC.
 * ============================================================ */

/**
 * Converte uma string em coordenadas polares para {mod, fase} (fase em graus).
 * Aceita formatos: "10 ∠ 45°", "10∠45°", "10 < 45", "5.5e-3 ∠ -90°".
 * Para números puros, devolve {mod: |x|, fase: 0 (ou 180 se negativo)}.
 *
 * @param {string|number} s
 * @returns {?{mod:number, fase:number, isPolar:boolean}}
 */
function parsePolar(s) {
    if (s == null) return null;
    const str = String(s).trim();
    if (!str) return null;

    // Aceita formatos do Wolfram N[]: "10.", "10.5", ".5", "10e-3", "5.5e3"
    const numPart = '-?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const reAng = new RegExp('^(' + numPart + ')\\s*[\\u2220<]\\s*(' + numPart + ')\\s*[°º]?$');
    const m = str.match(reAng);
    if (m) {
        const mod = parseFloat(m[1]);
        const fase = parseFloat(m[2]);
        if (Number.isFinite(mod) && Number.isFinite(fase)) {
            return { mod: Math.abs(mod), fase: mod < 0 ? fase + 180 : fase, isPolar: true };
        }
    }

    const num = parseFloat(str);
    if (Number.isFinite(num)) {
        return { mod: Math.abs(num), fase: num < 0 ? 180 : 0, isPolar: false };
    }
    return null;
}

/**
 * Classifica um resultado como 'V' (tensão) ou 'I' (corrente)
 * inspecionando Unidade e Local.
 *
 * @param {{Local:string, Unidade:string}} r
 * @returns {'V'|'I'}
 */
function classificarFasor(r) {
    const u = String(r.Unidade || '').trim();
    if (/^A\b|amp/i.test(u)) return 'I';
    if (/^V\b|volt/i.test(u)) return 'V';
    return /^i[_\W]/i.test(r.Local || '') ? 'I' : 'V';
}

/**
 * Desenha um único plot fasorial em SVG, normalizado pelo maior módulo do grupo.
 *
 * @param {Array<{mod:number, fase:number, local:string, unidade:string}>} fasores
 * @param {string} cor - cor base dos vetores (hex)
 * @param {string} titulo - título do plot
 * @returns {string} - HTML string do bloco SVG
 */
function drawPhasorPlot(fasores, cor, titulo) {
    if (!fasores.length) return '';

    const W = 460, H = 460;
    const cx = W / 2, cy = H / 2;
    const R = 180;
    const maxMod = Math.max(...fasores.map(f => f.mod), Number.EPSILON);
    const scale = R / maxMod;

    const markerId = `arrow-${cor.replace('#', '')}`;
    const parts = [];

    parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="fasorial-svg" role="img" aria-label="${titulo}">`);
    parts.push(`<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${cor}"/></marker></defs>`);

    [0.25, 0.5, 0.75, 1].forEach(frac => {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${(R * frac).toFixed(2)}" fill="none" stroke="var(--fasor-grid)" stroke-dasharray="3 3" stroke-width="1"/>`);
    });

    for (let ang = 0; ang < 360; ang += 30) {
        const rad = ang * Math.PI / 180;
        const x2 = cx + R * Math.cos(rad);
        const y2 = cy - R * Math.sin(rad);
        parts.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="var(--fasor-grid)" stroke-dasharray="2 5" stroke-width="0.6"/>`);
    }

    parts.push(`<line x1="${cx - R - 28}" y1="${cy}" x2="${cx + R + 28}" y2="${cy}" stroke="var(--fasor-axis)" stroke-width="1.4"/>`);
    parts.push(`<line x1="${cx}" y1="${cy - R - 28}" x2="${cx}" y2="${cy + R + 28}" stroke="var(--fasor-axis)" stroke-width="1.4"/>`);

    parts.push(`<text x="${cx + R + 30}" y="${cy + 5}" font-size="14" font-style="italic" fill="var(--fasor-axis-label)">Re</text>`);
    parts.push(`<text x="${cx - 8}" y="${cy - R - 30}" font-size="14" font-style="italic" fill="var(--fasor-axis-label)" text-anchor="end">Im</text>`);
    parts.push(`<text x="${cx + R + 8}" y="${cy - 6}" font-size="10" fill="var(--fasor-axis-label)">${maxMod.toPrecision(3)}</text>`);
    parts.push(`<text x="${cx + (R / 2) + 4}" y="${cy - 6}" font-size="10" fill="var(--fasor-axis-label)">${(maxMod / 2).toPrecision(3)}</text>`);

    const tipLabels = [];
    fasores.forEach(f => {
        if (!Number.isFinite(f.mod) || !Number.isFinite(f.fase)) return;
        const rad = f.fase * Math.PI / 180;
        const x2 = cx + f.mod * scale * Math.cos(rad);
        const y2 = cy - f.mod * scale * Math.sin(rad);
        parts.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${cor}" stroke-width="2.6" marker-end="url(#${markerId})" stroke-linecap="round"/>`);

        const offset = 16;
        const lx = x2 + offset * Math.cos(rad);
        const ly = y2 - offset * Math.sin(rad);
        const anchor = Math.cos(rad) > 0.3 ? 'start' : (Math.cos(rad) < -0.3 ? 'end' : 'middle');
        tipLabels.push(`<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" font-size="12" fill="${cor}" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle" paint-order="stroke" stroke="var(--bg-card)" stroke-width="3">${f.local}</text>`);
    });
    parts.push(tipLabels.join(''));

    parts.push(`<text x="${cx}" y="20" font-size="13" font-weight="700" text-anchor="middle" fill="${cor}">${titulo}</text>`);

    parts.push(`</svg>`);
    return parts.join('');
}

/**
 * Constrói o card de Diagrama Fasorial a partir dos Resultados da API.
 * Separa em até dois plots (tensões e correntes) com escalas independentes.
 *
 * @param {Array<{Local:string, ValorNumerico:string, Unidade:string}>} resultados
 * @param {HTMLElement} container
 * @returns {void}
 */
function renderFasorial(resultados, container) {
    if (!Array.isArray(resultados) || !resultados.length) return;

    /** @type {Array<{mod:number, fase:number, local:string, unidade:string, tipo:'V'|'I'}>} */
    const fasores = [];
    resultados.forEach(r => {
        const p = parsePolar(r.ValorNumerico);
        if (!p || !(p.mod > 0)) return;
        fasores.push({
            mod: p.mod,
            fase: p.fase,
            local: String(r.Local || ''),
            unidade: r.Unidade || '',
            tipo: classificarFasor(r)
        });
    });
    if (!fasores.length) return;

    const fV = fasores.filter(f => f.tipo === 'V');
    const fI = fasores.filter(f => f.tipo === 'I');

    const plotV = drawPhasorPlot(fV, '#e74c3c', 'Tensões nodais (V)');
    const plotI = drawPhasorPlot(fI, '#27ae60', 'Correntes de ramo (A)');

    const itemLegenda = (f, cor) => {
        const { mantissa, prefix } = formatMagnitudeEng(f.mod);
        const fase = formatFaseLimpa(f.fase);
        return `<div class="fasor-legend-item">
            <span class="fasor-legend-dot" style="background:${cor}"></span>
            <span class="fasor-legend-name">${f.local}</span>
            <span class="fasor-legend-val">${mantissa} ∠ ${fase}° ${prefix}${f.unidade || ''}</span>
        </div>`;
    };

    const legendV = fV.map(f => itemLegenda(f, '#e74c3c')).join('');
    const legendI = fI.map(f => itemLegenda(f, '#27ae60')).join('');

    const escalaNote = (fV.length > 0 && fI.length > 0)
        ? `<p class="fasor-note">As escalas de tensão e corrente são normalizadas independentemente para preservar a leitura angular. Os módulos absolutos aparecem na legenda.</p>`
        : `<p class="fasor-note">Os vetores estão normalizados pelo maior módulo do grupo. Confira os valores absolutos na legenda.</p>`;

    const card = document.createElement('div');
    card.className = 'card card-fasorial';
    card.innerHTML = `
        <h3 class="section-title">📐 5. Diagrama Fasorial</h3>
        ${escalaNote}
        <div class="fasorial-grid${(fV.length && fI.length) ? ' fasorial-grid--dual' : ''}">
            ${fV.length ? `<div class="fasorial-cell"><div class="fasorial-svg-wrap">${plotV}</div><div class="fasorial-legend fasorial-legend--v">${legendV}</div></div>` : ''}
            ${fI.length ? `<div class="fasorial-cell"><div class="fasorial-svg-wrap">${plotI}</div><div class="fasorial-legend fasorial-legend--i">${legendI}</div></div>` : ''}
        </div>
    `;
    container.appendChild(card);
}

/**
 * Realiza o envio do circuito (netlist) para a API Wolfram Cloud e exibe os resultados processados na interface.
 * Exibe também indicadores de carregamento, trata erros e mostra resultados múltiplos (equações, superposição, malhas etc.).
 * @returns {Promise<void>}
 */
async function calcular() {
    const divRes = document.getElementById('resultado');
    const load = document.getElementById('loading');

    if (typeof ativarTab === 'function') ativarTab('resultados');

    // Validação antes de enviar
    const validacao = validarAntesEnvio();
    if (!validacao.valido) {
        divRes.innerHTML = `<div class="card" style="color:red; border-left: 5px solid #e74c3c;">
            <h3 style="color:#e74c3c; margin-top:0;">❌ Erros de Validação</h3>
            <p><strong>Corrija os seguintes erros antes de calcular:</strong></p>
            <ul style="margin:10px 0; padding-left:20px;">
                ${validacao.erros.map(erro => `<li>${erro}</li>`).join('')}
            </ul>
        </div>`;
        return;
    }

    const netlistObj = gerarJSON();
    const listaComp = netlistObj.Netlist;

    // --- NOVO CÓDIGO DE BLOQUEIO AQUI ---
    if (!listaComp || listaComp.length === 0) {
        divRes.innerHTML = `<div class="card" style="color:#e67e22; border-left: 5px solid #e67e22;">
            <h3 style="margin-top:0;">⚠️ Circuito Vazio</h3>
            <p>Adicione pelo menos um componente à área de trabalho antes de analisar.</p>
        </div>`;
        return;
    }
    // ------------------------------------
    
    // Verifica se o circuito possui componentes reativos (Capacitor ou Indutor)
    const temComponentesReativos = listaComp.some(comp => comp.Tipo === 'Capacitor' || comp.Tipo === 'Inductor');
    load.style.display = "block";
    
    const formData = new FormData();
    formData.append("netlist", JSON.stringify(netlistObj));

    try {
        const resp = await fetch(API_URL, { method: "POST", body: formData });
        const dados = await resp.json();
        load.style.display = "none";
        divRes.innerHTML = "";

        if (dados.Erro) { 
            divRes.innerHTML = `<div class="card" style="color:red">❌ ${dados.Erro}</div>`; 
            return; 
        }

        if (dados.Equacoes) {
            let html = `<div class="card"><h3 class="section-title">📝 1. Equações do Sistema (MNA)</h3>`;
            dados.Equacoes.forEach(eq => {
                const limpa = limparEquacaoAC(eq).replace("==", "=");
                html += `<div class="formula">\` ${limpa} \`</div>`;
            });
            divRes.innerHTML += html + `</div>`;
        }

        // Superposição: a API pode omitir a chave, enviar null ou [] — ainda assim mostramos o bloco 2 com passos ou avisos locais.
        if (Array.isArray(dados.Superposicao) && dados.Superposicao.length > 0) {
            let html = `<div class="card"><h3 class="section-title">🧩 2. Superposição</h3><div class="super-container">`;
            dados.Superposicao.forEach(passo => {
                html += `<div class="super-card"><div class="didactic-text">Fonte Ativa: <strong>${passo.FonteAtiva}</strong></div>`;
                passo.ResultadosParciais.forEach((res, idx) => {
                     let no = dados.NosLista[idx];
                     html += `<div class="formula" style="font-size:1em;">\` v_${no} = ${res} \`</div>`;
                });
                html += `</div>`;
            });
            divRes.innerHTML += html + `</div></div>`;
        } else {
            const qtdFontes = listaComp.filter(c => c.Tipo === 'VoltageSource' || c.Tipo === 'CurrentSource').length;
            const temFontesDependentes = listaComp.some(c =>
                c.Tipo === 'VCVS' || c.Tipo === 'VCCS' || c.Tipo === 'CCVS' || c.Tipo === 'CCCS'
            );

            const avisoSuper = (msg) => `<div class="card"><h3 class="section-title">🧩 2. Superposição</h3><div style="background:#fffcf5; border-left:5px solid #f1c40f; padding:12px; border-radius:6px;"><p style="margin:0;">⚠️ <em>${msg}</em></p></div></div>`;

            if (qtdFontes <= 1 && !temComponentesReativos) {
                divRes.innerHTML += avisoSuper('A Superposição não é aplicável pois o circuito possui apenas uma fonte independente.');
            } else if (temComponentesReativos || temFontesDependentes) {
                const msgSuperposicao = temComponentesReativos
                    ? 'A Superposição passo-a-passo foi ocultada pois o circuito contém Fontes Dependentes ou Componentes Reativos (L/C).'
                    : 'A Superposição passo-a-passo foi ocultada pois o circuito contém Fontes Dependentes.';
                divRes.innerHTML += avisoSuper(msgSuperposicao);
            } else {
                divRes.innerHTML += avisoSuper('Os dados de superposição passo-a-passo não vieram na resposta do servidor (lista vazia ou campo ausente), embora o circuito tenha várias fontes independentes.');
            }
        }

        if (dados.Resultados) {
            let html = `<div class="card"><h3 class="section-title">🎯 3. Resultados Finais</h3>`;
            dados.Resultados.forEach(r => {
                const f = formatarResultadoEng(r.ValorNumerico, r.Unidade);
                html += `<div style="border-bottom:1px solid #eee; margin-bottom:10px;"><strong>${r.Local}:</strong><div class="numeric-result">= ${f.valor} ${f.unidade}</div></div>`;
            });
            divRes.innerHTML += html + `</div>`;
        }

        if (getModoSimulacao() === 'AC' && Array.isArray(dados.Resultados)) {
            renderFasorial(dados.Resultados, divRes);
        }

        if (dados.Malhas) {
            let html = `<div class="card" style="border-left: 5px solid #8e44ad;"><h3 class="section-title" style="color: #8e44ad;">🔄 4. Análise de Malhas</h3>`;
            if (dados.Malhas.length === 0) {
                 html += `<p style="color:#999;">Topologia simples ou linear (sem laços fundamentais detectados).</p>`;
            } else {
                dados.Malhas.forEach((malha, idx) => {
                    html += `<div style="background:#f9f9f9; padding:10px; margin-bottom:10px; border-radius:5px;"><strong>Malha ${idx + 1}:</strong> <span style="font-size:0.9em">${malha.Descricao}</span><div class="formula">\` \\sum V = ${malha.Equacao} \`</div></div>`;
                });
            }
            divRes.innerHTML += html + `</div>`;
        }
        MathJax.typeset();
    } catch (e) {
        load.style.display = "none";
        divRes.innerHTML = `<div class="card" style="color:red">❌ ${e.message}</div>`;
    }
}

/* ============================================================
 * FASE 3.B — Esquemático ao vivo (SVG nativo, símbolos IEEE)
 * Consome o estado atual do DOM via getTopologiaAtual().
 * Não altera gerarJSON nem o contrato com a API.
 * ============================================================ */

const ESQ = {
    LANE_W: 90,
    SERIES_ROW_H: 55,
    SERIES_BASE_OFFSET: 50,
    BODY: 50,
    MARGIN_X: 80,
    SPACING_MIN: 200,
    NODE_R: 14,
    SHUNT_HEIGHT: 220
};

function escapeXml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Lê o DOM e devolve a topologia atual do circuito (sem validação).
 * Ignora itens com nós inválidos. Usado pelo preview ao vivo.
 *
 * @returns {Array<{tipo:string, nome:string, nA:number, nB:number, nC:?number, nD:?number, valor:string, alvo:?string}>}
 */
function getTopologiaAtual() {
    const itens = document.querySelectorAll('.comp-item');
    const lista = [];
    const modoAc = getModoSimulacao() === 'AC';
    itens.forEach(item => {
        const tipo = item.dataset.tipo;
        const nomeEl = item.querySelector('.nome-comp');
        const nome = nomeEl ? (nomeEl.value || '?').trim() : '?';
        const nA = parseInt((item.querySelector('.no-a')?.value ?? '').trim(), 10);
        const nB = parseInt((item.querySelector('.no-b')?.value ?? '').trim(), 10);
        if (!Number.isFinite(nA) || !Number.isFinite(nB)) return;
        if (nA === nB) return;
        let nC = null, nD = null;
        if (tipo === 'VCVS' || tipo === 'VCCS') {
            const ncv = parseInt((item.querySelector('.no-c')?.value ?? '').trim(), 10);
            const ndv = parseInt((item.querySelector('.no-d')?.value ?? '').trim(), 10);
            if (Number.isFinite(ncv) && Number.isFinite(ndv)) { nC = ncv; nD = ndv; }
        }
        const fonteIndep = tipo === 'VoltageSource' || tipo === 'CurrentSource';
        let valor = '';
        if (fonteIndep) {
            const dc = item.querySelector('.val-input-dc');
            const mod = item.querySelector('.val-input-mod');
            const fas = item.querySelector('.val-input-fase');
            if (modoAc) {
                const m = (mod?.value || '').trim();
                const f = (fas?.value || '0').trim();
                valor = m ? (f && f !== '0' ? `${m}∠${f}°` : m) : '';
            } else {
                valor = (dc?.value || '').trim();
            }
        } else {
            valor = (item.querySelector('.val-input')?.value || '').trim();
        }
        const alvoEl = item.querySelector('.alvo-comp');
        const alvo = alvoEl ? alvoEl.value.trim() : null;
        lista.push({ tipo, nome, nA, nB, nC, nD, valor, alvo });
    });
    return lista;
}

/**
 * Classifica componentes em shunts (um terminal no GND) e series (entre dois nós não-GND).
 * @param {Array} topologia
 */
function analyzeTopology(topologia) {
    const nodesSet = new Set();
    topologia.forEach(c => {
        nodesSet.add(c.nA); nodesSet.add(c.nB);
        if (c.nC != null) nodesSet.add(c.nC);
        if (c.nD != null) nodesSet.add(c.nD);
    });
    const nonGroundNodes = [...nodesSet].filter(n => n !== 0).sort((a, b) => a - b);

    const shunts = [];
    const series = [];

    topologia.forEach(c => {
        const aIsGnd = c.nA === 0;
        const bIsGnd = c.nB === 0;
        if (aIsGnd && bIsGnd) return;
        if (aIsGnd || bIsGnd) {
            shunts.push({
                ...c,
                nodeUp: aIsGnd ? c.nB : c.nA,
                positiveOnTop: !aIsGnd
            });
        } else {
            series.push({
                ...c,
                left: Math.min(c.nA, c.nB),
                right: Math.max(c.nA, c.nB),
                positiveOnLeft: c.nA < c.nB
            });
        }
    });

    return { nonGroundNodes, shunts, series };
}

function assignSeriesRows(series) {
    series.sort((a, b) => a.left - b.left || a.right - b.right);
    series.forEach(s => { s._row = 0; });
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        let row = 0;
        while (series.some((o, idx) => idx < i && o._row === row && !(o.right <= s.left || o.left >= s.right))) {
            row++;
        }
        s._row = row;
    }
}

/**
 * Consolida componentes série em "chains": cada chain é uma sequência de
 * componentes que atravessam nós internos (grau 2 no subgrafo sem terra,
 * sem shunts). Esses nós internos são considerados invisíveis no
 * esquemático — viram apenas continuação de fio entre componentes em série.
 *
 * Os dois nós das extremidades de uma chain são sempre "visíveis"
 * (não-internos). Para uma chain de 1 componente, o resultado é
 * equivalente ao componente série isolado, mantendo compatibilidade.
 *
 * @param {Array} series - Componentes série brutos (saída de analyzeTopology).
 * @param {Array} shunts - Componentes a terra (saída de analyzeTopology).
 * @param {number[]} nonGroundNodes - Lista de nós não-terra.
 * @returns {{ visibleNodes: number[], hiddenNodes: number[], chains: Array }}
 */
function consolidateSeries(series, shunts, nonGroundNodes) {
    const degSeries = {};
    series.forEach(c => {
        degSeries[c.nA] = (degSeries[c.nA] || 0) + 1;
        degSeries[c.nB] = (degSeries[c.nB] || 0) + 1;
    });
    const hasShunt = new Set();
    shunts.forEach(s => hasShunt.add(s.nodeUp));

    const isInternal = (n) => degSeries[n] === 2 && !hasShunt.has(n) && n !== 0;

    const adj = new Map();
    series.forEach(c => {
        if (!adj.has(c.nA)) adj.set(c.nA, []);
        if (!adj.has(c.nB)) adj.set(c.nB, []);
        adj.get(c.nA).push({ comp: c, otherEnd: c.nB });
        adj.get(c.nB).push({ comp: c, otherEnd: c.nA });
    });

    const used = new Set();

    function walkChain(startNode, firstComp) {
        const list = [];
        let cur = startNode;
        let lastComp = firstComp;
        const seenNodes = new Set();
        while (isInternal(cur) && !seenNodes.has(cur)) {
            seenNodes.add(cur);
            const candidates = adj.get(cur) || [];
            const next = candidates.find(x => x.comp !== lastComp && !used.has(x.comp));
            if (!next) break;
            used.add(next.comp);
            const incoming = (next.comp.nA === cur) ? 'A' : 'B';
            list.push({ comp: next.comp, incomingTerminal: incoming });
            cur = next.otherEnd;
            lastComp = next.comp;
        }
        return { list, endNode: cur };
    }

    const chains = [];
    for (const c of series) {
        if (used.has(c)) continue;
        used.add(c);

        const rightWalk = walkChain(c.nB, c);
        const leftWalk = walkChain(c.nA, c);

        const comps = [];
        [...leftWalk.list].reverse().forEach(w => {
            comps.push({
                comp: w.comp,
                leftTerminal: w.incomingTerminal === 'A' ? 'B' : 'A',
                rightTerminal: w.incomingTerminal
            });
        });
        comps.push({ comp: c, leftTerminal: 'A', rightTerminal: 'B' });
        rightWalk.list.forEach(w => {
            comps.push({
                comp: w.comp,
                leftTerminal: w.incomingTerminal,
                rightTerminal: w.incomingTerminal === 'A' ? 'B' : 'A'
            });
        });

        let leftNode = leftWalk.endNode;
        let rightNode = rightWalk.endNode;
        if (leftNode > rightNode) {
            comps.reverse();
            comps.forEach(x => {
                const t = x.leftTerminal;
                x.leftTerminal = x.rightTerminal;
                x.rightTerminal = t;
            });
            const t = leftNode; leftNode = rightNode; rightNode = t;
        }

        chains.push({
            leftNode,
            rightNode,
            components: comps,
            left: Math.min(leftNode, rightNode),
            right: Math.max(leftNode, rightNode),
            _row: 0
        });
    }

    const visibleNodes = nonGroundNodes.filter(n => !isInternal(n));
    const hiddenNodes = nonGroundNodes.filter(n => isInternal(n));
    return { visibleNodes, hiddenNodes, chains };
}

function assignShuntLanes(shunts) {
    const byNode = new Map();
    shunts.forEach(s => {
        if (!byNode.has(s.nodeUp)) byNode.set(s.nodeUp, []);
        byNode.get(s.nodeUp).push(s);
    });
    byNode.forEach(group => {
        const n = group.length;
        group.forEach((s, i) => { s._lane = i - (n - 1) / 2; });
    });
}

function nodePositions(nonGroundNodes, shunts, chains) {
    const counts = new Map(nonGroundNodes.map(n => [n, 0]));
    shunts.forEach(s => counts.set(s.nodeUp, (counts.get(s.nodeUp) || 0) + 1));

    const chainKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
    const chainMinW = new Map();
    (chains || []).forEach(ch => {
        const K = ch.components.length;
        if (K <= 1) return;
        const needed = K * ESQ.BODY + (K + 1) * 28;
        const key = chainKey(ch.leftNode, ch.rightNode);
        chainMinW.set(key, Math.max(chainMinW.get(key) || 0, needed));
    });

    const pos = new Map();
    let xCursor = ESQ.MARGIN_X;

    nonGroundNodes.forEach((n, i) => {
        const curSh = counts.get(n) || 0;
        const curLeftLanes = Math.ceil(Math.max(0, curSh - 1) / 2);
        if (i === 0) {
            xCursor += curLeftLanes * ESQ.LANE_W;
        } else {
            const prev = nonGroundNodes[i - 1];
            const prevSh = counts.get(prev) || 0;
            const prevRightLanes = Math.ceil(Math.max(0, prevSh - 1) / 2);
            const baseSpacing = Math.max(ESQ.SPACING_MIN, (prevRightLanes + curLeftLanes) * ESQ.LANE_W + 60);
            const chainW = chainMinW.get(chainKey(prev, n)) || 0;
            const spacing = Math.max(baseSpacing, chainW);
            xCursor += spacing;
        }
        pos.set(n, xCursor);
    });

    const lastN = nonGroundNodes[nonGroundNodes.length - 1];
    const lastSh = counts.get(lastN) || 0;
    const lastRightLanes = Math.ceil(Math.max(0, lastSh - 1) / 2);
    let totalW = xCursor + lastRightLanes * ESQ.LANE_W + ESQ.MARGIN_X;
    totalW = Math.max(totalW, 600);

    if (nonGroundNodes.length === 1) {
        pos.set(nonGroundNodes[0], totalW / 2);
    }

    return { pos, totalW };
}

/* ---------- Símbolos IEEE ---------- */

function textosSym(cx, cy, orient, label, valor, unit) {
    const off = 14;
    if (orient === 'H') {
        return `
            <text x="${cx}" y="${cy - off}" text-anchor="middle" dominant-baseline="auto" class="esq-label--name">${escapeXml(label)}</text>
            ${valor ? `<text x="${cx}" y="${cy + off + 4}" text-anchor="middle" dominant-baseline="hanging" class="esq-label--val">${escapeXml(valor)}${unit}</text>` : ''}
        `;
    }
    return `
        <text x="${cx + off}" y="${cy - 6}" text-anchor="start" dominant-baseline="auto" class="esq-label--name">${escapeXml(label)}</text>
        ${valor ? `<text x="${cx + off}" y="${cy + 8}" text-anchor="start" dominant-baseline="hanging" class="esq-label--val">${escapeXml(valor)}${unit}</text>` : ''}
    `;
}

function textosSymCircle(cx, cy, r, orient, label, valor, unit) {
    const off = r + 6;
    if (orient === 'H') {
        return `
            <text x="${cx}" y="${cy - off}" text-anchor="middle" dominant-baseline="auto" class="esq-label--name">${escapeXml(label)}</text>
            ${valor ? `<text x="${cx}" y="${cy + off}" text-anchor="middle" dominant-baseline="hanging" class="esq-label--val">${escapeXml(valor)}${unit}</text>` : ''}
        `;
    }
    return `
        <text x="${cx + off}" y="${cy - 6}" text-anchor="start" dominant-baseline="auto" class="esq-label--name">${escapeXml(label)}</text>
        ${valor ? `<text x="${cx + off}" y="${cy + 8}" text-anchor="start" dominant-baseline="hanging" class="esq-label--val">${escapeXml(valor)}${unit}</text>` : ''}
    `;
}

function symResistor(cx, cy, orient, label, valor) {
    const len = ESQ.BODY;
    const half = len / 2;
    const peaks = 6;
    const amp = 6;
    const segs = peaks + 1;
    const step = len / segs;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const t = -half + i * step;
        const offset = (i === 0 || i === segs) ? 0 : ((i % 2 === 1) ? -amp : amp);
        if (orient === 'H') pts.push([cx + t, cy + offset]);
        else pts.push([cx + offset, cy + t]);
    }
    const d = pts.map((p, i) => (i === 0 ? 'M ' : 'L ') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
    return `<g class="esq-sym">
        <path d="${d}" fill="none" stroke="var(--esq-stroke)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${textosSym(cx, cy, orient, label, valor, 'Ω')}
    </g>`;
}

function symCapacitor(cx, cy, orient, label, valor) {
    const half = ESQ.BODY / 2;
    const gap = 4;
    const plateLen = 18;
    if (orient === 'H') {
        return `<g class="esq-sym">
            <line x1="${cx - half}" y1="${cy}" x2="${cx - gap}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>
            <line x1="${cx + gap}" y1="${cy}" x2="${cx + half}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>
            <line x1="${cx - gap}" y1="${cy - plateLen / 2}" x2="${cx - gap}" y2="${cy + plateLen / 2}" stroke="var(--esq-stroke)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="${cx + gap}" y1="${cy - plateLen / 2}" x2="${cx + gap}" y2="${cy + plateLen / 2}" stroke="var(--esq-stroke)" stroke-width="2.5" stroke-linecap="round"/>
            ${textosSym(cx, cy, orient, label, valor, 'F')}
        </g>`;
    }
    return `<g class="esq-sym">
        <line x1="${cx}" y1="${cy - half}" x2="${cx}" y2="${cy - gap}" stroke="var(--esq-wire)" stroke-width="2"/>
        <line x1="${cx}" y1="${cy + gap}" x2="${cx}" y2="${cy + half}" stroke="var(--esq-wire)" stroke-width="2"/>
        <line x1="${cx - plateLen / 2}" y1="${cy - gap}" x2="${cx + plateLen / 2}" y2="${cy - gap}" stroke="var(--esq-stroke)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${cx - plateLen / 2}" y1="${cy + gap}" x2="${cx + plateLen / 2}" y2="${cy + gap}" stroke="var(--esq-stroke)" stroke-width="2.5" stroke-linecap="round"/>
        ${textosSym(cx, cy, orient, label, valor, 'F')}
    </g>`;
}

function symInductor(cx, cy, orient, label, valor) {
    const half = ESQ.BODY / 2;
    const arcs = 4;
    const arcW = ESQ.BODY / arcs;
    const r = arcW / 2;
    let d;
    if (orient === 'H') {
        d = `M ${cx - half} ${cy}`;
        for (let i = 0; i < arcs; i++) d += ` a ${r},${r} 0 0,1 ${arcW},0`;
    } else {
        d = `M ${cx} ${cy - half}`;
        for (let i = 0; i < arcs; i++) d += ` a ${r},${r} 0 0,0 0,${arcW}`;
    }
    return `<g class="esq-sym">
        <path d="${d}" fill="none" stroke="var(--esq-stroke)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${textosSym(cx, cy, orient, label, valor, 'H')}
    </g>`;
}

function symVoltageSource(cx, cy, orient, label, valor, positiveOnA) {
    const r = 18;
    const half = ESQ.BODY / 2;
    let plus, minus;
    if (orient === 'H') {
        plus = positiveOnA ? [cx - 8, cy] : [cx + 8, cy];
        minus = positiveOnA ? [cx + 8, cy] : [cx - 8, cy];
    } else {
        plus = positiveOnA ? [cx, cy - 8] : [cx, cy + 8];
        minus = positiveOnA ? [cx, cy + 8] : [cx, cy - 8];
    }
    const leadA = orient === 'H'
        ? `<line x1="${cx - half}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy - half}" x2="${cx}" y2="${cy - r}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    const leadB = orient === 'H'
        ? `<line x1="${cx + r}" y1="${cy}" x2="${cx + half}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy + r}" x2="${cx}" y2="${cy + half}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    return `<g class="esq-sym">
        ${leadA}${leadB}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--esq-bg)" stroke="var(--esq-stroke)" stroke-width="2"/>
        <text x="${plus[0]}" y="${plus[1]}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="var(--esq-stroke)">+</text>
        <text x="${minus[0]}" y="${minus[1]}" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="700" fill="var(--esq-stroke)">−</text>
        ${textosSymCircle(cx, cy, r, orient, label, valor, 'V')}
    </g>`;
}

function symCurrentSource(cx, cy, orient, label, valor, fromAtoB) {
    const r = 18;
    const half = ESQ.BODY / 2;
    let arrowD;
    if (orient === 'H') {
        const x1 = fromAtoB ? cx + r * 0.55 : cx - r * 0.55;
        const x2 = fromAtoB ? cx - r * 0.55 : cx + r * 0.55;
        arrowD = `<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}" stroke="var(--esq-stroke)" stroke-width="2" marker-end="url(#esq-arrow-curr)"/>`;
    } else {
        const y1 = fromAtoB ? cy + r * 0.55 : cy - r * 0.55;
        const y2 = fromAtoB ? cy - r * 0.55 : cy + r * 0.55;
        arrowD = `<line x1="${cx}" y1="${y1}" x2="${cx}" y2="${y2}" stroke="var(--esq-stroke)" stroke-width="2" marker-end="url(#esq-arrow-curr)"/>`;
    }
    const leadA = orient === 'H'
        ? `<line x1="${cx - half}" y1="${cy}" x2="${cx - r}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy - half}" x2="${cx}" y2="${cy - r}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    const leadB = orient === 'H'
        ? `<line x1="${cx + r}" y1="${cy}" x2="${cx + half}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy + r}" x2="${cx}" y2="${cy + half}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    return `<g class="esq-sym">
        ${leadA}${leadB}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--esq-bg)" stroke="var(--esq-stroke)" stroke-width="2"/>
        ${arrowD}
        ${textosSymCircle(cx, cy, r, orient, label, valor, 'A')}
    </g>`;
}

function symDependentSource(tipo, cx, cy, orient, label, valor, alvoCtrl) {
    const half = ESQ.BODY / 2;
    const size = 18;
    const letter = { VCVS: 'E', VCCS: 'G', CCVS: 'H', CCCS: 'F' }[tipo] || '?';
    const leadA = orient === 'H'
        ? `<line x1="${cx - half}" y1="${cy}" x2="${cx - size}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy - half}" x2="${cx}" y2="${cy - size}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    const leadB = orient === 'H'
        ? `<line x1="${cx + size}" y1="${cy}" x2="${cx + half}" y2="${cy}" stroke="var(--esq-wire)" stroke-width="2"/>`
        : `<line x1="${cx}" y1="${cy + size}" x2="${cx}" y2="${cy + half}" stroke="var(--esq-wire)" stroke-width="2"/>`;
    const diamond = `<polygon points="${cx - size},${cy} ${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size}" fill="var(--esq-bg)" stroke="var(--esq-stroke)" stroke-width="2"/>`;
    const lett = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="var(--esq-ctrl)">${letter}</text>`;
    let ctrlText = '';
    if (alvoCtrl) {
        const cx2 = orient === 'H' ? cx : cx + size + 30;
        const cy2 = orient === 'H' ? cy + half + 18 : cy + 14;
        ctrlText = `<text x="${cx2}" y="${cy2}" text-anchor="${orient === 'H' ? 'middle' : 'start'}" dominant-baseline="${orient === 'H' ? 'hanging' : 'central'}" class="esq-label--ctrl">ctrl: ${escapeXml(alvoCtrl)}</text>`;
    }
    return `<g class="esq-sym">
        ${leadA}${leadB}${diamond}${lett}
        ${textosSymCircle(cx, cy, size, orient, label, valor, '')}
        ${ctrlText}
    </g>`;
}

function drawSimbolo(comp, cx, cy, orient) {
    const t = comp.tipo;
    if (t === 'Resistor') return symResistor(cx, cy, orient, comp.nome, comp.valor);
    if (t === 'Capacitor') return symCapacitor(cx, cy, orient, comp.nome, comp.valor);
    if (t === 'Inductor') return symInductor(cx, cy, orient, comp.nome, comp.valor);
    if (t === 'VoltageSource') return symVoltageSource(cx, cy, orient, comp.nome, comp.valor, comp._positiveOnA);
    if (t === 'CurrentSource') return symCurrentSource(cx, cy, orient, comp.nome, comp.valor, comp._fromAtoB);
    if (t === 'VCVS' || t === 'VCCS' || t === 'CCVS' || t === 'CCCS') {
        const ctrl = (t === 'VCVS' || t === 'VCCS')
            ? (comp.nC != null && comp.nD != null ? `v(${comp.nC},${comp.nD})` : null)
            : (comp.alvo || null);
        return symDependentSource(t, cx, cy, orient, comp.nome, comp.valor, ctrl);
    }
    return '';
}

/**
 * Renderiza o esquemático com base no estado atual do DOM, dentro do contêiner #esquematicoWrap.
 */
function renderEsquematico() {
    const wrap = document.getElementById('esquematicoWrap');
    if (!wrap) return;

    const topologia = getTopologiaAtual();
    if (!topologia.length) {
        wrap.innerHTML = '<div class="esq-empty">Adicione componentes para visualizar o esquemático.</div>';
        return;
    }

    const { nonGroundNodes, shunts, series } = analyzeTopology(topologia);

    if (!nonGroundNodes.length) {
        wrap.innerHTML = '<div class="esq-empty">Topologia degenerada: todos os terminais estão no terra. Conecte ao menos um nó não-zero.</div>';
        return;
    }

    const { visibleNodes, chains } = consolidateSeries(series, shunts, nonGroundNodes);

    assignSeriesRows(chains);
    assignShuntLanes(shunts);

    const { pos: nodeX, totalW } = nodePositions(visibleNodes, shunts, chains);

    const maxRow = chains.reduce((m, s) => Math.max(m, s._row), -1);
    const topAboveNodes = (maxRow + 1) * ESQ.SERIES_ROW_H + 40;
    const NODE_Y = topAboveNodes + 50;
    const GND_Y = NODE_Y + ESQ.SHUNT_HEIGHT;
    const H = GND_Y + 80;

    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" class="esq-svg" role="img" aria-label="Esquemático do circuito">`);
    parts.push(`<defs>
        <marker id="esq-arrow-curr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--esq-stroke)"/>
        </marker>
    </defs>`);

    const gndStart = ESQ.MARGIN_X / 2;
    const gndEnd = totalW - ESQ.MARGIN_X / 2;
    parts.push(`<line x1="${gndStart}" y1="${GND_Y}" x2="${gndEnd}" y2="${GND_Y}" stroke="var(--esq-wire)" stroke-width="2"/>`);

    const gx = (gndStart + gndEnd) / 2;
    parts.push(`<g class="esq-gnd">
        <line x1="${gx - 14}" y1="${GND_Y + 8}" x2="${gx + 14}" y2="${GND_Y + 8}" stroke="var(--esq-gnd)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${gx - 9}" y1="${GND_Y + 14}" x2="${gx + 9}" y2="${GND_Y + 14}" stroke="var(--esq-gnd)" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="${gx - 4}" y1="${GND_Y + 20}" x2="${gx + 4}" y2="${GND_Y + 20}" stroke="var(--esq-gnd)" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${gx + 22}" y="${GND_Y + 14}" font-size="11" fill="var(--esq-gnd)" dominant-baseline="central">GND</text>
    </g>`);

    chains.forEach(chain => {
        const xL = nodeX.get(chain.leftNode);
        const xR = nodeX.get(chain.rightNode);
        if (xL == null || xR == null) return;
        const y = NODE_Y - ESQ.SERIES_BASE_OFFSET - chain._row * ESQ.SERIES_ROW_H;
        const halfBody = ESQ.BODY / 2;
        const K = chain.components.length;

        parts.push(`<line x1="${xL}" y1="${NODE_Y - ESQ.NODE_R}" x2="${xL}" y2="${y}" stroke="var(--esq-wire)" stroke-width="2"/>`);
        parts.push(`<line x1="${xR}" y1="${NODE_Y - ESQ.NODE_R}" x2="${xR}" y2="${y}" stroke="var(--esq-wire)" stroke-width="2"/>`);

        let lastEndX = xL;
        for (let i = 0; i < K; i++) {
            const cx = xL + (i + 0.5) * (xR - xL) / K;
            parts.push(`<line x1="${lastEndX}" y1="${y}" x2="${cx - halfBody}" y2="${y}" stroke="var(--esq-wire)" stroke-width="2"/>`);
            const item = chain.components[i];
            item.comp._positiveOnA = (item.leftTerminal === 'A');
            item.comp._fromAtoB = (item.leftTerminal === 'A');
            parts.push(drawSimbolo(item.comp, cx, y, 'H'));
            lastEndX = cx + halfBody;
        }
        parts.push(`<line x1="${lastEndX}" y1="${y}" x2="${xR}" y2="${y}" stroke="var(--esq-wire)" stroke-width="2"/>`);
    });

    shunts.forEach(s => {
        const xN = nodeX.get(s.nodeUp);
        const laneX = xN + s._lane * ESQ.LANE_W;
        if (Math.abs(laneX - xN) > 0.5) {
            parts.push(`<line x1="${xN}" y1="${NODE_Y}" x2="${laneX}" y2="${NODE_Y}" stroke="var(--esq-wire)" stroke-width="2"/>`);
        }
        const midY = (NODE_Y + GND_Y) / 2;
        const halfBody = ESQ.BODY / 2;
        parts.push(`<line x1="${laneX}" y1="${NODE_Y}" x2="${laneX}" y2="${midY - halfBody}" stroke="var(--esq-wire)" stroke-width="2"/>`);
        parts.push(`<line x1="${laneX}" y1="${midY + halfBody}" x2="${laneX}" y2="${GND_Y}" stroke="var(--esq-wire)" stroke-width="2"/>`);
        s._positiveOnA = s.positiveOnTop;
        s._fromAtoB = s.positiveOnTop;
        parts.push(drawSimbolo(s, laneX, midY, 'V'));
    });

    visibleNodes.forEach(n => {
        const x = nodeX.get(n);
        if (x == null) return;
        parts.push(`<circle cx="${x}" cy="${NODE_Y}" r="${ESQ.NODE_R}" fill="var(--esq-node-fill)" stroke="var(--esq-node-stroke)" stroke-width="2"/>`);
        parts.push(`<text x="${x}" y="${NODE_Y}" class="esq-label--node">${n}</text>`);
    });

    parts.push(`</svg>`);
    wrap.innerHTML = parts.join('');
}

/* ---------- Live preview & tabs ---------- */

let _esqDebounceTimer = null;
function agendarRerenderEsquematico() {
    if (_esqDebounceTimer) clearTimeout(_esqDebounceTimer);
    _esqDebounceTimer = setTimeout(() => {
        try { renderEsquematico(); }
        catch (e) { /* preview não pode quebrar a UI; falha silenciosa */ }
    }, 180);
}

function setupEsquematicoLive() {
    const lista = document.getElementById('listaComponentes');
    if (!lista) return;
    const obs = new MutationObserver(agendarRerenderEsquematico);
    obs.observe(lista, { childList: true, subtree: true });
    lista.addEventListener('input', agendarRerenderEsquematico);
    lista.addEventListener('change', agendarRerenderEsquematico);
    const toggleAc = document.getElementById('toggleModoAc');
    if (toggleAc) toggleAc.addEventListener('change', agendarRerenderEsquematico);
    renderEsquematico();
}

function setupOutputTabs() {
    const tabs = document.querySelectorAll('.output-tab');
    const panels = {
        'resultados': document.getElementById('resultado'),
        'esquematico': document.getElementById('painelEsquematico')
    };
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabs.forEach(b => {
                const isActive = b === btn;
                b.classList.toggle('is-active', isActive);
                b.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            Object.entries(panels).forEach(([k, el]) => {
                if (!el) return;
                const isActive = k === target;
                el.classList.toggle('is-active', isActive);
                el.hidden = !isActive;
            });
        });
    });
}

function ativarTab(tabId) {
    const btn = document.getElementById(tabId === 'resultados' ? 'tabBtnResultados' : 'tabBtnEsquematico');
    if (btn) btn.click();
}

/* ============================================================
 * FASE 3.C — Adicionar em Série/Paralelo via diálogo
 * Não altera a lógica matemática nem o gerador de JSON.
 * Apenas reescreve nós do componente de referência e/ou
 * cria um novo componente com nós pré-calculados via add().
 * ============================================================ */

/** @type {?HTMLLIElement} */
let _dlgRefItem = null;

/**
 * Retorna o próximo número de nó livre no circuito (max + 1, sempre >= 1).
 * Inspeciona todos os campos no-a / no-b / no-c / no-d das comp-item.
 *
 * @returns {number}
 */
function obterProximoNo() {
    const todos = new Set();
    document.querySelectorAll('.comp-item').forEach(item => {
        ['no-a', 'no-b', 'no-c', 'no-d'].forEach(cls => {
            const el = item.querySelector('.' + cls);
            if (el) {
                const n = parseInt(el.value, 10);
                if (Number.isFinite(n)) todos.add(n);
            }
        });
    });
    let max = -1;
    todos.forEach(n => { if (n > max) max = n; });
    return Math.max(max + 1, 1);
}

/**
 * Abre o diálogo de "componente relacionado" para o card de comp-item passado.
 * Popula os labels com os nós atuais da referência e reseta o estado do form.
 *
 * @param {HTMLLIElement} compItemEl - O elemento .comp-item de referência.
 */
function abrirDialogoRelacionar(compItemEl) {
    const dlg = document.getElementById('dlgRelacionar');
    if (!dlg || !compItemEl) return;
    const nomeEl = compItemEl.querySelector('.nome-comp');
    const noAEl = compItemEl.querySelector('.no-a');
    const noBEl = compItemEl.querySelector('.no-b');
    if (!nomeEl || !noAEl || !noBEl) return;

    _dlgRefItem = compItemEl;

    document.getElementById('dlgRefNome').textContent = nomeEl.value || '?';
    document.getElementById('dlgLadoANome').textContent = noAEl.value || '?';
    document.getElementById('dlgLadoBNome').textContent = noBEl.value || '?';

    const radParalelo = dlg.querySelector('input[name="modo"][value="paralelo"]');
    if (radParalelo) radParalelo.checked = true;
    const radLadoA = dlg.querySelector('input[name="lado"][value="A"]');
    if (radLadoA) radLadoA.checked = true;
    const ladoSecao = document.getElementById('dlgLadoSecao');
    if (ladoSecao) ladoSecao.hidden = true;

    dlg.querySelectorAll('.dlg-tipo-btn').forEach(b => b.classList.remove('is-selected'));
    const tipoDefault = dlg.querySelector('.dlg-tipo-btn[data-tipo="Resistor"]');
    if (tipoDefault) tipoDefault.classList.add('is-selected');

    if (typeof dlg.showModal === 'function') {
        dlg.showModal();
    } else {
        dlg.setAttribute('open', '');
    }
}

/**
 * Executa a inserção do novo componente segundo o modo escolhido.
 * - Paralelo: novo componente com os mesmos (nA, nB) da referência.
 * - Série lado A: cria nó M novo; ref vira (M, nB); novo é (nA, M).
 * - Série lado B: cria nó M novo; ref vira (nA, M); novo é (M, nB).
 *
 * Em série, o NOVO componente recebe atributos data-series-* contendo:
 *  - refUid: identificador estável do componente de referência
 *  - side:   'A' ou 'B' (qual lado da ref foi reescrito)
 *  - oldValue: valor original do nó da ref (a ser restaurado se possível)
 *  - newNode: o nó intermediário criado
 * Esses metadados permitem que removerComponente() restaure a ref ao
 * estado pré-inserção quando o novo componente é deletado.
 *
 * @param {'paralelo'|'serie'} modo
 * @param {string} tipo - Tipo do novo componente (Resistor, VoltageSource, ...)
 * @param {'A'|'B'} lado - Lado da inserção (somente se modo='serie').
 */
function executarAdicaoRelacionada(modo, tipo, lado) {
    const refItem = _dlgRefItem;
    if (!refItem) return;
    const refNoAEl = refItem.querySelector('.no-a');
    const refNoBEl = refItem.querySelector('.no-b');
    const refNA = parseInt(refNoAEl?.value, 10);
    const refNB = parseInt(refNoBEl?.value, 10);
    if (!Number.isFinite(refNA) || !Number.isFinite(refNB)) return;

    if (modo === 'paralelo') {
        add(tipo, null, [refNA, refNB]);
        return;
    }

    const refUid = refItem.dataset.uid || '';
    const novoNo = obterProximoNo();
    let oldValue;
    if (lado === 'A') {
        oldValue = refNA;
        refNoAEl.value = String(novoNo);
        refNoAEl.dispatchEvent(new Event('input', { bubbles: true }));
        add(tipo, null, [refNA, novoNo]);
    } else {
        oldValue = refNB;
        refNoBEl.value = String(novoNo);
        refNoBEl.dispatchEvent(new Event('input', { bubbles: true }));
        add(tipo, null, [novoNo, refNB]);
    }

    const lista = document.getElementById('listaComponentes');
    const novoEl = lista ? lista.lastElementChild : null;
    if (novoEl && refUid) {
        novoEl.dataset.seriesRefUid = refUid;
        novoEl.dataset.seriesSide = lado;
        novoEl.dataset.seriesOldValue = String(oldValue);
        novoEl.dataset.seriesNewNode = String(novoNo);
    }
}

/**
 * Remove o componente do DOM. Se foi inserido em série via diálogo, tenta
 * restaurar o nó original do componente de referência — mas apenas se a
 * referência ainda usa o nó intermediário (i.e., o usuário não editou
 * manualmente a referência depois da inserção).
 *
 * @param {HTMLLIElement} li - O elemento .comp-item a remover.
 */
function removerComponente(li) {
    if (!li) return;
    const refUid = li.dataset.seriesRefUid;
    const side = li.dataset.seriesSide;
    const newNode = parseInt(li.dataset.seriesNewNode, 10);
    const oldValue = parseInt(li.dataset.seriesOldValue, 10);

    if (refUid && (side === 'A' || side === 'B') && Number.isFinite(newNode) && Number.isFinite(oldValue)) {
        const refEl = document.querySelector('.comp-item[data-uid="' + refUid + '"]');
        if (refEl) {
            const sideEl = refEl.querySelector(side === 'A' ? '.no-a' : '.no-b');
            if (sideEl) {
                const curValue = parseInt(sideEl.value, 10);
                if (curValue === newNode) {
                    sideEl.value = String(oldValue);
                    sideEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }
    li.remove();
}

/**
 * Instala os event listeners do diálogo: troca de modo, seleção de tipo,
 * cancelamento e submissão. Idempotente.
 */
function setupDialogoRelacionar() {
    const dlg = document.getElementById('dlgRelacionar');
    if (!dlg || dlg.dataset.setupDone === '1') return;
    dlg.dataset.setupDone = '1';

    dlg.querySelectorAll('input[name="modo"]').forEach(r => {
        r.addEventListener('change', () => {
            const checked = dlg.querySelector('input[name="modo"]:checked');
            const isSerie = !!checked && checked.value === 'serie';
            const ladoSecao = document.getElementById('dlgLadoSecao');
            if (ladoSecao) ladoSecao.hidden = !isSerie;
        });
    });

    dlg.querySelectorAll('.dlg-tipo-btn').forEach(b => {
        b.addEventListener('click', () => {
            dlg.querySelectorAll('.dlg-tipo-btn').forEach(x => x.classList.remove('is-selected'));
            b.classList.add('is-selected');
        });
    });

    const cancelar = dlg.querySelector('.dlg-btn-cancel');
    if (cancelar) {
        cancelar.addEventListener('click', () => {
            if (typeof dlg.close === 'function') dlg.close('cancel');
            else dlg.removeAttribute('open');
        });
    }

    const form = document.getElementById('formRelacionar');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const modoEl = dlg.querySelector('input[name="modo"]:checked');
            const ladoEl = dlg.querySelector('input[name="lado"]:checked');
            const tipoEl = dlg.querySelector('.dlg-tipo-btn.is-selected');
            const modo = modoEl ? modoEl.value : 'paralelo';
            const lado = ladoEl ? ladoEl.value : 'A';
            const tipo = tipoEl ? tipoEl.dataset.tipo : 'Resistor';
            executarAdicaoRelacionada(modo, tipo, lado);
            if (typeof dlg.close === 'function') dlg.close('ok');
            else dlg.removeAttribute('open');
        });
    }
}

/**
 * Alterna entre modo claro e escuro
 */
function toggleDarkMode() {
    const body = document.body;
    const switchElement = document.getElementById('darkModeSwitch');
    
    if (switchElement.checked) {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Carrega preferência salva ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    const darkMode = localStorage.getItem('darkMode');
    const switchElement = document.getElementById('darkModeSwitch');

    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        if (switchElement) {
            switchElement.checked = true;
        }
    }

    const toggleAc = document.getElementById('toggleModoAc');
    if (toggleAc) {
        try {
            if (localStorage.getItem('simModoAc') === '1') {
                toggleAc.checked = true;
            }
        } catch (e) { /* ignore */ }
        toggleAc.addEventListener('change', sincronizarModoSimulacao);
        sincronizarModoSimulacao();
    }

    setupOutputTabs();
    setupEsquematicoLive();
    setupDialogoRelacionar();
});
