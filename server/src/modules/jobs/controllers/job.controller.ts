// src/controllers/job.controller.ts
import { Request, Response } from 'express';
import { JobService } from '../services/job.service';

export class JobController {
  static async getJobs(req: Request, res: Response) {
    try {
      const jobs = await JobService.getJobs();
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getJobHistoryById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const historicalJob = await JobService.getJobHistoryById(id);
      if (!historicalJob) {
        return res.status(404).json({ error: 'Job not found in history.' });
      }
      res.json(historicalJob);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createJob(req: Request, res: Response) {
    const { title, company, description, location, requirements, url, status, id } = req.body;

    try {
      const listingId = await JobService.createJob({
        id,
        title,
        company,
        description,
        location,
        requirements,
        url,
        status
      });

      res.json({ success: true, id: listingId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { id, status } = req.body;
    if (!id || !status) {
      return res.status(400).json({ error: 'id and status are required.' });
    }
    try {
      await JobService.updateStatus(id, status);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async analyzeSingleJob(req: Request, res: Response) {
    const { jobId, resumeText } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required.' });
    }
    try {
      const result = await JobService.analyzeSingleJob(jobId, resumeText);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async deleteJob(req: Request, res: Response) {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required.' });
    }
    try {
      await JobService.deleteJob(jobId);
      res.json({ success: true, message: 'Job soft deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async addAndAnalyzeJob(req: Request, res: Response) {
    const { title, company, description, location, url } = req.body;
    try {
      const result = await JobService.addAndAnalyzeJob({ title, company, description, location, url });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}


