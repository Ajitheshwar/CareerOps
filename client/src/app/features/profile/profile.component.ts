import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { SAMPLE_RESUME_TEXT, SAMPLE_JOB_QUERY, SAMPLE_LOCATION, SAMPLE_EXPECTED_CTC } from './sample-data';


@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent {
  agentService = inject(AgentService);
  cdr = inject(ChangeDetectorRef);

  jobQuery = '';
  location = '';
  resumeText = '';
  expectedCtc = '';
  useHistory = false;

  uploadStatus = signal<string>('');
  latestFileMetadata: any = null;

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadStatus.set('Uploading...');
    try {
      const { text, fileMetadata } = await this.agentService.uploadResume(file);
      this.resumeText = text;
      this.latestFileMetadata = fileMetadata;
      this.uploadStatus.set('Success!');
      this.cdr.markForCheck();
      setTimeout(() => {
        this.uploadStatus.set('');
        this.cdr.markForCheck();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      this.uploadStatus.set('Failed');
      this.cdr.markForCheck();
      alert(`Upload failed: ${err.message}`);
      setTimeout(() => {
        this.uploadStatus.set('');
        this.cdr.markForCheck();
      }, 3000);
    }
  }

  constructor() {
    // Check if there's state already loaded, prefill if possible
    const currentState = this.agentService.state();
    if (currentState.jobQuery) this.jobQuery = currentState.jobQuery;
    if (currentState.location) this.location = currentState.location;
    if (currentState.resumeText) this.resumeText = currentState.resumeText;
    if (currentState.expectedCtc) this.expectedCtc = currentState.expectedCtc;
    if (currentState.useHistory !== undefined) this.useHistory = currentState.useHistory;

    // Load from MongoDB profile collection for persistence pre-fill
    this.agentService.fetchProfile().then(profile => {
      if (profile) {
        if (!this.resumeText && profile.resumeText) this.resumeText = profile.resumeText;
        if (!this.jobQuery && profile.jobQuery) this.jobQuery = profile.jobQuery;
        if (!this.location && profile.location) this.location = profile.location;
        if (!this.expectedCtc && profile.expectedCtc) this.expectedCtc = profile.expectedCtc;
        if (this.useHistory === false && profile.useHistory !== undefined) this.useHistory = profile.useHistory;
        this.cdr.markForCheck();
      }
    });
  }


  loadSampleResume() {
    this.resumeText = SAMPLE_RESUME_TEXT;
    if (!this.jobQuery) this.jobQuery = SAMPLE_JOB_QUERY;
    if (!this.location) this.location = SAMPLE_LOCATION;
    if (!this.expectedCtc) this.expectedCtc = SAMPLE_EXPECTED_CTC;
    this.cdr.markForCheck();
  }

  resetForm() {
    this.jobQuery = '';
    this.location = '';
    this.resumeText = '';
    this.expectedCtc = '';
    this.useHistory = false;
    this.latestFileMetadata = null;
    this.agentService.reset();
  }

  onSubmit() {
    if (!this.resumeText || !this.jobQuery) return;
    this.agentService.startSearch(
      this.resumeText,
      this.jobQuery,
      this.location || 'Remote',
      this.expectedCtc,
      this.useHistory,
      this.latestFileMetadata
    );
    this.latestFileMetadata = null;
  }
}
