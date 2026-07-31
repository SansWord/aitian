# Spec — per-segment `description` field

**Date:** 2026-07-31
**Status:** approved, ready for planning
**Docs consulted:** `docs/data-schema.md`, `CLAUDE.md` (Locked decisions), `scripts/lib/validate.mjs`, `scripts/lib/emit.mjs`, `site/site.js`, `data/meetups/_template.md`

## Problem

A meetup segment (`talk` or `chat`) has a `title` but no room for a short, multi-line
description of what the segment is about. Speakers/moderators want to give context — an
abstract for a talk, the framing for a chat — beyond a one-line title. It must be
**bilingual (en/zh)** and support **multiple lines/paragraphs**.

## Solution overview

Add one optional, additive bilingual field: `segments[].description`. It renders as
**block markdown** (paragraphs preserved) on the meetup detail page only, directly under
the segment title. No migration — every existing `data/` file stays valid untouched.

This is an additive schema change under the "additive by default" evolution rule
(`docs/data-schema.md` §Evolution rules), so it does **not** need the breaking-change
migration ceremony. It still updates validator + docs + `_template.md` in one PR, per the
schema-change gate.

## Schema

| Field | Required | Type | Notes |
|---|---|---|---|
| `segments[].description` | – | string or `{en, zh}` | short summary of the segment; multi-line, block markdown; markdown links `http(s)://` only; applies to `talk` and `chat` |

- **Shape:** the standard string-or-`{en, zh}`-map bilingual rule — either key omittable,
  at least one required if the map form is used, empty/whitespace map values are a CI error.
  Identical to `speakerBio`/`title`.
- **Multi-line:** authored via YAML block scalars (`description: |`).
- **No length cap** — consistent with `title`/`bio`, which have none. "Keep it short"
  is guidance in the template/README, not CI-enforced.
- **Applies to both segment types.** For a `chat`, it describes the discussion topic.

Author example:

```yaml
segments:
  - type: talk
    title: "Building agents with the Claude SDK"
    speaker: Alice
    description: |
      How we wired durable tool-calling into a production agent.

      Covers retries, streaming, and the **gotchas** we hit — see
      [the repo](https://github.com/example/agent).
```

## Validation (`scripts/lib/validate.mjs`)

- Add `'description'` to `SEGMENT_KEYS` (unknown-key strictness then accepts it and only it).
- Validate with the existing helper:
  `errors.push(...bilingualErrors(seg.description, `${ctx}.description`, { markdownLinks: true }));`
  This reuses the shape check, the empty-map-value check, and the http(s)-only markdown-link
  check for free.
- No new CI error strings, no length check, no `type`-conditional logic.

## Build / emit (`scripts/lib/emit.mjs`)

- `speakerBio` uses `renderInlineMarkdown` (collapses line breaks) — **not** suitable for
  multi-line. Add a block-markdown bilingual helper:

  ```js
  // block markdown per language (paragraphs preserved), sanitized at build
  function bilingualBlockHtml(value) {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      const html = renderMarkdown(value);
      return { en: html, zh: html };
    }
    const en = value.en ?? value.zh ?? '';
    const zh = value.zh ?? value.en ?? '';
    return { en: renderMarkdown(en), zh: renderMarkdown(zh) };
  }
  ```

  (Mirror the existing `bilingualInlineHtml` structure exactly — including its
  string-renders-both-languages and single-key-fallback behavior — but call the block
  renderer.)
- In the segment mapping, emit `descriptionHtml: bilingualBlockHtml(seg.description)`
  alongside `speakerBioHtml`. When `description` is absent, `descriptionHtml` is `undefined`
  and is omitted from the JSON (same as an absent `speakerBio`).
- Raw `description` is not emitted; only `descriptionHtml`. The compact `index.json` already
  strips per-segment HTML fields — the description follows the same path, no new code needed
  there (guard with the existing build test that asserts `speakerBioHtml` is absent from the
  index).

## Render (`site/site.js`)

- **Meetup detail page only** (`renderSegment`, ~line 294). Insert directly **after**
  `segment-title` and **before** materials / the speaker card:

  ```js
  if (seg.descriptionHtml?.[lang]) {
    sec.append(el('div', { class: 'segment-description', html: seg.descriptionHtml[lang] }));
  }
  ```

  Uses `html:` because the content is build-sanitized (the client never parses raw input,
  per the sanitize-at-build rule). A `<div>` (not `<p>`) because block markdown emits its
  own `<p>` elements.
- **No change** to compact renderers: home/landing upcoming cards (`segmentListItems`) and
  the archive page (`pastSegmentLine`) stay one-liners.

## CSS (`site/site.css`)

- Add a `.segment-description` block styled to match body prose (readable line-height,
  paragraph spacing, muted-but-legible color, inherits link styling). Follow the existing
  `.segment-bio` / body-prose tokens; no new theme tokens.

## Tests

- `scripts/test/emit.test.mjs`:
  - multi-line `description` string → `descriptionHtml.en` and `.zh` each contain **two
    `<p>`** blocks (paragraphs preserved), identical for both languages.
  - `{en, zh}` map form → each language renders its own text.
  - absent `description` → no `descriptionHtml` key on the emitted segment.
- `scripts/test/validate.test.mjs`:
  - empty-map-value (`description: { en: "" }`) → CI error.
  - unknown key still rejected (strictness unaffected).
  - a valid multi-line description passes.
- `scripts/test/build-data.test.mjs`: assert `descriptionHtml` is present on the full meetup
  JSON but absent from the compact `index.json` segment (mirror the existing `speakerBioHtml`
  assertions).

## Docs to update (same PR)

- `docs/data-schema.md` — add the `segments[].description` row to the Meetup table. ("What CI
  rejects" needs no new bullet: it's covered by the existing bilingual/markdown-link/unknown-key
  language.)
- `data/meetups/_template.md` — add a commented `description: |` example in the booked-week block.
- `data/meetups/README.md` / `data/README.md` — add `description` where segment fields are
  enumerated (if they enumerate them).
- `CHANGELOG.md`, `docs/devlog.md`, `todo.md` — at ship time (session-close gate).

## Non-goals / YAGNI

- No card preview / truncation on compact lists.
- No CI length cap.
- No new segment types or `type`-conditional behavior.
- No changes to `speakerBio` (stays inline).

## Version

`v0.10.0` (additive feature; new minor).
