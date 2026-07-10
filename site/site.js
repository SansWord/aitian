// Shared frontend runtime for all three pages. Each page sets
// <body data-page="..."> and this module dispatches to its renderer.
//
// Safety (spec §2.7): all data-sourced strings are inserted via textContent
// (the el() helper). The only innerHTML sinks are the `html:` attribute and
// the landing intro assignment in renderLanding — both restricted to
// build-sanitized HTML (bodyHtml / speakerBioHtml fields).
// URL-typed fields land in href/src — the build validator guarantees http(s).

const LANG_KEY = 'aitian.lang';
const THEME_KEY = 'aitian.theme';
const GRACE_MS = 60 * 60 * 1000; // stays "upcoming" until 1h past its end (spec §2.4)

let strings = {};
let lang = 'en';
let renderPage = () => {};

// localStorage can throw (private mode) — never fatal.
function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }

// ---------- i18n (spec §2.5) ----------
function detectLang() {
  const saved = storageGet(LANG_KEY);
  if (saved === 'en' || saved === 'zh') return saved;
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function t(key) {
  return strings[key]?.[lang] ?? key;
}

// Data fields are a plain string (serves both languages) or an {en, zh} map.
function pick(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.en ?? value.zh ?? '';
}

function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  document.getElementById('lang-toggle').textContent = t('toggle.lang');
  renderPage();
}

// ---------- theme (spec §2.6) ----------
function detectTheme() {
  const saved = storageGet(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------- data ----------
async function fetchJson(relPath) {
  // GitHub Pages serves max-age=600; 'no-cache' forces an ETag revalidation
  // (304 when unchanged) so freshly deployed data shows up immediately.
  const res = await fetch(relPath, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${relPath}: HTTP ${res.status}`);
  return res.json();
}

// The one helper behind the featured pick, the coming-up strip, and every
// upcoming/past split (spec §2.4). `index` is sorted ascending by start.
function splitMeetups(index, now = Date.now()) {
  const upcoming = index.filter((m) => Date.parse(m.end) + GRACE_MS > now);
  const past = index.filter((m) => Date.parse(m.end) + GRACE_MS <= now).reverse();
  return { featured: upcoming[0] ?? null, upcoming, past };
}

// ---------- time display (spec §2.2): Pacific first, Taipei reminder ----------
function formatMeetupTimes(m) {
  const start = new Date(m.start);
  const end = new Date(m.end);
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: m.timezone, weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: m.timezone, hour: 'numeric', minute: '2-digit', hour12: true,
  });
  let zone = '';
  for (const style of ['shortGeneric', 'short']) {
    try {
      zone = new Intl.DateTimeFormat('en-US', { timeZone: m.timezone, timeZoneName: style })
        .formatToParts(start)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
      break;
    } catch { /* older engine without shortGeneric — fall back */ }
  }
  const home = `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)} ${zone}`;
  // The Taipei reminder carries its own weekday — Tuesday evening PT is
  // Wednesday morning in Taipei (spec §2.2).
  const tpeDay = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short' })
    .format(start);
  const tpeTime = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const taipei = `台北時間${tpeDay} ${tpeTime.format(start)} – ${tpeTime.format(end)}`;
  return { home, taipei };
}

// ---------- DOM helper ----------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // build-sanitized HTML ONLY
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

// Segment lines for cards: "Talk 1: title — speaker". Unknown types render
// generically by their raw type so future enum additions degrade gracefully
// (spec §1.2).
function segmentLabel(seg, talkNumber) {
  if (seg.type === 'talk') return `${t('segment.talk')} ${talkNumber}`;
  if (seg.type === 'chat') return t('segment.chat');
  return seg.type;
}

function segmentListItems(segments) {
  let talkN = 0;
  return segments.map((seg) => {
    if (seg.type === 'talk') talkN += 1;
    const speaker = seg.speaker ? ` — ${seg.speaker}` : '';
    return el('li', { text: `${segmentLabel(seg, talkN)}: ${pick(seg.title)}${speaker}` });
  });
}

function meetupCard(m, { featured = false } = {}) {
  const { home, taipei } = formatMeetupTimes(m);
  const tba = m.segments.length === 0;
  // TBA weeks link the CTA row; booked weeks link their detail page (§2.1).
  const card = el('a', {
    class: featured ? 'card card-featured' : 'card',
    href: tba ? './index.html#cta' : `./meetup.html#${m.id}`,
  });
  card.append(el('p', { class: 'card-time', text: home }));
  card.append(el('p', { class: 'card-time-tpe', text: taipei }));
  if (tba) card.append(el('p', { class: 'card-tba', text: t('meetup.tba') }));
  else card.append(el('ul', {}, segmentListItems(m.segments)));
  return card;
}

