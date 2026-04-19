export function currentHeading(anchors: Map<string, number>, offset: number): string | null {
  let best: { id: string; at: number } | null = null;
  for (const [id, at] of anchors) {
    if (at <= offset && (best === null || at > best.at)) best = { id, at };
  }
  return best?.id ?? null;
}

export function useScrollAnchor(anchors: Map<string, number>, offset: number): string | null {
  return currentHeading(anchors, offset);
}
