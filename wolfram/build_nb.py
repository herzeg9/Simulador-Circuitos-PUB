#!/usr/bin/env python3
"""Gera wolfram/simulador-circuitos-api-v2.nb a partir dos fontes .wl.

A célula principal contém o programa inteiro (não um Get de outro arquivo),
para o Henrique importar o .nb e avaliar no Wolfram.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def escape_wl_line(line: str) -> str:
    return '"' + line.replace("\\", "\\\\").replace('"', '\\"') + '"'


def code_cell(source: str) -> str:
    lines = source.replace("\r\n", "\n").strip("\n").split("\n")
    parts = []
    for i, line in enumerate(lines):
        if i:
            parts.append('"\\[IndentingNewLine]"')
        parts.append(escape_wl_line(line))
    inner = ",\n".join(parts)
    return f'Cell[BoxData[\n RowBox[{{\n{inner}\n }}]], "Input"]'


def text_cell(text: str, style: str = "Text") -> str:
    escaped = text.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'Cell["{escaped}", "{style}"]'


def main() -> None:
    definicoes = (ROOT / "simulador-circuitos-api-v2.wl").read_text(encoding="utf-8")
    testes = (ROOT / "testes-locais.wl").read_text(encoding="utf-8")
    deploy = (ROOT / "cloud-deploy.wl").read_text(encoding="utf-8")
    intro = """Laboratório Virtual de Circuitos — API MNA (V25 do Henrique + domínio s)

A primeira célula de código é o programa inteiro. DC e AC são a célula que está no ar (V25). O modo S foi acrescentado ao lado: capacitor i/(s C)+v0/s, indutor (s L) i - L i0. Esta célula não publica.

Como publicar
1. Abra este arquivo no Wolfram (File → Open, ou arraste o .nb).
2. Coloque o cursor na primeira célula de código (as definições) e avalie com Shift+Enter. A saída deve ser a frase "Definicoes da API carregadas...".
3. Avalie a célula de testes. Confira: o divisor DC traz o nó 2 em 5 V; o RC no modo S devolve uma expressão em s (sem erro); o capacitor sem v(0) e a fonte H sem Alvo falham com mensagem em português.
4. Só então avalie a célula CloudDeploy. Ela republica o objeto público simulador-circuitos-api-v2, o mesmo endereço que o site já usa. DC e AC continuam nesse objeto.
5. Não avalie o CloudDeploy antes dos testes: a publicação substitui a API que está no ar.

O site (GitHub Pages) já envia Config.Modo = "S". Enquanto esta célula não for publicada, o site avisa que a nuvem ainda não devolveu expressões simbólicas e não mostra números de DC como se fossem Laplace.

Contrato: veja wolfram/CONTRATO-S.md no repositório."""
    cells = ",\n\n".join([
        text_cell("API MNA — DC, AC e domínio s", "Section"),
        text_cell(intro, "Text"),
        code_cell(definicoes),
        text_cell("Testes locais — avalie depois das definições. Não publica nada.", "Subsection"),
        code_cell(testes),
        text_cell("CloudDeploy — avalie por último. Substitui a API pública simulador-circuitos-api-v2.", "Subsection"),
        code_cell(deploy),
    ])
    nb = f"""(* Content-type: application/vnd.wolfram.mathematica *)

(*** Wolfram Notebook File ***)
(* http://www.wolfram.com/nb *)

(* CreatedBy='Wolfram 14.3' *)

(*CacheID: 234*)
(* Internal cache information:
NotebookFileLineBreakTest
NotebookFileLineBreakTest
NotebookDataPosition[       154,          7]
NotebookDataLength[         1,          1]
NotebookOptionsPosition[         1,          1]
NotebookOutlinePosition[         1,          1]
CellTagsIndexPosition[         1,          1]
WindowFrame->Normal*)

(* Beginning of Notebook Content *)
Notebook[{{
{cells}
}},
WindowSize->{{{{1400, 900}}}},
WindowMargins->{{{{0, Automatic}}, {{Automatic, 0}}}},
FrontEndVersion->"14.3 for Microsoft Windows (64-bit) (July 8, 2025)",
StyleDefinitions->"Default.nb"
]
(* End of Notebook Content *)
"""
    out = ROOT / "simulador-circuitos-api-v2.nb"
    out.write_text(nb, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
