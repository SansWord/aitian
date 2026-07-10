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

test('spring-forward day resolves correctly (2026-03-08 18:00 PT is already PDT)', () => {
  assert.equal(
    zonedTimeToInstant('2026-03-08', '18:00', 'America/Los_Angeles'),
    '2026-03-09T01:00:00.000Z',
  );
});

test('isValidTimeZone accepts IANA names and rejects junk', () => {
  assert.equal(isValidTimeZone('America/Los_Angeles'), true);
  assert.equal(isValidTimeZone('Asia/Taipei'), true);
  assert.equal(isValidTimeZone('Mars/OlympusMons'), false);
  assert.equal(isValidTimeZone(''), false);
  assert.equal(isValidTimeZone(42), false);
});
