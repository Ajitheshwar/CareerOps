// server/src/modules/interview/models/interview-session.model.ts
import { Document } from 'mongodb';

export interface QuestionFeedback {
  difficultyRating: 'easy' | 'medium' | 'hard';
  relevanceRating: 'relevant' | 'somewhat' | 'not-relevant';
  clarityRating: 'clear' | 'somewhat' | 'confusing';
  confidenceBefore: number; // 1-5
  confidenceAfter: number; // 1-5
}

export interface InterviewEvaluation {
  score: number; // 0-100
  depthScore?: number; // 0-100
  confidenceScore?: number; // 0-100
  communicationScore?: number; // 0-100
  problemSolvingScore?: number; // 0-100
  topicMasteryScore?: number; // 0-100
  categoryScores?: Record<string, number>; // system design specific metrics
  feedback: string;
  expectedAnswer?: string;
  keyConcepts?: string[];
  learningNotes?: string;
  evaluatedAt: Date;
}

export interface InterviewQuestion extends Document {
  id: string; // unique question ID
  sessionId: string;
  roundType: 'resume-defense' | 'technical' | 'behavioral' | 'system-design' | 'hiring-manager' | string;
  question: string;
  answerTemplate: string; // pre-generated ideal answer
  tips: string;
  hint?: string;
  userAnswer?: string | null;
  isSkipped?: boolean;
  isDontKnow?: boolean;
  requestEasier?: boolean;
  requestHarder?: boolean;
  feedback?: QuestionFeedback;
  evaluation?: InterviewEvaluation;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewSession extends Document {
  id: string; // unique session ID
  userId: string; // e.g. "default-user"
  jobId: string;
  jobTitle: string;
  company: string;
  type: 'full-mock' | 'resume-defense' | 'technical' | 'behavioral' | 'system-design' | 'hiring-manager' | string;
  status: 'active' | 'completed';
  config: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    focus: string[];
  };
  progress: number; // percentage completed (0-100)
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadinessScore extends Document {
  id: string;
  userId: string;
  jobId: string;
  overallReadiness: number; // 0-100
  resumeDefenseReadiness: number;
  technicalReadiness: number;
  behavioralReadiness: number;
  systemDesignReadiness: number;
  hiringManagerReadiness: number;
  strengths: string[];
  weakAreas: string[];
  frequentlyMissedTopics: string[];
  skippedTopics: string[];
  confidenceTrends: { timestamp: Date; confidence: number }[];
  difficultyTrends: { timestamp: Date; difficulty: 'easy' | 'medium' | 'hard' }[];
  topicCoverage: { topic: string; covered: boolean }[];
  recommendedLearningAreas: string[];
  recommendedNextPracticeRound: 'resume-defense' | 'technical' | 'behavioral' | 'system-design' | 'hiring-manager';
  updatedAt: Date;
}
