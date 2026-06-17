// server/src/modules/interview/agents/answer-evaluator.agent.ts
import { LLMService } from '../../../shared/llm';
import { EVALUATION_SYSTEM_PROMPT, getEvaluationUserPrompt } from '../prompts/evaluation.prompt';
import { SKIP_SYSTEM_PROMPT, getSkipUserPrompt } from '../prompts/skip.prompt';
import { InterviewEvaluation } from '../models/interview-session.model';

export class AnswerEvaluatorAgent {
  private llm = new LLMService();

  async evaluate(
    questionText: string,
    roundType: string,
    answerTemplate: string,
    userAnswer: string,
    feedbackRatings: any
  ): Promise<InterviewEvaluation> {
    const prompt = getEvaluationUserPrompt(questionText, roundType, answerTemplate, userAnswer, feedbackRatings);
    try {
      const result = await this.llm.generateJSON<any>(prompt, EVALUATION_SYSTEM_PROMPT, 'high');
      return {
        ...result,
        evaluatedAt: new Date()
      };
    } catch (err) {
      console.error('AnswerEvaluatorAgent evaluate failed:', err);
      throw err;
    }
  }

  async compileSkip(questionText: string, answerTemplate: string): Promise<any> {
    const prompt = getSkipUserPrompt(questionText, answerTemplate);
    try {
      return await this.llm.generateJSON<any>(prompt, SKIP_SYSTEM_PROMPT, 'high');
    } catch (err) {
      console.error('AnswerEvaluatorAgent compileSkip failed:', err);
      throw err;
    }
  }
}
