import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ignore from 'ignore';

const EXTRA = /^(README|CONTRIBUTING|CHANGELOG|LICENSE|CODE_OF_CONDUCT)\b/i;

export function discoverFiles(cwd: string): string[] {
  const entries = readdirSync(cwd, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name);
  const ig = ignore();
  const giPath = join(cwd, '.gitignore');
  if (existsSync(giPath)) ig.add(readFileSync(giPath, 'utf8'));
  const filtered = entries.filter(n => {
    try {
      return !ig.ignores(n);
    } catch {
      return true;
    }
  });
  const picked = filtered.filter(n => /\.(md|markdown)$/i.test(n) || EXTRA.test(n));
  return picked.sort((a, b) => {
    if (a === 'README.md') return -1;
    if (b === 'README.md') return 1;
    return a.localeCompare(b);
  });
}
