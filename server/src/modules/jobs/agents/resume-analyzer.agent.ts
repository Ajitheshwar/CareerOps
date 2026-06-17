import { MatchResult, AgentLog, LogLevel } from '../../../shared/types';
import { LLMService } from '../../../shared/llm';

export class ResumeAnalyzerAgent {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  async run(
    resumeText: string,
    jobId: string,
    jobTitle: string,
    company: string,
    jobDescription: string,
    logCallback: (log: AgentLog) => void
  ): Promise<MatchResult> {
    this.log(logCallback, 'thought', `Analyzing resume compatibility for "${jobTitle}" at ${company}...`);

    const systemPrompt = `You are ResumeAnalyzerAgent, a production-grade career screening agent. 
Your objective is to compare a candidate's resume text against a specific job description.
You must return a raw JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "matchScore": number, // an integer between 0 and 100 representing suitability
  "fitExplanation": "string", // 2-3 sentences explaining why they are or aren't a fit
  "matchingSkills": ["string"], // key skills present in both resume and job description
  "skillGaps": ["string"], // required technologies or skills missing from the resume
  "experienceRelevance": "string" // summary of how well their experience duration and projects match
}`;

    const prompt = `--- TARGET JOB DESCRIPTION ---
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

--- CANDIDATE RESUME ---
${resumeText}

Analyze the resume and return the matching matrix JSON.`;

    try {
      this.log(logCallback, 'thought', `Sending resume analysis prompt to LLM...`);
      const result = await this.llm.generateJSON<Omit<MatchResult, 'jobId'>>(prompt, systemPrompt);
      
      this.log(logCallback, 'success', `Analysis completed for "${jobTitle}" at ${company}. Match score: ${result.matchScore}%`);
      
      return {
        ...result,
        jobId
      };
    } catch (err: any) {
      this.log(logCallback, 'warn', `AI analysis failed: ${err.message}`);
      throw err;
    }
  }

  private log(callback: (log: AgentLog) => void, level: LogLevel, message: string) {
    callback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'ResumeAnalyzer',
      level,
      message
    });
  }
}
