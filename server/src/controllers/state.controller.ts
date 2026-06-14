// src/controllers/state.controller.ts
import { Request, Response } from 'express';
import { StateService } from '../services/state.service';

export class StateController {
  private static sseClients: Response[] = [];
  private static initialized = false;

  private static initializeOrchestrator() {
    if (StateController.initialized) return;

    // Register state service listeners to stream updates to clients
    StateService.onStateUpdate((state) => {
      StateController.sendSSEEvent('state', state);
    });

    StateService.onLogUpdate((log) => {
      StateController.sendSSEEvent('log', log);
    });

    StateController.initialized = true;
  }

  private static sendSSEEvent(type: string, data: any) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    StateController.sseClients.forEach((client) => {
      try {
        client.write(payload);
      } catch (err) {
        // client connection probably closed
      }
    });
  }

  static getState(req: Request, res: Response) {
    StateController.initializeOrchestrator();
    res.json(StateService.getState());
  }

  static reset(req: Request, res: Response) {
    StateController.initializeOrchestrator();
    StateService.resetState();
    res.json({ success: true, message: 'State reset successfully.' });
  }

  static clearLogs(req: Request, res: Response) {
    StateController.initializeOrchestrator();
    StateService.clearLogs();
    res.json({ success: true, message: 'Logs cleared successfully.' });
  }


  static async triggerSearch(req: Request, res: Response) {
    StateController.initializeOrchestrator();
    const { resumeText, jobQuery, location, expectedCtc, useHistory, fileMetadata } = req.body;
    
    if (!resumeText || !jobQuery) {
      return res.status(400).json({ error: 'resumeText and jobQuery are required.' });
    }

    await StateService.triggerSearch(
      resumeText,
      jobQuery,
      location || 'Remote',
      expectedCtc || '',
      !!useHistory,
      fileMetadata
    );

    res.json({ success: true, message: 'Job search and matching pipeline started.' });
  }

  static async triggerTailor(req: Request, res: Response) {
    StateController.initializeOrchestrator();
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required.' });
    }

    await StateService.triggerTailor(jobId);

    res.json({ success: true, message: 'Tailoring and interview preparation pipeline started.' });
  }

  static stream(req: Request, res: Response) {
    StateController.initializeOrchestrator();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish connection

    // Send initial state immediately
    res.write(`event: state\ndata: ${JSON.stringify(StateService.getState())}\n\n`);

    StateController.sseClients.push(res);

    req.on('close', () => {
      StateController.sseClients = StateController.sseClients.filter((client) => client !== res);
    });
  }
}
