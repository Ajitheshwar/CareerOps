// server/src/modules/interview/services/readiness.service.ts
import { InterviewRepository } from '../repositories/interview.repository';
import { JobRepository } from '../../jobs/repositories/job.repository';
import { ReadinessCalculatorAgent } from '../agents/readiness-calculator.agent';
import { ReadinessScore } from '../models/interview-session.model';

export class ReadinessService {
  private static agent = new ReadinessCalculatorAgent();

  static async getReadiness(userId: string, jobId: string): Promise<ReadinessScore | null> {
    return await InterviewRepository.getReadiness(userId, jobId);
  }

  static async recalculateReadiness(userId: string, jobId: string): Promise<ReadinessScore> {
    // 1. Load job and match details
    let jobTitle = 'Generic Career Path';
    let company = 'General';
    let matchScore = 100;
    let matchingSkills: string[] = [];
    let skillGaps: string[] = [];

    if (jobId !== 'generic') {
      const historicalJob = await JobRepository.getJobHistoryById(jobId);
      if (!historicalJob) {
        throw new Error(`Job history not found for ID ${jobId}`);
      }
      jobTitle = historicalJob.job.title;
      company = historicalJob.job.company;
      matchScore = historicalJob.matchResult?.matchScore || 0;
      matchingSkills = historicalJob.matchResult?.matchingSkills || [];
      skillGaps = historicalJob.matchResult?.skillGaps || [];
    }

    // 2. Load recent question feedback & evaluations (max 30 questions)
    const recentQuestions = await InterviewRepository.getRecentQuestions(userId, jobId, 30);

    // 3. Format evaluations data for the LLM
    const recentEvaluations = recentQuestions.map(q => ({
      roundType: q.roundType,
      question: q.question,
      topic: q.tips || 'General',
      isSkipped: !!q.isSkipped,
      isDontKnow: !!q.isDontKnow,
      evaluation: q.evaluation
    }));

    // 4. Run the calculator agent
    const result = await this.agent.run(
      jobTitle,
      company,
      matchScore,
      matchingSkills,
      skillGaps,
      recentEvaluations
    );

    // 5. Gather trends data from history
    const confidenceTrends: { timestamp: Date; confidence: number }[] = [];
    const difficultyTrends: { timestamp: Date; difficulty: 'easy' | 'medium' | 'hard' }[] = [];
    const topicCoverageMap = new Map<string, boolean>();

    // Sort questions chronologically to build trends
    const chronologicalQuestions = [...recentQuestions].reverse();
    for (const q of chronologicalQuestions) {
      if (q.feedback) {
        confidenceTrends.push({
          timestamp: q.createdAt,
          confidence: q.feedback.confidenceAfter || q.feedback.confidenceBefore || 3
        });
        difficultyTrends.push({
          timestamp: q.createdAt,
          difficulty: q.feedback.difficultyRating || 'medium'
        });
      }
      if (q.tips) {
        topicCoverageMap.set(q.tips, !q.isSkipped && !q.isDontKnow);
      }
    }

    const topicCoverage = Array.from(topicCoverageMap.entries()).map(([topic, covered]) => ({
      topic,
      covered
    }));

    // Extract missed/skipped topics
    const skippedTopics = recentQuestions.filter(q => q.isSkipped && q.tips).map(q => q.tips as string);
    const frequentlyMissedTopics = recentQuestions
      .filter(q => !q.isSkipped && q.evaluation && q.evaluation.score < 60 && q.tips)
      .map(q => q.tips as string);

    // 6. Build the score snapshot document
    const readinessSnapshot: ReadinessScore = {
      id: Math.random().toString(36).substring(7),
      userId,
      jobId,
      overallReadiness: result.overallReadiness || 0,
      resumeDefenseReadiness: result.resumeDefenseReadiness || 0,
      technicalReadiness: result.technicalReadiness || 0,
      behavioralReadiness: result.behavioralReadiness || 0,
      systemDesignReadiness: result.systemDesignReadiness || 0,
      hiringManagerReadiness: result.hiringManagerReadiness || 0,
      strengths: result.strengths || [],
      weakAreas: result.weakAreas || [],
      frequentlyMissedTopics: Array.from(new Set(frequentlyMissedTopics)),
      skippedTopics: Array.from(new Set(skippedTopics)),
      confidenceTrends: confidenceTrends.slice(-10), // Limit to last 10 points
      difficultyTrends: difficultyTrends.slice(-10),
      topicCoverage,
      recommendedLearningAreas: result.recommendedLearningAreas || [],
      recommendedNextPracticeRound: result.recommendedNextPracticeRound || 'technical',
      updatedAt: new Date()
    } as ReadinessScore;

    // 7. Save to DB
    await InterviewRepository.saveReadiness(readinessSnapshot);

    return readinessSnapshot;
  }
}
