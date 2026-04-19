import { describe, it, expect } from 'vitest';
import { interpretHtml, type HtmlHandling } from '../../src/markdown/html.js';

const nonStrict: HtmlHandling = { strict: false };
const strict: HtmlHandling = { strict: true };

describe('interpretHtml', () => {
  it('unwraps <details><summary>X</summary>Y</details> to collapsible', () => {
    const r = interpretHtml('<details><summary>Title</summary>Body</details>', nonStrict);
    expect(r.kind).toBe('collapsible');
    if (r.kind === 'collapsible') {
      expect(r.summary).toBe('Title');
      expect(r.body).toBe('Body');
    }
  });

  it('renders <img> as [image: alt] plus link', () => {
    const r = interpretHtml('<img alt="logo" src="https://x/y.png">', nonStrict);
    expect(r.kind).toBe('image');
    if (r.kind === 'image') {
      expect(r.alt).toBe('logo');
      expect(r.href).toBe('https://x/y.png');
    }
  });

  it('renders <a href=".">X</a> as link node', () => {
    const r = interpretHtml('<a href="https://x">X</a>', nonStrict);
    expect(r).toEqual({ kind: 'link', text: 'X', href: 'https://x' });
  });

  it('strips unknown tags but keeps text content', () => {
    const r = interpretHtml('<span>kept</span>', nonStrict);
    expect(r).toEqual({ kind: 'text', text: 'kept' });
  });

  it('unwraps <picture> to inner <img>', () => {
    const r = interpretHtml('<picture><source srcset="x"><img alt="A" src="a.png"></picture>', nonStrict);
    expect(r.kind).toBe('image');
  });

  it('strict mode returns empty text for all html', () => {
    const r = interpretHtml('<details><summary>X</summary>Y</details>', strict);
    expect(r).toEqual({ kind: 'text', text: '' });
  });
});
