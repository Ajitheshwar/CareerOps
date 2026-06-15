// src/llm.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const JSON_PROMPT_SUFFIX = '\nIMPORTANT: You must return a valid JSON object. Do not include markdown code block syntax (like ```json ... ```).';

const HIGH_PRIORITY_MODELS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite'
];

const LOW_PRIORITY_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-3-flash'
];

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
    const client = this.geminiClient;
    if (!client) {
      console.warn('LLM Service not configured for embeddings. Returning empty array.');
      return [];
    }

    try {
      const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await this.executeWithRetry(() => model.embedContent(text));
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
  async generateText(
    prompt: string,
    systemPrompt: string,
    priority: 'high' | 'low' = 'low'
  ): Promise<string> {
    if (!this.geminiClient && !this.openaiClient) {
      throw new Error('LLM Service is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
    }

    if (this.geminiClient) {
      return this.executeWithModelFallback(priority, async (modelName) => {
        const model = this.geminiClient!.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });
        const result = await this.executeWithRetry(() => model.generateContent(prompt));
        return result.response.text().trim();
      });
    }

    if (this.openaiClient) {
      try {
        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        });
        return response.choices[0].message.content?.trim() || '';
      } catch (error) {
        console.error('OpenAI Generation failed:', error);
        throw error;
      }
    }

    throw new Error('LLM Generation failed.');
  }

  /**
   * Generates a structured JSON object from the active LLM (Gemini or OpenAI).
   */
  async generateJSON<T>(
    prompt: string,
    systemPrompt: string,
    priority: 'high' | 'low' = 'low'
  ): Promise<T> {
    if (!this.geminiClient && !this.openaiClient) {
      throw new Error('LLM Service is not configured. Please set GEMINI_API_KEY or OPENAI_API_KEY environment variables.');
    }

    let responseText = '';

    if (this.geminiClient) {
      responseText = await this.executeWithModelFallback(priority, async (modelName) => {
        const model = this.geminiClient!.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt + JSON_PROMPT_SUFFIX,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await this.executeWithRetry(() => model.generateContent(prompt));
        return result.response.text();
      });
    } else if (this.openaiClient) {
      try {
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
      } catch (error) {
        console.error('OpenAI JSON Generation failed:', error);
        throw error;
      }
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

  /**
   * Helper that executes the operation using Gemini fallback models sequentially.
   */
  private async executeWithModelFallback<T>(
    priority: 'high' | 'low',
    operation: (modelName: string) => Promise<T>
  ): Promise<T> {
    const models = priority === 'high' ? HIGH_PRIORITY_MODELS : LOW_PRIORITY_MODELS;
    let lastError: any = null;

    for (const modelName of models) {
      try {
        console.log(`LLMService [Priority: ${priority}]: Trying model "${modelName}"...`);
        return await operation(modelName);
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        console.warn(`LLMService [Priority: ${priority}]: Model "${modelName}" failed with error: ${errMsg}. Trying fallback model...`);
      }
    }

    throw new Error(`LLMService: All fallback models failed for priority ${priority}. Last error: ${lastError?.message || lastError}`);
  }

  /**
   * Wrapper to execute Gemini calls with automatic retries and backoff on rate limits (429).
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, retries = 5, initialDelayMs = 2000): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const errorString = String(error?.message || error || '');
        const isRateLimit = error?.status === 429 || 
                            errorString.includes('429') || 
                            errorString.includes('Quota exceeded') ||
                            errorString.includes('Too Many Requests');
        
        if (isRateLimit && i < retries - 1) {
          // Parse retry delay from the error message if possible
          const match = errorString.match(/retry in ([\d\.]+)s/i);
          let retryDelaySecs = 0;
          if (match) {
            retryDelaySecs = parseFloat(match[1]);
          }

          // Distinguish between per-minute limit (which is transient and has a small retry window) 
          // and per-day limit (which resets at midnight, or has very long retry durations)
          const isDailyOrExhausted = errorString.includes('daily') || 
                                     errorString.includes('PerDay') || 
                                     errorString.includes('free_tier_requests') ||
                                     retryDelaySecs > 120 || // Delay of over 2 minutes indicates daily reset delay
                                     (errorString.includes('Quota exceeded') && 
                                      !errorString.toLowerCase().includes('minute') && 
                                      !errorString.toLowerCase().includes('second'));

          if (isDailyOrExhausted) {
            console.warn(`LLMService: Daily quota or resource exhausted for current model. Throwing immediately to fallback...`);
            throw error;
          }

          let currentDelay = initialDelayMs * Math.pow(2, i);
          if (retryDelaySecs > 0) {
            currentDelay = retryDelaySecs * 1000 + 500; // Use the API's retry delay if available
          }
          
          console.warn(`LLMService: Rate limit (429) hit. Retrying in ${Math.round(currentDelay)}ms (Attempt ${i + 1}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }
}

