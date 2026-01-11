// Script de teste para validar circuitos na API
// Requer Node.js 18+ (com fetch nativo) ou instale: npm install node-fetch form-data

const API_URL = "https://www.wolframcloud.com/obj/herzeghenrique/MinhaAPI_Circuitos_V15";

// Exemplos extraídos do script.js
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
    ]
};

/**
 * Processa valores com sufixos (k, m, M, u) para o formato esperado pela API
 * @param {string} valor - Valor com possível sufixo (ex: "1k", "100", "10m")
 * @returns {string} - Valor processado (ex: "1*1000", "100", "10*0.001")
 */
function processarValor(valor) {
    if (!valor) return valor;
    return valor
        .replace(/k/g, "*1000")
        .replace(/m/g, "*0.001")
        .replace(/M/g, "*1000000")
        .replace(/u/g, "*0.000001");
}

/**
 * Prepara o netlist para envio, processando os valores
 * @param {Array} exemplo - Array de componentes do exemplo
 * @returns {Array} - Netlist processado
 */
function prepararNetlist(exemplo) {
    return exemplo.map(comp => ({
        ...comp,
        Valor: processarValor(comp.Valor)
    }));
}

/**
 * Cria FormData compatível com Node.js
 */
function criarFormData() {
    // Tenta usar FormData global (Node.js 18+ com undici)
    if (typeof FormData !== 'undefined') {
        return new FormData();
    }
    
    // Fallback: usa biblioteca form-data
    try {
        const FormDataLib = require('form-data');
        return new FormDataLib();
    } catch (e) {
        throw new Error('FormData não disponível. Instale: npm install form-data');
    }
}

/**
 * Obtém função fetch compatível
 */
function obterFetch() {
    if (typeof fetch !== 'undefined') {
        return fetch;
    }
    
    // Fallback: usa node-fetch
    try {
        return require('node-fetch');
    } catch (e) {
        throw new Error('fetch não disponível. Use Node.js 18+ ou instale: npm install node-fetch');
    }
}

/**
 * Testa um circuito enviando para a API e verificando a resposta
 * @param {string} nome - Nome do circuito (divisor, ponte, amp)
 * @param {Array} netlist - Array de componentes do circuito
 * @returns {Promise<{nome: string, passou: boolean, erro?: string}>}
 */
async function testarCircuito(nome, netlist) {
    try {
        const formData = criarFormData();
        formData.append("netlist", JSON.stringify(netlist));

        const fetchFunction = obterFetch();
        
        // Configura headers se necessário (para form-data library)
        const opcoes = {
            method: "POST",
            body: formData
        };
        
        if (formData.getHeaders) {
            opcoes.headers = formData.getHeaders();
        }

        const resposta = await fetchFunction(API_URL, opcoes);

        if (!resposta.ok) {
            return {
                nome,
                passou: false,
                erro: `HTTP ${resposta.status}: ${resposta.statusText}`
            };
        }

        const dados = await resposta.json();

        // Verifica se há erro na resposta da API
        if (dados.Erro) {
            return {
                nome,
                passou: false,
                erro: dados.Erro
            };
        }

        // Verifica se contém os campos obrigatórios
        const temResultados = dados.Resultados !== undefined && dados.Resultados !== null;
        const temEquacoes = dados.Equacoes !== undefined && dados.Equacoes !== null;

        if (temResultados && temEquacoes) {
            return {
                nome,
                passou: true
            };
        } else {
            const camposFaltando = [];
            if (!temResultados) camposFaltando.push("Resultados");
            if (!temEquacoes) camposFaltando.push("Equacoes");
            
            return {
                nome,
                passou: false,
                erro: `Campos faltando: ${camposFaltando.join(", ")}`
            };
        }
    } catch (erro) {
        return {
            nome,
            passou: false,
            erro: erro.message
        };
    }
}

/**
 * Função principal que executa todos os testes
 */
async function executarTestes() {
    console.log("🧪 Iniciando testes dos circuitos...\n");
    console.log("API:", API_URL);
    console.log("Circuitos a testar:", Object.keys(exemplos).join(", "));
    console.log("─".repeat(50) + "\n");

    const resultados = [];

    // Testa cada circuito
    for (const [nome, exemplo] of Object.entries(exemplos)) {
        const netlist = prepararNetlist(exemplo);
        console.log(`Testando: ${nome.toUpperCase()}...`);
        
        const resultado = await testarCircuito(nome, netlist);
        resultados.push(resultado);

        // Imprime resultado
        if (resultado.passou) {
            console.log(`✅ ${nome.toUpperCase()}: PASSOU\n`);
        } else {
            console.log(`❌ ${nome.toUpperCase()}: FALHOU`);
            if (resultado.erro) {
                console.log(`   Erro: ${resultado.erro}\n`);
            }
        }

        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumo final
    console.log("─".repeat(50));
    console.log("📊 RESUMO DOS TESTES:");
    console.log("─".repeat(50));
    
    const passaram = resultados.filter(r => r.passou).length;
    const falharam = resultados.filter(r => !r.passou).length;
    
    resultados.forEach(r => {
        const status = r.passou ? "✅ PASSOU" : "❌ FALHOU";
        console.log(`${status.padEnd(12)} - ${r.nome.toUpperCase()}`);
    });
    
    console.log("─".repeat(50));
    console.log(`Total: ${resultados.length} | Passaram: ${passaram} | Falharam: ${falharam}`);
    
    // Exit code baseado no resultado
    process.exit(falharam > 0 ? 1 : 0);
}

// Executa os testes
executarTestes().catch(erro => {
    console.error("❌ Erro fatal ao executar testes:", erro);
    process.exit(1);
});
