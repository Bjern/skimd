import { parse } from '../markdown/parse.js';
import { render } from '../markdown/render.js';
import { stripAnsi } from '../markdown/ansi.js';

export function plainRender(
  source: string,
  opts: { width: number; color: boolean; strict?: boolean }
): string {
  const out = render(parse(source), {
    width: opts.width,
    color: opts.color,
    strict: opts.strict ?? false,
  });
  const joined = out.lines.map(l => l.text).join('\n') + '\n';
  return opts.color ? joined : stripAnsi(joined);
}
