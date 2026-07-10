# Theming — the color system and how to change it

**Maintained doc** — must match `site/site.css`. Any palette or token change updates this file in the
same PR.

## Where color lives

All color is defined in the three token blocks at the top of [`site/site.css`](../site/site.css):

1. `:root` — light theme (the base)
2. `:root[data-theme="dark"]` — dark via the explicit toggle
3. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` — dark via OS preference

**Rules that keep theming safe:**

- The two dark blocks must stay **byte-identical** (spec 2026-07-09 §2.6) — a value that changes in
  one and stays in the other silently forks the toggle path from the OS-preference path.
- Every other rule in the stylesheet consumes `var(--token)` only. **No hex values outside the token
  blocks.** If a new component needs a color no token expresses, add a token to all three blocks;
  never inline a hex.
- Each block declares `color-scheme` (light/dark) so native controls and scrollbars follow the theme.

## Current palettes

| Theme | Reference | Colors |
|-------|-----------|--------|
| Light | [coolors 16697a-489fb5-82c0cc-ede7e3-ffa62b](https://coolors.co/palette/16697a-489fb5-82c0cc-ede7e3-ffa62b) | lagoon teals + warm cream + orange |
| Dark | [coolors 160c28-efcb68-e1efe6-aeb7b3-000411](https://coolors.co/160c28-efcb68-e1efe6-aeb7b3-000411) | rich black + dark purple + gold + mint |

## Token roles

Tokens name **roles**, and a palette is an ingredient list — most palette colors need adaptation
(darkening, washing out) before they can fill a role. The table below is the contract: what each
token is for, what consumes it, and the contrast it must clear.

| Token | Role | Consumed by | Contrast requirement | Light | Dark |
|-------|------|-------------|----------------------|-------|------|
| `--bg` | page background | `body`, gradient tail | — | `#ede7e3` cream | `#000411` rich black |
| `--fg` | body text, headings | `body`, `.brand`, cards | ≥ 7:1 on `--bg` and `--card` (long-form reading) | `#0c3540` deep teal ink | `#e1efe6` mint |
| `--muted` | secondary text (nav, timestamps, bios) | many | ≥ 4.5:1 on `--bg` and `--card` | `#52686e` slate teal | `#aeb7b3` ash gray |
| `--accent` | interactive/identity color: links, 展 in the wordmark, segment labels | `a`, `.zhan`, `.segment-label` | ≥ 4.5:1 on `--bg` and `--card` | `#16697a` teal | `#efcb68` gold |
| `--accent-pop` | attention fills: CTA background, card hover border | `.cta`, `.card:hover` | ≥ 3:1 vs `--bg` as a fill/border edge | `#ffa62b` orange | `#efcb68` gold |
| `--accent-contrast` | text sitting **on** an `--accent-pop` fill | `.cta` | ≥ 4.5:1 on `--accent-pop` | `#0c3540` | `#160c28` |
| `--card` | elevated surface | cards, segments, toggles | must read as a step from `--bg` | `#f8f4f0` lighter cream | `#160c28` dark purple |
| `--border` | hairlines on surfaces | cards, footer, toggles | visible on both `--bg` and `--card` | `#c2d7da` teal wash | `#2c2244` lighter purple |
| `--hero-tint` | top of the hero gradient (fades into `--bg`) | `.hero` | low-contrast by design; text on it still meets the `--fg`/`--muted` requirements | `#cddbdc` teal mist | `#160c28` purple glow |

## Design rationale (why the mapping looks like this)

These are the decisions behind the current values. They generalize: any future palette faces the
same constraints.

- **The loudest palette color is usually a fill, and a quieter one carries the text.** Orange
  `#ffa62b` on cream is ~1.6:1 — illegible as link text — so teal became `--accent` and orange
  became `--accent-pop` (CTA fills, hover borders), where a shape edge only needs ~3:1. Expect this
  with any bright accent on a light background.
- **Body ink may need to be a deepened shade of a palette color.** Raw `#16697a` is 5.2:1 on the
  cream — fine for muted text, thin for paragraphs — so `--fg` is `#0c3540`, the same hue pushed
  darker. Staying in the palette's hue family keeps it feeling like the palette even though the hex
  isn't literally in it.
- **Dark themes get their depth from an elevation pair.** `#000411` (page) + `#160c28` (cards) turns
  two palette colors into a surface system; the hero reuses the card purple as a glow fading into
  black. One dark value alone flattens the page.
- **One accent per theme is enough.** The dark palette has a single pop (gold), so `--accent` and
  `--accent-pop` share it there. The split into two tokens exists so themes *can* differ (light uses
  teal + orange); a theme is free to collapse them.
- **CTA text is a token.** `.cta` text was hardcoded white; on an orange or gold fill white fails.
  `--accent-contrast` exists so every theme picks its own on-fill ink.

## How to adjust the theme

1. **Pick the palette(s)** — e.g. a coolors link per theme, 4–6 colors each.
2. **Assign roles top-down by contrast, in this order:** `--bg` first, then `--fg` against it, then
   the rest. For each token, check the requirement column above — use
   [WebAIM's contrast checker](https://webaim.org/resources/contrastchecker/) or any WCAG tool.
   When a palette color fails its intended role, adapt it (darken/lighten within its hue) or demote
   it to a fill/tint role, per the rationale section.
3. **Edit the three token blocks** in `site/site.css` — and only those blocks. Copy the dark values
   into **both** dark blocks; diff them if unsure.
4. **Verify visually in both themes** on all three pages (`index.html`, `meetup.html?id=…`,
   `moderators.html`): build with `npm run build` (`build-data.mjs` alone skips the `site/` →
   `dist/` copy, so CSS edits won't show), serve `dist/`, and flip the header theme toggle. Look specifically at: link vs body-text distinguishability, the disabled CTA
   (0.55 opacity — still readable?), card borders on both `--bg` and `--card`, and the hero
   gradient in both themes.
5. **Update this doc** — palette references, the token table values, and any rationale that changed
   — in the same PR as the CSS.

Adding a *new* token: add it to all three blocks, give it a row in the token table (role, consumers,
contrast requirement), and note why it exists in the rationale section.
