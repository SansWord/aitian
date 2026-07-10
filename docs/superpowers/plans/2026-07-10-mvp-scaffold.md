# MVP Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the aitian MVP — the `data/` Markdown backend, the `scripts/build-data.mjs` validate+emit pipeline, three static pages (landing, hash-routed meetup detail, moderators) with runtime zh/en + dark/light toggles, the PR-gating CI split, and the two new maintained docs.

**Architecture:** Data is authored as Markdown + YAML frontmatter under `data/` (the stable contract, spec §1), validated and emitted to JSON in `dist/data/` by a standalone Node script at deploy time. Three hand-written vanilla HTML/CSS/JS pages under `site/` consume only that JSON; the workflow builds `dist/` (data JSON + copied `site/`) and publishes it to Pages. The frontend computes upcoming/past client-side from build-resolved ISO instants.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework). Node ≥20 build script with devDeps `gray-matter`, `js-yaml`, `marked`, `sanitize-html`. Tests via `node:test`. GitHub Actions → GitHub Pages.

**Spec:** [`docs/superpowers/specs/2026-07-09-mvp-scaffold-design.md`](../specs/2026-07-09-mvp-scaffold-design.md) (approved 2026-07-10). Also consulted: `docs/kickstart.md`, root `CLAUDE.md`, `.github/workflows/deploy.yml`, `site/index.html`, `todo.md`.

**Ship deadline:** first seeded meetup is **2026-07-14**. The **ship-alone cutline is Tasks 0–11** (data layer + build/validate + CI + landing); Tasks 12–13 (meetup detail, moderators) can land in a follow-up PR if time runs short (spec §5). The doc tasks (14–16, 18) are a **gate before any PR** regardless of cutline.

**Decisions this plan makes inside the spec's freedom (flag to SansWord in review, don't block on them):**
0. **Deploy guard:** spec §3.2 literally says `if: github.event_name == 'push'`; the plan uses
   `!= 'pull_request'` so `workflow_dispatch` can still deploy (as the v0.2.0 workflow already
   could). Containment is unchanged — dispatch requires write access; PRs still never deploy.
1. **Seed content:** only the 7/14 meetup is booked in the docs (kickstart §4b example); the other 7 Tuesdays are seeded as TBA (`segments: []`). Booked weeks for Foucault/Charlie/Zoe live in the **private sheet** — SansWord back-fills them by editing the seeded TBA files (never renaming them). Added to todo in Task 18.
2. **Avatars:** ship only `default.png` (a transparent placeholder over a CSS circle); `sansword.png`/`pinku.png` from spec §1.1 are a human follow-up (real photos need the humans). The `avatar:` field is simply omitted from the two moderator files, which the schema defines as "use default".

**Interpretation notes (from spec ambiguities, resolved during planning):**
- Bilingual (string-or-`{en,zh}`) fields are exactly: segment `title`, segment `speakerBio`, moderator `bio`, `links[].label`, `tagline`, CTA `label`, and all `## en`/`## zh` bodies. `speaker` and moderator `name` are plain strings (display names aren't translated; spec §1.2/§1.3 annotate maps only on the former set — `speakerBio` included because §1.4 rule 3 covers user-facing prose).
- Filename date prefix is **not** required to equal frontmatter `date`: "never rename after deploy" means a rescheduled meetup keeps its filename and changes only `date`.

---

## Task 0: Preflight — branch off `main`

The spec + plan PR (`feat/mvp-scaffold-spec`) must be merged first (it's in `todo.md`). Implementation happens on a fresh branch — never on `main` (repo convention).

**Files:** none (git only)

- [ ] **Step 1: Confirm the spec is on `main` and create the work branch**

```bash
cd /Users/sansword/Source/github/aitian
git checkout main && git pull
ls docs/superpowers/specs/2026-07-09-mvp-scaffold-design.md   # must exist on main
git checkout -b feat/mvp-scaffold
```

Expected: file exists; new branch `feat/mvp-scaffold` created. If the spec is NOT on `main` yet, stop and tell the user the spec PR needs merging first.

- [ ] **Step 2: Confirm Node ≥ 20**

```bash
node --version
```

Expected: `v20.x` or later. If missing, stop and ask the user to install Node.

## Task 1: npm scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "aitian-site",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "node scripts/build-data.mjs && cp -R site/. dist/",
    "test": "node --test scripts/test/"
  }
}
```

(`build` order matters: `build-data.mjs` creates `dist/`, then `site/` — including `CNAME` — is copied in. Dependencies are added by `npm install` in Step 3 so versions resolve to current.)

- [ ] **Step 2: Write `.gitignore`**

```gitignore
node_modules/
dist/
.DS_Store
```

(`dist/` is never committed — generated JSON exists only in build output, kickstart §4c.)

- [ ] **Step 3: Install devDependencies**

```bash
npm install --save-dev gray-matter js-yaml marked sanitize-html
```

Expected: `package-lock.json` created, `devDependencies` added to `package.json`. `js-yaml` is explicit (not just transitive via gray-matter) because Task 6 imports it directly for schema control.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: scaffold npm package for the data build pipeline"
```

## Task 2: Time helper — wall clock + IANA zone → ISO instant

The build resolves each meetup's `date` + times + timezone into absolute ISO instants, DST-correct (spec §1.2), using only `Intl` — no timezone library.

**Files:**
- Create: `scripts/lib/time.mjs`
- Test: `scripts/test/time.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/test/time.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedTimeToInstant, isValidTimeZone } from '../lib/time.mjs';

test('July Pacific evening resolves as PDT (UTC-7)', () => {
  assert.equal(
    zonedTimeToInstant('2026-07-14', '18:00', 'America/Los_Angeles'),
    '2026-07-15T01:00:00.000Z',
  );
});

test('January Pacific evening resolves as PST (UTC-8) — DST boundary covered', () => {
  assert.equal(
    zonedTimeToInstant('2026-01-13', '18:00', 'America/Los_Angeles'),
    '2026-01-14T02:00:00.000Z',
  );
});

test('Taipei has no DST and sits at UTC+8', () => {
  assert.equal(
    zonedTimeToInstant('2026-07-15', '09:00', 'Asia/Taipei'),
    '2026-07-15T01:00:00.000Z',
  );
});

test('isValidTimeZone accepts IANA names and rejects junk', () => {
  assert.equal(isValidTimeZone('America/Los_Angeles'), true);
  assert.equal(isValidTimeZone('Asia/Taipei'), true);
  assert.equal(isValidTimeZone('Mars/OlympusMons'), false);
  assert.equal(isValidTimeZone(''), false);
  assert.equal(isValidTimeZone(42), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '.../scripts/lib/time.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/time.mjs`**

```js
// Resolve wall-clock times in an IANA zone to absolute instants using only
// Intl — no timezone library.

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || tz === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Offset of `timeZone` from UTC at the given UTC instant, in milliseconds.
function tzOffsetMillis(utcMillis, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
      .formatToParts(new Date(utcMillis))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return asUtc - utcMillis;
}

// dateStr "YYYY-MM-DD" + timeStr "HH:MM" as a wall clock in timeZone → ISO
// instant string.
export function zonedTimeToInstant(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wallAsUtc;
  // Two passes: the offset at the first guess can differ from the offset at
  // the true instant right around a DST transition.
  for (let i = 0; i < 2; i++) {
    guess = wallAsUtc - tzOffsetMillis(guess, timeZone);
  }
  return new Date(guess).toISOString();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/time.mjs scripts/test/time.test.mjs
git commit -m "feat: DST-correct wall-clock -> ISO instant resolution via Intl"
```

## Task 3: Bilingual helpers — string-or-`{en,zh}` fields + body sections

Implements the spec §1.3 bilingual convention: short fields are a plain string or an `{en, zh}` map (≥1 key, missing language falls back); prose bodies split on `## en` / `## zh` headings (one section serves both).

**Files:**
- Create: `scripts/lib/bilingual.mjs`
- Test: `scripts/test/bilingual.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/test/bilingual.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bilingualShapeError, splitBodySections } from '../lib/bilingual.mjs';

test('plain string is valid', () => {
  assert.equal(bilingualShapeError('hello', 'title'), null);
});

test('{en}, {zh}, {en,zh} maps are valid', () => {
  assert.equal(bilingualShapeError({ en: 'hi' }, 'title'), null);
  assert.equal(bilingualShapeError({ zh: '嗨' }, 'title'), null);
  assert.equal(bilingualShapeError({ en: 'hi', zh: '嗨' }, 'title'), null);
});

test('empty map is invalid', () => {
  assert.match(bilingualShapeError({}, 'title'), /at least one/);
});

test('unknown language keys are invalid', () => {
  assert.match(bilingualShapeError({ fr: 'salut' }, 'title'), /unknown language key/);
});

test('non-string values inside the map are invalid', () => {
  assert.match(bilingualShapeError({ en: 3 }, 'title'), /must be a string/);
});

test('arrays and numbers are invalid', () => {
  assert.match(bilingualShapeError(['x'], 'title'), /plain string or an \{en, zh\} map/);
  assert.match(bilingualShapeError(7, 'title'), /plain string or an \{en, zh\} map/);
});

test('body without language headings serves both languages', () => {
  assert.deepEqual(splitBodySections('Just one intro.'), {
    en: 'Just one intro.',
    zh: 'Just one intro.',
  });
});

test('body splits on ## en / ## zh headings', () => {
  const body = '## en\nEnglish intro.\n\n## zh\n中文介紹。';
  assert.deepEqual(splitBodySections(body), { en: 'English intro.', zh: '中文介紹。' });
});

test('single-language section falls back to the other', () => {
  assert.deepEqual(splitBodySections('## zh\n只有中文。'), { en: '只有中文。', zh: '只有中文。' });
});

test('empty body yields empty strings', () => {
  assert.deepEqual(splitBodySections(''), { en: '', zh: '' });
  assert.deepEqual(splitBodySections(undefined), { en: '', zh: '' });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot find `../lib/bilingual.mjs`.

- [ ] **Step 3: Implement `scripts/lib/bilingual.mjs`**

```js
// The string-or-{en,zh} shape (spec §1.3): a plain string renders for both
// languages; a map may omit one key (at least one required).

export function bilingualShapeError(value, fieldPath) {
  if (typeof value === 'string') return null;
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    const unknown = keys.filter((k) => k !== 'en' && k !== 'zh');
    if (unknown.length > 0) {
      return `${fieldPath}: unknown language key(s) ${unknown.join(', ')} — only "en"/"zh"`;
    }
    if (keys.length === 0) {
      return `${fieldPath}: language map needs at least one of "en"/"zh"`;
    }
    for (const k of keys) {
      if (typeof value[k] !== 'string') return `${fieldPath}.${k}: must be a string`;
    }
    return null;
  }
  return `${fieldPath}: must be a plain string or an {en, zh} map`;
}

// Split a markdown body on "## en" / "## zh" headings. No language headings →
// the whole body serves both languages; a missing language falls back to the
// one provided.
export function splitBodySections(body) {
  const text = (body ?? '').trim();
  if (text === '') return { en: '', zh: '' };
  const matches = [...text.matchAll(/^##\s+(en|zh)\s*$/gm)];
  if (matches.length === 0) return { en: text, zh: text };
  const out = { en: '', zh: '' };
  matches.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    out[m[1]] = text.slice(start, end).trim();
  });
  if (out.en === '') out.en = out.zh;
  if (out.zh === '') out.zh = out.en;
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/bilingual.mjs scripts/test/bilingual.test.mjs
git commit -m "feat: bilingual string-or-map validation and body-section splitting"
```

## Task 4: Validator — meetup files

The full spec §1.5 rule list for meetups. This is the PR gate contributors hit — every message must say what's wrong and how to fix it.

**Files:**
- Create: `scripts/lib/validate.mjs`
- Test: `scripts/test/validate-meetup.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/test/validate-meetup.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMeetup } from '../lib/validate.mjs';

const GOOD = {
  date: '2026-07-14',
  segments: [
    { type: 'talk', title: 'A talk', speaker: 'Claire', materialsUrl: 'https://example.com/x' },
    { type: 'chat', title: { en: 'Open chat', zh: '自由聊' } },
  ],
  attendees: null,
};

function errs(overrides = {}, filename = '2026-07-14-good.md') {
  return validateMeetup({ filename, data: { ...GOOD, ...overrides } });
}

test('golden meetup has no errors', () => assert.deepEqual(errs(), []));
test('TBA meetup (segments: []) is valid', () => assert.deepEqual(errs({ segments: [] }), []));
test('bare-date filename is valid', () => assert.deepEqual(errs({}, '2026-08-25.md'), []));

