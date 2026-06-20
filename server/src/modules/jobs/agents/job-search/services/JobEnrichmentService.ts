import axios from 'axios';
import { Job } from '../models/Job';

interface TavilyExtractResult {
  url?: string;
  raw_content?: string;
}

export interface JobValidationResult {
  valid: boolean;
  reason?: string;
}

const DESCRIPTION_MIN_LENGTH = 300;

export class JobEnrichmentService {
  async enrich(
    jobs: Job[],
    log: (level: string, msg: string) => void
  ): Promise<Job[]> {
    if (jobs.length === 0) return [];

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      log('warn', 'Tavily API key is unavailable; using search snippets as job descriptions.');
      return jobs.map(job => this.addMetadata(job, job.description, 'search-snippet'));
    }

    const enrichedByUrl = new Map<string, string>();
    const batches = this.chunk(jobs.map(job => job.sourceUrl), 20);

    for (const urls of batches) {
      try {
        const response = await axios.post(
          'https://api.tavily.com/extract',
          {
            urls,
            extract_depth: 'advanced',
            format: 'markdown'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            timeout: 30000
          }
        );

        const results: TavilyExtractResult[] = response.data?.results || [];
        for (const result of results) {
          if (result.url && result.raw_content) {
            enrichedByUrl.set(this.normalizeUrl(result.url), result.raw_content.trim());
          }
        }
      } catch (err: any) {
        const details = err.response?.data?.detail || err.response?.data?.error || err.message;
        log('warn', `Tavily job-description extraction failed for a batch: ${details}`);
      }
    }

    let fullDescriptionCount = 0;
    const enriched = jobs.map(job => {
      const extracted = enrichedByUrl.get(this.normalizeUrl(job.sourceUrl));
      if (extracted) {
        let cleaned = this.cleanDescription(extracted, job.sourceUrl);
        cleaned = this.cleanLinks(cleaned);
        if (this.isUsefulDescription(cleaned)) {
          fullDescriptionCount++;
          return this.addMetadata(job, cleaned, 'tavily-extract');
        }
      }
      return this.addMetadata(job, job.description, 'search-snippet');
    });

