import type { TokensList, Tokens } from 'marked';

export function extractCode(ast: TokensList, lang?: string): Array<{ lang: string; code: string }> {
  const out: Array<{ lang: string; code: string }> = [];
  for (const tok of ast) {
    if (tok.type === 'code') {
      const c = tok as Tokens.Code;
      const l = (c.lang ?? '').trim();
      if (!lang || l === lang) out.push({ lang: l, code: c.text });
    }
  }
  return out;
}
