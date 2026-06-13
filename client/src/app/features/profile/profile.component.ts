import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent {
  agentService = inject(AgentService);

  jobQuery = '';
  location = '';
  resumeText = '';
  expectedCtc = '';
  useHistory = false;

  uploadStatus = signal<string>('');

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadStatus.set('Uploading...');
    try {
      const parsedText = await this.agentService.uploadResume(file);
      this.resumeText = parsedText;
      this.uploadStatus.set('Success!');
      setTimeout(() => this.uploadStatus.set(''), 3000);
    } catch (err: any) {
      console.error(err);
      this.uploadStatus.set('Failed');
      alert(`Upload failed: ${err.message}`);
      setTimeout(() => this.uploadStatus.set(''), 3000);
    }
  }

  constructor() {
    // Check if there's state already loaded, prefill if possible
    const currentState = this.agentService.state();
    if (currentState.jobQuery) this.jobQuery = currentState.jobQuery;
    if (currentState.location) this.location = currentState.location;
    if (currentState.resumeText) this.resumeText = currentState.resumeText;
    if (currentState.expectedCtc) this.expectedCtc = currentState.expectedCtc;
    if (currentState.useHistory !== undefined) this.useHistory = currentState.useHistory;

    // Load from MongoDB profile collection for persistence pre-fill
    this.agentService.fetchProfile().then(profile => {
      if (profile) {
        if (!this.resumeText && profile.resumeText) this.resumeText = profile.resumeText;
        if (!this.jobQuery && profile.jobQuery) this.jobQuery = profile.jobQuery;
        if (!this.location && profile.location) this.location = profile.location;
        if (!this.expectedCtc && profile.expectedCtc) this.expectedCtc = profile.expectedCtc;
        if (this.useHistory === false && profile.useHistory !== undefined) this.useHistory = profile.useHistory;
      }
    });
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
    if (!this.location) this.location = 'Hyderabad, India';
    if (!this.expectedCtc) this.expectedCtc = '12 LPA';
  }

  resetForm() {
    this.jobQuery = '';
    this.location = '';
    this.resumeText = '';
    this.expectedCtc = '';
    this.useHistory = false;
    this.agentService.reset();
  }

  onSubmit() {
    if (!this.resumeText || !this.jobQuery) return;
    this.agentService.startSearch(this.resumeText, this.jobQuery, this.location || 'Remote', this.expectedCtc, this.useHistory);
  }
}
