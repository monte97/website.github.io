---
title: "RTK and tokensave: reducing token costs in AI coding"
seoTitle: "RTK + tokensave: cut AI coding tokens"
date: 2026-05-27T09:00:00.000Z
description: "Two orthogonal Rust tools: RTK compresses verbose CLI output, tokensave indexes the codebase into a local knowledge graph. Around -80% and -93% of tokens."
pillar: automatizzare
category: developer-tools
tags: [Claude Code, MCP, Rust, Developer Tools, AI, RTK, tokensave]
lang: en
reviewed: false
draft: false
---

In a steady-state AI coding workflow, most tokens are not consumed by prompts. Two structural sources operate silently: verbose CLI output that the model reads raw, and the codebase exploration that agents perform before every task.

Two open source tools, both written in Rust, attack these two problems orthogonally: **RTK** and **tokensave**. Installed together, they cover the two main sources of structural token waste.

## The problem: two invisible token sources

### Unfiltered CLI output

Every time Claude Code runs a shell command, the raw output enters the model's context. A standard `git push` produces around 200 tokens of boilerplate ("Enumerating objects", "Counting objects", "Delta compression..."). The model needs only the outcome: `ok main`. The other 190 tokens are noise that fills context without adding information.

### Codebase exploration before every task

Before every complex task, Claude Code spawns Explore agents that use `grep`, `glob`, and `Read` to navigate the project. On a medium-sized codebase, this means dozens of tool calls and thousands of tokens - just to find the relevant files.

The two problems have different natures and require different solutions.

## RTK: compressing CLI output

RTK is a CLI proxy that intercepts shell commands before their output reaches the model and applies four compression strategies:

- **Smart Filtering** - removes boilerplate, comments, whitespace
- **Grouping** - aggregates similar elements (files by directory, errors by type)
- **Truncation** - keeps relevant context, cuts redundancy
- **Deduplication** - collapses repeated log entries with a counter

Estimated savings for a 30-minute Claude Code session on a medium TypeScript/Rust project:

| Operation | Standard | RTK | Savings |
|---|---|---|---|
| `ls` / `tree` (10x) | 2,000 | 400 | -80% |
| `cat` / `read` (20x) | 40,000 | 12,000 | -70% |
| `grep` / `rg` (8x) | 16,000 | 3,200 | -80% |
| `git status` (10x) | 3,000 | 600 | -80% |
| `git diff` (5x) | 10,000 | 2,500 | -75% |
| `git add/commit/push` (8x) | 1,600 | 120 | -92% |
| `cargo test` / `npm test` (5x) | 25,000 | 2,500 | -90% |
| `pytest` (4x) | 8,000 | 800 | -90% |
| **Total** | **~118,000** | **~23,900** | **-80%** |

### Installing RTK

**Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**macOS**
```bash
brew install rtk
```

**Cargo**
```bash
cargo install --git https://github.com/rtk-ai/rtk
```

**Verify**
```bash
rtk --version
rtk gain
```

### Claude Code integration: a hook that rewrites commands

```bash
rtk init -g
# restart Claude Code
```

This installs a `PreToolUse` hook in `~/.claude/settings.json` that automatically rewrites Bash commands (`git status` → `rtk git status`) before execution. From that point on, RTK is active on every session without manual intervention.

Also supports other tools:

```bash
rtk init -g --gemini         # Gemini CLI
rtk init -g --codex          # Codex (OpenAI)
rtk init -g --agent cursor   # Cursor
rtk init --agent windsurf    # Windsurf
rtk init --agent cline       # Cline / Roo Code
```

> The hook intercepts only Bash tool calls. Claude Code's built-in tools (`Read`, `Grep`, `Glob`) don't go through the hook. For those flows, shell equivalents can be used (`cat`, `rg`, `find`) or `rtk read`, `rtk grep`, `rtk find` can be called explicitly.

### Main RTK commands

**Files**
```bash
rtk ls .                          # optimized directory tree
rtk read file.rs                  # smart read
rtk read file.rs -l aggressive    # signatures only (no body)
rtk grep "pattern" .              # grouped results
rtk diff file1 file2              # condensed diff
```

**Git**
```bash
rtk git status    # compact output
rtk git push      # "ok main"
rtk git commit    # "ok abc1234"
rtk git log -n 10 # one commit per line
```

**Tests and build**
```bash
rtk cargo test    # failures only (-90%)
rtk pytest        # failures only (-90%)
rtk jest          # failures only (-90%)
rtk cargo build
rtk tsc           # TypeScript errors grouped by file
```

### RTK savings monitoring

```bash
rtk gain                       # aggregate statistics
rtk gain --graph               # ASCII chart (last 30 days)
rtk gain --history             # recent command history
rtk gain --daily               # daily breakdown
rtk gain --all --format json   # JSON export
rtk discover                   # unused savings opportunities
```

### Advanced RTK configuration

`~/.config/rtk/config.toml`:

```toml
[hooks]
exclude_commands = ["curl", "playwright"]  # exclude from rewrite

[tee]
enabled = true       # save raw output on failure
mode = "failures"    # "failures" | "always" | "never"
```

When a command fails, RTK saves the full unfiltered output to `~/.local/share/rtk/tee/` so the model can read it without re-running the command.

Telemetry is disabled by default and requires explicit consent during `rtk init`.

---

## tokensave: codebase knowledge graph

tokensave is an MCP server that builds a semantic knowledge graph of the project using Tree-sitter, indexed locally. Instead of letting Claude Code spawn Explore agents that scan files with `grep` and `glob`, the model queries the precomputed graph.

The system operates on three layers:

