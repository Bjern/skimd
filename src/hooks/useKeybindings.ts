import { useRef } from 'react';
import { useInput } from 'ink';
import type { AppState, Action } from '../state/store.js';
import { flattenToc } from '../state/tocCursor.js';
import { buildSearch } from '../markdown/search.js';
import { openBrowser } from '../util/openBrowser.js';
import { copyToClipboard } from '../util/clipboard.js';

type InkKey = {
  downArrow: boolean;
  upArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  shift: boolean;
  ctrl: boolean;
  escape: boolean;
  return: boolean;
};

export function useKeybindings(
  state: AppState,
  dispatch: (a: Action) => void,
  env: { exit: () => void }
): void {
  const chordRef = useRef<string | null>(null);

  useInput((input, key) => {
    const k = key as InkKey;
    if (k.ctrl && input === 'c') {
      env.exit();
      return;
    }
    if (state.mode === 'help') {
      dispatch({ type: 'setMode', mode: 'reader' });
      return;
    }
    if (state.mode === 'toc') {
      tocKeys(input, k, state, dispatch);
      return;
    }
    if (state.mode === 'search') {
      searchKeys(input, k, state, dispatch);
      return;
    }
    if (state.mode === 'reader') {
      // Chord continuation
      if (chordRef.current === 'g') {
        chordRef.current = null;
        if (input === 'g') dispatch({ type: 'scrollTo', offset: 0 });
        else if (input === 'l') {
          dispatch({ type: 'setPickerCursor', index: 0 });
          dispatch({ type: 'setMode', mode: 'linkPicker' });
        } else if (input === 'c') {
          dispatch({ type: 'setPickerCursor', index: 0 });
          dispatch({ type: 'setMode', mode: 'codePicker' });
        }
        return;
      }
      if (chordRef.current === ']') {
        chordRef.current = null;
        if (input === ']') jumpHeading(state, dispatch, 1);
        return;
      }
      if (chordRef.current === '[') {
        chordRef.current = null;
        if (input === '[') jumpHeading(state, dispatch, -1);
        return;
      }
      // Chord starts
      if (input === 'g' && !k.shift) {
        chordRef.current = 'g';
        return;
      }
      if (input === ']') {
        chordRef.current = ']';
        return;
      }
      if (input === '[') {
        chordRef.current = '[';
        return;
      }
      // Single-key reader actions
      if (input === '?') {
        dispatch({ type: 'setMode', mode: 'help' });
        return;
      }
      if (input === 't') {
        dispatch({ type: 'setMode', mode: 'toc' });
        dispatch({ type: 'setTocCursor', index: 0 });
        return;
      }
      if (input === '/') {
        dispatch({
          type: 'setSearch',
          search: {
            query: '',
            matches: [],
            activeIndex: 0,
            priorOffset: state.viewport.scrollOffset,
          },
        });
        dispatch({ type: 'setMode', mode: 'search' });
        return;
      }
      if (input === 'n' && state.search && state.search.matches.length > 0) {
        const next = (state.search.activeIndex + 1) % state.search.matches.length;
        dispatch({ type: 'setSearch', search: { ...state.search, activeIndex: next } });
        dispatch({ type: 'scrollTo', offset: state.search.matches[next]!.lineIndex });
        return;
      }
      if (input === 'N' && state.search && state.search.matches.length > 0) {
        const total = state.search.matches.length;
        const prev = (state.search.activeIndex - 1 + total) % total;
        dispatch({ type: 'setSearch', search: { ...state.search, activeIndex: prev } });
        dispatch({ type: 'scrollTo', offset: state.search.matches[prev]!.lineIndex });
        return;
      }
      readerKeys(input, k, state, dispatch, env);
      return;
    }
    if (state.mode === 'linkPicker') {
      linkPickerKeys(input, k, state, dispatch);
      return;
    }
    if (state.mode === 'codePicker') {
      codePickerKeys(input, k, state, dispatch);
      return;
    }
    if (state.mode === 'filePicker') {
      filePickerKeys(input, k, state, dispatch, env);
      return;
    }
  });
}

function readerKeys(
  input: string,
  key: InkKey,
  state: AppState,
  dispatch: (a: Action) => void,
  env: { exit: () => void }
): void {
  const half = Math.max(1, Math.floor((state.viewport.height - 1) / 2));
  if (input === 'q') env.exit();
  else if (input === 'j' || key.downArrow) dispatch({ type: 'scrollBy', delta: 1 });
  else if (input === 'k' || key.upArrow) dispatch({ type: 'scrollBy', delta: -1 });
  else if (input === 'd' || key.pageDown) dispatch({ type: 'scrollBy', delta: half });
  else if (input === 'u' || key.pageUp) dispatch({ type: 'scrollBy', delta: -half });
  else if (input === 'G' || (input === 'g' && key.shift))
    dispatch({ type: 'scrollTo', offset: state.source.lines.length });
}

