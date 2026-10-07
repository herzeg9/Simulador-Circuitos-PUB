(* Avalie por último, depois dos testes.
   Republica o MESMO objeto que o site já chama. DC, AC e S vão juntos. *)

apiEndpoint = APIFunction[
  {"netlist" -> "String"},
  processCircuit[#netlist] &,
  "String"
];

CloudDeploy[apiEndpoint, "simulador-circuitos-api-v2", Permissions -> "Public"]
