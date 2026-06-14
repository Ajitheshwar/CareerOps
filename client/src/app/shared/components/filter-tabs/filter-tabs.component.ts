import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-tabs.component.html',
  styleUrls: ['./filter-tabs.component.css']
})
export class FilterTabsComponent {
  @Input() activeFilter: 'all' | 'linkedin' | 'naukri' = 'all';
  @Input() totalCount = 0;
  @Input() linkedinCount = 0;
  @Input() naukriCount = 0;

  @Output() filterChange = new EventEmitter<'all' | 'linkedin' | 'naukri'>();

  selectFilter(filter: 'all' | 'linkedin' | 'naukri') {
    this.filterChange.emit(filter);
  }
}
