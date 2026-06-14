export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url?: string;
  source: string;
  date?: string;
}


export interface MatchResult {
  jobId: string;
  matchScore: number | null;
  fitExplanation: string;
  matchingSkills: string[];
  skillGaps: string[];
  experienceRelevance: string;
}


export interface BulletChange {
  original: string;
  tailored: string;
  rationale: string;
}

export interface TailoredResume {
  jobId: string;
  originalSummary: string;
  tailoredSummary: string;
  bulletPointChanges: BulletChange[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'technical' | 'behavioral';
  answerTemplate: string;
  tips: string;
}

export interface InterviewPrepData {
  jobId: string;
  questions: InterviewQuestion[];
  generalAdvice: string;
}

export type AgentName = 'Orchestrator' | 'JobSearch' | 'ResumeAnalyzer' | 'Tailoring' | 'InterviewPrep';
export type LogLevel = 'info' | 'warn' | 'success' | 'thought';

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: AgentName;
  level: LogLevel;
  message: string;
}

export interface AgentState {
  resumeText: string;
  jobQuery: string;
  location: string;
  expectedCtc?: string;
  useHistory?: boolean;
  foundJobs: Job[];
  selectedJobId?: string;
  matchingResults: MatchResult[];
  tailoredResumes: { [jobId: string]: TailoredResume };
  coverLetters: { [jobId: string]: string };
  interviewPrep: { [jobId: string]: InterviewPrepData };
  logs: AgentLog[];
  status: 'idle' | 'searching' | 'matching' | 'tailoring' | 'preparing' | 'completed' | 'error';
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  requirements?: string[];
  url?: string;
  status: 'applied' | 'interviewing' | 'rejected' | 'accepted' | 'scraped';
}

export interface MockInterview {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  transcript: { role: 'interviewer' | 'candidate'; text: string; timestamp: Date }[];
  performanceScore: number;
  feedback: string[];
  actionItems: string[];
  createdAt: Date;
}

export interface GeneratedArtifact {
  id: string;
  jobId: string;
  tailoredResume: TailoredResume;
  coverLetter: string;
  coldOutreachDraft?: string;
  createdAt: Date;
}

