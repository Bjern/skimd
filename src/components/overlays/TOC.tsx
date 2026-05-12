import React from 'react';
import { Box, Text } from 'ink';
import type { TocRow } from '../../state/tocCursor.js';
import { windowList } from '../../util/windowList.js';

export function TOC({
  rows,
  cursor,
  collapsed,
  activeId,
  height,
}: {
  rows: TocRow[];
  cursor: number;
  collapsed: Set<string>;
  activeId: string | null;
  height: number;
}): JSX.Element {
  // Header takes 2 rows ("Contents" + counter); reserve 1 row each for the
  // up/down "more" indicators when content overflows. Worst case the body
  // can use height - 4 rows.
  const bodyCapacity = Math.max(1, height - 2);
  const win = windowList(cursor, rows.length, bodyCapacity);
  const overflowAbove = win.hiddenAbove > 0;
  const overflowBelow = win.hiddenBelow > 0;
  const sliceCapacity = Math.max(
    1,
    bodyCapacity - (overflowAbove ? 1 : 0) - (overflowBelow ? 1 : 0)
  );
  const sliceWin = windowList(cursor, rows.length, sliceCapacity);
  const visible = rows.slice(sliceWin.start, sliceWin.end);

  return (
    <Box flexDirection="column" width={24} borderStyle="single" borderRight>
      <Text bold>
        Contents{rows.length > 0 ? ` (${cursor + 1}/${rows.length})` : ''}
      </Text>
      {rows.length === 0 ? (
        <Text dimColor>(no headings)</Text>
      ) : (
        <>
          {sliceWin.hiddenAbove > 0 && (
            <Text dimColor>▲ {sliceWin.hiddenAbove} more</Text>
          )}
          {visible.map((r, i) => {
            const absoluteIndex = sliceWin.start + i;
            const marker = !r.hasChildren ? '·' : collapsed.has(r.id) ? '>' : 'v';
            const indent = '  '.repeat(Math.max(0, r.depth - 1));
            return (
              <Text key={r.id} inverse={absoluteIndex === cursor} bold={r.id === activeId}>
                {indent}
                {marker} {r.title}
              </Text>
            );
          })}
          {sliceWin.hiddenBelow > 0 && (
            <Text dimColor>▼ {sliceWin.hiddenBelow} more</Text>
          )}
        </>
      )}
    </Box>
  );
}
