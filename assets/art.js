/* Abstract colour fields, made only for this site.
   Each piece gets its own quiet painting, grown from its name: same name, same picture.
   Blues are blue, Purple is violet, everything else is red. */
(function () {
  var PALETTES = {
    blues:  ['#080b18', '#121c3d', '#223a78', '#4467bd', '#b7c7f0'],
    purple: ['#10071a', '#26103a', '#4d1d68', '#8a45ad', '#dfbdf0'],
    ember:  ['#120506', '#300a10', '#661320', '#b0312c', '#f1b59c']
  };
  function hashStr(s) { var h = 1779033703 ^ s.length; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var uid = 0;
  function f(n) { return n.toFixed(1); }

  function paint(el) {
    var pal = PALETTES[el.getAttribute('data-mood')] || PALETTES.ember;
    var r = rng(hashStr(el.getAttribute('data-seed') || 'x'));
    var id = 'a' + (uid++), S = 400;
    var vertical = r() < 0.35;
    var fields = 1 + Math.floor(r() * 3);
    var s = '<svg viewBox="0 0 ' + S + ' ' + S + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="' + (vertical ? 1 : 0) + '" y2="' + (vertical ? 0 : 1) + '"><stop offset="0" stop-color="' + pal[1] + '"/><stop offset="1" stop-color="' + pal[0] + '"/></linearGradient>' +
      '<filter id="' + id + 'b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="' + f(6 + r() * 10) + '"/></filter>' +
      '<filter id="' + id + 'n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="' + Math.floor(r() * 99) + '"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>' +
      '</defs><rect width="100%" height="100%" fill="url(#' + id + 'g)"/>';
    // stacked soft fields
    var margin = 34 + r() * 26, gap = 14 + r() * 18, span = S - margin * 2 - gap * (fields - 1);
    var sizes = [], total = 0;
    for (var i = 0; i < fields; i++) { var w = 0.6 + r(); sizes.push(w); total += w; }
    var pos = margin;
    s += '<g filter="url(#' + id + 'b)">';
    for (var j = 0; j < fields; j++) {
      var len = span * sizes[j] / total, col = pal[2 + Math.floor(r() * 2)], op = (0.55 + r() * 0.4).toFixed(2);
      var side = margin * (0.7 + r() * 0.5);
      if (vertical) s += '<rect x="' + f(pos) + '" y="' + f(side) + '" width="' + f(len) + '" height="' + f(S - side * 2) + '" rx="6" fill="' + col + '" opacity="' + op + '"/>';
      else s += '<rect x="' + f(side) + '" y="' + f(pos) + '" width="' + f(S - side * 2) + '" height="' + f(len) + '" rx="6" fill="' + col + '" opacity="' + op + '"/>';
      pos += len + gap;
    }
    s += '</g>';
    // one quiet mark
    var mark = Math.floor(r() * 4);
    var mx = S * (0.25 + r() * 0.5), my = S * (0.25 + r() * 0.5);
    if (mark === 1) s += '<circle cx="' + f(mx) + '" cy="' + f(my) + '" r="' + f(8 + r() * 22) + '" fill="' + pal[4] + '" opacity=".55"/>';
    else if (mark === 2) s += '<line x1="' + f(S * 0.12) + '" x2="' + f(S * 0.88) + '" y1="' + f(my) + '" y2="' + f(my) + '" stroke="' + pal[4] + '" stroke-width="1" opacity=".45"/>';
    else if (mark === 3) s += '<path d="M' + f(mx - 60) + ' ' + f(my) + ' A60 60 0 0 1 ' + f(mx + 60) + ' ' + f(my) + '" fill="none" stroke="' + pal[4] + '" stroke-width="1.2" opacity=".5"/>';
    s += '<rect width="100%" height="100%" filter="url(#' + id + 'n)"/></svg>';
    el.innerHTML = s;
  }

  window.paintArt = function (root) {
    var els = (root || document).querySelectorAll('.art[data-seed]:not([data-painted])');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { paint(e); e.setAttribute('data-painted', ''); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { paint(en.target); en.target.setAttribute('data-painted', ''); io.unobserve(en.target); } });
    }, { rootMargin: '300px' });
    els.forEach(function (e) { io.observe(e); });
  };
  document.addEventListener('DOMContentLoaded', function () { window.paintArt(); });
})();