test('frontmatter id is rejected', () =>
  assert.match(errs({ id: 'x' }).join('\n'), /filename is the id/));
test('unknown frontmatter field is rejected', () =>
  assert.match(errs({ location: 'zoom' }).join('\n'), /unknown field "location"/));
test('bad filename pattern is rejected', () =>
  assert.match(errs({}, 'July-14.md').join('\n'), /filename/));
test('malformed date is rejected', () =>
  assert.match(errs({ date: '14/07/2026' }).join('\n'), /YYYY-MM-DD/));
test('impossible calendar date is rejected', () =>
  assert.match(errs({ date: '2026-02-30' }).join('\n'), /YYYY-MM-DD/));
test('missing date is rejected', () =>
  assert.match(errs({ date: undefined }).join('\n'), /date: required/));
test('malformed startTime is rejected', () =>
  assert.match(errs({ startTime: '6pm' }).join('\n'), /HH:MM/));
test('non-string startTime (unquoted YAML) gets the quoting hint', () =>
  assert.match(errs({ startTime: 1080 }).join('\n'), /HH:MM/));
test('unknown timezone is rejected', () =>
  assert.match(errs({ timezone: 'Mars/OlympusMons' }).join('\n'), /IANA/));
test('missing segments is rejected', () =>
  assert.match(errs({ segments: undefined }).join('\n'), /segments: required/));
test('bad segment type is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'workshop', title: 'x' }] }).join('\n'),
    /"talk" or "chat"/,
  ));
test('talk without speaker is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'talk', title: 'x' }] }).join('\n'),
    /speaker: required for talk/,
  ));
test('segment without title is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'talk', speaker: 'A' }] }).join('\n'),
    /title: required/,
  ));
test('bad bilingual title shape is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'talk', title: { fr: 'x' }, speaker: 'A' }] }).join('\n'),
    /unknown language key/,
  ));
test('non-http materialsUrl is rejected', () =>
  assert.match(
    errs({
      segments: [{ type: 'talk', title: 'x', speaker: 'A', materialsUrl: 'javascript:alert(1)' }],
    }).join('\n'),
    /http/,
  ));
test('javascript: link inside speakerBio markdown is rejected', () =>
  assert.match(
    errs({
      segments: [
        { type: 'talk', title: 'x', speaker: 'A', speakerBio: 'see [me](javascript:alert(1))' },
      ],
    }).join('\n'),
    /only http\(s\)/,
  ));
test('https link inside speakerBio markdown is fine', () =>
  assert.deepEqual(
    errs({
      segments: [
        { type: 'talk', title: 'x', speaker: 'A', speakerBio: 'see [me](https://example.com)' },
      ],
    }),
    [],
  ));
test('fractional attendees is rejected', () =>
  assert.match(errs({ attendees: 2.5 }).join('\n'), /integer/));
test('negative attendees is rejected', () =>
  assert.match(errs({ attendees: -1 }).join('\n'), /integer/));
test('integer attendees is valid', () => assert.deepEqual(errs({ attendees: 12 }), []));
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot find `../lib/validate.mjs`.

- [ ] **Step 3: Implement `scripts/lib/validate.mjs` (meetup part)**

```js
// Per-file schema validation (spec §1.5). Every function returns an array of
// error message strings — the caller prefixes them with the file path. Clear
// messages matter: this is the CI gate contributors hit on their PRs.
import { isValidTimeZone } from './time.mjs';
import { bilingualShapeError } from './bilingual.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEETUP_FILENAME_RE = /^\d{4}-\d{2}-\d{2}(-[a-z0-9]+(?:-[a-z0-9]+)*)?\.md$/;
const HTTP_URL_RE = /^https?:\/\//;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MD_LINK_SCHEME_RE = /\]\(\s*([a-z][a-z0-9+.-]*):/gi;

function isRealDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// `allowed` gates the check; `displayAllowed` is what the error message lists
// (meetup/moderator pass 'id' as allowed so it isn't double-reported as
// "unknown" — it already gets its own dedicated remove-id error — but it must
// not appear in the "allowed:" hint).
function unknownKeyErrors(obj, allowed, ctx, displayAllowed = allowed) {
  return Object.keys(obj)
    .filter((k) => !allowed.includes(k))
    .map((k) => `${ctx}: unknown field "${k}" (allowed: ${displayAllowed.join(', ')})`);
}

function urlError(value, ctx) {
  if (typeof value !== 'string') return `${ctx}: must be a string`;
  if (value !== '' && !HTTP_URL_RE.test(value)) {
    return `${ctx}: must start with http:// or https:// (got "${value}")`;
  }
  return null;
}

function markdownLinkSchemeErrors(md, ctx) {
  const errors = [];
  for (const m of md.matchAll(MD_LINK_SCHEME_RE)) {
    const scheme = m[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      errors.push(`${ctx}: markdown link uses "${scheme}:" — only http(s) links are allowed`);
    }
  }
  return errors;
}

function bilingualErrors(value, ctx, { required = false, markdownLinks = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? [`${ctx}: required`] : [];
  }
  const shapeErr = bilingualShapeError(value, ctx);
  if (shapeErr) return [shapeErr];
  const errors = [];
  const texts = typeof value === 'string' ? [value] : Object.values(value);
  if (required && texts.every((t) => t.trim() === '')) errors.push(`${ctx}: required (empty)`);
  if (markdownLinks) {
    for (const t of texts) errors.push(...markdownLinkSchemeErrors(t, ctx));
  }
  return errors;
}

const MEETUP_KEYS = ['id', 'date', 'startTime', 'endTime', 'timezone', 'segments', 'attendees'];
const SEGMENT_KEYS = ['type', 'title', 'speaker', 'speakerBio', 'materialsUrl'];

export function validateMeetup({ filename, data }) {
  const errors = [];
  if (!MEETUP_FILENAME_RE.test(filename)) {
    errors.push(
      `filename "${filename}" must be YYYY-MM-DD.md or YYYY-MM-DD-slug.md ` +
        '(slug: lowercase a-z0-9, hyphen-separated)',
    );
  }
  if ('id' in data) {
    errors.push('remove "id:" from the frontmatter — the filename is the id');
  }
  errors.push(
    ...unknownKeyErrors(data, MEETUP_KEYS, 'frontmatter', MEETUP_KEYS.filter((k) => k !== 'id')),
  );

  if (typeof data.date !== 'string' || !DATE_RE.test(data.date) || !isRealDate(data.date)) {
    errors.push(
      `date: required, a real calendar date in YYYY-MM-DD format ` +
        `(got ${JSON.stringify(data.date ?? null)})`,
    );
  }
  for (const f of ['startTime', 'endTime']) {
    if (data[f] !== undefined && (typeof data[f] !== 'string' || !TIME_RE.test(data[f]))) {
      errors.push(`${f}: must be "HH:MM" 24-hour — quote it in YAML (got ${JSON.stringify(data[f])})`);
    }
  }
  if (data.timezone !== undefined && !isValidTimeZone(data.timezone)) {
    errors.push(`timezone: "${data.timezone}" is not a valid IANA timezone name`);
  }

  if (!Array.isArray(data.segments)) {
    errors.push('segments: required, must be a list (use "segments: []" for a TBA week)');
  } else {
    data.segments.forEach((seg, i) => {
      const ctx = `segments[${i}]`;
      if (seg === null || typeof seg !== 'object' || Array.isArray(seg)) {
        errors.push(`${ctx}: must be a map with at least "type" and "title"`);
        return;
      }
      errors.push(...unknownKeyErrors(seg, SEGMENT_KEYS, ctx));
      if (seg.type !== 'talk' && seg.type !== 'chat') {
        errors.push(`${ctx}.type: must be "talk" or "chat" (got ${JSON.stringify(seg.type ?? null)})`);
      }
      errors.push(...bilingualErrors(seg.title, `${ctx}.title`, { required: true }));
      if (seg.speaker !== undefined && typeof seg.speaker !== 'string') {
        errors.push(`${ctx}.speaker: must be a plain string display name`);
      } else if (seg.type === 'talk' && (typeof seg.speaker !== 'string' || seg.speaker.trim() === '')) {
        errors.push(`${ctx}.speaker: required for talk segments (display name only — never contact info)`);
      }
      errors.push(...bilingualErrors(seg.speakerBio, `${ctx}.speakerBio`, { markdownLinks: true }));
      if (seg.materialsUrl !== undefined) {
        const e = urlError(seg.materialsUrl, `${ctx}.materialsUrl`);
        if (e) errors.push(e);
      }
    });
  }

  if (
    data.attendees !== undefined &&
    data.attendees !== null &&
    !(Number.isInteger(data.attendees) && data.attendees >= 0)
  ) {
    errors.push(`attendees: must be an integer >= 0 or null (got ${JSON.stringify(data.attendees)})`);
  }
  return errors;
}

export { TIME_RE, HTTP_URL_RE, EMAIL_RE, urlError, unknownKeyErrors, bilingualErrors };
```

(The trailing named exports are consumed by Task 5 in the same file — they're listed here so the file is complete after this step; Task 5 appends more functions.)

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-meetup.test.mjs
git commit -m "feat: meetup schema validation (spec 1.5 rules)"
```

## Task 5: Validator — moderators, community, privacy lint

**Files:**
- Modify: `scripts/lib/validate.mjs` (append)
- Test: `scripts/test/validate-others.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/test/validate-others.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModerator, validateCommunity, privacyLintErrors } from '../lib/validate.mjs';

const AVATARS = ['default.png', 'alice.png'];

const GOOD_MOD = {
  name: 'Alice',
  bio: { en: 'Organizer.', zh: '主辦。' },
  avatar: 'alice.png',
  links: [{ label: { en: 'Site', zh: '網站' }, url: 'https://alice.example' }],
};

function modErrs(overrides = {}, filename = 'alice.md') {
  return validateModerator({ filename, data: { ...GOOD_MOD, ...overrides }, avatarFiles: AVATARS });
}

test('golden moderator has no errors', () => assert.deepEqual(modErrs(), []));
test('avatar and links are optional', () =>
  assert.deepEqual(modErrs({ avatar: undefined, links: undefined }), []));
test('plain-string bio is valid', () => assert.deepEqual(modErrs({ bio: 'Organizer.' }), []));

test('moderator filename must be a slug', () =>
  assert.match(modErrs({}, 'Alice Smith.md').join('\n'), /filename/));
test('frontmatter id is rejected', () =>
  assert.match(modErrs({ id: 'alice' }).join('\n'), /filename is the id/));
test('unknown field is rejected', () =>
  assert.match(modErrs({ email: 'x' }).join('\n'), /unknown field "email"/));
test('missing name is rejected', () =>
  assert.match(modErrs({ name: undefined }).join('\n'), /name: required/));
test('missing bio is rejected', () =>
  assert.match(modErrs({ bio: undefined }).join('\n'), /bio: required/));
test('path-traversal avatar is rejected', () =>
  assert.match(modErrs({ avatar: '../secrets.png' }).join('\n'), /bare filename/));
test('URL avatar is rejected', () =>
  assert.match(modErrs({ avatar: 'https://evil.example/x.png' }).join('\n'), /bare filename/));
test('avatar missing from avatars dir is rejected', () =>
  assert.match(modErrs({ avatar: 'ghost.png' }).join('\n'), /not found in data\/moderators\/avatars/));
test('non-http link url is rejected', () =>
  assert.match(
    modErrs({ links: [{ label: 'X', url: 'ftp://x.example' }] }).join('\n'),
    /http/,
  ));
test('link without label is rejected', () =>
  assert.match(
    modErrs({ links: [{ url: 'https://x.example' }] }).join('\n'),
    /label: required/,
  ));

const GOOD_COMMUNITY = {
  tagline: { en: 'Show off your AI work', zh: '用你的 AI 作品展風神' },
  schedule: { timezone: 'America/Los_Angeles', startTime: '18:00', endTime: '19:30' },
  ctas: [
    { id: 'speak', label: { en: 'Sign up to speak', zh: '報名分享' }, href: '' },
    { id: 'join', label: { en: 'Get invite link', zh: '取得邀請連結' }, href: '' },
  ],
};

function commErrs(overrides = {}) {
  return validateCommunity({ data: { ...GOOD_COMMUNITY, ...overrides } });
}

test('golden community has no errors', () => assert.deepEqual(commErrs(), []));
test('unknown top-level field is rejected (e.g. the kickstart-era "name")', () =>
  assert.match(commErrs({ name: 'AI展' }).join('\n'), /unknown field "name"/));
test('missing tagline is rejected', () =>
  assert.match(commErrs({ tagline: undefined }).join('\n'), /tagline: required/));
test('missing schedule is rejected', () =>
  assert.match(commErrs({ schedule: undefined }).join('\n'), /schedule: required/));
test('bad schedule timezone is rejected', () =>
  assert.match(
    commErrs({ schedule: { ...GOOD_COMMUNITY.schedule, timezone: 'PST-ish' } }).join('\n'),
    /IANA/,
  ));
test('unquoted schedule time is rejected with quoting hint', () =>
  assert.match(
    commErrs({ schedule: { ...GOOD_COMMUNITY.schedule, startTime: 1080 } }).join('\n'),
    /HH:MM/,
  ));
test('cta without id is rejected', () =>
  assert.match(commErrs({ ctas: [{ label: 'x', href: '' }] }).join('\n'), /id: required/));
test('duplicate cta ids are rejected', () =>
  assert.match(
    commErrs({
      ctas: [
        { id: 'speak', label: 'a', href: '' },
        { id: 'speak', label: 'b', href: '' },
      ],
    }).join('\n'),
    /duplicate/,
  ));
test('non-http cta href is rejected', () =>
  assert.match(
    commErrs({ ctas: [{ id: 'x', label: 'x', href: 'javascript:alert(1)' }] }).join('\n'),
    /http/,
  ));
test('empty cta href is allowed (placeholder button)', () =>
  assert.deepEqual(commErrs({ ctas: [{ id: 'x', label: 'x', href: '' }] }), []));

test('privacy lint flags email-shaped strings', () => {
  const errors = privacyLintErrors('---\ndate: 2026-07-14\n---\nMail eve@example.com!');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /email-shaped/);
});
test('privacy lint passes clean content', () =>
  assert.deepEqual(privacyLintErrors('---\ndate: 2026-07-14\n---\nNo contact info here.'), []));
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `validateModerator` etc. not exported.

- [ ] **Step 3: Append to `scripts/lib/validate.mjs`**

```js
const MODERATOR_FILENAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const AVATAR_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MODERATOR_KEYS = ['id', 'name', 'bio', 'avatar', 'links'];
const LINK_KEYS = ['label', 'url'];

