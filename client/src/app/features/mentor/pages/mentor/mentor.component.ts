import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../../../core/services/agent.service';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-mentor-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
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
}
