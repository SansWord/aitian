# Per-Segment `description` Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, bilingual, multi-line `segments[].description` field that renders as block markdown on the meetup detail page, directly under the segment title.

**Architecture:** Additive schema change (no migration). The validator accepts a new optional bilingual key; the emitter renders it to sanitized **block** HTML at build time (`descriptionHtml: {en, zh}` or `null`); `site.js` injects that HTML on the detail page only. Follows the existing `speakerBio` pattern exactly, except it uses the block renderer (`renderMarkdown`) instead of the inline one so paragraphs/line breaks survive.

**Tech Stack:** Node ESM, `node:test`, `marked` + `sanitize-html` (build-time render), vanilla JS/CSS frontend.

**Spec:** `docs/superpowers/specs/2026-07-31-segment-description-design.md`

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `scripts/lib/validate.mjs` | Accept + validate `description` | Modify (`SEGMENT_KEYS` + one `bilingualErrors` call) |
| `scripts/lib/emit.mjs` | Render `description` → `descriptionHtml` block HTML | Modify (new `bilingualBlockHtml` helper + one segment field) |
| `site/site.js` | Render description on detail page | Modify (`renderSegment`, after `segment-title`) |
| `site/site.css` | Style `.segment-description` | Modify (new rule near `.segment-bio`) |
| `scripts/test/validate-meetup.test.mjs` | Validation tests | Modify (add cases) |
| `scripts/test/emit.test.mjs` | Emit tests | Modify (add cases) |
| `scripts/test/build-data.test.mjs` | End-to-end golden test | Modify (assert `descriptionHtml` present in detail, absent in index) |
| `scripts/test/fixtures/golden/meetups/2026-01-13-winter-talk.md` | Golden fixture | Modify (add a multi-line `description`) |
| `docs/data-schema.md` | Schema contract | Modify (add table row) |
| `data/meetups/_template.md` | Author template | Modify (commented example) |
| `data/meetups/README.md` | Contributor how-to | Modify (mention `description`) |

**Key facts from the real code (do not deviate):**
- `bilingualInlineHtml` (emit.mjs:33) returns **`null`** when the value is absent/empty, and `speakerBioHtml` is **always emitted** (as `null` when empty), not omitted. `descriptionHtml` mirrors this exactly — emit it always; it is `null` when absent.
- The compact index (`meetupIndexEntry`, emit.mjs:73–84) only picks `{ type, title, speaker }`, so `descriptionHtml` never reaches `index.json` without any change there.
- Validation reuses `bilingualErrors(value, ctx, { markdownLinks: true })` (validate.mjs:48) — it already covers shape, empty-map-value, and http(s)-only markdown links.

---

## Task 1: Validator accepts and validates `description`

**Files:**
- Modify: `scripts/lib/validate.mjs:117` (`SEGMENT_KEYS`) and `scripts/lib/validate.mjs:174` (add a `bilingualErrors` call)
- Test: `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add these tests to `scripts/test/validate-meetup.test.mjs` (near the existing `speakerBio` tests, ~line 145). They rely on the file's existing `errs()` helper:

```js
test('a valid multi-line description passes', () =>
  assert.deepEqual(
    errs({
      segments: [
        { type: 'talk', title: 'x', speaker: 'A', description: 'Line one.\n\nLine two.' },
      ],
    }),
    [],
  ));

test('a bilingual description map passes', () =>
  assert.deepEqual(
    errs({
      segments: [
        { type: 'chat', title: 'x', description: { en: 'English.', zh: '中文。' } },
      ],
    }),
    [],
  ));

test('empty-string description language value is rejected', () =>
  assert.match(
    errs({
      segments: [{ type: 'chat', title: 'x', description: { en: '' } }],
    }).join('\n'),
    /segments\[0\]\.description\.en: empty — omit the key/,
  ));

test('javascript: link inside description markdown is rejected', () =>
  assert.match(
    errs({
      segments: [
        { type: 'talk', title: 'x', speaker: 'A', description: 'see [me](javascript:alert(1))' },
      ],
    }).join('\n'),
    /description/,
  ));

