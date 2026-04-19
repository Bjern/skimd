import type { TokensList } from 'marked';
import type { Line, Link, CodeBlock } from '../markdown/render.js';
import type { TocNode } from '../markdown/toc.js';

export type Mode =
  | 'reader'
  | 'toc'
  | 'search'
  | 'linkPicker'
  | 'codePicker'
  | 'filePicker'
  | 'help'
  | 'codeOnly';

export type Match = { lineIndex: number; start: number; end: number };

export type AppState = {
  source: {
    path: string | null;
    content: string;
    ast: TokensList;
    lines: Line[];
    links: Link[];
    codeBlocks: CodeBlock[];
    anchors: Map<string, number>;
    toc: TocNode[];
  };
  viewport: { scrollOffset: number; width: number; height: number };
  mode: Mode;
  collapsed: Set<string>;
  search: { query: string; matches: Match[]; activeIndex: number } | null;
  mouseTracking: boolean;
};

export type Action =
  | { type: 'scrollBy'; delta: number }
  | { type: 'scrollTo'; offset: number }
  | { type: 'setMode'; mode: Mode }
  | { type: 'toggleCollapse'; headingId: string }
  | { type: 'setSearch'; search: AppState['search'] }
  | { type: 'setMouseTracking'; on: boolean };

export function initialState(init: {
  source: AppState['source'];
  width: number;
  height: number;
}): AppState {
  return {
    source: init.source,
    viewport: { scrollOffset: 0, width: init.width, height: init.height },
    mode: 'reader',
    collapsed: new Set(),
    search: null,
    mouseTracking: false,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'scrollBy': {
      const max = Math.max(0, state.source.lines.length - 1);
      return {
        ...state,
        viewport: {
          ...state.viewport,
          scrollOffset: clamp(state.viewport.scrollOffset + action.delta, 0, max),
        },
      };
    }
    case 'scrollTo': {
      const max = Math.max(0, state.source.lines.length - 1);
      return {
        ...state,
        viewport: {
          ...state.viewport,
          scrollOffset: clamp(action.offset, 0, max),
        },
      };
    }
    case 'setMode':
      return { ...state, mode: action.mode };
    case 'toggleCollapse': {
      const next = new Set(state.collapsed);
      if (next.has(action.headingId)) next.delete(action.headingId);
      else next.add(action.headingId);
      return { ...state, collapsed: next };
    }
    case 'setSearch':
      return { ...state, search: action.search };
    case 'setMouseTracking':
      return { ...state, mouseTracking: action.on };
  }
}
