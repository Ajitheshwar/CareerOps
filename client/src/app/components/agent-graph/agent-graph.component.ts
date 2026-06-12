import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';

interface GraphNode {
  id: string;
  label: string;
  desc: string;
  icon: string;
}

@Component({
  selector: 'app-agent-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card graph-wrapper fade-in">
      <h3>Active Agent Coordination</h3>
      <p class="subtitle">Real-time status of the multi-agent collaborative workspace</p>

      <div class="nodes-container">
        <!-- Main Orchestrator Node -->
        <div class="orchestrator-row">
          <div class="node-item orchestrator-node" [ngClass]="getNodeClass('Orchestrator')">
            <div class="node-icon">🧠</div>
            <div class="node-details">
              <h4>Orchestrator</h4>
              <span class="node-status">{{ getStatusText('Orchestrator') }}</span>
            </div>
          </div>
        </div>

        <div class="connector-line vertical"></div>

        <!-- Worker Agents Row -->
        <div class="workers-row">
          @for (node of workerNodes; track node.id; let i = $index) {
            @if (i > 0) {
              <div class="connector-arrow">➔</div>
            }
            <div class="node-item worker-node" [ngClass]="getNodeClass(node.id)">
              <div class="node-icon">{{ node.icon }}</div>
              <div class="node-details">
                <h4>{{ node.label }}</h4>
                <p class="node-desc">{{ node.desc }}</p>
                <span class="node-status">{{ getStatusText(node.id) }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .graph-wrapper {
      margin-bottom: 24px;
    }
    h3 {
      font-size: 1.2rem;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 0.85rem;
      margin-bottom: 24px;
    }
    .nodes-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
    }
    .orchestrator-row {
      display: flex;
      justify-content: center;
      width: 100%;
    }
    .node-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: rgba(15, 23, 42, 0.4);
      min-width: 180px;
      transition: var(--transition-smooth);
    }
    .orchestrator-node {
      border-color: rgba(168, 85, 247, 0.3);
      background: rgba(168, 85, 247, 0.05);
    }
    .orchestrator-node.active {
      border-color: var(--accent-purple);
      box-shadow: 0 0 16px rgba(168, 85, 247, 0.4);
      animation: pulse-purple 2s infinite;
    }
    
    .workers-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 12px;
      margin-top: 12px;
    }
    @media (max-width: 900px) {
      .workers-row {
        flex-direction: column;
        gap: 20px;
      }
      .connector-arrow {
        transform: rotate(90deg);
      }
    }
    .worker-node {
      flex: 1;
      min-width: 150px;
    }
    .node-icon {
      font-size: 1.6rem;
    }
    .node-details h4 {
      font-size: 0.9rem;
      margin-bottom: 2px;
    }
    .node-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .node-status {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    /* Connectors */
    .connector-line.vertical {
      width: 2px;
      height: 24px;
      background: linear-gradient(to bottom, rgba(168, 85, 247, 0.4), rgba(6, 182, 212, 0.4));
    }
    .connector-arrow {
      color: rgba(255, 255, 255, 0.15);
      font-size: 1.2rem;
    }

    /* Node States */
    .node-item.idle {
      opacity: 0.6;
    }
    .node-item.active {
      border-color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.05);
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.3);
      animation: pulse-cyan 2s infinite;
    }
    .node-item.active .node-status {
      color: var(--accent-cyan);
    }
    .node-item.completed {
      border-color: var(--accent-green);
      background: rgba(16, 185, 129, 0.05);
    }
    .node-item.completed .node-status {
      color: var(--accent-green);
    }
    .node-item.error {
      border-color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.05);
    }
    .node-item.error .node-status {
      color: var(--accent-rose);
    }
  `]
})
export class AgentGraphComponent {
  agentService = inject(AgentService);

  workerNodes: GraphNode[] = [
    { id: 'JobSearch', label: 'Job Searcher', desc: 'Finds matching job openings', icon: '🔍' },
    { id: 'ResumeAnalyzer', label: 'Resume Analyzer', desc: 'Analyzes fits & skill gaps', icon: '📊' },
    { id: 'Tailoring', label: 'Resume Tailor', desc: 'Adjusts bullet points & letter', icon: '✍️' },
    { id: 'InterviewPrep', label: 'Interview Coach', desc: 'Generates Q&A checklists', icon: '💬' }
  ];

  getNodeClass(nodeId: string): { [key: string]: boolean } {
    const status = this.agentService.status();
    
    if (nodeId === 'Orchestrator') {
      const isOrchestrating = ['searching', 'matching', 'tailoring', 'preparing'].includes(status);
      return {
        active: isOrchestrating,
        completed: status === 'completed',
        error: status === 'error',
        idle: status === 'idle'
      };
    }

    // Worker agent mapping
    if (nodeId === 'JobSearch') {
      return {
        active: status === 'searching',
        completed: ['matching', 'tailoring', 'preparing', 'completed'].includes(status) && this.agentService.jobs().length > 0,
        error: status === 'error' && this.agentService.jobs().length === 0,
        idle: ['idle', 'tailoring', 'preparing'].includes(status) && this.agentService.jobs().length === 0
      };
    }

    if (nodeId === 'ResumeAnalyzer') {
      return {
        active: status === 'matching',
        completed: ['tailoring', 'preparing', 'completed'].includes(status) && this.agentService.matches().length > 0,
        error: status === 'error' && this.agentService.jobs().length > 0 && this.agentService.matches().length === 0,
        idle: ['idle', 'searching'].includes(status)
      };
    }

    if (nodeId === 'Tailoring') {
      const hasTailoring = this.agentService.selectedJobId() && this.agentService.selectedTailoredResume();
      return {
        active: status === 'tailoring',
        completed: (status === 'preparing' || status === 'completed') && !!hasTailoring,
        error: status === 'error' && !!this.agentService.selectedJobId() && !this.agentService.selectedTailoredResume(),
        idle: !['tailoring', 'preparing', 'completed'].includes(status) || !hasTailoring
      };
    }

    if (nodeId === 'InterviewPrep') {
      const hasPrep = this.agentService.selectedJobId() && this.agentService.selectedInterviewPrep();
      return {
        active: status === 'preparing',
        completed: status === 'completed' && !!hasPrep,
        error: status === 'error' && !!this.agentService.selectedTailoredResume() && !this.agentService.selectedInterviewPrep(),
        idle: status !== 'preparing' && !hasPrep
      };
    }

    return { idle: true };
  }

  getStatusText(nodeId: string): string {
    const classes = this.getNodeClass(nodeId);
    if (classes['active']) return 'Running';
    if (classes['completed']) return 'Completed';
    if (classes['error']) return 'Failed';
    return 'Idle';
  }
}
