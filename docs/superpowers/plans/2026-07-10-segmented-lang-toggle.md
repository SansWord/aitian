# Segmented Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous single-label language toggle (`中`/`EN` showing the *target* language) with a segmented `EN｜中文` control that always shows both options and highlights the **current** one.

**Architecture:** `applyLang()` in `site/site.js` renders two `<span class="lang-opt">` children into the existing `#lang-toggle` button (active class on the current language) and sets a localized `aria-label`; the button's existing click listener is untouched. Labels move from `toggle.lang` to invariant `toggle.en`/`toggle.zh` + `toggle.aria` in `site/ui-strings.json`. The three HTML pages get the segmented markup as a no-JS fallback. CSS styles the halves with existing theme tokens only.

**Tech Stack:** vanilla JS/CSS, `site/ui-strings.json`; no dependencies, no data/schema changes.

**Spec:** `docs/superpowers/specs/2026-07-10-segmented-lang-toggle-design.md`

**Branch / versioning:** work continues on `feat/localized-time-lines` and **extends the v0.5.2 devlog entry** (per the spec, no separate v0.5.3). Never commit to `main`; stage explicit paths only. NOTE: the working tree carries the user's own uncommitted edit to `data/meetups/2026-07-14-ai-role-play.md` (bilingual titles) — leave it untouched and unstaged.

**Testing note (spec deviation from TDD):** `site/site.js` is a browser module with no test harness; per the spec, verification is manual plus scripted smoke checks (Task 2).

---

### Task 1: Segmented toggle — strings, JS, HTML fallback, CSS

**Files:**
- Modify: `site/ui-strings.json` (replace `toggle.lang` with three keys)
- Modify: `site/site.js:40-47` (`applyLang()`)
- Modify: `site/index.html:23`, `site/meetup.html:22`, `site/moderators.html:22` (button content)
- Modify: `site/site.css` (`.lang-opt` rules, after the `.toggles button:hover` block)

- [ ] **Step 1: Replace the toggle strings in `site/ui-strings.json`**

Replace the line:

```json
  "toggle.lang": { "en": "中", "zh": "EN" },
```

with:

```json
  "toggle.en": { "en": "EN", "zh": "EN" },
  "toggle.zh": { "en": "中文", "zh": "中文" },
  "toggle.aria": { "en": "Switch to Chinese", "zh": "切換至英文" },
```

`toggle.en`/`toggle.zh` are deliberately identical across languages (the labels are
language-invariant — that invariance is what removes the ambiguity); they stay in ui-strings
because all chrome copy lives there (wording-doc governance), not in code literals.

- [ ] **Step 2: Rewrite `applyLang()` in `site/site.js`**

Replace the current function (lines 40–47):

```js
function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  document.getElementById('lang-toggle').textContent = t('toggle.lang');
  renderPage();
}
```

with:

```js
function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  // Segmented toggle: both labels always visible, the CURRENT language
  // highlighted; the aria-label carries the switch action for screen readers.
  const toggle = document.getElementById('lang-toggle');
  toggle.setAttribute('aria-label', t('toggle.aria'));
  toggle.replaceChildren(
    el('span', { class: lang === 'en' ? 'lang-opt active' : 'lang-opt', text: t('toggle.en') }),
    el('span', { class: lang === 'zh' ? 'lang-opt active' : 'lang-opt', text: t('toggle.zh') }),
  );
  renderPage();
}
```

(`el()` is declared further down the file; function declarations hoist, so this is safe — the
existing code already relies on this pattern for `renderPage`.)

- [ ] **Step 3: Update the button markup in all three HTML pages**

In `site/index.html` (line 23), `site/meetup.html` (line 22), `site/moderators.html` (line 22),
replace:

```html
<button id="lang-toggle" type="button" aria-label="Switch language">中</button>
```

with:

```html
<button id="lang-toggle" type="button" aria-label="Switch language"><span class="lang-opt">EN</span><span class="lang-opt">中文</span></button>
```

No `active` class in the static markup — which half is current isn't known until JS runs
(`detectLang()` reads localStorage); `applyLang()` immediately replaces the children. The static
English `aria-label` stays as the pre-JS fallback.

- [ ] **Step 4: Add the `.lang-opt` styles to `site/site.css`**

Insert directly after the `.toggles button:hover { ... }` rule:

```css
#lang-toggle { display: inline-flex; align-items: center; gap: 0.45rem; }
.lang-opt { color: var(--muted); }
.lang-opt + .lang-opt {
  border-left: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  padding-left: 0.45rem;
}
.lang-opt.active { color: var(--accent); font-weight: 700; }
```

Existing tokens only (`--muted`, `--border`, `--accent`) — no `docs/theming.md` trigger.

- [ ] **Step 5: Sanity checks**

Run:

```bash
node -e "const s=JSON.parse(require('fs').readFileSync('site/ui-strings.json','utf8')); for (const k of ['toggle.en','toggle.zh','toggle.aria']) if (!s[k]) throw new Error('missing '+k); if (s['toggle.lang']) throw new Error('toggle.lang still present'); console.log('strings ok')"
grep -c "lang-opt" site/index.html site/meetup.html site/moderators.html
npm test
```

Expected: `strings ok`; each HTML file reports `1` (`grep -c` counts matching lines — both spans sit on one line); all script tests PASS.

- [ ] **Step 6: Commit**

