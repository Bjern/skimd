import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../src/app.js';
import type { Line } from '../src/markdown/render.js';

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'R',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines: Array.from({ length: 20 }, (_, i) => ({
      kind: 'paragraph',
      text: `line-${i}`,
      headingPath: [],
    })) as Line[],
    links: [],
    codeBlocks: [],
    anchors: new Map(),
    toc: [],
  },
  width: 40,
  height: 5,
});

describe('keybindings — reader', () => {
  it('scrolls down on j', () => {
    const ui = render(<App init={makeInit()} />);
    ui.stdin.write('j');
    expect(ui.lastFrame()).toContain('line-1');
  });

  it('scrolls up on k after scrolling down', () => {
    const ui = render(<App init={makeInit()} />);
    ui.stdin.write('j');
    ui.stdin.write('j');
    ui.stdin.write('k');
    expect(ui.lastFrame()).toContain('line-1');
  });

  it('G jumps to bottom', () => {
    const ui = render(<App init={makeInit()} />);
    ui.stdin.write('G');
    expect(ui.lastFrame()).toContain('line-19');
  });

  it('g jumps to top after G', () => {
    const ui = render(<App init={makeInit()} />);
    ui.stdin.write('G');
    ui.stdin.write('g');
    expect(ui.lastFrame()).toContain('line-0');
  });
});
