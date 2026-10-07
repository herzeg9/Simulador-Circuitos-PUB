#!/usr/bin/env python3
"""Gera wolfram/simulador-circuitos-api-v2.nb a partir dos fontes .wl.

Cada célula de código é um único Cell["...", "Code"]: o texto inteiro
fica numa string, então o Mathematica 14.3 não parte comentários em
RowBox. Comentários (* *) saem do código e vão para células de texto.
A célula não é de inicialização, para abrir o arquivo não publicar a API.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def strip_comments(src: str) -> str:
    """Remove (* *) aninhados. Não mexe no interior de strings."""
    out = []
    i = 0
    n = len(src)
    while i < n:
        if src[i] == '"':
            out.append('"')
            i += 1
            while i < n:
                out.append(src[i])
                if src[i] == '\\' and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                if src[i] == '"':
                    i += 1
                    break
                i += 1
            continue
        if src.startswith("(*", i):
            depth = 1
            i += 2
            while i < n and depth:
                if src.startswith("(*", i):
                    depth += 1
                    i += 2
                elif src.startswith("*)", i):
                    depth -= 1
                    i += 2
                else:
                    i += 1
            if depth:
                raise SystemExit("comentário (* sem fechar *)")
            out.append(" ")
            continue
        out.append(src[i])
        i += 1
    return "".join(out)


def balance(src: str) -> None:
    """Confere (), [] e {} fora de strings. Comentários já foram removidos."""
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    i = 0
    n = len(src)
    line = 1
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1
            i += 1
            continue
        if c == '"':
            i += 1
            while i < n:
                if src[i] == '\\' and i + 1 < n:
                    i += 2
                    continue
                if src[i] == '"':
                    i += 1
                    break
                if src[i] == '\n':
                    line += 1
                i += 1
            continue
        if src.startswith("(*", i):
            raise SystemExit(f"comentário restante na linha {line}")
        if c in '([{':
            stack.append((c, line))
        elif c in ')]}':
            if not stack or stack[-1][0] != pairs[c]:
                raise SystemExit(f"delimitador {c} sem par na linha {line}")
            stack.pop()
        i += 1
    if stack:
        ch, ln = stack[-1]
        raise SystemExit(f"delimitador {ch} aberto na linha {ln} não fecha")


def prepare_code(src: str) -> str:
    code = strip_comments(src).strip() + "\n"
    balance(code)
    if "(*" in code or "*)" in code:
        raise SystemExit("a célula de código ainda contém (* ou *)")
    return code


def escape_nb_string(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\r", "")
        .replace("\n", "\\n")
    )


def unescape_nb_string(s: str) -> str:
    out = []
    i = 0
    while i < len(s):
        if s[i] == '\\' and i + 1 < len(s):
            n = s[i + 1]
            if n == 'n':
                out.append('\n')
            elif n == '\\':
                out.append('\\')
            elif n == '"':
                out.append('"')
            else:
                out.append('\\')
                out.append(n)
            i += 2
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def text_cell(text: str, style: str) -> str:
    return f'Cell["{escape_nb_string(text)}", "{style}"]'


def code_cell(source: str) -> str:
    code = prepare_code(source)
    escaped = escape_nb_string(code)
    if unescape_nb_string(escaped) != code:
        raise SystemExit("a string da célula não volta ao código original")
    # InitializationCell False: o estilo Code às vezes inicializa ao abrir.
    # Abrir o notebook não pode republicar a API.
    return f'Cell["{escaped}", "Code", InitializationCell -> False]'


def interpretar_string_wl(bruto: str) -> str:
    """O que o Mathematica guarda depois de ler a string do .nb."""
    out = []
    i = 0
    while i < len(bruto):
        if bruto[i] == '\\' and i + 1 < len(bruto):
            n = bruto[i + 1]
            if n == 'n':
                out.append('\n')
            elif n == '\\':
                out.append('\\')
            elif n == '"':
                out.append('"')
            elif n in 't[]:':
                raise SystemExit(f"escape \\\\{n} na célula mudaria o código ao abrir")
            else:
                raise SystemExit(f"escape desconhecido \\\\{n} na célula")
            i += 2
            continue
        out.append(bruto[i])
        i += 1
    return "".join(out)


def ler_string_wl(nb: str, i: int) -> tuple[str, int, int]:
    """Lê uma string que começa em nb[i] == '\"'. Devolve (bruto, fim, linhas)."""
    if nb[i] != '"':
        raise SystemExit("string esperada")
    i += 1
    bruto = []
    linhas = 0
    n = len(nb)
    while i < n:
        if nb[i] == '\\' and i + 1 < n:
            bruto.append(nb[i])
            bruto.append(nb[i + 1])
            if nb[i + 1] == '\n':
                linhas += 1
            i += 2
            continue
        if nb[i] == '"':
            return "".join(bruto), i + 1, linhas
        if nb[i] == '\n':
            linhas += 1
        bruto.append(nb[i])
        i += 1
    raise SystemExit("string do notebook não fecha")


def extrair_celulas_codigo(nb: str) -> list[str]:
    """Devolve o texto de cada Cell[..., \"Code\"], já interpretado."""
    marca = ', "Code", InitializationCell -> False]'
    celulas = []
    i = 0
    while True:
        inicio = nb.find('Cell["', i)
        if inicio < 0:
            break
        bruto, fim, _ = ler_string_wl(nb, inicio + len('Cell['))
        if nb.startswith(marca, fim):
            codigo = interpretar_string_wl(bruto)
            if unescape_nb_string(bruto) != codigo:
                raise SystemExit("a leitura da célula não bate com o escape")
            celulas.append(codigo)
            i = fim + len(marca)
            continue
        i = fim
    return celulas


def balancear_arquivo(nb: str) -> None:
    """Confere que o .nb inteiro é uma expressão fechada, com comentários e strings."""
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    i = 0
    n = len(nb)
    line = 1
    while i < n:
        if nb[i] == '\n':
            line += 1
            i += 1
            continue
        if nb.startswith('(*', i):
            depth = 1
            i += 2
            while i < n and depth:
                if nb[i] == '\n':
                    line += 1
                if nb.startswith('(*', i):
                    depth += 1
                    i += 2
                elif nb.startswith('*)', i):
                    depth -= 1
                    i += 2
                else:
                    i += 1
            if depth:
                raise SystemExit(f"comentário do .nb sem fechar, perto da linha {line}")
            continue
        if nb[i] == '"':
            _, fim, linhas = ler_string_wl(nb, i)
            line += linhas
            i = fim
            continue
        if nb[i] in '([{':
            stack.append((nb[i], line))
        elif nb[i] in ')]}':
            if not stack or stack[-1][0] != pairs[nb[i]]:
                raise SystemExit(f"delimitador {nb[i]} sem par na linha {line}")
            stack.pop()
        i += 1
    if stack:
        ch, ln = stack[-1]
        raise SystemExit(f"delimitador {ch} aberto na linha {ln} não fecha")


def rejeitar_string_solta(codigo: str, nome: str) -> None:
    """A última expressão da célula não pode ser uma string nua."""
    s = codigo.rstrip()
    if s.endswith(';'):
        s = s[:-1].rstrip()
    if s.endswith('"'):
        raise SystemExit(f"a célula {nome} termina numa string")
    if "Definicoes da API carregadas" in codigo:
        raise SystemExit(f"a célula {nome} ainda tem a frase solta de confirmação")


def main() -> None:
    definicoes = (ROOT / "simulador-circuitos-api-v2.wl").read_text(encoding="utf-8")
    testes = (ROOT / "testes-locais.wl").read_text(encoding="utf-8")
    deploy = (ROOT / "cloud-deploy.wl").read_text(encoding="utf-8")
    intro = """Laboratório Virtual de Circuitos — API MNA (V25 do Henrique + domínio s)

A primeira célula de código é o programa inteiro. DC e AC são a célula que está no ar (V25). O modo S foi acrescentado ao lado: capacitor i/(s C) + v0/s, indutor (s L) i - L i0.

As células de código não têm comentários. A explicação está nestas células de texto. Nenhuma célula roda sozinha ao abrir o arquivo.

Como publicar
1. Abra este arquivo no Wolfram 14.3 (File, Open).
2. Avalie a primeira célula de código com Shift+Enter. Ela só define as funções. A saída é Null. Se aparecer Syntax::sntxi, pare: essa não é a célula certa.
3. Avalie a célula de testes. O divisor DC traz o nó 2 em 5.00000e0. O RC no modo S devolve Modo S e uma expressão em s. O capacitor sem v0 e a fonte H sem Alvo falham com mensagem em português.
4. Só então avalie a célula CloudDeploy. Ela republica o objeto público simulador-circuitos-api-v2, o mesmo endereço que o site já usa.
5. Não avalie o CloudDeploy antes dos testes: a publicação substitui a API que está no ar.

Contrato: wolfram/CONTRATO-S.md e wolfram/NOTA-DEPLOY.md."""
    cells = ",\n\n".join([
        text_cell("API MNA — DC, AC e domínio s", "Section"),
        text_cell(intro, "Text"),
        text_cell(
            "Definições. Shift+Enter nesta célula não publica. "
            "Modo AC: capacitor 1/(I omega C) e indutor I omega L. "
            "Modo que não é AC e não é S: capacitor aberto (corrente 0) e indutor em curto, como na V25. "
            "Modo S: capacitor i/(s C)+v0/s e indutor (s L) i - L i0. "
            "Campos: v0 no capacitor, i0 no indutor (CondicaoInicial continua valendo). "
            "Laplace.Tipo: step, impulse ou exponential (degrau, impulso e exponencial também).",
            "Text",
        ),
        code_cell(definicoes),
        text_cell(
            "Testes locais. Avalie depois das definições. Esta célula não publica. "
            "O divisor DC deve mostrar o nó 2 igual a 5.00000e0. "
            "O RC em modo S deve ter Modo S e uma expressão com s. "
            "Sem v0 e sem Alvo devem voltar Erro em português.",
            "Subsection",
        ),
        code_cell(testes),
        text_cell(
            "CloudDeploy. Avalie por último, depois dos testes. "
            "Republica o mesmo objeto que o site já chama: simulador-circuitos-api-v2, público. "
            "DC, AC e S vão juntos.",
            "Subsection",
        ),
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
    if nb.count('", "Code", InitializationCell -> False]') != 3:
        raise SystemExit("eram esperadas 3 células Code")
    if "RowBox" in nb:
        raise SystemExit("o notebook ainda usa RowBox")
    balancear_arquivo(nb)
    celulas = extrair_celulas_codigo(nb)
    esperadas = [prepare_code(definicoes), prepare_code(testes), prepare_code(deploy)]
    if celulas != esperadas:
        raise SystemExit("as células Code do .nb não batem com o fonte .wl")
    nomes = ("definições", "testes", "CloudDeploy")
    for codigo, nome in zip(celulas, nomes):
        balance(codigo)
        if "(*" in codigo or "*)" in codigo:
            raise SystemExit(f"a célula {nome} ainda tem comentário (* *)")
        rejeitar_string_solta(codigo, nome)
    if "CloudDeploy" in celulas[0] or "CloudDeploy" in celulas[1]:
        raise SystemExit("CloudDeploy só pode estar na última célula de código")
    if "CloudDeploy" not in celulas[2]:
        raise SystemExit("a última célula perdeu o CloudDeploy")
    for trecho in (
        "processCircuit",
        "/(s*compVal)",
        "compVal*i0",
        "(1/(I*omega*compVal))",
        'i[comp["Componente"]]==0',
        '"v0"',
        '"i0"',
        '"step"',
        '"impulse"',
        '"exponential"',
    ):
        if trecho not in celulas[0]:
            raise SystemExit(f"a célula de definições perdeu {trecho}")
    out = ROOT / "simulador-circuitos-api-v2.nb"
    out.write_text(nb, encoding="utf-8")
    # Relê do disco: o que o Henrique abre é este arquivo, não a string em memória.
    gravado = out.read_text(encoding="utf-8")
    if gravado != nb:
        raise SystemExit("o arquivo gravado não é o notebook gerado")
    balancear_arquivo(gravado)
    if extrair_celulas_codigo(gravado) != esperadas:
        raise SystemExit("a releitura do .nb não devolveu as três células")
    print(f"wrote {out} ({out.stat().st_size} bytes, {len(celulas)} células Code)")


if __name__ == "__main__":
    main()
