# AI展 (aitian) — Portal Website Kickstart

> A kickstart doc capturing the decisions and requirements from the SansWord ↔ pinku discussion (2026-07-07 → 2026-07-08).
> **Purpose:** hand-off input to a dedicated brainstorming session. It records *what we agreed* (§0–§4) and *what's still open* (§5) — it is not itself an implementation plan. The brainstorm should start from §5.

## TL;DR

1. **[AI展 (aitian)](#tldr-name)** — a static portal website for our AI-application meetup community (members = "aitians"), on GitHub Pages.
2. **[Contribute by PR, one Markdown file each](#tldr-markdown-pr)** — every meetup, speaker, and moderator is a `.md` file in `data/`; add or edit it via a pull request. No spreadsheet.
3. **[One file per entry → conflict-free](#tldr-build)** — a deploy-time build auto-generates the index/JSON, so two people adding entries never clash and nobody edits a shared file.
4. **[A meetup is a multi-segment session](#tldr-data)** — each date has Talk 1 / Talk 2 / Chat, not a single talk.
5. **[Private info stays private](#tldr-privacy)** — speaker contact (email/thread) never enters the public repo; only topic, speaker name, and materials link are public.
6. **[MVP = 3 pages](#tldr-mvp)** — landing, meetup detail (URL hash routes to a specific meetup), moderators. Bilingual (zh/en) + dark/light theme.
7. **[Hosting](#tldr-decisions)** — ships under `sansword/aitian` (→ `sansword.github.io/aitian`) first; a custom domain like `aitian.dev` can come later without breaking links.
8. **[Still open → for the brainstorm](#tldr-open)** — framework choice, i18n mechanics, hero image, speaker-consent flow.

<a name="tldr-name"></a>
## 0. Name & identity — **AI展 (aitian)** ✅ decided

- **Name / wordmark:** **AI展** — the 展 character shows in the logo so both audiences get it.
- **Romanization:** **aitian** (*Ài-Tián*, Taiwanese/Tâi-lô) — ASCII, a–z only, URL-safe.
- **Three layers of meaning** (this is why the name is good):
  1. **AI展** — "AI Demo / Expo" (literal; works in English and Chinese).
  2. **愛展 (ài-tián)** — "love/want to demo, love to show off" in Taiwanese (AI ≈ 愛 *ài* = want/love; 展 = to show off / display).
  3. **aitian ≈ "-ian" demonym** — like *Martian / Parisian*, it reads as "**a citizen of AI**." So community members are "**aitians**" — a built-in in-group name ("come join the aitians", "3 new aitians this week"). It collides with no real English word, so this reading is evocative, not confusing.
- **Tagline:** "AI展 — AI Demo Meetup" *(placeholder — finalize in `docs/wording.md`; consider an invitational "come demo your AI" angle)*.

> 📝 **TODO — create `docs/wording.md`.** Home for the name, pun, tagline, and all bilingual (zh/en) copy so wording lives in one place and can be reviewed/PR'd separately from code. Must record: the three-layer AI展 / 愛展 / Ài-Tián story; the **"aitians" = community members** demonym; and how to pronounce/explain it to English speakers.

## 1. Why we're building this

A portal / landing website for our **AI Application meetup** community. Concretely it should:

- Give the community a public "front door" — a place to point people to.
- Give **moderators & speakers a citable webpage** they can drop into LinkedIn or a resume ("I moderate / spoke at this community").
- **Record community activity** over time — each session's topic, date, and (optionally) participant count — so there's a durable reference for future interviews / storytelling.
- Be **low-maintenance**: contributors keep it updated themselves rather than one person babysitting a spreadsheet.

<a name="tldr-decisions"></a>
## 2. Decisions already made

| Topic | Decision | Notes |
|-------|----------|-------|
| Name | **AI展 (aitian)** — *Ài-Tián*, "want/love to demo" | See §0. Full story goes in `docs/wording.md`. |
| Hosting | **GitHub Pages**, static site | Same setup as sansword.github.io/resume |
| Repo / URL | **Personal repo first: `sansword/aitian`** → `sansword.github.io/aitian` | SansWord to create it. Org names `aitian` / `ai-tian` are taken, so no clean `*.github.io` root — see custom-domain note below. URL is provisional until approved. |
| Data source | **Files in the repo** (not a live spreadsheet) | Simpler, no integration, versioned, PR-driven |
| Data format | **Markdown + YAML frontmatter**, built to JSON at deploy | Human/AI-friendly, less error-prone than hand-written JSON; page still consumes clean JSON (see §4b) |
| Content updates | **Speakers/moderators open PRs** | Editing a Markdown file via PR is simpler than a spreadsheet |
| Data layout | **One file per meetup under `data/`; manifest auto-generated at deploy** | Conflict-free PRs; static pages can't list a directory, so a CI-built `index.json` provides discovery + ordering (see §4) |
| Meetup detail pages | **Static, hash-routed** (`meetup.html#<id>`) | Vanilla JS reads the hash, fetches that entry, renders it — zero server config |
| CTA | **Placeholder for now** | Undecided; community currently uses other channels. Wire up real targets later. |
| i18n | **Chinese + English** | AI-assisted one-time setup, then contributors maintain |
| Theme | **Dark / light toggle** | |
| Design reference | **[alan.com/en](https://alan.com/en)** | Scroll-based sections, clean hero. May need a hero image. |
| Scope discipline | **Ship a small MVP first** | "Just have something to present tomorrow — everything can change later." |

### Explicitly deferred (not MVP)
- Live spreadsheet integration (rejected as too complex vs. JSON).
- Luma event platform (pinku raised it; nobody has used it — parked, not chosen).
- Custom domain — **the clean-URL path, deferred.** GitHub org names `aitian` and `ai-tian` are both taken, so there's no bare `*.github.io` root available. But `aitian.dev` / `aitian.org` / `aitian.app` are available (~$8–10/yr). Since a custom domain serves at root regardless of repo/org name, the plan is: **ship on `sansword.github.io/aitian` now; attach `aitian.dev` (or similar) later** to get the canonical `https://aitian.dev/` — a domain you own is also the permanent, movable URL (change hosting anytime, links never break). Only cost of waiting: early citations use the `sansword.github.io/aitian` path.
- Real CTA targets — placeholder for now; formalize once the community picks a channel/flow.
- Per-meetup link previews / OG cards & SEO — hash-routed detail pages aren't pre-rendered, so rich previews are weak. Add a build/pre-render step later if this matters.

<a name="tldr-mvp"></a>
## 3. MVP scope — pages

pinku's fuller breakdown was 4 sections. The per-meetup detail idea lets us **collapse "next meeting details" into a single templated, hash-routed detail page** that renders any meetup by id. MVP = landing + meetup detail + moderators.

**MVP:**
1. **Landing** (`index.html`) — community intro + next meeting + **placeholder CTA**
   - CTA buttons render but point nowhere real yet (see §2). Placeholder copy like "sign up to speak" / "get invite link".
   - Reference alan.com hero feel; may need a homepage/hero image.
2. **Meetup detail** (`meetup.html#<id>`) — one templated page for **any** meetup, past or future.
   - No hash → defaults to the next upcoming meetup (serves the old "next meeting details").
   - `#<id>` → renders that meetup's **segment agenda**: date/time, then each segment (Talk 1 / Talk 2 / Chat) with its title, speaker, and materials link.
   - Fully static: vanilla JS reads `location.hash`, fetches the matching entry from `data/`, renders it.
3. **Moderators** (`moderators.html`) — one circular avatar per person + name + short intro + LinkedIn.
   - Consent required before publishing anyone's info.

**Post-MVP (optional):**
- **Past meetings list / archive** — landing shows the most recent 4–8 (each linking to `meetup.html#<id>`); a full `meetups.html` archive page comes later if the list grows.

<a name="tldr-data"></a>
## 4. Data model — standalone `data/` folder

Two decisions here: **(1) one file per meetup** (not one big file), and **(2) author in Markdown, not JSON.**

### 4a. One file per meetup (Option B)

| | One big file | **One file per meetup (chosen)** |
|---|---|---|
| PR conflicts | Everyone edits the same file | **None** — each person adds their own file |
| Discovery | Trivial (one fetch) | Needs a manifest (`index.json`) |
| Ordering | Sort by `date` | Sort manifest by `date` — same JS, same result |
| Adding an entry | Edit shared file | Add one new file (manifest auto-built, see §4c) |

The single file wins only on discovery simplicity; the per-file layout wins on the thing we actually care about — **conflict-free, PR-driven contribution** — so we take it.

<a name="tldr-markdown-pr"></a>
### 4b. Author in Markdown + YAML frontmatter → convert to JSON at build time

**Authoring format is Markdown, not JSON.** Contributors (and AI) write `.md` files; the build step parses frontmatter + body into the clean JSON the static page consumes. This separates *authoring format* from *runtime format*:

- **Humans/AI author** friendly Markdown — no trailing-comma / brace / quote-escaping traps; the long-form abstract is real prose (links, bold, lists).
- **The page still reads plain JSON** — zero runtime parser, no client-side dependency.
- Nearly free because we **already have a deploy-time build step** (§4c) — it just gains a couple of lines (`gray-matter` for frontmatter, `marked` for the body).
- **Bilingual content vs. user content:** the site's own copy (community intro, moderator bios) is bilingual — use language-sectioned bodies (`## en` / `## zh`) and/or `{ en, zh }` frontmatter fields. **User-provided talk titles/materials stay in their original single language** (see the note under the meetup example). i18n is about UI chrome, not re-translating what speakers submitted.
- Honest caveat: YAML has its own small footguns (indentation, an unquoted string with a `:`), so it's *less* error-prone than JSON, not zero — a CI schema/validation check cleans that up later.

```
data/
  community.md                # name, tagline, intro (zh + en), CTA placeholders
  meetups/
    _template.md              # copy this to start a new meetup
    2026-07-14-<slug>.md      # one file per meetup, filename = id (dates are Tuesdays)
    2026-07-21-<slug>.md
  moderators/
    _template.md
    pinku.md                  # one file per moderator (PR yourself in)
    sansword.md
# index.json manifests are GENERATED at build time — not stored in the repo (see §4c)
```

**A meetup is a session, not a single talk.** The sign-up sheet (see §4d) shows each weekly meetup contains an ordered set of **segments** — typically `Talk 1`, `Talk 2`, and a `Chat` (open discussion). So a meetup file holds a `segments` array:

**Per-meetup file** (`data/meetups/<id>.md`):
```markdown
---
id: 2026-07-14-ai-role-play
date: 2026-07-14T20:00:00+08:00     # confirm start time
segments:
  - type: talk                       # talk | chat
    title: "辦公室生存遊戲：AI Role Play 模擬器設計分享"   # author's original language, as given
    speaker: Claire
    materialsUrl: "https://hooli-survival.vercel.app/"
  - type: talk
    title: "Sans-Schema: semantic API gateway"
    speaker: SansWord
    materialsUrl: ""
  - type: chat                       # open discussion / AMA slot
    title: "你的 dev workflow with AI setup 是什麼？資料夾結構長怎樣？"
    speaker: ""                      # chat may have no single speaker
attendees: null                      # optional participant count, fill in after the event
---

<!-- Optional meetup-level intro; talk titles above are author-provided and stay in their original language.
     Only the UI chrome (Talk 1 / Chat / "Speaker" / nav) is translated. -->
```

Note: **talk titles/materials are speaker-provided and often single-language** — we do *not* force zh/en on them. i18n applies to the site's own UI labels, not user content. That simplifies the schema (segment `title` is a plain string, not `{ en, zh }`).

**Per-moderator file** (`data/moderators/<id>.md`):
```markdown
---
id: pinku
name: pinku
avatar: assets/pinku.jpg
linkedin: ""
threads: ""        # optional self-promo
sideProject: ""    # optional
---

## en
Short intro in English...

## zh
中文簡介...
```

<a name="tldr-build"></a>
### 4c. Build step — parse Markdown + generate the manifest (at deploy time, never committed)

A pure-static site **cannot list a directory** at runtime, so a single build script does two jobs, and its output is what the site serves:

1. **Parse** every `data/meetups/*.md` — frontmatter (`gray-matter`) + language-sectioned body (`marked`) → one JSON per meetup in the build output.
2. **Generate** a `date`-sorted `index.json` manifest (compact: `id`, `date`, and a segment summary — enough to render cards without loading every detail file).

The generated JSON + manifest live **in the build output only** — they never exist in the repo. The `.md` files are the *only* source of truth.

How the page then reads it:
1. Page fetches the generated `index.json` and **sorts by `date`** → ordering guaranteed regardless of file order (descending for past, ascending for upcoming).
2. `id` is a **date-prefixed slug** (`2026-07-14-…`) — sorts chronologically as a fallback, and is exactly what goes in the `#<id>` URL hash.
3. The detail page (`meetup.html#<id>`) fetches just that one generated JSON.

**Decided approach — generate at deploy time via GitHub Actions:**
- Switch GitHub Pages source from "deploy from branch" to **GitHub Actions**.
- The deploy workflow runs `scripts/build-data.mjs` (parse `.md` → JSON + build `index.json`) before publishing.
- Result: no bot commits, no stale manifest, no shared file ever; the same script builds both the meetup and moderator data/manifests.
- Alternative considered: an Action that regenerates **and commits** the JSON on merge (works with plain "deploy from branch", but adds a bot commit + a brief desync window). Rejected.
- Rejected: parsing Markdown/YAML in the browser at runtime (adds js-yaml + marked as client deps) and listing the directory via the GitHub Contents API (60 req/hr + network dependency).

**⚠️ Publish only the built site — not the planning docs.** The Pages artifact must contain **only** the website output (e.g. build to `dist/` and upload that: `upload-pages-artifact` with `path: dist`, **never `path: .`**). Otherwise `CLAUDE.md`, `todo.md`, and everything in `docs/` (including this file and the devlog) would be copied into the site and fetchable at `sansword.github.io/aitian/docs/…`. Keeping site source (`site/` or `src/`) separate from repo-root docs makes this automatic. Note: the *repo* is public regardless, so these docs are already visible when browsing GitHub — this rule only keeps them off the served **website**. To hide them entirely would require a private repo (which loses free Pages + open PRs) or a separate private planning repo — not worth it, since the docs carry no secrets.

### Adding a new meetup (contributor flow) — one step

1. Copy `data/meetups/_template.md` → rename to `YYYY-MM-DD-slug.md`, fill in the frontmatter (date + segments) and any meetup-level notes in the body, open a PR. Done.

No shared file to touch → truly conflict-free. Merge triggers CI to parse, rebuild the manifest, and deploy.

**Day-one fallback (before CI exists):** the build step is small (~15-line workflow + a short parse/manifest script). If you want to ship the very first version before wiring CI, you can hand-write a JSON manifest for 1–2 seed meetups; but since Markdown needs *some* parsing, standing up `scripts/build-data.mjs` early is the cleaner path.

### Moderators & speakers — same pattern

- **Moderators:** identical Markdown-per-file layout; the same `scripts/build-data.mjs` parses `data/moderators/*.md` and generates their manifest. Enables "**PR yourself in**" (add `data/moderators/<you>.md`, nobody else's entry touched).
- **Speakers:** for MVP, keep speaker info **inline** in each meetup file's frontmatter (a speaker belongs to a specific meetup). If speakers start recurring and want reusable profiles, promote them to `data/people/<id>.md` and reference by id from meetups — deferred, not MVP.

<a name="tldr-privacy"></a>
### 4d. What the sign-up sheet gives us — and what stays private

The organizer's sign-up spreadsheet has these columns. Not all are public — some are **logistics only** and, because **the repo is public**, must **never** be committed to `data/`:

| Sheet column | Meaning | Website use | In public repo? |
|---|---|---|---|
| A 時間 | Meetup date | `date` — schedule, ordering, detail page | ✅ Public |
| B 順序 | Slot: Talk 1 / Talk 2 / Chat | `segments[].type` + order | ✅ Public |
| C 主題 | Talk / chat topic | `segments[].title` | ✅ Public |
| D 講者 | Speaker display name | `segments[].speaker` (first name / handle) | ✅ Public |
| E 簡報或任何材料 | Slides / paper / demo link | `segments[].materialsUrl` | ✅ Public (speaker opted to share) |
| F 講者聯絡方式 | Speaker email / thread | Organizer contacts speaker | ❌ **Private — logistics only, do not migrate** |

**Rule:** Column F (contact info) stays in the private spreadsheet and is **excluded from the data pipeline entirely**. The public site never needs it. If a speaker wants to be reachable publicly, that's a separate opt-in field (e.g. a LinkedIn on a moderator/speaker profile), not their logistics email.

**Bonus:** the sheet is real seed content — it gives us a **weekly (Tuesday) schedule from 2026-07-14 → 2026-09-01** (7/14, 7/21, 7/28, 8/4, 8/11, 8/18, 8/25, 9/1) with several confirmed talks (Claire, SansWord, Foucault, Charlie, Zoe). That's enough to populate the landing "next meetup," a couple of detail pages, and a past/upcoming list for the MVP demo. Empty future weeks (dates with no topics yet) can render as "**TBA — want to speak?**" → ties into the speaker CTA.

<a name="tldr-open"></a>
## 5. Open questions for the kickstart discussion

Things to settle with pinku before / while building:

1. **Framework.** Plain HTML/CSS/JS vs. a static generator (e.g. Astro/Next static export). alan.com-style scrolling is doable in vanilla, but i18n + theming is cleaner with a small framework. What's our preference given we want a 1–2 hour first cut?
2. **i18n approach.** Language toggle + per-string JSON, or duplicate content blocks? Which language defaults on first load?
3. **Hero image.** alan.com leans on a strong homepage visual — do we source/generate one, or launch text-first for the MVP?
4. **Consent flow.** How do we collect moderator/speaker opt-in + their avatar/intro/LinkedIn before publishing? (Ask in the community channel? PR-your-own-entry?)
5. **Participant count.** pinku wanted "this week's attendee count." Field already sketched (`attendees`) — do we fill it in per event or skip for MVP?
6. **Look & feel assets.** pinku to share reference URLs/screenshots (and a claude-design mockup) for SansWord to feed to AI when building.
7. **Upcoming meetups on the landing.** Show only the *next* meetup, or a short **upcoming list** (next 2–3)? The schedule is weekly and already booked to September, so there's real upcoming content to surface — affects landing layout + how the past/upcoming split works.

**Resolved:** Name (**AI展 / aitian**, see §0), hosting (personal repo `sansword/aitian` first → `sansword.github.io/aitian`; `aitian.dev` custom domain later), CTA (placeholder), meetup detail pages (static hash-routing), data layout (per-file under `data/` + auto-generated manifest), data format (Markdown + frontmatter → JSON at build), meetup = multi-segment session, public/private field split (see §4).

## 6. Follow-up docs to create

- **`docs/wording.md`** — the name/pun story (AI展 · 愛展 · Ài-Tián), tagline, and all bilingual (zh/en) copy. Keep wording out of code so it can be reviewed and PR'd on its own.

## 7. Rough timeline

- SansWord to start the next day; estimates **~1–2 hours** for the MVP.
- pinku to gather look-and-feel references and generate a mockup via claude design.

## 8. Guiding principle

> "Fix the MVP first. Don't grow too big — just have something to present tomorrow. Everything can change later."

Keep the first version deliberately small (landing + meetup detail + moderators, backed by `data/`), ship it, then iterate via PRs.
