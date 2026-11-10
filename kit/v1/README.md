# Event Neutral kit, version 1

The shared look for Event Neutral pages. Every event page loads this one copy, so pages do not drift apart.

This folder is self-contained. It is written to be served from `https://eventneutral.com/kit/v1/`. Until it moves there, this repository loads it by relative path.

| File | What it is |
| --- | --- |
| `kit.css` | Colours (dark by default, light on request), type, page furniture, tables, sliders, number boxes, chart text. |
| `theme.js` | The light/dark switch. Load it in `<head>` without `defer`. It adds its own button to the top bar. |
| `kit.js` | `EN.sliderField`, `EN.numberBox`, `EN.chart.frame`, `EN.chart.dodge`, `EN.fmt`. |
| `vendor/d3.v7.min.js` | D3 7.9.2, unmodified. Licence in `vendor/d3.LICENSE`. |
| `fonts/` | Source Sans 3 (variable, Latin). Licence in `fonts/OFL.txt`. |

## Using it on a page

```html
<link rel="stylesheet" href="https://eventneutral.com/kit/v1/kit.css">
<script src="https://eventneutral.com/kit/v1/theme.js"></script>
...
<script src="https://eventneutral.com/kit/v1/vendor/d3.v7.min.js"></script>
<script src="https://eventneutral.com/kit/v1/kit.js"></script>
```

Chart colours come from the CSS variables `--s1`, `--s2`, `--s3`, `--ink` and `--band`, so a chart follows the light/dark switch without redrawing.

## Changing it

A change that could break a page already using v1 goes in a new folder, `v2/`. Small fixes can go into `v1/`.

Anything specific to one event (its model, its inputs, its page script) stays out of this folder.
