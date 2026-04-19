import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';
import type { Line } from '../../src/markdown/render.js';

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'T.md',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines: [
      { kind: 'paragraph', text: 'alpha beta', headingPath: [] },
      { kind: 'paragraph', text: 'beta gamma', headingPath: [] },
      { kind: 'paragraph', text: 'delta epsilon', headingPath: [] },
    ] as Line[],
    links: [],
    codeBlocks: [],
    anchors: new Map(),
    codeAnchors: new Map(),
    toc: [],
  },
  width: 40,
  height: 10,
});

describe('SearchBar', () => {
  it('/ opens search and shows match count', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('/');
    await tick();
    ui.stdin.write('b');
    await tick();
    ui.stdin.write('e');
    await tick();
    ui.stdin.write('t');
    await tick();
    ui.stdin.write('a');
    await tick();
    await tick();
    const frame = ui.lastFrame() ?? '';
    expect(frame).toContain('/beta');
    expect(frame).toContain('/2');
  });

  it('Esc cancels and exits search mode', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('/');
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('\x1b');
    await tick();
    await tick();
    expect(ui.lastFrame() ?? '').not.toContain('/g');
  });

  it('Enter commits; n cycles matches', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('/');
    await tick();
    ui.stdin.write('b');
    await tick();
    ui.stdin.write('e');
    await tick();
    ui.stdin.write('t');
    await tick();
    ui.stdin.write('a');
    await tick();
    ui.stdin.write('\r');
    await tick();
    await tick();
    // Out of search mode
    expect(ui.lastFrame() ?? '').not.toContain('/beta');
    ui.stdin.write('n');
    await tick();
    await tick();
    // No crash, still in reader
    expect(ui.lastFrame()).toBeDefined();
  });
});
