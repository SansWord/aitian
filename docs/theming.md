# Theming — the color system and how to change it

**Maintained doc** — must match `site/site.css`. Any palette or token change updates this file in the
same PR.

## Where color lives

The reusable palette tokens live in the three theme blocks at the top of
[`site/site.css`](../site/site.css):

1. `:root` — light theme (the base)
2. `:root[data-theme="dark"]` — dark via the explicit toggle
3. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` — dark via OS preference

Most component styling consumes those tokens, but the current showroom treatment also includes
theme-specific gradient layers, glow washes, and hero-image scrims lower in the file. Those layers
are part of the theme system too and have to be checked whenever the tokens move.

**Rules that keep theming safe:**

- The two dark blocks must stay **byte-identical** (spec 2026-07-09 §2.6) — a value that changes in
  one and stays in the other silently forks the toggle path from the OS-preference path.
- Reusable component colors should still come from `var(--token)` first. The current stylesheet also
  has a small number of theme-scoped `rgba(...)` / gradient layers outside the token blocks for
  page glow, surface wash, and hero-image scrims; when those change, treat them as part of the
  maintained theme contract and update this doc too.
- Each block declares `color-scheme` (light/dark) so native controls and scrollbars follow the theme.
- The presentational dark-theme overrides later in the file are also duplicated: one set under
  `:root[data-theme="dark"]`, one set under `@media (prefers-color-scheme: dark)`. Those paired
  rules must stay semantically identical for the same reason as the token blocks.

## Current palettes

| Theme | Source | Colors |
|-------|--------|--------|
| Light | [coolors 16697a-489fb5-82c0cc-ede7e3-ffa62b](https://coolors.co/palette/16697a-489fb5-82c0cc-ede7e3-ffa62b) | lagoon teals + warm cream + orange |
| Dark | Manual five-color set from SansWord/pinku | `#000411`, `#E1EFE6`, `#82C0CC`, `#EFCB68`, `#16697A` |

## Token roles

Tokens name **roles**. The current light theme still uses the earlier adapted palette mapping; the
current dark theme maps only within the five hexes above. The table below is the contract: what
each token is for, what consumes it, and the contrast it must clear.

| Token | Role | Consumed by | Contrast requirement | Light | Dark |
|-------|------|-------------|----------------------|-------|------|
| `--bg` | page background | `body`, gradient tail | — | `#eef4f6` pale green-blue | `#030912` near-black navy |
| `--fg` | body text, headings | `body`, `.brand`, cards | ≥ 7:1 on `--bg` and `--card` (long-form reading) | `#092031` deep blue ink | `#EAF8FB` pale cyan-white |
| `--muted` | secondary text (nav, timestamps, bios, speaker bylines) | many | ≥ 4.5:1 on `--bg` and `--card` | `#4f6870` slate blue-green | `#9AD0DA` lighter sky |
| `--accent` | interactive/identity color: links, 展 in the wordmark, segment labels, primary CTA fill in light | `a`, `.zhan`, `.segment-label`, `.cta` | ≥ 4.5:1 on `--bg` and `--card`; on-fill text must remain readable | `#16697a` teal | `#EFCB68` gold |
| `--accent-pop` | attention glow / highlight accent | featured-card glow, warm hero highlight, hover emphasis | ≥ 3:1 vs `--bg` when used as an edge or local glow | `#ffa62b` orange | `#EFCB68` gold |
| `--accent-contrast` | reserved on-fill ink for `--accent-pop` surfaces | future accent-pop fills | ≥ 4.5:1 on `--accent-pop` | `#092031` | `#000411` |
| `--card` | elevated surface | cards, segments, toggles | must read as a step from `--bg` | `#EAF2F6` pale blue panel | `#05121F` deep blue-black panel |
| `--card-strong` | brighter top of an elevated surface gradient | hero/cards/toggles highlights | not used as standalone text; must make surfaces feel lit, not outlined | `#ffffff` | `#0A2B42` electric deep blue |
| `--border` | hairlines on surfaces | cards, footer, toggles | visible on both `--bg` and `--card` without reading as a wireframe | `#cfe0e5` pale cyan line | `#274857` dark cyan line |
| `--line-soft` | ultra-soft section separators | footer, long section dividers | visible enough to separate sections without wireframe feel | `#e4edf0` pale mist | `#183644` deep teal line |
| `--hero-tint` | top of the hero gradient (fades into `--bg`) | `.hero`, body background glow | low-contrast by design; text on it still meets the `--fg`/`--muted` requirements | `#82C0CC` cyan mist | `#16697A` teal |

## Design rationale (why the mapping looks like this)

These are the decisions behind the current mapping.

- **The site now follows a "showroom, not wireframe" rule.** Borders still exist, but they only hint
  at edges; the main layering comes from surface gradients, brighter top planes (`--card-strong`),
  soft glows, and shadow.
- **The light theme was intentionally pulled cooler/greener.** The chosen `B` direction reads better
  when the whole page sits in a pale green-blue field instead of warm cream, because that lets the
  darker teal panels and warm orange highlights feel more like lit product surfaces.
- **The dark theme had to move back toward the preview's much deeper base.** When the cards and page
  stayed too close in value, everything collapsed into flat blocks; pushing the page to near-black
  navy and the cards to a blue-black → deep-blue gradient restored the layered, technical feel.
- **The landing hero is now image-backed in both themes.** Dark and light each use their own
  generated demo-stage artwork, with the image mass biased right so the left side stays usable for
  headline copy; the underlying gradient/glow system still carries the page outside the image area.
- **Light and dark still use different palette strategies.** Light keeps the earlier adapted
  teal/cyan/orange showroom system; dark still centers the manually supplied black/mint/cyan/gold/teal
  set, with a darker blue-teal card surface to keep panels readable.
- **Section lines are now their own token.** `--line-soft` exists because footer and long section
  dividers need to separate content without bringing back the rough wireframe feel that a full
  `--border` edge creates.
- **Gold stays the fill accent in dark.** On the black page it remains loud and readable, and black
  CTA text on gold clears contrast comfortably (~13.1:1).

## How to adjust the theme

1. **Pick the palette(s)** — e.g. a coolors link per theme, 4–6 colors each.
2. **Assign roles top-down by contrast, in this order:** `--bg` first, then `--fg` against it, then
   the rest. For each token, check the requirement column above — use
   [WebAIM's contrast checker](https://webaim.org/resources/contrastchecker/) or any WCAG tool.
   When a palette color fails its intended role, adapt it (darken/lighten within its hue) or demote
   it to a fill/tint role, per the rationale section.
3. **Edit the three token blocks first**, then the theme-specific presentation rules that depend on
   them. In the current file that means:
   - the token blocks at the top
   - the explicit dark override section (`:root[data-theme="dark"] …`)
   - the OS-preference dark override section inside `@media (prefers-color-scheme: dark)`
   - any landing-hero image scrim or page-level glow layers whose balance no longer fits the new
     tokens
4. **Verify visually in both themes** on all three pages (`index.html`, `meetup.html?id=…`,
   `moderators.html`): build with `npm run build` (`build-data.mjs` alone skips the `site/` →
   `dist/` copy, so CSS edits won't show), serve `dist/`, and flip the header theme toggle. Look
   specifically at link vs body-text distinguishability, CTA readability, card separation on meetup
   and moderators, dark page-glow balance, and the landing hero image/text overlap in both themes.
5. **Update this doc** — palette references, the token table values, and any rationale that changed
   — in the same PR as the CSS.

Adding a *new* token: add it to all three blocks, give it a row in the token table (role, consumers,
contrast requirement), and note why it exists in the rationale section.
