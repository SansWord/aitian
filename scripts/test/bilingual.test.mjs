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
