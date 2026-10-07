(* ============================================================
   API MNA — base: notebook ao vivo do Henrique (V25, seção 2).
   DC e AC são o código dessa célula. O modo "S" foi acrescentado
   ao lado, sem trocar as leis de C/L em AC (1/(I*omega*C), I*omega*L)
   nem o curto/aberto de DC.

   Config["Modo"]:
     "AC" permanece AC (comparação exata, como na V25).
     "S", "Laplace", "s-dominio" viram "S".
     Qualquer outro valor, inclusive "DC", segue o ramo que a V25
     já usava quando o modo não era "AC".

   Campos novos, só lidos no modo S (o site envia os dois nomes):
     capacitor: "v0"  (alias "CondicaoInicial")  tensão v(0)
     indutor:   "i0"  (alias "CondicaoInicial")  corrente i(0)
     fonte independente: "Laplace" -> <|
       "Tipo" -> "step" | "impulse" | "exponential",
       "Amplitude" -> A, "Alpha" -> α
     |>
     Aliases de Tipo: degrau, impulso/delta, exponencial/exp.
     Sem Laplace, a amplitude é "Valor" e a forma é o degrau A/s.

   Equações no modo S (corrente de n1 para n2):
     capacitor: v[n1]-v[n2] == i/(s*C) + v0/s
     indutor:   v[n1]-v[n2] == (s*L)*i - L*i0
   O símbolo do componente não muda. Solve continua simbólico em s.
   DC/AC devolvem Equacoes por cleanTeX, como hoje.
   O modo S devolve Equacoes em InputForm e EquacoesTeX em TeXForm
   (cleanTeX apaga "}" e quebraria \frac).

   Esta célula NÃO publica. A célula CloudDeploy é a última.
   ============================================================ *)

(* ==========================================*)(*API WOLFRAM-V25 (CORREÇÃO DA SEÇÃO 2)*)(*Fasores+MNA+Superposição Restaurada*)(* ==========================================*)parseValue[val_String]:=ToExpression[val];
parseValue[val_]:=val;

cleanTeX[expr_]:=StringReplace[ToString[expr,TeXForm],{"$\\_$"->"_","\\text{i}"->"i","\\text{v}"->"v","\\text{"->"","}"->""}];

fmtNum[x_]:=Module[{v=N[x],e,m,s},If[Abs[v]<10^-12,"0",e=Floor[Log10[Abs[v]]];
m=Round[Abs[v]*10^(5-e)];
If[m>=10^6,m=Round[m/10];e=e+1];
s=IntegerString[m];
If[v<0,"-",""]<>StringTake[s,1]<>"."<>StringDrop[s,1]<>"e"<>ToString[e]]];

formatResult[val_,modo_]:=Module[{num=N[val],mag,ang},If[modo=="AC",If[Abs[num]<10^-12,"0",mag=fmtNum[Abs[num]];
ang=Round[Arg[num]/Degree,0.01];
mag<>" ∠ "<>ToString[ang]<>"°"],fmtNum[Re[Chop[num]]]]];


(* "S" / "Laplace" / "s-dominio". "AC" e "DC" não passam por aqui. *)
modoDominioSQ[m_] := Module[{u = ToUpperCase[StringTrim[ToString[m]]]},
  MemberQ[{"S", "LAPLACE", "S-DOMINIO", "SDOMINIO"}, u]
];

normalizarLaplace[tipo_] := Module[{u = ToLowerCase[StringTrim[ToString[tipo]]]},
  Switch[u,
    "step" | "u" | "degrau", "step",
    "impulse" | "delta" | "impulso", "impulse",
    "exp" | "exponential" | "exponencial", "exponential",
    _, "step"
  ]
];

lerNumero[v_] := Which[
  NumericQ[v], v,
  StringQ[v] && StringTrim[v] =!= "", Quiet[Check[parseValue[StringTrim[v]], $Failed]],
  True, $Failed
];

