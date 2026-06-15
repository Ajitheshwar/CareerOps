import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AgentLoaderComponent } from '../../shared/components/agent-loader/agent-loader.component';
import { InterviewCoachPracticeComponent } from '../../shared/components/interview-coach-practice/interview-coach-practice.component';

@Component({
  selector: 'app-interview-coach',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, AgentLoaderComponent, InterviewCoachPracticeComponent],
  templateUrl: './coach.component.html',
  styleUrls: ['./coach.component.css']
})
export class InterviewCoachComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  prepData = this.agentService.selectedInterviewPrep;

  questions = computed(() => {
    return this.prepData()?.questions || [];
  });
}

