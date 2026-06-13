// src/routes/index.ts
import { Router } from 'express';
import profileRoutes from './profile.routes';
import jobRoutes from './job.routes';
import mentorRoutes from './mentor.routes';
import interviewRoutes from './interview.routes';
import chatRoutes from './chat.routes';
import stateRoutes from './state.routes';

const router = Router();

// Combine all route domains under /api prefix
router.use('/', profileRoutes);
router.use('/', jobRoutes);
router.use('/', mentorRoutes);
router.use('/', interviewRoutes);
router.use('/', chatRoutes);
router.use('/', stateRoutes);

export default router;
