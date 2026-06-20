import { AgentState, AgentLog, Job, MatchResult, LogLevel } from '../../../shared/types';
import { LLMService } from '../../../shared/llm';
import { JobSearchAgent } from './job-search/JobSearchAgent';
import { ResumeAnalyzerAgent } from './resume-analyzer.agent';
import { TailoringAgent } from './tailoring.agent';
import { InterviewPrepAgent } from '../../interview/agents/interview-prep.agent';
import { QueryGeneratorAgent } from './query-generator.agent';
import { JobEnrichmentService } from './job-search/services/JobEnrichmentService';
import { saveJobHistory, updateJobTailoring, updateJobInterviewPrep, getAllJobHistory, getDeletedJobHistory, getJobHistoryById } from '../../../shared/db';

export class AgentOrchestrator {
  private llm: LLMService;
  private jobSearchAgent: JobSearchAgent;
  private resumeAnalyzer: ResumeAnalyzerAgent;
  private tailoringAgent: TailoringAgent;
  private interviewPrepAgent: InterviewPrepAgent;
  private queryGeneratorAgent: QueryGeneratorAgent;
  private jobEnrichmentService: JobEnrichmentService;

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
    this.llm = LLMService.getInstance();
    this.jobSearchAgent = new JobSearchAgent();
    this.resumeAnalyzer = new ResumeAnalyzerAgent(this.llm);
    this.tailoringAgent = new TailoringAgent(this.llm);
    this.interviewPrepAgent = new InterviewPrepAgent(this.llm);
    this.queryGeneratorAgent = new QueryGeneratorAgent(this.llm);
    this.jobEnrichmentService = new JobEnrichmentService();
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
  
        const excludedPhrases = deletedJobs
          .filter((dj: any) => dj?.job?.title || dj?.job?.company)
          .map((dj: any) => `"${dj.job.title || ''} ${dj.job.company || ''}"`.replace(/\s+/g, ' ').trim());
  
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

      const deletedKeySet = new Set(
        deletedJobs
          .filter((dj: any) => typeof dj?.job?.title === 'string' && typeof dj?.job?.company === 'string')
          .map((dj: any) => `${dj.job.title.toLowerCase()}|${dj.job.company.toLowerCase()}`)
      );
      const targetJobCount = 20;
      const maximumRounds = 5;
      const salaryBufferPercent = 20;
      const seenUrls = new Set<string>();
      const acceptedJobs: Job[] = [];
      const matchResults: MatchResult[] = [];
      const searchQueries = this.buildSearchQueries(
        smartSearchTerms,
        jobQuery,
        expectedCtc,
        maximumRounds
      );

      for (let round = 0; round < maximumRounds && acceptedJobs.length < targetJobCount; round++) {
        const roundQuery = searchQueries[round];
        this.addLog(
          'Orchestrator',
          'info',
          `Search round ${round + 1}/${maximumRounds}: "${roundQuery}". Valid jobs collected: ${acceptedJobs.length}/${targetJobCount}.`
        );

        const rawJobs = await this.jobSearchAgent.run(
          roundQuery,
          location,
          (log) => {
            this.state.logs.push(log);
            this.logListeners.forEach(cb => cb(log));
            this.notifyState();
          },
          excludedPhrases
        );

        const newJobs = rawJobs.filter(job => {
          const normalizedUrl = this.normalizeJobUrl(job.url || '');
          if (!normalizedUrl || seenUrls.has(normalizedUrl)) return false;
          seenUrls.add(normalizedUrl);

          const deletedKey = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
          return !deletedKeySet.has(deletedKey);
        });

        if (newJobs.length === 0) {
          this.addLog('Orchestrator', 'warn', `Search round ${round + 1} produced no new job URLs.`);
          continue;
        }

        const internalJobs = newJobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          sourceUrl: job.url || '',
          portal: job.source,
          postedDate: job.date,
          salary: job.salary
        }));

        const enrichedJobs = await this.jobEnrichmentService.enrich(
          internalJobs,
          (level, message) => this.addLog('JobSearch', level as LogLevel, message)
        );

        this.state.status = 'matching';
        for (const enrichedJob of enrichedJobs) {
          if (acceptedJobs.length >= targetJobCount) break;

          const validation = this.jobEnrichmentService.validate(
            enrichedJob,
            location,
            expectedCtc,
            salaryBufferPercent
          );
          if (!validation.valid) {
            this.addLog(
              'JobSearch',
              'info',
              `Rejected "${enrichedJob.title}" at ${enrichedJob.company}: ${validation.reason}.`
            );
            continue;
          }

          const job: Job = {
            id: enrichedJob.id,
            title: enrichedJob.title,
            company: enrichedJob.company,
            location: enrichedJob.location,
            description: enrichedJob.description,
            url: enrichedJob.sourceUrl,
            source: enrichedJob.portal,
            date: enrichedJob.postedDate || new Date().toISOString(),
            salary: enrichedJob.salary,
            salaryMinLpa: enrichedJob.salaryMinLpa,
            salaryMaxLpa: enrichedJob.salaryMaxLpa,
            salaryConfidence: enrichedJob.salaryConfidence,
            descriptionSource: enrichedJob.descriptionSource
          };

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

            if (typeof result.matchScore !== 'number' || result.matchScore <= 60) {
              this.addLog(
                'Orchestrator',
                'info',
                `Rejected "${job.title}" at ${job.company}: match score ${result.matchScore ?? 'N/A'} is not greater than 60%.`
              );
              continue;
            }

            acceptedJobs.push(job);
            matchResults.push(result);
            await saveJobHistory(job, result);

            this.state.foundJobs = [...acceptedJobs];
            this.state.matchingResults = [...matchResults];
            this.notifyState();
          } catch (err: any) {
            this.addLog('Orchestrator', 'warn', `Resume analysis failed for "${job.title}" at ${job.company}: ${err.message}`);
          }
        }
      }

      if (acceptedJobs.length === 0) {
        this.state.status = 'completed';
        this.addLog(
          'Orchestrator',
          'warn',
          `No valid jobs were found after ${maximumRounds} search rounds.`
        );
        return;
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
      const jobMap = new Map(acceptedJobs.map((j: any) => [j.id, j]));
      this.state.foundJobs = matchResults.map(mr => jobMap.get(mr.jobId)!).filter(Boolean);

      this.state.status = 'completed';
      const bestMatchScore = matchResults[0]?.matchScore !== null ? `${matchResults[0]?.matchScore}%` : 'N/A';
      this.addLog(
        'Orchestrator',
        'success',
        `Search finished with ${acceptedJobs.length}/${targetJobCount} valid jobs after at most ${maximumRounds} rounds. Best match: ${bestMatchScore} at ${this.state.foundJobs[0]?.company || 'N/A'}.`
      );
    } catch (err: any) {
      this.state.status = 'error';
      this.addLog('Orchestrator', 'warn', `Pipeline error: ${err.message}`);
    }
  }

  private buildSearchQueries(
    smartSearchTerms: string,
    jobQuery: string,
    expectedCtc: string,
    maximumRounds: number
  ): string[] {
    const queries = [
      smartSearchTerms,
      `${jobQuery} Senior`,
      `${smartSearchTerms} ${expectedCtc}`.trim(),
      `${jobQuery} "SDE II"`,
      `${smartSearchTerms} high paying`
    ];

    return queries.slice(0, maximumRounds);
  }

  private normalizeJobUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().replace(/\/$/, '').toLowerCase();
    } catch {
      return url.split(/[?#]/)[0].replace(/\/$/, '').toLowerCase();
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
