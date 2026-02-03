import test from 'node:test';
import assert from 'node:assert';
import { cleanLocation, normalizeDate } from '../utils/normalize.js';

test('cleanLocation normalizes spacing', () => {
    assert.equal(cleanLocation(' Nairobi   ,  Kenya '), 'Nairobi , Kenya');
});

test('cleanLocation handles null input', () => {
    assert.equal(cleanLocation(null), null);
    assert.equal(cleanLocation(undefined), null);
});

test('normalizeDate converts valid date to ISO', () => {
    const result = normalizeDate('2024-01-15');
    assert.ok(result.startsWith('2024-01-15'));
});

test('normalizeDate returns null for invalid date', () => {
    assert.equal(normalizeDate('not a date'), null);
    assert.equal(normalizeDate(null), null);
});
