import { describe, it, expect } from 'vitest';
import { parse } from '../../src/markdown/parse.js';
import { render } from '../../src/markdown/render.js';
import { stripAnsi } from '../../src/markdown/ansi.js';

describe('render — basics', () => {
  it('returns an empty lines array for empty input', () => {
    const r = render(parse(''), { width: 80, strict: false, color: true });
    expect(r.lines).toEqual([]);
  });

  it('renders a paragraph as a single line + trailing blank', () => {
    const out = render(parse('hello world'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => l.kind)).toEqual(['paragraph', 'blank']);
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('hello world');
  });
});

describe('render — headings', () => {
  it('renders H1 with underline rule', () => {
    const out = render(parse('# Title'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => l === '# Title')).toBe(true);
    expect(plain.some(l => /^━+$/.test(l))).toBe(true);
  });

  it('renders H2 with ▎ left-bar prefix', () => {
    const out = render(parse('## Sub'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => stripAnsi(l.text)).some(l => l.startsWith('▎ Sub'))).toBe(true);
  });

  it('records heading anchor pointing at the heading line', () => {
    const out = render(parse('# A\n\nbody'), { width: 80, strict: false, color: true });
    const idx = out.anchors.get('a');
    expect(idx).toBeDefined();
    expect(stripAnsi(out.lines[idx!]!.text)).toBe('# A');
  });

  it('pushes headingId onto headingPath for subsequent lines', () => {
    const out = render(parse('# A\n\nbody'), { width: 80, strict: false, color: true });
    const body = out.lines.find(l => l.kind === 'paragraph');
    expect(body?.headingPath).toEqual(['a']);
  });

  it('renders H3 with ### prefix', () => {
    const out = render(parse('### Three'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => stripAnsi(l.text)).some(l => l.startsWith('### Three'))).toBe(true);
  });

  it('renders H4 with #### prefix', () => {
    const out = render(parse('#### Four'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => stripAnsi(l.text)).some(l => l.startsWith('#### Four'))).toBe(true);
  });
});

describe('render — code blocks', () => {
  it('renders a fenced code block boxed with ╭─ / ╰─', () => {
    const out = render(parse('```bash\nnpm install\n```'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => l.startsWith('╭─'))).toBe(true);
    expect(plain.some(l => l.startsWith('╰─'))).toBe(true);
    expect(plain.some(l => l.includes('npm install'))).toBe(true);
  });

  it('records the code block in codeBlocks list', () => {
    const out = render(parse('```js\nfoo()\n```'), { width: 80, strict: false, color: true });
    expect(out.codeBlocks).toHaveLength(1);
    expect(out.codeBlocks[0]).toMatchObject({ lang: 'js', code: 'foo()', firstLine: 'foo()' });
  });

  it('assigns a stable code block id', () => {
    const out = render(parse('```\na\n```\n\n```\nb\n```'), { width: 80, strict: false, color: true });
    expect(out.codeBlocks.map(c => c.id)).toEqual(['code-1', 'code-2']);
  });

  it('renders unfenced code block without syntax highlighting crash', () => {
    const out = render(parse('```\nplain\n```'), { width: 80, strict: false, color: true });
    expect(out.codeBlocks).toHaveLength(1);
    expect(out.codeBlocks[0]?.lang).toBe('');
  });
});

describe('render — lists', () => {
  it('renders ul with cyan • bullets', () => {
    const out = render(parse('- a\n- b'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => /^• a$/.test(l))).toBe(true);
    expect(plain.some(l => /^• b$/.test(l))).toBe(true);
  });

  it('renders ol with numeric prefix', () => {
    const out = render(parse('1. first\n2. second'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => /^1\. first$/.test(l))).toBe(true);
    expect(plain.some(l => /^2\. second$/.test(l))).toBe(true);
  });

  it('renders nested lists with 2-space indent', () => {
    const out = render(parse('- a\n  - a1\n  - a2'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => /^ {2}• a1$/.test(l))).toBe(true);
  });
});

describe('render — blockquote', () => {
  it('renders blockquote with ▎ bar', () => {
    const out = render(parse('> quoted'), { width: 80, strict: false, color: true });
    expect(out.lines.map(l => stripAnsi(l.text)).some(l => l.startsWith('▎ quoted'))).toBe(true);
  });

  it('renders multiline blockquote', () => {
    const out = render(parse('> line one\n> line two'), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.filter(l => l.startsWith('▎ ')).length).toBeGreaterThanOrEqual(2);
  });
});
