# Contributor-feedback improvements — design

**Date:** 2026-07-12
**Status:** approved (brainstorm session SansWord × Claude)
**Origin:** friction observed in the first public contributor PRs.

Four changes to the `data/` schema and build pipeline, shipped together because they share the
validator → emit → site render path:

1. `segments[].materials` — multiple labeled material links; `materialsUrl` removed (migration).
2. Per-meetup `ctas` — whole-list override of `community.ctas` on detail pages.
3. Validation failures surfaced as GitHub error annotations + a step summary (no new permissions).
4. Bilingual short fields — empty-string language values rejected by CI; plain-string form kept.

**Docs consulted:** `docs/kickstart.md`, `docs/data-schema.md`, `scripts/lib/validate.mjs`,
`scripts/lib/bilingual.mjs`, `scripts/lib/emit.mjs`, `site/site.js`, `.github/workflows/deploy.yml`,
live `data/` files.

## Locked-decision unlock: schema evolution rule

This release breaks the "additive-only" evolution rule (data-schema.md §Evolution rule 1) by
removing `segments[].materialsUrl`. SansWord approved the unlock during the brainstorm. The rule is
**amended**, in `docs/data-schema.md` and the matching `CLAUDE.md` Locked-decisions line:

> **Additive by default.** A breaking change (rename, removal, type change) is allowed only as a
> deliberate migration: one PR updates the validator, docs, and `_template.md` **and patches every
> affected `data/` file**, and the removed field gets a dedicated CI error naming its replacement.
> This is safe because all authored data lives in this repo — nothing external consumes the `.md`
> schema.

The devlog entry for this release logs the unlock.

## §1. Segment materials: `materials` replaces `materialsUrl`

### Schema

- New optional field `segments[].materials`: list of `{label, url}`.
  - Same shape and validation as `links` (`linkListErrors`): `label` required, plain string or
    `{en, zh}`; `url` required, `http(s)://` only.
  - **No speaker requirement** — materials belong to the segment (a chat segment may have
    materials), unlike `links`, which belong to a person.
- `segments[].materialsUrl` is **removed**. The validator rejects it with a dedicated migration
  error (kept out of `SEGMENT_KEYS`; checked before the unknown-field pass so contributors get the
  targeted message):
  `segments[0].materialsUrl: replaced by "materials" — write materials: [{label: "Slides", url: "..."}]`

### Emit (`emit.mjs`)

- Meetup JSON: `materials: (seg.materials ?? []).map(({label, url}) => ({label, url}))`.
- `materialsUrl` disappears from the JSON. `meetupIndexEntry` is unchanged (cards never showed
  materials).

### Frontend (`site/site.js`)

- Detail page: the single `segment-materials` anchor becomes one link per materials entry
  (`pick(label)` as text, `target="_blank" rel="noopener"`), rendered in a materials row in the
  same position.
- The `meetup.materials` UI string is retired from `site/ui-strings.json` — each link now carries
  its own label. `docs/wording.md` updated in the same PR.

### Data migration (same PR)

- `data/meetups/2026-07-14-ai-role-play.md`: `materialsUrl: "https://hooli-survival.vercel.app/"`
  → `materials: [{label: "Demo", url: "https://hooli-survival.vercel.app/"}]`
- `data/meetups/2026-07-21.md`: slides link → `materials: [{label: "Slides", url: ...}]`
- `data/meetups/_template.md` and every README mentioning `materialsUrl` updated.

## §2. Per-meetup CTAs: whole-list override

### Schema

- New optional `ctas` in meetup frontmatter. Identical shape and rules as `community.ctas`:
  `id` required + unique within the file, `label` required bilingual, `href` optional `http(s)://`
  URL or `""` (disabled placeholder button).
- The CTA-list validation is extracted from `validateCommunity` into a shared helper so community
  and meetup validate through one code path with identical error wording.

### Behavior

- Meetup detail page renders `meetup.ctas ?? community.ctas` — **whole-list override**: when a
  meetup defines `ctas`, only its list renders; a meetup wanting "community RSVP + a special link"
  repeats both entries. `ctas: []` is a valid explicit "no CTAs for this meetup".
- The existing "CTAs only while the meetup counts as upcoming" rule is unchanged and applies to
  both sources.
- Landing hero keeps rendering `community.ctas` only. `community.md` is untouched (`ctas` stays
  required there, as the site-wide default).

