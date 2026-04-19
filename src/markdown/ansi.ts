export type StyleFlags = {
  color?: 'cyan' | 'green' | 'yellow' | 'magenta' | 'blue' | 'red' | 'orange';
  dim?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  invert?: boolean;
};

const COLOR: Record<NonNullable<StyleFlags['color']>, string> = {
  cyan: '38;5;45',
  green: '38;5;114',
  yellow: '38;5;221',
  magenta: '38;5;183',
  blue: '38;5;117',
  red: '38;5;203',
  orange: '38;5;216',
};

export function style(text: string, s: StyleFlags): string {
  const codes: string[] = [];
  if (s.bold) codes.push('1');
  if (s.dim) codes.push('2');
  if (s.italic) codes.push('3');
  if (s.underline) codes.push('4');
  if (s.invert) codes.push('7');
  if (s.color) codes.push(COLOR[s.color]);
  if (codes.length === 0) return text;
  return `\x1b[${codes.join(';')}m${text}\x1b[0m`;
}

// eslint-disable-next-line no-control-regex
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
