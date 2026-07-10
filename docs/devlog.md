# Devlog

Running log of decisions and learnings, **newest first**. The top entry is the project's current
state — the root `CLAUDE.md` points here instead of restating the version. This file is *historical*
(append-only) yet *always current*, because "newest on top" is true forever. Each entry references the
spec / plan / design doc from that session so a later session can lazily load the right context.

### Learning tags

| Tag | Meaning |
|-----|---------|
| `[note]` | Useful context, well-documented — good to have written down but you'd find it in the docs |
| `[insight]` | Non-obvious; meaningfully changes how you design or debug something |
| `[gotcha]` | A specific trap that bit you; high risk of biting again — bookmark it |

## TL;DR

| Version | Summary |
|---------|---------|
| [v0.3.0](#v030--mvp-data-pipeline--three-pages-2026-07-10-0234) | **MVP shipped** — `data/` Markdown backend with strict CI validation, `build-data.mjs` emit pipeline, and three bilingual/theme-toggling pages (landing, hash-routed meetup detail, moderators) publishing `dist/` to Pages. |
| [v0.3.0-design](#v030-design--mvp-scaffold-design-2026-07-10-0003) | **MVP scaffold spec approved** — resolved all kickstart §5 opens (vanilla JS, runtime i18n, text-first hero, PR-as-consent, featured+3 landing) and locked the data md schema as a stable "backend" contract. Also: `aitian.dev` live with HTTPS enforced; new feature-branch convention. |
| [v0.2.0](#v020--end-to-end-cicd-setup-2026-07-09-1724) | Stood up the **end-to-end CI/CD pipeline** — a hello-world page under `site/` deploys to GitHub Pages via Actions and is live at `sansword.github.io/aitian`. |
| [v0.1.0-design](#v010-design--kickstart-and-doc-tree-setup-2026-07-09-0555) | Captured meetup-portal requirements, named the project **AI展 (aitian)**, created the public repo, and set up the document-tree practice. |

---

## v0.3.0 — MVP: data pipeline + three pages (2026-07-10 02:34)

**Review:** not yet
**Design docs:**
- MVP Scaffold: [Spec](superpowers/specs/2026-07-09-mvp-scaffold-design.md) [Plan](superpowers/plans/2026-07-10-mvp-scaffold.md)

**What was built:**
- `data/` backend seeded: `community.md` (tagline, schedule defaults, placeholder CTAs), 8 PT
  Tuesdays (7/14 booked with the kickstart talks, 7 TBA), sansword + pinku moderator files,
  `_template.md` contributor templates, `default.png` placeholder avatar.
- `scripts/build-data.mjs` + `scripts/lib/` — strict validation (every spec §1.5 rule incl. the
  email privacy lint and `javascript:`-URL rejection) and emission of sanitized JSON with
  DST-correct ISO instants; `node:test` suites incl. golden/bad fixture integration tests.
- Three pages under `site/`: landing (typographic hero, featured meetup, coming-up strip),
  hash-routed meetup detail (PT-first times + Taipei reminder), moderators grid — one shared
  `site.js`/`site.css`/`ui-strings.json`, runtime zh/en + dark/light toggles, localStorage-persisted.
- CI split: `build` job (tests + validate + build, runs on PRs — the contributor gate) and `deploy`
  job (push/dispatch only, own write permissions); Pages now publishes `dist/`.
- New maintained docs: `docs/data-schema.md` (contract + consent) and `docs/wording.md` (name lore +
  copy inventory), registered in root `CLAUDE.md`.

**Key technical learnings:**
- `[gotcha]` js-yaml's default schema turns `date: 2026-07-14` into a JS `Date` object and unquoted
  `18:00` into the number `1080` (YAML 1.1 sexagesimal). gray-matter must be given a custom engine
  with `CORE_SCHEMA` so frontmatter scalars stay strings.
- `[insight]` Wall-clock → instant resolution needs no timezone library: `Intl.DateTimeFormat`
  `formatToParts` gives the zone offset at any instant; iterate twice to converge across DST edges.
- `[gotcha]` A plain `npm install js-yaml` in 2026 resolves to js-yaml 5.x, which is pure-ESM with
  named exports only — `import yaml from 'js-yaml'` crashes. Pinned `^4.3.0` (last major with the
  default export) so the planned `yaml.load(s, {schema: yaml.CORE_SCHEMA})` pattern works.
- `[gotcha]` `node --test scripts/test/` (bare directory) fails on Node 24 — the runner treats the
  directory as a test entry. Use a glob: `node --test scripts/test/*.test.mjs`.
- `[gotcha]` A YAML *syntax* error in one contributor file threw an uncaught YAMLException out of
  `buildData` — stack trace, no filename, remaining files unvalidated. `readEntry` now catches parse
  errors and reports them per-file through the normal error list.
- `[gotcha]` `sanitize-html`'s `allowedSchemes` never fires on protocol-relative hrefs
  (`//evil.example`) because there's no scheme token — `allowProtocolRelative: false` is required to
  actually enforce http(s)-only links.
- `[insight]` Headless Chrome `--headless=new --dump-dom --virtual-time-budget=5000` executes the
  site's modules + fetches against a local server, letting CI-less smoke tests verify the *rendered*
  DOM (routes, i18n, data binding); `--accept-lang` controls `navigator.language` for i18n cases.
- `[note]` `Intl` hour formatting: prefer `hourCycle: 'h23'` over `hour12: false` (avoids the TR35
  "hour 24" quirk class); don't set both — `hour12` wins.

**Process learnings:**
- `[insight]` Subagent-driven execution with two-stage review (spec compliance, then code quality)
  caught real bugs a faithful byte-for-byte plan execution would have shipped: the js-yaml 5 breaking
  change, the YAML-syntax crash path, the protocol-relative sanitize gap, and a hash-navigation
  stale-render race. Fresh-context reviewers per task are worth the dispatch overhead.

---

## v0.3.0-design — MVP scaffold design (2026-07-10 00:03)

**Review:** not yet
**Design docs:**
- MVP Scaffold: [Spec](superpowers/specs/2026-07-09-mvp-scaffold-design.md) [Plan](superpowers/plans/2026-07-10-mvp-scaffold.md)

**What was built:** *(design/planning session — no site code)*
- Brainstormed and **approved the MVP scaffold spec**, resolving every kickstart §5 open: **vanilla
  HTML/CSS/JS** + standalone build script; **runtime i18n toggle** (auto-detect, fallback en, both
  toggles in a shared header, localStorage-persisted); **text-first typographic hero** with tagline
  pair (en "Show off your AI work" / zh 「用你的 AI 作品展風神」); **PR-your-own = consent** (sheet
  sign-up = speaker consent); `attendees` integer field in schema, display-when-set; landing =
  **featured next meetup + 3-week coming-up strip** with "TBA — want to speak?" slots.
- Elevated a new requirement to first-class: the **data md schema is a stable "backend" contract**
  — additive-only evolution, no presentation concerns, enforced by contract doc
  (`docs/data-schema.md`, to be created) + `_template.md` files + strict CI validation in
  `scripts/build-data.mjs`. Generated JSON is an internal artifact, deliberately outside the contract.
- Schema decisions from two review rounds: filename = id (frontmatter `id` rejected, slug optional,
  never rename after deploy); day-only `date` + `schedule` defaults in `community.md`
  (18:00–19:30 `America/Los_Angeles`, per-meetup overrides — it's a **virtual meetup based on the
  US west coast**; Taipei time is a friendly secondary display); every user-facing text field is
  **string-or-`{en, zh}`-map** with fallback; moderators get generic `links` list + short `bio` +
  optional avatar with `default.png` fallback; segments get optional `speakerBio`.
- **`aitian.dev` went live** (CNAME added via GitHub UI outside the session); verified serving, then
  Enforce HTTPS enabled + verified (`http://` 301s to `https://aitian.dev/`). Docs updated.
- Adopted the **feature-branch convention** (never develop on `main`, squash-merge PRs; hotfixes
  exempt) — recorded in `CLAUDE.md`; this session's commits moved from local `main` onto
  `feat/mvp-scaffold-spec`.

**Key technical learnings:**
- `[gotcha]` `textContent` escaping protects text nodes only — **URL-typed fields land in
  `href`/`src` attributes**, so a contributor-supplied `javascript:` URL is a live XSS vector
  unless the validator enforces `http(s)://` schemes at build time.
- `[gotcha]` "PR content is just data, never executed" is **false** on `pull_request` events: the
  workflow file, `package.json`, and build script run **from the PR's merge ref**. Real containment
  = read-only token/no secrets + "Require approval for all outside collaborators".
- `[insight]` Deciding the **string-or-`{en, zh}`-map** shape for all user-facing text *before* v1
  is what turns "add a translation later" into a content edit instead of a schema migration.
- `[insight]` The stability contract caught its own violation: `avatar` pointing into `site/assets/`
  couples the stable layer to the churn layer — the data layer must own its binary assets too
  (`data/moderators/avatars/`).
- `[insight]` Filename-as-id means **a deployed data file is never renamed** (the filename is the
  cited URL). Corollary: TBA seeds use bare dates so booking a talk later never forces a rename.
- `[note]` GitHub Actions minutes are unlimited/free for public repos; fork PRs get a read-only
  `GITHUB_TOKEN` and no secrets; anyone can PR but only write-access users can merge — the standard
  OSS model is safe with two settings tightened (outside-collaborator approval, branch protection
  with no-bypass).
- `[note]` Upcoming/past must be computed **client-side at page load**, never at build time — a
  stale deploy would otherwise mislabel tonight's meetup. Build emits absolute ISO instants
  (day-only date + schedule defaults resolved DST-correctly via IANA zone).

**Process learnings:**
- `[insight]` The fresh-context **subagent review caught 7 real issues** the main loop had stopped
  seeing (both security holes, a contract violation, and a CI-would-be-red-on-day-one template bug)
  — the Review Protocol earns its cost.
- `[note]` Mid-review user feedback reshaped the schema substantially (day-only dates, virtual-US
  timezone, generic links) — cheap now, migrations later; the "stable backend" framing made these
  worth settling pre-v1.

## v0.2.0 — End-to-end CI/CD setup (2026-07-09 17:24)

**Review:** not yet
**Design docs:** *(none — small infra step, folded directly into the docs)*
**What was built:**
- **Proved the whole deploy path end-to-end**: push to `main` → GitHub Actions → GitHub Pages → live
  URL. A minimal hello-world page ([`site/index.html`](../site/index.html)) now serves at
  **`https://sansword.github.io/aitian/`** (verified HTTP 200). This is the pipeline the MVP will ride
  on, not the scaffold itself.
- Added [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — checkout → `upload-pages-artifact`
  (`path: site`) → `deploy-pages`, triggered on push to `main` + `workflow_dispatch`, with a `pages`
  concurrency group.
- **Published only `site/`, never `path: .`** (kickstart §4c) — so `CLAUDE.md`, `todo.md`, and `docs/`
  stay off the served website even though the repo is public.
- Bumped actions to Node 24-native majors: `checkout@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`
  (clears the Node 20 deprecation warning from the first run).
- The hello-world page carries the **AI展** wordmark (展 in accent), the `aitian · Ài-Tián` romanization,
  and `prefers-color-scheme` dark/light — a throwaway smoke test, not the real landing.

**Key learnings:**
- `[insight]` Pages source was **already** set to the *GitHub Actions* build type on repo creation, so
  the first push deployed with **zero manual settings** — the "switch Pages to Actions" step in
  kickstart §4c was a no-op here. Confirm with `gh api repos/OWNER/REPO/pages --jq .build_type` before
  assuming a manual toggle is needed.
- `[gotcha]` GitHub Actions warns when an action targets **Node 20** (now force-run on Node 24). Pin the
  latest majors up front; the `@vN` you first reach for is often a release behind (`deploy-pages` is at
  **v5**, not v4).
- `[note]` Deploy-from-`site/` is why publishing to `main` (not a feature branch) is correct here — the
  Pages Actions source builds from the default branch, so a branch push wouldn't produce a live deploy.
- `[note]` A maintained `docs/architecture.md` for the build pipeline is **deferred** until
  `scripts/build-data.mjs` (Markdown → JSON + manifest) exists — today's workflow just uploads a static
  folder, so there's no pipeline worth documenting separately yet.

## v0.1.0-design — Kickstart and doc-tree setup (2026-07-09 05:55)

**Review:** not yet
**Design docs:** Kickstart: [Spec](kickstart.md)
**What was built:** *(design/planning session — no site code yet)*
- Captured the AI-application meetup-portal requirements from the SansWord ↔ pinku discussion into
  [`docs/kickstart.md`](kickstart.md): purpose, name, hosting, data model, MVP page scope, privacy, and
  open questions.
- Named the project **AI展 (aitian)** — a three-layer name (愛展 "want/love to demo" · AI 展 "AI demo" ·
  "-ian" demonym → community members are "aitians"). Rejected `laitian` (reads like "Laotian").
- Settled the data architecture: one Markdown-file-per-entry under `data/`, built to JSON + a manifest
  at deploy via GitHub Actions; a meetup is a multi-segment session (Talk 1 / Talk 2 / Chat).
- Created public repo `sansword/aitian` and pushed the kickstart doc.
- Applied the **document-tree practice** (this `CLAUDE.md`, `todo.md`, this devlog, and the `docs/`
  historical tiers + templates).
- Opted into advanced governance blocks — **PR gate, Conventions, dev cycle, pre-commit secret scan** —
  promoting them straight into `CLAUDE.md`. Left Unlock-protocol and ADR-flow out (reconstructable from
  the `sans_doc_tree` template if wanted later) and removed the `CLAUDE.advanced.md` menu as unused.
- Aligned the historical spec/plan folders to the **superpowers plugin defaults**
  (`docs/superpowers/specs/`, `docs/superpowers/plans/`) so brainstorm/write-plan output lands there
  automatically; dropped the unused `docs/decisions/` + ADR template.

**Key learnings:**
- `[note]` Superpowers v5.0.7 saves brainstorming specs to `docs/superpowers/specs/` and writing-plans
  output to `docs/superpowers/plans/` — match those paths so the plugin picks them up with no config.
- `[insight]` A static GitHub Pages site can't list a directory at runtime — so a deploy-time build
  both parses Markdown → JSON and generates the `index.json` manifest, keeping the runtime
  dependency-free while contributors author friendly Markdown.
- `[insight]` A custom domain decouples the public URL from the (taken) GitHub org name and makes
  hosting movable without breaking cited links — which matters because the site's whole point is a
  stable, citable URL.
- `[gotcha]` The repo is **public** — speaker contact info (sign-up sheet column F) must never be
  committed; only topic, speaker name, and materials link are public.
- `[note]` Meetups run weekly on **Tuesdays**, 2026-07-14 → 2026-09-01, each with Talk 1 / Talk 2 / Chat.
