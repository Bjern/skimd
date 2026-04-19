export type HtmlHandling = { strict: boolean };

export type InterpretedHtml =
  | { kind: 'collapsible'; summary: string; body: string }
  | { kind: 'image'; alt: string; href: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'text'; text: string };

function attr(raw: string, name: string): string {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i').exec(raw);
  return m?.[1] ?? '';
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '');
}

export function interpretHtml(html: string, opts: HtmlHandling): InterpretedHtml {
  if (opts.strict) return { kind: 'text', text: '' };

  const detailsMatch = /<details[^>]*>([\s\S]*?)<\/details>/i.exec(html);
  if (detailsMatch) {
    const inner = detailsMatch[1] ?? '';
    const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(inner);
    const summary = summaryMatch ? stripTags(summaryMatch[1] ?? '').trim() : '';
    const body = stripTags(inner.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, '')).trim();
    return { kind: 'collapsible', summary, body };
  }

  const pictureMatch = /<picture[^>]*>([\s\S]*?)<\/picture>/i.exec(html);
  if (pictureMatch) {
    return interpretHtml(pictureMatch[1] ?? '', opts);
  }

  const imgMatch = /<img\b([^>]*)\/?>/i.exec(html);
  if (imgMatch) {
    const a = imgMatch[1] ?? '';
    return { kind: 'image', alt: attr(a, 'alt'), href: attr(a, 'src') };
  }

  const aMatch = /<a\b([^>]*)>([\s\S]*?)<\/a>/i.exec(html);
  if (aMatch) {
    return { kind: 'link', href: attr(aMatch[1] ?? '', 'href'), text: stripTags(aMatch[2] ?? '') };
  }

  return { kind: 'text', text: stripTags(html) };
}
