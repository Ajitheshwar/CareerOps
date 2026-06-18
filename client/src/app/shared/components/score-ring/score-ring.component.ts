import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-ring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score-ring.component.html',
  styleUrls: ['./score-ring.component.css']
})
export class ScoreRingComponent {
  @Input() score: number | null | undefined = null;
  @Input() isAnalyzing = false;

  @Output() reRun = new EventEmitter<Event>();

  getScoreColorClass(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'gray';
    if (score >= 85) return 'green';
    if (score >= 70) return 'cyan';
    return 'warn';
  }

  calculateOffset(score: number | null | undefined): number {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    if (score === null || score === undefined) return circumference;
    return circumference - (score / 100) * circumference;
  }

  onReRunClick(event: Event) {
    this.reRun.emit(event);
  }
}
