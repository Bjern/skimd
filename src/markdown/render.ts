import type { TokensList, Tokens } from 'marked';
import { highlight } from 'cli-highlight';
import { style } from './ansi.js';
import { interpretHtml } from './html.js';

export type RenderOptions = { width: number; strict: boolean; color: boolean };

export type Line = {
  kind: 'paragraph' | 'heading' | 'code' | 'list' | 'quote' | 'table' | 'hr' | 'blank' | 'collapsedSummary';
  text: string;
  headingPath: string[];
  refs?: {
    headingId?: string;
    linkIndices?: number[];
    codeBlockId?: string;
  };
};

export type Link = { index: number; text: string; href: string };
export type CodeBlock = { id: string; lang: string; code: string; firstLine: string };

export type RenderOutput = {
  lines: Line[];
  links: Link[];
  codeBlocks: CodeBlock[];
  anchors: Map<string, number>;
  codeAnchors: Map<string, number>;
};

type RenderCtx = {
  opts: RenderOptions;
  lines: Line[];
  links: Link[];
  codeBlocks: CodeBlock[];
  anchors: Map<string, number>;
  codeAnchors: Map<string, number>;
  headingPath: string[];
  usedSlugs: Set<string>;
};

function push(ctx: RenderCtx, line: Omit<Line, 'headingPath'>): void {
  ctx.lines.push({ ...line, headingPath: [...ctx.headingPath] });
}

function renderToken(ctx: RenderCtx, tok: Tokens.Generic): void {
  switch (tok.type) {
    case 'paragraph':
      return renderParagraph(ctx, tok as Tokens.Paragraph);
    case 'heading':
      return renderHeading(ctx, tok as Tokens.Heading);
    case 'code':
      return renderCode(ctx, tok as Tokens.Code);
    case 'list':
      return renderList(ctx, tok as Tokens.List);
    case 'blockquote':
      return renderBlockquote(ctx, tok as Tokens.Blockquote);
    case 'hr':
      return renderHr(ctx);
    case 'table':
      return renderTable(ctx, tok as Tokens.Table);
    case 'html':
      return renderHtmlBlock(ctx, tok as Tokens.HTML);
    case 'space':
      return;
  }
}

function renderHtmlBlock(ctx: RenderCtx, h: Tokens.HTML): void {
  const r = interpretHtml(h.text, { strict: ctx.opts.strict });
  switch (r.kind) {
    case 'collapsible': {
      renderHeading(ctx, { type: 'heading', depth: 3, text: r.summary, raw: '', tokens: [] } as Tokens.Heading);
      if (r.body) {
        push(ctx, { kind: 'paragraph', text: r.body });
        push(ctx, { kind: 'blank', text: '' });
      }
      return;
    }
    case 'image': {
      const index = ctx.links.length + 1;
      ctx.links.push({ index, text: r.alt || 'image', href: r.href });
      push(ctx, {
        kind: 'paragraph',
        text: style(`[image: ${r.alt}]`, { dim: true }),
        refs: { linkIndices: [index] },
      });
      push(ctx, { kind: 'blank', text: '' });
      return;
    }
    case 'link': {
      const index = ctx.links.length + 1;
      ctx.links.push({ index, text: r.text, href: r.href });
      push(ctx, {
        kind: 'paragraph',
        text: `${style(r.text, { color: 'blue', underline: true })}${style(`[${index}]`, { dim: true })}`,
        refs: { linkIndices: [index] },
      });
      push(ctx, { kind: 'blank', text: '' });
      return;
    }
    case 'text':
      if (r.text) {
        push(ctx, { kind: 'paragraph', text: r.text });
        push(ctx, { kind: 'blank', text: '' });
      }
      return;
  }
}

