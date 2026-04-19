import React from 'react';
import { Box, Text } from 'ink';
import type { Line } from '../markdown/render.js';
import { stripAnsi } from '../markdown/ansi.js';

// Ink / wrap-ansi mishandles multi-param SGR sequences (tried
// \x1b[0;22;23;24;27;29;39;49m — the tail leaked as literal "39;49m" text),
// so use the plain reset. The underline-leak this was trying to fix is
// addressed upstream by not emitting underline in link rendering.
const RESET = '\x1b[0m';

// Ensure each rendered row:
//  1. resets any prior ANSI state at the start,
//  2. ends with a reset (so the rest of the cell row can't inherit attributes),
//  3. pads to the viewport width so Ink overwrites every cell — otherwise the
//     trailing cells keep whatever the prior frame wrote (e.g. link underline,
//     H1 bar color), producing the blue-tinted bleed you saw when scrolling
//     past a section containing styled inline text.
function rowFor(text: string, width: number): string {
  const content = `${RESET}${text}${RESET}`;
  // TODO(v0.2.0): .length counts UTF-16 code units, not terminal columns.
  // CJK and most emoji occupy 2 columns; we'll leave one stale cell per wide
  // glyph at the end of the row. Swap in a wcwidth-equivalent when adding
  // table/width handling for non-ASCII content.
  const visible = stripAnsi(text).length;
  const padding = Math.max(0, width - visible);
  return `${content}${' '.repeat(padding)}`;
}

export function Reader({
  lines,
  scrollOffset,
  height,
  width,
}: {
  lines: Line[];
  scrollOffset: number;
  height: number;
  width: number;
}): JSX.Element {
  const slice = lines.slice(scrollOffset, scrollOffset + height);
  const padCount = Math.max(0, height - slice.length);
  const w = Math.max(1, width);
  const blankRow = `${RESET}${' '.repeat(w)}`;
  return (
    <Box flexDirection="column" height={height} width={width}>
      {slice.map((l, i) => (
        <Text key={`line-${scrollOffset + i}`}>{rowFor(l.text, w)}</Text>
      ))}
      {Array.from({ length: padCount }).map((_, i) => (
        <Text key={`pad-${i}`}>{blankRow}</Text>
      ))}
    </Box>
  );
}
