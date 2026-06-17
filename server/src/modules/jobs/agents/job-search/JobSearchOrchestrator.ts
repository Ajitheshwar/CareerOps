import { Job } from './models/Job';
import { SearchService } from './services/SearchService';
import { ScrapingService } from './services/ScrapingService';
import { DeduplicationService } from './services/DeduplicationService';
import { JobPortalRegistry } from './scrapers/JobPortalRegistry';
import { buildDork } from './utils/queryBuilder';

export class JobSearchOrchestrator {
  private searchService: SearchService;
  private scrapingService: ScrapingService;
  private deduplicationService: DeduplicationService;
  private registry: JobPortalRegistry;

  constructor() {
    this.searchService = new SearchService();
    this.scrapingService = new ScrapingService();
    this.deduplicationService = new DeduplicationService();
    this.registry = JobPortalRegistry.getInstance();
  }

  async search(
    query: string,
    location: string,
    logCallback: (level: string, msg: string) => void,
    excludedPhrases?: string[]
  ): Promise<Job[]> {
    const scrapers = this.registry.getScrapers();

    // Launch search and parsing for each registered portal concurrently
    const promises = scrapers.map(async scraper => {
      const log = (level: string, msg: string) => {
        logCallback(level, `[${scraper.name} Crawler] ${msg}`);
      };

      // 1. Build portal-specific dork query
      const { dork, exclusionString } = buildDork(
        scraper.siteTarget,
        query,
        location,
        scraper.extraSearchTerm,
        excludedPhrases
      );

      if (exclusionString) {
        log('info', `Applying exclusions: ${exclusionString}`);
      }

      log('info', `Launching crawler for: ${scraper.name}...`);

      // 2. Search using provider fallback chain
      const searchResults = await this.searchService.search(dork, log);

      // 3. Scrape/Parse search results
      const portalJobs = this.scrapingService.scrapeSearchResults(searchResults, location);

      return portalJobs;
    });

    const results = await Promise.all(promises);
    const allJobs = results.flat();

    // 4. Deduplicate aggregated jobs
    return this.deduplicationService.deduplicate(allJobs);
  }
}
