// server/src/modules/interview/routes/interview.routes.ts
import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { InterviewController as InterviewLegacyController } from '../controllers/interview-legacy.controller';
import { validateBody } from '../../../shared/middlewares/validate.middleware';

const router = Router();

// Adaptive Interview Engine
router.post('/interview/sessions', validateBody(['jobId', 'type', 'config']), InterviewController.createSession);
router.get('/interview/sessions/by-job', InterviewController.getSessionsByJob);
router.get('/interview/sessions/:id', InterviewController.getSession);

router.post('/interview/sessions/:id/questions/:qid/submit', validateBody(['userAnswer', 'feedback']), InterviewController.submitAnswer);
router.post('/interview/sessions/:id/questions/:qid/skip', InterviewController.submitSkip);
router.post('/interview/sessions/:id/questions/:qid/dont-know', InterviewController.submitDontKnow);
router.get('/interview/sessions/questions/:qid/hint', InterviewController.getQuestionHint);
router.post('/interview/sessions/:id/questions/:qid/adjust-difficulty', validateBody(['direction']), InterviewController.adjustDifficulty);

router.get('/interview/readiness/:jobId', InterviewController.getReadiness);
router.post('/interview/readiness/calculate', validateBody(['jobId']), InterviewController.forceRecalculateReadiness);
router.post('/interview/plan', validateBody(['jobId']), InterviewController.generatePlan);

// Legacy Mock Interview History
router.get('/interviews', InterviewLegacyController.getInterviews);
router.post('/interviews', validateBody(['jobId', 'jobTitle', 'company']), InterviewLegacyController.saveInterview);
router.patch('/interviews/:id/action-item', InterviewLegacyController.patchActionItem);

export default router;

