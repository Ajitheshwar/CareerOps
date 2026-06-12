import { Injectable, signal, computed } from '@angular/core';
import { AgentState, AgentLog, Job, MatchResult } from '../types';

const API_BASE = 'http://localhost:5000/api';

const initialState: AgentState = {
  resumeText: '',
  jobQuery: '',
  location: '',
  foundJobs: [],
  matchingResults: [],
  tailoredResumes: {},
  coverLetters: {},
  interviewPrep: {},
  logs: [],
  status: 'idle'
};

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private stateSignal = signal<AgentState>(initialState);
  private eventSource: EventSource | null = null;

  // Read-only public signals
  public state = this.stateSignal.asReadonly();
  
  public status = computed(() => this.state().status);
  public jobs = computed(() => this.state().foundJobs);
  public matches = computed(() => this.state().matchingResults);
  public logs = computed(() => this.state().logs);
  public selectedJobId = computed(() => this.state().selectedJobId);

  public selectedJob = computed(() => {
    const jobId = this.state().selectedJobId;
    return this.state().foundJobs.find(j => j.id === jobId);
  });

  public selectedMatch = computed(() => {
    const jobId = this.state().selectedJobId;
    return this.state().matchingResults.find(m => m.jobId === jobId);
  });

  public selectedTailoredResume = computed(() => {
    const jobId = this.state().selectedJobId;
    return jobId ? this.state().tailoredResumes[jobId] : undefined;
  });

  public selectedCoverLetter = computed(() => {
    const jobId = this.state().selectedJobId;
    return jobId ? this.state().coverLetters[jobId] : undefined;
  });

  public selectedInterviewPrep = computed(() => {
    const jobId = this.state().selectedJobId;
    return jobId ? this.state().interviewPrep[jobId] : undefined;
  });

  constructor() {
    this.fetchState();
    this.connectStream();
  }

  /**
   * Fetch current state from backend
   */
  async fetchState() {
    try {
      const res = await fetch(`${API_BASE}/state`);
      if (res.ok) {
        const data = await res.json();
        this.stateSignal.set(data);
      }
    } catch (err) {
      console.error('Failed to fetch state from backend:', err);
    }
  }

  /**
   * Establish Server-Sent Events stream connection for real-time updates
   */
  connectStream() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${API_BASE}/stream`);

    this.eventSource.addEventListener('state', (event: any) => {
      try {
        const newState = JSON.parse(event.data);
        this.stateSignal.set(newState);
      } catch (err) {
        console.error('Failed to parse SSE state payload:', err);
      }
    });

    this.eventSource.addEventListener('log', (event: any) => {
      try {
        const newLog = JSON.parse(event.data) as AgentLog;
        this.stateSignal.update(curr => {
          // Check if log is already present to prevent duplicate listing
          const exists = curr.logs.some(l => l.id === newLog.id);
          if (exists) return curr;
          return {
            ...curr,
            logs: [...curr.logs, newLog]
          };
        });
      } catch (err) {
        console.error('Failed to parse SSE log payload:', err);
      }
    });

    this.eventSource.onerror = (err) => {
      console.error('EventSource connection error, reconnecting...', err);
    };
  }

  /**
   * Trigger the multi-agent search and matching analysis
   */
  async startSearch(resumeText: string, jobQuery: string, location: string) {
    // Optimistically connect stream if disconnected
    this.connectStream();

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobQuery, location })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start search pipeline.');
      }
    } catch (err: any) {
      this.stateSignal.update(curr => ({
        ...curr,
        status: 'error',
        logs: [
          ...curr.logs,
          {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            agent: 'Orchestrator',
            level: 'warn',
            message: `Initiation error: ${err.message}`
          }
        ]
      }));
    }
  }

  /**
   * Trigger the tailoring and interview prep phase for a job
   */
  async startTailoring(jobId: string) {
    try {
      const res = await fetch(`${API_BASE}/tailor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start tailoring.');
      }
    } catch (err: any) {
      console.error('Error triggering tailoring:', err);
    }
  }

  /**
   * Reset the orchestrator state
   */
  async reset() {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      if (res.ok) {
        this.stateSignal.set(initialState);
      }
    } catch (err) {
      console.error('Failed to reset orchestrator state:', err);
    }
  }

  /**
   * Cleans up connection when service is destroyed
   */
  destroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
