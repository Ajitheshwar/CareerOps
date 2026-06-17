import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterviewEvaluation } from '../../services/interview-api.service';

@Component({
  selector: 'app-evaluation-score-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluation-score-card.component.html',
  styleUrls: ['./evaluation-score-card.component.css']
})
export class EvaluationScoreCardComponent {
  @Input() evaluation!: InterviewEvaluation;
  @Input() answerTemplate: string = '';
}
