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
test('empty-string bilingual language value is rejected', () =>
  assert.match(
    errs({ segments: [{ type: 'talk', title: { en: 'x', zh: '' }, speaker: 'A' }] }).join('\n'),
    /title\.zh: empty — omit the key/,
  ));
test('omitted-key bilingual map still passes', () =>
  assert.deepEqual(errs({ segments: [{ type: 'talk', title: { en: 'x' }, speaker: 'A' }] }), []));

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
