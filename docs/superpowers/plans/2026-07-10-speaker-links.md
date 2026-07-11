# Speaker Links + Speaker Sub-Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speakers in meetup files can list public links (`segments[].links`, same shape as moderator `links`), and the meetup detail page renders each segment's speaker (name, bio, links) as a tinted sub-panel inside the segment card.

**Architecture:** Additive schema change flowing through the existing three-stage pipeline: validator (`scripts/lib/validate.mjs`) gains a shared link-list helper used by both moderators and meetup segments; emit (`scripts/lib/emit.mjs`) passes `links` through to detail JSON only (index untouched); frontend (`site/site.js` + `site/site.css`) reorders segment cards to label → title → materials → speaker sub-panel. All validation is build-time; the client renders only build-validated JSON.

**Tech Stack:** Vanilla HTML/CSS/JS, Node ≥20, `node --test` for tests. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-07-10-speaker-links-design.md`](../specs/2026-07-10-speaker-links-design.md)

**Docs consulted:** `docs/kickstart.md` (§ Moderators & speakers, §4d privacy), `docs/data-schema.md`, `docs/theming.md`, `scripts/lib/validate.mjs`, `scripts/lib/emit.mjs`, `site/site.js`, `site/site.css`, `scripts/test/*.test.mjs`, `data/meetups/_template.md`, `data/meetups/README.md`, `package.json`.

**Branch:** work happens on `speaker-links` (already checked out; the spec commit `d30faaf` is on it). Never commit to `main`.

**Test command:** `npm test` (runs `node --test scripts/test/*.test.mjs`). Run from the repo root.

**Design notes locked by the spec (do not re-decide):**

- Field name is `segments[].links` (not `speakerLinks`). On a segment, these are **the speaker's** links.
- A segment with `links` but no non-empty `speaker` is a CI error.
- Index entries (`meetupIndexEntry`) carry **no** links — detail page only.
- Sub-panel renders whenever the segment has a `speaker` (spec §3). Consequence: a `speakerBio` on a speaker-less chat segment no longer renders — the bio moves inside the speaker-gated panel. No current data file has that shape; it's the spec's call.
- CSS reuses existing theme tokens via `color-mix` (no new token), so `docs/theming.md` needs **no** update. No new UI strings, so `docs/wording.md` needs **no** update.

---

## File map

| File | Change |
|---|---|
| `scripts/lib/validate.mjs` | Extract shared `linkListErrors` helper; add `links` to `SEGMENT_KEYS`; links-requires-speaker check |
| `scripts/lib/emit.mjs` | `meetupToJson` emits `links` per segment (default `[]`) |
| `scripts/test/validate-meetup.test.mjs` | New segment-links cases |
| `scripts/test/validate-others.test.mjs` | No edits — existing moderator link cases must keep passing through the shared helper |
| `scripts/test/emit.test.mjs` | Links pass-through, default `[]`, index exclusion |
| `site/site.js` | Segment render order + `div.segment-speaker-card` |
| `site/site.css` | `.segment-speaker-card`, `.segment-speaker-links`, `.segment-speaker` weight |
| `docs/data-schema.md` | Meetup table row + "What CI rejects" |
| `data/meetups/_template.md` | Commented `links` example |
| `data/meetups/README.md` | Step 3 field list |
| `docs/devlog.md`, `todo.md` | Close-the-loop gate (Task 8) |

---

### Task 1: Extract shared link-list validation helper (pure refactor)

The moderator link-validation loop becomes a shared helper so meetup segments can reuse it with identical rules and identical error wording. No behavior change — existing tests must stay green with zero test edits.

**Files:**
- Modify: `scripts/lib/validate.mjs`
- Test (existing, unchanged): `scripts/test/validate-others.test.mjs`

- [ ] **Step 1: Run the full suite to confirm a green baseline**

Run: `npm test`
Expected: all tests pass (0 failing).

- [ ] **Step 2: Add the helper and `LINK_KEYS` in the shared-helpers area**

In `scripts/lib/validate.mjs`, insert immediately after the `bilingualErrors` function (after line 61, before the `const MEETUP_KEYS` line):

```js
// Shared by moderator `links` and meetup `segments[].links` — identical rules,
// identical error wording (spec 2026-07-10 §2).
const LINK_KEYS = ['label', 'url'];

function linkListErrors(links, ctx) {
  if (links === undefined) return [];
  if (!Array.isArray(links)) return [`${ctx}: must be a list of {label, url} entries`];
  const errors = [];
  links.forEach((link, i) => {
    const lctx = `${ctx}[${i}]`;
    if (link === null || typeof link !== 'object' || Array.isArray(link)) {
      errors.push(`${lctx}: must be a map with label + url`);
      return;
    }
    errors.push(...unknownKeyErrors(link, LINK_KEYS, lctx));
    errors.push(...bilingualErrors(link.label, `${lctx}.label`, { required: true }));
    if (typeof link.url !== 'string' || !HTTP_URL_RE.test(link.url)) {
      errors.push(`${lctx}.url: required, must start with http:// or https://`);
    }
  });
  return errors;
}
```

(The error strings are copied verbatim from the current moderator loop — with `ctx = 'links'` the helper produces byte-identical messages.)

- [ ] **Step 3: Replace the inline moderator loop with the helper**

In `validateModerator`, delete the old `const LINK_KEYS = ['label', 'url'];` line (it now lives in the shared area) and replace the whole `if (data.links !== undefined) { ... }` block (currently lines 165–182) with:

```js
  errors.push(...linkListErrors(data.links, 'links'));
```

- [ ] **Step 4: Run the suite — refactor must be invisible**

Run: `npm test`
Expected: all tests pass, including every case in `validate-others.test.mjs` (`non-http link url is rejected`, `link without label is rejected`, `golden moderator has no errors`, `avatar and links are optional`).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/validate.mjs
git commit -m "Extract shared link-list validation helper from validateModerator"
```

---

### Task 2: Validate `segments[].links` (TDD)

**Files:**
- Modify: `scripts/lib/validate.mjs`
- Test: `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/validate-meetup.test.mjs`:

```js
test('segment links with plain and bilingual labels are valid', () =>
  assert.deepEqual(
    errs({
      segments: [{
        type: 'talk',
        title: 'x',
        speaker: 'A',
        links: [
          { label: 'GitHub', url: 'https://github.com/a' },
          { label: { en: 'Site', zh: '網站' }, url: 'https://a.example' },
        ],
      }],
    }),
    [],
  ));
test('segment links on a chat with a speaker are valid', () =>
  assert.deepEqual(
    errs({
      segments: [{
        type: 'chat',
        title: 'x',
        speaker: 'A',
        links: [{ label: 'Site', url: 'https://a.example' }],
      }],
    }),
    [],
  ));
test('non-http segment link url is rejected', () =>
  assert.match(
    errs({
      segments: [{
        type: 'talk', title: 'x', speaker: 'A',
        links: [{ label: 'X', url: 'ftp://x.example' }],
      }],
    }).join('\n'),
    /segments\[0\]\.links\[0\]\.url: required, must start with http/,
  ));
test('segment link without label is rejected', () =>
  assert.match(
    errs({
      segments: [{
        type: 'talk', title: 'x', speaker: 'A',
        links: [{ url: 'https://x.example' }],
      }],
    }).join('\n'),
    /segments\[0\]\.links\[0\]\.label: required/,
  ));
test('segment link without url is rejected', () =>
  assert.match(
    errs({
      segments: [{
        type: 'talk', title: 'x', speaker: 'A',
        links: [{ label: 'X' }],
      }],
    }).join('\n'),
    /segments\[0\]\.links\[0\]\.url: required/,
  ));
test('unknown segment link key is rejected', () =>
  assert.match(
    errs({
      segments: [{
        type: 'talk', title: 'x', speaker: 'A',
        links: [{ label: 'X', url: 'https://x.example', icon: 'star' }],
      }],
    }).join('\n'),
    /segments\[0\]\.links\[0\]: unknown field "icon"/,
  ));
test('non-list segment links is rejected', () =>
  assert.match(
    errs({
      segments: [{ type: 'talk', title: 'x', speaker: 'A', links: 'https://x.example' }],
    }).join('\n'),
    /segments\[0\]\.links: must be a list/,
  ));
test('segment links without a speaker are rejected (chat)', () =>
  assert.match(
    errs({
      segments: [{ type: 'chat', title: 'x', links: [{ label: 'X', url: 'https://x.example' }] }],
    }).join('\n'),
    /segments\[0\]\.links: requires a non-empty "speaker"/,
  ));
test('segment links with an empty speaker are rejected (chat)', () =>
  assert.match(
    errs({
      segments: [{
        type: 'chat', title: 'x', speaker: '',
        links: [{ label: 'X', url: 'https://x.example' }],
      }],
    }).join('\n'),
    /segments\[0\]\.links: requires a non-empty "speaker"/,
  ));
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the valid-links tests FAIL with `unknown field "links"` errors in the diff, and the rejection tests FAIL because no matching error is produced yet. Pre-existing tests still pass.

- [ ] **Step 3: Implement segment-links validation**

In `scripts/lib/validate.mjs`:

3a. Change `SEGMENT_KEYS`:

```js
const SEGMENT_KEYS = ['type', 'title', 'speaker', 'speakerBio', 'materialsUrl', 'links'];
```

3b. In the `validateMeetup` segment loop, after the `materialsUrl` check (the `if (seg.materialsUrl !== undefined) { ... }` block), add:

```js
      errors.push(...linkListErrors(seg.links, `${ctx}.links`));
      if (seg.links !== undefined && (typeof seg.speaker !== 'string' || seg.speaker.trim() === '')) {
        errors.push(
          `${ctx}.links: requires a non-empty "speaker" on the same segment — links belong to a person`,
        );
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all new cases green, no regressions.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-meetup.test.mjs
git commit -m "Validate segments[].links via the shared link-list helper"
```

---

### Task 3: Emit `links` in meetup detail JSON, never in the index (TDD)

**Files:**
- Modify: `scripts/lib/emit.mjs:54-60`
- Test: `scripts/test/emit.test.mjs`

- [ ] **Step 1: Write the failing tests**

In `scripts/test/emit.test.mjs`, change the import line to include `meetupIndexEntry`:

```js
import { meetupToJson, meetupIndexEntry, moderatorToJson, renderBilingualBody } from '../lib/emit.mjs';
```

Then append:

```js
test('segment links pass through to detail JSON; absent links emit []', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        {
          type: 'talk', title: 'T', speaker: 'A',
          links: [{ label: { en: 'Site', zh: '網站' }, url: 'https://a.example' }],
        },
        { type: 'chat', title: 'C' },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  assert.deepEqual(m.segments[0].links, [
    { label: { en: 'Site', zh: '網站' }, url: 'https://a.example' },
  ]);
  assert.deepEqual(m.segments[1].links, []);
});

test('index entries carry no links', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        {
          type: 'talk', title: 'T', speaker: 'A',
          links: [{ label: 'Site', url: 'https://a.example' }],
        },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  const entry = meetupIndexEntry(m);
  assert.deepEqual(Object.keys(entry.segments[0]), ['type', 'title', 'speaker']);
});
```

- [ ] **Step 2: Run the tests to verify the pass-through test fails**

Run: `npm test`
Expected: `segment links pass through...` FAILS (`m.segments[0].links` is `undefined`). `index entries carry no links` already PASSES (`meetupIndexEntry` picks only `type`/`title`/`speaker`) — it's a pin-down regression test, keep it.

- [ ] **Step 3: Implement the pass-through**

In `scripts/lib/emit.mjs`, inside `meetupToJson`'s segment map, add a `links` line after `materialsUrl`:

```js
    segments: (data.segments ?? []).map((seg) => ({
      type: seg.type,
      title: seg.title,
      speaker: seg.speaker ?? '',
      speakerBioHtml: bilingualInlineHtml(seg.speakerBio),
      materialsUrl: seg.materialsUrl ?? '',
      links: (seg.links ?? []).map(({ label, url }) => ({ label, url })),
    })),
```

`meetupIndexEntry` stays untouched.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — both new tests green, no regressions (including `build-data.test.mjs`, which exercises the full pipeline over fixtures).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/emit.mjs scripts/test/emit.test.mjs
git commit -m "Emit segments[].links in detail JSON (default []), keep index link-free"
```

---

### Task 4: Frontend — segment render order + speaker sub-panel

`site/site.js` has no unit-test harness (page code is verified manually — Task 7); this task is code-only.

**Files:**
- Modify: `site/site.js:260-281` (the segment loop in `renderMeetupFromHash`)

- [ ] **Step 1: Rewrite the segment loop**

Replace the current loop body (label → title → speaker → bio → materials) with the spec order label → title → materials → speaker sub-panel:

```js
    let talkN = 0;
    for (const seg of m.segments) {
      if (seg.type === 'talk') talkN += 1;
      const sec = el('section', { class: 'segment' });
      sec.append(el('h3', { class: 'segment-label', text: segmentLabel(seg, talkN) }));
      sec.append(el('p', { class: 'segment-title', text: pick(seg.title) }));
      if (seg.materialsUrl) {
        sec.append(el('a', {
          class: 'segment-materials',
          href: seg.materialsUrl,
          target: '_blank',
          rel: 'noopener',
          text: t('meetup.materials'),
        }));
      }
      // Mini profile card for the speaker (spec 2026-07-10 §3): name, bio, links.
      if (seg.speaker) {
        const card = el('div', { class: 'segment-speaker-card' });
        card.append(el('p', { class: 'segment-speaker', text: seg.speaker }));
        if (seg.speakerBioHtml?.[lang]) {
          card.append(el('p', { class: 'segment-bio', html: seg.speakerBioHtml[lang] }));
        }
        if (seg.links.length > 0) {
          card.append(el('p', { class: 'segment-speaker-links' },
            seg.links.map((l) => el('a', {
              href: l.url, target: '_blank', rel: 'noopener', text: pick(l.label),
            })),
          ));
        }
        sec.append(card);
      }
      kids.push(sec);
    }
```

XSS posture (unchanged, per spec §4): name and labels go through `text:` (textContent); only build-sanitized `speakerBioHtml` uses `html:`; `l.url` is validator-guaranteed http(s). `seg.links` needs no null-guard — emit always writes `[]` (Task 3), and data JSON is revalidated on every load (`fetchJson` uses `cache: 'no-cache'`), so the client never sees pre-links JSON alongside this code.

- [ ] **Step 2: Sanity-check the file parses**

Run: `node --check site/site.js`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add site/site.js
git commit -m "Render speaker sub-panel (name, bio, links) in segment cards"
```

---

### Task 5: CSS — tinted speaker sub-panel

All colors come from existing tokens via `color-mix`, so both dark paths (explicit toggle and OS preference) adapt automatically through the token blocks — no theme-scoped override rules and **no new token**, hence no `docs/theming.md` change. (If the Task 7 visual check demands a theme-specific tweak anyway, it must be added byte-identically to BOTH dark blocks — `:root[data-theme="dark"]` and the `@media (prefers-color-scheme: dark)` mirror — per `docs/theming.md`.)

**Files:**
- Modify: `site/site.css` (around lines 294–296, the `.segment-speaker` / `.segment-bio` / `.segment-materials` rules)

- [ ] **Step 1: Add the sub-panel rules and bump the name weight**

Replace the current line

```css
.segment-speaker { margin: 0; color: var(--muted); }
```

with the block below (`.segment-bio` and `.segment-materials` rules stay where they are, unchanged):

```css
.segment-speaker-card {
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
  border-radius: 0.85rem;
  padding: 0.7rem 0.95rem 0.8rem;
  margin-top: 0.9rem;
}
.segment-speaker { margin: 0; color: var(--muted); font-weight: 650; }
.segment-speaker-links { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0.4rem 0 0; }
.segment-speaker-links a { color: var(--accent-pop); }
```

Rationale pinned by the spec: tinted, rounded, padded inset box; link row mirrors `.mod-links` (same `--accent-pop` link color) but left-aligned inside the panel; the accent-tint background follows the existing `.segment-label` pattern (`color-mix` on `--accent`), which reads teal-tinted in light and gold-tinted in dark.

- [ ] **Step 2: Commit**

```bash
git add site/site.css
git commit -m "Style segment speaker sub-panel as a tinted inset card"
```

---

### Task 6: Same-PR schema docs — data-schema.md, template, README

The schema-stability rule (locked decision) requires these in the same PR as the validator change. `docs/wording.md` and `docs/theming.md` are intentionally untouched (no new UI strings, no new token).

**Files:**
- Modify: `docs/data-schema.md` (meetup table + "What CI rejects")
- Modify: `data/meetups/_template.md`
- Modify: `data/meetups/README.md` (step 3)

- [ ] **Step 1: Add the meetup-table row in `docs/data-schema.md`**

In the Meetup field table, insert after the `segments[].materialsUrl` row:

```markdown
| `segments[].links` | – | list of `{label, url}` | the **speaker's** links (same shape as moderator `links`); `label` string or `{en, zh}`, `url` `http(s)://`; requires a non-empty `speaker` on the same segment |
```

- [ ] **Step 2: Extend "What CI rejects" in `docs/data-schema.md`**

In the "What CI rejects" paragraph, after "bad segment types," insert: `segment `links` without a non-empty `speaker` on the same segment,` so the sentence reads "... unknown timezones, bad segment types, segment `links` without a non-empty `speaker` on the same segment, a frontmatter `id`, ...".

- [ ] **Step 3: Add the commented example to `data/meetups/_template.md`**

In the commented booked-week example, after the `#     speakerBio: ""` line, insert:

```markdown
#     links:                     # optional; the speaker's public links — public once merged
#       - label: LinkedIn        # or { en: "...", zh: "..." }
#         url: "https://www.linkedin.com/in/you"
```

- [ ] **Step 4: Update step 3 in `data/meetups/README.md`**

Change:

```markdown
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio` /
   `materialsUrl` if you have them).
```

to:

```markdown
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio` /
   `materialsUrl` / `links` — the speaker's public links — if you have them).
```

- [ ] **Step 5: Verify the docs, validator, and template agree**

Run: `npm test && node scripts/build-data.mjs`
Expected: tests pass and the build succeeds (the template is skipped by validation, but this catches YAML slips in any touched data file).

- [ ] **Step 6: Commit**

```bash
git add docs/data-schema.md data/meetups/_template.md data/meetups/README.md
git commit -m "Document segments[].links in schema doc, template, and meetups README"
```

---

### Task 7: Manual verification — both themes, both languages

No committed data file has `links` yet, so verify with a temporary local edit. **Do not commit the temporary edit.** (Whether to ship real links — e.g. SansWord's own GitHub/LinkedIn on his 2026-07-14 talk segment — is SansWord's call; surface the question at review, don't decide it.)

**Files:**
- Temporarily modify (then revert): `data/meetups/2026-07-14-ai-role-play.md`

- [ ] **Step 1: Temporarily add links to a segment**

In `data/meetups/2026-07-14-ai-role-play.md`, add to one talk segment that has a `speaker` (keep YAML indentation aligned with that segment's other keys):

```yaml
    links:
      - label: GitHub
        url: "https://github.com/sansword"
      - label: { en: "Site", zh: "網站" }
        url: "https://example.com"
```

- [ ] **Step 2: Build and serve**

```bash
npm run build
python3 -m http.server 8080 --directory dist
```

(`npm run build`, not `build-data.mjs` alone — the JS/CSS edits only reach `dist/` via the `site/` copy.)

- [ ] **Step 3: Check the detail page**

Open `http://localhost:8080/meetup.html#2026-07-14-ai-role-play` and verify:

- Segment order is label → title → materials link → speaker sub-panel.
- The sub-panel reads as a tinted, rounded inset box; name, bio, and the two links render; links open in a new tab.
- Language toggle: the bilingual label flips between "Site" and "網站"; plain labels unchanged.
- Theme toggle: panel tint and link color are legible in **both** themes (also check with the OS in dark mode and the toggle untouched, covering the media-query path).
- A segment **without** links (the chat) shows the panel with just name/bio and no empty link row; a speaker-less chat shows no panel.
- Landing page (`http://localhost:8080/`): cards unchanged — no links anywhere.

If the panel tint or link contrast fails visually, adjust the `color-mix` percentages in Task 5's block; only reach for theme-scoped overrides as a last resort (both dark blocks, byte-identical).

- [ ] **Step 4: Revert the temporary data edit**

```bash
git checkout -- data/meetups/2026-07-14-ai-role-play.md
git status
```

Expected: working tree clean except intentional changes; the meetup file shows no diff.

- [ ] **Step 5: Full suite one last time**

Run: `npm test`
Expected: PASS.

---

### Task 8: Close the loop — devlog + todo (gate before the PR)

Per the project's end-of-session gate: maintained docs were updated in Task 6; this task records the release. This feature is a new minor release → **v0.6.0**.

**Files:**
- Modify: `docs/devlog.md` (TL;DR table + new top entry)
- Modify: `todo.md` (mark the speaker-links item done / adjust next steps)

- [ ] **Step 1: Add the devlog entry (newest-first, directly under the TL;DR table)**

Heading timestamp comes from `git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M'` after the final code commit. Entry skeleton (fill the timestamp; keep bullets accurate to what actually happened, including any Task 7 CSS adjustments):

```markdown
## v0.6.0 — Speaker links + speaker sub-panel (YYYY-MM-DD HH:MM)

**Review:** not yet

**Design docs:**
- Speaker links + speaker sub-panel: [Spec](superpowers/specs/2026-07-10-speaker-links-design.md) [Plan](superpowers/plans/2026-07-10-speaker-links.md)

**What was built:**
- New optional `segments[].links` field ({label, url} list, same shape as moderator `links`); CI rejects links on a segment without a non-empty `speaker`.
- Moderator link validation extracted into a shared `linkListErrors` helper used by both schemas — identical rules and error wording.
- `meetupToJson` emits `links` per segment (absent → `[]`); index entries stay link-free.
- Meetup detail segment cards reordered to label → title → materials → speaker sub-panel; the sub-panel (`.segment-speaker-card`) is a tinted inset mini profile card holding name, bio, and a link row.
- Same-PR doc updates: `docs/data-schema.md`, `data/meetups/_template.md`, `data/meetups/README.md`.

**Key technical learnings:**
- `[note]` Token-based `color-mix` styling needs no dark-theme override blocks — both dark paths adapt through the token values, unlike the theme-scoped rgba layers elsewhere in `site.css`.
```

Also add the TL;DR row linking to the new section anchor (GitHub-style: lowercase, punctuation stripped except hyphens, spaces→hyphens).

- [ ] **Step 2: Update `todo.md`**

Mark the speaker-links item done (or remove it) per the file's existing format.

- [ ] **Step 3: Commit**

```bash
git add docs/devlog.md todo.md
git commit -m "v0.6.0 — devlog + todo for speaker links"
```

---

### Task 9: Pre-PR checks

- [ ] **Step 1: Confirm the diff scope**

Run: `git diff --name-only main...HEAD`
Expected — exactly these files (plus the spec + this plan, already committed):

```
data/meetups/README.md
data/meetups/_template.md
docs/data-schema.md
docs/devlog.md
docs/superpowers/plans/2026-07-10-speaker-links.md
docs/superpowers/specs/2026-07-10-speaker-links-design.md
scripts/lib/emit.mjs
scripts/lib/validate.mjs
scripts/test/emit.test.mjs
scripts/test/validate-meetup.test.mjs
site/site.css
site/site.js
todo.md
```

- [ ] **Step 2: Secret scan (required — public repo)**

Review `git diff main...HEAD` for secrets/API keys/tokens, `.env*` files, and anything from the private sign-up sheet (contact column, logistics). Contributor-authored public links are fine; raw emails from the sheet are not. Expected: nothing found — this change carries only example URLs.

- [ ] **Step 3: Rebase onto latest main, final suite**

```bash
git fetch origin && git rebase origin/main
npm test
```

Expected: clean rebase (devlog/todo conflicts resolve in version order if any), all tests pass.

- [ ] **Step 4: Stop**

Open the PR only when the user says "ship it" / "raise a PR" — and then stop before merging (user's call). Surface the open question from Task 7: whether to add real speaker links to `2026-07-14-ai-role-play.md` as seed content.
