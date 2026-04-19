import React from 'react';
import { Box, useApp } from 'ink';
import { AppProvider, useAppState } from './state/context.js';
import { Reader } from './components/Reader.js';
import { StatusBar } from './components/StatusBar.js';
import { Help } from './components/overlays/Help.js';
import { TOC } from './components/overlays/TOC.js';
import { flattenToc } from './state/tocCursor.js';
import { computeVisibleLines } from './state/visibleLines.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useScrollAnchor } from './hooks/useScrollAnchor.js';
import { useKeybindings } from './hooks/useKeybindings.js';
import type { AppState } from './state/store.js';
import { initialState } from './state/store.js';

function findTitle(toc: AppState['source']['toc'], id: string): string | null {
  for (const n of toc) {
    if (n.id === id) return n.title;
    const r = findTitle(n.children, id);
    if (r) return r;
  }
  return null;
}

function Shell(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { exit } = useApp();
  const { width, height } = useTerminalSize();
  useKeybindings(state, dispatch, { exit });

  const visible = computeVisibleLines(state.source.lines, state.collapsed, state.source.toc);
  const currentId = useScrollAnchor(state.source.anchors, state.viewport.scrollOffset);
  const currentTitle = currentId ? findTitle(state.source.toc, currentId) : null;

  const readerHeight = Math.max(1, height - 1);
  const tocRows = flattenToc(state.source.toc, state.collapsed);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {state.mode === 'help' ? (
        <Help />
      ) : state.mode === 'toc' ? (
        <Box flexDirection="row" height={readerHeight}>
          <TOC
            rows={tocRows}
            cursor={state.tocCursor}
            collapsed={state.collapsed}
            activeId={currentId}
          />
          <Box flexGrow={1}>
            <Reader
              lines={visible}
              scrollOffset={state.viewport.scrollOffset}
              height={readerHeight}
            />
          </Box>
        </Box>
      ) : (
        <Reader lines={visible} scrollOffset={state.viewport.scrollOffset} height={readerHeight} />
      )}
      <StatusBar
        filename={state.source.path ?? '(stdin)'}
        mode={state.mode}
        currentHeading={currentTitle}
      />
    </Box>
  );
}

export function App({
  init,
}: {
  init: Parameters<typeof initialState>[0];
}): JSX.Element {
  return (
    <AppProvider init={init}>
      <Shell />
    </AppProvider>
  );
}
