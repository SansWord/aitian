# Contributor-Feedback Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four contributor-feedback improvements from the approved spec ([`docs/superpowers/specs/2026-07-12-contributor-feedback-improvements-design.md`](../specs/2026-07-12-contributor-feedback-improvements-design.md)): labeled `segments[].materials` (removing `materialsUrl` — the approved schema-evolution unlock), per-meetup `ctas` whole-list override, validation errors as GitHub PR annotations + step summary, and CI rejection of empty bilingual language values.

**Architecture:** All four changes ride the same validator → emit → site render path. Validator changes land first (TDD, each with its tests), then emit, then the one-PR data migration (live files + template + fixtures), then a new zero-permission `scripts/lib/annotations.mjs` wired into the `build-data.mjs` CLI, then the frontend, then the maintained-docs gate. Release version: **v0.8.0**.

**Tech Stack:** Vanilla Node ≥20 (`node --test`), no new dependencies. Vanilla JS frontend. Tests run with `npm test`; the build with `npm run build`.

**Docs consulted:** `docs/kickstart.md` (via the spec), the spec above, `docs/data-schema.md`, `docs/wording.md`, `CLAUDE.md`, `scripts/lib/{validate,bilingual,emit}.mjs`, `scripts/build-data.mjs`, `site/site.js`, `site/site.css`, `site/ui-strings.json`, all files under `scripts/test/`, live `data/` files.

---

## File map

| File | Change |
|---|---|
| `scripts/lib/bilingual.mjs` | reject empty/whitespace-only map values (§4) |
| `scripts/lib/validate.mjs` | `materials` + `materialsUrl` migration error (§1); shared `ctaListErrors` + meetup `ctas` (§2) |
| `scripts/lib/emit.mjs` | emit `materials`, drop `materialsUrl`, emit `ctas` null-vs-list (§1, §2) |
| `scripts/lib/annotations.mjs` | **new** — workflow-command annotations + step-summary markdown (§3) |
| `scripts/build-data.mjs` | CLI emits annotations + step summary on failure (§3) |
| `site/site.js` | materials row per entry; `m.ctas ?? community.ctas` (§1, §2) |
| `site/site.css` | `.segment-materials` becomes a multi-link row |
| `site/ui-strings.json` | retire `meetup.materials` |
| `data/meetups/2026-07-14-ai-role-play.md`, `2026-07-21.md`, `_template.md` | migrate `materialsUrl` → `materials`; template gains `ctas` example |
| `scripts/test/*` | new/updated tests per task; fixtures updated |
| `docs/data-schema.md`, `docs/wording.md`, `CLAUDE.md`, `data/meetups/README.md`, `CHANGELOG.md`, `docs/devlog.md`, `todo.md` | maintained-docs gate |

---

### Task 0: Prerequisite check + branch setup

**Files:** none modified (branch + first commit only)

- [ ] **Step 1: Verify PR #22 is merged**

The spec, `CHANGELOG.md`, and the v0.8.0-design devlog entry live on branch `docs/public-changelog` (PR #22). This plan appends to `CHANGELOG.md` and links the spec, so #22 must be on `main` first.

Run: `git fetch origin && git log origin/main --oneline -3`
Expected: `b04240a Add public-facing feature changelog` (or a squash commit containing it) appears.

**If it does not:** STOP and ask SansWord to merge PR #22 first. Do not branch from `docs/public-changelog` instead — that stacks the PRs.

- [ ] **Step 2: Create the feature branch off updated main**

```bash
git checkout main && git pull
git checkout -b feat/contributor-feedback
```

- [ ] **Step 3: Commit this plan document**

The plan file is untracked in the working tree (written by the planning session), so it survived the branch switch.

```bash
git add docs/superpowers/plans/2026-07-12-contributor-feedback-improvements.md
git commit -m "docs: add contributor-feedback improvements implementation plan"
```

- [ ] **Step 4: Confirm the baseline is green**

Run: `npm test`
Expected: all tests pass (0 failures).

---

### Task 1: Bilingual short fields — reject empty language values (spec §4)

**Files:**
- Modify: `scripts/lib/bilingual.mjs` (the `bilingualShapeError` key loop)
- Test: `scripts/test/bilingual.test.mjs`, `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Write the failing unit tests**

Append to `scripts/test/bilingual.test.mjs` (after the `non-string values inside the map are invalid` test):

```js
test('empty or whitespace-only map values are invalid', () => {
  assert.match(bilingualShapeError({ en: 'hi', zh: '' }, 'title'), /title\.zh: empty — omit the key/);
  assert.match(bilingualShapeError({ en: '   ' }, 'title'), /title\.en: empty — omit the key/);
});
```

Append to `scripts/test/validate-meetup.test.mjs` (integration through the meetup validator):

```js
test('empty-string bilingual language value is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'talk', title: { en: 'x', zh: '' }, speaker: 'A' }] }).join('\n'),
    /title\.zh: empty — omit the key/,
  ));
test('omitted-key bilingual map still passes', () =>
  assert.deepEqual(errs({ segments: [{ type: 'talk', title: { en: 'x' }, speaker: 'A' }] }), []));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the two new "empty" tests FAIL (`bilingualShapeError` returns `null` today); the omitted-key test passes already.

- [ ] **Step 3: Implement the rule**

In `scripts/lib/bilingual.mjs`, replace the key loop inside `bilingualShapeError`:

```js
    for (const k of keys) {
      if (typeof value[k] !== 'string') return `${fieldPath}.${k}: must be a string`;
      if (value[k].trim() === '') {
        return (
          `${fieldPath}.${k}: empty — omit the key instead; ` +
          'the missing language falls back to the one provided'
        );
      }
    }
```

