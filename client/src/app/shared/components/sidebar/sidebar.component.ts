import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AgentService } from '../../../services/agent.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  agentService = inject(AgentService);

  isSidebarCollapsed = signal<boolean>(true);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(val => !val);
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
