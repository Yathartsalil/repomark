```text
.
├── .github
│   └── workflows
│       └── ci.yml
├── .gitignore
├── LICENSE
├── package.json
├── README.md
├── src
│   ├── cli.ts
│   └── core.ts
├── test
│   └── core.test.ts
├── tsconfig.json
└── tsup.config.ts
```

## .github/workflows/ci.yml

```yaml
name: CI
on:
  push:
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## .gitignore

```
node_modules/
dist/
coverage/
*.log
.DS_Store
.env
.env.*
repomark-output.md
.vscode/
.idea/
```

## LICENSE

```
MIT License

Copyright (c) 2026 repomark contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## package.json

```json
{
  "name": "repomark",
  "version": "1.0.0",
  "description": "Pack a Git repository into clean Markdown for LLM context windows.",
  "type": "module",
  "bin": { "repomark": "./dist/cli.js" },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "scripts": { "build": "tsup", "test": "vitest run", "test:watch": "vitest", "prepublishOnly": "npm test && npm run build" },
  "keywords": ["cli", "git", "markdown", "llm", "ai", "repository"],
  "license": "MIT",
  "repository": { "type": "git", "url": "https://github.com/yourname/repomark.git" },
  "bugs": { "url": "https://github.com/yourname/repomark/issues" },
  "homepage": "https://github.com/yourname/repomark",
  "dependencies": { "commander": "^14.0.0", "ignore": "^7.0.5" },
  "devDependencies": { "@types/node": "^24.0.0", "tsup": "^8.5.0", "typescript": "^5.9.0", "vitest": "^3.2.4" }
}
```

## README.md

```markdown
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
```

## src/cli.ts

```typescript
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { packRepository } from './core.js';

const program = new Command();
program.name('repomark').description('Pack a Git repository into clean Markdown for LLM context windows.').version('1.0.0')
  .argument('[dir]', 'repository directory', '.')
  .option('-o, --output <file>', 'output Markdown file', 'repomark-output.md')
  .option('--stdout', 'write Markdown to stdout')
  .option('-i, --ignore <patterns...>', 'additional ignore glob patterns')
  .option('-m, --max-size <kb>', 'skip files larger than this size in KB', '500')
  .option('--token-count', 'print estimated token count')
  .option('--tree-only', 'only generate the directory tree');

program.action(async (dir: string, opts) => {
  try {
    const result = await packRepository({ root: path.resolve(dir), ignorePatterns: opts.ignore, maxSizeKb: Number(opts.maxSize), treeOnly: Boolean(opts.treeOnly) });
    if (!Number.isFinite(Number(opts.maxSize)) || Number(opts.maxSize) < 0) throw new Error('--max-size must be a non-negative number');
    if (opts.stdout) process.stdout.write(result.markdown); else await fs.writeFile(path.resolve(opts.output), result.markdown, 'utf8');
    if (opts.tokenCount) process.stderr.write(`Estimated tokens: ${result.estimatedTokens}\n`);
  } catch (error) { console.error(`repomark: ${(error as Error).message}`); process.exitCode = 1; }
});
program.parseAsync().catch(() => { process.exitCode = 1; });
```

## src/core.ts

```typescript
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';

export interface PackOptions { root: string; ignorePatterns?: string[]; maxSizeKb?: number; treeOnly?: boolean; }
export interface FileEntry { relativePath: string; absolutePath: string; }

export const DEFAULT_IGNORES = [
  '.git', 'node_modules', 'dist', 'build', '.next', 'coverage',
  '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'composer.lock', 'Gemfile.lock', 'Cargo.lock', 'poetry.lock'
];

const BINARY_EXTENSIONS = new Set(['.png','.jpg','.jpeg','.gif','.webp','.ico','.bmp','.tiff','.avif','.pdf','.zip','.gz','.tar','.7z','.rar','.mp3','.wav','.ogg','.mp4','.mov','.avi','.mkv','.exe','.dll','.so','.dylib','.class','.jar','.woff','.woff2','.ttf','.otf','.eot','.bin','.db','.sqlite','.sqlite3']);

async function loadGitignore(root: string): Promise<Ignore> {
  const filter = ignore();
  filter.add(DEFAULT_IGNORES);
  try { filter.add(await fs.readFile(path.join(root, '.gitignore'), 'utf8')); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  return filter;
}

export async function collectFiles(options: PackOptions): Promise<FileEntry[]> {
  const root = path.resolve(options.root);
  const filter = await loadGitignore(root);
  filter.add(options.ignorePatterns ?? []);
const maxBytes =
  options.maxSizeKb && options.maxSizeKb > 0
    ? options.maxSizeKb * 1024
    : Infinity;
  const files: FileEntry[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a,b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (!rel || filter.ignores(rel + (entry.isDirectory() ? '/' : ''))) continue;
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile()) {
        const stat = await fs.stat(abs);
        if (stat.size <= maxBytes && !BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && !(await isBinary(abs))) files.push({ relativePath: rel, absolutePath: abs });
      }
    }
  }
  await walk(root);
  return files;
}

export async function isBinary(file: string): Promise<boolean> {
  const buffer = await fs.readFile(file);
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (sample.includes(0)) return true;
  let suspicious = 0;
  for (const byte of sample) if (byte < 7 || (byte > 14 && byte < 32)) suspicious++;
  return sample.length > 0 && suspicious / sample.length > 0.1;
}

function languageFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string,string> = { '.ts':'typescript','.tsx':'tsx','.js':'javascript','.jsx':'jsx','.mjs':'javascript','.cjs':'javascript','.json':'json','.md':'markdown','.css':'css','.scss':'scss','.html':'html','.vue':'vue','.svelte':'svelte','.py':'python','.rb':'ruby','.go':'go','.rs':'rust','.java':'java','.c':'c','.h':'c','.cpp':'cpp','.hpp':'cpp','.cs':'csharp','.php':'php','.sh':'bash','.bash':'bash','.yml':'yaml','.yaml':'yaml','.toml':'toml','.sql':'sql','.xml':'xml' };
  return map[ext] ?? '';
}

export function buildTree(files: FileEntry[]): string {
  const tree: any = {};
  for (const file of files) {
    let node = tree;
    const parts = file.relativePath.split('/');
    parts.forEach((part, i) => { if (i === parts.length - 1) node[part] = null; else node = node[part] ??= {}; });
  }
  const lines: string[] = ['```text', '.'];
  const render = (node: any, prefix: string) => {
    const keys = Object.keys(node).sort((a,b) => a.localeCompare(b));
    keys.forEach((key, index) => { const last = index === keys.length - 1; lines.push(`${prefix}${last ? '└── ' : '├── '}${key}`); if (node[key]) render(node[key], prefix + (last ? '    ' : '│   ')); });
  };
  render(tree, ''); lines.push('```');
  return lines.join('\n');
}

