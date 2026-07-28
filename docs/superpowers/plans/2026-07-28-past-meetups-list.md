# Past Meetups List Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `site/meetups.html`, a browsable archive of past meetups (date, attendee count, segment titles + speakers) that links each row to the existing meetup detail page, and repoint the "Meetups" nav to it.

**Architecture:** Pure frontend consumer of the already-built `data/meetups/index.json`. A new static page sets `<body data-page="meetups">`; `site/site.js` gains a `meetups` branch in its boot dispatch that fetches the index once, stores it, and renders rows through the existing `el()` / `pick()` / `t()` / `splitMeetups()` helpers. No schema, validator, build, `data/`, or fetch/caching change.

**Tech Stack:** Vanilla HTML/CSS/ES modules under `site/`. Node 20 build (`npm run build` = `node scripts/build-data.mjs && cp -R site/. dist/`). No framework, no client runtime deps.

**Source spec:** [`docs/superpowers/specs/2026-07-28-past-meetups-list-design.md`](../specs/2026-07-28-past-meetups-list-design.md)

**Consulted while planning:** the spec above, `docs/kickstart.md`, `docs/data-schema.md`, `docs/wording.md`, `CLAUDE.md` (Locked decisions), `site/site.js`, `site/site.css`, `site/ui-strings.json`, `site/index.html`, `site/meetup.html`, `site/moderators.html`, `scripts/lib/emit.mjs`, `package.json`, `todo.md`, `CHANGELOG.md`, `docs/devlog.md`.

**Release version:** `v0.9.0` (latest shipped is `v0.8.5`). Branch: `feat/past-meetups-list` (already checked out; the spec commit `df32b75` is on it).

---

## A note on testing

This repo has **no frontend test harness** — `npm test` (`node --test scripts/test/*.test.mjs`) covers the data layer only, and `site/site.js` cannot be imported under Node (it calls `main()` at module load, touching `document` and `localStorage`). The spec's testing section is therefore build + manual browser verification, and this plan follows the established pattern rather than introducing a browser test runner (out of scope for a frontend-only change).

To keep every task objectively verifiable anyway, each code task ends with a **grep/build assertion** with exact expected output, and Task 6 is a full scripted manual pass in the browser. Do not skip the verification steps because "it obviously works."

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `site/meetups.html` | **create** | Static shell for the archive page: header/nav/footer, theme pre-paint script, `<h1>` + `<div id="meetup-list">` mount point. |
| `site/ui-strings.json` | modify | Two new bilingual UI strings (`meetups.pastHeading`, `meetups.none`). |
| `site/site.js` | modify | New `formatMeetupDate()`, `pastSegmentLine()`, `pastMeetupRow()`, `initMeetups()`, `renderMeetups()`, plus the `meetups` boot-dispatch branch. |
| `site/site.css` | modify | `.meetup-list` stack + in-card attendees spacing. **No `:root` token changes.** |
| `site/index.html`, `site/meetup.html`, `site/moderators.html`, `site/meetups.html` | modify | Nav "Meetups" link repointed `./meetup.html` → `./meetups.html`. |
| `docs/wording.md`, `CHANGELOG.md`, `docs/devlog.md`, `todo.md` | modify | End-of-session doc gate (Task 7). |

---

### Task 1: New page shell `site/meetups.html`

**Files:**
- Create: `site/meetups.html`

The shell is a clone of `site/moderators.html` (same header, toggles, footer, theme pre-paint script). Differences: `<title>`/`<meta description>`, `data-page="meetups"`, the `<h1>` i18n key, the mount `<div>` id, and the `<noscript>` sentence.

Note the nav still points at `./meetup.html` here — Task 5 repoints all four pages at once so the change is one reviewable commit.

