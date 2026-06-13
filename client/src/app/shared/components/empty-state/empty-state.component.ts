// client/src/app/shared/components/empty-state/empty-state.component.ts
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() title: string = 'No Data Found';
  @Input() message: string = 'There is no information to display here at the moment.';
  @Input() icon: 'inbox' | 'search' | 'job' | 'chart' | 'chat' | 'tailor' = 'inbox';
  @Input() actionText?: string;

  @Output() actionClicked = new EventEmitter<void>();

  onAction() {
    this.actionClicked.emit();
  }
}
