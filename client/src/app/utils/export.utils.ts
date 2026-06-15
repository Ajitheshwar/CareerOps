/**
 * export.utils.ts
 * Helper functions for exporting resume data as PDF (print), Word (.doc), and Excel (.csv).
 */

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------

export interface ParsedResumeHeader {
  name: string;
  title: string;
  contactItems: string[];
}

export interface ParsedResumeSection {
  title: string;
  isWorkOrProjects: boolean;
  isSummary: boolean;
  isSkills: boolean;
  content: string[];
}

export interface ParsedResume {
  header: ParsedResumeHeader;
  sections: ParsedResumeSection[];
}

export interface BulletPointChange {
  original: string;
  tailored: string;
  rationale: string;
}

export interface TailoredResumeExportData {
  originalSummary?: string;
  tailoredSummary?: string;
  bulletPointChanges?: BulletPointChange[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a line in a Work Experience / Projects section
 * should be treated as a sub-heading rather than a bullet point.
 */
function isSubHeader(line: string, index: number): boolean {
  if (index === 0) return true;

  const datePattern =
    /\b(19|20)\d{2}\b|\b(Present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/i;
  if (datePattern.test(line)) return true;

  if (line.includes('(') && line.includes(')') && line.length < 100) return true;

  return false;
}

/** Triggers a file download for a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Sanitises a string so it can be used safely in a filename. */
function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '_');
}

// ---------------------------------------------------------------------------
// Public export functions
// ---------------------------------------------------------------------------

/**
 * Triggers the browser print dialog.
 * The caller is responsible for making the printable content visible first.
 *
 * @param onBeforePrint Optional callback executed just before `window.print()`.
 *                      Useful for showing a print-preview overlay.
 * @param delayMs       Milliseconds to wait after `onBeforePrint` before printing
 *                      so the DOM has time to update (default: 300 ms).
 */
export function exportAsPDF(onBeforePrint?: () => void, delayMs = 300): void {
  if (onBeforePrint) {
    onBeforePrint();
  }
  setTimeout(() => window.print(), delayMs);
}

/**
 * Generates and downloads a Word-compatible (.doc) file from a parsed resume.
 *
 * @param resume      Structured resume data produced by `parseResumeText`.
 * @param companyName Used in the filename, e.g. "Resume_Tailored_Acme.doc".
 */
export function exportAsWord(resume: ParsedResume, companyName = 'Company'): void {
  let html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <title>Tailored Resume</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.15; margin: 1in; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 2px; font-weight: bold; }
    h2 { font-size: 11pt; text-align: center; font-weight: normal; margin-top: 0px; margin-bottom: 5px; color: #555; }
    .contact { text-align: center; font-size: 9.5pt; color: #555; margin-bottom: 15px; }
    h3 { font-size: 11pt; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; color: #1e293b; }
    .subheading { font-weight: bold; font-size: 11pt; margin-top: 8px; margin-bottom: 4px; }
    ul { margin-top: 0px; margin-bottom: 6px; padding-left: 20px; }
    li { margin-bottom: 3px; line-height: 1.25; }
    p { margin-top: 0px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <h1>${resume.header.name}</h1>
  <h2>${resume.header.title}</h2>
  <div class="contact">${resume.header.contactItems.join(' | ')}</div>
`;

  for (const section of resume.sections) {
    html += `<h3>${section.title}</h3>`;

    if (section.isSummary) {
      html += `<p>${section.content.join(' ')}</p>`;
    } else if (section.isSkills) {
      for (const line of section.content) {
        html += `<p>${line}</p>`;
      }
    } else if (section.isWorkOrProjects) {
      let inList = false;

      for (let i = 0; i < section.content.length; i++) {
        const line = section.content[i];

        if (isSubHeader(line, i)) {
          if (inList) {
            html += `</ul>`;
            inList = false;
          }
          html += `<p class="subheading">${line}</p>`;
        } else {
          if (!inList) {
            html += `<ul>`;
            inList = true;
          }
          html += `<li>${line}</li>`;
        }
      }

      if (inList) {
        html += `</ul>`;
      }
    } else {
      for (const line of section.content) {
        html += `<p>${line}</p>`;
      }
    }
  }

  html += `\n</body>\n</html>\n`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  downloadBlob(blob, `Resume_Tailored_${safeFilename(companyName)}.doc`);
}

/**
 * Generates and downloads a CSV file containing the original vs tailored
 * bullet point (and summary) changes for easy comparison.
 *
 * @param data        The tailored resume change data.
 * @param companyName Used in the filename, e.g. "Resume_Changes_Acme.csv".
 */
export function exportAsExcel(data: TailoredResumeExportData, companyName = 'Company'): void {
  const headers = ['Original Bullet', 'Tailored Bullet', 'Alignment Rationale'];

  const rows = (data.bulletPointChanges || []).map(c => [c.original, c.tailored, c.rationale]);

  // Prepend summary comparison row if available
  if (data.originalSummary && data.tailoredSummary) {
    rows.unshift([
      '[Professional Summary] ' + data.originalSummary,
      '[Professional Summary] ' + data.tailoredSummary,
      'N/A (Summary Alignment)',
    ]);
  }

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `Resume_Changes_${safeFilename(companyName)}.csv`);
}
