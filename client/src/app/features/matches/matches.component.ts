import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { Job, MatchResult } from '../../types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FilterTabsComponent } from '../../shared/components/filter-tabs/filter-tabs.component';
import { ScoreRingComponent } from '../../shared/components/score-ring/score-ring.component';

@Component({
  selector: 'app-job-matches',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, FilterTabsComponent, ScoreRingComponent],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobMatchesComponent {
  agentService = inject(AgentService);

  jobs = this.agentService.jobs;
  matches = this.agentService.matches;

  expandedJobId = signal<string | null>(null);
  activeFilter = signal<'all' | 'linkedin' | 'naukri'>('all');

  totalCount = computed(() => this.jobs().length);
  linkedinCount = computed(() => this.jobs().filter(j => (j.source || '').toLowerCase().includes('linkedin')).length);
  naukriCount = computed(() => this.jobs().filter(j => (j.source || '').toLowerCase().includes('naukri')).length);

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

  setFilter(filter: 'all' | 'linkedin' | 'naukri') {
    this.activeFilter.set(filter);
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

  async onDeleteJob(event: Event, jobId: string) {
    event.stopPropagation();
    const confirmed = confirm('Are you sure you want to hide this job? It will be excluded from subsequent crawlers and search queries.');
    if (confirmed) {
      await this.agentService.deleteJob(jobId);
    }
  }
}


