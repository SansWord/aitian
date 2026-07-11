# Data schema — the `data/` contract

The files under `data/` are this project's **stable backend**. The frontend look-and-feel may be
rewritten freely; this schema is expected to survive redesigns with few-to-zero migrations.
The generated JSON under `dist/data/` is an internal artifact — never committed, free to change.

**This doc, the validator (`scripts/build-data.mjs`), and the `_template.md` files must agree.**
Any schema change updates all three in the same PR — CI's strict validation (unknown fields are
errors) makes a lagging validator impossible to hide.

## Contributing an entry

1. Copy the `_template.md` in the right folder (`data/meetups/` or `data/moderators/`), rename it,
   fill it in, open a PR. Templates (`_*.md`) and `README.md` are skipped by validation and never
   rendered.
2. CI validates every file on your PR and lists every problem with its file and field.
3. A maintainer merges; the site redeploys automatically.

**The filename is the id and the citable URL** (`2026-07-14-ai-role-play.md` →
`meetup.html#2026-07-14-ai-role-play`). Never rename a file after it has deployed — reschedules
change the `date` field, not the filename. Don't put `id:` in frontmatter; the validator rejects it.

## Bilingual fields — one rule per shape

- **Short strings** (titles, bios, labels, taglines): either a plain string (renders for both
  languages) or an `{en, zh}` map. Either key may be omitted (at least one required); a missing
  language falls back to the one provided.
- **Prose bodies**: `## en` / `## zh` markdown sections. A body with only one section (or no
  language headings at all) renders for both languages.
- Adding a translation later is a content edit, never a schema migration.

## Meetup — `data/meetups/YYYY-MM-DD[-slug].md`

The slug is optional (use it to make the URL readable / disambiguate two events on one date);
TBA weeks use the bare date. The slug is chosen at creation only — a deployed TBA file that later
gets booked keeps its bare-date name (the never-rename rule above), so booked ≠ has-slug. Dates are the meetup's **US-Pacific calendar date** — a Tuesday-evening
PT meetup is Wednesday morning in Taipei and still uses the Tuesday PT date.

| Field | Required | Type | Notes |
|---|---|---|---|
| `date` | ✅ | `YYYY-MM-DD` string | calendar date in the meetup's timezone |
| `startTime` | – | `"HH:MM"` 24h string (quote it!) | overrides the `community.md` default |
| `endTime` | – | `"HH:MM"` string | overrides the default |
| `timezone` | – | IANA name | overrides the default (`America/Los_Angeles`) |
| `segments` | ✅ | list (may be `[]`) | `[]` renders as "TBA — want to speak?" |
| `segments[].type` | ✅ | `talk` \| `chat` | new types arrive as additive changes |
| `segments[].title` | ✅ | string or `{en, zh}` | |
| `segments[].speaker` | talk: ✅ | plain string | display name |
| `segments[].speakerBio` | – | string or `{en, zh}` | 1–2 sentences; markdown links OK, `http(s)://` only |
| `segments[].materialsUrl` | – | `http(s)://` URL or `""` | |
| `segments[].links` | – | list of `{label, url}` | the **speaker's** links (same shape as moderator `links`); `label` string or `{en, zh}`, `url` `http(s)://`; requires a non-empty `speaker` on the same segment |
| `attendees` | – | integer ≥ 0 or `null` | back-fill after the event; hidden while null |

Body (optional): meetup-level intro, markdown, `## en` / `## zh` sections.

## Moderator — `data/moderators/<slug>.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✅ | plain string | display name |
| `bio` | ✅ | string or `{en, zh}` | one-liner for the grid card |
| `avatar` | – | bare filename | must exist in `data/moderators/avatars/`, file ≤ 500 KB (CI-enforced); omitted → `default.png` |
| `links` | – | list of `{label, url}` | any networks/portfolio; `label` string or `{en, zh}`, `url` `http(s)://` |

Body (optional): longer intro, markdown, `## en` / `## zh` sections. Avatar image files live in
`data/moderators/avatars/` (owned by the data layer, so redesigns can't orphan them). Square image
(PNG/JPG/SVG), 256–512px recommended — the site renders a 96px center-cropped circle, so exact
dimensions are forgiving; **file size ≤ 500 KB is CI-enforced** (repo bloat is the one irreversible mistake).

## Community — `data/community.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `tagline` | ✅ | string or `{en, zh}` | hero tagline |
| `schedule.timezone` | ✅ | IANA name | default for every meetup |
| `schedule.startTime` / `.endTime` | ✅ | `"HH:MM"` strings | defaults, per-meetup overridable |
| `ctas[].id` | ✅ | string | stable key the frontend can target — every CTA renders on the landing hero and on upcoming meetup detail pages |
| `ctas[].label` | ✅ | string or `{en, zh}` | |
| `ctas[].href` | – | `http(s)://` URL or `""` | `""` renders a disabled placeholder button |

Body: the community intro, `## en` / `## zh` sections.

## What CI rejects

Unknown fields anywhere (strict), missing required fields, malformed `date`/`startTime`/`endTime`,
unknown timezones, bad segment types, segment `links` without a non-empty `speaker` on the same
segment, a frontmatter `id`, filename pattern violations, non-integer `attendees`, malformed
bilingual values, any URL that isn't `http(s)://` (including links inside
`speakerBio` markdown — `javascript:` URLs fail CI before they can reach a page), avatars that
aren't a bare existing filename, avatar files over 500 KB, duplicate `ctas[].id` values, a missing
`data/moderators/avatars/default.png` (the required fallback avatar), and frontmatter that isn't
valid YAML.

## Privacy & consent

- **Everything you PR is public once merged** — the repo, its git history, and the built site.
  Include contact info only if you are comfortable with it being public; profile/portfolio links
  beat raw emails. The repo does not police contact info.
- **Edits & removal:** speakers and moderators can ask for their content to be edited or removed at
  any time — a PR (by the person or an organizer) deleting or redacting the entry, honored without
  question.
- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present). A one-time community-channel announcement with opt-out **must precede the
  first publication**.
- **Maintainer side:** logistics from the private sign-up sheet (the contact column) never enter
  this repo.

## How the site fetches the JSON (delivery & caching)

- Every JSON load goes through **one choke point**: `fetchJson()` in `site/site.js`. Any change to
  fetch behavior (caching, headers, error handling) happens there and nowhere else.
- It fetches with **`{ cache: 'no-cache' }`**. GitHub Pages serves everything with
  `Cache-Control: max-age=600` (10 min); without this option the browser reuses its cached JSON for
  that window and freshly merged data looks "missing". `no-cache` doesn't disable caching — it
  forces the browser to revalidate via ETag on every load: GitHub Pages answers `304 Not Modified`
  (a few bytes) when nothing changed, full fresh JSON right after a deploy.
- **Don't switch to query-string cachebusters** (`?t=Date.now()` re-downloads everything in full and
  punches through the CDN edge cache; a build-hash `?v=` baked into `site.js` doesn't help because
  `site.js` itself is cached for the same 10 minutes).
- Known limit: HTML/CSS/JS files still sit in the browser cache for up to 10 minutes after a deploy
  — **code** changes can lag that long; **data** is always revalidated.

## Evolution rules (the contract terms)

1. **Additive-only.** New fields arrive optional-with-default. No renames, no restructures, no type
   changes to existing fields.
2. **No presentation concerns in data.** No colors, layout hints, or ordering fields beyond `date`.
3. **Bilingual-capable from day one.** Every user-facing text field accepts the string-or-map shape.
4. **Deliberate changes only.** Schema change = this doc + validator + `_template.md` in one PR.
