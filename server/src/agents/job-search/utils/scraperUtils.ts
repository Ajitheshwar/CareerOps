const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function decodeDdgUrl(url: string): string {
  let decoded = url;
  try {
    if (url.includes('uddg=')) {
      const parts = url.split('uddg=');
      if (parts[1]) {
        decoded = decodeURIComponent(parts[1].split('&')[0]);
      }
    }
  } catch (e) {
    // Ignore error and return original URL
  }
  return decoded;
}
