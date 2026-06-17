// src/controllers/chat.controller.ts
import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';

export class ChatController {
  static async evaluateAnswer(req: Request, res: Response) {
    const { question, type, userAnswer } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ error: 'question and userAnswer are required.' });
    }

    try {
      const feedback = await ChatService.evaluateAnswer(question, type, userAnswer);
      res.json({ feedback });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
