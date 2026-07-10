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
