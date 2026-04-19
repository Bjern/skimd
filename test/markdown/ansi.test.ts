import { describe, it, expect } from 'vitest';
import { style, stripAnsi } from '../../src/markdown/ansi.js';

describe('ansi', () => {
  it('wraps text in open/close escape sequences', () => {
    const s = style('hello', { color: 'cyan', bold: true });
    expect(stripAnsi(s)).toBe('hello');
    expect(s).toContain('\x1b[');
  });

  it('returns input unchanged when no style is set', () => {
    expect(style('x', {})).toBe('x');
  });
});
