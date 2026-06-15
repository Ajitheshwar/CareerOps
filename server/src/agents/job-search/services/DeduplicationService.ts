import { Job } from '../models/Job';

export class DeduplicationService {
  deduplicate(jobs: Job[]): Job[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.location.toLowerCase()}`;
      const urlKey = job.sourceUrl.toLowerCase();
      if (seen.has(key) || seen.has(urlKey)) {
        return false;
      }
      seen.add(key);
      seen.add(urlKey);
      return true;
    });
  }
}
