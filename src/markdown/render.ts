import type { TokensList, Tokens } from 'marked';
import { highlight } from 'cli-highlight';
import { style } from './ansi.js';

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
};

type RenderCtx = {
  opts: RenderOptions;
  lines: Line[];
  links: Link[];
  codeBlocks: CodeBlock[];
  anchors: Map<string, number>;
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
    case 'space':
      return;
  }
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
  const text = p.text ?? '';
  push(ctx, { kind: 'paragraph', text: style(text, {}) });
  push(ctx, { kind: 'blank', text: '' });
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
    headingPath: [],
    usedSlugs: new Set(),
  };
  for (const tok of ast) renderToken(ctx, tok as Tokens.Generic);
  return { lines: ctx.lines, links: ctx.links, codeBlocks: ctx.codeBlocks, anchors: ctx.anchors };
}
