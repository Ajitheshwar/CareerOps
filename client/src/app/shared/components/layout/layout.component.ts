import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AgentService } from '../../../services/agent.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AgentGraphComponent } from '../agent-graph/agent-graph.component';
import { ConsoleComponent } from '../console/console.component';

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    SidebarComponent,
    AgentGraphComponent,
    ConsoleComponent
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent {
  agentService = inject(AgentService);

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
