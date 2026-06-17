import { AgentState, AgentLog, Job, MatchResult, LogLevel } from '../../../shared/types';
import { LLMService } from '../../../shared/llm';
import { JobSearchAgent } from './job-search/JobSearchAgent';
import { ResumeAnalyzerAgent } from './resume-analyzer.agent';
import { TailoringAgent } from './tailoring.agent';
import { InterviewPrepAgent } from '../../interview/agents/interview-prep.agent';
import { QueryGeneratorAgent } from './query-generator.agent';
import { saveJobHistory, updateJobTailoring, updateJobInterviewPrep, getAllJobHistory, getDeletedJobHistory, softDeleteJob, getJobHistoryById } from '../../../shared/db';

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

  clearLogs() {
    this.state.logs = [];
    this.notifyState();
  }

  removeJob(jobId: string) {
    this.state.foundJobs = this.state.foundJobs.filter(j => j.id !== jobId);
    this.state.matchingResults = this.state.matchingResults.filter(m => m.jobId !== jobId);
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

  public addLog(agent: any, level: LogLevel, message: string) {
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
        const filtered = historyJobs.filter((item: any) => {
          const jobTitle = item.job.title.toLowerCase();
          const queryLower = jobQuery.toLowerCase();
          
          // 1. Flexible Title Match: Check for direct substring match or keyword overlaps
          const queryWords = queryLower.split(/[\s,\-\/]+/).filter((w: string) => w.length > 2);
          const titleWords = jobTitle.split(/[\s,\-\/]+/).filter((w: string) => w.length > 2);
          
          const hasKeywordOverlap = queryWords.some(qw => 
            titleWords.some((tw: string) => tw.includes(qw) || qw.includes(tw))
          );
          
          const titleMatch = jobTitle.includes(queryLower) || 
                             queryLower.includes(jobTitle) || 
                             hasKeywordOverlap;
          
          // 2. Flexible Location Match: Match if query is empty, "remote", or contains matching keywords
          const queryLocLower = (location || '').toLowerCase().trim();
          const jobLocLower = item.job.location.toLowerCase();
          
          const locMatch = !queryLocLower || 
                           queryLocLower === 'remote' || 
                           jobLocLower.includes(queryLocLower) || 
                           queryLocLower.includes(jobLocLower) ||
                           queryLocLower.split(/[\s,]+/)[0] === jobLocLower.split(/[\s,]+/)[0];

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

        this.state.foundJobs = filtered.map((item: any) => ({
          ...item.job,
          date: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString()
        }));
        this.state.matchingResults = filtered.map((item: any) => {
          if (item.matchResult) {
            return {
              ...item.matchResult,
              jobId: item.matchResult.jobId || item.id
            };
          }
          return null;
        }).filter(Boolean) as MatchResult[];
        
        // Hydrate other loaded artifacts to state
        filtered.forEach((item: any) => {
          if (item.tailoredResume) this.state.tailoredResumes[item.id] = item.tailoredResume;
          if (item.coverLetter) this.state.coverLetters[item.id] = item.coverLetter;
          if (item.interviewPrep) this.state.interviewPrep[item.id] = item.interviewPrep;
        });

        this.state.status = 'completed';
        this.addLog('Orchestrator', 'success', `Loaded ${filtered.length} matched jobs from offline MongoDB history.`);
        return;
      }

      // Fetch soft-deleted jobs from history to build negative search terms and filter
      const deletedJobs = await getDeletedJobHistory().catch((err: any) => {
          this.addLog('Orchestrator', 'warn', `Failed to load deleted jobs from history: ${err.message}`);
          return [];
        });
  
        const excludedPhrases = deletedJobs.map((dj: any) => `"${dj.job.title} ${dj.job.company}"`);
  
        // 1. Generate Smart Query Keywords via LLM
        const smartSearchTerms = await this.queryGeneratorAgent.run(
          resumeText, 
          jobQuery, 
          location, 
          expectedCtc, 
          (log: any) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }
      );

      // 2. Crawl Jobs using smart keywords (with negative exclusions)
      const rawJobs = await this.jobSearchAgent.run(
        smartSearchTerms, 
        location, 
        (log) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }, 
        excludedPhrases
      );

      // Filter out any crawled jobs that match any soft-deleted job's title + company
      const deletedKeySet = new Set(
        deletedJobs.map((dj: any) => `${dj.job.title.toLowerCase()}|${dj.job.company.toLowerCase()}`)
      );

      const jobs = rawJobs
        .map(j => ({
          ...j,
          date: new Date().toISOString()
        }))
        .filter(j => {
          const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
          const isExcluded = deletedKeySet.has(key);
          if (isExcluded) {
            this.addLog('Orchestrator', 'info', `Filtered out soft-deleted job: "${j.title}" at "${j.company}"`);
          }
          return !isExcluded;
        });

      this.state.foundJobs = jobs;
      
      if (jobs.length === 0) {
        this.state.status = 'completed';
        this.addLog('Orchestrator', 'warn', 'No jobs found matching the search criteria. Pipeline terminated.');
        return;
      }

      // Store crawled jobs immediately in database
      this.addLog('Orchestrator', 'info', `Storing ${jobs.length} crawled jobs to database...`);
      for (const job of jobs) {
        try {
          await saveJobHistory(job);
        } catch (dbErr: any) {
          console.error(`Failed to save initial job history for ${job.id}:`, dbErr);
        }
      }

      // 3. Match Resumes
      this.state.status = 'matching';
      this.addLog('Orchestrator', 'info', `Handing off to ResumeAnalyzerAgent to match against resume...`);

      const matchResults: MatchResult[] = [];
      let failedCount = 0;
      
      for (const job of jobs) {
        try {
          const result = await this.resumeAnalyzer.run(
            resumeText,
            job.id,
            job.title,
            job.company,
            job.description,
            (log: any) => {
              this.state.logs.push(log);
              this.logListeners.forEach(cb => cb(log));
              this.notifyState();
            }
          );
  
          if (result.matchScore !== null && result.matchScore !== undefined && typeof result.matchScore === 'number' && result.matchScore < 60) {
            this.addLog('Orchestrator', 'info', `Job "${job.title}" at ${job.company} match score is ${result.matchScore}% (< 60%). Deleting from DB and frontend...`);
            await softDeleteJob(job.id);
            this.state.foundJobs = this.state.foundJobs.filter((fj: any) => fj.id !== job.id);
            this.notifyState();
            continue;
          }

          matchResults.push(result);

          // Update matchResult in MongoDB
          await saveJobHistory(job, result);
        } catch (err: any) {
          this.addLog('Orchestrator', 'warn', `Resume analysis failed for "${job.title}" at ${job.company}: ${err.message}`);
          failedCount++;

          const placeholderResult: MatchResult = {
            jobId: job.id,
            matchScore: null,
            fitExplanation: 'Resume analysis failed. You can re-run analysis for this job.',
            matchingSkills: [],
            skillGaps: [],
            experienceRelevance: 'Unknown'
          };
          matchResults.push(placeholderResult);

          // Save placeholder result in DB
          try {
            await saveJobHistory(job, placeholderResult);
          } catch (dbErr: any) {
            console.error(`Failed to save placeholder job history for ${job.id}:`, dbErr);
          }
        }
      }

      if (failedCount > 0) {
        console.error(`[Orchestrator Error] ${failedCount}/${jobs.length} jobs resume analysis failed`);
        this.addLog('Orchestrator', 'warn', `${failedCount}/${jobs.length} jobs resume analysis failed.`);
      }

      // Sort jobs by match score descending, with null scores at the bottom
      matchResults.sort((a, b) => {
        if (a.matchScore === null && b.matchScore === null) return 0;
        if (a.matchScore === null) return 1;
        if (b.matchScore === null) return -1;
        return b.matchScore - a.matchScore;
      });
      this.state.matchingResults = matchResults;
      
      // Re-order foundJobs to align with sorted match results
      const jobMap = new Map(this.state.foundJobs.map((j: any) => [j.id, j]));
      this.state.foundJobs = matchResults.map(mr => jobMap.get(mr.jobId)!).filter(Boolean);

      this.state.status = 'completed';
      const bestMatchScore = matchResults[0]?.matchScore !== null ? `${matchResults[0]?.matchScore}%` : 'N/A';
      this.addLog('Orchestrator', 'success', `Multi-agent search and matching analysis finished. Best match: ${bestMatchScore} at ${this.state.foundJobs[0]?.company || 'N/A'}.`);
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Pipeline error: ${err.message}`);
    }
  }

  /**
   * Run the resume tailoring and cover letter generation phase for a selected job
   */
  async runTailoring(jobId: string) {
    const job = this.state.foundJobs.find((j: any) => j.id === jobId);
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
      // Run Resume Tailoring & Cover Letter
      const tailoringRes = await this.tailoringAgent.run(
        this.state.resumeText,
        job.id,
        job.title,
        job.company,
        job.description,
        (log: any) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        }
      );

      this.state.tailoredResumes[jobId] = tailoringRes.tailoredResume;
      this.state.coverLetters[jobId] = tailoringRes.coverLetter;

      // Save to MongoDB database history
      await updateJobTailoring(jobId, tailoringRes.tailoredResume, tailoringRes.coverLetter);

      this.state.status = 'completed';
      this.addLog('Orchestrator', 'success', `Resume tailoring and cover letter generation completed for ${job.company}!`);
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Tailoring pipeline error: ${err.message}`);
    }
  }

  /**
   * Run the interview preparation and coaching phase for a selected job
   */
  async runInterviewPrep(jobId: string) {
    let job = this.state.foundJobs.find((j: any) => j.id === jobId);
    let existingPrep: any = null;
    
    try {
      const dbJob = await getJobHistoryById(jobId);
      if (dbJob) {
        if (!job) {
          job = dbJob.job;
        }
        existingPrep = dbJob.interviewPrep;
      }
    } catch (dbErr) {
      console.warn('Failed to load job from DB during interview prep:', dbErr);
    }

    if (!job) {
      this.addLog('Orchestrator', 'warn', `Interview prep failed: Job with ID "${jobId}" not found in current state or database.`);
      return;
    }

    this.state.selectedJobId = jobId;
    this.state.status = 'preparing';
    this.notifyState();

    this.addLog('Orchestrator', 'thought', `Initiating interview preparation phase for "${job.title}" at ${job.company}.`);
    this.addLog('Orchestrator', 'info', 'Handing off to InterviewPrepAgent to generate prep questions & coach strategies...');

    try {
      // Extract existing questions to ensure non-repetitive generation
      const existingQuestions = existingPrep?.questions?.map((q: any) => q.question) || [];
      if (existingQuestions.length > 0) {
        this.addLog('Orchestrator', 'info', `Found ${existingQuestions.length} existing prep questions. Instructing agent to generate fresh topics...`);
      }

      // Run Interview Prep Coach
      const prepRes = await this.interviewPrepAgent.run(
        this.state.resumeText,
        job.id,
        job.title,
        job.company,
        job.description,
        (log: any) => {
          this.state.logs.push(log);
          this.logListeners.forEach(cb => cb(log));
          this.notifyState();
        },
        existingQuestions
      );

      this.state.interviewPrep[jobId] = prepRes;

      // Save to MongoDB database history
      await updateJobInterviewPrep(jobId, prepRes);

      this.state.status = 'completed';
      this.addLog('Orchestrator', 'success', `Interview prep guide completed for ${job.company}!`);
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Interview prep pipeline error: ${err.message}`);
    }
  }
}
