(* Avalie esta célula depois das definições. Ela não publica a API.
   O divisor DC deve mostrar o nó 2 igual a 5.00000e0.
   O RC em modo S deve ter Modo -> "S" e uma expressão com s.
   Sem v(0) e sem Alvo devem voltar Erro em português. *)

resumir[json_String] := Module[{d},
  d = ImportString[json, "RawJSON"];
  If[KeyExistsQ[d, "Erro"],
    <|"Erro" -> d["Erro"]|>,
    <|
      "Modo" -> Lookup[d, "Modo", ""],
      "Resultados" -> Map[
        #["Local"] -> Lookup[#, "Expressao", Lookup[#, "ValorNumerico", ""]] &,
        d["Resultados"]
      ]
    |>
  ]
];

payloadDC = ExportString[<|
  "Config" -> <|"Modo" -> "DC", "Frequencia" -> 60|>,
  "Netlist" -> {
    <|"Componente" -> "V1", "Tipo" -> "VoltageSource", "Valor" -> "10", "Nos" -> {1, 0}|>,
    <|"Componente" -> "R1", "Tipo" -> "Resistor", "Valor" -> "100", "Nos" -> {1, 2}|>,
    <|"Componente" -> "R2", "Tipo" -> "Resistor", "Valor" -> "100", "Nos" -> {2, 0}|>
  }
|>, "JSON"];

payloadAC = ExportString[<|
  "Config" -> <|"Modo" -> "AC", "Frequencia" -> 60|>,
  "Netlist" -> {
    <|"Componente" -> "V1", "Tipo" -> "VoltageSource", "Modulo" -> "10", "Fase" -> "0", "Nos" -> {1, 0}|>,
    <|"Componente" -> "R1", "Tipo" -> "Resistor", "Valor" -> "1000", "Nos" -> {1, 2}|>,
    <|"Componente" -> "C1", "Tipo" -> "Capacitor", "Valor" -> "0.000001", "Nos" -> {2, 0}|>
  }
|>, "JSON"];

payloadS = ExportString[<|
  "Config" -> <|"Modo" -> "S", "Frequencia" -> 60|>,
  "Netlist" -> {
    <|"Componente" -> "V1", "Tipo" -> "VoltageSource", "Valor" -> "10", "Nos" -> {1, 0},
      "Laplace" -> <|"Tipo" -> "step", "Amplitude" -> "10", "Alpha" -> "0"|>|>,
    <|"Componente" -> "R1", "Tipo" -> "Resistor", "Valor" -> "1", "Nos" -> {1, 2}|>,
    <|"Componente" -> "C1", "Tipo" -> "Capacitor", "Valor" -> "1", "Nos" -> {2, 0}, "v0" -> "0"|>
  }
|>, "JSON"];

payloadSemIC = ExportString[<|
  "Config" -> <|"Modo" -> "S"|>,
  "Netlist" -> {
    <|"Componente" -> "V1", "Tipo" -> "VoltageSource", "Valor" -> "10", "Nos" -> {1, 0},
      "Laplace" -> <|"Tipo" -> "degrau", "Amplitude" -> "10"|>|>,
    <|"Componente" -> "R1", "Tipo" -> "Resistor", "Valor" -> "1", "Nos" -> {1, 2}|>,
    <|"Componente" -> "C1", "Tipo" -> "Capacitor", "Valor" -> "1", "Nos" -> {2, 0}|>
  }
|>, "JSON"];

payloadSemAlvo = ExportString[<|
  "Config" -> <|"Modo" -> "S"|>,
  "Netlist" -> {
    <|"Componente" -> "V1", "Tipo" -> "VoltageSource", "Valor" -> "10", "Nos" -> {1, 0},
      "Laplace" -> <|"Tipo" -> "degrau", "Amplitude" -> "10"|>|>,
    <|"Componente" -> "R1", "Tipo" -> "Resistor", "Valor" -> "1", "Nos" -> {1, 0}|>,
    <|"Componente" -> "H1", "Tipo" -> "CCVS", "Valor" -> "2", "Nos" -> {1, 0}|>
  }
|>, "JSON"];

<|
  "DC divisor (nó 2 = 5.00000e0)" -> resumir[processCircuit[payloadDC]],
  "AC RC (polar, sem erro)" -> resumir[processCircuit[payloadAC]],
  "S RC degrau (expressão em s; vC ~ 10/(s(s+1)))" -> resumir[processCircuit[payloadS]],
  "S sem v(0) (deve falhar)" -> resumir[processCircuit[payloadSemIC]],
  "S fonte H sem Alvo (deve falhar)" -> resumir[processCircuit[payloadSemAlvo]]
|>
