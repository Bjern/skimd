import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';

vi.mock('../../src/util/clipboard.js', () => ({
  copyToClipboard: vi.fn(async () => {}),
}));

const { copyToClipboard } = await import('../../src/util/clipboard.js');

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: 'R',
    content: '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ast: [] as any,
    lines: [],
    links: [],
    codeBlocks: [
      { id: 'code-1', lang: 'bash', code: 'echo a', firstLine: 'echo a' },
      { id: 'code-2', lang: 'python', code: 'print("b")', firstLine: 'print("b")' },
    ],
    anchors: new Map(),
    toc: [],
  },
  width: 60,
  height: 10,
});

describe('CodePicker', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockClear();
  });

  it('gc opens CodePicker, shows blocks', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('c');
    await tick();
    await tick();
    const frame = ui.lastFrame() ?? '';
    expect(frame).toContain('echo a');
    expect(frame).toContain('print("b")');
  });

  it('y yanks cursor block to clipboard', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('c');
    await tick();
    ui.stdin.write('y');
    await tick();
    await tick();
    expect(copyToClipboard).toHaveBeenCalledWith('echo a');
  });

  it('↓ moves cursor then y yanks second block', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('c');
    await tick();
    ui.stdin.write('j');
    await tick();
    ui.stdin.write('y');
    await tick();
    await tick();
    expect(copyToClipboard).toHaveBeenCalledWith('print("b")');
  });

  it('Esc cancels', async () => {
    const ui = render(<App init={makeInit()} />);
    await tick();
    ui.stdin.write('g');
    await tick();
    ui.stdin.write('c');
    await tick();
    ui.stdin.write('\x1b');
    await tick();
    await tick();
    expect(ui.lastFrame() ?? '').not.toContain('Code blocks');
  });
});
