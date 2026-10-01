---
title: "Un hook locale avrebbe preso un problema su cinque"
seoTitle: "Pre-commit hook: cosa metterci e cosa no"
date: 2026-09-10T09:00:00.000Z
description: "Cinque problemi emersi in CI dopo 38 commit locali: uno solo era visibile a un hook. Cosa mettere in pre-commit, in pre-push e in CI."
pillar: automatizzare
category: dx
tags:
  - Pre-commit
  - Developer Experience
  - CI/CD
  - Git
  - SpotBugs
  - Secrets
lang: it
reviewed: human
draft: false
mode: explanation
summary:
  - label: "Problema"
    value: "Problemi che la CI scopre tutti insieme, il giorno della release"
    note: "Quattro test e2e e un errore di analisi statica, dopo commit mai pushati"
  - label: "Tesi"
    value: "Ogni controllo va nel punto più vicino alla causa in cui riesce a girare"
  - label: "Risultato"
    value: "Pre-commit per i controlli su un file, pre-push per ciò che richiede build e stack, CI per la garanzia"
openItems:
  - "Soglia di tempo dei hook in pre-push: dipende dalla durata di build e test del progetto"
  - "Monorepo: eseguire i hook solo sui package toccati dal commit"
  - "Linguaggi misti: come evitare che la configurazione cresca a ogni stack"
openNote: "La configurazione concreta dipende dallo stack. Il caso mostra i criteri, non un file pronto."
---

L'8 aprile ho rilasciato la cifratura a riposo dei secret in `keycloak-webhook-provider`. Al primo commit della serie `master` era verde. Poi sono passati 38 commit rimasti in locale, mai pushati. Al push di release la CI ha segnalato quattro test e2e rotti e un errore di SpotBugs.

Nessuno dei cinque problemi era una regressione del commit di release. Erano nati nei commit intermedi, che la CI non aveva mai visto: un evento di push produce un solo run, sull'HEAD del ref. I 38 commit sono stati validati tutti insieme, nel momento in cui un errore costa di più.

La domanda utile a un team è quanti di quei cinque problemi un hook locale avrebbe intercettato prima del push.

## Un hook locale avrebbe preso un problema su cinque

L'errore di SpotBugs era `DMI_RANDOM_USED_ONLY_ONCE`: un `new SecureRandom()` creato per generare un solo valore e poi scartato. Con SpotBugs eseguito prima del commit, sarebbe emerso al commit che l'ha introdotto.

I test e2e avevano cause diverse. Il selector `getByRole('radio', { name: '10' })` nel test `06-settings` trovava tre elementi invece di uno. Non era flaky: era rotto dal giorno in cui era stato aggiunto un secondo gruppo di radio con la label "10". La variabile `WEBHOOK_ENCRYPTION_KEY` era richiesta dal provider ma non propagata dal `docker-compose` dei test e2e. Codice e fixture stanno in cartelle diverse, e il commit che ha introdotto il requisito non toccava i test.

Un hook che guarda i file in staging non vede nessuno dei due casi. Il selector si rompe quando la pagina cambia. La variabile manca quando provider e compose divergono. Per vederli servono la pagina in esecuzione e lo stack avviato.

## In pre-commit sta ciò che si decide su un file solo

Formattazione, lint con regole veloci e secret scanning hanno esito binario: passano o falliscono, senza interpretazione. Non richiedono contesto oltre il file in staging, e costano pochi secondi.

