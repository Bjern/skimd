import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';
import type { Line } from '../../src/markdown/render.js';
import type { TocNode } from '../../src/markdown/toc.js';

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const lines: Line[] = [
  { kind: 'heading', text: '# Intro', headingPath: [], refs: { headingId: 'intro' } },
  { kind: 'paragraph', text: 'body', headingPath: ['intro'] },
  { kind: 'heading', text: '## Install', headingPath: ['intro'], refs: { headingId: 'install' } },
  { kind: 'paragraph', text: 'install text', headingPath: ['intro', 'install'] },
];

const toc: TocNode[] = [
  {
    id: 'intro',
    title: 'Intro',
    depth: 1,
    summary: { paragraphs: 2, codeBlocks: 0, lists: 0, tables: 0 },
    children: [
      {
        id: 'install',
        title: 'Install',
        depth: 2,
        summary: { paragraphs: 1, codeBlocks: 0, lists: 0, tables: 0 },
        children: [],
      },
    ],
  },
];

const anchors = new Map([
  ['intro', 0],
  ['install', 2],
]);

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'R',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines,
    links: [],
    codeBlocks: [],
    anchors,
    toc,
  },
  width: 60,
  height: 10,
});

describe('TOC overlay', () => {
  it('t opens TOC', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('t');
    await tick();
    await tick();
    expect(ui.lastFrame()).toContain('Contents');
  });

  it('Space toggles collapse on current cursor row', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('t');
    await tick();
    ui.stdin.write(' ');
    await tick();
    await tick();
    expect(ui.lastFrame()).toContain('▸ Intro');
  });

  it('Esc closes TOC', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('t');
    await tick();
    ui.stdin.write('\x1b');
    await tick();
    await tick();
    expect(ui.lastFrame()).not.toContain('Contents');
  });
});