- [ ] **Step 1: Create the file**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI展 (aitian) — Past meetups</title>
  <meta name="description" content="Archive of past AI展 (aitian) meetups — dates, talks, and speakers." />
  <script>
    try { var t = localStorage.getItem('aitian.theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
  <link rel="stylesheet" href="./site.css" />
</head>
<body data-page="meetups">
  <header class="site-header">
    <a class="brand" href="./index.html">AI<span class="zhan">展</span></a>
    <nav>
      <a href="./index.html" data-i18n="nav.home"></a>
      <a href="./meetup.html" data-i18n="nav.meetups"></a>
      <a href="./moderators.html" data-i18n="nav.moderators"></a>
    </nav>
    <div class="toggles">
      <button id="lang-toggle" type="button" aria-label="Switch language"><span class="lang-opt">EN</span><span class="lang-opt">中文</span></button>
      <button id="theme-toggle" type="button" aria-label="Switch theme">◐</button>
    </div>
  </header>
  <main>
    <h1 data-i18n="meetups.pastHeading"></h1>
    <div id="meetup-list" class="meetup-list"></div>
  </main>
  <footer class="site-footer"><p>AI展 (aitian)</p></footer>
  <noscript><p style="text-align:center">This site needs JavaScript to show past meetups.</p></noscript>
  <script type="module" src="./site.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the shell matches the other pages' contract**

Run:

```bash
grep -c 'id="lang-toggle"\|id="theme-toggle"\|site.js\|site.css' site/meetups.html
```

Expected: `4` (each hook present exactly once — `site.js` boot assumes both toggle buttons exist, and throws on a missing one).

- [ ] **Step 3: Commit**

```bash
git add site/meetups.html
git commit -m "feat: add past meetups page shell"
```

---

### Task 2: Bilingual UI strings

**Files:**
- Modify: `site/ui-strings.json`

Two new keys. `meetup.aitians` and `nav.meetups` already exist and are reused as-is. Keep the file's existing one-key-per-line formatting; insert the new keys after the `meetup.*` block so related keys stay grouped.

- [ ] **Step 1: Add the strings**

In `site/ui-strings.json`, after the line

```json
  "meetup.aitians": { "en": "aitians", "zh": "位 aitians" },
```

insert:

```json
  "meetups.pastHeading": { "en": "Past meetups", "zh": "歷次聚會" },
  "meetups.none": { "en": "No past meetups yet.", "zh": "還沒有過往的聚會。" },
```

- [ ] **Step 2: Verify the JSON is valid and both keys are bilingual**

Run:

```bash
node -e "const s=require('./site/ui-strings.json'); for (const k of ['meetups.pastHeading','meetups.none']) { if (!s[k]?.en || !s[k]?.zh) throw new Error('missing '+k); } console.log('ok');"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add site/ui-strings.json
git commit -m "feat: add past-meetups UI strings"
```

---

### Task 3: Renderer in `site/site.js`

**Files:**
- Modify: `site/site.js` (three insertion points: after `formatMeetupTimes()` ~line 124, after `renderModerators()` ~line 352, and in `main()`'s dispatch ~line 375)

All data strings go in via `el(..., { text })` / `pick()` (textContent). **Do not** introduce an `html:` attribute anywhere in this task — that would break the `site.js` safety invariant documented in the file's header comment.

- [ ] **Step 1: Add `formatMeetupDate()`**

Insert immediately **after** the closing brace of `formatMeetupTimes()` (the line `}` following `return { home, taipei };`), before the `// ---------- DOM helper ----------` comment:

```js
// Archive rows show only the day, in the meetup's own timezone — no time
// range, no Taipei reminder. Follows the language toggle like formatMeetupTimes().
function formatMeetupDate(m) {
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    timeZone: m.timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(m.start));
}
```

- [ ] **Step 2: Add the row builders and the meetups renderer**

Insert **after** `renderModerators()`'s closing brace and **before** the `// ---------- boot ----------` comment:

```js
// ---------- past meetups list ----------
let meetupsListCache = null;

// Archive lines carry the segment's own title, not a "Talk 1:" label —
// the list is scanned for topics. Unknown future types fall back to the raw
// type only when the title is empty, matching segmentLabel's graceful degradation.
function pastSegmentLine(seg) {
  const title = pick(seg.title) || seg.type;
  return seg.speaker ? `${title} — ${seg.speaker}` : title;
}

function pastMeetupRow(m) {
  const row = el('a', { class: 'card', href: `./meetup.html#${m.id}` });
  row.append(el('p', { class: 'card-time', text: formatMeetupDate(m) }));
  if (Number.isInteger(m.attendees)) {
    row.append(el('p', { class: 'attendees', text: `👥 ${m.attendees} ${t('meetup.aitians')}` }));
  }
  if (m.segments.length > 0) {
    row.append(el('ul', {}, m.segments.map((seg) => el('li', { text: pastSegmentLine(seg) }))));
  }
  return row;
}

async function initMeetups() {
  meetupsListCache = await fetchJson('./data/meetups/index.json');
  renderPage = renderMeetups;
  renderPage();
}

function renderMeetups() {
  const { past } = splitMeetups(meetupsListCache); // already most-recent-first
  document.getElementById('meetup-list').replaceChildren(
    ...(past.length
      ? past.map((m) => pastMeetupRow(m))
      : [el('div', { class: 'card' }, [el('p', { class: 'card-tba', text: t('meetups.none') })])]),
  );
}
```

- [ ] **Step 3: Wire the boot dispatch**

In `main()`, change:

```js
  else if (page === 'moderators') await initModerators();
```

to:

```js
  else if (page === 'moderators') await initModerators();
  else if (page === 'meetups') await initMeetups();
```

- [ ] **Step 4: Verify the module parses and the safety invariant holds**

Run:

```bash
node --check site/site.js && grep -c "html:" site/site.js
```

Expected: `4` — the file header comment plus the three pre-existing `html:` sinks (`m.bodyHtml` on the meetup detail, `seg.speakerBioHtml`, `mod.bodyHtml`). If this prints `5`, a new innerHTML sink was added — remove it.

Run:

```bash
grep -n "initMeetups\|renderMeetups\|pastMeetupRow\|pastSegmentLine\|formatMeetupDate" site/site.js
```

Expected: `formatMeetupDate` defined once + used once in `pastMeetupRow`; `pastSegmentLine` defined once + used once; `pastMeetupRow` defined once + used once; `initMeetups` defined once + called once in `main()`; `renderMeetups` defined once + assigned once.

- [ ] **Step 5: Confirm the data layer is untouched**

Run: `npm test`
Expected: all `node --test` suites pass (this change touches no build code — a failure here means something unrelated broke; stop and investigate before continuing).

- [ ] **Step 6: Commit**

```bash
git add site/site.js
git commit -m "feat: render the past meetups list"
```

---

### Task 4: List styles

**Files:**
- Modify: `site/site.css` (append after the `.strip` rule, ~line 250, inside the meetup-cards block)

Rows reuse `.card` wholesale (background, radius, hover lift). Only the container stack and the in-card attendees spacing are new — `.card-time`, `.card ul`, `.card li`, and `.card-tba` already style everything else. **No `:root` token block is touched**, so `docs/theming.md` needs no update.

- [ ] **Step 1: Add the rules**

Insert immediately after the line `.strip { display: grid; grid-template-columns: 1fr; gap: 0.85rem; }`:

```css

/* --- past meetups archive (meetups.html) --- */
.meetup-list { display: grid; grid-template-columns: 1fr; gap: 0.85rem; margin-top: 1.6rem; }
/* the detail page's .attendees is a standalone paragraph; inside a row it
   sits tight under the date, like .card-time-tpe */
.meetup-list .attendees { font-size: 0.88rem; margin: 0.15rem 0 0; }
```

- [ ] **Step 2: Verify no theme tokens changed**

Run:

```bash
git diff -- site/site.css | grep -E "^[-+].*--(bg|fg|muted|accent|accent-pop|accent-contrast|card|card-strong|border|hero-tint):" | wc -l
```

Expected: `0` (no added or removed token declaration → `docs/theming.md` stays untouched).

- [ ] **Step 3: Commit**

```bash
git add site/site.css
git commit -m "feat: style the past meetups list"
```

---

### Task 5: Repoint the "Meetups" nav on all four pages

**Files:**
- Modify: `site/index.html:19`, `site/meetup.html:18`, `site/moderators.html:18`, `site/meetups.html` (the nav line added in Task 1)

The label stays `nav.meetups` ("Meetups" / "聚會"). `meetup.html#id` is no longer a top-level nav target — it is reached only by clicking a row (or an existing deep link, which keeps working: `initMeetup()` is unchanged).

- [ ] **Step 1: Repoint every nav link**

In each of the four files, change the nav line

```html
      <a href="./meetup.html" data-i18n="nav.meetups"></a>
```

to

```html
      <a href="./meetups.html" data-i18n="nav.meetups"></a>
```

- [ ] **Step 2: Verify all four pages point at the list and none at the detail**

Run:

```bash
grep -c 'href="./meetups.html" data-i18n="nav.meetups"' site/*.html
```

Expected:

```
site/index.html:1
site/meetup.html:1
site/meetups.html:1
site/moderators.html:1
```

Run:

```bash
grep -n 'href="./meetup.html"' site/*.html
```

Expected: **no output** — the detail page is no longer linked from any nav. (`./meetup.html#${m.id}` links live in `site.js`, not in the HTML.)

- [ ] **Step 3: Commit**

```bash
git add site/index.html site/meetup.html site/meetups.html site/moderators.html
git commit -m "feat: point the Meetups nav at the archive list"
```

---

### Task 6: Manual verification pass

**Files:** none modified (two temporary edits are made and reverted in-task)

This is the spec's testing section, executed. Run every check — the temporary edits in Steps 5 and 6 are the only way to exercise the null-attendees and empty-state branches against today's data (both seeded past meetups have integer `attendees`, and the archive is non-empty).

- [ ] **Step 1: Build and serve**

```bash
npm run build && npx serve dist
```

Expected: build prints `✓ data validated and emitted to dist/data/`, server prints a local URL (typically `http://localhost:3000`).

- [ ] **Step 2: Check the list renders**

Open `http://localhost:3000/meetups.html`.

Expected:
- `<h1>` reads "Past meetups".
- One row per past meetup, **most recent first** (with today's data: 2026-07-21 above 2026-07-14).
- Each row shows a full date line (e.g. "Tuesday, July 21, 2026"), a 👥 count, then a bulleted list of segment titles — **talks and chats both**, in file order, with `— Speaker` appended where a speaker exists.
- No console errors.

- [ ] **Step 3: Check the row links**

Click the top row.

Expected: lands on `meetup.html#2026-07-21` and the detail page renders that meetup (not a "Meetup not found" card). Go back, click the second row, confirm it opens the 7/14 meetup.

- [ ] **Step 4: Check the language toggle and the nav**

On `/meetups.html`, click the `EN｜中文` toggle.

Expected: the heading becomes 「歷次聚會」, dates re-render in zh-TW (e.g. 「2026年7月21日星期二」), the count line becomes `👥 38 位 aitians`, and zh segment titles switch where a title has an `{en, zh}` form. Toggle back to EN and confirm it reverts.

Then, from `/index.html`, `/meetup.html`, `/moderators.html`, and `/meetups.html`, click the "Meetups" nav item.

Expected: all four land on `/meetups.html`.

- [ ] **Step 5: Check the null-attendees branch**

Temporarily edit `data/meetups/2026-07-21.md`, changing `attendees: 38` to `attendees: null`. Re-run `npm run build`, hard-reload `/meetups.html`.

Expected: the 7/21 row shows the date and its segment list with **no 👥 line**; the 7/14 row still shows `👥 31 aitians`.

Revert:

```bash
git checkout -- data/meetups/2026-07-21.md && npm run build
```

Expected: `git status --porcelain data/` prints nothing, and the 👥 line is back after a reload.

- [ ] **Step 6: Check the empty state**

Temporarily edit `site/site.js`, changing the first line of `renderMeetups()`:

```js
  const { past } = splitMeetups(meetupsListCache); // already most-recent-first
```

to:

```js
  const past = [];
```

Re-run `npm run build`, hard-reload `/meetups.html`.

Expected: a single card reading "No past meetups yet." (「還沒有過往的聚會。」 in zh mode), no rows.

Revert:

```bash
git checkout -- site/site.js && npm run build
```

Expected: `git status --porcelain site/` prints nothing, and the rows are back after a reload.

- [ ] **Step 7: Confirm the working tree is clean**

Run: `git status --porcelain`
Expected: **no output**. Both temporary edits are reverted; nothing from this task gets committed.

---

### Task 7: Docs gate (`CLAUDE.md` end-of-session checklist)

**Files:**
- Modify: `docs/wording.md`, `CHANGELOG.md`, `docs/devlog.md`, `todo.md`
- Not touched (justified): `docs/data-schema.md` (no schema or `fetchJson()` change), `docs/theming.md` (no token change, verified in Task 4 Step 2), the contributor READMEs (contribution flow unchanged)

- [ ] **Step 1: `docs/wording.md` — document the new strings**

The "UI chrome strings" section currently has no table for the general chrome keys, only prose plus per-topic subsections. Add a new subsection **after** the `### Meetup time lines` subsection and **before** `### Language toggle`:

```markdown
### Past meetups archive

The archive page (`site/meetups.html`) lists every meetup that has already happened
([spec](superpowers/specs/2026-07-28-past-meetups-list-design.md)). It reuses `nav.meetups`
(「聚會」) for the nav label and `meetup.aitians` for the 👥 attendee count.

| key | en | zh | Notes |
|---|---|---|---|
| `meetups.pastHeading` | `Past meetups` | `歷次聚會` | page `<h1>` |
| `meetups.none` | `No past meetups yet.` | `還沒有過往的聚會。` | empty-state card, shown when nothing is past yet |
```

- [ ] **Step 2: `CHANGELOG.md` — user-visible entry**

Insert directly under the intro paragraph, above `## v0.8.0 — Labeled materials & per-meetup buttons (2026-07-12)`:

```markdown
## v0.9.0 — Past meetups archive (2026-07-28)

- The "Meetups" nav now opens a browsable archive of every meetup that has already happened,
  newest first — each entry shows the date, how many aitians came, and the talks and chats with
  their speakers.
- Clicking an entry opens that meetup's full page, as before.
```

("What", never "how" — no file paths, validator, or CI detail. Content-only releases v0.8.1–v0.8.5 have no CHANGELOG entries by design; the archive is a feature, so it gets one.)

- [ ] **Step 3: `docs/devlog.md` — newest-on-top entry**

First get the timestamp of the final commit for this entry:

```bash
git log -1 --date=format:'%Y-%m-%d %H:%M' --format='%ad'
```

Use that value as `YYYY-MM-DD HH:MM` below. Insert the entry directly under the `## TL;DR` table's closing (i.e. above the current top entry, the `meta 2026-07-23` section), and add the matching TL;DR row as the **first** row of the table:

TL;DR row:

```markdown
| [v0.9.0](#v090--past-meetups-archive-page-YYYY-MM-DD-HHMM) | **Past meetups archive** — `meetups.html` lists every past meetup newest-first (date, attendee count, talk/chat titles with speakers) and the "Meetups" nav now points there instead of the detail page; a pure frontend consumer of the existing `index.json`, no schema or build change. |
```

Entry (replace `YYYY-MM-DD HH:MM` and the anchor's `YYYY-MM-DD-HHMM` with the git timestamp):

```markdown
## v0.9.0 — Past meetups archive page (YYYY-MM-DD HH:MM)

**Review:** not yet

**Design docs:**
- Past meetups list: [Spec](superpowers/specs/2026-07-28-past-meetups-list-design.md) [Plan](superpowers/plans/2026-07-28-past-meetups-list.md)

**What was built:**
- `site/meetups.html` — a new archive page listing every past meetup newest-first: full date in the
  meetup's timezone, the 👥 attendee count when back-filled, and one line per segment (talks *and*
  chats) with `— Speaker` appended where present. Each row is a `.card` anchor into
  `meetup.html#id`.
- `site.js` gains `initMeetups()` / `renderMeetups()` plus `formatMeetupDate()`, `pastSegmentLine()`,
  and `pastMeetupRow()`; the boot dispatch grows a `meetups` branch.
- The "Meetups" nav on all four pages repoints from `meetup.html` to `meetups.html` — the detail page
  is now reached by clicking a row (deep links still work unchanged).
- Two new bilingual strings (`meetups.pastHeading`, `meetups.none`); `nav.meetups` and
  `meetup.aitians` are reused.
- `.meetup-list` styles reuse the existing `.card` design tokens — no `:root` token change, so
  `docs/theming.md` is untouched.

**Key technical learnings:**
- `[note]` The archive needed **zero** data-layer work: `emit.mjs` already puts `date`, `timezone`,
  `start`/`end`, `attendees`, and `segments` (`type`, `title`, `speaker`) into
  `data/meetups/index.json`, so the page is a pure consumer of one existing fetch.
- `[insight]` Archive rows deliberately drop the "Talk 1:" / "Chat" labels that `segmentLabel()`
  gives cards and the detail page. A list is scanned for *topics*, so the segment title leads;
  the label only earns its space where a single meetup's structure is the subject.
- `[insight]` `splitMeetups()` already returns `past` most-recent-first (it reverses the
  ascending index), so the archive's ordering is free — the one upcoming/past rule (1h grace) stays
  in a single place and the list can never disagree with the landing page about what's past.
- `[gotcha]` `.attendees` was styled for the detail page, where it's a standalone paragraph with
  default `<p>` margins. Dropped into a row it needs `.meetup-list .attendees { margin: .15rem 0 0 }`
  or it floats a full line away from its date.

**Process learnings:**
- `[note]` No frontend test harness exists (`npm test` is the data layer; `site.js` can't be
  imported under Node because it calls `main()` at load). The plan compensated with grep/build
  assertions per task plus a scripted manual pass — including two temporary, explicitly-reverted
  edits to exercise the null-attendees and empty-state branches, which today's seeded data can't
  reach on its own.
```

- [ ] **Step 4: `todo.md` — mark the item**

Under `## Later`, replace:

```markdown
- [ ] **Past events index** — add a browsable list of previous AI展 events.
```

with:

```markdown
- [x] **Past events index** — done 2026-07-28 (v0.9.0): `meetups.html` lists past meetups
      newest-first (date, attendee count, talk/chat titles + speakers) and the "Meetups" nav points
      there; spec
      ([`docs/superpowers/specs/2026-07-28-past-meetups-list-design.md`](docs/superpowers/specs/2026-07-28-past-meetups-list-design.md)),
      plan
      ([`docs/superpowers/plans/2026-07-28-past-meetups-list.md`](docs/superpowers/plans/2026-07-28-past-meetups-list.md)).
      Filtering, search, and per-year grouping stay out of scope.
```

- [ ] **Step 5: Verify the TL;DR anchor resolves**

The devlog TL;DR link must match the GitHub auto-anchor of the heading (lowercase, punctuation stripped except hyphens, spaces → hyphens). For `## v0.9.0 — Past meetups archive page (2026-07-28 14:05)` the anchor is `#v090--past-meetups-archive-page-2026-07-28-1405`.

Run (substitute your actual anchor):

```bash
grep -n "v090--past-meetups-archive-page" docs/devlog.md
```

Expected: exactly **2** lines — the TL;DR row and nothing else referencing a *different* anchor spelling. Then eyeball that the heading text, once slugified, equals the anchor in the TL;DR row.

- [ ] **Step 6: Commit**

```bash
git add docs/wording.md CHANGELOG.md docs/devlog.md todo.md
git commit -m "docs: record the past meetups archive (v0.9.0)"
```

---

### Task 8: Open the PR

**Files:** none

- [ ] **Step 1: Secret / privacy scan (load-bearing — public repo)**

Run:

```bash
git diff main...HEAD
```

Read the **whole** diff. Confirm: no API keys or tokens, no `.env*` file, and nothing sourced from the private sign-up sheet (its contact column, maintainer-side logistics). This change should be frontend + docs only.

- [ ] **Step 2: Confirm the change scope**

Run: `git diff --name-only main...HEAD`

Expected exactly:

```
CHANGELOG.md
docs/devlog.md
docs/superpowers/plans/2026-07-28-past-meetups-list.md
docs/superpowers/specs/2026-07-28-past-meetups-list-design.md
docs/wording.md
site/index.html
site/meetup.html
site/meetups.html
site/moderators.html
site/site.css
site/site.js
site/ui-strings.json
todo.md
```

If anything else appears (especially under `data/` or `scripts/`), a temporary edit from Task 6 leaked into a commit — revert it before proceeding.

- [ ] **Step 3: Rebase onto latest main, then push**

```bash
git fetch origin && git rebase origin/main
npm test && npm run build
git push -u origin feat/past-meetups-list
```

Expected: rebase clean (resolve any `docs/devlog.md` / `todo.md` conflict in version order — newest on top), tests pass, build prints `✓ data validated and emitted to dist/data/`.

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "feat: past meetups archive page (v0.9.0)" --body "$(cat <<'EOF'
## Summary
- New `site/meetups.html` — a browsable archive of past meetups, newest first: date, 👥 attendee count (when back-filled), and one line per segment (talks and chats) with the speaker appended.
- Each row links to the existing `meetup.html#id` detail page; the "Meetups" nav on all four pages now points at the archive instead of the detail page (deep links unchanged).
- Frontend-only: no schema, validator, build, or `data/` change — a pure consumer of the existing `data/meetups/index.json`.

## Docs
- `docs/wording.md` — the two new bilingual strings.
- `CHANGELOG.md` / `docs/devlog.md` / `todo.md` — v0.9.0 entries.

## Test plan
- `npm test` — data-layer suite green (untouched by this change).
- Manual pass on `npm run build && npx serve dist`: ordering, row links, language toggle, nav from all four pages, null-attendees omission, and the empty state.

Spec: `docs/superpowers/specs/2026-07-28-past-meetups-list-design.md`
Plan: `docs/superpowers/plans/2026-07-28-past-meetups-list.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Stop**

Do **not** merge — that's SansWord's call. After they merge, tag the squash commit `v0.9.0` and push the tag.

---

## Open calls for SansWord

Flagging these rather than assuming them silently:

1. **zh copy** — `歷次聚會` / `還沒有過往的聚會。` are first-draft, like the rest of the zh set; they fold into the pending native-review item in `todo.md`.
2. **Date format** — the plan uses the long form ("Tuesday, July 21, 2026" / 「2026年7月21日星期二」) per the spec's "weekday, month day, year". If that reads too heavy in a long list, switching to `weekday: 'short', month: 'short'` is a one-line change in `formatMeetupDate()`.
3. **`meetup.html` with no hash** — still falls back to the next upcoming meetup (or the most recent past one). Now that the nav points elsewhere, that bare URL is only reachable by hand; leaving the fallback as-is is the no-change option and this plan does not touch it.
