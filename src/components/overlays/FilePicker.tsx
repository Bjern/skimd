import React from 'react';
import { Box, Text } from 'ink';

export function FilePicker({
  files,
  cursor,
}: {
  files: string[];
  cursor: number;
}): JSX.Element {
  if (files.length === 0) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text dimColor>No markdown files found in the current directory.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Open a file</Text>
      <Text dimColor>↑↓ nav · Enter open · Esc exit</Text>
      <Text> </Text>
      {files.map((f, i) => (
        <Text key={f} inverse={i === cursor}>
          {f}
        </Text>
      ))}
    </Box>
  );
}
