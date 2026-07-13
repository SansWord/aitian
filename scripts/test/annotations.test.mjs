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

test('a colon-free error lands in the "build" group with singular count', () => {
  const md = stepSummaryMarkdown(['something exploded']);
  assert.match(md, /1 error\)/);
  assert.match(md, /### `build`/);
  assert.match(md, /- something exploded/);
});
