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
