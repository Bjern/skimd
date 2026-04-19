import { describe, it, expect } from 'vitest';
import { plainRender } from '../../src/util/plainRender.js';

describe('plainRender', () => {
  it('outputs a string ending with a newline', () => {
    const s = plainRender('# Hi\ntext', { width: 80, color: false });
    expect(s.endsWith('\n')).toBe(true);
    expect(s).toContain('# Hi');
    expect(s).toContain('text');
  });

  it('omits ANSI when color=false', () => {
    const s = plainRender('# Hi', { width: 80, color: false });
    // eslint-disable-next-line no-control-regex
    expect(s).not.toMatch(/\x1b\[/);
  });

  it('includes ANSI when color=true', () => {
    const s = plainRender('# Hi', { width: 80, color: true });
    // eslint-disable-next-line no-control-regex
    expect(s).toMatch(/\x1b\[/);
  });

  it('honors strict=true', () => {
    const s = plainRender('<details><summary>S</summary>hidden</details>', { width: 80, color: false, strict: true });
    expect(s).not.toContain('hidden');
  });
});
