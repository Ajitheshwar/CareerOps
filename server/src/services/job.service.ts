// src/services/job.service.ts
import { JobRepository } from '../repositories/job.repository';
import { LLMService } from '../llm';
import { JobListing } from '../db';

export class JobService {
  static async getJobs(): Promise<JobListing[]> {
    return JobRepository.getJobListings();
  }

  static async createJob(jobData: {
    id?: string;
    title: string;
    company: string;
    description: string;
    location: string;
    requirements?: string[];
    url?: string;
    status?: JobListing['status'];
  }): Promise<string> {
    const listingId = jobData.id || Math.random().toString(36).substring(7);

    // Generate text embedding for job listings search
    const llm = new LLMService();
    const job_embedding = await llm.embedText(
      jobData.description || `${jobData.title} at ${jobData.company}`
    );

    await JobRepository.saveJobListing({
      id: listingId,
      title: jobData.title || 'Untitled Role',
      company: jobData.company || 'Unknown Company',
      description: jobData.description || '',
      location: jobData.location || 'Remote',
      requirements: jobData.requirements || [],
      url: jobData.url || '',
      status: jobData.status || 'scraped',
      job_embedding
    });

    return listingId;
  }

  static async updateStatus(id: string, status: JobListing['status']): Promise<void> {
    await JobRepository.updateJobListingStatus(id, status);
  }
}
