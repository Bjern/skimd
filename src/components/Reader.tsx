import React from 'react';
import { Box, Text } from 'ink';
import type { Line } from '../markdown/render.js';

export function Reader({
  lines,
  scrollOffset,
  height,
}: {
  lines: Line[];
  scrollOffset: number;
  height: number;
}): JSX.Element {
  const slice = lines.slice(scrollOffset, scrollOffset + height);
  // Pad to `height` rows so Ink overwrites every cell in the viewport. Without
  // padding, short slices leave stale content from previous frames on screen
  // (appears as leftover H1 underlines or HR rules when scrolled near the end).
  const padCount = Math.max(0, height - slice.length);
  return (
    <Box flexDirection="column" height={height}>
      {slice.map((l, i) => (
        <Text key={`line-${scrollOffset + i}`}>{l.text || ' '}</Text>
      ))}
      {Array.from({ length: padCount }).map((_, i) => (
        <Text key={`pad-${i}`}> </Text>
      ))}
    </Box>
  );
}
