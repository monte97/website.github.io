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

Facciamo i conti su un team di cinque sviluppatori che fanno tre push al giorno ciascuno. Dieci minuti di CI per run, trenta percento di fallimenti banali. Sono novanta minuti di attesa al giorno per cose che un hook locale risolve in trenta secondi. In un mese lavorativo: quasi diciannove ore di tempo macchina sprecate, più il costo umano del context switch. Quel numero non appare in nessun report finanziario, ma è tempo che il team non spende a scrivere feature.

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

### Esempio concreto: configurazione Ruff per Python

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

### Esempio: ESLint con cache per TypeScript/React

```json
// file: package.json (estratto)
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

### Esempio: configurazione completa `.pre-commit-config.yaml`

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

Nota come `golangci-lint` usa `--fast` e un timeout: se il lint supera trenta secondi, fallisce il commit invece di bloccare lo sviluppatore. È il compromesso pratico tra copertura e velocità.

## Il pattern "veloce in locale, completo in CI"

Due pipeline complementari, non duplicate:

- **pre-commit** = *guardrail* (formatting, lint fast, secrets, subset test unitari)
- **CI** = *source of truth* (type-check, integration, build, coverage, audit)

Non duplicare i controlli. Il pre-commit impedisce il giro CI per le banalità; la CI garantisce che il sistema intero regga. Se sposti type-checking in pre-commit, ogni commit diventa un'attesa di quaranta secondi. Se lo tieni in CI, il pre-commit resta istantaneo e la CI fa il lavoro pesante una volta per PR.

### Trade-off: cosa succede se sposti type-checking in pre-commit

Immagina un progetto TypeScript medio: `tsc --noEmet` impiega quindici secondi a freddo, otto con cache. Ogni commit paga quel costo. Cinque sviluppatori, tre commit al giorno: duecentoquaranta secondi al giorno, quasi mezz'ora di attesa cumulativa. In CI lo stesso controllo gira una volta per PR, su runner paralleli, con artifact caching. Il guadagno netto di spostarlo in pre-commit è zero o negativo: intercetti qualche errore di tipo prima del push, ma rallenti ogni commit.

La regola: se lo strumento non è sub-secondo alla seconda esecuzione, non sta in pre-commit. `ruff`, `prettier`, `gofmt` lo sono. `mypy`, `tsc`, `golangci-lint` (senza `--fast`) non lo sono.

### Trade-off: test unitari in pre-commit

Qui la soglia è percepita, non assoluta. Dieci-quindici secondi è il limite oltre cui lo sviluppatore inizia a fare `git commit --no-verify`. Se la tua suite unitaria impiega quaranta secondi, non metterla tutta in pre-commit. Due strade:

1. **Sottoinsieme veloce**: tagga i test critici (es. `@pytest.mark.fast`) e gira solo quelli. `pytest -m fast -x --tb=short`
2. **Test affected**: in monorepo, gira solo i test dei package toccati dal commit. Richiede tooling (Nx, Turborepo, Bazel) ma scala.

```yaml
# file: .pre-commit-config.yaml (estratto monorepo con Nx)
- repo: local
  hooks:
    - id: nx-affected-test
      name: Nx affected unit tests
      entry: npx nx affected --target=test --parallel=3
      language: system
      pass_filenames: false
      # richiede Nx installato globalmente o via npx
```

## I quattro principi per non farli odiare dal team

### 1. Installazione automatica, non manuale

`pre-commit install` va eseguito una volta, idealmente allo script di onboarding o nel `Makefile` del progetto. Chi clona la repo deve trovare i hook già attivi.

```makefile
# file: Makefile
.PHONY: install-hooks
install-hooks:
	pre-commit install
	pre-commit install --hook-type commit-msg
	pre-commit install --hook-type pre-push
```

Aggiungi `make install-hooks` al README come passo obbligatorio dopo `git clone`. Ancora meglio: un wrapper `scripts/bootstrap.sh` che installa dipendenze, hook, e verifica l'ambiente.

### 2. Cache aggressiva: la seconda esecuzione deve essere sub-secondo

`ruff --cache`, `eslint --cache`, `golangci-lint --cache`. Senza cache, ogni hook rilegge l'intero codebase. Con cache, la seconda esecuzione tocca solo i file cambiati.

```yaml
# file: .pre-commit-config.yaml (con cache esplicita per eslint)
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

La directory `.eslintcache` va in `.gitignore`. La cache di Ruff (`~/.cache/ruff`) è automatica e trasparente.

### 3. Skip opt-out, non skip default

`SKIP=hook git commit` per l'emergenza, ma il default è *tutti attivi*. Non commentare hook nel file di configurazione per "velocizzare". Se un hook è troppo lento, fixa lo strumento (es. `golangci-lint --fast`) o spostalo in CI. Disabilitare di default crea l'abitudine a saltare i controlli.

```bash
# Emergenza: committa senza hook (usa con parsimonia)
SKIP=gitleaks git commit -m "WIP: fix secret in test fixture"

# Oppure disabilita solo un hook specifico
SKIP=golangci-lint git commit -m "WIP: refactor pkg"
```

### 4. CI verifica che i hook girino

`pre-commit run --all-files` in pipeline. Chi salta l'install locale se ne accorge alla prima PR. Questo chiude il cerchio: il pre-commit è comodo per lo sviluppatore, la CI è la garanzia per il repo.

```yaml
# file: .github/workflows/ci.yml (estratto)
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

Nota `--show-diff-on-failure`: mostra il diff esatto che il formatter avrebbe applicato, così chi ha saltato l'install locale vede subito cosa fixare.

## La regola

| Cosa va in pre-commit | Cosa va in CI | Cosa non serve |
|----------------------|---------------|----------------|
| Formattazione | Type checking | Build completo ad ogni commit |
| Lint fast rules | Test integrazione | Audit dipendenze a ogni push |
| Secret scanning | Build / release | Lint slow rules duplicati |
| Test unitari <10-15s | Coverage report |  |

**Se il fix richiede leggere output, non sta in pre-commit.**

Quale fallimento CI della scorsa settimana avresti potuto evitare in tre secondi?