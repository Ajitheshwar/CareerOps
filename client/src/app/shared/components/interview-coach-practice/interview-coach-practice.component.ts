import { Component, Input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InterviewQuestion } from '../../../types';

interface ChatMessage {
  sender: 'user' | 'coach';
  text: string;
}

@Component({
  selector: 'app-interview-coach-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-coach-practice.component.html',
  styleUrls: ['./interview-coach-practice.component.css']
})
export class InterviewCoachPracticeComponent {
  @Input() jobId: string = '';
  @Input() questions: InterviewQuestion[] = [];

  activeCardIndex = signal<number>(0);
  isFlipped = signal<boolean>(false);
  userAnswer = '';
  isCoachTyping = signal<boolean>(false);
  chatHistory = signal<ChatMessage[]>([]);

  activeQuestion = computed(() => {
    const qList = this.questions;
    const idx = this.activeCardIndex();
    return qList[idx] || null;
  });

  constructor() {
    effect(() => {
      const q = this.activeQuestion();
      if (q) {
        // Reset chat history when question changes and introduce the question
        this.chatHistory.set([
          { 
            sender: 'coach', 
            text: `Hi there! Let's practice. Here is your question:\n\n"${q.question}"\n\nTake your time, write down your answer below, and I'll evaluate it.` 
          }
        ]);
        this.isFlipped.set(false);
      }
    });
  }

  toggleFlip() {
    this.isFlipped.set(!this.isFlipped());
  }

  nextCard() {
    if (this.activeCardIndex() < this.questions.length - 1) {
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
          jobId: this.jobId,
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
      this.chatHistory.update(history => [
        ...history,
        { sender: 'coach', text: 'Sorry, I failed to evaluate your answer. Please verify the backend is running and try again.' }
      ]);
    } finally {
      this.isCoachTyping.set(false);
    }
  }
}
