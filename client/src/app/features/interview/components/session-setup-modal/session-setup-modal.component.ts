import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoricalJob } from '../../../../core/types';

@Component({
  selector: 'app-session-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-setup-modal.component.html',
  styleUrls: ['./session-setup-modal.component.css']
})
export class SessionSetupModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() roundType = '';
  @Input() roundLabel = '';
  @Input() jobDetails: HistoricalJob | null = null;
  @Input() isStarting = false;

  @Output() close = new EventEmitter<void>();
  @Output() start = new EventEmitter<{ difficulty: 'beginner' | 'intermediate' | 'advanced'; focus: string[] }>();

  availableTopics: string[] = [];
  selectedTopics: { [topic: string]: boolean } = {};
  setupDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roundType'] || changes['jobDetails']) {
      this.initTopics();
    }
  }

  initTopics() {
    const type = this.roundType;
    if (type === 'technical') {
      const skills = this.jobDetails?.matchResult?.matchingSkills || ['Angular', 'TypeScript', 'RxJS'];
      const gaps = this.jobDetails?.matchResult?.skillGaps || ['Frontend Architecture', 'Performance'];
      this.availableTopics = Array.from(new Set([...skills, ...gaps, 'Testing', 'State Management']));
    } else if (type === 'resume-defense') {
      this.availableTopics = ['Project Architecture', 'Performance Optimization', 'Technical Decisions', 'Claim Verification', 'Tradeoff Analysis'];
    } else if (type === 'system-design') {
      this.availableTopics = ['Scalability', 'API Design', 'Caching', 'Observability', 'Security', 'State Management', 'Frontend Architecture'];
    } else if (type === 'behavioral') {
      this.availableTopics = ['Leadership', 'Conflict Resolution', 'STAR Method', 'Ownership', 'Teamwork', 'Growth Potential'];
    } else if (type === 'hiring-manager') {
      this.availableTopics = ['Career Motivation', 'Conflict Resolution', 'Growth Potential', 'Impact', 'Leadership', 'Culture Fit'];
    } else {
      this.availableTopics = ['General Overview', 'Core Knowledge'];
    }

    this.selectedTopics = {};
    for (const t of this.availableTopics) {
      this.selectedTopics[t] = true;
    }
    this.setupDifficulty = 'intermediate';
  }

  toggleTopic(topic: string) {
    this.selectedTopics[topic] = !this.selectedTopics[topic];
  }

  isTopicSelected(topic: string): boolean {
    return !!this.selectedTopics[topic];
  }

  onSubmit() {
    const selectedList = Object.keys(this.selectedTopics).filter(k => this.selectedTopics[k]);
    if (selectedList.length === 0) {
      alert('Please select at least one focus topic.');
      return;
    }
    this.start.emit({
      difficulty: this.setupDifficulty,
      focus: selectedList
    });
  }
}
