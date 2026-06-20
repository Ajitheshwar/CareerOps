export interface DorkResult {
  dork: string;
  exclusionString: string;
}

export function buildDork(
  siteTarget: string,
  query: string,
  location: string,
  extraTerm?: string,
  excludedPhrases?: string[]
): DorkResult {
  let dork = `site:${siteTarget}`;
  if (extraTerm) {
    dork += ` ${extraTerm}`;
  }
  dork += ` ${query} "${location}"`;

  let exclusionString = '';
  if (excludedPhrases && excludedPhrases.length > 0) {
    const activeExclusions = excludedPhrases
      .filter(phrase => typeof phrase === 'string' && phrase.trim().length > 0)
      .slice(0, 5);
    exclusionString = activeExclusions.map(phrase => {
      let cleaned = phrase.trim();
      if (!cleaned.startsWith('"') && !cleaned.startsWith('-')) {
        cleaned = `"${cleaned}"`;
      }
      return ` -${cleaned}`;
    }).join('');
    dork += exclusionString;
  }

  return { dork, exclusionString };
}
