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
    'not valid YAML',                           // broken frontmatter syntax
  ];
  for (const needle of needles) {
    assert.ok(all.includes(needle), `expected an error containing: ${needle}\ngot:\n${all}`);
  }
  // Every error names its file.
  assert.match(all, /meetups\/2026-07-14-broken\.md/);
  assert.match(all, /meetups\/2026-07-21\.md/);
  assert.match(all, /meetups\/2026-08-11-bad-yaml\.md/);
  assert.match(all, /moderators\/bob\.md/);
  // Nothing was emitted.
  assert.ok(!fs.existsSync(path.join(out, 'data')));
});
