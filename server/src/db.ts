import { MongoClient, Db, Collection, Document, ServerApiVersion } from 'mongodb';
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { UserRepository } from './repositories/user.repository';
import { JobRepository } from './repositories/job.repository';
import { ChatRepository } from './repositories/chat.repository';
import { InterviewRepository } from './repositories/interview.repository';

// Re-export model schemas for compatibility and modular imports
export { UserProfile } from './models/user.model';
export { JobListing, HistoricalJob, GeneratedArtifact } from './models/job.model';
export { ChatHistory } from './models/chat.model';
export { MockInterview } from './models/interview.model';

// Load environment variables before any connection is initiated (force override parent cache)
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

// Set DNS servers to public ones to ensure SRV record resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

let client: MongoClient | null = null;
let db: Db | null = null;

function sanitizeMongoUri(uri: string): string {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
  if (!match) return uri;

  const [_, protocol, username, password, host, rest] = match;
  if (password.includes('@') && !password.includes('%40')) {
    const encodedPassword = encodeURIComponent(password);
    return `${protocol}${username}:${encodedPassword}@${host}${rest}`;
  }
  return uri;
}

export async function connectDB(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  const sanitizedUri = sanitizeMongoUri(uri);

  client = new MongoClient(sanitizedUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  await client.connect();
  db = client.db();
  console.log('MongoDB: Connected successfully to database:', db.databaseName);
  return db;
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await connectDB();
  return database.collection<T>(name);
}

// User Profile Delegates
export async function getUserProfile() {
  return UserRepository.getUserProfile();
}
export async function saveUserProfile(profile: any) {
  return UserRepository.saveUserProfile(profile);
}

// Job Listings Delegates
export async function saveJobListing(listing: any) {
  return JobRepository.saveJobListing(listing);
}
export async function getJobListings() {
  return JobRepository.getJobListings();
}
export async function updateJobListingStatus(id: string, status: any) {
  return JobRepository.updateJobListingStatus(id, status);
}

// Mock Interviews Delegates
export async function saveMockInterview(interview: any) {
  return InterviewRepository.saveMockInterview(interview);
}
export async function getMockInterviews() {
  return InterviewRepository.getMockInterviews();
}

// Generated Artifacts Delegates
export async function saveGeneratedArtifact(artifact: any) {
  return JobRepository.saveGeneratedArtifact(artifact);
}
export async function getGeneratedArtifactByJob(jobId: string) {
  return JobRepository.getGeneratedArtifactByJob(jobId);
}

// Chat History Delegates
export async function saveChatHistory(userId: string, messages: any[]) {
  return ChatRepository.saveChatHistory(userId, messages);
}
export async function getChatHistory(userId: string) {
  return ChatRepository.getChatHistory(userId);
}

// Legacy Job History DB Delegates
export async function saveJobHistory(job: any, matchResult?: any, tailoredResume?: any, coverLetter?: string, interviewPrep?: any) {
  return JobRepository.saveJobHistory(job, matchResult, tailoredResume, coverLetter, interviewPrep);
}
export async function updateJobTailoring(jobId: string, tailoredResume: any, coverLetter: string) {
  return JobRepository.updateJobTailoring(jobId, tailoredResume, coverLetter);
}
export async function updateJobInterviewPrep(jobId: string, interviewPrep: any) {
  return JobRepository.updateJobInterviewPrep(jobId, interviewPrep);
}
export async function getAllJobHistory() {
  return JobRepository.getAllJobHistory();
}

