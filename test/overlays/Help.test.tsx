import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';
import type { Line } from '../../src/markdown/render.js';

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'R',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines: [] as Line[],
    links: [],
    codeBlocks: [],
    anchors: new Map(),
    toc: [],
  },
  width: 80,
  height: 10,
});

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

describe('Help overlay', () => {
  it('? opens Help, any key closes', async () => {
    const ui = render(<App init={makeInit()} />);
    // Two ticks — useInput handler registers on effect, then processes input.
    await tick();
    ui.stdin.write('?');
    await tick();
    await tick();
    expect(ui.lastFrame()).toContain('Keybindings');
    ui.stdin.write('x');
    await tick();
    await tick();
    expect(ui.lastFrame()).not.toContain('Keybindings');
  });
});