Note: plain-string `""` stays legal-as-absent — `bilingualErrors` in `validate.mjs` short-circuits `value === ''` before calling `bilingualShapeError`, so only *map* values hit this rule. Don't change that.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, including all pre-existing tests (no live `data/` file has an empty language value — verified in the spec).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/bilingual.mjs scripts/test/bilingual.test.mjs scripts/test/validate-meetup.test.mjs
git commit -m "feat: reject empty bilingual language values in CI"
```

---

### Task 2: Per-meetup `ctas` + shared CTA-list helper (spec §2)

**Files:**
- Modify: `scripts/lib/validate.mjs` (extract `ctaListErrors` from `validateCommunity`; add `ctas` to `validateMeetup`)
- Test: `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/validate-meetup.test.mjs`:

```js
test('meetup ctas happy path (override list) is valid', () =>
  assert.deepEqual(
    errs({ ctas: [{ id: 'rsvp', label: { en: 'RSVP', zh: '報名' }, href: 'https://lu.ma/x' }] }),
    [],
  ));
test('ctas: [] is a valid explicit no-CTAs override', () =>
  assert.deepEqual(errs({ ctas: [] }), []));
test('meetup cta without id is rejected', () =>
  assert.match(errs({ ctas: [{ label: 'x', href: '' }] }).join('\n'), /ctas\[0\]\.id: required/));
test('duplicate meetup cta ids are rejected', () =>
  assert.match(
    errs({
      ctas: [
        { id: 'x', label: 'a', href: '' },
        { id: 'x', label: 'b', href: '' },
      ],
    }).join('\n'),
    /duplicate "x"/,
  ));
test('non-http meetup cta href is rejected', () =>
  assert.match(
    errs({ ctas: [{ id: 'x', label: 'x', href: 'javascript:alert(1)' }] }).join('\n'),
    /http/,
  ));
test('non-list meetup ctas is rejected', () =>
  assert.match(errs({ ctas: 'rsvp' }).join('\n'), /ctas: must be a list/));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the happy-path/`[]` tests FAIL with `unknown field "ctas"`; the error-case tests FAIL because only that unknown-field error appears (no `ctas[0].id` etc.).

- [ ] **Step 3: Extract the shared helper**

In `scripts/lib/validate.mjs`, move the CTA constants + item loop **above** `validateMeetup` (they currently sit at the bottom near `validateCommunity`). Add:

```js
// Shared by community `ctas` and per-meetup `ctas` — identical rules, identical
// error wording (spec 2026-07-12 §2). Ids are unique within one file only.
const CTA_KEYS = ['id', 'label', 'href'];

function ctaListErrors(ctas, ctx) {
  const errors = [];
  const seen = new Set();
  ctas.forEach((cta, i) => {
    const cctx = `${ctx}[${i}]`;
    if (cta === null || typeof cta !== 'object' || Array.isArray(cta)) {
      errors.push(`${cctx}: must be a map with id, label, href`);
      return;
    }
    errors.push(...unknownKeyErrors(cta, CTA_KEYS, cctx));
    if (typeof cta.id !== 'string' || cta.id.trim() === '') {
      errors.push(`${cctx}.id: required stable key (the frontend targets it)`);
    } else if (seen.has(cta.id)) {
      errors.push(`${cctx}.id: duplicate "${cta.id}"`);
    } else {
      seen.add(cta.id);
    }
    errors.push(...bilingualErrors(cta.label, `${cctx}.label`, { required: true }));
    if (cta.href !== undefined) {
      const e = urlError(cta.href, `${cctx}.href`);
      if (e) errors.push(e);
    }
  });
  return errors;
}
```

Then shrink `validateCommunity`'s ctas block to:

```js
  if (!Array.isArray(data.ctas)) {
    errors.push('ctas: required list');
  } else {
    errors.push(...ctaListErrors(data.ctas, 'ctas'));
  }
```

(Delete the old `CTA_KEYS` const and inline loop from the community section — the helper is now the only copy.)

- [ ] **Step 4: Wire `ctas` into `validateMeetup`**

Change `MEETUP_KEYS`:

```js
const MEETUP_KEYS = ['id', 'date', 'startTime', 'endTime', 'timezone', 'segments', 'ctas', 'attendees'];
```

Add after the `attendees` check, before `return errors;`:

```js
  if (data.ctas !== undefined) {
    if (!Array.isArray(data.ctas)) {
      errors.push('ctas: must be a list (use "ctas: []" to hide the community CTAs on this meetup)');
    } else {
      errors.push(...ctaListErrors(data.ctas, 'ctas'));
    }
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — including every existing community CTA test in `validate-others.test.mjs`, which now exercises the shared helper (spec §Testing).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-meetup.test.mjs
git commit -m "feat: per-meetup ctas override via shared CTA-list validation"
```

---

### Task 3: `segments[].materials` + `materialsUrl` migration error (spec §1)

