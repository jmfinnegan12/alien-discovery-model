// Forecast model, a line-for-line port of code/forecast_curve.py.
// Works in the browser (window.ForecastModel) and in Node (module.exports) so it can be tested.
(function (root) {
  const DAY = 86400000;
  const d = (y, m, day) => Date.UTC(y, m - 1, day);

  const TODAY = d(2026, 11, 5);
  const TERM_END = d(2029, 1, 20);
  const MARKET_DATES = [d(2026, 12, 1), d(2027, 1, 1), d(2028, 1, 1), d(2029, 1, 20)];

  // [central, low case, high case], same order as the Python tuples.
  const DEFAULTS = {
    L: [0.70, 0.60, 0.80],
    T0: [10.0, 13.0, 7.0],
    K: [0.44, 0.44, 0.44],
    C: [1.0, 1.0, 1.0],
    P_SECRET: [0.04, 0.04, 0.04],
    P_DISCLOSE: [0.35, 0.30, 0.40],
    P_REMARK: [0.01, 0.01, 0.01],
  };

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

  const api = { TODAY, TERM_END, MARKET_DATES, DEFAULTS, d, total, curve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ForecastModel = api;
})(this);
