// Event Neutral kit v1: reusable input and chart pieces.
// Needs kit.css. EN.chart also needs D3 v7 (vendor/d3.v7.min.js) loaded first.
(function () {
  var EN = (window.EN = window.EN || {});

  function h(tag, attrs, parent) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  var clamp = function (v, lo, hi) { return Math.min(Math.max(v, lo), hi); };
  var tidy = function (v) { return String(Math.round(v * 1000) / 1000); };

  EN.fmt = {
    // 0.037 -> "3.7%"
    pct: function (v, digits) { return (v * 100).toFixed(digits == null ? 1 : digits) + '%'; },
    // one decimal, two below 1%
    pctFine: function (v) { var x = v * 100; return (x < 1 ? x.toFixed(2) : x.toFixed(1)) + '%'; },
  };

  // A number box with a unit after it.
  // opts: { value, min, max, step, unit, label, onChange(value) }
  EN.numberBox = function (opts) {
    var wrap = h('span', { class: 'en-num' });
    var input = h('input', { type: 'number', step: opts.step, 'aria-label': opts.label, inputmode: 'decimal' }, wrap);
    if (opts.min != null) input.min = opts.min;
    if (opts.max != null) input.max = opts.max;
    if (opts.unit) h('span', { text: opts.unit }, wrap);
    input.value = tidy(opts.value);
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      if (!isFinite(v)) return;
      if (opts.min != null) v = Math.max(v, opts.min);
      if (opts.max != null) v = Math.min(v, opts.max);
      opts.onChange(v);
    });
    return {
      el: wrap,
      input: input,
      // leave the box alone while someone is typing the same number in it
      set: function (v) { if (document.activeElement !== input || Math.abs(parseFloat(input.value) - v) > 1e-9) input.value = tidy(v); },
    };
  };

  // A slider paired with a number box. Moving either updates the other.
  // opts: { value, min, max, step, unit, label, onChange(value),
  //         sliderMin, sliderMax }  sliderMin/Max narrow the slider's travel; the box keeps min/max.
  EN.sliderField = function (opts) {
    var sMin = opts.sliderMin != null ? opts.sliderMin : opts.min;
    var sMax = opts.sliderMax != null ? opts.sliderMax : opts.max;
    var range = h('input', { type: 'range', class: 'en-range', min: sMin, max: sMax, step: opts.step, 'aria-label': opts.label });
    range.value = opts.value;
    var box = EN.numberBox({
      value: opts.value, min: opts.min, max: opts.max, step: opts.step, unit: opts.unit, label: opts.label,
      onChange: function (v) { range.value = v; opts.onChange(v); },
    });
    range.addEventListener('input', function () {
      var v = parseFloat(range.value);
      box.input.value = tidy(v);
      opts.onChange(v);
    });
    var pos = function (v) { return clamp(((v - sMin) / (sMax - sMin)) * 100, 0, 100); };
    return {
      range: range,
      box: box,
      set: function (v) { range.value = v; box.set(v); },
      // shade the part of the track between two values
      setBand: function (a, b) {
        range.style.setProperty('--lo', pos(Math.min(a, b)));
        range.style.setProperty('--hi', pos(Math.max(a, b)));
      },
    };
  };

  EN.chart = {
    // An SVG that redraws at the container's real pixel width, so text stays the same size on a phone.
    // heightFor(width) -> height. render({ svg (d3 selection), width, height }).
    frame: function (container, heightFor, render) {
      var svg = d3.select(container).append('svg').attr('role', 'img');
      var last = 0;
      function draw() {
        var width = Math.floor(container.clientWidth);
        if (!width) return;
        last = width;
        var height = Math.round(heightFor(width));
        svg.attr('viewBox', '0 0 ' + width + ' ' + height).attr('height', height);
        render({ svg: svg, width: width, height: height });
      }
      if (window.ResizeObserver) new ResizeObserver(function () { if (Math.floor(container.clientWidth) !== last) draw(); }).observe(container);
      else window.addEventListener('resize', draw);
      draw();
      return { svg: svg, redraw: draw };
    },

    // Keep labels from sitting on top of each other.
    // items: [{ y }] ; returns the same items with .ly set, at least `gap` apart, inside [lo, hi].
    dodge: function (items, gap, lo, hi) {
      var s = items.slice().sort(function (a, b) { return a.y - b.y; });
      s.forEach(function (it, i) { it.ly = i ? Math.max(it.y, s[i - 1].ly + gap) : Math.max(it.y, lo); });
      for (var i = s.length - 1; i >= 0; i--) {
        var cap = i === s.length - 1 ? hi : s[i + 1].ly - gap;
        if (s[i].ly > cap) s[i].ly = cap;
      }
      return items;
    },
  };
})();
