import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../src/app.js';
import type { Line } from '../src/markdown/render.js';

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const lines: Line[] = Array.from({ length: 30 }, (_, i) => ({
  kind: 'paragraph',
  text: `line-${i}`,
  headingPath: [],
}));

const anchors = new Map([
  ['h1', 5],
  ['h2', 15],
  ['h3', 25],
]);

const init: Parameters<typeof App>[0]['init'] = {
  source: {
    path: 'T.md',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines,
    links: [],
    codeBlocks: [],
    anchors,
    toc: [],
  },
  width: 40,
  height: 5,
};

describe('jump-by-heading', () => {
  it(']] jumps to a later heading than offset 0', async () => {
    const ui = render(<App init={init} />);
    await tick();
    ui.stdin.write(']');
    await tick();
    ui.stdin.write(']');
    await tick();
    await tick();
    const frame = ui.lastFrame() ?? '';
    // After ]] from offset 0, scrollOffset should be at or near 5 (first heading anchor).
    expect(frame).toMatch(/line-[4-7]/);
    expect(frame).not.toContain('line-0');
  });

  it('[[ jumps to an earlier heading from the bottom', async () => {
    const ui = render(<App init={init} />);
    await tick();
    ui.stdin.write('G');
    await tick();
    await tick();
    ui.stdin.write('[');
    await tick();
    ui.stdin.write('[');
    await tick();
    await tick();
    const frame = ui.lastFrame() ?? '';
    expect(frame).toMatch(/line-(15|25)/);
  });
});
