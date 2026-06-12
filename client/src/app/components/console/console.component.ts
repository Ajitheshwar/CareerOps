import { Component, inject, ViewChild, ElementRef, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { AgentName } from '../../types';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card console-container fade-in">
      <div class="console-header">
        <div class="header-left">
          <span class="status-dot" [ngClass]="agentService.status()"></span>
          <h3>Agent Command Console</h3>
        </div>
        <div class="header-actions">
          <select (change)="setFilter($event)" class="filter-select">
            <option value="ALL">All Agents</option>
            <option value="Orchestrator">Orchestrator</option>
            <option value="JobSearch">Job Searcher</option>
            <option value="ResumeAnalyzer">Resume Analyzer</option>
            <option value="Tailoring">Resume Tailor</option>
            <option value="InterviewPrep">Interview Coach</option>
          </select>
          <button (click)="clearLogs()" class="btn-clear">Clear</button>
        </div>
      </div>

      <div class="console-body" #consoleBody>
        @if (filteredLogs().length === 0) {
          <div class="empty-logs">
            <span class="prompt-symbol">></span> Awaiting command execution...
          </div>
        } @else {
          @for (log of filteredLogs(); track log.id) {
            <div class="log-line" [ngClass]="log.level">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-agent" [ngClass]="log.agent">{{ log.agent }}</span>
              <span class="log-level-badge" [ngClass]="log.level">{{ log.level }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .console-container {
      background: rgba(10, 15, 30, 0.85) !important;
      border-color: rgba(6, 182, 212, 0.15) !important;
      padding: 16px !important;
    }
    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4b5563;
    }
    .status-dot.searching, .status-dot.matching, .status-dot.tailoring, .status-dot.preparing {
      background: var(--accent-cyan);
      box-shadow: 0 0 8px var(--accent-cyan);
      animation: pulse-dot 1.5s infinite;
    }
    .status-dot.completed {
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
    }
    .status-dot.error {
      background: var(--accent-rose);
      box-shadow: 0 0 8px var(--accent-rose);
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    h3 {
      font-size: 1rem;
      font-family: var(--font-mono);
      font-weight: 500;
      color: #9cdcfe;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
    .filter-select {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      outline: none;
    }
    .btn-clear {
      background: none;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-family: var(--font-mono);
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .btn-clear:hover {
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    
    .console-body {
      height: 250px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 6px;
    }
    .empty-logs {
      color: #4b5563;
      padding: 8px 0;
    }
    .prompt-symbol {
      color: var(--accent-cyan);
      font-weight: 700;
    }
    .log-line {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      word-break: break-word;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .log-time {
      color: #4b5563;
      flex-shrink: 0;
    }
    .log-agent {
      font-weight: 700;
      padding: 0px 4px;
      border-radius: 3px;
      font-size: 0.75rem;
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .log-agent.Orchestrator { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
    .log-agent.JobSearch { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
    .log-agent.ResumeAnalyzer { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
    .log-agent.Tailoring { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .log-agent.InterviewPrep { background: rgba(16, 185, 129, 0.2); color: #34d399; }

    .log-level-badge {
      font-size: 0.7rem;
      padding: 0px 3px;
      border-radius: 2px;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .log-level-badge.thought { border: 1px solid rgba(255, 255, 255, 0.1); color: #6b7280; }
    .log-level-badge.info { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
    .log-level-badge.success { background: rgba(16, 185, 129, 0.1); color: #34d399; }
    .log-level-badge.warn { background: rgba(244, 63, 94, 0.1); color: #fb7185; }

    .log-message {
      color: #e5e7eb;
    }
    .log-line.thought .log-message {
      color: #8892b0;
      font-style: italic;
    }
    .log-line.success .log-message {
      color: #a7f3d0;
    }
    .log-line.warn .log-message {
      color: #fca5a5;
    }
  `]
})
export class ConsoleComponent {
  agentService = inject(AgentService);
  
  @ViewChild('consoleBody') consoleBodyEl!: ElementRef;

  filterAgent = signal<string>('ALL');

  filteredLogs = computed(() => {
    const rawLogs = this.agentService.logs();
    const filter = this.filterAgent();
    if (filter === 'ALL') return rawLogs;
    return rawLogs.filter(log => log.agent === filter);
  });

  constructor() {
    // Scroll element to bottom on log updates
    effect(() => {
      // Access signal to register dependency
      this.filteredLogs();
      
      // Execute scroll after rendering
      setTimeout(() => {
        if (this.consoleBodyEl) {
          const el = this.consoleBodyEl.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      }, 50);
    });
  }

  setFilter(event: any) {
    this.filterAgent.set(event.target.value);
  }

  clearLogs() {
    this.agentService.reset();
  }

  formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      return date.toTimeString().split(' ')[0];
    } catch (e) {
      return '';
    }
  }
}
