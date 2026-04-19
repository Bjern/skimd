import React from 'react';
import { Box, Text } from 'ink';
import type { Link } from '../../markdown/render.js';

export function LinkPicker({
  links,
  cursor,
}: {
  links: Link[];
  cursor: number;
}): JSX.Element {
  if (links.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No links in this document.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Links ({links.length})</Text>
      <Text> </Text>
      {links.map((l, i) => (
        <Text key={l.index} inverse={i === cursor}>
          [{l.index}] {l.text} — {l.href}
        </Text>
      ))}
    </Box>
  );
}
