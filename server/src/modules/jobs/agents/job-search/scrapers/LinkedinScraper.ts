import { JobPortalScraper } from '../interfaces/JobPortalScraper';
import { Job } from '../models/Job';
import { parseLinkedInTitleAndCompany } from '../utils/jobNormalizer';

export class LinkedinScraper implements JobPortalScraper {
  name = 'LinkedIn India';
  siteTarget = 'linkedin.com/jobs/view/';
  cleanDomain = 'linkedin.com';
  extraSearchTerm = 'jobs/view';

  canHandle(url: string): boolean {
    return url.includes('linkedin.com/jobs/view/') || url.includes('linkedin.com/jobs/');
  }

  parse(url: string, title: string, content: string, location: string, provider: string): Job {
    const { title: parsedTitle, company: parsedCompany } = parseLinkedInTitleAndCompany(title, 'LinkedIn Job');

    let source = 'LinkedIn';
    if (provider === 'Tavily') {
      source = 'LinkedIn (via Tavily)';
    } else if (provider === 'SerpApi') {
      source = 'LinkedIn (via SerpApi)';
    }

    return {
      id: `linkedin-${Math.random().toString(36).substring(7)}`,
      title: parsedTitle,
      company: parsedCompany,
      location: location || 'India',
      description: content || 'No description preview available.',
      sourceUrl: url,
      portal: source
    };
  }
}
