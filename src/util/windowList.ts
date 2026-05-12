export type ListWindow = {
  start: number;
  end: number;
  hiddenAbove: number;
  hiddenBelow: number;
};

// Stateless windowing: cursor stays visually centered when possible,
// clamps naturally at the top and bottom edges. This is the fzf/lazygit
// behaviour — no scroll-offset state is needed, the slice is a pure
// function of (cursor, total, height).
export function windowList(cursor: number, total: number, height: number): ListWindow {
  if (height <= 0 || total <= 0) {
    return { start: 0, end: 0, hiddenAbove: 0, hiddenBelow: 0 };
  }
  if (total <= height) {
    return { start: 0, end: total, hiddenAbove: 0, hiddenBelow: 0 };
  }
  const half = Math.floor((height - 1) / 2);
  const maxStart = total - height;
  const start = Math.max(0, Math.min(maxStart, cursor - half));
  const end = start + height;
  return {
    start,
    end,
    hiddenAbove: start,
    hiddenBelow: total - end,
  };
}