function renderTable(ctx: RenderCtx, t: Tokens.Table): void {
  const headers = t.header.map(h => h.text);
  const rows = t.rows.map(r => r.map(c => c.text));

  if (ctx.opts.width < 60) {
    for (const row of rows) {
      headers.forEach((h, i) =>
        push(ctx, { kind: 'table', text: `${style(h, { bold: true })}: ${row[i] ?? ''}` })
      );
      push(ctx, { kind: 'blank', text: '' });
    }
    return;
  }

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
  );
  const line = (l: string, m: string, r: string, fill = '─'): string =>
    style(l + widths.map(w => fill.repeat(w + 2)).join(m) + r, { dim: true });
  const data = (cells: string[]): string =>
    `${style('│', { dim: true })} ${cells.map((c, i) => {
      const w = widths[i] ?? 0;
      const bare = stripAnsiLocal(c);
      return c + ' '.repeat(Math.max(0, w - bare.length));
    }).join(` ${style('│', { dim: true })} `)} ${style('│', { dim: true })}`;

  push(ctx, { kind: 'table', text: line('┌', '┬', '┐') });
  push(ctx, { kind: 'table', text: data(headers.map(h => style(h, { bold: true }))) });
  push(ctx, { kind: 'table', text: line('├', '┼', '┤') });
  for (const r of rows) push(ctx, { kind: 'table', text: data(r) });
  push(ctx, { kind: 'table', text: line('└', '┴', '┘') });
  push(ctx, { kind: 'blank', text: '' });
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsiLocal(s: string): string {
  return s.replace(ANSI_RE, '');
}

function renderHr(ctx: RenderCtx): void {
  push(ctx, { kind: 'hr', text: style('─'.repeat(ctx.opts.width), { dim: true }) });
  push(ctx, { kind: 'blank', text: '' });
}

function renderBlockquote(ctx: RenderCtx, q: Tokens.Blockquote): void {
  for (const tok of q.tokens ?? []) {
    const text = (tok as Tokens.Generic & { text?: string }).text ?? '';
    for (const line of text.split('\n')) {
      push(ctx, { kind: 'quote', text: `${style('▎', { color: 'magenta' })} ${style(line, { italic: true, dim: true })}` });
    }
  }
  push(ctx, { kind: 'blank', text: '' });
}

function renderList(ctx: RenderCtx, l: Tokens.List, depth = 0): void {
  const indent = '  '.repeat(depth);
  l.items.forEach((item, i) => {
    const marker = l.ordered
      ? style(`${(Number(l.start) || 1) + i}.`, { color: 'orange' })
      : style('•', { color: 'cyan' });
    const text = (item.text ?? '').split('\n')[0] ?? '';
    push(ctx, { kind: 'list', text: `${indent}${marker} ${text}` });
    for (const child of item.tokens ?? []) {
      const t = child as Tokens.Generic;
      if (t.type === 'list') renderList(ctx, t as Tokens.List, depth + 1);
    }
  });
  if (depth === 0) push(ctx, { kind: 'blank', text: '' });
}

function renderCode(ctx: RenderCtx, c: Tokens.Code): void {
  const id = `code-${ctx.codeBlocks.length + 1}`;
  const lang = (c.lang ?? '').trim();
  const firstLine = (c.text.split('\n')[0] ?? '').slice(0, 80);
  ctx.codeBlocks.push({ id, lang, code: c.text, firstLine });

  push(ctx, {
    kind: 'code',
    text: style(`╭─ ${lang}`.trimEnd(), { dim: true }),
    refs: { codeBlockId: id },
  });
  ctx.codeAnchors.set(id, ctx.lines.length - 1);
  const highlighted = ctx.opts.color && lang
    ? highlight(c.text, { language: lang, ignoreIllegals: true })
    : c.text;
  for (const line of highlighted.split('\n')) {
    push(ctx, { kind: 'code', text: `${style('│', { dim: true })} ${line}`, refs: { codeBlockId: id } });
  }
  push(ctx, { kind: 'code', text: style('╰─', { dim: true }), refs: { codeBlockId: id } });
  push(ctx, { kind: 'blank', text: '' });
}

function renderParagraph(ctx: RenderCtx, p: Tokens.Paragraph): void {
  const { text, linkIndices } = renderInline(ctx, (p.tokens ?? []) as Tokens.Generic[]);
  const refs = linkIndices.length ? { linkIndices } : undefined;
  push(ctx, refs ? { kind: 'paragraph', text, refs } : { kind: 'paragraph', text });
  push(ctx, { kind: 'blank', text: '' });
}

