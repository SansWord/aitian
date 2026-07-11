# Localized Meetup Time Lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both meetup time lines (Pacific + Taipei reminder) render in the active toggle language — no mixed-language time display in either mode.

**Architecture:** `formatMeetupTimes()` in `site/site.js` currently hardcodes `en-US` for the Pacific line and `zh-TW` + a literal `台北時間` for the Taipei line. Change it to pick the locale from the module-level `lang` variable and move the two label strings into `site/ui-strings.json`. No new invalidation logic: the existing `applyLang()` full re-render already recomputes both lines on every toggle. No data/schema changes.

**Tech Stack:** vanilla JS (`Intl.DateTimeFormat`), `site/ui-strings.json`, no dependencies.

**Spec:** `docs/superpowers/specs/2026-07-10-localized-time-lines-design.md`

**Testing note (spec deviation from TDD):** `site/site.js` is a browser module with no test harness (`npm test` covers only `scripts/`). Per the approved spec, verification is manual — build, serve, toggle both languages, plus a temporary non-LA-timezone fixture. Task 2 spells this out step by step.

**Branch:** work continues on `feat/localized-time-lines` (the spec is already committed there). Never commit to `main`; stage explicit paths only (no `git add -A`).

**Target behavior (from the spec):**

| | EN mode | ZH mode |
|---|---|---|
| Pacific line | `Tue, Jul 14 · 6:00 PM – 7:30 PM PT` (unchanged) | `美國西岸時間 7月14日 週二 · 下午6:00 – 下午7:30` |
| Taipei line | `Taipei: Wed 9:00 AM – 10:30 AM` | `台北時間週三 上午9:00 – 上午10:30` (unchanged) |

Zone label rules: EN keeps the Intl-derived suffix (robust to per-meetup `timezone:` overrides). ZH uses the `美國西岸時間` prefix **only when** `m.timezone === 'America/Los_Angeles'`; any other timezone falls back to Intl's own zh-TW zone name so the line is never mislabeled.

---

### Task 1: Localize `formatMeetupTimes()` + new UI strings

**Files:**
- Modify: `site/ui-strings.json` (add two keys)
- Modify: `site/site.js:73-102` (`formatMeetupTimes()`)

- [ ] **Step 1: Add the two label strings to `site/ui-strings.json`**

Insert after the `"toggle.lang"` line (keep it valid JSON — add a comma to the previous last entry):

```json
  "toggle.lang": { "en": "中", "zh": "EN" },
  "time.taipei": { "en": "Taipei: ", "zh": "台北時間" },
  "time.westCoast": { "en": "", "zh": "美國西岸時間" }
```

Spacing is deliberate and load-bearing: the en value `"Taipei: "` carries a **trailing space** (renders `Taipei: Wed …`); the zh value `"台北時間"` has none (renders `台北時間週三 …`, matching current output). `time.westCoast.en` is `""` because EN mode never reads it — the EN Pacific line keeps the Intl zone suffix (`PT`).

- [ ] **Step 2: Replace `formatMeetupTimes()` in `site/site.js`**

Replace the whole function (currently lines 73–102, from the `// ---------- time display` comment through the closing `}`) with:

