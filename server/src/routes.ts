// src/routes.ts
import { Router } from 'express';
import profileRoutes from './modules/profile/routes/profile.routes';
import jobRoutes from './modules/jobs/routes/job.routes';
import stateRoutes from './modules/jobs/routes/state.routes';
import chatRoutes from './modules/chat/routes/chat.routes';
import mentorRoutes from './modules/chat/routes/mentor.routes';
import interviewRoutes from './modules/interview/routes/interview.routes';

const router = Router();

// Combine all route domains under /api prefix (which is done in app.ts)
router.use('/', profileRoutes);
router.use('/', jobRoutes);
router.use('/', stateRoutes);
router.use('/', chatRoutes);
router.use('/', mentorRoutes);
router.use('/', interviewRoutes);

export default router;