export function validateModerator({ filename, data, avatarFiles }) {
  const errors = [];
  if (!MODERATOR_FILENAME_RE.test(filename)) {
    errors.push(`filename "${filename}" must be a lowercase slug like "sansword.md"`);
  }
  if ('id' in data) {
    errors.push('remove "id:" from the frontmatter — the filename is the id');
  }
  errors.push(
    ...unknownKeyErrors(data, MODERATOR_KEYS, 'frontmatter', MODERATOR_KEYS.filter((k) => k !== 'id')),
  );
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('name: required (plain string display name)');
  }
  errors.push(...bilingualErrors(data.bio, 'bio', { required: true }));
  if (data.avatar !== undefined) {
    if (typeof data.avatar !== 'string' || !AVATAR_RE.test(data.avatar) || data.avatar.includes('..')) {
      errors.push(
        `avatar: must be a bare filename inside data/moderators/avatars/ ` +
          `(no "/", no "..", no URL) — got ${JSON.stringify(data.avatar)}`,
      );
    } else if (!avatarFiles.includes(data.avatar)) {
      errors.push(`avatar: "${data.avatar}" not found in data/moderators/avatars/`);
    }
  }
  if (data.links !== undefined) {
    if (!Array.isArray(data.links)) {
      errors.push('links: must be a list of {label, url} entries');
    } else {
      data.links.forEach((link, i) => {
        const ctx = `links[${i}]`;
        if (link === null || typeof link !== 'object' || Array.isArray(link)) {
          errors.push(`${ctx}: must be a map with label + url`);
          return;
        }
        errors.push(...unknownKeyErrors(link, LINK_KEYS, ctx));
        errors.push(...bilingualErrors(link.label, `${ctx}.label`, { required: true }));
        if (typeof link.url !== 'string' || !HTTP_URL_RE.test(link.url)) {
          errors.push(`${ctx}.url: required, must start with http:// or https://`);
        }
      });
    }
  }
  return errors;
}

const COMMUNITY_KEYS = ['tagline', 'schedule', 'ctas'];
const SCHEDULE_KEYS = ['timezone', 'startTime', 'endTime'];
const CTA_KEYS = ['id', 'label', 'href'];

export function validateCommunity({ data }) {
  const errors = [];
  errors.push(...unknownKeyErrors(data, COMMUNITY_KEYS, 'frontmatter'));
  errors.push(...bilingualErrors(data.tagline, 'tagline', { required: true }));

  const sched = data.schedule;
  if (sched === null || sched === undefined || typeof sched !== 'object' || Array.isArray(sched)) {
    errors.push('schedule: required map with timezone, startTime, endTime');
  } else {
    errors.push(...unknownKeyErrors(sched, SCHEDULE_KEYS, 'schedule'));
    if (!isValidTimeZone(sched.timezone)) {
      errors.push(`schedule.timezone: "${sched.timezone}" is not a valid IANA timezone name`);
    }
    for (const f of ['startTime', 'endTime']) {
      if (typeof sched[f] !== 'string' || !TIME_RE.test(sched[f])) {
        errors.push(`schedule.${f}: required, "HH:MM" 24-hour — quote it in YAML`);
      }
    }
  }

  if (!Array.isArray(data.ctas)) {
    errors.push('ctas: required list');
  } else {
    const seen = new Set();
    data.ctas.forEach((cta, i) => {
      const ctx = `ctas[${i}]`;
      if (cta === null || typeof cta !== 'object' || Array.isArray(cta)) {
        errors.push(`${ctx}: must be a map with id, label, href`);
        return;
      }
      errors.push(...unknownKeyErrors(cta, CTA_KEYS, ctx));
      if (typeof cta.id !== 'string' || cta.id.trim() === '') {
        errors.push(`${ctx}.id: required stable key (the frontend targets it)`);
      } else if (seen.has(cta.id)) {
        errors.push(`${ctx}.id: duplicate "${cta.id}"`);
      } else {
        seen.add(cta.id);
      }
      errors.push(...bilingualErrors(cta.label, `${ctx}.label`, { required: true }));
      if (cta.href !== undefined) {
        const e = urlError(cta.href, `${ctx}.href`);
        if (e) errors.push(e);
      }
    });
  }
  return errors;
}

// Privacy lint (kickstart §4d): contact info never enters data/. Runs over the
// RAW file text so frontmatter and body are both covered.
export function privacyLintErrors(raw) {
  return [...raw.matchAll(EMAIL_RE)].map(
    (m) => `privacy: email-shaped string "${m[0]}" — contact info never enters data/ (kickstart §4d)`,
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/validate.mjs scripts/test/validate-others.test.mjs
git commit -m "feat: moderator/community validation + email privacy lint"
```

## Task 6: Emitter — markdown → sanitized JSON shapes

Transforms validated entries into the JSON the frontend consumes: bodies rendered by `marked` and passed through `sanitize-html` at build time (spec §2.7), meetup times resolved to ISO instants (§1.2).

**Files:**
- Create: `scripts/lib/emit.mjs`
- Test: `scripts/test/emit.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
// scripts/test/emit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetupToJson, moderatorToJson, renderBilingualBody } from '../lib/emit.mjs';

const DEFAULTS = { timezone: 'America/Los_Angeles', startTime: '18:00', endTime: '19:30' };

test('meetup resolves instants from community defaults', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: { date: '2026-07-14', segments: [] },
    content: '',
    defaults: DEFAULTS,
  });
  assert.equal(m.start, '2026-07-15T01:00:00.000Z');
  assert.equal(m.end, '2026-07-15T02:30:00.000Z');
  assert.equal(m.timezone, 'America/Los_Angeles');
  assert.equal(m.attendees, null);
});

test('per-meetup startTime override wins over the default', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: { date: '2026-07-14', startTime: '19:00', segments: [] },
    content: '',
    defaults: DEFAULTS,
  });
  assert.equal(m.start, '2026-07-15T02:00:00.000Z');
});

test('string speakerBio renders the same sanitized inline HTML for both languages', () => {
  const m = meetupToJson({
    id: '2026-07-14-x',
    data: {
      date: '2026-07-14',
      segments: [
        { type: 'talk', title: 'T', speaker: 'A', speakerBio: 'Builds [things](https://a.example).' },
      ],
    },
    content: '',
    defaults: DEFAULTS,
  });
  const bio = m.segments[0].speakerBioHtml;
  assert.match(bio.en, /<a href="https:\/\/a\.example">things<\/a>/);
  assert.equal(bio.en, bio.zh);
});

test('script tags in a body are stripped at build time', () => {
  const html = renderBilingualBody('Hello <script>alert(1)</script> world.');
  assert.ok(!html.en.includes('script'));
  assert.ok(html.en.includes('Hello'));
});

test('language-sectioned body splits and renders per language', () => {
  const html = renderBilingualBody('## en\n**English**\n\n## zh\n**中文**');
  assert.match(html.en, /<strong>English<\/strong>/);
  assert.match(html.zh, /<strong>中文<\/strong>/);
});

