import type { TocNode } from '../markdown/toc.js';

export type TocRow = { id: string; title: string; depth: number; hasChildren: boolean };

export function flattenToc(toc: TocNode[], collapsed: Set<string>): TocRow[] {
  const out: TocRow[] = [];
  const walk = (nodes: TocNode[]): void => {
    for (const n of nodes) {
      out.push({ id: n.id, title: n.title, depth: n.depth, hasChildren: n.children.length > 0 });
      if (!collapsed.has(n.id)) walk(n.children);
    }
  };
  walk(toc);
  return out;
}
