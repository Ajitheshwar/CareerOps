import { Component, inject, signal, OnInit, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgentService } from '../../services/agent.service';
import { HistoricalJob, JobListing } from '../../types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FilterTabsComponent, TabItem } from '../../shared/components/filter-tabs/filter-tabs.component';
import { ScoreRingComponent } from '../../shared/components/score-ring/score-ring.component';
import { MatchEvaluationComponent } from '../../shared/components/match-evaluation/match-evaluation.component';
import { StatusSelectorComponent } from '../../shared/components/status-selector/status-selector.component';
import { ResumeTailoringDetailsComponent } from '../../shared/components/resume-tailoring-details/resume-tailoring-details.component';
import { CoverLetterDraftComponent } from '../../shared/components/cover-letter-draft/cover-letter-draft.component';
import { InterviewCoachPracticeComponent } from '../../shared/components/interview-coach-practice/interview-coach-practice.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    EmptyStateComponent, 
    FilterTabsComponent, 
    ScoreRingComponent, 
    MatchEvaluationComponent, 
    StatusSelectorComponent,
    ResumeTailoringDetailsComponent,
    CoverLetterDraftComponent,
    InterviewCoachPracticeComponent
  ],
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.css']
})
export class JobDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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


  detailTabs: TabItem[] = [
    { id: 'overview', label: 'Overview & Match Evaluation', icon: '📋', customClass: 'purple-tab' },
    { id: 'resume', label: 'Adjusted Resume', icon: '📄', customClass: 'purple-tab' },
    { id: 'cover-letter', label: 'Cover Letter', icon: '✉️', customClass: 'purple-tab' },
    { id: 'prep', label: 'Interview Coach', icon: '💬', customClass: 'purple-tab' }
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
