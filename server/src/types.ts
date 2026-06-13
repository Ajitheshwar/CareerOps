export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url?: string;
  source: string;
}

export interface MatchResult {
  jobId: string;
  matchScore: number; // 0 to 100
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
  answerTemplate: string; // STAR template or bullet guidelines
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
