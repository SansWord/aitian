# AI展 (aitian) — MVP Scaffold Design

> **Status:** approved in brainstorm session 2026-07-09.
> **Inputs:** [`docs/kickstart.md`](../../kickstart.md) (§5 open questions), root `CLAUDE.md` locked
> decisions, [`docs/devlog.md`](../../devlog.md) v0.2.0 (CI/CD already live).
> **Scope:** resolves the kickstart §5 opens and defines the MVP scaffold — data layer, three pages,
> build pipeline. Ship target: before the first seeded meetup, **2026-07-14**.

## 0. Decisions resolved in this session

| Open question (kickstart §5) | Decision |
|---|---|
| 1. Framework | **Vanilla HTML/CSS/JS** + standalone `scripts/build-data.mjs` |
| 2. i18n approach | **Runtime toggle + string dictionary**; default = auto-detect, fallback **en** |
| 3. Hero image | **Text-first typographic hero**; tagline en **"Show off your AI work"** / zh **「用你的 AI 作品展風神」** |
| 4. Consent flow | **PR-your-own = moderator consent; sheet sign-up = speaker consent** |
| 5. Participant count | **`attendees` field in schema from day one; display only when set** |
| 7. Upcoming on landing | **Featured next meetup + compact "coming up" strip (2–3)** |
| (new) Data stability | **md schema = stable contract: contract doc + templates + CI validation** |

(§5.6 look-and-feel assets stays open — pinku's refs inform a later styling pass, they don't block MVP.)

**Guiding constraint added this session:** the `data/*.md` format is the project's **stable
"backend"** — the frontend look-and-feel is expected to churn, the data schema is expected to
survive redesigns with few-to-zero migrations. Every design choice below is checked against that.

## 1. Data layer — the stable contract

The contract is the `data/*.md` schema plus the shape of the generated JSON. Everything under
`site/` may be rewritten freely; everything under `data/` follows the stability rules in §1.4.

### 1.1 Layout

```
data/
  community.md              # site copy: tagline, intro, CTA placeholders
  meetups/
    _template.md
    2026-07-14-<slug>.md    # one file per meetup; seed ALL 8 scheduled Tuesdays (7/14–9/1)
  moderators/
    _template.md
    sansword.md
    pinku.md
```

Seed a file for **every** scheduled Tuesday, including unbooked ones: a meetup with
`segments: []` is how "TBA — want to speak?" renders. The schedule lives in data; the frontend
contains no calendar math.

### 1.2 Meetup schema (`data/meetups/YYYY-MM-DD-slug.md`)

**The filename is the id** (`2026-07-14-ai-role-play.md` → id `2026-07-14-ai-role-play`). This is a
deliberate deviation from the kickstart §4b example, which also had `id:` in frontmatter: two copies
of one fact drift. The validator **rejects** a frontmatter `id`.

```yaml
---
date: 2026-07-14T20:00:00+08:00   # required; ISO 8601 with timezone offset
segments:                          # required; may be [] (renders as "TBA — want to speak?")
  - type: talk                     # required per segment: talk | chat
    title: "..."                   # required; speaker's original language, plain string
    speaker: Claire                # display name only — NEVER contact info (kickstart §4d)
    materialsUrl: ""               # optional
attendees: null                    # optional; back-fill after the event
---
(optional meetup-level intro body — markdown)
```

### 1.3 Moderator & community schemas

`data/moderators/<id>.md` (filename = id, same rule):

```yaml
---
name: pinku          # required
avatar: assets/pinku.jpg   # required (path under site assets)
linkedin: ""         # optional
threads: ""          # optional
sideProject: ""      # optional
---
## en
Short intro in English…

## zh
中文簡介…
```

`data/community.md`: `tagline: {en, zh}` frontmatter map, CTA placeholder entries, and a bilingual
body (`## en` / `## zh`) for the community intro.

**Bilingual convention — one rule per shape, never both for the same field:**
- Prose → `## en` / `## zh` body sections.
- Short strings → `{en, zh}` frontmatter maps.
- User-provided content (talk titles, materials) → single-language plain string, rendered as-is.

### 1.4 Stability rules (the contract terms)

Recorded here and enforced going forward via [`docs/data-schema.md`](../../data-schema.md) (created
in this milestone as a **maintained** doc):

