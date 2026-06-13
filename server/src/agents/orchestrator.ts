import { AgentState, AgentLog, Job, MatchResult, LogLevel } from '../types';
import { LLMService } from '../llm';
import { JobSearchAgent } from './jobSearchSerp';
import { ResumeAnalyzerAgent } from './resumeAnalyzer';
import { TailoringAgent } from './tailoring';
import { InterviewPrepAgent } from './interviewPrep';
import { QueryGeneratorAgent } from './queryGenerator';
import { saveJobHistory, updateJobTailoring, updateJobInterviewPrep, getAllJobHistory } from '../db';

export class AgentOrchestrator {
  private llm: LLMService;
  private jobSearchAgent: JobSearchAgent;
  private resumeAnalyzer: ResumeAnalyzerAgent;
  private tailoringAgent: TailoringAgent;
  private interviewPrepAgent: InterviewPrepAgent;
  private queryGeneratorAgent: QueryGeneratorAgent;

  // Global in-memory state for simplicity in this session
  private state: AgentState = {
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

  private listeners: ((state: AgentState) => void)[] = [];
  private logListeners: ((log: AgentLog) => void)[] = [];

  constructor() {
    this.llm = new LLMService();
    this.jobSearchAgent = new JobSearchAgent();
    this.resumeAnalyzer = new ResumeAnalyzerAgent(this.llm);
    this.tailoringAgent = new TailoringAgent(this.llm);
    this.interviewPrepAgent = new InterviewPrepAgent(this.llm);
    this.queryGeneratorAgent = new QueryGeneratorAgent(this.llm);
  }

  getState(): AgentState {
    return this.state;
  }

  resetState() {
    this.state = {
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
    this.notifyState();
  }

  registerListener(cb: (state: AgentState) => void) {
    this.listeners.push(cb);
  }

  registerLogListener(cb: (log: AgentLog) => void) {
    this.logListeners.push(cb);
  }

  private notifyState() {
    this.listeners.forEach(cb => cb({ ...this.state }));
  }

  private addLog(agent: any, level: LogLevel, message: string) {
    const log: AgentLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent,
      level,
      message
    };
    this.state.logs.push(log);
    this.logListeners.forEach(cb => cb(log));
    this.notifyState();
  }

  /**
   * Run the job search and analysis phase
   */
  async runJobSearchAndMatch(
    resumeText: string, 
    jobQuery: string, 
    location: string, 
    expectedCtc: string, 
    useHistory: boolean
  ) {
    this.state.resumeText = resumeText;
    this.state.jobQuery = jobQuery;
    this.state.location = location;
    this.state.expectedCtc = expectedCtc;
    this.state.useHistory = useHistory;
    this.state.status = 'searching';
    this.state.foundJobs = [];
    this.state.matchingResults = [];
    this.notifyState();

    this.addLog('Orchestrator', 'thought', `Starting CareerOps pipeline. Mode: ${useHistory ? 'Offline History' : 'Live Crawl'} | Expected CTC: "${expectedCtc}"`);

    try {
      if (useHistory) {
        this.addLog('Orchestrator', 'info', 'Searching matching jobs from local MongoDB history...');
        const historyJobs = await getAllJobHistory();
        
        // Filter history by query, location, and ctc
        const filtered = historyJobs.filter(item => {
          const titleMatch = item.job.title.toLowerCase().includes(jobQuery.toLowerCase()) || 
                             item.job.company.toLowerCase().includes(jobQuery.toLowerCase()) ||
                             jobQuery.toLowerCase().includes(item.job.title.toLowerCase());
          
          const locMatch = !location || 
                           item.job.location.toLowerCase().includes(location.toLowerCase()) || 
                           location.toLowerCase().includes(item.job.location.toLowerCase());

          // Match expected CTC if present
          let ctcMatch = true;
          if (expectedCtc && item.job.description) {
            const ctcClean = expectedCtc.toLowerCase().replace(/[^a-z0-9]/g, '');
            const descClean = item.job.description.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (ctcClean.length > 1 && !descClean.includes(ctcClean)) {
              // we don't strictly reject to avoid missing entries, but prioritize
            }
          }
          return titleMatch && locMatch && ctcMatch;
        });

        this.state.foundJobs = filtered.map(item => item.job);
        this.state.matchingResults = filtered.map(item => item.matchResult).filter(Boolean) as MatchResult[];
        
        // Hydrate other loaded artifacts to state
        filtered.forEach(item => {
          if (item.tailoredResume) this.state.tailoredResumes[item.id] = item.tailoredResume;
          if (item.coverLetter) this.state.coverLetters[item.id] = item.coverLetter;
          if (item.interviewPrep) this.state.interviewPrep[item.id] = item.interviewPrep;
        });

        this.state.status = 'completed';
        this.addLog('Orchestrator', 'success', `Loaded ${filtered.length} matched jobs from offline MongoDB history.`);
        return;
      }

      // 1. Generate Smart Query Keywords via LLM
      const smartSearchTerms = await this.queryGeneratorAgent.run(
        resumeText, 
        jobQuery, 
        location, 
        expectedCtc, 
        (log) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }
      );

      // 2. Crawl Jobs using smart keywords
      const jobs = await this.jobSearchAgent.run(smartSearchTerms, location, (log) => {
        this.state.logs.push(log);
        this.logListeners.forEach(cb => cb(log));
        this.notifyState();
      });

      this.state.foundJobs = jobs;
      
      if (jobs.length === 0) {
        this.state.status = 'completed';
        this.addLog('Orchestrator', 'warn', 'No jobs found matching the search criteria. Pipeline terminated.');
        return;
      }

      // 3. Match Resumes
      this.state.status = 'matching';
      this.addLog('Orchestrator', 'info', `Found ${jobs.length} jobs. Handing off to ResumeAnalyzerAgent to match against resume...`);

      const matchResults: MatchResult[] = [];
      
      for (const job of jobs) {
        const result = await this.resumeAnalyzer.run(
          resumeText,
          job.id,
          job.title,
          job.company,
          job.description,
          (log) => {
            this.state.logs.push(log);
            this.logListeners.forEach(cb => cb(log));
            this.notifyState();
          }
        );
        matchResults.push(result);

        // Save new matches into MongoDB history!
        await saveJobHistory(job, result);
      }

      // Sort jobs by match score descending
      matchResults.sort((a, b) => b.matchScore - a.matchScore);
      this.state.matchingResults = matchResults;
      
      // Re-order foundJobs to align with sorted match results
      const jobMap = new Map(this.state.foundJobs.map(j => [j.id, j]));
      this.state.foundJobs = matchResults.map(mr => jobMap.get(mr.jobId)!).filter(Boolean);

      this.state.status = 'completed';
      this.addLog('Orchestrator', 'success', `Multi-agent search and matching analysis finished. Best match: ${matchResults[0]?.matchScore || 0}% at ${this.state.foundJobs[0]?.company || 'N/A'}.`);
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Pipeline error: ${err.message}`);
    }
  }

  /**
   * Run the tailoring and interview prep phase for a selected job
   */
  async runTailoringAndPrep(jobId: string) {
    const job = this.state.foundJobs.find(j => j.id === jobId);
    if (!job) {
      this.addLog('Orchestrator', 'warn', `Tailoring failed: Job with ID "${jobId}" not found in current state.`);
      return;
    }

    this.state.selectedJobId = jobId;
    this.state.status = 'tailoring';
    this.notifyState();

    this.addLog('Orchestrator', 'thought', `Initiating tailoring phase for "${job.title}" at ${job.company}.`);
    this.addLog('Orchestrator', 'info', 'Handing off to TailoringAgent to customize resume and write cover letter...');

    try {
      // 1. Run Resume Tailoring & Cover Letter
      const tailoringRes = await this.tailoringAgent.run(
        this.state.resumeText,
        job.id,
        job.title,
        job.company,
        job.description,
        (log) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }
      );

      this.state.tailoredResumes[jobId] = tailoringRes.tailoredResume;
      this.state.coverLetters[jobId] = tailoringRes.coverLetter;

      // Save to MongoDB database history
      await updateJobTailoring(jobId, tailoringRes.tailoredResume, tailoringRes.coverLetter);

      // 2. Run Interview Prep Coach
      this.state.status = 'preparing';
      this.notifyState();

      this.addLog('Orchestrator', 'info', 'Handing off to InterviewPrepAgent to generate prep questions & coach strategies...');

      const prepRes = await this.interviewPrepAgent.run(
        this.state.resumeText,
        job.id,
        job.title,
        job.company,
        job.description,
        (log) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }
      );

      this.state.interviewPrep[jobId] = prepRes;

      // Save to MongoDB database history
      await updateJobInterviewPrep(jobId, prepRes);

      this.state.status = 'completed';
      this.addLog('Orchestrator', 'success', `Resume tailoring, cover letter generation, and interview prep guides completed for ${job.company}!`);
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Tailoring & Prep pipeline error: ${err.message}`);
    }
  }
}
