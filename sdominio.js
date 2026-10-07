/**
 * Domínio s (Laplace) — validação e contrato com a API Wolfram.
 *
 * C e L continuam com o tipo Capacitor / Inductor. A substituição
 *   C → 1/(sC) em série com v(0)/s
 *   L → sL em série com −L·i(0)
 * é feita no notebook, quando Config.Modo é "S". Este arquivo só
 * decide se o pedido pode ser enviado e descreve o modelo.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const SIGLA_DEPENDENTE = { VCVS: 'E', VCCS: 'G', CCVS: 'H', CCCS: 'F' };

    function siglaDependente(tipo) {
        return SIGLA_DEPENDENTE[tipo] || tipo;
    }

    /** Mesma ordem de aplicarSufixosValor em script.js (k, M, m, u, n, p). */
    function expandirSufixo(valRaw) {
        if (valRaw == null || !String(valRaw).trim()) return '';
        return String(valRaw).trim()
            .replace(/k/g, '*1000')
            .replace(/M/g, '*1000000')
            .replace(/m/g, '*0.001')
            .replace(/u/g, '*0.000001')
            .replace(/n/g, '*0.000000001')
            .replace(/p/g, '*0.000000000001');
    }

    const RE_NUMERO = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:\*(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?))*$/;

    /**
     * Número, nome (letra e depois letras, dígitos ou _) ou expressão
     * com + - * / ( ) ^. Espaços são ignorados. Sufixo SI só no número puro.
     * @returns {boolean}
     */
    function expressaoSimbolicaValida(s) {
        if (!s) return false;
        let i = 0;
        const n = s.length;
        function primary() {
            if (i >= n) return false;
            if (s[i] === '(') {
                i += 1;
                if (!expr()) return false;
                if (s[i] !== ')') return false;
                i += 1;
                return true;
            }
            const rest = s.slice(i);
            const nome = rest.match(/^[A-Za-z][A-Za-z0-9_]*/);
            if (nome) { i += nome[0].length; return true; }
            const num = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
            if (num) { i += num[0].length; return true; }
            return false;
        }
        function unary() {
            if (s[i] === '+' || s[i] === '-') { i += 1; return unary(); }
            if (!primary()) return false;
            if (s[i] === '^') { i += 1; return unary(); }
            return true;
        }
        function term() {
            if (!unary()) return false;
            while (s[i] === '*' || s[i] === '/') {
                i += 1;
                if (!unary()) return false;
            }
            return true;
        }
        function expr() {
            if (!term()) return false;
            while (s[i] === '+' || s[i] === '-') {
                i += 1;
                if (!term()) return false;
            }
            return true;
        }
        return expr() && i === n;
    }

    /**
     * v(0), i(0), Amplitude e Alpha no modo s.
     * Vazio é ausência. Número (com sufixo), nome ou expressão simples passam.
     * @returns {{ok:true, valor:string}|{ok:false, motivo:'ausente'|'invalido'}}
     */
    function valorParametroS(raw) {
        if (raw == null) return { ok: false, motivo: 'ausente' };
        const s = String(raw).trim().replace(/\s+/g, '');
        if (!s) return { ok: false, motivo: 'ausente' };
        if (expressaoSimbolicaValida(s)) return { ok: true, valor: s };
        const expanded = expandirSufixo(s);
        if (RE_NUMERO.test(expanded)) return { ok: true, valor: expanded };
        return { ok: false, motivo: 'invalido' };
    }

    function valorInicialInformado(raw) {
        return valorParametroS(raw);
    }

    /** DC/AC: número com sufixo SI. Não aceita nome nem expressão. */
    function valorNumericoDcAc(raw) {
        if (raw == null) return false;
        const s = String(raw).trim().replace(/\s+/g, '');
        if (!s) return false;
        return RE_NUMERO.test(expandirSufixo(s));
    }

    /** v10 → v_{10}, i0 → i_{0}. Nome sem dígitos fica como está. */
    function simboloParaTeX(nome) {
        const s = String(nome ?? '');
        const m = s.match(/^([A-Za-z]+)_?(\d+)$/);
        if (m) return `${m[1]}_{${m[2]}}`;
        return s.replace(/_/g, '\\_');
    }

    function contagemNos(netlist) {
        const contagem = new Map();
        (netlist || []).forEach(c => {
            (c.Nos || []).forEach(n => {
                if (typeof n === 'number' && Number.isInteger(n) && n >= 0) {
                    contagem.set(n, (contagem.get(n) || 0) + 1);
                }
            });
        });
        return contagem;
    }

    /**
     * Bloqueia o envio no modo s.
     * - C sem v(0), L sem i(0) (campo vazio ou não numérico)
     * - H/F sem Alvo resolvido para outro componente
     * - E/G com Ctrl+ ou Ctrl− sem nó (terra conta; um pino sozinho num nó não conta)
     *
     * @param {Array<{Componente:string, Tipo:string, Nos?:number[], CondicaoInicial?:string, Alvo?:string}>} netlist
     * @returns {Array<{mensagem:string, nome:string, campo:'ic'|'alvo'|'ctrl'}>}
     */
    function validarNetlistDominioS(netlist) {
        const comps = Array.isArray(netlist) ? netlist : [];
        const erros = [];
        const contagem = contagemNos(comps);

        comps.forEach(c => {
            const nome = c.Componente || 'componente';
            const tipo = c.Tipo;

            if (tipo === 'Capacitor' || tipo === 'Inductor') {
                const ic = valorInicialInformado(c.CondicaoInicial);
                if (!ic.ok && ic.motivo === 'ausente') {
                    erros.push({
                        nome,
                        campo: 'ic',
                        mensagem: tipo === 'Capacitor'
                            ? `O capacitor ${nome} está sem a condição inicial v(0). Informe a tensão inicial; use 0 se ele começa descarregado.`
                            : `O indutor ${nome} está sem a condição inicial i(0). Informe a corrente inicial; use 0 se ele começa sem corrente.`
                    });
                } else if (!ic.ok) {
                    erros.push({
                        nome,
                        campo: 'ic',
                        mensagem: tipo === 'Capacitor'
                            ? `A condição inicial v(0) do capacitor ${nome} não é um número válido nem um nome (ex.: v10). Use um número, um nome ou uma expressão com + - * / ( ) ^.`
                            : `A condição inicial i(0) do indutor ${nome} não é um número válido nem um nome (ex.: i0). Use um número, um nome ou uma expressão com + - * / ( ) ^.`
                    });
                }
            }

            if ((tipo === 'VoltageSource' || tipo === 'CurrentSource') && c.Laplace) {
                const amp = valorParametroS(c.Laplace.Amplitude);
                if (!amp.ok && amp.motivo === 'ausente') {
                    erros.push({
                        nome,
                        campo: 'amp',
                        mensagem: `A amplitude da fonte ${nome} está vazia. Informe um número ou um nome (ex.: v10).`
                    });
                } else if (!amp.ok) {
                    erros.push({
                        nome,
                        campo: 'amp',
                        mensagem: `A amplitude da fonte ${nome} não é um número válido nem um nome (ex.: A, v10). Use um número, um nome ou uma expressão com + - * / ( ) ^.`
                    });
                }
                const alpha = valorParametroS(c.Laplace.Alpha);
                if (!alpha.ok && alpha.motivo === 'ausente') {
                    erros.push({
                        nome,
                        campo: 'alpha',
                        mensagem: `O decaimento α da fonte ${nome} está vazio. Informe um número ou um nome (ex.: alpha).`
                    });
                } else if (!alpha.ok) {
                    erros.push({
                        nome,
                        campo: 'alpha',
                        mensagem: `O decaimento α da fonte ${nome} não é um número válido nem um nome (ex.: alpha). Use um número, um nome ou uma expressão com + - * / ( ) ^.`
                    });
                }
            }

            if (tipo === 'CCVS' || tipo === 'CCCS') {
                const sigla = siglaDependente(tipo);
                const alvo = String(c.Alvo ?? '').trim();
                if (!alvo) {
                    erros.push({
                        nome,
                        campo: 'alvo',
                        mensagem: `A fonte ${nome} (${sigla}) está sem referência de controle. Informe o Alvo: o nome do componente cuja corrente comanda essa fonte.`
                    });
                } else if (alvo === nome) {
                    erros.push({
                        nome,
                        campo: 'alvo',
                        mensagem: `A fonte ${nome} (${sigla}) não pode usar a si mesma como referência de controle.`
                    });
                } else if (!comps.some(o => o !== c && o.Componente === alvo)) {
                    erros.push({
                        nome,
                        campo: 'alvo',
                        mensagem: `A fonte ${nome} (${sigla}) aponta para "${alvo}", mas não há componente com esse nome. A referência de controle não foi resolvida.`
                    });
                }
            }

            if (tipo === 'VCVS' || tipo === 'VCCS') {
                const sigla = siglaDependente(tipo);
                const nos = c.Nos || [];
                const pinos = ['Ctrl+', 'Ctrl−'];
                const faltando = [];
                [nos[2], nos[3]].forEach((n, i) => {
                    const inteiro = typeof n === 'number' && Number.isInteger(n) && n >= 0;
                    if (!inteiro || (n !== 0 && (contagem.get(n) || 0) < 2)) faltando.push(pinos[i]);
                });
                if (faltando.length) {
                    erros.push({
                        nome,
                        campo: 'ctrl',
                        mensagem: `A fonte ${nome} (${sigla}) está sem a referência de controle resolvida (${faltando.join(' e ')}). Conecte os dois pinos de controle a nós do circuito; o terra é o nó 0.`
                    });
                }
            }
        });

        return erros;
    }

    /** Transformada pedida ao notebook: degrau A/s, impulso A, exponencial A/(s+α). */
    function expressaoLaplace(tipo, amplitude, alpha) {
        const t = String(tipo || 'degrau').toLowerCase();
        const a = amplitude == null || String(amplitude).trim() === '' ? '0' : String(amplitude).trim();
        const al = alpha == null || String(alpha).trim() === '' ? '0' : String(alpha).trim();
        if (t === 'impulso' || t === 'impulse' || t === 'delta') return a;
        if (t === 'exponencial' || t === 'exponential' || t === 'exp') return `(${a})/(s+(${al}))`;
        return `(${a})/s`;
    }

    /**
     * Modelo série usado na montagem MNA (não muda o desenho do componente).
     * @returns {{impedancia:string, fonteSerie:string}|null}
     */
    function modeloSerieS(tipo) {
        if (tipo === 'Capacitor') return { impedancia: '1/(s*C)', fonteSerie: 'v(0)/s' };
        if (tipo === 'Inductor') return { impedancia: 's*L', fonteSerie: '-L*i(0)' };
        return null;
    }

    function respostaEhDominioS(dados) {
        if (!dados || dados.Modo !== 'S' || !Array.isArray(dados.Resultados)) return false;
        return dados.Resultados.some(r => r && (r.Expressao || r.ExpressaoTeX));
    }

    function escaparSvg(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Curva y(t) a partir das amostras [[t, y], ...] devolvidas pelo notebook.
     * Devolve string vazia se não houver pontos suficientes.
     */
    function svgAmostrasTemporais(amostras, opts) {
        const cor = (opts && opts.cor) || '#6c3483';
        const titulo = (opts && opts.titulo) || '';
        const unidade = (opts && opts.unidade) || '';
        if (!Array.isArray(amostras) || amostras.length < 2) return '';
        const pts = amostras
            .map(p => [Number(p[0]), Number(p[1])])
            .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (pts.length < 2) return '';

        const W = 460, H = 220, padL = 52, padR = 16, padT = 28, padB = 32;
        const t0 = pts[0][0];
        const t1 = pts[pts.length - 1][0];
        let ymin = pts[0][1];
        let ymax = pts[0][1];
        for (let i = 1; i < pts.length; i++) {
            if (pts[i][1] < ymin) ymin = pts[i][1];
            if (pts[i][1] > ymax) ymax = pts[i][1];
        }
        if (ymin === ymax) { ymin -= 1; ymax += 1; }
        const xOf = t => padL + ((t - t0) / (t1 - t0 || 1)) * (W - padL - padR);
        const yOf = v => padT + ((ymax - v) / (ymax - ymin)) * (H - padT - padB);
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(p[0]).toFixed(2)},${yOf(p[1]).toFixed(2)}`).join(' ');
        const y0 = Math.min(Math.max(yOf(0), padT), H - padB);
        const fmt = n => Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.01)
            ? n.toExponential(2)
            : String(Math.round(n * 1000) / 1000);

        return `<svg class="s-tempo-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escaparSvg(titulo)}">
            <line x1="${padL}" y1="${y0.toFixed(2)}" x2="${W - padR}" y2="${y0.toFixed(2)}" stroke="var(--fasor-axis, #95a5a6)" stroke-width="1"/>
            <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="var(--fasor-axis, #95a5a6)" stroke-width="1"/>
            <path d="${d}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
            <text x="${W / 2}" y="16" text-anchor="middle" font-size="13" font-weight="700" fill="${cor}">${escaparSvg(titulo)}</text>
            <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="currentColor">t (${fmt(t0)} … ${fmt(t1)})</text>
            <text x="8" y="${padT + 4}" font-size="11" fill="currentColor">${fmt(ymax)} ${escaparSvg(unidade)}</text>
            <text x="8" y="${H - padB}" font-size="11" fill="currentColor">${fmt(ymin)}</text>
        </svg>`;
    }

    /**
     * true quando o terminal A da placa está à esquerda (rot 0) ou em cima (rot 90).
     * rot 180: A à direita. rot 270: A embaixo.
     */
    function aNoInicioGeometrico(rot) {
        const r = ((Number(rot) % 360) + 360) % 360;
        return r === 0 || r === 90;
    }

    /**
     * true = desenhar a seta do lado geométrico A (esquerda/cima) para B (direita/baixo).
     * Corrente positiva sai de Nos[1] e entra em Nos[2].
     * Na placa só a fonte de corrente independente troca os pinos: Nos = [B, A].
     * CCCS/VCCS (e o restante) usam Nos = [A, B], então Valor positivo vai de A para B.
     */
    function setaDeAparaB(tipo, rot) {
        const deA = tipo !== 'CurrentSource';
        return aNoInicioGeometrico(rot) === deA;
    }

    /** true = polo positivo do lado geométrico A. Fontes de tensão não trocam os pinos. */
    function positivoNoLadoA(rot) {
        return aNoInicioGeometrico(rot);
    }

    function escaparHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formulaTex(tex) {
        if (tex == null || String(tex).trim() === '') return '';
        return `<div class="formula">\\[ ${escaparHtml(tex)} \\]</div>`;
    }

    /** Âncora estável do resultado cujo Local a ligação do passo 7 aponta. */
    function idResultadoS(local) {
        const slug = String(local ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return 'resultado-s-' + (slug || 'item');
    }

    function marcaConferencia(v) {
        if (v === true) return '<span class="s-confere s-confere--ok" role="img" aria-label="Confere com os resultados">✓</span>';
        if (v === false) return '<span class="s-confere s-confere--nao" role="img" aria-label="Não confere com os resultados">✗</span>';
        return '<span class="s-confere s-confere--na" role="img" aria-label="Sem conferência">—</span>';
    }

    function escaparAttr(s) {
        return escaparHtml(s).replace(/"/g, '&quot;');
    }

    function tituloSemNumero(titulo) {
        return String(titulo || '').replace(/^\s*\d+\s*[.)]\s*/, '').trim();
    }

    /** O passo da convenção de sinais não entra na trilha. */
    function ehPassoConvencao(passo, indice) {
        const titulo = String((passo && passo.Titulo) || '');
        const limpo = tituloSemNumero(titulo);
        if (/^conven[cç][aã]o/i.test(limpo)) return true;
        return indice === 0 && /conven[cç][aã]o/i.test(titulo);
    }

    function slugIncognita(nome) {
        return String(nome || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function padroesTexIncognita(nome) {
        const n = String(nome || '');
        const formas = [];
        if (n.includes('_')) {
            const [a, b] = n.split('_');
            formas.push(`${a}_{${b}}`, `${a.toLowerCase()}_{${b}}`);
        } else {
            const m = n.match(/^([A-Za-z]+)(\d+)$/);
            if (m) formas.push(`${m[1]}_{${m[2]}}`, `${m[1].toLowerCase()}_{${m[2]}}`);
            else if (n) formas.push(n);
        }
        return [...new Set(formas)];
    }

    /**
     * Envolve cada incógnita com \\class do MathJax para o destaque no hover.
     * @param {string} tex
     * @param {string[]} nomes
     */
    function marcarIncognitasNoTex(tex, nomes) {
        const mapa = [];
        (nomes || []).forEach(nome => {
            const cls = 's-inc s-inc-' + slugIncognita(nome);
            padroesTexIncognita(nome).forEach(p => mapa.push({ p, cls }));
        });
        mapa.sort((a, b) => b.p.length - a.p.length);
        if (!mapa.length) return String(tex ?? '');
        const vistos = new Set();
        const unicos = mapa.filter(m => {
            if (vistos.has(m.p)) return false;
            vistos.add(m.p);
            return true;
        });
        const re = new RegExp(unicos.map(m => m.p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
        const porPadrao = new Map(unicos.map(m => [m.p, m.cls]));
        return String(tex ?? '').replace(re, (achado) => `\\class{${porPadrao.get(achado)}}{${achado}}`);
    }

    function incognitasDosPassos(passos) {
        const nomes = [];
        const add = (n) => {
            const nome = String(n || '').trim();
            if (nome && !nomes.includes(nome)) nomes.push(nome);
        };
        (Array.isArray(passos) ? passos : []).forEach(p => {
            if (!p || typeof p !== 'object') return;
            (p.Incognitas || []).forEach(add);
            (p.Ligacao || []).forEach(l => add(l && l.Incognita));
            (p.Conferencia || []).forEach(c => add(c && c.Incognita));
        });
        return nomes;
    }

    function mapaIncognitas(passos) {
        const mapa = new Map();
        const garantir = (nome) => {
            const bruto = String(nome || '').trim();
            if (!bruto) return null;
            const slug = slugIncognita(bruto);
            if (!mapa.has(slug)) mapa.set(slug, { nome: bruto, no: '', comp: '' });
            return mapa.get(slug);
        };
        const localDe = (item, local) => {
            const alvo = garantir(item);
            if (!alvo) return;
            const loc = String(local || '').trim();
            const no = loc.match(/^n[oó]\s+(\d+)$/i);
            if (no) alvo.no = no[1];
            const corr = loc.match(/^corrente\s+(.+)$/i);
            if (corr) alvo.comp = corr[1].trim();
        };
        (Array.isArray(passos) ? passos : []).forEach(p => {
            if (!p || typeof p !== 'object') return;
            (p.Incognitas || []).forEach(garantir);
            (p.Ligacao || []).forEach(l => localDe(l && l.Incognita, l && l.Local));
            (p.Conferencia || []).forEach(c => localDe(c && c.Incognita, c && c.Local));
        });
        return mapa;
    }

    function texPareceNumerico(tex) {
        return !/G_|C_|L_|\\beta|β/.test(String(tex));
    }

    function texEMatriz(tex) {
        return /pmatrix|bmatrix|\\begin\{matrix\}/.test(String(tex));
    }

    function htmlMathPasso(bruto, marcado) {
        const largo = texEMatriz(bruto);
        const formula = `<div class="formula">\\[ ${escaparHtml(marcado)} \\]</div>`;
        const miolo = largo ? `<div class="s-passo-tex-scroll">${formula}</div>` : formula;
        return `<div class="s-math">${miolo}</div>`;
    }

    function htmlFormasTex(lista, nomes) {
        const itens = (Array.isArray(lista) ? lista : [])
            .filter(t => t != null && String(t).trim() !== '')
            .map(t => String(t));
        if (!itens.length) return '';
        const grupos = { simbolico: [], numerico: [] };
        itens.forEach(bruto => {
            const chave = texPareceNumerico(bruto) ? 'numerico' : 'simbolico';
            grupos[chave].push(htmlMathPasso(bruto, marcarIncognitasNoTex(bruto, nomes)));
        });
        if (grupos.simbolico.length && grupos.numerico.length) {
            return `<div class="s-forma">
                <div class="s-forma-botoes" role="group" aria-label="Forma das equações">
                    <button type="button" class="s-forma-btn" data-forma="simbolico" aria-pressed="true">Simbólico</button>
                    <button type="button" class="s-forma-btn" data-forma="numerico" aria-pressed="false">Numérico</button>
                </div>
                <div data-forma-bloco="simbolico">${grupos.simbolico.join('')}</div>
                <div data-forma-bloco="numerico" hidden>${grupos.numerico.join('')}</div>
            </div>`;
        }
        return itens.map(bruto => htmlMathPasso(bruto, marcarIncognitasNoTex(bruto, nomes))).join('');
    }

    function classeRaiz(r) {
        if (!r || typeof r !== 'object') return 'neutra';
        if (r.NaOrigem === true || String(r.Valor).trim() === '0') return 'origem';
        const v = String(r.Valor == null ? '' : r.Valor).trim();
        if (v.startsWith('-')) return 'estavel';
        if (/^\d/.test(v)) return 'instavel';
        return 'neutra';
    }

    function htmlRaizes(raizes) {
        if (!Array.isArray(raizes) || !raizes.length) return '';
        const chips = raizes.map(r => {
            const cls = classeRaiz(r);
            const rotulo = cls === 'origem' ? 'na origem' : (cls === 'estavel' ? 'estável' : (cls === 'instavel' ? 'instável' : ''));
            const mult = r && r.Multiplicidade != null && r.Multiplicidade !== ''
                ? `<span class="s-raiz-mult" title="Multiplicidade">×${escaparHtml(r.Multiplicidade)}</span>`
                : '';
            const tag = rotulo ? `<span class="s-raiz-tag">${rotulo}</span>` : '';
            return `<li class="s-raiz s-raiz--${cls}"><span class="s-raiz-valor">${escaparHtml(r && r.Valor)}</span>${mult}${tag}</li>`;
        }).join('');
        return `<ul class="s-raizes" aria-label="Raízes">${chips}</ul>`;
    }

    function htmlInline(tex) {
        return `\\( ${escaparHtml(tex)} \\)`;
    }

    /** Título conhecido vira um texto curto. Título novo continua com o Texto da API. */
    function chaveDoPasso(passo) {
        const t = tituloSemNumero(passo && passo.Titulo).toLowerCase();
        if (/volta/.test(t) && /tempo/.test(t)) return 'tempo';
        if (/frequ[eê]n/.test(t) || /ra[ií]z/.test(t)) return 'raizes';
        if (/determinant/.test(t)) return 'det';
        if (/matric/.test(t)) return 'matriz';
        if (/reorganiz/.test(t)) return 'reorg';
        if (/por extenso|equa[cç][aã]o de cada/.test(t)) return 'equacoes';
        if (/solu[cç]/.test(t)) return 'solucao';
        if (/inc[oó]gnita/.test(t)) return 'incognitas';
        return '';
    }

    function htmlTextoApi(texto) {
        let html = '';
        String(texto || '').split('\n').forEach(linha => {
            const t = linha.trim();
            if (t) html += `<p>${escaparHtml(t)}</p>`;
        });
        return html;
    }

    /** Frases da API que avisam ausência de forma fechada ou outro impedimento. */
    function htmlNotaDinamica(texto) {
        const frases = String(texto || '').split(/\n|(?<=[.!])\s+/);
        const notas = frases.map(s => s.trim()).filter(s => /forma fechada|indispon[ií]vel|não há|nao ha|não foi|nao foi/i.test(s));
        return notas.map(s => `<p class="s-nota-simbolica">${escaparHtml(s)}</p>`).join('');
    }

    function htmlControles(passos) {
        const textos = (Array.isArray(passos) ? passos : []).map(p => String((p && p.Texto) || '')).join('\n');
        if (!/CCCS|CCVS/i.test(textos)) return '';
        const vistos = new Set();
        const linhas = [];
        const re = /([A-Za-z][A-Za-z0-9_]*)\s+usa a corrente de\s+([A-Za-z][A-Za-z0-9_]*)/gi;
        let m;
        while ((m = re.exec(textos))) {
            const chave = `${m[1]}|${m[2]}`;
            if (vistos.has(chave)) continue;
            vistos.add(chave);
            linhas.push(`${escaparHtml(m[1])} usa ${htmlInline('I_{' + m[2] + '}')}`);
        }
        if (!linhas.length) return '';
        return `<p class="s-passo-lead">${linhas.join('; ')}.</p>`;
    }

    function htmlRegrasTempo() {
        return `<details class="s-regras"><summary>Regras</summary><ul>
            <li>Polos repetidos ${htmlInline('\\tfrac{t^k}{k!}e^{pt}')}</li>
            <li>Pares complexos ${htmlInline('e^{\\sigma t}(\\cos\\omega t,\\ \\sin\\omega t)')}</li>
            <li>Parte imprópria ${htmlInline('\\delta(t)')}</li>
        </ul></details>`;
    }

    function htmlLeadPasso(chave, passos) {
        switch (chave) {
            case 'incognitas':
                return `<p class="s-passo-lead">Tensões de nó (terra = nó 0) + correntes extras do MNA.</p>${htmlControles(passos)}`;
            case 'equacoes':
                return '<p class="s-passo-lead">Uma LCK por nó e uma equação de ramo por corrente extra.</p>';
            case 'reorg':
                return '<p class="s-passo-lead">Termos agrupados por incógnita; o restante vai ao lado direito.</p>';
            case 'matriz':
                return `<p class="s-passo-lead">Sistema ${htmlInline('M(s)\\,x = b')}, simbólico ou com os valores do circuito.</p>`;
            case 'det':
                return `<p class="s-passo-lead">${htmlInline('\\det M(s)')} fatorado, nas formas simbólica e numérica.</p>`;
            case 'raizes':
                return `<p class="s-passo-lead">Raízes de ${htmlInline('\\det M(s) = 0')}, com multiplicidade.</p>`;
            case 'solucao':
                return `<p class="s-passo-lead">Cada ${htmlInline('X(s)')} liga ao resultado do mesmo local.</p>`;
            case 'tempo':
                return `<p class="s-passo-lead">Frações parciais de cada ${htmlInline('X(s)')} e inversa para ${htmlInline('t \\ge 0')}.</p>${htmlRegrasTempo()}`;
            default:
                return '';
        }
    }

    function htmlInfoSinais() {
        return `<span class="s-info-wrap"><button type="button" class="s-info" aria-describedby="s-info-sinais" aria-label="Convenção de sinais das fontes dependentes">i</button><span class="s-info-pop" id="s-info-sinais" role="tooltip">Valor positivo em CCCS/VCCS: a corrente sai de Nos[1] e entra em Nos[2] por dentro da fonte.</span></span>`;
    }

    /**
     * Resolução passo a passo. Sem o campo, string vazia.
     * Lista de passos, ou {Indisponivel: motivo}.
     * O passo de convenção de sinais (índice 0 ou título Convenção) não aparece.
     */
    function htmlPassosDominioS(passos) {
        if (passos == null) return '';
        if (!Array.isArray(passos)) {
            if (typeof passos === 'object' && passos.Indisponivel) {
                return `<div class="card card-sdominio card-passos">
                    <h3 class="section-title">Resolução passo a passo (MNA)</h3>
                    <p class="s-nota-simbolica">${escaparHtml(passos.Indisponivel)}</p>
                </div>`;
            }
            return '';
        }
        const convencao = passos.find((p, i) => p && ehPassoConvencao(p, i));
        const visiveis = passos.filter((p, i) => p && typeof p === 'object' && !ehPassoConvencao(p, i));
        if (!visiveis.length) return '';

        const nomes = incognitasDosPassos(visiveis.length ? passos : visiveis);
        const mapa = mapaIncognitas(passos);
        const mapaJson = {};
        mapa.forEach((v, k) => { mapaJson[k] = { no: v.no, comp: v.comp }; });
        const notaSinais = convencao && /CCCS|VCCS|CCVS|VCVS|dependente/i.test(String(convencao.Texto || '') + String(convencao.Titulo || ''));
        let matrizMarcada = false;

        let html = `<div class="card card-sdominio card-passos" data-mapa="${escaparAttr(JSON.stringify(mapaJson))}">
            <div class="s-passos-cabeca">
                <h3 class="section-title">Resolução passo a passo (MNA)</h3>
                <div class="s-passos-acoes" role="group" aria-label="Visibilidade dos passos">
                    <button type="button" class="s-passos-btn" data-acao="expandir">Expandir tudo</button>
                    <button type="button" class="s-passos-btn" data-acao="recolher">Recolher tudo</button>
                </div>
            </div>
            <div class="s-passos-nav" role="group" aria-label="Passo a passo">
                <button type="button" class="s-passos-btn" data-acao="anterior">Anterior</button>
                <p class="s-passos-ind" aria-live="polite"><span data-status>Passo 1 de ${visiveis.length}</span></p>
                <button type="button" class="s-passos-btn" data-acao="proximo">Próximo</button>
            </div>
            <ol class="s-passos-trilha">`;

        visiveis.forEach((passo, i) => {
            const n = i + 1;
            const titulo = tituloSemNumero(passo.Titulo) || `Passo ${n}`;
            const aberto = true;
            const idCorpo = `s-passo-corpo-${n}`;
            const ehMatriz = /matric/i.test(titulo) || (Array.isArray(passo.TeX) && passo.TeX.some(texEMatriz) && Array.isArray(passo.Valores));
            html += `<li class="s-passo-item"><details class="s-passo" id="s-passo-${n}"${aberto ? ' open' : ''}>
                <summary aria-expanded="${aberto ? 'true' : 'false'}" aria-controls="${idCorpo}">
                    <span class="s-passo-badge" aria-hidden="true">${n}</span>
                    <span class="s-passo-titulo">${escaparHtml(titulo)}</span>
                </summary>
                <div class="s-passo-corpo" id="${idCorpo}" role="region">`;
            if (notaSinais && ehMatriz && !matrizMarcada) {
                matrizMarcada = true;
                html += htmlInfoSinais();
            }
            const chave = chaveDoPasso(passo);
            const lead = htmlLeadPasso(chave, passos);
            if (lead) html += lead + htmlNotaDinamica(passo.Texto);
            else html += htmlTextoApi(passo.Texto);
            html += htmlFormasTex(passo.TeX, nomes);
            if (Array.isArray(passo.Incognitas) && passo.Incognitas.length) {
                const chips = passo.Incognitas.map(nome => {
                    const info = mapa.get(slugIncognita(nome)) || {};
                    return `<button type="button" class="s-incognita" data-inc="${escaparAttr(slugIncognita(nome))}" data-no="${escaparAttr(info.no || '')}" data-comp="${escaparAttr(info.comp || '')}">${escaparHtml(nome)}</button>`;
                }).join('');
                html += `<div class="s-incognitas" aria-label="Incógnitas">${chips}</div>`;
            }
            if (Array.isArray(passo.Valores) && passo.Valores.length) {
                html += '<ul class="s-passo-valores">';
                passo.Valores.forEach(v => { html += `<li><code>${escaparHtml(v)}</code></li>`; });
                html += '</ul>';
            }
            html += htmlRaizes(passo.Raizes);
            if (Array.isArray(passo.Ligacao) && passo.Ligacao.length) {
                html += '<ul class="s-ligacoes">';
                passo.Ligacao.forEach(l => {
                    const href = '#' + idResultadoS(l && l.Local);
                    const info = mapa.get(slugIncognita(l && l.Incognita)) || {};
                    html += `<li><button type="button" class="s-incognita" data-inc="${escaparAttr(slugIncognita(l && l.Incognita))}" data-no="${escaparAttr(info.no || '')}" data-comp="${escaparAttr(info.comp || '')}">${escaparHtml(l && l.Incognita)}</button> <a class="s-passo-link" href="${escaparAttr(href)}">${escaparHtml(l && l.Local)}</a> <span class="s-ligacao-rotulo">${escaparHtml(l && l.Rotulo)}</span></li>`;
                });
                html += '</ul>';
            }
            if (Array.isArray(passo.Conferencia) && passo.Conferencia.length) {
                html += '<ul class="s-conf-lista">';
                passo.Conferencia.forEach(c => {
                    const ancora = idResultadoS(c && c.Local);
                    const href = '#' + ancora;
                    const grafico = '#grafico-' + ancora;
                    html += `<li class="s-conf-item">${marcaConferencia(c && c.ConfereComResultados)}<div class="s-conf-corpo"><div class="s-conf-topo"><strong>${escaparHtml(c && c.Incognita)}</strong> <a class="s-passo-link" href="${escaparAttr(href)}">${escaparHtml(c && c.Local)}</a> <a class="s-passo-jump" href="${escaparAttr(grafico)}" data-fallback="${escaparAttr(href)}">Ver f(t)</a></div><code class="s-conf-tempo">${escaparHtml(c && c.Tempo)}</code></div></li>`;
                });
                html += '</ul>';
            }
            html += '</div></details></li>';
        });
        html += '</ol></div>';
        return html;
    }

    function statusPassos(card) {
        const lista = [...card.querySelectorAll('details.s-passo')];
        const abertos = lista.filter(d => d.open);
        const el = card.querySelector('[data-status]');
        if (!el) return;
        if (abertos.length === 1) el.textContent = `Passo ${lista.indexOf(abertos[0]) + 1} de ${lista.length}`;
        else if (abertos.length === lista.length) el.textContent = `Todos os ${lista.length} passos`;
        else if (!abertos.length) el.textContent = 'Nenhum passo aberto';
        else el.textContent = `${abertos.length} passos abertos`;
        const ant = card.querySelector('[data-acao="anterior"]');
        const prox = card.querySelector('[data-acao="proximo"]');
        const unico = abertos.length === 1 ? lista.indexOf(abertos[0]) : -1;
        if (ant) ant.disabled = unico === 0;
        if (prox) prox.disabled = unico === lista.length - 1;
    }

    function limparDestaqueIncognita() {
        document.querySelectorAll('.is-hl-incognita').forEach(el => el.classList.remove('is-hl-incognita'));
    }

    function destacarIncognita(card, slug) {
        limparDestaqueIncognita();
        if (!slug) return;
        document.querySelectorAll('.s-inc-' + slug + ', .s-incognita[data-inc="' + slug + '"]').forEach(el => {
            el.classList.add('is-hl-incognita');
        });
        let info = {};
        try { info = JSON.parse(card.getAttribute('data-mapa') || '{}')[slug] || {}; } catch (e) { info = {}; }
        if (info.no) {
            document.querySelectorAll('.placa-no[data-no="' + CSS.escape(info.no) + '"]').forEach(el => el.classList.add('is-hl-incognita'));
        }
        if (info.comp) {
            document.querySelectorAll('.placa-comp[data-nome="' + CSS.escape(info.comp) + '"]').forEach(el => el.classList.add('is-hl-incognita'));
        }
    }

    function typesetBloco(el) {
        const mj = (typeof window !== 'undefined') ? window.MathJax : null;
        if (!el || !mj || typeof mj.typesetPromise !== 'function') return Promise.resolve();
        if (typeof mj.typesetClear === 'function') {
            try { mj.typesetClear([el]); } catch (e) { /* já limpo */ }
        }
        return mj.typesetPromise([el]).catch(() => {});
    }

    /**
     * Liga expandir/recolher, anterior/próximo, forma simbólica/numérica,
     * cópia de LaTeX, destaque da incógnita e o salto para f(t).
     */
    function ligarPassosDominioS(raiz) {
        if (!raiz || typeof raiz.querySelector !== 'function') return;
        const card = raiz.classList && raiz.classList.contains('card-passos') ? raiz : raiz.querySelector('.card-passos');
        if (!card || card.dataset.ligado === '1') return;
        card.dataset.ligado = '1';
        const itens = () => [...card.querySelectorAll('details.s-passo')];
        const syncAria = () => {
            itens().forEach(d => {
                const s = d.querySelector('summary');
                if (s) s.setAttribute('aria-expanded', d.open ? 'true' : 'false');
            });
            statusPassos(card);
        };
        const mover = (delta) => {
            const lista = itens();
            if (!lista.length) return;
            const abertos = lista.filter(d => d.open);
            let i = abertos.length === 1 ? lista.indexOf(abertos[0]) : (delta > 0 ? -1 : lista.length);
            const j = Math.min(lista.length - 1, Math.max(0, i + delta));
            lista.forEach((d, k) => { d.open = k === j; });
            syncAria();
            lista[j].scrollIntoView({ behavior: 'smooth', block: 'start' });
            const sum = lista[j].querySelector('summary');
            if (sum) sum.focus();
        };
        card.addEventListener('toggle', (e) => {
            if (e.target && e.target.matches && e.target.matches('details.s-passo')) syncAria();
        }, true);
        card.addEventListener('click', (e) => {
            const btn = e.target.closest('button, a');
            if (!btn || !card.contains(btn)) return;
            const acao = btn.dataset.acao;
            if (acao === 'expandir') {
                itens().forEach(d => { d.open = true; });
                syncAria();
            } else if (acao === 'recolher') {
                itens().forEach(d => { d.open = false; });
                syncAria();
            } else if (acao === 'anterior') mover(-1);
            else if (acao === 'proximo') mover(1);
            else if (btn.classList.contains('s-forma-btn')) {
                const grupo = btn.closest('.s-forma');
                if (!grupo) return;
                const modo = btn.dataset.forma;
                grupo.querySelectorAll('.s-forma-btn').forEach(b => {
                    b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                });
                grupo.querySelectorAll('[data-forma-bloco]').forEach(bloco => {
                    const mostra = bloco.dataset.formaBloco === modo;
                    bloco.hidden = !mostra;
                    if (mostra) typesetBloco(bloco);
                });
            } else if (btn.classList.contains('s-passo-jump')) {
                const sel = btn.getAttribute('href');
                if (sel && document.querySelector(sel)) return;
                const fb = btn.dataset.fallback;
                const alvo = fb && document.querySelector(fb);
                if (alvo) {
                    e.preventDefault();
                    alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
        const entrar = (e) => {
            const el = e.target.closest && e.target.closest('.s-incognita, .s-inc');
            if (!el || !card.contains(el)) return;
            const slug = el.dataset.inc || ([...el.classList].find(c => c.startsWith('s-inc-')) || '').slice(6);
            if (slug) destacarIncognita(card, slug);
        };
        const sair = (e) => {
            const el = e.target.closest && e.target.closest('.s-incognita, .s-inc');
            if (!el) return;
            const proximo = e.relatedTarget;
            if (proximo && el.contains(proximo)) return;
            limparDestaqueIncognita();
        };
        card.addEventListener('pointerover', entrar);
        card.addEventListener('pointerout', sair);
        card.addEventListener('focusin', entrar);
        card.addEventListener('focusout', sair);
        card.addEventListener('click', () => { card.dataset.tocado = '1'; });
        syncAria();
        setTimeout(() => recolherPassosDepoisDoTypeset(), 8000);
    }

    /** Depois do MathJax medir as fórmulas, deixa só o primeiro passo aberto. */
    function recolherPassosDepoisDoTypeset() {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.card-passos').forEach(card => {
            if (card.dataset.revelado === '1') return;
            card.dataset.revelado = '1';
            if (card.dataset.tocado === '1') return;
            const lista = [...card.querySelectorAll('details.s-passo')];
            if (lista.length < 2) return;
            lista.forEach((d, i) => { d.open = i === 0; });
            lista.forEach(d => {
                const s = d.querySelector('summary');
                if (s) s.setAttribute('aria-expanded', d.open ? 'true' : 'false');
            });
            const el = card.querySelector('[data-status]');
            if (el) el.textContent = `Passo 1 de ${lista.length}`;
            const ant = card.querySelector('[data-acao="anterior"]');
            const prox = card.querySelector('[data-acao="proximo"]');
            if (ant) ant.disabled = true;
            if (prox) prox.disabled = false;
        });
    }

    function fmtMeta(n) {
        const x = Number(n);
        if (!Number.isFinite(x)) return '';
        if (Math.abs(x) >= 1000 || (Math.abs(x) > 0 && Math.abs(x) < 0.001)) return x.toExponential(3);
        return String(Math.round(x * 10000) / 10000);
    }

    /**
     * Card "Equação característica e polos". String vazia se a API não mandou o objeto.
     * @param {object|null|undefined} car
     */
    function htmlCaracteristicaDominioS(car) {
        if (!car || typeof car !== 'object') return '';
        const det = car.DeterminanteTeX || car.Determinante || '';
        let html = `<div class="card card-sdominio card-caracteristica">
            <h3 class="section-title">Equação característica e polos</h3>
            <p>Δ(s) é o determinante da matriz da análise nodal (MNA), e as raízes dele são as frequências naturais.</p>`;
        if (det) html += formulaTex(`\\Delta(s) = ${det} = 0`);
        if (car.DeterminanteMonicoTeX || car.DeterminanteMonico) {
            html += formulaTex(`\\Delta_{\\mathrm{m}}(s) = ${car.DeterminanteMonicoTeX || car.DeterminanteMonico}`);
        }

        const meta = [];
        if (car.Ordem != null && car.Ordem !== '') meta.push(`<li>Ordem: ${escaparHtml(car.Ordem)}</li>`);
        const removidos = Number(car.PolosNaOrigemRemovidos);
        if (Number.isFinite(removidos) && removidos > 0) {
            meta.push(`<li>Polos na origem removidos: ${escaparHtml(removidos)}</li>`);
        }
        if (car.Estavel === true) meta.push('<li>Estável</li>');
        else if (car.Estavel === false) meta.push('<li>Instável</li>');
        if (car.Regime) meta.push(`<li>Regime: ${escaparHtml(car.Regime)}</li>`);
        if (meta.length) html += `<ul class="s-carac-meta">${meta.join('')}</ul>`;

        const polos = Array.isArray(car.Polos) ? car.Polos : [];
        if (polos.length) {
            html += '<p class="s-carac-subtitulo">Polos</p><ul class="s-carac-lista">';
            polos.forEach(p => {
                const tex = (p && (p.ValorTeX || p.Valor)) || '';
                const extra = [];
                if (p && Number.isFinite(Number(p.Re))) extra.push(`Re = ${fmtMeta(p.Re)}`);
                if (p && Number.isFinite(Number(p.Im))) extra.push(`Im = ${fmtMeta(p.Im)}`);
                if (p && Number(p.Multiplicidade) > 1) extra.push(`multiplicidade ${escaparHtml(p.Multiplicidade)}`);
                html += `<li>${formulaTex(tex ? `s = ${tex}` : '')}${extra.length ? `<span class="s-polo-meta">${escaparHtml(extra.join(' · '))}</span>` : ''}</li>`;
            });
            html += '</ul>';
        }

        const taus = Array.isArray(car.ConstantesDeTempo) ? car.ConstantesDeTempo : [];
        if (taus.length) {
            html += '<p class="s-carac-subtitulo">Constantes de tempo</p><ul class="s-carac-lista">';
            taus.forEach(t => {
                const tex = (t && (t.ValorTeX || t.Valor)) || '';
                const polo = t && (t.Polo != null) ? ` <span class="s-polo-meta">(polo ${escaparHtml(t.Polo)})</span>` : '';
                html += `<li>${formulaTex(tex ? `\\tau = ${tex}` : '')}${polo}</li>`;
            });
            html += '</ul>';
        }

        const par = (nome, obj) => {
            if (!obj || typeof obj !== 'object') return '';
            const exato = obj.ExatoTeX || obj.ValorTeX || obj.Valor || '';
            if (!exato && obj.ValorNumerico == null) return '';
            const aprox = obj.ValorNumerico != null && obj.ExatoTeX
                ? ` \\approx ${fmtMeta(obj.ValorNumerico)}`
                : '';
            return formulaTex(`${nome} = ${exato}${aprox}`);
        };
        if (car.Ordem === 2 || car.FrequenciaNatural || car.Amortecimento) {
            html += par('\\omega_n', car.FrequenciaNatural);
            html += par('\\zeta', car.Amortecimento);
        }

        html += '</div>';
        return html;
    }

    /**
     * Cards 3 e 4 do modo s. Rótulos V_1(s) / v_1(t) quando a API os manda;
     * respostas antigas continuam com Local e y(t).
     */
    function htmlResultadosDominioS(dados) {
        if (!dados || !Array.isArray(dados.Resultados) || !dados.Resultados.length) return '';
        const simbolos = Array.isArray(dados.Simbolos) && dados.Simbolos.length
            ? dados.Simbolos
            : [];
        const notaTopo = dados.NotaSimbolica || '';
        let html = `<div class="card card-resultados card-sdominio"><h3 class="section-title">3. Resultados em s</h3>`;
        if (simbolos.length) {
            const tex = simbolos.map(simboloParaTeX).join(', ');
            html += `<p class="s-simbolos">Parâmetros simbólicos:</p>${formulaTex(tex)}`;
        }
        if (notaTopo) html += `<p class="s-nota-simbolica">${escaparHtml(notaTopo)}</p>`;
        let plots = '';
        dados.Resultados.forEach(r => {
            if (!r) return;
            const texS = r.ExpressaoTeX || r.Expressao || '';
            const tempo = r.Tempo || null;
            const texT = tempo ? (tempo.ExpressaoTeX || tempo.Expressao || '') : '';
            const idAttr = r.Local ? ` id="${escaparHtml(idResultadoS(r.Local))}"` : '';
            html += `<div class="resultado-linha"${idAttr}>`;
            if (r.RotuloTeX && texS) {
                html += formulaTex(`${r.RotuloTeX} = ${texS}`);
            } else if (texS) {
                html += `<strong>${escaparHtml(r.Local || '')}:</strong>${formulaTex(texS)}`;
            } else if (r.ValorNumerico) {
                html += `<strong>${escaparHtml(r.Local || r.Rotulo || '')}:</strong><div class="numeric-result">${escaparHtml(r.ValorNumerico)}</div>`;
            }
            if (tempo && (tempo.RotuloTeX || texT)) {
                if (tempo.RotuloTeX && texT) html += formulaTex(`${tempo.RotuloTeX} = ${texT}`);
                else if (texT) html += `<span>y(t)</span>${formulaTex(texT)}`;
                if (tempo.Forma === 'numerica' || tempo.FormaCoeficientes === 'numerica') {
                    html += '<p class="s-nota-aprox">(coeficientes aproximados)</p>';
                }
                if (tempo.Forma === 'simbolica') {
                    const nota = tempo.Nota || '';
                    if (nota && nota !== notaTopo) html += `<p class="s-nota-simbolica">${escaparHtml(nota)}</p>`;
                }
                const impulso = tempo.ImpulsoTeX || tempo.Impulso || '';
                if (impulso) {
                    html += `<p class="s-nota-impulso">Termo impulsivo</p>${formulaTex(impulso)}`;
                }
            }
            html += '</div>';
            if (tempo && tempo.Forma !== 'simbolica' && tempo.Amostras) {
                const svg = svgAmostrasTemporais(tempo.Amostras, {
                    titulo: tempo.Rotulo || r.Rotulo || r.Local || '',
                    unidade: r.Unidade || ''
                });
                if (svg) {
                    const idGraf = r.Local ? ` id="grafico-${escaparHtml(idResultadoS(r.Local))}"` : '';
                    plots += `<div class="s-tempo-item"${idGraf}>${svg}</div>`;
                }
            }
        });
        html += '</div>';
        if (plots) {
            html += `<div class="card card-sdominio"><h3 class="section-title">4. Resposta no tempo</h3><div class="s-tempo-grid">${plots}</div></div>`;
        }
        return html;
    }

    return {
        siglaDependente,
        expandirSufixo,
        valorInicialInformado,
        valorParametroS,
        valorNumericoDcAc,
        simboloParaTeX,
        validarNetlistDominioS,
        expressaoLaplace,
        modeloSerieS,
        respostaEhDominioS,
        svgAmostrasTemporais,
        setaDeAparaB,
        positivoNoLadoA,
        htmlCaracteristicaDominioS,
        htmlResultadosDominioS,
        htmlPassosDominioS,
        idResultadoS,
        ligarPassosDominioS,
        recolherPassosDepoisDoTypeset,
        marcarIncognitasNoTex,
        incognitasDosPassos
    };
});
