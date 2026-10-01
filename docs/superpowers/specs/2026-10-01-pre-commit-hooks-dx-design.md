# Design — Pre-commit hooks: il costo nascosto del "ci pensa la CI"

**Data**: 2026-10-01
**Pillar**: automatizzare
**Category**: dx
**Mode**: explanation
**Target**: Tech Lead, Senior Engineer, Platform Engineer

---

## Tesi (una frase)

> **I pre-commit hook ben scelti non sono "un altro step": sono l'unico modo per intercettare errori banali a costo zero (locale, parallelo, istantaneo) invece di pagarli in CI — tempo sviluppatore, minuti fatturati, contesto perso.**

---

## Struttura articolo (~1800 parole, mode: explanation)

### 1. Apertura — Il sintomo (2-3 paragrafi)
Push → CI rossa per trailing whitespace / secret hardcoded / test banale che fallisce per flakiness.
Frustrazione: *lo sapevo, l'avrei fixato in 2 secondi se l'avessi visto prima*.
Nessuna definizione di "cos'è un hook".

### 2. Il conto che non vedi
Ogni fallimento CI = context switch + attesa + costo runners.
- GitHub Actions: $0.008/min Linux
- GitLab: 400 min/mese gratis poi $0.01/min
- Moltiplica per team × settimane

**Placeholder**: `[NUMERO DA FORNIRE: minuti CI risparmiati a settimana per dev]`

### 3. Cosa sposta l'ago — La rassegna opinionated (tabella comparativa)

| Categoria | In pre-commit? | Tool tipici | Rationale |
|-----------|----------------|-------------|-----------|
| Formattazione | ✅ Sì | `ruff format`, `prettier`, `gofmt` | Deterministico, istantaneo, zero false positive |
| Lint veloce | ✅ Sì | `ruff check`, `eslint --cache`, `golangci-lint --fast` | Solo regole *fast*; niente type-checking |
| Secret scanning | ✅ Sì | `gitleaks`, `trufflehog`, `detect-secrets` | Costo zero, danno enorme se passa |
| Test unitari <30s | ⚠️ Solo se veloci | `pytest -x --tb=short`, `cargo test --lib` | Deve stare sotto soglia percepita (~10-15s) |
| Type checking | ❌ No | `mypy`, `tsc --noEmit`, `go vet` | Lento, meglio in CI (o editor/LSP) |
| Build completo | ❌ No | `docker build`, `cargo build --release` | Fuori scope — è CI |
| Dependency audit | ⚠️ Periodico | `pip-audit`, `npm audit`, `govulncheck` | Meglio scheduled (weekly) o PR gate |

### 4. Il pattern "veloce in locale, completo in CI"
Due pipeline complementari, non duplicate:
- **pre-commit** = *guardrail* (formatting, lint fast, secrets, unit test subset)
- **CI** = *source of truth* (type-check, integration, build, coverage, audit)

### 5. Come non farli odiare dal team
1. `pre-commit install` una volta, non manuale
2. Cache aggressiva (`ruff --cache`, `eslint --cache`)
3. Skip opt-out (`SKIP=hook git commit`) non skip default
4. CI *verifica* che i hook girino (`pre-commit run --all-files`)

### 6. La regola (sezione tesi esplicita)
**Tabella riassuntiva**: "Cosa va in pre-commit / Cosa va in CI / Cosa non serve"
Frase guida: *Se il fix richiede leggere output, non sta in pre-commit.*

Chiusura con domanda: **"Quale fallimento CI della scorsa settimana avresti potuto evitare in 3 secondi?"**

---

## Frontmatter

```yaml
title: "Il costo nascosto del 'ci pensa la CI': pre-commit hook che valgono la pena"
seoTitle: "Pre-commit hook: cosa metterci e cosa no"
date: 2026-10-01
description: "Ogni fallimento CI per lint/secret/test banale costa tempo e soldi. La rassegna opinionated di cosa mettere in pre-commit (veloce, deterministico, locale) e cosa lasciare in CI."
pillar: automatizzare
category: dx
tags: [Pre-commit, Developer Experience, CI/CD, Git, Linting, Secrets]
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
```

---

## Checklist stile (allineati a style-guide.md)

- [x] Apertura su sintomo, non definizione
- [x] Heading affermativi (es. "Il conto che non vedi", "Cosa sposta l'ago")
- [x] Niente emoji negli heading
- [x] Niente trattoni lunghi (—)
- [x] Numeri con placeholder dove mancano
- [x] `openItems` = confini in una riga, spiegazione nel corpo solo se serve
- [x] Chiusura = regola generalizzata + domanda al lettore
- [x] Second person per procedure, terza per meccanismi
- [x] Code block con linguaggio dichiarato, commento file

---

## Prossimo step

Dopo tua approvazione: invocare `writing-plans` per piano di implementazione (scrittura articolo → `src/content/posts/automatizzare/dx/pre-commit-hooks-worth-it/index.md` + versione EN).