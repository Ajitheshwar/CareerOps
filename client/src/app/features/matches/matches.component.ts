import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { Job, MatchResult } from '../../types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-job-matches',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
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

  filteredJobs = computed(() => {
    const allJobs = this.jobs();
    const filter = this.activeFilter();
    if (filter === 'all') return allJobs;
    return allJobs.filter(job => {
      const src = (job.source || '').toLowerCase();
      if (filter === 'linkedin') return src.includes('linkedin');
      if (filter === 'naukri') return src.includes('naukri');
      return true;
    });
  });

  setFilter(filter: 'all' | 'linkedin' | 'naukri') {
    this.activeFilter.set(filter);
    this.expandedJobId.set(null);
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

  getScoreColorClass(score: number): string {
    if (score >= 85) return 'green';
    if (score >= 70) return 'cyan';
    return 'warn';
  }

  calculateOffset(score: number): number {
    const radius = 26;
    const circumference = 2 * Math.PI * radius; // ~163.36
    return circumference - (score / 100) * circumference;
  }

  onTailor(jobId: string) {
    this.agentService.startTailoring(jobId);
  }
}
