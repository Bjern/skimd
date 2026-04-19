import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Reader } from '../../src/components/Reader.js';
import type { Line } from '../../src/markdown/render.js';

const lines: Line[] = Array.from({ length: 5 }, (_, i) => ({
  kind: 'paragraph',
  text: `line-${i}`,
  headingPath: [],
}));

describe('Reader', () => {
  it('renders the visible slice of lines', () => {
    const { lastFrame } = render(<Reader lines={lines} scrollOffset={1} height={3} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('line-1');
    expect(frame).toContain('line-2');
    expect(frame).toContain('line-3');
    expect(frame).not.toContain('line-0');
    expect(frame).not.toContain('line-4');
  });

  it('handles offset at the end', () => {
    const { lastFrame } = render(<Reader lines={lines} scrollOffset={3} height={5} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('line-3');
    expect(frame).toContain('line-4');
  });

  it('renders blank lines as single-space (Ink preserves line count)', () => {
    const withBlank: Line[] = [
      { kind: 'blank', text: '', headingPath: [] },
      { kind: 'paragraph', text: 'hi', headingPath: [] },
    ];
    const { lastFrame } = render(<Reader lines={withBlank} scrollOffset={0} height={2} />);
    expect(lastFrame()).toContain('hi');
  });
});
