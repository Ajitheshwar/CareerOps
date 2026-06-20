// server/src/modules/interview/agents/readiness-calculator.agent.ts
import { LLMService } from '../../../shared/llm';
import { READINESS_SYSTEM_PROMPT, getReadinessUserPrompt } from '../prompts/readiness.prompt';

export class ReadinessCalculatorAgent {
  private llm = LLMService.getInstance();

  async run(
    jobTitle: string,
    company: string,
    matchScore: number,
    matchingSkills: string[],
    skillGaps: string[],
    recentEvaluations: any[]
  ): Promise<any> {
    const prompt = getReadinessUserPrompt(
      jobTitle,
      company,
      matchScore,
      matchingSkills,
      skillGaps,
      recentEvaluations
    );
    try {
      return await this.llm.generateJSON<any>(prompt, READINESS_SYSTEM_PROMPT, 'high');
    } catch (err) {
      console.error('ReadinessCalculatorAgent failed:', err);
      throw err;
    }
  }
}
