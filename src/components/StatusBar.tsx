import React from 'react';
import { Box, Text } from 'ink';
import type { Mode } from '../state/store.js';

const HINTS: Record<Mode, string> = {
  reader: '↑↓ scroll · t toc · / search · gl links · gc code · ? help · q quit',
  toc: '↑↓ nav · Space collapse · Enter jump · t/Esc close',
  search: 'type to search · Enter commit · Esc cancel',
  linkPicker: '↑↓ nav · Enter open · Esc cancel',
  codePicker: '↑↓ nav · Enter scroll-to · y yank · Esc cancel',
  filePicker: '↑↓ nav · Enter open · Esc exit',
  help: 'any key to close',
  codeOnly: '↑↓ scroll · c exit · gc code · ? help · q quit',
};

export function StatusBar({
  filename,
  mode,
  currentHeading,
}: {
  filename: string;
  mode: Mode;
  currentHeading: string | null;
}): JSX.Element {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
      <Text>
        {' '}
        {filename}
        {currentHeading ? ` · ${currentHeading}` : ''}{' '}
      </Text>
      <Box flexGrow={1} />
      <Text dimColor>{HINTS[mode]}</Text>
    </Box>
  );
}
