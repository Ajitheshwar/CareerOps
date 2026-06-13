// src/services/profile.service.ts
import { UserRepository } from '../repositories/user.repository';
import { ResumeParserService } from './parser';
import { LLMService } from '../llm';
import { UserProfile } from '../db';

export class ProfileService {
  static async getProfile(): Promise<UserProfile | null> {
    return UserRepository.getUserProfile();
  }

  static async saveProfile(profileData: {
    resumeText: string;
    jobQuery: string;
    location: string;
    expectedCtc: string;
    useHistory: boolean;
  }): Promise<void> {
    await UserRepository.saveUserProfile({
      resumeText: profileData.resumeText,
      jobQuery: profileData.jobQuery,
      location: profileData.location || 'Remote',
      expectedCtc: profileData.expectedCtc || '',
      useHistory: !!profileData.useHistory
    });
  }

  static async processResumeUpload(
    filePath: string,
    originalName: string,
    mimeType: string,
    size: number
  ): Promise<{ text: string; filePath: string }> {
    // 1. Extract plain text from PDF/DOCX resume
    const extractedText = await ResumeParserService.parseFile(filePath);
    console.log(extractedText);
    // 2. Generate text embedding using Gemini/LLMService
    const llm = new LLMService();
    const embedding = await llm.embedText(extractedText);

    // 3. Save to user profile collection in MongoDB
    await UserRepository.saveUserProfile({
      resumeText: extractedText,
      jobQuery: 'Developer',
      location: 'Remote',
      expectedCtc: '',
      useHistory: false,
      embedding,
      metadata: {
        originalName,
        mimeType,
        size,
        path: filePath
      }
    });

    return { text: extractedText, filePath };
  }
}
