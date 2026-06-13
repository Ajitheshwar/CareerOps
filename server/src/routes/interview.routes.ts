// src/routes/interview.routes.ts
import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/interviews', InterviewController.getInterviews);
router.post('/interviews', validateBody(['jobId', 'jobTitle', 'company']), InterviewController.saveInterview);

export default router;
