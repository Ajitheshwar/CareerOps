// src/services/job.service.ts
import { JobRepository } from '../repositories/job.repository';
import { LLMService } from '../llm';
import { JobListing } from '../db';
import { ResumeAnalyzerAgent } from '../agents/resumeAnalyzer';
import { UserRepository } from '../repositories/user.repository';
import { Job, MatchResult } from '../types';

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

    if (matchResult.matchScore !== null && matchResult.matchScore !== undefined && typeof matchResult.matchScore === 'number' && matchResult.matchScore < 60) {
      console.log(`[JobService Single Analysis] Score is ${matchResult.matchScore}% (< 60%). Soft-deleting job ${jobId}.`);
      await JobRepository.softDeleteJob(jobId);
      
      try {
        const { StateService } = require('./state.service');
        const orchestrator = StateService.getOrchestrator();
        orchestrator.addLog('Orchestrator', 'info', `Job "${historicalJob.job.title}" at ${historicalJob.job.company} re-analysis score is ${matchResult.matchScore}% (< 60%). Deleting from DB and frontend...`);
        orchestrator.removeJob(jobId);
      } catch (stateErr) {
        console.error('Failed to remove job from active orchestrator state:', stateErr);
      }
    }

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
    const historicalJob = await JobRepository.getJobHistoryById(id);
    const jobTitle = historicalJob?.job?.title || 'Unknown Title';
    const company = historicalJob?.job?.company || 'Unknown Company';

    await JobRepository.softDeleteJob(id);

    try {
      const { StateService } = require('./state.service');
      const orchestrator = StateService.getOrchestrator();
      orchestrator.addLog('Orchestrator', 'info', `Job "${jobTitle}" at ${company} manually deleted/hidden. Excluding from future search queries.`);
      orchestrator.removeJob(id);
    } catch (stateErr) {
      console.error('Failed to update orchestrator state for deleted job:', stateErr);
    }
  }

  /**
   * Creates a job from manually entered data, runs full LLM resume analysis,
   * and persists the result — identical lifecycle to the main search pipeline.
   * Does not apply the < 60% auto-delete rule since the user explicitly added this role.
   */
  static async addAndAnalyzeJob(jobData: {
    title: string;
    company: string;
    description: string;
    location?: string;
  }): Promise<{ job: Job; matchResult: MatchResult }> {
    const jobId = Math.random().toString(36).substring(7);

    const job: Job = {
      id: jobId,
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      location: jobData.location || 'Remote',
      source: 'manual',
      date: new Date().toISOString()
    };

    // Persist job to jobs_history (and job_listings) first
    await JobRepository.saveJobHistory(job);

    // Fetch resume from stored user profile
    const profile = await UserRepository.getUserProfile();
    if (!profile?.resumeText) {
      throw new Error('Resume not found. Please upload your resume in the Profile section first.');
    }

    // Run the exact same LLM analysis agent used by the main search pipeline
    const llm = new LLMService();
    const analyzer = new ResumeAnalyzerAgent(llm);
    const matchResult = await analyzer.run(
      profile.resumeText,
      jobId,
      job.title,
      job.company,
      job.description,
      (log) => console.log(`[JobService AddJob] [${log.level}] ${log.message}`)
    );

    // Persist the match result back to history
    await JobRepository.saveJobHistory(job, matchResult);

    return { job, matchResult };
  }
}