**Files:**
- Modify: `scripts/lib/validate.mjs` (segment loop + `SEGMENT_KEYS`)
- Test: `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Update the GOOD baseline and write the failing tests**

In `scripts/test/validate-meetup.test.mjs`, change the `GOOD` constant's first segment (it currently carries `materialsUrl`):

```js
const GOOD = {
  date: '2026-07-14',
  segments: [
    {
      type: 'talk',
      title: 'A talk',
      speaker: 'Claire',
      materials: [{ label: 'Demo', url: 'https://example.com/x' }],
    },
    { type: 'chat', title: { en: 'Open chat', zh: '自由聊' } },
  ],
  attendees: null,
};
```

**Delete** the now-obsolete test `'non-http materialsUrl is rejected'` and append:

```js
test('segment materials with plain and bilingual labels are valid', () =>
  assert.deepEqual(
    errs({
      segments: [{
        type: 'talk', title: 'x', speaker: 'A',
        materials: [
          { label: 'Slides', url: 'https://example.com/slides.pdf' },
          { label: { en: 'Demo', zh: '示範' }, url: 'https://example.com/demo' },
        ],
      }],
    }),
    [],
  ));
test('materials on a chat segment without a speaker are valid', () =>
  assert.deepEqual(
    errs({
      segments: [{ type: 'chat', title: 'x', materials: [{ label: 'Notes', url: 'https://x.example' }] }],
    }),
    [],
  ));
test('materials entry without a label is rejected', () =>
  assert.match(
    errs({
      segments: [{ type: 'talk', title: 'x', speaker: 'A', materials: [{ url: 'https://x.example' }] }],
    }).join('\n'),
    /segments\[0\]\.materials\[0\]\.label: required/,
  ));
test('non-http materials url is rejected', () =>
  assert.match(
    errs({
      segments: [{ type: 'talk', title: 'x', speaker: 'A', materials: [{ label: 'X', url: 'javascript:alert(1)' }] }],
    }).join('\n'),
    /segments\[0\]\.materials\[0\]\.url: required, must start with http/,
  ));
