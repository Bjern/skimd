import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../src/app.js';
import type { Line } from '../src/markdown/render.js';
import type { TocNode } from '../src/markdown/toc.js';

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const toc: TocNode[] = [
  { id: 'a', title: 'A', depth: 1, children: [], summary: { paragraphs: 1, codeBlocks: 0, lists: 0, tables: 0 } },
];

const lines: Line[] = [
  { kind: 'heading', text: '# A', headingPath: [], refs: { headingId: 'a' } },
];

describe('narrow terminal', () => {
  it('does not open TOC when width < 60', async () => {
    const ui = render(
      <App
        init={{
          source: {
            path: 'x',
            content: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ast: [] as any,
            lines,
            links: [],
            codeBlocks: [],
            anchors: new Map([['a', 0]]),
            toc,
          },
          width: 50,
          height: 10,
        }}
      />
    );
    await tick();
    ui.stdin.write('t');
    await tick();
    await tick();
    expect(ui.lastFrame() ?? '').not.toContain('Contents');
  });
});
