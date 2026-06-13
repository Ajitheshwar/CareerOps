// src/routes/mentor.routes.ts
import { Router } from 'express';
import { MentorController } from '../controllers/mentor.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/mentor/history', MentorController.getHistory);
router.post('/mentor/chat', validateBody(['message']), MentorController.promptMentor);

export default router;
