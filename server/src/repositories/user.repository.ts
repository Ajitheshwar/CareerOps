// src/repositories/user.repository.ts
import { getCollection, UserProfile } from '../db';

export class UserRepository {
  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const col = await getCollection<UserProfile>('user_profile');
      return await col.findOne({ id: 'default' });
    } catch (err) {
      console.error('Failed to get user profile from DB:', err);
      return null;
    }
  }

  static async saveUserProfile(profile: Omit<UserProfile, 'id' | 'updatedAt'>): Promise<void> {
    try {
      const col = await getCollection<UserProfile>('user_profile');
      await col.updateOne(
        { id: 'default' },
        { 
          $set: {
            resumeText: profile.resumeText,
            jobQuery: profile.jobQuery,
            location: profile.location,
            expectedCtc: profile.expectedCtc,
            useHistory: profile.useHistory,
            embedding: profile.embedding,
            metadata: profile.metadata,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save user profile to DB:', err);
      throw err;
    }
  }
}
