import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  customClass?: string;
}

@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-tabs.component.html',
  styleUrls: ['./filter-tabs.component.css']
})
export class FilterTabsComponent {
  @Input() tabs: TabItem[] = [];
  @Input() activeTabId: string = '';

  @Output() tabChange = new EventEmitter<string>();

  selectTab(id: string) {
    this.tabChange.emit(id);
  }
}
