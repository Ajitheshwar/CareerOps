import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AgentService } from '../../../../core/services/agent.service';
import { Job, MatchResult, JobListing } from '../../../../core/types';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilterTabsComponent } from '../../../../shared/components/filter-tabs/filter-tabs.component';
import { ScoreRingComponent } from '../../../../shared/components/score-ring/score-ring.component';
import { MatchEvaluationComponent } from '../../../../shared/components/match-evaluation/match-evaluation.component';
import { StatusSelectorComponent } from '../../../../shared/components/status-selector/status-selector.component';
import { JobFormModalComponent } from '../../../../shared/components/job-form-modal/job-form-modal.component';

@Component({
  selector: 'app-job-matches',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, FilterTabsComponent, ScoreRingComponent, MatchEvaluationComponent, StatusSelectorComponent, JobFormModalComponent],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobMatchesComponent implements OnInit {
  agentService = inject(AgentService);
  router = inject(Router);

  /** Controls Add Job modal visibility */
  showAddJobModal = signal<boolean>(false);

  openAddJobModal(): void {
    this.showAddJobModal.set(true);
  }

  onAddJobSaved(): void {
    this.showAddJobModal.set(false);
  }

  onAddJobModalClose(): void {
    this.showAddJobModal.set(false);
  }

  ngOnInit() {
    this.agentService.loadTrackerJobs();
  }

  getJobStatus(jobId: string): JobListing['status'] {
    const trackerJob = this.agentService.trackerJobs().find(j => j.id === jobId);
    return trackerJob?.status || 'scraped';
  }

  async onStatusChange(jobId: string, status: JobListing['status']) {
    await this.agentService.updateJobStatus(jobId, status);
  }


  jobs = this.agentService.jobs;
  matches = this.agentService.matches;

  expandedJobId = signal<string | null>(null);
  activeFilter = signal<'all' | 'linkedin' | 'naukri' | 'manual'>('all');

  totalCount = computed(() => this.jobs().length);
  linkedinCount = computed(() => this.jobs().filter(j => (j.source || '').toLowerCase().includes('linkedin')).length);
  naukriCount = computed(() => this.jobs().filter(j => (j.source || '').toLowerCase().includes('naukri')).length);
  manualCount = computed(() => this.jobs().filter(j => (j.source || '').toLowerCase().includes('manual')).length);

  filterTabs = computed(() => [
    { id: 'all', label: 'All Jobs', icon: '🌐', count: this.totalCount() },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼', count: this.linkedinCount(), customClass: 'linkedin-tab' },
    { id: 'naukri', label: 'Naukri', icon: '🎯', count: this.naukriCount(), customClass: 'naukri-tab' },
    { id: 'manual', label: 'Manual', icon: '✍️', count: this.manualCount(), customClass: 'manual-tab' }
  ]);

  sortBy = signal<'matchingScore' | 'date'>('matchingScore');

  filteredJobs = computed(() => {
    const allJobs = this.jobs();
    const filter = this.activeFilter();
    const sortField = this.sortBy();
    const matchesList = this.matches();

    // 1. Filter jobs
    let jobsList = filter === 'all' 
      ? [...allJobs] 
      : allJobs.filter(job => {
          const src = (job.source || '').toLowerCase();
          if (filter === 'linkedin') return src.includes('linkedin');
          if (filter === 'naukri') return src.includes('naukri');
          if (filter === 'manual') return src.includes('manual');
          return true;
        });

    // 2. Sort jobs
    if (sortField === 'matchingScore') {
      jobsList.sort((a, b) => {
        const matchA = matchesList.find(m => m.jobId === a.id);
        const matchB = matchesList.find(m => m.jobId === b.id);
        const scoreA = matchA?.matchScore ?? null;
        const scoreB = matchB?.matchScore ?? null;

        if (scoreA === null && scoreB === null) return 0;
        if (scoreA === null) return 1;
        if (scoreB === null) return -1;
        return scoreB - scoreA;
      });
    } else if (sortField === 'date') {
      jobsList.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
    }

    return jobsList;
  });

  setFilter(filter: string) {
    this.activeFilter.set(filter as 'all' | 'linkedin' | 'naukri' | 'manual');
    this.expandedJobId.set(null);
  }

  onSortChange(event: any) {
    this.sortBy.set(event.target.value as 'matchingScore' | 'date');
  }


  getMatchResult(jobId: string): MatchResult | undefined {
    return this.matches().find(mr => mr.jobId === jobId);
  }

  isSelected(jobId: string): boolean {
    return this.agentService.selectedJobId() === jobId;
  }

  toggleExpand(jobId: string) {
    if (this.expandedJobId() === jobId) {
      this.expandedJobId.set(null);
    } else {
      this.expandedJobId.set(jobId);
    }
  }

  // Track loading state per jobId
  analyzingJobIds = signal<{ [jobId: string]: boolean }>({});

  async onReRunAnalysis(event: Event, jobId: string) {
    event.stopPropagation();
    
    // Mark job as in-progress
    this.analyzingJobIds.update(curr => ({ ...curr, [jobId]: true }));

    try {
      const resumeText = this.agentService.state().resumeText;
      await this.agentService.reAnalyzeJob(jobId, resumeText);
    } catch (err: any) {
      console.error('Failed to re-run resume analysis:', err);
    } finally {
      // Clear in-progress state
      this.analyzingJobIds.update(curr => ({ ...curr, [jobId]: false }));
    }
  }

  onTailor(jobId: string) {
    this.agentService.startTailoring(jobId);
  }

  onPrep(jobId: string) {
    this.agentService.startInterviewPrep(jobId);
  }

  hasTailored(jobId: string): boolean {
    const state = this.agentService.state();
    return !!state.tailoredResumes[jobId] || !!state.coverLetters[jobId];
  }

  hasInterviewPrep(jobId: string): boolean {
    const state = this.agentService.state();
    return !!state.interviewPrep[jobId];
  }

  viewTailor(jobId: string) {
    this.agentService.selectJob(jobId);
    this.router.navigate(['/tailor']);
  }

  viewCoach(jobId: string) {
    this.agentService.selectJob(jobId);
    this.router.navigate(['/coach']);
  }

  viewJobDetails(jobId: string) {
    this.agentService.selectJob(jobId);
    this.router.navigate(['/jobs', jobId]);
  }

  async onDeleteJob(event: Event, jobId: string) {
    event.stopPropagation();
    const confirmed = confirm('Are you sure you want to hide this job? It will be excluded from subsequent crawlers and search queries.');
    if (confirmed) {
      await this.agentService.deleteJob(jobId);
    }
  }
}


