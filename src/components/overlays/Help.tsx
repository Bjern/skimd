import React from 'react';
import { Box, Text } from 'ink';

export function Help(): JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Keybindings</Text>
      <Text> </Text>
      <Text>j/↓ scroll down   k/↑ scroll up   d/PgDn half-page   u/PgUp half-page</Text>
      <Text>g top   G bottom   ]] next heading   [[ prev heading</Text>
      <Text>t TOC   / search (n/N cycle)   gl link picker   gc code picker</Text>
      <Text>c code-only   M mouse toggle   ? help   q quit</Text>
      <Text> </Text>
      <Text dimColor>press any key to close</Text>
    </Box>
  );
}
