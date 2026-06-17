// server/src/modules/interview/repositories/interview.repository.ts
import { getCollection } from '../../../shared/db';
import { InterviewSession, InterviewQuestion, ReadinessScore } from '../models/interview-session.model';

export class InterviewRepository {
  static async saveSession(session: InterviewSession): Promise<void> {
    try {
      const col = await getCollection<InterviewSession>('interview_sessions');
      await col.updateOne(
        { id: session.id },
        { $set: session },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save interview session:', err);
      throw err;
    }
  }

  static async getSessionById(id: string): Promise<InterviewSession | null> {
    try {
      const col = await getCollection<InterviewSession>('interview_sessions');
      return await col.findOne({ id });
    } catch (err) {
      console.error(`Failed to get interview session ${id}:`, err);
      return null;
    }
  }

  static async getActiveSession(userId: string, jobId: string, type: string): Promise<InterviewSession | null> {
    try {
      const col = await getCollection<InterviewSession>('interview_sessions');
      return await col.findOne({ userId, jobId, type, status: 'active' });
    } catch (err) {
      console.error('Failed to get active session:', err);
      return null;
    }
  }

  static async getSessionsByJob(userId: string, jobId: string): Promise<InterviewSession[]> {
    try {
      const col = await getCollection<InterviewSession>('interview_sessions');
      return await col.find({ userId, jobId }).sort({ updatedAt: -1 }).toArray();
    } catch (err) {
      console.error('Failed to get sessions by job:', err);
      return [];
    }
  }

  static async saveQuestion(question: InterviewQuestion): Promise<void> {
    try {
      const col = await getCollection<InterviewQuestion>('interview_questions');
      await col.updateOne(
        { id: question.id },
        { $set: question },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save interview question:', err);
      throw err;
    }
  }

  static async getQuestionById(id: string): Promise<InterviewQuestion | null> {
    try {
      const col = await getCollection<InterviewQuestion>('interview_questions');
      return await col.findOne({ id });
    } catch (err) {
      console.error(`Failed to get question ${id}:`, err);
      return null;
    }
  }

  static async getQuestionsBySession(sessionId: string): Promise<InterviewQuestion[]> {
    try {
      const col = await getCollection<InterviewQuestion>('interview_questions');
      return await col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
    } catch (err) {
      console.error(`Failed to get questions for session ${sessionId}:`, err);
      return [];
    }
  }

  static async saveReadiness(readiness: ReadinessScore): Promise<void> {
    try {
      const col = await getCollection<ReadinessScore>('readiness_scores');
      await col.updateOne(
        { userId: readiness.userId, jobId: readiness.jobId },
        { $set: readiness },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save readiness score:', err);
      throw err;
    }
  }

  static async getReadiness(userId: string, jobId: string): Promise<ReadinessScore | null> {
    try {
      const col = await getCollection<ReadinessScore>('readiness_scores');
      return await col.findOne({ userId, jobId });
    } catch (err) {
      console.error(`Failed to get readiness score for user ${userId} and job ${jobId}:`, err);
      return null;
    }
  }

  static async getRecentQuestions(userId: string, jobId: string, limit: number = 30): Promise<InterviewQuestion[]> {
    try {
      const sessionCol = await getCollection<InterviewSession>('interview_sessions');
      const sessions = await sessionCol.find({ userId, jobId }).toArray();
      const sessionIds = sessions.map((s: InterviewSession) => s.id);
      
      if (sessionIds.length === 0) return [];
      
      const questionCol = await getCollection<InterviewQuestion>('interview_questions');
      return await questionCol
        .find({ sessionId: { $in: sessionIds } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (err) {
      console.error('Failed to retrieve recent questions for readiness context:', err);
      return [];
    }
  }
}
