import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginLimiter } from '../src/server/login-rate-limit.ts';
test('normalizes identifiers, limits repeated attempts, and restores access after expiry', () => {
  let now = 0;
  const limit = createLoginLimiter(() => now);
  for (let i = 0; i < 8; i++) assert.equal(limit(' User@Example.com '), 0);
  assert.equal(limit('user@example.com'), 900);
  assert.equal(limit('other@example.com'), 0);
  now += 900_000;
  assert.equal(limit('user@example.com'), 0);
});
test('bounds attempts even when an attacker rotates identifiers', () => {
  let now = 0;
  const limit = createLoginLimiter(() => now);
  for (let i = 0; i < 120; i++) assert.equal(limit(String(i)), 0);
  assert.equal(limit('new'), 60);
  now += 60_000;
  assert.equal(limit('new'), 0);
});
