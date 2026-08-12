# repomark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/) [![CI](https://github.com/yourname/repomark/actions/workflows/ci.yml/badge.svg)](https://github.com/yourname/repomark/actions/workflows/ci.yml)

**repomark** recursively packs a local Git repository into clean Markdown designed for LLM context windows. It respects `.gitignore`, skips binary/build artifacts and oversized files, and preserves syntax-aware fenced code blocks.

## Preview

```text
.
├── src
│   ├── cli.ts
│   └── core.ts
├── package.json
└── README.md

## src/cli.ts

```typescript
...
```
```

## Installation

```bash
npm install -g repomark
repomark .
```

Or without installing:

```bash
npx repomark .
```

## Usage

```bash
repomark
repomark ./my-project -o context.md
repomark . --stdout
repomark . -i "docs/**" "*.generated.*"
repomark . --max-size 250
repomark . --token-count
repomark . --tree-only
```

## CLI flags

| Flag | Description | Default |
|---|---|---|
| `dir` | Repository directory | `.` |
| `-o, --output <file>` | Output Markdown path | `repomark-output.md` |
| `--stdout` | Write the packed Markdown to stdout | off |
| `-i, --ignore <patterns...>` | Additional ignore patterns | none |
| `-m, --max-size <kb>` | Skip files above this size | `500` KB |
| `--token-count` | Print estimated token count | off |
| `--tree-only` | Generate only the directory tree | off |
| `-h, --help` | Show help | — |

## Default exclusions

`.git`, `node_modules`, `dist`, `build`, `.next`, lockfiles, common binary formats, and files over the configured size limit are excluded. Repository `.gitignore` rules and custom `--ignore` patterns are also applied.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT.
