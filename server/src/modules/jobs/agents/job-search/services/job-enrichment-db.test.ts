// Integration test for JobEnrichmentService using the shared MongoDB client (MongoClient).
// Run with: ts-node src/modules/jobs/agents/job-search/services/job-enrichment-db.test.ts

import { getCollection } from '../../shared/db';
import { JobEnrichmentService } from './JobEnrichmentService';
import { Job } from '../models/Job';

(async () => {
  const logger = (level: string, msg: string) => console.log(`[${level}] ${msg}`);

  // Obtain the jobs collection
  const jobsCollection = await getCollection<Job>('jobs');
  const jobs = await jobsCollection.find({}).toArray();
  logger('info', `Fetched ${jobs.length} jobs from DB`);

  const service = new JobEnrichmentService();

  for (const job of jobs) {
    // Apply the same cleaning pipeline used in enrichment
    const cleanedDesc = service.cleanLinks(
      // Clean description based on portal (cleanDescription is private; use any cast)
      (service as any).cleanDescription(job.description, job.sourceUrl || '')
    );

    if (cleanedDesc !== job.description) {
      await jobsCollection.updateOne({ _id: job.id }, { $set: { description: cleanedDesc } });
      logger('info', `Updated job ${job.id}`);
    }
  }

  logger('info', 'All jobs processed');
  process.exit(0);
})();