| Controllo | Dove | Tool tipici | Motivo |
|---|---|---|---|
| Formattazione | pre-commit | `prettier`, `gofmt`, `ruff format`, `spotless` | Deterministico, zero falsi positivi |
| Lint con regole veloci | pre-commit | `eslint --cache`, `ruff check`, `golangci-lint --fast` | Regole che guardano un file alla volta |
| Secret scanning | pre-commit | `gitleaks`, `detect-secrets` | Il danno di un secret nella history è alto, il costo del controllo è basso |
| Analisi statica su bytecode | pre-push | `spotbugs` | Richiede di compilare |
| Test unitari | pre-push | `pytest -x`, `mvn test` | Troppo lunghi per ogni commit |
| Smoke e2e | pre-push | `docker compose`, `playwright` | Richiedono lo stack avviato |
| Type check, build completo, audit delle dipendenze | CI | `mypy`, `tsc --noEmit`, `pip-audit` | Pesanti, e danno il risultato migliore con il contesto completo |

La regola per distinguere: se il fix richiede di leggere l'output e di interpretarlo, il controllo non sta in pre-commit.

## In pre-push sta ciò che richiede di compilare o avviare lo stack

SpotBugs analizza il bytecode, quindi richiede la compilazione. I test e2e richiedono `docker compose`. Sono troppo lenti per ogni commit e accettabili una volta per push.

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
        entry: make e2e-smoke  # target del Makefile: avvia compose, lancia i test minimi
        language: unsupported
        pass_filenames: false
        stages: [pre-push]
```

Il pre-push non cambia la distanza fra la causa e il fallimento. Con 38 commit locali, un solo push produce una sola esecuzione, e i cinque problemi emergono comunque insieme, nel terminale invece che nella CI. Il hook decide dove si scopre il problema, la frequenza del push decide quando.

Per accorciare la distanza servono entrambi: i controlli veloci in pre-commit, e un push a ogni unità di lavoro conclusa.

## I hook locali si saltano, la CI no

`git commit --no-verify`, `git push --no-verify` e `SKIP=spotbugs git push` esistono. Un hook è un guardrail per chi lo ha installato, non una garanzia per il repo. La garanzia sta nella CI, che esegue i controlli a ogni push. I formatter passano da `pre-commit run`, analisi statica e test sono step normali della pipeline:

```yaml
# file: .github/workflows/ci.yml (estratto)
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install pre-commit
      - run: pre-commit run --all-files --show-diff-on-failure
      - run: mvn -q verify  # SpotBugs e test, come step normali
```

`--show-diff-on-failure` mostra il diff che il formatter avrebbe applicato, così chi ha saltato l'installazione vede subito cosa correggere.

L'installazione va automatizzata, altrimenti i hook esistono solo sulle macchine di chi se li ricorda:

```makefile
# file: Makefile
.PHONY: install-hooks
install-hooks:
	pre-commit install
```

Con `default_install_hook_types` nella configurazione, un solo `pre-commit install` attiva sia il pre-commit sia il pre-push. Il target va richiamato nel README, subito dopo il `git clone`.

## La regola

Un controllo va nel punto più vicino alla causa in cui riesce a girare.

| Dove | Cosa | Criterio |
|---|---|---|
| pre-commit | Formattazione, lint veloce, secret scanning | Esito binario su un file |
| pre-push | Analisi statica, test unitari, smoke e2e | Richiede build o stack |
| CI | Formatter, analisi statica e test come step di pipeline, più type check, coverage e audit | Garanzia per il repo |

Un problema trovato da chi ha appena scritto il codice si risolve con una correzione sul commit corrente. Uno trovato il giorno della release richiede una bisection su tutti i commit intermedi.

Quale fallimento CI dell'ultimo mese era visibile in un file solo?

## Riferimenti

- [pre-commit: configurazione, `stages`, `default_install_hook_types`, `SKIP`](https://pre-commit.com/)
- [Git: hook `pre-commit` e `pre-push`, `--no-verify`](https://git-scm.com/docs/githooks)
- [Gitleaks: uso come hook pre-commit](https://github.com/gitleaks/gitleaks)
- [SpotBugs Maven Plugin: goal `spotbugs:check`](https://spotbugs.github.io/spotbugs-maven-plugin/check-mojo.html)
- [SpotBugs: descrizione di `DMI_RANDOM_USED_ONLY_ONCE`](https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html)
