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
