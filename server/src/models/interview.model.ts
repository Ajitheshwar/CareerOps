// src/models/interview.model.ts
import { Document } from 'mongodb';

export interface MockInterview extends Document {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  transcript: { role: 'interviewer' | 'candidate'; text: string; timestamp: Date }[];
  performanceScore: number;
  feedback: string[];
  actionItems: string[];
  createdAt: Date;
}
