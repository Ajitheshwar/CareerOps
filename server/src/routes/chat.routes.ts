// src/routes/chat.routes.ts
import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.post('/chat', validateBody(['question', 'userAnswer']), ChatController.evaluateAnswer);

export default router;
