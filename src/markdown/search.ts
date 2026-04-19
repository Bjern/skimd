import type { Line } from './render.js';
import { stripAnsi } from './ansi.js';

export type Match = { lineIndex: number; start: number; end: number };

export function buildSearch(lines: Line[]): { find(query: string): Match[] } {
  const plain = lines.map(l => stripAnsi(l.text).toLowerCase());
  return {
    find(query: string): Match[] {
      if (!query) return [];
      const q = query.toLowerCase();
      const matches: Match[] = [];
      plain.forEach((text, lineIndex) => {
        let from = 0;
        while (true) {
          const idx = text.indexOf(q, from);
          if (idx === -1) break;
          matches.push({ lineIndex, start: idx, end: idx + q.length });
          from = idx + q.length;
        }
      });
      return matches;
    },
  };
}
