---
title: "tokensave: the semantic knowledge graph that transforms Claude Code"
date: 2026-05-27T09:00:00.000Z
description: "tokensave is a Rust-written MCP server that builds a local knowledge graph of your codebase. Instead of Explore agents scanning files with grep and glob, Claude Code queries the graph — fewer calls, fewer tokens, better context."
pillar: automatizzare
category: developer-tools
tags: [Claude Code, MCP, Rust, Developer Tools, AI]
lang: en
draft: true
---

When working on a large project with Claude Code, you eventually notice a pattern: the model spawns Explore agents that roam the codebase with `grep` and `glob` looking for symbols, dependencies, and related files. It works, but it's slow and expensive. Every scan burns tokens, every agent opens files that may not even be relevant.

**tokensave** solves this at the root: it builds a semantic knowledge graph of your codebase, keeps it updated locally, and exposes it to Claude Code via MCP tools. The model stops exploring and starts querying.

## How it works

tokensave is an MCP server written in Rust. On startup it indexes the project and produces a graph of semantic dependencies: functions, classes, types, imports, call graph. The graph is persisted locally in `.tokensave/` — no network calls, no data leaving your machine.

When Claude Code needs to find where a function is used, instead of opening every file with `grep`, it calls `tokensave_callers`. Instead of exploring the entire `src/` directory, it calls `tokensave_context` with the current task. Same result, but with a single MCP call instead of dozens of file reads.

The project claims an average savings of 60 to 90% of tokens on typical development operations.

## Installation

### Linux (x86_64)

```bash
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v1.4.2/tokensave-v1.4.2-x86_64-linux.tar.gz
tar xzf tokensave-v1.4.2-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
```

For ARM64, replace `x86_64` with `aarch64`.

### macOS

```bash
brew install aovestdipaperino/tap/tokensave
```

### Windows

```bash
scoop bucket add tokensave https://github.com/aovestdipaperino/scoop-aovestdipaperino
scoop install tokensave
```

### From source (any platform)

```bash
cargo install tokensave
```

After installing, verify everything works:

```bash
tokensave --version
tokensave doctor
```

`doctor` checks the binary, local database, user configuration, and Claude Code integration. If something is off, it tells you exactly what to fix.

## Claude Code integration

The integration happens with a single command:

```bash
tokensave install
```

This writes to `~/.claude/settings.json`:
- The MCP server definition
- A `PreToolUse` hook that intercepts and blocks Explore agents
- Permissions for all MCP tools
- Rules in `~/.claude/CLAUDE.md` to prefer tokensave tools over direct file reads

The command is idempotent — running it multiple times is safe. Restart Claude Code afterward: configuration is read only at startup.

## Per-project initialization

```bash
cd /path/to/your/project
tokensave init
```

Creates `.tokensave/` with the initial knowledge graph. On small projects it takes seconds; on larger codebases it may take a minute or two.

To force a full re-index:

```bash
tokensave sync --force
```

## Keeping the graph up to date

Three options, in order of convenience:

**Daemon** — the most convenient. Watches files in background and syncs on every change:

```bash
tokensave daemon --enable-autostart
```

**Manual sync** — when you want full control:

```bash
tokensave sync
```

Incremental update: only re-indexes files changed since the last sync.

**Git hook** — alternative to the daemon, triggers on every commit:

```bash
git config --global core.hooksPath ~/.git-hooks
mkdir -p ~/.git-hooks
cp scripts/post-commit ~/.git-hooks/post-commit
chmod +x ~/.git-hooks/post-commit
```

The hook is a no-op in repos not initialized with tokensave — it won't interfere with other projects.

## Available MCP tools

These tools are used by Claude Code automatically, but you can also ask for them explicitly:

| Tool | Purpose |
|------|---------|
| `tokensave_search` | Find symbols by name (functions, classes, types) |
| `tokensave_context` | Relevant context for a specific task |
| `tokensave_callers` | Who calls a function |
| `tokensave_callees` | What a function calls |
| `tokensave_impact` | What breaks if you modify a symbol |
| `tokensave_node` | Details and source of a symbol |
| `tokensave_files` | List indexed files with filters |
| `tokensave_affected` | Test files impacted by changes |
| `tokensave_dead_code` | Unreachable symbols |
| `tokensave_diff_context` | Semantic context for modified files |
| `tokensave_module_api` | Public API of a file or directory |
| `tokensave_circular` | Circular dependencies between files |
| `tokensave_hotspots` | Most connected symbols (high regression risk) |
| `tokensave_similar` | Symbols with similar names (useful for refactoring) |
| `tokensave_rename_preview` | Preview impact of a rename |
| `tokensave_unused_imports` | Never-referenced imports |
| `tokensave_changelog` | Semantic diff between two git refs |
| `tokensave_status` | Index state and statistics |

You can also use some of these directly from the CLI:

```bash
tokensave query <symbol>                               # search the graph
tokensave affected src/main.rs                         # impacted tests
git diff --name-only HEAD~1 | tokensave affected --stdin  # from git diff
tokensave status --show-flags                          # statistics
```

## Operating modes

| Mode | Daemon | Branch tracking | Best for |
|------|--------|-----------------|----------|
| Manual | off | — | Full control |
| Auto-sync | on | off | Set and forget |
| Branch-aware | on | on | Multi-branch projects |

With **branch-aware** mode, each branch maintains its own index. Switching branches gives you a graph that reflects exactly the code you're looking at — no stale results from the previous branch.

## Supported languages

Rust, Go, Java, Scala, TypeScript, JavaScript, Python, C, C++, Kotlin, Dart, C#, Pascal, PHP, Ruby — 15 languages as of v1.4.2.

## Privacy

tokensave is **100% local**: your code never leaves your machine. It makes two optional network calls:

- **Global counter** — sends only the number of tokens saved (no code, no filenames) to an anonymous Cloudflare worker. Disable with `tokensave disable-upload-counter`.
- **Version check** — checks for new releases on GitHub. Has a 1-second timeout and fails silently.

## Quick troubleshooting

**"tokensave not initialized"** — the `.tokensave/` folder doesn't exist:
```bash
tokensave init
```

**MCP server not connected** — Claude Code can't see the tools:
1. Verify `~/.claude/settings.json` contains the MCP configuration
2. Fully restart Claude Code
3. Verify `tokensave` is in PATH: `which tokensave`
4. Re-run `tokensave install` if permissions are missing

**Symbols missing from the graph** — run `tokensave sync` and verify the language is supported and the file isn't excluded by `.gitignore`.

---

tokensave solves a real problem that emerges when working daily with Claude Code on non-trivial codebases. The approach — building a local semantic index instead of letting the model explore files every time — is conceptually simple but practically effective. If you already use Claude Code intensively, it's worth trying.

**Repository**: [github.com/aovestdipaperino/tokensave](https://github.com/aovestdipaperino/tokensave)
