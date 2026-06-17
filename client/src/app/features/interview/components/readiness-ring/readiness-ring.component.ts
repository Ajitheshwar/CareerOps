import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-readiness-ring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readiness-ring.component.html',
  styleUrls: ['./readiness-ring.component.css']
})
export class ReadinessRingComponent {
  @Input() value: number = 0;
  @Input() label: string = 'Overall Readiness';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
