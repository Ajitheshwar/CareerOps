import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterviewApiService, ReadinessScore, InterviewSession } from '../../../interview/services/interview-api.service';
import { InterviewPrepDashboardComponent } from '../../../interview/components/interview-prep-dashboard/interview-prep-dashboard.component';
import { HistoricalJob } from '../../../../core/types';

@Component({
  selector: 'app-interview-coach',
  standalone: true,
  imports: [CommonModule, InterviewPrepDashboardComponent],
  templateUrl: './coach.component.html',
  styleUrls: ['./coach.component.css']
})
export class InterviewCoachComponent implements OnInit {
  private interviewApi = inject(InterviewApiService);

  readiness = signal<ReadinessScore | null>(null);
  sessions = signal<InterviewSession[]>([]);
  isLoading = signal<boolean>(true);

  genericJobDetails: HistoricalJob = {
    id: 'generic',
    job: {
      id: 'generic',
      title: 'Generic Career Path',
      company: 'General',
      location: 'India',
      description: 'Generic adaptive coach evaluation based on your resume.',
      source: 'CareerOps'
    },
    matchResult: {
      matchScore: 100,
      matchingSkills: [],
      skillGaps: [],
      fitExplanation: 'Generic interview practice evaluation.'
    }
  } as any;

  ngOnInit() {
    this.loadCoachData();
  }

  async loadCoachData() {
    this.isLoading.set(true);
    try {
      try {
        await this.interviewApi.generatePlan('generic');
      } catch (e) {
        console.warn('Initial generic plan call failed/cached:', e);
      }

      const rd = await this.interviewApi.getReadiness('generic');
      this.readiness.set(rd);

      const list = await this.interviewApi.getSessionsByJob('generic');
      this.sessions.set(list);
    } catch (err) {
      console.error('Failed to load generic coach data:', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}

