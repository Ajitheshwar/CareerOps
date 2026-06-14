// src/services/state.service.ts
import { AgentOrchestrator } from '../agents/orchestrator';
import { UserRepository } from '../repositories/user.repository';
import { AgentState, AgentLog } from '../types';
import { LLMService } from '../llm';
import * as fs from 'fs';
import * as path from 'path';

export class StateService {
  private static orchestrator = new AgentOrchestrator();
  private static initialized = false;
  private static stateListeners: ((state: AgentState) => void)[] = [];
  private static logListeners: ((log: AgentLog) => void)[] = [];

  static initialize() {
    if (this.initialized) return;

    // Register orchestrator listeners to broadcast updates
    this.orchestrator.registerListener((state) => {
      this.stateListeners.forEach((listener) => {
        try {
          listener(state);
        } catch (err) {
          console.error('Failed to notify state listener:', err);
        }
      });
    });

    this.orchestrator.registerLogListener((log) => {
      this.logListeners.forEach((listener) => {
        try {
          listener(log);
        } catch (err) {
          console.error('Failed to notify log listener:', err);
        }
      });
    });

    this.initialized = true;
  }

  static getOrchestrator(): AgentOrchestrator {
    this.initialize();
    return this.orchestrator;
  }

  static getState(): AgentState {
    this.initialize();
    return this.orchestrator.getState();
  }

  static resetState(): void {
    this.initialize();
    this.orchestrator.resetState();
  }

  static clearLogs(): void {
    this.initialize();
    this.orchestrator.clearLogs();
  }


  static onStateUpdate(cb: (state: AgentState) => void) {
    this.initialize();
    this.stateListeners.push(cb);
  }

  static onLogUpdate(cb: (log: AgentLog) => void) {
    this.initialize();
    this.logListeners.push(cb);
  }

  static async triggerSearch(
    resumeText: string,
    jobQuery: string,
    location: string,
    expectedCtc: string,
    useHistory: boolean,
    fileMetadata?: {
      tempFilePath: string;
      originalName: string;
      mimeType: string;
      size: number;
    }
  ): Promise<void> {
    this.initialize();

    let savedMetadata: any = undefined;

    // Move the temp resume to permanent storage if metadata is provided
    if (fileMetadata && fileMetadata.tempFilePath) {
      try {
        const targetFilename = `${Date.now()}-${fileMetadata.originalName}`;
        const targetPath = path.join(__dirname, '../../../workspace/resumes', targetFilename);
        
        // Ensure directory exists
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy temp file to permanent location
        if (fs.existsSync(fileMetadata.tempFilePath)) {
          fs.copyFileSync(fileMetadata.tempFilePath, targetPath);
          console.log(`StateService: Saved resume permanently to ${targetPath}`);
          
          savedMetadata = {
            originalName: fileMetadata.originalName,
            mimeType: fileMetadata.mimeType,
            size: fileMetadata.size,
            path: targetPath
          };
        }

        // Delete ALL files in the temp directory
        const tempDir = path.dirname(fileMetadata.tempFilePath);
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            const filePath = path.join(tempDir, file);
            if (fs.lstatSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          }
          console.log('StateService: Cleared all files from temp directory.');
        }
      } catch (err) {
        console.error('Failed to process temp resume storage/cleanup:', err);
      }
    }

    // Save profile and generate embedding in background
    const saveProfileWithEmbedding = async () => {
      try {
        const llm = new LLMService();
        const embedding = await llm.embedText(resumeText);
        
        await UserRepository.saveUserProfile({
          resumeText,
          jobQuery: jobQuery || 'Developer',
          location: location || 'Remote',
          expectedCtc: expectedCtc || '',
          useHistory: !!useHistory,
          embedding,
          metadata: savedMetadata
        });
        console.log('StateService: Saved user profile and embedding successfully.');
      } catch (err) {
        console.error('Failed to generate embedding or save profile during search:', err);
      }
    };

    saveProfileWithEmbedding();

    // Run search pipeline in background
    this.orchestrator
      .runJobSearchAndMatch(
        resumeText,
        jobQuery,
        location || 'Remote',
        expectedCtc || '',
        !!useHistory
      )
      .catch((err) => console.error('Error in search pipeline:', err));
  }

  static async triggerTailor(jobId: string): Promise<void> {
    this.initialize();

    // Run tailoring pipeline in background
    this.orchestrator
      .runTailoringAndPrep(jobId)
      .catch((err) => console.error('Error in tailoring pipeline:', err));
  }
}
