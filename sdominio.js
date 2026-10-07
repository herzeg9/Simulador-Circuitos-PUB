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
        let html = `<div class="card card-resultados card-sdominio"><h3 class="section-title">3. Resultados em s</h3>`;
        let plots = '';
        dados.Resultados.forEach(r => {
            if (!r) return;
            const texS = r.ExpressaoTeX || r.Expressao || '';
            const tempo = r.Tempo || null;
            const texT = tempo ? (tempo.ExpressaoTeX || tempo.Expressao || '') : '';
            html += '<div class="resultado-linha">';
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
                if (tempo.Forma === 'numerica') {
                    html += '<p class="s-nota-aprox">(coeficientes aproximados)</p>';
                }
                const impulso = tempo.ImpulsoTeX || tempo.Impulso || '';
                if (impulso) {
                    html += `<p class="s-nota-impulso">Termo impulsivo</p>${formulaTex(impulso)}`;
                }
            }
            html += '</div>';
            if (tempo && tempo.Amostras) {
                const svg = svgAmostrasTemporais(tempo.Amostras, {
                    titulo: tempo.Rotulo || r.Rotulo || r.Local || '',
                    unidade: r.Unidade || ''
                });
                if (svg) plots += `<div class="s-tempo-item">${svg}</div>`;
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
        validarNetlistDominioS,
        expressaoLaplace,
        modeloSerieS,
        respostaEhDominioS,
        svgAmostrasTemporais,
        setaDeAparaB,
        positivoNoLadoA,
        htmlCaracteristicaDominioS,
        htmlResultadosDominioS
    };
});
