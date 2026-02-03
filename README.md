# Apify Job Aggregator 🚀

A production-grade, multi-source job scraper built on [Apify](https://apify.com/) with CAPTCHA hardening and extensible architecture.

## Features

- **Multi-Source Aggregation**: Scrapes Google Jobs and Indeed simultaneously
- **CAPTCHA Detection**: Fail-fast on CAPTCHA detection with session rotation
- **Deduplication**: SHA-256 based job deduplication across sources
- **Skills Extraction**: Automatic skill detection from job descriptions
- **Rate Limiting**: Configurable RPM with random jitter
- **Data Normalization**: Clean, consistent output format

## Project Structure

```
apify-job-aggregator/
├── src/
│   ├── main.js              # Main Apify Actor entry point
│   ├── config.js            # Configuration (required fields, skills regex)
│   ├── utils/
│   │   ├── rateLimiter.js   # Request throttling with jitter
│   │   ├── dedupe.js        # Job deduplication via hashing
│   │   ├── normalize.js     # Data normalization utilities
│   │   └── captcha.js       # CAPTCHA detection
│   ├── extractors/
│   │   ├── googleJobs.js    # Google Jobs scraper
│   │   └── indeedJobs.js    # Indeed scraper
│   └── tests/
│       ├── googleJobs.test.js
│       └── indeedJobs.test.js
├── INPUT_SCHEMA.json        # Apify input schema
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Usage

### Local Development

```bash
npm start
```

### Run Tests

```bash
npm test
```

### Deploy to Apify

```bash
apify push
```

## Input Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `searchQueries` | array | `["software engineer"]` | Job search queries |
| `location` | string | `"New York, NY"` | Search location |
| `maxResults` | integer | `100` | Max results per query |
| `rateLimitRpm` | integer | `30` | Requests per minute |
| `sources` | array | `["google", "indeed"]` | Job boards to scrape |
| `proxy` | boolean | `true` | Enable Apify proxy |

### Example Input

```json
{
  "searchQueries": ["python developer", "data engineer"],
  "location": "San Francisco, CA",
  "maxResults": 50,
  "rateLimitRpm": 20,
  "sources": ["google", "indeed"],
  "proxy": true
}
```

## Output Schema

Each job record includes:

```json
{
  "jobTitle": "Senior Software Engineer",
  "companyName": "TechCorp",
  "location": "San Francisco, CA",
  "postedDate": "2024-01-15T00:00:00.000Z",
  "jobDescription": "...",
  "applyUrl": "https://...",
  "skillsExtracted": ["python", "sql", "aws"],
  "source": "google_jobs",
  "scrapedAt": "2024-01-20T12:00:00.000Z"
}
```

## CAPTCHA Hardening Strategy

✅ **Implemented:**
- Session pool with rotation
- Low concurrency (maxConcurrency: 1)
- RPM throttling with random jitter
- Chrome fingerprint emulation
- CAPTCHA detection with fail-fast
- Multi-source fallback

📋 **Recommended (not implemented):**
- Residential proxy groups
- Paid CAPTCHA solver integration

## Extending with New Sources

Add a new extractor in `src/extractors/`:

```javascript
// src/extractors/linkedinJobs.js
export async function scrapeLinkedin({ page, query, location, maxResults }) {
  // Implementation
}
```

Then update `src/main.js`:

```javascript
import { scrapeLinkedin } from './extractors/linkedinJobs.js';

// In the sources loop:
if (sources.includes('linkedin')) {
  jobs.push(...await scrapeLinkedin({ page, query, location, maxResults }));
}
```

## License

MIT
