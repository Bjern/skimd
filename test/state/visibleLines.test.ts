import { describe, it, expect } from 'vitest';
import { computeVisibleLines } from '../../src/state/visibleLines.js';
import type { Line } from '../../src/markdown/render.js';
import type { TocNode } from '../../src/markdown/toc.js';
import { stripAnsi } from '../../src/markdown/ansi.js';

const line = (kind: Line['kind'], text: string, path: string[] = [], refs?: Line['refs']): Line =>
  refs ? { kind, text, headingPath: path, refs } : { kind, text, headingPath: path };

const toc: TocNode[] = [
  {
    id: 'a',
    title: 'A',
    depth: 1,
    children: [],
    summary: { paragraphs: 2, codeBlocks: 1, lists: 0, tables: 0 },
  },
];

describe('computeVisibleLines', () => {
  it('drops lines whose headingPath intersects collapsed, injects summary line', () => {
    const lines: Line[] = [
      line('heading', '# A', [], { headingId: 'a' }),
      line('paragraph', 'body', ['a']),
      line('paragraph', 'body2', ['a']),
    ];
    const visible = computeVisibleLines(lines, new Set(['a']), toc);
    const plain = visible.map(l => stripAnsi(l.text));
    expect(plain).toContain('▸ A (2 paragraphs, 1 code block)');
    expect(plain).not.toContain('body');
  });

  it('does not drop lines when no collapse set', () => {
    const lines: Line[] = [
      line('heading', '# A', [], { headingId: 'a' }),
      line('paragraph', 'body', ['a']),
    ];
    expect(computeVisibleLines(lines, new Set(), toc)).toHaveLength(2);
  });

  it('hides the heading line itself when its id is collapsed (summary replaces it)', () => {
    const lines: Line[] = [
      line('heading', '# A', [], { headingId: 'a' }),
      line('paragraph', 'body', ['a']),
    ];
    const visible = computeVisibleLines(lines, new Set(['a']), toc);
    const plain = visible.map(l => stripAnsi(l.text));
    expect(plain.some(l => l === '# A')).toBe(false);
    expect(plain.some(l => l.startsWith('▸ A'))).toBe(true);
  });

  it('omits zero-count categories from the summary', () => {
    const simpleToc: TocNode[] = [
      { id: 'b', title: 'B', depth: 1, children: [], summary: { paragraphs: 0, codeBlocks: 0, lists: 0, tables: 0 } },
    ];
    const lines: Line[] = [
      line('heading', '# B', [], { headingId: 'b' }),
    ];
    const visible = computeVisibleLines(lines, new Set(['b']), simpleToc);
    const summary = visible.find(l => l.kind === 'collapsedSummary');
    expect(stripAnsi(summary?.text ?? '')).toBe('▸ B');
  });
});
