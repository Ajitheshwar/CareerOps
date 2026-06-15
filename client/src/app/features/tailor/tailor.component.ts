import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentService } from '../../services/agent.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AgentLoaderComponent } from '../../shared/components/agent-loader/agent-loader.component';
import { ResumeTailoringDetailsComponent } from '../../shared/components/resume-tailoring-details/resume-tailoring-details.component';
import { CoverLetterDraftComponent } from '../../shared/components/cover-letter-draft/cover-letter-draft.component';
import {
  ParsedResumeHeader,
  ParsedResumeSection,
  ParsedResume,
  exportAsPDF,
  exportAsWord,
  exportAsExcel,
} from '../../utils/export.utils';

@Component({
  selector: 'app-resume-tailor',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    AgentLoaderComponent,
    ResumeTailoringDetailsComponent,
    CoverLetterDraftComponent,
  ],
  templateUrl: './tailor.component.html',
  styleUrls: ['./tailor.component.css'],
})
export class ResumeTailorComponent {
  agentService = inject(AgentService);

  status = this.agentService.status;
  job = this.agentService.selectedJob;
  tailoredResume = this.agentService.selectedTailoredResume;
  coverLetter = this.agentService.selectedCoverLetter;

  activeTab = signal<'resume' | 'cover-letter'>('resume');
  showPreview = signal<boolean>(false);
  isDropdownOpen = signal<boolean>(false);

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  selectExport(type: 'pdf' | 'word' | 'excel') {
    this.isDropdownOpen.set(false);
    if (type === 'pdf') {
      this.triggerPDF();
    } else if (type === 'word') {
      this.triggerWord();
    } else if (type === 'excel') {
      this.triggerExcel();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.isDropdownOpen.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Computed state
  // ---------------------------------------------------------------------------

  /** Merges tailored summary/bullets back into the original resume plain text. */
  compiledTailoredText = computed(() => {
    const resumeText = this.agentService.state().resumeText;
    const tailored = this.tailoredResume();

    if (!resumeText || !tailored) return '';

    let result = resumeText;

    if (tailored.originalSummary && tailored.tailoredSummary) {
      result = result.replace(tailored.originalSummary.trim(), tailored.tailoredSummary.trim());
    }

    if (tailored.bulletPointChanges) {
      for (const change of tailored.bulletPointChanges) {
        if (change.original && change.tailored) {
          result = result.replace(change.original.trim(), change.tailored.trim());
        }
      }
    }

    return result;
  });

  /** Parses compiled plain text into structured sections for the HTML template. */
  parsedResume = computed<ParsedResume | null>(() => {
    const rawText = this.compiledTailoredText();
    if (!rawText) return null;

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return null;

    const name = lines[0];
    const title = lines[1] || '';
    const contactLine = lines[2] || '';
    const contactItems = contactLine.split('|').map(s => s.trim()).filter(s => s !== '');

    const header: ParsedResumeHeader = { name, title, contactItems };
    const sections: ParsedResumeSection[] = [];
    let currentSection: ParsedResumeSection | null = null;

    const headings = [
      'PROFESSIONAL SUMMARY',
      'WORK EXPERIENCE',
      'TECHNICAL SKILLS',
      'PROJECTS',
      'EDUCATION',
      'CODING PROFILES',
    ];

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      const isHeading = headings.some(h => line.toUpperCase().includes(h));

      if (isHeading) {
        currentSection = {
          title: line,
          isWorkOrProjects:
            line.toUpperCase().includes('WORK EXPERIENCE') ||
            line.toUpperCase().includes('PROJECTS'),
          isSummary: line.toUpperCase().includes('SUMMARY'),
          isSkills: line.toUpperCase().includes('SKILLS'),
          content: [],
        };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        currentSection = {
          title: 'DETAILS',
          isWorkOrProjects: false,
          isSummary: false,
          isSkills: false,
          content: [line],
        };
        sections.push(currentSection);
      }
    }

    return { header, sections };
  });

  /** Used by the template to decide whether to render a line as a sub-heading bullet. */
  isSubHeader(line: string, index: number, _section: ParsedResumeSection): boolean {
    if (index === 0) return true;

    const datePattern =
      /\b(19|20)\d{2}\b|\b(Present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/i;
    if (datePattern.test(line)) return true;

    if (line.includes('(') && line.includes(')') && line.length < 100) return true;

    return false;
  }

  // ---------------------------------------------------------------------------
  // Export actions – delegate to utility helpers
  // ---------------------------------------------------------------------------

  triggerPDF(): void {
    exportAsPDF(() => this.showPreview.set(true));
  }

  triggerWord(): void {
    const resume = this.parsedResume();
    const companyName = this.job()?.company ?? 'Company';
    if (!resume) return;
    exportAsWord(resume, companyName);
  }

  triggerExcel(): void {
    const data = this.tailoredResume();
    const companyName = this.job()?.company ?? 'Company';
    if (!data) return;
    exportAsExcel(data, companyName);
  }
}
