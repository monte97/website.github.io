---
title: "The hidden cost of 'let CI catch it': pre-commit hooks worth keeping"
seoTitle: "Pre-commit hooks: what to keep, what to skip"
date: 2026-10-01
description: "Every CI failure for trivial lint/secrets/tests costs time and money. An opinionated rundown of what belongs in pre-commit (fast, deterministic, local) and what stays in CI."
pillar: automatizzare
category: dx
tags:
  - Pre-commit
  - Developer Experience
  - CI/CD
  - Git
  - Linting
  - Secrets
lang: en
reviewed: false
draft: false
mode: explanation
summary:
  - label: "Problem"
    value: "CI failing for trivial issues catchable locally"
    note: "Context switch, wait time, runner cost"
  - label: "Thesis"
    value: "Pre-commit = free guardrails; CI = source of truth"
  - label: "Result"
    value: "Fewer CI runs, devs stay in flow"
openItems:
  - "Unit test time threshold: where to draw the line (10s? 30s?) depends on the project"
  - "Monorepo: hooks for changed packages vs entire repo"
  - "Mixed languages: how to keep config from exploding"
openNote: "The concrete config depends on your stack; the article gives criteria, not a ready-made file."
---

You push. You wait. CI turns red. You open the logs: *trailing whitespace*, *a hardcoded secret in a test file*, *a unit test flaking on a mock*. None of this needed CI. You'd have fixed it in two seconds if you'd seen it before the push.

The frustration isn't the error. It's the wasted round trip: context switch, runner wait, new push, wait again. Multiply by team, by weeks. It's a cost you don't see in the budget but pay in developer time and lost momentum.

## The bill you don't see

Every CI failure for lint, secrets, or trivial tests is a hidden tax:

- **GitHub Actions**: $0.008/min (Linux)
- **GitLab**: 400 min/mo free, then $0.01/min
- **Context switch**: 15-23 minutes to get back in flow (Microsoft/Google studies)

[ NUMERO DA FORNIRE: minuti CI risparmiati a settimana per dev ]

You don't need a calculator. If your CI takes 8 minutes and three out of ten runs fail for things a local hook catches in 30 seconds, you're throwing away time you never get back.

Let's do the math on a team of five developers pushing three times a day each. Ten minutes of CI per run, thirty percent trivial failures. That's ninety minutes of waiting per day for things a local hook solves in thirty seconds. In a working month: nearly nineteen hours of wasted machine time, plus the human cost of context switching. That number never appears in any financial report, but it's time the team doesn't spend shipping features.

## What moves the needle: the opinionated rundown

Not all hooks are created equal. The table below is the criterion I use: *fast, deterministic, zero false positives* = pre-commit. *Slow, needs interpretation, better with full context* = CI.

| Category | In pre-commit? | Typical tools | Rationale |
|----------|----------------|---------------|-----------|
| Formatting | ✅ Yes | `ruff format`, `prettier`, `gofmt` | Deterministic, instant, zero false positives |
| Fast lint | ✅ Yes | `ruff check`, `eslint --cache`, `golangci-lint --fast` | Fast rules only; no type-checking |
| Secret scanning | ✅ Yes | `gitleaks`, `trufflehog`, `detect-secrets` | Zero cost, massive damage if it slips |
| Unit tests <30s | ⚠️ Only if fast | `pytest -x --tb=short`, `cargo test --lib` | Must stay under perceived threshold (~10-15s) |
| Type checking | ❌ No | `mypy`, `tsc --noEmit`, `go vet` | Slow; better in CI (or editor/LSP) |
| Full build | ❌ No | `docker build`, `cargo build --release` | Out of scope: that's CI |
| Dependency audit | ⚠️ Periodic | `pip-audit`, `npm audit`, `govulncheck` | Better scheduled (weekly) or PR gate |

The practical rule: **if the fix requires reading output, it doesn't belong in pre-commit**. Formatting and secret scanning are binary (pass/fail). A failing test or a style lint needs judgment: those stay in CI.

### Concrete example: Ruff config for Python

```toml
# file: ruff.toml
[tool.ruff]
target-version = "py311"
line-length = 100
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "UP",  # pyupgrade
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "SIM", # flake8-simplify
]
ignore = [
    "E501",  # line too long (handled by formatter)
    "B008",  # do not perform function calls in argument defaults
]
per-file-ignores = {
    "tests/*": ["S101", "S106"],  # allow assert, hardcoded passwords in tests
}

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
```

### Example: ESLint with cache for TypeScript/React

```json
// file: package.json (excerpt)
{
  "scripts": {
    "lint": "eslint --cache --cache-location .eslintcache --ext .ts,.tsx src",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "eslint": "^8.56.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "prettier": "^3.2.0"
  }
}
```

### Example: complete `.pre-commit-config.yaml`

```yaml
# file: .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.0
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.2.0
    hooks:
      - id: prettier
        types_or: [json, yaml, markdown, html, css, scss]
        exclude: ^dist/

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        args: [--verbose]

  - repo: local
    hooks:
      - id: pytest-unit
        name: pytest unit tests (fast subset)
        entry: pytest -x --tb=short -q
        language: system
        types: [python]
        pass_filenames: false
        args: [tests/unit, --maxfail=3]
        # runs only on staged python files touching unit tests
        # CI runs the full suite

  - repo: https://github.com/golangci/golangci-lint
    rev: v1.57.0
    hooks:
      - id: golangci-lint
        args: [--fast, --timeout=30s]
```

