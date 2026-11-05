"""Alien discovery model: probability-versus-date curve for Kalshi's KXALIENS markets.

First version 2026-11-05. Edit the PARAMETERS block and rerun:
    python forecast_curve.py
Writes forecast_curve.csv and forecast_curve.png next to this file.

Paths to Yes (summed as independent; union taken):
  Science     L * S(t), where S is a logistic curve in years from today, rescaled so S(today) = 0
              and S(infinity) = 1. L = chance aliens exist AND we can find them, eventually.
              t0 = the steepest point of the curve (years from today), k = steepness.
              c = chance a discovery turns into a definitive US official statement in time.
  Disclosure  p_secret * p_disclose, spread evenly from today to the end of the term (2029-01-20).
  Remark      p_remark, spread evenly from today to the end of the term.
"""
import csv
import math
from datetime import date
from pathlib import Path

# ---------------- PARAMETERS (central, low, high) ----------------
TODAY = date(2026, 11, 5)
TERM_END = date(2029, 1, 20)
L = (0.70, 0.60, 0.80)          # exist and findable, eventually
T0 = (10.0, 13.0, 7.0)          # steepest point, years from today (later = lower curve)
K = 0.44                        # steepness: 10%->90% of the rise spans ~10 years
C = (1.0, 1.0, 1.0)             # discovery -> definitive US statement (assumed announced)
P_SECRET = (0.04, 0.04, 0.04)   # government holds proof
P_DISCLOSE = (0.35, 0.30, 0.40) # Trump administration discloses it, given it exists
P_REMARK = (0.01, 0.01, 0.01)   # off-the-cuff (cut from 2% on 2026-11-05) definitive remark by the end of the term

MARKET_DATES = [date(2026, 12, 1), date(2027, 1, 1), date(2028, 1, 1), date(2029, 1, 20)]
# Market Yes mid-price per date, entered AFTER the forecast is written (blind first). Leave empty to hide.
MARKET_YES = {}
MARKET_AS_OF = "2026-11-05"
CHART_END = date(2029, 6, 1)    # chart x-axis end; the CSV still runs to 2036
# -----------------------------------------------------------------


def years(d):
    return (d - TODAY).days / 365.25


def logistic(t, t0, k):
    return 1 / (1 + math.exp(-k * (t - t0)))


def science(d, l, t0, c):
    t = years(d)
    f0 = logistic(0, t0, K)
    s = (logistic(t, t0, K) - f0) / (1 - f0)
    return l * c * max(s, 0)


def term_share(d):
    total = (TERM_END - TODAY).days
    return min(max((d - TODAY).days / total, 0), 1)


def total(d, i):
    sci = science(d, L[i], T0[i], C[i])
    dis = P_SECRET[i] * P_DISCLOSE[i] * term_share(d)
    rem = P_REMARK[i] * term_share(d)
    return sci, dis, rem, 1 - (1 - sci) * (1 - dis) * (1 - rem)


def month_starts(start, end):
    y, m = start.year, start.month + 1
    while date(y, m, 1) <= end:
        yield date(y, m, 1)
        m += 1
        if m == 13:
            y, m = y + 1, 1


here = Path(__file__).parent
dates = sorted(set(list(month_starts(TODAY, date(2036, 12, 1))) + MARKET_DATES))
rows = []
for d in dates:
    sci, dis, rem, mid = total(d, 0)
    lo, hi = total(d, 1)[3], total(d, 2)[3]
    rows.append((d, sci, dis, rem, mid, lo, hi))

with open(here / "forecast_curve.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["date", "science", "disclosure", "remark", "total", "low", "high", "market_date"])
    for d, sci, dis, rem, mid, lo, hi in rows:
        w.writerow([d, f"{sci:.4f}", f"{dis:.4f}", f"{rem:.4f}", f"{mid:.4f}", f"{lo:.4f}", f"{hi:.4f}", d in MARKET_DATES])

print(f"{'before':<12}{'science':>9}{'disclose':>10}{'remark':>8}{'total':>8}{'range':>16}")
for d, sci, dis, rem, mid, lo, hi in rows:
    if d in MARKET_DATES:
        print(f"{d!s:<12}{sci:>9.1%}{dis:>10.2%}{rem:>8.2%}{mid:>8.1%}{lo:>8.1%} -{hi:>6.1%}")

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.ticker import PercentFormatter
    import matplotlib.dates as mdates
    INK, MUTED, ACCENT, MARKET = "#1e1e1e", "#8a8a8a", "#2f5d8a", "#c2410c"
    plt.rcParams.update({"font.family": "Segoe UI", "font.size": 11, "axes.edgecolor": MUTED,
                         "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED})
    vis = [r for r in rows if r[0] <= CHART_END]
    xs = [r[0] for r in vis]
    fig, ax = plt.subplots(figsize=(11, 6))
    ax.fill_between(xs, [r[5] for r in vis], [r[6] for r in vis], color=ACCENT, alpha=0.15, linewidth=0, label="Model range")
    ax.plot(xs, [r[4] for r in vis], color=ACCENT, linewidth=2.4, label="Model (central)")
    for d in MARKET_DATES:
        r = next(x for x in rows if x[0] == d)
        ax.scatter([d], [r[4]], color=ACCENT, s=36, zorder=3)
        ax.annotate(f"{r[4]:.1%}", (d, r[4]), textcoords="offset points", xytext=(7, 4), ha="left", fontsize=9, color=ACCENT)
    if MARKET_YES:
        mx = sorted(MARKET_YES)
        ax.scatter(mx, [MARKET_YES[d] for d in mx], color=MARKET, marker="D", s=46, zorder=4, label=f"Kalshi Yes price, {MARKET_AS_OF}")
        for d in mx:
            ax.annotate(f"{MARKET_YES[d]:.1%}", (d, MARKET_YES[d]), textcoords="offset points", xytext=(-7, 4), ha="right", fontsize=9, color=MARKET)
    ax.axvline(TERM_END, color=MUTED, linewidth=0.8, linestyle=":")
    ax.text(TERM_END, 0.004, " end of term", color=MUTED, fontsize=9, va="bottom")
    ax.set_ylim(0, max(0.3, max(MARKET_YES.values(), default=0) * 1.25))
    ax.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis="y", color="#e6e6e6", linewidth=0.8)
    ax.set_ylabel("Chance of Yes before date")
    fig.suptitle("Will the U.S. confirm that aliens exist?", x=0.06, ha="left", fontsize=17, fontweight="bold", color=INK)
    ax.set_title(f"Forecast, {TODAY}", loc="left", fontsize=11, color=MUTED)
    ax.legend(loc="upper left", frameon=False)
    fig.tight_layout()
    fig.savefig(here / "forecast_curve.png", dpi=160)
except ImportError:
    print("matplotlib not installed; skipped the chart")
