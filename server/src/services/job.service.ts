// src/services/job.service.ts
import { JobRepository } from '../repositories/job.repository';
import { LLMService } from '../llm';
import { JobListing } from '../db';
import { ResumeAnalyzerAgent } from '../agents/resumeAnalyzer';
import { UserRepository } from '../repositories/user.repository';
import { MatchResult } from '../types';

export class JobService {
  static async getJobs(): Promise<JobListing[]> {
    return JobRepository.getJobListings();
  }

  static async getJobHistoryById(id: string) {
    return JobRepository.getJobHistoryById(id);
  }

  static async analyzeSingleJob(jobId: string, resumeText?: string): Promise<MatchResult> {
    const historicalJob = await JobRepository.getJobHistoryById(jobId);
    if (!historicalJob) {
      throw new Error(`Job with ID ${jobId} not found in history.`);
    }

    let finalResumeText = resumeText;
    if (!finalResumeText) {
      const profile = await UserRepository.getUserProfile();
      if (!profile || !profile.resumeText) {
        throw new Error('Resume text not found. Please upload a resume first.');
      }
      finalResumeText = profile.resumeText;
    }

    const llm = new LLMService();
    const analyzer = new ResumeAnalyzerAgent(llm);
    
    const matchResult = await analyzer.run(
      finalResumeText,
      jobId,
      historicalJob.job.title,
      historicalJob.job.company,
      historicalJob.job.description,
      (log) => {
        console.log(`[JobService Single Analysis] [${log.level}] ${log.message}`);
      }
    );

    // Save/update the job history document
    await JobRepository.saveJobHistory(
      historicalJob.job,
      matchResult,
      historicalJob.tailoredResume,
      historicalJob.coverLetter,
      historicalJob.interviewPrep
    );

    return matchResult;
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

  static async deleteJob(id: string): Promise<void> {
    await JobRepository.softDeleteJob(id);
  }
}


