# Speaker links + speaker sub-panel — design spec

**Date:** 2026-07-10
**Status:** approved (brainstorm session, SansWord)
**Docs consulted:** `docs/kickstart.md` (§ Moderators & speakers, § privacy table),
`docs/data-schema.md`, `data/meetups/_template.md`, `data/moderators/_template.md`,
`scripts/lib/validate.mjs`, `scripts/lib/emit.mjs`, `site/site.js`, `site/site.css`.

## Goal

1. Speakers in meetup files can list their public links (LinkedIn, GitHub, portfolio…), the same
   way moderators do in `data/moderators/*.md`.
2. On the meetup detail page (`meetup.html`), the speaker (name, bio, links) reads as a distinct
   block inside each segment card, visually separated from the talk/chat content.

kickstart deferred reusable speaker profiles (`data/people/`) — speaker info stays inline in the
meetup file. This feature is an additive field on the segment, per the schema's evolution rules.

## Decisions (made in this session)

- **Field name: `segments[].links`** — SansWord's call, chosen over `speakerLinks`. The schema doc
  states explicitly that on a segment these are **the speaker's links**; a future talk-level links
  field would need a different name.
- **Layout: tinted sub-panel** — the speaker block renders as a slightly shaded, rounded inset box
  at the bottom of the segment card (a mini profile card), chosen over a plain divider or an
  indented group.

## 1. Schema

New optional segment field in `data/meetups/*.md`:

| Field | Required | Type | Notes |
|---|---|---|---|
| `segments[].links` | – | list of `{label, url}` | the speaker's links; same shape as moderator `links`; requires `speaker` on the same segment |

- `label`: string or `{en, zh}`, required per entry. `url`: `http(s)://` only, required.
- Allowed on `talk` and `chat` segments alike, but a segment with `links` and no non-empty
  `speaker` is a CI error — links belong to a person.
- Same-PR updates (schema-stability rule): `docs/data-schema.md` (meetup table + "What CI
  rejects"), `data/meetups/_template.md`, `data/meetups/README.md` (step 3 field list).

## 2. Build pipeline

- **Validator (`scripts/lib/validate.mjs`):**
  - Add `links` to `SEGMENT_KEYS`.
  - Extract the moderator link-list validation loop into one shared helper (list shape, unknown
    keys per entry, bilingual required label, http(s) url) used by both `validateModerator` and
    `validateMeetup` — identical rules, identical error wording.
  - New check: `segments[i].links` present ⇒ `segments[i].speaker` must be a non-empty string.
- **Emit (`scripts/lib/emit.mjs`):**
  - `meetupToJson`: each emitted segment gains `links: (seg.links ?? []).map(({label, url}) => ({label, url}))`.
  - `meetupIndexEntry` unchanged — landing / coming-up cards keep showing only the speaker name;
    links appear on the detail page only.

## 3. Frontend (`site/site.js` + `site/site.css`)

Segment card render order becomes: **label → title → materials link → speaker sub-panel**
(materials is talk content; it moves above the speaker block).

Speaker sub-panel:

- `div.segment-speaker-card`, rendered whenever the segment has a `speaker`. Contains, each only
  when present: speaker name, `speakerBioHtml` (existing sanitized-HTML sink), and a link row.
- Link row anchors: `href` from data (build-validated http(s)), `target="_blank"
  rel="noopener"`, label via the bilingual `pick()` — mirroring `.mod-links` on moderators.html.
- CSS: tinted background, rounded corners, padding; reuse existing theme tokens if a suitable
  surface tint exists, otherwise add a token — a new token means `docs/theming.md` updates in the
  same PR. Dark-theme + no-preference media-query overrides follow the existing `.segment`
  pattern.
- No new UI-chrome strings → `docs/wording.md` untouched.

## 4. Error handling

All rejection happens at CI/build time (strict validator); the client renders only
build-validated JSON, and absent `links` emits `[]` so the frontend needs no null-guard beyond
`length > 0`. XSS posture unchanged: labels/names via `textContent`, only build-sanitized
`speakerBioHtml` hits `innerHTML`, URLs are validator-guaranteed http(s).

## 5. Testing

- `scripts/test/validate-meetup.test.mjs`: valid links accepted (plain + bilingual label); rejects
  non-http(s) url, missing label, missing url, unknown link keys, non-list `links`, and
  links-without-speaker (talk with empty speaker is already an error; cover chat + links + no
  speaker).
- `scripts/test/validate-others.test.mjs`: moderator link validation still passes via the shared
  helper (existing cases keep passing).
- `scripts/test/emit.test.mjs`: links pass through to the detail JSON; absent → `[]`; index
  entries carry no links.
- Manual: `node scripts/build-data.mjs`, open `meetup.html` locally, check the sub-panel in both
  themes and both languages.

## Out of scope

- Reusable speaker profiles (`data/people/`) — still deferred per kickstart.
- Links on landing/coming-up cards.
- Any change to moderator schema or rendering (it only donates its validation logic to a shared
  helper).