test('unknown segment key is still rejected alongside description', () =>
  assert.match(
    errs({
      segments: [{ type: 'chat', title: 'x', description: 'ok', bogus: 1 }],
    }).join('\n'),
    /segments\[0\]: unknown field "bogus"/,
  ));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/test/validate-meetup.test.mjs`
Expected: FAIL — the first two tests report `unknown field "description"` (currently rejected), so they don't equal `[]`.

- [ ] **Step 3: Add `description` to `SEGMENT_KEYS`**

In `scripts/lib/validate.mjs:117`, add `'description'`:

```js
const SEGMENT_KEYS = ['type', 'title', 'speaker', 'speakerBio', 'description', 'materials', 'links'];
```

- [ ] **Step 4: Validate the field**

In `scripts/lib/validate.mjs`, immediately after the `speakerBio` line (currently line 174):

```js
      errors.push(...bilingualErrors(seg.speakerBio, `${ctx}.speakerBio`, { markdownLinks: true }));
      errors.push(...bilingualErrors(seg.description, `${ctx}.description`, { markdownLinks: true }));
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test scripts/test/validate-meetup.test.mjs`
Expected: PASS (all tests, including the pre-existing ones).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-meetup.test.mjs
git commit -m "feat: validate optional segments[].description bilingual field

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Emit `descriptionHtml` as block HTML

**Files:**
- Modify: `scripts/lib/emit.mjs` (new `bilingualBlockHtml` helper after `bilingualInlineHtml` at line 42; new segment field at line 61–62)
- Test: `scripts/test/emit.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add to `scripts/test/emit.test.mjs` (after the `speakerBio` test, ~line 46):

```js
test('multi-line description renders block HTML (paragraphs) identically for both languages', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        { type: 'talk', title: 'T', speaker: 'A', description: 'Para one.\n\nPara two.' },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  const d = m.segments[0].descriptionHtml;
  assert.equal((d.en.match(/<p>/g) || []).length, 2); // two paragraphs preserved
  assert.match(d.en, /Para one\./);
  assert.match(d.en, /Para two\./);
  assert.equal(d.en, d.zh);
});

test('bilingual description map renders each language independently', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        { type: 'chat', title: 'C', description: { en: 'English body.', zh: '中文內容。' } },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  const d = m.segments[0].descriptionHtml;
  assert.match(d.en, /English body\./);
  assert.match(d.zh, /中文內容。/);
});

test('absent description emits descriptionHtml: null (mirrors speakerBioHtml)', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: { date: '2026-07-14', segments: [{ type: 'chat', title: 'C' }] },
    content: '',
    defaults: DEFAULTS,
  });
  assert.equal(m.segments[0].descriptionHtml, null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/test/emit.test.mjs`
Expected: FAIL — `descriptionHtml` is `undefined` (field not emitted yet), so the assertions throw.

- [ ] **Step 3: Add the `bilingualBlockHtml` helper**

In `scripts/lib/emit.mjs`, immediately after `bilingualInlineHtml` (ends at line 42), add — mirroring `bilingualInlineHtml`'s null-return and single-key-fallback but calling the block renderer:

```js
// string-or-{en,zh} of markdown → {en, zh} of block HTML (or null when absent).
// Block (not inline) so multi-line descriptions keep their paragraphs.
function bilingualBlockHtml(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const html = renderMarkdown(value);
    return { en: html, zh: html };
  }
  const en = value.en ?? value.zh;
  const zh = value.zh ?? value.en;
  return { en: renderMarkdown(en), zh: renderMarkdown(zh) };
}
```

- [ ] **Step 4: Emit the field**

In `scripts/lib/emit.mjs`, in the `segments` map (after the `speakerBioHtml` line, currently line 61):

```js
      speakerBioHtml: bilingualInlineHtml(seg.speakerBio),
      descriptionHtml: bilingualBlockHtml(seg.description),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test scripts/test/emit.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/emit.mjs scripts/test/emit.test.mjs
git commit -m "feat: emit segments[].descriptionHtml as sanitized block HTML

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Golden fixture + end-to-end build test

**Files:**
- Modify: `scripts/test/fixtures/golden/meetups/2026-01-13-winter-talk.md`
- Modify: `scripts/test/build-data.test.mjs`

- [ ] **Step 1: Add a description to the golden fixture**

Edit `scripts/test/fixtures/golden/meetups/2026-01-13-winter-talk.md` to add a multi-line `description` to the talk segment:

```yaml
---
date: 2026-01-13
segments:
  - type: talk
    title: "Winter talk"
    speaker: Alice
    speakerBio: "Builds things — [site](https://alice.example)."
    description: |
      What the talk covers.

      A second paragraph.