### Emit

- Meetup JSON gains `ctas`: the mapped list when the frontmatter provides one, `null` when absent
  (so the frontend can distinguish "override with empty" from "no override").

## §3. Validation failures as PR annotations

Constraint: fork PRs run with a read-only token (`deploy.yml` pins `permissions: contents: read`),
so the validate job cannot post PR comments. Chosen mechanism (SansWord: "annotations only"):
GitHub workflow-command annotations, which need **no permissions at all**.

- When `build-data.mjs` finds validation errors **and** `process.env.GITHUB_ACTIONS === 'true'`,
  it emits one workflow command per error, in addition to the existing stderr report:
  `::error file=data/meetups/2026-07-21.md::segments[0].materialsUrl: replaced by "materials" — ...`
  - Annotations are file-level (errors come from parsed YAML, so no reliable line numbers); the
    message carries the field path.
  - Messages are escaped per the workflow-command rules (`%` → `%25`, `\r` → `%0D`, `\n` → `%0A`;
    file property additionally `:` → `%3A`, `,` → `%2C`).
- It also appends a Markdown summary (errors grouped by file) to the file named by
  `$GITHUB_STEP_SUMMARY` when that variable is set — same zero-permission trust model.
- Result: errors appear inline in the PR's **Files changed** tab and on the check's summary page;
  contributors never open the build log. `deploy.yml` needs no changes.

## §4. Bilingual short fields: reject empty language values

Current behavior (verified in code): an **omitted** key falls back correctly (`pick()` in
`site/site.js:37`, `bilingualInlineHtml` in `emit.mjs:39-40`), but an **empty string**
(`zh: ""`) passes CI and renders a blank in zh mode — `??` only treats a missing key as absent.

- `bilingualShapeError` gains one rule: a map value that is empty or whitespace-only fails CI:
  `<field>.zh: empty — omit the key instead; the missing language falls back to the one provided`
- The **plain-string form stays legal** (SansWord's call, keeping kickstart §4b's intent): a plain
  string means "same text for both languages" — right for names and single-language talk titles.
- `docs/data-schema.md` §Bilingual gets the explicit rule: *either key may be omitted (at least one
  required); a missing language falls back to the one provided; an empty value is a CI error —
  omit the key instead.*
- No emit or frontend changes: CI now guarantees the invariant the existing `??` fallbacks assume.
- No existing `data/` file has an empty-string language value (verified), so nothing breaks.

## Error handling & edge cases

- `materials: []` and `ctas: []` are valid (empty list ≠ error); `ctas: []` explicitly suppresses
  the community CTAs, `materials: []` renders nothing.
- A file using both `materials` and `materialsUrl` gets the migration error for `materialsUrl`;
  `materials` still validates normally.
- Duplicate `ctas[].id` within one meetup file is an error (same rule as community). Ids do **not**
  need to be unique across files or match community ids — the frontend only keys within one list.
- Annotation output must never crash the build on weird error text (escaping is total, covering
  every emitted character class).

## Testing

- `validate-meetup.test.mjs`: materials happy path + label/url failures; materials on chat segments
  without speaker; `materialsUrl` migration error; meetup `ctas` happy path, duplicate id, bad href;
  empty-string / whitespace-only bilingual values rejected; omitted-key maps still pass.
- `validate-others.test.mjs`: community ctas still validate through the shared helper.
- `emit.test.mjs`: meetup JSON `materials` mapping, `ctas` null-vs-list.
- New coverage for the annotation formatter: workflow-command escaping, `GITHUB_ACTIONS` gating,
  step-summary output.
- Manual check: run `npm run build` on a deliberately broken file locally (annotations print to
  stdout as plain `::error` lines, harmless outside Actions).

## Maintained-doc updates (same PR — the end-of-session gate)

- `docs/data-schema.md`: materials, meetup ctas, bilingual empty rule, evolution-rule amendment.
- `docs/wording.md`: `meetup.materials` string retired.
- `CLAUDE.md`: Locked-decisions schema-stability line amended per the unlock above.
- READMEs (`data/meetups/README.md` and any other mentioning `materialsUrl` or CTA flow).
- `data/meetups/_template.md`: materials + ctas examples.
- `docs/devlog.md`: release entry logging the unlock; `todo.md` updated.
