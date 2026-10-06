(* ============================================================
   Laboratório Virtual de Circuitos — API MNA
   Arquivo completo para CloudDeploy (substitui IC_1905.nb).

   Modos em Config["Modo"]:
     "DC"  — regime permanente contínuo (C aberto, L curto)
     "AC"  — fasores em jω (Z_C = 1/(jωC), Z_L = jωL)
     "S"   — domínio s / Laplace

   No modo S os tipos Capacitor e Inductor NÃO mudam.
   A substituição acontece só aqui, na montagem das equações:
     capacitor:  v(n1)-v(n2) = i/(s C) + v(0)/s
                 (impedância 1/(sC) em série com fonte v(0)/s)
     indutor:    v(n1)-v(n2) = (s L) i - L i(0)
                 (impedância sL em série com fonte -L i(0))
   Fontes independentes aceitam Laplace: degrau A/s, impulso A,
   exponencial A/(s+α) com α de e^{-α t}.

   Avalie ESTA célula inteira. Depois avalie a célula de testes
   e, só então, a célula CloudDeploy.
   ============================================================ *)

parseValue[val_String] := ToExpression[val];
parseValue[val_] := val;

cleanTeX[expr_] := StringReplace[ToString[expr, TeXForm], {
  "$\\_$" -> "_",
  "\\text{i}" -> "i",
  "\\text{v}" -> "v",
  "\\text{" -> "",
  "}" -> ""
}];

fmtNum[x_] := Module[{v = N[x], e, m, s},
  If[Abs[v] < 10^-12, "0",
    e = Floor[Log10[Abs[v]]];
    m = Round[Abs[v]*10^(5 - e)];
    If[m >= 10^6, m = Round[m/10]; e = e + 1];
    s = IntegerString[m];
    If[v < 0, "-", ""] <> StringTake[s, 1] <> "." <> StringDrop[s, 1] <> "e" <> ToString[e]
  ]
];

formatResult[val_, modo_] := Module[{num = N[val], mag, ang},
  If[modo == "AC",
    If[Abs[num] < 10^-12, "0",
      mag = fmtNum[Abs[num]];
      ang = Round[Arg[num]/Degree, 0.01];
      mag <> " \[Angle] " <> ToString[ang] <> "\[Degree]"
    ],
    fmtNum[Re[Chop[num]]]
  ]
];

(* Número vindo do JSON: string já expandida pelo site ("100*0.001"),
   número, ou vazio. Não interpreta sufixo "m"/"k" — o frontend faz isso. *)
campoNumerico[v_] := Which[
  v === "" || v === Null || MissingQ[v], 0,
  StringQ[v], Quiet[Check[parseValue[v], 0]],
  NumericQ[v], v,
  True, Quiet[Check[parseValue[ToString[v, InputForm]], 0]]
];

noValidoQ[n_] := NumericQ[n] && n >= 0 && Round[n] == n;

normalizarModo[m_] := Module[{u = ToUpperCase[StringTrim[ToString[m]]]},
  Which[
    u == "AC", "AC",
    u == "S" || u == "LAPLACE" || u == "S-DOMINIO" || u == "SDOMINIO", "S",
    True, "DC"
  ]
];

normalizarLaplace[tipo_] := Module[{u = ToLowerCase[StringTrim[ToString[tipo]]]},
  Switch[u,
    "step" | "u" | "degrau", "degrau",
    "impulse" | "delta" | "impulso", "impulso",
    "exp" | "exponential" | "exponencial", "exponencial",
    _, "degrau"
  ]
];

(* A/s , A  ou  A/(s+α). α é o coeficiente de e^{-α t}. *)
laplaceFonte[comp_Association] := Module[{lap, tipo, amp, alpha},
  lap = Lookup[comp, "Laplace", <||>];
  If[!AssociationQ[lap], lap = <||>];
  tipo = normalizarLaplace[Lookup[lap, "Tipo", "degrau"]];
  amp = campoNumerico[Lookup[lap, "Amplitude", Lookup[comp, "Valor", Lookup[comp, "Modulo", 0]]]];
  alpha = campoNumerico[Lookup[lap, "Alpha", 0]];
  Switch[tipo,
    "impulso", amp,
    "exponencial", amp/(s + alpha),
    _, amp/s
  ]
];

