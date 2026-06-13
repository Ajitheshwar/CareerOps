// src/services/state.service.ts
import { AgentOrchestrator } from '../agents/orchestrator';
import { UserRepository } from '../repositories/user.repository';
import { AgentState, AgentLog } from '../types';

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
    useHistory: boolean
  ): Promise<void> {
    this.initialize();

    // Save profile to database in background
    UserRepository.saveUserProfile({
      resumeText,
      jobQuery,
      location: location || 'Remote',
      expectedCtc: expectedCtc || '',
      useHistory: !!useHistory
    }).catch((err) => console.error('Failed to save profile during search:', err));

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
