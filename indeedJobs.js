import { normalizeDate, extractSkills, cleanLocation } from '../utils/normalize.js';

export async function scrapeIndeed({ page, query, location, maxResults }) {
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    const jobs = [];

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.job_seen_beacon');

    const cards = await page.$$('.job_seen_beacon');

    for (const card of cards.slice(0, maxResults)) {
        const job = await card.evaluate(el => ({
            jobTitle: el.querySelector('h2')?.innerText,
            companyName: el.querySelector('.companyName')?.innerText,
            location: el.querySelector('.companyLocation')?.innerText,
            jobDescription: el.innerText,
            applyUrl: el.querySelector('a')?.href
        }));

        job.location = cleanLocation(job.location);
        job.skillsExtracted = extractSkills(job.jobDescription);
        job.source = 'indeed';
        job.scrapedAt = new Date().toISOString();

        jobs.push(job);
    }

    return jobs;
}
