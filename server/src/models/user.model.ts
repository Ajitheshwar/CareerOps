// src/models/user.model.ts
import { Document } from 'mongodb';

export interface UserProfile extends Document {
  id: string; // "default" to reuse single document
  resumeText: string;
  jobQuery: string;
  location: string;
  expectedCtc: string;
  useHistory: boolean;
  embedding?: number[];
  metadata?: any;
  updatedAt: Date;
}
