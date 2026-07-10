# Contributor README Tree + Privacy Unlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four contributor-facing READMEs (repo root, `data/`, `data/meetups/`, `data/moderators/`), the two validator changes they need (README-skip + ≤ 500 KB avatar cap), and the privacy unlock (email lint removed, docs reworded to "everything you PR is public").

**Architecture:** READMEs are how-to guides that deep-link into `docs/data-schema.md` (the only normative field reference) and link real committed files as worked examples — no duplicated field tables. Validator changes live in `scripts/build-data.mjs` (the avatar cap does fs I/O, so it stays out of the pure `scripts/lib/validate.mjs`); the lint removal deletes code from `scripts/lib/validate.mjs`. All doc/template/CLAUDE.md rewording lands in the same PR as the code it describes (schema-rule trio).

**Tech Stack:** Node ≥ 20, `node --test` (no test framework), plain Markdown. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-07-10-readme-tree-design.md`](../specs/2026-07-10-readme-tree-design.md). Docs consulted while planning: `docs/kickstart.md`, `docs/data-schema.md`, `docs/wording.md`, `CLAUDE.md`, `scripts/build-data.mjs`, `scripts/lib/validate.mjs`, all test files + fixtures, `.github/workflows/deploy.yml`, `package.json`, `todo.md`.

**Post-spec addition (SansWord, 2026-07-10, during planning):** the root README also states the site is designed/developed with Claude Code, mostly Fable 5 for the MVP — the site itself is a demo of AI work. Task 5 carries it; the devlog entry (Task 11) logs it as a post-spec decision.

**Branch:** work on the existing `readme-tree` branch (already checked out, clean). Release version: **v0.5.0**.

**Conventions that bind every task:** stage explicit paths only (never `git add -A`); commit messages get no history breadcrumbs; this repo is public — scan each commit for secrets/private-sheet data before it lands.

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `README.md` (repo root) | create | community front door + contributor routing + local-test guide |
| `data/README.md` | create | folder map, never-rename rule, 5-step contribution flow, bilingual one-liner |
| `data/meetups/README.md` | create | meetup file how-to (naming, TBA, back-fill) |
| `data/moderators/README.md` | create | moderator file how-to (handle, avatar, consent) |
| `scripts/build-data.mjs` | modify | skip `README.md` in `listDataFiles()`; avatar size cap; drop privacy-lint calls |
| `scripts/lib/validate.mjs` | modify | delete `privacyLintErrors` + `EMAIL_RE`; reword speaker message |
| `scripts/test/build-data.test.mjs` | modify | README-skip + avatar-cap tests; drop email needle/assertions |
| `scripts/test/validate-others.test.mjs` | modify | drop the two privacy-lint tests |
| `scripts/test/fixtures/golden/meetups/README.md` | create | proves README-skip |
| `scripts/test/fixtures/golden/moderators/README.md` | create | proves README-skip |
| `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md` | modify | email in body — proves lint removal |
| `scripts/test/fixtures/bad/meetups/2026-07-21.md` | delete | its only error was the email lint |
| `docs/data-schema.md` | modify | README-skip wording, avatar cap, privacy rewrite, CI-rejects list |
| `data/meetups/_template.md` | modify | speaker comment reworded |
| `data/moderators/_template.md` | modify | avatar comment gains size cap |
| `CLAUDE.md` | modify | privacy locked decision, Before-committing scan, README registration |
| `docs/devlog.md`, `todo.md` | modify | v0.5.0 entry + close-out |

---

### Task 1: Validator skips `README.md` in data folders

`listDataFiles()` currently includes every `*.md` not starting with `_`, so a `data/meetups/README.md` would be validated as a meetup and fail CI. Fix that before the READMEs exist.

**Files:**
- Create: `scripts/test/fixtures/golden/meetups/README.md`
- Create: `scripts/test/fixtures/golden/moderators/README.md`
- Modify: `scripts/build-data.mjs:47-54`
- Modify: `scripts/test/build-data.test.mjs:13-46`
- Modify: `docs/data-schema.md:14`

- [ ] **Step 1: Add README fixtures to the golden data dir (this is the failing test)**

Create `scripts/test/fixtures/golden/meetups/README.md`:

```markdown
# Not a meetup

This file proves the validator skips `README.md` in data folders. It has no frontmatter, so
validation fails loudly if it is ever treated as a meetup entry.
```

Create `scripts/test/fixtures/golden/moderators/README.md`:

```markdown
# Not a moderator

This file proves the validator skips `README.md` in data folders. It has no frontmatter, so
validation fails loudly if it is ever treated as a moderator entry.
```

- [ ] **Step 2: Extend the golden test's assertions**

In `scripts/test/build-data.test.mjs`, inside `test('golden fixture validates and emits the expected shapes', ...)`:

Change the comment on the index-length line (line 19):

```js
  assert.equal(index.length, 2); // _template.md and README.md skipped
```

And add, right after the avatar `existsSync` assertions (after line 45):

```js
  assert.ok(!fs.existsSync(path.join(out, 'data/meetups/README.json'))); // README.md never emitted
  assert.ok(!fs.existsSync(path.join(out, 'data/moderators/README.json')));
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — the golden test's `assert.deepEqual(errors, [])` now reports errors like `meetups/README.md: filename "README.md" must be YYYY-MM-DD.md ...` and `moderators/README.md: name: required ...`, because both README fixtures are being validated.

