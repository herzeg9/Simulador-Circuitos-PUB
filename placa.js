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
        GND:           { titulo: 'Terra (GND)',       padrao: '' }
    };

    const ehFonte = tipo => tipo === 'VoltageSource' || tipo === 'CurrentSource';

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
     * Terminais de um componente. "A" é o primeiro nó da netlist
     * (+ da fonte de tensão, ponta da seta da fonte de corrente).
     */
    function terminais(comp) {
        if (comp.tipo === 'GND') return [{ nome: 'A', x: comp.x, y: comp.y }];
        const [ax, ay] = girar(-MEIO, 0, comp.rot);
        const [bx, by] = girar(MEIO, 0, comp.rot);
        return [
            { nome: 'A', x: comp.x + ax, y: comp.y + ay },
            { nome: 'B', x: comp.x + bx, y: comp.y + by }
        ];
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
            if (n && n.A === n.B) {
                if (c.tipo === 'VoltageSource') erros.push(`${c.nome} está em curto (os dois terminais no mesmo nó).`);
                else avisos.push(`${c.nome} está em curto (os dois terminais no mesmo nó).`);
            }
        });
        const soltosPorComp = new Set(analise.soltos.filter(s => s.comp.tipo !== 'GND').map(s => s.comp.nome));
        soltosPorComp.forEach(nome => avisos.push(`${nome} tem terminal solto (marcado em vermelho).`));
        return { erros, avisos };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { terminais, segmentos, extrairNos, juncoes, diagnosticar };
    }
    if (typeof document === 'undefined') return;

    /* ---------- Estado ---------- */

    const estado = { comps: [], fios: [], seq: 1 };
    const ui = {
        modo: 'selecionar',
        selecao: null,
        fantasma: null,
        fioInicio: null,
        voltarAoSelecionar: false,
        cursor: { x: 0, y: 0 },
        cursorNaPlaca: false,
        arrasto: null,
        arrastoPaleta: false,
        ultimoToque: { id: null, t: 0 }
    };
    let svg, conteudo, sobreposicao, wrap;
    let timerSync = null;

    const snap = v => Math.round(v / GRID) * GRID;
    const $ = id => document.getElementById(id);
    const acharComp = id => estado.comps.find(c => c.id === id);
    const novoId = () => 'p' + (estado.seq++);

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
        const padrao = PECAS[tipo].padrao;
        c.nome = proximoNome(tipo);
        if (ehFonte(tipo)) {
            c.valorDc = padrao;
            c.modulo = padrao;
            c.fase = '0';
        } else {
            c.valor = padrao;
        }
        return c;
    }

    function valorExibido(c) {
        if (!ehFonte(c.tipo)) return c.valor;
        if (getModoSimulacao() === 'AC') {
            const f = String(c.fase || '0').trim();
            return f && f !== '0' ? `${c.modulo}∠${f}°` : c.modulo;
        }
        return c.valorDc;
    }

    /* ---------- Desenho ---------- */

    const trocarSeta = s => s.replace(/url\(#esq-arrow-curr\)/g, 'url(#placa-seta)');

    function simbolo(c, x, y, orient, aPrimeiro) {
        return trocarSeta(drawSimbolo({
            tipo: c.tipo,
            nome: c.nome || '',
            valor: c.nome ? valorExibido(c) : '',
            _positiveOnA: aPrimeiro,
            _fromAtoB: aPrimeiro
        }, x, y, orient));
    }

    function pernas(x, y, orient) {
        const h = ESQ.BODY / 2;
        return orient === 'H'
            ? `<line class="placa-perna" x1="${x - MEIO}" y1="${y}" x2="${x - h}" y2="${y}"/><line class="placa-perna" x1="${x + h}" y1="${y}" x2="${x + MEIO}" y2="${y}"/>`
            : `<line class="placa-perna" x1="${x}" y1="${y - MEIO}" x2="${x}" y2="${y - h}"/><line class="placa-perna" x1="${x}" y1="${y + h}" x2="${x}" y2="${y + MEIO}"/>`;
    }

    function desenhoGnd(x, y) {
        return `<line class="placa-perna" x1="${x}" y1="${y}" x2="${x}" y2="${y + 12}"/>
            <line class="placa-gnd" x1="${x - 14}" y1="${y + 12}" x2="${x + 14}" y2="${y + 12}"/>
            <line class="placa-gnd" x1="${x - 9}" y1="${y + 18}" x2="${x + 9}" y2="${y + 18}"/>
            <line class="placa-gnd" x1="${x - 4}" y1="${y + 24}" x2="${x + 4}" y2="${y + 24}"/>`;
    }

    function svgComp(c, opts) {
        const cls = ['placa-comp'];
        if (opts.fantasma) cls.push('is-fantasma');
        if (opts.selecionado) cls.push('is-selecionado');
        const termsSvg = terminais(c).map(t => {
            const solto = opts.soltos && opts.soltos.has(`${c.id}:${t.nome}`);
            return `<circle class="placa-term${solto ? ' is-solto' : ''}" cx="${t.x}" cy="${t.y}" r="5" data-comp="${c.id}" data-term="${t.nome}"/>`;
        }).join('');

        let caixa, corpo;
        if (c.tipo === 'GND') {
            caixa = { x: c.x - 16, y: c.y - 4, w: 32, h: 32 };
            corpo = desenhoGnd(c.x, c.y);
        } else {
            const orient = (c.rot === 90 || c.rot === 270) ? 'V' : 'H';
            const aPrimeiro = c.rot === 0 || c.rot === 90;
            caixa = orient === 'H'
                ? { x: c.x - MEIO, y: c.y - 20, w: 2 * MEIO, h: 40 }
                : { x: c.x - 20, y: c.y - MEIO, w: 40, h: 2 * MEIO };
            corpo = pernas(c.x, c.y, orient) + simbolo(c, c.x, c.y, orient, aPrimeiro);
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
        return `<g class="placa-fio${selecionado ? ' is-selecionado' : ''}" data-fio="${f.id}">
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

    const orientarFio = (a, b) => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);

    function render() {
        const analise = extrairNos(estado.comps, estado.fios);
        const soltos = new Set(analise.soltos.map(({ comp, term }) => `${comp.id}:${term.nome}`));
        const sel = ui.selecao;
        let html = estado.fios.map(f => svgFio(f, !!sel && sel.tipo === 'fio' && sel.id === f.id)).join('');
        html += estado.comps.map(c => svgComp(c, { selecionado: !!sel && sel.tipo === 'comp' && sel.id === c.id, soltos })).join('');
        html += juncoes(estado.comps, estado.fios).map(j => `<circle class="placa-juncao" cx="${j.x}" cy="${j.y}" r="4"/>`).join('');
        html += svgRotulosNos(analise.grupos);

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
        if (ui.fioInicio && ui.cursorNaPlaca) {
            const previa = { x1: ui.fioInicio.x, y1: ui.fioInicio.y, x2: ui.cursor.x, y2: ui.cursor.y, hv: orientarFio(ui.fioInicio, ui.cursor) };
            html += `<path class="placa-fio-previa" d="${caminhoFio(previa)}"/>`;
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
        const comp = ui.selecao && ui.selecao.tipo === 'comp' ? acharComp(ui.selecao.id) : null;
        const btnGirar = document.querySelector('.placa-ferr[data-acao="girar"]');
        if (btnGirar) btnGirar.disabled = !(ui.modo === 'posicionar' || (comp && comp.tipo !== 'GND'));
        const btnApagar = document.querySelector('.placa-ferr[data-acao="apagar"]');
        if (btnApagar) btnApagar.disabled = !ui.selecao;
    }

    /* ---------- Edição ---------- */

    function mudou() {
        render();
        salvar();
        clearTimeout(timerSync);
        timerSync = setTimeout(sincronizarLista, 150);
    }

    function cancelar() {
        ui.modo = 'selecionar';
        ui.fantasma = null;
        ui.fioInicio = null;
        ui.voltarAoSelecionar = false;
        ui.arrasto = null;
        ui.arrastoPaleta = false;
    }

    function posicionar(p) {
        const c = montarComp(ui.fantasma.tipo, p.x, p.y, ui.fantasma.rot, novoId());
        estado.comps.push(c);
        cancelar();
        ui.selecao = { tipo: 'comp', id: c.id };
        mudou();
    }

    function pontoConectavel(p, ignorar) {
        if (estado.comps.some(c => terminais(c).some(t => t.x === p.x && t.y === p.y))) return true;
        return estado.fios.some(f => f !== ignorar && noFio(p, f));
    }

    function criarFio(a, b) {
        const f = { id: novoId(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, hv: orientarFio(a, b) };
        estado.fios.push(f);
        return f;
    }

    /** Termina um trecho de fio; se a ponta não encostou em nada, o traçado continua dali. */
    function terminarTrecho(inicio, fim) {
        const f = criarFio(inicio, fim);
        if (pontoConectavel(fim, f)) {
            ui.fioInicio = null;
            if (ui.voltarAoSelecionar) cancelar();
        } else {
            ui.modo = 'fio';
            ui.fioInicio = fim;
        }
        mudou();
    }

    function cliqueFio(p) {
        if (!ui.fioInicio) {
            ui.fioInicio = p;
            render();
            return;
        }
        if (p.x === ui.fioInicio.x && p.y === ui.fioInicio.y) return;
        terminarTrecho(ui.fioInicio, p);
    }

    function fiosPresos(c) {
        const presos = [];
        terminais(c).forEach(t => estado.fios.forEach(f => {
            if (f.x1 === t.x && f.y1 === t.y) presos.push({ fio: f, ponta: 1, term: t.nome });
            if (f.x2 === t.x && f.y2 === t.y) presos.push({ fio: f, ponta: 2, term: t.nome });
        }));
        return presos;
    }

    function arrastarPresos(c, presos) {
        const pos = {};
        terminais(c).forEach(t => { pos[t.nome] = t; });
        presos.forEach(({ fio, ponta, term }) => {
            if (ponta === 1) { fio.x1 = pos[term].x; fio.y1 = pos[term].y; }
            else { fio.x2 = pos[term].x; fio.y2 = pos[term].y; }
        });
    }

    function girarAtual() {
        if (ui.modo === 'posicionar' && ui.fantasma) {
            ui.fantasma.rot = (ui.fantasma.rot + 90) % 360;
            render();
            return;
        }
        const c = ui.selecao && ui.selecao.tipo === 'comp' ? acharComp(ui.selecao.id) : null;
        if (!c || c.tipo === 'GND') return;
        const presos = fiosPresos(c);
        c.rot = (c.rot + 90) % 360;
        arrastarPresos(c, presos);
        mudou();
    }

    function apagarSelecao() {
        const sel = ui.selecao;
        if (!sel) return;
        if (sel.tipo === 'comp') estado.comps = estado.comps.filter(c => c.id !== sel.id);
        else estado.fios = estado.fios.filter(f => f.id !== sel.id);
        ui.selecao = null;
        fecharProps();
        mudou();
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
        ui.selecao = null;
        fecharProps();
        mudou();
    }

    function limparSemTocarLista() {
        estado.comps = [];
        estado.fios = [];
        cancelar();
        ui.selecao = null;
        fecharProps();
        clearTimeout(timerSync);
        timerSync = null;
        salvar();
        render();
        $('placaDessinc').hidden = true;
    }

    /* ---------- Propriedades do componente ---------- */

    function campoProp(rotulo, chave, valor) {
        return `<label class="placa-props-campo"><span>${rotulo}</span><input type="text" name="${chave}" value="${escapeAttr(valor)}" autocomplete="off" spellcheck="false"></label>`;
    }

    function abrirProps(c) {
        if (c.tipo === 'GND') return;
        const box = $('placaProps');
        const ac = getModoSimulacao() === 'AC';
        let campos, nota;
        if (ehFonte(c.tipo)) {
            campos = ac
                ? campoProp('Módulo', 'modulo', c.modulo) + campoProp('Fase (°)', 'fase', c.fase)
                : campoProp('Valor', 'valorDc', c.valorDc);
            nota = ac
                ? 'Modo AC. O módulo também aceita a forma a+jb.'
                : 'Modo DC. Módulo e fase são editados no modo AC.';
        } else {
            campos = campoProp('Valor', 'valor', c.valor);
            nota = 'Sufixos: k, M, m, u, n, p (M = mega, m = mili).';
        }
        box.innerHTML = `<form class="placa-props-form">
            <div class="placa-props-titulo">${PECAS[c.tipo].titulo}</div>
            ${campoProp('Nome', 'nome', c.nome)}
            ${campos}
            <p class="placa-props-nota">${nota}</p>
            <p class="placa-props-erro" hidden></p>
            <div class="placa-props-botoes">
                <button type="button" class="placa-props-cancelar">Cancelar</button>
                <button type="submit" class="placa-props-ok">OK</button>
            </div>
        </form>`;
        box.style.left = Math.min(c.x + 52, LARGURA - 250) + 'px';
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
        for (const chave of ['valor', 'valorDc', 'modulo', 'fase']) {
            if (!dados.has(chave)) continue;
            const v = String(dados.get(chave)).trim();
            if (!v) return 'Preencha todos os valores.';
            novos[chave] = v;
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
        ui.cursor = { x: snap(p.x), y: snap(p.y) };
        return p;
    }

    function aoPressionar(e) {
        if (e.button !== 0) return;
        const p = atualizarCursor(e);
        fecharProps();
        if (ui.modo === 'posicionar') { posicionar(ui.cursor); return; }
        if (ui.modo === 'fio') { cliqueFio(ui.cursor); return; }

        const alvoTerm = e.target.closest('[data-term]');
        if (alvoTerm) {
            const t = terminais(acharComp(alvoTerm.dataset.comp)).find(k => k.nome === alvoTerm.dataset.term);
            ui.fioInicio = { x: t.x, y: t.y };
            ui.arrasto = { tipo: 'fio-terminal', inicio: ui.fioInicio };
            svg.setPointerCapture(e.pointerId);
            render();
            return;
        }
        const alvoComp = e.target.closest('[data-comp]');
        if (alvoComp) {
            const c = acharComp(alvoComp.dataset.comp);
            const agora = performance.now();
            if (ui.ultimoToque.id === c.id && agora - ui.ultimoToque.t < 350) {
                ui.ultimoToque = { id: null, t: 0 };
                abrirProps(c);
                return;
            }
            ui.ultimoToque = { id: c.id, t: agora };
            ui.selecao = { tipo: 'comp', id: c.id };
            ui.arrasto = { tipo: 'mover', comp: c, x0: p.x, y0: p.y, cx0: c.x, cy0: c.y, presos: fiosPresos(c), moveu: false };
            svg.setPointerCapture(e.pointerId);
            render();
            return;
        }
        const alvoFio = e.target.closest('[data-fio]');
        ui.selecao = alvoFio ? { tipo: 'fio', id: alvoFio.dataset.fio } : null;
        render();
    }

    function aoMover(e) {
        if (!svg) return;
        const a = ui.arrasto;
        if (ui.modo === 'selecionar' && !a) return;
        const antes = { ...ui.cursor, naPlaca: ui.cursorNaPlaca };
        const p = atualizarCursor(e);
        if (a && a.tipo === 'mover') {
            const nx = snap(a.cx0 + (p.x - a.x0));
            const ny = snap(a.cy0 + (p.y - a.y0));
            if (nx !== a.comp.x || ny !== a.comp.y) {
                a.comp.x = nx;
                a.comp.y = ny;
                a.moveu = true;
                arrastarPresos(a.comp, a.presos);
                render();
            }
            return;
        }
        if (antes.x !== ui.cursor.x || antes.y !== ui.cursor.y || antes.naPlaca !== ui.cursorNaPlaca) {
            renderSobreposicao();
        }
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
        if (a.tipo === 'mover') {
            if (a.moveu) mudou();
            return;
        }
        if (a.tipo === 'fio-terminal') {
            const fim = ui.cursor;
            ui.voltarAoSelecionar = true;
            if (fim.x === a.inicio.x && fim.y === a.inicio.y) {
                ui.modo = 'fio';
                render();
                return;
            }
            terminarTrecho(a.inicio, fim);
        }
    }

    function placaVisivel() {
        const painel = $('painelPlaca');
        return !!painel && !painel.hidden;
    }

    function aoTeclar(e) {
        if (!placaVisivel() || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const k = e.key;
        if (k === 'Escape') {
            if (ui.modo === 'fio' && ui.fioInicio && !ui.voltarAoSelecionar) ui.fioInicio = null;
            else cancelar();
            fecharProps();
            render();
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
                ui.selecao = null;
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
            const nos = nosPorComp.get(c.id);
            add(c.tipo, c.nome, [nos.A, nos.B], ehFonte(c.tipo) ? c.valorDc : c.valor);
            const li = lista.lastElementChild;
            li.dataset.placaId = c.id;
            if (ehFonte(c.tipo)) {
                li.querySelector('.val-input-dc').value = c.valorDc;
                li.querySelector('.val-input-mod').value = c.modulo;
                li.querySelector('.val-input-fase').value = c.fase;
            }
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
            const n = nosPorComp.get(c.id);
            return [c.tipo, c.nome, String(n.A), String(n.B), '', ''];
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
        else if (alvo.classList.contains('val-input')) c.valor = v;
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
        lista.addEventListener('change', verificar);
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
            estado.fios = d.fios;
            estado.seq = d.seq || 1;
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

    window.Placa = { limpar, sincronizarLista };
    document.addEventListener('DOMContentLoaded', iniciar);
})();
