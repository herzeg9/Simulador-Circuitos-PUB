/* ============================================================
 * Placa de montagem (drag-and-drop)
 * O usuário posiciona componentes numa grade e os liga com fios.
 * Os nós são extraídos da conectividade e a lista de componentes
 * é regerada via add(): gerarJSON(), calcular() e o contrato com
 * a API continuam os mesmos.
 * ============================================================ */
(function () {
    'use strict';

    const GRID = 20;
    const MEIO = 40;
    const LARGURA = 1600;
    const ALTURA = 1000;
    const STORAGE_KEY = 'simulador-circuitos:placa';
    const VERSAO = 1;

    const PECAS = {
        Resistor:      { titulo: 'Resistor',          padrao: '1k' },
        Capacitor:     { titulo: 'Capacitor',         padrao: '10u' },
        Inductor:      { titulo: 'Indutor',           padrao: '100m' },
        VoltageSource: { titulo: 'Fonte de tensão',   padrao: '10' },
        CurrentSource: { titulo: 'Fonte de corrente', padrao: '10m' },
        GND:           { titulo: 'Terra (GND)',       padrao: '' },
        VCVS: {
            titulo: 'VCVS (E)',
            padrao: '2',
            quatro: true,
            rotuloValor: 'Ganho',
            nota: 'Ganho E: Vout = E · Vctrl. Out+ e Out− são a saída; Ctrl+ e Ctrl− medem a tensão de controle. Na posição inicial, Out+ fica à esquerda, Out− à direita, Ctrl+ em cima e Ctrl− embaixo.'
        },
        VCCS: {
            titulo: 'VCCS (G)',
            padrao: '2',
            quatro: true,
            rotuloValor: 'Transcond.',
            nota: 'Transcondutância G: Iout = G · Vctrl. Out+ e Out− são a saída; Ctrl+ e Ctrl− medem a tensão de controle. Na posição inicial, Out+ fica à esquerda, Out− à direita, Ctrl+ em cima e Ctrl− embaixo.'
        },
        CCVS: {
            titulo: 'CCVS (H)',
            padrao: '2',
            alvo: true,
            rotuloValor: 'Transres.',
            nota: 'Transresistência H: Vout = H · Ialvo. Alvo é o nome exato (maiúsculas e minúsculas) do componente cuja corrente é a referência.'
        },
        CCCS: {
            titulo: 'CCCS (F)',
            padrao: '2',
            alvo: true,
            rotuloValor: 'Ganho',
            nota: 'Ganho F: Iout = F · Ialvo. Alvo é o nome exato (maiúsculas e minúsculas) do componente cuja corrente é a referência.'
        }
    };

    const ehFonte = tipo => tipo === 'VoltageSource' || tipo === 'CurrentSource';
    const quatroTerminais = tipo => !!(PECAS[tipo] && PECAS[tipo].quatro);
    const controladaPorCorrente = tipo => !!(PECAS[tipo] && PECAS[tipo].alvo);

    /* ---------- Geometria e conectividade (sem DOM) ---------- */

    function girar(dx, dy, rot) {
        switch (((rot % 360) + 360) % 360) {
            case 90: return [-dy, dx];
            case 180: return [-dx, -dy];
            case 270: return [dy, -dx];
            default: return [dx, dy];
        }
    }

    /**
     * Terminais de um componente. "A" é o + da fonte de tensão e a ponta da seta da fonte de corrente.
     * VCVS/VCCS: A/B = Out+/Out−, C/D = Ctrl+/Ctrl− (na posição inicial, saída na horizontal e controle na vertical).
     */
    function terminais(comp) {
        if (comp.tipo === 'GND') return [{ nome: 'A', x: comp.x, y: comp.y }];
        const offs = quatroTerminais(comp.tipo)
            ? [['A', -MEIO, 0], ['B', MEIO, 0], ['C', 0, -MEIO], ['D', 0, MEIO]]
            : [['A', -MEIO, 0], ['B', MEIO, 0]];
        return offs.map(([nome, dx, dy]) => {
            const [rx, ry] = girar(dx, dy, comp.rot);
            return { nome, x: comp.x + rx, y: comp.y + ry };
        });
    }

    /** Fio em "L": horizontal-depois-vertical (hv) ou o contrário. */
    function segmentos(fio) {
        const { x1, y1, x2, y2 } = fio;
        if (x1 === x2 || y1 === y2) return [{ x1, y1, x2, y2 }];
        const [cx, cy] = fio.hv ? [x2, y1] : [x1, y2];
        return [{ x1, y1, x2: cx, y2: cy }, { x1: cx, y1: cy, x2, y2 }];
    }

    function noSegmento(p, s) {
        if (s.x1 === s.x2) return p.x === s.x1 && p.y >= Math.min(s.y1, s.y2) && p.y <= Math.max(s.y1, s.y2);
        if (s.y1 === s.y2) return p.y === s.y1 && p.x >= Math.min(s.x1, s.x2) && p.x <= Math.max(s.x1, s.x2);
        return false;
    }

    const noFio = (p, fio) => segmentos(fio).some(s => noSegmento(p, s));

    /**
     * Nós na ordem da netlist. No backend a corrente da fonte independente vai
     * do 1º para o 2º nó por dentro dela, então a ponta da seta (A) vem por último.
     * VCVS/VCCS: [out+, out−, ctrl+, ctrl−]. CCVS/CCCS: [out+, out−].
     */
    function nosNetlist(comp, nos) {
        if (comp.tipo === 'CurrentSource') return [nos.B, nos.A];
        if (quatroTerminais(comp.tipo)) return [nos.A, nos.B, nos.C, nos.D];
        return [nos.A, nos.B];
    }

    /**
     * Agrupa terminais eletricamente ligados. Um fio conecta tudo o que
     * toca suas pontas e qualquer terminal ou ponta de fio que caia sobre
     * ele (junção em T); fios que apenas se cruzam não se conectam.
     * Grupos com terra viram o nó 0; os demais são numerados 1, 2, 3...
     * na ordem em que os componentes foram colocados.
     */
    function extrairNos(comps, fios) {
        const pai = new Map();
        const achar = k => {
            if (!pai.has(k)) pai.set(k, k);
            let r = k;
            while (pai.get(r) !== r) r = pai.get(r);
            while (pai.get(k) !== r) { const n = pai.get(k); pai.set(k, r); k = n; }
            return r;
        };
        const unir = (a, b) => {
            const ra = achar(a), rb = achar(b);
            if (ra !== rb) pai.set(ra, rb);
        };
        const chavePt = (x, y) => `p:${x},${y}`;

        const terms = [];
        const pontos = new Map();
        comps.forEach(comp => terminais(comp).forEach(term => {
            const chave = `t:${comp.id}:${term.nome}`;
            unir(chave, chavePt(term.x, term.y));
            terms.push({ comp, term, chave });
            pontos.set(chavePt(term.x, term.y), { x: term.x, y: term.y });
        }));
        fios.forEach(f => {
            [[f.x1, f.y1], [f.x2, f.y2]].forEach(([x, y]) => {
                unir(`f:${f.id}`, chavePt(x, y));
                pontos.set(chavePt(x, y), { x, y });
            });
        });
        fios.forEach(f => {
            pontos.forEach((p, k) => { if (noFio(p, f)) unir(`f:${f.id}`, k); });
        });

        const porRaiz = new Map();
        terms.forEach(({ comp, term, chave }) => {
            const r = achar(chave);
            if (!porRaiz.has(r)) porRaiz.set(r, { no: null, terminais: [], pontos: [], temGnd: false });
            const g = porRaiz.get(r);
            g.terminais.push({ comp, term });
            if (comp.tipo === 'GND') g.temGnd = true;
        });
        pontos.forEach((p, k) => {
            const g = porRaiz.get(achar(k));
            if (g) g.pontos.push(p);
        });

        let proximo = 1;
        porRaiz.forEach(g => { g.no = g.temGnd ? 0 : proximo++; });

        const nosPorComp = new Map();
        const soltos = [];
        porRaiz.forEach(g => {
            g.terminais.forEach(({ comp, term }) => {
                if (!nosPorComp.has(comp.id)) nosPorComp.set(comp.id, {});
                nosPorComp.get(comp.id)[term.nome] = g.no;
            });
            if (g.terminais.length === 1) soltos.push(g.terminais[0]);
        });

        return { nosPorComp, grupos: [...porRaiz.values()], soltos };
    }

    /** Pontos onde 3+ condutores se encontram (recebem o ponto de junção). */
    function juncoes(comps, fios) {
        const cont = new Map();
        const somar = (x, y, n) => {
            const k = `${x},${y}`;
            const e = cont.get(k) || { x, y, n: 0 };
            e.n += n;
            cont.set(k, e);
        };
        comps.forEach(c => terminais(c).forEach(t => somar(t.x, t.y, 1)));
        fios.forEach(f => { somar(f.x1, f.y1, 1); somar(f.x2, f.y2, 1); });
        const pts = [...cont.values()].map(e => ({ x: e.x, y: e.y }));
        fios.forEach(f => pts.forEach(p => {
            const ehPonta = (p.x === f.x1 && p.y === f.y1) || (p.x === f.x2 && p.y === f.y2);
            if (!ehPonta && noFio(p, f)) somar(p.x, p.y, 2);
        }));
        return [...cont.values()].filter(e => e.n >= 3);
    }

    const ehPonta = (p, f) => (p.x === f.x1 && p.y === f.y1) || (p.x === f.x2 && p.y === f.y2);
    const horizontal = s => s.y1 === s.y2 && s.x1 !== s.x2;
    const vertical = s => s.x1 === s.x2 && s.y1 !== s.y2;

    /**
     * Deixa só trechos retos: quebra os "L", descarta trechos de comprimento
     * zero e junta trechos colineares que se tocam ou se sobrepõem. A junção
     * não acontece se uma das pontas que sumiriam estiver no meio de um fio
     * perpendicular: ali ela é o que faz a ligação em T.
     */
    function normalizarFios(fios, novoId) {
        const segs = [];
        fios.forEach(f => segmentos(f).forEach((s, i) => {
            if (s.x1 === s.x2 && s.y1 === s.y2) return;
            const inverter = s.x1 > s.x2 || s.y1 > s.y2;
            segs.push(inverter
                ? { id: i === 0 ? f.id : novoId(), x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, hv: true }
                : { id: i === 0 ? f.id : novoId(), x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, hv: true });
        }));
        const fazT = (p, m, a, b) => segs.some(s => s !== a && s !== b
            && (horizontal(m) ? vertical(s) : horizontal(s)) && noSegmento(p, s) && !ehPonta(p, s));
        let houveJuncao = true;
        while (houveJuncao) {
            houveJuncao = false;
            procura: for (let i = 0; i < segs.length; i++) {
                for (let j = i + 1; j < segs.length; j++) {
                    const a = segs[i], b = segs[j];
                    let m = null;
                    if (horizontal(a) && horizontal(b) && a.y1 === b.y1 && a.x1 <= b.x2 && b.x1 <= a.x2) {
                        m = { x1: Math.min(a.x1, b.x1), y1: a.y1, x2: Math.max(a.x2, b.x2), y2: a.y1 };
                    } else if (vertical(a) && vertical(b) && a.x1 === b.x1 && a.y1 <= b.y2 && b.y1 <= a.y2) {
                        m = { x1: a.x1, y1: Math.min(a.y1, b.y1), x2: a.x1, y2: Math.max(a.y2, b.y2) };
                    }
                    if (!m) continue;
                    const somem = [a, b].flatMap(s => [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }]).filter(p => !ehPonta(p, m));
                    if (somem.some(p => fazT(p, m, a, b))) continue;
                    Object.assign(a, m);
                    segs.splice(j, 1);
                    houveJuncao = true;
                    break procura;
                }
            }
        }
        return segs;
    }

    /** Com só uma ponta andando, o fio continua saindo da ponta parada na direção original. */
    function manterDirecao(f, moveuPonta1) {
        if (horizontal(f)) return !moveuPonta1;
        if (vertical(f)) return moveuPonta1;
        return f.hv;
    }

    /**
     * Recalcula os fios a partir de uma cópia anterior ao arrasto.
     * destino(ponto, fio) devolve a nova posição de um ponto que anda, ou null.
     */
    function reposicionarFios(base, destino) {
        return base.map(b => {
            const n1 = destino({ x: b.x1, y: b.y1 }, b);
            const n2 = destino({ x: b.x2, y: b.y2 }, b);
            const f = { ...b };
            if (n1) { f.x1 = n1.x; f.y1 = n1.y; }
            if (n2) { f.x2 = n2.x; f.y2 = n2.y; }
            if (!n1 !== !n2) f.hv = manterDirecao(b, !!n1);
            return f;
        });
    }

    /**
     * Desloca um trecho reto de fio na perpendicular. Fios perpendiculares
     * presos a ele esticam; onde há mais alguma coisa ligada (terminal, fio
     * na mesma direção, fio que recebe a ponta em T) entra um trecho novo
     * para não perder a ligação.
     */
    function arrastarTrecho(comps, base, id, d, novoId) {
        const fios = base.map(f => ({ ...f }));
        const s = base.find(f => f.id === id);
        if (!s || !d || (!horizontal(s) && !vertical(s))) return fios;
        const ehH = horizontal(s);
        const mover = p => ehH ? { x: p.x, y: p.y + d } : { x: p.x + d, y: p.y };
        const p1 = mover({ x: s.x1, y: s.y1 });
        const p2 = mover({ x: s.x2, y: s.y2 });
        Object.assign(fios.find(f => f.id === id), { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });

        const terms = comps.flatMap(c => terminais(c));
        const pontos = new Map();
        const incluir = p => pontos.set(`${p.x},${p.y}`, { x: p.x, y: p.y });
        incluir({ x: s.x1, y: s.y1 });
        incluir({ x: s.x2, y: s.y2 });
        terms.forEach(t => { if (noSegmento(t, s)) incluir(t); });
        base.forEach(f => {
            if (f.id === id) return;
            [{ x: f.x1, y: f.y1 }, { x: f.x2, y: f.y2 }].forEach(p => { if (noSegmento(p, s)) incluir(p); });
        });

        pontos.forEach(p => {
            const alvo = mover(p);
            const pontaDoTrecho = ehPonta(p, s);
            let ponte = terms.some(t => t.x === p.x && t.y === p.y);
            base.forEach((f, i) => {
                if (f.id === id) return;
                const temPonta = ehPonta(p, f);
                if (temPonta && (ehH ? vertical(f) : horizontal(f))) {
                    const g = fios[i];
                    if (f.x1 === p.x && f.y1 === p.y) { g.x1 = alvo.x; g.y1 = alvo.y; }
                    else { g.x2 = alvo.x; g.y2 = alvo.y; }
                } else if (temPonta || (pontaDoTrecho && noSegmento(p, f))) {
                    ponte = true;
                }
            });
            if (ponte) fios.push({ id: novoId(), x1: p.x, y1: p.y, x2: alvo.x, y2: alvo.y, hv: true });
        });
        return fios;
    }

    /**
     * Problemas que impedem ou comprometem a resolução.
     * @returns {{erros: string[], avisos: string[]}}
     */
    function diagnosticar(comps, analise) {
        const erros = [];
        const avisos = [];
        const partes = comps.filter(c => c.tipo !== 'GND');
        if (!partes.length) erros.push('Coloque pelo menos um componente na placa.');
        if (!comps.some(c => c.tipo === 'GND')) {
            erros.push('Coloque um terra (GND): ele define o nó 0, a referência de todas as tensões.');
        } else if (!analise.grupos.some(g => g.temGnd && g.terminais.some(t => t.comp.tipo !== 'GND'))) {
            erros.push('O terra (GND) não está ligado a nenhum componente.');
        }
        partes.forEach(c => {
            const n = analise.nosPorComp.get(c.id);
            if (n && n.A != null && n.A === n.B) {
                const msg = (quatroTerminais(c.tipo) || controladaPorCorrente(c.tipo))
                    ? `${c.nome} está em curto (os terminais de saída no mesmo nó).`
                    : `${c.nome} está em curto (os dois terminais no mesmo nó).`;
                const fonteTensao = c.tipo === 'VoltageSource' || c.tipo === 'VCVS' || c.tipo === 'CCVS';
                if (fonteTensao) erros.push(msg);
                else avisos.push(msg);
            }
            if (n && quatroTerminais(c.tipo) && n.C != null && n.C === n.D) {
                avisos.push(`${c.nome}: Ctrl+ e Ctrl− estão no mesmo nó (tensão de controle nula).`);
            }
            if (controladaPorCorrente(c.tipo)) {
                const alvo = String(c.alvo || '').trim();
                if (!alvo) {
                    erros.push(`${c.nome} está sem o componente de Alvo (corrente de referência).`);
                } else if (!partes.some(o => o !== c && o.nome === alvo)) {
                    erros.push(`${c.nome} referencia ${alvo}, mas esse componente não existe.`);
                }
            }
        });
        const soltosPorComp = new Set(analise.soltos.filter(s => s.comp.tipo !== 'GND').map(s => s.comp.nome));
        soltosPorComp.forEach(nome => avisos.push(`${nome} tem terminal solto (marcado em vermelho).`));
        return { erros, avisos };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { terminais, segmentos, extrairNos, juncoes, diagnosticar, normalizarFios, reposicionarFios, arrastarTrecho, nosNetlist };
    }
    if (typeof document === 'undefined') return;

    /* ---------- Estado ---------- */

    const estado = { comps: [], fios: [], seq: 1 };
    const ui = {
        modo: 'selecionar',
        selecao: { comps: new Set(), fios: new Set() },
        fantasma: null,
        fioInicio: null,
        fioHv: null,
        fioInverter: false,
        voltarAoSelecionar: false,
        cursor: { x: 0, y: 0 },
        cursorNaPlaca: false,
        arrasto: null,
        arrastoPaleta: false,
        ultimoToque: { id: null, t: 0 }
    };
    let svg, conteudo, sobreposicao, wrap;
    let timerSync = null;

    const RAIO_IMA = 12;
    const snap = v => Math.round(v / GRID) * GRID;
    const $ = id => document.getElementById(id);
    const acharComp = id => estado.comps.find(c => c.id === id);
    const acharFio = id => estado.fios.find(f => f.id === id);
    const novoId = () => 'p' + (estado.seq++);

    const selVazia = () => !ui.selecao.comps.size && !ui.selecao.fios.size;
    const limparSelecao = () => { ui.selecao = { comps: new Set(), fios: new Set() }; };
    const selecionarSo = (tipo, id) => {
        limparSelecao();
        ui.selecao[tipo === 'comp' ? 'comps' : 'fios'].add(id);
    };
    const tamanhoSel = () => ui.selecao.comps.size + ui.selecao.fios.size;
    const tudoSelecionado = () => estado.comps.every(c => ui.selecao.comps.has(c.id)) && estado.fios.every(f => ui.selecao.fios.has(f.id));

    /** Componente sozinho na seleção (sem fios), ou null. */
    function compUnico() {
        if (ui.selecao.comps.size !== 1 || ui.selecao.fios.size) return null;
        return acharComp([...ui.selecao.comps][0]) || null;
    }

    function podarSelecao() {
        ui.selecao.comps.forEach(id => { if (!acharComp(id)) ui.selecao.comps.delete(id); });
        ui.selecao.fios.forEach(id => { if (!acharFio(id)) ui.selecao.fios.delete(id); });
    }

    function proximoNome(tipo) {
        const prefixo = prefixoNomePorTipo(tipo);
        const re = new RegExp('^' + prefixo + '(\\d+)$', 'i');
        const usados = new Set();
        estado.comps.forEach(c => {
            const m = (c.nome || '').match(re);
            if (m) usados.add(parseInt(m[1], 10));
        });
        let i = 1;
        while (usados.has(i)) i++;
        return prefixo + i;
    }

    function montarComp(tipo, x, y, rot, id) {
        const c = { id, tipo, x, y, rot };
        if (tipo === 'GND') return c;
        const peca = PECAS[tipo];
        const padrao = peca.padrao;
        c.nome = proximoNome(tipo);
        if (ehFonte(tipo)) {
            c.valorDc = padrao;
            c.modulo = padrao;
            c.fase = '0';
            c.amplitude = padrao;
            c.laplaceTipo = 'degrau';
            c.laplaceAlpha = '1';
        } else {
            c.valor = padrao;
        }
        if (tipo === 'Capacitor' || tipo === 'Inductor') c.condicaoInicial = '';
        if (peca.alvo) c.alvo = '';
        return c;
    }

    function formaLaplace(c) {
        const tipoL = c.laplaceTipo || 'degrau';
        if (tipoL === 'impulso') return 'δ(t)';
        if (tipoL === 'exponencial') {
            const alpha = String(c.laplaceAlpha || '').trim() || 'α';
            return `e^{−${alpha}t}`;
        }
        return 'u(t)';
    }

    function valorExibido(c) {
        if (!ehFonte(c.tipo)) return c.valor;
        const modo = (typeof getModoSimulacao === 'function') ? getModoSimulacao() : 'DC';
        if (modo === 'AC') {
            const f = String(c.fase || '0').trim();
            return f && f !== '0' ? `${c.modulo}∠${f}°` : c.modulo;
        }
        if (modo === 'S') {
            const amp = String(c.amplitude || c.valorDc || '').trim();
            const forma = formaLaplace(c);
            return amp ? `${amp} ${forma}` : forma;
        }
        return c.valorDc;
    }

    /* ---------- Desenho ---------- */

    const trocarSeta = s => s.replace(/url\(#esq-arrow-curr\)/g, 'url(#placa-seta)');

    function simbolo(c, x, y, orient, aPrimeiro) {
        const quatro = quatroTerminais(c.tipo);
        return trocarSeta(drawSimbolo({
            tipo: c.tipo,
            nome: quatro ? '' : (c.nome || ''),
            valor: (!quatro && c.nome) ? valorExibido(c) : '',
            alvo: quatro ? null : (c.alvo || null),
            _positiveOnA: aPrimeiro,
            _fromAtoB: !aPrimeiro
        }, x, y, orient));
    }

    function pernas(x, y, orient) {
        const h = ESQ.BODY / 2;
        return orient === 'H'
            ? `<line class="placa-perna" x1="${x - MEIO}" y1="${y}" x2="${x - h}" y2="${y}"/><line class="placa-perna" x1="${x + h}" y1="${y}" x2="${x + MEIO}" y2="${y}"/>`
            : `<line class="placa-perna" x1="${x}" y1="${y - MEIO}" x2="${x}" y2="${y - h}"/><line class="placa-perna" x1="${x}" y1="${y + h}" x2="${x}" y2="${y + MEIO}"/>`;
    }

    /** Meia-diagonal do losango de drawSimbolo (symDependentSource). */
    const DIAMANTE = 18;

    /** Saída no eixo da orientação; controle no eixo perpendicular, até os vértices do losango. */
    function pernasQuatro(x, y, orient) {
        const s = DIAMANTE;
        if (orient === 'H') {
            return pernas(x, y, 'H')
                + `<line class="placa-perna placa-perna--ctrl" x1="${x}" y1="${y - MEIO}" x2="${x}" y2="${y - s}"/>`
                + `<line class="placa-perna placa-perna--ctrl" x1="${x}" y1="${y + s}" x2="${x}" y2="${y + MEIO}"/>`;
        }
        return pernas(x, y, 'V')
            + `<line class="placa-perna placa-perna--ctrl" x1="${x - MEIO}" y1="${y}" x2="${x - s}" y2="${y}"/>`
            + `<line class="placa-perna placa-perna--ctrl" x1="${x + s}" y1="${y}" x2="${x + MEIO}" y2="${y}"/>`;
    }

    const ROTULO_TERM = { A: 'Out+', B: 'Out−', C: 'Ctrl+', D: 'Ctrl−' };

    /** Rótulo ao lado do terminal, fora do fio. */
    function deslocRotulo(t, cx, cy) {
        const dx = t.x - cx;
        const dy = t.y - cy;
        let px = -dy;
        let py = dx;
        if (py > 0 || (py === 0 && px < 0)) { px = -px; py = -py; }
        const len = Math.hypot(px, py) || 1;
        return { x: t.x + (px / len) * 12, y: t.y + (py / len) * 12 };
    }

    function rotulosQuatro(c) {
        let html = '';
        if (c.nome) {
            html += `<text class="esq-label--name" x="${c.x + 16}" y="${c.y - 14}" text-anchor="start" dominant-baseline="auto">${escapeXml(c.nome)}</text>`;
            const v = valorExibido(c);
            if (v) html += `<text class="esq-label--val" x="${c.x + 16}" y="${c.y + 16}" text-anchor="start" dominant-baseline="hanging">${escapeXml(v)}</text>`;
        }
        html += terminais(c).map(t => {
            const p = deslocRotulo(t, c.x, c.y);
            const ctrl = t.nome === 'C' || t.nome === 'D';
            return `<text class="placa-rotulo-term${ctrl ? ' placa-rotulo-term--ctrl' : ''}" x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central">${ROTULO_TERM[t.nome]}</text>`;
        }).join('');
        return html;
    }

    function desenhoGnd(x, y) {
        return `<line class="placa-perna" x1="${x}" y1="${y}" x2="${x}" y2="${y + 12}"/>
            <line class="placa-gnd" x1="${x - 14}" y1="${y + 12}" x2="${x + 14}" y2="${y + 12}"/>
            <line class="placa-gnd" x1="${x - 9}" y1="${y + 18}" x2="${x + 9}" y2="${y + 18}"/>
            <line class="placa-gnd" x1="${x - 4}" y1="${y + 24}" x2="${x + 4}" y2="${y + 24}"/>`;
    }

    function caixaComp(c) {
        if (c.tipo === 'GND') return { x: c.x - 16, y: c.y - 4, w: 32, h: 32 };
        if (quatroTerminais(c.tipo)) return { x: c.x - MEIO, y: c.y - MEIO, w: 2 * MEIO, h: 2 * MEIO };
        return (c.rot === 90 || c.rot === 270)
            ? { x: c.x - 20, y: c.y - MEIO, w: 40, h: 2 * MEIO }
            : { x: c.x - MEIO, y: c.y - 20, w: 2 * MEIO, h: 40 };
    }

    function svgComp(c, opts) {
        const cls = ['placa-comp'];
        if (opts.fantasma) cls.push('is-fantasma');
        if (opts.selecionado) cls.push('is-selecionado');
        const termsSvg = terminais(c).map(t => {
            const solto = opts.soltos && opts.soltos.has(`${c.id}:${t.nome}`);
            const ctrl = quatroTerminais(c.tipo) && (t.nome === 'C' || t.nome === 'D');
            const titulo = quatroTerminais(c.tipo)
                ? ROTULO_TERM[t.nome]
                : (controladaPorCorrente(c.tipo) ? (t.nome === 'A' ? 'Out+' : 'Out−') : '');
            return `<circle class="placa-term${ctrl ? ' placa-term--ctrl' : ''}${solto ? ' is-solto' : ''}" cx="${t.x}" cy="${t.y}" r="5" data-comp="${c.id}" data-term="${t.nome}">${titulo ? `<title>${titulo}</title>` : ''}</circle>`;
        }).join('');

        const caixa = caixaComp(c);
        let corpo;
        if (c.tipo === 'GND') {
            corpo = desenhoGnd(c.x, c.y);
        } else {
            const orient = (c.rot === 90 || c.rot === 270) ? 'V' : 'H';
            const pernasSvg = quatroTerminais(c.tipo) ? pernasQuatro(c.x, c.y, orient) : pernas(c.x, c.y, orient);
            corpo = pernasSvg + simbolo(c, c.x, c.y, orient, c.rot === 0 || c.rot === 90);
            if (quatroTerminais(c.tipo)) corpo += rotulosQuatro(c);
        }
        const sel = opts.selecionado
            ? `<rect class="placa-sel" x="${caixa.x - 4}" y="${caixa.y - 4}" width="${caixa.w + 8}" height="${caixa.h + 8}" rx="6"/>`
            : '';
        return `<g class="${cls.join(' ')}" data-comp="${c.id}">
            ${sel}
            <rect class="placa-hit" x="${caixa.x}" y="${caixa.y}" width="${caixa.w}" height="${caixa.h}"/>
            ${corpo}
            ${termsSvg}
        </g>`;
    }

    function caminhoFio(f) {
        const s = segmentos(f);
        return `M ${s[0].x1} ${s[0].y1} ` + s.map(g => `L ${g.x2} ${g.y2}`).join(' ');
    }

    function svgFio(f, selecionado) {
        const d = caminhoFio(f);
        const cls = ['placa-fio'];
        if (horizontal(f)) cls.push('placa-fio--h');
        else if (vertical(f)) cls.push('placa-fio--v');
        if (selecionado) cls.push('is-selecionado');
        return `<g class="${cls.join(' ')}" data-fio="${f.id}">
            <path class="placa-fio-hit" d="${d}"/>
            <path class="placa-fio-linha" d="${d}"/>
        </g>`;
    }

    function svgRotulosNos(grupos) {
        return grupos.filter(g => g.no > 0 && g.pontos.length).map(g => {
            const p = g.pontos.reduce((a, b) => (b.y < a.y || (b.y === a.y && b.x < a.x)) ? b : a);
            const x = p.x + 11, y = p.y - 11;
            return `<g class="placa-no"><circle cx="${x}" cy="${y}" r="8"/><text class="esq-label--node" x="${x}" y="${y}">${g.no}</text></g>`;
        }).join('');
    }

    /** Eixo do terminal em p: true = horizontal, false = vertical, null = não há terminal. */
    function eixoTerminal(p) {
        for (const c of estado.comps) {
            const t = terminais(c).find(k => k.x === p.x && k.y === p.y);
            if (!t) continue;
            if (c.tipo === 'GND') return false;
            const saidaH = c.rot === 0 || c.rot === 180;
            if (quatroTerminais(c.tipo) && (t.nome === 'C' || t.nome === 'D')) return !saidaH;
            return saidaH;
        }
        return null;
    }

    /**
     * O fio sai do terminal na direção da perna (e chega ao terminal final
     * na direção da perna dele); longe de terminais, segue o primeiro
     * movimento do mouse. Espaço inverte a dobra.
     */
    function hvDoFio(inicio, fim) {
        let hv = eixoTerminal(inicio);
        if (hv === null) {
            const e = eixoTerminal(fim);
            if (e !== null) hv = !e;
        }
        if (hv === null) hv = ui.fioHv !== null ? ui.fioHv : Math.abs(fim.x - inicio.x) >= Math.abs(fim.y - inicio.y);
        return ui.fioInverter ? !hv : hv;
    }

    function render() {
        const analise = extrairNos(estado.comps, estado.fios);
        const soltos = new Set(analise.soltos.map(({ comp, term }) => `${comp.id}:${term.nome}`));
        const sel = ui.selecao;
        let html = estado.fios.map(f => svgFio(f, sel.fios.has(f.id))).join('');
        html += estado.comps.map(c => svgComp(c, { selecionado: sel.comps.has(c.id), soltos })).join('');
        html += juncoes(estado.comps, estado.fios).map(j => `<circle class="placa-juncao" cx="${j.x}" cy="${j.y}" r="4"/>`).join('');
        html += svgRotulosNos(analise.grupos);
        const fioSel = ui.modo === 'selecionar' && !sel.comps.size && sel.fios.size === 1 ? acharFio([...sel.fios][0]) : null;
        if (fioSel) {
            html += [1, 2].map(n => `<circle class="placa-ponta" cx="${fioSel['x' + n]}" cy="${fioSel['y' + n]}" r="6" data-fio="${fioSel.id}" data-ponta="${n}"/>`).join('');
        }

        conteudo.innerHTML = html;
        renderSobreposicao();
        svg.classList.toggle('placa-svg--fio', ui.modo === 'fio');
        svg.classList.toggle('placa-svg--posicionar', ui.modo === 'posicionar');
        atualizarVazia();
        atualizarStatus(analise);
        atualizarToolbar();
    }

    // Prévia do fio, mira e fantasma ficam numa camada à parte: redesenhá-la a
    // cada movimento do mouse não recria os elementos que recebem cliques.
    function renderSobreposicao() {
        let html = '';
        const a = ui.arrasto;
        if (ui.fioInicio && ui.cursorNaPlaca) {
            const previa = { x1: ui.fioInicio.x, y1: ui.fioInicio.y, x2: ui.cursor.x, y2: ui.cursor.y, hv: hvDoFio(ui.fioInicio, ui.cursor) };
            html += `<path class="placa-fio-previa" d="${caminhoFio(previa)}"/>`;
        }
        if (ligando() && ui.cursorNaPlaca && pontoConectavel(ui.cursor, a && a.tipo === 'ponta' ? acharFio(a.id) : null)) {
            html += `<circle class="placa-ima" cx="${ui.cursor.x}" cy="${ui.cursor.y}" r="9"/>`;
        }
        if (a && a.tipo === 'caixa') {
            const r = retanguloCaixa(a);
            html += `<rect class="placa-caixa-sel" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`;
        }
        if (ui.modo === 'fio' && ui.cursorNaPlaca) {
            const { x, y } = ui.cursor;
            html += `<path class="placa-mira" d="M ${x - 6} ${y} L ${x + 6} ${y} M ${x} ${y - 6} L ${x} ${y + 6}"/>`;
        }
        if (ui.modo === 'posicionar' && ui.fantasma && ui.cursorNaPlaca) {
            const f = montarComp(ui.fantasma.tipo, ui.cursor.x, ui.cursor.y, ui.fantasma.rot, 'fantasma');
            html += svgComp(f, { fantasma: true });
        }
        sobreposicao.innerHTML = html;
    }

    function atualizarVazia() {
        const vazia = $('placaVazia');
        if (!vazia) return;
        vazia.hidden = estado.comps.length > 0 || estado.fios.length > 0 || ui.modo === 'posicionar';
        const nota = $('placaVaziaLista');
        if (nota) nota.hidden = !document.querySelector('#listaComponentes .comp-item');
    }

    function atualizarStatus(analise) {
        const el = $('placaStatus');
        if (!el) return;
        const partes = estado.comps.filter(c => c.tipo !== 'GND');
        if (!estado.comps.length) { el.innerHTML = ''; return; }
        const nNos = analise.grupos.filter(g => g.no > 0).length;
        const { erros, avisos } = diagnosticar(estado.comps, analise);
        const itens = [
            ...erros.map(m => `<li class="placa-status-erro">${escapeXml(m)}</li>`),
            ...avisos.map(m => `<li class="placa-status-aviso">${escapeXml(m)}</li>`)
        ];
        el.innerHTML = `<span class="placa-status-resumo">${partes.length} componente(s) · ${nNos} nó(s) + terra</span>`
            + (itens.length ? `<ul class="placa-status-lista">${itens.join('')}</ul>` : '<span class="placa-status-ok">Pronto para resolver</span>');
    }

    function atualizarToolbar() {
        document.querySelectorAll('.placa-peca').forEach(b => {
            b.classList.toggle('is-ativo', ui.modo === 'posicionar' && ui.fantasma && ui.fantasma.tipo === b.dataset.tipo);
        });
        const btnFio = document.querySelector('.placa-ferr[data-acao="fio"]');
        if (btnFio) btnFio.classList.toggle('is-ativo', ui.modo === 'fio');
        const comp = compUnico();
        const btnGirar = document.querySelector('.placa-ferr[data-acao="girar"]');
        if (btnGirar) btnGirar.disabled = !(ui.modo === 'posicionar' || (comp && comp.tipo !== 'GND'));
        const btnApagar = document.querySelector('.placa-ferr[data-acao="apagar"]');
        if (btnApagar) {
            btnApagar.disabled = selVazia();
            const n = tamanhoSel();
            btnApagar.title = n > 1 ? `Apagar os ${n} itens selecionados (Del)` : 'Apagar o selecionado (Del)';
        }
    }

    /* ---------- Edição ---------- */

    function mudou() {
        estado.fios = normalizarFios(estado.fios, novoId);
        podarSelecao();
        render();
        salvar();
        clearTimeout(timerSync);
        timerSync = setTimeout(sincronizarLista, 150);
    }

    function cancelar() {
        ui.modo = 'selecionar';
        ui.fantasma = null;
        comecarFio(null);
        ui.voltarAoSelecionar = false;
        ui.arrasto = null;
        ui.arrastoPaleta = false;
    }

    function posicionar(p) {
        const c = montarComp(ui.fantasma.tipo, p.x, p.y, ui.fantasma.rot, novoId());
        estado.comps.push(c);
        cancelar();
        selecionarSo('comp', c.id);
        mudou();
    }

    function pontoConectavel(p, ignorar) {
        if (estado.comps.some(c => terminais(c).some(t => t.x === p.x && t.y === p.y))) return true;
        return estado.fios.some(f => f !== ignorar && noFio(p, f));
    }

    function comecarFio(p) {
        ui.fioInicio = p;
        ui.fioHv = null;
        ui.fioInverter = false;
    }

    const ligando = () => ui.modo === 'fio' || !!ui.fioInicio || (!!ui.arrasto && ui.arrasto.tipo === 'ponta');

    /** Terminal ou ponta de fio mais próxima do ponteiro, dentro do raio do ímã. */
    function ima(p, ignorarFio) {
        let melhor = null;
        let dist = RAIO_IMA;
        const testar = (x, y) => {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d <= dist) { dist = d; melhor = { x, y }; }
        };
        estado.comps.forEach(c => terminais(c).forEach(t => testar(t.x, t.y)));
        estado.fios.forEach(f => {
            if (f.id === ignorarFio) return;
            testar(f.x1, f.y1);
            testar(f.x2, f.y2);
        });
        return melhor;
    }

    function criarFio(a, b) {
        const f = { id: novoId(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, hv: hvDoFio(a, b) };
        estado.fios.push(f);
        return f;
    }

    /**
     * Termina um trecho de fio. No modo Fio (cliques), se a ponta não
     * encostou em nada o traçado continua dali; arrastando, o fio acaba
     * onde o botão foi solto.
     */
    function terminarTrecho(inicio, fim, continuar) {
        const f = criarFio(inicio, fim);
        if (continuar && !pontoConectavel(fim, f)) {
            ui.modo = 'fio';
            comecarFio(fim);
        } else {
            comecarFio(null);
            if (ui.voltarAoSelecionar) cancelar();
        }
        mudou();
    }

    function cliqueFio(p) {
        if (!ui.fioInicio) {
            comecarFio(p);
            render();
            return;
        }
        if (p.x === ui.fioInicio.x && p.y === ui.fioInicio.y) return;
        terminarTrecho(ui.fioInicio, p, true);
    }

    const copiarFios = () => estado.fios.map(f => ({ ...f }));
    const mesmoPonto = (a, b) => a.x === b.x && a.y === b.y;

    function girarAtual() {
        if (ui.modo === 'posicionar' && ui.fantasma) {
            ui.fantasma.rot = (ui.fantasma.rot + 90) % 360;
            render();
            return;
        }
        const c = compUnico();
        if (!c || c.tipo === 'GND') return;
        const antes = terminais(c);
        const outros = estado.comps.filter(k => k !== c).flatMap(k => terminais(k));
        const presoNoMeio = antes.map(t => outros.some(o => mesmoPonto(o, t))
            || estado.fios.some(f => !ehPonta(t, f) && noFio(t, f)));
        c.rot = (c.rot + 90) % 360;
        const depois = terminais(c);
        estado.fios = reposicionarFios(copiarFios(), p => {
            const i = antes.findIndex(t => mesmoPonto(t, p));
            return i >= 0 ? { x: depois[i].x, y: depois[i].y } : null;
        });
        // A dobra fica do lado de fora: o caminho pelo canto oposto passaria pelo corpo.
        const saidaVertical = c.rot === 90 || c.rot === 270;
        antes.forEach((t, i) => {
            if (!presoNoMeio[i]) return;
            const ctrl = quatroTerminais(c.tipo) && (t.nome === 'C' || t.nome === 'D');
            estado.fios.push({ id: novoId(), x1: t.x, y1: t.y, x2: depois[i].x, y2: depois[i].y, hv: ctrl ? saidaVertical : !saidaVertical });
        });
        mudou();
    }

    /** Apaga tudo o que está selecionado; com o circuito todo selecionado, a placa fica vazia. */
    function apagarSelecao() {
        if (selVazia()) return;
        const { comps, fios } = ui.selecao;
        estado.comps = estado.comps.filter(c => !comps.has(c.id));
        estado.fios = estado.fios.filter(f => !fios.has(f.id));
        limparSelecao();
        fecharProps();
        mudou();
    }

    function selecionarTudo() {
        ui.selecao = { comps: new Set(estado.comps.map(c => c.id)), fios: new Set(estado.fios.map(f => f.id)) };
        render();
    }

    /**
     * Arrasto da seleção: componentes e fios selecionados andam juntos;
     * fios de fora presos a eles esticam, saindo da ponta parada na
     * direção que já tinham.
     */
    function iniciarArrastoGrupo(p, reduzirA) {
        const { comps, fios } = ui.selecao;
        const base = copiarFios();
        const movem = [];
        const pontes = [];
        estado.comps.forEach(c => {
            if (!comps.has(c.id)) return;
            const vertical = c.tipo === 'GND' || c.rot === 90 || c.rot === 270;
            terminais(c).forEach(t => {
                const ctrl = quatroTerminais(c.tipo) && (t.nome === 'C' || t.nome === 'D');
                movem.push({ x: t.x, y: t.y, hv: ctrl ? !vertical : vertical });
            });
        });
        const fiosSel = base.filter(f => fios.has(f.id));
        fiosSel.forEach(f => movem.push({ x: f.x1, y: f.y1, hv: true }, { x: f.x2, y: f.y2, hv: true }));
        // Onde um ponto que anda encosta em algo que fica (terminal de outro
        // componente ou meio de um fio), um trecho novo mantém a ligação.
        const anda = q => movem.some(m => mesmoPonto(m, q)) || fiosSel.some(s => noFio(q, s));
        const fiosParados = base.filter(f => !fios.has(f.id) && !anda({ x: f.x1, y: f.y1 }) && !anda({ x: f.x2, y: f.y2 }));
        const termsParados = estado.comps.filter(c => !comps.has(c.id)).flatMap(c => terminais(c));
        movem.forEach(m => {
            if (pontes.some(q => mesmoPonto(q, m))) return;
            if (termsParados.some(t => mesmoPonto(t, m)) || fiosParados.some(f => noFio(m, f))) pontes.push(m);
        });
        ui.arrasto = {
            tipo: 'grupo', x0: p.x, y0: p.y, dx: 0, dy: 0, reduzirA, base, movem, fiosSel, pontes,
            origem: estado.comps.filter(c => comps.has(c.id)).map(c => ({ c, x: c.x, y: c.y }))
        };
    }

    function moverGrupo(a, dx, dy) {
        a.origem.forEach(o => { o.c.x = o.x + dx; o.c.y = o.y + dy; });
        const anda = p => ({ x: p.x + dx, y: p.y + dy });
        estado.fios = reposicionarFios(a.base, (p, f) => {
            if (ui.selecao.fios.has(f.id)) return anda(p);
            if (a.movem.some(m => mesmoPonto(m, p)) || a.fiosSel.some(s => noFio(p, s))) return anda(p);
            return null;
        });
        seqTemp = 0;
        if (dx || dy) a.pontes.forEach(m => estado.fios.push({ id: idTemp(), x1: m.x, y1: m.y, x2: m.x + dx, y2: m.y + dy, hv: m.hv }));
    }

    let seqTemp = 0;
    const idTemp = () => 'tmp' + (seqTemp++);
    const fixarIdsTemp = () => estado.fios.forEach(f => { if (f.id.startsWith('tmp')) f.id = novoId(); });

    function moverTrecho(a, d) {
        seqTemp = 0;
        estado.fios = arrastarTrecho(estado.comps, a.base, a.id, d, idTemp);
    }

    function moverPonta(a) {
        estado.fios = a.base.map(b => {
            if (b.id !== a.id) return { ...b };
            const f = { ...b, ['x' + a.ponta]: ui.cursor.x, ['y' + a.ponta]: ui.cursor.y };
            f.hv = manterDirecao(b, a.ponta === 1);
            return f;
        });
    }

    function retanguloCaixa(a) {
        const x = Math.min(a.x0, a.x1), y = Math.min(a.y0, a.y1);
        return { x, y, w: Math.abs(a.x1 - a.x0), h: Math.abs(a.y1 - a.y0) };
    }

    /** Seleciona o que ficou inteiramente dentro do retângulo. */
    function aplicarCaixa(a) {
        const r = retanguloCaixa(a);
        const dentro = (x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        if (!a.somar) limparSelecao();
        estado.comps.forEach(c => {
            const b = caixaComp(c);
            if (dentro(b.x, b.y) && dentro(b.x + b.w, b.y + b.h)) ui.selecao.comps.add(c.id);
        });
        estado.fios.forEach(f => {
            if (segmentos(f).every(s => dentro(s.x1, s.y1) && dentro(s.x2, s.y2))) ui.selecao.fios.add(f.id);
        });
    }

    function alternarNaSelecao(tipo, id) {
        const conj = ui.selecao[tipo === 'comp' ? 'comps' : 'fios'];
        if (conj.has(id)) conj.delete(id);
        else conj.add(id);
    }

    function alternarFio() {
        const ativo = ui.modo === 'fio';
        cancelar();
        if (!ativo) ui.modo = 'fio';
        render();
    }

    function limpar() {
        estado.comps = [];
        estado.fios = [];
        cancelar();
        limparSelecao();
        fecharProps();
        mudou();
    }

    function limparSemTocarLista() {
        estado.comps = [];
        estado.fios = [];
        cancelar();
        limparSelecao();
        fecharProps();
        clearTimeout(timerSync);
        timerSync = null;
        salvar();
        render();
        $('placaDessinc').hidden = true;
    }

    /* ---------- Propriedades do componente ---------- */

    function campoProp(rotulo, chave, valor, largo) {
        const cls = largo ? 'placa-props-campo placa-props-campo--largo' : 'placa-props-campo';
        return `<label class="${cls}"><span>${rotulo}</span><input type="text" name="${chave}" value="${escapeAttr(valor)}" autocomplete="off" spellcheck="false"></label>`;
    }

    function campoSelect(rotulo, chave, valor, opcoes) {
        const opts = opcoes.map(([v, label]) =>
            `<option value="${escapeAttr(v)}"${v === valor ? ' selected' : ''}>${label}</option>`
        ).join('');
        return `<label class="placa-props-campo placa-props-campo--largo"><span>${rotulo}</span><select name="${chave}">${opts}</select></label>`;
    }

    function abrirProps(c) {
        if (c.tipo === 'GND') return;
        const box = $('placaProps');
        const modo = (typeof getModoSimulacao === 'function') ? getModoSimulacao() : 'DC';
        const ac = modo === 'AC';
        const sdom = modo === 'S';
        const peca = PECAS[c.tipo];
        const dependente = !!(peca.quatro || peca.alvo);
        let campos, nota;
        if (ehFonte(c.tipo)) {
            if (ac) {
                campos = campoProp('Módulo', 'modulo', c.modulo) + campoProp('Fase (°)', 'fase', c.fase);
                nota = 'Modo AC. O módulo também aceita a forma a+jb.';
            } else if (sdom) {
                campos = campoSelect('Forma', 'laplaceTipo', c.laplaceTipo || 'degrau', [
                    ['degrau', 'Degrau A·u(t)'],
                    ['impulso', 'Impulso A·δ(t)'],
                    ['exponencial', 'Exponencial A·e^{−αt}']
                ]) + campoProp('Amplitude', 'amplitude', c.amplitude || c.valorDc)
                    + campoProp('α', 'laplaceAlpha', c.laplaceAlpha == null ? '1' : c.laplaceAlpha);
                nota = 'Modo s. Degrau vira A/s, impulso vira A e exponencial vira A/(s+α), só no cálculo. O valor DC fica guardado.';
            } else {
                campos = campoProp('Valor', 'valorDc', c.valorDc);
                nota = 'Modo DC. Módulo e fase são editados no modo AC.';
            }
        } else if (dependente) {
            campos = campoProp(peca.rotuloValor, 'valor', c.valor, true);
            if (peca.alvo) {
                const opcoes = estado.comps
                    .filter(k => k !== c && k.nome && k.tipo !== 'GND')
                    .map(k => `<option value="${escapeAttr(k.nome)}"></option>`)
                    .join('');
                campos += `<label class="placa-props-campo"><span>Alvo</span><input type="text" name="alvo" value="${escapeAttr(c.alvo || '')}" list="placaListaAlvo" autocomplete="off" spellcheck="false" placeholder="ex.: R1"></label><datalist id="placaListaAlvo">${opcoes}</datalist>`;
            }
            nota = peca.nota;
        } else if (sdom && (c.tipo === 'Capacitor' || c.tipo === 'Inductor')) {
            const rotuloIc = c.tipo === 'Capacitor' ? 'v(0)' : 'i(0)';
            campos = campoProp('Valor', 'valor', c.valor) + campoProp(rotuloIc, 'condicaoInicial', c.condicaoInicial || '');
            nota = c.tipo === 'Capacitor'
                ? 'O símbolo continua C. No cálculo em s a tensão é i/(sC) + v(0)/s. Pode deixar v(0) vazio enquanto monta; a resolução exige um número (use 0 se descarregado).'
                : 'O símbolo continua L. No cálculo em s a tensão é (sL)·i − L·i(0). Pode deixar i(0) vazio enquanto monta; a resolução exige um número (use 0 se sem corrente).';
        } else {
            campos = campoProp('Valor', 'valor', c.valor);
            nota = 'Sufixos: k, M, m, u, n, p (M = mega, m = mili).';
        }
        box.classList.toggle('is-larga', dependente);
        box.innerHTML = `<form class="placa-props-form">
            <div class="placa-props-titulo">${peca.titulo}</div>
            ${campoProp('Nome', 'nome', c.nome)}
            ${campos}
            <p class="placa-props-nota">${nota}</p>
            <p class="placa-props-erro" hidden></p>
            <div class="placa-props-botoes">
                <button type="button" class="placa-props-cancelar">Cancelar</button>
                <button type="submit" class="placa-props-ok">OK</button>
            </div>
        </form>`;
        box.style.left = Math.min(c.x + 52, LARGURA - (dependente ? 320 : 250)) + 'px';
        box.style.top = Math.max(c.y - 40, 4) + 'px';
        box.hidden = false;

        const form = box.querySelector('form');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const erro = aplicarProps(c, new FormData(form));
            const el = form.querySelector('.placa-props-erro');
            if (erro) {
                el.textContent = erro;
                el.hidden = false;
                return;
            }
            fecharProps();
            mudou();
        });
        form.querySelector('.placa-props-cancelar').addEventListener('click', fecharProps);
        form.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.stopPropagation(); fecharProps(); }
        });
        const foco = form.querySelectorAll('input')[1];
        if (foco) { foco.focus(); foco.select(); }
    }

    function aplicarProps(c, dados) {
        const nome = String(dados.get('nome') || '').trim();
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(nome)) return 'O nome deve começar com letra e usar apenas letras, números ou _.';
        if (estado.comps.some(k => k !== c && k.nome && k.nome.toLowerCase() === nome.toLowerCase())) return `Já existe um componente chamado ${nome}.`;
        const novos = {};
        for (const chave of ['valor', 'valorDc', 'modulo', 'fase', 'amplitude']) {
            if (!dados.has(chave)) continue;
            const v = String(dados.get(chave)).trim();
            if (!v) return 'Preencha todos os valores.';
            novos[chave] = v;
        }
        if (dados.has('laplaceTipo')) {
            const t = String(dados.get('laplaceTipo') || 'degrau');
            novos.laplaceTipo = (t === 'impulso' || t === 'exponencial') ? t : 'degrau';
        }
        if (dados.has('laplaceAlpha')) {
            const a = String(dados.get('laplaceAlpha') || '').trim();
            if ((novos.laplaceTipo || c.laplaceTipo) === 'exponencial' && !a) {
                return 'Informe α da exponencial e^{−αt}.';
            }
            novos.laplaceAlpha = a || '1';
        }
        if (dados.has('condicaoInicial')) {
            novos.condicaoInicial = String(dados.get('condicaoInicial') || '').trim();
        }
        if (dados.has('alvo')) {
            const alvo = String(dados.get('alvo') || '').trim();
            if (alvo && !/^[A-Za-z][A-Za-z0-9_]*$/.test(alvo)) {
                return 'O Alvo deve ser o nome exato de um componente (letra, depois letras, números ou _).';
            }
            novos.alvo = alvo;
        }
        if (novos.valor && validarValorNegativo(c.tipo, novos.valor)) return 'Este componente não aceita valor negativo.';
        c.nome = nome;
        Object.assign(c, novos);
        return null;
    }

    function fecharProps() {
        const box = $('placaProps');
        if (box) { box.hidden = true; box.innerHTML = ''; }
    }

    /* ---------- Ponteiro e teclado ---------- */

    function atualizarCursor(e) {
        const r = svg.getBoundingClientRect();
        ui.cursorNaPlaca = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const a = ui.arrasto;
        const alvo = ligando() ? ima(p, a && a.tipo === 'ponta' ? a.id : null) : null;
        ui.cursor = alvo || { x: snap(p.x), y: snap(p.y) };
        return p;
    }

    function capturar(e) {
        svg.setPointerCapture(e.pointerId);
    }

    function aoPressionar(e) {
        if (e.button !== 0) return;
        const p = atualizarCursor(e);
        fecharProps();
        if (ui.modo === 'posicionar') { posicionar(ui.cursor); return; }
        if (ui.modo === 'fio') { cliqueFio(ui.cursor); return; }

        const alvoPonta = e.target.closest('[data-ponta]');
        if (alvoPonta) {
            ui.arrasto = { tipo: 'ponta', id: alvoPonta.dataset.fio, ponta: Number(alvoPonta.dataset.ponta), base: copiarFios(), moveu: false };
            atualizarCursor(e);
            capturar(e);
            return;
        }
        const alvoTerm = e.target.closest('[data-term]');
        if (alvoTerm && !e.shiftKey) {
            const t = terminais(acharComp(alvoTerm.dataset.comp)).find(k => k.nome === alvoTerm.dataset.term);
            comecarFio({ x: t.x, y: t.y });
            ui.arrasto = { tipo: 'fio-terminal', inicio: ui.fioInicio };
            capturar(e);
            render();
            return;
        }
        const alvoComp = e.target.closest('[data-comp]');
        const alvoFio = !alvoComp && e.target.closest('[data-fio]');
        if (alvoComp || alvoFio) {
            const tipo = alvoComp ? 'comp' : 'fio';
            const id = alvoComp ? alvoComp.dataset.comp : alvoFio.dataset.fio;
            if (alvoComp) {
                const agora = performance.now();
                if (!e.shiftKey && ui.ultimoToque.id === id && agora - ui.ultimoToque.t < 350) {
                    ui.ultimoToque = { id: null, t: 0 };
                    abrirProps(acharComp(id));
                    return;
                }
                ui.ultimoToque = { id, t: agora };
            }
            if (e.shiftKey) {
                alternarNaSelecao(tipo, id);
                render();
                return;
            }
            const jaSelecionado = ui.selecao[tipo === 'comp' ? 'comps' : 'fios'].has(id);
            if (jaSelecionado && tamanhoSel() > 1) {
                iniciarArrastoGrupo(p, { tipo, id });
            } else {
                selecionarSo(tipo, id);
                const f = alvoFio && acharFio(id);
                if (f && (horizontal(f) || vertical(f))) {
                    ui.arrasto = { tipo: 'trecho', id, x0: p.x, y0: p.y, d: 0, ehH: horizontal(f), base: copiarFios() };
                } else {
                    iniciarArrastoGrupo(p, null);
                }
            }
            capturar(e);
            render();
            return;
        }
        ui.arrasto = { tipo: 'caixa', x0: p.x, y0: p.y, x1: p.x, y1: p.y, somar: e.shiftKey };
        capturar(e);
    }

    function aoMover(e) {
        if (!svg) return;
        const a = ui.arrasto;
        if (ui.modo === 'selecionar' && !a) return;
        const antes = { ...ui.cursor, naPlaca: ui.cursorNaPlaca };
        const p = atualizarCursor(e);
        if (a && a.tipo === 'grupo') {
            const dx = snap(p.x - a.x0), dy = snap(p.y - a.y0);
            if (dx !== a.dx || dy !== a.dy) {
                a.dx = dx;
                a.dy = dy;
                a.moveu = true;
                moverGrupo(a, dx, dy);
                render();
            }
            return;
        }
        if (a && a.tipo === 'trecho') {
            const d = snap(a.ehH ? p.y - a.y0 : p.x - a.x0);
            if (d !== a.d) {
                a.d = d;
                a.moveu = true;
                moverTrecho(a, d);
                render();
            }
            return;
        }
        if (a && a.tipo === 'caixa') {
            a.x1 = p.x;
            a.y1 = p.y;
            renderSobreposicao();
            return;
        }
        const mexeu = antes.x !== ui.cursor.x || antes.y !== ui.cursor.y;
        if (a && a.tipo === 'ponta') {
            if (mexeu) {
                a.moveu = true;
                moverPonta(a);
                render();
            }
            return;
        }
        if (ui.fioInicio && ui.fioHv === null && !mesmoPonto(ui.cursor, ui.fioInicio)) {
            ui.fioHv = Math.abs(ui.cursor.x - ui.fioInicio.x) >= Math.abs(ui.cursor.y - ui.fioInicio.y);
        }
        if (mexeu || antes.naPlaca !== ui.cursorNaPlaca) renderSobreposicao();
    }

    function aoSoltar(e) {
        if (ui.arrastoPaleta) {
            ui.arrastoPaleta = false;
            atualizarCursor(e);
            if (ui.cursorNaPlaca && ui.fantasma) posicionar(ui.cursor);
            return;
        }
        const a = ui.arrasto;
        ui.arrasto = null;
        if (!a) return;
        if (a.tipo === 'grupo') {
            if (a.moveu) { fixarIdsTemp(); mudou(); }
            else if (a.reduzirA) { selecionarSo(a.reduzirA.tipo, a.reduzirA.id); render(); }
            return;
        }
        if (a.tipo === 'trecho') {
            if (a.moveu) { fixarIdsTemp(); mudou(); }
            return;
        }
        if (a.tipo === 'ponta') {
            if (a.moveu) mudou();
            else render();
            return;
        }
        if (a.tipo === 'caixa') {
            const r = retanguloCaixa(a);
            if (r.w < 4 && r.h < 4) {
                if (!a.somar) limparSelecao();
            } else {
                aplicarCaixa(a);
            }
            render();
            return;
        }
        if (a.tipo === 'fio-terminal') {
            const fim = ui.cursor;
            ui.voltarAoSelecionar = true;
            if (mesmoPonto(fim, a.inicio)) {
                ui.modo = 'fio';
                render();
                return;
            }
            terminarTrecho(a.inicio, fim, false);
        }
    }

    function placaVisivel() {
        const painel = $('painelPlaca');
        return !!painel && !painel.hidden;
    }

    function aoTeclar(e) {
        if (!placaVisivel() || e.altKey) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const k = e.key;
        if (e.ctrlKey || e.metaKey) {
            if ((k === 'a' || k === 'A') && ui.modo === 'selecionar' && !ui.arrasto) {
                e.preventDefault();
                selecionarTudo();
            }
            return;
        }
        if (k === 'Escape') {
            if (ui.modo === 'fio' && ui.fioInicio && !ui.voltarAoSelecionar) comecarFio(null);
            else if (ui.modo !== 'selecionar' || ui.fioInicio) cancelar();
            else limparSelecao();
            fecharProps();
            render();
        } else if (k === ' ' && ui.fioInicio) {
            e.preventDefault();
            ui.fioInverter = !ui.fioInverter;
            renderSobreposicao();
        } else if (k === 'r' || k === 'R') {
            e.preventDefault();
            girarAtual();
        } else if (k === 'Delete' || k === 'Backspace') {
            e.preventDefault();
            apagarSelecao();
        } else if (k === 'w' || k === 'W') {
            e.preventDefault();
            alternarFio();
        }
    }

    /* ---------- Paleta e barra de ferramentas ---------- */

    function iconePeca(tipo) {
        if (tipo === 'GND') {
            return `<svg class="placa-icone" viewBox="-20 -6 40 36" aria-hidden="true">${desenhoGnd(0, 0)}</svg>`;
        }
        if (quatroTerminais(tipo)) {
            return `<svg class="placa-icone placa-icone--quatro" viewBox="-44 -44 88 88" aria-hidden="true">${pernasQuatro(0, 0, 'H')}${simbolo({ tipo }, 0, 0, 'H', true)}</svg>`;
        }
        return `<svg class="placa-icone" viewBox="-42 -22 84 44" aria-hidden="true">${pernas(0, 0, 'H')}${simbolo({ tipo }, 0, 0, 'H', true)}</svg>`;
    }

    function montarPaleta() {
        document.querySelectorAll('.placa-peca').forEach(btn => {
            const tipo = btn.dataset.tipo;
            btn.insertAdjacentHTML('afterbegin', iconePeca(tipo));
            btn.addEventListener('pointerdown', e => {
                if (e.button !== 0) return;
                e.preventDefault();
                cancelar();
                limparSelecao();
                fecharProps();
                ui.modo = 'posicionar';
                ui.fantasma = { tipo, rot: 0 };
                ui.arrastoPaleta = true;
                ui.cursorNaPlaca = false;
                render();
            });
        });
        document.querySelectorAll('.placa-ferr').forEach(btn => {
            btn.addEventListener('click', () => {
                const acao = btn.dataset.acao;
                if (acao === 'fio') alternarFio();
                else if (acao === 'girar') girarAtual();
                else if (acao === 'apagar') apagarSelecao();
                else if (acao === 'limpar') {
                    if (!estado.comps.length && !estado.fios.length) return;
                    if (confirm('Apagar todos os componentes e fios da placa?')) limpar();
                }
            });
        });
        $('placaBtnResolver').addEventListener('click', resolver);
        $('placaBtnRefazerLista').addEventListener('click', sincronizarLista);
        $('placaBtnLimparPlaca').addEventListener('click', limparSemTocarLista);
    }

    /* ---------- Ligação com a lista de componentes ---------- */

    function sincronizarLista() {
        clearTimeout(timerSync);
        timerSync = null;
        const lista = $('listaComponentes');
        const { nosPorComp } = extrairNos(estado.comps, estado.fios);
        lista.innerHTML = '';
        idCounter = 1;
        estado.comps.forEach(c => {
            if (c.tipo === 'GND') return;
            add(c.tipo, c.nome, nosNetlist(c, nosPorComp.get(c.id)), ehFonte(c.tipo) ? c.valorDc : c.valor, c.alvo || null);
            const li = lista.lastElementChild;
            li.dataset.placaId = c.id;
            if (ehFonte(c.tipo)) {
                li.querySelector('.val-input-dc').value = c.valorDc;
                li.querySelector('.val-input-mod').value = c.modulo;
                li.querySelector('.val-input-fase').value = c.fase;
                const amp = li.querySelector('.val-input-amp');
                const alpha = li.querySelector('.val-input-alpha');
                const sel = li.querySelector('.val-input-laplace');
                if (amp) amp.value = c.amplitude || c.valorDc || '';
                if (alpha && c.laplaceAlpha != null) alpha.value = c.laplaceAlpha;
                if (sel && c.laplaceTipo) sel.value = c.laplaceTipo;
            }
            if (c.tipo === 'Capacitor' || c.tipo === 'Inductor') {
                const ic = li.querySelector('.val-input-ic');
                if (ic) ic.value = c.condicaoInicial != null ? c.condicaoInicial : '';
            }
            if (typeof ligarCamposDominioS === 'function') ligarCamposDominioS(li);
        });
        $('placaDessinc').hidden = true;
        atualizarVazia();
    }

    function assinaturaLista() {
        return JSON.stringify([...document.querySelectorAll('#listaComponentes .comp-item')]
            .filter(li => li.dataset.removing !== '1')
            .map(li => [
                li.dataset.tipo,
                (li.querySelector('.nome-comp')?.value || '').trim(),
                ...['.no-a', '.no-b', '.no-c', '.no-d'].map(s => String(li.querySelector(s)?.value ?? '').trim())
            ]));
    }

    function assinaturaPlaca() {
        const { nosPorComp } = extrairNos(estado.comps, estado.fios);
        return JSON.stringify(estado.comps.filter(c => c.tipo !== 'GND').map(c => {
            const ns = nosNetlist(c, nosPorComp.get(c.id));
            return [c.tipo, c.nome, String(ns[0]), String(ns[1]), ns.length > 2 ? String(ns[2]) : '', ns.length > 3 ? String(ns[3]) : ''];
        }));
    }

    /** Edições de nome/valor feitas na lista voltam para a placa. */
    function copiarDaLista(alvo) {
        const li = alvo.closest && alvo.closest('.comp-item[data-placa-id]');
        if (!li) return;
        const c = acharComp(li.dataset.placaId);
        if (!c) return;
        const v = alvo.value.trim();
        if (alvo.classList.contains('nome-comp')) c.nome = v;
        else if (alvo.classList.contains('val-input-dc')) c.valorDc = v;
        else if (alvo.classList.contains('val-input-mod')) c.modulo = v;
        else if (alvo.classList.contains('val-input-fase')) c.fase = v;
        else if (alvo.classList.contains('val-input-amp')) c.amplitude = v;
        else if (alvo.classList.contains('val-input-alpha')) c.laplaceAlpha = v;
        else if (alvo.classList.contains('val-input-laplace')) c.laplaceTipo = alvo.value || 'degrau';
        else if (alvo.classList.contains('val-input-ic')) c.condicaoInicial = v;
        else if (alvo.classList.contains('val-input')) c.valor = v;
        else if (alvo.classList.contains('alvo-comp')) c.alvo = v;
        else return;
        salvar();
        render();
    }

    function observarLista() {
        const lista = $('listaComponentes');
        let timer = null;
        const verificar = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                atualizarVazia();
                if (timerSync || !estado.comps.length) return;
                $('placaDessinc').hidden = assinaturaLista() === assinaturaPlaca();
            }, 200);
        };
        new MutationObserver(verificar).observe(lista, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-removing'] });
        lista.addEventListener('input', e => { copiarDaLista(e.target); verificar(); });
        lista.addEventListener('change', e => { copiarDaLista(e.target); verificar(); });
    }

    function resolver() {
        fecharProps();
        const analise = extrairNos(estado.comps, estado.fios);
        const { erros } = diagnosticar(estado.comps, analise);
        const box = $('placaErros');
        if (erros.length) {
            box.innerHTML = '<strong>Antes de resolver:</strong><ul>' + erros.map(m => `<li>${escapeXml(m)}</li>`).join('') + '</ul>';
            box.hidden = false;
            return;
        }
        box.hidden = true;
        sincronizarLista();
        calcular();
    }

    /* ---------- Persistência ---------- */

    function salvar() {
        try {
            if (!estado.comps.length && !estado.fios.length) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, JSON.stringify({ versao: VERSAO, ...estado }));
        } catch (e) { /* armazenamento indisponível */ }
    }

    function carregar() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!d || d.versao !== VERSAO || !Array.isArray(d.comps) || !Array.isArray(d.fios)) return false;
            estado.comps = d.comps;
            estado.seq = d.seq || 1;
            estado.fios = normalizarFios(d.fios, novoId);
            return estado.comps.length > 0;
        } catch (e) {
            return false;
        }
    }

    /* ---------- Inicialização ---------- */

    function iniciar() {
        wrap = $('placaWrap');
        if (!wrap) return;
        wrap.insertAdjacentHTML('afterbegin', `
            <svg id="placaSvg" class="placa-svg" xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}" role="application" aria-label="Placa de montagem do circuito">
                <defs>
                    <pattern id="placa-grade" width="${GRID}" height="${GRID}" x="${-GRID / 2}" y="${-GRID / 2}" patternUnits="userSpaceOnUse">
                        <circle class="placa-ponto" cx="${GRID / 2}" cy="${GRID / 2}" r="1.2"/>
                    </pattern>
                    <marker id="placa-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="var(--esq-stroke)"/>
                    </marker>
                </defs>
                <rect width="${LARGURA}" height="${ALTURA}" fill="url(#placa-grade)"/>
                <g id="placaConteudo"></g>
                <g id="placaSobreposicao" class="placa-sobreposicao"></g>
            </svg>`);
        svg = $('placaSvg');
        conteudo = $('placaConteudo');
        sobreposicao = $('placaSobreposicao');

        montarPaleta();
        svg.addEventListener('pointerdown', aoPressionar);
        svg.addEventListener('contextmenu', e => {
            e.preventDefault();
            cancelar();
            render();
        });
        svg.addEventListener('pointerleave', () => {
            if (ui.modo !== 'selecionar' && !ui.arrasto) {
                ui.cursorNaPlaca = false;
                renderSobreposicao();
            }
        });
        document.addEventListener('pointermove', aoMover);
        document.addEventListener('pointerup', aoSoltar);
        document.addEventListener('keydown', aoTeclar);
        const toggleAc = $('toggleModoAc');
        if (toggleAc) toggleAc.addEventListener('change', () => { fecharProps(); render(); });
        observarLista();

        if (carregar()) {
            sincronizarLista();
            escondeBannerRestauracao();
        }
        render();
    }

    function aoMudarModo() {
        if (!svg) return;
        fecharProps();
        render();
    }

    window.Placa = { limpar, sincronizarLista, aoMudarModo };
    document.addEventListener('DOMContentLoaded', iniciar);
})();
