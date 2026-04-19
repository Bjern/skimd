import { describe, it, expect } from 'vitest';
import { initialState, reduce, type AppState } from '../../src/state/store.js';
import type { Line } from '../../src/markdown/render.js';

const emptySource: AppState['source'] = {
  path: 'R',
  content: '',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ast: [] as any,
  lines: [],
  links: [],
  codeBlocks: [],
  anchors: new Map(),
  codeAnchors: new Map(),
  toc: [],
};

// height=4 (readerHeight=3) keeps maxScroll small so existing clamp
// assertions exercise the non-zero branch.
const base: AppState = initialState({
  source: emptySource,
  width: 80,
  height: 4,
});

const line = (text: string): Line => ({ kind: 'paragraph', text, headingPath: [] });

describe('reducer', () => {
  it('scrollBy does nothing with no content', () => {
    const s = reduce(base, { type: 'scrollBy', delta: 5 });
    expect(s.viewport.scrollOffset).toBe(0);
  });

  it('scrollBy clamps so last page fits the viewport', () => {
    // 10 lines, height=4 → readerHeight=3 → maxScroll=7.
    const withLines = { ...base, source: { ...base.source, lines: Array(10).fill(line('x')) } };
    const s1 = reduce(withLines, { type: 'scrollBy', delta: 5 });
    expect(s1.viewport.scrollOffset).toBe(5);
    const s2 = reduce(s1, { type: 'scrollBy', delta: -100 });
    expect(s2.viewport.scrollOffset).toBe(0);
    const s3 = reduce(withLines, { type: 'scrollBy', delta: 100 });
    expect(s3.viewport.scrollOffset).toBe(7);
  });

  it('scrollTo clamps to maxScroll (not lines.length - 1)', () => {
    const withLines = { ...base, source: { ...base.source, lines: Array(10).fill(line('x')) } };
    expect(reduce(withLines, { type: 'scrollTo', offset: 100 }).viewport.scrollOffset).toBe(7);
    expect(reduce(withLines, { type: 'scrollTo', offset: -5 }).viewport.scrollOffset).toBe(0);
  });

  it('setMode changes mode', () => {
    const s = reduce(base, { type: 'setMode', mode: 'toc' });
    expect(s.mode).toBe('toc');
  });

  it('toggleCollapse adds and removes heading ids', () => {
    const s1 = reduce(base, { type: 'toggleCollapse', headingId: 'x' });
    expect(s1.collapsed.has('x')).toBe(true);
    const s2 = reduce(s1, { type: 'toggleCollapse', headingId: 'x' });
    expect(s2.collapsed.has('x')).toBe(false);
  });

  it('setSearch stores search state', () => {
    const s = reduce(base, {
      type: 'setSearch',
      search: { query: 'q', matches: [], activeIndex: 0, priorOffset: 0 },
    });
    expect(s.search?.query).toBe('q');
  });

  it('setMouseTracking toggles flag', () => {
    const s = reduce(base, { type: 'setMouseTracking', on: true });
    expect(s.mouseTracking).toBe(true);
  });
});
