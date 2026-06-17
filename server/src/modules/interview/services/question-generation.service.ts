// server/src/modules/interview/services/question-generation.service.ts
import { InterviewRepository } from '../repositories/interview.repository';
import { JobRepository } from '../../jobs/repositories/job.repository';
import { UserRepository } from '../../profile/repositories/profile.repository';
import { AdaptiveQuestionAgent } from '../agents/adaptive-question.agent';
import { AdaptiveDifficultyService } from './adaptive-difficulty.service';
import { InterviewQuestion, InterviewSession } from '../models/interview-session.model';

export class QuestionGenerationService {
  private static agent = new AdaptiveQuestionAgent();

  static async generateNextQuestion(
    session: InterviewSession,
    roundType: string
  ): Promise<InterviewQuestion> {
    // 1. Fetch resume and job requirements
    const profile = await UserRepository.getUserProfile();
    if (!profile || !profile.resumeText) {
      throw new Error('Resume text not found. Please upload a resume first.');
    }

    const historicalJob = await JobRepository.getJobHistoryById(session.jobId);
    if (!historicalJob) {
      throw new Error(`Job details not found for ID ${session.jobId}`);
    }

    const resumeText = profile.resumeText;
    const jobDesc = historicalJob.job.description;
    const company = historicalJob.job.company;

    // 2. Fetch history of questions for this session
    const questionHistory = await InterviewRepository.getQuestionsBySession(session.id);
    const roundQuestions = questionHistory.filter(q => q.roundType === roundType);

    // 3. Compute dynamic difficulty target
    const targetDifficulty = AdaptiveDifficultyService.determineNextDifficulty(
      session.config.difficulty,
      roundQuestions
    );

    // 4. Gather round metadata
    const activeRound = session.config.focus;
    // For simplicity, we can load goals and uncovered/covered topics lists.
    // In our repository, session configuration defines goals and covered/uncovered lists.
    // Let's deduce covered and uncovered topics based on active config and history.
    const focusTopics = session.config.focus;
    const coveredTopics = Array.from(new Set(roundQuestions.filter(q => !q.isSkipped && !q.isDontKnow).map(q => q.tips)));
    const uncoveredTopics = focusTopics.filter(t => !coveredTopics.includes(t));

    const roundGoals = [
      `Cover the focus topics: ${focusTopics.join(', ')}`,
      `Evaluate applicant understanding of job requirements`,
      `Assess confidence and core competency in details`
    ];

    // Build configuration object for user prompt
    const configPromptPayload = {
      difficulty: targetDifficulty,
      focus: focusTopics,
      jobTitle: session.jobTitle
    };

    // 5. Call AdaptiveQuestionAgent
    const generated = await this.agent.run(
      resumeText,
      jobDesc,
      company,
      roundType,
      configPromptPayload,
      roundGoals,
      uncoveredTopics.length > 0 ? uncoveredTopics : focusTopics,
      coveredTopics,
      roundQuestions
    );

    // 6. Map results to InterviewQuestion model
    const questionId = Math.random().toString(36).substring(7);
    const nextQuestion: InterviewQuestion = {
      id: questionId,
      sessionId: session.id,
      roundType,
      question: generated.question,
      answerTemplate: generated.answerTemplate || 'No ideal answer template generated.',
      tips: generated.topic || generated.tips || 'General Overview',
      hint: generated.hint || 'Think about core requirements.',
      createdAt: new Date(),
      updatedAt: new Date()
    } as InterviewQuestion;

    // 7. Save to DB
    await InterviewRepository.saveQuestion(nextQuestion);

    return nextQuestion;
  }
}
