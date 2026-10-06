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
     * Condição inicial obrigatória no modo s.
     * Vazio é ausência. Zero é valor válido. Negativo é válido.
     * @returns {{ok:true, valor:string}|{ok:false, motivo:'ausente'|'invalido'}}
     */
    function valorInicialInformado(raw) {
        if (raw == null) return { ok: false, motivo: 'ausente' };
        const s = String(raw).trim().replace(/\s+/g, '');
        if (!s) return { ok: false, motivo: 'ausente' };
        const expanded = expandirSufixo(s);
        if (!RE_NUMERO.test(expanded)) return { ok: false, motivo: 'invalido' };
        return { ok: true, valor: expanded };
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
                            ? `A condição inicial v(0) do capacitor ${nome} não é um número válido.`
                            : `A condição inicial i(0) do indutor ${nome} não é um número válido.`
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
        let ymin = Math.min(...pts.map(p => p[1]));
        let ymax = Math.max(...pts.map(p => p[1]));
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

    return {
        siglaDependente,
        expandirSufixo,
        valorInicialInformado,
        validarNetlistDominioS,
        expressaoLaplace,
        modeloSerieS,
        respostaEhDominioS,
        svgAmostrasTemporais
    };
});
