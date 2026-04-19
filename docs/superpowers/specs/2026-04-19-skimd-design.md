# skimd — Design Spec

**Status:** approved, pre-implementation
**Date:** 2026-04-19
**Companion:** `docs/2026-04-19-skimd.md` (original concept doc — this spec supersedes it where they disagree)
**Owner:** bjern@valors.io

---

## 1. Product

A cross-platform terminal markdown reader. `npx skimd README.md` opens a properly rendered, keyboard-navigable view. Zero install, no config, sensible defaults.

**Pitch (one line):** *The README reader `glow` should have been — zero install, TOC, collapse, one command.*

**Four things skimd does that existing tools don't:**
1. Zero-install via `npx`, cross-platform.
2. Collapsible headings with AST-derived section summaries: `▸ Installation (3 paragraphs, 1 code block)`.
3. TOC sidebar that mirrors collapse state.
4. Dev-native affordances: link picker (`gl`), code-block picker with yank (`gc` + `y`), code-only view (`c`), `--code` CLI escape hatch, stdin pipe support.

**Audience, ranked:**
1. Personal — the author, on any machine.
2. JS/TS devs reaching for `npx` on an unfamiliar project.
3. OSS users comparing against `glow` / `mdcat`.

**Explicit non-goals for v0.1.0:**
- Themes, config files, any user-facing customization.
- Reading-position or collapse-state persistence across runs.
- Remote URL fetching (`curl -s url | skimd` is the answer).
- Inline images.
- Bookmarks within a doc.
- Editing (read-only).
- Mouse-driven navigation (text selection works because mouse tracking is off — see §7).

**Version strategy:** v0.1.0 contains everything in this spec. No pre-committed future versions. Features above fall into future work only if raised explicitly later.

---

