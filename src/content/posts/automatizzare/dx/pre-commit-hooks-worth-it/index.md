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

## Cosa sposta l'ago: la rassegna opinionated

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