    log(
      fullDescriptionCount > 0 ? 'success' : 'warn',
      `Enriched ${fullDescriptionCount}/${jobs.length} jobs with cleaned full descriptions.`
    );
    return enriched;
  }

  validate(
    job: Job,
    requestedLocation: string,
    expectedCtc: string,
    salaryBufferPercent = 20
  ): JobValidationResult {
    const isSnippet = job.descriptionSource === 'search-snippet';
    if (!this.isUsefulDescription(job.description, isSnippet)) {
      return { valid: false, reason: 'description is too short or looks like navigation/login content' };
    }

    if (!this.matchesLocation(job, requestedLocation)) {
      return { valid: false, reason: `location does not match "${requestedLocation}"` };
    }

    const targetLpa = this.parseTargetLpa(expectedCtc);
    if (targetLpa && job.salaryMaxLpa !== undefined) {
      const minimumAccepted = targetLpa * (1 - salaryBufferPercent / 100);
      if (job.salaryMaxLpa < minimumAccepted) {
        return {
          valid: false,
          reason: `advertised salary (${job.salary || `${job.salaryMaxLpa} LPA`}) is below the ${salaryBufferPercent}% buffer`
        };
      }
    }

    return { valid: true };
  }

  private addMetadata(
    job: Job,
    description: string,
    descriptionSource: Job['descriptionSource']
  ): Job {
    const salary = this.extractSalary(description);
    const detectedLocation = this.extractLocation(description, job.location);

    return {
      ...job,
      description,
      descriptionSource,
      location: detectedLocation,
      salary: salary.label || job.salary,
      salaryMinLpa: salary.min,
      salaryMaxLpa: salary.max,
      salaryConfidence: salary.min !== undefined || salary.max !== undefined ? 'explicit' : 'unknown'
    };
  }

  private extractSalary(text: string): { min?: number; max?: number; label?: string } {
    const normalized = text.replace(/,/g, '');
    const range = normalized.match(
      /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?(?:\s+per\s+annum)?)/i
    );
    if (range) {
      const min = Number(range[1]);
      const max = Number(range[2]);
      return { min: Math.min(min, max), max: Math.max(min, max), label: range[0].trim() };
    }

    const single = normalized.match(
      /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?(?:\s+per\s+annum)?)/i
    );
    if (single) {
      const value = Number(single[1]);
      return { min: value, max: value, label: single[0].trim() };
    }

    return {};
  }

  private parseTargetLpa(expectedCtc: string): number | undefined {
    if (!expectedCtc) return undefined;
    const match = expectedCtc.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : undefined;
  }

  private matchesLocation(job: Job, requestedLocation: string): boolean {
    const requested = requestedLocation.trim().toLowerCase();
    if (!requested || requested === 'india') return true;

    // If we only have a search snippet, we cannot be 100% sure of a mismatch, so do not reject.
    if (job.descriptionSource !== 'tavily-extract') {
      return true;
    }

    const haystack = `${job.title} ${job.description}`.toLowerCase();
    
    // Check if the job itself is remote-friendly
    const jobIsRemote = haystack.includes('remote') || 
                        haystack.includes('work from home') || 
                        haystack.includes('wfh') || 
                        haystack.includes('work-from-home');

    // If candidate specifically wants remote, require the job to be remote
    if (requested.includes('remote')) {
      return jobIsRemote;
    }

    // Otherwise, check if job is remote OR matches the requested city (including synonyms)
    if (jobIsRemote) {
      return true;
    }

    const primaryLocation = requested.split(',')[0].trim();
    
    // City name synonyms for common Indian tech hubs
    const synonyms: Record<string, string[]> = {
      'bangalore': ['bangalore', 'bengaluru'],
      'bengaluru': ['bangalore', 'bengaluru'],
      'gurgaon': ['gurgaon', 'gurugram'],
      'gurugram': ['gurgaon', 'gurugram'],
      'mumbai': ['mumbai', 'bombay'],
      'bombay': ['mumbai', 'bombay'],
      'chennai': ['chennai', 'madras'],
      'madras': ['chennai', 'madras'],
      'kolkata': ['kolkata', 'calcutta'],
      'calcutta': ['kolkata', 'calcutta'],
      'delhi': ['delhi', 'ncr', 'new delhi'],
      'noida': ['noida', 'ncr', 'delhi'],
      'ncr': ['delhi', 'ncr', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad']
    };

    const targets = synonyms[primaryLocation] || [primaryLocation];
    return targets.some(target => haystack.includes(target));
  }

  private extractLocation(description: string, fallback: string): string {
    const locationPatterns = [
      /(?:job\s+location|location|work\s+location)\s*[:\-]\s*([^\n|]{2,80})/i,
      /(?:based\s+in|located\s+in)\s+([A-Za-z][A-Za-z\s,.-]{2,60})/i
    ];

    for (const pattern of locationPatterns) {
      const match = description.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return fallback;
  }

  private isUsefulDescription(description: string, isSnippet = false): boolean {
    const normalized = (description || '').trim();
    if (!isSnippet && normalized.length < DESCRIPTION_MIN_LENGTH) return false;

    const lower = normalized.toLowerCase();
    const blockedSignals = ['sign in to view', 'log in to continue', 'enable javascript'];
    return !blockedSignals.some(signal => lower.includes(signal));
  }

  public cleanLinks(text: string): string {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  }

  public cleanDescription(description: string, url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('linkedin.com')) {
      return this.cleanLinkedinDescription(description);
    } else if (urlLower.includes('naukri.com')) {
      return this.cleanNaukriDescription(description);
    }
    return description;
  }

  private cleanLinkedinDescription(text: string): string {
    const lines = text.split('\n');
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      // Look for the start index, which is typically after "report this job" link
      if (startIdx === -1 && (line.includes('report this job') || line.includes('report this page'))) {
        startIdx = i + 1; // start on the line after
      }
      
      // Look for end index signals
      if (startIdx !== -1 && endIdx === -1) {
        if (
          line.includes('referrals increase your chances') ||
          line.includes('get notified when a new job') ||
          line.includes('## sign in to set job alerts') ||
          line.includes('sign in to set job alerts') ||
          line.includes('## similar jobs') ||
          line.includes('similar jobs') ||
          line.includes('show more show less') ||
          line.includes('safety guidelines')
        ) {
          endIdx = i;
        }
      }
    }

    // Fallback if we couldn't find "report this job", skip cookie warnings
    if (startIdx === -1) {
      for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('select accept to consent') || line.includes('cookie policy')) {
          startIdx = i + 1;
        }
      }
    }

    if (startIdx !== -1) {
      const slicedLines = endIdx !== -1 ? lines.slice(startIdx, endIdx) : lines.slice(startIdx);
      return slicedLines.join('\n').trim();
    }

    return text;
  }

  private cleanNaukriDescription(text: string): string {
    const lines = text.split('\n');
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      // Look for the "## Job description" header
      if (startIdx === -1 && (line.includes('## job description') || line.includes('job description'))) {
        startIdx = i;
      }
      // Look for "beware of imposters", "similar jobs", "jobs you might be interested", etc.
      if (startIdx !== -1 && endIdx === -1) {
        if (
          line.includes('beware of imposters') || 
          line.includes('## similar jobs') || 
          line.includes('similar jobs') || 
          line.includes('## jobs you might be interested in') ||
          line.includes('services you might be') ||
          line.includes('apply on the go') ||
          line.includes('all rights reserved')
        ) {
          endIdx = i;
        }
      }
    }

    if (startIdx !== -1) {
      const slicedLines = endIdx !== -1 ? lines.slice(startIdx, endIdx) : lines.slice(startIdx);
      return slicedLines.join('\n').trim();
    }

    return text;
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().replace(/\/$/, '').toLowerCase();
    } catch {
      return url.split(/[?#]/)[0].replace(/\/$/, '').toLowerCase();
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }
}