---
```

- [ ] **Step 2: Add the failing assertions**

In `scripts/test/build-data.test.mjs`, after the winter `speakerBioHtml` assertion (line 30), add:

```js
  assert.equal((winter.segments[0].descriptionHtml.en.match(/<p>/g) || []).length, 2); // block HTML, paragraphs kept
  assert.equal(summer.segments[0].descriptionHtml, null); // no description authored → null
```

And after the existing index compactness assertion (`speakerBioHtml` absent from index, line 25), add:

```js
  assert.ok(!('descriptionHtml' in index[0].segments[0])); // …and no description in the compact index
```

Note: the `summer` variable is declared later in the test (line 34) than the winter block. Place the `summer.segments[0].descriptionHtml` assertion **after** that declaration (e.g. next to the existing `summer.segments[0].materials` assertion), not in the winter block.

- [ ] **Step 3: Run to verify it fails, then passes**

Run: `node --test scripts/test/build-data.test.mjs`
Expected before fixture/emit wiring: it now passes because Task 2 already emits the field — run it to confirm PASS. If it fails, the fixture indentation is wrong (YAML block scalar must be indented under `description:`).

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add scripts/test/fixtures/golden/meetups/2026-01-13-winter-talk.md scripts/test/build-data.test.mjs
git commit -m "test: golden coverage for segment description end-to-end

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Render the description on the detail page

**Files:**
- Modify: `site/site.js:294` (inside `renderSegment`, after the `segment-title` line, before the `materials` block)
- Modify: `site/site.css` (near `.segment-bio`, line 313)

- [ ] **Step 1: Inject the description HTML**

In `site/site.js`, after the `segment-title` append (line 294) and **before** the `if (seg.materials.length > 0)` block:

```js
      sec.append(el('p', { class: 'segment-title', text: pick(seg.title) }));
      if (seg.descriptionHtml?.[lang]) {
        sec.append(el('div', { class: 'segment-description', html: seg.descriptionHtml[lang] }));
      }
```

`html:` is safe here because the content was sanitized at build time (client never parses raw input). A `<div>` wraps it because block markdown emits its own `<p>` elements. `?.[lang]` guards the `null` case.

- [ ] **Step 2: Style it**

In `site/site.css`, after the `.segment-bio` rule (line 313), add:

```css
.segment-description { font-size: 0.95rem; line-height: 1.55; color: var(--fg); margin: 0.4rem 0 0; }
.segment-description p { margin: 0 0 0.6rem; }
.segment-description p:last-child { margin-bottom: 0; }
.segment-description a { color: var(--accent); }
```

(Uses existing tokens `--fg` and `--accent` — no new theme tokens, per the spec. If `--fg` is not the body text token in this file, use whatever the body/`.meetup-intro` prose uses; grep `:root` in `site.css` to confirm the token name before committing.)

- [ ] **Step 3: Verify token names**

Run: `grep -nE "\-\-fg|\-\-accent|\.meetup-intro" site/site.css`
Expected: confirm `--fg` and `--accent` exist. If `--fg` is absent, swap it for the token `.segment-bio` / body prose uses and re-edit Step 2.

- [ ] **Step 4: Build and eyeball**

Run: `npm run build` (or the project's data-build + serve command — check `package.json` scripts)
Then open `meetup.html#2026-01-13-winter-talk` locally if a golden/dev dataset is available; otherwise verify the emitted JSON:
Run: `node --test scripts/test/build-data.test.mjs`
Expected: PASS. Visual check is best-effort; the emit/build tests are the source of truth.

- [ ] **Step 5: Commit**

