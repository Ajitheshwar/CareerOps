import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { Job, MatchResult } from '../../types';

@Component({
  selector: 'app-job-matches',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="matches-wrapper fade-in">
      <div class="matches-header">
        <h2>Target Job Matchings</h2>
        <p>Explore parsed opportunities, evaluated against your resume using LLM analysis.</p>
      </div>

      @if (jobs().length === 0) {
        <div class="glass-card empty-state">
          <div class="empty-icon">📂</div>
          <h4>No job matchings yet</h4>
          <p>Configure your resume and hit "Analyze & Match Jobs" to see matching ratios here.</p>
        </div>
      } @else {
        <div class="matches-grid">
          @for (job of jobs(); track job.id) {
            @let match = getMatchResult(job.id);
            <div 
              class="glass-card job-card" 
              [ngClass]="{ 'selected': isSelected(job.id), 'expanded': expandedJobId() === job.id }"
              (click)="toggleExpand(job.id)"
            >
              <div class="card-top">
                <div class="job-info">
                  <span class="source-badge">{{ job.source }}</span>
                  <h3>{{ job.title }}</h3>
                  <p class="company-name">{{ job.company }}</p>
                  <div class="job-meta">
                    <span class="meta-item">📍 {{ job.location }}</span>
                    @if (job.salary) {
                      <span class="meta-item">💵 {{ job.salary }}</span>
                    }
                  </div>
                </div>

                @if (match) {
                  <div class="progress-ring-container">
                    <svg width="64" height="64" class="progress-svg">
                      <circle class="circle-bg" cx="32" cy="32" r="26" />
                      <circle 
                        class="circle-fg" 
                        [ngClass]="getScoreColorClass(match.matchScore)"
                        cx="32" 
                        cy="32" 
                        r="26" 
                        [style.strokeDashoffset]="calculateOffset(match.matchScore)"
                      />
                    </svg>
                    <span class="progress-ring-text" [ngClass]="getScoreColorClass(match.matchScore)">
                      {{ match.matchScore }}%
                    </span>
                  </div>
                }
              </div>

              <!-- Expanded Details Section -->
              @if (expandedJobId() === job.id && match) {
                <div class="expanded-details fade-in" (click)="$event.stopPropagation()">
                  <div class="details-divider"></div>
                  
                  <div class="section-block">
                    <h5>Fit Evaluation</h5>
                    <p class="detail-text">{{ match.fitExplanation }}</p>
                  </div>

                  <div class="row-skills">
                    <div class="skills-col">
                      <h5>Matching Strengths</h5>
                      <div class="skills-list">
                        @for (skill of match.matchingSkills; track skill) {
                          <span class="badge badge-green">{{ skill }}</span>
                        } @empty {
                          <span class="no-skills">None matched</span>
                        }
                      </div>
                    </div>

                    <div class="skills-col">
                      <h5>Target Skill Gaps</h5>
                      <div class="skills-list">
                        @for (gap of match.skillGaps; track gap) {
                          <span class="badge badge-rose">{{ gap }}</span>
                        } @empty {
                          <span class="no-skills">No critical gaps!</span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="section-block">
                    <h5>Career Relevancy</h5>
                    <p class="detail-text">{{ match.experienceRelevance }}</p>
                  </div>

                  <div class="card-actions">
                    <button 
                      class="btn btn-primary"
                      (click)="onTailor(job.id)"
                      [disabled]="agentService.status() === 'tailoring' || agentService.status() === 'preparing'"
                    >
                      @if (agentService.status() === 'tailoring' && isSelected(job.id)) {
                        <span>Tailoring Resume...</span>
                      } @else if (agentService.status() === 'preparing' && isSelected(job.id)) {
                        <span>Coaching Prep...</span>
                      } @else {
                        <span>Tailor Materials & Prep Interview</span>
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .matches-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .matches-header {
      margin-bottom: 8px;
    }
    .matches-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }
    .empty-state {
      text-align: center;
      padding: 48px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon {
      font-size: 3rem;
    }
    .empty-state h4 {
      font-size: 1.1rem;
      font-weight: 500;
    }
    
    .matches-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .job-card {
      cursor: pointer;
      position: relative;
      border-color: var(--border-color);
      transition: var(--transition-smooth);
    }
    .job-card:hover {
      background: var(--bg-card-hover);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .job-card.selected {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.1);
    }
    
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .job-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .source-badge {
      display: inline-block;
      align-self: flex-start;
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--accent-purple);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(168, 85, 247, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(168, 85, 247, 0.25);
    }
    .job-info h3 {
      font-size: 1.15rem;
      color: #fff;
    }
    .company-name {
      font-weight: 500;
      color: var(--accent-cyan);
      font-size: 0.95rem;
    }
    .job-meta {
      display: flex;
      gap: 12px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .meta-item {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    
    /* Progress score ring */
    .progress-svg {
      transform: rotate(-90deg);
    }
    .circle-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.03);
      stroke-width: 4px;
    }
    .circle-fg {
      fill: none;
      stroke-width: 4px;
      stroke-linecap: round;
      stroke-dasharray: 163.36; /* 2 * pi * r (r=26) */
      transition: stroke-dashoffset 0.5s ease;
    }
    .circle-fg.green { stroke: var(--accent-green); }
    .circle-fg.cyan { stroke: var(--accent-cyan); }
    .circle-fg.warn { stroke: var(--accent-rose); }
    
    .progress-ring-text.green { color: var(--accent-green); }
    .progress-ring-text.cyan { color: var(--accent-cyan); }
    .progress-ring-text.warn { color: var(--accent-rose); }
    
    /* Expanded Details */
    .expanded-details {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .details-divider {
      height: 1px;
      background: var(--border-color);
      width: 100%;
    }
    .section-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-block h5 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .detail-text {
      font-size: 0.9rem;
      color: #e5e7eb;
    }
    .row-skills {
      display: flex;
      gap: 16px;
    }
    .skills-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .skills-col h5 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .no-skills {
      font-size: 0.85rem;
      color: #4b5563;
      font-style: italic;
    }
    @media (max-width: 600px) {
      .row-skills {
        flex-direction: column;
      }
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `]
})
export class JobMatchesComponent {
  agentService = inject(AgentService);

  jobs = this.agentService.jobs;
  matches = this.agentService.matches;

  expandedJobId = signal<string | null>(null);

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