valorFonte[comp_Association, modo_String] := Which[
  modo == "AC",
    parseValue[ToString[comp["Modulo"]]] * Exp[I * parseValue[ToString[comp["Fase"]]] * Degree],
  modo == "S",
    laplaceFonte[comp],
  True,
    parseValue[ToString[comp["Valor"]]]
];

(* Mesmas frases do frontend (sdominio.js). Só corre no modo S. *)
validarDominioS[components_List] := Module[
  {erros = {}, contagem = <||>, nome, tipo, nos, alvo, ic, pinos, faltando, n, k},
  Do[
    nos = Lookup[comp, "Nos", {}];
    Do[
      If[noValidoQ[n],
        k = Round[n];
        contagem[k] = Lookup[contagem, k, 0] + 1
      ],
      {n, nos}
    ],
    {comp, components}
  ];
  Do[
    nome = ToString[Lookup[comp, "Componente", "componente"]];
    tipo = ToString[Lookup[comp, "Tipo", ""]];
    nos = Lookup[comp, "Nos", {}];
    If[tipo == "Capacitor" || tipo == "Inductor",
      ic = Lookup[comp, "CondicaoInicial", Missing["KeyAbsent", "CondicaoInicial"]];
      If[StringQ[ic], ic = StringTrim[ic]];
      If[MissingQ[ic] || ic === "" || ic === Null,
        If[tipo == "Capacitor",
          AppendTo[erros, "O capacitor " <> nome <> " está sem a condição inicial v(0). Informe a tensão inicial; use 0 se ele começa descarregado."],
          AppendTo[erros, "O indutor " <> nome <> " está sem a condição inicial i(0). Informe a corrente inicial; use 0 se ele começa sem corrente."]
        ],
        Module[{parsed = If[NumericQ[ic], ic, Quiet[Check[parseValue[ToString[ic]], $Failed]]]},
          If[!NumericQ[parsed],
            If[tipo == "Capacitor",
              AppendTo[erros, "A condição inicial v(0) do capacitor " <> nome <> " não é um número válido."],
              AppendTo[erros, "A condição inicial i(0) do indutor " <> nome <> " não é um número válido."]
            ]
          ]
        ]
      ]
    ];
    If[tipo == "CCVS" || tipo == "CCCS",
      alvo = StringTrim[ToString[Lookup[comp, "Alvo", ""]]];
      If[alvo == "" || alvo == "Null",
        AppendTo[erros, "A fonte " <> nome <> " (" <> If[tipo == "CCVS", "H", "F"] <> ") está sem referência de controle. Informe o Alvo: o nome do componente cuja corrente comanda essa fonte."],
        If[alvo == nome,
          AppendTo[erros, "A fonte " <> nome <> " (" <> If[tipo == "CCVS", "H", "F"] <> ") não pode usar a si mesma como referência de controle."],
          If[!MemberQ[components, c_ /; ToString[Lookup[c, "Componente", ""]] == alvo && c =!= comp],
            AppendTo[erros, "A fonte " <> nome <> " (" <> If[tipo == "CCVS", "H", "F"] <> ") aponta para \"" <> alvo <> "\", mas não há componente com esse nome. A referência de controle não foi resolvida."]
          ]
        ]
      ]
    ];
    If[tipo == "VCVS" || tipo == "VCCS",
      pinos = {"Ctrl+", "Ctrl−"};
      faltando = {};
      Do[
        n = If[Length[nos] >= i, nos[[i]], Missing[]];
        If[!noValidoQ[n] || (Round[n] =!= 0 && Lookup[contagem, Round[n], 0] < 2),
          AppendTo[faltando, pinos[[i - 2]]]
        ],
        {i, 3, 4}
      ];
      If[faltando =!= {},
        AppendTo[erros,
          "A fonte " <> nome <> " (" <> If[tipo == "VCVS", "E", "G"] <>
          ") está sem a referência de controle resolvida (" <> StringRiffle[faltando, " e "] <>
          "). Conecte os dois pinos de controle a nós do circuito; o terra é o nó 0."
        ]
      ]
    ],
    {comp, components}
  ];
  erros
];

