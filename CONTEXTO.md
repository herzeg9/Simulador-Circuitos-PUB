# ⚡ Laboratório Virtual de Circuitos (Projeto PUB 2025)

## 🎯 Objetivo
Simulador web de circuitos elétricos capaz de realizar análise Nodal (MNA), Superposição e Análise de Malhas, com suporte a componentes passivos e Fontes Dependentes.

## 🛠️ Stack Tecnológica
- **Frontend:** HTML5, CSS3 (Design Responsivo), Javascript (Vanilla).
- **Backend:** Wolfram Cloud API (Mathematica).
- **Renderização Matemática:** MathJax.

## 📡 API Endpoint (V15 - Stable)
URL: `https://www.wolframcloud.com/obj/herzeghenrique/MinhaAPI_Circuitos_V15`

### Formato de Envio (JSON)
Método: `POST`
Campo: `netlist` (String JSON)

Exemplo de Objeto Componente:
1. **Resistor:** `{"Componente": "R1", "Tipo": "Resistor", "Valor": "1k", "Nos": [1, 2]}`
2. **Fonte Tensão:** `{"Componente": "V1", "Tipo": "VoltageSource", "Valor": "10", "Nos": [1, 0]}`
3. **Fonte Dependente (VCVS):** `{"Componente": "E1", "Tipo": "VCVS", "Valor": "2", "Nos": [Saida+, Saida-, Ctrl+, Ctrl-]}`
   - Ex: `Nos: [2, 0, 1, 0]` (Ganho 2, Saída no nó 2, Controlado pelo nó 1).

## 🧠 Regras de Negócio Importantes
1. **Tratamento de Unidades:** O Frontend deve converter strings como "1k", "10m", "1M" para multiplicadores matemáticos ("*1000", "*0.001") antes de enviar para a API.
2. **Sanitização:** A API V15 remove underscores (`_`) dos nomes internamente.
3. **Malhas:** A API retorna as malhas fundamentais baseadas em Grafos. Se o circuito for linear simples, pode retornar vazio.
4. **Superposição:** Se houver Fontes Dependentes (`VCVS`), a API desativa a superposição passo-a-passo (retorna lista vazia), e o Frontend deve exibir um aviso ao usuário.

## 🎨 Padrão Visual (CSS)
- Resistor: Amarelo (`.type-Resistor`)
- Tensão: Vermelho (`.type-VoltageSource`)
- Corrente: Verde (`.type-CurrentSource`)
- Dependente: Roxo (`.type-VCVS`)