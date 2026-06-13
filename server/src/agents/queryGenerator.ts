import { LLMService } from '../llm';
import { AgentLog, LogLevel } from '../types';

export class QueryGeneratorAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async run(
    resumeText: string,
    jobQuery: string,
    location: string,
    expectedCtc: string,
    logCallback: (log: AgentLog) => void
  ): Promise<string> {
    const log = (level: LogLevel, msg: string) => logCallback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message: `[Query Generator] ${msg}`
    });

    log('thought', `Analyzing resume skills & target job: "${jobQuery}" to generate optimized dork keywords...`);

    const systemPrompt = `You are an expert recruitment coordinator. 
Given a candidate's resume and their target role, your job is to extract 2 or 3 essential, highly-distinct technical keywords or synonyms that fit their exact experience level and primary tech stack.
Return a valid JSON object matching this schema:
{
  "searchKeywords": "string containing 2-3 key technical terms separated by spaces, do not include site: or dork operators, just raw keywords",
  "explanation": "brief sentence explaining the chosen search terms based on experience level"
}`;

    const prompt = `Candidate Resume:
${resumeText}

Target Job Title: "${jobQuery}"
Target Location: "${location}"
Expected CTC: "${expectedCtc}"

Please generate the search terms. Do not include location in the searchKeywords (we append location separately). Make sure the terms align with the candidate's actual level of experience (junior vs mid vs senior) and tech stack.`;

    try {
      interface QueryOutput {
        searchKeywords: string;
        explanation: string;
      }

      const res = await this.llm.generateJSON<QueryOutput>(prompt, systemPrompt);
      const keywords = res.searchKeywords || jobQuery;
      log('success', `Generated search keywords: "${keywords}" (Reason: ${res.explanation})`);
      return keywords;
    } catch (err: any) {
      log('warn', `Query generation failed, falling back to raw title: ${err.message}`);
      return jobQuery;
    }
  }
}
