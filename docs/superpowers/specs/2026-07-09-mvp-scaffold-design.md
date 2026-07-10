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

The contract is the `data/*.md` schema. The generated JSON is an **internal artifact** — data and
frontend rebuild together on every deploy, so the JSON shape may change freely alongside `site/`;
only the md schema carries stability guarantees. Everything under `site/` may be rewritten freely;
everything under `data/` follows the stability rules in §1.4.

### 1.1 Layout

```
data/
  community.md              # site copy: tagline, intro, CTA placeholders
  meetups/
    _template.md
    2026-07-14-<slug>.md    # one file per meetup; seed ALL 8 scheduled Tuesdays (7/14–9/1).
                            #   Dates are PT Tuesdays (= Wednesday mornings in Taipei, §2.2)
  moderators/
    _template.md
    sansword.md
    pinku.md
    avatars/                # avatar image files — owned by the data layer (see §1.3)
      default.png           # fallback for moderators who haven't provided their own
      sansword.png
      pinku.png
```

Files whose name starts with `_` are **skipped by validation and emission** — they are templates,
never data.

Seed a file for **every** scheduled Tuesday, including unbooked ones: a meetup with
`segments: []` is how "TBA — want to speak?" renders. The schedule lives in data; the frontend
never generates the schedule — it only compares the visitor's clock against dates present in the
data (§2.4).

### 1.2 Meetup schema (`data/meetups/YYYY-MM-DD[-slug].md`)

**The filename is the id** (`2026-07-14-ai-role-play.md` → id `2026-07-14-ai-role-play`). This is a
deliberate deviation from the kickstart §4b example, which also had `id:` in frontmatter: two copies
of one fact drift. The validator **rejects** a frontmatter `id`.

**The slug is optional.** Its jobs: make the citable URL hash human-readable
(`meetup.html#2026-07-14-ai-role-play`) and disambiguate multiple events on one date. TBA seed
weeks use the bare date (`2026-08-25.md`). **Never rename a file after it deploys** — the filename
is the cited URL — so a date-only file keeps its name even after a talk gets booked.

```yaml
---
date: 2026-07-14                   # required; YYYY-MM-DD — the calendar date in the meetup's
                                   #   timezone (a Tuesday-evening PT meetup uses the PT date)
startTime: "18:00"                 # optional; HH:MM 24h — overrides the community.md default
endTime: "19:30"                   # optional; overrides the community.md default
timezone: America/Los_Angeles      # optional; IANA name — overrides the community.md default
segments:                          # required; may be [] (renders as "TBA — want to speak?")
  - type: talk                     # required per segment: talk | chat
    title: "..."                   # required; plain string OR {en, zh} map (bilingual rules, §1.3)
    speaker: Claire                # required for talk, optional/empty for chat;
                                   #   display name only — NEVER contact info (kickstart §4d)
    speakerBio: ""                 # optional; 1–2 sentence intro, inline markdown allowed —
                                   #   LinkedIn/portfolio links welcome; sanitized at build,
                                   #   link URLs must be http(s):// (validator-enforced)
    materialsUrl: ""               # optional; when non-empty must be http(s):// (validator-enforced)
attendees: null                    # optional; integer ≥ 0, back-fill after the event
---
(optional meetup-level intro body — markdown)
```

The build resolves each meetup's `date` + start/end times + timezone (meetup override, else
community default) into **absolute ISO instants** in the emitted JSON — DST-correct via the IANA
zone — so the frontend compares and formats ready-made instants, no calendar math.

Extending the `type` enum later (e.g. `workshop`) counts as an **additive** change: the frontend
must render unknown segment types generically (title + speaker + materials link), so older
frontends degrade gracefully instead of breaking.

### 1.3 Moderator & community schemas

`data/moderators/<id>.md` (filename = id, same rule):

```yaml
---
name: pinku          # required
bio:                 # required; short one-liner for the grid card —
  en: "Co-organizer. Product & design."     #   plain string OR {en, zh} map (bilingual rules below)
  zh: "共同主辦：產品與設計。"
avatar: pinku.png    # optional; bare filename resolved against data/moderators/avatars/
                     #   (validator: relative filename only — no scheme, no "..", no "/");
                     #   omitted → default.png
links:               # optional; generic list — any networks/portfolio, moderator's choice
  - label: LinkedIn              # plain string or {en, zh} map
    url: "https://..."           # must be http(s):// (validator-enforced)
  - label: Portfolio
    url: "https://..."
---
## en
Optional longer intro in English…

## zh
中文較長的介紹（選填）…
```

Avatar image files live in `data/moderators/avatars/` — owned by the data layer, so a frontend
redesign can never orphan them; the build copies that folder into `dist/` and the frontend maps
filename → URL.

`data/community.md` — exact schema (kickstart §4b also listed a `name` field here; deliberately
omitted — the name/wordmark is UI chrome whose copy lives in `docs/wording.md`, and the strict
validator rejects unused fields):

