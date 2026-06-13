// src/controllers/profile.controller.ts
import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';

export class ProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      const profile = await ProfileService.getProfile();
      res.json(profile || { resumeText: '', jobQuery: '', location: '', expectedCtc: '', useHistory: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async saveProfile(req: Request, res: Response) {
    const { resumeText, jobQuery, location, expectedCtc, useHistory } = req.body;
    try {
      await ProfileService.saveProfile({
        resumeText,
        jobQuery,
        location,
        expectedCtc,
        useHistory
      });
      res.json({ success: true, message: 'Profile saved successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async uploadResume(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const result = await ProfileService.processResumeUpload(
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      res.json({
        success: true,
        message: 'Resume parsed and uploaded successfully.',
        text: result.text,
        filePath: result.filePath
      });
    } catch (err: any) {
      console.error('Failed to parse and upload resume:', err);
      res.status(500).json({ error: err.message });
    }
  }
}
