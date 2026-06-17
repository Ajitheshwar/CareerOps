// src/models/job.model.ts
import { Document } from 'mongodb';
import { Job, MatchResult, TailoredResume, InterviewPrepData } from '../../../shared/types';

export interface HistoricalJob extends Document {
  id: string; // The same as Job.id
  job: Job;
  matchResult?: MatchResult;
  tailoredResume?: TailoredResume;
  coverLetter?: string;
  interviewPrep?: InterviewPrepData;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}


export interface JobListing extends Document {
  id: string; // unique ID
  title: string;
  company: string;
  description: string;
  location: string;
  requirements?: string[];
  url?: string;
  status: 'applied' | 'interviewing' | 'rejected' | 'accepted' | 'scraped';
  job_embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}


export interface GeneratedArtifact extends Document {
  id: string; // unique ID or jobId
  jobId: string;
  tailoredResume: TailoredResume;
  coverLetter: string;
  coldOutreachDraft?: string;
  createdAt: Date;
}