function tocKeys(
  input: string,
  key: InkKey,
  state: AppState,
  dispatch: (a: Action) => void
): void {
  const rows = flattenToc(state.source.toc, state.collapsed);
  if (key.escape || input === 't' || input === 'q') {
    dispatch({ type: 'setMode', mode: 'reader' });
    return;
  }
  if (input === 'j' || key.downArrow) {
    dispatch({ type: 'setTocCursor', index: Math.min(rows.length - 1, state.tocCursor + 1) });
    return;
  }
  if (input === 'k' || key.upArrow) {
    dispatch({ type: 'setTocCursor', index: Math.max(0, state.tocCursor - 1) });
    return;
  }
  if (input === ' ') {
    const row = rows[state.tocCursor];
    if (row) dispatch({ type: 'toggleCollapse', headingId: row.id });
    return;
  }
  if (key.return) {
    const row = rows[state.tocCursor];
    if (row) {
      const anchor = state.source.anchors.get(row.id);
      if (anchor !== undefined) dispatch({ type: 'scrollTo', offset: anchor });
      dispatch({ type: 'setMode', mode: 'reader' });
    }
  }
}

function searchKeys(
  input: string,
  key: InkKey,
  state: AppState,
  dispatch: (a: Action) => void
): void {
  if (!state.search) return;
  if (key.escape) {
    dispatch({ type: 'scrollTo', offset: state.search.priorOffset });
    dispatch({ type: 'setSearch', search: null });
    dispatch({ type: 'setMode', mode: 'reader' });
    return;
  }
  if (key.return) {
    dispatch({ type: 'setMode', mode: 'reader' });
    return;
  }
  const isBackspace = input === '\x7f' || input === '\b' || input === '';
  let nextQuery = state.search.query;
  if (isBackspace) {
    nextQuery = state.search.query.slice(0, -1);
  } else if (input.length === 1 && input >= ' ') {
    nextQuery = state.search.query + input;
  } else {
    return;
  }
  const matches = buildSearch(state.source.lines).find(nextQuery);
  dispatch({
    type: 'setSearch',
    search: {
      query: nextQuery,
      matches,
      activeIndex: 0,
      priorOffset: state.search.priorOffset,
    },
  });
  if (matches.length > 0) {
    dispatch({ type: 'scrollTo', offset: matches[0]!.lineIndex });
  }
}

function jumpHeading(state: AppState, dispatch: (a: Action) => void, direction: 1 | -1): void {
  const offset = state.viewport.scrollOffset;
  const anchors = Array.from(state.source.anchors.values()).sort((a, b) => a - b);
  if (direction === 1) {
    const next = anchors.find(a => a > offset);
    if (next !== undefined) dispatch({ type: 'scrollTo', offset: next });
  } else {
    const prev = [...anchors].reverse().find(a => a < offset);
    if (prev !== undefined) dispatch({ type: 'scrollTo', offset: prev });
  }
}

function commonPickerNav(
  input: string,
  key: InkKey,
  max: number,
  state: AppState,
  dispatch: (a: Action) => void
): 'handled' | 'passthrough' {
  if (key.escape || input === 'q') {
    dispatch({ type: 'setMode', mode: 'reader' });
    return 'handled';
  }
  if (input === 'j' || key.downArrow) {
    dispatch({ type: 'setPickerCursor', index: Math.min(max - 1, state.pickerCursor + 1) });
    return 'handled';
  }
  if (input === 'k' || key.upArrow) {
    dispatch({ type: 'setPickerCursor', index: Math.max(0, state.pickerCursor - 1) });
    return 'handled';
  }
  return 'passthrough';
}

function linkPickerKeys(
  input: string,
  key: InkKey,
  state: AppState,
  dispatch: (a: Action) => void
): void {
  const links = state.source.links;
  if (commonPickerNav(input, key, links.length, state, dispatch) === 'handled') return;
  if (key.return) {
    const link = links[state.pickerCursor];
    if (link) {
      void openBrowser(link.href);
    }
    dispatch({ type: 'setMode', mode: 'reader' });
  }
}

function codePickerKeys(
  input: string,
  key: InkKey,
  state: AppState,
  dispatch: (a: Action) => void
): void {
  const blocks = state.source.codeBlocks;
  if (commonPickerNav(input, key, blocks.length, state, dispatch) === 'handled') return;
  if (input === 'y') {
    const block = blocks[state.pickerCursor];
    if (block) {
      void copyToClipboard(block.code);
    }
    return;
  }
  if (key.return) {
    dispatch({ type: 'setMode', mode: 'reader' });
  }
}

function filePickerKeys(
  input: string,
  key: InkKey,
  _state: AppState,
  _dispatch: (a: Action) => void,
  env: { exit: () => void }
): void {
  if (key.escape) {
    env.exit();
    return;
  }
  // File picker is driven separately via the cli.ts pre-app launcher
  // (see Task 28); this handler is a placeholder for future in-session file switching.
  void input;
}
