import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { stripAnsi } from '../src/markdown/ansi.js';

describe('e2e', () => {
  it('renders README.md via dist/cli.js with no crash', () => {
    if (!existsSync('dist/cli.js')) {
      throw new Error('dist/cli.js missing — run `npm run build` first');
    }
    const readme = readFileSync('README.md', 'utf8');
    const title = readme.split('\n').find(l => l.startsWith('# '))?.slice(2) ?? '';
    const out = execFileSync(process.execPath, ['dist/cli.js', 'README.md'], {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    expect(stripAnsi(out)).toContain(title);
  });

  it('extracts code blocks via --code flag', () => {
    if (!existsSync('dist/cli.js')) {
      throw new Error('dist/cli.js missing — run `npm run build` first');
    }
    const out = execFileSync(process.execPath, ['dist/cli.js', '--code', 'README.md'], {
      encoding: 'utf8',
    });
    expect(out).toContain('npx skimd');
  });
});
