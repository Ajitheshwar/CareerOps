import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AgentLoaderComponent } from '../../shared/components/agent-loader/agent-loader.component';
import { ResumeTailoringDetailsComponent } from '../../shared/components/resume-tailoring-details/resume-tailoring-details.component';
import { CoverLetterDraftComponent } from '../../shared/components/cover-letter-draft/cover-letter-draft.component';

@Component({
  selector: 'app-resume-tailor',
  standalone: true,
  imports: [
    CommonModule, 
    EmptyStateComponent, 
    AgentLoaderComponent, 
    ResumeTailoringDetailsComponent, 
    CoverLetterDraftComponent
  ],
  templateUrl: './tailor.component.html',
  styleUrls: ['./tailor.component.css']
})
export class ResumeTailorComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  tailoredResume = this.agentService.selectedTailoredResume;
  coverLetter = this.agentService.selectedCoverLetter;

  activeTab = signal<'resume' | 'cover-letter'>('resume');
}

