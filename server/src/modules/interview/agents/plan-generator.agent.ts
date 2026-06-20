// server/src/modules/interview/agents/plan-generator.agent.ts
import { LLMService } from '../../../shared/llm';
import { PLAN_SYSTEM_PROMPT, getPlanUserPrompt } from '../prompts/plan.prompt';

export class PlanGeneratorAgent {
  private llm = LLMService.getInstance();

  async run(resumeText: string, jobTitle: string, company: string, jobDesc: string, matchResult: any): Promise<any> {
    const prompt = getPlanUserPrompt(resumeText, jobTitle, company, jobDesc, matchResult);
    try {
      return await this.llm.generateJSON<any>(prompt, PLAN_SYSTEM_PROMPT, 'high');
    } catch (err) {
      console.error('PlanGeneratorAgent failed:', err);
      throw err;
    }
  }
}
