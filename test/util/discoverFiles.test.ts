import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverFiles } from '../../src/util/discoverFiles.js';

describe('discoverFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'skimd-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('finds .md files and uppercase conventional docs', () => {
    writeFileSync(join(dir, 'README.md'), '');
    writeFileSync(join(dir, 'CONTRIBUTING'), '');
    writeFileSync(join(dir, 'notes.md'), '');
    writeFileSync(join(dir, 'other.txt'), '');
    const files = discoverFiles(dir);
    expect(files).toContain('README.md');
    expect(files).toContain('CONTRIBUTING');
    expect(files).toContain('notes.md');
    expect(files).not.toContain('other.txt');
  });

  it('puts README.md first', () => {
    writeFileSync(join(dir, 'zeta.md'), '');
    writeFileSync(join(dir, 'alpha.md'), '');
    writeFileSync(join(dir, 'README.md'), '');
    expect(discoverFiles(dir)[0]).toBe('README.md');
  });

  it('honors .gitignore when present', () => {
    writeFileSync(join(dir, 'README.md'), '');
    writeFileSync(join(dir, 'secret.md'), '');
    writeFileSync(join(dir, '.gitignore'), 'secret.md\n');
    const files = discoverFiles(dir);
    expect(files).toContain('README.md');
    expect(files).not.toContain('secret.md');
  });

  it('works when no .gitignore exists', () => {
    writeFileSync(join(dir, 'a.md'), '');
    expect(discoverFiles(dir)).toContain('a.md');
  });
});
