import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export class LLMService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiClient: OpenAI | null = null;
  private useMock: boolean = true;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.geminiClient = new GoogleGenerativeAI(geminiKey);
      this.useMock = false;
      console.log('LLMService: Initialized Google Gemini client.');
    } else if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      this.useMock = false;
      console.log('LLMService: Initialized OpenAI client.');
    } else {
      console.log('LLMService: No API keys found. Running in MOCK MODE.');
      this.useMock = true;
    }
  }

  isMock(): boolean {
    return this.useMock;
  }

  /**
   * Generates a text response from the active LLM (Gemini, OpenAI, or Mock)
   */
  async generateText(prompt: string, systemPrompt: string): Promise<string> {
    if (this.useMock) {
      return this.generateMockText(prompt, systemPrompt);
    }

    try {
      if (this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: 'gemini-1.5-flash',
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
      console.error('LLM Generation failed, falling back to mock:', error);
    }

    return this.generateMockText(prompt, systemPrompt);
  }

  /**
   * Generates a structured JSON object from the active LLM
   */
  async generateJSON<T>(prompt: string, systemPrompt: string): Promise<T> {
    if (this.useMock) {
      return this.generateMockJSON<T>(prompt, systemPrompt);
    }

    try {
      let responseText = '';

      if (this.geminiClient) {
        const model = this.geminiClient.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: systemPrompt + '\nIMPORTANT: You must return a valid JSON object. Do not include markdown code block syntax (like ```json ... ```).',
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

      // Clean up markdown wrapper if any
      const cleaned = this.cleanJSONString(responseText);
      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error('LLM JSON Generation failed, falling back to mock:', error);
      return this.generateMockJSON<T>(prompt, systemPrompt);
    }
  }

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
   * Provides high-quality mock text based on prompt keywords
   */
  private generateMockText(prompt: string, systemPrompt: string): string {
    const isCoverLetter = prompt.toLowerCase().includes('cover letter');
    if (isCoverLetter) {
      return `Dear Hiring Manager,

I am writing to express my enthusiastic interest in the position open at your company. With a strong background in frontend and full-stack software development, combined with hands-on experience building reactive user interfaces and multi-agent AI systems, I am confident in my ability to make an immediate impact on your engineering team.

My technical toolkit aligns closely with your requirements, including extensive experience with Angular, TypeScript, and modern state management patterns. Throughout my career, I have focused on writing highly optimized, clean, and maintainable code, implementing modular component architectures, and streamlining backend API communications.

What excites me most about this opportunity is your team's dedication to building cutting-edge user experiences. I am eager to apply my skills to help build responsive, high-performance web dashboards that exceed user expectations.

Thank you for your time and consideration. I welcome the opportunity to discuss how my experience and passion for visual excellence align with your team's needs.

Sincerely,
Job Applicant`;
    }

    return `This is a mock response from the LLM service. In production mode with an active GEMINI_API_KEY, this would generate live LLM analysis. Ensure your .env file is configured correctly.`;
  }

  /**
   * Provides high-quality mock structured JSON matching the system state
   */
  private generateMockJSON<T>(prompt: string, systemPrompt: string): T {
    const promptLower = prompt.toLowerCase();
    const systemLower = systemPrompt.toLowerCase();

    if (systemLower.includes('resumeanalyzer') || promptLower.includes('match') || promptLower.includes('gap')) {
      // Return a MatchResult
      const result = {
        jobId: '',
        matchScore: Math.floor(Math.random() * 25) + 70, // 70 to 94%
        fitExplanation: 'Your strong background in TypeScript and web technologies matches 80% of the core criteria. You demonstrate clear experience in modular component design, state orchestration, and RESTful API integrations.',
        matchingSkills: ['TypeScript', 'JavaScript', 'HTML5 & CSS3', 'REST APIs', 'Git', 'Agile Methodologies'],
        skillGaps: ['Angular Signals', 'NGRX/State Management', 'E2E Testing (Playwright/Cypress)', 'Server-Side Rendering (SSR)'],
        experienceRelevance: 'Your previous roles demonstrate 2+ years of software design, matching the mid-level experience requirements. Adding Angular-specific architectural achievements would bridge the gap.'
      };
      return result as unknown as T;
    }

    if (systemLower.includes('tailoring') || promptLower.includes('tailor') || promptLower.includes('bullet')) {
      // Return a TailoredResume
      const result = {
        jobId: '',
        originalSummary: 'Results-driven software engineer with experience building web applications and collaborating in teams.',
        tailoredSummary: 'Dynamic TypeScript & Angular developer specializing in high-performance web architectures, interactive dashboards, and reactive client state management. Proven track record of developing modular, reusable component systems.',
        bulletPointChanges: [
          {
            original: 'Built web user interfaces using modern framework libraries and optimized client code.',
            tailored: 'Engineered modular, standalone Angular components and implemented robust state flows using Signals, boosting load efficiency by 15%.',
            rationale: 'Aligns directly with the job description request for standalone components and performance optimization.'
          },
          {
            original: 'Worked with database APIs and handled JSON requests on the backend.',
            tailored: 'Integrated complex REST API interfaces with asynchronous Express backend servers, utilizing type-safe JSON serialization.',
            rationale: 'Demonstrates modern full-stack competencies requested in the backend section of the job posting.'
          }
        ]
      };
      return result as unknown as T;
    }

    if (systemLower.includes('interview') || promptLower.includes('interview') || promptLower.includes('prep')) {
      // Return an InterviewPrepData
      const result = {
        jobId: '',
        questions: [
          {
            id: 'q1',
            question: 'Can you explain the difference between Angular Signals and traditional RxJS Observables, and when to use each?',
            type: 'technical',
            answerTemplate: 'Signals are synchronous state containers ideal for UI values and local template binding. Observables (RxJS) are asynchronous stream events ideal for network requests, web sockets, and event timing. In a standard app, use Signals for UI state and Observables for API requests, bridging them using toSignal().',
            tips: 'Emphasize that Signals optimize change detection by tracking dependencies granularly, avoiding global zone.js traversals.'
          },
          {
            id: 'q2',
            question: 'Describe a time you had to optimize a slow-loading web application. What steps did you take?',
            type: 'behavioral',
            answerTemplate: 'Situation: A critical dashboard took 5+ seconds to load due to redundant bundle size and heavy database queries. Task: Reduce load times below 2 seconds. Action: Implemented Angular lazy loading for routes, code-splitting, optimized CSS renders, and added client-side caching. Result: Bundle size dropped by 40%, and page load completed in 1.8 seconds.',
            tips: 'Use the STAR format. Highlight specific metrics like bundle size reductions and final load times to show tangible impact.'
          },
          {
            id: 'q3',
            question: 'How do you handle cross-component communication in a standalone Angular component architecture?',
            type: 'technical',
            answerTemplate: 'For parent-child relationships, use standard @Input (or inputs in Angular 18) and @Output. For sibling components, inject a shared singleton Service exposing Signals or RxJS BehaviorSubjects. This maintains a clean unidirectional data flow without tightly coupling components.',
            tips: 'Highlight the benefits of Dependency Injection (DI) and clean state architecture in medium-to-large projects.'
          }
        ],
        generalAdvice: 'Research the company\'s core product. Be prepared to show examples of UI designs or projects where you optimized rendering speeds or managed complex server responses.'
      };
      return result as unknown as T;
    }

    return {} as T;
  }
}
