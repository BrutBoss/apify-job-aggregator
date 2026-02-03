import Apify from 'apify';
import { scrapeGoogleJobs } from './extractors/googleJobs.js';
import { scrapeIndeed } from './extractors/indeedJobs.js';
import { hashJob } from './utils/dedupe.js';
import { REQUIRED_FIELDS } from './config.js';

const { Actor, log } = Apify;

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

const crawler = await Actor.createPlaywrightCrawler({
    proxyConfiguration: input.proxy ? await Actor.createProxyConfiguration() : null,
    useSessionPool: true,
    maxConcurrency: 1,
    launchContext: { useChrome: true }
});

const seen = new Set();
const stats = { saved: 0, duplicates: 0, errors: 0 };

for (const query of searchQueries) {
    const page = await crawler.browserPool.newPage();

    try {
        let jobs = [];

        if (sources.includes('google')) {
            jobs.push(...await scrapeGoogleJobs({ page, query, location, maxResults, rpm: rateLimitRpm }));
        }
        if (sources.includes('indeed')) {
            jobs.push(...await scrapeIndeed({ page, query, location, maxResults }));
        }

        for (const job of jobs) {
            if (!REQUIRED_FIELDS.every(f => job[f])) continue;

            const hash = hashJob(job);
            if (seen.has(hash)) {
                stats.duplicates++;
                continue;
            }

            seen.add(hash);
            await dataset.pushData(job);
            stats.saved++;
        }
    } catch (e) {
        stats.errors++;
        log.exception(e);
    } finally {
        await page.close();
    }
}

await dataset.pushData({ _runStats: stats });
await Actor.exit();