- [ ] **Step 4: Implement the skip**

In `scripts/build-data.mjs`, replace lines 47–54:

```js
// _*.md files are templates: skipped by validation and emission (spec §1.1).
function listDataFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
}
```

with:

```js
// _*.md files are templates and README.md is contributor docs: both are
// skipped by validation and emission (spec §1.1; readme-tree spec §4.1).
function listDataFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .sort();
}
```

(`README.md` is matched by exact name — the only casing this repo commits.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests green).

- [ ] **Step 6: Update `docs/data-schema.md` in the same change**

In `docs/data-schema.md` line 14, replace:

```
   fill it in, open a PR. Templates (`_*.md`) are skipped by validation and never rendered.
```

with:

```
   fill it in, open a PR. Templates (`_*.md`) and `README.md` are skipped by validation and never
   rendered.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/build-data.mjs scripts/test/build-data.test.mjs \
  scripts/test/fixtures/golden/meetups/README.md \
  scripts/test/fixtures/golden/moderators/README.md docs/data-schema.md
git commit -m "feat: validator skips README.md in data folders

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Avatar file-size cap (≤ 500 KB)

Repo bloat is the one irreversible avatar mistake; dimensions stay a recommendation (CSS center-crops). Enforced in `build-data.mjs` (it already lists `avatarFiles` and has `fs`) — `scripts/lib/validate.mjs` stays pure/fs-free.

**Files:**
- Modify: `scripts/build-data.mjs:75-81` (avatar block) + a module-level constant
- Modify: `scripts/test/build-data.test.mjs` (two new tests at the end)
- Modify: `docs/data-schema.md` (avatar row, avatars paragraph, CI-rejects list)
- Modify: `data/moderators/_template.md:8`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test/build-data.test.mjs`:

```js
test('oversized avatar is rejected with its name and size', () => {
  const dataDir = tmp();
  fs.cpSync(path.join(FIXTURES, 'golden'), dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'moderators/avatars/big.png'), Buffer.alloc(501 * 1024));
  const out = tmp();
  const { errors } = buildData({ dataDir, outDir: out });
  const all = errors.join('\n');
  assert.match(all, /moderators\/avatars\/big\.png/); // names the file
  assert.match(all, /501 KB/); // reports the actual size
  assert.match(all, /500 KB/); // states the cap
  assert.ok(!fs.existsSync(path.join(out, 'data'))); // nothing emitted
});

test('avatar exactly at the 500 KB cap passes', () => {
  const dataDir = tmp();
  fs.cpSync(path.join(FIXTURES, 'golden'), dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'moderators/avatars/atcap.png'), Buffer.alloc(500 * 1024));
  const { errors } = buildData({ dataDir, outDir: tmp() });
  assert.deepEqual(errors, []);
});
```

