export interface SearchResult {
  title: string;
  url: string;
  content: string;
  provider: string; // Identifier for the provider (Tavily, SerpApi, DuckDuckGoOrganic)
}

export interface SearchProvider {
  name: string;
  search(query: string, log: (level: string, msg: string) => void): Promise<SearchResult[]>;
}
