import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobListing } from '../../../types';

@Component({
  selector: 'app-status-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-selector.component.html'
})
export class StatusSelectorComponent {
  @Input() status: JobListing['status'] = 'scraped';
  @Input() isCompact: boolean = false;
  @Output() statusChange = new EventEmitter<JobListing['status']>();

  statusClass(status: JobListing['status']): string {
    switch (status) {
      case 'applied': return 'status-applied';
      case 'interviewing': return 'status-interviewing';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return 'status-scraped';
    }
  }

  onSelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value as JobListing['status'];
    this.statusChange.emit(value);
  }
}
