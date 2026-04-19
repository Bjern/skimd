import React from 'react';
import { Box, Text } from 'ink';

export function SearchBar({
  query,
  matchCount,
  activeIndex,
}: {
  query: string;
  matchCount: number;
  activeIndex: number;
}): JSX.Element {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Text>/{query}</Text>
      <Box flexGrow={1} />
      <Text dimColor>{matchCount ? `${activeIndex + 1}/${matchCount}` : 'no matches'}</Text>
    </Box>
  );
}
