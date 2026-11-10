// The Model page for this event. The maths is in model.js; the shared look and controls are in kit/v1.
const getJson = (u) => fetch(u, { cache: 'no-cache' }).then((r) => r.json());
Promise.all([getJson('inputs.json'), fetch('market.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null)]).then(([cfg, market]) => {
  const M = window.ForecastModel.fromConfig(cfg);
  const { pct, pctFine } = EN.fmt;
  const DAY = 86400000;
  const YEAR = 365.25 * DAY;
  const fmtDate = d3.utcFormat('%b %-d, %Y');
  const fmtMonth = d3.utcFormat('%b %Y');
  const TERM_END = fmtDate(new Date(M.TERM_END));

  // footnote marker for a source in the page's Sources list (same order as the list in index.html)
  const ORDER = ['mars', 'china', 'files', 'terms'];
  const fn = (k) => { const n = ORDER.indexOf(k) + 1; return `<sup class="fn"><a href="#s${n}">${n}</a></sup>`; };

  const PATHS = [
    { key: 'sci', cls: 's-sci', name: 'Science' },
    { key: 'dis', cls: 's-dis', name: 'Disclosure' },
    { key: 'rem', cls: 's-rem', name: 'Remark' },
  ];
  // pct: shown as a percentage. key matches M.DEFAULTS. why(v) is the reasoning; it may use the live central value.
  const INPUTS = [
    { key: 'L', path: 'sci', label: 'Life exists and can be found, eventually', pct: true, step: 1,
      why: () => 'A naive start is 50-50. I think it is better than that. Existing and being findable are one number, to avoid double counting.' },
    { key: 'T0', path: 'sci', label: 'Steepest point of the logistic curve', unit: 'yrs', step: 0.5, max: 40, sliderMax: 30,
      why: (v) => `${fmtMonth(new Date(M.TODAY + v * YEAR))}. A lot can happen in ten years. Near term, the Mars sample has no way back to Earth,${fn('mars')} China's lands around 2031,${fn('china')} and direct contact or a visit seems exceedingly unlikely.` },
    { key: 'K', path: 'sci', label: 'Steepness of the logistic curve', step: 0.02, max: 5, sliderMin: 0.1, sliderMax: 1.5 },
    { key: 'C', path: 'sci', label: 'A find becomes a definitive U.S. statement', pct: true, step: 1,
      why: () => 'A concrete find would be announced, even before peer review.' },
    { key: 'P_SECRET', path: 'dis', label: 'The U.S. government already holds proof', pct: true, step: 0.5, sliderMax: 20,
      why: () => `Low single digits, not zero. Nothing in the released files confirms anything.${fn('files')}` },
    { key: 'P_DISCLOSE', path: 'dis', label: 'The Trump administration confirms it before its term ends, given it exists', pct: true, step: 5,
      why: () => `Less likely than not. If proof existed, why has it not been released already? Open question. Accrues at a constant rate to ${TERM_END}; nothing after.` },
    { key: 'P_REMARK', path: 'rem', label: `An official says it without proof and it counts, by ${TERM_END}`, pct: true, step: 0.5, sliderMax: 10,
      why: () => `A tail risk. The exchange would have to count it without proof.${fn('terms')}` },
  ];
  const CASES = ['central', 'low case', 'high case']; // index order in M.DEFAULTS

  const clone = (o) => JSON.parse(JSON.stringify(o));
  let params = clone(M.DEFAULTS);
  let end = 0;      // right edge of the chart
  let rows = [];    // curve points up to `end`
  let sel = M.MARKET_DATES[M.MARKET_DATES.length - 1]; // the date the sentence describes
  let concept = null;
  let versus = null;

  // ---------- inputs ----------
  const fields = {};
  const hows = {};
  const root = document.getElementById('inputs');
  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; if (parent) parent.appendChild(n); return n; };
  const shown = (inp, v) => (inp.pct ? v * 100 : v);
  const stored = (inp, v) => (inp.pct ? v / 100 : v);
  // An input whose low and high cases start equal to its central value has no range:
  // it shows one number, and all three cases move together.
  const tied = (inp) => { const d = M.DEFAULTS[inp.key]; return d[0] === d[1] && d[0] === d[2]; };

  PATHS.forEach((path) => {
    const group = el('section', `group ${path.cls}`, root);
    el('h3', '', group, path.name);
    hows[path.key] = el('p', 'how', group);
    INPUTS.filter((inp) => inp.path === path.key).forEach((inp) => {
      const row = el('div', 'field', group);
      el('div', 'name', row, inp.label);
      const base = { min: 0, max: inp.pct ? 100 : inp.max, step: inp.step, unit: inp.pct ? '%' : inp.unit };
      const one = tied(inp);
      const set = (i) => (v) => {
        if (one) params[inp.key] = [0, 1, 2].map(() => stored(inp, v));
        else params[inp.key][i] = stored(inp, v);
        changed();
      };
      const central = EN.sliderField({ ...base, value: shown(inp, params[inp.key][0]), sliderMin: inp.sliderMin, sliderMax: inp.sliderMax, label: `${inp.label}, central`, onChange: set(0) });
      row.appendChild(central.range);
      central.box.el.classList.add('central');
      row.appendChild(central.box.el);
      const cases = el('div', 'cases', row);
      const boxes = [central.box];
      if (!one) {
        [1, 2].forEach((i) => {
          const b = EN.numberBox({ ...base, value: shown(inp, params[inp.key][i]), label: `${inp.label}, ${CASES[i]}`, onChange: set(i) });
          const lab = el('span', 'case-label', null, i === 1 ? 'Low case' : 'High case');
          b.el.insertBefore(lab, b.el.firstChild);
          cases.appendChild(b.el);
          boxes[i] = b;
        });
      }
      fields[inp.key] = { inp, central, boxes, why: inp.why ? el('p', 'why', row) : null };
    });
  });

  function syncInputs() {
    let any = false;
    INPUTS.forEach((inp) => {
      const f = fields[inp.key], p = params[inp.key];
      f.central.set(shown(inp, p[0]));
      f.central.setBand(shown(inp, p[1]), shown(inp, p[2]));
      f.boxes.forEach((b, i) => {
        if (i) b.set(shown(inp, p[i]));
        b.input.classList.toggle('changed', Math.abs(p[i] - M.DEFAULTS[inp.key][i]) > 1e-12);
      });
      any = any || p.some((v, i) => Math.abs(v - M.DEFAULTS[inp.key][i]) > 1e-12);
      if (f.why) {
        const why = inp.why(Math.round(shown(inp, p[0]) * 1000) / 1000);
        if (f.lastWhy !== why) { f.why.innerHTML = why; f.lastWhy = why; }
      }
    });
    resetBtn.disabled = !any;
  }

  const resetBtn = document.getElementById('reset');
  resetBtn.textContent = `Reset to ${M.AS_OF} values`;
  resetBtn.addEventListener('click', () => { params = clone(M.DEFAULTS); changed(); });
  document.querySelectorAll('input[name="horizon"]').forEach((r) => r.addEventListener('change', changed));

  // ---------- chart ----------
  // The three paths are drawn stacked, so their heights add up to the chance of Yes.
  // (The exact total is a little less than the plain sum, so each layer is scaled by total / sum.)
  const LAYERS = [
    { key: 'sci', name: 'Science', tone: 'var(--s1)' },
    { key: 'dis', name: 'Disclosure', tone: 'var(--s2)' },
    { key: 'rem', name: 'Remark', tone: 'var(--s3)' },
  ];
  const stack = (r) => {
    const sum = r.sci + r.dis + r.rem;
    const f = sum > 0 ? r.total / sum : 0;
    const a = r.sci * f, b = a + r.dis * f;
    return { sci: [0, a], dis: [a, b], rem: [b, r.total] };
  };
  const box = document.getElementById('chart');
  let G = null;               // the chart's persistent pieces, rebuilt only on resize
  let x = null, y = null;

  const nearest = (t) => rows.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  const rowAt = (t) => rows.find((r) => r.t === t) || nearest(t);

  EN.chart.frame(box, (w) => Math.max(260, Math.min(430, w * 0.56)), ({ svg, width, height }) => {
    const wide = width > 640;
    const m = { t: 30, r: wide ? 112 : 10, b: 30, l: 46 };
    svg.selectAll('*').remove();
    svg.attr('aria-label', 'Chance of Yes before each date, in total and by path');
    G = { width, height, m, wide };
    G.grid = svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`);
    G.yAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`);
    G.xAxis = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.b})`);
    G.term = svg.append('g');
    G.term.append('line').attr('y1', m.t).attr('y2', height - m.b).attr('stroke', 'var(--ink-faint)').attr('stroke-dasharray', '2 4');
    G.term.append('text').attr('class', 'note').attr('y', m.t + 12).attr('x', -6).attr('text-anchor', 'end').text('End of term');
    G.band = svg.append('path').attr('fill', 'var(--band)');
    G.edges = svg.append('g').attr('fill', 'none').attr('stroke-width', 1.5);
    LAYERS.slice(0, 2).forEach((l) => G.edges.append('path').attr('data-k', l.key).attr('stroke', l.tone));
    G.total = svg.append('path').attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2.75).attr('stroke-linejoin', 'round');
    G.dots = svg.append('g');
    G.labels = svg.append('g');

    // drag anywhere on the plot to pick a date
    G.hit = svg.append('rect').attr('class', 'plot-hit').attr('x', m.l).attr('y', 0).attr('width', width - m.l - m.r).attr('height', height - m.b)
      .attr('fill', 'transparent').attr('tabindex', 0).attr('role', 'slider').attr('aria-label', 'Date');
    G.cursor = svg.append('g').attr('class', 'cursor').attr('pointer-events', 'none');
    G.cursor.append('line').attr('y1', m.t - 6).attr('y2', height - m.b).attr('stroke', 'var(--ink-soft)');
    G.cursor.append('circle').attr('class', 'grip').attr('cy', m.t - 6).attr('r', 5).attr('fill', 'var(--ink)').attr('stroke', 'var(--bg)').attr('stroke-width', 2);
    G.cursorText = G.cursor.append('text').attr('class', 'note').attr('y', m.t - 16).style('fill', 'var(--ink)');
    G.marks = G.cursor.append('g');

    // drag the steepest point of the logistic curve, when it is in view
    G.t0 = svg.append('g');
    G.t0Text = G.t0.append('text').attr('class', 'note').text('Steepest point');
    G.t0Dot = G.t0.append('circle').attr('class', 't0').attr('r', 7).attr('fill', 'var(--s1)').attr('stroke', 'var(--bg)').attr('stroke-width', 2)
      .attr('tabindex', 0).attr('role', 'slider').attr('aria-label', 'Steepest point of the logistic curve, years from start');

    const px = (e) => e.clientX - box.getBoundingClientRect().left;
    const drag = (node, onMove) => {
      node.addEventListener('pointerdown', (e) => { node.setPointerCapture(e.pointerId); onMove(px(e)); e.preventDefault(); node.focus({ preventScroll: true }); });
      node.addEventListener('pointermove', (e) => { if (node.hasPointerCapture(e.pointerId)) onMove(px(e)); });
    };
    drag(G.hit.node(), (p) => { sel = nearest(+x.invert(p)).t; paint(); });
    drag(G.t0Dot.node(), (p) => setT0((+x.invert(p) - M.TODAY) / YEAR));
    G.hit.on('keydown', (e) => {
      const i = rows.findIndex((r) => r.t === sel);
      const j = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: rows.length - 1 }[e.key];
      if (j == null) return;
      e.preventDefault();
      sel = rows[Math.max(0, Math.min(rows.length - 1, j))].t;
      paint();
    });
    G.t0Dot.on('keydown', (e) => {
      const d = { ArrowLeft: -0.5, ArrowRight: 0.5 }[e.key];
      if (!d) return;
      e.preventDefault();
      setT0(params.T0[0] + d);
    });
    paint();
  });

  function setT0(years) {
    const v = Math.max(0.5, Math.min(40, Math.round(years * 2) / 2));
    if (v === params.T0[0]) return;
    params.T0[0] = v;
    changed();
  }

  // Recompute the curve, then repaint. Called when an input or the chart's end date changes.
  function changed() {
    const [hy, hm, hd] = document.querySelector('input[name="horizon"]:checked').value.split('-').map(Number);
    end = M.d(hy, hm, hd);
    rows = [{ t: M.TODAY, sci: 0, dis: 0, rem: 0, total: 0, low: 0, high: 0 }].concat(M.curve(params, end));
    sel = nearest(Math.min(sel, end)).t;
    syncInputs();
    paint();
    if (concept) concept.redraw();
    if (versus) versus.redraw();
  }

  function paint() {
    if (!G || !rows.length) return;
    const { width, height, m, wide } = G;
    const top = Math.max(...rows.map((r) => Math.max(r.high, r.total, r.low)), 0.001);
    x = d3.scaleUtc([M.TODAY, end], [m.l, width - m.r]);
    y = d3.scaleLinear([0, top * 1.06], [height - m.b, m.t]).nice(5);
    const yMax = y.domain()[1];
    const yFmt = (v) => (v * 100).toFixed(yMax < 0.05 ? 1 : 0) + '%';
    const years = (end - M.TODAY) / YEAR;
    const every = Math.max(1, Math.ceil(years / ((width - m.l - m.r) / 64)));

    G.grid.call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.l - m.r)).tickFormat(''));
    G.yAxis.call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(8).tickFormat(yFmt)).call((g) => g.select('.domain').remove());
    G.xAxis.call(d3.axisBottom(x).ticks(d3.utcYear.every(every)).tickSize(5).tickPadding(6).tickFormat(d3.utcFormat('%Y')));

    G.term.attr('display', M.TERM_END <= end ? null : 'none').attr('transform', `translate(${x(M.TERM_END)},0)`);
    const st = rows.map(stack);
    LAYERS.slice(0, 2).forEach((l) => G.edges.select(`[data-k="${l.key}"]`).attr('d', d3.line().x((r) => x(r.t)).y((r, i) => y(st[i][l.key][1]))(rows)));
    G.band.attr('d', d3.area().x((r) => x(r.t)).y0((r) => y(r.low)).y1((r) => y(r.high))(rows));
    G.total.attr('d', d3.line().x((r) => x(r.t)).y((r) => y(r.total))(rows));

    // the market's dates
    G.dots.selectAll('circle').data(M.MARKET_DATES.filter((t) => t <= end)).join('circle')
      .attr('r', 4).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)').attr('stroke-width', 2)
      .attr('cx', (t) => x(t)).attr('cy', (t) => y(rowAt(t).total));

    // names at the line ends (wide screens; narrow screens use the key above the chart)
    const last = rows[rows.length - 1], lastSt = st[st.length - 1];
    const ends = wide ? EN.chart.dodge(
      [{ key: 'total', name: 'Chance of Yes', tone: 'var(--ink)', y: y(last.total) - 9 }]
        .concat(LAYERS.map((l) => ({ ...l, y: y((lastSt[l.key][0] + lastSt[l.key][1]) / 2) }))), 18, m.t, height - m.b + 4) : [];
    G.labels.selectAll('text').data(ends, (d) => d.key).join('text')
      .attr('class', 'end-label').attr('x', width - m.r + 10).attr('dy', '0.35em')
      .attr('y', (d) => d.ly).style('fill', (d) => d.tone).text((d) => d.name);

    // the chosen date
    const r = rowAt(sel);
    const cx = x(r.t);
    G.cursor.attr('transform', `translate(${cx},0)`);
    const half = 48;
    G.cursorText.text(fmtDate(new Date(r.t)))
      .attr('text-anchor', cx - half < m.l ? 'start' : cx + half > width ? 'end' : 'middle')
      .attr('x', cx - half < m.l ? -6 : cx + half > width ? 6 : 0);
    G.marks.selectAll('circle').data([r]).join('circle').attr('r', 5)
      .attr('fill', 'var(--ink)').attr('stroke', 'var(--bg)').attr('stroke-width', 1.5).attr('cy', (d) => y(d.total));
    G.hit.attr('aria-valuetext', `${fmtDate(new Date(r.t))}: ${pct(r.total)}`);

    // the logistic curve's steepest point
    const t0 = M.TODAY + params.T0[0] * YEAR;
    const inView = t0 > M.TODAY && t0 < end - 30 * DAY && params.L[0] * params.C[0] > 0;
    G.t0.attr('display', inView ? null : 'none');
    if (inView) {
      const t0y = y(stack(M.total(Math.round(t0 / DAY) * DAY, params, 0)).sci[1]);
      G.t0Dot.attr('cx', x(t0)).attr('cy', t0y).attr('aria-valuenow', params.T0[0]);
      const roomRight = x(t0) + 110 < width - m.r;
      G.t0Text.attr('x', x(t0) + (roomRight ? 12 : -12)).attr('y', t0y + 18).attr('text-anchor', roomRight ? 'start' : 'end');
    }
    document.getElementById('hint').textContent = inView
      ? 'Drag across the chart to pick a date. Drag the dot to move the logistic curve.'
      : 'Drag across the chart to pick a date.';

    say(r);
    how(r);
  }

  // ---------- the forecast in words ----------
  function say(r) {
    const st = stack(r);
    const part = (p) => `<span class="tone ${p.cls}">${p.name.toLowerCase()}</span> ${pct(st[p.key][1] - st[p.key][0])}`;
    document.getElementById('say').innerHTML = r.t === M.TODAY
      ? `The forecast starts on <b>${fmtDate(new Date(r.t))}</b>. Pick a later date.`
      : `Before <b>${fmtDate(new Date(r.t))}</b>, the chance of Yes is <b>${pct(r.total)}</b>, with a range of ${pct(r.low)} to ${pct(r.high)}. ` +
        `That is ${part(PATHS[0])} + ${part(PATHS[1])} + ${part(PATHS[2])}.`;
  }

  // ---------- each path's arithmetic for the chosen date ----------
  function how(r) {
    const n = (v) => `${+(v * 100).toFixed(1)}%`;
    const ones = [1, 1, 1];
    const curveShare = M.total(r.t, { ...params, L: ones, C: ones }, 0).sci;
    const termShare = M.total(r.t, { ...params, P_REMARK: ones }, 0).rem;
    const p = params, date = fmtDate(new Date(r.t));
    hows.sci.textContent = `Before ${date}: ${n(p.L[0])} life can be found × ${n(p.C[0])} a find is stated × ${pctFine(curveShare)} of the logistic curve reached = ${pctFine(r.sci)}`;
    hows.dis.textContent = `Before ${date}: ${n(p.P_SECRET[0])} holds proof × ${n(p.P_DISCLOSE[0])} confirms it × ${n(termShare)} of the term elapsed = ${pctFine(r.dis)}`;
    hows.rem.textContent = `Before ${date}: ${n(p.P_REMARK[0])} × ${n(termShare)} of the term elapsed = ${pctFine(r.rem)}`;
  }

  // ---------- the logistic curve on its own: the Science path over 25 years ----------
  const SPAN = 25;
  concept = EN.chart.frame(document.getElementById('curve'), (w) => Math.max(190, Math.min(250, w * 0.34)), ({ svg, width, height }) => {
    const m = { t: 30, r: 14, b: 28, l: 2 };
    svg.selectAll('*').remove();
    svg.attr('aria-label', 'A logistic curve: flat at first, then steepening, then levelling off');
    const pts = d3.range(0, SPAN * 12 + 1).map((i) => {
      const t = Math.round((M.TODAY + (i / 12) * YEAR) / DAY) * DAY;
      return { t, c: M.total(t, params, 0).sci, lo: M.total(t, params, 1).sci, hi: M.total(t, params, 2).sci };
    });
    const ceil = params.L[0] * params.C[0];
    const cx = d3.scaleUtc([M.TODAY, M.TODAY + SPAN * YEAR], [m.l, width - m.r]);
    const cy = d3.scaleLinear([0, Math.max(ceil, d3.max(pts, (q) => Math.max(q.hi, q.lo)), 0.01) * 1.18], [height - m.b, m.t]);
    // drawn without numbers on purpose: this is the shape, the chart below has the values
    svg.append('line').attr('x1', m.l).attr('x2', width - m.r).attr('y1', height - m.b).attr('y2', height - m.b).attr('stroke', 'var(--line)');
    svg.append('line').attr('x1', m.l).attr('x2', m.l).attr('y1', m.t).attr('y2', height - m.b).attr('stroke', 'var(--line)');
    svg.append('text').attr('class', 'note').attr('x', width - m.r).attr('y', height - m.b + 20).attr('text-anchor', 'end').text('Time');
    svg.append('text').attr('class', 'note').attr('x', m.l).attr('y', m.t - 10).text('Chance of a find');
    svg.append('path').attr('fill', 'var(--band)').attr('d', d3.area().x((q) => cx(q.t)).y0((q) => cy(q.lo)).y1((q) => cy(q.hi))(pts));
    svg.append('line').attr('x1', m.l).attr('x2', width - m.r).attr('y1', cy(ceil)).attr('y2', cy(ceil)).attr('stroke', 'var(--ink-faint)').attr('stroke-dasharray', '2 4');
    svg.append('path').attr('fill', 'none').attr('stroke', 'var(--s1)').attr('stroke-width', 2.5).attr('d', d3.line().x((q) => cx(q.t)).y((q) => cy(q.c))(pts));
    svg.append('text').attr('class', 'note').attr('x', width - m.r).attr('y', cy(ceil) - 8).attr('text-anchor', 'end').text('Levels off');
    svg.append('text').attr('class', 'note').attr('x', m.l + 8).attr('y', height - m.b - 14).text('Flat at first');
    const t0 = M.TODAY + params.T0[0] * YEAR;
    if (params.T0[0] > 0 && params.T0[0] < SPAN) {
      const y0 = cy(M.total(Math.round(t0 / DAY) * DAY, params, 0).sci);
      svg.append('circle').attr('cx', cx(t0)).attr('cy', y0).attr('r', 5).attr('fill', 'var(--s1)').attr('stroke', 'var(--bg)').attr('stroke-width', 2);
      svg.append('text').attr('class', 'note').attr('x', cx(t0) + 12).attr('y', y0 + 16).text('Steepest');
    }
  });

  // ---------- the forecast against Kalshi's prices, at the market's dates ----------
  if (market) {
    const mk = M.MARKET_DATES.map((t) => ({ t, p: market.yes_mid[new Date(t).toISOString().slice(0, 10)] })).filter((d) => d.p != null);
    document.getElementById('market-section').hidden = false;
    document.getElementById('market-note').innerHTML = `Kalshi's Yes prices on ${market.as_of}, next to the forecast. Data: <a href="https://kalshi.com/markets/kxaliens">Kalshi</a>.`;
    versus = EN.chart.frame(document.getElementById('market'), (w) => Math.max(240, Math.min(340, w * 0.5)), ({ svg, width, height }) => {
      const m = { t: 22, r: width > 520 ? 86 : 62, b: 30, l: 46 };
      svg.selectAll('*').remove();
      svg.attr('aria-label', 'The forecast and Kalshi prices at each market date');
      const lastT = M.MARKET_DATES[M.MARKET_DATES.length - 1];
      const fc = [{ t: M.TODAY, total: 0, low: 0, high: 0 }].concat(M.curve(params, lastT));
      const vx = d3.scaleUtc([M.TODAY, lastT], [m.l, width - m.r]);
      const vy = d3.scaleLinear([0, Math.max(d3.max(mk, (d) => d.p), d3.max(fc, (d) => d.high)) * 1.12], [height - m.b, m.t]).nice(5);
      svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(vy).ticks(5).tickSize(-(width - m.l - m.r)).tickFormat(''));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`)
        .call(d3.axisLeft(vy).ticks(5).tickSize(0).tickPadding(8).tickFormat((v) => Math.round(v * 100) + '%')).call((g) => g.select('.domain').remove());
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - m.b})`)
        .call(d3.axisBottom(vx).ticks(d3.utcYear.every(1)).tickSize(5).tickPadding(6).tickFormat(d3.utcFormat('%Y')));
      svg.append('path').attr('fill', 'var(--band)').attr('d', d3.area().x((d) => vx(d.t)).y0((d) => vy(d.low)).y1((d) => vy(d.high))(fc));
      svg.append('path').attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2.5).attr('d', d3.line().x((d) => vx(d.t)).y((d) => vy(d.total))(fc));
      svg.append('path').attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2).attr('d', d3.line().x((d) => vx(d.t)).y((d) => vy(d.p))(mk));
      const at = (t) => fc.find((d) => d.t === t);
      svg.append('g').selectAll('circle').data(mk).join('circle').attr('r', 4).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)').attr('stroke-width', 2).attr('cx', (d) => vx(d.t)).attr('cy', (d) => vy(at(d.t).total));
      svg.append('g').selectAll('circle').data(mk).join('circle').attr('r', 4).attr('fill', 'var(--accent)').attr('stroke', 'var(--bg)').attr('stroke-width', 1.5).attr('cx', (d) => vx(d.t)).attr('cy', (d) => vy(d.p));
      // value labels where there is room (the first two dates sit a month apart)
      let lastX = -1e9;
      mk.forEach((d) => {
        if (vx(d.t) - lastX < 44) return;
        lastX = vx(d.t);
        svg.append('text').attr('class', 'note').attr('text-anchor', 'middle').attr('x', vx(d.t)).attr('y', vy(d.p) - 10).style('fill', 'var(--accent)').text(pct(d.p));
        svg.append('text').attr('class', 'note').attr('text-anchor', 'middle').attr('x', vx(d.t)).attr('y', vy(at(d.t).total) - 10).style('fill', 'var(--ink)').text(pct(at(d.t).total));
      });
      const end = mk[mk.length - 1];
      svg.append('text').attr('class', 'end-label').attr('x', width - m.r + 10).attr('y', vy(end.p)).attr('dy', '0.35em').style('fill', 'var(--accent)').text('Kalshi');
      svg.append('text').attr('class', 'end-label').attr('x', width - m.r + 10).attr('y', vy(at(end.t).total)).attr('dy', '0.35em').style('fill', 'var(--ink)').text('Forecast');
    });
  }

  changed();
}).catch((e) => {
  document.getElementById('chart').insertAdjacentHTML('afterbegin', '<p class="muted">The model inputs could not be loaded. Reload the page.</p>');
  console.error(e);
});
