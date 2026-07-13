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
  assert.equal(index.length, 2); // _template.md and README.md skipped
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

  assert.ok(!fs.existsSync(path.join(out, 'data/meetups/README.json'))); // README.md never emitted
  assert.ok(!fs.existsSync(path.join(out, 'data/moderators/README.json')));
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
    'materials[0].url',                         // bad materials url pinned at this layer
    'YYYY-MM-DD',                               // malformed date
    'integer',                                  // attendees 2.5
    'not found in data/moderators/avatars',     // bob.png missing
    'default.png',                              // fallback avatar missing
    'links[0].url',                             // ftp:// link
    'not valid YAML',                           // broken frontmatter syntax
    'replaced by "materials"',                  // materialsUrl migration error
  ];
  for (const needle of needles) {
    assert.ok(all.includes(needle), `expected an error containing: ${needle}\ngot:\n${all}`);
  }
  // Every error names its file.
  assert.match(all, /meetups\/2026-07-14-broken\.md/);
  assert.match(all, /meetups\/2026-08-11-bad-yaml\.md/);
  assert.match(all, /moderators\/bob\.md/);
  // Nothing was emitted.
  assert.ok(!fs.existsSync(path.join(out, 'data')));
});

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
