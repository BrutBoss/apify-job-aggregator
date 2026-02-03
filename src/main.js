import { Actor, log } from 'apify';
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

// Configure proxy if enabled
let proxyConfiguration = null;
if (input.proxy) {
    proxyConfiguration = await Actor.createProxyConfiguration({
        groups: ['RESIDENTIAL'],  // Use residential proxies for better success
    });
    log.info('Proxy enabled with residential IPs');
}

const seen = new Set();
const stats = { saved: 0, duplicates: 0, errors: 0, captchas: 0 };

for (const query of searchQueries) {
    // Get proxy URL for this request
    const proxyUrl = proxyConfiguration
        ? await proxyConfiguration.newUrl()
        : undefined;

    // Launch browser with proxy if available
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        proxy: proxyUrl ? { server: proxyUrl } : undefined
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
    });

    const page = await context.newPage();

    try {
        let jobs = [];

        // Try Google Jobs
        if (sources.includes('google')) {
            log.info(`Scraping Google Jobs for: ${query}`);
            try {
                const googleJobs = await scrapeGoogleJobs({ page, query, location, maxResults, rpm: rateLimitRpm });
                jobs.push(...googleJobs);
            } catch (e) {
                if (e.message.includes('CAPTCHA')) {
                    stats.captchas++;
                    log.warning(`CAPTCHA on Google for "${query}" - skipping to next source`);
                } else {
                    throw e;
                }
            }
        }

        // Try Indeed (usually more permissive)
        if (sources.includes('indeed')) {
            log.info(`Scraping Indeed for: ${query}`);
            try {
                const indeedJobs = await scrapeIndeed({ page, query, location, maxResults });
                jobs.push(...indeedJobs);
            } catch (e) {
                log.warning(`Indeed scraping failed: ${e.message}`);
                stats.errors++;
            }
        }

        // Process and deduplicate jobs
        for (const job of jobs) {
            if (!REQUIRED_FIELDS.every(f => job[f])) {
                log.debug('Skipping job missing required fields');
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
        await browser.close();
    }
}

log.info('Scraping completed', stats);
await dataset.pushData({ _runStats: stats });

await Actor.exit();
