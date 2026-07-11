# RSVP button on the meetup detail page — implementation plan

**Spec:** [2026-07-10-rsvp-button-design.md](../specs/2026-07-10-rsvp-button-design.md)
**Branch:** `feat/rsvp-button` · **Version:** v0.7.0

## Task 1 — render the RSVP CTA in `site/site.js`

- `initMeetup()`: fetch `./data/community.json` in parallel with `./data/meetups/index.json`
  (`Promise.all`), stash beside `meetupIndexCache`.
- `renderMeetupFromHash()`: after the two time lines, when the `rsvp` CTA exists with a non-empty
  `href` **and** `Date.parse(m.end) + GRACE_MS > Date.now()`, append
  `el('p', {class: 'detail-rsvp'}, [el('a', {class: 'cta', href, text: pick(label)})])`.

## Task 2 — spacing rule in `site/site.css`

- `.detail-rsvp { margin: 1.2rem 0 0; }` near the other `.detail-*` rules.

## Task 3 — maintained docs (same PR)

- `docs/data-schema.md`: `ctas[].id` example ids → the real live id (`rsvp`).
- `docs/wording.md`: CTA table — note the button renders on the landing hero **and** on upcoming
  meetup detail pages.

## Task 4 — verify

- `npm test` (build suite stays green), `npm run build`, serve `dist/`, manually check:
  upcoming meetup shows the button (EN + 中文 labels), past meetup hash shows none.

## Task 5 — close the loop

- Devlog `v0.7.0` entry + TL;DR row; `todo.md` gains the PR-review line.
