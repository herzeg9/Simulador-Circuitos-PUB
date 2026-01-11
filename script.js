const API_URL = "https://www.wolframcloud.com/obj/herzeghenrique/MinhaAPI_Circuitos_V16"; 

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
    ]
};

/**
 * Carrega um exemplo de circuito, limpando a lista atual e preenchendo com os componentes do exemplo selecionado.
 * @param {string} chave - Chave do exemplo a ser carregado ('divisor', 'ponte', 'amp', 'misto').
 * @returns {void}
 */
function carregarExemplo(chave) {
    const lista = document.getElementById('listaComponentes');
    lista.innerHTML = ""; 
    idCounter = 1;
    if(!chave || !exemplos[chave]) return;

    exemplos[chave].forEach(comp => {
        // Neste contexto, tanto para 'VCVS' quanto para outros tipos, a chamada é idêntica.
        add(comp.Tipo, comp.Componente, comp.Nos, comp.Valor);
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

/**
 * Adiciona um componente à interface com base nos parâmetros especificados.
 * @param {string} tipo - O tipo de componente ('Resistor', 'VoltageSource', 'VCVS', etc).
 * @param {?string} nomeFixo - Um nome pré-definido para o componente, se existir.
 * @param {?Array<number>} nosInput - Array de nós para o componente, por exemplo: [1,0] para fontes e resistores; [out+,out-,in+,in-] para VCVS.
 * @param {?string|number} val - O valor do componente (resistência, tensão, ganho...).
 * @returns {void}
 */
function add(tipo, nomeFixo=null, nosInput=null, val=null) {
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
        label='G'; nome=`E${id}`; valLabel="Ganho";
        // Para VCVS, há 4 nós: saída+ saída- entrada+ entrada-
        inputsNos = `
        <span style="font-size:0.7em; color:#9b59b6;">Out:</span>
        <input type="number" class="no-a" value="${nA}" style="width:30px">
        <input type="number" class="no-b" value="${nB}" style="width:30px">
        <span style="font-size:0.7em; color:#9b59b6;">In:</span>
        <input type="number" class="no-c" value="${nC}" style="width:30px">
        <input type="number" class="no-d" value="${nD}" style="width:30px">`;
    }

    // Estrutura HTML personalizada do componente na interface
    // Envolvendo o input de valor em uma div wrapper para suportar tooltip
    li.innerHTML = `
        <span class="comp-badge">${label}</span>
        <input type="text" class="nome-comp" value="${nomeFixo || nome}" style="width:50px; font-weight:bold;">
        <div class="nodes-group">${inputsNos}</div>
        <span style="font-size:0.8em; color:#999; margin-left:5px">${valLabel}</span>
        <span class="val-input-wrapper">
            <input type="text" class="val-input" value="${val || (tipo==='VCVS'?'2':(tipo==='Capacitor'?'100u':(tipo==='Inductor'?'1m':'1k')))}" data-tipo="${tipo}">
        </span>
        <button class="btn-del" onclick="this.parentElement.remove()">×</button>
    `;
    lista.appendChild(li);
    
    // Adiciona event listeners para validação em tempo real
    const valInput = li.querySelector('.val-input');
    if (valInput) {
        // Valida ao digitar
        valInput.addEventListener('input', function() {
            validarInputValor(this, tipo);
        });
        
        // Valida ao perder o foco
        valInput.addEventListener('blur', function() {
            validarInputValor(this, tipo);
        });
        
        // Valida valor inicial se houver
        if (val) {
            validarInputValor(valInput, tipo);
        }
    }
}

/**
 * Gera um array de objetos com a descrição dos componentes do circuito,
 * extraindo os valores dos campos da UI (nome, valor, tipo, e nós).
 * 
 * Sobre a lógica de substituição dos sufixos: para campos de valor (val-input), 
 * realiza-se uma substituição para transformar sufixos comuns de eletrônica (k, m, M, u, n, p)
 * em fatores numéricos multiplicativos:
 * - 'k' é substituído por '*1000'
 * - 'M' (maiúsculo) por '*1000000'
 * - 'm' (minúsculo) por '*0.001'
 * - 'u' por '*0.000001'
 * - 'n' por '*0.000000001'
 * - 'p' por '*0.000000000001'
 * Desta forma, o valor "1k" se torna "1*1000" e pode ser avaliado/multiplicado corretamente no backend.
 * Se o valor está vazio, utiliza o nome do componente como valor.
 * 
 * @returns {Array<Object>} Array de objetos do netlist para uso posterior (envio à API).
 */
function gerarJSON() {
    const itens = document.querySelectorAll('.comp-item');
    const netlist = [];
    itens.forEach(item => {
        let tipo = item.dataset.tipo;
        let valRaw = item.querySelector('.val-input').value;
        // Caso o valor esteja em branco, usa o nome do componente como valor padrão
        if(!valRaw) {
            valRaw = item.querySelector('.nome-comp').value;
        } else {
            // Lógica de substituição dos sufixos: transforma "1k", "1M", "1m", "1u", "1n", "1p" em expressões numéricas
            // Ordem importante: M (mega) antes de m (mili) para evitar substituições incorretas
            valRaw = valRaw
                .replace(/k/g, "*1000")
                .replace(/M/g, "*1000000")
                .replace(/m/g, "*0.001")
                .replace(/u/g, "*0.000001")
                .replace(/n/g, "*0.000000001")
                .replace(/p/g, "*0.000000000001");
        }

        let nos = [];
        // Para VCVS, espera-se 4 nós, nas posições: saída+, saída-, entrada+, entrada-
        if (tipo === 'VCVS') {
            nos = [
                parseInt(item.querySelector('.no-a').value), 
                parseInt(item.querySelector('.no-b').value),
                parseInt(item.querySelector('.no-c').value), 
                parseInt(item.querySelector('.no-d').value)
            ];
        } else {
            // Para outros tipos (Resistor, Fontes), dois nós: [no+, no-]
            nos = [
                parseInt(item.querySelector('.no-a').value), 
                parseInt(item.querySelector('.no-b').value)
            ];
        }

        netlist.push({ 
            "Componente": item.querySelector('.nome-comp').value, 
            "Tipo": tipo, 
            "Valor": valRaw, 
            "Nos": nos 
        });
    });
    return netlist;
}

/**
 * Valida todos os componentes antes de enviar para a API.
 * Verifica se há valores negativos em Resistências ou Capacitâncias.
 * @returns {Object} - {valido: boolean, erros: Array<string>}
 */
function validarAntesEnvio() {
    const erros = [];
    const itens = document.querySelectorAll('.comp-item');
    
    itens.forEach(item => {
        const tipo = item.dataset.tipo;
        const valInput = item.querySelector('.val-input');
        
        if (valInput) {
            const valor = valInput.value.trim();
            if (validarValorNegativo(tipo, valor)) {
                const nomeComp = item.querySelector('.nome-comp').value || 'Componente sem nome';
                erros.push(`${nomeComp} (${tipo}): valor não pode ser negativo`);
                
                // Garante que o erro visual está visível
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

        if (dados.Superposicao && dados.Superposicao.length > 0) {
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
        } else if (dados.Superposicao) {
             divRes.innerHTML += `<div class="card" style="background:#fffcf5; border-left:5px solid #f1c40f"><p>⚠️ <em>A Superposição passo-a-passo foi ocultada pois o circuito contém Fontes Dependentes.</em></p></div>`;
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
});