function noneScheduledCard() {
  return el('a', { class: 'card card-featured', href: './index.html#cta' }, [
    el('p', { class: 'card-tba', text: t('meetup.noneScheduled') }),
  ]);
}

// ---------- landing ----------
let landingData = null;

async function initLanding() {
  const [community, meetupIndex] = await Promise.all([
    fetchJson('./data/community.json'),
    fetchJson('./data/meetups/index.json'),
  ]);
  landingData = { community, meetupIndex };
  renderPage = renderLanding;
  renderPage();
}

function renderLanding() {
  const { community, meetupIndex } = landingData;
  document.getElementById('tagline').textContent = pick(community.tagline);

  document.getElementById('cta').replaceChildren(
    ...community.ctas.map((cta) =>
      cta.href
        ? el('a', { class: 'cta', href: cta.href, text: pick(cta.label) })
        : el('button', { class: 'cta', type: 'button', disabled: '', text: pick(cta.label) }),
    ),
  );

  document.getElementById('intro').innerHTML = community.bodyHtml?.[lang] || '';

  const { featured, upcoming } = splitMeetups(meetupIndex);
  document.getElementById('featured').replaceChildren(
    el('h2', { text: t('landing.next') }),
    featured ? meetupCard(featured, { featured: true }) : noneScheduledCard(),
  );

  const rest = upcoming.slice(1, 4); // the following 3 Tuesdays (§2.1)
  document.getElementById('coming-up').replaceChildren(
    ...(rest.length
      ? [el('h2', { text: t('landing.comingUp') }), el('div', { class: 'strip' }, rest.map((m) => meetupCard(m)))]
      : []),
  );
}

// ---------- meetup detail (filled in by the meetup.html task) ----------
let meetupIndexCache = null;

async function initMeetup() {
  meetupIndexCache = await fetchJson('./data/meetups/index.json');
  renderPage = () => { renderMeetupFromHash(); };
  window.addEventListener('hashchange', () => renderPage());
  renderPage();
}

