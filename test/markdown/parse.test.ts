import { describe, it, expect, beforeEach } from 'vitest';
import { parse, clearCache } from '../../src/markdown/parse.js';

describe('parse', () => {
  beforeEach(() => clearCache());

  it('returns a marked AST (array of tokens) for a heading', () => {
    const ast = parse('# Hello');
    expect(ast[0]).toMatchObject({ type: 'heading', depth: 1 });
  });

  it('caches the result by source string', () => {
    const a = parse('# A');
    const b = parse('# A');
    expect(a).toBe(b);
  });

  it('returns distinct AST for different input', () => {
    const a = parse('# A');
    const b = parse('# B');
    expect(a).not.toBe(b);
  });
});