1. **Additive-only evolution.** New fields arrive optional-with-default. No renames, no
   restructures, no type changes to existing fields.
2. **No presentation concerns in data.** No colors, layout hints, or ordering fields beyond `date`.
3. **User content stays single-language.** i18n applies to UI chrome and site copy only.
4. **Schema changes are deliberate.** Any change updates `docs/data-schema.md` + the validator +
   `_template.md` in the same PR; CI fails otherwise (strict validation rejects unknown fields, so
   the validator can't silently lag the docs).

### 1.5 Build & validation (`scripts/build-data.mjs`)

Node script, devDeps `gray-matter` + `marked` + an HTML sanitizer. Two jobs:

1. **Validate** every `data/**/*.md`. CI **fails** on: unknown frontmatter fields, missing required
   fields, unparseable/offset-less dates, bad `segments[].type`, frontmatter `id` present, filename
   pattern violations. Clear per-file error messages — this is the PR gate contributors hit.
2. **Emit** into `dist/data/`:
   - one JSON per meetup and per moderator (frontmatter + body rendered to sanitized HTML,
     language-sectioned bodies split into `{en, zh}`),
   - a date-sorted `index.json` per collection (id, date, segment summaries, attendees — enough to
     render cards without fetching detail files),
   - `community.json`.

Generated JSON exists only in build output, never in the repo (kickstart §4c). Upcoming/past is
**computed client-side at page load**, never at build time — a stale deploy must not mislabel
tonight's meetup.

## 2. Frontend — the churn layer

Three hand-written pages under `site/`, shared `site.css` + `site.js` + `ui-strings.json`,
consuming only built JSON. This layer is replaceable without touching `data/`.

**Shared header on all three pages:** wordmark + nav on the left; two toggles top-right —
**language (中/EN)** and **theme (dark/light)**. Both start on the auto-detected default
(language per §2.5, theme per §2.6), both are reader-changeable, and a change persists in
`localStorage` and wins on every later visit.

### 2.1 Landing (`index.html`)

1. **Typographic hero** — AI展 wordmark with 展 as the accent glyph over a CSS gradient; no image
   asset. Tagline en: **"Show off your AI work"** (imperative phrase, no hyphen; the hyphenated
   "show-off" is the noun). Tagline zh: **「用你的 AI 作品展風神」** — 展風神 (Tâi-lô *tián-hong-sîn*,
   "to show off") echoes the 愛展 pun and reuses the 展 glyph from the wordmark; record the
   pronunciation/lore in `docs/wording.md`. Placeholder CTA
   buttons (locked decision). Layout reserves a hero-visual slot so a future image drops in without
   reflow.
2. **Featured next meetup** — rich card: date/time, each segment's title + speaker, link to
   `meetup.html#<id>`.
3. **Coming up** — compact strip of the following 2–3 Tuesdays; booked weeks show topic + speaker,
   `segments: []` weeks render **"TBA — want to speak?"** linking the speaker CTA.

### 2.2 Meetup detail (`meetup.html`)

- Reads `location.hash`; no hash → next upcoming; unknown id → friendly not-found + link back.
- Renders date/time, segments in file order labeled by position and type ("Talk 1" / "Talk 2" /
  "Chat" — labels are UI chrome, translated), each with title, speaker, materials link when present.
- "👥 N aitians" renders only when `attendees` is set.

### 2.3 Moderators (`moderators.html`)

Grid of circular avatars, name, bio in active language, LinkedIn icon when set.

### 2.4 "Next meetup" detection

Client-side, automatic:
- Featured = first meetup where `date + 3h grace window > now`. The grace window keeps tonight's
  meetup featured while it runs; it lives in frontend code (presentation logic). If real end times
  are ever wanted, an optional `durationMinutes` field is an additive schema change later.
- ISO dates carry `+08:00`, so comparisons are absolute-time correct in any visitor timezone.
- **Schedule exhausted:** featured slot degrades to a "no meetup scheduled yet — want to speak?"
  card wired to the CTA; hash-less `meetup.html` falls back to the most recent past meetup.
- One shared helper in `site.js` powers the featured pick, the coming-up strip, and every
  upcoming/past split.

### 2.5 i18n mechanics

- One HTML tree. UI labels in `site/ui-strings.json` (`{key: {en, zh}}`); static elements carry
  `data-i18n` attributes; JS-rendered strings go through a `t(key)` helper.
- Language resolution: `localStorage` override → `navigator.language` startsWith `zh` → zh →
  otherwise **en**.
- Header toggle updates `<html lang>`, re-renders, persists to `localStorage`.
- Bilingual JSON fields (`{en, zh}`) are picked by the same active-language state; single-language
  user content renders as-is regardless of language.

### 2.6 Theme

CSS custom properties; default follows `prefers-color-scheme`; header toggle overrides + persists
to `localStorage`. (Pattern already proven in the v0.2.0 hello-world page.)

### 2.7 Safety

All data-sourced strings are inserted via `textContent` (or an escape helper where markup
composition is unavoidable) — including "trusted" seed content, per repo convention. Exception:
moderator bios and community intro arrive as markdown-rendered HTML produced by `marked` **at build
time** from repo-reviewed files and passed through a sanitizer before emit; the client never parses
or trusts raw user input.

## 3. Repo, pipeline, process

### 3.1 Repo tree after this milestone

```
data/                          # stable backend (§1)
site/                          # static frontend source (§2)
scripts/build-data.mjs         # parse + validate + emit
package.json                   # devDeps: gray-matter, marked, sanitizer
.github/workflows/deploy.yml   # updated: build step + path: dist
docs/data-schema.md            # NEW — maintained contract doc (schema + evolution rules + consent)
docs/wording.md                # NEW — name lore + bilingual copy (kickstart §0 TODO)
```

### 3.2 Build & deploy

Existing workflow gains: Node setup → `npm ci` → run `build-data.mjs` (emits `dist/data/`) → copy
`site/` → `dist/` → Pages upload flips `path: site` → **`path: dist`**. `dist/` is never committed.
The workflow also runs on **`pull_request`** (build + validate only, no deploy) — the schema
validator is a real CI gate on contributor PRs.

### 3.3 CI security posture (public repo, PRs from anyone)

- **Cost: $0.** GitHub Actions minutes are unlimited for public repos on standard hosted runners.
- **Merge rights:** forks can open PRs; merging requires write access (SansWord + pinku). Add
  **branch protection on `main`**: require PRs and require the validate check to pass — broken or
  malicious data physically can't land.
- **Fork PR containment:** fork-PR workflows get a read-only token and no secrets; the Pages deploy
  job stays gated on `push` to `main`, so PR events can only run build/validate.
- **Settings → Actions:** enable *"Require approval for all outside collaborators"* so a stranger's
  PR workflow waits for maintainer approval before executing.
- The PR job only parses md with `gray-matter` (safe-load YAML) — PR content is data under
  validation, never executed code.

### 3.4 Consent & contribution (written into `docs/data-schema.md` where contributors read)

- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present); one-time community-channel announcement with opt-out.
- **Privacy rule restated at point of use:** contact info (sheet column F) never enters `data/`.

### 3.5 Testing

Proportional to MVP:
- `node:test` for `build-data.mjs` against fixtures: one golden meetup + moderator that must parse
  and emit the expected JSON shape; bad fixtures (unknown field, missing `date`, bad segment type,
  frontmatter `id`) that must each fail with a clear message. The validator is the load-bearing code.
- Manual smoke pass before ship: both languages, both themes, hash / no-hash / bad-hash detail
  routes, TBA rendering, attendees hidden-when-null.

## 4. Out of scope (unchanged from kickstart)

Past-archive page, OG/SEO pre-rendering, real CTA targets, custom domain (`aitian.dev` later),
speaker profile pages, Luma/RSVP integration.

## 5. Follow-ups this design creates

- Create `docs/data-schema.md` and `docs/wording.md` during implementation; register both in root
  `CLAUDE.md` "Maintained docs" with update triggers.
- Tagline pair (en "Show off your AI work" / zh 「用你的 AI 作品展風神」) + the 展風神 lore →
  `docs/wording.md`.
- Repo settings task (manual, SansWord): branch protection on `main` + Actions approval setting
  (§3.3).
- pinku's look-and-feel refs → a post-MVP styling pass on the hero/section design.
