import React from 'react';
import { Box, Text } from 'ink';
import { windowList } from '../../util/windowList.js';

export function FilePicker({
  files,
  cursor,
  height,
}: {
  files: string[];
  cursor: number;
  height: number;
}): JSX.Element {
  if (files.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No markdown files found in the current directory.</Text>
      </Box>
    );
  }
  // Border (2) + padding (2) + title + hint + blank = ~6 rows of chrome.
  const bodyCapacity = Math.max(1, height - 6);
  const probe = windowList(cursor, files.length, bodyCapacity);
  const overflowAbove = probe.hiddenAbove > 0;
  const overflowBelow = probe.hiddenBelow > 0;
  const sliceCapacity = Math.max(
    1,
    bodyCapacity - (overflowAbove ? 1 : 0) - (overflowBelow ? 1 : 0)
  );
  const win = windowList(cursor, files.length, sliceCapacity);
  const visible = files.slice(win.start, win.end);

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>
        Open a file ({cursor + 1}/{files.length})
      </Text>
      <Text dimColor>↑↓ nav · Enter open · Esc exit</Text>
      <Text> </Text>
      {win.hiddenAbove > 0 && <Text dimColor>▲ {win.hiddenAbove} more</Text>}
      {visible.map((f, i) => {
        const absoluteIndex = win.start + i;
        return (
          <Text key={f} inverse={absoluteIndex === cursor}>
            {f}
          </Text>
        );
      })}
      {win.hiddenBelow > 0 && <Text dimColor>▼ {win.hiddenBelow} more</Text>}
    </Box>
  );
}
