import { AgentLog, Job as AppJob, LogLevel } from '../../../../shared/types';
import { JobSearchOrchestrator } from './JobSearchOrchestrator';

export class JobSearchAgent {
  async run(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void,
    excludedPhrases?: string[]
  ): Promise<AppJob[]> {
    const finalLocation = location || 'India';

    const logWrapper = (level: string, message: string) => {
      logCallback({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toISOString(),
        agent: 'JobSearch',
        level: level as LogLevel,
        message
      });
    };

    logWrapper('thought', `Initializing JobSearchAgent (Clean Refactored)... Targeting: "${query}" in "${finalLocation}"`);

    const orchestrator = new JobSearchOrchestrator();

    try {
      const unifiedJobs = await orchestrator.search(
        query,
        finalLocation,
        logWrapper,
        excludedPhrases
      );

      // Map internal Job model to global AppJob type expected by other components/frontend
      const appJobs: AppJob[] = unifiedJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        description: job.description,
        url: job.sourceUrl,
        source: job.portal,
        date: job.postedDate || new Date().toISOString()
      }));

      if (appJobs.length > 0) {
        logWrapper('success', `Successfully retrieved ${appJobs.length} organic jobs from LinkedIn & Naukri.`);
        return appJobs;
      }

      logWrapper('warn', `No jobs found or scrapers rate-limited. Returning empty results as requested.`);
      return [];
    } catch (err: any) {
      logWrapper('warn', `Job search execution failed: ${err.message}`);
      return [];
    }
  }
}
