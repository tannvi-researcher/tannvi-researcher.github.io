// Builds the website into the _site folder.
// You never need to run this yourself: GitHub runs it every time you change a file.
// (If you ever want to run it on your own computer: `npm install` once, then `npm run build`.)

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, '_site');
const PREVIEW = process.env.PREVIEW === '1'; // makes links end in index.html for offline previews
const SITE_URL = 'https://tannvi-researcher.github.io'; // change this if the address changes

marked.setOptions({ breaks: true, gfm: true });

// ---------- helpers ----------
function read(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (val.startsWith('[') && val.endsWith(']')) val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else if (/^".*"$/.test(val)) val = val.slice(1, -1).replace(/\\"/g, '"');
    data[key] = val;
  }
  return { data, body: src.slice(m[0].length) };
}

// Relative links so the site works from any address.
function makeLinker(depth) {
  const prefix = depth === 'abs' ? '/' : depth ? '../'.repeat(depth) : './';
  return function link(p) {
    p = p.replace(/^\//, '');
    if (PREVIEW && (p === '' || p.endsWith('/'))) p += 'index.html';
    if (p === '' && !PREVIEW) return prefix;
    if (depth === 'abs') return prefix + p;
    return prefix + p;
  };
}
function fixRootLinks(html, link) {
  return html.replace(/href="\/(?!\/)([^"]*)"/g, (_, p) => `href="${link('/' + p)}"`);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function niceDate(iso) { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; }

// ---------- content ----------
const pieces = fs.readdirSync(path.join(ROOT, 'content/pieces'))
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const { data, body } = frontMatter(read('content/pieces/' + f));
    const date = String(data.date);
    const [y, mo, d] = date.split('-');
    const slug = data.slug || f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    const collections = Array.isArray(data.collections) ? data.collections : (data.collections ? [data.collections] : []);
    const html = marked.parse(body);
    const plain = body.replace(/\\(.)/g, '$1').replace(/[*_>#]/g, '');
    const words = plain.split(/\s+/).filter(w => /\w/.test(w)).length;
    const lines = body.trim().split('\n').length;
    const firstLine = plain.split('\n').map(s => s.trim())
      .find(s => s.length > 12 && /[a-z]/i.test(s) && !/^[.…\-–—~()]+$/.test(s) && !/^\(.*\)$/.test(s) && !/^(tuning|key|capo|draft)/i.test(s)) || '';
    const mood = collections.includes('Blues') ? 'blues' : collections.includes('Purple') ? 'purple' : 'ember';
    return {
      title: data.title, date, slug, collections, mood, html, words, lines,
      form: collections.includes('Poetry') ? 'poem' : 'prose',
      style: data.style || '', warning: data.warning || '',
      firstLine: firstLine.slice(0, 140),
      url: `${y}/${mo}/${d}/${slug}/`,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

const about = frontMatter(read('content/about.md'));

function parseLinks() {
  const groups = {}; let cur = null;
  for (const line of read('content/links.md').split('\n')) {
    const h = line.match(/^#\s+(.*)/); if (h) { cur = h[1].trim(); groups[cur] = []; continue; }
    const l = line.match(/^-\s+\[(.*?)\]\((.*?)\)\s*(?:\|\s*(.*))?$/);
    if (l && cur) groups[cur].push({ label: l[1], href: l[2], note: (l[3] || '').trim() });
  }
  return groups;
}
const links = parseLinks();

function parseList(file) {
  const { data, body } = frontMatter(read(file));
  const items = body.split('\n').map(l => l.match(/^(\d+)\.\s+(.*)$/)).filter(Boolean).map(([, n, text]) => {
    const t = text.trim();
    const done = /^~~.*~~$/.test(t) && (t.match(/~~/g) || []).length === 2;
    const inner = done ? t.slice(2, -2) : t;
    return { n: Number(n), done, html: marked.parseInline(inner) };
  });
  return { ...data, items };
}
const lists = ['content/lists/before-i-die.md', 'content/lists/25-before-25.md'].map(parseList);

function parseBooks() {
  const books = []; let cur = null;
  for (const line of read('content/anthologies.md').split('\n')) {
    const h = line.match(/^#\s+(.*)/); if (h) { cur = { title: h[1].trim(), links: [] }; books.push(cur); continue; }
    const c = line.match(/^cover:\s*(\S+)/); if (c && cur) { cur.cover = c[1]; continue; }
    const l = line.match(/^-\s+\[(.*?)\]\((.*?)\)/); if (l && cur) cur.links.push({ label: l[1], href: l[2] });
  }
  return books;
}
const books = parseBooks();

// Opinion articles: one Markdown file per article in content/articles/
const articlesDir = path.join(ROOT, 'content/articles');
const articles = (fs.existsSync(articlesDir) ? fs.readdirSync(articlesDir) : [])
  .filter(f => f.endsWith('.md') && !f.startsWith('_'))
  .map(f => {
    const { data, body } = frontMatter(read('content/articles/' + f));
    const slug = data.slug || f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    const words = body.split(/\s+/).filter(w => /\w/.test(w)).length;
    return { title: data.title, date: String(data.date), subtitle: data.subtitle || '', published: data.published || '', link: data.link || '', slug, words, html: marked.parse(body), url: `opinions/${slug}/` };
  })
  .filter(a => a.title && a.date)
  .sort((a, b) => b.date.localeCompare(a.date));

// ---------- layout ----------
function layout({ title, description = about.data.intro, depth, body, bodyClass = '', active = '' }) {
  const link = makeLinker(depth);
  const nav = [['About', ''], ['Scratch', 'scratch/'], ['Opinions', 'opinions/'], ['Bucket lists', 'lists/', lists], ['Anthologies', 'anthologies/']];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="#0b0607">
<link rel="icon" href="${link('assets/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${link('assets/style.css')}">
</head>
<body class="${bodyClass}">
<div class="grain" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="${link('')}">tannvi</a>
  <nav aria-label="Main">
    ${nav.map(([label, p, sub]) => {
      const a = `<a href="${link(p)}"${active === label ? ' aria-current="page"' : ''}>${label}</a>`;
      if (!sub) return a;
      return `<div class="has-menu">${a}<div class="menu">${sub.map(l => `<a href="${link(l.url)}">${esc(l.title)}</a>`).join('')}</div></div>`;
    }).join('\n    ')}
  </nav>
</header>
${body}
<footer class="footer">
  <div class="footer-inner">
    <p class="footer-name"><em>tannvi</em></p>
    <p class="footer-links">${(links['Find me'] || []).map(l => `<a href="${esc(l.href)}" rel="me">${esc(l.label)}</a>`).join('<span>·</span>')}</p>
  </div>
</footer>
<script src="${link('assets/art.js')}"></script>
<script src="${link('assets/site.js')}"></script>
</body>
</html>`;
}

function artTag(p, cls = '') {
  return `<div class="art ${cls}" data-seed="${esc(p.slug)}" data-mood="${p.mood}" aria-hidden="true"></div>`;
}
function tags(p) {
  return p.collections.map(c => `<span class="tag tag-${c.toLowerCase()}">${esc(c)}</span>`).join('');
}
function card(p, link) {
  return `<a class="card" href="${link(p.url)}" data-collections="${p.collections.join(' ').toLowerCase()} ${p.form}" data-title="${esc(p.title.toLowerCase())} ${esc(p.firstLine.toLowerCase())}">
  ${artTag(p, 'art-thumb')}
  <div class="card-body">
    <div class="card-meta"><time datetime="${p.date}">${niceDate(p.date)}</time>${tags(p)}</div>
    <h3 class="card-title">${esc(p.title)}</h3>
    <p class="card-line">${esc(p.firstLine)}</p>
  </div>
</a>`;
}
function tile(p, link) {
  const [y, m] = p.date.split('-');
  return `<a class="tile tile-${p.mood}" href="${link(p.url)}" data-collections="${p.collections.join(' ').toLowerCase()} ${p.form}" data-title="${esc(p.title.toLowerCase())} ${esc(p.firstLine.toLowerCase())}">
  ${artTag(p, 'art-tile')}
  <span class="tile-kind"><i></i>${p.form === 'poem' ? 'poem' : 'prose'}</span>
  <span class="tile-title">${esc(p.title)}</span>
  <span class="tile-hover"><span class="tile-line">${esc(p.firstLine)}</span><time datetime="${p.date}">${MONTHS[+m - 1].slice(0, 3)} ${y}</time></span>
</a>`;
}
const SHADES = {
  blues: [['#16224a', '#a9bdf0'], ['#1c2c5e', '#c4d2f5'], ['#101a3a', '#8ea6e6'], ['#23346b', '#d8e1f8'], ['#0e1733', '#a9bdf0']],
  purple: [['#2e1240', '#dcb6ef'], ['#3c1752', '#e8cdf5'], ['#24103a', '#c79be0'], ['#4a1c5e', '#f0dcf8'], ['#2a0f3a', '#d7aef0']],
};
function hashStr(str) { let x = 2166136261; for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
function spine(p, link, maxW, maxL) {
  const [bg, fg] = (SHADES[p.mood] || SHADES.purple)[hashStr(p.slug) % 5];
  const hv = Math.sqrt(p.words / maxW).toFixed(3), wv = Math.sqrt(p.lines / maxL).toFixed(3);
  const d = niceDate(p.date);
  return `<div class="slot" data-collections="${p.collections.join(' ').toLowerCase()} ${p.form}" data-title="${esc(p.title.toLowerCase())} ${esc(p.firstLine.toLowerCase())}">
    <a class="spine" href="${link(p.url)}" style="--h:${hv};--w:${wv};--bg:${bg};--fg:${fg}" data-t="${esc(p.title)}" data-d="${d}" data-f="${p.form}" data-m="${p.mood}" data-y="${p.date.slice(0, 4)}" aria-label="${esc(p.title)}, ${d}">
      <span class="spine-mark">${p.form === 'poem' ? '❦' : '¶'}</span>
      <span class="spine-title">${esc(p.title)}</span>
      <span class="spine-mark">${p.date.slice(2, 4)}</span>
    </a>
  </div>`;
}
function shelves(link) {
  const maxW = Math.max(...pieces.map(p => p.words)), maxL = Math.max(...pieces.map(p => p.lines));
  const years = [...new Set(pieces.map(p => p.date.slice(0, 4)))];
  return years.map(y => {
    const items = pieces.filter(p => p.date.startsWith(y));
    return `<div class="shelf" data-year="${y}">
  <p class="shelf-year">${y}<span>${items.length} ${items.length === 1 ? 'piece' : 'pieces'}</span></p>
  <div class="row">
  ${items.map(p => spine(p, link, maxW, maxL)).join('\n  ')}
  </div>
</div>`;
  }).join('\n');
}
function piecesData(link) {
  return JSON.stringify(pieces.map(p => ({ t: p.title, d: p.date, s: p.slug, c: p.collections, m: p.mood, f: p.form, l: p.firstLine, w: p.words, u: link(p.url) }))).replace(/</g, '\\u003c');
}

// ---------- pages ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Home
{
  const link = makeLinker(0);
  const bodyHtml = fixRootLinks(marked.parse(about.body), link);
  // split the about markdown into sections by h2
  const parts = bodyHtml.split(/<h2>(.*?)<\/h2>/);
  const lead = parts[0];
  const sections = {};
  for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i + 1];
  const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  const before = (sections['Before this'] || '').match(/<li>([\s\S]*?)<\/li>/g) || [];
  const html = `
<main id="top">
<section class="hero has-photo">
  <div class="hero-photo" style="background-image:url('${link('assets/hero.jpg')}')" role="img" aria-label="Tannvi as a child, in a yellow sweater, on a garden chair"></div>
  <canvas class="ink" aria-hidden="true"></canvas>
  <div class="hero-inner">
    <p class="kicker">law · technology · policy · poetry</p>
    <h1 class="hero-name">${esc(about.data.name)}</h1>
    <p class="hero-line">researches <span class="rotator" data-words="responsible AI|data governance|technology policy|privacy law|poetry at 2 AM">responsible AI</span></p>
  </div>
  <a class="scroll-cue" href="#about">scroll<span></span></a>
</section>

<section class="about" id="about">
  <div class="section-label"><span>About</span></div>
  <div class="about-lead reveal">${lead}</div>
</section>

<section class="now reveal">
  <div class="section-label"><span>Now</span></div>
  <div class="now-card"><span class="pulse" aria-hidden="true"></span>${sections['Now'] || ''}</div>
</section>

<section class="timeline-wrap">
  <div class="section-label"><span>Before this</span></div>
  <ol class="timeline">
    ${before.map((li, i) => `<li class="reveal"><span class="numeral">${roman[i] || i + 1}</span><div>${li.replace(/<\/?li>/g, '')}</div></li>`).join('\n    ')}
  </ol>
</section>

<section class="also reveal">
  <div class="section-label"><span>Also</span></div>
  <div class="also-body">${sections['Also'] || ''}${sections['Outside of that'] || ''}</div>
</section>

<section class="elsewhere">
  <div class="section-label"><span>Writing elsewhere</span></div>
  <ul class="link-rows">
    ${(links['Writing elsewhere'] || []).map(l => `<li class="reveal"><a class="glow" href="${esc(l.href)}"><span class="lr-label">${esc(l.label)}</span><span class="lr-note">${esc(l.note)}</span><span class="lr-arrow" aria-hidden="true">↗</span></a></li>`).join('\n    ')}
  </ul>
</section>

</main>
<script type="application/json" id="pieces-data">${piecesData(link)}</script>`;
  write('index.html', layout({ title: `${about.data.name}`, depth: 0, body: html, bodyClass: 'home', active: 'About' }));
}

// Scratch index
function scratchPage(depth) {
  const link = makeLinker(depth);
  const years = [...new Set(pieces.map(p => p.date.slice(0, 4)))];
  const count = f => pieces.filter(p => p.form === f || p.mood === f).length;
  return layout({
    title: 'Scratch · tannvi', depth, active: 'Scratch', bodyClass: 'scratch',
    description: 'A little internet journal: poems and small essays.',
    body: `
<main>
<section class="page-head">
  <p class="kicker">a little internet journal</p>
  <h1>Scratch</h1>
</section>

<section class="controls" aria-label="Filter pieces">
  <div class="chips" role="group">
    <button class="chip" aria-pressed="true" data-filter="all">All <span>${pieces.length}</span></button>
    <button class="chip chip-poem" aria-pressed="false" data-filter="poem">Poetry <span>${count('poem')}</span></button>
    <button class="chip chip-prose" aria-pressed="false" data-filter="prose">Prose <span>${count('prose')}</span></button>
    <button class="chip chip-blues" aria-pressed="false" data-filter="blues"><i></i>Blues <span>${count('blues')}</span></button>
    <button class="chip chip-purple" aria-pressed="false" data-filter="purple"><i></i>Purple <span>${count('purple')}</span></button>
  </div>
  <div class="controls-right">
    <label class="search"><span class="sr-only">Search</span><input type="search" id="scratch-search" placeholder="search a word…" data-search></label>
    <button class="btn btn-solid" type="button" data-surprise>surprise me</button>
  </div>
</section>

<section class="shelves" data-cards>
  <div class="book-open" data-book hidden aria-live="polite"></div>
  ${shelves(link)}
</section>
<p class="empty" data-empty hidden>Nothing here with that word. Try another?</p>

<section class="sky-wrap">
  <div class="sky-head">
    <h2>The timeline</h2>
  </div>
  <div class="sky" data-sky role="img" aria-label="Every piece plotted by date"></div>
  <div class="sky-tip" data-sky-tip hidden></div>
  <div class="legend">
    <span><i class="dot dot-blues"></i>Blues</span>
    <span><i class="dot dot-purple"></i>Purple</span>
  </div>
</section>
</main>
<script type="application/json" id="pieces-data">${piecesData(link)}</script>`
  });
}
write('scratch/index.html', scratchPage(1));

// Old WordPress category addresses forward to Scratch (keeps old links alive)
for (const [p, f] of [['category/scratch/', ''], ['category/scratch/poetry/', 'poem'], ['category/scratch/blues/', 'blues'], ['category/scratch/purple/', 'purple']]) {
  const depth = p.split('/').filter(Boolean).length;
  const link = makeLinker(depth);
  const target = link('scratch/') + (f ? `#${f}` : '');
  write(p + 'index.html', `<!doctype html><meta charset="utf-8"><title>Scratch</title><meta http-equiv="refresh" content="0; url=${target}"><link rel="canonical" href="${target}"><a href="${target}">Scratch</a>`);
}

// Piece pages
pieces.forEach((p, i) => {
  const depth = 4;
  const link = makeLinker(depth);
  const newer = pieces[i - 1], older = pieces[i + 1];
  const mins = Math.max(1, Math.round(p.words / 200));
  const body = `
<div class="progress" aria-hidden="true"><span></span></div>
<main class="piece mood-${p.mood}">
  <header class="piece-head">
    ${artTag(p, 'art-hero')}
    <div class="piece-head-inner">
      <p class="piece-meta"><time datetime="${p.date}">${niceDate(p.date)}</time><span>·</span>${p.form === 'poem' ? 'poem' : 'prose'}<span>·</span>${mins} min</p>
      <h1>${esc(p.title)}</h1>
      <div class="piece-tags">${tags(p)}</div>
    </div>
  </header>
  <article class="piece-body ${p.form} ${p.style.split(' ').filter(Boolean).map(s => 'is-' + s).join(' ')}${p.warning ? ' has-warning' : ''}">
    ${p.warning ? `<div class="warning" data-warning><p class="warning-label">Content note</p><p>This piece touches on ${esc(p.warning.toLowerCase())}.</p><button class="btn" type="button" data-reveal>read on</button></div>` : ''}
    <div class="piece-text">${p.html}</div>
    <p class="fin" aria-hidden="true">❦</p>
  </article>
  <nav class="piece-nav" aria-label="More pieces">
    ${older ? `<a class="pn pn-prev glow" href="${link(older.url)}" data-key="ArrowLeft"><span class="pn-dir">← older</span><span class="pn-title">${esc(older.title)}</span></a>` : '<span></span>'}
    <a class="pn pn-all" href="${link('scratch/')}">all of Scratch</a>
    ${newer ? `<a class="pn pn-next glow" href="${link(newer.url)}" data-key="ArrowRight"><span class="pn-dir">newer →</span><span class="pn-title">${esc(newer.title)}</span></a>` : '<span></span>'}
  </nav>
</main>`;
  write(p.url + 'index.html', layout({ title: `${p.title} · tannvi`, description: p.firstLine, depth, body, bodyClass: 'piece-page', active: 'Scratch' }));
});

// Lists
lists.forEach((l, idx) => {
  const depth = 1;
  const link = makeLinker(depth);
  const done = l.items.filter(i => i.done).length;
  const other = lists[1 - idx];
  const body = `
<main>
<section class="page-head list-head">
  <div>
    <p class="kicker"><a class="text-link" href="${link('lists/')}">bucket lists</a></p>
    <h1>${esc(l.title)}</h1>
    <p class="page-intro">${esc(l.intro || '')}</p>
    <p class="list-switch">also: <a class="text-link" href="${link(other.url)}">${esc(other.title)}</a></p>
  </div>
  <div class="ring" style="--p:${(done / l.items.length).toFixed(4)}" role="img" aria-label="${done} of ${l.items.length} done">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" pathLength="1"/></svg>
    <div class="ring-label"><strong>${done}</strong><span>of ${l.items.length} done</span></div>
  </div>
</section>
<section class="controls" aria-label="Filter list">
  <div class="chips" role="group">
    <button class="chip" aria-pressed="true" data-lfilter="all">All</button>
    <button class="chip" aria-pressed="false" data-lfilter="todo">Still to do</button>
    <button class="chip" aria-pressed="false" data-lfilter="done">Done</button>
  </div>
  <div class="controls-right"><button class="btn" type="button" data-dice>what next? ⚄</button></div>
</section>
<ol class="wish">
  ${l.items.map(it => `<li class="wish-item glow${it.done ? ' done' : ''}" data-done="${it.done}"><span class="wish-n">${String(it.n).padStart(2, '0')}</span><span class="wish-t">${it.html}</span><span class="wish-mark" aria-label="${it.done ? 'done' : 'not yet'}">${it.done ? '✓' : ''}</span></li>`).join('\n  ')}
</ol>
</main>`;
  write(l.url.replace(/^\//, '') + 'index.html', layout({ title: `${l.title} · tannvi`, depth, body, bodyClass: 'list-page', active: 'Bucket lists' }));
});

// Bucket lists landing page
{
  const depth = 1;
  const link = makeLinker(depth);
  const body = `
<main>
<section class="page-head">
  <p class="kicker">things to do</p>
  <h1>Bucket lists</h1>
</section>
<section class="list-cards">
  ${lists.map((l, i) => {
    const done = l.items.filter(x => x.done).length;
    const next = l.items.filter(x => !x.done).slice(0, 3);
    return `<a class="list-card list-card-${i} glow" href="${link(l.url)}">
    <div class="ring ring-sm" style="--p:${(done / l.items.length).toFixed(4)}" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" pathLength="1"/></svg>
      <div class="ring-label"><strong>${done}</strong><span>of ${l.items.length}</span></div>
    </div>
    <div class="list-card-body">
      <h2>${esc(l.title)}</h2>
      <p class="lc-intro">${esc(l.intro || '')}</p>
      <ul class="lc-next">${next.map(x => `<li>${x.html}</li>`).join('')}</ul>
      <span class="lc-open">open the list →</span>
    </div>
  </a>`;
  }).join('\n  ')}
</section>
</main>`;
  write('lists/index.html', layout({ title: 'Bucket lists · tannvi', depth, body, bodyClass: 'lists-page', active: 'Bucket lists' }));
}

// Opinions: list page and one page per article
{
  const depth = 1;
  const link = makeLinker(depth);
  const list = articles.length
    ? `<ol class="op-list">
  ${articles.map(a => `<li><a class="op-row glow" href="${link(a.url)}">
    <time datetime="${a.date}">${niceDate(a.date)}</time>
    <span class="op-title">${esc(a.title)}</span>
    ${a.subtitle ? `<span class="op-sub">${esc(a.subtitle)}</span>` : ''}
  </a></li>`).join('\n  ')}
</ol>`
    : `<p class="op-empty">Coming soon.</p>`;
  const body = `
<main>
<section class="page-head">
  <h1>Opinions</h1>
</section>
<section class="op-wrap">
${list}
</section>
</main>`;
  write('opinions/index.html', layout({ title: 'Opinions · tannvi', depth, body, bodyClass: 'opinions-page', active: 'Opinions' }));
}
articles.forEach(a => {
  const depth = 2;
  const link = makeLinker(depth);
  const mins = Math.max(1, Math.round(a.words / 200));
  const body = `
<div class="progress" aria-hidden="true"><span></span></div>
<main class="piece">
  <header class="op-head">
    <p class="piece-meta"><time datetime="${a.date}">${niceDate(a.date)}</time><span>·</span>${mins} min</p>
    <h1>${esc(a.title)}</h1>
    ${a.subtitle ? `<p class="op-head-sub">${esc(a.subtitle)}</p>` : ''}
    ${a.published ? `<p class="op-pub">First published in ${a.link ? `<a class="text-link" href="${esc(a.link)}">${esc(a.published)}</a>` : esc(a.published)}</p>` : ''}
  </header>
  <article class="piece-body prose">
    <div class="piece-text">${fixRootLinks(a.html, link)}</div>
  </article>
  <nav class="piece-nav" aria-label="More">
    <span></span><a class="pn pn-all" href="${link('opinions/')}">all opinions</a><span></span>
  </nav>
</main>`;
  write(a.url + 'index.html', layout({ title: `${a.title} · tannvi`, description: a.subtitle, depth, body, bodyClass: 'piece-page', active: 'Opinions' }));
});

// Anthologies
{
  const depth = 1;
  const body = `
<main>
<section class="page-head">
  <p class="kicker">in print</p>
  <h1>Anthologies</h1>
  <p class="page-intro">Collections my poems have appeared in.</p>
</section>
<section class="books">
  ${books.map(b => `<article class="book">
    <div class="book-3d" data-tilt><div class="book-fallback" aria-hidden="true"><div class="art" data-seed="${esc(b.title)}" data-mood="ember"></div><strong>${esc(b.title)}</strong><span>anthology</span></div>${b.cover ? `<img src="${esc(b.cover)}" alt="Cover of ${esc(b.title)}" loading="lazy" onerror="this.remove()">` : ''}<span class="book-shine" aria-hidden="true"></span></div>
    <h2>${esc(b.title)}</h2>
    <p class="book-links">${b.links.map(l => `<a class="text-link" href="${esc(l.href)}">${esc(l.label)}</a>`).join('<span>·</span>')}</p>
  </article>`).join('\n  ')}
</section>
</main>`;
  write('anthologies/index.html', layout({ title: 'Anthologies · tannvi', depth, body, bodyClass: 'books-page', active: 'Anthologies' }));
}

// 404
{
  const body = `<main><section class="page-head lost"><p class="kicker">404</p><h1>Lost, a little.</h1><p class="page-intro">This page doesn't exist, or it has been archived for a rewrite.</p><p><a class="btn" href="/">go home</a></p></section></main>`;
  write('404.html', layout({ title: 'Not found · tannvi', depth: 'abs', body }));
}

// Static assets
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'sitemap.txt'), ['', 'scratch/', 'opinions/', ...articles.map(a => a.url), 'before-i-die/', '25-before-25/', 'anthologies/', ...pieces.map(p => p.url)].map(u => `${SITE_URL}/${u}`).join('\n') + '\n');

console.log(`Built ${pieces.length} pieces, ${lists.length} lists, ${books.length} books into _site/${PREVIEW ? ' (preview links)' : ''}`);
