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
  ): Promise<{ text: string; filePath: string; originalName: string; mimeType: string; size: number }> {
    // 1. Extract plain text from PDF/DOCX resume
    const extractedText = await ResumeParserService.parseFile(filePath);
    
    // Do NOT generate embedding or save user profile to database on upload.
    // This will be done when the user triggers the job search / match analysis pipeline.

    return { 
      text: extractedText, 
      filePath, 
      originalName, 
      mimeType, 
      size 
    };
  }
}
