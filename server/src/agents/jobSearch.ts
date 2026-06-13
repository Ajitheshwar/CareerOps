import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, AgentLog, LogLevel } from '../types';

export interface BaseScraper {
  name: string;
  search(query: string, location: string, logCallback: (log: AgentLog) => void): Promise<Job[]>;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Executes a structured search via the Google Custom Search JSON API.
 * Returns empty array if credentials are missing or API fails.
 */
async function searchViaGoogleCustomSearch(
  query: string, 
  location: string, 
  siteTarget: string,
  log: (level: LogLevel, msg: string) => void
): Promise<Job[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (!apiKey || !cx) {
    return [];
  }

  log('thought', `Google Custom Search API credentials found. Querying Google API...`);
  const dork = `site:${siteTarget} "${query}" "${location}"`;

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: cx,
        q: dork
      },
      timeout: 8000
    });

    const items = response.data?.items || [];
    const jobs: Job[] = [];

    for (const result of items) {
      const href = result.link || '';
      const titleText = result.title || '';
      const snippet = result.snippet || '';

      // Double check if URL belongs to target site
      if (href.includes(siteTarget) || href.includes(siteTarget.replace('in.', ''))) {
        let parsedTitle = query;
        let parsedCompany = 'Unknown Recruiter';

        // Extract title and company details from Google search result title
        if (titleText.toLowerCase().includes(' at ')) {
          const parts = titleText.split(/\s+at\s+/i);
          parsedTitle = parts[0]?.trim();
          parsedCompany = parts[1]?.split(/[\-\|]/)[0]?.trim() || 'Hiring Company';
        } else if (titleText.toLowerCase().includes(' hiring ')) {
          const parts = titleText.split(/\s+hiring\s+/i);
          parsedCompany = parts[0]?.trim();
          parsedTitle = parts[1]?.split(/[\-\|]/)[0]?.trim() || query;
        } else if (titleText.includes('-')) {
          const parts = titleText.split('-');
          parsedTitle = parts[0]?.trim() || query;
          parsedCompany = parts[1]?.trim() || 'Hiring Company';
        } else {
          const parts = titleText.split(/[\-\|]/);
          parsedTitle = parts[0]?.trim() || query;
          parsedCompany = parts[1]?.trim() || 'Hiring Company';
        }

        // Clean up titles
        parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').replace(/hiring\s*$/i, '').trim();

        jobs.push({
          id: `${siteTarget.includes('linkedin') ? 'linkedin' : 'naukri'}-${Math.random().toString(36).substring(7)}`,
          title: parsedTitle,
          company: parsedCompany,
          location: location || 'India',
          description: snippet || 'No description snippet available.',
          url: href,
          source: siteTarget.includes('linkedin') ? 'LinkedIn (via search)' : 'Naukri (via search)'
        });
      }
    }

    log('success', `Google Custom Search returned ${jobs.length} valid results.`);
    return jobs;
  } catch (err: any) {
    console.log(err)
    const details = err.response?.data?.error?.message || err.message;
    log('warn', `Google Custom Search API call failed: ${details}.`);
    return [];
  }
}

export class LinkedInScraper implements BaseScraper {
  name = 'LinkedIn India';

