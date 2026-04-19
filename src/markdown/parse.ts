import { marked, type TokensList } from 'marked';

const cache = new Map<string, TokensList>();

export function parse(source: string): TokensList {
  const cached = cache.get(source);
  if (cached) return cached;
  const tokens = marked.lexer(source);
  cache.set(source, tokens);
  return tokens;
}

export function clearCache(): void {
  cache.clear();
}
