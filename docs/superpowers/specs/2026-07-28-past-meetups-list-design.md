# Spec — Past meetups list page (`meetups.html`)

**Date:** 2026-07-28
**Status:** approved (brainstorm)
**Consulted:** `docs/data-schema.md`, `scripts/lib/emit.mjs`, `scripts/build-data.mjs`,
`site/site.js`, `site/index.html`, `site/meetup.html`, `site/moderators.html`,
`site/ui-strings.json`, `README.md`, Locked decisions in `CLAUDE.md`.

## Goal

Give the community a browsable **archive of past meetups**. Each entry shows the meetup date, its
talk/chat segments (talk titles + speakers), and the number of participants, and links through to the
existing meetup detail page. This turns the "Meetups" nav — today a single-detail view — into a real
list.

## Scope & non-goals

- **Frontend-only.** No schema, validator, build, or `data/` changes. The built
  `data/meetups/index.json` already carries everything needed: `id`, `date`, `timezone`,
  `start`/`end`, `attendees`, and `segments` (`type`, `title`, `speaker`).
- **Past meetups only.** Upcoming meetups stay surfaced on the landing page (featured + coming-up
  strip). The archive is the "what already happened" view — analogous to a blog archive.
- **No new fetch/caching behavior.** Reuses `fetchJson()` and the existing `index.json` load; the
  `docs/data-schema.md` delivery section is untouched.
- Not building: filtering, search, pagination, per-year grouping, or an upcoming section on this page.

## Locked-decision check

- Vanilla HTML/CSS/JS, no framework, no client runtime deps — obeyed (plain page + `site.js`
  renderer). → framework lock
- Data schema is the stable contract — untouched here (pure consumer of existing `index.json`). →
  schema-stability lock
- Bilingual from day one — new UI strings added in both `en`/`zh`; segment titles already use the
  string-or-`{en,zh}` shape via `pick()`. → bilingual lock
- Publish only `dist/` — unaffected; new file lives under `site/`, copied by the existing build. →
  publish lock

## Architecture

### 1. New page: `site/meetups.html`

A clone of the existing page shell (header/nav/footer, theme pre-paint inline script, `site.css`
link, `site.js` module). Distinct parts:

- `<body data-page="meetups">`
- `<main>` containing `<h1 data-i18n="meetups.pastHeading"></h1>` and `<div id="meetup-list"></div>`
- `<noscript>` line consistent with the other pages.

### 2. Nav repoint (all four pages)

The **"Meetups" nav link** changes from `./meetup.html` → `./meetups.html` in **all four** HTML files
(`index.html`, `meetup.html`, `moderators.html`, `meetups.html`). Label stays `nav.meetups`
("Meetups" / "聚會"). The detail page (`meetup.html#id`) is no longer a top-level nav target — it is
reached only by clicking a row.

### 3. `site.js` — new renderer

Add to the boot dispatch in `main()`:

```
else if (page === 'meetups') await initMeetups();
```

- `initMeetups()` — `fetchJson('./data/meetups/index.json')`, store it, set
  `renderPage = renderMeetups`, render. (No `community.json` needed.)
- `renderMeetups()` — compute `splitMeetups(index).past` (already most-recent-first). If empty,
  render a single empty-state card (`meetups.none`). Otherwise render one row per past meetup.

**New helper** `formatMeetupDate(m)` — returns a language-aware date string in the meetup's timezone
(`weekday, month day, year`) via `Intl.DateTimeFormat`, no time range. Lighter than
`formatMeetupTimes()` for an archive; recomputed on every language toggle by `applyLang()`'s
re-render. Uses `locale = lang === 'zh' ? 'zh-TW' : 'en-US'` and `timeZone: m.timezone`, matching the
existing formatter's conventions.

**Row** — a clickable `<a class="card" href="./meetup.html#${m.id}">` (same anchor-card pattern as
`meetupCard`):

1. Date line: `el('p', { class: 'card-time', text: formatMeetupDate(m) })`.
2. Attendees: when `Number.isInteger(m.attendees)`, append
   `el('p', { class: 'attendees', text: \`👥 ${m.attendees} ${t('meetup.aitians')}\` })`
   (reuses the detail page's existing string + class). **Omitted when `attendees` is `null`.**
3. Segment list `<ul>`: one `<li>` per segment (talks **and** chat, in file order):
   - `talk`: `\`${pick(seg.title)}${seg.speaker ? ' — ' + seg.speaker : ''}\``
   - `chat`: `pick(seg.title)` (speaker appended the same way only if present).
   - Unknown future types degrade to `pick(seg.title)` (or the raw type if title is empty), matching
     the graceful-degradation intent of the existing `segmentLabel`.
   A past meetup with zero segments renders just the date (+ attendees if present).

All data strings go through `el(...,{text})` / `pick()` (textContent) — no new `innerHTML` sink, so
the `site.js` safety invariant (spec §2.7) holds.

### 4. i18n — `site/ui-strings.json`

Add:

- `meetups.pastHeading`: `{ "en": "Past meetups", "zh": "歷次聚會" }`
- `meetups.none`: `{ "en": "No past meetups yet.", "zh": "還沒有過往的聚會。" }`

Reuse existing `meetup.aitians` for the 👥 count. `nav.meetups` already exists.

### 5. CSS — `site/site.css`

Add list/row styles reusing existing `.card` design tokens (spacing, radius, hover). A `.meetup-list`
container (vertical stack) and minor tweaks so the date/attendees/segment `<ul>` stack cleanly. **No
theme-token (`:root` block) changes**, so `docs/theming.md` is untouched.

## Data flow

```
meetups.html  ──dispatch──►  initMeetups()
                                  │  fetchJson index.json
                                  ▼
                            renderMeetups()
                                  │  splitMeetups().past (most-recent-first)
                                  ▼
                     rows: <a href="meetup.html#id"> date · 👥 N · [segment titles]
                                  │  click
                                  ▼
                     meetup.html#id  (existing detail renderer, unchanged)
```

## Error / edge handling

- **No past meetups:** single empty-state card with `meetups.none`.
- **`attendees === null`:** count omitted (schema hide-while-null rule).
- **Meetup with no talks (chat-only or empty):** date (+ attendees) render; talk list may be empty.
- **Unknown segment type:** falls back to the segment title text.
- **Fetch failure:** handled by the existing top-level `main().catch` error card — no new path.

## Testing

- No build/data change → existing `scripts/test` suite still covers the data layer and passes.
- Manual, via `npm run build && npx serve dist`:
  - `/meetups.html` lists past meetups most-recent-first; each row links to the correct
    `meetup.html#id`.
  - Language toggle re-renders dates, the 👥 label, and titles.
  - Attendees hidden on a meetup with `attendees: null`; shown when an integer.
  - Chat segment titles appear in rows alongside talks.
  - Empty state shows when no meetup is in the past.
  - Nav "Meetups" now lands on the list from every page.

## Docs to fold back (end-of-session gate)

- `docs/wording.md` — add the two new strings (same PR as `ui-strings.json`).
- `docs/devlog.md` — new newest-on-top entry, link this spec + the plan.
- `todo.md` — mark the item.
- `CHANGELOG.md` — user-visible feature entry.
- `docs/data-schema.md`, `docs/theming.md` — **not** touched (no schema or token change).