test('moderator avatar falls back to default.png and empty body renders empty', () => {
  const mod = moderatorToJson({
    id: 'alice',
    data: { name: 'Alice', bio: 'Organizer.' },
    content: '',
  });
  assert.equal(mod.avatar, 'default.png');
  assert.deepEqual(mod.links, []);
  assert.deepEqual(mod.bodyHtml, { en: '', zh: '' });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot find `../lib/emit.mjs`.

- [ ] **Step 3: Implement `scripts/lib/emit.mjs`**

```js
// Emit-side transforms (spec §1.5 job 2). All markdown is rendered and
// sanitized HERE, at build time — the client never parses or trusts raw user
// input (spec §2.7). sanitize-html's allowedSchemes is defense-in-depth behind
// the validator's http(s)-only rule.
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { splitBodySections } from './bilingual.mjs';
import { zonedTimeToInstant } from './time.mjs';

const SANITIZE_OPTS = {
  allowedTags: ['p', 'a', 'em', 'strong', 'ul', 'ol', 'li', 'code', 'pre', 'br', 'blockquote'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https'],
};

export function renderMarkdown(md) {
  if (!md || md.trim() === '') return '';
  return sanitizeHtml(marked.parse(md), SANITIZE_OPTS).trim();
}

export function renderInlineMarkdown(md) {
  if (!md || md.trim() === '') return '';
  return sanitizeHtml(marked.parseInline(md), SANITIZE_OPTS).trim();
}

export function renderBilingualBody(body) {
  const { en, zh } = splitBodySections(body);
  return { en: renderMarkdown(en), zh: renderMarkdown(zh) };
}

// string-or-{en,zh} of markdown → {en, zh} of inline HTML (or null when absent).
function bilingualInlineHtml(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    const html = renderInlineMarkdown(value);
    return { en: html, zh: html };
  }
  const en = value.en ?? value.zh;
  const zh = value.zh ?? value.en;
  return { en: renderInlineMarkdown(en), zh: renderInlineMarkdown(zh) };
}

export function meetupToJson({ id, data, content, defaults }) {
  const timezone = data.timezone ?? defaults.timezone;
  const startTime = data.startTime ?? defaults.startTime;
  const endTime = data.endTime ?? defaults.endTime;
  return {
    id,
    date: data.date,
    timezone,
    start: zonedTimeToInstant(data.date, startTime, timezone),
    end: zonedTimeToInstant(data.date, endTime, timezone),
    segments: (data.segments ?? []).map((seg) => ({
      type: seg.type,
      title: seg.title,
      speaker: seg.speaker ?? '',
      speakerBioHtml: bilingualInlineHtml(seg.speakerBio),
      materialsUrl: seg.materialsUrl ?? '',
    })),
    attendees: data.attendees ?? null,
    bodyHtml: renderBilingualBody(content),
  };
}

// Compact card data: enough to render the featured card and coming-up strip
// without fetching detail files (spec §1.5).
export function meetupIndexEntry(meetupJson) {
  const { id, date, timezone, start, end, attendees } = meetupJson;
  return {
    id,
    date,
    timezone, // cards format times from the index — must be PT-first, never viewer-local (spec §2.2)
    start,
    end,
    attendees,
    segments: meetupJson.segments.map(({ type, title, speaker }) => ({ type, title, speaker })),
  };
}

export function moderatorToJson({ id, data, content }) {
  return {
    id,
    name: data.name,
    bio: data.bio,
    avatar: data.avatar ?? 'default.png',
    links: (data.links ?? []).map(({ label, url }) => ({ label, url })),
    bodyHtml: renderBilingualBody(content),
  };
}

export function communityToJson({ data, content }) {
  return {
    tagline: data.tagline,
    schedule: data.schedule,
    ctas: data.ctas.map(({ id, label, href }) => ({ id, label, href: href ?? '' })),
    bodyHtml: renderBilingualBody(content),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/emit.mjs scripts/test/emit.test.mjs
git commit -m "feat: emit sanitized JSON shapes with resolved instants"
```

## Task 7: `build-data.mjs` orchestrator + fixture integration tests

Walks `data/`, skips `_*.md`, validates everything (all errors reported at once, nothing emitted on failure), then emits `dist/data/`. Includes the golden + bad fixture suites (spec §3.5).

**Files:**
- Create: `scripts/build-data.mjs`
- Create: `scripts/test/fixtures/golden/**` and `scripts/test/fixtures/bad/**`
- Test: `scripts/test/build-data.test.mjs`

- [ ] **Step 1: Create the golden fixture tree**

Create `scripts/test/fixtures/golden/community.md`:

```markdown
---
tagline:
  en: "Show off your AI work"
  zh: "用你的 AI 作品展風神"
schedule:
  timezone: America/Los_Angeles
  startTime: "18:00"
  endTime: "19:30"
ctas:
  - id: speak
    label: { en: "Sign up to speak", zh: "報名分享" }
    href: ""
---
## en
Golden community intro.

## zh
黃金社群介紹。
```

Create `scripts/test/fixtures/golden/meetups/2026-01-13-winter-talk.md` (January = PST, pairs with the July file to prove DST-correct resolution):

```markdown
---
date: 2026-01-13
segments:
  - type: talk
    title: "Winter talk"
    speaker: Alice
    speakerBio: "Builds things — [site](https://alice.example)."
---
```

Create `scripts/test/fixtures/golden/meetups/2026-07-14-summer-talk.md` (July = PDT; also proves the startTime override):

```markdown
---
date: 2026-07-14
startTime: "19:00"
segments:
  - type: chat
    title: { en: "Open chat", zh: "自由聊" }
---
```

Create `scripts/test/fixtures/golden/meetups/_template.md` (deliberately invalid — proves `_*.md` files are skipped):

```markdown
---
date: not-a-date
---
```

Create `scripts/test/fixtures/golden/moderators/alice.md`:

```markdown
---
name: Alice
bio: "Golden moderator."
avatar: alice.png
links:
  - label: { en: "Site", zh: "網站" }
    url: "https://alice.example"
---
## en
Longer intro with a <script>alert(1)</script> injection attempt.
```

Create the fixture avatars (a known-good 68-byte 1×1 transparent PNG):

```bash
mkdir -p scripts/test/fixtures/golden/moderators/avatars
base64 -d > scripts/test/fixtures/golden/moderators/avatars/default.png <<'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=
EOF
cp scripts/test/fixtures/golden/moderators/avatars/default.png \
   scripts/test/fixtures/golden/moderators/avatars/alice.png
file scripts/test/fixtures/golden/moderators/avatars/default.png
```

Expected `file` output: `PNG image data, 1 x 1, ...`. If it isn't a valid PNG, stop and regenerate.

- [ ] **Step 2: Create the bad fixture tree**

Create `scripts/test/fixtures/bad/community.md` — **valid** (same content as the golden `community.md`), so every error is attributable to the intentionally broken files.

Create `scripts/test/fixtures/bad/meetups/2026-07-14-broken.md`:

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
  - type: talk
    title: "Bad link"
    speaker: Eve
    materialsUrl: "javascript:alert(1)"
attendees: 2.5
---
```

Create `scripts/test/fixtures/bad/meetups/2026-07-21.md` (valid schema, privacy violation in the body):

```markdown
---
date: 2026-07-21
segments: []
---
Contact me at eve@example.com to speak!
```

Create `scripts/test/fixtures/bad/meetups/2026-08-04-bad-date.md` (malformed date — spec §3.5 lists it as a fixture case):

```markdown
---
date: "2026-99-99"
segments: []
---
```

Create `scripts/test/fixtures/bad/moderators/bob.md` (missing avatar file — the bad fixture has **no** avatars dir at all, which also exercises the missing-`default.png` check):

```markdown
---
name: Bob
bio: "Bob."
avatar: bob.png
links:
  - label: Site
    url: "ftp://bob.example"
---
```

- [ ] **Step 3: Write the failing integration tests**

```js
// scripts/test/build-data.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from '../build-data.mjs';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'aitian-build-'));

test('golden fixture validates and emits the expected shapes', () => {
  const out = tmp();
  const { errors } = buildData({ dataDir: path.join(FIXTURES, 'golden'), outDir: out });
  assert.deepEqual(errors, []);

  const index = JSON.parse(fs.readFileSync(path.join(out, 'data/meetups/index.json'), 'utf8'));
  assert.equal(index.length, 2); // _template.md skipped
  assert.equal(index[0].id, '2026-01-13-winter-talk'); // date-sorted ascending
  assert.equal(index[0].timezone, 'America/Los_Angeles'); // cards format PT-first from the index
  assert.equal(index[0].start, '2026-01-14T02:00:00.000Z'); // PST (UTC-8)
  assert.equal(index[1].start, '2026-07-15T02:00:00.000Z'); // PDT (UTC-7) + 19:00 override
  assert.equal(index[0].segments[0].speaker, 'Alice'); // segment summary present
  assert.ok(!('speakerBioHtml' in index[0].segments[0])); // …but compact

  const winter = JSON.parse(
    fs.readFileSync(path.join(out, 'data/meetups/2026-01-13-winter-talk.json'), 'utf8'),
  );
  assert.match(winter.segments[0].speakerBioHtml.en, /<a href="https:\/\/alice\.example">/);

  const modIndex = JSON.parse(
    fs.readFileSync(path.join(out, 'data/moderators/index.json'), 'utf8'),
  );
  assert.equal(modIndex[0].id, 'alice');
  assert.ok(!('bodyHtml' in modIndex[0])); // card data only

  const alice = JSON.parse(fs.readFileSync(path.join(out, 'data/moderators/alice.json'), 'utf8'));
  assert.ok(!alice.bodyHtml.en.includes('script')); // sanitized at build

  const community = JSON.parse(fs.readFileSync(path.join(out, 'data/community.json'), 'utf8'));
  assert.match(community.bodyHtml.zh, /黃金社群介紹/);

  assert.ok(fs.existsSync(path.join(out, 'data/moderators/avatars/default.png')));
  assert.ok(fs.existsSync(path.join(out, 'data/moderators/avatars/alice.png')));
});

test('bad fixture fails with every expected message and emits nothing', () => {
  const out = tmp();
  const { errors } = buildData({ dataDir: path.join(FIXTURES, 'bad'), outDir: out });
  const all = errors.join('\n');
  const needles = [
    'filename is the id',                       // frontmatter id
    'unknown field "location"',                 // strict fields
    '"talk" or "chat"',                         // bad segment type
    'speaker: required for talk',               // missing speaker
    'must start with http',                     // javascript: URL
    'YYYY-MM-DD',                               // malformed date
    'integer',                                  // attendees 2.5
    'not found in data/moderators/avatars',     // bob.png missing
    'default.png',                              // fallback avatar missing
    'email-shaped',                             // privacy lint
    'links[0].url',                             // ftp:// link
  ];
  for (const needle of needles) {
    assert.ok(all.includes(needle), `expected an error containing: ${needle}\ngot:\n${all}`);
  }
  // Every error names its file.
  assert.match(all, /meetups\/2026-07-14-broken\.md/);
  assert.match(all, /meetups\/2026-07-21\.md/);
  assert.match(all, /moderators\/bob\.md/);
  // Nothing was emitted.
  assert.ok(!fs.existsSync(path.join(out, 'data')));
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm test
```

Expected: FAIL — cannot find `../build-data.mjs`.

- [ ] **Step 5: Implement `scripts/build-data.mjs`**

```js
#!/usr/bin/env node
// Parse + validate + emit (spec §1.5). Validates EVERYTHING first and reports
// all errors at once (contributors shouldn't play whack-a-mole in CI); emits
// only when the whole data/ tree is clean.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  validateMeetup,
  validateModerator,
  validateCommunity,
  privacyLintErrors,
} from './lib/validate.mjs';
import {
  meetupToJson,
  meetupIndexEntry,
  moderatorToJson,
  communityToJson,
} from './lib/emit.mjs';

// CORE_SCHEMA (YAML 1.2) keeps `date: 2026-07-14` and `startTime: 18:00` as
// plain strings — js-yaml's default schema would turn the former into a JS
// Date object and the latter (YAML 1.1 sexagesimal) into the number 1080.
const MATTER_OPTS = {
  engines: { yaml: { parse: (s) => yaml.load(s, { schema: yaml.CORE_SCHEMA }) } },
};

function readEntry(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw, MATTER_OPTS);
  return { raw, data: data ?? {}, content };
}

// _*.md files are templates: skipped by validation and emission (spec §1.1).
function listDataFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();
}

export function buildData({ dataDir, outDir }) {
  const errors = [];
  const addErrors = (rel, errs) => errors.push(...errs.map((e) => `${rel}: ${e}`));

  // ---- read + validate everything ----
  const communityPath = path.join(dataDir, 'community.md');
  let community = null;
  if (!fs.existsSync(communityPath)) {
    errors.push('community.md: missing (required)');
  } else {
    community = readEntry(communityPath);
    addErrors('community.md', validateCommunity({ data: community.data }));
    addErrors('community.md', privacyLintErrors(community.raw));
  }

  const avatarsDir = path.join(dataDir, 'moderators', 'avatars');
  const avatarFiles = fs.existsSync(avatarsDir)
    ? fs.readdirSync(avatarsDir).filter((f) => !f.startsWith('.'))
    : [];
  if (!avatarFiles.includes('default.png')) {
    errors.push('moderators/avatars/default.png: missing (required fallback avatar)');
  }

  const meetups = listDataFiles(path.join(dataDir, 'meetups')).map((filename) => {
    const entry = readEntry(path.join(dataDir, 'meetups', filename));
    addErrors(`meetups/${filename}`, validateMeetup({ filename, data: entry.data }));
    addErrors(`meetups/${filename}`, privacyLintErrors(entry.raw));
    return { filename, ...entry };
  });

  const moderators = listDataFiles(path.join(dataDir, 'moderators')).map((filename) => {
    const entry = readEntry(path.join(dataDir, 'moderators', filename));
    addErrors(
      `moderators/${filename}`,
      validateModerator({ filename, data: entry.data, avatarFiles }),
    );
    addErrors(`moderators/${filename}`, privacyLintErrors(entry.raw));
    return { filename, ...entry };
  });

  if (errors.length > 0) return { errors };

  // ---- emit ----
  const defaults = community.data.schedule;
  const dataOut = path.join(outDir, 'data');
  fs.rmSync(dataOut, { recursive: true, force: true });
  fs.mkdirSync(path.join(dataOut, 'meetups'), { recursive: true });
  fs.mkdirSync(path.join(dataOut, 'moderators'), { recursive: true });

  const meetupJsons = meetups.map(({ filename, data, content }) =>
    meetupToJson({ id: filename.replace(/\.md$/, ''), data, content, defaults }),
  );
  meetupJsons.sort((a, b) => a.start.localeCompare(b.start)); // ISO strings sort chronologically
  for (const m of meetupJsons) {
    fs.writeFileSync(path.join(dataOut, 'meetups', `${m.id}.json`), JSON.stringify(m, null, 2));
  }
  fs.writeFileSync(
    path.join(dataOut, 'meetups', 'index.json'),
    JSON.stringify(meetupJsons.map(meetupIndexEntry), null, 2),
  );

  const moderatorJsons = moderators.map(({ filename, data, content }) =>
    moderatorToJson({ id: filename.replace(/\.md$/, ''), data, content }),
  );
  moderatorJsons.sort((a, b) => a.id.localeCompare(b.id));
  for (const m of moderatorJsons) {
    fs.writeFileSync(path.join(dataOut, 'moderators', `${m.id}.json`), JSON.stringify(m, null, 2));
  }
  fs.writeFileSync(
    path.join(dataOut, 'moderators', 'index.json'),
    JSON.stringify(moderatorJsons.map(({ bodyHtml, ...card }) => card), null, 2),
  );

  fs.writeFileSync(
    path.join(dataOut, 'community.json'),
    JSON.stringify(communityToJson({ data: community.data, content: community.content }), null, 2),
  );

  fs.cpSync(avatarsDir, path.join(dataOut, 'moderators', 'avatars'), {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.'),
  });

  return { errors: [] };
}

// CLI entry: `node scripts/build-data.mjs` from the repo root.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors } = buildData({ dataDir: 'data', outDir: 'dist' });
  if (errors.length > 0) {
    console.error(`✗ data validation failed (${errors.length} error${errors.length === 1 ? '' : 's'}):\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log('✓ data validated and emitted to dist/data/');
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS (all suites).

- [ ] **Step 7: Commit**

```bash
git add scripts/build-data.mjs scripts/test/build-data.test.mjs scripts/test/fixtures
git commit -m "feat: build-data CLI - validate all, emit dist/data, fixture coverage"
```

## Task 8: Seed `data/` — community, 8 Tuesdays, moderators, templates

Real content per spec §1.1. Dates are the 8 scheduled **PT Tuesdays** 7/14–9/1 (kickstart §4d). Only 7/14 is booked in the public docs; the rest seed as TBA — SansWord back-fills booked weeks from the private sheet by **editing** (never renaming) these files.

**Files:**
- Create: `data/community.md`
- Create: `data/meetups/_template.md`, `data/meetups/2026-07-14-ai-role-play.md`, `data/meetups/2026-07-21.md` … `data/meetups/2026-09-01.md` (7 TBA files)
- Create: `data/moderators/_template.md`, `data/moderators/sansword.md`, `data/moderators/pinku.md`
- Create: `data/moderators/avatars/default.png`

- [ ] **Step 1: Write `data/community.md`**

(Intro copy is placeholder-quality — flagged for review in `docs/wording.md`, Task 15.)

```markdown
---
tagline:
  en: "Show off your AI work"
  zh: "用你的 AI 作品展風神"
schedule:
  timezone: America/Los_Angeles
  startTime: "18:00"
  endTime: "19:30"
ctas:
  - id: speak
    label: { en: "Sign up to speak", zh: "報名分享" }
    href: ""
  - id: join
    label: { en: "Get invite link", zh: "取得邀請連結" }
    href: ""
---
## en
AI展 (aitian) is a weekly online meetup where members — aitians — demo what they're building
with AI: side projects, workflows, experiments. Every Tuesday evening (US Pacific time), two
short talks and an open chat.

## zh
AI展（aitian）是每週一次的線上聚會，成員（aitians）在這裡展示自己用 AI 打造的作品：
side project、工作流程、實驗都歡迎。每週二晚上（美國太平洋時間）兩場短講加一場自由聊。
```

- [ ] **Step 2: Write `data/meetups/_template.md`**

```markdown
---
# Copy this file to YYYY-MM-DD.md (TBA week) or YYYY-MM-DD-short-slug.md (booked),
# where the date is the meetup's PT calendar date.
# NEVER rename a file once it has deployed — the filename is the citable URL.
date: 2026-01-01
# startTime: "18:00"             # optional — defaults come from data/community.md
# endTime: "19:30"               # optional
# timezone: America/Los_Angeles  # optional; IANA name
segments: []
# A booked week looks like:
# segments:
#   - type: talk                 # talk | chat
#     title: "My talk title"     # or { en: "...", zh: "..." }
#     speaker: YourName          # display name only — NEVER emails or contact info
#     speakerBio: ""             # optional; 1-2 sentences, markdown links OK (http(s) only)
#     materialsUrl: ""           # optional; http(s) link to slides/demo
attendees: null                  # back-fill after the event (integer)
---

Optional meetup intro (markdown). Use "## en" / "## zh" headings for bilingual content.
```

- [ ] **Step 3: Write `data/meetups/2026-07-14-ai-role-play.md`** (content from kickstart §4b — real booked talks)

```markdown
---
date: 2026-07-14
segments:
  - type: talk
    title: "辦公室生存遊戲：AI Role Play 模擬器設計分享"
    speaker: Claire
    materialsUrl: "https://hooli-survival.vercel.app/"
  - type: talk
    title: "Sans-Schema: semantic API gateway"
    speaker: SansWord
  - type: chat
    title: "你的 dev workflow with AI setup 是什麼？資料夾結構長怎樣？"
---
```

- [ ] **Step 4: Write the 7 TBA files**

```bash
for d in 2026-07-21 2026-07-28 2026-08-04 2026-08-11 2026-08-18 2026-08-25 2026-09-01; do
  printf -- '---\ndate: %s\nsegments: []\n---\n' "$d" > "data/meetups/$d.md"
done
ls data/meetups/
```

Expected: `_template.md`, `2026-07-14-ai-role-play.md`, and the 7 bare-date files.

- [ ] **Step 5: Write `data/moderators/_template.md`**

```markdown
---
# Copy this file to your-handle.md (lowercase slug — the filename is your id/URL).
# PR-ing your own entry IS the consent to publish it (docs/data-schema.md).
name: YourName
bio:                    # short one-liner for the grid card; plain string or {en, zh}
  en: "What you do."
  zh: "你在做什麼。"
# avatar: you.png       # optional; bare filename in data/moderators/avatars/ (omit → default.png)
# links:                # optional; any networks/portfolio you want public
#   - label: LinkedIn
#     url: "https://..."
---

Optional longer intro (markdown). Use "## en" / "## zh" headings for bilingual content.
```

- [ ] **Step 6: Write the two moderator files**

`data/moderators/sansword.md` (bios are placeholder copy — review flagged in wording.md):

```markdown
---
name: SansWord
bio:
  en: "Founder & organizer. Builds AI-powered tools."
  zh: "創辦人與主辦，打造 AI 應用工具。"
---
```

`data/moderators/pinku.md`:

```markdown
---
name: pinku
bio:
  en: "Co-organizer. Product & design."
  zh: "共同主辦：產品與設計。"
---
```

(No `avatar:` field — both fall back to `default.png`. Real photos are a human follow-up in todo.)

- [ ] **Step 7: Create `data/moderators/avatars/default.png`**

```bash
mkdir -p data/moderators/avatars
cp scripts/test/fixtures/golden/moderators/avatars/default.png data/moderators/avatars/default.png
file data/moderators/avatars/default.png
```

Expected: `PNG image data, 1 x 1, ...` (the CSS avatar circle provides the visible placeholder; the PNG just has to exist and be valid).

- [ ] **Step 8: Run the real build and verify**

```bash
node scripts/build-data.mjs
cat dist/data/meetups/index.json | head -30
```

Expected: `✓ data validated and emitted to dist/data/`; index has 8 entries, first id `2026-07-14-ai-role-play` with `"start": "2026-07-15T01:00:00.000Z"` (6 PM PDT).

- [ ] **Step 9: Commit**

```bash
git add data/
git commit -m "feat: seed data - community copy, 8 PT Tuesdays (7/14 booked), moderators"
```

## Task 9: CI — build+validate on PRs, deploy `dist/` on push

Spec §3.2/§3.3: two jobs; PR runs get read-only permissions and never touch the deploy pipeline; Pages now serves `dist` instead of `site`.

**Files:**
- Modify: `.github/workflows/deploy.yml` (full rewrite)

- [ ] **Step 1: Rewrite `.github/workflows/deploy.yml`**

```yaml
name: Build & deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

# Read-only by default — PR validate runs never get more than this.
# The deploy job declares its own write permissions below.
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      # Validates data/ (the contributor PR gate) and assembles dist/.
      - run: npm run build
      # Publish ONLY dist/, never path: . — keeps CLAUDE.md, todo.md, and
      # docs/ off the served site (kickstart §4c).
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    # PR events only build + validate; publishing happens on push to main
    # (and manual dispatch).
    if: github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    # One live deploy at a time; don't cancel an in-progress publish.
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Sanity-check the YAML parses**

```bash
node -e "const yaml=require('js-yaml'),fs=require('fs');yaml.load(fs.readFileSync('.github/workflows/deploy.yml','utf8'));console.log('workflow YAML OK')"
```

Expected: `workflow YAML OK`. (Full behavior can only be verified on GitHub — the PR opened at the end of this plan is itself the test of the `pull_request` path.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: split build (PR validate) from deploy (push only), publish dist/"
```

## Task 10: Frontend shared layer — `ui-strings.json` + `site.css`

UI-chrome strings (spec §2.5 — zh copy is placeholder pending wording.md review) and the shared stylesheet (tokens extend the proven v0.2.0 hello-world palette; explicit-toggle dark theme per spec §2.6).

**Files:**
- Create: `site/ui-strings.json`
- Create: `site/site.css`

- [ ] **Step 1: Write `site/ui-strings.json`**

```json
{
  "nav.home": { "en": "Home", "zh": "首頁" },
  "nav.meetups": { "en": "Meetups", "zh": "聚會" },
  "nav.moderators": { "en": "Moderators", "zh": "主持群" },
  "landing.next": { "en": "Next meetup", "zh": "下次聚會" },
  "landing.comingUp": { "en": "Coming up", "zh": "接下來" },
  "meetup.tba": { "en": "TBA — want to speak?", "zh": "講者徵求中——想來分享嗎？" },
  "meetup.noneScheduled": { "en": "No meetup scheduled yet — want to speak?", "zh": "目前沒有排定的聚會——想來分享嗎？" },
  "meetup.notFound": { "en": "Meetup not found.", "zh": "找不到這場聚會。" },
  "meetup.backHome": { "en": "Back to home", "zh": "回首頁" },
  "meetup.materials": { "en": "Materials", "zh": "簡報／材料" },
  "meetup.aitians": { "en": "aitians", "zh": "位 aitians" },
  "segment.talk": { "en": "Talk", "zh": "分享" },
  "segment.chat": { "en": "Chat", "zh": "自由聊" },
  "toggle.lang": { "en": "中", "zh": "EN" }
}
```

(`toggle.lang` shows the language you'd switch TO. Keys are flat strings — `t()` does a single lookup, no nesting.)

- [ ] **Step 2: Write `site/site.css`**

```css
/* Design tokens. Light is the base. Dark applies two ways — explicit toggle
   ([data-theme="dark"]) or OS preference when no explicit choice was made —
   so the two dark blocks must stay identical (spec §2.6). */
:root {
  --bg: #ffffff;
  --fg: #16161a;
  --muted: #6b7280;
  --accent: #e0344b;
  --card: #f6f6f7;
  --border: #e5e7eb;
}
:root[data-theme="dark"] {
  --bg: #0d0d10;
  --fg: #f2f2f5;
  --muted: #9ca3af;
  --accent: #ff5a6e;
  --card: #17171c;
  --border: #26262d;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d0d10;
    --fg: #f2f2f5;
    --muted: #9ca3af;
    --accent: #ff5a6e;
    --card: #17171c;
    --border: #26262d;
  }
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
  line-height: 1.6;
}
main { max-width: 46rem; margin: 0 auto; padding: 0 1.5rem 4rem; }
a { color: var(--accent); }
h2 { font-size: 1.15rem; margin: 2.5rem 0 0.75rem; }

/* --- shared header --- */
.site-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  max-width: 46rem;
  margin: 0 auto;
  padding: 1rem 1.5rem;
}
.brand { font-weight: 800; font-size: 1.35rem; text-decoration: none; color: var(--fg); }
.zhan { color: var(--accent); }
.site-header nav { display: flex; gap: 1rem; flex: 1; }
.site-header nav a { color: var(--muted); text-decoration: none; font-size: 0.95rem; }
.site-header nav a:hover { color: var(--fg); }
.toggles { display: flex; gap: 0.5rem; }
.toggles button {
  background: var(--card);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
}

/* --- typographic hero (spec §2.1: no image asset; gradient backdrop) --- */
.hero {
  text-align: center;
  padding: 3rem 1rem 2rem;
  border-radius: 0 0 2rem 2rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 9%, var(--bg)), var(--bg));
}
.wordmark {
  font-size: clamp(3rem, 12vw, 5.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}
.romanization { color: var(--muted); font-size: 1.05rem; margin: 0.25rem 0 0; letter-spacing: 0.04em; }
.tagline { font-size: 1.35rem; font-weight: 650; margin: 1.5rem 0 0; }
/* Reserved slot so a future hero image drops in without reflow (spec §2.1). */
.hero-visual { min-height: 3rem; }

.cta-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1.25rem; }
.cta {
  display: inline-block;
  border-radius: 999px;
  padding: 0.6rem 1.4rem;
  font-size: 1rem;
  font-family: inherit;
  text-decoration: none;
  background: var(--accent);
  color: #fff;
  border: none;
}
button.cta[disabled] { opacity: 0.55; cursor: not-allowed; }

