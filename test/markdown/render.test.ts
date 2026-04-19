import { describe, it, expect } from 'vitest';
import { parse } from '../../src/markdown/parse.js';
import { render } from '../../src/markdown/render.js';
import { stripAnsi } from '../../src/markdown/ansi.js';

describe('render — basics', () => {
  it('returns an empty lines array for empty input', () => {
    const r = render(parse(''), { width: 80, strict: false, color: true });
    expect(r.lines).toEqual([]);
  });

  it('renders a paragraph as a single line + trailing blank', () => {
    const out = render(parse('hello world'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => l.kind)).toEqual(['paragraph', 'blank']);
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('hello world');
  });
});
