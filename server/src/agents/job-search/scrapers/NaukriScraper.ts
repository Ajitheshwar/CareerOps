import { JobPortalScraper } from '../interfaces/JobPortalScraper';
import { Job } from '../models/Job';
import { parseNaukriTitleAndCompany } from '../utils/jobNormalizer';

export class NaukriScraper implements JobPortalScraper {
  name = 'Naukri';
  siteTarget = 'naukri.com/job-listings-';
  cleanDomain = 'naukri.com';
  extraSearchTerm = 'job-listings';

  canHandle(url: string): boolean {
    return url.includes('naukri.com/job-listings-') || url.includes('naukri.com/job/');
  }

  parse(url: string, title: string, content: string, location: string, provider: string): Job {
    const { title: parsedTitle, company: parsedCompany } = parseNaukriTitleAndCompany(title, 'Naukri Job');

    let source = 'Naukri';
    if (provider === 'Tavily') {
      source = 'Naukri (via Tavily)';
    } else if (provider === 'SerpApi') {
      source = 'Naukri (via SerpApi)';
    }

    return {
      id: `naukri-${Math.random().toString(36).substring(7)}`,
      title: parsedTitle,
      company: parsedCompany,
      location: location || 'India',
      description: content || 'No description preview available.',
      sourceUrl: url,
      portal: source
    };
  }
}