Note how `golangci-lint` uses `--fast` and a timeout: if lint exceeds thirty seconds, the commit fails instead of blocking the developer. It's the practical trade-off between coverage and speed.

## Two pipelines: fast local, thorough CI

Two complementary pipelines, not duplicated:

- **pre-commit** = *guardrails* (formatting, fast lint, secrets, unit test subset)
- **CI** = *source of truth* (type-check, integration, build, coverage, audit)

Don't duplicate checks. Pre-commit prevents the CI round trip for trivialities; CI guarantees the whole system holds. If you move type-checking to pre-commit, every commit becomes a 40-second wait. Keep it in CI and pre-commit stays instant while CI does the heavy lifting once per PR.

### Trade-off: what happens if you move type-checking to pre-commit

Imagine a medium TypeScript project: `tsc --noEmit` takes fifteen seconds cold, eight with cache. Every commit pays that cost. Five developers, three commits a day: two hundred forty seconds a day, nearly half an hour of cumulative waiting. In CI the same check runs once per PR, on parallel runners, with artifact caching. The net gain of moving it to pre-commit is zero or negative: you catch a few type errors before the push, but you slow down every commit.

The rule: if the tool isn't sub-second on the second run, it doesn't belong in pre-commit. `ruff`, `prettier`, `gofmt` are. `mypy`, `tsc`, `golangci-lint` (without `--fast`) aren't.

### Trade-off: unit tests in pre-commit

Here the threshold is perceived, not absolute. Ten to fifteen seconds is the limit beyond which developers start doing `git commit --no-verify`. If your unit suite takes forty seconds, don't put it all in pre-commit. Two paths:

1. **Fast subset**: tag critical tests (e.g., `@pytest.mark.fast`) and run only those. `pytest -m fast -x --tb=short`
2. **Affected tests**: in a monorepo, run only tests for packages touched by the commit. Requires tooling (Nx, Turborepo, Bazel) but scales.

```yaml
# file: .pre-commit-config.yaml (monorepo excerpt with Nx)
- repo: local
  hooks:
    - id: nx-affected-test
      name: Nx affected unit tests
      entry: npx nx affected --target=test --parallel=3
      language: system
      pass_filenames: false
      # requires Nx installed globally or via npx
```

## Four principles to keep the team from hating them

### 1. Automatic install, not manual

`pre-commit install` runs once, ideally in the onboarding script or the project `Makefile`. Whoever clones the repo should find hooks already active.

```makefile
# file: Makefile
.PHONY: install-hooks
install-hooks:
	pre-commit install
	pre-commit install --hook-type commit-msg
	pre-commit install --hook-type pre-push
```

Add `make install-hooks` to the README as a mandatory step after `git clone`. Even better: a `scripts/bootstrap.sh` wrapper that installs deps, hooks, and verifies the environment.

### 2. Aggressive caching: second run must be sub-second

`ruff --cache`, `eslint --cache`, `golangci-lint --cache`. Without cache, every hook re-reads the entire codebase. With cache, the second run only touches changed files.

```yaml
# file: .pre-commit-config.yaml (with explicit cache for eslint)
- repo: https://github.com/pre-commit/mirrors-eslint
  rev: v8.56.0
  hooks:
    - id: eslint
      args: [--cache, --cache-location, .eslintcache]
      additional_dependencies:
        - eslint@8.56.0
        - @typescript-eslint/parser@6.19.0
        - @typescript-eslint/eslint-plugin@6.19.0
```

The `.eslintcache` directory goes in `.gitignore`. Ruff's cache (`~/.cache/ruff`) is automatic and transparent.

### 3. Opt-out skip, not default skip

`SKIP=hook git commit` for emergencies, but default is *all on*. Don't comment out hooks in the config to "speed things up". If a hook is too slow, fix the tool (e.g., `golangci-lint --fast`) or move it to CI. Disabling by default creates the habit of skipping checks.

```bash
# Emergency: commit without hooks (use sparingly)
SKIP=gitleaks git commit -m "WIP: fix secret in test fixture"

# Or disable just one specific hook
SKIP=golangci-lint git commit -m "WIP: refactor pkg"
```

### 4. CI verifies hooks run

`pre-commit run --all-files` in the pipeline. Anyone skipping local install gets caught at first PR. This closes the loop: pre-commit is convenient for the developer, CI is the guarantee for the repo.

```yaml
# file: .github/workflows/ci.yml (excerpt)
jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install pre-commit
        run: pip install pre-commit
      - name: Run pre-commit on all files
        run: pre-commit run --all-files --show-diff-on-failure
      - name: Run full test suite
        run: pytest --cov=src --cov-report=xml
      - name: Type check
        run: mypy src
```

Note `--show-diff-on-failure`: shows the exact diff the formatter would have applied, so anyone who skipped local install sees immediately what to fix.

## The rule

| Goes in pre-commit | Goes in CI | Doesn't belong |
|-------------------|------------|----------------|
| Formatting | Type checking | Full build on every commit |
| Fast lint rules | Integration tests | Dependency audit on every push |
| Secret scanning | Build / release | Duplicated slow lint rules |
| Unit tests <10-15s | Coverage report | |

**If the fix requires reading output, it doesn't belong in pre-commit.**

Which CI failure from last week could you have avoided in 3 seconds?