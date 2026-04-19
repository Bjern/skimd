import { describe, it, expect } from 'vitest';
import { parse } from '../../src/markdown/parse.js';
import { buildToc } from '../../src/markdown/toc.js';

describe('buildToc', () => {
  it('produces a nested tree matching heading depths', () => {
    const src = [
      '# A',
      'a text',
      '## A1',
      'a1 text',
      '## A2',
      '# B',
    ].join('\n');
    const toc = buildToc(parse(src));
    expect(toc).toHaveLength(2);
    expect(toc[0]?.title).toBe('A');
    expect(toc[0]?.children).toHaveLength(2);
    expect(toc[0]?.children[0]?.title).toBe('A1');
    expect(toc[1]?.title).toBe('B');
  });

  it('computes subtree summary stats (paragraphs, code, lists, tables)', () => {
    const src = [
      '# A',
      'para one',
      'para two',
      '',
      '```bash',
      'echo',
      '```',
      '',
      '- item',
      '## A1',
      'nested para',
    ].join('\n');
    const [a] = buildToc(parse(src));
    expect(a?.summary.paragraphs).toBeGreaterThanOrEqual(2);
    expect(a?.summary.codeBlocks).toBe(1);
    expect(a?.summary.lists).toBe(1);
  });

  it('assigns stable slug-based ids', () => {
    const toc = buildToc(parse('# Hello World\n## Hello World'));
    expect(toc[0]?.id).toBe('hello-world');
    expect(toc[0]?.children[0]?.id).toBe('hello-world-2');
  });
});
