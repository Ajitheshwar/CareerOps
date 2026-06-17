import { JobPortalScraper } from '../interfaces/JobPortalScraper';
import { LinkedinScraper } from './LinkedinScraper';
import { NaukriScraper } from './NaukriScraper';

export class JobPortalRegistry {
  private static instance: JobPortalRegistry;
  private scrapers: JobPortalScraper[] = [];

  private constructor() {
    this.registerScraper(new LinkedinScraper());
    this.registerScraper(new NaukriScraper());
  }

  public static getInstance(): JobPortalRegistry {
    if (!JobPortalRegistry.instance) {
      JobPortalRegistry.instance = new JobPortalRegistry();
    }
    return JobPortalRegistry.instance;
  }

  public registerScraper(scraper: JobPortalScraper): void {
    this.scrapers.push(scraper);
  }

  public getScrapers(): JobPortalScraper[] {
    return this.scrapers;
  }

  public findScraperForUrl(url: string): JobPortalScraper | undefined {
    return this.scrapers.find(scraper => scraper.canHandle(url));
  }
}
