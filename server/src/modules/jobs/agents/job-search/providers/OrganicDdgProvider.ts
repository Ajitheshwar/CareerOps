import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchProvider, SearchResult } from '../interfaces/SearchProvider';
import { getRandomUserAgent, decodeDdgUrl } from '../utils/scraperUtils';

export class OrganicDdgProvider implements SearchProvider {
  name = 'DuckDuckGoOrganic';

  async search(query: string, log: (level: string, msg: string) => void): Promise<SearchResult[]> {
    log('thought', `No API credentials or API queries returned 0 results. Falling back to organic DuckDuckGo crawler...`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&df=w`;

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 6000
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.result').each((_, el) => {
        const titleLink = $(el).find('.result__title a.result__url');
        const rawHref = titleLink.attr('href') || '';
        const href = decodeDdgUrl(rawHref);
        const titleText = titleLink.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();

        if (href) {
          results.push({
            title: titleText,
            url: href,
            content: snippet,
            provider: 'DuckDuckGoOrganic'
          });
        }
      });

      log('success', `Organic DuckDuckGo crawler returned ${results.length} raw results.`);
      return results;
    } catch (err: any) {
      log('warn', `Organic DuckDuckGo search failed: ${err.message}`);
      return [];
    }
  }
}