/* --- meetup cards (featured + coming-up strip) --- */
.card {
  display: block;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: var(--fg);
}
.card:hover { border-color: var(--accent); }
.card-featured { padding: 1.5rem; }
.card-time { font-weight: 600; margin: 0; }
.card-time-tpe { color: var(--muted); font-size: 0.9rem; margin: 0.1rem 0 0; }
.card ul { margin: 0.6rem 0 0; padding-left: 1.2rem; }
.card li { margin: 0.15rem 0; }
.card-tba { color: var(--muted); font-style: italic; margin: 0.6rem 0 0; }
.strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.75rem; }

/* --- landing intro + meetup detail --- */
.intro { margin-top: 1.5rem; }
.meetup-intro { margin: 1rem 0; }
.detail-time { font-weight: 700; font-size: 1.25rem; margin: 1.5rem 0 0; }
.detail-time-tpe { color: var(--muted); margin: 0.15rem 0 1rem; }
.attendees { color: var(--muted); }
.segment {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}
.segment-label {
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}
.segment-title { font-size: 1.1rem; font-weight: 600; margin: 0.25rem 0; }
.segment-speaker { margin: 0; color: var(--muted); }
.segment-bio { font-size: 0.95rem; margin: 0.5rem 0 0; }
.segment-materials { display: inline-block; margin-top: 0.5rem; }
.not-found { text-align: center; padding: 3rem 0; }

