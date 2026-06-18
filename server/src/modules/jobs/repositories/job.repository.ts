// src/repositories/job.repository.ts
import { getCollection, JobListing, HistoricalJob, GeneratedArtifact } from '../../../shared/db';
import { Job, MatchResult, TailoredResume, InterviewPrepData } from '../../../shared/types';

export class JobRepository {
  static async saveJobListing(listing: Omit<JobListing, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const col = await getCollection<JobListing>('job_listings');
      await col.updateOne(
        { id: listing.id },
        {
          $set: {
            title: listing.title,
            company: listing.company,
            description: listing.description,
            location: listing.location,
            requirements: listing.requirements || [],
            url: listing.url || '',
            status: listing.status,
            job_embedding: listing.job_embedding,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save job listing:', err);
      throw err;
    }
  }

  static async getJobListings(): Promise<JobListing[]> {
    try {
      const col = await getCollection<JobListing>('job_listings');
      return await col.find({}).sort({ updatedAt: -1 }).toArray();
    } catch (err) {
      console.error('Failed to get job listings:', err);
      return [];
    }
  }

  static async updateJobListingStatus(id: string, status: JobListing['status']): Promise<void> {
    try {
      const col = await getCollection<JobListing>('job_listings');
      await col.updateOne({ id }, { $set: { status, updatedAt: new Date() } });
    } catch (err) {
      console.error(`Failed to update status for job ${id}:`, err);
      throw err;
    }
  }

  static async saveGeneratedArtifact(artifact: GeneratedArtifact): Promise<void> {
    try {
      const col = await getCollection<GeneratedArtifact>('generated_artifacts');
      await col.updateOne(
        { id: artifact.id },
        { $set: artifact },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save generated artifact:', err);
      throw err;
    }
  }

  static async getGeneratedArtifactByJob(jobId: string): Promise<GeneratedArtifact | null> {
    try {
      const col = await getCollection<GeneratedArtifact>('generated_artifacts');
      return await col.findOne({ jobId });
    } catch (err) {
      console.error(`Failed to get artifact for job ${jobId}:`, err);
      return null;
    }
  }

  static async saveJobHistory(
    job: Job,
    matchResult?: MatchResult,
    tailoredResume?: TailoredResume,
    coverLetter?: string,
    interviewPrep?: InterviewPrepData
  ): Promise<void> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      await col.updateOne(
        { id: job.id },
        {
          $set: {
            job,
            matchResult,
            tailoredResume,
            coverLetter,
            interviewPrep,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      // Proactively save to job_listings too so it populates the Job Tracker!
      await this.saveJobListing({
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        requirements: matchResult?.matchingSkills || [],
        url: job.url,
        status: 'scraped'
      });
    } catch (err) {
      console.error('Failed to save job to history DB:', err);
      throw err;
    }
  }

  static async updateJobTailoring(
    jobId: string,
    tailoredResume: TailoredResume,
    coverLetter: string
  ): Promise<void> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      await col.updateOne(
        { id: jobId },
        {
          $set: {
            tailoredResume,
            coverLetter,
            updatedAt: new Date()
          }
        }
      );
      
      // Save to generated_artifacts as well to satisfy new schema requirements
      await this.saveGeneratedArtifact({
        id: Math.random().toString(36).substring(7),
        jobId,
        tailoredResume,
        coverLetter,
        createdAt: new Date()
      });
    } catch (err) {
      console.error(`Failed to update job tailoring for ${jobId} in DB:`, err);
      throw err;
    }
  }

  static async updateJobInterviewPrep(
    jobId: string,
    interviewPrep: InterviewPrepData
  ): Promise<void> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      await col.updateOne(
        { id: jobId },
        {
          $set: {
            interviewPrep,
            updatedAt: new Date()
          }
        }
      );
    } catch (err) {
      console.error(`Failed to update interview prep for ${jobId} in DB:`, err);
      throw err;
    }
  }

