# skimd

Terminal markdown reader — zero install, TOC, collapse, one command.

## Install

```bash
npx skimd README.md
```

Or install globally:

```bash
npm install -g skimd
```

## Why

Reading a README from the terminal today means `cat` (raw), `less` (paged raw),
or a context switch out. `skimd` renders markdown properly — headings, lists,
code blocks with syntax highlighting, tables, blockquotes — and gives you
keyboard-driven navigation with TOC, collapsible headings, search, and link
and code-block pickers.

## Usage

Open a file:

```bash
skimd README.md
```

Pipe markdown in:

```bash
curl -s https://example.com/README.md | skimd
```

Extract code blocks:

```bash
skimd --code README.md              # all blocks
skimd --code --lang=bash README.md  # only bash
```

## Status

v0.1.0 — under active development.

## License

[MIT](LICENSE) © [Bjern Potgieter](https://github.com/Bjern)