/* --- moderators grid --- */
.mod-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; margin-top: 1.5rem; }
.mod-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.5rem;
  text-align: center;
}
.avatar {
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  object-fit: cover;
  background: var(--border); /* visible circle while avatars are placeholders */
}
.mod-card h3 { margin: 0.75rem 0 0.25rem; }
.mod-bio { color: var(--muted); margin: 0; }
.mod-links { display: flex; gap: 0.75rem; justify-content: center; margin: 0.75rem 0 0; }
.mod-intro { text-align: left; font-size: 0.95rem; margin-top: 0.75rem; }

.site-footer {
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
  padding: 2rem;
  border-top: 1px solid var(--border);
  margin-top: 3rem;
}
```

- [ ] **Step 3: Commit**

```bash
git add site/ui-strings.json site/site.css
git commit -m "feat: shared UI strings and stylesheet with runtime dark theme"
```

## Task 11: `site.js` core + landing page  ← end of ship-alone cutline

One shared module for all pages: theme + language state (localStorage-persisted, auto-detected defaults), `t()`/`pick()`, the single upcoming/past helper (spec §2.4), PT+Taipei time formatting (§2.2), and the landing renderer. **Replaces** the v0.2.0 hello-world `site/index.html`.

**Files:**
- Create: `site/site.js`
- Modify: `site/index.html` (full replacement)

- [ ] **Step 1: Write `site/site.js`**

```js
// Shared frontend runtime for all three pages. Each page sets
// <body data-page="..."> and this module dispatches to its renderer.
//
// Safety (spec §2.7): all data-sourced strings are inserted via textContent
// (the el() helper). The ONLY innerHTML sink is the `html:` attribute, used
// exclusively for build-sanitized HTML (bodyHtml / speakerBioHtml fields).
// URL-typed fields land in href/src — the build validator guarantees http(s).

const LANG_KEY = 'aitian.lang';
const THEME_KEY = 'aitian.theme';
const GRACE_MS = 60 * 60 * 1000; // stays "upcoming" until 1h past its end (spec §2.4)

let strings = {};
let lang = 'en';
let renderPage = () => {};

// localStorage can throw (private mode) — never fatal.
function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }

// ---------- i18n (spec §2.5) ----------
function detectLang() {
  const saved = storageGet(LANG_KEY);
  if (saved === 'en' || saved === 'zh') return saved;
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function t(key) {
  return strings[key]?.[lang] ?? key;
}

// Data fields are a plain string (serves both languages) or an {en, zh} map.
function pick(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.en ?? value.zh ?? '';
}

function applyLang() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  for (const node of document.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  document.getElementById('lang-toggle').textContent = t('toggle.lang');
  renderPage();
}

// ---------- theme (spec §2.6) ----------
function detectTheme() {
  const saved = storageGet(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------- data ----------
async function fetchJson(relPath) {
  const res = await fetch(relPath);
  if (!res.ok) throw new Error(`${relPath}: HTTP ${res.status}`);
  return res.json();
}

// The one helper behind the featured pick, the coming-up strip, and every
// upcoming/past split (spec §2.4). `index` is sorted ascending by start.
function splitMeetups(index, now = Date.now()) {
  const upcoming = index.filter((m) => Date.parse(m.end) + GRACE_MS > now);
  const past = index.filter((m) => Date.parse(m.end) + GRACE_MS <= now).reverse();
  return { featured: upcoming[0] ?? null, upcoming, past };
}

// ---------- time display (spec §2.2): Pacific first, Taipei reminder ----------
function formatMeetupTimes(m) {
  const start = new Date(m.start);
  const end = new Date(m.end);
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: m.timezone, weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: m.timezone, hour: 'numeric', minute: '2-digit', hour12: true,
  });
  let zone = '';
  for (const style of ['shortGeneric', 'short']) {
    try {
      zone = new Intl.DateTimeFormat('en-US', { timeZone: m.timezone, timeZoneName: style })
        .formatToParts(start)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
      break;
    } catch { /* older engine without shortGeneric — fall back */ }
  }
  const home = `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)} ${zone}`;
  // The Taipei reminder carries its own weekday — Tuesday evening PT is
  // Wednesday morning in Taipei (spec §2.2).
  const tpeDay = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', weekday: 'short' })
    .format(start);
  const tpeTime = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const taipei = `台北時間${tpeDay} ${tpeTime.format(start)} – ${tpeTime.format(end)}`;
  return { home, taipei };
}

// ---------- DOM helper ----------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // build-sanitized HTML ONLY
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

// Segment lines for cards: "Talk 1: title — speaker". Unknown types render
// generically by their raw type so future enum additions degrade gracefully
// (spec §1.2).
function segmentLabel(seg, talkNumber) {
  if (seg.type === 'talk') return `${t('segment.talk')} ${talkNumber}`;
  if (seg.type === 'chat') return t('segment.chat');
  return seg.type;
}

function segmentListItems(segments) {
  let talkN = 0;
  return segments.map((seg) => {
    if (seg.type === 'talk') talkN += 1;
    const speaker = seg.speaker ? ` — ${seg.speaker}` : '';
    return el('li', { text: `${segmentLabel(seg, talkN)}: ${pick(seg.title)}${speaker}` });
  });
}

function meetupCard(m, { featured = false } = {}) {
  const { home, taipei } = formatMeetupTimes(m);
  const tba = m.segments.length === 0;
  // TBA weeks link the speaker CTA; booked weeks link their detail page (§2.1).
  const card = el('a', {
    class: featured ? 'card card-featured' : 'card',
    href: tba ? './index.html#cta' : `./meetup.html#${m.id}`,
  });
  card.append(el('p', { class: 'card-time', text: home }));
  card.append(el('p', { class: 'card-time-tpe', text: taipei }));
  if (tba) card.append(el('p', { class: 'card-tba', text: t('meetup.tba') }));
  else card.append(el('ul', {}, segmentListItems(m.segments)));
  return card;
}

function noneScheduledCard() {
  return el('a', { class: 'card card-featured', href: './index.html#cta' }, [
    el('p', { class: 'card-tba', text: t('meetup.noneScheduled') }),
  ]);
}

// ---------- landing ----------
let landingData = null;

async function initLanding() {
  const [community, meetupIndex] = await Promise.all([
    fetchJson('./data/community.json'),
    fetchJson('./data/meetups/index.json'),
  ]);
  landingData = { community, meetupIndex };
  renderPage = renderLanding;
  renderPage();
}

function renderLanding() {
  const { community, meetupIndex } = landingData;
  document.getElementById('tagline').textContent = pick(community.tagline);

  document.getElementById('cta').replaceChildren(
    ...community.ctas.map((cta) =>
      cta.href
        ? el('a', { class: 'cta', href: cta.href, text: pick(cta.label) })
        : el('button', { class: 'cta', type: 'button', disabled: '', text: pick(cta.label) }),
    ),
  );

  document.getElementById('intro').innerHTML = community.bodyHtml[lang] || '';

  const { featured, upcoming } = splitMeetups(meetupIndex);
  document.getElementById('featured').replaceChildren(
    el('h2', { text: t('landing.next') }),
    featured ? meetupCard(featured, { featured: true }) : noneScheduledCard(),
  );

  const rest = upcoming.slice(1, 4); // the following 3 Tuesdays (§2.1)
  document.getElementById('coming-up').replaceChildren(
    ...(rest.length
      ? [el('h2', { text: t('landing.comingUp') }), el('div', { class: 'strip' }, rest.map((m) => meetupCard(m)))]
      : []),
  );
}

// ---------- meetup detail (filled in by the meetup.html task) ----------
let meetupIndexCache = null;

async function initMeetup() {
  meetupIndexCache = await fetchJson('./data/meetups/index.json');
  renderPage = () => { renderMeetupFromHash(); };
  window.addEventListener('hashchange', () => renderPage());
  renderPage();
}

async function renderMeetupFromHash() {
  const container = document.getElementById('meetup');
  const hash = decodeURIComponent(location.hash.slice(1));
  const { featured, past } = splitMeetups(meetupIndexCache);

  if (hash && !meetupIndexCache.some((m) => m.id === hash)) {
    container.replaceChildren(
      el('div', { class: 'not-found' }, [
        el('p', { text: t('meetup.notFound') }),
        el('a', { href: './index.html', text: t('meetup.backHome') }),
      ]),
    );
    return;
  }

  // No hash → next upcoming; schedule exhausted → most recent past (§2.4).
  const id = hash || featured?.id || past[0]?.id;
  if (!id) {
    container.replaceChildren(noneScheduledCard());
    return;
  }

  const m = await fetchJson(`./data/meetups/${id}.json`);
  const { home, taipei } = formatMeetupTimes(m);
  const kids = [
    el('p', { class: 'detail-time', text: home }),
    el('p', { class: 'detail-time-tpe', text: taipei }),
  ];
  if (Number.isInteger(m.attendees)) {
    kids.push(el('p', { class: 'attendees', text: `👥 ${m.attendees} ${t('meetup.aitians')}` }));
  }
  if (m.bodyHtml?.[lang]) kids.push(el('div', { class: 'meetup-intro', html: m.bodyHtml[lang] }));

  if (m.segments.length === 0) {
    kids.push(el('a', { class: 'card', href: './index.html#cta' }, [
      el('p', { class: 'card-tba', text: t('meetup.tba') }),
    ]));
  } else {
    let talkN = 0;
    for (const seg of m.segments) {
      if (seg.type === 'talk') talkN += 1;
      const sec = el('section', { class: 'segment' });
      sec.append(el('h3', { class: 'segment-label', text: segmentLabel(seg, talkN) }));
      sec.append(el('p', { class: 'segment-title', text: pick(seg.title) }));
      if (seg.speaker) sec.append(el('p', { class: 'segment-speaker', text: seg.speaker }));
      if (seg.speakerBioHtml?.[lang]) {
        sec.append(el('p', { class: 'segment-bio', html: seg.speakerBioHtml[lang] }));
      }
      if (seg.materialsUrl) {
        sec.append(el('a', {
          class: 'segment-materials',
          href: seg.materialsUrl,
          target: '_blank',
          rel: 'noopener',
          text: t('meetup.materials'),
        }));
      }
      kids.push(sec);
    }
  }
  container.replaceChildren(...kids);
}

// ---------- moderators (filled in by the moderators.html task) ----------
let moderatorsData = null;

async function initModerators() {
  const index = await fetchJson('./data/moderators/index.json');
  moderatorsData = await Promise.all(index.map((m) => fetchJson(`./data/moderators/${m.id}.json`)));
  renderPage = renderModerators;
  renderPage();
}

function renderModerators() {
  document.getElementById('moderators').replaceChildren(
    ...moderatorsData.map((mod) => {
      const card = el('article', { class: 'mod-card' });
      card.append(el('img', {
        class: 'avatar',
        src: `./data/moderators/avatars/${mod.avatar}`,
        alt: mod.name,
        width: '96',
        height: '96',
      }));
      card.append(el('h3', { text: mod.name }));
      card.append(el('p', { class: 'mod-bio', text: pick(mod.bio) }));
      if (mod.links.length > 0) {
        card.append(el('p', { class: 'mod-links' },
          mod.links.map((l) => el('a', {
            href: l.url, target: '_blank', rel: 'me noopener', text: pick(l.label),
          })),
        ));
      }
      if (mod.bodyHtml?.[lang]) card.append(el('div', { class: 'mod-intro', html: mod.bodyHtml[lang] }));
      return card;
    }),
  );
}

// ---------- boot ----------
async function main() {
  document.documentElement.dataset.theme = detectTheme();
  lang = detectLang();
  strings = await fetchJson('./ui-strings.json');
  applyLang(); // static labels first — page data may still be loading

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storageSet(THEME_KEY, next);
  });
  document.getElementById('lang-toggle').addEventListener('click', () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    storageSet(LANG_KEY, lang);
    applyLang(); // re-renders the page in the new language
  });

  const page = document.body.dataset.page;
  if (page === 'landing') await initLanding();
  else if (page === 'meetup') await initMeetup();
  else if (page === 'moderators') await initModerators();
}

