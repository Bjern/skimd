import { describe, it, expect } from 'vitest';
import { currentHeading } from '../../src/hooks/useScrollAnchor.js';

describe('currentHeading', () => {
  it('returns the nearest heading anchor at or before offset', () => {
    const anchors = new Map([
      ['intro', 0],
      ['install', 10],
      ['usage', 25],
    ]);
    expect(currentHeading(anchors, 0)).toBe('intro');
    expect(currentHeading(anchors, 12)).toBe('install');
    expect(currentHeading(anchors, 25)).toBe('usage');
    expect(currentHeading(anchors, 30)).toBe('usage');
  });

  it('returns null if no anchors', () => {
    expect(currentHeading(new Map(), 0)).toBeNull();
  });

  it('returns null if offset is before all anchors', () => {
    const anchors = new Map([['install', 10]]);
    expect(currentHeading(anchors, 5)).toBeNull();
  });
});
