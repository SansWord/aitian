# Spec — Favicon (AI展 tab icon)

**Date:** 2026-08-26
**Status:** approved (brainstorm)
**Consulted:** `docs/kickstart.md` §4c, `docs/theming.md`, `site/site.css` (token blocks),
`site/index.html` + the three other pages, `package.json`, `todo.md` ("Add a favicon", Later),
Locked decisions in `CLAUDE.md`.

## Goal

Give the site a browser/tab icon that reads as the **AI展** wordmark, closing the `todo.md` backlog
item. Static assets only — no build-script, schema, or `data/` change.

## The mark

A full-bleed rounded-square tile in the light-theme accent teal `#16697a`, with **展 alone** in the
palette cream `#ede7e3`, ink-bbox-centered at 56/64 of the box (~88%), corner radius 11/64.

**Why 展 alone, not the full wordmark.** At 16px each glyph of "AI展" gets ~5px of width and becomes
an unreadable smudge; stacking "AI" over 展 thins the 展 strokes to ~1px. 展 is already the
accent-colored, distinctive half of the wordmark, so a single glyph is both the most legible option
and still unmistakably the brand. The tile is **inverted** from the header wordmark (where 展 is teal
on the page background) because a solid tile is what survives a tab strip.

## Glyph source

Outlined **vector paths**, not SVG `<text>`.

- `<text>` renders tofu on any device without a CJK font, and the icon can't control that.
- The outline is extracted from **Noto Sans TC** at `wght=700` — SIL OFL, so license-clean to embed
  in a public repo, and it is already the first CJK face in the site's `font-family` stack, so the
  icon matches the header wordmark. Weight 700 sits next to the wordmark's `font-weight: 680`.
- Extraction is a **one-time local step** (fontTools + rsvg-convert in a scratchpad); the font is
  never committed and no Python/font dependency enters the repo or CI.

Weight was tuned against real 16/32px renders: 900 closes 展's counters into a blur, 500 goes thin
and washy, 700 keeps the five stacked horizontals open while holding presence in a tab strip.

## Files

| File | Purpose |
|------|---------|
| `site/favicon.svg` | Primary. Outlined paths, ~1.4 KB, crisp at every size |
| `site/favicon.ico` | 16+32 frames, each rendered at its own size (not downsampled from one bitmap), for Safari and legacy fallback |
| `site/apple-touch-icon.png` | 180×180, opaque — the tile already is |

Three `<link>` lines in the `<head>` of all four pages. `npm run build` already does
`cp -R site/. dist/`, so the assets ship with no build change, and `dist/` stays the only published
directory (kickstart §4c).

## Theme behavior — one fixed mark

The icon does **not** follow the light/dark theme. A single saturated tile carries its own contrast
against light and dark browser chrome, and stays identical across SVG, ICO, and the iOS icon.

The alternative — a `prefers-color-scheme` swap inside the SVG to the dark palette (gold `#efcb68`
tile, `#000411` glyph) — is honored by Chrome and Firefox but not by Safari, and cannot be expressed
in the PNG/ICO fallbacks at all. That would render the brand two different ways depending on the
browser, which is worse than not adapting.

## Generation & the theme contract

The three assets are generated once and committed; no generator script (YAGNI). That hard-codes two
palette values *outside* `site/site.css`, so `docs/theming.md` gains a **Favicon** section naming
both and flagging that a palette change means regenerating the icons by hand — otherwise the theme
contract silently forks.

## Non-goals

- No `site.webmanifest` / Android maskable icons.
- No JS that swaps the favicon when the theme toggle flips.
- No change to the header wordmark itself.
