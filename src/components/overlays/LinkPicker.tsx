import React from 'react';
import { Box, Text } from 'ink';
import type { Link } from '../../markdown/render.js';
import { windowList } from '../../util/windowList.js';

export function LinkPicker({
  links,
  cursor,
  height,
}: {
  links: Link[];
  cursor: number;
  height: number;
}): JSX.Element {
  if (links.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No links in this document.</Text>
      </Box>
    );
  }
  // Border (2) + padding (2) + title + blank = ~5 rows of chrome.
  const bodyCapacity = Math.max(1, height - 5);
  const probe = windowList(cursor, links.length, bodyCapacity);
  const overflowAbove = probe.hiddenAbove > 0;
  const overflowBelow = probe.hiddenBelow > 0;
  const sliceCapacity = Math.max(
    1,
    bodyCapacity - (overflowAbove ? 1 : 0) - (overflowBelow ? 1 : 0)
  );
  const win = windowList(cursor, links.length, sliceCapacity);
  const visible = links.slice(win.start, win.end);

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>
        Links ({cursor + 1}/{links.length})
      </Text>
      <Text> </Text>
      {win.hiddenAbove > 0 && <Text dimColor>▲ {win.hiddenAbove} more</Text>}
      {visible.map((l, i) => {
        const absoluteIndex = win.start + i;
        return (
          <Text key={l.index} inverse={absoluteIndex === cursor}>
            [{l.index}] {l.text} — {l.href}
          </Text>
        );
      })}
      {win.hiddenBelow > 0 && <Text dimColor>▼ {win.hiddenBelow} more</Text>}
    </Box>
  );
}
