# Wording — name, lore, and bilingual copy

The single home for AI展's naming story and all site copy (zh/en). Code and data files carry the
*current* copy; this doc is where copy gets decided and reviewed. **Update trigger:** any change to
user-visible wording — update the copy tables here and the corresponding
`site/ui-strings.json` / `data/community.md` values in the same PR.

## The name: AI展 (aitian)

- **Wordmark:** **AI展** — the 展 character shows in the logo so both audiences get it.
- **Romanization:** **aitian** (*Ài-Tián*, Taiwanese Tâi-lô) — ASCII, URL-safe.
- **Three layers of meaning:**
  1. **AI展** — "AI Demo / Expo" (literal; works in English and Chinese).
  2. **愛展 (ài-tián)** — "love/want to demo, love to show off" in Taiwanese (AI ≈ 愛 *ài*;
     展 = to show off / display).
  3. **aitian ≈ "-ian" demonym** — like *Martian / Parisian*: "a citizen of AI." Community members
     are **aitians** ("come join the aitians", "3 new aitians this week").
- **Explaining it to English speakers:** "eye-TYEN — Taiwanese for 'love to show off', and we're
  the aitians."

## Tagline

| Language | Copy | Notes |
|---|---|---|
| en | **Show off your AI work** | imperative phrase, no hyphen (hyphenated "show-off" is the noun) |
| zh | **用你的 AI 作品展風神** | 展風神 (Tâi-lô *tián-hong-sîn*, "to show off") echoes the 愛展 pun and reuses the 展 glyph from the wordmark |

## CTA copy

| id | en | zh | Status |
|---|---|---|---|
| `rsvp` | RSVP | 報名聚會 | live — links to the Luma event; shown on the landing hero and on upcoming meetup detail pages; when the event link changes, update `href` in [`data/community.md`](../data/community.md) |

## UI chrome strings

Live in [`site/ui-strings.json`](../site/ui-strings.json) (`{key: {en, zh}}`). The zh set is
**first-draft copy pending a native review by SansWord/pinku** — notably: 主持群 (moderators),
分享 (talk), 自由聊 (chat), 講者徵求中——想來分享嗎？ (TBA slot).

Retired: `meetup.materials` (v0.8.0) — material links now carry their own contributor-authored
labels from `segments[].materials`, so there is no shared UI label anymore.

### Meetup time lines

Both time lines follow the language toggle
([spec](superpowers/specs/2026-07-10-localized-time-lines-design.md)). Spacing lives inside the
strings — don't trim them.

| key | en | zh | Notes |
|---|---|---|---|
| `time.taipei` | `Taipei: ` (trailing space) | `台北時間` (no space) | prefix on the Taipei reminder line |
| `time.westCoast` | — (unused: EN keeps the Intl zone suffix, e.g. `PT`) | `美國西岸時間` | zh Pacific-line prefix; applied only when the meetup timezone is `America/Los_Angeles` — other timezones show Intl's zh zone name instead (deliberate override of Intl's 太平洋時間) |

### Language toggle

Segmented `EN｜中文` — both labels always visible, the **current** language highlighted
([spec](superpowers/specs/2026-07-10-segmented-lang-toggle-design.md)). `toggle.en` / `toggle.zh`
carry the same value in both languages on purpose: the labels are language-invariant, which is what
makes the control unambiguous. `toggle.aria` carries the screen-reader action **in Chinese for both
modes** — SansWord's call during implementation, avoiding the English word "Chinese"; each mode
still names its actual target language. The old target-language `toggle.lang` (`中`/`EN`) is gone.

| key | en | zh | Notes |
|---|---|---|---|
| `toggle.en` | `EN` | `EN` | invariant label, highlighted in EN mode |
| `toggle.zh` | `中文` | `中文` | invariant label, highlighted in ZH mode |
| `toggle.aria` | `切換至中文` | `切換至英文` | button `aria-label` — the action, not the state |

## Community intro

Lives in [`data/community.md`](../data/community.md) (`## en` / `## zh` body). Also first-draft,
pending the same review.
