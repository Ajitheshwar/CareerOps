// server/src/modules/interview/services/interview.service.ts
import { InterviewRepository } from '../repositories/interview.repository';
import { JobRepository } from '../../jobs/repositories/job.repository';
import { UserRepository } from '../../profile/repositories/profile.repository';
import { PlanGeneratorAgent } from '../agents/plan-generator.agent';
import { InterviewSession, InterviewQuestion } from '../models/interview-session.model';
import { QuestionGenerationService } from './question-generation.service';
import { ReadinessService } from './readiness.service';

export class InterviewService {
  private static planAgent = new PlanGeneratorAgent();

  static async createSession(
    userId: string,
    jobId: string,
    type: string,
    config: {
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      focus: string[];
    }
  ): Promise<{ session: InterviewSession; firstQuestion: InterviewQuestion }> {
    // 1. Fetch Job context
    let jobTitle = 'Generic Career Path';
    let company = 'General';

    if (jobId !== 'generic') {
      const historicalJob = await JobRepository.getJobHistoryById(jobId);
      if (!historicalJob) {
        throw new Error(`Job details not found for ID ${jobId}`);
      }
      jobTitle = historicalJob.job.title;
      company = historicalJob.job.company;
    }

    // 2. Load resume text to generate round goals
    const profile = await UserRepository.getUserProfile();
    const resumeText = profile?.resumeText || '';

    // 3. Check if there is already an active session of this type for this job. If so, return it instead of duplicating.
    const active = await InterviewRepository.getActiveSession(userId, jobId, type);
    if (active) {
      const questions = await InterviewRepository.getQuestionsBySession(active.id);
      const unanswered = questions.find(q => q.userAnswer === undefined && !q.isSkipped && !q.isDontKnow);
      if (unanswered) {
        return { session: active, firstQuestion: unanswered };
      }
      // If no unanswered questions exist, generate a next one
      const nextQ = await QuestionGenerationService.generateNextQuestion(active, type);
      return { session: active, firstQuestion: nextQ };
    }

    // 4. Create new InterviewSession
    const sessionId = Math.random().toString(36).substring(7);
    const session: InterviewSession = {
      id: sessionId,
      userId,
      jobId,
      jobTitle,
      company,
      type,
      status: 'active',
      config,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as InterviewSession;

    await InterviewRepository.saveSession(session);

    // 5. Generate FIRST Question immediately (saves user round startup time!)
    const firstQuestion = await QuestionGenerationService.generateNextQuestion(session, type);

    // 6. Proactively trigger readiness calculation to verify initial scores
    try {
      await ReadinessService.recalculateReadiness(userId, jobId);
    } catch (readinessErr) {
      console.warn('Failed to compile initial readiness dashboard:', readinessErr);
    }

    return { session, firstQuestion };
  }

  static async getSessionById(sessionId: string): Promise<InterviewSession | null> {
    return await InterviewRepository.getSessionById(sessionId);
  }

  static async getSessionsByJob(userId: string, jobId: string): Promise<InterviewSession[]> {
    return await InterviewRepository.getSessionsByJob(userId, jobId);
  }

  static async adjustDifficulty(
    sessionId: string,
    questionId: string,
    direction: 'easier' | 'harder'
  ): Promise<void> {
    const question = await InterviewRepository.getQuestionById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    if (direction === 'easier') {
      question.requestEasier = true;
      question.requestHarder = false;
    } else {
      question.requestHarder = true;
      question.requestEasier = false;
    }

    question.updatedAt = new Date();
    await InterviewRepository.saveQuestion(question);
  }

  static async generateInitialPlan(userId: string, jobId: string): Promise<any> {
    const profile = await UserRepository.getUserProfile();
    if (!profile || !profile.resumeText) {
      throw new Error('Resume text not found. Please upload a resume first.');
    }

    if (jobId === 'generic') {
      return await this.planAgent.run(
        profile.resumeText,
        'Generic Career Path',
        'General',
        'General interview prep based on the candidate\'s resume profile.',
        { matchScore: 100, matchingSkills: [], skillGaps: [], fitExplanation: 'General evaluation of candidate resume profile' }
      );
    }

    const historicalJob = await JobRepository.getJobHistoryById(jobId);
    if (!historicalJob) {
      throw new Error(`Job details not found for ID ${jobId}`);
    }

    return await this.planAgent.run(
      profile.resumeText,
      historicalJob.job.title,
      historicalJob.job.company,
      historicalJob.job.description,
      historicalJob.matchResult
    );
  }
}
