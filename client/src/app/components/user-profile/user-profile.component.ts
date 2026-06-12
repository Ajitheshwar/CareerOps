import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-card fade-in">
      <div class="profile-header">
        <h2>Career Profile & Resume Setup</h2>
        <p>Define your background and the target positions you want to find and match.</p>
      </div>

      <form (ngSubmit)="onSubmit()" class="profile-form">
        <div class="row">
          <div class="form-group col">
            <label class="form-label" for="jobQuery">Target Role / Job Title</label>
            <input 
              type="text" 
              id="jobQuery" 
              class="form-input" 
              [(ngModel)]="jobQuery" 
              name="jobQuery" 
              placeholder="e.g. Angular Developer, Frontend Engineer" 
              required
            />
          </div>

          <div class="form-group col">
            <label class="form-label" for="location">Target Location</label>
            <input 
              type="text" 
              id="location" 
              class="form-input" 
              [(ngModel)]="location" 
              name="location" 
              placeholder="e.g. Remote, San Francisco, CA" 
              required
            />
          </div>
        </div>

        <div class="form-group">
          <div class="resume-label-wrapper">
            <label class="form-label" for="resume">Your Resume (Plain Text / Markdown)</label>
            <button type="button" class="btn-text" (click)="loadSampleResume()">Load Sample Resume</button>
          </div>
          <textarea 
            id="resume" 
            class="form-textarea" 
            [(ngModel)]="resumeText" 
            name="resumeText" 
            rows="12" 
            placeholder="Paste your professional history, bullet points, skills, and summary here..."
            required
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="resetForm()">Clear Form</button>
          <button 
            type="submit" 
            class="btn btn-primary" 
            [disabled]="agentService.status() === 'searching' || agentService.status() === 'matching'"
          >
            @if (agentService.status() === 'searching') {
              <span>Searching Jobs...</span>
            } @else if (agentService.status() === 'matching') {
              <span>Matching Resume...</span>
            } @else {
              <span>Analyze & Match Jobs</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .profile-header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
    }
    .profile-header h2 {
      font-size: 1.5rem;
      margin-bottom: 6px;
      background: linear-gradient(to right, #fff, var(--text-muted));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .row {
      display: flex;
      gap: 16px;
    }
    .col {
      flex: 1;
    }
    @media (max-width: 600px) {
      .row {
        flex-direction: column;
        gap: 0;
      }
    }
    .resume-label-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .btn-text {
      background: none;
      border: none;
      color: var(--accent-cyan);
      font-family: var(--font-main);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: var(--transition-smooth);
    }
    .btn-text:hover {
      color: var(--accent-purple);
      text-decoration: underline;
    }
    .form-textarea {
      resize: vertical;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }
  `]
})
export class UserProfileComponent {
  agentService = inject(AgentService);

  jobQuery = '';
  location = '';
  resumeText = '';

  constructor() {
    // Check if there's state already loaded, prefill if possible
    const currentState = this.agentService.state();
    if (currentState.jobQuery) this.jobQuery = currentState.jobQuery;
    if (currentState.location) this.location = currentState.location;
    if (currentState.resumeText) this.resumeText = currentState.resumeText;
  }

  loadSampleResume() {
    this.resumeText = `AJITHESHWAR VADLA
Fullstack Engineer | TypeScript Developer
ajitheshwar1923@gmail.com | Hyderabad, India

PROFESSIONAL SUMMARY
Highly motivated software developer with 2+ years of professional experience specializing in TypeScript, JavaScript, and building clean, responsive user interfaces. Skilled in frontend architectures, responsive design, and backend RESTful API development.

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, HTML5, CSS3, SQL
- Frontend: Angular (v16+), React, Tailwind CSS, Responsive Design, CSS Grids/Flexbox
- Backend: Node.js, Express, REST APIs, PostgreSQL
- Tools: Git, GitHub, VS Code, npm, Docker

PROFESSIONAL EXPERIENCE
Software Engineer | TechOps Solutions (2024 - Present)
- Developed and maintained multiple responsive client-facing web portals, improving interface loading performance by 20%.
- Integrated complex backend REST API endpoints with the frontend, ensuring proper typesafe interface agreements.
- Refactored legacy UI components into clean, reusable modular designs, reducing codebase duplication.
- Collaborated in an Agile development environment to ship features on strict bi-weekly schedules.

Junior Web Developer | InnovateTech Labs (2022 - 2024)
- Built interactive frontend components and stylesheets using HTML, CSS, and modern framework principles.
- Managed database queries and handled JSON requests on Node/Express servers.
- Identified and resolved UI rendering and responsive layout bugs, improving cross-browser usability.

EDUCATION
Bachelor of Technology in Computer Science
Graduated: 2022`;
    
    if (!this.jobQuery) this.jobQuery = 'Angular Developer';
    if (!this.location) this.location = 'San Francisco, CA';
  }

  resetForm() {
    this.jobQuery = '';
    this.location = '';
    this.resumeText = '';
    this.agentService.reset();
  }

  onSubmit() {
    if (!this.resumeText || !this.jobQuery || !this.location) return;
    this.agentService.startSearch(this.resumeText, this.jobQuery, this.location);
  }
}
