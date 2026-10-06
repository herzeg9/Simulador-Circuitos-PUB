# Nota de deploy — Henrique

A API que está no ar é a V25 (uma célula só, com `CloudDeploy` no fim). O arquivo novo é o mesmo programa, com o modo `"S"` acrescentado. DC e AC não foram reescritos.

Publicar substitui https://www.wolframcloud.com/obj/herzeghenrique/simulador-circuitos-api-v2 . Faça isso só depois dos testes locais.

1. Abra `wolfram/simulador-circuitos-api-v2.nb` (File → Open). Não use `IC_1905.nb` nem a célula antiga da V25.
2. Shift+Enter na primeira célula de código. A saída é a frase de confirmação. Essa célula não publica.
3. Shift+Enter na célula de testes. Espere:
   - divisor DC: nó 2 = `5.00000e0`
   - RC em AC: sem `Erro`, valores polares
   - RC degrau no modo S (`R = 1`, `C = 1`, `v0 = 0`, fonte `step` de amplitude 10): expressão em `s` da família `10/(s(s+1))`, com `Modo` = `"S"`
   - capacitor sem `v0`: `Erro` citando `v(0)`
   - CCVS sem `Alvo`: `Erro` citando referência de controle
4. Shift+Enter na última célula, a do `CloudDeploy`. Ela republica o objeto público `simulador-circuitos-api-v2`.

Contrato que o site já envia no modo s: `v0` no capacitor, `i0` no indutor, e `Laplace.Tipo` = `step` | `impulse` | `exponential`. `CondicaoInicial` e os nomes `degrau` / `impulso` / `exponencial` também são aceitos.

Enquanto o passo 4 não for feito, o site no modo s mostra o aviso de que a nuvem ainda responde em DC e não trata esses números como Laplace. O merge do PR no GitHub Pages pode esperar esse deploy.
