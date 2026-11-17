# Laboratório Virtual de Circuitos

Laboratório virtual didático para a disciplina de Circuitos: o aluno monta o circuito numa placa no navegador e recebe o resultado e as equações da análise nodal modificada (MNA), passo a passo.

O front-end é um site estático no GitHub Pages. A resolução roda numa API pública na Wolfram Cloud, que recebe uma netlist em JSON e devolve os resultados em DC, AC (regime senoidal, com fasores) ou no domínio s (Laplace).

**Site:** [https://herzeg9.github.io/Simulador-Circuitos-PUB/](https://herzeg9.github.io/Simulador-Circuitos-PUB/)

## Funcionalidades

- Três modos de análise:
  - **DC**
  - **AC**, em regime senoidal, com fasores
  - **Domínio s** (Laplace), com aritmética racional exata, resposta no tempo \(v(t)\)/\(i(t)\), determinante \(\Delta(s)\), polos (frequências naturais) e resolução passo a passo; aceita condições iniciais e amplitudes simbólicas
- Placa no navegador com resistor, indutor, capacitor, fontes independentes de tensão e corrente, as quatro fontes controladas (VCVS, VCCS, CCVS e CCCS) e o transformador ideal
- Resultados com MathJax, diagramas fasoriais e formas de onda

## Arquitetura

O site (HTML, CSS, JavaScript e SVG) monta a netlist a partir da placa e envia um `POST` para a API pública na Wolfram Cloud (`APIFunction` / `CloudDeploy`). A API devolve JSON; o front-end formata equações, fasores e gráficos.

O endpoint já está no código do repositório (`script.js` e a documentação em `wolfram/`). É um endpoint `POST` (campo de formulário `netlist`, com o JSON em string), não uma página para abrir no navegador:

`https://www.wolframcloud.com/obj/herzeghenrique/simulador-circuitos-api-v2`

O contrato do modo s, com o formato do pedido e da resposta, está em [`wolfram/CONTRATO-S.md`](wolfram/CONTRATO-S.md). O programa da API está em `wolfram/simulador-circuitos-api-v2.wl` e no notebook `wolfram/simulador-circuitos-api-v2.nb`.

O site é publicado pelo fluxo [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), a cada push na `main`.

## Como usar

1. Abra o [site](https://herzeg9.github.io/Simulador-Circuitos-PUB/).
2. Arraste os componentes para a placa, ligue os terminais e escolha o modo (DC, AC ou s).
3. Clique em **Resolver**.

Para rodar localmente, não há script `start` no `package.json`. Basta clonar o repositório e abrir `index.html` no navegador, ou servir a pasta com qualquer servidor estático, por exemplo:

```bash
git clone https://github.com/herzeg9/Simulador-Circuitos-PUB.git
cd Simulador-Circuitos-PUB
npx --yes serve .
```

A resolução continua dependendo da API pública na Wolfram Cloud.

Para republicar a API, o passo a passo está em [`wolfram/NOTA-DEPLOY.md`](wolfram/NOTA-DEPLOY.md). Depois de editar o `.wl`, o notebook pode ser regenerado com:

```bash
python3 wolfram/build_nb.py
```

## Testes

Os scripts abaixo são os que estão no `package.json`. A maior parte roda só com Node. Os testes visuais (`test:visual`) usam Puppeteer, `pngjs` e `pixelmatch` e pedem `npm install`.

```bash
npm install
npm test
```

`npm test` encadeia, nesta ordem:

| Script | O que roda |
|---|---|
| `npm run test:placa` | `tests/placa-netlist.mjs` |
| `npm run test:formato` | `tests/formato-resultado.mjs` |
| `npm run test:s` | `tests/s-dominio.mjs` |
| `npm run test:sentido` | `tests/sentido-fonte.mjs` |
| `npm run test:esquematico` | `tests/esquematico-audit.mjs` |
| `npm run test:svg` | `tests/svg-snapshot.mjs` |
| `npm run test:visual` | `tests/visual-esquematico.mjs` |

No GitHub Actions, o fluxo [`.github/workflows/test-esquematico.yml`](.github/workflows/test-esquematico.yml) roda a auditoria do esquemático, os snapshots SVG e a regressão visual em todo push e pull request na `main`.

Há também testes locais da API em `wolfram/testes-locais.wl` e na célula de testes do notebook.

## Validação

Nos ensaios em DC (circuitos RC/RL e VCVS), o erro relativo frente aos valores analíticos foi de 0,00%. O modo AC foi validado a 60 Hz.

## Contexto

Iniciação Científica com bolsa do Programa Unificado de Bolsas (PUB) da Universidade de São Paulo, na Escola Politécnica, no Departamento de Engenharia de Energia e Automação Elétricas (PEA).

- Período da bolsa: setembro de 2025 a agosto de 2026 (o prazo do relatório final é fevereiro de 2027)
- Orientadora: Profa. Dra. Milana Lima dos Santos
- Entregas: relatório semestral (setembro de 2026); resumo e vídeo submetidos ao SIICUSP; pôster 70×100 cm apresentado com arguição; apresentação do trabalho com a orientadora num evento da Wolfram em 7 de novembro de 2026

O laboratório em funcionamento está no site: [https://herzeg9.github.io/Simulador-Circuitos-PUB/](https://herzeg9.github.io/Simulador-Circuitos-PUB/)

## Tecnologias

Wolfram Language / Mathematica, Wolfram Cloud, JavaScript, HTML, CSS, SVG, MathJax, JSON, GitHub Pages e GitHub Actions.

## Autor

Henrique Herzeg Penzo — Engenharia Elétrica, Escola Politécnica da USP.

[LinkedIn](https://www.linkedin.com/in/henrique-herzeg-penzo)

