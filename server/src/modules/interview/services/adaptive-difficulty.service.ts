// server/src/modules/interview/services/adaptive-difficulty.service.ts
import { InterviewQuestion } from '../models/interview-session.model';

export class AdaptiveDifficultyService {
  /**
   * Evaluates previous question history to recommend the target difficulty level for the next question.
   * Target levels match the LLM prompt expected values: 'easy' | 'medium' | 'hard'.
   */
  static determineNextDifficulty(
    baseDifficulty: 'beginner' | 'intermediate' | 'advanced',
    history: InterviewQuestion[]
  ): 'easy' | 'medium' | 'hard' {
    if (history.length === 0) {
      // Map base level to starting prompt difficulty
      if (baseDifficulty === 'beginner') return 'easy';
      if (baseDifficulty === 'advanced') return 'hard';
      return 'medium';
    }

    const lastQuestion = history[history.length - 1];
    
    // 1. Check direct manual overrides on the last question
    if (lastQuestion.requestEasier) return 'easy';
    if (lastQuestion.requestHarder) return 'hard';

    // 2. Check "I Don't Know" knowledge gap flag
    if (lastQuestion.isDontKnow) {
      return 'easy'; // Drop to ease frustration and test fundamentals
    }

    // 3. Check Skip flag
    if (lastQuestion.isSkipped) {
      // Keep difficulty medium or adjust slightly down if they had low scores prior
      return 'medium';
    }

    // 4. Check evaluation scores
    const evalResult = lastQuestion.evaluation;
    if (evalResult) {
      const score = evalResult.score;
      if (score >= 85) {
        // Candidate is doing excellent -> push to hard
        return 'hard';
      }
      if (score < 60) {
        // Candidate is struggling -> drop to easy
        return 'easy';
      }
    }

    // Default to medium if stable
    return 'medium';
  }
}
