import type { TokensList, Tokens } from 'marked';

export type TocSummary = {
  paragraphs: number;
  codeBlocks: number;
  lists: number;
  tables: number;
};

export type TocNode = {
  id: string;
  title: string;
  depth: number;
  children: TocNode[];
  summary: TocSummary;
};

function slugify(text: string, used: Set<string>): string {
  const base = text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
}

function emptySummary(): TocSummary {
  return { paragraphs: 0, codeBlocks: 0, lists: 0, tables: 0 };
}

function addSummary(a: TocSummary, b: TocSummary): TocSummary {
  return {
    paragraphs: a.paragraphs + b.paragraphs,
    codeBlocks: a.codeBlocks + b.codeBlocks,
    lists: a.lists + b.lists,
    tables: a.tables + b.tables,
  };
}

function countToken(tok: Tokens.Generic, acc: TocSummary): void {
  if (tok.type === 'paragraph') acc.paragraphs++;
  else if (tok.type === 'code') acc.codeBlocks++;
  else if (tok.type === 'list') acc.lists++;
  else if (tok.type === 'table') acc.tables++;
}

export function buildToc(ast: TokensList): TocNode[] {
  const used = new Set<string>();
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  let localSummary = emptySummary();

  const flushLocalSummaryTo = (node: TocNode | undefined): void => {
    if (!node) return;
    node.summary = addSummary(node.summary, localSummary);
    localSummary = emptySummary();
  };

  for (const tok of ast) {
    if (tok.type === 'heading') {
      const h = tok as Tokens.Heading;
      flushLocalSummaryTo(stack.at(-1));
      const node: TocNode = {
        id: slugify(h.text, used),
        title: h.text,
        depth: h.depth,
        children: [],
        summary: emptySummary(),
      };
      while (stack.length && (stack.at(-1)?.depth ?? 0) >= h.depth) stack.pop();
      if (stack.length === 0) roots.push(node);
      else stack.at(-1)?.children.push(node);
      stack.push(node);
    } else {
      countToken(tok as Tokens.Generic, localSummary);
    }
  }
  flushLocalSummaryTo(stack.at(-1));

  const rollup = (node: TocNode): TocSummary => {
    let s = node.summary;
    for (const c of node.children) s = addSummary(s, rollup(c));
    return s;
  };
  for (const r of roots) {
    r.summary = rollup(r);
  }

  return roots;
}
