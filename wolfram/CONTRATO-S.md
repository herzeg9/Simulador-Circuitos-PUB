# Contrato do modo s (Laplace) — site e notebook

A base é o notebook que está no ar, a V25 (cópia em `wolfram/origem-v25-henrique.nb`). DC e AC dessa célula foram mantidos: C aberto e L em curto no DC, `1/(I*omega*C)` e `I*omega*L` no AC, `cleanTeX` nas equações, superposição só em circuito resistivo com mais de uma fonte. O modo S foi acrescentado ao lado.

Arquivo para publicar: `wolfram/simulador-circuitos-api-v2.nb` (programa completo, gerado a partir de `simulador-circuitos-api-v2.wl`). O CloudDeploy continua no **mesmo** objeto:

`https://www.wolframcloud.com/obj/herzeghenrique/simulador-circuitos-api-v2`

Enquanto esse objeto não for republicado, o site aceita o modo s na interface, valida o circuito e, se a nuvem responder sem `Modo: "S"`, mostra um aviso em vez de tratar a resposta numérica de DC como se fosse Laplace.

## O que mudou no notebook

- `Config.Modo` aceita `"DC"`, `"AC"` e `"S"` (também `"Laplace"`). DC e AC mantêm as mesmas equações de antes: C aberto / L curto em DC; `1/(jωC)` e `jωL` em AC; fontes AC por `Modulo` e `Fase`; superposição só em circuitos resistivos com mais de uma fonte.
- No modo S, capacitor e indutor **continuam** com `Tipo` `"Capacitor"` e `"Inductor"`. A troca de impedância acontece só dentro de `processCircuit`:
  - capacitor: `v(n1) − v(n2) = i/(s C) + v(0)/s` (impedância `1/(sC)` em série com fonte `v(0)/s`)
  - indutor: `v(n1) − v(n2) = (s L) i − L i(0)` (impedância `sL` em série com fonte `−L i(0)`)
- `v(0)` vem de `v0` no capacitor e `i(0)` vem de `i0` no indutor. `CondicaoInicial` continua aceito como alias dos dois. Zero é válido. Campo ausente ou vazio é erro.
- Fonte independente no modo S usa `Laplace`:
  - `step` (também `degrau`): `A/s`
  - `impulse` (também `impulso`, `delta`): `A`
  - `exponential` (também `exponencial`, `exp`): `A/(s+α)`, com α de `e^{−α t}`
  - sem `Laplace`, a amplitude é `Valor` e a forma é degrau
- Em DC e AC a resposta é a da V25 (`Equacoes` via `cleanTeX`, sem chave `Modo`). No modo S, `Equacoes` vai em InputForm e `EquacoesTeX` em TeXForm, porque o `cleanTeX` apaga `}` e quebraria frações.
- A resposta do modo S traz expressões simbólicas (`Expressao`, `ExpressaoTeX`) e, quando a inversa fecha, amostras de `y(t)` para o gráfico.
- No modo S o notebook recusa, com as mesmas frases do site:
  - capacitor sem `v(0)`, indutor sem `i(0)`
  - CCVS/CCCS (H/F) sem `Alvo` apontando para outro componente
  - VCVS/VCCS (E/G) com Ctrl+ ou Ctrl− sem nó resolvido (nó 0 é terra; um pino sozinho num nó que ninguém mais usa não conta)

## Pedido (POST, campo de formulário `netlist`, JSON em string)

```json
{
  "Config": { "Modo": "S", "Frequencia": 60 },
  "Netlist": [
    {
      "Componente": "V1",
      "Tipo": "VoltageSource",
      "Nos": [1, 0],
      "Valor": "10",
      "Laplace": { "Tipo": "step", "Amplitude": "10", "Alpha": "0" }
    },
    {
      "Componente": "R1",
      "Tipo": "Resistor",
      "Nos": [1, 2],
      "Valor": "1000"
    },
    {
      "Componente": "C1",
      "Tipo": "Capacitor",
      "Nos": [2, 0],
      "Valor": "0.0001",
      "v0": "0",
      "CondicaoInicial": "0"
    },
    {
      "Componente": "L1",
      "Tipo": "Inductor",
      "Nos": [2, 3],
      "Valor": "0.1",
      "i0": "0.02",
      "CondicaoInicial": "0.02"
    },
    {
      "Componente": "H1",
      "Tipo": "CCVS",
      "Nos": [3, 0],
      "Valor": "2",
      "Alvo": "R1"
    }
  ]
}
```

