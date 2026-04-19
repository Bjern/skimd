import { describe, it, expect } from 'vitest';
import { computeVisibleLines } from '../../src/state/visibleLines.js';
import type { Line } from '../../src/markdown/render.js';
import { stripAnsi } from '../../src/markdown/ansi.js';

const L = (kind: Line['kind'], text: string, path: string[] = [], refs?: Line['refs']): Line =>
  refs ? { kind, text, headingPath: path, refs } : { kind, text, headingPath: path };

describe('computeVisibleLines — codeOnly', () => {
  it('keeps only code lines and the enclosing heading', () => {
    const lines: Line[] = [
      L('heading', '# Install', [], { headingId: 'install' }),
      L('paragraph', 'prose', ['install']),
      L('code', 'npm install', ['install'], { codeBlockId: 'code-1' }),
      L('paragraph', 'more prose', ['install']),
    ];
    const out = computeVisibleLines(lines, new Set(), [], true);
    const plain = out.map(l => stripAnsi(l.text));
    expect(plain).toContain('# Install');
    expect(plain).toContain('npm install');
    expect(plain).not.toContain('prose');
    expect(plain).not.toContain('more prose');
  });

  it('emits each enclosing heading only once per section', () => {
    const lines: Line[] = [
      L('heading', '# Install', [], { headingId: 'install' }),
      L('code', 'npm install', ['install'], { codeBlockId: 'code-1' }),
      L('code', 'npm test', ['install'], { codeBlockId: 'code-2' }),
    ];
    const out = computeVisibleLines(lines, new Set(), [], true);
    const headings = out.filter(l => l.kind === 'heading');
    expect(headings).toHaveLength(1);
  });

  it('returns only code when there is no heading', () => {
    const lines: Line[] = [
      L('paragraph', 'prose', []),
      L('code', 'echo', [], { codeBlockId: 'code-1' }),
    ];
    const out = computeVisibleLines(lines, new Set(), [], true);
    const plain = out.map(l => stripAnsi(l.text));
    expect(plain).toEqual(['echo']);
  });
});
