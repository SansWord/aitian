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
| [v0.7.1](#v071--content-polish-avatar-rename-bio-copy-tba-filename-rule-2026-07-11-0218) | **Content polish** — SansWord's avatar renamed `sanword.jpg` → `sansword.jpg`, his en bio line rewritten, and the TBA-filename rule documented: the slug is chosen at file creation only, so a deployed TBA file keeps its bare-date name when booked (booked ≠ has-slug); avatar-format docs synced to reality (square image PNG/JPG/SVG, was "PNG"). |
| [v0.7.0](#v070--rsvp-button-on-the-meetup-detail-page-2026-07-10-2316) | **RSVP on detail pages** — the meetup detail page now renders the community CTA row (today the single RSVP button, Luma link from `data/community.md`) below the time lines via a `ctaButtons()` helper shared with the landing hero, for upcoming meetups only (new `isUpcoming()` helper, same 1h-grace rule as `splitMeetups`); past meetups stay button-free, TBA weeks show it. |
| [v0.6.0](#v060--speaker-links--speaker-sub-panel-2026-07-10-1828) | **Speaker links** — meetup segments can carry the speaker's public links ({label, url}, CI-enforced speaker requirement), rendered as a tinted speaker sub-panel (name, bio, links) on the detail page; light-theme link contrast fixed to AA during manual check. |
| [v0.5.2](#v052--localized-meetup-time-lines-2026-07-10-1717) | **Language chrome i18n** — both meetup time lines follow the zh/en toggle (`Taipei: …` in EN, `美國西岸時間 …` in ZH, with a non-LA timezone fallback to Intl's zh zone name), and the language toggle became a segmented `EN｜中文` control with the current language highlighted; new `time.*`/`toggle.*` ui-strings documented in `docs/wording.md`. |
| [v0.5.1](#v051--pinku-avatar-wired-2026-07-10-1704) | **Moderator avatar** — `pinku` now uses the newly added `pinku.svg` avatar instead of falling back to `default.png`, and `todo.md` now tracks only the remaining SansWord avatar follow-up. |
| [v0.5.0](#v050--contributor-readme-tree--privacy-unlock-2026-07-10-1547) | **README tree shipped** — four contributor READMEs (root front door incl. Claude Code / Fable 5 credit, `data/` overview, meetups + moderators how-tos), validator README-skip + ≤ 500 KB avatar cap, and the privacy unlock implemented (email lint removed; docs/CLAUDE.md reworded to public-once-merged consent). |
| [v0.5.0-design](#v050-design--contributor-readme-tree--privacy-unlock-2026-07-10-1213) | **README tree spec approved** — four contributor-facing READMEs (root front door with local-testing guide, `data/` overview, per-folder how-tos) with a layered doc-role rule (READMEs = how-to; `data-schema.md` stays the only field reference), a validator README-skip, an avatar file-size cap (≤ 500 KB, dimensions stay a recommendation), and an **unlocked privacy stance**: contact info allowed under "everything you PR is public" awareness, with edit/removal honored on request (email lint to be removed). |
| [v0.4.4](#v044--landing-hero-images-added-and-dark-visual-language-corrected-2026-07-10-1608) | **Hero visuals** — the landing page now uses generated demo-stage hero artwork in both themes, and the dark background/glow system was pulled back toward the chosen `B` preview language. |
| [v0.4.3](#v043--showroom-restyle-b-chosen-with-less-wireframe-2026-07-10-1455) | **Visual restyle** — the live site now follows the chosen `B` direction: showroom-style gradients and panel contrast stay, while borders are demoted so the pages feel less like a wireframe and more like a finished interface. |
| [v0.4.2](#v042--dark-theme-palette-corrected-to-the-intended-five-hexes-2026-07-10-1238) | **Dark palette correction** — light theme stays as-is, while the dark token block is remapped to the intended five colors (`#000411`, `#E1EFE6`, `#82C0CC`, `#EFCB68`, `#16697A`) and `docs/theming.md` now documents the split light/dark strategy. |
| [v0.4.1](#v041--single-rsvp-cta-wired-to-luma-2026-07-10-1152) | **CTA simplification** — the two placeholder CTA buttons collapse into one live CTA, 報名聚會 / RSVP, linking to the Luma event; the link lives in `data/community.md` frontmatter so future event-link changes are a one-line data edit. |
| [v0.4.0](#v040--color-theme-refresh-lagooncream-light-blackpurplegold-dark-2026-07-10-1136) | **Theme refresh** — new palettes (light: lagoon teals on warm cream + orange pop; dark: rich black, purple cards, gold accent), three new tokens (`--accent-pop`, `--accent-contrast`, `--hero-tint`), and a new maintained doc `docs/theming.md` with token roles, contrast requirements, and the adjustment procedure. |
| [v0.3.3](#v033--json-fetch-cache-revalidation-2026-07-10-1039) | **Fix** — JSON fetches use `cache: 'no-cache'` (ETag revalidation), so freshly merged data shows up immediately instead of after GitHub Pages' 10-min browser cache; fetch/caching behavior documented in `docs/data-schema.md`. |
| [v0.3.2](#v032--coming-up-strip-one-card-per-row-2026-07-10-1027) | **Layout tweak** — the landing "Coming up" strip renders one full-width card per row (was a multi-column auto-fit grid). |
| [v0.3.1](#v031--content-moderator-links--714-intro-2026-07-10-1005) | **Content follow-up** — real moderator links (portfolio/LinkedIn), founder/co-organizer bio roles corrected, first speakerBio + bilingual intro content on the 7/14 meetup; post-merge deploy to `aitian.dev` verified. |
| [v0.3.0](#v030--mvp-data-pipeline--three-pages-2026-07-10-0234) | **MVP shipped** — `data/` Markdown backend with strict CI validation, `build-data.mjs` emit pipeline, and three bilingual/theme-toggling pages (landing, hash-routed meetup detail, moderators) publishing `dist/` to Pages. |
| [v0.3.0-design](#v030-design--mvp-scaffold-design-2026-07-10-0003) | **MVP scaffold spec approved** — resolved all kickstart §5 opens (vanilla JS, runtime i18n, text-first hero, PR-as-consent, featured+3 landing) and locked the data md schema as a stable "backend" contract. Also: `aitian.dev` live with HTTPS enforced; new feature-branch convention. |
| [v0.2.0](#v020--end-to-end-cicd-setup-2026-07-09-1724) | Stood up the **end-to-end CI/CD pipeline** — a hello-world page under `site/` deploys to GitHub Pages via Actions and is live at `sansword.github.io/aitian`. |
| [v0.1.0-design](#v010-design--kickstart-and-doc-tree-setup-2026-07-09-0555) | Captured meetup-portal requirements, named the project **AI展 (aitian)**, created the public repo, and set up the document-tree practice. |

---

## v0.7.1 — Content polish: avatar rename, bio copy, TBA-filename rule (2026-07-11 02:18)

**Review:** not yet

**What was built:**
- Avatar file renamed `sanword.jpg` → `sansword.jpg` (`git mv` + reference update in
  `data/moderators/sansword.md`, same PR — the avatar filename is an internal asset reference,
  so the never-rename rule for citable ids doesn't apply).
- `sansword.md` en body line fixed: "The one who talked Claude into building this site."
  (matches the zh 「跟 Claude 說話來要到這個網站的人」).
- **TBA-filename rule decided + documented** (closes the meetups README wording gap): the slug is
  chosen at file creation only — a deployed TBA file that later gets booked keeps its bare-date
  name and only fills in `segments:`, so **booked ≠ has-slug**. Documented in the meetups README
  Naming section and `docs/data-schema.md` §Meetup.
- Avatar-format wording synced to reality across `data/moderators/README.md` (×2),
  `docs/data-schema.md`, and `_template.md`: "square image (PNG/JPG/SVG)" — the live avatars were
  already `.svg` and `.jpg` while every doc said "PNG".

**Key technical learnings:**
- `[note]` The validator checks avatar existence + the ≤ 500 KB cap only — file extension is
  unconstrained, so JPG/SVG avatars pass CI and render fine.
- `[gotcha]` Worked examples are docs too: the moderators README said "drop a PNG" while both live
  avatars (its own worked example among them) were `.svg`/`.jpg`. When prose and a linked example
  disagree, one of them is lying — check which on every docs pass.
- `[note]` The meetups README's "Week booked: `YYYY-MM-DD-short-slug.md`" read as a rename
  instruction and silently conflicted with the schema's never-rename rule; the fix was scoping it
  to file-creation time rather than changing either rule.

## v0.7.0 — RSVP button on the meetup detail page (2026-07-10 23:16)

**Review:** not yet

**Design docs:**
- RSVP button: [Spec](superpowers/specs/2026-07-10-rsvp-button-design.md) [Plan](superpowers/plans/2026-07-10-rsvp-button.md)

**What was built:**
- `meetup.html` now renders the community CTA row (today: the single RSVP button) directly below
  the two time lines — `initMeetup()` fetches `community.json` in parallel with the meetup index;
  no schema change, no new copy (labels + Luma href come from `data/community.md`, per the v0.4.1
  decision).
- The row is rendered by a new `ctaButtons()` helper shared with the landing hero (mid-session
  revision: SansWord widened the scope from just the `rsvp` entry to **all** `ctas`), so both pages
  behave identically — non-empty `href` → link, empty `href` → disabled placeholder — and future
  CTAs appear on both automatically.
- Shown only while the meetup counts as upcoming — a new shared `isUpcoming()` helper (`end + 1h
  grace`, the rule `splitMeetups` already used); past meetups never show it, upcoming TBA weeks do.
- One spacing rule (`.detail-ctas`) in `site.css`; the row reuses `.cta-row`/`.cta` unchanged.
- Same-PR doc updates: `docs/data-schema.md` (`ctas[].id` note now names the real live id) and
  `docs/wording.md` (CTA table records both render locations).
- Verified via Playwright against a locally served `dist/`: EN/中文 labels, TBA week shows the
  button, past meetup (clock frozen at 2027 via `addInitScript`) hides it, landing CTA unchanged;
  `npm test` 83/83 green.

**Key technical learnings:**
- `[note]` The whole `ctas` list is frontend-consumed on two pages now (landing hero + upcoming
  meetup detail), so adding a CTA in `data/community.md` is a pure content edit that ships to both.
- `[gotcha]` Playwright pins an exact browser build per version — a bare `npm install playwright`
  in a scratch dir couldn't reuse the machine's cached `chromium-1217` and needed
  `npx playwright install chromium-headless-shell` (~90 MB) before `launch()` worked.

**Process learnings:**
- `[note]` First one-shot session (design → plan → implement without phase handoffs, at SansWord's
  request): workable for a feature this small because every product decision (Luma, copy, data
  location) was already locked; the spec/plan docs were still written for the record.

## v0.6.0 — Speaker links + speaker sub-panel (2026-07-10 18:28)

**Review:** not yet

**Design docs:**
- Speaker links + speaker sub-panel: [Spec](superpowers/specs/2026-07-10-speaker-links-design.md) [Plan](superpowers/plans/2026-07-10-speaker-links.md)

**What was built:**
- New optional `segments[].links` field ({label, url} list, same shape as moderator `links`); CI
  rejects links on a segment without a non-empty `speaker`.
- Moderator link validation extracted into a shared `linkListErrors` helper used by both schemas —
  identical rules and error wording.
- `meetupToJson` emits `links` per segment (absent → `[]`); index entries stay link-free.
- Meetup detail segment cards reordered to label → title → materials → speaker sub-panel; the
  sub-panel (`.segment-speaker-card`) is a tinted inset mini profile card holding name, bio, and a
  link row.
- Manual-check contrast fix: speaker-link color switched from the spec's `--accent-pop` to
  `--accent` (light theme measured ~1.6:1, below AA; `--accent` gives 5.05:1 and is identical to
  `--accent-pop` in both dark blocks, so dark is unchanged).
- Same-PR doc updates: `docs/data-schema.md`, `data/meetups/_template.md`, `data/meetups/README.md`.

**Key technical learnings:**
- `[note]` Token-based `color-mix` styling needs no dark-theme override blocks — both dark paths
  adapt through the token values, unlike the theme-scoped rgba layers elsewhere in `site.css`.
- `[gotcha]` `--accent-pop` is a ≥3:1 glow token, not link text — `.mod-links a` already uses it on
  light backgrounds at ~2:1. The new panel reused the pattern and failed AA (~1.6:1); measure
  contrast when reusing an accent token in a new context, and note `.mod-links a` still carries the
  old color.
- `[note]` Manual Playwright-driven verification (light/dark via both the `data-theme` toggle and
  the OS `prefers-color-scheme` path, EN + 中文, landing page unchanged) is what caught the contrast
  issue — the automated suite (83/83 green) had no way to surface a visual contrast regression.

## v0.5.2 — Localized meetup time lines (2026-07-10 17:17)

**Review:** not yet

**Design docs:**
- Localized time lines: [Spec](superpowers/specs/2026-07-10-localized-time-lines-design.md) [Plan](superpowers/plans/2026-07-10-localized-time-lines.md)

**What was built:**
- Both meetup time lines now follow the language toggle: EN mode shows `Taipei: Wed 9:00 AM – 10:30 AM`
  (was hardcoded zh), ZH mode shows `美國西岸時間 7月14日 週二 · 下午6:00 – 下午7:30` (was hardcoded en).
- Two new `ui-strings.json` keys (`time.taipei`, `time.westCoast`) replace code literals;
  copy table added to `docs/wording.md`.
- ZH Pacific label is `美國西岸時間` only for the default `America/Los_Angeles` timezone; per-meetup
  `timezone:` overrides fall back to Intl's own zh zone name so the line is never mislabeled.
- Segmented language toggle: `EN｜中文` with the current language highlighted (was a single-label
  `中`/`EN` button naming the *target* language, which read ambiguously as a state badge).
  `toggle.lang` replaced by invariant `toggle.en`/`toggle.zh` plus `toggle.aria`; segmented no-JS
  fallback markup in all three HTML pages. Mid-implementation copy change (SansWord): both
  aria-labels are in Chinese (`切換至中文` / `切換至英文`), avoiding the English word "Chinese" —
  the toggle spec's original en aria copy is stale on this point; `docs/wording.md` is current.
- Content (SansWord): the 7/14 meetup's talk-1 and chat titles are now bilingual `{en, zh}` maps
  (first real use of the map shape in `data/`); talk 2 stays a single-string title serving both.

**Key technical learnings:**
- `[note]` `formatMeetupTimes()` reads the module-level `lang` and is recomputed by `applyLang()`'s
  full re-render — localizing it needed no new invalidation logic.
- `[insight]` Label spacing differs by language (en `Taipei: ` needs a trailing space, zh `台北時間`
  must not have one) — carrying the spacing inside the ui-string keeps the format template
  language-agnostic.
- `[note]` `美國西岸時間` is a deliberate copy override of Intl zh-TW's `太平洋時間`, so it must stay
  gated on the exact default timezone rather than applied to whatever zone a meetup declares.
- `[insight]` A toggle label naming the *target* language reads as a state badge ("which mode am I
  in?"). Showing both options with the current one highlighted removes the ambiguity structurally
  instead of re-wording it.

## v0.5.1 — pinku avatar wired (2026-07-10 17:04)

**Review:** not yet

**What was built:**
- `data/moderators/pinku.md` now points `avatar:` at `pinku.svg`, so Claire's moderator card no
  longer falls back to the shared default avatar.
- `todo.md` was updated to reflect the new state accurately: `pinku` is done, and only SansWord's
  avatar remains in the "real avatars" follow-up.

**Key technical learnings:**
- `[note]` Moderator avatars are opt-in per file: adding an asset under `data/moderators/avatars/`
  does nothing until the matching moderator frontmatter explicitly sets `avatar: <filename>`.

## v0.5.0 — Contributor README tree + privacy unlock (2026-07-10 15:47)

**Review:** not yet

**Design docs:**
- Contributor README tree: [Spec](superpowers/specs/2026-07-10-readme-tree-design.md) [Plan](superpowers/plans/2026-07-10-readme-tree.md)

**What was built:**
- Four contributor READMEs: root front door (name lore + tagline, contribute routing table, local
  test commands with the `file://` warning, public-visibility note, and a "designed/developed with
  Claude Code, mostly Fable 5" credit linking this devlog as the build history — added during
  planning at SansWord's request: the site is itself a demo of AI work), `data/` overview
  (never-rename rule, 5-step flow, bilingual one-liner),
  and meetups/moderators how-tos with worked-example links and computed deep-link anchors into
  `docs/data-schema.md`.
- Validator: `listDataFiles()` skips `README.md`; avatar files capped at ≤ 500 KB (name + actual
  size in the error; dimensions stay a README recommendation); email privacy lint removed.
- Privacy unlock folded into the maintained docs: `docs/data-schema.md` §Privacy & consent rewritten
  to the public-once-merged consent model; `CLAUDE.md` locked decision reworded and the
  Before-committing scan narrowed to maintainer-side sign-up-sheet leaks; both `_template.md`
  comments updated. `docs/kickstart.md` §4d untouched (historical).
- READMEs registered as maintained docs in `CLAUDE.md`; post-review follow-up widened the bullet's
  update trigger to validation limits the READMEs restate (the avatar cap) and reworded the
  end-of-session gate to "every maintained doc" so the non-`docs/` READMEs are covered.

**Key technical learnings:**
- `[note]` GitHub heading anchors for code-span headings strip `/`, `.`, `[`, `]` and the em dash
  entirely (each space still becomes a hyphen), so `## Meetup — \`data/meetups/YYYY-MM-DD[-slug].md\``
  → `#meetup--datameetupsyyyy-mm-dd-slugmd` — compute anchors, don't guess them.
- `[insight]` Oversized-file fixtures don't belong in git: the 500 KB-cap test generates its
  fixture with `Buffer.alloc(501 * 1024)` at test time — committing a big binary to test a
  repo-bloat guard would recreate the problem it guards against.
- `[note]` Removing a validator rule still gets a regression test: an email now lives in a golden
  fixture body, so the lint can't silently come back.

**Process learnings:**
- `[gotcha]` A plan's "expected failure" predictions go stale against the plan's own earlier tasks:
  Task 3 predicted exactly one failing test, but Task 2's avatar-cap test (added two tasks earlier)
  also copies the golden fixture dir, so the planted email tripped it too — same root cause, two
  failures. Predict failure *reasons*, not counts.
- `[note]` Review follow-ups that survived: the meetups README never says a deployed TBA file keeps
  its bare-date name once booked (spec-wording gap), and the worked examples carry placeholder bios
  (`Claire's Bio` / `SansWord's Bio`) — both parked in `todo.md` rather than patched mid-release.

## v0.5.0-design — Contributor README tree + privacy unlock (2026-07-10 12:13)

**Review:** not yet

**Design docs:**
- Contributor README tree: [Spec](superpowers/specs/2026-07-10-readme-tree-design.md)

**What was built:**
- Spec for four English-only READMEs: root (community front door + "test locally" commands +
  contribute routing), `data/` (backend overview + PR flow), `data/meetups/` and `data/moderators/`
  (per-type how-tos with real committed files as worked examples).
- Layering rule to prevent drift: READMEs are how-to guides that deep-link `docs/data-schema.md`;
  field tables stay only there; `_template.md` stays the inline cheat-sheet.
- **Locked-decision change (privacy):** replaced "contact info never enters the public repo" with
  an awareness model — everything PR'd is public; contact info is allowed, links preferred over
  raw emails; speakers/moderators can have their content edited or removed on request; the
  maintainer-side rule (sign-up-sheet logistics stay private) survives. Implementation will remove
  the validator's email lint and reword `data-schema.md` §Privacy, `CLAUDE.md`, and the meetup
  template.

**Key technical learnings:**
- `[gotcha]` `listDataFiles()` includes every `*.md` not starting with `_` — a `README.md` dropped
  into `data/meetups/` or `data/moderators/` would be validated as an entry and fail CI. The spec
  adds a README skip to the filter; without it the README milestone can't even build.
- `[note]` `data/README.md` alone would have been safe: `community.md` is read by exact path and
  nothing globs the `data/` root.

## v0.4.4 — Landing hero images added and dark visual language corrected (2026-07-10 16:08)

**Review:** not yet

**What was built:**
- Added two generated hero artwork assets — `site/assets/hero-demo-stage-dark.png` and
  `site/assets/hero-demo-stage-light.png` — and wired them into the landing hero by theme.
- The dark background/glow treatment across landing, meetup, and moderators was retuned again so it
  matches the chosen `B` preview language more closely instead of the flatter interim variants.
- The moderators-page phantom bottom block was traced to presentation-layer changes around the page
  background/footer area and resolved without changing the data/rendering module.

**Key technical learnings:**
- `[insight]` The hero needed a real image to carry memory and mood; gradients alone were good at
  atmosphere but not good at making the page feel finished.
- `[gotcha]` Page-local glow treatments should stay on the page background, not on a centered layout
  container like `main`, or they reveal the container as a visible rectangle.

## v0.4.3 — Showroom restyle: B chosen, with less wireframe (2026-07-10 14:55)

**Review:** not yet

**What was built:**
- The live `site/site.css` now follows the chosen `B` preview direction rather than the earlier MVP
  scaffold styling: layered hero/card gradients, brighter top planes on surfaces, softer panel
  shadows, and a slightly wider, calmer page frame.
- The visual rule for the whole site changed from "borders define structure" to "surfaces define
  structure." Cards, segments, moderator tiles, toggles, and the hero still have edges, but those
  edges are now faint helpers instead of the main source of hierarchy.
- Light and dark themes were both restyled in the same pass, preserving the existing theme toggle
  while changing the shared presentation language.
- `docs/theming.md` now documents the new surface tokens (`--card-strong`, `--line-soft`) and the
  showroom-vs-wireframe rationale.

**Key technical learnings:**
- `[insight]` The "cheap" feeling was not caused by borders existing at all; it came from borders
  doing too many jobs at once. Once surfaces, shadows, and local gradients carried the depth, the
  remaining lines could stay extremely soft without losing structure.

## v0.4.2 — Dark theme palette corrected to the intended five hexes (2026-07-10 12:38)

**Review:** not yet

**What was built:**
- The light theme token block stayed unchanged; only the dark token mapping was replaced after the
  original palette URL had been read incorrectly during the earlier styling pass.
- `site/site.css` dark tokens now map within the intended five-color set:
  `#000411` background, `#E1EFE6` foreground, `#82C0CC` muted/borders, `#EFCB68` accent/fill, and
  `#16697A` for card elevation plus the hero tint.
- `docs/theming.md` now reflects the actual strategy: light still uses the earlier adapted palette,
  while dark is constrained to the manually supplied five hexes.
- `npm run build` passed after the token swap, so the updated stylesheet is present in `dist/`.

**Key technical learnings:**
- `[gotcha]` A coolors/palette URL is only useful if the underlying hex set was copied correctly; if
  the palette source is verbal or pasted manually, record the exact hex list in the maintained docs
  instead of relying on a remembered link.

## v0.4.1 — Single RSVP CTA wired to Luma (2026-07-10 11:52)

**Review:** not yet

**What was built:**
- The landing CTA row went from two disabled placeholder buttons (`speak` "Sign up to speak" /
  `join` "Get invite link", both with empty `href`) to one live link: **報名聚會 / RSVP** →
  the Luma event (`https://luma.com/iwquc9lm`). This settles the "Decide vs. Luma" todo: Luma it is.
- The link lives in `data/community.md` frontmatter (`ctas[0].href`) — when the Luma event link
  changes, edit that one line; the CTA row is fully data-driven, so no code changes.
- `docs/wording.md` CTA table updated (single `rsvp` row, no longer "placeholders"); the
  `site/site.js` comment calling the CTA row "the speaker CTA" corrected.

**Key technical learnings:**
- `[note]` Removing the `speak` CTA removes the site's only speaker-sign-up entry point — TBA
  meetup cards still link to `index.html#cta`, which now shows only the RSVP button. If speaker
  recruitment needs an on-site path again, the intro copy is the natural home.

## v0.4.0 — Color theme refresh: lagoon/cream light, black/purple/gold dark (2026-07-10 11:36)

**Review:** not yet

**What was built:**
- New color system in the `site/site.css` token blocks, from two coolors references (pinku/SansWord
  styling pass): light = lagoon teals on warm cream with orange as the pop
  (`16697a-489fb5-82c0cc-ede7e3-ffa62b`); dark = rich black with dark-purple card surfaces, gold
  accent, mint text (`160c28-efcb68-e1efe6-aeb7b3-000411`).
- Three new tokens: `--accent-pop` (CTA fill + card hover border), `--accent-contrast` (text on
  accent fills — CTA text was hardcoded `#fff`, which fails on orange/gold), and `--hero-tint`
  (hero-gradient top, replacing the `color-mix` on `--accent`). Each theme block also declares
  `color-scheme` so native controls follow.
- New maintained doc [`docs/theming.md`](theming.md): token-roles table with per-role contrast
  requirements, the mapping rationale as reusable principles, and the step-by-step procedure for
  swapping palettes. Registered in `CLAUDE.md`'s docs index (trigger: any token-block change).
- Verified both themes on the landing + moderators pages via headless-Chromium screenshots; all
  text roles pass WCAG AA (body ink well above, at ~10:1).

**Key technical learnings:**
- `[insight]` A palette is an ingredient list and tokens are roles — the mapping is where design
  happens. The loudest palette color usually can't carry text (orange on cream is ~1.6:1) and lands
  as a fill; body ink needed a deepened shade of a palette hue (`#16697a` → `#0c3540`) because 5.2:1
  reads thin for paragraphs while staying fine for muted text.
- `[gotcha]` `node scripts/build-data.mjs` alone only emits `dist/data/` — the `site/` → `dist/`
  copy lives in `npm run build`. Previewing a CSS change after running only the data script shows
  the *old* stylesheet from the previous full build (bit this session; first screenshots showed the
  old theme).
- `[note]` Playwright's browser cache (`~/Library/Caches/ms-playwright`) already had Chromium, so
  `playwright-core` + an explicit `executablePath` to the cached headless shell gives scripted
  screenshots with no browser download.

## Meta — version tags backfilled; tagging step added to ship flow (2026-07-10 11:11)

**Review:** not yet

**What was built:**
- Backfilled the missing release tags: `v0.3.0` → `4df1b6d` (PR #1 merge), `v0.3.1` → `6b6ec36`,
  `v0.3.2` → `3e7ffb0`; `v0.3.3` was tagged the same day right after its merge. All five tags
  (`v0.2.0`–`v0.3.3`) are now on GitHub.
- `CLAUDE.md` ship-flow section gained an explicit post-merge step: tag the squash commit `vX.Y.Z`
  and push the tag once the user reports the merge.

**Process learnings:**
- `[gotcha]` The ship-it flow ended at "stop; don't merge", so no step covered what happens *after*
  the user merges — three releases (v0.3.0–v0.3.2) went untagged despite the convention that tags
  are the canonical version reference. A workflow that hands off to the user needs an explicit
  re-entry step for the part that comes back.

## v0.3.3 — JSON fetch cache revalidation (2026-07-10 10:39)

**Review:** not yet

**What was built:**
- `fetchJson()` (`site/site.js`) now fetches with `{ cache: 'no-cache' }` — the browser revalidates
  every JSON load via ETag, so newly deployed data appears immediately (SansWord hit stale data
  after a merge).
- New maintained-doc section: `docs/data-schema.md` §"How the site fetches the JSON (delivery &
  caching)" records the choke point, the rationale, and why query-string cachebusters were rejected.
  `CLAUDE.md`'s docs index gained "any change to `fetchJson()` behavior" as an update trigger.
- Restored the `## v0.3.0` devlog heading that had gone missing (its entry sat headless under
  v0.3.1 and the TL;DR anchor was broken).

**Key technical learnings:**
- `[note]` GitHub Pages serves everything with `Cache-Control: max-age=600` — browsers reuse cached
  JSON for up to 10 minutes with no request at all; the CDN edge itself is purged on deploy, so the
  stale layer is the browser.
- `[insight]` `fetch(..., { cache: 'no-cache' })` means *revalidate*, never *don't cache*: the
  browser sends `If-None-Match` and GitHub Pages answers `304` when unchanged — fresh-on-deploy at
  a few bytes per request, strictly better here than `?t=Date.now()` (full re-downloads, busts the
  CDN edge cache too).
- `[insight]` A build-hash `?v=` cachebuster can't fix data staleness on this stack: the `site.js`
  carrying the hash is itself cached for the same 10 minutes, so it just moves the staleness one
  file up. Code (HTML/CSS/JS) changes still lag up to 10 min; only data is always revalidated.

## v0.3.2 — Coming-up strip: one card per row (2026-07-10 10:27)

**Review:** not yet

**What was built:**
- `.strip` on the landing page changed from `repeat(auto-fit, minmax(14rem, 1fr))` (2–3 cards per
  row on desktop) to a single `1fr` column — one full-width card per upcoming week (SansWord's call
  after seeing the MVP live). Cards themselves are unchanged.

## v0.3.1 — Content: moderator links + 7/14 intro (2026-07-10 10:05)

**Review:** not yet

**What was built:**
- Moderator data filled in: portfolio + LinkedIn links on `sansword.md`; founder/co-organizer roles
  corrected between the two bios (pinku: Founder & organizer · Product & design; SansWord:
  Co-organizer · builds AI-powered tools).
- First real segment/body content on `data/meetups/2026-07-14-ai-role-play.md`: `speakerBio` for both
  talks and a bilingual (`## en` / `## zh`) meetup intro — initial copy, still to be polished in the
  zh copy review (see todo).
- Post-merge verification of the v0.3.0 deploy: `aitian.dev` serves the new landing page,
  `meetup.html` + data JSON respond 200; on the MVP PR the `build` check ran and `deploy` was
  skipped, as designed.

## v0.3.0 — MVP data pipeline + three pages (2026-07-10 02:34)

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
