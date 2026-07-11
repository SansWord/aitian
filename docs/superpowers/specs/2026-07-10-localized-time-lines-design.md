# Localized meetup time lines — design

**Date:** 2026-07-10 · **Status:** approved (SansWord) · **Scope:** small fix, `site/site.js` + wording

## Problem

`formatMeetupTimes()` (`site/site.js`, spec §2.2 of the MVP) hardcodes locales, so both display
modes show mixed-language time lines:

- **EN mode** still shows the Taipei reminder in Chinese: `台北時間週三 上午9:00 – 上午10:30`
  (hardcoded `zh-TW` locale + literal `台北時間` prefix).
- **ZH mode** still shows the Pacific line in English: `Tue, Jul 14 · 6:00 PM – 7:30 PM PT`
  (hardcoded `en-US` locale).

## Decisions (Q&A with SansWord, 2026-07-10)

- **Scope: both lines** follow the language toggle — no mixed-language time display in either mode.
- **EN Taipei prefix:** `Taipei: ` (compact label style; zh stays `台北時間`).
- **ZH Pacific label:** `美國西岸時間` — explicitly instead of Intl's `太平洋時間`.

## Behavior

| | EN mode | ZH mode |
|---|---|---|
| Pacific line | `Tue, Jul 14 · 6:00 PM – 7:30 PM PT` (unchanged) | `美國西岸時間 7月14日 週二 · 下午6:00 – 下午7:30` |
| Taipei line | `Taipei: Wed 9:00 AM – 10:30 AM` | `台北時間週三 上午9:00 – 上午10:30` (unchanged) |

## Design

- `formatMeetupTimes()` formats with the active language's locale (`en-US` / `zh-TW`) via
  `Intl.DateTimeFormat` — no hand-rolled date/time formats. The existing `applyLang()` full
  re-render already recomputes the lines on toggle; no new invalidation logic.
- **Zone label rules:**
  - EN keeps the Intl-derived suffix (`PT` via `shortGeneric`→`short` fallback) — robust to
    per-meetup `timezone:` overrides.
  - ZH uses the prefix `美國西岸時間` **only when** the meetup's timezone is
    `America/Los_Angeles` (the `community.md` default). Any other timezone falls back to Intl's
    own zh-TW zone name so the line is never mislabeled. All current meetups use the default, so
    in practice zh always shows 美國西岸時間.
- **Copy lives in `site/ui-strings.json`**, not code literals: `time.taipei`
  (en `"Taipei: "` / zh `"台北時間"`) and the zh Pacific prefix (en unused — EN mode keeps the
  Intl suffix), e.g. `time.westCoast`.
- **No data/schema changes.** Display-only; `data/` contract untouched.

## Docs to update (same PR — update triggers)

- `docs/wording.md` — the new copy pairs (trigger: any user-visible wording change, same PR as
  `site/ui-strings.json`).
- `docs/devlog.md` + `todo.md` — end-of-session gate.

## Testing / verification

`site/site.js` has no test harness today, so verification is manual: run the local build, toggle
both languages, and check both time lines on the landing card, coming-up cards, and the meetup
detail page. Also verify a meetup with a non-LA `timezone:` override (temporary local fixture)
renders the zh fallback zone name rather than 美國西岸時間.
