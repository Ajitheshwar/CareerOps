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

  static async patchActionItem(req: Request, res: Response) {
    const { id } = req.params;
    const { item, checked } = req.body;

    if (typeof item !== 'string' || item.trim() === '') {
      res.status(400).json({ error: 'item is required and must be a non-empty string.' });
      return;
    }
    if (typeof checked !== 'boolean') {
      res.status(400).json({ error: 'checked must be a boolean.' });
      return;
    }

    try {
      await InterviewService.updateActionItem(id, item.trim(), checked);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

