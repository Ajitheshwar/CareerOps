// src/routes/state.routes.ts
import { Router } from 'express';
import { StateController } from '../controllers/state.controller';

const router = Router();

router.get('/state', StateController.getState);
router.post('/reset', StateController.reset);
router.post('/clear-logs', StateController.clearLogs);
router.get('/stream', StateController.stream);


export default router;
