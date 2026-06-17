import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterviewSession } from '../../services/interview-api.service';

@Component({
  selector: 'app-interview-round-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-round-card.component.html',
  styleUrls: ['./interview-round-card.component.css']
})
export class InterviewRoundCardComponent {
  @Input() type: string = '';
  @Input() label: string = '';
  @Input() description: string = '';
  @Input() icon: string = '🛡️';
  @Input() readiness: number = 0;
  @Input() session: InterviewSession | null | undefined = null;

  @Output() start = new EventEmitter<void>();
  @Output() continue = new EventEmitter<string>();
  @Output() restart = new EventEmitter<void>();

  onStart() {
    this.start.emit();
  }

  onContinue() {
    if (this.session) {
      this.continue.emit(this.session.id);
    }
  }

  onRestart() {
    this.restart.emit();
  }
}
