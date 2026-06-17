// server/src/modules/interview/services/round-orchestrator.service.ts
import { InterviewQuestion, InterviewSession } from '../models/interview-session.model';
import { InterviewRepository } from '../repositories/interview.repository';

export class RoundOrchestrator {
  /**
   * Evaluates the round question history and session config to see if the current round criteria is completed.
   */
  static async checkRoundCompletion(
    session: InterviewSession,
    roundType: string
  ): Promise<{ completed: boolean; message?: string; progress: number }> {
    const questions = await InterviewRepository.getQuestionsBySession(session.id);
    const roundQuestions = questions.filter(q => q.roundType === roundType);
    
    if (roundQuestions.length === 0) {
      return { completed: false, progress: 0 };
    }

    // Filter questions that are actually acted upon (submitted, skipped, or dontknow)
    const evaluatedQuestions = roundQuestions.filter(q => q.userAnswer !== undefined || q.isSkipped || q.isDontKnow);
    const totalCount = evaluatedQuestions.length;

    if (totalCount === 0) {
      return { completed: false, progress: 0 };
    }

    // 1. Calculate average scores & confidence
    let totalScore = 0;
    let scoreCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const q of evaluatedQuestions) {
      if (q.evaluation) {
        totalScore += q.evaluation.score;
        scoreCount++;
      }
      if (q.feedback) {
        totalConfidence += q.feedback.confidenceAfter;
        confidenceCount++;
      }
    }

    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 3;

    // 2. Check topic coverage
    const focusTopics = session.config.focus;
    const coveredTopics = Array.from(
      new Set(
        evaluatedQuestions
          .filter(q => !q.isSkipped && !q.isDontKnow && q.evaluation && q.evaluation.score >= 60)
          .map(q => q.tips)
      )
    );
    const topicsRemaining = focusTopics.filter(t => !coveredTopics.includes(t));

    // Calculate progress based on evaluated questions / expected round length
    // Determine dynamic maximum questions based on performance
    let maxQuestionsLimit = 10;
    if (averageScore >= 80) {
      maxQuestionsLimit = 5; // Strong candidate completes sooner
    } else if (averageScore < 60) {
      maxQuestionsLimit = 15; // Weak candidate gets more practice
    }

    // Completion triggers:
    // A. Max question count reached
    const countCompleted = totalCount >= maxQuestionsLimit;
    
    // B. Target confidence & score criteria achieved
    const performanceCompleted = averageScore >= 75 && averageConfidence >= 4.0 && topicsRemaining.length === 0;

    // C. Minimal questions completed (at least 4) & all topics covered
    const topicsCompleted = totalCount >= 4 && topicsRemaining.length === 0;

    const completed = countCompleted || performanceCompleted || topicsCompleted;
    
    let message = '';
    if (completed) {
      if (countCompleted) {
        message = `Completed round by reaching maximum test questions limit (${maxQuestionsLimit}).`;
      } else if (performanceCompleted) {
        message = `Excellent! Completed round by hitting target topic coverage and confidence criteria.`;
      } else {
        message = `Completed round after practicing all requested topics.`;
      }
    }

    // Calculate progress percentage
    const progress = Math.min(100, Math.round((totalCount / maxQuestionsLimit) * 100));

    return {
      completed,
      message,
      progress
    };
  }
}
