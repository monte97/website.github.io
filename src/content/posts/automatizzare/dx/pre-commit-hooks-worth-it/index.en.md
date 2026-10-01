---
title: "A local hook would have caught one problem in five"
seoTitle: "Pre-commit hooks: what to put in, what to leave out"
date: 2026-09-10T09:00:00.000Z
description: "Five problems surfaced in CI after 38 local commits: only one was visible to a hook. What belongs in pre-commit, pre-push and CI."
pillar: automatizzare
category: dx
tags:
  - Pre-commit
  - Developer Experience
  - CI/CD
  - Git
  - SpotBugs
  - Secrets
lang: en
reviewed: human
draft: false
mode: explanation
summary:
  - label: "Problem"
    value: "Problems that CI finds all at once, on release day"
    note: "Four e2e tests and one static analysis error, after commits that were never pushed"
  - label: "Thesis"
    value: "Every check belongs at the point closest to the cause where it can run"
  - label: "Result"
    value: "Pre-commit for single-file checks, pre-push for what needs a build or the stack, CI as the guarantee"
openItems:
  - "Time budget for pre-push hooks: depends on how long the project's build and tests take"
  - "Monorepos: running hooks only on the packages the commit touches"
  - "Mixed languages: how to keep the configuration from growing with every stack"
openNote: "The concrete configuration depends on your stack. The case shows the criteria, not a ready-made file."
---

On April 8 I released encryption at rest for secrets in `keycloak-webhook-provider`. At the first commit of the series `master` was green. Then 38 commits piled up locally, never pushed. At release push, CI reported four broken e2e tests and one SpotBugs error.

None of the five problems was a regression from the release commit. They had been born in the intermediate commits, which CI had never seen: a push event produces a single run, on the HEAD of the ref. All 38 commits were validated together, at the moment an error costs the most.

The question a team should ask is how many of those five problems a local hook would have caught before the push.

## A local hook would have caught one problem in five

The SpotBugs error was `DMI_RANDOM_USED_ONLY_ONCE`: a `new SecureRandom()` created to generate a single value and then discarded. With SpotBugs running before the commit, it would have surfaced at the commit that introduced it.

The e2e tests failed for different reasons. The selector `getByRole('radio', { name: '10' })` in the `06-settings` test matched three elements instead of one. It was not flaky: it had been broken since the day a second radio group with the label "10" was added. The `WEBHOOK_ENCRYPTION_KEY` variable was required by the provider but not propagated by the `docker-compose` of the e2e tests. Code and fixtures live in different folders, and the commit that introduced the requirement did not touch the tests.

A hook that looks at staged files sees neither case. The selector breaks when the page changes. The variable goes missing when provider and compose drift apart. Seeing them takes a running page and a started stack.

## Pre-commit holds what can be decided on a single file

Formatting, fast lint rules and secret scanning have a binary outcome: they pass or they fail, with no interpretation. They need no context beyond the staged file, and they cost a few seconds.

| Check | Where | Typical tools | Reason |
|---|---|---|---|
| Formatting | pre-commit | `prettier`, `gofmt`, `ruff format`, `spotless` | Deterministic, zero false positives |
| Fast lint rules | pre-commit | `eslint --cache`, `ruff check`, `golangci-lint --fast` | Rules that look at one file at a time |
| Secret scanning | pre-commit | `gitleaks`, `detect-secrets` | A secret in the history is costly, the check is cheap |
| Static analysis on bytecode | pre-push | `spotbugs` | Needs a compile |
| Unit tests | pre-push | `pytest -x`, `mvn test` | Too slow for every commit |
| e2e smoke | pre-push | `docker compose`, `playwright` | Need the stack running |
| Type check, full build, dependency audit | CI | `mypy`, `tsc --noEmit`, `pip-audit` | Heavy, and best run with the full context |

The rule for telling them apart: if the fix requires reading the output and interpreting it, the check does not belong in pre-commit.

## Pre-push holds what needs a compile or the running stack

SpotBugs analyzes bytecode, so it needs a compile. The e2e tests need `docker compose`. They are too slow for every commit and acceptable once per push.

```yaml
# file: .pre-commit-config.yaml
default_install_hook_types: [pre-commit, pre-push]
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks

  - repo: local
    hooks:
      - id: spotbugs
        name: SpotBugs
        entry: mvn -q compile spotbugs:check
        language: unsupported
        pass_filenames: false
        stages: [pre-push]

      - id: e2e-smoke
        name: e2e smoke
        entry: make e2e-smoke  # Makefile target: starts compose, runs the minimal tests
        language: unsupported
        pass_filenames: false
        stages: [pre-push]
```

Pre-push does not change the distance between the cause and the failure. With 38 local commits, one push produces one run, and the five problems still surface together, in the terminal instead of in CI. The hook decides where the problem is found, the push frequency decides when.

Shortening the distance takes both: fast checks in pre-commit, and a push after every finished unit of work.

## Local hooks can be skipped, CI cannot

`git commit --no-verify`, `git push --no-verify` and `SKIP=spotbugs git push` exist. A hook is a guardrail for whoever installed it, not a guarantee for the repo. The guarantee lives in CI, which runs the checks on every push. Formatters go through `pre-commit run`, static analysis and tests are ordinary pipeline steps:

```yaml
# file: .github/workflows/ci.yml (excerpt)
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install pre-commit
      - run: pre-commit run --all-files --show-diff-on-failure
      - run: mvn -q verify  # SpotBugs and tests, as ordinary steps
```

`--show-diff-on-failure` prints the diff the formatter would have applied, so whoever skipped the installation sees right away what to fix.

Installation has to be automated, otherwise hooks exist only on the machines of the people who remember them:

```makefile
# file: Makefile
.PHONY: install-hooks
install-hooks:
	pre-commit install
```

With `default_install_hook_types` in the configuration, a single `pre-commit install` activates both pre-commit and pre-push. The target belongs in the README, right after `git clone`.

## The rule

A check belongs at the point closest to the cause where it can run.

| Where | What | Criterion |
|---|---|---|
| pre-commit | Formatting, fast lint, secret scanning | Binary outcome on one file |
| pre-push | Static analysis, unit tests, e2e smoke | Needs a build or the stack |
| CI | Formatters, static analysis and tests as pipeline steps, plus type check, coverage and audit | Guarantee for the repo |

A problem found by the person who just wrote the code is fixed with a change to the current commit. One found on release day takes a bisection across every intermediate commit.

Which CI failure last month was visible in a single file?

## References

- [pre-commit: configuration, `stages`, `default_install_hook_types`, `SKIP`](https://pre-commit.com/)
- [Git: `pre-commit` and `pre-push` hooks, `--no-verify`](https://git-scm.com/docs/githooks)
- [Gitleaks: usage as a pre-commit hook](https://github.com/gitleaks/gitleaks)
- [SpotBugs Maven Plugin: `spotbugs:check` goal](https://spotbugs.github.io/spotbugs-maven-plugin/check-mojo.html)
- [SpotBugs: description of `DMI_RANDOM_USED_ONLY_ONCE`](https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html)
