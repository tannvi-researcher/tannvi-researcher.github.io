/* Interactions for tannvi's site. */
(function () {
  document.documentElement.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var data = (function () { var el = $('#pieces-data'); try { return el ? JSON.parse(el.textContent) : []; } catch (e) { return []; } })();
  var MOOD = { blues: '#6f8fe0', purple: '#b06ad4', ember: '#d0492f' };

  // top bar background after scrolling
  var bar = $('.topbar');
  function onScroll() { if (bar) bar.classList.toggle('scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // reveal on scroll
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }); }, { threshold: 0.12 });
    $$('.reveal, .ring').forEach(function (el) { rio.observe(el); });
  } else { $$('.reveal, .ring').forEach(function (el) { el.classList.add('in'); }); }

  // cursor glow on cards and rows
  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest('.glow, .tile');
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // ---------- hero: ink in water ----------
  var canvas = $('.ink');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W, H, DPR, parts = [], mouse = { x: -9999, y: -9999, active: false }, running = true, t = 0;
    var cols = ['208,73,47', '155,28,44', '106,20,32', '231,163,147', '198,90,110'];
    function size() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = '#0b0607'; ctx.fillRect(0, 0, W, H);
      var count = Math.min(1400, Math.floor(W * H / 900));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(spawn({}));
    }
    function spawn(p) {
      p.x = Math.random() * W; p.y = Math.random() * H; p.life = 0; p.max = 80 + Math.random() * 220;
      p.c = cols[(Math.random() * cols.length) | 0]; p.w = Math.random() < 0.08 ? 1.6 : 0.7; return p;
    }
    function field(x, y) {
      var s = 0.0022;
      return Math.sin(x * s + t * 0.0007) * 1.3 + Math.cos(y * s * 1.3 - t * 0.0005) * 1.1 + Math.sin((x + y) * s * 0.6 + t * 0.0003);
    }
    function frame() {
      if (!running) return;
      step();
      requestAnimationFrame(frame);
    }
    function step() {
      t += 16;
      ctx.fillStyle = 'rgba(11,6,7,0.06)'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], a = field(p.x, p.y);
        var vx = Math.cos(a) * 0.9, vy = Math.sin(a) * 0.9;
        if (mouse.active) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 32000) { var f = (32000 - d2) / 32000; vx += (-dy * 0.012 + dx * 0.004) * f * 3; vy += (dx * 0.012 + dy * 0.004) * f * 3; }
        }
        var nx = p.x + vx, ny = p.y + vy;
        var alpha = Math.sin(Math.PI * p.life / p.max) * 0.85;
        ctx.strokeStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')'; ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life++;
        if (p.life > p.max || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) spawn(p);
      }
    }
    size(); window.addEventListener('resize', function () { clearTimeout(size.t); size.t = setTimeout(size, 200); });
    var hero = $('.hero');
    hero.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true; });
    hero.addEventListener('pointerleave', function () { mouse.active = false; });
    if (reduce) { running = false; for (var k = 0; k < 240; k++) step(); }
    else {
      new IntersectionObserver(function (es) { var vis = es[0].isIntersecting; if (vis && !running) { running = true; frame(); } else if (!vis) running = false; }).observe(hero);
      frame();
    }
  }

  // rotating word in hero
  var rot = $('.rotator');
  if (rot && !reduce) {
    var words = rot.getAttribute('data-words').split('|'), wi = 0;
    setInterval(function () { wi = (wi + 1) % words.length; rot.textContent = words[wi]; rot.classList.remove('swap'); void rot.offsetWidth; rot.classList.add('swap'); }, 2600);
  }

  // ---------- cards built from data ----------
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function cardHTML(p) {
    return '<a class="tile tile-' + p.m + '" href="' + p.u + '"><div class="art art-tile" data-seed="' + p.s + '" data-mood="' + p.m + '" aria-hidden="true"></div>' +
      '<span class="tile-kind"><i></i>' + (p.f === 'poem' ? 'poem' : 'prose') + '</span><span class="tile-title">' + esc(p.t) + '</span>' +
      '<span class="tile-hover"><span class="tile-line">' + esc(p.l) + '</span><time>' + MON[+p.d.slice(5, 7) - 1] + ' ' + p.d.slice(0, 4) + '</time></span></a>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var rc = $('[data-random-cards]');
  if (rc && data.length) {
    var shuffle = function () {
      var pool = data.slice(), pick = [];
      while (pick.length < 3 && pool.length) pick.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      rc.innerHTML = pick.map(cardHTML).join('');
      window.paintArt && window.paintArt(rc);
    };
    shuffle();
    var sb = $('[data-shuffle]'); if (sb) sb.addEventListener('click', shuffle);
  }

  // ---------- scratch: the sky ----------
  var sky = $('[data-sky]'), tip = $('[data-sky-tip]');
  var stars = [];
  if (sky && data.length) {
    var NS = 'http://www.w3.org/2000/svg';
    var W2 = 1180, H2 = 380, padX = 50, padY = 40;
    var times = data.map(function (p) { return +new Date(p.d); });
    var t0 = Math.min.apply(null, times), t1 = Math.max.apply(null, times);
    var y0 = new Date(new Date(t0).getFullYear(), 0, 1).getTime(), y1 = new Date(new Date(t1).getFullYear() + 1, 0, 1).getTime();
    function X(t) { return padX + (t - y0) / (y1 - y0) * (W2 - padX * 2); }
    function h(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; }
    var bands = { blues: 0.26, ember: 0.52, purple: 0.78 };
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W2 + ' ' + H2); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var html = '<defs><radialGradient id="halo"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
    // background dust
    for (var i = 0; i < 140; i++) { var sx = (h('d' + i) % W2), sy = (h('e' + i * 7) % H2); html += '<circle cx="' + sx + '" cy="' + sy + '" r="' + (h('f' + i) % 10 / 10 + .2).toFixed(2) + '" fill="#efe6dc" opacity="' + ((h('g' + i) % 30) / 100 + .05).toFixed(2) + '"/>'; }
    for (var y = new Date(y0).getFullYear(); y <= new Date(y1).getFullYear(); y++) {
      var xx = X(new Date(y, 0, 1).getTime());
      html += '<line class="yr-line" x1="' + xx + '" x2="' + xx + '" y1="' + padY + '" y2="' + (H2 - 34) + '"/>';
      if (y < new Date(y1).getFullYear()) html += '<text class="yr" x="' + (xx + 8) + '" y="' + (H2 - 14) + '">' + y + '</text>';
    }
    var pts = data.slice().sort(function (a, b) { return a.d.localeCompare(b.d); }).map(function (p) {
      var jitter = ((h(p.s) % 1000) / 1000 - 0.5) * 0.3;
      return { p: p, x: X(+new Date(p.d)), y: padY + (bands[p.m] + jitter) * (H2 - padY * 2 - 30), r: 3 + Math.min(6, p.w / 90) };
    });
    html += '<path class="thread" d="' + pts.map(function (q, i) { return (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }).join(' ') + '"/>';
    svg.innerHTML = html;
    pts.forEach(function (q, i) {
      var g = document.createElementNS(NS, 'g');
      var col = MOOD[q.p.m];
      g.innerHTML = '<circle class="star-halo" cx="' + q.x + '" cy="' + q.y + '" r="' + (q.r * 2.6) + '" fill="' + col + '" opacity=".18"/>' +
        '<circle class="star" cx="' + q.x + '" cy="' + q.y + '" r="' + q.r + '" fill="' + col + '" tabindex="0" role="link" aria-label="' + esc(q.p.t) + '"><animate attributeName="opacity" values="1;.55;1" dur="' + (2.5 + (h(q.p.s) % 30) / 10) + 's" repeatCount="indefinite"/></circle>';
      g.setAttribute('data-f', (q.p.c.join(' ') + ' ' + q.p.f).toLowerCase());
      g.setAttribute('data-q', (q.p.t + ' ' + q.p.l).toLowerCase());
      svg.appendChild(g);
      var star = g.querySelector('.star');
      function show() {
        var sr = sky.getBoundingClientRect(), wr = sky.parentNode.getBoundingClientRect(), br = star.getBoundingClientRect();
        tip.innerHTML = '<strong>' + esc(q.p.t) + '</strong><span>' + esc(q.p.l) + '</span>';
        tip.hidden = false;
        var left = br.left + br.width / 2 - wr.left;
        left = Math.max(150, Math.min(wr.width - 150, left));
        tip.style.left = left + 'px'; tip.style.top = (br.top - wr.top) + 'px';
        star.setAttribute('r', q.r * 1.8);
      }
      function hide() { tip.hidden = true; star.setAttribute('r', q.r); }
      var tapped = false;
      star.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(); });
      star.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
      star.addEventListener('focus', show); star.addEventListener('blur', function () { hide(); tapped = false; });
      star.addEventListener('click', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse' && !tapped) { tapped = true; show(); return; }
        location.href = q.p.u;
      });
      star.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.href = q.p.u; });
      stars.push(g);
    });
    sky.appendChild(svg);
  }

  // ---------- scratch: filters, search, surprise ----------
  var cardsWrap = $('[data-cards]');
  if (cardsWrap) {
    var filter = 'all', query = '';
    var chips = $$('[data-filter]'), search = $('[data-search]'), empty = $('[data-empty]');
    function apply() {
      var shown = 0;
      $$('.tile', cardsWrap).forEach(function (c) {
        var ok = (filter === 'all' || c.getAttribute('data-collections').split(' ').indexOf(filter) > -1) && (!query || c.getAttribute('data-title').indexOf(query) > -1);
        c.classList.toggle('is-hidden', !ok); if (ok) shown++;
      });
      stars.forEach(function (g) {
        var ok = (filter === 'all' || g.getAttribute('data-f').split(' ').indexOf(filter) > -1) && (!query || g.getAttribute('data-q').indexOf(query) > -1);
        g.classList.toggle('dim', !ok);
      });
      if (empty) empty.hidden = shown > 0;
    }
    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        filter = ch.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === ch ? 'true' : 'false'); });
        history.replaceState(null, '', filter === 'all' ? location.pathname : '#' + filter);
        apply();
      });
    });
    if (search) search.addEventListener('input', function () { query = search.value.trim().toLowerCase(); apply(); });
    var h0 = location.hash.replace('#', '');
    if (h0) { var pre = chips.filter(function (c) { return c.getAttribute('data-filter') === h0; })[0]; if (pre) pre.click(); }
    var sp = $('[data-surprise]');
    if (sp) sp.addEventListener('click', function () {
      var vis = $$('.tile:not(.is-hidden)', cardsWrap); if (!vis.length) vis = $$('.tile', cardsWrap);
      location.href = vis[(Math.random() * vis.length) | 0].getAttribute('href');
    });
  }

  // ---------- piece page ----------
  var prog = $('.progress span');
  if (prog) {
    var body = $('.piece-body');
    var upd = function () {
      var r = body.getBoundingClientRect(), total = r.height - window.innerHeight * 0.6;
      var p = Math.max(0, Math.min(1, (-r.top + window.innerHeight * 0.3) / Math.max(1, total)));
      prog.style.transform = 'scaleX(' + p + ')';
    };
    window.addEventListener('scroll', upd, { passive: true }); upd();
    document.addEventListener('keydown', function (e) {
      if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      var a = $('[data-key="' + e.key + '"]'); if (a) location.href = a.getAttribute('href');
    });
    var rv = $('[data-reveal]');
    if (rv) rv.addEventListener('click', function () { $('.piece-body').classList.add('revealed'); });
  }

  // ---------- lists ----------
  var wish = $$('.wish-item');
  if (wish.length) {
    var lchips = $$('[data-lfilter]');
    lchips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        var f = ch.getAttribute('data-lfilter');
        lchips.forEach(function (c) { c.setAttribute('aria-pressed', c === ch ? 'true' : 'false'); });
        wish.forEach(function (w) { var d = w.getAttribute('data-done') === 'true'; w.classList.toggle('is-hidden', (f === 'done' && !d) || (f === 'todo' && d)); });
      });
    });
    var dice = $('[data-dice]');
    if (dice) dice.addEventListener('click', function () {
      var todo = wish.filter(function (w) { return w.getAttribute('data-done') !== 'true' && !w.classList.contains('is-hidden'); });
      if (!todo.length) return;
      wish.forEach(function (w) { w.classList.remove('picked'); });
      var n = 0, steps = reduce ? 1 : 12, cur;
      (function roll() {
        if (cur) cur.classList.remove('picked');
        cur = todo[(Math.random() * todo.length) | 0]; cur.classList.add('picked');
        if (++n < steps) setTimeout(roll, 60 + n * 12); else cur.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      })();
    });
  }

  // ---------- books: tilt ----------
  $$('[data-tilt]').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      b.style.transform = 'rotateY(' + ((x - 0.5) * 16) + 'deg) rotateX(' + ((0.5 - y) * 12) + 'deg) translateZ(0)';
      b.style.setProperty('--mx', (x * 100) + '%'); b.style.setProperty('--my', (y * 100) + '%');
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });
})();
