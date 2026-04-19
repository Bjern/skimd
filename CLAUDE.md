# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-code. The only artifact today is the concept doc at `docs/2026-04-19-skimd.md` — it is the source of truth for scope, architecture, and tech choices. Read it before doing anything substantive. If a decision in this file conflicts with the concept doc, the concept doc wins and this file should be updated.

## What skimd is

A cross-platform terminal markdown reader — `npx skimd README.md` opens a properly rendered, keyboard-navigable view. Read-only, keyboard-first, zero-install via npx.

## Tech stack (locked in the concept doc)

- Node.js 20+ LTS, TypeScript 5.x strict, ESM
- TUI: **Ink** (React-for-CLIs)
- Markdown: **marked** (AST output)
- Syntax highlighting: **cli-highlight** (v0.2.0+)
- CLI args: **meow**
- Bundler: **tsup** (single-file ESM bundle with shebang → `dist/cli.js`)
- Tests: **Vitest**

Publishing shape (from concept doc):
```json
{ "name": "skimd", "type": "module", "bin": { "skimd": "./dist/cli.js" }, "engines": { "node": ">=20" } }
```

## Architecture

Pipeline is: raw markdown string → marked AST → pre-rendered Ink "lines" (with metadata: line index, link refs, headings) → viewport slice based on scroll offset.

Key invariants:
- **Markdown AST → render layer is pure and testable.** UI components receive pre-rendered nodes; they do not parse markdown themselves. Coverage priority: `markdown/render.ts` and `markdown/search.ts`.
- **Keybindings are centralized** in `hooks/useKeybindings.ts` using Ink's `useInput`. Do not scatter `useInput` across components.
- **Non-TTY fallback is a first-class path.** When `!process.stdout.isTTY`, dump plain rendered text and exit so `skimd README.md | less` and `> out.txt` work. This is not a nice-to-have; it is part of the MVP definition of done.
- AST is parsed once per session and cached.

Planned layout (see concept doc §Architecture for full tree): `src/cli.ts` entry, `src/app.tsx` root Ink component, `src/components/` (Reader, TOC, SearchBar, Help, StatusBar, and per-node `markdown/` renderers), `src/markdown/` (parse, render, toc, search), `src/hooks/`, `src/util/`.

## MVP scope discipline

v0.1.0 is deliberately narrow. Anything in this list is **out of scope** for MVP even if it feels like it belongs:
- Syntax highlighting in code blocks (v0.2.0)
- TOC sidebar, `/` search, Tab-cycle links, `Enter` to open browser (v0.2.0)
- Tables (v0.2.0)
- Multi-file discovery / `skimd .` (v0.3.0)
- Mouse, themes, config files, reading-position memory, remote URLs

Resist scope creep. When in doubt, defer to the version milestones in the concept doc.

## Commit cadence

Per the concept doc's development guidelines:
- Scaffold the directory tree first; commit empty stubs.
- Build MVP features in the order listed under v0.1.0 — each item is a separate commit.

## Cross-platform testing

Windows Terminal + PowerShell is the highest-risk environment. MVP is not done until it has been exercised there in addition to macOS Terminal and a Linux emulator. Legacy `cmd.exe` is explicitly a degraded target — Ink will skip what it cannot render and that is acceptable.

## Open questions

The concept doc §Open questions has six deferred decisions (image handling, HTML subset, wide tables, link focus, default file resolution, config location) each with a leaning. Treat the leaning as the default; flag to the user before diverging.