  async search(query: string, location: string, logCallback: (log: AgentLog) => void): Promise<Job[]> {
    const log = (level: LogLevel, msg: string) => logCallback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message: `[LinkedIn Crawler] ${msg}`
    });

    const siteTarget = 'in.linkedin.com/jobs/view/';

    // Tier 1: Try Google Custom Search API if keys are present
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX) {
      const googleJobs = await searchViaGoogleCustomSearch(query, location, siteTarget, log);
      if (googleJobs.length > 0) return googleJobs;
    }

    // Tier 2: Organic DuckDuckGo scrape fallback
    log('thought', `No Google API credentials or Google Search failed. Falling back to organic DuckDuckGo scraper...`);
    const dork = `site:${siteTarget} "${query}" "${location}"`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}`;

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 6000
      });

      const $ = cheerio.load(response.data);
      const jobs: Job[] = [];

      $('.result').each((_, el) => {
        const titleLink = $(el).find('.result__title a.result__url');
        const href = titleLink.attr('href') || '';
        const titleText = titleLink.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (href.includes('linkedin.com/jobs/view/')) {
          let parsedTitle = query;
          let parsedCompany = 'Unknown Company';

          if (titleText.toLowerCase().includes(' at ')) {
            const parts = titleText.split(/\s+at\s+/i);
            parsedTitle = parts[0]?.trim();
            parsedCompany = parts[1]?.split(/[\-\|]/)[0]?.trim() || 'LinkedIn Company';
          } else if (titleText.toLowerCase().includes(' hiring ')) {
            const parts = titleText.split(/\s+hiring\s+/i);
            parsedCompany = parts[0]?.trim();
            parsedTitle = parts[1]?.split(/[\-\|]/)[0]?.trim() || query;
          } else {
            const parts = titleText.split(/[\-\|]/);
            parsedTitle = parts[0]?.trim() || query;
            parsedCompany = parts[1]?.trim() || 'LinkedIn Company';
          }

          parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').replace(/hiring\s*$/i, '').trim();

          jobs.push({
            id: `linkedin-${Math.random().toString(36).substring(7)}`,
            title: parsedTitle,
            company: parsedCompany,
            location: location || 'India',
            description: snippet || 'No description preview available. Click details link to read on LinkedIn.',
            url: href,
            source: 'LinkedIn'
          });
        }
      });

      log('success', `Scraped ${jobs.length} jobs organically from LinkedIn India.`);
      return jobs;
    } catch (err: any) {
      log('warn', `Organic scraping failed: ${err.message}`);
      return [];
    }
  }
}

export class NaukriScraper implements BaseScraper {
  name = 'Naukri';

  async search(query: string, location: string, logCallback: (log: AgentLog) => void): Promise<Job[]> {
    const log = (level: LogLevel, msg: string) => logCallback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message: `[Naukri Crawler] ${msg}`
    });

    const siteTarget = 'naukri.com/job-listings-';

    // Tier 1: Try Google Custom Search API if keys are present
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CX) {
      const googleJobs = await searchViaGoogleCustomSearch(query, location, siteTarget, log);
      if (googleJobs.length > 0) return googleJobs;
    }

    // Tier 2: Organic DuckDuckGo scrape fallback
    log('thought', `No Google API credentials or Google Search failed. Falling back to organic DuckDuckGo scraper...`);
    const dork = `site:${siteTarget} "${query}" "${location}"`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}`;

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 6000
      });

      const $ = cheerio.load(response.data);
      const jobs: Job[] = [];

      $('.result').each((_, el) => {
        const titleLink = $(el).find('.result__title a.result__url');
        const href = titleLink.attr('href') || '';
        const titleText = titleLink.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (href.includes('naukri.com/job-listings-')) {
          const parts = titleText.split(/\s*-\s*/);
          let parsedTitle = parts[0]?.trim() || query;
          let parsedCompany = parts[1]?.trim() || 'Naukri Recruiter';

          parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').trim();

          jobs.push({
            id: `naukri-${Math.random().toString(36).substring(7)}`,
            title: parsedTitle,
            company: parsedCompany,
            location: location || 'India',
            description: snippet || 'No description preview available. Click details link to read on Naukri.',
            url: href,
            source: 'Naukri'
          });
        }
      });

      log('success', `Scraped ${jobs.length} jobs organically from Naukri.`);
      return jobs;
    } catch (err: any) {
      log('warn', `Organic scraping failed: ${err.message}`);
      return [];
    }
  }
}

export class JobSearchAgent {
  private scrapers: BaseScraper[] = [];

  constructor() {
    this.scrapers = [
      new LinkedInScraper(),
      new NaukriScraper()
    ];
  }

  async run(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void
  ): Promise<Job[]> {
    const finalLocation = location || 'India';
    this.log(logCallback, 'thought', `Initializing JobSearchAgent... Targeting: "${query}" in "${finalLocation}"`);

    // Run scrapers concurrently
    const promises = this.scrapers.map(scraper => {
      this.log(logCallback, 'info', `Launching crawler for: ${scraper.name}...`);
      return scraper.search(query, finalLocation, logCallback);
    });

    const results = await Promise.all(promises);
    let crawledJobs = results.flat();

    // Remove duplicates
    const seen = new Set<string>();
    crawledJobs = crawledJobs.filter(job => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key) || seen.has(job.url || '')) {
        return false;
      }
      seen.add(key);
      if (job.url) seen.add(job.url);
      return true;
    });

    if (crawledJobs.length > 0) {
      this.log(logCallback, 'success', `Successfully retrieved ${crawledJobs.length} organic jobs from LinkedIn & Naukri.`);
      return crawledJobs;
    }

    // STRICT REQUIREMENT: No mock fallback data allowed. Return empty results.
    this.log(logCallback, 'warn', `No jobs found or scrapers rate-limited. Returning empty results as requested.`);
    return [];
  }

  private log(callback: (log: AgentLog) => void, level: LogLevel, message: string) {
    callback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message
    });
  }
}
