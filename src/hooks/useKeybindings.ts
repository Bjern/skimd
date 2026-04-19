import { useInput } from 'ink';
import type { AppState, Action } from '../state/store.js';

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
    if (state.mode === 'reader') readerKeys(input, k, state, dispatch, env);
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
