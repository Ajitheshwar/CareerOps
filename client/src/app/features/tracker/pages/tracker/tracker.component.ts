import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgentService } from '../../../../core/services/agent.service';
import { JobListing } from '../../../../core/types';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatusSelectorComponent } from '../../../../shared/components/status-selector/status-selector.component';

@Component({
  selector: 'app-job-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, StatusSelectorComponent],
  templateUrl: './tracker.component.html',
  styleUrls: ['./tracker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobTrackerComponent implements OnInit {
  agentService = inject(AgentService);
  router = inject(Router);

  jobs = this.agentService.trackerJobs;
  showForm = signal<boolean>(false);

  columns = [
    { status: 'scraped' as const, title: 'Scraped', color: '#6b7280' },
    { status: 'applied' as const, title: 'Applied', color: '#3b82f6' },
    { status: 'interviewing' as const, title: 'Interviews', color: '#eab308' },
    { status: 'accepted' as const, title: 'Offers', color: '#10b981' },
    { status: 'rejected' as const, title: 'Archived', color: '#ef4444' }
  ];

  newJob = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: ''
  };

  ngOnInit() {
    this.agentService.loadTrackerJobs();
  }

  viewJobDetails(jobId: string) {
    this.agentService.selectJob(jobId);
    this.router.navigate(['/jobs', jobId]);
  }

  toggleAddForm() {
    this.showForm.set(!this.showForm());
  }

  getJobsByStatus(status: JobListing['status']) {
    return this.jobs().filter(j => j.status === status);
  }

  onStatusChange(jobId: string, status: JobListing['status']) {
    this.agentService.updateJobStatus(jobId, status);
  }

  async onAddJob() {
    if (!this.newJob.title || !this.newJob.company) return;

    await this.agentService.addCustomJob({
      ...this.newJob,
      status: 'applied'
    });

    this.newJob = {
      title: '',
      company: '',
      location: '',
      description: '',
      url: ''
    };
    this.showForm.set(false);
  }
}
