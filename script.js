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
        <button class="btn-del" onclick="this.parentElement.remove()">×</button>
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
 * Realiza o envio do circuito (netlist) para a API Wolfram Cloud e exibe os resultados processados na interface.
 * Exibe também indicadores de carregamento, trata erros e mostra resultados múltiplos (equações, superposição, malhas etc.).
 * @returns {Promise<void>}
 */
async function calcular() {
    const divRes = document.getElementById('resultado');
    const load = document.getElementById('loading');
    
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
            dados.Equacoes.forEach(eq => html += `<div class="formula">\` ${eq.replace("==", "=")} \`</div>`);
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
            dados.Resultados.forEach(r => html += `<div style="border-bottom:1px solid #eee; margin-bottom:10px;"><strong>${r.Local}:</strong><div class="numeric-result">= ${r.ValorNumerico} ${r.Unidade}</div></div>`);
            divRes.innerHTML += html + `</div>`;
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
});
