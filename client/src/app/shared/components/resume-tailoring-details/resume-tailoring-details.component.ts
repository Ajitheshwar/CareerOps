import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TailoredResume } from '../../../core/types';

@Component({
  selector: 'app-resume-tailoring-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-tailoring-details.component.html',
  styleUrls: ['./resume-tailoring-details.component.css']
})
export class ResumeTailoringDetailsComponent {
  @Input() tailoredResume: TailoredResume | null | undefined = null;

  copyText(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
  }
}
