import React from 'react';
import { Box, Text } from 'ink';
import type { TocRow } from '../../state/tocCursor.js';

export function TOC({
  rows,
  cursor,
  collapsed,
  activeId,
}: {
  rows: TocRow[];
  cursor: number;
  collapsed: Set<string>;
  activeId: string | null;
}): JSX.Element {
  return (
    <Box flexDirection="column" width={24} borderStyle="single" borderRight>
      <Text bold>Contents</Text>
      <Text> </Text>
      {rows.length === 0 ? (
        <Text dimColor>(no headings)</Text>
      ) : (
        rows.map((r, i) => {
          const marker = !r.hasChildren ? '•' : collapsed.has(r.id) ? '▸' : '▾';
          const indent = '  '.repeat(Math.max(0, r.depth - 1));
          return (
            <Text key={r.id} inverse={i === cursor} bold={r.id === activeId}>
              {indent}
              {marker} {r.title}
            </Text>
          );
        })
      )}
    </Box>
  );
}
