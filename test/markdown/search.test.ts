import { describe, it, expect } from 'vitest';
import { parse } from '../../src/markdown/parse.js';
import { render } from '../../src/markdown/render.js';
import { buildSearch } from '../../src/markdown/search.js';

describe('search', () => {
  it('finds matches across lines (case-insensitive)', () => {
    const out = render(parse('# Intro\nFoo bar baz\n\n## More\nfoo again'), { width: 80, strict: false, color: true });
    const s = buildSearch(out.lines);
    const hits = s.find('foo');
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits[0]!.lineIndex).toBeLessThanOrEqual(hits[1]!.lineIndex);
  });

  it('returns empty list for empty query', () => {
    const out = render(parse('hello'), { width: 80, strict: false, color: true });
    expect(buildSearch(out.lines).find('')).toEqual([]);
  });

  it('handles multiple matches on the same line', () => {
    const out = render(parse('abc abc abc'), { width: 80, strict: false, color: true });
    const hits = buildSearch(out.lines).find('abc');
    expect(hits.length).toBe(3);
  });
});
