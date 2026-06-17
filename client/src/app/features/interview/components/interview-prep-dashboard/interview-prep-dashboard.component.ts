import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReadinessScore, InterviewSession, InterviewApiService } from '../../services/interview-api.service';
import { ReadinessRingComponent } from '../readiness-ring/readiness-ring.component';
import { InterviewRoundCardComponent } from '../interview-round-card/interview-round-card.component';
import { SessionSetupModalComponent } from '../session-setup-modal/session-setup-modal.component';
import { HistoricalJob } from '../../../../core/types';

@Component({
  selector: 'app-interview-prep-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReadinessRingComponent,
    InterviewRoundCardComponent,
    SessionSetupModalComponent
  ],
  templateUrl: './interview-prep-dashboard.component.html',
  styleUrls: ['./interview-prep-dashboard.component.css']
})
export class InterviewPrepDashboardComponent {
  @Input() readiness: ReadinessScore | null = null;
  @Input() sessions: InterviewSession[] = [];
  @Input() details: HistoricalJob | null = null;
  @Input() roundsConfig: any[] = [
    { type: 'resume-defense', label: 'Resume Defense', description: 'Can you defend claims made on your resume?', icon: '🛡️' },
    { type: 'technical', label: 'Technical Round', description: 'Core skill requirements and framework concepts.', icon: '💻' },
    { type: 'system-design', label: 'System Design', description: 'Scalability, performance, caching, and state layout.', icon: '🏗️' },
    { type: 'behavioral', label: 'Behavioral Round', description: 'STAR evaluations on teamwork, conflict, and motivation.', icon: '🤝' },
    { type: 'hiring-manager', label: 'Hiring Manager', description: 'Growth, cultural fit, alignment, and long-term values.', icon: '👑' }
  ];

  private interviewApi = inject(InterviewApiService);
  private router = inject(Router);

  showSetupModal = false;
  selectedRoundType = '';
  selectedRoundLabel = '';
  isStartingSession = false;

  getRoundReadiness(type: string): number {
    if (!this.readiness) return 0;
    const map: Record<string, number> = {
      'resume-defense': this.readiness.resumeDefenseReadiness,
      'technical': this.readiness.technicalReadiness,
      'system-design': this.readiness.systemDesignReadiness,
      'behavioral': this.readiness.behavioralReadiness,
      'hiring-manager': this.readiness.hiringManagerReadiness
    };
    return map[type] || 0;
  }

  getRoundSession(roundType: string): InterviewSession | undefined {
    return this.sessions.find(s => s.type === roundType);
  }

  viewDashboard(): void {
    this.router.navigate(['/interview/dashboard']);
  }

  openSetupModal(roundType: string, roundLabel: string) {
    this.selectedRoundType = roundType;
    this.selectedRoundLabel = roundLabel;
    this.showSetupModal = true;
  }

  closeSetupModal() {
    this.showSetupModal = false;
  }

  async startRoundPractice(config: { difficulty: 'beginner' | 'intermediate' | 'advanced'; focus: string[] }) {
    if (!this.details) return;
    this.isStartingSession = true;
    try {
      const type = this.selectedRoundType;
      const result = await this.interviewApi.createSession(this.details.id, type, config);
      this.closeSetupModal();
      this.router.navigate(['/interview/session', result.session.id]);
    } catch (err: any) {
      alert(err.message || 'Failed to start interview round.');
    } finally {
      this.isStartingSession = false;
    }
  }

  continueRoundPractice(sessionId: string) {
    this.router.navigate(['/interview/session', sessionId]);
  }

  restartRoundPractice(roundType: string, roundLabel: string) {
    const confirmed = confirm(`Are you sure you want to restart the ${roundLabel} round? This will archive your active session progress.`);
    if (confirmed) {
      this.openSetupModal(roundType, roundLabel);
    }
  }
}
