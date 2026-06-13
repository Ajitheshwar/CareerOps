import { Injectable, signal, computed } from '@angular/core';
import { AgentState, AgentLog, Job, MatchResult, JobListing, MockInterview } from '../types';

const API_BASE = 'http://localhost:5000/api';

const initialState: AgentState = {
  resumeText: '',
  jobQuery: '',
  location: '',
  expectedCtc: '',
  useHistory: false,
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
   * Fetch user profile from database
   */
  async fetchProfile() {
    try {
      const res = await fetch(`${API_BASE}/profile`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  }

  /**
   * Trigger the multi-agent search and matching analysis
   */
  async startSearch(resumeText: string, jobQuery: string, location: string, expectedCtc: string, useHistory: boolean) {
    // Optimistically connect stream if disconnected
    this.connectStream();

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobQuery, location, expectedCtc, useHistory })
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

  // New Career Intelligence Signals
  public mentorMessages = signal<{ role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([]);
  public trackerJobs = signal<JobListing[]>([]);
  public mockInterviews = signal<MockInterview[]>([]);

  /**
   * Upload resume file (PDF or DOCX) to backend
   */
  async uploadResume(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('resume', file);

    const res = await fetch(`${API_BASE}/upload-resume`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload and parse resume.');
    }

    const data = await res.json();
    await this.fetchState();
    return data.text;
  }

  /**
   * Load Mentor Chat history
   */
  async loadMentorHistory() {
    try {
      const res = await fetch(`${API_BASE}/mentor/history`);
      if (res.ok) {
        const history = await res.json();
        this.mentorMessages.set(history);
      }
    } catch (err) {
      console.error('Failed to load mentor history:', err);
    }
  }

  /**
   * Send chat message to Mentor Agent
   */
  async sendMentorMessage(message: string) {
    const userMsg = { role: 'user' as const, content: message, timestamp: new Date() };
    this.mentorMessages.update(m => [...m, userMsg]);

    try {
      const res = await fetch(`${API_BASE}/mentor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (res.ok) {
        const data = await res.json();
        this.mentorMessages.set(data.history);
      } else {
        throw new Error('Failed to send message to Mentor.');
      }
    } catch (err: any) {
      this.mentorMessages.update(m => [
        ...m,
        {
          role: 'assistant' as const,
          content: `Sorry, I encountered an error: ${err.message}. Please check your backend connection.`,
          timestamp: new Date()
        }
      ]);
    }
  }

  /**
   * Load job listings for Job Tracker board
   */
  async loadTrackerJobs() {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      if (res.ok) {
        const jobs = await res.json();
        this.trackerJobs.set(jobs);
      }
    } catch (err) {
      console.error('Failed to load tracker jobs:', err);
    }
  }

  /**
   * Add custom job posting directly in tracker
   */
  async addCustomJob(job: Partial<JobListing>) {
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job)
      });
      if (res.ok) {
        await this.loadTrackerJobs();
      }
    } catch (err) {
      console.error('Failed to add custom job:', err);
    }
  }

  /**
   * Update tracking status for job listing
   */
  async updateJobStatus(id: string, status: JobListing['status']) {
    this.trackerJobs.update(jobs => 
      jobs.map(j => j.id === id ? { ...j, status } : j)
    );

    try {
      const res = await fetch(`${API_BASE}/jobs/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) {
        await this.loadTrackerJobs();
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
      await this.loadTrackerJobs();
    }
  }

  /**
   * Load mock interviews list
   */
  async loadMockInterviews() {
    try {
      const res = await fetch(`${API_BASE}/interviews`);
      if (res.ok) {
        const list = await res.json();
        this.mockInterviews.set(list);
      }
    } catch (err) {
      console.error('Failed to load mock interviews:', err);
    }
  }

  /**
   * Add a mock interview transcript record
   */
  async addMockInterview(interview: Partial<MockInterview>) {
    try {
      const res = await fetch(`${API_BASE}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interview)
      });
      if (res.ok) {
        await this.loadMockInterviews();
      }
    } catch (err) {
      console.error('Failed to add mock interview:', err);
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
