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
    ],
    "trafo_step_up": [
        {"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]},
        {"Componente": "T1", "Tipo": "Transformer", "Valor": "1:2", "Nos": [1, 0, 2, 0]},
        {"Componente": "R_Carga", "Tipo": "Resistor", "Valor": "100", "Nos": [2, 0]}
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
    try { localStorage.removeItem(_STORAGE_KEY_CIRCUITO); } catch (e) { /* ignore */ }
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
    if (tipo === 'Transformer') return '1:2';
    return '1k';
}

/**
 * FASE 5.2: normaliza a razão de um trafo digitada pelo usuário.
 * Aceita "a:b" (1:2), "a/b" (1/2), decimal ("0.5") ou inteiro ("2").
 * Devolve a string já no formato que o backend entende via parseValue/ToExpression.
 * Returns null se a razão for inválida ou não positiva.
 *
 * @param {string} raw
 * @returns {string|null}
 */
function normalizarRazaoTrafo(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;
    if (s.includes(':')) {
        const partes = s.split(':').map(p => p.trim());
        if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
        s = `${partes[0]}/${partes[1]}`;
    }
    const partes = s.split('/');
    let num;
    if (partes.length === 2) {
        const a = parseFloat(partes[0]);
        const b = parseFloat(partes[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
        num = a / b;
    } else {
        num = parseFloat(s);
    }
    if (!Number.isFinite(num) || num <= 0) return null;
    return s;
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
    if (tipo === 'Transformer') {
        // FASE 5.2: trafo ideal com 4 terminais (primário e secundário).
        // Razão n = N1/N2 = V_pri / V_sec; backend recebe via campo "Razao".
        label = 'T';
        nome = `T${id}`;
        valLabel = 'Razão N1/N2';
        if (nC === 1 && nD === 0) { nC = 2; nD = 0; }
        inputsNos = `
        <span style="font-size:0.7em; color:#16a085;">Pri:</span>
        <input type="number" class="no-a" value="${nA}" min="0" style="width:30px" placeholder="+">
        <input type="number" class="no-b" value="${nB}" min="0" style="width:30px" placeholder="-">
        <span style="font-size:0.7em; color:#16a085;">Sec:</span>
        <input type="number" class="no-c" value="${nC}" min="0" style="width:30px" placeholder="+">
        <input type="number" class="no-d" value="${nD}" min="0" style="width:30px" placeholder="-">`;
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
    const btnRelacionarStyle = (tipo === 'Transformer') ? 'display:none;' : '';
    li.innerHTML = `
        <span class="comp-badge">${label}</span>
        <input type="text" class="nome-comp" value="${nomeFixo || nome}" style="width:50px; font-weight:bold;">
        <div class="nodes-group">${inputsNos}</div>
        ${valorSecaoHtml}
        <button type="button" class="btn-relacionar" onclick="abrirDialogoRelacionar(this.parentElement)" title="Adicionar componente relacionado (s\u00e9rie / paralelo)" aria-label="Adicionar componente em s\u00e9rie ou paralelo" style="${btnRelacionarStyle}">+</button>
        <button class="btn-del" onclick="removerComponente(this.parentElement)">×</button>
    `;
    lista.appendChild(li);
    aplicarTooltipsComponente(li);
    if (tipo === 'Transformer') {
        const noA = li.querySelector('.no-a');
        const noB = li.querySelector('.no-b');
        const noC = li.querySelector('.no-c');
        const noD = li.querySelector('.no-d');
        if (noA) noA.title = 'Terminal positivo do primário. Use 0 para terra (GND).';
        if (noB) noB.title = 'Terminal negativo do primário. Use 0 para terra (GND).';
        if (noC) noC.title = 'Terminal positivo do secundário. Use 0 para terra (GND).';
        if (noD) noD.title = 'Terminal negativo do secundário. Use 0 para terra (GND).';
        const valInput = li.querySelector('.val-input');
        if (valInput) valInput.title = 'Razão de transformação n = N1/N2 = V_pri/V_sec. Aceita: "2" (decimal), "1/2" (fração) ou "1:2" (notação clássica).';
    }

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
        if (tipo === 'VCVS' || tipo === 'VCCS' || tipo === 'Transformer') {
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

        if (tipo === 'Transformer') {
            // FASE 5.2: trafo ideal usa o campo "Razao" em vez de "Valor".
            const valEl = item.querySelector('.val-input');
            let razaoRaw = valEl ? valEl.value.trim() : '';
            const norm = normalizarRazaoTrafo(razaoRaw);
            compObj["Razao"] = (norm != null) ? norm : '1';
            netlist.push(compObj);
            return;
        }

        if (modo === 'AC' && fonteIndep) {
            const modIn = item.querySelector('.val-input-mod');
            const faseIn = item.querySelector('.val-input-fase');
            let modRaw = (modIn && modIn.value.trim()) ? modIn.value.trim() : '';
            let faseStr = (faseIn && faseIn.value.trim()) ? faseIn.value.trim() : '0';

            // FASE 4 (C): se o usuário escreveu o módulo em forma retangular
            // "a+bj" (ou "a+bi"), convertemos para polar antes de enviar.
            // O backend só conhece (Modulo, Fase em graus); a conveniência é
            // 100% frontend, sem mudar o contrato.
            const rect = _parseRetangular(modRaw);
            if (rect) {
                const { mod, phaseDeg } = _polarFromRect(rect.re, rect.im);
                modRaw = String(mod);
                faseStr = String(phaseDeg);
            } else if (modRaw) {
                modRaw = aplicarSufixosValor(modRaw);
            } else {
                modRaw = nomeComp(item);
            }
            // FASE 5.1: se a convenção temporal escolhida é sen, traduzimos
            // para cos equivalente (sen x = cos(x - 90°)) antes de enviar.
            faseStr = faseParaEnvio(faseStr);
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
function formatarResultadoEng(valorStr, unidade, deslocFaseGraus = 0) {
    const polar = parsePolar(valorStr);
    if (!polar) return { valor: valorStr, unidade: unidade || '' };
    const isPolar = /[\u2220<]/.test(String(valorStr || ''));
    if (isPolar) {
        const { mantissa, prefix } = formatMagnitudeEng(polar.mod);
        const fase = formatFaseLimpa(polar.fase + deslocFaseGraus);
        return { valor: `${mantissa} ∠ ${fase}°`, unidade: prefix + (unidade || '') };
    }
    const signed = polar.fase === 180 ? -polar.mod : polar.mod;
    const { mantissa, prefix } = formatMagnitudeEng(signed);
    return { valor: mantissa, unidade: prefix + (unidade || '') };
}

/* ============================================================
 * FASE 5.1 — Fontes senoidais (frontend-only)
 *
 * O backend já trabalha com fasores cos(ωt+φ). Esta fase adiciona o
 * seletor de convenção temporal: o aluno pode escolher cos (padrão de
 * engenharia elétrica) ou sen. Internamente, se convencao = "sen",
 * subtraímos 90° da fase antes de enviar (sen x = cos(x - 90°)) e
 * somamos 90° na fase ao exibir os resultados. O backend continua
 * achando que tudo é cos — contrato JSON intacto.
 * ============================================================ */

/**
 * Lê o radio do painel #painelConfigAc. Default: 'cos'.
 * @returns {'cos'|'sen'}
 */
function getConvencaoTemporal() {
    const el = document.querySelector('input[name="convencaoSeno"]:checked');
    return el && el.value === 'sen' ? 'sen' : 'cos';
}

/**
 * Aplica a convenção temporal sobre uma fase de entrada (digitada pelo
 * usuário). Em 'sen', subtrai 90° para a forma cos equivalente que o
 * backend espera. Aceita string ou número; devolve string.
 *
 * @param {string|number} faseDigitada - Fase em graus.
 * @returns {string}
 */
function faseParaEnvio(faseDigitada) {
    const num = parseFloat(faseDigitada);
    if (!Number.isFinite(num)) return String(faseDigitada);
    if (getConvencaoTemporal() === 'sen') return String(num - 90);
    return String(num);
}

/**
 * Deslocamento (em graus) a ser somado às fases que vêm do backend,
 * antes de exibir, para reverter à convenção do usuário.
 * @returns {number}
 */
function deslocFaseConvencao() {
    return getConvencaoTemporal() === 'sen' ? 90 : 0;
}

/**
 * Sincroniza estado dos radios cos/sen com localStorage. Como a fase
 * exibida em "Resultados Finais", o "Diagrama Fasorial" e "Ondas no
 * tempo" depende da convenção corrente, limpamos os resultados ao
 * trocar para evitar leitura ambígua — o usuário re-clica em Analisar.
 */
function sincronizarConvencaoTemporal() {
    const conv = getConvencaoTemporal();
    try { localStorage.setItem('simConvencaoSeno', conv); } catch (e) { /* ignore */ }
    const divRes = document.getElementById('resultado');
    if (divRes && divRes.innerHTML.trim() !== '') {
        divRes.innerHTML = '<div class="card" style="border-left:5px solid #f39c12;"><p style="margin:0; color:var(--text-primary);">Convenção temporal alterada — clique em <strong>Analisar Completo</strong> (ou Ctrl+Enter) para recalcular com a nova convenção.</p></div>';
    }
}

/**
 * Calcula amostras V(t) = |V|·cos(ωt+φ) (ou ·sen) para plot temporal.
 * Devolve um array de pontos {t, v} cobrindo dois períodos.
 *
 * @param {number} mod - Amplitude.
 * @param {number} faseDeg - Fase em graus (na convenção do usuário).
 * @param {number} f - Frequência em Hz.
 * @param {'cos'|'sen'} conv - Convenção temporal.
 * @param {number} nPts - Quantidade de amostras (default 200).
 * @returns {Array<{t:number, v:number}>}
 */
function _ondaTemporalSamples(mod, faseDeg, f, conv, nPts = 200) {
    const T = f > 0 ? 1 / f : 1;
    const tMax = 2 * T;
    const omega = 2 * Math.PI * f;
    const fnTrig = conv === 'sen' ? Math.sin : Math.cos;
    const faseRad = faseDeg * Math.PI / 180;
    const pts = [];
    for (let i = 0; i <= nPts; i++) {
        const t = (i / nPts) * tMax;
        pts.push({ t, v: mod * fnTrig(omega * t + faseRad) });
    }
    return pts;
}

/**
 * Renderiza o card "Ondas no tempo V(t), I(t)" na aba Resultados.
 * Recebe os resultados (já com a fase NA convenção do usuário) e
 * desenha um SVG com cada onda sobreposta, cores separando V e I.
 *
 * Só faz sentido em AC; em DC retorna sem efeito.
 *
 * @param {Array<{Local:string, ValorNumerico:string, Unidade:string}>} resultados
 * @param {HTMLElement} container
 * @returns {void}
 */
function renderOndasTemporais(resultados, container) {
    if (getModoSimulacao() !== 'AC') return;
    if (!Array.isArray(resultados) || !resultados.length) return;
    const freqEl = document.getElementById('inputFrequenciaAc');
    const f = freqEl ? parseFloat(freqEl.value) : NaN;
    if (!Number.isFinite(f) || f <= 0) return;
    const conv = getConvencaoTemporal();
    const desloc = deslocFaseConvencao();

    const fasores = [];
    resultados.forEach(r => {
        const p = parsePolar(r.ValorNumerico);
        if (!p || !(p.mod > 0)) return;
        fasores.push({
            mod: p.mod,
            faseUsr: p.fase + desloc,
            local: String(r.Local || ''),
            unidade: r.Unidade || '',
            tipo: classificarFasor(r)
        });
    });
    if (!fasores.length) return;

    const W = 720, H = 220;
    const padL = 50, padR = 14, padT = 22, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const T = 1 / f;
    const tMax = 2 * T;

    const vMax = Math.max(...fasores.map(o => o.mod));
    const xScale = (t) => padL + (t / tMax) * innerW;
    const yScale = (v) => padT + innerH / 2 - (v / vMax) * (innerH / 2 - 4);

    const eixos = `
        <line x1="${padL}" y1="${padT + innerH / 2}" x2="${padL + innerW}" y2="${padT + innerH / 2}" stroke="var(--z-axis, #bdc3c7)" stroke-width="1"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="var(--z-axis, #bdc3c7)" stroke-width="1"/>`;

    const gridT = [0, 0.5, 1, 1.5, 2].map(k => {
        const t = k * T;
        const x = xScale(t);
        const lbl = k === 0 ? '0' : (k === 1 ? 'T' : (k === 2 ? '2T' : (k === 0.5 ? 'T/2' : '3T/2')));
        return `
            <line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + innerH}" stroke="var(--z-axis, #bdc3c7)" stroke-width="0.5" stroke-dasharray="2 4"/>
            <text x="${x}" y="${padT + innerH + 14}" text-anchor="middle" font-size="10" fill="var(--text-secondary, #7f8c8d)">${lbl}</text>`;
    }).join('');

    const corV = '#e74c3c';
    const corI = '#27ae60';
    const colorsByTipo = (tipo, idx) => tipo === 'V' ? corV : corI;
    const dashByIdx = (idx) => idx === 0 ? '' : (idx % 3 === 1 ? '6 4' : (idx % 3 === 2 ? '2 3' : '8 2 2 2'));

    const idxByTipo = { V: 0, I: 0 };
    const paths = fasores.map(o => {
        const i = idxByTipo[o.tipo]++;
        const pts = _ondaTemporalSamples(o.mod, o.faseUsr, f, conv, 240);
        const d = pts.map((p, k) => (k === 0 ? 'M ' : 'L ') + xScale(p.t).toFixed(2) + ',' + yScale(p.v).toFixed(2)).join(' ');
        const color = colorsByTipo(o.tipo, i);
        const dash = dashByIdx(i);
        return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="0.92"/>`;
    }).join('');

    const yLabels = [vMax, vMax / 2, 0, -vMax / 2, -vMax].map(v => {
        const y = yScale(v);
        const { mantissa, prefix } = formatMagnitudeEng(Math.abs(v));
        const txt = v === 0 ? '0' : `${v < 0 ? '−' : ''}${mantissa}${prefix ? ' ' + prefix : ''}`;
        return `<text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="var(--text-secondary, #7f8c8d)">${txt}</text>`;
    }).join('');

    const titulo = conv === 'sen' ? `V(t) = A·sen(ωt + φ)` : `V(t) = A·cos(ωt + φ)`;
    const subtitulo = `ω = 2π·${f} ≈ ${(2 * Math.PI * f).toPrecision(4)} rad/s &nbsp;·&nbsp; T = 1/f ≈ ${(1000 * T).toPrecision(3)} ms`;

    const itemLeg = (o, color) => {
        const { mantissa, prefix } = formatMagnitudeEng(o.mod);
        const fase = formatFaseLimpa(o.faseUsr);
        const trig = conv === 'sen' ? 'sen' : 'cos';
        return `<div class="onda-legend-item">
            <span class="fasor-legend-dot" style="background:${color}"></span>
            <span class="fasor-legend-name">${escapeXml(o.local)}</span>
            <span class="fasor-legend-val">${mantissa}${prefix ? ' ' + prefix : ''} ${trig}(ωt + ${fase}°) ${o.unidade}</span>
        </div>`;
    };
    const legV = fasores.filter(o => o.tipo === 'V').map(o => itemLeg(o, corV)).join('');
    const legI = fasores.filter(o => o.tipo === 'I').map(o => itemLeg(o, corI)).join('');

    const card = document.createElement('div');
    card.className = 'card card-ondas';
    card.innerHTML = `
        <h3 class="section-title">6. Ondas no tempo</h3>
        <p class="onda-subtitulo">${titulo} &nbsp;·&nbsp; ${subtitulo}</p>
        <div class="onda-svg-wrap">
            <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet">
                ${eixos}${gridT}${yLabels}${paths}
            </svg>
        </div>
        <div class="onda-legenda-grid">
            ${legV ? `<div class="onda-legenda-col"><div class="onda-legenda-titulo" style="color:${corV}">Tensões</div>${legV}</div>` : ''}
            ${legI ? `<div class="onda-legenda-col"><div class="onda-legenda-titulo" style="color:${corI}">Correntes</div>${legI}</div>` : ''}
        </div>
        <p class="onda-nota">As ondas mostradas cobrem dois períodos completos (0 a 2T). A escala vertical é normalizada pela maior amplitude (V e I compartilham o mesmo eixo apenas para visualização — em geral as escalas absolutas são diferentes).</p>
    `;
    container.appendChild(card);
}

/* ============================================================
 * FASE 4 — Modelagem matemática de complexos (frontend-only)
 *
 * O backend (IC_1905.nb) já modela Z_C = 1/(jωC) e Z_L = jωL ao montar
 * as equações MNA. Este bloco apenas torna essa matemática VISÍVEL para
 * o aluno (painel de impedâncias, tooltips no esquemático, aceitação de
 * entrada retangular "a+bj" em fontes AC). Não toca no contrato JSON
 * com o servidor.
 * ============================================================ */

/**
 * Frequência angular ω = 2πf da simulação atual. Retorna 0 em DC ou se
 * o campo de frequência estiver vazio/invalido.
 * @returns {number}
 */
function _omegaAtual() {
    if (getModoSimulacao() !== 'AC') return 0;
    const f = parseFloat(document.getElementById('inputFrequenciaAc')?.value);
    return Number.isFinite(f) ? 2 * Math.PI * f : 0;
}

/**
 * Converte uma string numérica com sufixo SI (k, M, m, u/µ, n, p, G) em
 * Number. Devolve NaN se a string não for um número simples.
 * Não aceita expressões — para isso use _parseRetangular.
 *
 * @param {string} s
 * @returns {number}
 */
function _parseNumeroSI(s) {
    if (s == null) return NaN;
    const t = String(s).trim();
    if (!t) return NaN;
    const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([kMmuµnpG])?\s*$/);
    if (!m) return NaN;
    const num = parseFloat(m[1]);
    const sufix = m[2] || '';
    const mult = { k: 1e3, M: 1e6, G: 1e9, m: 1e-3, u: 1e-6, 'µ': 1e-6, n: 1e-9, p: 1e-12 }[sufix];
    return num * (mult ?? 1);
}

/**
 * Tenta interpretar a string como um complexo retangular a+bj (ou a+bi).
 * Aceita as duas convenções comuns em engenharia elétrica:
 *
 *   - Notação matemática:  "5j", "-5j", "3+4j", "3-4j", "1.5e3+2j", "-3+4i"
 *   - Notação engenharia:  "j5", "-j5", "3+j4", "3-j4", "1.5e3+j2", "-3+i4"
 *
 * Cada coeficiente pode ter sufixo SI (ex.: "3k+4kj" ⇒ {re:3000, im:4000}).
 * Devolve null se a string não tiver a forma esperada (caller decide tratar
 * como número simples ou erro).
 *
 * @param {string} s
 * @returns {?{re:number, im:number}}
 */
function _parseRetangular(s) {
    if (s == null) return null;
    let t = String(s).trim().replace(/\s+/g, '').replace(/i/gi, 'j');
    if (!t || !/j/.test(t)) return null;
    // Normaliza "j5", "+j5", "-j5" para "5j", "+5j", "-5j" (engenharia → matemática)
    t = t.replace(/(^|[+\-])j(\d+\.?\d*(?:[eE][+-]?\d+)?[kMmuµnpG]?)/g, '$1$2j');
    if (!/j$/i.test(t)) return null;
    const NUM = '(?:[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?[kMmuµnpG]?)';
    const onlyImag = t.match(new RegExp(`^(${NUM})?j$`));
    if (onlyImag) {
        const raw = onlyImag[1];
        let im;
        if (raw === undefined || raw === '') im = 1;
        else if (raw === '+' || raw === '-') im = (raw === '-' ? -1 : 1);
        else im = _parseNumeroSI(raw);
        return Number.isFinite(im) ? { re: 0, im } : null;
    }
    const both = t.match(new RegExp(`^(${NUM})([+-](?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?[kMmuµnpG]?)j$`));
    if (both) {
        const re = _parseNumeroSI(both[1]);
        const im = _parseNumeroSI(both[2]);
        if (Number.isFinite(re) && Number.isFinite(im)) return { re, im };
    }
    return null;
}

/**
 * Conversão polar ↔ retangular.
 */
function _polarFromRect(re, im) {
    return { mod: Math.hypot(re, im), phaseDeg: Math.atan2(im, re) * 180 / Math.PI };
}

/**
 * Calcula a impedância de um componente passivo (R, C, L) no modo/freq
 * atuais. Retorna estrutura rica com forma simbólica, retangular e polar.
 *
 *  - DC + R    →  Z = R                       (real)
 *  - DC + C    →  Z = ∞ (aberto)              (tratado como simbólico)
 *  - DC + L    →  Z = 0 (curto)
 *  - AC + R    →  Z = R + 0j                  (ângulo 0°)
 *  - AC + C    →  Z = 1/(jωC) = 0 − j·1/(ωC)  (ângulo −90°)
 *  - AC + L    →  Z = jωL = 0 + j·ωL          (ângulo +90°)
 *
 * @param {{tipo:string, nome:string, valor:string}} comp
 * @param {number} omega
 * @returns {?{tipo:string, simbolo:string, formula:string, re:number, im:number, mod:number, phaseDeg:number, especial:?string}}
 */
function _impedanciaCompPassivo(comp, omega) {
    const modoAc = getModoSimulacao() === 'AC';
    if (comp.tipo === 'Resistor') {
        const r = _parseNumeroSI(comp.valor);
        if (!Number.isFinite(r)) return null;
        return { tipo: 'R', simbolo: 'R', formula: 'Z_R = R', re: r, im: 0, mod: r, phaseDeg: 0, especial: null };
    }
    if (comp.tipo === 'Capacitor') {
        const c = _parseNumeroSI(comp.valor);
        if (!Number.isFinite(c)) return null;
        if (!modoAc) {
            return { tipo: 'C', simbolo: 'C', formula: 'Z_C → ∞ (DC: aberto)', re: Infinity, im: 0, mod: Infinity, phaseDeg: 0, especial: 'aberto' };
        }
        if (omega === 0 || c === 0) return null;
        const im = -1 / (omega * c);
        return { tipo: 'C', simbolo: 'C', formula: 'Z_C = 1 / (jωC)', re: 0, im, mod: Math.abs(im), phaseDeg: -90, especial: null };
    }
    if (comp.tipo === 'Inductor') {
        const l = _parseNumeroSI(comp.valor);
        if (!Number.isFinite(l)) return null;
        if (!modoAc) {
            return { tipo: 'L', simbolo: 'L', formula: 'Z_L = 0 (DC: curto)', re: 0, im: 0, mod: 0, phaseDeg: 0, especial: 'curto' };
        }
        const im = omega * l;
        return { tipo: 'L', simbolo: 'L', formula: 'Z_L = jωL', re: 0, im, mod: Math.abs(im), phaseDeg: 90, especial: null };
    }
    return null;
}

/**
 * Formata um par (re, im) como string retangular em notação de engenharia
 * com sufixo SI, ex.: "3.00 k − 4.00 kj", "265 j" (im puro), "1.50 k" (real puro).
 *
 * @param {number} re
 * @param {number} im
 * @returns {string}
 */
function _fmtComplexRet(re, im) {
    if (!Number.isFinite(re)) return '∞';
    if (Math.abs(re) < 1e-15 && Math.abs(im) < 1e-15) return '0';
    const fmt = (v) => {
        const { mantissa, prefix } = formatMagnitudeEng(Math.abs(v));
        return prefix ? `${mantissa} ${prefix}` : mantissa;
    };
    if (Math.abs(re) < 1e-15) return `${im < 0 ? '−' : ''}${fmt(im)}j`;
    if (Math.abs(im) < 1e-15) return `${re < 0 ? '−' : ''}${fmt(re)}`;
    const sgnI = im < 0 ? '−' : '+';
    return `${re < 0 ? '−' : ''}${fmt(re)} ${sgnI} ${fmt(im)}j`;
}

/**
 * Formata um par (mod, fase°) em notação polar de engenharia,
 * ex.: "265 ∠ −90°", "1.50 k ∠ 0°".
 *
 * @param {number} mod
 * @param {number} phaseDeg
 * @returns {string}
 */
function _fmtPolarEng(mod, phaseDeg) {
    if (!Number.isFinite(mod)) return '∞';
    const { mantissa, prefix } = formatMagnitudeEng(mod);
    return `${prefix ? mantissa + ' ' + prefix : mantissa} ∠ ${formatFaseLimpa(phaseDeg)}°`;
}

/**
 * Gera um mini-SVG (110x110) com o diagrama de impedância no plano complexo
 * para um componente passivo. Eixos Re horizontal e Im vertical (com Im
 * crescendo para cima, ao contrário da coord. SVG).
 *
 *  - R puro     → vetor horizontal para +Re (0°)
 *  - L em AC    → vetor vertical para +Im (+90°)
 *  - C em AC    → vetor vertical para −Im (−90°)
 *  - L em DC    → ponto na origem com rótulo "Z = 0"
 *  - C em DC    → símbolo "∞" no infinito (texto)
 *
 * O vetor sempre tem comprimento gráfico fixo (40 px) — o diagrama é
 * esquemático, didático, não escalar entre componentes. O valor numérico
 * fica registrado fora do SVG (na tabela).
 *
 * @param {{re:number, im:number, mod:number, phaseDeg:number, simbolo:string, especial:?string}} z
 * @returns {string} SVG inline
 */
function _diagramaImpedanciaSvg(z) {
    const W = 110, H = 110;
    const cx = W / 2, cy = H / 2;
    const axisColor = 'var(--z-axis, #bdc3c7)';
    const vecColor = 'var(--z-vec, #c0392b)';
    const labelColor = 'var(--text-secondary, #7f8c8d)';

    if (z.especial === 'aberto') {
        return `<svg class="z-diagrama" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="Z = infinito">
            <line x1="6" y1="${cy}" x2="${W - 6}" y2="${cy}" stroke="${axisColor}" stroke-width="1"/>
            <line x1="${cx}" y1="6" x2="${cx}" y2="${H - 6}" stroke="${axisColor}" stroke-width="1"/>
            <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="28" font-weight="700" fill="${vecColor}">∞</text>
            <text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="9" fill="${labelColor}">DC: aberto</text>
        </svg>`;
    }
    if (z.especial === 'curto') {
        return `<svg class="z-diagrama" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="Z = 0">
            <line x1="6" y1="${cy}" x2="${W - 6}" y2="${cy}" stroke="${axisColor}" stroke-width="1"/>
            <line x1="${cx}" y1="6" x2="${cx}" y2="${H - 6}" stroke="${axisColor}" stroke-width="1"/>
            <circle cx="${cx}" cy="${cy}" r="5" fill="${vecColor}"/>
            <text x="${cx + 9}" y="${cy + 4}" font-size="11" font-weight="600" fill="${vecColor}">Z = 0</text>
            <text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="9" fill="${labelColor}">DC: curto</text>
        </svg>`;
    }

    const L = 40;
    let xEnd = cx, yEnd = cy;
    if (z.re === 0 && z.im > 0) yEnd = cy - L;
    else if (z.re === 0 && z.im < 0) yEnd = cy + L;
    else if (z.im === 0 && z.re > 0) xEnd = cx + L;
    else if (z.im === 0 && z.re < 0) xEnd = cx - L;
    else {
        const ang = Math.atan2(z.im, z.re);
        xEnd = cx + L * Math.cos(ang);
        yEnd = cy - L * Math.sin(ang);
    }

    const hasRe = Math.abs(z.re) > 1e-15;
    const hasIm = Math.abs(z.im) > 1e-15;
    const isMixed = hasRe && hasIm;

    let projections = '';
    if (isMixed) {
        projections = `
            <line x1="${cx}" y1="${cy}" x2="${xEnd}" y2="${cy}" stroke="${axisColor}" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="${xEnd}" y1="${cy}" x2="${xEnd}" y2="${yEnd}" stroke="${axisColor}" stroke-width="1" stroke-dasharray="3 3"/>`;
    }

    let rotuloPonta = '';
    if (z.simbolo === 'R') rotuloPonta = `<text x="${xEnd + 4}" y="${cy - 4}" font-size="11" font-weight="700" fill="${vecColor}">R</text>`;
    else if (z.simbolo === 'L') rotuloPonta = `<text x="${cx + 6}" y="${yEnd + 6}" font-size="11" font-weight="700" fill="${vecColor}">+jX<tspan font-size="8" baseline-shift="sub">L</tspan></text>`;
    else if (z.simbolo === 'C') rotuloPonta = `<text x="${cx + 6}" y="${yEnd - 2}" font-size="11" font-weight="700" fill="${vecColor}">−jX<tspan font-size="8" baseline-shift="sub">C</tspan></text>`;

    return `<svg class="z-diagrama" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-label="Diagrama de impedância">
        <defs>
            <marker id="z-arrow-${z.simbolo}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="${vecColor}"/>
            </marker>
        </defs>
        <line x1="6" y1="${cy}" x2="${W - 6}" y2="${cy}" stroke="${axisColor}" stroke-width="1"/>
        <line x1="${cx}" y1="6" x2="${cx}" y2="${H - 6}" stroke="${axisColor}" stroke-width="1"/>
        <text x="${W - 4}" y="${cy - 3}" text-anchor="end" font-size="8" fill="${labelColor}">Re</text>
        <text x="${cx + 3}" y="9" font-size="8" fill="${labelColor}">Im</text>
        ${projections}
        <line x1="${cx}" y1="${cy}" x2="${xEnd}" y2="${yEnd}" stroke="${vecColor}" stroke-width="2.2" marker-end="url(#z-arrow-${z.simbolo})"/>
        ${rotuloPonta}
    </svg>`;
}

/**
 * Renderiza o painel "Impedâncias do circuito" (Fase 4 — meta A) com uma
 * tabela de Z em forma polar e retangular para cada R/L/C, mais um mini
 * diagrama no plano complexo (meta E). Em DC, ainda mostra R (resistivo)
 * e indica L→curto / C→aberto.
 *
 * Não emite painel se não houver componentes passivos.
 *
 * @param {HTMLElement} container - Geralmente #resultado
 */
function renderPainelImpedancias(container) {
    const modo = getModoSimulacao();
    const omega = _omegaAtual();
    const top = getTopologiaAtual();
    const passivos = top.filter(c => c.tipo === 'Resistor' || c.tipo === 'Capacitor' || c.tipo === 'Inductor');
    if (passivos.length === 0) return;

    const freqEl = document.getElementById('inputFrequenciaAc');
    const f = freqEl ? parseFloat(freqEl.value) : NaN;
    const freqLine = modo === 'AC' && Number.isFinite(f)
        ? `f = ${f} Hz &nbsp;·&nbsp; ω = 2πf ≈ ${omega.toPrecision(4)} rad/s`
        : 'Modo DC (ω = 0)';

    let rows = '';
    passivos.forEach(c => {
        const z = _impedanciaCompPassivo(c, omega);
        if (!z) {
            rows += `<tr><td><strong>${escapeXml(c.nome)}</strong></td><td>${c.tipo}</td><td colspan="4" class="z-invalido">valor inválido</td></tr>`;
            return;
        }
        let polarStr, rectStr;
        if (z.especial === 'aberto') { polarStr = '∞'; rectStr = '∞'; }
        else if (z.especial === 'curto') { polarStr = '0'; rectStr = '0'; }
        else { polarStr = _fmtPolarEng(z.mod, z.phaseDeg) + ' Ω'; rectStr = _fmtComplexRet(z.re, z.im) + ' Ω'; }
        const diagrama = _diagramaImpedanciaSvg(z);
        rows += `
            <tr>
                <td><strong>${escapeXml(c.nome)}</strong></td>
                <td>${z.simbolo} = ${escapeXml(c.valor || '?')}</td>
                <td><code class="z-formula">${z.formula}</code></td>
                <td><span class="z-polar">${polarStr}</span></td>
                <td><span class="z-rect">${rectStr}</span></td>
                <td class="z-diagrama-cell">${diagrama}</td>
            </tr>`;
    });

    const html = `
        <div class="card card-impedancias">
            <h3 class="section-title">2. Impedâncias do circuito</h3>
            <p class="impedancias-freq">${freqLine}</p>
            <div class="impedancias-tabela-wrap">
                <table class="impedancias-table">
                    <thead><tr><th>Comp.</th><th>Valor</th><th>Fórmula</th><th>Polar (|Z| ∠ θ)</th><th>Retangular (R + jX)</th><th>Diagrama</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p class="impedancias-nota">
                Reatância capacitiva <code>X_C = 1/(ωC)</code>, impedância <code>Z_C = −jX_C</code>.
                Reatância indutiva <code>X_L = ωL</code>, impedância <code>Z_L = +jX_L</code>.
                Esses valores são substituídos automaticamente nas equações MNA acima.
                O <em>diagrama</em> à direita situa cada Z no plano complexo
                (eixo horizontal = parte resistiva, eixo vertical = reatância);
                R fica em <code>+Re</code>, indutor em <code>+Im</code>, capacitor em <code>−Im</code>.
            </p>
        </div>`;
    container.insertAdjacentHTML('beforeend', html);
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

    // Sanitização de complexos retangulares vindos do Wolfram.
    //
    // O TeXForm de algo como "5. + 3.*I" pode chegar de duas formas:
    //   (a) "v(1) = 5. , +3. i"          (vírgula espúria entre partes)
    //   (b) "v(1) = 5.\\, +3.\\, i"      (TeX thin space "\\,")
    // ... e, para complexos com parte real zero:
    //   (c) "v(2) = (0. , -26.5258i) i(C1)"
    //
    // 1) Trocamos qualquer espaço fino TeX (\\, \\; \\:) por espaço normal e
    //    removemos o negative-thin-space (\\!).
    // 2) Removemos o ponto solto ao fim de um inteiro — só remove ponto não
    //    seguido de dígito (3.14 fica intacto).
    // 3) Removemos a vírgula espúria entre número/) e sinal.
    // 4) Quando o parêntese (ou "=") abre com "0 +X" ou "0 -X", omitimos o
    //    zero real redundante para que a saída fique "(-26.5258i)" em vez de
    //    "(0 -26.5258i)" — mais limpa didaticamente.
    s = s.replace(/\\[,;:]/g, ' ');
    s = s.replace(/\\!/g, '');
    s = s.replace(/(\d+)\.(?!\d)/g, '$1');
    s = s.replace(/(\d|\))\s*,\s*([+\-])/g, '$1 $2');
    s = s.replace(/(\(|=)\s*0\s+([+\-])/g, '$1 $2');

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

    const desloc = deslocFaseConvencao();

    /** @type {Array<{mod:number, fase:number, local:string, unidade:string, tipo:'V'|'I'}>} */
    const fasores = [];
    resultados.forEach(r => {
        const p = parsePolar(r.ValorNumerico);
        if (!p || !(p.mod > 0)) return;
        fasores.push({
            mod: p.mod,
            fase: p.fase + desloc,
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

    const convNota = getConvencaoTemporal() === 'sen'
        ? `<p class="fasor-conv-aviso">Fases exibidas na convenção <code>sen(ωt + φ)</code> (escolhida nas Configurações AC).</p>`
        : '';

    const card = document.createElement('div');
    card.className = 'card card-fasorial';
    card.innerHTML = `
        <h3 class="section-title">5. Diagrama Fasorial</h3>
        ${convNota}
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
            const modoAc = getModoSimulacao() === 'AC';
            const topPassivos = getTopologiaAtual().some(c => c.tipo === 'Capacitor' || c.tipo === 'Inductor');
            const notaReatancias = (modoAc && topPassivos)
                ? `<p class="mna-reatancias-nota">Reatâncias substituídas automaticamente: <code>Z_L = jωL</code> para indutores, <code>Z_C = 1/(jωC)</code> para capacitores. O detalhamento numérico está no painel <em>Impedâncias do circuito</em> abaixo.</p>`
                : '';
            let html = `<div class="card"><h3 class="section-title">1. Equações do Sistema (MNA)</h3>${notaReatancias}`;
            dados.Equacoes.forEach(eq => {
                const limpa = limparEquacaoAC(eq).replace("==", "=");
                html += `<div class="formula">\` ${limpa} \`</div>`;
            });
            divRes.innerHTML += html + `</div>`;
        }

        // FASE 4 (A): Painel de impedâncias entre MNA e Superposição.
        // Só emite algo se houver componentes passivos no circuito.
        renderPainelImpedancias(divRes);

        // Superposição: a API pode omitir a chave, enviar null ou [] — ainda assim mostramos o bloco 2 com passos ou avisos locais.
        if (Array.isArray(dados.Superposicao) && dados.Superposicao.length > 0) {
            let html = `<div class="card"><h3 class="section-title">3. Superposição</h3><div class="super-container">`;
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

            const avisoSuper = (msg) => `<div class="card"><h3 class="section-title">3. Superposição</h3><div style="background:#fffcf5; border-left:5px solid #f1c40f; padding:12px; border-radius:6px;"><p style="margin:0;">⚠️ <em>${msg}</em></p></div></div>`;

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
            const desloc = deslocFaseConvencao();
            let html = `<div class="card"><h3 class="section-title">4. Resultados Finais</h3>`;
            dados.Resultados.forEach(r => {
                const f = formatarResultadoEng(r.ValorNumerico, r.Unidade, desloc);
                html += `<div style="border-bottom:1px solid #eee; margin-bottom:10px;"><strong>${r.Local}:</strong><div class="numeric-result">= ${f.valor} ${f.unidade}</div></div>`;
            });
            divRes.innerHTML += html + `</div>`;
        }

        if (getModoSimulacao() === 'AC' && Array.isArray(dados.Resultados)) {
            renderFasorial(dados.Resultados, divRes);
            renderOndasTemporais(dados.Resultados, divRes);
        }

        if (dados.Malhas) {
            let html = `<div class="card" style="border-left: 5px solid #8e44ad;"><h3 class="section-title" style="color: #8e44ad;">7. Análise de Malhas</h3>`;
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
        // FASE 5.2: trafo continua aparecendo no esquemático mesmo se o
        // primário ou o secundário estiverem temporariamente com curto;
        // o validarTopologia já sinaliza o erro com tooltip.
        if (tipo !== 'Transformer' && nA === nB) return;
        let nC = null, nD = null;
        if (tipo === 'VCVS' || tipo === 'VCCS' || tipo === 'Transformer') {
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
    // FASE 5.2: trafos têm 4 nós e não cabem na lógica shunt/series do
    // renderizador atual. Separamos antes para que sejam desenhados em um
    // painel próprio abaixo do esquemático principal.
    const trafos = topologia.filter(c => c.tipo === 'Transformer');
    const semTrafos = topologia.filter(c => c.tipo !== 'Transformer');

    const nodesSet = new Set();
    semTrafos.forEach(c => {
        nodesSet.add(c.nA); nodesSet.add(c.nB);
        if (c.nC != null) nodesSet.add(c.nC);
        if (c.nD != null) nodesSet.add(c.nD);
    });
    const nonGroundNodes = [...nodesSet].filter(n => n !== 0).sort((a, b) => a - b);

    const shunts = [];
    const series = [];

    semTrafos.forEach(c => {
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

    return { nonGroundNodes, shunts, series, trafos };
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
    let svg = '';
    if (t === 'Resistor') svg = symResistor(cx, cy, orient, comp.nome, comp.valor);
    else if (t === 'Capacitor') svg = symCapacitor(cx, cy, orient, comp.nome, comp.valor);
    else if (t === 'Inductor') svg = symInductor(cx, cy, orient, comp.nome, comp.valor);
    else if (t === 'VoltageSource') svg = symVoltageSource(cx, cy, orient, comp.nome, comp.valor, comp._positiveOnA);
    else if (t === 'CurrentSource') svg = symCurrentSource(cx, cy, orient, comp.nome, comp.valor, comp._fromAtoB);
    else if (t === 'VCVS' || t === 'VCCS' || t === 'CCVS' || t === 'CCCS') {
        const ctrl = (t === 'VCVS' || t === 'VCCS')
            ? (comp.nC != null && comp.nD != null ? `v(${comp.nC},${comp.nD})` : null)
            : (comp.alvo || null);
        svg = symDependentSource(t, cx, cy, orient, comp.nome, comp.valor, ctrl);
    }

    // FASE 4 (B): tooltip nativo SVG via <title> com a impedância dos passivos.
    if (svg && (t === 'Resistor' || t === 'Capacitor' || t === 'Inductor')) {
        const z = _impedanciaCompPassivo(comp, _omegaAtual());
        if (z) {
            let titleTxt;
            if (z.especial === 'aberto') titleTxt = `${comp.nome} (${z.simbolo} = ${comp.valor})\n${z.formula}`;
            else if (z.especial === 'curto') titleTxt = `${comp.nome} (${z.simbolo} = ${comp.valor})\n${z.formula}`;
            else titleTxt = `${comp.nome} (${z.simbolo} = ${comp.valor})\n${z.formula}\nZ = ${_fmtComplexRet(z.re, z.im)} Ω\nZ = ${_fmtPolarEng(z.mod, z.phaseDeg)} Ω`;
            svg = svg.replace('<g class="esq-sym">', `<g class="esq-sym"><title>${escapeXml(titleTxt)}</title>`);
        }
    }
    return svg;
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

    const { nonGroundNodes, shunts, series, trafos } = analyzeTopology(topologia);

    if (!nonGroundNodes.length && (!trafos || !trafos.length)) {
        wrap.innerHTML = '<div class="esq-empty">Topologia degenerada: todos os terminais estão no terra. Conecte ao menos um nó não-zero.</div>';
        return;
    }
    if (!nonGroundNodes.length && trafos && trafos.length) {
        // Caso raro: só há trafos no circuito. Renderiza apenas o painel de trafos.
        wrap.innerHTML = renderPainelTrafos(trafos);
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

    // FASE 5.2: trafos são desenhados em um painel próprio abaixo do SVG.
    const painelTrafos = (trafos && trafos.length) ? renderPainelTrafos(trafos) : '';

    wrap.innerHTML = parts.join('') + painelTrafos;
}

/**
 * FASE 5.2: gera o HTML/SVG do painel de transformadores ideais que aparece
 * abaixo do esquemático principal. Cada trafo é desenhado como duas bobinas
 * em espiral (símbolo IEEE) com os 4 nós rotulados e a razão N1:N2.
 *
 * @param {Array} trafos - Lista de objetos {tipo:'Transformer', nome, nA, nB, nC, nD, valor}.
 * @returns {string}
 */
function renderPainelTrafos(trafos) {
    if (!trafos || !trafos.length) return '';
    const cards = trafos.map(t => {
        const W = 220, H = 130;
        const xPri = 70, xSec = 150, yTop = 30, yBot = 100;
        // 4 meias-elipses para a bobina primária (vertical) e secundária
        const espiral = (cx) => {
            const arcs = [];
            for (let i = 0; i < 4; i++) {
                const yA = yTop + 7 + i * 17;
                const yB = yA + 14;
                arcs.push(`<path d="M ${cx},${yA} Q ${cx + 9},${(yA + yB) / 2} ${cx},${yB}" stroke="var(--esq-stroke, #2c3e50)" stroke-width="2" fill="none"/>`);
            }
            return arcs.join('');
        };
        // Núcleo (duas barras verticais entre as bobinas)
        const nucleo = `
            <line x1="${(xPri + xSec) / 2 - 4}" y1="${yTop + 5}" x2="${(xPri + xSec) / 2 - 4}" y2="${yBot - 5}" stroke="var(--esq-stroke, #2c3e50)" stroke-width="1.5"/>
            <line x1="${(xPri + xSec) / 2 + 4}" y1="${yTop + 5}" x2="${(xPri + xSec) / 2 + 4}" y2="${yBot - 5}" stroke="var(--esq-stroke, #2c3e50)" stroke-width="1.5"/>`;
        // Pontos de polaridade (topo de cada bobina, lado interno do núcleo)
        const dotPri = `<circle cx="${xPri + 11}" cy="${yTop + 4}" r="2.5" fill="var(--esq-stroke, #2c3e50)"/>`;
        const dotSec = `<circle cx="${xSec - 11}" cy="${yTop + 4}" r="2.5" fill="var(--esq-stroke, #2c3e50)"/>`;
        // Stubs e labels dos nós
        const stubs = `
            <line x1="20" y1="${yTop}" x2="${xPri}" y2="${yTop}" stroke="var(--esq-wire, #2c3e50)" stroke-width="2"/>
            <line x1="20" y1="${yBot}" x2="${xPri}" y2="${yBot}" stroke="var(--esq-wire, #2c3e50)" stroke-width="2"/>
            <line x1="${xSec}" y1="${yTop}" x2="${W - 20}" y2="${yTop}" stroke="var(--esq-wire, #2c3e50)" stroke-width="2"/>
            <line x1="${xSec}" y1="${yBot}" x2="${W - 20}" y2="${yBot}" stroke="var(--esq-wire, #2c3e50)" stroke-width="2"/>
            <text x="10" y="${yTop - 4}" font-size="11" text-anchor="middle" fill="var(--esq-stroke, #2c3e50)">${escapeXml(t.nA)}</text>
            <text x="10" y="${yBot + 14}" font-size="11" text-anchor="middle" fill="var(--esq-stroke, #2c3e50)">${escapeXml(t.nB)}</text>
            <text x="${W - 10}" y="${yTop - 4}" font-size="11" text-anchor="middle" fill="var(--esq-stroke, #2c3e50)">${escapeXml(t.nC)}</text>
            <text x="${W - 10}" y="${yBot + 14}" font-size="11" text-anchor="middle" fill="var(--esq-stroke, #2c3e50)">${escapeXml(t.nD)}</text>`;
        const valorTexto = (t.valor || '1').includes(':') ? t.valor : `n=${t.valor}`;
        return `
            <div class="trafo-card">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="trafo-svg" role="img" aria-label="Transformador ${escapeXml(t.nome)}">
                    ${stubs}
                    ${espiral(xPri)}
                    ${espiral(xSec)}
                    ${nucleo}
                    ${dotPri}
                    ${dotSec}
                </svg>
                <div class="trafo-info">
                    <strong>${escapeXml(t.nome)}</strong>
                    <span class="trafo-razao">${escapeXml(valorTexto)}</span>
                    <span class="trafo-nos">Pri: ${escapeXml(t.nA)}/${escapeXml(t.nB)} &middot; Sec: ${escapeXml(t.nC)}/${escapeXml(t.nD)}</span>
                </div>
            </div>`;
    }).join('');
    return `
        <div class="trafo-panel">
            <h4 class="trafo-panel-title">Transformadores ideais</h4>
            <p class="trafo-panel-note">Trafos ideais (4 terminais) s&atilde;o renderizados em separado &mdash; os pontos pretos indicam a polaridade convencional (mesma fase de tens&atilde;o).</p>
            <div class="trafo-panel-grid">${cards}</div>
        </div>`;
}

/* ---------- Live preview & tabs ---------- */

let _esqDebounceTimer = null;
function agendarRerenderEsquematico() {
    if (_esqDebounceTimer) clearTimeout(_esqDebounceTimer);
    _esqDebounceTimer = setTimeout(() => {
        try { renderEsquematico(); }
        catch (e) { /* preview não pode quebrar a UI; falha silenciosa */ }
        try { validarTopologia(); }
        catch (e) { /* validação não pode quebrar a UI; falha silenciosa */ }
        try { salvarEstadoLocal(); }
        catch (e) { /* persistência não pode quebrar a UI; falha silenciosa */ }
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
 * Remove um componente do DOM com auto-cicatrização da cadeia em série:
 *
 * - Se o componente tem EXATAMENTE 1 filho direto (outro componente
 *   inserido em série com este, e ainda atrelado pelo nó intermediário),
 *   faz "splice": o filho assume a posição estrutural deste no encadeamento.
 *   Concretamente, o terminal "interno" do filho (o que enxergava o
 *   intermediário) é redirecionado para o terminal "externo" deste
 *   componente; e os metadados de inserção em série deste componente são
 *   herdados pelo filho. Resultado: a cadeia continua funcionando como
 *   se este componente nunca tivesse existido (do ponto de vista da
 *   referência original / "avô" na cadeia).
 *
 * - Se o componente NÃO tem filhos (folha da cadeia), faz o restore
 *   simples: restaura o terminal original da referência, desde que ela
 *   ainda use o nó intermediário criado por esta inserção.
 *
 * - Se o componente tem >1 filho adjacente (caso topológico ramificado
 *   raro), faz fallback para restore simples para não introduzir gaps.
 *
 * @param {HTMLLIElement} li - O elemento .comp-item a remover.
 */
function removerComponente(li) {
    if (!li) return;
    const myUid = li.dataset.uid;

    const childrenAll = myUid
        ? Array.from(document.querySelectorAll('.comp-item'))
            .filter(el => el !== li && el.dataset.seriesRefUid === myUid)
        : [];

    const parentNA = parseInt(li.querySelector('.no-a')?.value, 10);
    const parentNB = parseInt(li.querySelector('.no-b')?.value, 10);

    const adjacentChildren = childrenAll.filter(child => {
        const cSide = child.dataset.seriesSide;
        const cNewNode = parseInt(child.dataset.seriesNewNode, 10);
        if ((cSide !== 'A' && cSide !== 'B') || !Number.isFinite(cNewNode)) return false;
        const parentVal = cSide === 'A' ? parentNA : parentNB;
        return parentVal === cNewNode;
    });

    if (adjacentChildren.length === 1) {
        const child = adjacentChildren[0];
        const cSide = child.dataset.seriesSide;
        const childInnerSelector = cSide === 'A' ? '.no-b' : '.no-a';
        const parentOuterValue = cSide === 'A' ? parentNB : parentNA;
        const childInnerEl = child.querySelector(childInnerSelector);
        if (childInnerEl && Number.isFinite(parentOuterValue)) {
            childInnerEl.value = String(parentOuterValue);
            childInnerEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const parentSeriesRefUid = li.dataset.seriesRefUid;
        if (parentSeriesRefUid) {
            child.dataset.seriesRefUid = parentSeriesRefUid;
            child.dataset.seriesSide = li.dataset.seriesSide;
            child.dataset.seriesOldValue = li.dataset.seriesOldValue;
            child.dataset.seriesNewNode = li.dataset.seriesNewNode;
        } else {
            delete child.dataset.seriesRefUid;
            delete child.dataset.seriesSide;
            delete child.dataset.seriesOldValue;
            delete child.dataset.seriesNewNode;
        }
    } else {
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

/* ============================================================
 * FASE 5.A — Persistência local + Exportação SVG/PNG
 * Salva o circuito automaticamente em localStorage e oferece
 * restauração via banner. Permite baixar o esquemático em SVG ou PNG.
 * Não toca no contrato com o backend Wolfram.
 * ============================================================ */

const _STORAGE_KEY_CIRCUITO = 'circuitoSalvo';
const _STATE_VERSION = 1;

/**
 * Serializa todo o estado do circuito (modo, frequência, lista de
 * componentes com nós/valores/metadados de série) em um objeto plano.
 *
 * @returns {Object} estado serializado, pronto para JSON.stringify.
 */
function coletarEstadoCompleto() {
    const componentes = [];
    document.querySelectorAll('.comp-item').forEach(item => {
        const tipo = item.dataset.tipo;
        const ds = item.dataset;
        const seriesMeta = ds.seriesRefUid ? {
            refUid: ds.seriesRefUid,
            side: ds.seriesSide || null,
            oldValue: ds.seriesOldValue || null,
            newNode: ds.seriesNewNode || null
        } : null;

        componentes.push({
            uid: ds.uid || null,
            tipo,
            nome: (item.querySelector('.nome-comp')?.value || '').trim(),
            nos: {
                a: item.querySelector('.no-a')?.value ?? null,
                b: item.querySelector('.no-b')?.value ?? null,
                c: item.querySelector('.no-c')?.value ?? null,
                d: item.querySelector('.no-d')?.value ?? null
            },
            valor: item.querySelector('.val-input:not(.val-input-dc):not(.val-input-mod):not(.val-input-fase)')?.value ?? null,
            valorDc: item.querySelector('.val-input-dc')?.value ?? null,
            valorMod: item.querySelector('.val-input-mod')?.value ?? null,
            valorFase: item.querySelector('.val-input-fase')?.value ?? null,
            alvo: item.querySelector('.alvo-comp')?.value ?? null,
            seriesMeta
        });
    });

    return {
        version: _STATE_VERSION,
        timestamp: Date.now(),
        modo: getModoSimulacao(),
        frequencia: document.getElementById('inputFrequenciaAc')?.value || '60',
        convencaoSeno: getConvencaoTemporal(),
        componentes
    };
}

let _saveDebounceTimer = null;
/**
 * Salva o estado atual no localStorage com debounce de 500ms.
 * Se não houver componentes, remove a chave (em vez de salvar lista vazia).
 */
function salvarEstadoLocal() {
    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => {
        try {
            const state = coletarEstadoCompleto();
            if (!state.componentes.length) {
                localStorage.removeItem(_STORAGE_KEY_CIRCUITO);
                return;
            }
            localStorage.setItem(_STORAGE_KEY_CIRCUITO, JSON.stringify(state));
        } catch (e) { /* localStorage cheio/desabilitado: falha silenciosa */ }
    }, 500);
}

function lerEstadoSalvo() {
    try {
        const raw = localStorage.getItem(_STORAGE_KEY_CIRCUITO);
        if (!raw) return null;
        const state = JSON.parse(raw);
        if (!state || state.version !== _STATE_VERSION) return null;
        if (!Array.isArray(state.componentes) || !state.componentes.length) return null;
        return state;
    } catch (e) { return null; }
}

function descartarEstadoSalvo() {
    try { localStorage.removeItem(_STORAGE_KEY_CIRCUITO); }
    catch (e) { /* ignore */ }
}

/**
 * Recria todos os componentes a partir de um estado serializado.
 * Restaura também os metadados de inserção em série (para que a função
 * de splice/restore na deleção continue funcionando).
 *
 * @param {Object} state - Estado lido via lerEstadoSalvo().
 */
function restaurarEstadoSalvo(state) {
    if (!state || !Array.isArray(state.componentes)) return;

    limparTudo();

    const toggleAc = document.getElementById('toggleModoAc');
    if (toggleAc) {
        toggleAc.checked = state.modo === 'AC';
        sincronizarModoSimulacao();
    }
    const freqEl = document.getElementById('inputFrequenciaAc');
    if (freqEl && state.frequencia != null) freqEl.value = state.frequencia;

    // FASE 5.1: restaura convenção temporal cos/sen, se presente
    if (state.convencaoSeno === 'sen' || state.convencaoSeno === 'cos') {
        const radio = document.querySelector(`input[name="convencaoSeno"][value="${state.convencaoSeno}"]`);
        if (radio) {
            radio.checked = true;
            sincronizarConvencaoTemporal();
        }
    }

    state.componentes.forEach(comp => {
        const nos = [parseInt(comp.nos.a, 10), parseInt(comp.nos.b, 10)];
        if (comp.tipo === 'VCVS' || comp.tipo === 'VCCS' || comp.tipo === 'Transformer') {
            nos.push(parseInt(comp.nos.c, 10), parseInt(comp.nos.d, 10));
        }

        let valArg = null;
        if (comp.tipo === 'VoltageSource' || comp.tipo === 'CurrentSource') {
            valArg = state.modo === 'AC' ? comp.valorMod : comp.valorDc;
        } else {
            valArg = comp.valor;
        }

        add(comp.tipo, comp.nome, nos, valArg, comp.alvo);

        const li = document.getElementById('listaComponentes').lastElementChild;
        if (!li) return;

        if (comp.tipo === 'VoltageSource' || comp.tipo === 'CurrentSource') {
            const dcEl = li.querySelector('.val-input-dc');
            const modEl = li.querySelector('.val-input-mod');
            const faseEl = li.querySelector('.val-input-fase');
            if (dcEl && comp.valorDc != null) dcEl.value = comp.valorDc;
            if (modEl && comp.valorMod != null) modEl.value = comp.valorMod;
            if (faseEl && comp.valorFase != null) faseEl.value = comp.valorFase;
        }

        if (comp.uid) li.dataset.uid = comp.uid;

        if (comp.seriesMeta) {
            li.dataset._pendingSeriesRefUid = comp.seriesMeta.refUid;
            if (comp.seriesMeta.side) li.dataset._pendingSeriesSide = comp.seriesMeta.side;
            if (comp.seriesMeta.oldValue != null) li.dataset._pendingSeriesOldValue = comp.seriesMeta.oldValue;
            if (comp.seriesMeta.newNode != null) li.dataset._pendingSeriesNewNode = comp.seriesMeta.newNode;
        }
    });

    document.querySelectorAll('.comp-item').forEach(li => {
        if (li.dataset._pendingSeriesRefUid) {
            li.dataset.seriesRefUid = li.dataset._pendingSeriesRefUid;
            li.dataset.seriesSide = li.dataset._pendingSeriesSide || '';
            li.dataset.seriesOldValue = li.dataset._pendingSeriesOldValue || '';
            li.dataset.seriesNewNode = li.dataset._pendingSeriesNewNode || '';
            delete li.dataset._pendingSeriesRefUid;
            delete li.dataset._pendingSeriesSide;
            delete li.dataset._pendingSeriesOldValue;
            delete li.dataset._pendingSeriesNewNode;
        }
    });
}

function mostrarBannerRestauracao(state) {
    const banner = document.getElementById('bannerRestaurarCircuito');
    if (!banner || !state) return;
    const dt = new Date(state.timestamp || Date.now());
    const dataFmt = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const n = state.componentes.length;
    const compTexto = n === 1 ? '1 componente' : n + ' componentes';
    const msgEl = banner.querySelector('.banner-msg');
    if (msgEl) {
        msgEl.innerHTML = `Encontramos um circuito salvo automaticamente (<strong>${compTexto}</strong>, ${escapeXml(dataFmt)}).`;
    }
    banner.hidden = false;
}

function escondeBannerRestauracao() {
    const banner = document.getElementById('bannerRestaurarCircuito');
    if (banner) banner.hidden = true;
}

function onRestaurarCircuitoClick() {
    const state = lerEstadoSalvo();
    if (state) restaurarEstadoSalvo(state);
    escondeBannerRestauracao();
}

function onDescartarCircuitoClick() {
    descartarEstadoSalvo();
    escondeBannerRestauracao();
}

/* ---------- Exportação SVG / PNG ---------- */

const _CSS_VARS_PARA_EXPORT = [
    '--esq-stroke', '--esq-wire', '--esq-node-fill', '--esq-node-stroke',
    '--esq-gnd', '--esq-bg', '--esq-label-name', '--esq-label-val', '--esq-ctrl',
    '--text-primary', '--text-title'
];

function resolverVariaveisCss() {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    _CSS_VARS_PARA_EXPORT.forEach(v => {
        out[v] = (cs.getPropertyValue(v) || '').trim() || '#000000';
    });
    return out;
}

function exportarSvgString() {
    const svgEl = document.querySelector('#esquematicoWrap svg');
    if (!svgEl) return null;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const vars = resolverVariaveisCss();
    const vb = (clone.getAttribute('viewBox') || '0 0 600 400').split(/\s+/).map(Number);
    const widthVB = vb[2] || 600;
    const heightVB = vb[3] || 400;
    clone.setAttribute('width', widthVB);
    clone.setAttribute('height', heightVB);

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
        .esq-label--name { font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 700; font-size: 12px; fill: ${vars['--esq-label-name']}; paint-order: stroke; stroke: ${vars['--esq-bg']}; stroke-width: 3px; stroke-linejoin: round; }
        .esq-label--val  { font-family: 'Courier New', monospace; font-weight: 500; font-size: 11px; fill: ${vars['--esq-label-val']}; paint-order: stroke; stroke: ${vars['--esq-bg']}; stroke-width: 3px; stroke-linejoin: round; }
        .esq-label--node { font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 700; font-size: 11px; fill: #ffffff; text-anchor: middle; dominant-baseline: central; }
        .esq-label--ctrl { font-family: 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 600; font-size: 10px; fill: ${vars['--esq-ctrl']}; font-style: italic; paint-order: stroke; stroke: ${vars['--esq-bg']}; stroke-width: 3px; stroke-linejoin: round; }
    `;
    clone.insertBefore(styleEl, clone.firstChild);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', widthVB);
    rect.setAttribute('height', heightVB);
    rect.setAttribute('fill', vars['--esq-bg']);
    clone.insertBefore(rect, styleEl.nextSibling);

    let str = new XMLSerializer().serializeToString(clone);
    Object.keys(vars).forEach(v => {
        const safe = v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp('var\\(\\s*' + safe + '\\s*\\)', 'g');
        str = str.replace(re, vars[v]);
    });
    return { svg: str, width: widthVB, height: heightVB };
}

function nomeArquivoExport(ext) {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `esquematico-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}

function baixarBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function baixarEsquematicoSvg() {
    const out = exportarSvgString();
    if (!out) { alert('Adicione componentes para gerar o esquemático.'); return; }
    const blob = new Blob([out.svg], { type: 'image/svg+xml;charset=utf-8' });
    baixarBlob(blob, nomeArquivoExport('svg'));
}

function baixarEsquematicoPng() {
    const out = exportarSvgString();
    if (!out) { alert('Adicione componentes para gerar o esquemático.'); return; }
    const scale = 2;
    const blob = new Blob([out.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(out.width * scale);
        canvas.height = Math.round(out.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(b => {
            URL.revokeObjectURL(url);
            if (b) baixarBlob(b, nomeArquivoExport('png'));
            else alert('Falha ao gerar o PNG.');
        }, 'image/png');
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        alert('Falha ao gerar o PNG. Use o SVG.');
    };
    img.src = url;
}

/* ============================================================
 * FASE 4 — Acessibilidade: atalhos, tooltips inline, validações
 * Não interfere na lógica de simulação nem no contrato JSON.
 * ============================================================ */

/**
 * Tabela de tooltips por classe de input. O atributo `title` nativo
 * fornece o hint quando o usuário passa o mouse sobre o campo.
 */
const _TOOLTIPS = {
    'no-a': 'Nó positivo (terminal A). Use 0 para terra (GND).',
    'no-b': 'Nó negativo (terminal B). Use 0 para terra (GND).',
    'no-c': 'Nó positivo do controle (entrada da fonte dependente).',
    'no-d': 'Nó negativo do controle (entrada da fonte dependente).',
    'val-input': 'Valor numérico. Aceita sufixos: k (10³), M (10⁶ — maiúsculo), m (10⁻³ — minúsculo), u (10⁻⁶), n (10⁻⁹), p (10⁻¹²).',
    'val-input-dc': 'Valor DC. Aceita sufixos k/M/m/u/n/p.',
    'val-input-mod': 'Módulo (amplitude) da fonte AC. Aceita sufixos k/M/m/u/n/p. Aceita também forma retangular: "3+4j" (matemática) ou "3+j4" (engenharia) — o campo Fase é calculado automaticamente.',
    'val-input-fase': 'Fase em graus. Pode ser negativa (ex: -30). Ignorada se o Módulo for digitado em forma retangular "a+bj" / "a+jb".',
    'nome-comp': 'Nome do componente. Deve ser único.',
    'alvo-comp': 'Nome do componente cuja corrente serve de referência. Deve existir na lista.'
};

/**
 * Atribui `title` aos inputs do comp-item recém-criado, conforme a tabela
 * acima. Não sobrescreve titles previamente definidos.
 *
 * @param {HTMLLIElement} li
 */
function aplicarTooltipsComponente(li) {
    if (!li) return;
    Object.keys(_TOOLTIPS).forEach(cls => {
        li.querySelectorAll('.' + cls).forEach(el => {
            if (!el.title) el.title = _TOOLTIPS[cls];
        });
    });
}

/**
 * Valida topologia em tempo real e marca visualmente os componentes
 * problemáticos. Emite avisos (amarelo) e erros (vermelho) no painel
 * #painelAvisosTopologia.
 *
 * Checagens:
 *  - Nomes duplicados (erro)
 *  - Curto-circuito interno (nA === nB) — erro, ou aviso se ambos == 0
 *  - CCVS/CCCS com Alvo vazio ou apontando para nome inexistente (erro)
 *  - Nó isolado (grau 1 no grafo completo, exceto GND) — aviso
 */
function validarTopologia() {
    const painel = document.getElementById('painelAvisosTopologia');
    if (!painel) return;
    const items = Array.from(document.querySelectorAll('.comp-item'));
    items.forEach(it => it.classList.remove('has-error', 'has-warning'));

    const erros = [];
    const avisos = [];

    const seen = new Map();
    items.forEach(it => {
        const nome = (it.querySelector('.nome-comp')?.value || '').trim();
        if (!nome) return;
        if (seen.has(nome)) {
            erros.push(`Nome duplicado: <code>${escapeXml(nome)}</code>`);
            it.classList.add('has-error');
            seen.get(nome).classList.add('has-error');
        } else {
            seen.set(nome, it);
        }
    });

    items.forEach(it => {
        const a = parseInt(it.querySelector('.no-a')?.value, 10);
        const b = parseInt(it.querySelector('.no-b')?.value, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return;
        if (a !== b) return;
        const nome = (it.querySelector('.nome-comp')?.value || '?').trim();
        if (a === 0) {
            avisos.push(`<code>${escapeXml(nome)}</code> tem ambos os terminais no GND (sem efeito no circuito).`);
            it.classList.add('has-warning');
        } else {
            erros.push(`<code>${escapeXml(nome)}</code> tem terminais idênticos (curto interno no nó ${a}).`);
            it.classList.add('has-error');
        }
    });

    items.forEach(it => {
        const tipo = it.dataset.tipo;
        if (tipo !== 'CCVS' && tipo !== 'CCCS') return;
        const alvoEl = it.querySelector('.alvo-comp');
        const alvo = alvoEl ? alvoEl.value.trim() : '';
        const nome = (it.querySelector('.nome-comp')?.value || '?').trim();
        if (!alvo) {
            erros.push(`<code>${escapeXml(nome)}</code> está sem o componente de <em>Alvo</em> (corrente de referência).`);
            it.classList.add('has-error');
            return;
        }
        const existe = items.some(o => o !== it && (o.querySelector('.nome-comp')?.value || '').trim() === alvo);
        if (!existe) {
            erros.push(`<code>${escapeXml(nome)}</code> referencia <code>${escapeXml(alvo)}</code>, mas esse componente não existe.`);
            it.classList.add('has-error');
        }
    });

    // FASE 5.2: validações específicas para Transformer
    items.forEach(it => {
        if (it.dataset.tipo !== 'Transformer') return;
        const nome = (it.querySelector('.nome-comp')?.value || '?').trim();
        const a = parseInt(it.querySelector('.no-a')?.value, 10);
        const b = parseInt(it.querySelector('.no-b')?.value, 10);
        const c = parseInt(it.querySelector('.no-c')?.value, 10);
        const d = parseInt(it.querySelector('.no-d')?.value, 10);
        const nosOk = [a, b, c, d].every(Number.isFinite);
        if (!nosOk) {
            erros.push(`<code>${escapeXml(nome)}</code> (trafo) tem algum nó vazio ou inválido.`);
            it.classList.add('has-error');
            return;
        }
        if (a === b) {
            erros.push(`<code>${escapeXml(nome)}</code>: terminais do primário não podem ser iguais.`);
            it.classList.add('has-error');
        }
        if (c === d) {
            erros.push(`<code>${escapeXml(nome)}</code>: terminais do secundário não podem ser iguais.`);
            it.classList.add('has-error');
        }
        const valEl = it.querySelector('.val-input');
        const raz = valEl ? valEl.value.trim() : '';
        if (normalizarRazaoTrafo(raz) == null) {
            erros.push(`<code>${escapeXml(nome)}</code> tem razão inválida (use formatos como <code>1:2</code>, <code>1/2</code>, <code>0.5</code> ou <code>2</code>; deve ser positiva).`);
            it.classList.add('has-error');
        }
    });

    const nodeUsages = new Map();
    items.forEach(it => {
        ['no-a', 'no-b', 'no-c', 'no-d'].forEach(cls => {
            const el = it.querySelector('.' + cls);
            if (!el) return;
            const n = parseInt(el.value, 10);
            if (!Number.isFinite(n)) return;
            if (!nodeUsages.has(n)) nodeUsages.set(n, []);
            nodeUsages.get(n).push(it);
        });
    });
    nodeUsages.forEach((usages, node) => {
        if (node === 0) return;
        if (usages.length === 1) {
            const it = usages[0];
            const nome = (it.querySelector('.nome-comp')?.value || '?').trim();
            avisos.push(`Nó <code>${node}</code> só aparece em <code>${escapeXml(nome)}</code> (sem fechamento de malha).`);
            it.classList.add('has-warning');
        }
    });

    if (!erros.length && !avisos.length) {
        painel.hidden = true;
        painel.innerHTML = '';
        delete painel.dataset.severity;
        return;
    }

    painel.dataset.severity = erros.length ? 'error' : 'warning';
    let html = '';
    if (erros.length) {
        html += `<h4>&#9940; ${erros.length} erro(s) detectado(s)</h4><ul>`
            + erros.map(e => `<li>${e}</li>`).join('') + '</ul>';
    }
    if (avisos.length) {
        const sep = erros.length ? 'style="margin-top:8px"' : '';
        html += `<h4 ${sep}>&#9888;&#65039; ${avisos.length} aviso(s)</h4><ul>`
            + avisos.map(a => `<li>${a}</li>`).join('') + '</ul>';
    }
    painel.innerHTML = html;
    painel.hidden = false;
}

/**
 * Instala atalhos globais de teclado:
 *  - Ctrl+Enter (ou Cmd+Enter no macOS): aciona "Analisar Completo".
 */
function setupAtalhosTeclado() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const btn = document.getElementById('btnAnalisarCompleto');
            if (btn) {
                e.preventDefault();
                btn.click();
            }
        }
    });
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

    // FASE 5.1: restaura convenção temporal cos/sen do localStorage e
    // registra listeners para persistência + re-render do esquemático.
    try {
        const convSalva = localStorage.getItem('simConvencaoSeno');
        if (convSalva === 'sen' || convSalva === 'cos') {
            const radio = document.querySelector(`input[name="convencaoSeno"][value="${convSalva}"]`);
            if (radio) radio.checked = true;
        }
    } catch (e) { /* ignore */ }
    document.querySelectorAll('input[name="convencaoSeno"]').forEach(r => {
        r.addEventListener('change', sincronizarConvencaoTemporal);
    });

    setupOutputTabs();
    setupEsquematicoLive();
    setupDialogoRelacionar();
    setupAtalhosTeclado();
    aplicarTooltipsGlobais();

    const estadoSalvo = lerEstadoSalvo();
    if (estadoSalvo) mostrarBannerRestauracao(estadoSalvo);
});

function aplicarTooltipsGlobais() {
    const freq = document.getElementById('inputFrequenciaAc');
    if (freq && !freq.title) freq.title = 'Frequência em Hz. Use 60 para rede brasileira, 50 para europeia.';
    const toggleAc = document.getElementById('toggleModoAc');
    if (toggleAc && !toggleAc.title) toggleAc.title = 'Alterna entre DC (corrente contínua) e AC (corrente alternada).';
    const btnAnalisar = document.getElementById('btnAnalisarCompleto');
    if (btnAnalisar) btnAnalisar.title = 'Analisa o circuito (atalho: Ctrl+Enter)';
    const radioCos = document.querySelector('input[name="convencaoSeno"][value="cos"]');
    if (radioCos && !radioCos.title) radioCos.title = 'V(t) = A·cos(ωt + φ). Convenção padrão de engenharia elétrica e análise fasorial.';
    const radioSen = document.querySelector('input[name="convencaoSeno"][value="sen"]');
    if (radioSen && !radioSen.title) radioSen.title = 'V(t) = A·sen(ωt + φ). Convenção comum em física geral. Os resultados são convertidos automaticamente.';
}
