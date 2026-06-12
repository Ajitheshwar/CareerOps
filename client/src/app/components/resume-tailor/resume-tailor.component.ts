import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-resume-tailor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tailor-wrapper fade-in">
      <div class="tailor-header">
        <h2>Resume & Cover Letter Customization</h2>
        <p>Review agent-tailored materials specifically crafted for the target position.</p>
      </div>

      @if (!job()) {
        <div class="glass-card empty-state">
          <div class="empty-icon">✍️</div>
          <h4>No job selected</h4>
          <p>Go to the <strong>Matches</strong> tab, expand a job card, and click <strong>"Tailor Materials"</strong> to activate the Tailoring Agent.</p>
        </div>
      } @else if (status() === 'tailoring') {
        <div class="glass-card empty-state">
          <div class="spinner"></div>
          <h4>Agent is tailoring materials...</h4>
          <p>Generating resume adjustments and a target cover letter for <strong>{{ job()?.company }}</strong>.</p>
        </div>
      } @else if (!tailoredResume() && !coverLetter()) {
        <div class="glass-card empty-state">
          <div class="empty-icon">🔍</div>
          <h4>Material tailoring required</h4>
          <p>Please click "Tailor Materials" inside the job details card in the Matches dashboard.</p>
        </div>
      } @else {
        <!-- Tabs for Resume vs Cover Letter -->
        <div class="tab-buttons">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'resume'" 
            (click)="activeTab.set('resume')"
          >
            Adjusted Resume Bullets
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'cover-letter'" 
            (click)="activeTab.set('cover-letter')"
          >
            Tailored Cover Letter
          </button>
        </div>

        @if (activeTab() === 'resume') {
          <div class="tab-content fade-in">
            <!-- Professional Summary comparison -->
            <div class="glass-card section-card">
              <h4>Refined Professional Summary</h4>
              <div class="comparison-grid">
                <div class="comp-box">
                  <span class="comp-label original">Original</span>
                  <p class="summary-text">{{ tailoredResume()?.originalSummary }}</p>
                </div>
                <div class="comp-box active">
                  <span class="comp-label tailored">Tailored Summary Suggestion</span>
                  <p class="summary-text">{{ tailoredResume()?.tailoredSummary }}</p>
                </div>
              </div>
            </div>

            <!-- Bullet points comparison list -->
            <div class="bullets-section">
              <h3>Work Experience Customization</h3>
              @for (change of tailoredResume()?.bulletPointChanges; track change.original; let idx = $index) {
                <div class="glass-card bullet-card">
                  <div class="bullet-card-header">
                    <span class="badge badge-purple">Bullet Suggestion #{{ idx + 1 }}</span>
                    <span class="rationale-text">💡 {{ change.rationale }}</span>
                  </div>

                  <div class="comparison-grid mt-12">
                    <div class="comp-box">
                      <span class="comp-label original">Replace original</span>
                      <p class="bullet-desc">❌ "{{ change.original }}"</p>
                    </div>
                    <div class="comp-box active">
                      <span class="comp-label tailored">With tailored version</span>
                      <p class="bullet-desc green-text">✅ "{{ change.tailored }}"</p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab() === 'cover-letter') {
          <div class="tab-content fade-in">
            <div class="glass-card letter-card">
              <div class="letter-header">
                <h4>Persuasive Cover Letter</h4>
                <button (click)="copyCoverLetter()" class="btn btn-secondary btn-sm">
                  {{ copyButtonText() }}
                </button>
              </div>
              <pre class="letter-pre">{{ coverLetter() }}</pre>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .tailor-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .tailor-header {
      margin-bottom: 8px;
    }
    .tailor-header h2 {
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

    /* Tabs styling */
    .tab-buttons {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      gap: 16px;
      margin-bottom: 8px;
    }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      padding: 10px 16px;
      font-family: var(--font-main);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .tab-btn:hover {
      color: #fff;
    }
    .tab-btn.active {
      color: var(--accent-cyan);
      border-color: var(--accent-cyan);
    }

    /* Comparison styling */
    .section-card {
      margin-bottom: 24px;
    }
    .section-card h4 {
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .comparison-grid {
        grid-template-columns: 1fr;
      }
    }
    .comp-box {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.2);
    }
    .comp-box.active {
      border-color: rgba(6, 182, 212, 0.25);
      background: rgba(6, 182, 212, 0.02);
    }
    .comp-label {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .comp-label.original {
      background: rgba(244, 63, 94, 0.1);
      color: var(--accent-rose);
      border: 1px solid rgba(244, 63, 94, 0.2);
    }
    .comp-label.tailored {
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .summary-text {
      font-size: 0.9rem;
      color: #e5e7eb;
      line-height: 1.6;
    }

    /* Bullets section */
    .bullets-section h3 {
      font-size: 1.1rem;
      margin-bottom: 16px;
    }
    .bullet-card {
      margin-bottom: 16px;
    }
    .bullet-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rationale-text {
      font-size: 0.8rem;
      color: var(--accent-purple);
      font-weight: 500;
    }
    .bullet-desc {
      font-size: 0.88rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .bullet-desc.green-text {
      color: #a7f3d0;
    }
    .mt-12 {
      margin-top: 12px;
    }

    /* Cover letter tab */
    .letter-card {
      padding: 24px;
    }
    .letter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .letter-header h4 {
      font-size: 1.05rem;
      color: var(--accent-cyan);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .letter-pre {
      font-family: var(--font-main);
      font-size: 0.95rem;
      line-height: 1.7;
      color: #e5e7eb;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
      border-radius: 4px;
    }

    /* Loading Spinner */
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
export class ResumeTailorComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  tailoredResume = this.agentService.selectedTailoredResume;
  coverLetter = this.agentService.selectedCoverLetter;

  activeTab = signal<'resume' | 'cover-letter'>('resume');
  copyButtonText = signal<string>('Copy to clipboard');

  copyCoverLetter() {
    const text = this.coverLetter();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.copyButtonText.set('Copied!');
      setTimeout(() => {
        this.copyButtonText.set('Copy to clipboard');
      }, 2000);
    });
  }
}
