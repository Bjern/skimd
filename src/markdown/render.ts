import type { TokensList, Tokens } from 'marked';
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
    case 'space':
      return;
  }
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