## 2. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20+ LTS | Top-level await, native fetch, broad availability |
| Language | TypeScript 5.x, strict | Standard |
| TUI | [Ink](https://github.com/vadimdemedes/ink) | React-for-CLIs; proven (Claude Code, Copilot CLI, Gemini CLI) |
| Markdown parser | [marked](https://github.com/markedjs/marked) | Fast, clean AST, easy walk |
| Syntax highlighting | [cli-highlight](https://github.com/felixfbecker/cli-highlight) | Based on highlight.js; ~400KB bundled. `shiki` was rejected — multi-MB kills npx cold-start |
| Clipboard | [clipboardy](https://github.com/sindresorhus/clipboardy) | Maintained, cross-platform (Windows/mac/Linux/WSL) |
| Browser opener | [open](https://github.com/sindresorhus/open) | Cross-platform link opening |
| CLI args | [meow](https://github.com/sindresorhus/meow) | Minimal |
| Bundler | [tsup](https://tsup.egoist.dev/) | Single ESM bundle, shebang, fast cold-start |
| Tests | [Vitest](https://vitest.dev/) + [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library) | Standard |

**Distribution shape (`package.json`):**

```json
{
  "name": "skimd",
  "type": "module",
  "bin": { "skimd": "./dist/cli.js" },
  "engines": { "node": ">=20" }
}
```

No native addons (would break bundling + cross-platform). Target bundle < 1MB.

---

## 3. Architecture

### 3.1 Directory layout

```
src/
  cli.ts                   # entry: args, stdin/TTY detect, file resolution, non-TTY fallback
  app.tsx                  # root Ink component; owns shared state via useReducer + context
  state/
    store.ts               # reducer, action types, AppState
    context.tsx            # context provider + useAppState hook
  components/
    Reader.tsx             # main viewport; slices Line[] by scroll + collapse
    StatusBar.tsx          # bottom line: filename + mode-specific hints
    overlays/
      TOC.tsx              # tree sidebar; Space collapse, Enter jump
      LinkPicker.tsx       # gl
      CodePicker.tsx       # gc
      FilePicker.tsx       # no-args default
      SearchBar.tsx        # live incremental
      Help.tsx             # ?
    markdown/              # per-node renderers (Heading, List, CodeBlock, Table, …)
  markdown/
    parse.ts               # marked → AST (cached)
    render.ts              # AST → { lines, links, codeBlocks, anchors }  (PURE)
    html.ts                # <details>, <img>, <a>, <sub>, <sup>; strip rest
    toc.ts                 # AST → heading tree + summary stats per subtree
    search.ts              # Line[] → Match[] for live search
    extractCode.ts         # AST → code blocks (drives gc picker + --code flag)
  hooks/
    useKeybindings.ts      # central key dispatch; consults current mode
    useTerminalSize.ts
    useScrollAnchor.ts     # computes "current heading" from scroll offset
  util/
    terminal.ts            # capability detection (color depth, unicode, width)
    openBrowser.ts         # wraps `open`
    clipboard.ts           # wraps clipboardy
    plainRender.ts         # non-TTY fallback renderer
test/
  fixtures/                # small .md files with expected outputs
  *.test.ts
```

### 3.2 Data flow

1. **`cli.ts`** resolves input source:
   - Explicit path arg, OR
   - `-` (or piped stdin) → read `process.stdin` as markdown, OR
   - No args + TTY → show file picker in CWD, OR
   - No args + non-TTY → print usage to stderr, exit 2.
2. **`parse.ts`** runs `marked` → AST. Cached for the session.
3. **`render.ts`** (pure) walks AST → `{ lines: Line[], links: Link[], codeBlocks: CodeBlock[], anchors: Map<headingId, lineIndex> }`. No React, no Ink — just data.
4. **`toc.ts`** builds heading tree; annotates each heading with subtree summary stats (paragraph count, code-block count, list count, table count).
5. **`Reader`** slices `lines` by `scrollOffset` + `viewportHeight`, then filters out lines whose `headingPath` intersects `collapsed`. Injects summary line per collapsed root.
6. **Search** builds a flat-text index from `lines` on query change; produces `Match[]` with line offsets for highlighting.

### 3.3 State model

Single reducer in `store.ts`. Components read via context; changes dispatch actions.

```ts
type Mode =
  | 'reader'
  | 'toc'
  | 'search'
  | 'linkPicker'
  | 'codePicker'
  | 'filePicker'
  | 'help'
  | 'codeOnly';

type AppState = {
  source: {
    path: string | null;          // null when from stdin
    content: string;
    ast: MarkedAST;
    lines: Line[];
    links: Link[];
    codeBlocks: CodeBlock[];
    anchors: Map<string, number>;
    toc: TOCNode[];
  };
  viewport: { scrollOffset: number; width: number; height: number };
  mode: Mode;
  collapsed: Set<string>;          // heading ids
  search: { query: string; matches: Match[]; activeIndex: number } | null;
  mouseTracking: boolean;          // default false
};
```

### 3.4 Pipeline invariants

- **Render pipeline is pure.** `ast → { lines, … }` is a function. 100% test coverage target.
- **Keybindings are centralized** in `useKeybindings.ts`. Never scatter `useInput` across components. Dispatch consults `mode`.
- **UI components consume** pre-rendered `Line` fragments. They do not parse markdown.
- **One mode is active at a time.** Mode transition is the only way overlays appear/disappear.
- **AST is parsed once per session**, then treated as immutable.

### 3.5 The `Line` type

```ts
type Line = {
  kind: 'paragraph' | 'heading' | 'code' | 'list' | 'quote' | 'table' | 'hr' | 'blank';
  headingPath: string[];     // stack of enclosing heading ids (for collapse filtering)
  text: RenderedFragment;    // ANSI-decorated text segments ready for Ink
  refs?: {
    headingId?: string;      // set when kind === 'heading'
    linkIndices?: number[];  // indices into source.links
    codeBlockId?: string;    // set when kind === 'code'
  };
};
```

A `Line` is one visual row *after* ANSI styling but *before* viewport slicing. `RenderedFragment` is an ordered list of `{ text: string; styles: StyleFlags }` segments ready for Ink `<Text>` children — concrete type defined in `src/markdown/render.ts`.

---

## 4. Rendering & aesthetic

### 4.1 Aesthetic: "Modern dev" (baked in for v0.1.0)

Truecolor palette when supported; 256-color fallback; 16-color fallback on legacy terminals. No theme system in v0.1.0.

**Capability detection:** `process.stdout.getColorDepth()` for color; `TERM` / `WT_SESSION` / `LANG` env sniffing for Unicode. No runtime probing — too fragile. `--no-color` always forces plain.

### 4.2 Element rules

| Element | Render rule |
|---|---|
| H1 | cyan bold, `━━━` underline sized to title length, 2 blank lines before, 1 after |
| H2 | magenta bold with `▎` left-bar prefix, 1 blank line before and after |
| H3 | green bold |
| H4–H6 | yellow bold, smaller visual hierarchy |
| Paragraph | default fg, reflow-wrapped to viewport width |
| Code block | boxed with `╭─ <lang>` / `│ …` / `╰─`; content syntax-highlighted via `cli-highlight`; long lines wrap inside the box |
| Inline code | yellow fg + subtle bg tint (inverse); fallback to plain yellow |
| Unordered list | cyan `•` bullet (ASCII fallback `-`); 2-space nesting |
| Ordered list | orange `1.` numerals; 2-space nesting |
| Blockquote | `▎` colored left bar, italic muted text; nested blockquotes stack bars |
| Link | blue underline + `[n]` superscript (n = index into `links` for `gl` picker) |
| Table | `┌─┬─┐`/`├─┼─┤`/`└─┴─┘` box-draw; wrap cell contents; fall back to `field: value` list if terminal < 60 cols |
| HR | full-width `─` dim |

**ASCII fallback map (low-cap terminals):** `▸`→`+`, `▾`→`-`, `▎`→`|`, `•`→`-`, `╭─╮│╰─╯`→`+-+|+-+`, `━`→`-`, `┌┬┐├┼┤└┴┘`→`+`s and `|`s.

### 4.3 HTML inside markdown

GitHub READMEs routinely embed HTML. skimd interprets a subset, strips the rest.

| HTML | Handling |
|---|---|
| `<details><summary>X</summary>Y</details>` | Native collapsible. Summary becomes a heading-like node; body is collapsible children. Shares collapse mechanics with markdown headings. |
| `<img alt="X" src="Y">` | Rendered as `[image: X]`; the URL is added to `links` and reachable via `gl`. |
| `<a href="Y">X</a>` | Rendered as markdown link. |
| `<sub>`, `<sup>` | Plain text inline. |
| `<picture>`, `<source>` | Unwrap — render the inner `<img>`. |
| Everything else | Strip tag, keep text content. |

`--strict` flag strips all HTML, including subset above. Escape hatch for purists.

### 4.4 Collapse mechanics

- State: `collapsed: Set<headingId>`.
- Each `Line` carries `headingPath: headingId[]` (stack of enclosing heading ids).
- Reader filters `lines` where any element in `headingPath` is in `collapsed`.
- In place of each collapsed subtree root, inject one **summary line**:

  `▸ <Title> (<n> paragraphs, <m> code blocks, <k> lists, <j> tables)`

  Zero-counts omitted. Summary stats computed once per heading in `toc.ts` and memoized.
- Expanded heading: prefix with `▾`, body flows normally.
- When a parent is collapsed, children are hidden regardless of their own state.
- `Space` in TOC toggles collapse; `Enter` in TOC jumps to heading and closes TOC.

### 4.5 Narrow-terminal adaptations

| Terminal width | Effect |
|---|---|
| ≥ 80 cols | TOC available (`t` toggle); tables boxed; full layout |
| 60–79 cols | TOC hidden by default (can still toggle); tables boxed; full layout otherwise |
| < 60 cols | TOC disabled; tables fall back to `field: value` list |

---

## 5. Modes & keybindings

Centralized in `useKeybindings.ts`. Dispatch consults `state.mode`.

| Mode | Keys |
|---|---|
| **Reader** | `j`/`↓` scroll, `k`/`↑` scroll, `d`/`PgDn` half-page, `u`/`PgUp` half-page, `g` top, `G` bottom, `]]` next heading, `[[` prev heading, `n`/`N` next/prev match (only active when `state.search != null`), `t` TOC, `/` search, `gl` link picker, `gc` code picker, `c` code-only, `M` mouse toggle, `?` help, `q`/`Ctrl+C` quit |
| **TOC** | `↑`/`k`, `↓`/`j` navigate; `Space` toggle collapse; `Enter` jump + close TOC; `t`/`Esc` close TOC; `q` quit |
| **Search** | type to build query (live incremental); `Enter` commit + return to reader with `n`/`N` cycling; `Esc` cancel + restore scroll |
| **LinkPicker** | `↑`/`↓` navigate; `Enter` open in browser (via `open`); `Esc` cancel |
| **CodePicker** | `↑`/`↓` navigate; `Enter` scroll to that block in main view + return to reader; `y` yank (clipboardy); `Esc` cancel |
| **FilePicker** | `↑`/`↓` navigate; `Enter` open selected file; `Esc` exit skimd |
| **CodeOnly** | same scroll keys as reader; `c` toggles back; `gc`/`y`/`?` still work; `gl` disabled (no prose → no useful links) |
| **Help** | any key / `Esc` / `q` closes |

**Key semantics:**
- `q` always quits (from any mode).
- `Ctrl+C` always quits.
- `Esc` is context-sensitive: closes active overlay; in reader it's a noop (avoid accidental exits).
- Status bar always shows mode-relevant hints.
- Mouse tracking is OFF by default so native terminal drag-to-select works. `M` toggles ON for users who want scroll-wheel-in-app (at the cost of drag-to-select).

---

## 6. CLI surface

```
skimd [options] [file]

  file              markdown file path; use '-' to force stdin read
  (no path, TTY)    show file picker in CWD
  (stdin piped)     read stdin as markdown source

Options:
  --code[=<lang>]   print code blocks (optionally filtered by a single language) to stdout and exit
  --strict          strip all HTML (override default subset rendering)
  --no-color        plain structured output, no ANSI
  --width <n>       override detected terminal width
  -h, --help        show help and exit
  -v, --version     show version and exit
```

**File picker scope:** CWD only, non-recursive. Lists top-level `*.md` / `*.markdown` files and conventional uppercase docs (`README*`, `CONTRIBUTING*`, `CHANGELOG*`, `LICENSE*`, `CODE_OF_CONDUCT*`). `README.md` (if present) pre-selected so `Enter` opens it in one keystroke. Respects `.gitignore` when present; when absent, shows all matches without filtering.

**Non-TTY behavior (automatic):**
- `stdout` not a TTY → render plain structured text to stdout, exit 0. Preserves `skimd README.md | less` and `skimd README.md > out.txt`.
- Both piped: stdin = source, stdout = plain dump.

**Input edge cases:**
- File not found → stderr error, exit 1.
- Non-`.md` extension → warn, render anyway.
- Binary file (null bytes in first 8KB) → stderr "refusing to render binary file", exit 1.
- Huge file (>10MB) → render anyway with a one-time warning; no hard cap.
- Empty file → render empty doc; `?` works; `q` quits.
- Encoding: assume UTF-8; strip BOM if present; fall back to latin-1 on decode failure.

**Exit codes:** `0` success · `1` read/source error · `2` invalid CLI arguments.

---

## 7. Cross-platform, testing, distribution

### 7.1 Platform tiers

| Environment | Tier | Behavior |
|---|---|---|
| Windows Terminal + pwsh 7+ | First-class | Truecolor, Unicode drawing chars |
| macOS Terminal.app | First-class | Truecolor, Unicode |
| iTerm2 / WezTerm / Kitty | First-class | Truecolor, Unicode (inline images deferred) |
| Modern Linux emulators | First-class | Truecolor, Unicode |
| Legacy `cmd.exe` | Degraded | 16-color, ASCII fallback chars |
| Non-TTY (piped) | By design | Plain structured output |
| Narrow (<60 cols) | Auto-adapt | TOC disabled, tables → list |

Windows Terminal + pwsh is the **highest-risk environment**. v0.1.0 is not shippable without manual verification there.

### 7.2 Testing strategy

**Vitest from day one.**

- **100% coverage target** on pure pipeline: `render.ts`, `search.ts`, `toc.ts`, `extractCode.ts`, `html.ts`, `parse.ts`.
- **Fixture-based rendering tests:** `test/fixtures/*.md` → expected ANSI-stripped output. Covers every element from §4.2 and every HTML handler from §4.3.
- **Component tests** via `ink-testing-library` for overlays (TOC, pickers, SearchBar, Help).
- **Reducer / dispatch tests:** simulate keypress + mode → expected state change.
- **CI smoke matrix:** GitHub Actions on `ubuntu-latest`, `macos-latest`, `windows-latest`. Run skimd against its own README, ANSI-strip, assert expected headings present.
- **Manual gate before publish:** run the project's own README on Windows Terminal + pwsh, macOS Terminal, one Linux emulator.

### 7.3 Performance targets

- `npx skimd README.md` cold → first frame < **500ms** (realistic through npx overhead).
- Installed `skimd README.md` → first frame < **150ms**.
- Bundle size < **1MB**.
- Memory < **30MB** for typical README (< 100KB).
- AST parsed once per session, cached.
- Reader slices `Line[]` — never re-renders unaffected lines.

### 7.4 Distribution

- `tsup` → single ESM bundle at `dist/cli.js` with `#!/usr/bin/env node` shebang.
- `npm publish` as `skimd` once name is reserved.
- `npx skimd <file>` for zero-install; `npm i -g skimd` for persistent.
- No native addons.

### 7.5 Error handling

- CLI-layer errors → stderr + exit code.
- Parse errors (malformed markdown) → render what we have + one-line banner in status bar ("parse error near line N").
- Unhandled runtime errors → restore terminal state (Ink's exit handler) + stderr trace.

---

## 8. v0.1.0 scope checklist

Everything below must ship in v0.1.0.

**Core:**
- [ ] CLI arg parsing (`meow`), `--code`, `--strict`, `--no-color`, `--width`, `-h`, `-v`.
- [ ] File resolution (path arg / stdin / file picker / default).
- [ ] UTF-8 + BOM + latin-1-fallback decoding.
- [ ] Binary detection and rejection.
- [ ] Non-TTY fallback via `plainRender.ts`.

**Parsing / rendering pipeline (pure):**
- [ ] `parse.ts` wraps `marked` with session-level caching.
- [ ] `render.ts` produces `{ lines, links, codeBlocks, anchors }`.
- [ ] `toc.ts` produces heading tree with subtree summaries.
- [ ] `extractCode.ts` for `gc` picker and `--code` flag.
- [ ] `html.ts` for subset + `--strict`.
- [ ] `search.ts` flat-text index.
- [ ] All §4.2 elements rendering correctly at first-class and degraded tiers.

**UI:**
- [ ] `app.tsx` root with reducer + context.
- [ ] `Reader` with scroll + collapse-aware slicing.
- [ ] `StatusBar` with mode-sensitive hints.
- [ ] Overlays: `TOC`, `LinkPicker`, `CodePicker`, `FilePicker`, `SearchBar`, `Help`.
- [ ] `useKeybindings` dispatch with full mode table from §5.
- [ ] `useTerminalSize`, `useScrollAnchor`.
- [ ] Narrow-terminal adaptations from §4.5.

**Features:**
- [ ] Collapsible headings via TOC (`Space` toggle, summary line injection).
- [ ] TOC sidebar (`t`, mirrors collapse state).
- [ ] Live incremental search (`/` → `n`/`N`).
- [ ] Link picker (`gl`, `Enter` opens in browser).
- [ ] Code-block picker (`gc`, `Enter` scrolls to it, `y` yanks).
- [ ] Jump-by-heading (`]]`/`[[`).
- [ ] Code-only mode (`c` interactive + `--code` CLI).
- [ ] Mouse tracking toggle (`M`).

**Distribution:**
- [ ] `tsup` single-bundle build.
- [ ] `package.json` shape from §2.
- [ ] GitHub Actions CI: lint, test, smoke on ubuntu/mac/windows.
- [ ] Manual verification on Windows Terminal + pwsh.

**Testing:**
- [ ] 100% coverage on `src/markdown/*.ts`.
- [ ] Fixture tests covering all §4.2 elements.
- [ ] Component tests on overlays.
- [ ] Reducer tests covering full keybinding table.

---

## 9. Deferred (explicitly not in v0.1.0)

- Themes / palette customization (raise once v0.1.0 ships).
- Reading-position and collapse-state persistence.
- Remote URL fetching (`skimd https://…`).
- Inline images (iTerm2 / Kitty / WezTerm protocols).
- Bookmarks within a doc (`m a`, `' a`).
- Mouse-driven UI (tracking toggle stays, actual click-targets don't).
- Plugin / extension system.
- Config file (`~/.config/skimd/`).

---

## 10. Implementation notes for Claude

- Scaffold the directory tree in §3.1 with empty stubs in a single commit before adding behavior.
- Build in order: pure pipeline (parse → render → toc → search → extractCode → html) → reducer → Reader + scroll → overlays one at a time → features.
- Use Ink's `useInput` exclusively inside `useKeybindings.ts`. No `useInput` elsewhere.
- Treat the `Line` type as the contract between `render.ts` and all UI. Don't add new rendering paths that bypass it.
- Before declaring MVP done: run against this project's own README on Windows Terminal + pwsh, macOS Terminal, one Linux emulator. Verify all §4.2 elements + §4.3 HTML handling + every key in §5.
- Keep this spec in sync with reality: if implementation reveals a flaw, update this doc and flag it.
