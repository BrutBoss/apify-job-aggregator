import { SKILLS_REGEX } from '../config.js';

export function normalizeDate(raw) {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d) ? null : d.toISOString();
}

export function extractSkills(text = '') {
    return SKILLS_REGEX
        .filter(r => r.test(text))
        .map(r => r.source.replace(/\\./g, ''));
}

export function cleanLocation(loc) {
    return loc?.replace(/\s+/g, ' ').trim() || null;
}
