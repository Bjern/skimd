import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';

vi.mock('../../src/util/openBrowser.js', () => ({
  openBrowser: vi.fn(async () => {}),
}));

const { openBrowser } = await import('../../src/util/openBrowser.js');

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'R',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines: [],
    links: [
      { index: 1, text: 'docs', href: 'https://x' },
      { index: 2, text: 'spec', href: 'https://y' },
    ],
    codeBlocks: [],
    anchors: new Map(),
    toc: [],
  },
  width: 60,
  height: 10,
});

describe('LinkPicker', () => {
  beforeEach(() => {
    vi.mocked(openBrowser).mockClear();
  });

  it('gl opens LinkPicker, shows links', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('l');
    await tick();
    await tick();
    const frame = ui.lastFrame() ?? '';
    expect(frame).toContain('docs');
    expect(frame).toContain('spec');
  });

  it('Enter calls openBrowser with cursor href', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('l');
    await tick();
    ui.stdin.write('\r');
    await tick();
    await tick();
    expect(openBrowser).toHaveBeenCalledWith('https://x');
  });

  it('↓ moves cursor; Enter picks second link', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('l');
    await tick();
    ui.stdin.write('j');
    await tick();
    ui.stdin.write('\r');
    await tick();
    await tick();
    expect(openBrowser).toHaveBeenCalledWith('https://y');
  });

  it('Esc cancels', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('l');
    await tick();
    ui.stdin.write('\x1b');
    await tick();
    await tick();
    expect(ui.lastFrame() ?? '').not.toContain('Links (2)');
  });
});