```js
// ---------- time display (spec §2.2): Pacific first, Taipei reminder ----------
// Both lines follow the language toggle (2026-07-10 localized-time-lines spec);
// applyLang()'s full re-render recomputes them on every toggle.
function formatMeetupTimes(m) {
  const start = new Date(m.start);
  const end = new Date(m.end);
  const locale = lang === 'zh' ? 'zh-TW' : 'en-US';
  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone: m.timezone, weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: m.timezone, hour: 'numeric', minute: '2-digit', hour12: true,
  });
  let zone = '';
  for (const style of ['shortGeneric', 'short']) {
    try {
      zone = new Intl.DateTimeFormat(locale, { timeZone: m.timezone, timeZoneName: style })
        .formatToParts(start)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
      break;
    } catch { /* older engine without shortGeneric — fall back */ }
  }
  const range = `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  // zh labels the default venue timezone 美國西岸時間 (not Intl's 太平洋時間);
  // any other timezone keeps Intl's zh zone name so the line is never mislabeled.
  const home = lang === 'zh'
    ? `${m.timezone === 'America/Los_Angeles' ? t('time.westCoast') : zone} ${range}`
    : `${range} ${zone}`;
  // The Taipei reminder carries its own weekday — Tuesday evening PT is
  // Wednesday morning in Taipei (spec §2.2). The prefix carries its own
  // spacing: en "Taipei: " (trailing space), zh "台北時間" (none).
  const tpeDay = new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Taipei', weekday: 'short' })
    .format(start);
  const tpeTime = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Taipei', hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const taipei = `${t('time.taipei')}${tpeDay} ${tpeTime.format(start)} – ${tpeTime.format(end)}`;
  return { home, taipei };
}
```

What changed vs. the old function: every `Intl.DateTimeFormat` locale is now the `locale` variable instead of hardcoded `'en-US'` / `'zh-TW'`; the Pacific line branches on `lang` (zh = label prefix, en = Intl zone suffix, unchanged output); the Taipei prefix comes from `t('time.taipei')` instead of the literal `台北時間`.

- [ ] **Step 3: Sanity-check the JSON parses and existing script tests still pass**

Run: `node -e "JSON.parse(require('fs').readFileSync('site/ui-strings.json','utf8')); console.log('json ok')" && npm test`
Expected: `json ok`, then all `node --test` suites PASS (they cover `scripts/` only — this confirms no accidental breakage, not the new behavior).

- [ ] **Step 4: Commit**

```bash
git add site/ui-strings.json site/site.js
git commit -m "feat: meetup time lines follow the zh/en toggle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Manual verification (both languages, both pages, non-LA fallback)

**Files:**
- Temporary fixture (created then reverted): `data/meetups/2026-07-14-ai-role-play.md`

- [ ] **Step 1: Build and serve**

```bash
npm run build
npx serve dist
```

Expected: build prints its validation/emit summary with no errors; `serve` gives a local URL (e.g. `http://localhost:3000`). Keep it running; use a browser (or ask the user to) for the checks below.

- [ ] **Step 2: EN mode checks** (clear the toggle first: DevTools → `localStorage.removeItem('aitian.lang')`, or just click the toggle until the chrome is English)

- Landing "Next meetup" card: Pacific line `Tue, Jul 14 · 6:00 PM – 7:30 PM PT`; Taipei line `Taipei: Wed 9:00 AM – 10:30 AM`. **No Chinese characters in either line.**
- "Coming up" cards and `meetup.html#2026-07-14-ai-role-play`: same two-line format.

- [ ] **Step 3: ZH mode checks** (click the lang toggle)

- Pacific line: `美國西岸時間 7月14日 週二 · 下午6:00 – 下午7:30`. **No English in the line.**
- Taipei line: `台北時間週三 上午9:00 – 上午10:30` (byte-identical to the pre-change output).
- Toggle back and forth twice — lines flip languages every time (confirms the re-render path).

- [ ] **Step 4: Non-LA timezone fallback check**

Temporarily add `timezone: Asia/Tokyo` to the frontmatter of `data/meetups/2026-07-14-ai-role-play.md`, then rebuild:

```bash
npm run build
```

Reload in **zh mode**: the Pacific line's prefix must be Intl's zh name for Tokyo (e.g. `日本時間`), **not** `美國西岸時間`. In **en mode** the zone suffix should read e.g. `GMT+9` / `JST`.

- [ ] **Step 5: Revert the fixture**

```bash
git checkout -- data/meetups/2026-07-14-ai-role-play.md
npm run build
git status
```

Expected: working tree clean except intended files; `data/` unchanged.

---

### Task 3: Update `docs/wording.md` (same-PR update trigger)

**Files:**
- Modify: `docs/wording.md` (§ "UI chrome strings")

- [ ] **Step 1: Add a time-lines copy table**

Append to the end of the "UI chrome strings" section (after the "first-draft copy pending a native review" paragraph):

