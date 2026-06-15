import { SearchResult } from '../interfaces/SearchProvider';
import { Job } from '../models/Job';
import { JobPortalRegistry } from '../scrapers/JobPortalRegistry';

export class ScrapingService {
  private registry: JobPortalRegistry;

  constructor() {
    this.registry = JobPortalRegistry.getInstance();
  }

  scrapeSearchResults(
    results: SearchResult[],
    location: string
  ): Job[] {
    const jobs: Job[] = [];

    for (const result of results) {
      const scraper = this.registry.findScraperForUrl(result.url);
      if (scraper) {
        try {
          const job = scraper.parse(result.url, result.title, result.content, location, result.provider);
          jobs.push(job);
        } catch (err) {
          // Silently skip or log individual parsing failures to ensure robustness
        }
      }
    }

    return jobs;
  }
}
