# Pre-commit Hooks DX Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the blog article "Il costo nascosto del 'ci pensa la CI': pre-commit hook che valgono la pena" in Italian and English, following the approved design spec.

**Architecture:** Two markdown files in the Astro content collection — Italian source (`index.md`) + English adaptation (`index.en.md`) under `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/`. The article follows `explanation` mode with opinionated comparison table, placeholder for real metrics, and closing rule + question.

**Tech Stack:** Astro 5 content collections, Shiki syntax highlighting (plaintext for non-supported langs), Pagefind search indexing on build.

## Global Constraints

- Mode: `explanation` (not how-to, not tutorial) — tesi argomentata, no elenchi di comandi passo-passo
- Pillar: `automatizzare` | Category: `dx` | Tags: [Pre-commit, Developer Experience, CI/CD, Git, Linting, Secrets]
- Lenght target: ~1800 parole IT (EN same structure, same length)
- Apertura: sintomo (CI rossa per cose banali), NON definizione
- Heading: affermativi, sentence case, italiano, no emoji
- Numeri: placeholder `[NUMERO DA FORNIRE: ...]` dove mancano dati reali
- Trattino lungo (—) vietato → due punti / virgole / punto
- `openItems` = confini in una riga; spiegazione nel corpo solo se serve
- Chiusura: regola generalizzata + domanda al lettore
- Code blocks: linguaggio dichiarato, commento `# file/path` prima riga
- Frontmatter esatto come nel design doc (title, seoTitle, date, description, pillar, category, tags, mode, summary, openItems, openNote)
- EN version: adattamento non traduzione, stessa struttura/heading, voce idiomatica, codice identico, link interni a versioni EN quando esistono

---

### Task 1: Create Italian article file

**Files:**
- Create: `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.md`

**Interfaces:**
- Consumes: design spec (`docs/superpowers/specs/2026-10-01-pre-commit-hooks-dx-design.md`)
- Produces: Italian article ready for EN adaptation

- [ ] **Step 1: Write the Italian article**