`Frequencia` é ignorada nas equações do modo S (o site ainda envia o número para não mudar o formato). Sufixos `k/M/m/u/n/p` são expandidos **no site** antes do envio (`100u` → `100*0.000001`). O notebook faz `ToExpression` nessa string.

`E`/`G` (VCVS/VCCS) não usam `Alvo`: a referência são os nós 3 e 4, `Nos = [out+, out−, ctrl+, ctrl−]`.

Formas de fonte aceitas em `Laplace.Tipo`: `step`, `impulse`, `exponential` (e os aliases `degrau`, `impulso`, `exponencial`). O site manda o nome em inglês.

## Resposta no modo S

```json
{
  "Modo": "S",
  "Equacoes": ["v[1] - v[2] == ..."],
  "EquacoesTeX": ["v(1)-v(2)=\\cdots"],
  "Superposicao": [],
  "NosLista": [1, 2],
  "Substituicoes": [
    {
      "Componente": "C1",
      "Tipo": "Capacitor",
      "Impedancia": "1/(s*C)",
      "FonteSerie": "v(0)/s",
      "CondicaoInicial": "0"
    }
  ],
  "Resultados": [
    {
      "Local": "Nó 2",
      "Unidade": "V",
      "ValorNumerico": "10/(s*(1 + s))",
      "Expressao": "10/(s*(1 + s))",
      "ExpressaoTeX": "\\frac{10}{s (1+s)}",
      "Tempo": {
        "Expressao": "10*(1 - E^(-t))",
        "ExpressaoTeX": "10 (1-e^{-t})",
        "Amostras": [[0, 0], [0.1, 0.95]]
      }
    }
  ],
  "Aviso": "opcional, se o circuito sair do escopo inicial"
}
```

DC e AC devolvem o mesmo miolo de antes (`Equacoes` via `cleanTeX`, `Superposicao`, `Resultados` com `ValorNumerico` numérico, `NosLista`) e passam a incluir `"Modo": "DC"` ou `"Modo": "AC"`. O site antigo ignora essa chave.

Erro (HTTP 200 com JSON, como hoje):

```json
{ "Erro": "O capacitor C1 está sem a condição inicial v(0). ..." }
```

## Escopo inicial

Uma fonte independente e dois ou três R/L/C. Circuitos maiores, com fonte dependente já resolvida ou com trafo, ainda são montados pelo MNA; a resposta pode trazer `Aviso`.

## Como importar e publicar

1. Abra `wolfram/simulador-circuitos-api-v2.nb` no Wolfram desktop ou na Wolfram Cloud (File → Open).
2. Avalie a **primeira célula de código** (Shift+Enter). Ela define `processCircuit` e o resto. A saída é a frase de confirmação. Nada é publicado nessa célula.
3. Avalie a **célula de testes**. Ela chama `processCircuit` em cinco circuitos e devolve um resumo:
   - divisor DC: nó 2 = `5.00000e0`
   - RC em AC: sem `Erro`, valores polares
   - RC degrau no modo S (`R = 1`, `C = 1`, `v(0) = 0`, fonte `10/s`): expressão em `s` para a tensão no capacitor, da família `10/(s (s+1))`
   - capacitor sem `CondicaoInicial`: `Erro` citando `v(0)`
   - CCVS sem `Alvo`: `Erro` citando referência de controle
4. Avalie a **célula CloudDeploy**. Ela faz:

```wolfram
apiEndpoint = APIFunction[{"netlist" -> "String"}, processCircuit[#netlist] &, "String"];
CloudDeploy[apiEndpoint, "simulador-circuitos-api-v2", Permissions -> "Public"]
```

5. A saída é um `CloudObject` com a URL acima. A partir daí o botão Resolução do site, no modo **s**, mostra as expressões (MathJax) e o gráfico quando `Tempo.Amostras` vier preenchido.

Para regenerar o `.nb` depois de editar o `.wl`: `python3 wolfram/build_nb.py`.

## O que o site já faz

- Seletor DC / AC / s. C e L não mudam de símbolo na placa nem na lista.
- No modo s aparecem `v(0)` no capacitor, `i(0)` no indutor, e na fonte a forma degrau / impulso / exponencial mais amplitude e α.
- Antes do `fetch`, o site bloqueia com as frases deste contrato se faltar condição inicial ou referência de controle (E/G/H/F).
- DC e AC não passam por essa validação.
