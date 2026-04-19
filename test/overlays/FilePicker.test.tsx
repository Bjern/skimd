import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../../src/app.js';
import { parse } from '../../src/markdown/parse.js';

const tick = (): Promise<void> => new Promise(r => setImmediate(r));

const makeInit = (): Parameters<typeof App>[0]['init'] => ({
  source: {
    path: null,
    content: '',
    ast: parse(''),
    lines: [],
    links: [],
    codeBlocks: [],
    anchors: new Map(),
    codeAnchors: new Map(),
    toc: [],
  },
  width: 60,
  height: 10,
  mode: 'filePicker',
  discoveryFiles: ['README.md', 'CHANGELOG.md'],
});

describe('FilePicker', () => {
  it('renders discoveryFiles list', () => {
    const ui = render(<App init={makeInit()} onPickFile={() => {}} />);
    const frame = ui.lastFrame() ?? '';
    expect(frame).toContain('README.md');
    expect(frame).toContain('CHANGELOG.md');
    expect(frame).toContain('Open a file');
  });

  it('Enter calls onPickFile with cursor file', async () => {
    const onPickFile = vi.fn();
    const ui = render(<App init={makeInit()} onPickFile={onPickFile} />);
    await tick();
    ui.stdin.write('\r');
    await tick();
    await tick();
    expect(onPickFile).toHaveBeenCalledWith('README.md');
  });

  it('↓ moves cursor; Enter picks second file', async () => {
    const onPickFile = vi.fn();
    const ui = render(<App init={makeInit()} onPickFile={onPickFile} />);
    await tick();
    ui.stdin.write('j');
    await tick();
    ui.stdin.write('\r');
    await tick();
    await tick();
    expect(onPickFile).toHaveBeenCalledWith('CHANGELOG.md');
  });
});
