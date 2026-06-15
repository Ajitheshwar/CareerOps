import { TailoredResume, BulletChange, AgentLog, LogLevel } from '../types';
import { LLMService } from '../llm';

export interface TailoringResponse {
  tailoredResume: TailoredResume;
  coverLetter: string;
}

export class TailoringAgent {
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
  ): Promise<TailoringResponse> {
    this.log(logCallback, 'thought', `Crafting resume adjustments and tailored cover letter for "${jobTitle}" at ${company}...`);

    const systemPrompt = `You are TailoringAgent, a professional resume writer and recruitment career coach.
You must review the candidate's resume and target job. Then, you will:
1. Revise their professional summary to align with the core requirements.
2. Suggest 2-3 specific bullet point updates in their work history, providing original, tailored, and rationale.
3. Write a highly persuasive 3-4 paragraph Cover Letter matching the job.

You must return a raw JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "tailoredSummary": "string", // A refined professional summary based on the resume
  "bulletPointChanges": [
    {
      "original": "string", // Bullet point from resume to replace
      "tailored": "string", // Tailored high-impact replacement bullet
      "rationale": "string" // Explanation of why this change aligns with the job post
    }
  ],
  "coverLetter": "string" // A full-length cover letter (formatted with newlines)
}`;

    const prompt = `--- TARGET JOB ---
Job Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

--- RESUME TEXT ---
${resumeText}

Analyze their history, pick out relevant bullet points, refine their summary, write a custom cover letter, and return the output JSON.`;

    try {
      this.log(logCallback, 'thought', `Sending request to LLM for tailoring suggestions and cover letter...`);
      
      interface LLMTailorOutput {
        tailoredSummary: string;
        bulletPointChanges: BulletChange[];
        coverLetter: string;
      }
      
      const result = await this.llm.generateJSON<LLMTailorOutput>(prompt, systemPrompt, 'high');
      
      this.log(logCallback, 'success', `Successfully generated tailored materials for ${company}.`);

      // Extract original summary or default if LLM didn't capture it
      let originalSummary = 'Results-driven developer.';
      const lines = resumeText.split('\n');
      if (lines.length > 0) {
        originalSummary = lines.slice(0, 3).join(' ').trim();
      }

      const tailoredResume: TailoredResume = {
        jobId,
        originalSummary,
        tailoredSummary: result.tailoredSummary,
        bulletPointChanges: result.bulletPointChanges || []
      };

      return {
        tailoredResume,
        coverLetter: result.coverLetter
      };
    } catch (err: any) {
      this.log(logCallback, 'warn', `Tailoring failed: ${err.message}`);
      throw err;
    }
  }

  private log(callback: (log: AgentLog) => void, level: LogLevel, message: string) {
    callback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'Tailoring',
      level,
      message
    });
  }
}
