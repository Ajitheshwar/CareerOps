import { InterviewPrepData, AgentLog, LogLevel } from '../../../shared/types';
import { LLMService } from '../../../shared/llm';

export class InterviewPrepAgent {
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
    logCallback: (log: AgentLog) => void,
    existingQuestions?: string[]
  ): Promise<InterviewPrepData> {
    this.log(logCallback, 'thought', `Generating role-specific interview prep questions for "${jobTitle}" at ${company}...`);

    const systemPrompt = `You are InterviewPrepAgent, an elite tech lead and hiring manager coach.
Your job is to analyze the candidate's resume and the job description, and compile:
1. 3 highly specific interview questions (2 technical, 1 behavioral).
2. Bulleted answer templates for each question, using the STAR method for behavioral questions.
3. Relevant prep tips to help the candidate stand out.

You must return a raw JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "questions": [
    {
      "id": "string", // Unique short ID like q1, q2
      "question": "string", // The actual interview question
      "type": "technical" | "behavioral", // Type of the question
      "answerTemplate": "string", // Key points or STAR format structure for the ideal answer
      "tips": "string" // Practical tips for answering this question
    }
  ],
  "generalAdvice": "string" // Broad prep guidelines for interviewing with this company
}`;

    const prompt = `--- TARGET JOB ---
Job Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

--- RESUME TEXT ---
${resumeText}

${existingQuestions && existingQuestions.length > 0 ? `--- PREVIOUSLY GENERATED QUESTIONS (DO NOT DUPLICATE OR REPEAT) ---
${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

Please generate a fresh set of 3 questions that are different from the previously generated questions listed above. Ensure they cover different topics, levels, or angles to keep the preparation non-repetitive.` : ''}

Analyze the requirements, compare with the candidate's history, identify potential interview topics, and output the preparation guidelines JSON.`;

    try {
      this.log(logCallback, 'thought', `Sending interview prep prompt to LLM...`);
      const result = await this.llm.generateJSON<Omit<InterviewPrepData, 'jobId'>>(prompt, systemPrompt, 'high');
      
      this.log(logCallback, 'success', `Interview prep materials created for ${company}. Generated ${result.questions?.length || 0} questions.`);

      return {
        ...result,
        jobId
      };
    } catch (err: any) {
      this.log(logCallback, 'warn', `Interview prep generation failed: ${err.message}`);
      throw err;
    }
  }

  private log(callback: (log: AgentLog) => void, level: LogLevel, message: string) {
    callback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'InterviewPrep',
      level,
      message
    });
  }
}
