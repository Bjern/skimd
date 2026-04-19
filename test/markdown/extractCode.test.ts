import { describe, it, expect } from 'vitest';
import { parse } from '../../src/markdown/parse.js';
import { extractCode } from '../../src/markdown/extractCode.js';

describe('extractCode', () => {
  it('returns every fenced code block in order', () => {
    const src = '```bash\necho a\n```\n\n```python\nprint("b")\n```';
    expect(extractCode(parse(src))).toEqual([
      { lang: 'bash', code: 'echo a' },
      { lang: 'python', code: 'print("b")' },
    ]);
  });

  it('filters by language when requested', () => {
    const src = '```bash\necho a\n```\n\n```python\nprint("b")\n```';
    expect(extractCode(parse(src), 'bash')).toEqual([{ lang: 'bash', code: 'echo a' }]);
  });

  it('returns empty when no code blocks', () => {
    expect(extractCode(parse('just text here'))).toEqual([]);
  });
});