main();
```

- [ ] **Step 2: Replace `site/index.html`**

(The v0.2.0 hello-world page is superseded — it lives on in git history.)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI展 (aitian) — AI Demo Meetup</title>
  <meta name="description" content="AI展 (aitian) — a weekly meetup community for showing off AI work." />
  <script>
    // Apply a saved theme before first paint to avoid a flash.
    try { var t = localStorage.getItem('aitian.theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
  <link rel="stylesheet" href="./site.css" />
</head>
<body data-page="landing">
  <header class="site-header">
    <a class="brand" href="./index.html">AI<span class="zhan">展</span></a>
    <nav>
      <a href="./index.html" data-i18n="nav.home"></a>
      <a href="./meetup.html" data-i18n="nav.meetups"></a>
      <a href="./moderators.html" data-i18n="nav.moderators"></a>
    </nav>
    <div class="toggles">
      <button id="lang-toggle" type="button" aria-label="Switch language">中</button>
      <button id="theme-toggle" type="button" aria-label="Switch theme">◐</button>
    </div>
  </header>
  <main>
    <section class="hero">
      <h1 class="wordmark">AI<span class="zhan">展</span></h1>
      <p class="romanization">aitian · <em>Ài-Tián</em></p>
      <p class="tagline" id="tagline"></p>
      <div id="cta" class="cta-row"></div>
      <div class="hero-visual" aria-hidden="true"></div>
    </section>
    <section id="intro" class="intro"></section>
    <section id="featured"></section>
    <section id="coming-up"></section>
  </main>
  <footer class="site-footer"><p>AI展 (aitian)</p></footer>
  <noscript><p style="text-align:center">This site needs JavaScript to show the meetup schedule.</p></noscript>
  <script type="module" src="./site.js"></script>
</body>
</html>
```

- [ ] **Step 3: Build and smoke-test the landing page**

```bash
npm run build
python3 -m http.server 8788 --directory dist
```

Open `http://localhost:8788/` and verify:
- Hero shows wordmark + tagline ("Show off your AI work" in en), two **disabled** placeholder CTA buttons.
- "Next meetup" shows the 7/14 card: `Tue, Jul 14 · 6:00 PM – 7:30 PM PT`, Taipei line says **週三** (Wednesday!) `上午9:00`, three segment lines (Talk 1 Claire / Talk 2 SansWord / Chat).
- "Coming up" shows 3 TBA cards linking to `#cta`.
- 中 toggle: tagline flips to 「用你的 AI 作品展風神」, labels flip, persists across reload.
- ◐ toggle: dark/light flips and persists; OS-preference default respected in a fresh private window.

Stop the server (Ctrl-C) when done.

- [ ] **Step 4: Commit**

```bash
git add site/site.js site/index.html
git commit -m "feat: landing page - hero, featured meetup, coming-up strip"
```

> **CUTLINE:** Tasks 0–11 + the doc tasks (14–16, 18) are shippable alone for the 7/14 deadline (spec §5). `meetup.html`/`moderators.html` links would 404 until Tasks 12–13 land — if cutting, remove those two nav links from `index.html` before the PR and restore them in the follow-up.

## Task 12: Meetup detail page

The renderer already lives in `site.js` (Task 11) — this task adds the page shell and smoke-tests all routes.

**Files:**
- Create: `site/meetup.html`

- [ ] **Step 1: Write `site/meetup.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI展 (aitian) — Meetup</title>
  <meta name="description" content="AI展 (aitian) meetup details — talks, speakers, and materials." />
  <script>
    try { var t = localStorage.getItem('aitian.theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
  <link rel="stylesheet" href="./site.css" />
</head>
<body data-page="meetup">
  <header class="site-header">
    <a class="brand" href="./index.html">AI<span class="zhan">展</span></a>
    <nav>
      <a href="./index.html" data-i18n="nav.home"></a>
      <a href="./meetup.html" data-i18n="nav.meetups"></a>
      <a href="./moderators.html" data-i18n="nav.moderators"></a>
    </nav>
    <div class="toggles">
      <button id="lang-toggle" type="button" aria-label="Switch language">中</button>
      <button id="theme-toggle" type="button" aria-label="Switch theme">◐</button>
    </div>
  </header>
  <main>
    <h1 data-i18n="nav.meetups"></h1>
    <div id="meetup"></div>
  </main>
  <footer class="site-footer"><p>AI展 (aitian)</p></footer>
  <noscript><p style="text-align:center">This site needs JavaScript to show the meetup schedule.</p></noscript>
  <script type="module" src="./site.js"></script>
</body>
</html>
```

- [ ] **Step 2: Build and smoke-test every route (spec §3.5)**

```bash
npm run build
python3 -m http.server 8788 --directory dist
```

Verify:
- `http://localhost:8788/meetup.html` (no hash) → renders the 7/14 meetup (next upcoming).
- `http://localhost:8788/meetup.html#2026-07-14-ai-role-play` → same meetup; segment cards show "Talk 1"/"Talk 2"/"Chat" labels (translated when 中 active), titles, speakers, Claire's materials link.
- `http://localhost:8788/meetup.html#2026-07-21` → TBA card linking to the landing CTA.
- `http://localhost:8788/meetup.html#nope` → friendly not-found + back link.
- Attendees badge does NOT render anywhere (all null). Then edit `data/meetups/2026-07-14-ai-role-play.md` to `attendees: 12`, rebuild, confirm "👥 12 aitians" renders — then **revert the edit and rebuild**.
- Times: `6:00 PM – 7:30 PM PT` and `台北時間週三 上午9:00 – 上午10:30`.

Stop the server when done.

- [ ] **Step 3: Commit**

```bash
git add site/meetup.html
git commit -m "feat: hash-routed meetup detail page"
```

## Task 13: Moderators page

**Files:**
- Create: `site/moderators.html`

- [ ] **Step 1: Write `site/moderators.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI展 (aitian) — Moderators</title>
  <meta name="description" content="The people who host AI展 (aitian) meetups." />
  <script>
    try { var t = localStorage.getItem('aitian.theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  </script>
  <link rel="stylesheet" href="./site.css" />
</head>
<body data-page="moderators">
  <header class="site-header">
    <a class="brand" href="./index.html">AI<span class="zhan">展</span></a>
    <nav>
      <a href="./index.html" data-i18n="nav.home"></a>
      <a href="./meetup.html" data-i18n="nav.meetups"></a>
      <a href="./moderators.html" data-i18n="nav.moderators"></a>
    </nav>
    <div class="toggles">
      <button id="lang-toggle" type="button" aria-label="Switch language">中</button>
      <button id="theme-toggle" type="button" aria-label="Switch theme">◐</button>
    </div>
  </header>
  <main>
    <h1 data-i18n="nav.moderators"></h1>
    <div id="moderators" class="mod-grid"></div>
  </main>
  <footer class="site-footer"><p>AI展 (aitian)</p></footer>
  <noscript><p style="text-align:center">This site needs JavaScript to show the moderators.</p></noscript>
  <script type="module" src="./site.js"></script>
</body>
</html>
```

- [ ] **Step 2: Build and smoke-test**

```bash
npm run build
python3 -m http.server 8788 --directory dist
```

Verify at `http://localhost:8788/moderators.html`: two cards (pinku, SansWord — alphabetical by id), circular placeholder avatars, names, bios in the active language (flip 中/EN), no links row (none seeded), no longer-intro block (no bodies seeded).

Stop the server when done.

- [ ] **Step 3: Commit**

```bash
git add site/moderators.html
git commit -m "feat: moderators grid page"
```

## Task 14: `docs/data-schema.md` — the maintained contract doc

Spec §1.4/§3.4: the schema reference + evolution rules + consent policy, written where contributors read. This is a **maintained** doc — it must match the validator exactly.

**Files:**
- Create: `docs/data-schema.md`

- [ ] **Step 1: Write `docs/data-schema.md`**

```markdown
# Data schema — the `data/` contract

The files under `data/` are this project's **stable backend**. The frontend look-and-feel may be
rewritten freely; this schema is expected to survive redesigns with few-to-zero migrations.
The generated JSON under `dist/data/` is an internal artifact — never committed, free to change.

**This doc, the validator (`scripts/build-data.mjs`), and the `_template.md` files must agree.**
Any schema change updates all three in the same PR — CI's strict validation (unknown fields are
errors) makes a lagging validator impossible to hide.

## Contributing an entry

1. Copy the `_template.md` in the right folder (`data/meetups/` or `data/moderators/`), rename it,
   fill it in, open a PR. Templates (`_*.md`) are skipped by validation and never rendered.
2. CI validates every file on your PR and lists every problem with its file and field.
3. A maintainer merges; the site redeploys automatically.

**The filename is the id and the citable URL** (`2026-07-14-ai-role-play.md` →
`meetup.html#2026-07-14-ai-role-play`). Never rename a file after it has deployed — reschedules
change the `date` field, not the filename. Don't put `id:` in frontmatter; the validator rejects it.

## Bilingual fields — one rule per shape

- **Short strings** (titles, bios, labels, taglines): either a plain string (renders for both
  languages) or an `{en, zh}` map. Either key may be omitted (at least one required); a missing
  language falls back to the one provided.
- **Prose bodies**: `## en` / `## zh` markdown sections. A body with only one section (or no
  language headings at all) renders for both languages.
- Adding a translation later is a content edit, never a schema migration.

## Meetup — `data/meetups/YYYY-MM-DD[-slug].md`

The slug is optional (use it to make the URL readable / disambiguate two events on one date);
TBA weeks use the bare date. Dates are the meetup's **US-Pacific calendar date** — a Tuesday-evening
PT meetup is Wednesday morning in Taipei and still uses the Tuesday PT date.

| Field | Required | Type | Notes |
|---|---|---|---|
| `date` | ✅ | `YYYY-MM-DD` string | calendar date in the meetup's timezone |
| `startTime` | – | `"HH:MM"` 24h string (quote it!) | overrides the `community.md` default |
| `endTime` | – | `"HH:MM"` string | overrides the default |
| `timezone` | – | IANA name | overrides the default (`America/Los_Angeles`) |
| `segments` | ✅ | list (may be `[]`) | `[]` renders as "TBA — want to speak?" |
| `segments[].type` | ✅ | `talk` \| `chat` | new types arrive as additive changes |
| `segments[].title` | ✅ | string or `{en, zh}` | |
| `segments[].speaker` | talk: ✅ | plain string | **display name only — never contact info** |
| `segments[].speakerBio` | – | string or `{en, zh}` | 1–2 sentences; markdown links OK, `http(s)://` only |
| `segments[].materialsUrl` | – | `http(s)://` URL or `""` | |
| `attendees` | – | integer ≥ 0 or `null` | back-fill after the event; hidden while null |

Body (optional): meetup-level intro, markdown, `## en` / `## zh` sections.

## Moderator — `data/moderators/<slug>.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `name` | ✅ | plain string | display name |
| `bio` | ✅ | string or `{en, zh}` | one-liner for the grid card |
| `avatar` | – | bare filename | must exist in `data/moderators/avatars/`; omitted → `default.png` |
| `links` | – | list of `{label, url}` | any networks/portfolio; `label` string or `{en, zh}`, `url` `http(s)://` |

Body (optional): longer intro, markdown, `## en` / `## zh` sections. Avatar image files live in
`data/moderators/avatars/` (owned by the data layer, so redesigns can't orphan them).

## Community — `data/community.md`

| Field | Required | Type | Notes |
|---|---|---|---|
| `tagline` | ✅ | string or `{en, zh}` | hero tagline |
| `schedule.timezone` | ✅ | IANA name | default for every meetup |
| `schedule.startTime` / `.endTime` | ✅ | `"HH:MM"` strings | defaults, per-meetup overridable |
| `ctas[].id` | ✅ | string | stable key the frontend targets (`speak`, `join`) |
| `ctas[].label` | ✅ | string or `{en, zh}` | |
| `ctas[].href` | – | `http(s)://` URL or `""` | `""` renders a disabled placeholder button |

Body: the community intro, `## en` / `## zh` sections.

## What CI rejects

Unknown fields anywhere (strict), missing required fields, malformed `date`/`startTime`/`endTime`,
unknown timezones, bad segment types, a frontmatter `id`, filename pattern violations, non-integer
`attendees`, malformed bilingual values, any URL that isn't `http(s)://` (including links inside
`speakerBio` markdown — `javascript:` URLs fail CI before they can reach a page), avatars that
aren't a bare existing filename, and **email-shaped strings anywhere in `data/`** (privacy lint).

