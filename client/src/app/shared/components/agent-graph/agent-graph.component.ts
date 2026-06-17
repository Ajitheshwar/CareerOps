import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../../core/services/agent.service';

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
  templateUrl: './agent-graph.component.html',
  styleUrls: ['./agent-graph.component.css']
})
export class AgentGraphComponent {
  agentService = inject(AgentService);

  isOpen = signal<boolean>(false);

  hasActiveAgent = computed(() => {
    const status = this.agentService.status();
    return ['searching', 'matching', 'tailoring', 'preparing'].includes(status);
  });

  activeAgentIcon = computed(() => {
    const status = this.agentService.status();
    switch (status) {
      case 'searching': return '🔍';
      case 'matching': return '📊';
      case 'tailoring': return '✍️';
      case 'preparing': return '💬';
      default: return '🧠';
    }
  });

  toggleDrawer(): void {
    this.isOpen.update(val => !val);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  workerNodes: GraphNode[] = [
    { id: 'JobSearch', label: 'Job Searcher', desc: 'Finds matching job openings', icon: '🔍' },
    { id: 'ResumeAnalyzer', label: 'Resume Analyzer', desc: 'Analyzes fits & skill gaps', icon: '📊' },
    { id: 'Tailoring', label: 'Resume Tailor', desc: 'Adjusts bullet points & letter', icon: '✍️' },
    { id: 'InterviewPrep', label: 'Interview Coach', desc: 'Generates Q&A checklists', icon: '💬' }
  ];

  orchestratorNode = computed(() => {
    const status = this.agentService.status();
    const isOrchestrating = ['searching', 'matching', 'tailoring', 'preparing'].includes(status);
    const classes = {
      active: isOrchestrating,
      completed: status === 'completed',
      error: status === 'error',
      idle: status === 'idle'
    };
    return {
      classes,
      statusText: classes.active ? 'Running' : classes.completed ? 'Completed' : classes.error ? 'Failed' : 'Idle'
    };
  });

  workerNodesState = computed(() => {
    const status = this.agentService.status();
    const jobs = this.agentService.jobs();
    const matches = this.agentService.matches();
    const selectedJobId = this.agentService.selectedJobId();
    const tailoredResume = this.agentService.selectedTailoredResume();
    const interviewPrep = this.agentService.selectedInterviewPrep();

    return this.workerNodes.map(node => {
      let classes: { [key: string]: boolean } = { idle: true };

      if (node.id === 'JobSearch') {
        classes = {
          active: status === 'searching',
          completed: ['matching', 'tailoring', 'preparing', 'completed'].includes(status) && jobs.length > 0,
          error: status === 'error' && jobs.length === 0,
          idle: ['idle', 'tailoring', 'preparing'].includes(status) && jobs.length === 0
        };
      } else if (node.id === 'ResumeAnalyzer') {
        classes = {
          active: status === 'matching',
          completed: ['tailoring', 'preparing', 'completed'].includes(status) && matches.length > 0,
          error: status === 'error' && jobs.length > 0 && matches.length === 0,
          idle: ['idle', 'searching'].includes(status)
        };
      } else if (node.id === 'Tailoring') {
        const hasTailoring = selectedJobId && tailoredResume;
        classes = {
          active: status === 'tailoring',
          completed: (status === 'preparing' || status === 'completed') && !!hasTailoring,
          error: status === 'error' && !!selectedJobId && !tailoredResume,
          idle: !['tailoring', 'preparing', 'completed'].includes(status) || !hasTailoring
        };
      } else if (node.id === 'InterviewPrep') {
        const hasPrep = selectedJobId && interviewPrep;
        classes = {
          active: status === 'preparing',
          completed: status === 'completed' && !!hasPrep,
          error: status === 'error' && !!tailoredResume && !interviewPrep,
          idle: status !== 'preparing' && !hasPrep
        };
      }

      const statusText = classes['active'] ? 'Running' : classes['completed'] ? 'Completed' : classes['error'] ? 'Failed' : 'Idle';

      return {
        ...node,
        classes,
        statusText
      };
    });
  });
}
