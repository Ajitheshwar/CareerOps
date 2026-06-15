import { SearchResult } from '../interfaces/SearchProvider';
import { SearchProviderRegistry } from '../providers/SearchProviderRegistry';

export class SearchService {
  private registry: SearchProviderRegistry;

  constructor() {
    this.registry = SearchProviderRegistry.getInstance();
  }

  async search(
    query: string,
    log: (level: string, msg: string) => void
  ): Promise<SearchResult[]> {
    const providers = this.registry.getProviders();

    // 1. Try Tavily (Primary)
    const tavily = providers.find(p => p.name === 'Tavily');
    if (tavily && process.env.TAVILY_API_KEY) {
      const results = await tavily.search(query, log);
      if (results.length > 0) return results;
    }

    // 2. Try SerpApi (Secondary Fallback)
    const serp = providers.find(p => p.name === 'SerpApi');
    if (serp && process.env.SERPAPI_API_KEY) {
      const results = await serp.search(query, log);
      if (results.length > 0) return results;
    }

    // 3. Try DuckDuckGo Organic (Tertiary Fallback)
    const organic = providers.find(p => p.name === 'DuckDuckGoOrganic');
    if (organic) {
      const results = await organic.search(query, log);
      if (results.length > 0) return results;
    }

    return [];
  }
}
