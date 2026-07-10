# Data schema — the `data/` contract

The files under `data/` are this project's **stable backend**. The frontend look-and-feel may be
rewritten freely; this schema is expected to survive redesigns with few-to-zero migrations.
The generated JSON under `dist/data/` is an internal artifact — never committed, free to change.

**This doc, the validator (`scripts/build-data.mjs`), and the `_template.md` files must agree.**
Any schema change updates all three in the same PR — CI's strict validation (unknown fields are
errors) makes a lagging validator impossible to hide.

## Contributing an entry

1. Copy the `_template.md` in the right folder (`data/meetups/` or `data/moderators/`), rename it,
   fill it in, open a PR. Templates (`_*.md`) are skipped by validation and never rendered.
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
TBA weeks use the bare date. Dates are the meetup's **US-Pacific calendar date** — a Tuesday-evening
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
| `segments[].speaker` | talk: ✅ | plain string | **display name only — never contact info** |
| `segments[].speakerBio` | – | string or `{en, zh}` | 1–2 sentences; markdown links OK, `http(s)://` only |
| `segments[].materialsUrl` | – | `http(s)://` URL or `""` | |
| `attendees` | – | integer ≥ 0 or `null` | back-fill after the event; hidden while null |

Body (optional): meetup-level intro, markdown, `## en` / `## zh` sections.

## Moderator — `data/moderators/<slug>.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✅ | plain string | display name |
| `bio` | ✅ | string or `{en, zh}` | one-liner for the grid card |
| `avatar` | – | bare filename | must exist in `data/moderators/avatars/`; omitted → `default.png` |
| `links` | – | list of `{label, url}` | any networks/portfolio; `label` string or `{en, zh}`, `url` `http(s)://` |

Body (optional): longer intro, markdown, `## en` / `## zh` sections. Avatar image files live in
`data/moderators/avatars/` (owned by the data layer, so redesigns can't orphan them).

## Community — `data/community.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `tagline` | ✅ | string or `{en, zh}` | hero tagline |
| `schedule.timezone` | ✅ | IANA name | default for every meetup |
| `schedule.startTime` / `.endTime` | ✅ | `"HH:MM"` strings | defaults, per-meetup overridable |
| `ctas[].id` | ✅ | string | stable key the frontend targets (`speak`, `join`) |
| `ctas[].label` | ✅ | string or `{en, zh}` | |
| `ctas[].href` | – | `http(s)://` URL or `""` | `""` renders a disabled placeholder button |

Body: the community intro, `## en` / `## zh` sections.

## What CI rejects

Unknown fields anywhere (strict), missing required fields, malformed `date`/`startTime`/`endTime`,
unknown timezones, bad segment types, a frontmatter `id`, filename pattern violations, non-integer
`attendees`, malformed bilingual values, any URL that isn't `http(s)://` (including links inside
`speakerBio` markdown — `javascript:` URLs fail CI before they can reach a page), avatars that
aren't a bare existing filename, frontmatter that isn't valid YAML, and **email-shaped strings
anywhere in `data/`** (privacy lint).

## Privacy & consent

- **Contact info never enters this repo** (it's public). Speaker logistics (the sign-up sheet's
  contact column) stay in the private sheet. The privacy lint enforces the email case mechanically;
  the rule covers all contact info.
- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present). A one-time community-channel announcement with opt-out **must precede the
  first publication**. Removal: a PR (by the person or an organizer) deleting or redacting the
  entry, honored without question.

## Evolution rules (the contract terms)

1. **Additive-only.** New fields arrive optional-with-default. No renames, no restructures, no type
   changes to existing fields.
2. **No presentation concerns in data.** No colors, layout hints, or ordering fields beyond `date`.
3. **Bilingual-capable from day one.** Every user-facing text field accepts the string-or-map shape.
4. **Deliberate changes only.** Schema change = this doc + validator + `_template.md` in one PR.
