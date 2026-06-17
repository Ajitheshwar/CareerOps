import axios from 'axios';
import { SearchProvider, SearchResult } from '../interfaces/SearchProvider';

export class TavilyProvider implements SearchProvider {
  name = 'Tavily';

  async search(query: string, log: (level: string, msg: string) => void): Promise<SearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      log('warn', `Tavily API key is missing. Please set TAVILY_API_KEY in your .env file.`);
      return [];
    }

    log('thought', `Tavily credentials found. Querying Tavily Search API...`);

    try {
      const response = await axios.post('https://api.tavily.com/search', {
        query,
        search_depth: 'advanced',
        max_results: 20,
        time_range: "day",
        country: 'india'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      });

      const items = response.data?.results || [];
      const results: SearchResult[] = items.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.content || '',
        provider: 'Tavily'
      }));

      log('success', `Tavily returned ${results.length} raw results.`);
      return results;
    } catch (err: any) {
      const details = err.response?.data?.error || err.message;
      log('warn', `Tavily search failed: ${details}.`);
      return [];
    }
  }
}
