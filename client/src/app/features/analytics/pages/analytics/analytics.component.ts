import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgentService } from '../../../../core/services/agent.service';
import { MockInterview } from '../../../../core/types';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

export interface ActionItemEntry {
  interviewId: string;
  item: string;
}

const CHECKLIST_LIMIT = 20;
const SESSIONS_LIMIT = 10;

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
  private router = inject(Router);

  mockInterviews = this.agentService.mockInterviews;

  // UI state signals
  showCompletedModal = signal<boolean>(false);
  showAllItems = signal<boolean>(false);
  showAllSessions = signal<boolean>(false);

  ngOnInit() {
    this.agentService.loadMockInterviews();
  }

  // ─── Action Items ────────────────────────────────────────────────────────────

  /** All pending (non-completed) action items with their source interview ID */
  getAllPendingItems(): ActionItemEntry[] {
    const list = this.mockInterviews();
    const seen = new Set<string>();
    const result: ActionItemEntry[] = [];

    list.forEach(iv => {
      const completed = iv.completedActionItems ?? [];
      (iv.actionItems ?? []).forEach(item => {
        if (!completed.includes(item) && !seen.has(item)) {
          seen.add(item);
          result.push({ interviewId: iv.id, item });
        }
      });
    });

    return result;
  }

  /** Pending items capped at CHECKLIST_LIMIT unless showAllItems is true */
  getVisibleItems(): ActionItemEntry[] {
    const all = this.getAllPendingItems();
    return this.showAllItems() ? all : all.slice(0, CHECKLIST_LIMIT);
  }

  getPendingItemCount(): number {
    return this.getAllPendingItems().length;
  }

  /** All completed items deduplicated across sessions */
  getCompletedItems(): string[] {
    const list = this.mockInterviews();
    const seen = new Set<string>();
    list.forEach(iv => {
      (iv.completedActionItems ?? []).forEach(item => seen.add(item));
    });
    return Array.from(seen);
  }

  onActionItemChange(interviewId: string, item: string, checked: boolean) {
    this.agentService.updateActionItem(interviewId, item, checked);
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  getVisibleSessions(): MockInterview[] {
    const list = this.mockInterviews();
    return this.showAllSessions() ? list : list.slice(0, SESSIONS_LIMIT);
  }

  navigateToSession(id: string) {
    this.router.navigate(['/interview/session', id], { queryParams: { from: 'analytics' } });
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  getAverageScore(): number {
    const list = this.mockInterviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, curr) => acc + curr.performanceScore, 0);
    return Math.round(sum / list.length);
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'high';
    if (score >= 70) return 'mid';
    return 'low';
  }
}
