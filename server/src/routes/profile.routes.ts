// src/routes/profile.routes.ts
import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { upload } from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';

const router = Router();

router.get('/profile', ProfileController.getProfile);
router.post('/profile', validateBody(['resumeText', 'jobQuery']), ProfileController.saveProfile);
router.post('/upload-resume', upload.single('resume'), ProfileController.uploadResume);

export default router;
