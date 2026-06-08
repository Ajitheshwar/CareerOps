import axios from 'axios';
import { Job, AgentLog, LogLevel } from '../types';

export class JobSearchAgent {
  private appId: string | undefined;
  private appKey: string | undefined;

  constructor() {
    this.appId = process.env.ADZUNA_APP_ID;
    this.appKey = process.env.ADZUNA_APP_KEY;
  }

  async run(
    query: string,
    location: string,
    logCallback: (log: AgentLog) => void
  ): Promise<Job[]> {
    this.log(logCallback, 'thought', `Initializing job search agent... Target: "${query}" in "${location}"`);

    if (this.appId && this.appKey) {
      this.log(logCallback, 'info', `Adzuna API credentials found. Dispatching live API search...`);
      try {
        const country = 'us'; // Default to US, can be configured
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;
        
        this.log(logCallback, 'thought', `Fetching from Adzuna API: ${url}`);
        
        const response = await axios.get(url, {
          params: {
            app_id: this.appId,
            app_key: this.appKey,
            results_per_page: 8,
            what: query,
            where: location,
            'content-type': 'application/json'
          }
        });

        if (response.data && response.data.results) {
          const rawJobs = response.data.results;
          this.log(logCallback, 'success', `Successfully retrieved ${rawJobs.length} live job listings from Adzuna.`);
          
          return rawJobs.map((rj: any) => ({
            id: rj.id || Math.random().toString(36).substring(7),
            title: rj.title.replace(/<\/?[^>]+(>|$)/g, ""), // strip html
            company: rj.company?.display_name || 'Unknown Company',
            location: rj.location?.display_name || location || 'Remote',
            salary: rj.salary_min ? `$${Math.round(rj.salary_min).toLocaleString()} - $${Math.round(rj.salary_max).toLocaleString()}` : 'Competitive',
            description: rj.description.replace(/<\/?[^>]+(>|$)/g, ""),
            url: rj.redirect_url,
            source: 'Adzuna API'
          }));
        }
      } catch (err: any) {
        this.log(logCallback, 'warn', `Adzuna search failed: ${err.message}. Falling back to mock engine.`);
      }
    } else {
      this.log(logCallback, 'info', `Adzuna API keys not present. Bootstrapping mock job engine...`);
    }

    // Delay to simulate search processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockJobs = this.generateMockJobs(query, location);
    this.log(logCallback, 'success', `Generated ${mockJobs.length} highly matched mock job listings based on query.`);
    return mockJobs;
  }

  private log(callback: (log: AgentLog) => void, level: LogLevel, message: string) {
    callback({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      agent: 'JobSearch',
      level,
      message
    });
  }

  private generateMockJobs(query: string, location: string): Job[] {
    const defaultJobs = [
      {
        title: 'Senior Frontend Engineer (Angular)',
        company: 'Vercel',
        location: 'San Francisco, CA (Hybrid)',
        salary: '$140,000 - $185,000',
        description: 'We are looking for a Senior Frontend Engineer to lead development on our dashboard. You will work closely with design and product teams to craft high-performance standalone Angular components. Requirements: 5+ years of experience, strong TypeScript skills, experience with RxJS, state management, and performance tuning. Knowledge of modern Signals is highly preferred.',
      },
      {
        title: 'Angular Developer',
        company: 'Google',
        location: 'Mountain View, CA (On-site)',
        salary: '$150,000 - $210,000',
        description: 'Join the Angular core internal tooling team! You will design and deploy next-generation administrative interfaces. Requirements: Strong experience in Angular, RxJS, reactive forms, and UI optimization. Experience building complex charts, SVG rendering pipelines, and handling high-frequency real-time client side data models is a big plus.',
      },
      {
        title: 'Fullstack Software Engineer (TypeScript & Node)',
        company: 'Linear',
        location: 'Remote (US)',
        salary: '$130,000 - $170,000',
        description: 'Linear is looking for a software engineer to join our core product team. You will build and maintain backend GraphQL/REST endpoints using Express/Fastify and Node, and develop modern interactive client interfaces using Angular. We emphasize writing extremely clean, lightweight TypeScript and Vanilla CSS. Strong layout and animation skills are key.',
      },
      {
        title: 'UI Software Engineer',
        company: 'Stripe',
        location: 'Seattle, WA (Hybrid)',
        salary: '$145,000 - $190,000',
        description: 'Stripe is looking for a UI Engineer to design next-gen dashboard workflows. You must have a passion for visual design, CSS micro-animations, glassmorphic layouts, and high-quality user experiences. You will collaborate on frontend component library development. Experience in clean Vanilla CSS and Angular/React is required.',
      },
      {
        title: 'Junior Angular Developer',
        company: 'Figma',
        location: 'San Francisco, CA (Hybrid)',
        salary: '$90,000 - $120,000',
        description: 'We are looking for a Junior Angular Developer to join our UI toolkit team. You will help implement clean responsive stylesheets, maintain design tokens, and build standalone components. Requirements: 1-3 years of frontend experience, intermediate TypeScript, solid understanding of CSS variables and flex layouts.',
      }
    ];

    const targetLoc = location || 'Remote';
    // Tailor mock data slightly to fit user query
    return defaultJobs.map((job, index) => {
      let title = job.title;
      let description = job.description;

      // Adjust title to match query keyword if needed
      if (query && !job.title.toLowerCase().includes(query.toLowerCase())) {
        if (index === 0) title = `Lead ${query} Engineer`;
        if (index === 1) title = `Staff ${query} Developer`;
        if (index === 2) title = `Fullstack ${query} Architect`;
        if (index === 4) title = `Associate ${query} Developer`;
      }

      return {
        id: `mock-job-${index + 1}`,
        title,
        company: job.company,
        location: targetLoc.toLowerCase() === 'remote' ? 'Remote (US)' : `${targetLoc} (Hybrid)`,
        salary: job.salary,
        description,
        source: 'Mock Career Engine'
      };
    });
  }
}
