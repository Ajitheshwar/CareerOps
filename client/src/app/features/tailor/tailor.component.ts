import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-resume-tailor',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  templateUrl: './tailor.component.html',
  styleUrls: ['./tailor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResumeTailorComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  tailoredResume = this.agentService.selectedTailoredResume;
  coverLetter = this.agentService.selectedCoverLetter;

  activeTab = signal<'resume' | 'cover-letter'>('resume');
  copyButtonText = signal<string>('Copy to clipboard');

  copyCoverLetter() {
    const text = this.coverLetter();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.copyButtonText.set('Copied!');
      setTimeout(() => {
        this.copyButtonText.set('Copy to clipboard');
      }, 2000);
    });
  }
}
