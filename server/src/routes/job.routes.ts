// src/routes/job.routes.ts
import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { StateController } from '../controllers/state.controller';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/jobs', JobController.getJobs);
router.post('/jobs', validateBody(['title', 'company']), JobController.createJob);
router.post('/jobs/status', validateBody(['id', 'status']), JobController.updateStatus);
router.post('/search', validateBody(['resumeText', 'jobQuery']), StateController.triggerSearch);
router.post('/tailor', validateBody(['jobId']), StateController.triggerTailor);

export default router;
