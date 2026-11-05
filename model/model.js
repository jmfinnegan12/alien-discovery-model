// Forecast model, a line-for-line port of code/forecast_curve.py.
// Both read their inputs from model/inputs.json. Call ForecastModel.fromConfig(parsedJson).
// Works in the browser (window.ForecastModel) and in Node (module.exports) so it can be tested.
(function (root) {
  const DAY = 86400000;
  const KEYS = ['L', 'T0', 'K', 'C', 'P_SECRET', 'P_DISCLOSE', 'P_REMARK'];
  const d = (y, m, day) => Date.UTC(y, m - 1, day);
  const parse = (s) => { const [y, m, day] = s.split('-').map(Number); return d(y, m, day); };

  function fromConfig(cfg) {
    const TODAY = parse(cfg.as_of);
    const TERM_END = parse(cfg.term_end);
    const MARKET_DATES = cfg.market_dates.map(parse);
    // [central, low case, high case], same order as the Python tuples.
    const DEFAULTS = {};
    KEYS.forEach((k) => { const v = cfg.inputs[k]; DEFAULTS[k] = [v.central, v.low_case, v.high_case]; });

    const days = (a, b) => Math.round((b - a) / DAY);
    const years = (t) => days(TODAY, t) / 365.25;
    const logistic = (t, t0, k) => 1 / (1 + Math.exp(-k * (t - t0)));

    function science(t, l, t0, k, c) {
      const f0 = logistic(0, t0, k);
      const s = (logistic(years(t), t0, k) - f0) / (1 - f0);
      return l * c * Math.max(s, 0);
    }

    function termShare(t) {
      return Math.min(Math.max(days(TODAY, t) / days(TODAY, TERM_END), 0), 1);
    }

    // i = 0 central, 1 low case, 2 high case
    function total(t, p, i) {
      const sci = science(t, p.L[i], p.T0[i], p.K[i], p.C[i]);
      const dis = p.P_SECRET[i] * p.P_DISCLOSE[i] * termShare(t);
      const rem = p.P_REMARK[i] * termShare(t);
      return { sci, dis, rem, total: 1 - (1 - sci) * (1 - dis) * (1 - rem) };
    }

    function monthStarts(end) {
      const out = [];
      const s = new Date(TODAY);
      let y = s.getUTCFullYear(), m = s.getUTCMonth() + 2; // month after TODAY, 1-based
      for (;;) {
        if (m === 13) { y += 1; m = 1; }
        const t = d(y, m, 1);
        if (t > end) break;
        out.push(t);
        m += 1;
      }
      return out;
    }

    function curve(p, end) {
      const set = new Set(monthStarts(end).concat(MARKET_DATES.filter((t) => t <= end)));
      return [...set].sort((a, b) => a - b).map((t) => {
        const c = total(t, p, 0);
        return { t, ...c, low: total(t, p, 1).total, high: total(t, p, 2).total };
      });
    }

    return { AS_OF: cfg.as_of, TODAY, TERM_END, MARKET_DATES, DEFAULTS, d, total, curve };
  }

  const api = { fromConfig, d, parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ForecastModel = api;
})(this);