```markdown
---
title: "Il costo nascosto del 'ci pensa la CI': pre-commit hook che valgono la pena"
seoTitle: "Pre-commit hook: cosa metterci e cosa no"
date: 2026-10-01
description: "Ogni fallimento CI per lint/secret/test banale costa tempo e soldi. La rassegna opinionated di cosa mettere in pre-commit (veloce, deterministico, locale) e cosa lasciare in CI."
pillar: automatizzare
category: dx
tags:
  - Pre-commit
  - Developer Experience
  - CI/CD
  - Git
  - Linting
  - Secrets
lang: it
reviewed: false
draft: false
mode: explanation
summary:
  - label: "Problema"
    value: "CI che fallisce per cose banali intercettabili in locale"
    note: "Context switch, attesa, costo runners"
  - label: "Tesi"
    value: "Pre-commit = guardrail gratuiti; CI = source of truth"
  - label: "Risultato"
    value: "Meno giri CI, sviluppatori nel flusso"
openItems:
  - "Soglia tempo test unitaria: dove tracciare la linea (10s? 30s?) dipende dal progetto"
  - "Monorepo: hook per package cambiati vs tutto il repo"
  - "Linguaggi misti: come non far esplodere la configurazione"
openNote: "La configurazione concreta dipende dallo stack; l'articolo dà i criteri, non il file pronto."
---

Push. Aspetti. CI rossa. Apri i log: *trailing whitespace*, *secret hardcoded in un file di test*, *un test unitario che fallisce per flakiness su un mock*. Niente di tutto questo richiedeva la CI. L'avresti fixato in due secondi se l'avessi visto prima del push.

La frustrazione non è l'errore. È il giro inutile: context switch, attesa runner, nuovo push, ri-attesa. Moltiplica per squadra, per settimane. È un costo che non vedi nel budget ma paghi in tempo sviluppatore e in momentum perso.

## Il conto che non vedi

Ogni fallimento CI per lint, secret o test banale è una tassa occulta:

- **GitHub Actions**: $0.008/minuto (Linux)
- **GitLab**: 400 min/mese gratis, poi $0.01/min
- **Context switch**: 15-23 minuti per tornare in flusso (studi Microsoft/Google)

[ NUMERO DA FORNIRE: minuti CI risparmiati a settimana per dev ]

Non serve la calcolatrice. Se la tua CI impiega 8 minuti e tre su dieci run falliscono per cose che un hook locale prende in 30 secondi, stai buttando tempo che non recuperi.

## Cosa sposta l'ago — La rassegna opinionated

Non tutti gli hook sono uguali. La tabella sotto è il criterio che uso: *veloce, deterministico, zero false positive* = pre-commit. *Lento, richiede interpretazione, meglio con contesto completo* = CI.

| Categoria | In pre-commit? | Tool tipici | Rationale |
|-----------|----------------|-------------|-----------|
| Formattazione | ✅ Sì | `ruff format`, `prettier`, `gofmt` | Deterministico, istantaneo, zero false positive |
| Lint veloce | ✅ Sì | `ruff check`, `eslint --cache`, `golangci-lint --fast` | Solo regole *fast*; niente type-checking |
| Secret scanning | ✅ Sì | `gitleaks`, `trufflehog`, `detect-secrets` | Costo zero, danno enorme se passa |
| Test unitari <30s | ⚠️ Solo se veloci | `pytest -x --tb=short`, `cargo test --lib` | Deve stare sotto soglia percepita (~10-15s) |
| Type checking | ❌ No | `mypy`, `tsc --noEmit`, `go vet` | Lento, meglio in CI (o editor/LSP) |
| Build completo | ❌ No | `docker build`, `cargo build --release` | Fuori scope — è CI |
| Dependency audit | ⚠️ Periodico | `pip-audit`, `npm audit`, `govulncheck` | Meglio scheduled (weekly) o PR gate |

La regola pratica: **se il fix richiede leggere output, non sta in pre-commit**. Formattazione e secret scan sono binari (passa/non passa). Un test che fallisce o un lint che segnala stile richiedono giudizio: quelli restano in CI.

## Il pattern "veloce in locale, completo in CI"

Due pipeline complementari, non duplicate:

- **pre-commit** = *guardrail* (formatting, lint fast, secrets, subset test unitari)
- **CI** = *source of truth* (type-check, integration, build, coverage, audit)

Non duplicare i controlli. Il pre-commit impedisce il giro CI per le banalità; la CI garantisce che il sistema intero regga. Se sposti type-checking in pre-commit, ogni commit diventa un'attesa di 40 secondi. Se lo tieni in CI, il pre-commit resta istantaneo e la CI fa il lavoro pesante una volta per PR.

## Come non farli odiare dal team

1. **`pre-commit install` una volta**, non manuale. Aggiungilo allo script di onboarding o al `Makefile` del progetto.
2. **Cache aggressiva**: `ruff --cache`, `eslint --cache`, `golangci-lint --cache`. La seconda esecuzione deve essere sub-secondo.
3. **Skip opt-out**, non skip default: `SKIP=hook git commit` per l'emergenza, ma il default è *tutti attivi*.
4. **CI verifica che i hook girino**: `pre-commit run --all-files` in pipeline. Chi salta l'install locale se ne accorge alla prima PR.

## La regola

| Cosa va in pre-commit | Cosa va in CI | Cosa non serve |
|----------------------|---------------|----------------|
| Formattazione | Type checking | Build completo ad ogni commit |
| Lint fast rules | Test integrazione | Audit dipendenze a ogni push |
| Secret scanning | Build / release | Lint slow rules duplicati |
| Test unitari <10-15s | Coverage report |  |

**Se il fix richiede leggere output, non sta in pre-commit.**

Quale fallimento CI della scorsa settimana avresti potuto evitare in 3 secondi?
```

- [ ] **Step 2: Verify file structure and frontmatter**

Run: `head -50 src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.md`
Expected: Frontmatter valido YAML, tutti i campi presenti, `mode: explanation`, `pillar: automatizzare`

- [ ] **Step 3: Commit**

```bash
git add src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.md
git commit -m "feat: add Italian article on pre-commit hooks DX"
```

---

### Task 2: Create English adaptation

**Files:**
- Create: `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.en.md`

**Interfaces:**
- Consumes: Italian article (`index.md`)
- Produces: English version with same structure, idiomatic phrasing, identical code blocks

- [ ] **Step 1: Write the English adaptation**

