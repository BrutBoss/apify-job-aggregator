import { Actor, log } from 'apify';
import { chromium } from 'playwright';
import { scrapeGoogleJobs } from './extractors/googleJobs.js';
import { scrapeIndeed } from './extractors/indeedJobs.js';
import { hashJob } from './utils/dedupe.js';
import { REQUIRED_FIELDS } from './config.js';

await Actor.init();

const input = await Actor.getInput() || {};
const dataset = await Actor.openDataset();

// Log raw input for debugging
log.info('Raw input received', { input });

const {
    searchQueries = ['software engineer', 'data analyst'],
    location = 'New York, NY',
    maxResults = 100,
    rateLimitRpm = 30,
    sources = ['google', 'indeed'],
    proxy = true
} = input;

// Normalize sources to array of lowercase strings
const normalizedSources = Array.isArray(sources)
    ? sources.map(s => String(s).toLowerCase().trim())
    : ['google', 'indeed'];

log.info('Configuration', {
    searchQueries,
    location,
    maxResults,
    sources: normalizedSources,
    proxy
});

// Configure proxy if enabled
let proxyConfiguration = null;
if (proxy) {
    try {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['RESIDENTIAL'],
        });
        log.info('Proxy enabled with residential IPs');
    } catch (e) {
        log.warning('Failed to create proxy configuration, continuing without proxy', { error: e.message });
    }
}

const seen = new Set();
const stats = { saved: 0, duplicates: 0, errors: 0, captchas: 0 };

for (const query of searchQueries) {
    log.info(`Processing query: "${query}"`);

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
        if (normalizedSources.includes('google')) {
            log.info(`Scraping Google Jobs for: ${query}`);
            try {
                const googleJobs = await scrapeGoogleJobs({ page, query, location, maxResults, rpm: rateLimitRpm });
                log.info(`Google Jobs found: ${googleJobs.length}`);
                jobs.push(...googleJobs);
            } catch (e) {
                if (e.message.includes('CAPTCHA')) {
                    stats.captchas++;
                    log.warning(`CAPTCHA on Google for "${query}" - skipping to next source`);
                } else {
                    log.error(`Google scraping error: ${e.message}`);
                    stats.errors++;
                }
            }
        } else {
            log.info('Google source not enabled');
        }

        // Try Indeed
        if (normalizedSources.includes('indeed')) {
            log.info(`Scraping Indeed for: ${query}`);
            try {
                const indeedJobs = await scrapeIndeed({ page, query, location, maxResults });
                log.info(`Indeed jobs found: ${indeedJobs.length}`);
                jobs.push(...indeedJobs);
            } catch (e) {
                log.warning(`Indeed scraping failed: ${e.message}`);
                stats.errors++;
            }
        } else {
            log.info('Indeed source not enabled');
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
