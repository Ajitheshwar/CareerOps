// src/controllers/mentor.controller.ts
import { Request, Response } from 'express';
import { MentorService } from '../services/mentor.service';

export class MentorController {
  static async getHistory(req: Request, res: Response) {
    const uid = (req.query.userId as string) || 'default';
    try {
      const history = await MentorService.getChatHistory(uid);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async promptMentor(req: Request, res: Response) {
    const { message, userId } = req.body;
    const uid = userId || 'default';

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    try {
      const result = await MentorService.promptMentor(uid, message);
      res.json({
        success: true,
        response: result.response,
        history: result.history
      });
    } catch (err: any) {
      console.error('Mentor chat error:', err);
      res.status(500).json({ error: err.message });
    }
  }
}
