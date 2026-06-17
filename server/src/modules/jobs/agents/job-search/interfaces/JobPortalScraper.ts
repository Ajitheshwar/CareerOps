import { Job } from '../models/Job';

export interface JobPortalScraper {
  name: string;
  siteTarget: string;      // site target parameter for query, e.g. 'linkedin.com/jobs/view/'
  cleanDomain: string;     // domain for organic backup fallback, e.g. 'linkedin.com'
  extraSearchTerm?: string; // extra search token, e.g. 'jobs/view'
  
  canHandle(url: string): boolean;
  parse(url: string, title: string, content: string, location: string, provider: string): Job;
}
