import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { MockInterview } from '../../types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-interview-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewAnalyticsComponent implements OnInit {
  agentService = inject(AgentService);

  mockInterviews = this.agentService.mockInterviews;
  expandedSessionId = signal<string | null>(null);

  ngOnInit() {
    this.agentService.loadMockInterviews();
  }

  toggleSession(id: string) {
    if (this.expandedSessionId() === id) {
      this.expandedSessionId.set(null);
    } else {
      this.expandedSessionId.set(id);
    }
  }

  getAverageScore(): number {
    const list = this.mockInterviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, curr) => acc + curr.performanceScore, 0);
    return Math.round(sum / list.length);
  }

  getActionItems(): string[] {
    const list = this.mockInterviews();
    const allItems: string[] = [];
    list.forEach(i => {
      if (i.actionItems) {
        allItems.push(...i.actionItems);
      }
    });
    // Remove duplicates
    return Array.from(new Set(allItems));
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'high';
    if (score >= 70) return 'mid';
    return 'low';
  }
}