```bash
git add site/ui-strings.json site/site.js site/index.html site/meetup.html site/moderators.html site/site.css
git commit -m "feat: segmented EN｜中文 language toggle, current language highlighted

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Manual verification

**Files:** none (checks only)

- [ ] **Step 1: Build and serve**

```bash
npm run build
npx serve dist
```

Expected: `✓ data validated and emitted to dist/data/`; local URL from `serve`.

- [ ] **Step 2: Browser checks** (do them yourself if a browser tool is available; otherwise ask the user)

- EN mode: toggle shows `EN｜中文` with **EN** accent-colored/bold, 中文 dimmed.
- Click the toggle (either half): page flips to zh, **中文** becomes the highlighted half, `EN` dims. Every click flips; labels themselves never change.
- Inspector: `#lang-toggle` has `aria-label="Switch to Chinese"` in EN mode, `切換至英文` in zh mode; `<html lang>` flips `en` ↔ `zh-Hant`.
- All three pages (`index.html`, `meetup.html#2026-07-14-ai-role-play`, `moderators.html`) show the segmented toggle; both light and dark themes keep the active half readable (accent token differs per theme).

---

### Task 3: Docs — wording.md + extend the v0.5.2 devlog entry

**Files:**
- Modify: `docs/wording.md` (after the "Meetup time lines" subsection)
- Modify: `docs/devlog.md` (v0.5.2 TL;DR row + entry)

- [ ] **Step 1: Add the toggle subsection to `docs/wording.md`**

Insert after the "Meetup time lines" table (still inside "UI chrome strings"):

```markdown
### Language toggle

Segmented `EN｜中文` — both labels always visible, the **current** language highlighted
([spec](superpowers/specs/2026-07-10-segmented-lang-toggle-design.md)). `toggle.en` / `toggle.zh`
carry the same value in both languages on purpose: the labels are language-invariant, which is what
makes the control unambiguous. `toggle.aria` carries the screen-reader action. The old
target-language `toggle.lang` (`中`/`EN`) is gone.

| key | en | zh | Notes |
|---|---|---|---|
| `toggle.en` | `EN` | `EN` | invariant label, highlighted in EN mode |
| `toggle.zh` | `中文` | `中文` | invariant label, highlighted in ZH mode |
| `toggle.aria` | `Switch to Chinese` | `切換至英文` | button `aria-label` — the action, not the state |
```

- [ ] **Step 2: Extend the v0.5.2 devlog entry** (heading and anchor stay unchanged)

In `docs/devlog.md`, append to the v0.5.2 **What was built** list:

```markdown
- Segmented language toggle: `EN｜中文` with the current language highlighted (was a single-label
  `中`/`EN` button naming the *target* language, which read ambiguously as a state badge).
  `toggle.lang` replaced by invariant `toggle.en`/`toggle.zh` plus a localized `toggle.aria`;
  segmented no-JS fallback markup in all three HTML pages.
```

and append to its **Key technical learnings** list:

```markdown
- `[insight]` A toggle label naming the *target* language reads as a state badge ("which mode am I
  in?"). Showing both options with the current one highlighted removes the ambiguity structurally
  instead of re-wording it.
```

- [ ] **Step 3: Update the v0.5.2 TL;DR row** — replace its summary text with:

```markdown
| [v0.5.2](#v052--localized-meetup-time-lines-2026-07-10-1717) | **Language chrome i18n** — both meetup time lines follow the zh/en toggle (`Taipei: …` in EN, `美國西岸時間 …` in ZH, with a non-LA timezone fallback to Intl's zh zone name), and the language toggle became a segmented `EN｜中文` control with the current language highlighted; new `time.*`/`toggle.*` ui-strings documented in `docs/wording.md`. |
```

- [ ] **Step 4: Commit**

```bash
git add docs/wording.md docs/devlog.md
git commit -m "docs: wording + devlog for the segmented language toggle

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Pre-PR checks (stop before the PR — shipping is the user's call)

**Files:** none (checks only)

- [ ] **Step 1: Scope check**

Run: `git diff --name-only origin/main...HEAD`
Expected — exactly (the earlier time-lines work plus this feature; the uncommitted
`data/meetups/2026-07-14-ai-role-play.md` edit must NOT appear):

```
docs/devlog.md
docs/superpowers/plans/2026-07-10-localized-time-lines.md
docs/superpowers/plans/2026-07-10-segmented-lang-toggle.md
docs/superpowers/specs/2026-07-10-localized-time-lines-design.md
docs/superpowers/specs/2026-07-10-segmented-lang-toggle-design.md
docs/wording.md
site/index.html
site/meetup.html
site/moderators.html
site/site.css
site/site.js
site/ui-strings.json
todo.md
```

- [ ] **Step 2: Secret / privacy scan (required — public repo)**

Review `git diff origin/main...HEAD` hunks touched by this feature: no secrets/tokens, no `.env*`,
no maintainer-side sign-up-sheet data. Display copy + docs only.

- [ ] **Step 3: Rebase check**

```bash
git fetch origin && git rebase origin/main
```

Expected: already up to date (rebased earlier today), or a clean replay. If `docs/devlog.md` /
`todo.md` conflict again, resolve in version order (newest on top) and re-check whether another
release claimed v0.5.2 — renumber ours if so (heading, anchor, TL;DR, todo, commit message of the
docs commit only if it hasn't been pushed).

- [ ] **Step 4: Report done — await "ship it"**

Tell the user: both features (time lines + segmented toggle) complete on `feat/localized-time-lines`
with docs folded in; their bilingual-titles data edit is still uncommitted awaiting their call
(include in this PR or separate content PR); the PR opens on their "ship it".
