import test from 'node:test';
import assert from 'node:assert';
import { extractSkills } from '../utils/normalize.js';

test('extractSkills detects known skills', () => {
    const text = 'Looking for Python and SQL developer with AWS experience';
    const skills = extractSkills(text);

    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('sql'));
    assert.ok(skills.includes('aws'));
});

test('extractSkills returns empty array for no matches', () => {
    const text = 'Looking for a marketing specialist';
    const skills = extractSkills(text);

    assert.deepStrictEqual(skills, []);
});

test('extractSkills handles case insensitivity', () => {
    const text = 'PYTHON, JavaScript, and DOCKER required';
    const skills = extractSkills(text);

    assert.ok(skills.includes('python'));
    assert.ok(skills.includes('javascript'));
    assert.ok(skills.includes('docker'));
});
