// src/controllers/interview.controller.ts
import { Request, Response } from 'express';
import { InterviewService } from '../services/interview-legacy.service';

export class InterviewController {
  static async getInterviews(req: Request, res: Response) {
    try {
      const interviews = await InterviewService.getInterviews();
      res.json(interviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async saveInterview(req: Request, res: Response) {
    const { jobId, jobTitle, company, transcript, performanceScore, feedback, actionItems, id } = req.body;

    try {
      const interviewId = await InterviewService.saveInterview({
        id,
        jobId,
        jobTitle,
        company,
        transcript,
        performanceScore,
        feedback,
        actionItems
      });
      res.json({ success: true, id: interviewId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
