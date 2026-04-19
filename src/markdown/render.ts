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
    case 'space':
      return;
  }
}

function renderParagraph(ctx: RenderCtx, p: Tokens.Paragraph): void {
  const text = p.text ?? '';
  push(ctx, { kind: 'paragraph', text: style(text, {}) });
  push(ctx, { kind: 'blank', text: '' });
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
