export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
  portal: string;
  postedDate?: string;
  salary?: string;
  salaryMinLpa?: number;
  salaryMaxLpa?: number;
  salaryConfidence?: 'explicit' | 'unknown';
  descriptionSource?: 'tavily-extract' | 'search-snippet';
}