```markdown
### Meetup time lines

Both time lines follow the language toggle
([spec](superpowers/specs/2026-07-10-localized-time-lines-design.md)). Spacing lives inside the
strings — don't trim them.

| key | en | zh | Notes |
|---|---|---|---|
| `time.taipei` | `Taipei: ` (trailing space) | `台北時間` (no space) | prefix on the Taipei reminder line |
| `time.westCoast` | — (unused: EN keeps the Intl zone suffix, e.g. `PT`) | `美國西岸時間` | zh Pacific-line prefix; applied only when the meetup timezone is `America/Los_Angeles` — other timezones show Intl's zh zone name instead (deliberate override of Intl's 太平洋時間) |
```

- [ ] **Step 2: Commit**

```bash
git add docs/wording.md
git commit -m "docs: wording table for the localized time-line strings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Devlog + todo (end-of-session gate)

**Files:**
- Modify: `docs/devlog.md` (new v0.5.1 entry + TL;DR row)
- Modify: `todo.md` (Now section)

- [ ] **Step 1: Get the timestamp for the heading**

Run: `git log -1 --format='%ad' --date=format:'%Y-%m-%d %H:%M'`
Use its output (the Task 3 docs commit) as `YYYY-MM-DD HH:MM` in the heading and anchor below.

- [ ] **Step 2: Add the v0.5.1 devlog entry** (newest-first: insert directly under the `---` after the TL;DR table, above the v0.5.0 entry)

```markdown
## v0.5.1 — Localized meetup time lines (YYYY-MM-DD HH:MM)

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

**Key technical learnings:**
- `[note]` `formatMeetupTimes()` reads the module-level `lang` and is recomputed by `applyLang()`'s
  full re-render — localizing it needed no new invalidation logic.
- `[insight]` Label spacing differs by language (en `Taipei: ` needs a trailing space, zh `台北時間`
  must not have one) — carrying the spacing inside the ui-string keeps the format template
  language-agnostic.
- `[note]` `美國西岸時間` is a deliberate copy override of Intl zh-TW's `太平洋時間`, so it must stay
  gated on the exact default timezone rather than applied to whatever zone a meetup declares.
```

- [ ] **Step 3: Add the TL;DR row** (top of the TL;DR table, above v0.5.0; derive the anchor from the real heading — lowercase, punctuation stripped except hyphens, spaces→hyphens)

```markdown
| [v0.5.1](#v051--localized-meetup-time-lines-yyyy-mm-dd-hhmm) | **Time-line i18n** — both meetup time lines follow the zh/en toggle (`Taipei: …` in EN, `美國西岸時間 …` in ZH, with a non-LA timezone fallback to Intl's zh zone name); new `time.*` ui-strings documented in `docs/wording.md`. |
```

- [ ] **Step 4: Update `todo.md`**

Add under **Now**:

```markdown
- [ ] **PR review + merge `feat/localized-time-lines`** (SansWord) — squash-merge, then tag the
      squash commit `v0.5.1` (per CLAUDE.md post-merge rule).
```

- [ ] **Step 5: Commit**

```bash
git add docs/devlog.md todo.md
git commit -m "docs: devlog v0.5.1 + todo for localized time lines

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Pre-PR checks (stop before the PR — shipping is the user's call)

**Files:** none (checks only)

- [ ] **Step 1: Scope check — exactly the intended files**

Run: `git diff --name-only main...HEAD`
Expected (exactly, plus the spec/plan docs):

```
docs/devlog.md
docs/superpowers/plans/2026-07-10-localized-time-lines.md
docs/superpowers/specs/2026-07-10-localized-time-lines-design.md
docs/wording.md
site/site.js
site/ui-strings.json
todo.md
```

- [ ] **Step 2: Secret / privacy scan (required — public repo)**

Run: `git diff main...HEAD` and eyeball every hunk: no secrets/API keys/tokens, no `.env*`, no maintainer-side sign-up-sheet data (contact column, logistics). This diff is display copy + docs only, but the scan is required, not precautionary.

- [ ] **Step 3: Rebase onto latest main** (memory: rebase-before-pr)

```bash
git fetch origin && git rebase origin/main
```

Expected: clean rebase (v0.5.0 already merged as `9793fce`). If `docs/devlog.md`/`todo.md` conflict, resolve in version order (newest entry on top).

- [ ] **Step 4: Report done — await "ship it"**

Tell the user: implementation + docs gate complete on `feat/localized-time-lines`; the PR opens when they say so (then squash-merge + tag `v0.5.1` is theirs post-merge).
