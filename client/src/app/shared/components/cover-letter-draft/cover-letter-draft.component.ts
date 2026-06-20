import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-cover-letter-draft',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './cover-letter-draft.component.html',
  styleUrls: ['./cover-letter-draft.component.css']
})
export class CoverLetterDraftComponent {
  @Input() coverLetter: string | null | undefined = null;
  copyButtonText = signal<string>('Copy to clipboard');

  copyCoverLetter() {
    if (!this.coverLetter) return;

    navigator.clipboard.writeText(this.coverLetter).then(() => {
      this.copyButtonText.set('Copied!');
      setTimeout(() => {
        this.copyButtonText.set('Copy to clipboard');
      }, 2000);
    });
  }
}