```yaml
---
tagline:
  en: "Show off your AI work"
  zh: "用你的 AI 作品展風神"
schedule:                           # meetup defaults — every field overridable per meetup file
  timezone: America/Los_Angeles     # IANA name → PDT/PST handled automatically
  startTime: "18:00"                # 6:00 PM
  endTime: "19:30"                  # 7:30 PM
ctas:
  - id: speak                       # required; stable key the frontend targets
    label: {en: "Sign up to speak", zh: "報名分享"}   # placeholder copy — finalize in docs/wording.md
    href: ""                        # placeholder; empty renders as a disabled/placeholder button
  - id: join
    label: {en: "Get invite link", zh: "取得邀請連結"}
    href: ""                        # when non-empty must be http(s):// (validator-enforced)
---
## en / ## zh body = community intro
```

**Bilingual convention — one rule per shape, never both for the same field:**
- Prose → `## en` / `## zh` body sections. A body with only one section is **valid** — it renders
  for both languages.
- Short strings (talk titles, bios, labels, taglines) → **either** a plain string (renders for
  both languages) **or** an `{en, zh}` map. In a map, either key may be omitted (at least one
  required); a missing language falls back to the one provided.
- This string-or-map shape is part of the v1 contract for every user-facing text field — deciding
  it now is what makes "contributor later adds a translation" a content edit instead of a schema
  migration.

### 1.4 Stability rules (the contract terms)

Recorded here and enforced going forward via [`docs/data-schema.md`](../../data-schema.md) (created
in this milestone as a **maintained** doc):

1. **Additive-only evolution.** New fields arrive optional-with-default. No renames, no
   restructures, no type changes to existing fields.
2. **No presentation concerns in data.** No colors, layout hints, or ordering fields beyond `date`.
3. **User content is bilingual-capable from day one.** Every user-facing text field accepts a
   plain string (renders for both languages) or an `{en, zh}` map with fallback (§1.3) — so adding
   a translation later is a content edit, never a schema migration. UI chrome i18n stays the
   frontend's job.
4. **Schema changes are deliberate.** Any change updates `docs/data-schema.md` + the validator +
   `_template.md` in the same PR; CI fails otherwise (strict validation rejects unknown fields, so
   the validator can't silently lag the docs).

### 1.5 Build & validation (`scripts/build-data.mjs`)

Node script, devDeps `gray-matter` + `marked` + `sanitize-html`. Two jobs:

1. **Validate** every `data/**/*.md` (skipping `_*.md` templates). CI **fails** on: unknown
   frontmatter fields, missing required fields (incl. `speaker` on `talk` segments), malformed
   `date` (must be `YYYY-MM-DD`), malformed `startTime`/`endTime` (must be `HH:MM`), unknown
   `timezone` (must be a valid IANA name), bad `segments[].type`, frontmatter `id` present,
   filename pattern violations, `attendees` that isn't an integer ≥ 0 (or null), bilingual values
   that are neither string nor `{en, zh}`-with-≥1-key, URL-typed fields (`materialsUrl`,
   `links[].url`, CTA `href`, links inside `speakerBio` markdown) that don't start `http(s)://`,
   `avatar` values that aren't a bare relative filename or that name a file missing from
   `data/moderators/avatars/`, and email-shaped strings anywhere in `data/` (privacy lint,
   kickstart §4d). Clear per-file error messages — this is the PR gate contributors hit.
2. **Emit** into `dist/data/`:
   - one JSON per meetup and per moderator (frontmatter + body rendered to sanitized HTML,
     language-sectioned bodies split into `{en, zh}`; meetup start/end resolved to absolute ISO
     instants per §1.2),
   - a date-sorted `index.json` per collection (id, start/end instants, segment summaries,
     attendees — enough to render cards and pick the featured meetup without fetching detail
     files),
   - `community.json`,
   - a copy of `data/moderators/avatars/` (the image files).

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
3. **Coming up** — compact strip of the following **3** Tuesdays (fewer near the end of the seeded
   schedule); booked weeks show topic + speaker, `segments: []` weeks render **"TBA — want to
   speak?"** linking the speaker CTA.

### 2.2 Meetup detail (`meetup.html`)

- Reads `location.hash`; no hash → next upcoming; unknown id → friendly not-found + link back.
- Renders date/time, segments in file order labeled by position and type ("Talk 1" / "Talk 2" /
  "Chat" — labels are UI chrome, translated), each with title, speaker, the short speaker bio when
  present (sanitized HTML from the build), and materials link when present.
- **Times display in US Pacific first** — the meetup's home timezone (`America/Los_Angeles`; this
  is a **virtual meetup based on the US west coast**) — with a **Taipei-time reminder** alongside,
  e.g. "Tue 6:00–7:30 PM PT · 台北時間週三上午 9:00–10:30". Mind the day shift: Tuesday evening PT
  is Wednesday morning in Taipei — the reminder must carry its own weekday. Viewer timezone is used
  only for the upcoming/past *comparison* (§2.4), never for display.
