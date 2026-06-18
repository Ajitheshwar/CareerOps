// client/src/app/features/interview/services/interview-api.service.ts
import { Injectable } from '@angular/core';

export interface QuestionFeedback {
  difficultyRating: 'easy' | 'medium' | 'hard';
  relevanceRating: 'relevant' | 'somewhat' | 'not-relevant';
  clarityRating: 'clear' | 'somewhat' | 'confusing';
  confidenceBefore: number;
  confidenceAfter: number;
}

export interface InterviewEvaluation {
  score: number;
  depthScore?: number;
  confidenceScore?: number;
  communicationScore?: number;
  problemSolvingScore?: number;
  topicMasteryScore?: number;
  categoryScores?: Record<string, number>;
  feedback: string;
  expectedAnswer?: string;
  keyConcepts?: string[];
  learningNotes?: string;
}

export interface InterviewQuestion {
  id: string;
  sessionId: string;
  roundType: string;
  question: string;
  answerTemplate: string; // pre-generated, hidden until answered/skipped
  tips: string;
  hint?: string;
  userAnswer?: string | null;
  isSkipped?: boolean;
  isDontKnow?: boolean;
  requestEasier?: boolean;
  requestHarder?: boolean;
  feedback?: QuestionFeedback;
  evaluation?: InterviewEvaluation;
  createdAt: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  type: 'full-mock' | 'resume-defense' | 'technical' | 'behavioral' | 'system-design' | 'hiring-manager' | string;
  status: 'active' | 'completed';
  config: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    focus: string[];
  };
  progress: number;
  createdAt: string;
  questions?: InterviewQuestion[];
}

export interface ReadinessScore {
  id: string;
  userId: string;
  jobId: string;
  overallReadiness: number;
  resumeDefenseReadiness: number;
  technicalReadiness: number;
  behavioralReadiness: number;
  systemDesignReadiness: number;
  hiringManagerReadiness: number;
  strengths: string[];
  weakAreas: string[];
  frequentlyMissedTopics: string[];
  skippedTopics: string[];
  confidenceTrends: { timestamp: string; confidence: number }[];
  difficultyTrends: { timestamp: string; difficulty: 'easy' | 'medium' | 'hard' }[];
  topicCoverage: { topic: string; covered: boolean }[];
  recommendedLearningAreas: string[];
  recommendedNextPracticeRound: 'resume-defense' | 'technical' | 'behavioral' | 'system-design' | 'hiring-manager';
  updatedAt: string;
}

const API_BASE = 'http://localhost:5000/api';

@Injectable({
  providedIn: 'root'
})
export class InterviewApiService {

  async createSession(jobId: string, type: string, config: { difficulty: string; focus: string[] }): Promise<{ session: InterviewSession; firstQuestion: InterviewQuestion }> {
    const res = await fetch(`${API_BASE}/interview/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, type, config })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create interview session');
    }
    return await res.json();
  }

  async getSession(id: string): Promise<{ session: InterviewSession; questions: InterviewQuestion[] }> {
    const res = await fetch(`${API_BASE}/interview/sessions/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch session details');
    }
    return await res.json();
  }

  async getSessionsByJob(jobId: string): Promise<InterviewSession[]> {
    const res = await fetch(`${API_BASE}/interview/sessions/by-job?jobId=${jobId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch sessions for this job');
    }
    return await res.json();
  }

  async submitAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: string,
    feedback: QuestionFeedback
  ): Promise<{ evaluation: InterviewEvaluation; roundStatus: any; nextQuestion: InterviewQuestion | null; readiness: ReadinessScore }> {
    const res = await fetch(`${API_BASE}/interview/sessions/${sessionId}/questions/${questionId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAnswer, feedback })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit answer');
    }
    return await res.json();
  }

  async submitSkip(
    sessionId: string,
    questionId: string
  ): Promise<{ evaluation: InterviewEvaluation; roundStatus: any; nextQuestion: InterviewQuestion | null; readiness: ReadinessScore }> {
    const res = await fetch(`${API_BASE}/interview/sessions/${sessionId}/questions/${questionId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to skip question');
    }
    return await res.json();
  }

  async submitDontKnow(
    sessionId: string,
    questionId: string
  ): Promise<{ evaluation: InterviewEvaluation; roundStatus: any; nextQuestion: InterviewQuestion | null; readiness: ReadinessScore }> {
    const res = await fetch(`${API_BASE}/interview/sessions/${sessionId}/questions/${questionId}/dont-know`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit gap report');
    }
    return await res.json();
  }

  async getHint(questionId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/interview/sessions/questions/${questionId}/hint`);
    if (!res.ok) {
      return 'Think about foundational requirements.';
    }
    const data = await res.json();
    return data.hint;
  }

  async adjustDifficulty(sessionId: string, questionId: string, direction: 'easier' | 'harder'): Promise<void> {
    const res = await fetch(`${API_BASE}/interview/sessions/${sessionId}/questions/${questionId}/adjust-difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction })
    });
    if (!res.ok) {
      throw new Error('Failed to adjust difficulty setting');
    }
  }

  async getReadiness(jobId: string): Promise<ReadinessScore> {
    const res = await fetch(`${API_BASE}/interview/readiness/${jobId}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch readiness score');
    }
    return await res.json();
  }

  async generatePlan(jobId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/interview/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate prep plan');
    }
    return await res.json();
  }
}