function renderInline(ctx: RenderCtx, tokens: Tokens.Generic[]): { text: string; linkIndices: number[] } {
  const parts: string[] = [];
  const linkIndices: number[] = [];
  for (const t of tokens) {
    const tok = t as Tokens.Generic;
    if (tok.type === 'text') {
      parts.push(tok.text ?? tok.raw ?? '');
    } else if (tok.type === 'codespan') {
      const cs = tok as Tokens.Codespan;
      parts.push(style(cs.text ?? '', { color: 'yellow', invert: true }));
    } else if (tok.type === 'link') {
      const link = tok as Tokens.Link;
      const index = ctx.links.length + 1;
      ctx.links.push({ index, text: link.text ?? '', href: link.href ?? '' });
      linkIndices.push(index);
      parts.push(
        `${style(link.text ?? '', { color: 'blue', underline: true })}${style(`[${index}]`, { dim: true })}`
      );
    } else if (tok.type === 'strong') {
      const s = tok as Tokens.Strong;
      const inner = renderInline(ctx, (s.tokens ?? []) as Tokens.Generic[]);
      linkIndices.push(...inner.linkIndices);
      parts.push(style(inner.text, { bold: true }));
    } else if (tok.type === 'em') {
      const e = tok as Tokens.Em;
      const inner = renderInline(ctx, (e.tokens ?? []) as Tokens.Generic[]);
      linkIndices.push(...inner.linkIndices);
      parts.push(style(inner.text, { italic: true }));
    } else {
      parts.push((tok as Tokens.Generic).raw ?? (tok as Tokens.Generic).text ?? '');
    }
  }
  return { text: parts.join(''), linkIndices };
}

function slug(text: string, used: Set<string>): string {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let s = base;
  let n = 2;
  while (used.has(s)) s = `${base}-${n++}`;
  used.add(s);
  return s;
}

function renderHeading(ctx: RenderCtx, h: Tokens.Heading): void {
  const id = slug(h.text, ctx.usedSlugs);
  while (ctx.headingPath.length >= h.depth) ctx.headingPath.pop();

  if (h.depth === 1) {
    push(ctx, { kind: 'blank', text: '' });
    push(ctx, { kind: 'heading', text: style(`# ${h.text}`, { color: 'cyan', bold: true }), refs: { headingId: id } });
    ctx.anchors.set(id, ctx.lines.length - 1);
    push(ctx, { kind: 'heading', text: style('━'.repeat(Math.max(3, h.text.length + 2)), { color: 'cyan', dim: true }) });
  } else if (h.depth === 2) {
    push(ctx, { kind: 'blank', text: '' });
    push(ctx, { kind: 'heading', text: style(`▎ ${h.text}`, { color: 'magenta', bold: true }), refs: { headingId: id } });
    ctx.anchors.set(id, ctx.lines.length - 1);
  } else if (h.depth === 3) {
    push(ctx, { kind: 'heading', text: style(`### ${h.text}`, { color: 'green', bold: true }), refs: { headingId: id } });
    ctx.anchors.set(id, ctx.lines.length - 1);
  } else {
    const prefix = '#'.repeat(h.depth);
    push(ctx, { kind: 'heading', text: style(`${prefix} ${h.text}`, { color: 'yellow', bold: true }), refs: { headingId: id } });
    ctx.anchors.set(id, ctx.lines.length - 1);
  }
  push(ctx, { kind: 'blank', text: '' });
  ctx.headingPath.push(id);
}

export function render(ast: TokensList, opts: RenderOptions): RenderOutput {
  const ctx: RenderCtx = {
    opts,
    lines: [],
    links: [],
    codeBlocks: [],
    anchors: new Map(),
    codeAnchors: new Map(),
    headingPath: [],
    usedSlugs: new Set(),
  };
  for (const tok of ast) renderToken(ctx, tok as Tokens.Generic);
  return {
    lines: ctx.lines,
    links: ctx.links,
    codeBlocks: ctx.codeBlocks,
    anchors: ctx.anchors,
    codeAnchors: ctx.codeAnchors,
  };
}
