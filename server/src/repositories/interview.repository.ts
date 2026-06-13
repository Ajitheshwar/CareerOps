// src/repositories/interview.repository.ts
import { getCollection, MockInterview } from '../db';

export class InterviewRepository {
  static async saveMockInterview(interview: MockInterview): Promise<void> {
    try {
      const col = await getCollection<MockInterview>('mock_interviews');
      await col.updateOne(
        { id: interview.id },
        { $set: interview },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save mock interview:', err);
      throw err;
    }
  }

  static async getMockInterviews(): Promise<MockInterview[]> {
    try {
      const col = await getCollection<MockInterview>('mock_interviews');
      return await col.find({}).sort({ createdAt: -1 }).toArray();
    } catch (err) {
      console.error('Failed to get mock interviews:', err);
      return [];
    }
  }
}
