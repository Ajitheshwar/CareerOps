import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-mentor-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mentor.component.html',
  styleUrls: ['./mentor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MentorChatComponent implements OnInit, AfterViewChecked {
  agentService = inject(AgentService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = this.agentService.mentorMessages;
  isGenerating = signal<boolean>(false);
  userInput = '';

  ngOnInit() {
    this.agentService.loadMentorHistory();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  async sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isGenerating()) return;

    this.userInput = '';
    this.isGenerating.set(true);
    try {
      await this.agentService.sendMentorMessage(text);
    } finally {
      this.isGenerating.set(false);
    }
  }

  sendPrompt(prompt: string) {
    this.userInput = prompt;
    this.sendMessage();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  /**
   * Safe HTML formatter to support quick clean styles/formatting
   */
  formatMessage(text: string): string {
    if (!text) return '';
    // Escape standard tags
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Format bold headers
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Format bullet list items
    formatted = formatted.replace(/^\s*-\s+(.*?)$/gm, '• $1');
    // Format custom single-line code blocks
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');
    
    return formatted;
  }
}
