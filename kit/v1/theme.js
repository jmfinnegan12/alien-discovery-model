// Event Neutral kit v1: light/dark switch.
// Load in <head>, without defer, so the page never flashes the wrong theme.
// Dark is the default. The choice is remembered on this device.
// A page can place its own <button data-theme-switch>; otherwise one is added to the top bar.
(function () {
  var KEY = 'en-theme';
  var root = document.documentElement;
  var listeners = [];

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function current() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function apply(theme) {
    if (theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }

  // ?theme=light or ?theme=dark shows that theme for this visit without saving it.
  var forced = (/[?&]theme=(light|dark)\b/.exec(location.search) || [])[1];
  apply(forced || stored() || 'dark');

  function label(btn) {
    var next = current() === 'light' ? 'Dark' : 'Light';
    btn.textContent = next;
    btn.setAttribute('aria-label', 'Switch to ' + next.toLowerCase() + ' mode');
  }

  function wire() {
    var btn = document.querySelector('[data-theme-switch]');
    if (!btn) {
      var nav = document.querySelector('header.bar .nav');
      if (!nav) return;
      btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-theme-switch', '');
      nav.appendChild(btn);
    }
    btn.classList.add('theme-switch');
    label(btn);
    btn.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      label(btn);
      listeners.forEach(function (fn) { fn(next); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.EN = window.EN || {};
  window.EN.theme = { current: current, onChange: function (fn) { listeners.push(fn); } };
})();