test('materialsUrl gets the dedicated migration error, not "unknown field"', () => {
  const out = errs({
    segments: [{ type: 'talk', title: 'x', speaker: 'A', materialsUrl: 'https://x.example' }],
  }).join('\n');
  assert.match(out, /segments\[0\]\.materialsUrl: replaced by "materials"/);
  assert.ok(!out.includes('unknown field "materialsUrl"'));
});
test('a segment using both materials and materialsUrl: materials still validates', () => {
  const out = errs({
    segments: [{
      type: 'talk', title: 'x', speaker: 'A',
      materialsUrl: 'https://old.example',
      materials: [{ label: 'X', url: 'ftp://bad.example' }],
    }],
  }).join('\n');
  assert.match(out, /materialsUrl: replaced by "materials"/);
  assert.match(out, /materials\[0\]\.url: required, must start with http/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: `golden meetup has no errors` FAILS (`unknown field "materials"`), and every new test FAILS.

- [ ] **Step 3: Implement**

In `scripts/lib/validate.mjs`:

```js
const SEGMENT_KEYS = ['type', 'title', 'speaker', 'speakerBio', 'materials', 'links'];
```

In the segment loop, replace this line:

```js
      errors.push(...unknownKeyErrors(seg, SEGMENT_KEYS, ctx));
```

with the migration check + gated unknown-field pass (same pattern as the frontmatter `id`: `materialsUrl` is in the *gate* so it isn't double-reported, but not in the displayed allow-list):

```js
      if ('materialsUrl' in seg) {
        errors.push(
          `${ctx}.materialsUrl: replaced by "materials" — ` +
            'write materials: [{label: "Slides", url: "..."}]',
        );
      }
      errors.push(...unknownKeyErrors(seg, [...SEGMENT_KEYS, 'materialsUrl'], ctx, SEGMENT_KEYS));
```

Replace the old `materialsUrl` url check:

```js
      if (seg.materialsUrl !== undefined) {
        const e = urlError(seg.materialsUrl, `${ctx}.materialsUrl`);
        if (e) errors.push(e);
      }
```

with materials validation (same shape/wording as `links`, but **no** speaker requirement — materials belong to the segment):

```js
      errors.push(...linkListErrors(seg.materials, `${ctx}.materials`));
```

Keep the `links` block (including its speaker requirement) exactly as is.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. Note `build-data.test.mjs`'s bad-fixture test still passes untouched: its `'must start with http'` needle also matches the moderator `links[0].url` error, so the fixture migration can wait for Task 5.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-meetup.test.mjs
git commit -m "feat: segments[].materials replaces materialsUrl (migration error in CI)"
```

---

### Task 4: Emit `materials` and `ctas` (spec §1, §2)

**Files:**
- Modify: `scripts/lib/emit.mjs` (`meetupToJson`, `communityToJson`)
- Test: `scripts/test/emit.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/emit.test.mjs`:

```js
test('segment materials map to detail JSON; absent materials emit []; materialsUrl is gone', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        {
          type: 'talk', title: 'T', speaker: 'A',
          materials: [{ label: { en: 'Slides', zh: '簡報' }, url: 'https://a.example/s.pdf' }],
        },
        { type: 'chat', title: 'C' },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  assert.deepEqual(m.segments[0].materials, [
    { label: { en: 'Slides', zh: '簡報' }, url: 'https://a.example/s.pdf' },
  ]);
  assert.deepEqual(m.segments[1].materials, []);
  assert.ok(!('materialsUrl' in m.segments[0]));
});

test('meetup ctas emit as a mapped list when present, null when absent, [] when explicitly empty', () => {
  const base = { date: '2026-07-14', segments: [] };
  const withCtas = meetupToJson({
    id: 'x', data: { ...base, ctas: [{ id: 'rsvp', label: 'RSVP' }] }, content: '', defaults: DEFAULTS,
  });
  assert.deepEqual(withCtas.ctas, [{ id: 'rsvp', label: 'RSVP', href: '' }]);
  const noCtas = meetupToJson({ id: 'x', data: base, content: '', defaults: DEFAULTS });
  assert.equal(noCtas.ctas, null);
  const emptyCtas = meetupToJson({ id: 'x', data: { ...base, ctas: [] }, content: '', defaults: DEFAULTS });
  assert.deepEqual(emptyCtas.ctas, []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: both new tests FAIL (`materials` undefined, `materialsUrl` still present, `ctas` undefined).

- [ ] **Step 3: Implement**

In `scripts/lib/emit.mjs`, add one shared mapper above `meetupToJson` (the community emit already applies the same `href` default — one copy from now on):

```js
// One CTA shape for community and meetup JSON: href always a string ('' = placeholder).
const ctaJson = ({ id, label, href }) => ({ id, label, href: href ?? '' });
```

In `meetupToJson`, replace the segment mapping's `materialsUrl` line:

```js
      materialsUrl: seg.materialsUrl ?? '',
```

with:

```js
      materials: (seg.materials ?? []).map(({ label, url }) => ({ label, url })),
```

and add `ctas` to the returned object after `attendees` (`null` ≠ `[]` so the frontend can tell "no override" from "override with empty" — spec §2):

```js
    attendees: data.attendees ?? null,
    ctas: data.ctas ? data.ctas.map(ctaJson) : null,
```

In `communityToJson`, replace the inline mapping:

```js
    ctas: data.ctas.map(({ id, label, href }) => ({ id, label, href: href ?? '' })),
```

with:

```js
    ctas: data.ctas.map(ctaJson),
```

`meetupIndexEntry` picks its fields explicitly and is unchanged — cards never showed materials or CTAs.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (including the existing `index entries carry no links` test, which also proves the index carries no materials).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/emit.mjs scripts/test/emit.test.mjs
git commit -m "feat: emit segment materials and per-meetup ctas (null = no override)"
```

---

### Task 5: Data migration — live files, template, fixtures (spec §1 migration, §Testing)

**Files:**
- Modify: `data/meetups/2026-07-14-ai-role-play.md`, `data/meetups/2026-07-21.md`, `data/meetups/_template.md`
- Modify: `scripts/test/fixtures/bad/meetups/2026-07-14-broken.md`, `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md`
- Test: `scripts/test/build-data.test.mjs`

- [ ] **Step 1: Extend the integration tests (failing first)**

In `scripts/test/build-data.test.mjs`, add to the `needles` array in the bad-fixture test:

```js
    'replaced by "materials"',                  // materialsUrl migration error
```

In the golden-fixture test, append after the existing `winter` assertions:

```js
  assert.deepEqual(winter.segments[0].materials, []); // no materials authored
  assert.equal(winter.ctas, null); // no override → frontend falls back to community
  assert.ok(!('materialsUrl' in winter.segments[0]));

  const summer = JSON.parse(
    fs.readFileSync(path.join(out, 'data/meetups/2026-07-14-summer-talk.json'), 'utf8'),
  );
  assert.deepEqual(summer.segments[0].materials, [
    { label: { en: 'Notes', zh: '筆記' }, url: 'https://notes.example/chat' },
  ]);
  assert.deepEqual(summer.ctas, [
    { id: 'special', label: { en: 'Join us', zh: '加入我們' }, href: 'https://lu.ma/special' },
  ]);
```

- [ ] **Step 2: Run the tests to verify the new assertions fail**

Run: `npm test`
Expected: the golden-fixture test FAILS on the new `materials`/`ctas` assertions (the fixture doesn't author them yet). The new bad-fixture needle may already pass — the old fixture's `materialsUrl` line now triggers the migration error — and that's fine; the golden assertions are the red part.

- [ ] **Step 3: Update the fixtures**

Overwrite `scripts/test/fixtures/bad/meetups/2026-07-14-broken.md` (keeps every existing needle: `workshop` type, missing speaker, non-integer attendees, unknown field, frontmatter id — and now exercises both the migration error and a bad `materials` url):

```markdown
---
id: 2026-07-14-broken
date: 2026-07-14
location: zoom
segments:
  - type: workshop
    title: "Mystery"
  - type: talk
    title: "No speaker here"
    materialsUrl: "https://example.com/old-style"
  - type: talk
    title: "Bad link"
    speaker: Eve
    materials:
      - label: Demo
        url: "javascript:alert(1)"
attendees: 2.5
---
```

Overwrite `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md`:

```markdown
---
date: 2026-07-14
startTime: "19:00"
segments:
  - type: chat
    title: { en: "Open chat", zh: "自由聊" }
    materials:
      - label: { en: "Notes", zh: "筆記" }
        url: "https://notes.example/chat"
ctas:
  - id: special
    label: { en: "Join us", zh: "加入我們" }
    href: "https://lu.ma/special"
---
```

(A chat segment with materials and no speaker — deliberately exercising the "materials belong to the segment" rule end-to-end.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Migrate the live data files**

In `data/meetups/2026-07-14-ai-role-play.md`, replace the line

```yaml
    materialsUrl: "https://hooli-survival.vercel.app/"
```

with:

```yaml
    materials:
      - label: Demo
        url: "https://hooli-survival.vercel.app/"
```

In `data/meetups/2026-07-21.md`, replace the line

```yaml
    materialsUrl: "https://github.com/zuxfoucault/2026-07-21-aitian-talk/blob/main/slides.pdf"
```

with:

```yaml
    materials:
      - label: Slides
        url: "https://github.com/zuxfoucault/2026-07-21-aitian-talk/blob/main/slides.pdf"
```

- [ ] **Step 6: Update the template**

In `data/meetups/_template.md`, replace the line

```yaml
#     materialsUrl: ""           # optional; http(s) link to slides/demo
```

with:

```yaml
#     materials:                 # optional; the segment's slides/demo/repo links
#       - label: Slides          # or { en: "...", zh: "..." }
#         url: "https://example.com/slides.pdf"
```

and add after the `attendees: null …` line (still inside the frontmatter):

```yaml
# ctas:                          # optional; REPLACES the community CTAs on this page while upcoming
#   - id: rsvp                   # unique within this file
#     label: RSVP                # or { en: "...", zh: "..." }
#     href: "https://lu.ma/your-event"   # "" renders a disabled placeholder button
```

- [ ] **Step 7: Verify the live build is green again**

Run: `npm run build`
Expected: `✓ data validated and emitted to dist/data/`. Then spot-check: `grep -c '"materials"' dist/data/meetups/2026-07-14-ai-role-play.json` prints ≥ 1 and `grep materialsUrl dist/data/meetups/*.json` prints nothing.

- [ ] **Step 8: Commit**

```bash
git add data/meetups/2026-07-14-ai-role-play.md data/meetups/2026-07-21.md data/meetups/_template.md \
  scripts/test/fixtures/bad/meetups/2026-07-14-broken.md \
  scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md scripts/test/build-data.test.mjs
git commit -m "feat: migrate data and fixtures from materialsUrl to materials"
```

---

### Task 6: Annotation formatter module (spec §3)

**Files:**
- Create: `scripts/lib/annotations.mjs`
- Create: `scripts/test/annotations.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test/annotations.test.mjs`:

```js
// scripts/test/annotations.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annotationLines, stepSummaryMarkdown } from '../lib/annotations.mjs';

const ON = { GITHUB_ACTIONS: 'true' };

test('returns no annotations outside GitHub Actions', () =>
  assert.deepEqual(annotationLines(['meetups/x.md: boom'], {}), []));

test('formats a file-level error annotation with a data/-relative path', () =>
  assert.deepEqual(
    annotationLines(['meetups/2026-07-21.md: segments[0].materialsUrl: replaced by "materials"'], ON),
    ['::error file=data/meetups/2026-07-21.md::segments[0].materialsUrl: replaced by "materials"'],
  ));

test('escapes %, CR and LF in the message', () =>
  assert.deepEqual(
    annotationLines(['meetups/x.md: 50% bad\r\nsecond line'], ON),
    ['::error file=data/meetups/x.md::50%25 bad%0D%0Asecond line'],
  ));

test('escapes , in the file property', () =>
  assert.deepEqual(
    annotationLines(['meetups/a,b.md: boom'], ON),
    ['::error file=data/meetups/a%2Cb.md::boom'],
  ));

test('a colon-free error still annotates, without a file property', () =>
  assert.deepEqual(annotationLines(['something exploded'], ON), ['::error::something exploded']));

test('step summary groups errors by file and counts them', () => {
  const md = stepSummaryMarkdown([
    'meetups/a.md: date: required',
    'meetups/a.md: segments: required, must be a list (use "segments: []" for a TBA week)',
    'moderators/bob.md: bio: required',
  ]);
  assert.match(md, /3 errors/);
  assert.match(md, /### `data\/meetups\/a\.md`/);
  assert.match(md, /### `data\/moderators\/bob\.md`/);
  assert.match(md, /- date: required/);
});
```

(Colons never need a file-property escaping test of their own: data filenames are slug-validated, so a colon can only appear in the *message*, where it legally stays unescaped — the file-level format test above pins that down.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/annotations.mjs'`.

- [ ] **Step 3: Implement the module**

Create `scripts/lib/annotations.mjs`:

```js
// GitHub Actions error surfaces for validation failures (spec 2026-07-12 §3).
// Fork PRs run with a read-only token, so CI can't post PR comments — workflow
// commands (::error) and the step summary need no permissions at all.
// Annotations are file-level: errors come from parsed YAML frontmatter, so
// there are no reliable line numbers; the message carries the field path.

// Escaping per the workflow-command rules — total over every character class
// we emit, so no error text can break (or inject) a command.
function escapeData(s) {
  return s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeProperty(s) {
  return escapeData(s).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

// buildData errors are "<path relative to data/>: <message>" strings; GitHub
// needs a repo-relative path to pin the annotation in the Files changed tab.
function splitError(error) {
  const i = error.indexOf(': ');
  if (i === -1) return { file: null, message: error };
  return { file: `data/${error.slice(0, i)}`, message: error.slice(i + 2) };
}

export function annotationLines(errors, env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true') return [];
  return errors.map((error) => {
    const { file, message } = splitError(error);
    return file
      ? `::error file=${escapeProperty(file)}::${escapeData(message)}`
      : `::error::${escapeData(message)}`;
  });
}

// Markdown for $GITHUB_STEP_SUMMARY: errors grouped by file, shown on the
// check's summary page — the place the PR's red ✗ links to.
export function stepSummaryMarkdown(errors) {
  const byFile = new Map();
  for (const error of errors) {
    const { file, message } = splitError(error);
    const key = file ?? 'build';
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(message);
  }
  const lines = [
    `## ✗ Data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'})`,
    '',
  ];
  for (const [file, messages] of byFile) {
    lines.push(`### \`${file}\``, '');
    for (const m of messages) lines.push(`- ${m}`);
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/annotations.mjs scripts/test/annotations.test.mjs
git commit -m "feat: GitHub annotation + step-summary formatting for validation errors"
```

---

### Task 7: Wire annotations into the build CLI (spec §3)

**Files:**
- Modify: `scripts/build-data.mjs` (import + CLI failure block only; `deploy.yml` needs **no** changes)

- [ ] **Step 1: Implement**

In `scripts/build-data.mjs`, add to the imports:

```js
import { annotationLines, stepSummaryMarkdown } from './lib/annotations.mjs';
```

Replace the CLI failure block at the bottom:

```js
  if (errors.length > 0) {
    console.error(`✗ data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
```

with:

```js
  if (errors.length > 0) {
    console.error(`✗ data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`);
    for (const e of errors) console.error(`  ${e}`);
    // PR-facing surfaces (spec 2026-07-12 §3): inline annotations + the check's
    // summary page — zero extra permissions, so fork PRs get them too.
    for (const line of annotationLines(errors)) console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, stepSummaryMarkdown(errors));
    }
    process.exit(1);
  }
```

- [ ] **Step 2: Manual end-to-end check (spec §Testing)**

Drop in a deliberately broken meetup file (a `materialsUrl`, i.e. the migration error), run the build the way Actions would, then remove it:

```bash
printf -- '---\ndate: 2026-01-06\nsegments:\n  - type: talk\n    title: "Manual check"\n    speaker: A\n    materialsUrl: "https://x.example"\n---\n' > data/meetups/2026-01-06-manual-check.md
SUMMARY=$(mktemp)
GITHUB_ACTIONS=true GITHUB_STEP_SUMMARY="$SUMMARY" npm run build; echo "exit=$?"
cat "$SUMMARY"
rm data/meetups/2026-01-06-manual-check.md "$SUMMARY"
```

Expected: exit=1; stderr shows the human report; stdout shows `::error file=data/meetups/2026-01-06-manual-check.md::segments[0].materialsUrl: replaced by "materials" — …`; the summary file shows the grouped markdown with that file as a `###` heading. Also confirm the quiet default: after the `rm`, plain `npm run build` prints no `::error` lines and exits 0.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS (the `buildData` function itself is unchanged — only the CLI wrapper grew).

- [ ] **Step 4: Commit**

```bash
git add scripts/build-data.mjs
git commit -m "feat: surface validation errors as PR annotations and a step summary"
```

---

### Task 8: Frontend — materials row, CTA override, retired UI string (spec §1, §2)

**Files:**
- Modify: `site/site.js` (`renderMeetupFromHash` only)
- Modify: `site/site.css` (`.segment-materials`)
- Modify: `site/ui-strings.json` (remove `meetup.materials`)

There is no frontend test harness — verification is the manual walkthrough in Step 5.

- [ ] **Step 1: Materials row in `site/site.js`**

In `renderMeetupFromHash`, replace the single-anchor block:

```js
      if (seg.materialsUrl) {
        sec.append(el('a', {
          class: 'segment-materials',
          href: seg.materialsUrl,
          target: '_blank',
          rel: 'noopener',
          text: t('meetup.materials'),
        }));
      }
```

with one link per entry, each carrying its own contributor-authored label (same position, same class on the row):

```js
      if (seg.materials.length > 0) {
        sec.append(el('p', { class: 'segment-materials' },
          seg.materials.map((mat) => el('a', {
            href: mat.url, target: '_blank', rel: 'noopener', text: pick(mat.label),
          })),
        ));
      }
```

- [ ] **Step 2: CTA override in `site/site.js`**

In the same function, replace:

```js
  // The community CTA row (RSVP etc.) only while the meetup counts as upcoming.
  if (meetupCommunity.ctas.length > 0 && isUpcoming(m)) {
    kids.push(el('div', { class: 'cta-row detail-ctas' }, ctaButtons(meetupCommunity.ctas)));
  }
```

with:

```js
  // CTA row while the meetup counts as upcoming. A meetup's own ctas replace
  // the community list wholesale (null = no override, [] = explicitly none).
  const ctas = m.ctas ?? meetupCommunity.ctas;
  if (ctas.length > 0 && isUpcoming(m)) {
    kids.push(el('div', { class: 'cta-row detail-ctas' }, ctaButtons(ctas)));
  }
```

The landing hero (`renderLanding`) keeps `community.ctas` — do not touch it.

- [ ] **Step 3: CSS + retired string**

In `site/site.css`, replace:

```css
.segment-materials { display: inline-block; margin-top: 0.5rem; }
```

with the same row pattern `.segment-speaker-links` uses (including the `--accent` link color — the v0.6.0 light-theme contrast fix):

```css
.segment-materials { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.5rem 0 0; }
.segment-materials a { color: var(--accent); }
```

In `site/ui-strings.json`, delete the line:

```json
  "meetup.materials": { "en": "Materials", "zh": "簡報／材料" },
```

(No tokens changed, so `docs/theming.md` is not triggered.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success; `dist/` contains the updated `site.js`, `site.css`, `ui-strings.json`.

- [ ] **Step 5: Manual walkthrough**

```bash
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/meetup.html#2026-07-14-ai-role-play` — expect a "Demo" link (accent-colored, opens in a new tab) where the old "Materials" link sat, and the RSVP button (community fallback still renders). Open `http://localhost:8080/meetup.html#2026-07-21` — expect a "Slides" link. Toggle 中文 — labels are plain strings, so they stay "Demo"/"Slides"; the page must not show a blank or the key name. Toggle dark theme — link contrast holds. Landing page hero still shows the RSVP CTA. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add site/site.js site/site.css site/ui-strings.json
git commit -m "feat: labeled materials links and per-meetup CTA override on detail pages"
```

---

### Task 9: Maintained-docs gate, part 1 — schema, wording, locked decisions, README, changelog

**Files:**
- Modify: `docs/data-schema.md`, `docs/wording.md`, `CLAUDE.md`, `data/meetups/README.md`, `CHANGELOG.md`

- [ ] **Step 1: `docs/data-schema.md`**

(a) In the **Bilingual fields** section, extend the short-strings bullet's last sentence to:

```markdown
  Either key may be omitted (at least one required); a missing language falls back to the one
  provided. An **empty or whitespace-only value is a CI error** — omit the key instead.
```

(b) In the **Meetup** table, replace the `segments[].materialsUrl` row with:

```markdown
| `segments[].materials` | – | list of `{label, url}` | the segment's slides/demo/repo links; `label` string or `{en, zh}`, `url` `http(s)://`; no `speaker` needed — materials belong to the segment |
```

and add a new row directly above the `attendees` row:

```markdown
| `ctas` | – | list, same shape/rules as community `ctas[]` | **whole-list override** of the community CTAs on this meetup's detail page while it's upcoming; `[]` = no CTAs; `id` unique within the file only |
```

(c) In **What CI rejects**, extend the list: after "duplicate `ctas[].id` values" append "(within one file — community or meetup)", and add before the final "and frontmatter that isn't valid YAML":

```markdown
the removed `segments[].materialsUrl` (a dedicated error names `materials` as its replacement),
empty or whitespace-only bilingual language values,
```

(d) Replace **Evolution rules** rule 1 with the amended rule (the approved unlock, spec §Locked-decision unlock):

```markdown
1. **Additive by default.** New fields arrive optional-with-default. A breaking change (rename,
   removal, type change) is allowed only as a deliberate migration: one PR updates the validator,
   docs, and `_template.md` **and patches every affected `data/` file**, and the removed field gets
   a dedicated CI error naming its replacement. This is safe because all authored data lives in
   this repo — nothing external consumes the `.md` schema.
```

- [ ] **Step 2: `docs/wording.md`**

In the **UI chrome strings** section, after the first paragraph add:

```markdown
Retired: `meetup.materials` (v0.8.0) — material links now carry their own contributor-authored
labels from `segments[].materials`, so there is no shared UI label anymore.
```

- [ ] **Step 3: `CLAUDE.md` locked decision**

Replace the schema-stability bullet:

```markdown
- **Schema stability:** the `data/*.md` schema is additive-only; every change updates
  `docs/data-schema.md` + validator + `_template.md` in one PR. → spec 2026-07-09 §1.4
```

with:

```markdown
- **Schema stability:** additive by default; a breaking change is allowed only as a deliberate
  migration — one PR updates validator + docs + `_template.md` **and every affected `data/` file**,
  with a dedicated CI error naming the replacement. → spec 2026-07-09 §1.4, amended by spec
  2026-07-12 (materialsUrl → materials unlock)
```

- [ ] **Step 4: `data/meetups/README.md`**

In "Add or edit a week" step 3, replace:

```markdown
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio` /
   `materialsUrl` / `links` — the speaker's public links — if you have them).
```

with:

```markdown
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio`, `links` — the
   speaker's public links — and `materials` — labeled slides/demo/repo links — if you have them).
   A special event can also replace the site-wide buttons on its page with its own top-level
   `ctas:` list (see [`_template.md`](_template.md)).
```

- [ ] **Step 5: `CHANGELOG.md`**

Add at the top, right below the intro paragraph (adjust the date to the day the release PR opens):

```markdown
## v0.8.0 — Labeled materials & per-meetup buttons (2026-07-12)

- Talks and chats can list multiple materials — slides, demo, repo — each with its own label, in
  both languages if you like.
- A special event can put its own buttons on its meetup page in place of the site-wide RSVP.
- When a contribution PR has a data problem, the errors now show up inline on the changed file
  and on the check's summary page — no digging through build logs.
```

(The third bullet is contributor-visible "what", not CI internals — judgment call per the CHANGELOG rules; SansWord can trim at review.)

- [ ] **Step 6: Commit**

```bash
git add docs/data-schema.md docs/wording.md CLAUDE.md data/meetups/README.md CHANGELOG.md
git commit -m "docs: fold v0.8.0 schema changes into maintained docs (evolution-rule amendment)"
```

---

### Task 10: Maintained-docs gate, part 2 — devlog + todo

**Files:**
- Modify: `docs/devlog.md` (new v0.8.0 entry + TL;DR row), `todo.md`

- [ ] **Step 1: Devlog entry**

Get the timestamp from the docs commit you just made: `git log -1 --format='%ad' --date=format:'%Y-%m-%d %H:%M'`. Add a newest-first entry under the TL;DR table (heading format per global `CLAUDE.md`):

```markdown
## v0.8.0 — Contributor-feedback improvements (YYYY-MM-DD HH:MM)

**Review:** not yet

**Design docs:**
- Contributor-feedback improvements: [Spec](superpowers/specs/2026-07-12-contributor-feedback-improvements-design.md) [Plan](superpowers/plans/2026-07-12-contributor-feedback-improvements.md)

**What was built:**
- `segments[].materials` (labeled `{label, url}` list, no speaker requirement) replaces
  `materialsUrl` — the first deliberate breaking migration; the removed field gets a dedicated CI
  error naming its replacement, and both live meetup files were patched in the same PR.
- **Locked-decision unlock:** the "additive-only" evolution rule (data-schema.md §Evolution rule 1)
  is amended to "additive by default, breaking changes as deliberate migrations" — approved by
  SansWord in the 2026-07-12 brainstorm; `CLAUDE.md` + `docs/data-schema.md` updated.
- Per-meetup `ctas`: whole-list override of `community.ctas` on detail pages (`null` = no override,
  `[]` = explicitly none); CTA validation extracted into one shared helper.
- Validation failures now emit GitHub `::error` file annotations + a `$GITHUB_STEP_SUMMARY` report
  (`scripts/lib/annotations.mjs`) — zero extra permissions, so fork PRs get them too.
- Bilingual maps with empty/whitespace language values fail CI (omit the key instead); the
  plain-string form stays legal.
- `meetup.materials` UI string retired — material links carry contributor-authored labels.
```

Add **Key technical learnings** with tagged bullets for anything genuinely learned during implementation (per the global tag rules — write them at implementation time; do not fabricate).

- [ ] **Step 2: TL;DR table row**

Add a `v0.8.0` row at the top of the TL;DR table with a one-liner ("materials with labels, per-meetup CTAs, PR error annotations, bilingual empty-value guard — first deliberate schema migration") linking to the entry's GitHub-style anchor (lowercase, punctuation stripped, spaces→hyphens — e.g. `#v080--contributor-feedback-improvements-2026-07-12-2130` matching the real timestamp).

- [ ] **Step 3: `todo.md`**

Mark the "Write the implementation plan for the contributor-feedback improvements" item done, in the established style:

```markdown
- [x] **Write the implementation plan for the contributor-feedback improvements** — done
      2026-07-12: plan
      ([`docs/superpowers/plans/2026-07-12-contributor-feedback-improvements.md`](docs/superpowers/plans/2026-07-12-contributor-feedback-improvements.md))
      executed as v0.8.0 (materials migration, per-meetup CTAs, PR annotations, bilingual
      empty-value guard).
```

Add under **Now**:

```markdown
- [ ] **PR review + merge `feat/contributor-feedback`** (SansWord) — then tag the squash commit
      `v0.8.0` and push the tag.
```

- [ ] **Step 4: Commit**

```bash
git add docs/devlog.md todo.md
git commit -m "docs: v0.8.0 devlog entry (logs the schema-evolution unlock) + todo update"
```

---

### Task 11: Final verification + PR

**Files:** none new

- [ ] **Step 1: Full verification**

```bash
npm test && npm run build
```

Expected: every test passes; build emits cleanly.

- [ ] **Step 2: Scope + secrets check (load-bearing — public repo)**

```bash
git diff --name-only main...HEAD
```

Expected: exactly the files named in this plan's file map (plus the plan itself). Then scan the full diff (`git diff main...HEAD`) for secrets/API keys/tokens, `.env*` files, and maintainer-side sign-up-sheet leaks (contact column, logistics). Contributor-authored public links (hooli-survival, the GitHub slides URL) are fine — public-by-PR is the consent model.

- [ ] **Step 3: Rebase onto latest main**

Per project memory: rebase before `gh pr create`; devlog/todo conflicts resolve in version order.

```bash
git fetch origin && git rebase origin/main
npm test
```

- [ ] **Step 4: Push and open the PR — then STOP**

```bash
git push -u origin feat/contributor-feedback
gh pr create --title "v0.8.0: contributor-feedback improvements (materials, per-meetup CTAs, PR annotations, bilingual guard)" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-07-12-contributor-feedback-improvements-design.md
(plan: docs/superpowers/plans/2026-07-12-contributor-feedback-improvements.md).

- `segments[].materials` (labeled links) replaces `materialsUrl` — deliberate migration under the
  amended evolution rule (unlock approved 2026-07-12); live data patched in this PR, removed field
  gets a dedicated CI error.
- Per-meetup `ctas`: whole-list override of the community CTAs on detail pages.
- Validation failures surface as GitHub file annotations + step summary (zero extra permissions —
  works on fork PRs; deploy.yml unchanged).
- Bilingual maps with empty language values now fail CI.
- Maintained docs updated: data-schema (incl. evolution-rule amendment), wording, CLAUDE.md locked
  decision, meetups README, CHANGELOG, devlog (v0.8.0), todo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Do **not** merge — that's SansWord's call. After SansWord merges: tag the squash commit on `main` as `v0.8.0` and push the tag (global versioning rule; the devlog heading must match).

---

## Self-review notes (spec coverage)

- Spec §1 materials schema/emit/frontend/migration → Tasks 3, 4, 5, 8. §1 "retire `meetup.materials` + wording.md" → Tasks 8, 9.
- Spec §2 ctas schema/shared helper/behavior/emit → Tasks 2, 4, 8; landing hero untouched (Task 8 Step 2 note); `community.md` untouched (no task touches it).
- Spec §3 annotations/step summary/escaping/no deploy.yml changes → Tasks 6, 7.
- Spec §4 bilingual empty rule + docs → Tasks 1, 9; no emit/frontend change needed (CI now guarantees the `??`-fallback invariant).
- Spec §Error handling: `materials: []`/`ctas: []` valid (Tasks 2–4 tests), both-fields case (Task 3 test), duplicate meetup cta ids (Task 2 test), total escaping (Task 6 tests).
- Spec §Testing: every listed test exists in Tasks 1–6; manual broken-file check in Task 7.
- Spec §Maintained-doc updates → Tasks 9–10 (CHANGELOG added on top of the spec's list — it post-dates the spec and its update trigger applies).
