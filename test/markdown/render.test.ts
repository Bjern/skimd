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

describe('render — horizontal rule', () => {
  it('renders hr as full-width dim rule', () => {
    const out = render(parse('---'), { width: 40, strict: false, color: true });
    expect(out.lines.map(l => stripAnsi(l.text)).some(l => l === '─'.repeat(40))).toBe(true);
  });
});

describe('render — inline formatting', () => {
  it('collects links and numbers them', () => {
    const out = render(parse('see [docs](https://x) here'), { width: 80, strict: false, color: true });
    expect(out.links).toHaveLength(1);
    expect(out.links[0]).toMatchObject({ index: 1, text: 'docs', href: 'https://x' });
    expect(out.lines[0]?.refs?.linkIndices).toEqual([1]);
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('docs[1]');
  });

  it('styles inline codespan with invert', () => {
    const out = render(parse('run `foo` now'), { width: 80, strict: false, color: true });
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('foo');
  });

  it('renders strong as bold', () => {
    const out = render(parse('hello **world**'), { width: 80, strict: false, color: true });
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('world');
    expect(out.lines[0]?.text).toContain('\x1b[1m');
  });

  it('renders em as italic', () => {
    const out = render(parse('_stress_ test'), { width: 80, strict: false, color: true });
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('stress');
    expect(out.lines[0]?.text).toContain('\x1b[3m');
  });

  it('numbers multiple links in order', () => {
    const out = render(parse('[a](http://a) and [b](http://b)'), { width: 80, strict: false, color: true });
    expect(out.links.map(l => l.text)).toEqual(['a', 'b']);
    expect(out.lines[0]?.refs?.linkIndices).toEqual([1, 2]);
  });
});

describe('render — tables', () => {
  it('renders a table with box-draw borders at width >= 60', () => {
    const src = '| A | B |\n| - | - |\n| 1 | 2 |';
    const out = render(parse(src), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => l.startsWith('┌'))).toBe(true);
    expect(plain.some(l => l.startsWith('└'))).toBe(true);
  });

  it('falls back to key:value list at width < 60', () => {
    const src = '| Name | Value |\n| - | - |\n| a | 1 |';
    const out = render(parse(src), { width: 40, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => l === 'Name: a')).toBe(true);
    expect(plain.some(l => l === 'Value: 1')).toBe(true);
  });
});

describe('render — html blocks', () => {
  it('renders <details> html block as heading + body', () => {
    const src = '<details><summary>Why</summary>because</details>';
    const out = render(parse(src), { width: 80, strict: false, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text));
    expect(plain.some(l => l.includes('Why'))).toBe(true);
    expect(plain.some(l => l.includes('because'))).toBe(true);
  });

  it('renders <img> as [image: alt] and records a link', () => {
    const out = render(parse('<img alt="logo" src="https://x/y.png">'), { width: 80, strict: false, color: true });
    expect(out.lines.some(l => stripAnsi(l.text).includes('[image: logo]'))).toBe(true);
    expect(out.links[0]?.href).toBe('https://x/y.png');
  });

  it('strict mode drops <details>', () => {
    const out = render(parse('<details><summary>X</summary>Y</details>'), { width: 80, strict: true, color: true });
    const plain = out.lines.map(l => stripAnsi(l.text)).join('\n');
    expect(plain).not.toContain('Y');
  });

  it('renders html block that interpretHtml classifies as link', () => {
    // marked normally inlines <a>, so we hand-craft an html block token
    // to exercise the renderHtmlBlock 'link' case.
    const ast = [{ type: 'html', raw: '<a href="http://x">hey</a>', pre: false, text: '<a href="http://x">hey</a>' }] as unknown as import('marked').TokensList;
    const out = render(ast, { width: 80, strict: false, color: true });
    expect(out.links[0]).toMatchObject({ text: 'hey', href: 'http://x' });
  });

  it('renders plain-text html block', () => {
    const ast = [{ type: 'html', raw: '<span>plain</span>', pre: false, text: '<span>plain</span>' }] as unknown as import('marked').TokensList;
    const out = render(ast, { width: 80, strict: false, color: true });
    expect(out.lines.some(l => stripAnsi(l.text) === 'plain')).toBe(true);
  });
});

describe('render — inline fallback', () => {
  it('falls back to raw/text for unknown inline token types', () => {
    // Hand-craft a paragraph with an unknown token type to exercise the else branch.
    const ast = [{
      type: 'paragraph',
      raw: 'x',
      text: 'x',
      tokens: [{ type: 'mystery', raw: 'raw-value' }],
    }] as unknown as import('marked').TokensList;
    const out = render(ast, { width: 80, strict: false, color: true });
    expect(stripAnsi(out.lines[0]?.text ?? '')).toContain('raw-value');
  });
});
