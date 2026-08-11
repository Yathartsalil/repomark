# repomark

<p align="center">
  <strong>Turn an entire Git repository into clean, LLM-ready Markdown.</strong>
</p>

<p align="center">
  Recursively scan a codebase, respect <code>.gitignore</code>, filter irrelevant files, and package the repository into a single structured Markdown document for AI assistants and code analysis.
</p>

<p align="center">

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![CI](https://github.com/Yatharthsalil/repomark/actions/workflows/ci.yml/badge.svg)](https://github.com/Yatharthsalil/repomark/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</p>

---

## What is repomark?

`repomark` is an open-source command-line tool that converts a local software repository into a **single Markdown file optimized for LLM context**.

Instead of manually uploading dozens of source files to an AI assistant, you can run:

```bash
repomark
```

and get:

```text
repomark-output.md
```

containing the repository structure and source code in a predictable format.

Conceptually:

```text
                    Git Repository
                         │
                         ▼
                ┌─────────────────┐
                │    repomark     │
                └────────┬────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
         .gitignore   Binary      Size limits
          filtering   filtering     & ignores
             │           │           │
             └───────────┼───────────┘
                         ▼
                  Repository Tree
                         │
                         ▼
                   Source Files
                         │
                         ▼
              ┌─────────────────────┐
              │  repomark-output.md │
              └─────────────────────┘
                         │
                         ▼
                  LLM / AI Assistant
```

---

## Why repomark?

Large repositories contain many files that are not useful to an LLM:

* `node_modules`
* `.git`
* build output
* binary files
* lockfiles
* generated assets
* temporary files
* large files
* files excluded by `.gitignore`

`repomark` automatically filters these files and produces a compact representation of the actual project.

This makes it useful for:

* AI-assisted development
* Code reviews
* Debugging
* Repository documentation
* Architecture analysis
* Refactoring
* Security reviews
* Reverse engineering
* Sharing projects with LLMs
* Creating reproducible repository snapshots

---

# Features

* 🚀 Fast TypeScript/Node.js CLI
* 📁 Recursive repository traversal
* 🚫 Automatic `.gitignore` support
* 🧹 Built-in ignore rules
* 🔍 Binary file detection
* 📦 Lockfile filtering
* 📏 Configurable maximum file size
* 🌳 ASCII directory tree generation
* 📝 Markdown source-code packaging
* 🎯 Custom ignore patterns
* 🔢 Estimated token count
* 🌲 Tree-only mode
* 📤 File output or stdout
* 🧪 Comprehensive unit tests
* ⚡ Fast `tsup` production builds
* 🔧 ESM-native Node.js project
* 🤖 Designed specifically for LLM context

---

# Installation

## Global installation

Clone the repository and install it:

```bash
git clone https://github.com/Yatharthsalil/repomark.git
cd repomark

npm install
npm run build
npm install -g .
```

Verify:

```bash
repomark --help
```

---

## Using npx

Once published to npm:

```bash
npx repomark
```

This allows you to run `repomark` without installing it globally.

---

# Usage

The simplest usage is:

```bash
repomark
```

This scans the current directory and creates:

```text
repomark-output.md
```

You can also specify another directory:

```bash
repomark ./my-project
```

---

# Example

Suppose your repository looks like this:

```text
my-project/
├── src/
│   ├── cli.ts
│   ├── parser.ts
│   └── utils.ts
├── test/
│   └── parser.test.ts
├── package.json
├── README.md
├── .gitignore
└── node_modules/
```

`repomark` automatically ignores `node_modules` and produces a Markdown document similar to:

````markdown
# Repository Tree

my-project/
├── src/
│   ├── cli.ts
│   ├── parser.ts
│   └── utils.ts
├── test/
│   └── parser.test.ts
├── package.json
├── README.md
└── .gitignore

# Files

## src/cli.ts

```typescript
import { Command } from "commander";

const program = new Command();

program
  .name("repomark")
  .description("Pack a repository into LLM-ready Markdown");

program.parse();
````

## src/parser.ts

```typescript
export function parseRepository() {
  // ...
}
```

````

This format gives an LLM both:

1. **The structure of the repository**
2. **The contents of the relevant source files**

---

# CLI Reference

| Option | Description | Default |
|---|---|---|
| `[dir]` | Repository directory to scan | `.` |
| `-o, --output <file>` | Output Markdown file | `repomark-output.md` |
| `--stdout` | Print output to stdout | `false` |
| `-i, --ignore <patterns...>` | Additional ignore patterns | None |
| `-m, --max-size <kb>` | Maximum file size in KB | `500` |
| `--token-count` | Display estimated token count | `false` |
| `--tree-only` | Generate only the directory tree | `false` |
| `-h, --help` | Display help | — |

---

# Examples

## Pack the current repository

```bash
repomark
````

---

## Pack another project

```bash
repomark ~/Projects/my-project
```

---

## Custom output file

```bash
repomark . --output context.md
```

or:

```bash
repomark . -o context.md
```

---

## Print directly to the terminal

```bash
repomark . --stdout
```

You can also redirect it:

```bash
repomark . --stdout > context.md
```

---

## Additional ignore patterns

```bash
repomark . --ignore "*.log" "tmp/**" "secrets/**"
```

This adds custom patterns on top of the repository's `.gitignore`.

---

## Limit file size

Skip files larger than 100 KB:

```bash
repomark . --max-size 100
```

A value of `0` disables the size limit:

```bash
repomark . --max-size 0
```

---

## Estimate token count

```bash
repomark . --token-count
```

This provides an approximate token count for the generated Markdown.

Token counts are estimates rather than exact counts because different LLM tokenizers tokenize text differently.

---

## Generate only the repository tree

```bash
repomark . --tree-only
```

This is useful when you want to understand the architecture of a project without including its source code.

---

# How It Works

The processing pipeline is roughly:

```text
Input Directory
      │
      ▼
Discover Files
      │
      ▼
Read .gitignore
      │
      ▼
Apply Default Ignores
      │
      ▼
Apply Custom Ignores
      │
      ▼
Check File Type
      │
      ├── Binary ──────► Skip
      │
      ├── Too Large ───► Skip
      │
      └── Text ────────► Include
                            │
                            ▼
                    Build Directory Tree
                            │
                            ▼
                     Read File Contents
                            │
                            ▼
                    Generate Markdown
                            │
                            ▼
                     Output / stdout
```

---

# Default Ignored Content

`repomark` ignores common files and directories that generally provide little value in an LLM context.

Examples include:

```text
.git/
node_modules/
dist/
build/
.next/
```

Common lockfiles are also excluded.

The repository's own `.gitignore` is additionally respected.

---

# Project Structure

```text
repomark/
├── src/
│   ├── cli.ts
│   └── core.ts
│
├── test/
│   └── core.test.ts
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── LICENSE
└── .gitignore
```

---

# Development

Clone the repository:

```bash
git clone https://github.com/yourname/repomark.git
cd repomark
```

Install dependencies:

```bash
npm install
```

---

## Run tests

```bash
npm test
```

The project uses Vitest.

The test suite covers:

* Repository traversal
* `.gitignore` handling
* Default ignored directories
* Custom ignore patterns
* Binary file detection
* File-size filtering
* Directory tree generation
* Markdown formatting
* Tree-only mode

---

## Build

```bash
npm run build
```

The production bundle is generated in:

```text
dist/
└── cli.js
```

Type declarations are generated alongside the bundle.

---

## Run the development build

After building:

```bash
node dist/cli.js .
```

---

# Technology Stack

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| TypeScript     | Type-safe implementation        |
| Node.js        | Runtime                         |
| Commander.js   | CLI argument parsing            |
| `ignore`       | `.gitignore` and glob filtering |
| tsup           | Production bundling             |
| Vitest         | Unit testing                    |
| ESM            | Modern JavaScript module system |
| GitHub Actions | Continuous integration          |

---

# Design Goals

`repomark` is intentionally designed around a few principles.

### 1. LLM-friendly output

The output should be easy for an AI model to understand.

The repository tree establishes context before the source code is presented.

### 2. Minimal noise

Generated files, dependencies, binaries, and other irrelevant content should not consume context.

### 3. Predictable formatting

Every included file follows the same structure:

````markdown
## path/to/file.ts

```typescript
...source code...
````

````

This makes the output deterministic and easy to process.

### 4. Safe defaults

Large files and common generated directories are excluded automatically.

### 5. Unix-friendly CLI

The tool can write to a file or stdout, making it easy to integrate with shell scripts and other developer tooling.

---

# CI

GitHub Actions automatically runs the test suite and production build.

The workflow runs on:

- Pushes
- Pull requests

The CI pipeline verifies that:

```text
Tests
  ↓
Build
  ↓
Success
````

---

# Contributing

Contributions are welcome.

A typical development workflow is:

```bash
git checkout -b feature/my-feature

npm install
npm test
npm run build

git commit -m "feat: add my feature"
git push
```

Then open a pull request.

Please make sure all tests pass before submitting a pull request.

---

# License

MIT License.

See [LICENSE](LICENSE) for the complete license text.

---

# Roadmap

Potential future improvements include:

* Exact tokenizer-based token counting
* Multiple output formats
* `.repomarkignore` support
* Git-aware file selection
* Configurable default ignore rules
* File statistics
* Language statistics
* Parallel file processing
* Interactive configuration
* JSON output
* XML output for AI tooling
* Watch mode
* Configuration file support
* Integration with AI coding workflows

---

# Why the name?

**repomark** combines:

* **repo** — repository
* **mark** — Markdown

The name describes the core purpose:

> **Turn a repository into Markdown.**

---

## License

MIT © repomark contributors
