import { describe, it, expect } from 'vitest';
import { detectCapabilities } from '../../src/util/terminal.js';

describe('detectCapabilities', () => {
  it('returns color=false when NO_COLOR is set', () => {
    const r = detectCapabilities({
      env: { NO_COLOR: '1' },
      stdout: { isTTY: true, columns: 80, rows: 24 },
      colorDepth: 24,
    });
    expect(r.color).toBe(false);
  });

  it('returns unicode=true when WT_SESSION present', () => {
    const r = detectCapabilities({
      env: { WT_SESSION: 'x' },
      stdout: { isTTY: true, columns: 80, rows: 24 },
      colorDepth: 24,
    });
    expect(r.unicode).toBe(true);
  });

  it('returns unicode=true when LANG indicates utf8', () => {
    const r = detectCapabilities({
      env: { LANG: 'en_US.UTF-8' },
      stdout: { isTTY: true, columns: 80, rows: 24 },
      colorDepth: 24,
    });
    expect(r.unicode).toBe(true);
  });

  it('falls back to no color when TERM is dumb', () => {
    const r = detectCapabilities({
      env: { TERM: 'dumb' },
      stdout: { isTTY: true, columns: 80, rows: 24 },
      colorDepth: 1,
    });
    expect(r.unicode).toBe(false);
    expect(r.color).toBe(false);
  });

  it('reports isTty=false when stdout is not a TTY', () => {
    const r = detectCapabilities({
      env: {},
      stdout: { isTTY: false, columns: 80, rows: 24 },
      colorDepth: 1,
    });
    expect(r.isTty).toBe(false);
    expect(r.color).toBe(false);
  });

  it('defaults width/height when stdout values are undefined', () => {
    const r = detectCapabilities({
      env: {},
      stdout: { isTTY: true, columns: undefined, rows: undefined },
      colorDepth: 4,
    });
    expect(r.width).toBe(80);
    expect(r.height).toBe(24);
  });
});
