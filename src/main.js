import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { chromium } from 'playwright';
import { scrapeGoogleJobs } from './extractors/googleJobs.js';
import { scrapeIndeed } from './extractors/indeedJobs.js';
import { hashJob } from './utils/dedupe.js';
import { REQUIRED_FIELDS } from './config.js';

await Actor.init();

const input = await Actor.getInput();
const dataset = await Actor.openDataset();

const {
    searchQueries = [],
    location,
    maxResults = 100,
    rateLimitRpm = 30,
    sources = ['google', 'indeed']
} = input;

const proxyConfiguration = input.proxy
    ? await Actor.createProxyConfiguration()
    : undefined;

const seen = new Set();
const stats = { saved: 0, duplicates: 0, errors: 0 };

// Launch browser directly with Playwright
const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

for (const query of searchQueries) {
    const page = await context.newPage();

    try {
        let jobs = [];

        if (sources.includes('google')) {
            log.info(`Scraping Google Jobs for: ${query}`);
            jobs.push(...await scrapeGoogleJobs({ page, query, location, maxResults, rpm: rateLimitRpm }));
        }

        if (sources.includes('indeed')) {
            log.info(`Scraping Indeed for: ${query}`);
            jobs.push(...await scrapeIndeed({ page, query, location, maxResults }));
        }

        for (const job of jobs) {
            if (!REQUIRED_FIELDS.every(f => job[f])) {
                log.debug('Skipping job missing required fields', { job });
                continue;
            }

            const hash = hashJob(job);
            if (seen.has(hash)) {
                stats.duplicates++;
                continue;
            }

            seen.add(hash);
            await dataset.pushData(job);
            stats.saved++;
        }

        log.info(`Query "${query}" completed`, { jobsFound: jobs.length });
    } catch (e) {
        stats.errors++;
        log.exception(e, `Error scraping query: ${query}`);
    } finally {
        await page.close();
    }
}

await browser.close();

log.info('Scraping completed', stats);
await dataset.pushData({ _runStats: stats });

await Actor.exit();
