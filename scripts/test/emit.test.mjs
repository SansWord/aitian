// scripts/test/emit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetupToJson, meetupIndexEntry, moderatorToJson, renderBilingualBody } from '../lib/emit.mjs';

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

test('protocol-relative links are stripped at build time', () => {
  const html = renderBilingualBody('see [x](//evil.example/phish)');
  assert.ok(!html.en.includes('//evil.example'));
});

test('language-sectioned body splits and renders per language', () => {
  const html = renderBilingualBody('## en\n**English**\n\n## zh\n**中文**');
  assert.match(html.en, /<strong>English<\/strong>/);
  assert.match(html.zh, /<strong>中文<\/strong>/);
});

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