export async function packRepository(options: PackOptions): Promise<{ markdown: string; files: FileEntry[]; estimatedTokens: number }> {
  const files = await collectFiles(options);
  const sections = [buildTree(files)];
  if (!options.treeOnly) {
    for (const file of files) {
      const content = await fs.readFile(file.absolutePath, 'utf8');
      sections.push(`## ${file.relativePath}\n\n\`\`\`${languageFor(file.relativePath)}\n${content.replace(/\n?$/, '\n')}\`\`\``);
    }
  }
  const markdown = sections.join('\n\n');
  return { markdown: markdown + '\n', files, estimatedTokens: estimateTokens(markdown) };
}

export function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }
```

## test/core.test.ts

```typescript
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectFiles, buildTree, packRepository } from '../src/core.js';

async function fixture() { const root = await mkdtemp(path.join(tmpdir(), 'repomark-')); await mkdir(path.join(root,'src')); await mkdir(path.join(root,'node_modules')); await writeFile(path.join(root,'.gitignore'),'secret.txt\nignored-dir/\n'); await writeFile(path.join(root,'src','app.ts'),'export const x = 1;\n'); await writeFile(path.join(root,'secret.txt'),'nope'); await writeFile(path.join(root,'image.png'),Buffer.from([137,80,78,71])); await writeFile(path.join(root,'node_modules','x.js'),'nope'); return root; }

describe('repository traversal', () => {
  it('respects gitignore and defaults', async () => { const root = await fixture(); const files = await collectFiles({root}); expect(files.map(f=>f.relativePath)).toEqual(['.gitignore','src/app.ts']); });
  it('filters binary files', async () => { const root = await fixture(); const files = await collectFiles({root}); expect(files.some(f=>f.relativePath === 'image.png')).toBe(false); });
  it('supports custom ignores and size limit', async () => { const root = await fixture(); const files = await collectFiles({root, ignorePatterns:['src'], maxSizeKb:0}); expect(files.map(f=>f.relativePath)).toEqual(['.gitignore']); });
});

describe('markdown formatting', () => {
  it('renders an ASCII tree', async () => { const root = await fixture(); const files = await collectFiles({root}); const tree = buildTree(files); expect(tree).toContain('src'); expect(tree).toContain('└── app.ts'); });
  it('packs tree and fenced source', async () => { const root = await fixture(); const result = await packRepository({root}); expect(result.markdown).toContain('## src/app.ts'); expect(result.markdown).toContain('```typescript'); expect(result.estimatedTokens).toBeGreaterThan(0); });
  it('supports tree-only mode', async () => { const root = await fixture(); const result = await packRepository({root, treeOnly:true}); expect(result.markdown).not.toContain('## src/app.ts'); });
});
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "esModuleInterop": true, "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true, "declaration": true, "declarationMap": true,
    "outDir": "dist", "types": ["node", "vitest/globals"]
  },
  "include": ["src", "test"]
}
```

## tsup.config.ts

```typescript
import { defineConfig } from 'tsup';
export default defineConfig({ entry: ['src/cli.ts'], format: ['esm'], target: 'node20', dts: true, clean: true, sourcemap: true, banner: { js: '#!/usr/bin/env node' }, splitting: false });
```
