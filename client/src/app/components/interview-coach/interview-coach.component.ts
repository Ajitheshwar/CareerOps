import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';
import { InterviewQuestion } from '../../types';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

@Component({
  selector: 'app-interview-coach',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="coach-wrapper fade-in">
      <div class="coach-header">
        <h2>Interview Training Coach</h2>
        <p>Practice role-specific questions generated based on your resume and target requirements.</p>
      </div>

      @if (!job()) {
        <div class="glass-card empty-state">
          <div class="empty-icon">💬</div>
          <h4>No job selected</h4>
          <p>Go to the <strong>Matches</strong> tab, expand a job card, and click <strong>"Tailor Materials"</strong> to trigger the Interview Prep Agent.</p>
        </div>
      } @else if (status() === 'preparing') {
        <div class="glass-card empty-state">
          <div class="spinner"></div>
          <h4>Agent is generating interview questions...</h4>
          <p>Preparing technical and behavioral practice guides for <strong>{{ job()?.company }}</strong>.</p>
        </div>
      } @else if (!prepData()) {
        <div class="glass-card empty-state">
          <div class="empty-icon">📂</div>
          <h4>Prep guides required</h4>
          <p>Click "Tailor Materials" on the Matches dashboard to schedule coaching items.</p>
        </div>
      } @else {
        <!-- Flashcard Interface -->
        <div class="glass-card section-card">
          <div class="card-title-row">
            <h4>Flashcard Practice Mode</h4>
            <span class="card-indicator">Card {{ activeCardIndex() + 1 }} of {{ questions().length }}</span>
          </div>

          <div class="card-deck">
            <div 
              class="flashcard" 
              [class.flipped]="isFlipped()" 
              (click)="toggleFlip()"
            >
              <!-- Front Face -->
              <div class="card-face card-front">
                <span class="badge" [ngClass]="activeQuestion()?.type === 'technical' ? 'badge-cyan' : 'badge-purple'">
                  {{ activeQuestion()?.type }} Question
                </span>
                <p class="question-text">{{ activeQuestion()?.question }}</p>
                <span class="flip-prompt">Click card to reveal answer & tips</span>
              </div>

              <!-- Back Face -->
              <div class="card-face card-back">
                <div class="scrollable-back">
                  <span class="badge badge-green">Ideal Answer Outline</span>
                  <p class="answer-template">{{ activeQuestion()?.answerTemplate }}</p>
                  
                  <span class="badge badge-purple mt-12">Coaching Tip</span>
                  <p class="tip-text">{{ activeQuestion()?.tips }}</p>
                </div>
                <span class="flip-prompt text-muted">Click card to flip back</span>
              </div>
            </div>
          </div>

          <div class="deck-controls">
            <button (click)="prevCard()" class="btn btn-secondary" [disabled]="activeCardIndex() === 0">Previous</button>
            <button (click)="nextCard()" class="btn btn-secondary" [disabled]="activeCardIndex() === questions().length - 1">Next</button>
          </div>
        </div>

        <!-- Simulated Interactive Coach Chat -->
        <div class="glass-card chat-card">
          <h4>Interactive Response Evaluation</h4>
          <p class="chat-desc">Select a question above, type your answer below, and get real-time feedback on how to improve.</p>

          <div class="chat-history">
            @for (msg of chatHistory(); track msg.text) {
              <div class="chat-bubble" [ngClass]="msg.sender">
                <span class="bubble-sender">{{ msg.sender === 'coach' ? 'AI Coach' : 'You' }}</span>
                <p class="bubble-text">{{ msg.text }}</p>
              </div>
            }

            @if (isCoachTyping()) {
              <div class="chat-bubble coach">
                <span class="bubble-sender">AI Coach</span>
                <div class="dots-loader">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }
          </div>

          <div class="chat-input-row">
            <input 
              type="text" 
              class="form-input" 
              [(ngModel)]="userAnswer" 
              (keyup.enter)="sendAnswer()"
              placeholder="Type your answer to this question here..." 
              [disabled]="isCoachTyping()"
            />
            <button 
              (click)="sendAnswer()" 
              class="btn btn-primary" 
              [disabled]="!userAnswer.trim() || isCoachTyping()"
            >
              Evaluate
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .coach-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .coach-header {
      margin-bottom: 8px;
    }
    .coach-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }
    .empty-state {
      text-align: center;
      padding: 48px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon {
      font-size: 3rem;
    }
    .empty-state h4 {
      font-size: 1.1rem;
      font-weight: 500;
    }

    /* Deck and Card layouts */
    .section-card {
      padding: 24px;
    }
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .card-indicator {
      font-size: 0.8rem;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }
    .card-deck {
      perspective: 1000px;
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    
    /* 3D Flipping Card CSS */
    .flashcard {
      width: 100%;
      height: 220px;
      cursor: pointer;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .flashcard.flipped {
      transform: rotateY(180deg);
    }
    
    .card-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: rgba(15, 23, 42, 0.4);
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .card-front {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);
      border-color: rgba(6, 182, 212, 0.15);
      align-items: flex-start;
    }
    .card-back {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);
      border-color: rgba(168, 85, 247, 0.15);
      transform: rotateY(180deg);
    }
    
    .scrollable-back {
      overflow-y: auto;
      height: 100%;
      padding-right: 4px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .question-text {
      font-size: 1.2rem;
      font-weight: 500;
      color: #fff;
      margin-top: 12px;
      line-height: 1.5;
    }
    .flip-prompt {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--accent-cyan);
      align-self: center;
    }
    
    .answer-template {
      font-size: 0.88rem;
      line-height: 1.5;
      color: #e5e7eb;
    }
    .tip-text {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.4;
      font-style: italic;
    }
    .mt-12 {
      margin-top: 12px;
    }
    
    .deck-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
    }

    /* Interactive Coach Chat styling */
    .chat-card {
      padding: 24px;
    }
    .chat-card h4 {
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-cyan);
      margin-bottom: 4px;
    }
    .chat-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .chat-history {
      height: 200px;
      overflow-y: auto;
      border: 1px solid var(--border-color);
      background: rgba(10, 15, 30, 0.4);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    .chat-bubble {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
    }
    .chat-bubble.coach {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-bottom-left-radius: 2px;
    }
    .chat-bubble.user {
      align-self: flex-end;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid rgba(6, 182, 212, 0.25);
      border-bottom-right-radius: 2px;
    }
    .bubble-sender {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .chat-bubble.coach .bubble-sender { color: var(--accent-purple); }
    .chat-bubble.user .bubble-sender { color: var(--accent-cyan); }
    
    .bubble-text {
      font-size: 0.88rem;
      line-height: 1.5;
      color: #e5e7eb;
    }
    .chat-input-row {
      display: flex;
      gap: 12px;
    }
    
    /* Coach typing loader */
    .dots-loader {
      display: flex;
      gap: 4px;
      padding: 6px 0;
    }
    .dots-loader span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-purple);
      animation: dot-bounce 1.4s infinite ease-in-out both;
    }
    .dots-loader span:nth-child(1) { animation-delay: -0.32s; }
    .dots-loader span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes dot-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
    
    .spinner {
      border: 3px solid rgba(255,255,255,.05);
      border-top: 3px solid var(--accent-cyan);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class InterviewCoachComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  prepData = this.agentService.selectedInterviewPrep;

  activeCardIndex = signal<number>(0);
  isFlipped = signal<boolean>(false);
  userAnswer = '';
  isCoachTyping = signal<boolean>(false);

  questions = computed(() => {
    return this.prepData()?.questions || [];
  });

  activeQuestion = computed(() => {
    const qList = this.questions();
    const idx = this.activeCardIndex();
    return qList[idx] || null;
  });

  chatHistory = signal<ChatMessage[]>([]);

  constructor() {
    effect(() => {
      const q = this.activeQuestion();
      if (q) {
        // Reset chat history when question changes and introduce the question
        this.chatHistory.set([
          { sender: 'coach', text: `Hi there! Let's practice. Here is your question:\n\n"${q.question}"\n\nTake your time, write down your answer below, and I'll evaluate it.` }
        ]);
        this.isFlipped.set(false);
      }
    });
  }

  toggleFlip() {
    this.isFlipped.set(!this.isFlipped());
  }

  nextCard() {
    if (this.activeCardIndex() < this.questions().length - 1) {
      this.activeCardIndex.update(n => n + 1);
    }
  }

  prevCard() {
    if (this.activeCardIndex() > 0) {
      this.activeCardIndex.update(n => n - 1);
    }
  }

  async sendAnswer() {
    const text = this.userAnswer.trim();
    const currentQ = this.activeQuestion();
    if (!text || !currentQ) return;

    // Append user message
    this.chatHistory.update(history => [...history, { sender: 'user', text }]);
    this.userAnswer = '';
    
    // Set loading
    this.isCoachTyping.set(true);

    try {
      // Send answer to the backend evaluation API
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: this.agentService.selectedJobId(),
          question: currentQ.question,
          type: currentQ.type,
          userAnswer: text
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.chatHistory.update(history => [...history, { sender: 'coach', text: data.feedback }]);
      } else {
        throw new Error('Server returned error status.');
      }
    } catch (err) {
      // Mock evaluation response if API fails
      setTimeout(() => {
        const mockFeedback = `Great attempt! Here is some quick advice on how to polish this:
1. Make sure to clearly detail your technical approach. 
2. Use strong action verbs like "engineered", "implemented", or "optimized".
3. Quantify results where possible (e.g. "reduced load time by 15%").

Keep practicing! Try structuring your answer closer to the outline shown on the back of the card.`;
        this.chatHistory.update(history => [...history, { sender: 'coach', text: mockFeedback }]);
      }, 1500);
    } finally {
      this.isCoachTyping.set(false);
    }
  }
}
