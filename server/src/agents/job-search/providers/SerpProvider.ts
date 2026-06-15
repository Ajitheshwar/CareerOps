import axios from 'axios';
import { SearchProvider, SearchResult } from '../interfaces/SearchProvider';

export class SerpProvider implements SearchProvider {
  name = 'SerpApi';

  async search(query: string, log: (level: string, msg: string) => void): Promise<SearchResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY;

    if (!apiKey) {
      log('warn', `SerpApi key is missing. Please set SERPAPI_API_KEY in your .env file.`);
      return [];
    }

    log('thought', `SerpApi credentials found. Querying Google Search via SerpApi...`);

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: query,
          api_key: apiKey,
          hl: 'en',
          gl: 'in', // Target India results
          tbs: 'qdr:w' // Restrict to past week
        },
        timeout: 10000
      });

      const items = response.data?.organic_results || [];
      const results: SearchResult[] = items.map((item: any) => ({
        title: item.title || '',
        url: item.link || '',
        content: item.snippet || '',
        provider: 'SerpApi'
      }));

      log('success', `SerpApi returned ${results.length} raw results.`);
      return results;
    } catch (err: any) {
      const details = err.response?.data?.error || err.message;
      log('warn', `SerpApi Google search failed: ${details}.`);
      return [];
    }
  }
}
