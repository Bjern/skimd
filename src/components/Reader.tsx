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
  return (
    <Box flexDirection="column">
      {slice.map((l, i) => (
        <Text key={scrollOffset + i}>{l.text || ' '}</Text>
      ))}
    </Box>
  );
}
