// server/src/modules/interview/controllers/interview.controller.ts
import { Request, Response } from 'express';
import { InterviewService } from '../services/interview.service';
import { EvaluationService } from '../services/evaluation.service';
import { RoundOrchestrator } from '../services/round-orchestrator.service';
import { QuestionGenerationService } from './../services/question-generation.service';
import { ReadinessService } from '../services/readiness.service';
import { InterviewRepository } from '../repositories/interview.repository';

export class InterviewController {
  static async createSession(req: Request, res: Response) {
    const { jobId, type, config } = req.body;
    const userId = 'default';

    if (!jobId || !type || !config) {
      return res.status(400).json({ error: 'jobId, type, and config are required.' });
    }

    try {
      const result = await InterviewService.createSession(userId, jobId, type, config);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getSession(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const session = await InterviewService.getSessionById(id);
      if (!session) {
        return res.status(404).json({ error: `Session ${id} not found.` });
      }
      const questions = await InterviewRepository.getQuestionsBySession(id);
      res.json({ session, questions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getSessionsByJob(req: Request, res: Response) {
    const { jobId } = req.query;
    const userId = 'default';
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required in query params.' });
    }
    try {
      const sessions = await InterviewService.getSessionsByJob(userId, jobId as string);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async submitAnswer(req: Request, res: Response) {
    const { id: sessionId, qid: questionId } = req.params;
    const { userAnswer, feedback } = req.body;
    const userId = 'default';

    if (!userAnswer || !feedback) {
      return res.status(400).json({ error: 'userAnswer and feedback are required.' });
    }

    try {
      // 1. Evaluate the answer
      const evaluation = await EvaluationService.submitAnswer(sessionId, questionId, userAnswer, feedback);

      // 2. Check round completion
      const session = await InterviewService.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');

      const roundStatus = await RoundOrchestrator.checkRoundCompletion(session, session.type);

      // 3. Pipelining next question
      let nextQuestion = null;
      if (roundStatus.completed) {
        session.status = 'completed';
        session.progress = 100;
        await InterviewRepository.saveSession(session);
      } else {
        session.progress = roundStatus.progress;
        await InterviewRepository.saveSession(session);
        nextQuestion = await QuestionGenerationService.generateNextQuestion(session, session.type);
      }

      // 4. Force recalculation of readiness score
      let readiness = null;
      try {
        readiness = await ReadinessService.recalculateReadiness(userId, session.jobId);
      } catch (readinessErr) {
        console.warn('Readiness update failed during answer submission:', readinessErr);
      }

      res.json({
        success: true,
        evaluation,
        roundStatus,
        nextQuestion,
        readiness
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async submitSkip(req: Request, res: Response) {
    const { id: sessionId, qid: questionId } = req.params;
    const userId = 'default';

    try {
      // 1. Mark skipped and build expected answers
      const evaluation = await EvaluationService.submitSkip(sessionId, questionId);

      // 2. Check round completion
      const session = await InterviewService.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');

      const roundStatus = await RoundOrchestrator.checkRoundCompletion(session, session.type);

      // 3. Pipelining next question
      let nextQuestion = null;
      if (roundStatus.completed) {
        session.status = 'completed';
        session.progress = 100;
        await InterviewRepository.saveSession(session);
      } else {
        session.progress = roundStatus.progress;
        await InterviewRepository.saveSession(session);
        nextQuestion = await QuestionGenerationService.generateNextQuestion(session, session.type);
      }

      // 4. Force recalculation of readiness score
      let readiness = null;
      try {
        readiness = await ReadinessService.recalculateReadiness(userId, session.jobId);
      } catch (readinessErr) {
        console.warn('Readiness update failed during skip submission:', readinessErr);
      }

      res.json({
        success: true,
        evaluation,
        roundStatus,
        nextQuestion,
        readiness
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async submitDontKnow(req: Request, res: Response) {
    const { id: sessionId, qid: questionId } = req.params;
    const userId = 'default';

    try {
      // 1. Mark knowledge gap and generate expectations
      const evaluation = await EvaluationService.submitDontKnow(sessionId, questionId);

      // 2. Check round completion
      const session = await InterviewService.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');

      const roundStatus = await RoundOrchestrator.checkRoundCompletion(session, session.type);

      // 3. Pipelining next question
      let nextQuestion = null;
      if (roundStatus.completed) {
        session.status = 'completed';
        session.progress = 100;
        await InterviewRepository.saveSession(session);
      } else {
        session.progress = roundStatus.progress;
        await InterviewRepository.saveSession(session);
        nextQuestion = await QuestionGenerationService.generateNextQuestion(session, session.type);
      }

      // 4. Force recalculation of readiness score
      let readiness = null;
      try {
        readiness = await ReadinessService.recalculateReadiness(userId, session.jobId);
      } catch (readinessErr) {
        console.warn('Readiness update failed during dont-know submission:', readinessErr);
      }

      res.json({
        success: true,
        evaluation,
        roundStatus,
        nextQuestion,
        readiness
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getQuestionHint(req: Request, res: Response) {
    const { qid: questionId } = req.params;
    try {
      const question = await InterviewRepository.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: `Question ${questionId} not found` });
      }
      res.json({ hint: question.hint || 'Think about core properties.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async adjustDifficulty(req: Request, res: Response) {
    const { id: sessionId, qid: questionId } = req.params;
    const { direction } = req.body;

    if (!direction || (direction !== 'easier' && direction !== 'harder')) {
      return res.status(400).json({ error: "direction must be 'easier' or 'harder'" });
    }

    try {
      await InterviewService.adjustDifficulty(sessionId, questionId, direction);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getReadiness(req: Request, res: Response) {
    const { jobId } = req.params;
    const userId = 'default';
    try {
      let readiness = await ReadinessService.getReadiness(userId, jobId);
      if (!readiness) {
        // Recalculate if not cached
        readiness = await ReadinessService.recalculateReadiness(userId, jobId);
      }
      res.json(readiness);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async forceRecalculateReadiness(req: Request, res: Response) {
    const { jobId } = req.body;
    const userId = 'default';
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required.' });
    }
    try {
      const readiness = await ReadinessService.recalculateReadiness(userId, jobId);
      res.json(readiness);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async generatePlan(req: Request, res: Response) {
    const { jobId } = req.body;
    const userId = 'default';
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required.' });
    }
    try {
      const plan = await InterviewService.generateInitialPlan(userId, jobId);
      res.json(plan);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
