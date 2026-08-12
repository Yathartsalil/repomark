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
