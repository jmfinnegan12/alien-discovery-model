# Alien discovery model

A model from [Event Neutral](https://eventneutral.com): will U.S. officials announce that extraterrestrial life exists? Built around Kalshi's `KXALIENS` markets.

- `index.html` and its subfolders: the site pages (served at alien-discovery-model.eventneutral.com). Question, Rules, Model (interactive, with the rationale), Background (Search for life, Government disclosure, and their pages).
- `model/inputs.json`: the forecast's inputs, read by both the Python and the Model page. Edit inputs here only.
- `code/forecast_curve.py`: the forecast model. Run it to redraw the chart and write a month-by-month CSV.
- `model/`: the interactive model page. `model/model.js` is a line-for-line port of the Python; a change to the math goes in both.
- The look shared by Event Neutral pages (styles, light/dark switch, D3, sliders) is loaded from `https://eventneutral.com/kit/v1/`. Its source is in the `event-neutral-site` repository.
- `assets/`: styles and charts.

---

Started 2026-11-05. Nothing here is financial advice.

License: MIT, see [LICENSE](LICENSE).
