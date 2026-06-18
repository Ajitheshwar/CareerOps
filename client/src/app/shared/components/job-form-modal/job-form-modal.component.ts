import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../core/services/agent.service';

export interface JobFormValues {
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  description: string;
}

@Component({
  selector: 'app-job-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-form-modal.component.html',
  styleUrls: ['./job-form-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobFormModalComponent implements OnInit {
  private agentService = inject(AgentService);

  /** 'add'  → runs AI analysis, emits saved when done
   *  'edit' → emits editSave with the updated values, parent handles persistence */
  mode = input<'add' | 'edit'>('add');

  /** Pre-populate the form in edit mode */
  initialValues = input<Partial<JobFormValues>>({});

  /** Emitted when an add succeeds (analysis complete) or edit is saved */
  saved = output<void>();
  /** Emitted when the modal is saved in edit mode with the form values */
  editSave = output<JobFormValues>();
  /** Emitted when the user cancels / clicks the backdrop */
  close = output<void>();

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  form: JobFormValues = {
    title: '',
    company: '',
    location: '',
    salary: '',
    url: '',
    description: ''
  };

  ngOnInit(): void {
    const init = this.initialValues();
    this.form = {
      title: init.title ?? '',
      company: init.company ?? '',
      location: init.location ?? '',
      salary: init.salary ?? '',
      url: init.url ?? '',
      description: init.description ?? ''
    };
  }

  get isEdit(): boolean {
    return this.mode() === 'edit';
  }

  get isFormValid(): boolean {
    if (this.isEdit) {
      return !!(this.form.title.trim() && this.form.company.trim());
    }
    return !!(
      this.form.title.trim() &&
      this.form.company.trim() &&
      this.form.description.trim() &&
      this.form.url.trim()
    );
  }

  onBackdropClick(): void {
    if (!this.isSubmitting()) this.close.emit();
  }

  onClose(): void {
    if (!this.isSubmitting()) this.close.emit();
  }

  async onSave(): Promise<void> {
    if (!this.isFormValid || this.isSubmitting()) return;

    if (this.isEdit) {
      this.editSave.emit({ ...this.form });
      return;
    }

    // Add mode — run AI analysis
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
