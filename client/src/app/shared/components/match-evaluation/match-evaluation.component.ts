import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchResult } from '../../../core/types';

@Component({
  selector: 'app-match-evaluation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-evaluation.component.html',
  styleUrls: ['./match-evaluation.component.css']
})
export class MatchEvaluationComponent {
  @Input() match: MatchResult | null | undefined = null;
}
