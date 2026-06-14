import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, AgentLog, LogLevel } from '../types';

export interface BaseScraper {
  name: string;
  search(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void,
    excludedPhrases?: string[]
  ): Promise<Job[]>;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Query search results using the SerpApi Google Search engine.
 */
async function searchViaSerpApi(
  query: string,
  location: string,
  siteTarget: string,
  log: (level: LogLevel, msg: string) => void,
  excludedPhrases?: string[]
): Promise<Job[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    log('warn', `SerpApi key is missing. Please set SERPAPI_API_KEY in your .env file.`);
    return [];
  }

  log('thought', `SerpApi credentials found. Querying Google Search via SerpApi...`);
  // Use a cleaner dork query format for better compatibility
  let dork = `site:${siteTarget} "${query}" "${location}"`;

  if (excludedPhrases && excludedPhrases.length > 0) {
    // Slice to first 8 to stay well within Google's 32-word query limit
    const activeExclusions = excludedPhrases.slice(0, 8);
    const exclusionString = activeExclusions.map(phrase => {
      let cleaned = phrase.trim();
      if (!cleaned.startsWith('"') && !cleaned.startsWith('-')) {
        cleaned = `"${cleaned}"`;
      }
      return ` -${cleaned}`;
    }).join('');
    dork += exclusionString;
    log('info', `Applying exclusions: ${exclusionString}`);
  }

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google',
        q: dork,
        api_key: apiKey,
        hl: 'en',
        gl: 'in', // Target India results
        tbs: 'qdr:w' // Restrict to past week
      },
      timeout: 10000
    });

    const items = response.data?.organic_results || [];
    const jobs: Job[] = [];

    for (const result of items) {
      const href = result.link || '';
      const titleText = result.title || '';
      const snippet = result.snippet || '';

      // Validate URL belongs to the target site
      if (href.includes(siteTarget) || href.includes(siteTarget.replace('in.', ''))) {
        let parsedTitle = query;
        let parsedCompany = 'Unknown Recruiter';

        // Extract title and company details
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

        parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').replace(/hiring\s*$/i, '').trim();

        jobs.push({
          id: `${siteTarget.includes('linkedin') ? 'linkedin' : 'naukri'}-${Math.random().toString(36).substring(7)}`,
          title: parsedTitle,
          company: parsedCompany,
          location: location || 'India',
          description: snippet || 'No description snippet available.',
          url: href,
          source: siteTarget.includes('linkedin') ? 'LinkedIn (via SerpApi)' : 'Naukri (via SerpApi)'
        });
      }
    }

    log('success', `SerpApi returned ${jobs.length} valid results.`);
    return jobs;
  } catch (err: any) {
    const details = err.response?.data?.error || err.message;
    log('warn', `SerpApi Google search failed: ${details}.`);
    return [];
  }
}

export class LinkedInScraper implements BaseScraper {
  name = 'LinkedIn India';

  async search(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void,
    excludedPhrases?: string[]
  ): Promise<Job[]> {
    const log = (level: LogLevel, msg: string) => logCallback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message: `[LinkedIn Crawler] ${msg}`
    });

    const siteTarget = 'linkedin.com/jobs/view/';

    // Tier 1: Try SerpApi Google Search
    if (process.env.SERPAPI_API_KEY) {
      const serpJobs = await searchViaSerpApi(query, location, siteTarget, log, excludedPhrases);
      if (serpJobs.length > 0) return serpJobs;
    }

    // Tier 2: Organic fallback if SerpApi key missing or returned 0 results
    log('thought', `No SerpApi credentials or search returned 0 results. Falling back to organic scraper...`);
    // Fall back using the domain without the path for better DDG compatibility
    const cleanSite = 'linkedin.com';
    let dork = `site:${cleanSite} "jobs/view" "${query}" "${location}"`;

    if (excludedPhrases && excludedPhrases.length > 0) {
      const activeExclusions = excludedPhrases.slice(0, 8);
      const exclusionString = activeExclusions.map(phrase => {
        let cleaned = phrase.trim();
        if (!cleaned.startsWith('"') && !cleaned.startsWith('-')) {
          cleaned = `"${cleaned}"`;
        }
        return ` -${cleaned}`;
      }).join('');
      dork += exclusionString;
      log('info', `Applying organic exclusions: ${exclusionString}`);
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}&df=w`;

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
        let href = titleLink.attr('href') || '';
        
        // Handle DuckDuckGo redirect encoding
        try {
          if (href.includes('uddg=')) {
            const parts = href.split('uddg=');
            if (parts[1]) {
              href = decodeURIComponent(parts[1].split('&')[0]);
            }
          }
        } catch (e) {}

        const titleText = titleLink.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (href.includes('linkedin.com/jobs/view/') || href.includes('linkedin.com/jobs/')) {
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

  async search(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void,
    excludedPhrases?: string[]
  ): Promise<Job[]> {
    const log = (level: LogLevel, msg: string) => logCallback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message: `[Naukri Crawler] ${msg}`
    });

    const siteTarget = 'naukri.com/job-listings-';

    // Tier 1: Try SerpApi Google Search
    if (process.env.SERPAPI_API_KEY) {
      const serpJobs = await searchViaSerpApi(query, location, siteTarget, log, excludedPhrases);
      if (serpJobs.length > 0) return serpJobs;
    }

    // Tier 2: Organic fallback if SerpApi key missing or returned 0 results
    log('thought', `No SerpApi credentials or search returned 0 results. Falling back to organic scraper...`);
    const cleanSite = 'naukri.com';
    let dork = `site:${cleanSite} "job-listings" "${query}" "${location}"`;

    if (excludedPhrases && excludedPhrases.length > 0) {
      const activeExclusions = excludedPhrases.slice(0, 8);
      const exclusionString = activeExclusions.map(phrase => {
        let cleaned = phrase.trim();
        if (!cleaned.startsWith('"') && !cleaned.startsWith('-')) {
          cleaned = `"${cleaned}"`;
        }
        return ` -${cleaned}`;
      }).join('');
      dork += exclusionString;
      log('info', `Applying organic exclusions: ${exclusionString}`);
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dork)}&df=w`;

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
        let href = titleLink.attr('href') || '';
        
        // Handle DuckDuckGo redirect encoding
        try {
          if (href.includes('uddg=')) {
            const parts = href.split('uddg=');
            if (parts[1]) {
              href = decodeURIComponent(parts[1].split('&')[0]);
            }
          }
        } catch (e) {}

        const titleText = titleLink.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (href.includes('naukri.com/job-listings-') || href.includes('naukri.com/job/')) {
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
    logCallback: (log: AgentLog) => void,
    excludedPhrases?: string[]
  ): Promise<Job[]> {
    const finalLocation = location || 'India';
    this.log(
      logCallback,
      'thought',
      `Initializing JobSearchAgent (SerpApi enabled)... Targeting: "${query}" in "${finalLocation}"`
    );

    // Run scrapers concurrently
    const promises = this.scrapers.map(scraper => {
      this.log(logCallback, 'info', `Launching crawler for: ${scraper.name}...`);
      return scraper.search(query, finalLocation, logCallback, excludedPhrases);
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
      this.log(
        logCallback,
        'success',
        `Successfully retrieved ${crawledJobs.length} organic jobs from LinkedIn & Naukri.`
      );
      return crawledJobs;
    }

    // STRICT REQUIREMENT: No mock fallback data allowed. Return empty results.
    this.log(
      logCallback,
      'warn',
      `No jobs found or scrapers rate-limited. Returning empty results as requested.`
    );
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