  static async getAllJobHistory(): Promise<HistoricalJob[]> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      return await col.find({ isDeleted: { $ne: true } }).sort({ updatedAt: -1 }).toArray();
    } catch (err) {
      console.error('Failed to retrieve job history list from DB:', err);
      return [];
    }
  }

  static async getDeletedJobHistory(): Promise<HistoricalJob[]> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      return await col.find({ isDeleted: true }).toArray();
    } catch (err) {
      console.error('Failed to retrieve deleted job history list from DB:', err);
      return [];
    }
  }

  static async getJobHistoryById(id: string): Promise<HistoricalJob | null> {
    try {
      const col = await getCollection<HistoricalJob>('jobs_history');
      return await col.findOne({ id });
    } catch (err) {
      console.error(`Failed to get job history by ID ${id}:`, err);
      return null;
    }
  }

  static async softDeleteJob(id: string): Promise<void> {
    try {
      const historyCol = await getCollection<HistoricalJob>('jobs_history');
      const listingsCol = await getCollection<JobListing>('job_listings');

      await historyCol.updateOne({ id }, { $set: { isDeleted: true, updatedAt: new Date() } });
      await listingsCol.updateOne({ id }, { $set: { isDeleted: true, updatedAt: new Date() } });
      console.log(`JobRepository: Soft deleted job ${id}`);
    } catch (err) {
      console.error(`Failed to soft delete job ${id}:`, err);
      throw err;
    }
  }

  static async cleanupOldScrapedJobs(): Promise<void> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const jobListingsCol = await getCollection<JobListing>('job_listings');
      const jobsHistoryCol = await getCollection<HistoricalJob>('jobs_history');

      const oldScrapedListings = await jobListingsCol.find({
        status: 'scraped',
        createdAt: { $lt: threeMonthsAgo }
      }).toArray();

      if (oldScrapedListings.length === 0) return;

      const idsToDelete = oldScrapedListings.map((j: JobListing) => j.id);
      console.log(`JobRepository: Cleaning up ${idsToDelete.length} scraped jobs older than 3 months...`);

      await jobListingsCol.deleteMany({ id: { $in: idsToDelete } });
      await jobsHistoryCol.deleteMany({ id: { $in: idsToDelete } });
    } catch (err) {
      console.error('Failed to cleanup old scraped jobs:', err);
    }
  }
  static async updateJobFields(
    jobId: string,
    updates: Partial<Pick<Job, 'title' | 'company' | 'location' | 'description' | 'url' | 'salary'>>
  ): Promise<HistoricalJob | null> {
    try {
      const historyCol = await getCollection<HistoricalJob>('jobs_history');
      const listingsCol = await getCollection<JobListing>('job_listings');
      const artifactsCol = await getCollection<GeneratedArtifact>('generated_artifacts');

      // Build nested update object for the embedded `job` sub-document
      const jobFieldUpdates: Record<string, any> = { updatedAt: new Date() };
      for (const [key, value] of Object.entries(updates)) {
        jobFieldUpdates[`job.${key}`] = value;
      }

      // Editing job details invalidates all AI-generated materials — clear them atomically
      await historyCol.updateOne(
        { id: jobId },
        {
          $set: jobFieldUpdates,
          $unset: {
            tailoredResume: '',
            coverLetter: '',
            interviewPrep: ''
          }
        }
      );

      // Remove the generated artifact document linked to this job
      await artifactsCol.deleteMany({ jobId });

      // Mirror editable fields to job_listings as well
      const listingFieldUpdates: Record<string, any> = { updatedAt: new Date() };
      const listingKeys = ['title', 'company', 'location', 'description', 'url'] as const;
      for (const key of listingKeys) {
        if (updates[key] !== undefined) {
          listingFieldUpdates[key] = updates[key];
        }
      }
      await listingsCol.updateOne({ id: jobId }, { $set: listingFieldUpdates });

      return await historyCol.findOne({ id: jobId });
    } catch (err) {
      console.error(`Failed to update job fields for ${jobId}:`, err);
      throw err;
    }
  }
}