```markdown
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

## What moves the needle — The opinionated rundown

Not all hooks are created equal. The table below is the criterion I use: *fast, deterministic, zero false positives* = pre-commit. *Slow, needs interpretation, better with full context* = CI.

| Category | In pre-commit? | Typical tools | Rationale |
|----------|----------------|---------------|-----------|
| Formatting | ✅ Yes | `ruff format`, `prettier`, `gofmt` | Deterministic, instant, zero false positives |
| Fast lint | ✅ Yes | `ruff check`, `eslint --cache`, `golangci-lint --fast` | Fast rules only; no type-checking |
| Secret scanning | ✅ Yes | `gitleaks`, `trufflehog`, `detect-secrets` | Zero cost, massive damage if it slips |
| Unit tests <30s | ⚠️ Only if fast | `pytest -x --tb=short`, `cargo test --lib` | Must stay under perceived threshold (~10-15s) |
| Type checking | ❌ No | `mypy`, `tsc --noEmit`, `go vet` | Slow; better in CI (or editor/LSP) |
| Full build | ❌ No | `docker build`, `cargo build --release` | Out of scope — that's CI |
| Dependency audit | ⚠️ Periodic | `pip-audit`, `npm audit`, `govulncheck` | Better scheduled (weekly) or PR gate |

The practical rule: **if the fix requires reading output, it doesn't belong in pre-commit**. Formatting and secret scanning are binary (pass/fail). A failing test or a style lint needs judgment: those stay in CI.

## The "fast local, thorough CI" pattern

Two complementary pipelines, not duplicated:

- **pre-commit** = *guardrails* (formatting, fast lint, secrets, unit test subset)
- **CI** = *source of truth* (type-check, integration, build, coverage, audit)

Don't duplicate checks. Pre-commit prevents the CI round trip for trivialities; CI guarantees the whole system holds. If you move type-checking to pre-commit, every commit becomes a 40-second wait. Keep it in CI and pre-commit stays instant while CI does the heavy lifting once per PR.

## How to keep the team from hating them

1. **`pre-commit install` once**, not manually. Add it to onboarding or the project `Makefile`.
2. **Aggressive caching**: `ruff --cache`, `eslint --cache`, `golangci-lint --cache`. The second run must be sub-second.
3. **Opt-out skip**, not default skip: `SKIP=hook git commit` for emergencies, but default is *all on*.
4. **CI verifies hooks run**: `pre-commit run --all-files` in pipeline. Anyone skipping local install gets caught at first PR.

## The rule

| Goes in pre-commit | Goes in CI | Doesn't belong |
|-------------------|------------|----------------|
| Formatting | Type checking | Full build on every commit |
| Fast lint rules | Integration tests | Dependency audit on every push |
| Secret scanning | Build / release | Duplicated slow lint rules |
| Unit tests <10-15s | Coverage report | |

**If the fix requires reading output, it doesn't belong in pre-commit.**

Which CI failure from last week could you have avoided in 3 seconds?
```

- [ ] **Step 2: Verify structure matches Italian (same headings, same order)**

Run: `python3 scripts/post-facts.py automatizzare/dx/pre-commit-hooks-worth-it`
Expected: Drift check = 0 (stessa struttura, stessi heading)

- [ ] **Step 3: Commit**

```bash
git add src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.en.md
git commit -m "feat: add English adaptation of pre-commit hooks article"
```

---

### Task 3: Verify with post-facts and build

**Files:**
- Test: `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.md`
- Test: `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.en.md`

**Interfaces:**
- Consumes: Both article files
- Produces: Verification report, successful build

- [ ] **Step 1: Run post-facts verification**

Run: `python3 scripts/post-facts.py automatizzare/dx/pre-commit-hooks-worth-it`
Expected: No errors — mode dichiarato, lunghezze title/description ok, placeholder numeri segnalati (non errori), niente marcatori lavorazione, niente CTA nel corpo, heading ok

- [ ] **Step 2: Build site to verify rendering**

Run: `make build`
Expected: Build succeeds, Pagefind indexing completes, no Shiki errors (plaintext per tabelle)

- [ ] **Step 3: Preview locally (optional)**

Run: `make preview`
Expected: Article renders at `/automatizzare/dx/pre-commit-hooks-worth-it/` and `/en/automatizzare/dx/pre-commit-hooks-worth-it/`

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: post-facts adjustments for pre-commit hooks article"
```

---

## Spec Coverage Check

| Spec Section | Task |
|--------------|------|
| Apertura sintomo (CI rossa per banalità) | Task 1 Step 1 |
| Il conto che non vedi (costi CI, placeholder) | Task 1 Step 1 |
| Rassegna opinionated (tabella 7 categorie) | Task 1 Step 1 |
| Pattern veloce locale / completo CI | Task 1 Step 1 |
| Come non farli odiare (4 punti) | Task 1 Step 1 |
| La regola (tabella 3 colonne + frase guida + domanda chiusura) | Task 1 Step 1 |
| Frontmatter esatto | Task 1 Step 1 |
| EN adaptation (stessa struttura, voce idiomatica) | Task 2 Step 1 |
| post-facts verification | Task 3 Step 1 |
| Build + preview | Task 3 Step 2-3 |

---

## Placeholder Scan

- [x] No "TBD", "TODO", "implement later"
- [x] No vague "add error handling" — article has no code logic
- [x] All test steps have actual commands
- [x] Types/signatures N/A (markdown content)
- [x] Italian/EN heading drift covered by `post-facts.py`

---

**Plan saved to:** `docs/superpowers/plans/2026-10-01-pre-commit-hooks-dx.md`

---

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**