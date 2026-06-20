// server/src/modules/interview/agents/adaptive-question.agent.ts
import { LLMService } from '../../../shared/llm';
import { NEXT_QUESTION_SYSTEM_PROMPT, getNextQuestionUserPrompt } from '../prompts/next-question.prompt';

export class AdaptiveQuestionAgent {
  private llm = LLMService.getInstance();

  async run(
    resumeText: string,
    jobDesc: string,
    company: string,
    roundType: string,
    config: any,
    goals: string[],
    uncoveredTopics: string[],
    coveredTopics: string[],
    history: any[]
  ): Promise<any> {
    const prompt = getNextQuestionUserPrompt(
      resumeText,
      jobDesc,
      company,
      roundType,
      config,
      goals,
      uncoveredTopics,
      coveredTopics,
      history
    );
    try {
      return await this.llm.generateJSON<any>(prompt, NEXT_QUESTION_SYSTEM_PROMPT, 'high');
    } catch (err) {
      console.error('AdaptiveQuestionAgent failed:', err);
      throw err;
    }
  }
}