pacoteSimbolico[expr_] := Module[{simp},
  simp = TimeConstrained[Simplify[Together[expr]], 4, Together[expr]];
  simp = Quiet[Check[Chop[simp], simp]];
  <|"simp" -> simp, "Expressao" -> ToString[simp, InputForm], "ExpressaoTeX" -> ToString[simp, TeXForm]|>
];

amostraTemporal[expr_] := Module[
  {simp, inv, den, raizes, sigmas, freqs, tmax, nPts = 81, ts, ys, pares, tt, re},
  simp = Together[expr];
  inv = TimeConstrained[InverseLaplaceTransform[simp, s, t], 4, $Failed];
  If[inv === $Failed || Head[inv] === InverseLaplaceTransform, Return[Null]];
  den = Denominator[simp];
  raizes = Quiet[Check[
    If[PolynomialQ[den, s] && Exponent[den, s] > 0, s /. NSolve[den == 0, s], {}],
    {}
  ]];
  raizes = Select[Flatten[{raizes}], NumericQ];
  sigmas = Cases[raizes, r_ /; Re[r] < -10^-8 :> -Re[r]];
  freqs = Cases[raizes, r_ /; Abs[Im[r]] > 10^-8 :> Abs[Im[r]]];
  tmax = Which[
    sigmas =!= {} && freqs =!= {}, Max[6/Min[sigmas], 3*2*Pi/Min[freqs]],
    sigmas =!= {}, 6/Min[sigmas],
    freqs =!= {}, 4*2*Pi/Min[freqs],
    True, 1.
  ];
  tmax = Clip[tmax, {10^-6, 20.}];
  ts = Range[0, nPts - 1]*tmax/(nPts - 1);
  ys = Table[
    re = Quiet[Check[Re[Chop[N[inv /. t -> tt]]], $Failed]];
    If[NumericQ[re], re, $Failed],
    {tt, ts}
  ];
  pares = If[MemberQ[ys, $Failed] || Max[Abs[ys]] > 10^9, Null, MapThread[{#1, #2} &, {ts, ys}]];
  <|
    "Expressao" -> ToString[inv, InputForm],
    "ExpressaoTeX" -> ToString[inv, TeXForm],
    "Amostras" -> If[ListQ[pares], pares, {}]
  |>
];

resultadoNumerico[local_String, expr_, modo_String, unidade_String] := <|
  "Local" -> local,
  "ValorNumerico" -> formatResult[expr, modo],
  "Unidade" -> unidade
|>;

resultadoSimbolico[local_String, expr_, unidade_String] := Module[{pac, item, tempo},
  pac = pacoteSimbolico[expr];
  item = <|
    "Local" -> local,
    "ValorNumerico" -> pac["Expressao"],
    "Expressao" -> pac["Expressao"],
    "ExpressaoTeX" -> pac["ExpressaoTeX"],
    "Unidade" -> unidade
  |>;
  tempo = amostraTemporal[pac["simp"]];
  If[AssociationQ[tempo], item["Tempo"] = tempo];
  item
];

processCircuit[payloadStr_String] := Module[
  {result, payload, config, components, modo, freq, omega, nodes, eqs, vars,
   solSym, currentVars, response, compVal, srcVal, n1, n2, ctrl1, ctrl2,
   indepSources, stepEqs, stepSol, superposicao, hasDependentOrReactive,
   subs, aviso, v0, i0, nomeC, errosS, eqStrings, eqTeX, resultados, comp, n, cv, src},
  Clear[v, i, s, t];
  result = Catch[
    payload = Check[ImportString[payloadStr, "RawJSON"], Throw[<|"Erro" -> "Falha ao ler JSON."|>]];
    If[!KeyExistsQ[payload, "Config"] || !KeyExistsQ[payload, "Netlist"],
      Throw[<|"Erro" -> "Formato de payload inválido (Falta Config ou Netlist)."|>]
    ];
    config = payload["Config"];
    components = payload["Netlist"];
    modo = normalizarModo[config["Modo"]];
    If[!ListQ[components] || Length[components] == 0,
      Throw[<|"Erro" -> "O circuito está vazio."|>]
    ];
    freq = If[KeyExistsQ[config, "Frequencia"], parseValue[ToString[config["Frequencia"]]], 60];
    omega = 2*Pi*freq;
    If[modo == "S",
      errosS = validarDominioS[components];
      If[errosS =!= {}, Throw[<|"Erro" -> StringRiffle[errosS, " "]|>]]
    ];
    nodes = Check[
      DeleteDuplicates[Flatten[Map[#["Nos"] &, components]]],
      Throw[<|"Erro" -> "Falha na extração dos nós."|>]
    ];
    nodes = Select[nodes, # != 0 &];
    eqs = {};
    currentVars = {};
    subs = {};
    v[0] = 0;
    Check[
      Do[
        AppendTo[eqs, Sum[Which[
          comp["Tipo"] == "Transformer" && comp["Nos"][[1]] == n, i[comp["Componente"] <> "_p"],
          comp["Tipo"] == "Transformer" && comp["Nos"][[2]] == n, -i[comp["Componente"] <> "_p"],
          comp["Tipo"] == "Transformer" && comp["Nos"][[3]] == n, i[comp["Componente"] <> "_s"],
          comp["Tipo"] == "Transformer" && comp["Nos"][[4]] == n, -i[comp["Componente"] <> "_s"],
          comp["Nos"][[1]] == n, i[comp["Componente"]],
          comp["Nos"][[2]] == n, -i[comp["Componente"]],
          True, 0
        ], {comp, components}] == 0],
        {n, nodes}
      ],
      Throw[<|"Erro" -> "Falha na montagem da LCK."|>]
    ];
    Check[
      Do[
        n1 = comp["Nos"][[1]];
        n2 = comp["Nos"][[2]];
        nomeC = comp["Componente"];
        Switch[comp["Tipo"],
          "Resistor",
            compVal = parseValue[ToString[comp["Valor"]]];
            AppendTo[eqs, v[n1] - v[n2] == compVal * i[nomeC]];
            AppendTo[currentVars, i[nomeC]],
          "VoltageSource",
            srcVal = valorFonte[comp, modo];
            AppendTo[eqs, v[n1] - v[n2] == srcVal];
            AppendTo[currentVars, i[nomeC]],
          "CurrentSource",
            srcVal = valorFonte[comp, modo];
            AppendTo[eqs, i[nomeC] == srcVal];
            AppendTo[currentVars, i[nomeC]],
          "Capacitor",
            compVal = parseValue[ToString[comp["Valor"]]];
            Which[
              modo == "AC",
                AppendTo[eqs, v[n1] - v[n2] == (1/(I*omega*compVal)) * i[nomeC]],
              modo == "S",
                v0 = campoNumerico[comp["CondicaoInicial"]];
                (* 1/(sC) em série com a fonte v(0)/s *)
                AppendTo[eqs, v[n1] - v[n2] == i[nomeC]/(s*compVal) + v0/s];
                AppendTo[subs, <|
                  "Componente" -> nomeC, "Tipo" -> "Capacitor",
                  "Impedancia" -> "1/(s*C)", "FonteSerie" -> "v(0)/s",
                  "CondicaoInicial" -> ToString[v0, InputForm]
                |>],
              True,
                AppendTo[eqs, i[nomeC] == 0]
            ];
            AppendTo[currentVars, i[nomeC]],
          "Inductor",
            compVal = parseValue[ToString[comp["Valor"]]];
            Which[
              modo == "AC",
                AppendTo[eqs, v[n1] - v[n2] == (I*omega*compVal) * i[nomeC]],
              modo == "S",
                i0 = campoNumerico[comp["CondicaoInicial"]];
                (* sL em série com a fonte -L i(0) *)
                AppendTo[eqs, v[n1] - v[n2] == (s*compVal)*i[nomeC] - compVal*i0];
                AppendTo[subs, <|
                  "Componente" -> nomeC, "Tipo" -> "Inductor",
                  "Impedancia" -> "s*L", "FonteSerie" -> "-L*i(0)",
                  "CondicaoInicial" -> ToString[i0, InputForm]
                |>],
              True,
                AppendTo[eqs, v[n1] - v[n2] == 0]
            ];
            AppendTo[currentVars, i[nomeC]],
          "VCVS",
            compVal = parseValue[ToString[comp["Valor"]]];
            ctrl1 = comp["Nos"][[3]];
            ctrl2 = comp["Nos"][[4]];
            AppendTo[eqs, v[n1] - v[n2] == compVal * (v[ctrl1] - v[ctrl2])];
            AppendTo[currentVars, i[nomeC]],
          "VCCS",
            compVal = parseValue[ToString[comp["Valor"]]];
            ctrl1 = comp["Nos"][[3]];
            ctrl2 = comp["Nos"][[4]];
            AppendTo[eqs, i[nomeC] == compVal * (v[ctrl1] - v[ctrl2])];
            AppendTo[currentVars, i[nomeC]],
          "CCVS",
            compVal = parseValue[ToString[comp["Valor"]]];
            AppendTo[eqs, v[n1] - v[n2] == compVal * i[comp["Alvo"]]];
            AppendTo[currentVars, i[nomeC]],
          "CCCS",
            compVal = parseValue[ToString[comp["Valor"]]];
            AppendTo[eqs, i[nomeC] == compVal * i[comp["Alvo"]]];
            AppendTo[currentVars, i[nomeC]],
          "Transformer",
            compVal = parseValue[ToString[comp["Razao"]]];
            AppendTo[eqs, v[n1] - v[n2] == compVal * (v[comp["Nos"][[3]]] - v[comp["Nos"][[4]]])];
            AppendTo[eqs, i[nomeC <> "_s"] == -compVal * i[nomeC <> "_p"]];
            AppendTo[currentVars, i[nomeC <> "_p"]];
            AppendTo[currentVars, i[nomeC <> "_s"]],
          _,
            Throw[<|"Erro" -> "Tipo de componente desconhecido: " <> ToString[comp["Tipo"]] <> "."|>]
        ],
        {comp, components}
      ],
      Throw[<|"Erro" -> "Falha nas equações dos componentes."|>]
    ];
    vars = Join[Table[v[n], {n, nodes}], currentVars];
    solSym = Check[Solve[eqs, vars], Throw[<|"Erro" -> "Falha na resolução da matriz."|>]];
    If[Length[solSym] > 0 && modo == "S" && !FreeQ[solSym[[1]], C],
      Throw[<|"Erro" -> "Sistema singular. Frequência de ressonância perigosa ou curto."|>]
    ];
    If[Length[solSym] > 0,
      indepSources = Select[components, MemberQ[{"VoltageSource", "CurrentSource"}, #["Tipo"]] &];
      hasDependentOrReactive = Length[Select[components, MemberQ[{
        "VCVS", "VCCS", "CCVS", "CCCS", "Capacitor", "Inductor", "Transformer"
      }, #["Tipo"]] &]] > 0;
      superposicao = {};
      If[modo =!= "S" && !hasDependentOrReactive && Length[indepSources] > 1,
        Do[
          stepEqs = {};
          Do[
            AppendTo[stepEqs, Sum[Which[
              comp["Nos"][[1]] == n, i[comp["Componente"]],
              comp["Nos"][[2]] == n, -i[comp["Componente"]],
              True, 0
            ], {comp, components}] == 0],
            {n, nodes}
          ];
          Do[
            Switch[comp["Tipo"],
              "Resistor",
                compVal = parseValue[ToString[comp["Valor"]]];
                AppendTo[stepEqs, v[comp["Nos"][[1]]] - v[comp["Nos"][[2]]] == compVal * i[comp["Componente"]]],
              "VoltageSource",
                srcVal = valorFonte[comp, modo];
                If[comp["Componente"] == src["Componente"],
                  AppendTo[stepEqs, v[comp["Nos"][[1]]] - v[comp["Nos"][[2]]] == srcVal],
                  AppendTo[stepEqs, v[comp["Nos"][[1]]] - v[comp["Nos"][[2]]] == 0]
                ],
              "CurrentSource",
                srcVal = valorFonte[comp, modo];
                If[comp["Componente"] == src["Componente"],
                  AppendTo[stepEqs, i[comp["Componente"]] == srcVal],
                  AppendTo[stepEqs, i[comp["Componente"]] == 0]
                ]
            ],
            {comp, components}
          ];
          stepSol = Solve[stepEqs, vars];
          If[Length[stepSol] > 0,
            AppendTo[superposicao, <|
              "FonteAtiva" -> src["Componente"],
              "ResultadosParciais" -> Table[formatResult[v[n] /. stepSol[[1]], modo], {n, nodes}]
            |>]
          ],
          {src, indepSources}
        ]
      ];
      resultados = Flatten[{
        Table[
          If[modo == "S",
            resultadoSimbolico["Nó " <> ToString[n], v[n] /. solSym[[1]], "V"],
            resultadoNumerico["Nó " <> ToString[n], v[n] /. solSym[[1]], modo, "V"]
          ],
          {n, nodes}
        ],
        Table[
          If[modo == "S",
            resultadoSimbolico["Corrente " <> ToString[cv[[1]]], cv /. solSym[[1]], "A"],
            resultadoNumerico["Corrente " <> ToString[cv[[1]]], cv /. solSym[[1]], modo, "A"]
          ],
          {cv, currentVars}
        ]
      }];
      eqStrings = If[modo == "S", Table[ToString[eq, InputForm], {eq, eqs}], Table[cleanTeX[eq], {eq, eqs}]];
      response = <|
        "Modo" -> modo,
        "Equacoes" -> eqStrings,
        "Superposicao" -> superposicao,
        "Resultados" -> resultados,
        "NosLista" -> nodes
      |>;
      If[modo == "S",
        eqTeX = Table[ToString[eq, TeXForm], {eq, eqs}];
        response["EquacoesTeX"] = eqTeX;
        response["Substituicoes"] = subs;
        aviso = "";
        Module[{nF, nP, nX},
          nF = Count[components, c_ /; MemberQ[{"VoltageSource", "CurrentSource"}, c["Tipo"]]];
          nP = Count[components, c_ /; MemberQ[{"Resistor", "Capacitor", "Inductor"}, c["Tipo"]]];
          nX = Length[components] - nF - nP;
          If[nF != 1 || nP < 2 || nP > 3 || nX > 0,
            aviso = "Escopo inicial do modo s: uma fonte independente e dois ou três componentes R, L ou C. O sistema foi resolvido mesmo assim."
          ]
        ];
        If[aviso =!= "", response["Aviso"] = aviso]
      ];
      response,
      Throw[<|"Erro" -> "Sistema singular. Frequência de ressonância perigosa ou curto."|>]
    ]
  ];
  ExportString[result, "JSON"]
];

"Definicoes da API carregadas (DC, AC e S). Avalie a celula de testes e, se o resumo estiver correto, a celula CloudDeploy."
