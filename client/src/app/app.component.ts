import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from './services/agent.service';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AgentGraphComponent } from './components/agent-graph/agent-graph.component';
import { ConsoleComponent } from './components/console/console.component';
import { JobMatchesComponent } from './components/job-matches/job-matches.component';
import { ResumeTailorComponent } from './components/resume-tailor/resume-tailor.component';
import { InterviewCoachComponent } from './components/interview-coach/interview-coach.component';

type TabName = 'profile' | 'matches' | 'tailor' | 'coach';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    UserProfileComponent,
    AgentGraphComponent,
    ConsoleComponent,
    JobMatchesComponent,
    ResumeTailorComponent,
    InterviewCoachComponent
  ],
  template: `
    <div class="app-container">
      <!-- Sidebar Navigation -->
      <aside class="sidebar glass-card">
        <div class="sidebar-brand">
          <span class="brand-glow"></span>
          <h2>CareerOps <span>v1.0</span></h2>
          <p class="brand-subtitle">Multi-Agent Career Agent</p>
        </div>

        <nav class="sidebar-nav">
          <button 
            class="nav-item" 
            [class.active]="activeTab() === 'profile'" 
            (click)="setTab('profile')"
          >
            <span class="nav-icon">👤</span> Profile & Resume
          </button>
          
          <button 
            class="nav-item" 
            [class.active]="activeTab() === 'matches'" 
            (click)="setTab('matches')"
            [disabled]="agentService.jobs().length === 0"
          >
            <span class="nav-icon">📊</span> Target Matches
            @if (agentService.jobs().length > 0) {
              <span class="nav-count">{{ agentService.jobs().length }}</span>
            }
          </button>

          <button 
            class="nav-item" 
            [class.active]="activeTab() === 'tailor'" 
            (click)="setTab('tailor')"
            [disabled]="!agentService.selectedJobId()"
          >
            <span class="nav-icon">✍️</span> Resume Tailor
          </button>

          <button 
            class="nav-item" 
            [class.active]="activeTab() === 'coach'" 
            (click)="setTab('coach')"
            [disabled]="!agentService.selectedJobId()"
          >
            <span class="nav-icon">💬</span> Interview Coach
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="session-info">
            <span class="status-label">Engine status:</span>
            <span class="status-value" [ngClass]="agentService.status()">
              {{ getStatusLabel(agentService.status()) }}
            </span>
          </div>
        </div>
      </aside>

      <!-- Main Dashboard Grid -->
      <main class="main-content">
        <div class="dashboard-grid">
          <!-- Main Content Pane (Dynamic Tab Loading) -->
          <div class="main-pane">
            @if (activeTab() === 'profile') {
              <app-user-profile />
            } @else if (activeTab() === 'matches') {
              <app-job-matches />
            } @else if (activeTab() === 'tailor') {
              <app-resume-tailor />
            } @else if (activeTab() === 'coach') {
              <app-interview-coach />
            }
          </div>

          <!-- Live Orchestration Monitoring Panel (Graph + Terminal) -->
          <div class="monitoring-pane">
            <app-agent-graph />
            <app-console />
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      min-height: 100vh;
      width: 100vw;
      background: var(--bg-primary);
    }
    
    /* Sidebar styling */
    .sidebar {
      width: 260px;
      height: 100vh;
      border-radius: 0 !important;
      border: none !important;
      border-right: 1px solid var(--border-color) !important;
      background: rgba(10, 15, 30, 0.7) !important;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      padding: 30px 20px !important;
    }
    .sidebar-brand {
      position: relative;
      margin-bottom: 40px;
    }
    .brand-glow {
      position: absolute;
      width: 40px;
      height: 40px;
      background: var(--accent-cyan);
      filter: blur(20px);
      top: -10px;
      left: -10px;
      opacity: 0.3;
      border-radius: 50%;
    }
    .sidebar-brand h2 {
      font-size: 1.4rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sidebar-brand h2 span {
      font-size: 0.65rem;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--accent-cyan);
      padding: 1px 4px;
      border-radius: 4px;
      font-family: var(--font-mono);
    }
    .brand-subtitle {
      font-size: 0.75rem;
      color: var(--accent-purple);
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-grow: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-family: var(--font-main);
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: var(--transition-smooth);
      position: relative;
    }
    .nav-item:hover:not(:disabled) {
      color: #fff;
      background: rgba(255, 255, 255, 0.03);
    }
    .nav-item.active {
      color: #fff;
      background: rgba(6, 182, 212, 0.08);
      border-color: rgba(6, 182, 212, 0.2);
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 25%;
      height: 50%;
      width: 3px;
      background: var(--accent-cyan);
      border-radius: 0 4px 4px 0;
    }
    .nav-item:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nav-icon {
      font-size: 1.1rem;
    }
    .nav-count {
      margin-left: auto;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      background: rgba(6, 182, 212, 0.2);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--accent-cyan);
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
    
    .sidebar-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }
    .session-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .status-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-value {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .status-value.searching, .status-value.matching, .status-value.tailoring, .status-value.preparing {
      color: var(--accent-cyan);
    }
    .status-value.completed {
      color: var(--accent-green);
    }
    .status-value.error {
      color: var(--accent-rose);
    }
    
    /* Main Content Layout */
    .main-content {
      flex-grow: 1;
      padding: 30px;
      overflow-y: auto;
      height: 100vh;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 30px;
      align-items: start;
      max-width: 1400px;
      margin: 0 auto;
    }
    @media (max-width: 1200px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
    .main-pane {
      min-width: 0;
    }
    .monitoring-pane {
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: sticky;
      top: 30px;
    }
    
    @media (max-width: 768px) {
      .app-container {
        flex-direction: column;
      }
      .sidebar {
        width: 100%;
        height: auto;
        border-right: none !important;
        border-bottom: 1px solid var(--border-color) !important;
        position: relative;
        padding: 20px !important;
      }
      .sidebar-brand {
        margin-bottom: 20px;
      }
      .sidebar-nav {
        flex-direction: row;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .nav-item {
        flex: 1;
        min-width: 120px;
        justify-content: center;
        padding: 8px 12px;
        font-size: 0.85rem;
      }
      .main-content {
        padding: 16px;
        height: auto;
        overflow-y: visible;
      }
      .monitoring-pane {
        position: static;
      }
    }
  `]
})
export class AppComponent {
  agentService = inject(AgentService);

  activeTab = signal<TabName>('profile');

  constructor() {
    // Watch status transitions to auto redirect tabs
    // When search matches finish, auto navigate to matches tab
    // When tailoring/prep finishes, auto navigate to tailor/coach
    let lastStatus = this.agentService.status();
    
    // Create an effect to watch transitions
    // Angular 18 permits tracking states using effect
  }

  setTab(tab: TabName) {
    this.activeTab.set(tab);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'idle': return 'Ready';
      case 'searching': return 'Searching Opportunities';
      case 'matching': return 'Analyzing Resumes';
      case 'tailoring': return 'Tuning Work History';
      case 'preparing': return 'Building Q&A Coach';
      case 'completed': return 'Work Complete';
      case 'error': return 'Execution Failed';
      default: return 'Online';
    }
  }
}
