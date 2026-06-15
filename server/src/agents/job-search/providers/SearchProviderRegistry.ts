import { SearchProvider } from '../interfaces/SearchProvider';
import { TavilyProvider } from './TavilyProvider';
import { SerpProvider } from './SerpProvider';
import { OrganicDdgProvider } from './OrganicDdgProvider';

export class SearchProviderRegistry {
  private static instance: SearchProviderRegistry;
  private providers: SearchProvider[] = [];

  private constructor() {
    // Register the chain of providers in order
    this.registerProvider(new TavilyProvider());
    this.registerProvider(new SerpProvider());
    this.registerProvider(new OrganicDdgProvider());
  }

  public static getInstance(): SearchProviderRegistry {
    if (!SearchProviderRegistry.instance) {
      SearchProviderRegistry.instance = new SearchProviderRegistry();
    }
    return SearchProviderRegistry.instance;
  }

  public registerProvider(provider: SearchProvider): void {
    this.providers.push(provider);
  }

  public getProviders(): SearchProvider[] {
    return this.providers;
  }
}
