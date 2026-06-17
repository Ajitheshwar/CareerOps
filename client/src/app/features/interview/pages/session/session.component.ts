// client/src/app/features/interview/pages/session/session.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InterviewApiService, InterviewSession, InterviewQuestion, QuestionFeedback } from '../../services/interview-api.service';
import { AgentService } from '../../../../core/services/agent.service';
import { EvaluationScoreCardComponent } from '../../components/evaluation-score-card/evaluation-score-card.component';

@Component({
  selector: 'app-interview-session',
  standalone: true,
  imports: [CommonModule, FormsModule, EvaluationScoreCardComponent],
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class InterviewSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interviewApi = inject(InterviewApiService);
  public agentService = inject(AgentService);

  sessionId = signal<string>('');
  session = signal<InterviewSession | null>(null);
  questions = signal<InterviewQuestion[]>([]);
  activeQuestionIndex = signal<number>(0);
  
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  
  hintText = signal<string>('');
  showHint = signal<boolean>(false);
  
  // Feedback Forms
  userAnswer = '';
  difficultyRating: 'easy' | 'medium' | 'hard' = 'medium';
  relevanceRating: 'relevant' | 'somewhat' | 'not-relevant' = 'relevant';
  clarityRating: 'clear' | 'somewhat' | 'confusing' = 'clear';
  confidenceBefore = 3;
  confidenceAfter = 3;

  roundCompleted = signal<boolean>(false);
  roundMessage = signal<string>('');
  roundProgress = signal<number>(0);

  // Computeds
  activeQuestion = computed(() => {
    const list = this.questions();
    const idx = this.activeQuestionIndex();
    return list[idx] || null;
  });

  isReviewMode = computed(() => {
    const activeIdx = this.activeQuestionIndex();
    const totalCount = this.questions().length;
    // User is reviewing a past question if the active index is not the last question,
    // OR if the entire round session is completed.
    return activeIdx < totalCount - 1 || this.roundCompleted();
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.sessionId.set(id);
      this.loadSession();
    }
  }

  async loadSession() {
    this.isLoading.set(true);
    try {
      const data = await this.interviewApi.getSession(this.sessionId());
      this.session.set(data.session);
      this.questions.set(data.questions);

      if (data.session.status === 'completed') {
        this.roundCompleted.set(true);
        this.roundProgress.set(100);
        this.roundMessage.set('Practice round has been completed.');
      } else {
        this.roundProgress.set(data.session.progress || 0);
      }

      // Point index to the latest question
      this.activeQuestionIndex.set(data.questions.length - 1);
      this.resetAnswerForm();
    } catch (err: any) {
      alert(err.message || 'Failed to load interview session.');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetAnswerForm() {
    this.userAnswer = '';
    this.difficultyRating = 'medium';
    this.relevanceRating = 'relevant';
    this.clarityRating = 'clear';
    this.confidenceBefore = 3;
    this.confidenceAfter = 3;
    this.hintText.set('');
    this.showHint.set(false);
  }

  async getHint() {
    const activeQ = this.activeQuestion();
    if (!activeQ || this.showHint()) return;
    
    try {
      const hint = await this.interviewApi.getHint(activeQ.id);
      this.hintText.set(hint);
      this.showHint.set(true);
    } catch (err) {
      this.hintText.set('Try reviewing similar concepts in your focus list.');
      this.showHint.set(true);
    }
  }

  selectQuestionReview(index: number) {
    this.activeQuestionIndex.set(index);
    this.resetAnswerForm();
  }

  async submitAnswer() {
    const activeQ = this.activeQuestion();
    if (!activeQ || !this.userAnswer.trim() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      const feedback: QuestionFeedback = {
        difficultyRating: this.difficultyRating,
        relevanceRating: this.relevanceRating,
        clarityRating: this.clarityRating,
        confidenceBefore: this.confidenceBefore,
        confidenceAfter: this.confidenceAfter
      };

      const result = await this.interviewApi.submitAnswer(
        this.sessionId(),
        activeQ.id,
        this.userAnswer.trim(),
        feedback
      );

      // 1. Update the evaluated question in place in our local array
      this.questions.update(list => 
        list.map(q => q.id === activeQ.id ? { ...q, userAnswer: this.userAnswer, feedback, evaluation: result.evaluation } : q)
      );

      // 2. Process next question or round completion
      if (result.roundStatus.completed) {
        this.roundCompleted.set(true);
        this.roundProgress.set(100);
        this.roundMessage.set(result.roundStatus.message || 'Round complete.');
      } else if (result.nextQuestion) {
        this.roundProgress.set(result.roundStatus.progress || 0);
        this.questions.update(list => [...list, result.nextQuestion as InterviewQuestion]);
        // Lock UI to review current first, or let them click "Next question"
        // Let's set index to the next question automatically, or stay on current for them to read feedback
        // To stay on current to preview evaluations, we keep the index, and let user click a "Next Question" button
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitSkip() {
    const activeQ = this.activeQuestion();
    if (!activeQ || this.isSubmitting()) return;

    const confirmed = confirm('Are you sure you want to skip this question? You will get 0 points but see the model answer preview.');
    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      const result = await this.interviewApi.submitSkip(this.sessionId(), activeQ.id);

      // 1. Update local question
      this.questions.update(list => 
        list.map(q => q.id === activeQ.id ? { ...q, isSkipped: true, userAnswer: null, evaluation: result.evaluation } : q)
      );

      // 2. Process round progress
      if (result.roundStatus.completed) {
        this.roundCompleted.set(true);
        this.roundProgress.set(100);
        this.roundMessage.set(result.roundStatus.message || 'Round complete.');
      } else if (result.nextQuestion) {
        this.roundProgress.set(result.roundStatus.progress || 0);
        this.questions.update(list => [...list, result.nextQuestion as InterviewQuestion]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to skip question.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async submitDontKnow() {
    const activeQ = this.activeQuestion();
    if (!activeQ || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      const result = await this.interviewApi.submitDontKnow(this.sessionId(), activeQ.id);

      // 1. Update local question
      this.questions.update(list => 
        list.map(q => q.id === activeQ.id ? { ...q, isDontKnow: true, userAnswer: null, evaluation: result.evaluation } : q)
      );

      // 2. Process round progress
      if (result.roundStatus.completed) {
        this.roundCompleted.set(true);
        this.roundProgress.set(100);
        this.roundMessage.set(result.roundStatus.message || 'Round complete.');
      } else if (result.nextQuestion) {
        this.roundProgress.set(result.roundStatus.progress || 0);
        this.questions.update(list => [...list, result.nextQuestion as InterviewQuestion]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit gap event.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async adjustDifficulty(direction: 'easier' | 'harder') {
    const activeQ = this.activeQuestion();
    if (!activeQ) return;
    
    try {
      await this.interviewApi.adjustDifficulty(this.sessionId(), activeQ.id, direction);
      alert(`Instruction registered. The next question generated will adjust to be ${direction}.`);
    } catch (err) {
      alert('Failed to register difficulty adjustment.');
    }
  }

  advanceNextQuestion() {
    // Increment index to point to the latest question (which is newly appended)
    this.activeQuestionIndex.set(this.questions().length - 1);
    this.resetAnswerForm();
  }

  getRoundLabel(type: string): string {
    const map: Record<string, string> = {
      'resume-defense': 'Resume Defense',
      'technical': 'Technical Round',
      'behavioral': 'Behavioral Round',
      'system-design': 'System Design',
      'hiring-manager': 'Hiring Manager'
    };
    return map[type] || type;
  }

  goBack() {
    const sess = this.session();
    if (sess) {
      this.router.navigate(['/jobs', sess.jobId]);
    } else {
      this.router.navigate(['/matches']);
    }
  }
}
