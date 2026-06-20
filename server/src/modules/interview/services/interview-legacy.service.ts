// src/services/interview.service.ts
import { InterviewRepository } from '../repositories/interview-legacy.repository';
import { MockInterview } from '../../../shared/db';

export class InterviewService {
  static async getInterviews(): Promise<MockInterview[]> {
    return InterviewRepository.getMockInterviews();
  }

  static async saveInterview(interviewData: {
    id?: string;
    jobId: string;
    jobTitle: string;
    company: string;
    transcript: { role: 'interviewer' | 'candidate'; text: string; timestamp: Date }[];
    performanceScore: number;
    feedback: string[];
    actionItems: string[];
  }): Promise<string> {
    const id = interviewData.id || Math.random().toString(36).substring(7);

    await InterviewRepository.saveMockInterview({
      id,
      jobId: interviewData.jobId || '',
      jobTitle: interviewData.jobTitle || '',
      company: interviewData.company || '',
      transcript: interviewData.transcript || [],
      performanceScore: interviewData.performanceScore || 0,
      feedback: interviewData.feedback || [],
      actionItems: interviewData.actionItems || [],
      completedActionItems: [],
      createdAt: new Date()
    });

    return id;
  }

  static async updateActionItem(id: string, item: string, checked: boolean): Promise<void> {
    return InterviewRepository.updateActionItemChecked(id, item, checked);
  }
}