| Layer | Function |
|---|---|
| **MCP server** | Exposes `tokensave_*` tools to Claude Code |
| **CLAUDE.md rules** | Instructs the model to prefer tokensave over direct reads |
| **PreToolUse hook** | Blocks Explore agents at the system level |

### Installing tokensave

**Linux (x86_64)**
```bash
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v6.1.1/tokensave-v6.1.1-x86_64-linux.tar.gz
tar xzf tokensave-v6.1.1-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
```

For ARM64, replace `x86_64` with `aarch64`.

**macOS**
```bash
brew install aovestdipaperino/tap/tokensave
```

**Windows**
```bash
scoop bucket add tokensave https://github.com/aovestdipaperino/scoop-bucket
scoop install tokensave
```

**Cargo**
```bash
cargo install tokensave
```

**Verify**
```bash
tokensave --version
tokensave doctor
```

`doctor` checks the binary, local database, configuration, and Claude Code integration. On anomalies, it reports instructions for resolution.

### Claude Code integration: a single command

```bash
tokensave install
# restart Claude Code
```

Writes to `~/.claude/settings.json`: the MCP server, the PreToolUse hook, permissions for MCP tools, rules in `~/.claude/CLAUDE.md`. The command is idempotent.

### Per-project initialization

```bash
cd /path/to/your/project
tokensave init
```

Creates `.tokensave/` with the knowledge graph. Run once per project. To force a full re-index:

```bash
tokensave sync --force
```

### Three graph update strategies

**Manual sync** - for full control:
```bash
tokensave sync   # incremental: only re-indexes modified files
```

**Daemon** - automatic update on every file change:
```bash
tokensave daemon --enable-autostart
```

**Git hook** - automatic update on every commit:
```bash
tokensave install --git-hook
```

The hook is a no-op in repos not initialized with tokensave.

With **branch-aware** mode (daemon active), each branch maintains its own index. Switching branches gives a graph that reflects the current code without stale results.

### MCP tools exposed to the model

The current version exposes 48 tools in total. The main ones:

| Tool | Function |
|---|---|
| `tokensave_search` | Find symbols by name (functions, classes, types) |
| `tokensave_context` | Relevant context for a specific task |
| `tokensave_callers` | Who calls a function |
| `tokensave_callees` | What a function calls |
| `tokensave_impact` | What breaks when modifying a symbol |
| `tokensave_node` | Details and source of a symbol |
| `tokensave_files` | List indexed files with filters |
| `tokensave_affected` | Test files impacted by changes |
| `tokensave_dead_code` | Unreachable symbols |
| `tokensave_diff_context` | Semantic context for modified files |
| `tokensave_module_api` | Public API of a file or directory |
| `tokensave_circular` | Circular dependencies between files |
| `tokensave_hotspots` | Most connected symbols (high regression risk) |
| `tokensave_similar` | Symbols with similar names |
| `tokensave_rename_preview` | Preview impact of a rename |
| `tokensave_unused_imports` | Never-referenced imports |
| `tokensave_changelog` | Semantic diff between two git refs |
| `tokensave_status` | Index state, statistics, tokens saved |

Some can also be used directly from the CLI:

```bash
tokensave query <symbol>
tokensave affected src/main.rs
git diff --name-only HEAD~1 | tokensave affected --stdin
tokensave status --show-flags
```

### Supported languages

34 languages as of v6.1.1, organized in three tiers: **Lite** (11 languages), **Medium** (20), **Full** (34). Includes: Rust, Go, Java, Scala, TypeScript, JavaScript, Python, C, C++, Kotlin, Dart, C#, Pascal, PHP, Ruby, and others.

### Privacy

tokensave is **100% local**: code never leaves the machine. It makes two optional network calls:

- **Global counter** - sends only the number of tokens saved (no code, no filenames) to an anonymous Cloudflare worker. Disable with `tokensave disable-upload-counter`.
- **Version check** - checks for new releases on GitHub. 1-second timeout, fails silently.

### Troubleshooting tokensave

**"tokensave not initialized"**
```bash
tokensave init
```

**MCP server not connected**
```bash
which tokensave           # verify it's in PATH
tokensave install         # re-run if permissions are missing
# then restart Claude Code
```

**Symbols missing from the graph**
```bash
tokensave sync
```
Verify the language is supported and the file is not excluded by `.gitignore`.

---

## Side by side

| | RTK | tokensave |
|---|---|---|
| **Problem** | Verbose CLI output | Expensive codebase exploration |
| **Layer** | Shell - model | Codebase - model |
| **Mechanism** | Proxy + compression | Knowledge graph + hook |
| **Global setup** | `rtk init -g` | `tokensave install` |
| **Per-project setup** | Not needed | `tokensave init` |
| **Updates** | Automatic via hook | `tokensave sync` or daemon |
| **Claimed savings** | -80% on CLI output | 93% avg on exploratory tool calls |
| **Languages** | Agnostic | 34 (3 tiers) |
| **License** | Apache 2.0 | MIT |

RTK acts on the output of commands the model runs. tokensave acts on how the model navigates code. The two problems are orthogonal: one tool does not replace the other.

## Full setup on Linux

```bash
# RTK
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
rtk init -g

# tokensave
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v6.1.1/tokensave-v6.1.1-x86_64-linux.tar.gz
tar xzf tokensave-v6.1.1-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
tokensave install

# Per project
cd /path/to/your/project
tokensave init

# Restart Claude Code
```

## Resources

- **RTK**: [github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- **tokensave**: [github.com/aovestdipaperino/tokensave](https://github.com/aovestdipaperino/tokensave) - [tokensave.dev](https://tokensave.dev)
