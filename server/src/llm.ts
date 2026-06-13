// src/llm.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const JSON_PROMPT_SUFFIX = '\nIMPORTANT: You must return a valid JSON object. Do not include markdown code block syntax (like ```json ... ```).';

export class LLMService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiClient: OpenAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      console.log('LLMService: Initialized Google Gemini client.');
    } else if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      console.log('LLMService: Initialized OpenAI client.');
    } else {
      console.warn('LLMService: No API keys found. LLM queries will fail.');
    }
  }

  /**
   * Generates a 768-dimensional vector embedding for the given text.
   * Returns an empty array if the service is not configured.
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.geminiClient) {
      console.warn('LLM Service not configured for embeddings. Returning empty array.');
      return [];
    }

    try {
      const model = this.geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
    } catch (err) {
      console.error('LLM Embedding generation failed:', err);
    }

    return [];
  }

  /**
   * Generates a text response from the active LLM (Gemini or OpenAI).
   */
  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    if (!this.geminiClient && !this.openaiClient) {
      throw new Error('LLM Service is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
    }

    try {
      if (this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: 'gemini-3.5-flash',
          systemInstruction: systemPrompt,
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return text.trim();
      }

      if (this.openaiClient) {
        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        });
        return response.choices[0].message.content?.trim() || '';
      }
    } catch (error) {
      console.error('LLM Generation failed:', error);
    }

    throw new Error('LLM Generation failed.');
  }

  /**
   * Generates a structured JSON object from the active LLM (Gemini or OpenAI).
   */
  async generateJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
    if (!this.geminiClient && !this.openaiClient) {
      throw new Error('LLM Service is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
    }

    let responseText = '';

    if (this.geminiClient) {
      const model = this.geminiClient.getGenerativeModel({
        model: 'gemini-3.5-flash',
        systemInstruction: systemPrompt + JSON_PROMPT_SUFFIX,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } else if (this.openaiClient) {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      responseText = response.choices[0].message.content || '{}';
    }

    const cleaned = this.cleanJSONString(responseText);
    return JSON.parse(cleaned) as T;
  }

  /**
   * Cleans markdown JSON blocks (```json ... ```) out of LLM response text.
   */
  private cleanJSONString(str: string): string {
    let cleaned = str.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }
}
