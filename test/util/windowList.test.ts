import { describe, it, expect } from 'vitest';
import { windowList } from '../../src/util/windowList.js';

describe('windowList', () => {
  it('returns whole list when total fits in height', () => {
    expect(windowList(2, 5, 10)).toEqual({
      start: 0,
      end: 5,
      hiddenAbove: 0,
      hiddenBelow: 0,
    });
  });

  it('keeps cursor near the top when at the start of the list', () => {
    const w = windowList(0, 100, 10);
    expect(w.start).toBe(0);
    expect(w.end).toBe(10);
    expect(w.hiddenAbove).toBe(0);
    expect(w.hiddenBelow).toBe(90);
  });

  it('keeps cursor near the bottom when at the end of the list', () => {
    const w = windowList(99, 100, 10);
    expect(w.start).toBe(90);
    expect(w.end).toBe(100);
    expect(w.hiddenAbove).toBe(90);
    expect(w.hiddenBelow).toBe(0);
  });

  it('centers the cursor in the middle of a long list', () => {
    const w = windowList(50, 100, 10);
    expect(w.start).toBeLessThanOrEqual(50);
    expect(w.end).toBeGreaterThan(50);
    expect(50).toBeGreaterThanOrEqual(w.start);
    expect(50).toBeLessThan(w.end);
  });

  it('never starts below 0', () => {
    const w = windowList(0, 50, 10);
    expect(w.start).toBe(0);
  });

  it('never ends past total', () => {
    const w = windowList(49, 50, 10);
    expect(w.end).toBe(50);
  });

  it('handles zero-height gracefully', () => {
    const w = windowList(5, 20, 0);
    expect(w).toEqual({ start: 0, end: 0, hiddenAbove: 0, hiddenBelow: 0 });
  });

  it('handles empty list gracefully', () => {
    const w = windowList(0, 0, 10);
    expect(w).toEqual({ start: 0, end: 0, hiddenAbove: 0, hiddenBelow: 0 });
  });

  it('always keeps cursor inside the returned slice', () => {
    const total = 200;
    const height = 15;
    for (let cursor = 0; cursor < total; cursor++) {
      const w = windowList(cursor, total, height);
      expect(cursor).toBeGreaterThanOrEqual(w.start);
      expect(cursor).toBeLessThan(w.end);
    }
  });
});