(The oversized fixture is generated at test time with `Buffer.alloc` — committing a 500 KB binary just to test the cap would itself be repo bloat.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — first new test: `errors` is `[]` so `assert.match('' , /moderators\/avatars\/big\.png/)` fails. Second new test passes vacuously (that's fine — it guards the boundary once the cap exists).

- [ ] **Step 3: Implement the cap**

In `scripts/build-data.mjs`, add a constant after the `MATTER_OPTS` block (after line 28):

```js
// Repo-bloat guard (readme-tree spec §4.2): avatars are committed binaries and
// oversized ones are the one irreversible mistake. Dimensions are deliberately
// unenforced — the CSS circle center-crops any shape.
const MAX_AVATAR_KB = 500;
```

Then inside `buildData`, right after the `if (!avatarFiles.includes('default.png')) { ... }` block (after line 81), add:

```js
  for (const f of avatarFiles) {
    const size = fs.statSync(path.join(avatarsDir, f)).size;
    if (size > MAX_AVATAR_KB * 1024) {
      errors.push(
        `moderators/avatars/${f}: ${Math.ceil(size / 1024)} KB — avatar files must be ` +
          `${MAX_AVATAR_KB} KB or smaller (resize/compress before committing)`,
      );
    }
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests green, including both new ones).

- [ ] **Step 5: Update `docs/data-schema.md` (schema-rule trio, part 1)**

Three edits in `docs/data-schema.md`:

1. Moderator table, `avatar` row — replace:

```
| `avatar` | – | bare filename | must exist in `data/moderators/avatars/`; omitted → `default.png` |
```

with:

```
| `avatar` | – | bare filename | must exist in `data/moderators/avatars/`, file ≤ 500 KB (CI-enforced); omitted → `default.png` |
```

2. The paragraph under the moderator table — replace:

```
Body (optional): longer intro, markdown, `## en` / `## zh` sections. Avatar image files live in
`data/moderators/avatars/` (owned by the data layer, so redesigns can't orphan them).
```

with:

```
Body (optional): longer intro, markdown, `## en` / `## zh` sections. Avatar image files live in
`data/moderators/avatars/` (owned by the data layer, so redesigns can't orphan them). Square PNG,
256–512px recommended — the site renders a 96px center-cropped circle, so exact dimensions are
forgiving; **file size ≤ 500 KB is CI-enforced** (repo bloat is the one irreversible mistake).
```

3. "What CI rejects" — replace:

```
avatars that
aren't a bare existing filename, duplicate `ctas[].id` values, a missing
```

with:

```
avatars that
aren't a bare existing filename, avatar files over 500 KB, duplicate `ctas[].id` values, a missing
```

- [ ] **Step 6: Update the moderator template (schema-rule trio, part 2)**

In `data/moderators/_template.md` line 8, replace:

```
# avatar: you.png       # optional; bare filename in data/moderators/avatars/ (omit → default.png)
```

with:

```
# avatar: you.png       # optional; PNG in data/moderators/avatars/, ≤ 500 KB CI-enforced
#                       # (square 256–512px recommended; omit → default.png)
```

- [ ] **Step 7: Run the build against real data to prove current avatars pass**

Run: `npm run build`
Expected: `✓ data validated and emitted to dist/data/` (the only committed avatar, `default.png`, is 68 bytes).

- [ ] **Step 8: Commit**

```bash
git add scripts/build-data.mjs scripts/test/build-data.test.mjs docs/data-schema.md \
  data/moderators/_template.md
git commit -m "feat: cap avatar files at 500 KB in the validator

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Remove the email privacy lint (code + tests)

The privacy unlock (spec §5): the repo no longer polices contact info. This task removes the lint mechanically; Task 4 rewrites the prose.

**Files:**
- Modify: `scripts/lib/validate.mjs:11,134,239-246` (delete `EMAIL_RE` + `privacyLintErrors`), `:113-115` (speaker message)
- Modify: `scripts/build-data.mjs:14,72,90,104` (drop import + 3 call sites)
- Modify: `scripts/test/validate-others.test.mjs:4,101-107`
- Modify: `scripts/test/build-data.test.mjs` (bad-fixture needles)
- Modify: `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md`
- Delete: `scripts/test/fixtures/bad/meetups/2026-07-21.md`

- [ ] **Step 1: Add an email to a golden fixture (this is the failing test)**

Replace the full contents of `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md` (its body is currently empty) with:

```markdown
---
date: 2026-07-14
startTime: "19:00"
segments:
  - type: chat
    title: { en: "Open chat", zh: "自由聊" }
---

Questions? Mail organizer@example.com — contributor-authored contact info is allowed
(privacy unlock, readme-tree spec §5).
```

- [ ] **Step 2: Retire the email-only bad fixture and its assertions**

Delete the fixture whose *only* error was the email lint:

```bash
git rm scripts/test/fixtures/bad/meetups/2026-07-21.md
```

In `scripts/test/build-data.test.mjs`, inside `test('bad fixture fails with every expected message and emits nothing', ...)`:

1. Remove this line from the `needles` array:

```js
    'email-shaped',                             // privacy lint
```

2. Remove this assertion (the file no longer exists):

```js
  assert.match(all, /meetups\/2026-07-21\.md/);
```

- [ ] **Step 3: Remove the two privacy-lint unit tests**

In `scripts/test/validate-others.test.mjs`:

1. Change line 4 from:

```js
import { validateModerator, validateCommunity, privacyLintErrors } from '../lib/validate.mjs';
```

to:

```js
import { validateModerator, validateCommunity } from '../lib/validate.mjs';
```

2. Delete lines 101–107 (both privacy-lint tests) entirely:

```js
test('privacy lint flags email-shaped strings', () => {
  const errors = privacyLintErrors('---\ndate: 2026-07-14\n---\nMail eve@example.com!');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /email-shaped/);
});
test('privacy lint passes clean content', () =>
  assert.deepEqual(privacyLintErrors('---\ndate: 2026-07-14\n---\nNo contact info here.'), []));
```

- [ ] **Step 4: Run the tests to verify the expected failure**

Run: `npm test`
Expected: FAIL — exactly one failure: the golden test reports `meetups/2026-07-14-summer-talk.md: privacy: email-shaped string "organizer@example.com" ...`, proving the lint is still active and the fixture will guard its removal.

- [ ] **Step 5: Remove the lint from the validator**

In `scripts/lib/validate.mjs`:

1. Delete line 11:

```js
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
```

2. Change the export on line 134 from:

```js
export { TIME_RE, HTTP_URL_RE, EMAIL_RE, urlError, unknownKeyErrors, bilingualErrors };
```

to:

```js
export { TIME_RE, HTTP_URL_RE, urlError, unknownKeyErrors, bilingualErrors };
```

3. Delete the whole `privacyLintErrors` block at the bottom of the file (lines 239–246):

```js
// Privacy lint (kickstart §4d): contact info never enters data/. Runs over the
// RAW file text so frontmatter and body are both covered.
export function privacyLintErrors(raw) {
  if (!raw.includes('@')) return []; // fast path — avoids quadratic regex scans on large @-free files
  return [...raw.matchAll(EMAIL_RE)].map(
    (m) => `privacy: email-shaped string "${m[0]}" — contact info never enters data/ (kickstart §4d)`,
  );
}
```

4. Reword the speaker error message (line 114) — the field is still a plain display name, but "never contact info" was the old policy. Replace:

```js
        errors.push(`${ctx}.speaker: required for talk segments (display name only — never contact info)`);
```

with:

```js
        errors.push(`${ctx}.speaker: required for talk segments (plain display name)`);
```

(`scripts/test/validate-meetup.test.mjs:51` asserts `/speaker: required for talk/` — still matches.)

- [ ] **Step 6: Remove the lint calls from the build**

In `scripts/build-data.mjs`:

1. Import block (lines 10–15) — replace:

```js
import {
  validateMeetup,
  validateModerator,
  validateCommunity,
  privacyLintErrors,
} from './lib/validate.mjs';
```

with:

```js
import { validateMeetup, validateModerator, validateCommunity } from './lib/validate.mjs';
```

2. Delete these three lines (72, 90, 104):

```js
    addErrors('community.md', privacyLintErrors(community.raw));
```

```js
    addErrors(`meetups/${filename}`, privacyLintErrors(entry.raw));
```

```js
    addErrors(`moderators/${filename}`, privacyLintErrors(entry.raw));
```

(`readEntry` still returns `raw` — leave it; it's the YAML source and harmless.)

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all green, including the golden fixture that now contains an email.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/validate.mjs scripts/build-data.mjs \
  scripts/test/validate-others.test.mjs scripts/test/build-data.test.mjs \
  scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md \
  scripts/test/fixtures/bad/meetups/2026-07-21.md
git commit -m "feat: remove the email privacy lint (privacy unlock, spec §5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Privacy rewording — `docs/data-schema.md`, meetup template, `CLAUDE.md`

Docs-only task: fold the new consent model ("everything you PR is public once merged") into every place the old "never enters the repo" stance lives. `docs/kickstart.md` §4d stays untouched — it is historical.

**Files:**
- Modify: `docs/data-schema.md` (§What CI rejects, meetup table, §Privacy & consent)
- Modify: `data/meetups/_template.md:14`
- Modify: `CLAUDE.md` (Locked decisions bullet; Before-committing section)

- [ ] **Step 1: `docs/data-schema.md` — drop the email item from "What CI rejects"**

Replace:

```
`data/moderators/avatars/default.png` (the required fallback avatar), frontmatter that isn't valid
YAML, and **email-shaped strings anywhere in `data/`** (privacy lint).
```

with:

```
`data/moderators/avatars/default.png` (the required fallback avatar), and frontmatter that isn't
valid YAML.
```

- [ ] **Step 2: `docs/data-schema.md` — reword the speaker row**

In the meetup field table, replace:

```
| `segments[].speaker` | talk: ✅ | plain string | **display name only — never contact info** |
```

with:

```
| `segments[].speaker` | talk: ✅ | plain string | display name |
```

- [ ] **Step 3: `docs/data-schema.md` — rewrite §Privacy & consent**

Replace the whole section (from `## Privacy & consent` up to, and excluding, `## How the site fetches the JSON`):

```markdown
## Privacy & consent

- **Everything you PR is public once merged** — the repo, its git history, and the built site.
  Include contact info only if you are comfortable with it being public; profile/portfolio links
  beat raw emails. The repo does not police contact info.
- **Edits & removal:** speakers and moderators can ask for their content to be edited or removed at
  any time — a PR (by the person or an organizer) deleting or redacting the entry, honored without
  question.
- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present). A one-time community-channel announcement with opt-out **must precede the
  first publication**.
- **Maintainer side:** logistics from the private sign-up sheet (the contact column) never enter
  this repo.
```

- [ ] **Step 4: Reword the meetup template's speaker comment**

In `data/meetups/_template.md` line 14, replace:

```
#     speaker: YourName          # display name only — NEVER emails or contact info
```

with:

```
#     speaker: YourName          # display name; anything merged here is public — links beat raw emails
```

- [ ] **Step 5: `CLAUDE.md` — reword the privacy locked decision**

Replace the bullet:

```markdown
- **Privacy:** speaker contact info (email/thread) **never** enters the public repo — logistics stay
  in the private sign-up sheet; only topic, speaker name, and materials link are public. → kickstart §4d
```

with:

```markdown
- **Privacy:** everything a contributor PRs is **public once merged** — contact info is allowed when
  its author wants it public (links beat raw emails); edits/removal honored on request.
  Maintainer-side logistics from the private sign-up sheet still never enter the repo.
  → spec 2026-07-10 §5 (unlocked from kickstart §4d)
```

- [ ] **Step 6: `CLAUDE.md` — narrow the Before-committing scan**

Replace:

```markdown
Scan **every** commit for secrets / API keys / tokens, `.env*` files, and **speaker contact info /
private PII** (kickstart §4d) before pushing. This repo is public and holds a community with private
sign-up data — this scan is required, not precautionary.
```

with:

```markdown
Scan **every** commit for secrets / API keys / tokens, `.env*` files, and **maintainer-side leaks
from the private sign-up sheet** (its contact column, logistics — spec 2026-07-10 §5) before pushing.
Contributor-authored contact info is fine: public-by-PR is the consent model. This repo is public and
holds a community with private sign-up data — this scan is required, not precautionary.
```

- [ ] **Step 7: Verify nothing still asserts the old stance**

Run: `grep -rn "never enters\|NEVER emails\|email-shaped\|privacy lint\|privacyLint" --include="*.md" --include="*.mjs" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git | grep -v "docs/kickstart.md\|docs/devlog.md\|docs/superpowers"`
Expected: no output. (kickstart/devlog/specs are historical and keep the old wording.)

- [ ] **Step 8: Run the tests**

Run: `npm test`
Expected: PASS (docs-only task; this catches accidental code edits).

- [ ] **Step 9: Commit**

```bash
git add docs/data-schema.md data/meetups/_template.md CLAUDE.md
git commit -m "docs: fold the privacy unlock into data-schema, template, CLAUDE.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Root `README.md`

The community front door (spec §3.1), under ~2 screens, plus the post-spec Claude Code / Fable 5 credit. Wording (pun, tagline) comes verbatim from `docs/wording.md`.

**Files:**
- Create: `README.md` (repo root)

- [ ] **Step 1: Write the file**

Create `README.md` with exactly this content:

````markdown
# AI展 (aitian)

**Show off your AI work** — the weekly AI-application meetup. Live at **[aitian.dev](https://aitian.dev)**.

The name is a Taiwanese pun: **愛展** (*ài-tián*) means "love to show off / want to demo", and the
"-ian" ending makes a demonym — members are **aitians**.

## What this repo is

The static portal site for the meetup: upcoming schedule, past sessions, and the moderator crew.
Content is Markdown under [`data/`](data/), validated and built to JSON at deploy, and published to
GitHub Pages. The data contract lives in [`docs/data-schema.md`](docs/data-schema.md); project
history and design docs live in [`docs/`](docs/).

Fittingly for a show-your-AI-work community, the site is itself a demo of AI work: designed and
developed with [Claude Code](https://claude.com/claude-code), mostly **Claude Fable 5** for the MVP.

## Contribute

| You want to… | Start here |
|---|---|
| Add or edit a meetup | [`data/meetups/README.md`](data/meetups/README.md) |
| Add yourself as a moderator | [`data/moderators/README.md`](data/moderators/README.md) |
| Improve site copy or code | PRs welcome — keep the maintained [`docs/`](docs/) files in sync with your change |

The PR flow, once for everything: **fork or branch → open a PR → CI validates → a maintainer
merges → the site auto-deploys.**

## Test your change locally

```
npm ci
npm test          # validator + unit tests — the same checks CI runs
npm run build     # validates data/ and builds the site into dist/
npx serve dist    # any static file server works
```

> **Don't open `dist/index.html` via a `file://` URL** — the site fetches its JSON at runtime and
> browsers block `fetch` on file URLs, so you'd see empty pages. Serve `dist/` over HTTP as above.

## Public visibility

Anything merged here is public — the repo, its history, and the site. Only include contact info you
want public; links beat raw emails. Want your content changed or removed later? Open a PR or ask a
maintainer.
````

- [ ] **Step 2: Sanity-check the build ignores it**

Run: `npm run build && ls dist/README.md 2>&1`
Expected: build succeeds; `ls` reports `No such file or directory` (the build copies `site/` only; the root README never reaches the served site).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: root README — community front door + contributor routing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `data/README.md`

Folder overview (spec §3.2): never-rename rule, content map, 5-step flow, bilingual one-liner, public-visibility note.

**Files:**
- Create: `data/README.md`

- [ ] **Step 1: Write the file**

Create `data/README.md` with exactly this content:

```markdown
# `data/` — the site's content

This folder is the site's **stable backend**: every page renders from the Markdown files here,
validated and built to JSON at deploy. The site's look-and-feel may be redesigned freely; these
files and their schema are meant to survive.

**The filename is the id and the citable URL** (`2026-07-14-ai-role-play.md` →
`aitian.dev/meetup.html#2026-07-14-ai-role-play`). **Never rename a file after it has deployed** —
renaming breaks every link already shared or cited (LinkedIn, résumés), which is the very thing
this site exists to provide.

## What's here

- [`community.md`](community.md) — site-wide copy and schedule defaults (maintainer-owned).
- [`meetups/`](meetups/) — one file per weekly session. How-to: [`meetups/README.md`](meetups/README.md).
- [`moderators/`](moderators/) — one file per moderator. How-to: [`moderators/README.md`](moderators/README.md).

## How to contribute an entry

1. Copy the `_template.md` in the right folder.
2. Rename the copy — each folder's README gives its naming rule.
3. Fill in the fields. The template's inline comments get you started; the full field reference is
   [`docs/data-schema.md`](../docs/data-schema.md).
4. Open a PR. CI validates every file and reports each problem with its file and field.
5. A maintainer merges; the site redeploys automatically.

**Bilingual fields in one line:** a plain string serves both languages, or use an `{en, zh}` map;
prose bodies use `## en` / `## zh` headings — details in
[`docs/data-schema.md`](../docs/data-schema.md#bilingual-fields--one-rule-per-shape).

## Public visibility

Anything merged here is public — the repo, its history, and the site. Only include contact info you
want public; links beat raw emails. Want your content changed or removed later? Open a PR or ask a
maintainer.
```

- [ ] **Step 2: Verify the build still ignores the `data/` root**

Run: `npm run build`
Expected: `✓ data validated and emitted to dist/data/` — `data/README.md` triggers no error (nothing globs the `data/` root; `community.md` is read by exact path, and Task 1's filter covers it anyway).

- [ ] **Step 3: Commit**

```bash
git add data/README.md
git commit -m "docs: data/ README — folder map, never-rename rule, contribution flow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `data/meetups/README.md`

Meetup how-to (spec §3.3). Deep-link anchors are computed from the actual `docs/data-schema.md` headings with GitHub's slug rules (lowercase; drop punctuation incl. the em dash, `/`, `[`, `]`, `.`; each space → `-`):

- `## Meetup — \`data/meetups/YYYY-MM-DD[-slug].md\`` → `#meetup--datameetupsyyyy-mm-dd-slugmd`
- `## What CI rejects` → `#what-ci-rejects`

**Files:**
- Create: `data/meetups/README.md`

- [ ] **Step 1: Write the file**

Create `data/meetups/README.md` with exactly this content:

```markdown
# Meetups — one file per weekly session

A meetup file describes one whole weekly session — a **multi-segment** evening (e.g. Talk 1 /
Talk 2 / open chat), never a single talk. One file per week.

## Naming

- Week still TBA: `YYYY-MM-DD.md` (e.g. `2026-07-21.md`)
- Week booked: `YYYY-MM-DD-short-slug.md` (e.g. `2026-07-14-ai-role-play.md`)
- The date is the meetup's **US-Pacific (PT) calendar date** — a Tuesday-evening PT meetup is
  Wednesday morning in Taipei and still uses the Tuesday date.
- **Reschedules change the `date` field, never the filename.** The filename is the shared,
  citable link — renaming breaks it.

## Add or edit a week

1. Copy [`_template.md`](_template.md) to a new file named as above.
2. Fill in the frontmatter. A TBA week keeps `segments: []` — the site renders it as a
   "want to speak?" slot.
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio` /
   `materialsUrl` if you have them).
4. Open a PR; CI reports any problems per field. Anything merged is public — see the
   [visibility note](../README.md#public-visibility).
5. After the event, back-fill `attendees` with a follow-up PR.

**Worked example:** [`2026-07-14-ai-role-play.md`](2026-07-14-ai-role-play.md) — a real booked
week to crib from.

**Full field reference:**
[meetup fields](../../docs/data-schema.md#meetup--datameetupsyyyy-mm-dd-slugmd) ·
[what CI rejects](../../docs/data-schema.md#what-ci-rejects)
```

- [ ] **Step 2: Verify validator + build skip it**

Run: `npm run build`
Expected: `✓ data validated and emitted to dist/data/` and no `dist/data/meetups/README.json`:

Run: `ls dist/data/meetups/ | grep -i readme; echo "exit: $?"`
Expected: no filename printed, `exit: 1`.

- [ ] **Step 3: Commit**

```bash
git add data/meetups/README.md
git commit -m "docs: meetups README — naming, TBA flow, worked example

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: `data/moderators/README.md`

Moderator how-to (spec §3.4). Anchor, by the same slug rules: `## Moderator — \`data/moderators/<slug>.md\`` → `#moderator--datamoderatorsslugmd`.

**Files:**
- Create: `data/moderators/README.md`

- [ ] **Step 1: Write the file**

Create `data/moderators/README.md` with exactly this content:

```markdown
# Moderators — one file per person

One file per moderator. **The filename is your lowercase handle and your card's id** —
`sansword.md` renders as the `sansword` card.

## Add yourself

1. Copy [`_template.md`](_template.md) to `your-handle.md` (lowercase slug).
2. Fill in `name`, `bio` (a one-liner for the grid card), and any `links` you want public.
3. Optional avatar: drop a PNG into [`avatars/`](avatars/) and reference it by bare filename
   (`avatar: you.png`). Omit it and you get `default.png`.
4. Open a PR. **PR-ing your own entry is the consent to publish it.**

## Avatar guidance

- **Square PNG, 256–512px recommended.** It renders in a 96px circle and non-square images are
  center-cropped, so exact dimensions are forgiving.
- **File size must be ≤ 500 KB** — CI enforces this. Resize/compress before committing.

**Worked example:** [`sansword.md`](sansword.md).

**Full field reference:**
[moderator fields](../../docs/data-schema.md#moderator--datamoderatorsslugmd)

Anything merged here is public. Only include contact info you want public — links beat raw emails.
Want your content changed or removed later? Open a PR or ask a maintainer.
```

- [ ] **Step 2: Verify validator + build skip it**

Run: `npm run build && ls dist/data/moderators/ | grep -i readme; echo "exit: $?"`
Expected: build succeeds; no filename printed; `exit: 1`.

- [ ] **Step 3: Commit**

```bash
git add data/moderators/README.md
git commit -m "docs: moderators README — handle, avatar guidance, PR-as-consent

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Register the READMEs as maintained docs in `CLAUDE.md`

Spec §6: the four READMEs join the maintained tier — one line, the index stays an index.

**Files:**
- Modify: `CLAUDE.md` ("Docs — two tiers" → maintained list)

- [ ] **Step 1: Add the registration line**

In `CLAUDE.md`, inside the **Maintained `docs/*.md`** list (after the `docs/theming.md` bullet), add:

```markdown
  - **Contributor READMEs** — root [`README.md`](README.md), [`data/README.md`](data/README.md),
    [`data/meetups/README.md`](data/meetups/README.md),
    [`data/moderators/README.md`](data/moderators/README.md): contributor how-tos; field detail
    stays in `docs/data-schema.md`. **Update trigger:** any change to the contribution flow,
    file-naming rules, folder layout, URL/stack, PR flow, or local-test commands (same PR).
```

(The list's intro says "Maintained `docs/*.md`" and these live outside `docs/` — the bullet's placement in that list is what registers them; no heading change needed.)

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: register the contributor READMEs as maintained docs

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: End-to-end verification (spec §8)

No code changes — evidence gathering. Fix anything found, then re-run.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass, 0 failures.

- [ ] **Step 2: Build + artifact check**

Run: `npm run build && find dist/data -iname '*readme*'; node -e "console.log(JSON.parse(require('fs').readFileSync('dist/data/meetups/index.json','utf8')).map(m=>m.id).join('\n'))"`
Expected: build succeeds; `find` prints nothing; the index lists exactly the eight committed meetup ids (`2026-07-14-ai-role-play` through `2026-09-01`) — no README artifact, index unchanged.

- [ ] **Step 3: Verify the deep-link anchors against the real headings**

Run:

```bash
node -e "
const md = require('fs').readFileSync('docs/data-schema.md','utf8');
const slug = (s) => s.toLowerCase().replace(/\`/g,'')
  .replace(/[^\p{L}\p{N} -]/gu,'').replace(/ /g,'-');
for (const m of md.matchAll(/^##+ (.+)\$/gm)) console.log('#' + slug(m[1]));
"
```

Expected output includes exactly these three lines (the anchors the READMEs link):

```
#bilingual-fields--one-rule-per-shape
#meetup--datameetupsyyyy-mm-dd-slugmd
#moderator--datamoderatorsslugmd
```

plus `#what-ci-rejects` and `#privacy--consent`. If any differ, fix the README links to match the computed slugs.

- [ ] **Step 4: Verify every relative link target exists**

Run:

```bash
node -e "
const fs = require('fs'), path = require('path');
const files = ['README.md','data/README.md','data/meetups/README.md','data/moderators/README.md'];
let bad = 0;
for (const f of files) {
  const md = fs.readFileSync(f,'utf8');
  for (const m of md.matchAll(/\]\(([^)#]+)(#[^)]*)?\)/g)) {
    const t = m[1];
    if (/^https?:/.test(t)) continue;
    const p = path.join(path.dirname(f), t);
    if (!fs.existsSync(p)) { console.log('BROKEN', f, '->', t); bad++; }
  }
}
console.log(bad ? bad + ' broken' : 'all link targets exist');
"
```

Expected: `all link targets exist`.

- [ ] **Step 5: Serve locally and eyeball it (spec §8 last bullet)**

Run: `npx serve dist` (background), then `curl -s http://localhost:3000/ | grep -o 'data-page="landing"'`
Expected: `data-page="landing"`. Then open `http://localhost:3000` in a browser once — meetup cards and moderators render (proves the local-test instructions in the root README are true as written). Stop the server afterwards.

- [ ] **Step 6: Commit any fixes made during verification**

Only if Steps 1–5 required changes; stage the specific files touched and commit with a message describing the fix.

---

### Task 11: Devlog + todo close-out (the end-of-session gate)

**Files:**
- Modify: `docs/devlog.md` (new v0.5.0 entry + TL;DR row)
- Modify: `todo.md`

- [ ] **Step 1: Write the v0.5.0 devlog entry**

Get the timestamp: `git log -1 --format='%ad' --date=format:'%Y-%m-%d %H:%M'`. Insert this entry directly under the `---` that follows the TL;DR table (newest first), using that timestamp in place of `HH:MM`:

```markdown
## v0.5.0 — Contributor README tree + privacy unlock (2026-07-10 HH:MM)

**Review:** not yet

**Design docs:**
- Contributor README tree: [Spec](superpowers/specs/2026-07-10-readme-tree-design.md) [Plan](superpowers/plans/2026-07-10-readme-tree.md)

**What was built:**
- Four contributor READMEs: root front door (name lore + tagline, contribute routing table, local
  test commands with the `file://` warning, public-visibility note, and a "designed/developed with
  Claude Code, mostly Fable 5" credit — added during planning at SansWord's request: the site is
  itself a demo of AI work), `data/` overview (never-rename rule, 5-step flow, bilingual one-liner),
  and meetups/moderators how-tos with worked-example links and computed deep-link anchors into
  `docs/data-schema.md`.
- Validator: `listDataFiles()` skips `README.md`; avatar files capped at ≤ 500 KB (name + actual
  size in the error; dimensions stay a README recommendation); email privacy lint removed.
- Privacy unlock folded into the maintained docs: `docs/data-schema.md` §Privacy & consent rewritten
  to the public-once-merged consent model; `CLAUDE.md` locked decision reworded and the
  Before-committing scan narrowed to maintainer-side sign-up-sheet leaks; both `_template.md`
  comments updated. `docs/kickstart.md` §4d untouched (historical).
- READMEs registered as maintained docs in `CLAUDE.md`.

**Key technical learnings:**
- `[note]` GitHub heading anchors for code-span headings strip `/`, `.`, `[`, `]` and the em dash
  entirely (each space still becomes a hyphen), so `## Meetup — \`data/meetups/YYYY-MM-DD[-slug].md\``
  → `#meetup--datameetupsyyyy-mm-dd-slugmd` — compute anchors, don't guess them.
- `[insight]` Oversized-file fixtures don't belong in git: the 500 KB-cap test generates its
  fixture with `Buffer.alloc(501 * 1024)` at test time — committing a big binary to test a
  repo-bloat guard would recreate the problem it guards against.
- `[note]` Removing a validator rule still gets a regression test: an email now lives in a golden
  fixture body, so the lint can't silently come back.
```

(Executor: amend/extend the learnings with anything real that surfaced during implementation; delete any bullet that turned out untrue.)

- [ ] **Step 2: Add the TL;DR row**

Add at the top of the TL;DR table (above the `v0.5.0-design` row), with `HHMM` matching the entry heading's time (anchor rule: lowercase, punctuation stripped, spaces → hyphens):

```markdown
| [v0.5.0](#v050--contributor-readme-tree--privacy-unlock-2026-07-10-hhmm) | **README tree shipped** — four contributor READMEs (root front door incl. Claude Code / Fable 5 credit, `data/` overview, meetups + moderators how-tos), validator README-skip + ≤ 500 KB avatar cap, and the privacy unlock implemented (email lint removed; docs/CLAUDE.md reworded to public-once-merged consent). |
```

- [ ] **Step 3: Update `todo.md`**

Three edits in `todo.md`:

1. Check off the plan/execute item (lines 16–19) — replace:

```markdown
- [ ] **Write the implementation plan for the README tree** from the approved spec
      ([`docs/superpowers/specs/2026-07-10-readme-tree-design.md`](docs/superpowers/specs/2026-07-10-readme-tree-design.md))
      — fresh session, `superpowers:writing-plans`; then execute. Includes the privacy unlock
      (email lint removal + doc rewording).
```

with:

```markdown
- [x] **Write the implementation plan for the README tree** from the approved spec
      ([`docs/superpowers/specs/2026-07-10-readme-tree-design.md`](docs/superpowers/specs/2026-07-10-readme-tree-design.md))
      — done 2026-07-10 (v0.5.0): plan
      ([`docs/superpowers/plans/2026-07-10-readme-tree.md`](docs/superpowers/plans/2026-07-10-readme-tree.md))
      executed; READMEs, validator changes, and privacy unlock shipped.
```

2. Fix the stale privacy reference in the back-fill item (lines 20–22) — replace:

```markdown
      rename the files. No contact info (kickstart §4d).
```

with:

```markdown
      rename the files. Nothing from the sheet's contact column (maintainer-side rule,
      readme-tree spec §5).
```

3. Add a follow-up item under **Now**:

```markdown
- [ ] **PR review + merge the README-tree branch** (SansWord) — squash-merge, then tag the squash
      commit `v0.5.0` (per CLAUDE.md post-merge rule).
```

- [ ] **Step 4: Run the full suite one last time**

Run: `npm test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add docs/devlog.md todo.md
git commit -m "docs: devlog v0.5.0 entry + todo close-out for the README tree

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Confirm PR scope — then stop**

Run: `git diff --name-only main...HEAD`
Expected: exactly the files listed in this plan's file-structure table (plus the spec/plan docs already committed on this branch). **Do not open or merge a PR** — per `CLAUDE.md`, opening the PR happens when SansWord says "ship it", and merging is his call. When he does: the docs gate is already satisfied by Tasks 4, 9, and 11.

---

## Self-review notes (spec-coverage check, done at planning time)

- Spec §3.1–3.4 → Tasks 5–8 (every listed section present; §3.1 item 4's `file://` warning included; §3.3's anchors computed, with Task 10 Step 3 verifying them mechanically).
- Spec §4.1 → Task 1 (filter + regression test + data-schema wording, one commit). §4.2 → Task 2 (cap + name-and-size error + trio updates).
- Spec §5 → Tasks 3 (code) + 4 (docs/CLAUDE.md/template) + 11 (devlog logs the unlock). Kickstart §4d untouched.
- Spec §6 → Task 9 (+ update triggers in the registration line). §7 (out of scope) honored: no zh READMEs, no badges/diagrams, no CONTRIBUTING.md, no site-render changes.
- Spec §8 → Task 10 maps 1:1 to its four bullets.
- Beyond spec (each flagged where it lands): Claude Code / Fable 5 credit (SansWord, mid-planning; Task 5 + devlog); speaker error-message/table reword (old stance leaked into them; Tasks 3/4); one-line visibility pointer in the meetups README step 4 (speakers' info flows through those files; kept to a link so §3.3's structure stays as specced).
