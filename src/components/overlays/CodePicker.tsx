import React from 'react';
import { Box, Text } from 'ink';
import type { CodeBlock } from '../../markdown/render.js';
import { windowList } from '../../util/windowList.js';

export function CodePicker({
  blocks,
  cursor,
  height,
}: {
  blocks: CodeBlock[];
  cursor: number;
  height: number;
}): JSX.Element {
  if (blocks.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No code blocks in this document.</Text>
      </Box>
    );
  }
  // Border (2) + padding (2) + title + hint + blank header = ~6 rows of chrome.
  const bodyCapacity = Math.max(1, height - 6);
  const probe = windowList(cursor, blocks.length, bodyCapacity);
  const overflowAbove = probe.hiddenAbove > 0;
  const overflowBelow = probe.hiddenBelow > 0;
  const sliceCapacity = Math.max(
    1,
    bodyCapacity - (overflowAbove ? 1 : 0) - (overflowBelow ? 1 : 0)
  );
  const win = windowList(cursor, blocks.length, sliceCapacity);
  const visible = blocks.slice(win.start, win.end);

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>
        Code blocks ({cursor + 1}/{blocks.length})
      </Text>
      <Text dimColor>y to yank · Enter to close · Esc to cancel</Text>
      <Text> </Text>
      {win.hiddenAbove > 0 && <Text dimColor>▲ {win.hiddenAbove} more</Text>}
      {visible.map((b, i) => {
        const absoluteIndex = win.start + i;
        return (
          <Text key={b.id} inverse={absoluteIndex === cursor}>
            [{b.lang || 'text'}] {b.firstLine}
          </Text>
        );
      })}
      {win.hiddenBelow > 0 && <Text dimColor>▼ {win.hiddenBelow} more</Text>}
    </Box>
  );
}
