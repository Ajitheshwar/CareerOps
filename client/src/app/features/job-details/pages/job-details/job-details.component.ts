import { Component, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgentService } from '../../../../core/services/agent.service';
import { HistoricalJob, JobListing } from '../../../../core/types';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterTabsComponent, TabItem } from '../../../../shared/components/filter-tabs/filter-tabs.component';
import { ScoreRingComponent } from '../../../../shared/components/score-ring/score-ring.component';
import { MatchEvaluationComponent } from '../../../../shared/components/match-evaluation/match-evaluation.component';
import { StatusSelectorComponent } from '../../../../shared/components/status-selector/status-selector.component';
import { ResumeTailoringDetailsComponent } from '../../../../shared/components/resume-tailoring-details/resume-tailoring-details.component';
import { CoverLetterDraftComponent } from '../../../../shared/components/cover-letter-draft/cover-letter-draft.component';
import { InterviewCoachPracticeComponent } from '../../../../shared/components/interview-coach-practice/interview-coach-practice.component';
import { InterviewApiService, InterviewSession, ReadinessScore } from '../../../interview/services/interview-api.service';
import { InterviewPrepDashboardComponent } from '../../../interview/components/interview-prep-dashboard/interview-prep-dashboard.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterLink, 
    EmptyStateComponent, 
    FilterTabsComponent, 
    ScoreRingComponent, 
    MatchEvaluationComponent, 
    StatusSelectorComponent,
    ResumeTailoringDetailsComponent,
    CoverLetterDraftComponent,
    InterviewCoachPracticeComponent,
    InterviewPrepDashboardComponent
  ],
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.css']
})
export class JobDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  public agentService = inject(AgentService);

  jobId = signal<string>('');
  jobDetails = signal<HistoricalJob | null>(null);
  activeTab = signal<string>('overview');
  isAnalyzing = signal<boolean>(false);

  async onReRunAnalysis(event: Event) {
    event.stopPropagation();
    this.isAnalyzing.set(true);
    try {
      const resumeText = this.agentService.state().resumeText;
      await this.agentService.reAnalyzeJob(this.jobId(), resumeText);
      await this.loadJob();
    } catch (err: any) {
      console.error('Failed to re-run resume analysis:', err);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  interviewApi = inject(InterviewApiService);

  readiness = signal<ReadinessScore | null>(null);
  sessions = signal<InterviewSession[]>([]);

  detailTabs: TabItem[] = [
    { id: 'overview', label: 'Overview & Match Evaluation', icon: '📋', customClass: 'purple-tab' },
    { id: 'resume', label: 'Adjusted Resume', icon: '📄', customClass: 'purple-tab' },
    { id: 'cover-letter', label: 'Cover Letter', icon: '✉️', customClass: 'purple-tab' },
    { id: 'prep', label: 'Interview Coach', icon: '💬', customClass: 'purple-tab' },
    { id: 'interview-prep', label: 'Interview Prep (Adaptive)', icon: '⚔️', customClass: 'purple-tab' }
  ];

  onTabChange(tabId: string) {
    this.activeTab.set(tabId);
  }

  // Selected Status signal
  selectedStatus = computed(() => {
    const trackerJob = this.agentService.trackerJobs().find(j => j.id === this.jobId());
    return trackerJob?.status || 'scraped';
  });

  questions = computed(() => {
    return this.jobDetails()?.interviewPrep?.questions || [];
  });

  constructor() {
    effect(() => {
      const currentStatus = this.agentService.status();
      const selectedId = this.agentService.selectedJobId();
      if (currentStatus === 'completed' && selectedId === this.jobId()) {
        this.loadJob();
      }
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jobId.set(id);
      this.loadJob();
      this.agentService.loadTrackerJobs();
    }
  }

  async loadJob() {
    const details = await this.agentService.fetchJobDetails(this.jobId());
    if (details) {
      this.jobDetails.set(details);
      this.agentService.selectJob(this.jobId());
      await this.loadReadinessAndSessions();
    }
  }

  async loadReadinessAndSessions() {
    try {
      const rd = await this.interviewApi.getReadiness(this.jobId());
      this.readiness.set(rd);
    } catch (err) {
      console.warn('No readiness score cached, will load dynamically', err);
    }

    try {
      const list = await this.interviewApi.getSessionsByJob(this.jobId());
      this.sessions.set(list);
    } catch (err) {
      console.error('Failed to load sessions list:', err);
    }
  }

  async onStatusChange(status: JobListing['status']) {
    await this.agentService.updateJobStatus(this.jobId(), status);
    await this.loadJob();
  }

  async runTailoring() {
    this.agentService.selectJob(this.jobId());
    await this.agentService.startTailoring(this.jobId());
  }

  async runPrep() {
    this.agentService.selectJob(this.jobId());
    await this.agentService.startInterviewPrep(this.jobId());
  }

  goBack() {
    this.router.navigate(['/matches']);
  }
}
