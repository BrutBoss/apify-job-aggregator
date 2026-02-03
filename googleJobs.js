import { rateLimit } from '../utils/rateLimiter.js';
import { normalizeDate, extractSkills, cleanLocation } from '../utils/normalize.js';
import { detectCaptcha } from '../utils/captcha.js';

export async function scrapeGoogleJobs({ page, query, location, maxResults, rpm }) {
    const results = [];

    const url = `https://www.google.com/search?q=${encodeURIComponent(
        `${query} jobs in ${location}`
    )}`;

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    if (await detectCaptcha(page)) throw new Error('CAPTCHA detected');

    await page.waitForSelector('div[jscontroller="r7KRvb"]');

    const cards = await page.$$('div[jscontroller="r7KRvb"]');

    for (const card of cards.slice(0, maxResults)) {
        await rateLimit(rpm);
        await card.click();
        await page.waitForTimeout(500);

        const job = await page.evaluate(() => {
            const text = sel => document.querySelector(sel)?.innerText || null;
            const href = sel => document.querySelector(sel)?.href || null;

            return {
                jobTitle: text('h2'),
                companyName: text('.nJlQNd'),
                location: text('.sMzDkb'),
                postedDate: text('.LL4CDc'),
                jobDescription: text('.HBvzbc'),
                applyUrl: href('a[href^="http"]')
            };
        });

        job.location = cleanLocation(job.location);
        job.postedDate = normalizeDate(job.postedDate);
        job.skillsExtracted = extractSkills(job.jobDescription);
        job.source = 'google_jobs';
        job.scrapedAt = new Date().toISOString();

        results.push(job);
    }

    return results;
}
