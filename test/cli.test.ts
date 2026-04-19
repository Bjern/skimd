import { describe, it, expect } from 'vitest';
import { resolveSource, type ResolveDeps } from '../src/resolveSource.js';

function makeDeps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    readFile: async () => '# file',
    readStdin: async () => '# stdin',
    isStdinTty: true,
    pickFile: async () => 'README.md',
    existsSync: () => true,
    cwd: '/x',
    ...overrides,
  };
}

describe('resolveSource', () => {
  it('reads file when path given', async () => {
    const s = await resolveSource({ path: 'README.md' }, makeDeps());
    expect(s.path).toBe('README.md');
    expect(s.content).toBe('# file');
  });

  it("reads stdin when path is '-'", async () => {
    const s = await resolveSource({ path: '-' }, makeDeps());
    expect(s.path).toBeNull();
    expect(s.content).toBe('# stdin');
  });

  it('reads stdin when piped and no path', async () => {
    const s = await resolveSource({}, makeDeps({ isStdinTty: false }));
    expect(s.content).toBe('# stdin');
    expect(s.path).toBeNull();
  });

  it('shows picker when TTY + no path', async () => {
    const s = await resolveSource({}, makeDeps());
    expect(s.path).toBe('README.md');
  });
});
