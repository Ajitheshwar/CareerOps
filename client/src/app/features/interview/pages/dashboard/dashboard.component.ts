// client/src/app/features/interview/pages/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { InterviewApiService, ReadinessScore, InterviewSession } from '../../services/interview-api.service';
import { AgentService } from '../../../../core/services/agent.service';
import { ReadinessRingComponent } from '../../components/readiness-ring/readiness-ring.component';

@Component({
  selector: 'app-interview-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReadinessRingComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class InterviewDashboardComponent implements OnInit {
  private router = inject(Router);
  private interviewApi = inject(InterviewApiService);
  public agentService = inject(AgentService);

  jobId = signal<string>('');
  readiness = signal<ReadinessScore | null>(null);
  sessions = signal<InterviewSession[]>([]);
  isLoading = signal<boolean>(true);
  isRecalculating = signal<boolean>(false);

  ngOnInit() {
    const selectedId = this.agentService.selectedJobId();
    if (selectedId) {
      this.jobId.set(selectedId);
      this.loadDashboardData();
    } else {
      const jobsList = this.agentService.jobs();
      if (jobsList.length > 0) {
        this.jobId.set(jobsList[0].id);
        this.agentService.selectJob(jobsList[0].id);
        this.loadDashboardData();
      } else {
        this.isLoading.set(false);
      }
    }
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    try {
      const rd = await this.interviewApi.getReadiness(this.jobId());
      this.readiness.set(rd);
      
      const list = await this.interviewApi.getSessionsByJob(this.jobId());
      this.sessions.set(list);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async forceRecalculate() {
    if (this.isRecalculating()) return;
    this.isRecalculating.set(true);
    try {
      await this.interviewApi.generatePlan(this.jobId());
      const freshRd = await fetch(`http://localhost:5000/api/interview/readiness/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: this.jobId() })
      });
      if (freshRd.ok) {
        const data = await freshRd.json();
        this.readiness.set(data);
      }
      
      const list = await this.interviewApi.getSessionsByJob(this.jobId());
      this.sessions.set(list);
    } catch (err) {
      alert('Failed to refresh readiness profile.');
    } finally {
      this.isRecalculating.set(false);
    }
  }

  getRoundLabel(type: string): string {
    const map: Record<string, string> = {
      'resume-defense': 'Resume Defense',
      'technical': 'Technical Round',
      'behavioral': 'Behavioral Round',
      'system-design': 'System Design',
      'hiring-manager': 'Hiring Manager'
    };
    return map[type] || type;
  }

  resumeSession(sessionId: string) {
    this.router.navigate(['/interview/session', sessionId]);
  }

  goBack() {
    if (this.jobId()) {
      this.router.navigate(['/jobs', this.jobId()]);
    } else {
      this.router.navigate(['/matches']);
    }
  }
}