```bash
git add site/site.js site/site.css
git commit -m "feat: render segment description on the meetup detail page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Docs — schema, template, README

**Files:**
- Modify: `docs/data-schema.md` (Meetup table, after the `speakerBio` row, line 50)
- Modify: `data/meetups/_template.md` (booked-week commented block)
- Modify: `data/meetups/README.md:22–23`

- [ ] **Step 1: Add the schema table row**

In `docs/data-schema.md`, after the `segments[].speakerBio` row (line 50), add:

```markdown
| `segments[].description` | – | string or `{en, zh}` | short summary of the segment (talk or chat); multi-line **block** markdown (paragraphs), markdown links `http(s)://` only; renders on the detail page under the title |
```

- [ ] **Step 2: Add the template example**

In `data/meetups/_template.md`, inside the commented booked-week `segments:` example, add a `description` line after `speakerBio` (keep it commented, matching the block's style):

```yaml
#     speakerBio: ""             # optional; 1-2 sentences, markdown links OK (http(s) only)
#     description: |             # optional; short, multi-line markdown summary of this segment
#       What this talk/chat is about.
```

- [ ] **Step 3: Update the contributor README**

In `data/meetups/README.md`, extend line 22–23 to name `description`:

```markdown
3. For each booked segment fill `type`, `title`, and `speaker` — plus `speakerBio`, `description`
   (a short multi-line summary of the segment), `links` (the speaker's public links), and
   `materials` (labeled slides/demo/repo links) if you have them.
```

- [ ] **Step 4: Sanity-check the template still validates**

Run: `npm test`
Expected: PASS (templates are skipped by validation, but the full suite confirms nothing regressed).

- [ ] **Step 5: Commit**

```bash
git add docs/data-schema.md data/meetups/_template.md data/meetups/README.md
git commit -m "docs: document segments[].description

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Session-close gate (devlog, todo, changelog)

**Files:**
- Modify: `docs/devlog.md` (new top entry + TL;DR row)
- Modify: `todo.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Devlog entry**

Add a newest-on-top `## v0.10.0 — Segment descriptions (YYYY-MM-DD HH:MM)` entry (timestamp from the final commit via `git log -1 --format=%cd`), following the global `CLAUDE.md` format: `**Review:** not yet`, `**Design docs:**` linking the spec (`superpowers/specs/2026-07-31-segment-description-design.md`) and this plan (`superpowers/plans/2026-07-31-segment-description.md`), `**What was built:**`, `**Key technical learnings:**` (tag the inline-vs-block markdown distinction as `[insight]`). Add the matching TL;DR table row with a section anchor link.

- [ ] **Step 2: CHANGELOG entry**

Add a newest-first, English, feature-only entry to `CHANGELOG.md` (the "what", no file paths/CI internals):

```markdown
- Segments can now carry a short, multi-line **description** (bilingual) shown under the talk/chat title on the meetup page.
```

- [ ] **Step 3: Update todo.md**

Mark the segment-description item done / remove it if listed; add any follow-ups discovered.

- [ ] **Step 4: Commit**

```bash
git add docs/devlog.md CHANGELOG.md todo.md
git commit -m "docs: devlog + changelog for v0.10.0 segment descriptions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 5: Final verification**

Run: `npm test`
Expected: PASS. Then confirm the PR scope:
Run: `git diff --name-only main...HEAD`
Expected: only the files listed in this plan's file-structure table (plus the spec/plan docs). Then hand off to the user to open the PR (do not merge).

---

## Self-review notes

- **Spec coverage:** schema (Task 1), block-render helper + null-when-absent (Task 2), index compactness unchanged & asserted (Task 3), detail-only render after title (Task 4), CSS with existing tokens (Task 4), all three test files (Tasks 1–3), docs + template + README (Task 5), session-close gate (Task 6). Every spec section maps to a task.
- **Type consistency:** helper is `bilingualBlockHtml` throughout; emitted field is `descriptionHtml` (a `{en, zh}` object or `null`) everywhere — validator/emit/site/tests agree.
- **Deviation from spec, intentional:** spec said absent → `descriptionHtml` "omitted"; the real `speakerBio` pattern emits `null`. Plan follows the real pattern (`null`), and the render guard `?.[lang]` handles it. Called out in Task 2 / Task 3.
