import React from 'react';
import { readFileSync, existsSync as fsExists } from 'node:fs';
import process from 'node:process';
import meow from 'meow';
import { render as inkRender } from 'ink';
import { plainRender } from './util/plainRender.js';
import { detectCapabilities } from './util/terminal.js';
import { extractCode } from './markdown/extractCode.js';
import { parse } from './markdown/parse.js';
import { render as renderMd } from './markdown/render.js';
import { buildToc } from './markdown/toc.js';
import { App } from './app.js';
import { discoverFiles } from './util/discoverFiles.js';
import type { AppState } from './state/store.js';

export type ResolveDeps = {
  readFile: (p: string) => Promise<string>;
  readStdin: () => Promise<string>;
  isStdinTty: boolean;
  pickFile: () => Promise<string>;
  existsSync: (p: string) => boolean;
  cwd: string;
};

export type ResolvedSource = { path: string | null; content: string };

export async function resolveSource(
  args: { path?: string },
  deps: ResolveDeps
): Promise<ResolvedSource> {
  if (args.path === '-') return { path: null, content: await deps.readStdin() };
  if (args.path) return { path: args.path, content: await deps.readFile(args.path) };
  if (!deps.isStdinTty) return { path: null, content: await deps.readStdin() };
  const picked = await deps.pickFile();
  return { path: picked, content: await deps.readFile(picked) };
}

function isBinary(buf: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /\x00/.test(buf.slice(0, 8192));
}

async function readStdinDefault(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '');
}

async function readFileDefault(p: string): Promise<string> {
  const raw = readFileSync(p, 'utf8');
  if (isBinary(raw)) {
    process.stderr.write(`skimd: refusing to render binary file: ${p}\n`);
    process.exit(1);
  }
  return raw.replace(/^\uFEFF/, '');
}

// When stdout is a pipe (not a TTY) on POSIX, `process.stdout.write` is async.
// Calling `process.exit` before the data is flushed drops the output silently —
// which looked like `npx skimd README.md` "doing nothing" when run through a
// pipe. Wait for the drain callback before exiting.
function writeAllAndExit(text: string, code: number): Promise<void> {
  return new Promise(resolve => {
    const ok = process.stdout.write(text, () => {
      process.exit(code);
      resolve();
    });
    // If write returned true, the callback still fires on the next tick; that's
    // fine. If it returned false, the callback fires once the buffer drains.
    void ok;
  });
}

export async function main(): Promise<void> {
  const cli = meow(
    `
    Usage
      $ skimd [options] [file]

    Options
      --code            print all code blocks to stdout and exit
      --lang <name>     when used with --code, filter to that language
      --strict          strip all HTML
      --no-color        plain structured output, no ANSI
      --width <n>       override detected terminal width
      -h, --help        show help and exit
      -v, --version     show version
    `,
    {
      importMeta: import.meta,
      flags: {
        code: { type: 'boolean', default: false },
        lang: { type: 'string' },
        strict: { type: 'boolean', default: false },
        color: { type: 'boolean', default: true },
        width: { type: 'number' },
      },
    }
  );

  const caps = detectCapabilities({
    env: process.env,
    stdout: {
      isTTY: process.stdout.isTTY,
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    },
    colorDepth: process.stdout.getColorDepth?.() ?? 1,
  });
  const width = cli.flags.width ?? caps.width;

  // Interactive TTY + no path + no stdin pipe → file picker mode.
  const noPathNoPipe = cli.input[0] === undefined && !!process.stdin.isTTY;
  const wantFilePicker = noPathNoPipe && caps.isTty && !cli.flags.code;

  if (wantFilePicker) {
    const files = discoverFiles(process.cwd());
    const emptySource: AppState['source'] = {
      path: null,
      content: '',
      ast: parse(''),
      lines: [],
      links: [],
      codeBlocks: [],
      anchors: new Map(),
      codeAnchors: new Map(),
      toc: [],
    };
    let currentInstance: ReturnType<typeof inkRender> | null = null;
    const onPickFile = (path: string): void => {
      try {
        const content = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
        const ast = parse(content);
        const r = renderMd(ast, {
          width,
          color: cli.flags.color && caps.color,
          strict: cli.flags.strict,
        });
        const toc = buildToc(ast);
        const newSource: AppState['source'] = {
          path,
          content,
          ast,
          lines: r.lines,
          links: r.links,
          codeBlocks: r.codeBlocks,
          anchors: r.anchors,
          codeAnchors: r.codeAnchors,
          toc,
        };
        currentInstance?.rerender(
          React.createElement(App, {
            init: {
              source: newSource,
              width,
              height: caps.height,
            },
          })
        );
      } catch (err) {
        process.stderr.write(`skimd: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    };
    currentInstance = inkRender(
      React.createElement(App, {
        init: {
          source: emptySource,
          width,
          height: caps.height,
          mode: 'filePicker',
          discoveryFiles: files,
        },
        onPickFile,
      })
    );
    await currentInstance.waitUntilExit();
    process.exit(0);
  }

  const source = await resolveSource(
    cli.input[0] !== undefined ? { path: cli.input[0] } : {},
    {
      readFile: readFileDefault,
      readStdin: readStdinDefault,
      isStdinTty: !!process.stdin.isTTY,
      pickFile: async () => 'README.md',
      existsSync: fsExists,
      cwd: process.cwd(),
    }
  );

  if (cli.flags.code) {
    const blocks = extractCode(parse(source.content), cli.flags.lang);
    await writeAllAndExit(blocks.map(b => b.code).join('\n\n') + '\n', 0);
    return;
  }

  if (!caps.isTty) {
    await writeAllAndExit(
      plainRender(source.content, {
        width,
        color: cli.flags.color && caps.color,
        strict: cli.flags.strict,
      }),
      0
    );
    return;
  }

  const ast = parse(source.content);
  const r = renderMd(ast, {
    width,
    color: cli.flags.color && caps.color,
    strict: cli.flags.strict,
  });
  const toc = buildToc(ast);

  const { waitUntilExit } = inkRender(
    React.createElement(App, {
      init: {
        source: {
          path: source.path,
          content: source.content,
          ast,
          lines: r.lines,
          links: r.links,
          codeBlocks: r.codeBlocks,
          anchors: r.anchors,
          codeAnchors: r.codeAnchors,
          toc,
        },
        width,
        height: caps.height,
      },
    })
  );
  await waitUntilExit();
  process.exit(0);
}

const entry = process.argv[1] ?? '';
const isDirectRun = import.meta.url === `file://${entry}` || import.meta.url.endsWith(entry.replace(/\\/g, '/'));
if (isDirectRun) {
  main().catch(err => {
    process.stderr.write(`skimd: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
