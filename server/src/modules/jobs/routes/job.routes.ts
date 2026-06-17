// src/routes/job.routes.ts
import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { StateController } from '../controllers/state.controller';
import { validateBody } from '../../../shared/middlewares/validate.middleware';

const router = Router();

router.get('/jobs', JobController.getJobs);
router.get('/jobs/:id', JobController.getJobHistoryById);
router.post('/jobs', validateBody(['title', 'company']), JobController.createJob);
router.post('/jobs/status', validateBody(['id', 'status']), JobController.updateStatus);
router.post('/jobs/analyze', validateBody(['jobId']), JobController.analyzeSingleJob);
router.post('/jobs/delete', validateBody(['jobId']), JobController.deleteJob);
router.post('/jobs/add-and-analyze', validateBody(['title', 'company', 'description', 'url']), JobController.addAndAnalyzeJob);
router.post('/search', validateBody(['resumeText', 'jobQuery']), StateController.triggerSearch);


router.post('/tailor', validateBody(['jobId']), StateController.triggerTailor);
router.post('/prep-interview', validateBody(['jobId']), StateController.triggerPrepInterview);

export default router;
