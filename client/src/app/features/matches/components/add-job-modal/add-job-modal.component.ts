import { Component, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../../core/services/agent.service';

@Component({
  selector: 'app-add-job-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-job-modal.component.html',
  styleUrls: ['./add-job-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddJobModalComponent {
  private agentService = inject(AgentService);

  /** Emitted when analysis succeeds and the modal should close */
  saved = output<void>();
  /** Emitted when the user cancels / clicks the backdrop */
  close = output<void>();

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  form = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: ''
  };

  get isFormValid(): boolean {
    return !!(
      this.form.title.trim() &&
      this.form.company.trim() &&
      this.form.description.trim() &&
      this.form.url.trim()
    );
  }

  onBackdropClick(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
    }
  }

  onClose(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
    }
  }

  async onSave(): Promise<void> {
    if (!this.isFormValid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      await this.agentService.addAndAnalyzeJob({
        title: this.form.title.trim(),
        company: this.form.company.trim(),
        location: this.form.location.trim() || undefined,
        description: this.form.description.trim(),
        url: this.form.url.trim()
      });
      this.saved.emit();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to add job. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
