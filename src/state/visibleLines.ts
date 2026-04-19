import type { Line } from '../markdown/render.js';
import type { TocNode } from '../markdown/toc.js';
import { style } from '../markdown/ansi.js';

function findNode(toc: TocNode[], id: string): TocNode | null {
  for (const n of toc) {
    if (n.id === id) return n;
    const r = findNode(n.children, id);
    if (r) return r;
  }
  return null;
}

function summaryText(node: TocNode): string {
  const parts: string[] = [];
  const s = node.summary;
  if (s.paragraphs) parts.push(`${s.paragraphs} paragraph${s.paragraphs === 1 ? '' : 's'}`);
  if (s.codeBlocks) parts.push(`${s.codeBlocks} code block${s.codeBlocks === 1 ? '' : 's'}`);
  if (s.lists) parts.push(`${s.lists} list${s.lists === 1 ? '' : 's'}`);
  if (s.tables) parts.push(`${s.tables} table${s.tables === 1 ? '' : 's'}`);
  return `▸ ${node.title}${parts.length ? ` (${parts.join(', ')})` : ''}`;
}

export function computeVisibleLines(
  lines: Line[],
  collapsed: Set<string>,
  toc: TocNode[]
): Line[] {
  if (collapsed.size === 0) return lines;
  const out: Line[] = [];
  const emittedSummary = new Set<string>();

  for (const line of lines) {
    const collapsedAncestor = line.headingPath.find(id => collapsed.has(id));
    const selfCollapsed = line.refs?.headingId && collapsed.has(line.refs.headingId);

    if (collapsedAncestor || selfCollapsed) {
      const id = collapsedAncestor ?? (line.refs?.headingId as string);
      if (!emittedSummary.has(id)) {
        const node = findNode(toc, id);
        if (node) {
          out.push({
            kind: 'collapsedSummary',
            text: style(summaryText(node), { dim: true }),
            headingPath: [],
          });
          emittedSummary.add(id);
        }
      }
      continue;
    }
    out.push(line);
  }
  return out;
}
