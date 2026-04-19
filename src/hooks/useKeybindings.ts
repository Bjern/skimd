import { useInput } from 'ink';
import type { AppState, Action } from '../state/store.js';
import { flattenToc } from '../state/tocCursor.js';
import { buildSearch } from '../markdown/search.js';

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
          search: { query: '', matches: [], activeIndex: 0, priorOffset: state.viewport.scrollOffset },
        });
        dispatch({ type: 'setMode', mode: 'search' });
        return;
      }
      if (input === 'n' && state.search && state.search.matches.length > 0) {
        const next = (state.search.activeIndex + 1) % state.search.matches.length;
        dispatch({
          type: 'setSearch',
          search: { ...state.search, activeIndex: next },
        });
        dispatch({ type: 'scrollTo', offset: state.search.matches[next]!.lineIndex });
        return;
      }
      if (input === 'N' && state.search && state.search.matches.length > 0) {
        const total = state.search.matches.length;
        const prev = (state.search.activeIndex - 1 + total) % total;
        dispatch({
          type: 'setSearch',
          search: { ...state.search, activeIndex: prev },
        });
        dispatch({ type: 'scrollTo', offset: state.search.matches[prev]!.lineIndex });
        return;
      }
      readerKeys(input, k, state, dispatch, env);
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
  else if (input === 'g' && !key.shift) dispatch({ type: 'scrollTo', offset: 0 });
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
  if (key.escape || input === 't') {
    dispatch({ type: 'setMode', mode: 'reader' });
    return;
  }
  if (input === 'q') {
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
  // Backspace: Node/Ink passes backspace as input = '' with key.backspace,
  // but some platforms send DEL (\x7f) as input. Handle both.
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