- "👥 N aitians" renders only when `attendees` is set.

### 2.3 Moderators (`moderators.html`)

Grid of circular avatars (moderator's own or `default.png`), name, the short `bio` in the active
language, the generic `links` list rendered by label, and the longer body intro when present.

### 2.4 "Next meetup" detection

Client-side, automatic:
- Featured = first meetup whose **end instant** (resolved at build from date + endTime + timezone,
  §1.2) plus a 1-hour grace is still ahead of `now` — the meetup stays featured while it runs and
  through wrap-up.
- The built JSON carries absolute ISO instants, so comparisons are correct in any visitor timezone.
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
time** from repo-reviewed files and passed through `sanitize-html` before emit; the client never
parses or trusts raw user input.

`textContent` protects text nodes only — it does nothing for **attributes**. URL-typed fields
(`materialsUrl`, `linkedin`, `threads`, `sideProject`, CTA `href`, `avatar`) land in `href`/`src`,
so they are scheme-validated at build time (§1.5: `http(s)://` only; `avatar` bare-filename only) —
a `javascript:` URL in a contributor PR fails CI before it can ever reach a page.

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

**Job split:** two jobs — `build` (runs on both `pull_request` and `push`) and `deploy`
(needs `build`, guarded by `if: github.event_name == 'push'`). The `pages: write` /
`id-token: write` permissions and the `pages` concurrency group move onto the deploy job only;
PR validate runs carry read-only permissions and never touch the deploy pipeline.

### 3.3 CI security posture (public repo, PRs from anyone)

- **Cost: $0.** GitHub Actions minutes are unlimited for public repos on standard hosted runners.
- **Merge rights:** forks can open PRs; merging requires write access (SansWord + pinku). Add
  **branch protection on `main`**: require PRs, require the validate check to pass, and enable
  *"Do not allow bypassing the above settings"* (otherwise admins can bypass) — broken or malicious
  data can't land.
- **Fork PR containment:** fork-PR workflows get a read-only token and no secrets; the Pages deploy
  job stays gated on `push` to `main`, so PR events can only run build/validate.
- **Settings → Actions:** enable *"Require approval for all outside collaborators"* so a stranger's
  PR workflow waits for maintainer approval before executing.
- **Honest containment note:** on `pull_request` events the workflow file, `package.json`, and
  `build-data.mjs` run from the PR's merge ref — a PR that edits those files **does** execute its
  code in CI. The real containment is the read-only-token/no-secrets sandbox plus the
  approval-before-run setting above. Data files alone can't execute anything (`gray-matter`
  safe-loads YAML), but the claim stops there.

### 3.4 Consent & contribution (written into `docs/data-schema.md` where contributors read)

- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present); a one-time community-channel announcement with opt-out **must precede the
  first publication**. Removal path: a PR (by the person or an organizer) deleting or redacting the
  entry, honored without question.
- **Privacy rule restated at point of use:** contact info (sheet column F) never enters `data/`.

### 3.5 Testing

Proportional to MVP:
- `node:test` for `build-data.mjs` against fixtures: one golden meetup + moderator that must parse
  and emit the expected JSON shape (incl. correct PT→instant resolution across a DST boundary); bad
  fixtures (unknown field, malformed `date`, bad segment type, frontmatter `id`, `javascript:` URL,
  non-integer `attendees`, missing avatar file) that must each fail with a clear message. The
  validator is the load-bearing code.
- Manual smoke pass before ship: both languages, both themes, hash / no-hash / bad-hash detail
  routes, TBA rendering, attendees hidden-when-null.

## 4. Out of scope (unchanged from kickstart)

Past-archive page, OG/SEO pre-rendering, real CTA targets, speaker profile pages, Luma/RSVP
integration. (Custom domain was on this list at first writing; **`aitian.dev` went live
2026-07-10** — the site now serves there, so MVP pages must use relative URLs and never hardcode
the `sansword.github.io/aitian` path.)

## 5. Follow-ups this design creates

- Create `docs/data-schema.md` and `docs/wording.md` during implementation; register both in root
  `CLAUDE.md` "Maintained docs" with update triggers.
- Tagline pair (en "Show off your AI work" / zh 「用你的 AI 作品展風神」) + the 展風神 lore →
  `docs/wording.md`.
- Repo settings task (manual, SansWord): branch protection on `main` (incl. the no-bypass setting)
  + Actions outside-collaborator approval setting (§3.3).
- pinku's look-and-feel refs → a post-MVP styling pass on the hero/section design.
- **Plan sequencing hint (7/14 deadline):** the data layer + build/validate pipeline + landing page
  form the ship-alone cutline; meetup detail and moderators pages can follow days later if time
  runs short.
