# Segmented language toggle — design

**Date:** 2026-07-10 · **Status:** approved (SansWord) · **Scope:** small fix, folds into the
unshipped `feat/localized-time-lines` branch (extends v0.5.2 — no separate release)

## Problem

The language toggle is a single button showing the *target* language (`中` in EN mode, `EN` in ZH
mode, via `toggle.lang` in `site/ui-strings.json`). A lone glyph reads as a state badge, so it's
ambiguous whether it shows the mode you're in or the mode you'd switch to. Separately, `中` alone
is a weak label for the Chinese side.

## Decisions (Q&A with SansWord, 2026-07-10)

- **Style: segmented control** — both options always visible (`EN｜中文`), the **current** language
  highlighted. State display and switch in one; nothing to misread.
- **zh label: `中文`** (over 繁中 / 華語).
- **Ships in the current PR** on `feat/localized-time-lines`, extending the v0.5.2 devlog entry
  (not a new v0.5.3).

## Behavior

| Mode | Toggle renders | Highlighted half |
|---|---|---|
| EN | `EN｜中文` | `EN` |
| ZH | `EN｜中文` | `中文` |

One click anywhere on the button flips the language (existing listener unchanged — both halves sit
inside the same `#lang-toggle` button). The labels are language-invariant: `EN` is always `EN`,
`中文` is always `中文` — that invariance is what removes the ambiguity.

## Design

- **`site/site.js`** — `applyLang()` stops setting the button's `textContent` and instead renders
  two `<span class="lang-opt">` children (`EN`, `中文`), adding class `active` to the current
  language's span, and sets the button's `aria-label` to the localized switch action.
- **`site/ui-strings.json`** — remove `toggle.lang`; add:
  - `toggle.en`: en `"EN"` / zh `"EN"` (invariant)
  - `toggle.zh`: en `"中文"` / zh `"中文"` (invariant)
  - `toggle.aria`: en `"Switch to Chinese"` / zh `"切換至英文"` — the visual highlight tells
    sighted users the state; a screen reader needs the action.

  Invariant values are duplicated across en/zh on purpose: `t()` indexes by language, and keeping
  all chrome copy in ui-strings (not code literals) is the wording-doc governance rule.
- **`site/site.css`** — `.lang-opt` pair: inactive half dim/regular, `.lang-opt.active` accent
  color + bold, thin separator between them. Use existing theme tokens only
  (`docs/theming.md`) — no new tokens.
- **HTML (3 pages)** — `site/index.html`, `site/meetup.html`, `site/moderators.html` each carry the
  button with static content `中` and `aria-label="Switch language"`. Replace the static content
  with the segmented no-JS fallback (`<span class="lang-opt">EN</span><span
  class="lang-opt">中文</span>`, no `active` — which half is current isn't known until JS runs);
  keep the static English `aria-label` as the pre-JS fallback that `applyLang()` overwrites.
- **No data/schema changes.**

## Docs to update (same PR — update triggers)

- `docs/wording.md` — UI chrome strings section: note the toggle redesign (`toggle.lang` →
  `toggle.en`/`toggle.zh`/`toggle.aria`).
- `docs/devlog.md` — extend the existing v0.5.2 entry (What was built + any learnings); TL;DR row
  updated to mention the toggle.
- `docs/theming.md` — only if the separator/highlight ends up needing anything beyond existing
  tokens (not expected; if so, same-PR per its trigger).

## Testing / verification

Manual, as with the time lines: build + serve, toggle both ways, confirm the highlight follows the
**current** language, both labels stay visible in both modes, one click still flips language, and
the button's `aria-label` matches the target action in the inspector.