(* v0 no capacitor, i0 no indutor. CondicaoInicial continua aceito. *)
condicaoBruta[comp_Association, tipo_String] := Module[{chaves, ch},
  chaves = If[tipo == "Capacitor",
    {"v0", "V0", "CondicaoInicial"},
    {"i0", "I0", "CondicaoInicial"}
  ];
  (* Return dentro de Do só abandona o Do e a função caía em Missing. *)
  ch = SelectFirst[chaves, KeyExistsQ[comp, #] &, None];
  If[ch === None, Missing["KeyAbsent"], comp[ch]]
];

numeroCondicao[comp_Association, tipo_String] := Module[{raw = condicaoBruta[comp, tipo], n},
  n = lerNumero[raw];
  If[NumericQ[n], n, 0]
];

(* A/s, A, ou A/(s+α). α é o decaimento de e^{-α t}. *)
laplaceFonte[comp_Association] := Module[{lap, tipo, amp, alpha},
  lap = Lookup[comp, "Laplace", <||>];
  If[!AssociationQ[lap], lap = <||>];
  tipo = normalizarLaplace[Lookup[lap, "Tipo", "step"]];
  amp = lerNumero[Lookup[lap, "Amplitude", Lookup[comp, "Valor", 0]]];
  If[!NumericQ[amp], amp = 0];
  alpha = lerNumero[Lookup[lap, "Alpha", 0]];
  If[!NumericQ[alpha], alpha = 0];
  Switch[tipo,
    "impulse", amp,
    "exponential", amp/(s + alpha),
    _, amp/s
  ]
];

(* Mesmas frases de sdominio.js. Só é chamada no modo S. *)
validarDominioS[components_List] := Module[
  {erros = {}, contagem = <||>, nome, tipo, nos, alvo, raw, pinos, faltando, n, k, sigla},
  Do[
    nos = Lookup[comp, "Nos", {}];
    Do[
      If[NumericQ[n] && n >= 0 && Round[n] == n,
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
      raw = condicaoBruta[comp, tipo];
      If[MissingQ[raw] || raw === Null || (StringQ[raw] && StringTrim[raw] === ""),
        If[tipo == "Capacitor",
          AppendTo[erros, "O capacitor " <> nome <> " está sem a condição inicial v(0). Informe a tensão inicial; use 0 se ele começa descarregado."],
          AppendTo[erros, "O indutor " <> nome <> " está sem a condição inicial i(0). Informe a corrente inicial; use 0 se ele começa sem corrente."]
        ],
        If[!NumericQ[lerNumero[raw]],
          If[tipo == "Capacitor",
            AppendTo[erros, "A condição inicial v(0) do capacitor " <> nome <> " não é um número válido."],
            AppendTo[erros, "A condição inicial i(0) do indutor " <> nome <> " não é um número válido."]
          ]
        ]
      ]
    ];
    If[tipo == "CCVS" || tipo == "CCCS",
      sigla = If[tipo == "CCVS", "H", "F"];
      alvo = StringTrim[ToString[Lookup[comp, "Alvo", ""]]];
      If[alvo == "" || alvo == "Null",
        AppendTo[erros, "A fonte " <> nome <> " (" <> sigla <> ") está sem referência de controle. Informe o Alvo: o nome do componente cuja corrente comanda essa fonte."],
        If[alvo == nome,
          AppendTo[erros, "A fonte " <> nome <> " (" <> sigla <> ") não pode usar a si mesma como referência de controle."],
          If[!MemberQ[components, c_ /; ToString[Lookup[c, "Componente", ""]] == alvo && c =!= comp],
            AppendTo[erros, "A fonte " <> nome <> " (" <> sigla <> ") aponta para \"" <> alvo <> "\", mas não há componente com esse nome. A referência de controle não foi resolvida."]
          ]
        ]
      ]
    ];
    If[tipo == "VCVS" || tipo == "VCCS",
      sigla = If[tipo == "VCVS", "E", "G"];
      pinos = {"Ctrl+", "Ctrl−"};
      faltando = {};
      Do[
        n = If[Length[nos] >= i, nos[[i]], Missing[]];
        If[!(NumericQ[n] && n >= 0 && Round[n] == n) || (Round[n] =!= 0 && Lookup[contagem, Round[n], 0] < 2),
          AppendTo[faltando, pinos[[i - 2]]]
        ],
        {i, 3, 4}
      ];
      If[faltando =!= {},
        AppendTo[erros,
          "A fonte " <> nome <> " (" <> sigla <>
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

respostaDominioS[eqs_List, subs_List, solSym_List, nodes_List, currentVars_List, components_List] := Module[
  {resultados, aviso, nF, nP, nX},
  resultados = Flatten[{
    Table[resultadoSimbolico["Nó " <> ToString[n], v[n] /. solSym[[1]], "V"], {n, nodes}],
    Table[resultadoSimbolico["Corrente " <> ToString[cv[[1]]], cv /. solSym[[1]], "A"], {cv, currentVars}]
  }];
  aviso = "";
  nF = Count[components, c_ /; MemberQ[{"VoltageSource", "CurrentSource"}, c["Tipo"]]];
  nP = Count[components, c_ /; MemberQ[{"Resistor", "Capacitor", "Inductor"}, c["Tipo"]]];
  nX = Length[components] - nF - nP;
  If[nF != 1 || nP < 2 || nP > 3 || nX > 0,
    aviso = "Escopo inicial do modo s: uma fonte independente e dois ou três componentes R, L ou C. O sistema foi resolvido mesmo assim."
  ];
  <|
    "Modo" -> "S",
    "Equacoes" -> Table[ToString[eq, InputForm], {eq, eqs}],
    "EquacoesTeX" -> Table[ToString[eq, TeXForm], {eq, eqs}],
    "Superposicao" -> {},
    "Substituicoes" -> subs,
    "Resultados" -> resultados,
    "NosLista" -> nodes,
    If[aviso === "", Nothing, "Aviso" -> aviso]
  |>
];

processCircuit[payloadStr_String]:=Module[{result,payload,config,components,modo,freq,omega,nodes,eqs,vars,solSym,currentVars,response,compVal,srcVal,n1,n2,ctrl1,ctrl2,indepSources,stepEqs,stepSol,superposicao,hasDependentOrReactive,subs,v0,i0,errosS},Clear[v,i];
result=Catch[payload=Check[ImportString[payloadStr,"RawJSON"],Throw[<|"Erro"->"Falha ao ler JSON."|>]];
If[!KeyExistsQ[payload,"Config"]||!KeyExistsQ[payload,"Netlist"],Throw[<|"Erro"->"Formato de payload inválido (Falta Config ou Netlist)."|>]];
config=payload["Config"];
components=payload["Netlist"];
modo=config["Modo"];If[modoDominioSQ[modo],modo="S"];
If[!ListQ[components]||Length[components]==0,Throw[<|"Erro"->"O circuito está vazio."|>]];If[modo=="S",Clear[s,t];errosS=validarDominioS[components];If[errosS=!={},Throw[<|"Erro"->StringRiffle[errosS," "]|>]]];
freq=If[KeyExistsQ[config,"Frequencia"],parseValue[ToString[config["Frequencia"]]],60];
omega=2*Pi*freq;
nodes=Check[DeleteDuplicates[Flatten[Map[#["Nos"]&,components]]],Throw[<|"Erro"->"Falha na extração dos nós."|>]];
nodes=Select[nodes,#!=0&];
eqs={};currentVars={};subs={};v[0]=0;
Check[Do[AppendTo[eqs,Sum[Which[comp["Tipo"]=="Transformer"&&comp["Nos"][[1]]==n,i[comp["Componente"]<>"_p"],comp["Tipo"]=="Transformer"&&comp["Nos"][[2]]==n,-i[comp["Componente"]<>"_p"],comp["Tipo"]=="Transformer"&&comp["Nos"][[3]]==n,i[comp["Componente"]<>"_s"],comp["Tipo"]=="Transformer"&&comp["Nos"][[4]]==n,-i[comp["Componente"]<>"_s"],comp["Nos"][[1]]==n,i[comp["Componente"]],comp["Nos"][[2]]==n,-i[comp["Componente"]],True,0],{comp,components}]==0],{n,nodes}],Throw[<|"Erro"->"Falha na montagem da LCK."|>]];
Check[Do[n1=comp["Nos"][[1]];n2=comp["Nos"][[2]];
Switch[comp["Tipo"],"Resistor",compVal=parseValue[ToString[comp["Valor"]]];AppendTo[eqs,v[n1]-v[n2]==compVal*i[comp["Componente"]]];AppendTo[currentVars,i[comp["Componente"]]],"VoltageSource",srcVal=If[modo=="AC",parseValue[ToString[comp["Modulo"]]]*Exp[I*parseValue[ToString[comp["Fase"]]]*Degree],If[modo=="S",laplaceFonte[comp],parseValue[ToString[comp["Valor"]]]]];AppendTo[eqs,v[n1]-v[n2]==srcVal];AppendTo[currentVars,i[comp["Componente"]]],"CurrentSource",srcVal=If[modo=="AC",parseValue[ToString[comp["Modulo"]]]*Exp[I*parseValue[ToString[comp["Fase"]]]*Degree],If[modo=="S",laplaceFonte[comp],parseValue[ToString[comp["Valor"]]]]];AppendTo[eqs,i[comp["Componente"]]==srcVal];AppendTo[currentVars,i[comp["Componente"]]],"Capacitor",compVal=parseValue[ToString[comp["Valor"]]];If[modo=="AC",AppendTo[eqs,v[n1]-v[n2]==(1/(I*omega*compVal))*i[comp["Componente"]]],If[modo=="S",v0=numeroCondicao[comp,"Capacitor"];AppendTo[eqs,v[n1]-v[n2]==i[comp["Componente"]]/(s*compVal)+v0/s];AppendTo[subs,<|"Componente"->comp["Componente"],"Tipo"->"Capacitor","Impedancia"->"1/(s*C)","FonteSerie"->"v(0)/s","CondicaoInicial"->ToString[v0,InputForm]|>],AppendTo[eqs,i[comp["Componente"]]==0]]];AppendTo[currentVars,i[comp["Componente"]]],"Inductor",compVal=parseValue[ToString[comp["Valor"]]];If[modo=="AC",AppendTo[eqs,v[n1]-v[n2]==(I*omega*compVal)*i[comp["Componente"]]],If[modo=="S",i0=numeroCondicao[comp,"Inductor"];AppendTo[eqs,v[n1]-v[n2]==(s*compVal)*i[comp["Componente"]]-compVal*i0];AppendTo[subs,<|"Componente"->comp["Componente"],"Tipo"->"Inductor","Impedancia"->"s*L","FonteSerie"->"-L*i(0)","CondicaoInicial"->ToString[i0,InputForm]|>],AppendTo[eqs,v[n1]-v[n2]==0]]];AppendTo[currentVars,i[comp["Componente"]]],"VCVS",compVal=parseValue[ToString[comp["Valor"]]];ctrl1=comp["Nos"][[3]];ctrl2=comp["Nos"][[4]];AppendTo[eqs,v[n1]-v[n2]==compVal*(v[ctrl1]-v[ctrl2])];AppendTo[currentVars,i[comp["Componente"]]],"VCCS",compVal=parseValue[ToString[comp["Valor"]]];ctrl1=comp["Nos"][[3]];ctrl2=comp["Nos"][[4]];AppendTo[eqs,i[comp["Componente"]]==compVal*(v[ctrl1]-v[ctrl2])];AppendTo[currentVars,i[comp["Componente"]]],"CCVS",compVal=parseValue[ToString[comp["Valor"]]];AppendTo[eqs,v[n1]-v[n2]==compVal*i[comp["Alvo"]]];AppendTo[currentVars,i[comp["Componente"]]],"CCCS",compVal=parseValue[ToString[comp["Valor"]]];AppendTo[eqs,i[comp["Componente"]]==compVal*i[comp["Alvo"]]];AppendTo[currentVars,i[comp["Componente"]]],"Transformer",compVal=parseValue[ToString[comp["Razao"]]];AppendTo[eqs,v[n1]-v[n2]==compVal*(v[comp["Nos"][[3]]]-v[comp["Nos"][[4]]])];AppendTo[eqs,i[comp["Componente"]<>"_s"]==-compVal*i[comp["Componente"]<>"_p"]];AppendTo[currentVars,i[comp["Componente"]<>"_p"]];AppendTo[currentVars,i[comp["Componente"]<>"_s"]]],{comp,components}],Throw[<|"Erro"->"Falha nas equações dos componentes."|>]];
vars=Join[Table[v[n],{n,nodes}],currentVars];
solSym=Check[Solve[eqs,vars],Throw[<|"Erro"->"Falha na resolução da matriz."|>]];If[modo=="S"&&Length[solSym]>0&&!FreeQ[solSym[[1]],C],Throw[<|"Erro"->"Sistema singular. Frequência de ressonância perigosa ou curto."|>]];
If[Length[solSym]>0,(*---MÓDULO DE SUPERPOSIÇÃO---*)indepSources=Select[components,#["Tipo"]=="VoltageSource"||#["Tipo"]=="CurrentSource"&];
hasDependentOrReactive=Length[Select[components,MemberQ[{"VCVS","VCCS","CCVS","CCCS","Capacitor","Inductor","Transformer"},#["Tipo"]]&]]>0;
superposicao={};
If[modo=!="S"&&!hasDependentOrReactive&&Length[indepSources]>1,Do[stepEqs={};
Do[AppendTo[stepEqs,Sum[Which[comp["Nos"][[1]]==n,i[comp["Componente"]],comp["Nos"][[2]]==n,-i[comp["Componente"]],True,0],{comp,components}]==0],{n,nodes}];
Do[Switch[comp["Tipo"],"Resistor",compVal=parseValue[ToString[comp["Valor"]]];AppendTo[stepEqs,v[comp["Nos"][[1]]]-v[comp["Nos"][[2]]]==compVal*i[comp["Componente"]]],"VoltageSource",srcVal=If[modo=="AC",parseValue[ToString[comp["Modulo"]]]*Exp[I*parseValue[ToString[comp["Fase"]]]*Degree],If[modo=="S",laplaceFonte[comp],parseValue[ToString[comp["Valor"]]]]];If[comp["Componente"]==src["Componente"],AppendTo[stepEqs,v[comp["Nos"][[1]]]-v[comp["Nos"][[2]]]==srcVal],AppendTo[stepEqs,v[comp["Nos"][[1]]]-v[comp["Nos"][[2]]]==0]],"CurrentSource",srcVal=If[modo=="AC",parseValue[ToString[comp["Modulo"]]]*Exp[I*parseValue[ToString[comp["Fase"]]]*Degree],If[modo=="S",laplaceFonte[comp],parseValue[ToString[comp["Valor"]]]]];If[comp["Componente"]==src["Componente"],AppendTo[stepEqs,i[comp["Componente"]]==srcVal],AppendTo[stepEqs,i[comp["Componente"]]==0]]],{comp,components}];
stepSol=Solve[stepEqs,vars];
If[Length[stepSol]>0,AppendTo[superposicao,<|"FonteAtiva"->src["Componente"],"ResultadosParciais"->Table[formatResult[v[n]/. stepSol[[1]],modo],{n,nodes}]|>]],{src,indepSources}]];
response=If[modo=="S",respostaDominioS[eqs,subs,solSym,nodes,currentVars,components],<|"Equacoes"->Table[cleanTeX[eq],{eq,eqs}],"Superposicao"->superposicao,(*CORREÇÃO:AGORA O PACOTE É ENVIADO!*)"Resultados"->Flatten[{Table[<|"Local"->"Nó "<>ToString[n],"ValorNumerico"->formatResult[v[n]/. solSym[[1]],modo],"Unidade"->"V"|>,{n,nodes}],Table[<|"Local"->"Corrente "<>ToString[cv[[1]]],"ValorNumerico"->formatResult[cv/. solSym[[1]],modo],"Unidade"->"A"|>,{cv,currentVars}]}],"NosLista"->nodes|>];
response,Throw[<|"Erro"->"Sistema singular. Frequência de ressonância perigosa ou curto."|>]]];
ExportString[result,"JSON"]];
