import { Component, inject, ViewChild, ElementRef, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../../services/agent.service';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.css']
})
export class ConsoleComponent {
  agentService = inject(AgentService);
  
  @ViewChild('consoleBody') consoleBodyEl!: ElementRef;

  filterAgent = signal<string>('ALL');
  isExpanded = signal<boolean>(false);
  isMaximized = signal<boolean>(false);

  filteredLogs = computed(() => {
    const rawLogs = this.agentService.logs();
    const filter = this.filterAgent();
    if (filter === 'ALL') return rawLogs;
    return rawLogs.filter(log => log.agent === filter);
  });

  latestLogs = computed(() => {
    const logs = this.filteredLogs();
    if (this.isMaximized()) {
      return logs;
    }
    return logs.slice(-5);
  });

  constructor() {
    effect(() => {
      this.latestLogs();
      
      setTimeout(() => {
        if (this.consoleBodyEl) {
          const el = this.consoleBodyEl.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      }, 50);
    });
  }

  toggleExpand(event: MouseEvent) {
    this.isExpanded.update(val => !val);
  }

  toggleMaximize(event: MouseEvent) {
    event.stopPropagation();
    this.isMaximized.update(val => !val);
    if (this.isMaximized()) {
      this.isExpanded.set(true);
    }
  }

  setFilter(event: any) {
    this.filterAgent.set(event.target.value);
  }

  clearLogs() {
    this.agentService.clearLogs();
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