## Privacy & consent

- **Contact info never enters this repo** (it's public). Speaker logistics (the sign-up sheet's
  contact column) stay in the private sheet. The privacy lint enforces the email case mechanically;
  the rule covers all contact info.
- **Moderators:** PR-your-own-entry **is** the consent — a profile exists only if its subject
  authored or explicitly approved the PR. The consent trail is git history.
- **Speakers:** sheet sign-up = consent for name + topic + materials link (exactly what they
  submitted to present). A one-time community-channel announcement with opt-out **must precede the
  first publication**. Removal: a PR (by the person or an organizer) deleting or redacting the
  entry, honored without question.

## Evolution rules (the contract terms)

1. **Additive-only.** New fields arrive optional-with-default. No renames, no restructures, no type
   changes to existing fields.
2. **No presentation concerns in data.** No colors, layout hints, or ordering fields beyond `date`.
3. **Bilingual-capable from day one.** Every user-facing text field accepts the string-or-map shape.
4. **Deliberate changes only.** Schema change = this doc + validator + `_template.md` in one PR.
```

- [ ] **Step 2: Cross-check the doc against the validator**

Re-read the "What CI rejects" list and Task 4/5's rule implementations side by side; they must match 1:1. Fix whichever is wrong.

- [ ] **Step 3: Commit**

```bash
git add docs/data-schema.md
git commit -m "docs: data-schema contract - schema, consent, evolution rules"
```

## Task 15: `docs/wording.md` — name lore + bilingual copy

Kickstart §0 TODO + spec §5. The maintained home for all copy so wording can be reviewed/PR'd separately from code.

**Files:**
- Create: `docs/wording.md`

- [ ] **Step 1: Write `docs/wording.md`**

```markdown
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

## CTA copy (placeholders — targets not wired yet)

| id | en | zh | Status |
|---|---|---|---|
| `speak` | Sign up to speak | 報名分享 | placeholder — finalize when the sign-up flow is chosen |
| `join` | Get invite link | 取得邀請連結 | placeholder — finalize when the invite channel is chosen |

## UI chrome strings

Live in [`site/ui-strings.json`](../site/ui-strings.json) (`{key: {en, zh}}`). The zh set is
**first-draft copy pending a native review by SansWord/pinku** — notably: 主持群 (moderators),
分享 (talk), 自由聊 (chat), 講者徵求中——想來分享嗎？ (TBA slot).

## Community intro

Lives in [`data/community.md`](../data/community.md) (`## en` / `## zh` body). Also first-draft,
pending the same review.
```

- [ ] **Step 2: Commit**

```bash
git add docs/wording.md
git commit -m "docs: wording - name lore, tagline pair, copy inventory"
```

## Task 16: Register maintained docs + refresh root `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (three edits)

- [ ] **Step 1: Register the maintained docs**

In `CLAUDE.md`, replace the line:

```markdown
- **Maintained `docs/*.md`** (source of truth; must match the code) — *none yet.* Add each here with a
  one-line description **and its update trigger** as the site is built (candidates: `docs/wording.md`
  for name/bilingual copy, `docs/architecture.md` for the build pipeline).
```

with:

```markdown
- **Maintained `docs/*.md`** (source of truth; must match the code):
  - [`docs/data-schema.md`](docs/data-schema.md) — the `data/` contract: schemas, consent, evolution
    rules. **Update trigger:** any schema change (same PR as validator + `_template.md`, per its rules).
  - [`docs/wording.md`](docs/wording.md) — name lore + all bilingual copy. **Update trigger:** any
    user-visible wording change (same PR as `site/ui-strings.json` / `data/community.md`).
```

- [ ] **Step 2: Update the stack line**

Replace:

```markdown
- **Stack:** static site (framework TBD — leaning vanilla HTML/CSS/JS). Data authored as Markdown +
  YAML frontmatter, built to JSON at deploy.
```

with:

```markdown
- **Stack:** vanilla HTML/CSS/JS under `site/`. Data authored as Markdown + YAML frontmatter under
  `data/`, validated + built to JSON at deploy by `scripts/build-data.mjs` (spec: data schema is the
  stable contract — see `docs/data-schema.md`).
```

- [ ] **Step 3: Add the two new locked decisions**

In the "Locked decisions" list, after the **Data layout** bullet, add:

```markdown
- **Framework:** vanilla HTML/CSS/JS + standalone `scripts/build-data.mjs`; no framework, no client
  runtime deps. → spec 2026-07-09 §0
- **Schema stability:** the `data/*.md` schema is additive-only; every change updates
  `docs/data-schema.md` + validator + `_template.md` in one PR. → spec 2026-07-09 §1.4
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: register data-schema + wording as maintained docs, lock framework"
```

## Task 17: Full manual smoke pass (spec §3.5)

**Files:** none (verification only; fix-up commits if anything fails)

- [ ] **Step 1: Full rebuild from clean**

```bash
rm -rf dist && npm test && npm run build
python3 -m http.server 8788 --directory dist
```

Expected: all tests pass; build succeeds.

- [ ] **Step 2: Walk the checklist**

In a regular window AND a private window (fresh localStorage):

- **Both languages:** auto-detect (private window with browser in en → en), 中/EN toggle on every page, persistence across reload and across pages.
- **Both themes:** OS default respected, ◐ toggle persists, no flash-of-wrong-theme on reload.
- **Detail routes:** no hash / valid hash / TBA hash / bad hash (per Task 12 list).
- **TBA rendering:** landing strip + detail page.
- **Attendees hidden-when-null** everywhere.
- **Relative URLs only:** `grep -rn "sansword.github.io" site/ data/ scripts/` returns nothing, and `grep -rln "aitian.dev" site/ data/ scripts/` returns only `site/CNAME` (the one legitimate home of the domain — pages must work at any origin, spec §4).
- **dist/ hygiene:** `ls dist` shows only `index.html meetup.html moderators.html site.css site.js ui-strings.json data/ CNAME` — no `CLAUDE.md`, `todo.md`, or `docs/`.

- [ ] **Step 3: Fix anything that failed, commit fixes**

Use messages like `fix: <what the smoke pass caught>`. Re-run the failed check.

## Task 18: Close the loop — devlog, todo, pre-PR scan

The end-of-session gate (root `CLAUDE.md`): docs updated **before** any PR opens.

**Files:**
- Modify: `docs/devlog.md`
- Modify: `todo.md`

- [ ] **Step 1: Add the devlog entry**

Get the timestamp: `git log -1 --format='%ad' --date=format:'%Y-%m-%d %H:%M'`. Add below the `---` under the TL;DR table (newest first), following the established format:

```markdown
## v0.3.0 — MVP: data pipeline + three pages (<timestamp>)

**Review:** not yet
**Design docs:**
- MVP Scaffold: [Spec](superpowers/specs/2026-07-09-mvp-scaffold-design.md) [Plan](superpowers/plans/2026-07-10-mvp-scaffold.md)

**What was built:**
- `data/` backend seeded: `community.md` (tagline, schedule defaults, placeholder CTAs), 8 PT
  Tuesdays (7/14 booked with the kickstart talks, 7 TBA), sansword + pinku moderator files,
  `_template.md` contributor templates, `default.png` placeholder avatar.
- `scripts/build-data.mjs` + `scripts/lib/` — strict validation (every spec §1.5 rule incl. the
  email privacy lint and `javascript:`-URL rejection) and emission of sanitized JSON with
  DST-correct ISO instants; `node:test` suites incl. golden/bad fixture integration tests.
- Three pages under `site/`: landing (typographic hero, featured meetup, coming-up strip),
  hash-routed meetup detail (PT-first times + Taipei reminder), moderators grid — one shared
  `site.js`/`site.css`/`ui-strings.json`, runtime zh/en + dark/light toggles, localStorage-persisted.
- CI split: `build` job (tests + validate + build, runs on PRs — the contributor gate) and `deploy`
  job (push/dispatch only, own write permissions); Pages now publishes `dist/`.
- New maintained docs: `docs/data-schema.md` (contract + consent) and `docs/wording.md` (name lore +
  copy inventory), registered in root `CLAUDE.md`.

**Key technical learnings:**
- `[gotcha]` js-yaml's default schema turns `date: 2026-07-14` into a JS `Date` object and unquoted
  `18:00` into the number `1080` (YAML 1.1 sexagesimal). gray-matter must be given a custom engine
  with `CORE_SCHEMA` so frontmatter scalars stay strings.
- `[insight]` Wall-clock → instant resolution needs no timezone library: `Intl.DateTimeFormat`
  `formatToParts` gives the zone offset at any instant; iterate twice to converge across DST edges.
- <add session-discovered learnings with [note]/[insight]/[gotcha] tags>

**Process learnings:**
- <add if any emerged>
```

Also add the TL;DR row (top of the table, matching anchor):

```markdown
| [v0.3.0](#v030--mvp-data-pipeline--three-pages-<anchor-suffix>) | **MVP shipped** — `data/` Markdown backend with strict CI validation, `build-data.mjs` emit pipeline, and three bilingual/theme-toggling pages (landing, hash-routed meetup detail, moderators) publishing `dist/` to Pages. |
```

(Derive `<anchor-suffix>` from the actual heading: lowercase, strip punctuation except hyphens, spaces→hyphens.)

- [ ] **Step 2: Refresh `todo.md`**

Mark done: "Write the implementation plan", "Build the MVP", "Create docs/data-schema.md + docs/wording.md", "Seed data/ from the sign-up sheet" (amend it: seeded; booked-week back-fill remains). Keep/add under **Now**:

```markdown
- [ ] **Back-fill booked weeks from the private sheet** (SansWord) — edit the seeded TBA files
      (7/21–9/1) with confirmed talks (Foucault, Charlie, Zoe, …). Edit `segments:` only — never
      rename the files. No contact info (kickstart §4d).
- [ ] **Repo settings (manual, SansWord)** — branch protection on `main` incl. no-bypass + required
      `build` check; Actions "Require approval for all outside collaborators" (spec §3.3).
- [ ] **Verify the deployed PR run** — after the MVP PR opens, confirm the `build` job runs on the
      PR and `deploy` is skipped; after merge, confirm `aitian.dev` serves the new site.
```

And under **Later**:

```markdown
- [ ] **Real avatars** — replace `default.png` placeholder usage: add `sansword.png` / `pinku.png`
      to `data/moderators/avatars/` + `avatar:` fields (photos from the humans).
- [ ] **zh copy review** — pinku/SansWord native pass over `site/ui-strings.json`, moderator bios,
      and the community intro (flagged in `docs/wording.md`).
- [ ] **Styling pass** — pinku's look-and-feel refs on the hero/section design (post-MVP, spec §5).
```

- [ ] **Step 3: Pre-PR scope + secrets/PII scan (required — public repo)**

```bash
git diff --name-only main...HEAD          # every path must be expected
git log -p main...HEAD -- data/ | grep -iE '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' ; echo "email scan exit: $?"
git log -p main...HEAD | grep -iE 'api[_-]?key|secret|token|password' ; echo "secret scan exit: $?"
```

Expected: file list contains only `package*.json`, `.gitignore`, `scripts/`, `data/`, `site/`, `.github/`, `docs/`, `CLAUDE.md`, `todo.md`. The email scan finds nothing (exit 1). The secret scan WILL hit known noise — `id-token: write` in the workflow, and possibly package names inside `package-lock.json` — that's expected; what must not appear is any actual credential value. Eyeball every hit before concluding it's noise. The CI validator also enforces the email rule, but this scan covers the whole diff.

- [ ] **Step 4: Commit the doc updates**

```bash
git add docs/devlog.md todo.md
git commit -m "docs: devlog v0.3.0 + todo refresh"
```

- [ ] **Step 5: Stop — PR is the user's call**

Report completion. Per repo convention: when the user says "ship it" / "raise a PR", push and open the PR (squash-merge target `main`) — **never merge it yourself**. Suggested PR title: `MVP: data pipeline + three pages (v0.3.0)`.

---

## Post-merge verification (user-triggered, after the PR merges)

Not a plan task — listed so it isn't lost: watch the Actions run on `main`, then check
`https://aitian.dev/` serves the landing page, `https://aitian.dev/meetup.html#2026-07-14-ai-role-play`
renders, and a test PR touching `data/` gets the `build` check. Then do the manual repo-settings task
(branch protection requiring that check; see todo).