async function renderMeetupFromHash() {
  const container = document.getElementById('meetup');
  const hash = decodeURIComponent(location.hash.slice(1));
  const { featured, past } = splitMeetups(meetupIndexCache);

  if (hash && !meetupIndexCache.some((m) => m.id === hash)) {
    container.replaceChildren(
      el('div', { class: 'not-found' }, [
        el('p', { text: t('meetup.notFound') }),
        el('a', { href: './index.html', text: t('meetup.backHome') }),
      ]),
    );
    return;
  }

  // No hash → next upcoming; schedule exhausted → most recent past (§2.4).
  const id = hash || featured?.id || past[0]?.id;
  if (!id) {
    container.replaceChildren(noneScheduledCard());
    return;
  }

  const m = await fetchJson(`./data/meetups/${id}.json`);
  const { home, taipei } = formatMeetupTimes(m);
  const kids = [
    el('p', { class: 'detail-time', text: home }),
    el('p', { class: 'detail-time-tpe', text: taipei }),
  ];
  if (Number.isInteger(m.attendees)) {
    kids.push(el('p', { class: 'attendees', text: `👥 ${m.attendees} ${t('meetup.aitians')}` }));
  }
  if (m.bodyHtml?.[lang]) kids.push(el('div', { class: 'meetup-intro', html: m.bodyHtml[lang] }));

  if (m.segments.length === 0) {
    kids.push(el('a', { class: 'card', href: './index.html#cta' }, [
      el('p', { class: 'card-tba', text: t('meetup.tba') }),
    ]));
  } else {
    let talkN = 0;
    for (const seg of m.segments) {
      if (seg.type === 'talk') talkN += 1;
      const sec = el('section', { class: 'segment' });
      sec.append(el('h3', { class: 'segment-label', text: segmentLabel(seg, talkN) }));
      sec.append(el('p', { class: 'segment-title', text: pick(seg.title) }));
      if (seg.speaker) sec.append(el('p', { class: 'segment-speaker', text: seg.speaker }));
      if (seg.speakerBioHtml?.[lang]) {
        sec.append(el('p', { class: 'segment-bio', html: seg.speakerBioHtml[lang] }));
      }
      if (seg.materialsUrl) {
        sec.append(el('a', {
          class: 'segment-materials',
          href: seg.materialsUrl,
          target: '_blank',
          rel: 'noopener',
          text: t('meetup.materials'),
        }));
      }
      kids.push(sec);
    }
  }
  // The fetch above yielded — if the hash changed while it was in flight,
  // drop this stale render (the newer call owns the DOM).
  if (decodeURIComponent(location.hash.slice(1)) !== hash) return;
  container.replaceChildren(...kids);
}

// ---------- moderators (filled in by the moderators.html task) ----------
let moderatorsData = null;

async function initModerators() {
  const index = await fetchJson('./data/moderators/index.json');
  moderatorsData = await Promise.all(index.map((m) => fetchJson(`./data/moderators/${m.id}.json`)));
  renderPage = renderModerators;
  renderPage();
}

function renderModerators() {
  document.getElementById('moderators').replaceChildren(
    ...moderatorsData.map((mod) => {
      const card = el('article', { class: 'mod-card' });
      card.append(el('img', {
        class: 'avatar',
        src: `./data/moderators/avatars/${mod.avatar}`,
        alt: mod.name,
        width: '96',
        height: '96',
      }));
      card.append(el('h3', { text: mod.name }));
      card.append(el('p', { class: 'mod-bio', text: pick(mod.bio) }));
      if (mod.links.length > 0) {
        card.append(el('p', { class: 'mod-links' },
          mod.links.map((l) => el('a', {
            href: l.url, target: '_blank', rel: 'me noopener', text: pick(l.label),
          })),
        ));
      }
      if (mod.bodyHtml?.[lang]) card.append(el('div', { class: 'mod-intro', html: mod.bodyHtml[lang] }));
      return card;
    }),
  );
}

// ---------- boot ----------
async function main() {
  document.documentElement.dataset.theme = detectTheme();
  lang = detectLang();
  strings = await fetchJson('./ui-strings.json');
  applyLang(); // static labels first — page data may still be loading

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storageSet(THEME_KEY, next);
  });
  document.getElementById('lang-toggle').addEventListener('click', () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    storageSet(LANG_KEY, lang);
    applyLang(); // re-renders the page in the new language
  });

  const page = document.body.dataset.page;
  if (page === 'landing') await initLanding();
  else if (page === 'meetup') await initMeetup();
  else if (page === 'moderators') await initModerators();
}

main().catch((err) => {
  console.error(err);
  const mainEl = document.querySelector('main');
  if (mainEl) {
    const p = document.createElement('p');
    p.className = 'not-found';
    p.textContent = 'Something went wrong loading the page data — try refreshing.';
    mainEl.replaceChildren(p);
  }
});
