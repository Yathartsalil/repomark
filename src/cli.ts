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
