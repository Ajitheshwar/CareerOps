// src/services/chat.service.ts
import { LLMService } from '../../../shared/llm';

export class ChatService {
  static async evaluateAnswer(question: string, type: string, userAnswer: string): Promise<string> {
    const llm = LLMService.getInstance();

    const systemPrompt = `You are a professional technical interviewer and executive career coach. 
Evaluate the candidate's response to the interview question.
Provide constructive feedback (3-4 bullet points or short paragraphs) detailing:
1. Strengths: What they stated correctly or framed well.
2. Areas of Improvement: Missing elements or weak phrasing.
3. Formatting: Suggesting stronger action verbs and metrics.
Keep the tone encouraging, direct, and professional.`;

    const prompt = `Question: "${question}" (Type: ${type})
Candidate's Response: "${userAnswer}"

Please evaluate this answer and provide actionable feedback.`;

    return await llm.generateText(prompt, systemPrompt);
  }
}
