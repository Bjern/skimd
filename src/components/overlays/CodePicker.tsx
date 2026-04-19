import React from 'react';
import { Box, Text } from 'ink';
import type { CodeBlock } from '../../markdown/render.js';

export function CodePicker({
  blocks,
  cursor,
}: {
  blocks: CodeBlock[];
  cursor: number;
}): JSX.Element {
  if (blocks.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No code blocks in this document.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Code blocks ({blocks.length})</Text>
      <Text dimColor>y to yank · Enter to close · Esc to cancel</Text>
      <Text> </Text>
      {blocks.map((b, i) => (
        <Text key={b.id} inverse={i === cursor}>
          [{b.lang || 'text'}] {b.firstLine}
        </Text>
      ))}
    </Box>
  );
}
